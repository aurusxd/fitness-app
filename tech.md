# tech.md — ядро проекта

> Единый источник истины. Версионируется, меняется только append-only. Любая сессия Claude Code подчиняется этому файлу дословно и не выдумывает контракты, типы, поля схемы. Не хватает контракта — стоп, зафиксировать блок `CONTRACT GAP` внизу файла (см. раздел «Процесс работы с пробелами в контракте»), не писать код с выдуманным типом.

**v9 — 2026-09-24** — язык приложения: интерфейс целиком на русском, ИИ-тренер отвечает по-русски, названия упражнений остаются английскими (разделы 5, 9). Закрывает `CONTRACT GAP` по локализации.

**v8 — 2026-09-24** — cookie-сессия как транспорт авторизации для документных запросов и SSR-`load`, проверка свежести `auth_date` (раздел 6). Заголовок `Authorization: tma <initData>` физически недоступен навигациям, из-за чего в проде весь раздел `(app)` отвечал 401. Закрывает `CONTRACT GAP` по транспорту.

**v7 — 2026-09-24** — нормализация названий упражнений из ответа ИИ дополнена срезанием пояснений в скобках (раздел 5). Проверено на живом DeepSeek: без этого библиотека засорялась записями вида `Goblet Squat (limited range, pain-free)`.

**v6 — 2026-09-23** — стадия 5: `DEEPSEEK_BASE_URL` для подмены API в e2e (раздел 5, 11). Зафиксирован пробел по rate limiting генерации программ, см. `CONTRACT GAP` внизу файла.

**v5 — 2026-09-23** — dev-обход авторизации через `DEV_TELEGRAM_ID` для локального просмотра вне Telegram (раздел 6, 11).

**v4 — 2026-09-23** — стадия 2: генерация программы ИИ. Зафиксирован дефолт `muscleGroup` для упражнений, созданных из ответа ИИ (раздел 4/5, см. `CONTRACT GAP` внизу файла).

**v3 — 2026-09-23** — деплой на Vercel вместо self-hosted Docker: `adapter-vercel` вместо `adapter-node`, БД — libSQL/Turso вместо `better-sqlite3` (раздел 2, 11). Решение пользователя, см. обоснование в разделе 11.

**v2 — 2026-09-23** — добавлен контракт транспорта `initData` (раздел 6).

**v1 — 2026-09-22** — начальная версия ядра.

---

## 1. Проект

Telegram Mini App, фитнес-приложение по образцу FitStars. Отличие: встроенный ИИ-тренер, который ведёт чат с пользователем и генерирует персональные программы тренировок.

Функциональный периметр v1:

- Авторизация через Telegram (initData).
- Профиль пользователя: цель (набор массы / похудение / поддержание), уровень, ограничения.
- ИИ-тренер: чат + генерация структурированной программы тренировок на основе профиля и диалога.
- Библиотека упражнений (текст/видео-ссылка, группа мышц, инвентарь).
- Мои программы: список сгенерированных программ, просмотр, редактирование состава.
- Журнал тренировок: отметка выполненных подходов/повторов/веса по факту.
- Логирование ключевых операций и ошибок (структурированные логи).

## 2. Стек

- **SvelteKit** (fullstack, `adapter-vercel`, v3), TypeScript.
- **Drizzle ORM** + **libSQL/Turso** (`@libsql/client` + `drizzle-orm/libsql`, v3). Локально — файловый режим (`file:./data/app.db`, без сервера), в проде — удалённая Turso-БД (`DATABASE_URL` = `libsql://...`, `DATABASE_AUTH_TOKEN`). Драйвер асинхронный — весь доступ к БД в репозиториях/сервисах через `await`.
- **DeepSeek API** (`https://api.deepseek.com`, модель `deepseek-chat`) — единственный LLM-провайдер ИИ-тренера.
- **Деплой** — Vercel (serverless functions), v3. Docker/`docker-compose` не используются в проде.
- Логи — структурированные (JSON), через `pino`. Уровни: `error`, `warn`, `info`, `debug`. В проде — `info` и выше.
- **svelte-check** — обязателен в DoD каждой задачи.
- Валидация — **zod**, схемы переиспользуются на клиенте и сервере (DRY, единый источник правды для форм и API).
- Тесты — **vitest** (unit + контрактные), **Playwright** (e2e для критичных путей: авторизация, генерация программы, сохранение тренировки).

