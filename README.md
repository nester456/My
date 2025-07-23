# WhatsApp → Telegram Forwarder

Цей бот пересилає тривожні повідомлення з WhatsApp-групи в Telegram-канал.

## 🔧 Налаштування

1. Клонуй репозиторій або завантаж zip
2. Створи `.env` файл:
```
TELEGRAM_BOT_TOKEN=your_token_here
TELEGRAM_CHANNEL_ID=your_channel_id_here
WHATSAPP_GROUP_ID=your_group_id_here
```

3. Встанови залежності:
```bash
npm install
```

4. Запусти локально:
```bash
npm start
```

## 🚀 Автодеплой на Railway

1. Створи проект на [https://railway.app](https://railway.app)
2. Під'єднай GitHub репозиторій
3. Додай змінні оточення в "Variables"
4. Railway автоматично запустить бота

## ✅ Підтримувані повідомлення

Бот пересилає лише:
- ⚠ Жовтий рівень
- 🔷 Синій рівень
- 🚨 Червоний рівень
- ✅ Зелений рівень
