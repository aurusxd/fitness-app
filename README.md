# fitness-app

Telegram Mini App: фитнес-приложение с ИИ-тренером на DeepSeek.

Источник истины по проекту — [tech.md](tech.md). Правила сессии — [CLAUDE.md](CLAUDE.md).

## Стек

SvelteKit (`adapter-vercel`) · TypeScript · Drizzle ORM + libSQL/Turso · zod · pino · Tailwind + bits-ui · vitest + Playwright.

## Локальный запуск

```sh
npm install
cp .env.example .env
npm run db:migrate:apply
npm run db:seed
npm run dev
```

Минимум для локальной работы в `.env`:

```sh
DEEPSEEK_API_KEY=dev-placeholder-key
TELEGRAM_BOT_TOKEN=dev-placeholder-token
DATABASE_URL=file:./data/app.db
NODE_ENV=development
DEV_TELEGRAM_ID=1
```

`DEV_TELEGRAM_ID` подставляет фиксированную личность вместо Telegram `initData` — без неё приложение в обычном браузере отдаёт 401, потому что вне Telegram подписи нет. В проде обход выключен по `NODE_ENV=production`.

С плейсхолдерным `DEEPSEEK_API_KEY` чат и генерация программ дойдут до DeepSeek и вернут понятную ошибку — это ожидаемо, для настоящих ответов нужен боевой ключ.

## Проверки

```sh
npm run check      # svelte-check
npm run lint       # prettier + eslint
npm run test:unit  # vitest
npm run test:e2e   # playwright
```

E2E поднимают свой dev-сервер на отдельной БД (`data/e2e.db`) и заглушку DeepSeek на 5174, так что живой API не дёргается и локальные данные не затрагиваются.

## Деплой на Vercel

1. Импортировать репозиторий в Vercel — SvelteKit определяется автоматически, `adapter-vercel` уже настроен.
2. Завести базу Turso и получить URL с токеном.
3. Задать переменные окружения проекта:

   | Переменная            | Значение                 |
   | --------------------- | ------------------------ |
   | `DEEPSEEK_API_KEY`    | боевой ключ DeepSeek     |
   | `TELEGRAM_BOT_TOKEN`  | токен бота из BotFather  |
   | `DATABASE_URL`        | `libsql://<db>.turso.io` |
   | `DATABASE_AUTH_TOKEN` | токен Turso              |
   | `NODE_ENV`            | `production`             |

   `DEV_TELEGRAM_ID` и `DEEPSEEK_BASE_URL` в проде **не задаются**.

4. Применить миграции к боевой базе перед первым деплоем:

   ```sh
   DATABASE_URL=libsql://<db>.turso.io DATABASE_AUTH_TOKEN=<token> npm run db:migrate:apply
   ```

5. В BotFather указать URL Vercel как Web App URL бота.

> Сборка на Windows падает на шаге упаковки `adapter-vercel`: он создаёт симлинки, а Windows без Developer Mode их не разрешает. На Linux (в том числе на самой Vercel) и на macOS сборка проходит.