## 3. Архитектура и структура папок

Слоистая архитектура внутри вертикальных фич. ООП на уровне домена и сервисов: сущности — классы с поведением, сервисы — классы с внедряемыми зависимостями (репозитории, AI-клиент), а не набор функций со скрытым состоянием.

```
src/
  lib/
    server/
      db/
        schema.ts        # Drizzle-схема, единственный источник схемы БД
        client.ts         # инициализация подключения к SQLite
        migrate.ts
      domain/
        user.ts           # сущности/value objects
        workoutProgram.ts
        exercise.ts
      repositories/
        userRepository.ts
        programRepository.ts
        exerciseRepository.ts
        workoutLogRepository.ts
      services/
        aiTrainerService.ts   # оркестрация DeepSeek: промпт, парсинг, сохранение
        programService.ts
        workoutLogService.ts
      external/
        deepseekClient.ts      # тонкая обёртка над DeepSeek API, интерфейс + реализация
        telegramAuth.ts        # валидация initData
      config.ts            # единый конфиг-модуль, читает env
      logger.ts            # инициализация pino
    types/
      index.ts             # общие TypeScript-типы, шарятся клиентом и сервером
    validation/
      schemas.ts           # zod-схемы (единый источник для форм и API)
    ui/
      primitives/           # Button, Card, Modal, Input, Badge, Tabs, ProgressBar
  routes/
    (app)/
      profile/
      trainer/               # чат с ИИ-тренером — эталонная вертикаль
      programs/
      log/
    api/
      trainer/+server.ts
      programs/+server.ts
      log/+server.ts
  hooks.server.ts           # проверка initData на каждый защищённый запрос
```

Эталонная вертикаль (шаблон для всех остальных фич): `routes/(app)/trainer` + `lib/server/services/aiTrainerService.ts` + `lib/server/repositories/programRepository.ts`. Новая фича повторяет эту раскладку: домен → репозиторий → сервис → `load`/`actions`/`+server.ts` → страница → локальные компоненты.

## 4. Схема БД (Drizzle + SQLite)

```ts
// lib/server/db/schema.ts

export const users = sqliteTable('users', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	telegramId: text('telegram_id').notNull().unique(),
	username: text('username'),
	goal: text('goal', { enum: ['gain', 'lose', 'maintain'] }),
	level: text('level', { enum: ['beginner', 'intermediate', 'advanced'] }),
	constraints: text('constraints'), // свободный текст: травмы, ограничения
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
});

export const exercises = sqliteTable('exercises', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	name: text('name').notNull(),
	muscleGroup: text('muscle_group').notNull(),
	equipment: text('equipment'),
	videoUrl: text('video_url'),
	description: text('description')
});

export const workoutPrograms = sqliteTable('workout_programs', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	userId: integer('user_id')
		.notNull()
		.references(() => users.id),
	title: text('title').notNull(),
	source: text('source', { enum: ['ai_generated', 'manual'] }).notNull(),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
});

export const programExercises = sqliteTable('program_exercises', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	programId: integer('program_id')
		.notNull()
		.references(() => workoutPrograms.id),
	exerciseId: integer('exercise_id')
		.notNull()
		.references(() => exercises.id),
	dayIndex: integer('day_index').notNull(), // день недели в программе (0..6)
	orderIndex: integer('order_index').notNull(), // порядок в дне
	sets: integer('sets').notNull(),
	reps: text('reps').notNull(), // диапазон, напр. "8-12"
	restSeconds: integer('rest_seconds')
});

export const workoutLogs = sqliteTable('workout_logs', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	userId: integer('user_id')
		.notNull()
		.references(() => users.id),
	programExerciseId: integer('program_exercise_id')
		.notNull()
		.references(() => programExercises.id),
	performedAt: integer('performed_at', { mode: 'timestamp' }).notNull(),
	setsDone: integer('sets_done').notNull(),
	repsDone: text('reps_done').notNull(),
	weightKg: real('weight_kg')
});

export const aiChatMessages = sqliteTable('ai_chat_messages', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	userId: integer('user_id')
		.notNull()
		.references(() => users.id),
	role: text('role', { enum: ['user', 'assistant'] }).notNull(),
	content: text('content').notNull(),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
});
```

