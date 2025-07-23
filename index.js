import {
  makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason
} from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import fetch from 'node-fetch'
import dotenv from 'dotenv'
import qrcode from 'qrcode-terminal'

dotenv.config()

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const TELEGRAM_CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID
const WHATSAPP_GROUP_ID = process.env.WHATSAPP_GROUP_ID

const allowedMessages = [
  "⚠Alert: Level Yellow ⚠ ⚠Тривога: Рівень Жовтий ⚠",
  "🔷Alert: Level Blue 🔷🔷Тривога: Рівень Синій 🔷",
  "🚨Alert: Level Red - Proceed to shelter! 🚨🚨Тривога: Рівень Червоний, Пройдіть в укриття! 🚨",
  "✅Alert: Level Green ✅ ✅Відбій: Рівень Зелений ✅"
]

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info')
  const { version } = await fetchLatestBaileysVersion()

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false
  })

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update

    if (qr) {
      console.log('📲 Скануй QR-код у WhatsApp:')
      qrcode.generate(qr, { small: true })
    }

    if (connection === 'close') {
      const shouldReconnect =
        (lastDisconnect?.error instanceof Boom) &&
        lastDisconnect.error.output?.statusCode !== DisconnectReason.loggedOut
      console.log('❌ Зʼєднання закрито. Перепідключення:', shouldReconnect)
      if (shouldReconnect) {
        startBot()
      }
    } else if (connection === 'open') {
      console.log('✅ Підключено до WhatsApp!')
    }
  })

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0]
    if (!msg.message || msg.key.remoteJid !== WHATSAPP_GROUP_ID) return

    const text = msg.message.conversation || msg.message.extendedTextMessage?.text
    if (text && allowedMessages.includes(text.trim())) {
      console.log(`📩 Пересилаю в Telegram: ${text}`)
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHANNEL_ID,
          text
        })
      })
    } else {
      console.log(`⛔ Повідомлення пропущено: ${text?.slice(0, 100)}`)
    }
  })

  sock.ev.on('creds.update', saveCreds)
}

startBot()