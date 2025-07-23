import { makeWASocket, useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import qrcode from 'qrcode'
import TelegramBot from 'node-telegram-bot-api'
import 'dotenv/config'
import fs from 'fs'

const telegramToken = process.env.TELEGRAM_BOT_TOKEN
const telegramChannelId = process.env.TELEGRAM_CHANNEL_ID
const whatsappGroupId = process.env.WHATSAPP_GROUP_ID

const bot = new TelegramBot(telegramToken, { polling: false })

const startBot = async () => {
  const { state, saveCreds } = await useMultiFileAuthState('auth')

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    async getMessage() {
      return { conversation: 'не знайдено повідомлення' }
    }
  })

  sock.ev.on('connection.update', async ({ connection, qr }) => {
    if (qr) {
      const qrBuffer = await qrcode.toBuffer(qr)
      fs.writeFileSync('qr.png', qrBuffer)

      // Надсилаємо QR в Telegram
      await bot.sendPhoto(telegramChannelId, qrBuffer, {
        caption: '📲 Відскануй QR-код для підключення WhatsApp'
      })

      console.log('✅ QR-код збережено у файл та надіслано в Telegram')
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