Индексы: `users.telegramId` (unique, уже задан), `workoutPrograms.userId`, `programExercises.programId`, `workoutLogs.userId`, `aiChatMessages.userId`.

## 5. Контракт ИИ-тренера (DeepSeek API)

- Клиент — `lib/server/external/deepseekClient.ts`, реализует интерфейс `AiClient { chat(messages, options): Promise<AiResponse> }`. Сервис (`aiTrainerService.ts`) зависит от интерфейса, не от конкретного HTTP-вызова, это даёт подменяемость в тестах (fake-клиент вместо реального DeepSeek).
- Ключ `DEEPSEEK_API_KEY` только из env, никогда не в коде и не в логах.
- Режим генерации программы: сервис отправляет системный промпт, требующий ответ **строго в JSON** по фиксированной схеме (`{ title, days: [{ dayIndex, exercises: [{ exerciseName, sets, reps, restSeconds }] }] }`). Ответ парсится и валидируется той же zod-схемой, что описывает `workoutPrograms`/`programExercises`. Если ответ не проходит валидацию — не сохранять в БД, вернуть пользователю ошибку и залогировать сырой ответ на уровне `warn`.
- Названия упражнений из ответа ИИ сопоставляются с таблицей `exercises` по имени (нормализация: lowercase, trim; **(v7)** плюс срезание пояснений в скобках — модель дописывает к названию коуч-заметки вроде `(light, pain-free)`, и промптом это не лечится); не найдено — создаётся новая запись в `exercises` через сервис, а не напрямую. **(v4)** У таких упражнений `muscleGroup = 'unspecified'` (в JSON-контракте группа мышц не передаётся); ручная категоризация — в стадии 4.
- **Язык ответов (v9).** Чат получает системный промпт (`CHAT_SYSTEM_PROMPT`): тренер отвечает по-русски, коротко, без markdown-разметки. До v9 у чата системного промпта не было вообще — модель отвечала на языке последнего сообщения. В режиме генерации программы `title` тоже по-русски, а `exerciseName` остаётся английским каноническим названием: сопоставление с таблицей `exercises` идёт по строке имени, и перевод расплодил бы дубли (см. правила `exerciseName` выше).
- Обычный чат (без генерации программы) — обычный текстовый ответ, без принудительного JSON.
- Лимиты: не более 30 сообщений пользователя в чат в час (rate limit на уровне `aiTrainerService`, а не на клиенте). Превышение — 429 с понятным сообщением. Лимит на **генерацию программ** не определён, см. `CONTRACT GAP` внизу файла.
- **Базовый URL (v6).** Адрес API берётся из `DEEPSEEK_BASE_URL` (по умолчанию `https://api.deepseek.com`). Нужен, чтобы e2e-тесты били в локальную заглушку вместо живого API; в проде не задаётся.
- Таймаут запроса к DeepSeek — 30 секунд, при таймауте/5xx — один ретрай с задержкой 1с, затем ошибка пользователю.
- История чата (`aiChatMessages`) ограничивается последними N сообщениями (N = 20) при формировании контекста запроса к DeepSeek, чтобы не раздувать токены.

## 6. Telegram Mini App: авторизация

