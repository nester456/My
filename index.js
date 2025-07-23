import { makeWASocket, useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import qrcode from 'qrcode'
import TelegramBot from 'node-telegram-bot-api'
import 'dotenv/config'

const telegramToken = process.env.TELEGRAM_TOKEN
const telegramChannelId = process.env.TELEGRAM_CHANNEL_ID
const whatsappGroupId = process.env.WHATSAPP_GROUP_ID

const bot = new TelegramBot(telegramToken, { polling: false })

const startBot = async () => {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info')

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    async getMessage() {
      return { conversation: 'не знайдено повідомлення' }
    }
  })

  sock.ev.on('connection.update', async ({ connection, qr }) => {
    if (qr) {
      qrcode.toDataURL(qr, (err, url) => {
        if (err) {
          console.error('❌ QR генерація не вдалася:', err)
        } else {
          console.log('📲 Відкрий у браузері для сканування QR-коду:\n')
          console.log(url)
        }
      })
    }

    if (connection === 'open') {
      console.log('✅ Підключено до WhatsApp!')
    }

    if (connection === 'close') {
      const shouldReconnect = sock?.lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut
      console.log('❌ Зʼєднання розірвано. Повторне підключення:', shouldReconnect)
      if (shouldReconnect) {
        startBot()
      }
    }
  })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return
    for (const msg of messages) {
      const fromGroup = msg.key.remoteJid === whatsappGroupId
      const isText = msg.message?.conversation || msg.message?.extendedTextMessage?.text

      if (!fromGroup || !isText) return

      const text = msg.message.conversation || msg.message.extendedTextMessage.text
      const alertPhrases = [
        'Alert: Level Yellow',
        'Тривога: Рівень Жовтий',
        'Alert: Level Blue',
        'Тривога: Рівень Синій',
        'Alert: Level Red',
        'Тривога: Рівень Червоний',
        'Alert: Level Green',
        'Відбій: Рівень Зелений'
      ]

      if (alertPhrases.some(p => text.includes(p))) {
        await bot.sendMessage(telegramChannelId, text)
        console.log('📤 Переслано в Telegram:', text)
      } else {
        console.log('⛔ Повідомлення пропущено:', text)
      }
    }
  })
}

startBot()