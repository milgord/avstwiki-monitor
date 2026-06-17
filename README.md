# avstwiki-monitor

Мониторинг изменений на avstwiki.org с уведомлениями в Telegram.

## Как работает

- GitHub Actions раз в 3 часа открывает все страницы avstwiki.org через Playwright (headless Chrome)
- Сравнивает хэш текста с предыдущим запуском
- Если текст изменился — шлёт сообщение в Telegram-чат со ссылкой на изменённую страницу

## Настройка

### 1. Добавь бота в чат
Добавь [@avstwiki_upd_bot](https://t.me/avstwiki_upd_bot) в чат и отправь сообщение.

### 2. Узнай chat_id
Открой в браузере:
```
https://api.telegram.org/bot<TOKEN>/getUpdates
```
Найди `"chat":{"id": -100XXXXXXXXXX}` — это chat_id.

### 3. Добавь секреты в GitHub
В репозитории: Settings → Secrets and variables → Actions → New repository secret:
- `TELEGRAM_BOT_TOKEN` = токен бота
- `TELEGRAM_CHAT_ID` = chat_id группы

### 4. Включи Actions
В репозитории: Actions → включи workflows.

Первый запуск запомнит текущее состояние страниц (без уведомлений). Со второго запуска начнёт отслеживать изменения.

Можно запустить вручную: Actions → Monitor avstwiki.org → Run workflow.

## Отслеживаемые страницы

38 ключевых страниц: ВНЖ, документы, апостиль, поступление, жильё, банки, работа, продление и др.

Добавить/убрать страницы: отредактируй массив `URLS` в `monitor.js`.