- `hooks.server.ts` на каждый запрос к `/api/*` и защищённым роутам `(app)` проверяет `initData` через HMAC-SHA256 с `TELEGRAM_BOT_TOKEN` (см. `lib/server/external/telegramAuth.ts`). Невалидная подпись — 401, дальше запрос не идёт.
- Из валидного `initData` достаётся `telegramId`, по нему находится/создаётся запись в `users` (через `userRepository`, не инлайн-SQL в хуке).
- Клиенту никогда не доверять полям профиля из `initData` кроме `telegramId`/`username` — остальное (роль, права) только из БД.
- **Транспорт (v2).** Клиент передаёт сырую строку `initData` в заголовке `Authorization: tma <initData>` (официальная схема Telegram Mini Apps). `hooks.server.ts` читает заголовок, при отсутствии или неверном префиксе — 401.
- **Dev-обход (v5).** Вне Telegram `initData` не существует, поэтому при `NODE_ENV !== 'production'` **и** заданном `DEV_TELEGRAM_ID` хук подставляет фиксированную личность (`telegramId = DEV_TELEGRAM_ID`, `username = 'dev'`) и логирует это на уровне `warn`. В проде обход выключен жёстко, по `NODE_ENV`.
- **Свежесть `initData` (v8).** `validateInitData` отвергает подпись старше 24 часов по полю `auth_date`, а также `initData` без `auth_date`. Без этого однажды утёкшая строка остаётся валидной вечно, а публичный `POST /api/auth` делает её пригодной для повтора.
- **Cookie-сессия (v8).** Заголовок ставится только на `fetch` из клиента, поэтому документные запросы (открытие Mini App, переходы по вкладкам, `__data.json` при клиентской навигации) авторизуются cookie:
  - `POST /api/auth` — единственный публичный роут под `/api/`. Принимает `Authorization: tma <initData>`, валидирует подпись и ставит cookie `session`. Невалидная или отсутствующая подпись — 401, cookie не ставится.
  - Cookie `session`: `HttpOnly`, `Secure`, `SameSite=None` (Mini App в Telegram Web живёт в кросс-сайтовом iframe), `Path=/`, TTL 24 часа. Значение — `<payload>.<expiresAt>.<hmac>`, где `payload` — base64url от `{ telegramId, username }`, подпись — HMAC-SHA256 ключом, производным от `TELEGRAM_BOT_TOKEN` (`HMAC('TelegramMiniAppSession', botToken)`, отдельный от ключа проверки `initData`). Отдельная env-переменная под секрет сессии не заводится; ротация токена бота инвалидирует все сессии. См. `lib/server/session.ts`.
  - `hooks.server.ts` пускает запрос, если валиден **любой** из двух источников: заголовок (приоритет, обновляет `username`) или cookie. Ни одного — 401 по прежним правилам.
  - Корневой `/` — не серверный редирект, а клиентский бутстрап: читает `window.Telegram.WebApp.initData`, зовёт `POST /api/auth`, затем уходит на `/home`. Вне Telegram `initData` пуст, вызов пропускается, переход всё равно происходит — решение принимает хук: локально пускает dev-обход, в проде отдаёт 401 с объяснением.

## 7. Общие типы (`lib/types/index.ts`)

Формируются автогенерацией из Drizzle-схемы (`$inferSelect`/`$inferInsert`) плюс ручные DTO для API-ответов (`WorkoutProgramDto`, `ChatMessageDto`). Zod-схемы в `lib/validation/schemas.ts` — единственное место, где описывается форма данных для форм и API; типы выводятся из схем (`z.infer`), а не дублируются вручную.

## 8. UI-компоненты

База — **shadcn-svelte** (не писать примитивы с нуля). Перечень примитивов для сборки заранее: `Button`, `Card`, `Input`, `Textarea`, `Modal`, `Badge`, `Tabs`, `ProgressBar`, `ChatBubble` (кастомный, под чат с ИИ-тренером). Kitchen-sink роут `routes/(app)/dev/kitchen-sink` — все примитивы отрендерены для визуальной проверки.

## 9. Правила и конвенции кода

**ООП.** Домен — классы с поведением (`WorkoutProgram.addExercise()`, а не функции, гуляющие по plain-объекту). Сервисы принимают зависимости через конструктор (репозитории, `AiClient`), не создают их сами внутри метода — это и есть подменяемость в тестах.

**Безопасность.**

- Все запросы к БД — только через Drizzle query builder, ни одной ручной конкатенации SQL.
- Все входные данные (body, query, params) валидируются zod-схемой на входе в `+server.ts`/`actions`, до попадания в сервис.
- Секреты (`DEEPSEEK_API_KEY`, `TELEGRAM_BOT_TOKEN`) только через `lib/server/config.ts`, читающий `process.env`; `.env` в `.gitignore`, `.env.example` в репозитории с пустыми значениями.
- Rate limiting на AI-эндпоинт (раздел 5).
- Логи никогда не содержат сырых секретов и полного `initData`.

**Язык интерфейса (v9).**

- Весь пользовательский текст — на русском: подписи, кнопки, плейсхолдеры, пустые состояния и сообщения об ошибках, которые видит пользователь (включая тексты ошибок из `/api/*` и 401-страницу из `hooks.server.ts`).
- Язык один, словаря и i18n-библиотеки нет: строки живут прямо в разметке. Второй язык в периметр v1 не входит; понадобится — это отдельный контракт с бампом версии.
- Код остаётся английским: имена, комментарии, коммиты, логи, а также технические строки, которых пользователь не видит.
- Данные не переводятся: названия упражнений в сиде и в `exercises` английские (см. раздел 5).

**DRY.**

- Валидация формы данных — одна zod-схема на клиент и сервер.
- Типы выводятся из схемы БД и zod-схем, не переписываются руками в нескольких местах.
- Общие UI-паттерны — через примитивы, не копипаста разметки между роутами.

## 10. Тесты

Тесты выводятся из критериев приёмки задачи, не из реализации: тест кодирует контракт, не зеркалит код.

Обязательные типы тестов на слайс:

- **Контрактный тест на стыке.** Fake `AiClient` в тестах `aiTrainerService` проверяет: сервис валидирует ответ ИИ против zod-схемы и отклоняет невалидный JSON, не сохраняя его в БД.
- **Путь ошибки.** Fake `AiClient`, возвращающий таймаут/500, — сервис должен сделать один ретрай и вернуть понятную ошибку, не падать необработанным исключением.
- **Auth.** Невалидная подпись `initData` — 401, валидная — доступ и корректный `telegramId` в контексте запроса.
- **E2E (Playwright) на критичные пути:** авторизация → профиль, чат с ИИ-тренером → генерация и сохранение программы, отметка тренировки в журнале.

PR/коммит без тестов на слайс не считается завершённым (см. Definition of Done).

## 11. Инфраструктура

- **Миграции** — `drizzle-kit generate` из `schema.ts`, применяются через `migrate.ts` (`npm run db:migrate:apply`) вручную/в CI перед деплоем на Vercel, против удалённой Turso-БД (v3). `migrate.ts`/`seed.ts` асинхронные (`await migrate(...)`, `await db.insert(...)`).
- **Сид-скрипт** (`lib/server/db/seed.ts`) — базовый набор упражнений (20-30 штук) для локальной разработки и тестового окружения.
- **Конфиг-модуль** (`lib/server/config.ts`) — единая точка чтения env (через `process.env`, с `dotenv/config` для локального запуска вне SvelteKit, напр. `migrate.ts`), с проверкой обязательных переменных на старте (упасть сразу, если `DEEPSEEK_API_KEY` или `TELEGRAM_BOT_TOKEN` не заданы). `DATABASE_AUTH_TOKEN` опционален (не нужен для локального файлового режима).
- `.env.example`: `DEEPSEEK_API_KEY=`, `TELEGRAM_BOT_TOKEN=`, `DATABASE_URL=file:./data/app.db`, `DATABASE_AUTH_TOKEN=`, `NODE_ENV=`, `DEV_TELEGRAM_ID=` (последняя — только для локального просмотра вне Telegram, в проде не задаётся).
- **Деплой (v3)** — Vercel, `adapter-vercel`. Env-переменные (`DEEPSEEK_API_KEY`, `TELEGRAM_BOT_TOKEN`, `DATABASE_URL`, `DATABASE_AUTH_TOKEN`) задаются в настройках проекта Vercel. Прод-БД — Turso (`DATABASE_URL=libsql://<db>.turso.io`). Docker/`docker-compose` не используются: serverless-окружение Vercel не запускает произвольные контейнеры, а SQLite-файл на диске не переживает между вызовами функций.

## 12. Коммиты, PR, комментарии

- Язык всего: коммиты, PR, комментарии в коде — только английский.
- Формат коммита — Conventional Commits: `type(scope): summary`. `type` из набора `feat|fix|test|refactor|chore|docs`. `summary` в императиве, со строчной буквы, без точки в конце, до ~50 символов.
- Коммитить по ходу работы небольшими логическими шагами, не одним коммитом в конце. Каждый коммит по возможности проходит тайпчек.
- Комментарии в коде — кратко, объясняют _почему_, не пересказывают очевидный код. Закомментированный код не оставлять.
- Активный залог, императив, без em-dash, без филлеров (дисциплина `stop-slop`).

## 13. Definition of Done одной задачи

- `svelte-check` без ошибок.
- `eslint`/`prettier` без ошибок.
- `vitest` зелёный, включая тесты на слайс из раздела 10.
- `build` проходит.
- Миграции (если менялась схема) сгенерированы и применяются без ошибок.
- Задача привязана к слайсу, не смешивает несколько фич в одном PR.

## 14. Дорожная карта по стадиям

1. **Скелет**: репозиторий, Docker, конфиг-модуль, логгер, схема БД + миграции, сид-скрипт, авторизация через `initData`, UI-примитивы + kitchen-sink, эталонная вертикаль `trainer` (чат без генерации программы, просто echo через DeepSeek).
2. **ИИ-генерация программы**: контракт JSON-ответа, парсинг, сохранение в `workoutPrograms`/`programExercises`, отображение на странице `programs`.
3. **Журнал тренировок**: отметка выполненных подходов, история по программе.
4. **Библиотека упражнений**: страница просмотра, фильтр по группе мышц/инвентарю.
5. **Полировка**: rate limiting на AI, обработка ошибок DeepSeek, e2e-тесты на критичные пути, деплой.

## Процесс работы с пробелами в контракте

Если в ходе задачи не хватает контракта, типа или поля схемы, которого нет в этом файле: остановиться, не выдумывать тип, добавить в конец этого раздела запись вида:

```
CONTRACT GAP: <что нужно> — <зачем> — <предлагаемая форма>
```

и только после этого аппендить согласованный контракт выше (в соответствующий раздел) с бампом версии файла.

CONTRACT GAP: способ передачи `initData` от клиента к серверу — раздел 6 описывает только проверку подписи, не транспорт — предлагаемая форма: заголовок `Authorization: tma <initData>` (официальная схема Telegram Mini Apps, см. https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app и `@telegram-apps` conventions). Зафиксировано и перенесено в раздел 6 в v2.

CONTRACT GAP: `exercises.muscleGroup` — `notNull()` в схеме БД (раздел 4), но JSON-контракт ответа ИИ (раздел 5) для новых упражнений отдаёт только `exerciseName`, без группы мышц — предлагаемая форма: упражнения, создаваемые автоматически из ответа ИИ (не найдены в таблице `exercises` по нормализованному имени), получают `muscleGroup = 'unspecified'`; дальнейшая категоризация — ручная курация в стадии 4 (библиотека упражнений). Зафиксировано в v4, см. раздел 5.

CONTRACT GAP: **не решён.** Rate limit на генерацию программ — раздел 5 задаёт лимит только на сообщения в чат (30/час), а `POST /api/programs` дёргает DeepSeek без ограничений: пользователь может вызывать дорогую генерацию сколько угодно. Стадия 5 требует «rate limiting на AI», но число для генерации нигде не задано, поэтому оно не выдумывается. Предлагаемая форма: не более N генераций в час на пользователя (предлагается N = 10), 429 при превышении. Открытый вопрос — как считать: по сохранённым программам (`workoutPrograms.source = 'ai_generated'` за последний час) считать проще всего, но неудачные генерации (невалидный JSON) программу не создают и в лимит не попадут, хотя запрос к API стоят. Честный учёт требует отдельного поля/таблицы, то есть изменения схемы. Нужно решение пользователя.

CONTRACT GAP: Транспорт `initData` для навигаций и SSR-`load` — раздел 6 (v2) описывает только заголовок `Authorization: tma <initData>`, а его клиент может поставить лишь на `fetch` к `/api/*`. Документные запросы (открытие Mini App по кнопке бота, переходы по вкладкам, запрос `__data.json` при клиентской навигации) заголовков не несут, поэтому в проде каждый роут `(app)` отвечает 401: Telegram открывает `/`, серверный `redirect(307)` из `routes/+page.server.ts` ведёт на `/(app)/home`, хук не видит заголовка и падает в `error(401)`. Локально и в e2e это маскировал dev-обход `DEV_TELEGRAM_ID` (v5): `playwright.config.ts` задаёт `DEV_TELEGRAM_ID=999` и `NODE_ENV=development`, так что e2e «авторизация» проверял только заголовок на `/api/*`, а не реальный путь открытия из Telegram.
Предлагаемая форма: обмен `initData` на cookie-сессию. Публичный `POST /api/auth` принимает `Authorization: tma <initData>` (контракт v2 не меняется), валидирует подпись и ставит HttpOnly + Secure + SameSite=None cookie с подписанным `telegramId`; `hooks.server.ts` пропускает запрос, если валиден **любой** из двух источников — заголовок (для `/api/*`) или cookie (для навигаций и SSR-`load`). Корневой `/` вместо серверного редиректа становится клиентским бутстрапом: читает `window.Telegram.WebApp.initData`, зовёт `/api/auth`, затем уходит на `/home`.
Открытые вопросы, требующие решения пользователя: (1) имя и TTL cookie (предлагается `session`, 24 часа); (2) чем подписывать cookie — отдельным `SESSION_SECRET` в env или ключом, производным от `TELEGRAM_BOT_TOKEN`; (3) проверка `auth_date` — сейчас `validateInitData` её игнорирует, то есть однажды утёкший `initData` валиден вечно, предлагается отвергать `initData` старше 24 часов; (4) чем заменить e2e-покрытие, чтобы прод-путь (без `DEV_TELEGRAM_ID`) проверялся тестом.
Решение пользователя: cookie-сессия, ключ производный от `TELEGRAM_BOT_TOKEN`. Остальное принято по предложенным значениям: имя `session`, TTL 24 часа, `auth_date` не старше 24 часов, e2e перестаёт полагаться на `DEV_TELEGRAM_ID` и ходит через реальный бутстрап. Зафиксировано в v8, см. раздел 6.

CONTRACT GAP: Язык интерфейса — в `tech.md` не было сказано ни слова про язык приложения, а весь UI, тексты ошибок и промпты ИИ написаны по-английски, тогда как аудитория русскоязычная. Предлагаемая форма: выбрать между одним языком в разметке, словарём с автоопределением по `language_code` из initData и словарём с переключателем в профиле; отдельно — язык ответов ИИ и язык названий упражнений.
Решение пользователя: только русский, строки прямо в разметке, без словаря и переключателя; ИИ-тренер отвечает по-русски, названия упражнений остаются английскими, чтобы не ломать сопоставление по имени и не плодить дубли в библиотеке. Зафиксировано в v9, см. разделы 5 и 9.
