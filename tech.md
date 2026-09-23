# tech.md — ядро проекта

> Единый источник истины. Версионируется, меняется только append-only. Любая сессия Claude Code подчиняется этому файлу дословно и не выдумывает контракты, типы, поля схемы. Не хватает контракта — стоп, зафиксировать блок `CONTRACT GAP` внизу файла (см. раздел «Процесс работы с пробелами в контракте»), не писать код с выдуманным типом.

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

- **SvelteKit** (fullstack, `adapter-node`), TypeScript.
- **Drizzle ORM** + **SQLite** (`better-sqlite3` в проде, файл БД монтируется как volume в Docker).
- **DeepSeek API** (`https://api.deepseek.com`, модель `deepseek-chat`) — единственный LLM-провайдер ИИ-тренера.
- **Docker** — единый `Dockerfile` + `docker-compose.yml`, volume под SQLite-файл и логи.
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
- Названия упражнений из ответа ИИ сопоставляются с таблицей `exercises` по имени (нормализация: lowercase, trim); не найдено — создаётся новая запись в `exercises` через сервис, а не напрямую.
- Обычный чат (без генерации программы) — обычный текстовый ответ, без принудительного JSON.
- Лимиты: не более 30 сообщений пользователя в чат в час (rate limit на уровне `aiTrainerService`, а не на клиенте). Превышение — 429 с понятным сообщением.
- Таймаут запроса к DeepSeek — 30 секунд, при таймауте/5xx — один ретрай с задержкой 1с, затем ошибка пользователю.
- История чата (`aiChatMessages`) ограничивается последними N сообщениями (N = 20) при формировании контекста запроса к DeepSeek, чтобы не раздувать токены.

## 6. Telegram Mini App: авторизация

- `hooks.server.ts` на каждый запрос к `/api/*` и защищённым роутам `(app)` проверяет `initData` через HMAC-SHA256 с `TELEGRAM_BOT_TOKEN` (см. `lib/server/external/telegramAuth.ts`). Невалидная подпись — 401, дальше запрос не идёт.
- Из валидного `initData` достаётся `telegramId`, по нему находится/создаётся запись в `users` (через `userRepository`, не инлайн-SQL в хуке).
- Клиенту никогда не доверять полям профиля из `initData` кроме `telegramId`/`username` — остальное (роль, права) только из БД.

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

- **Миграции** — `drizzle-kit generate` из `schema.ts`, применяются на старте контейнера (`migrate.ts` перед стартом сервера) или отдельным шагом в `docker-compose`.
- **Сид-скрипт** (`lib/server/db/seed.ts`) — базовый набор упражнений (20-30 штук) для локальной разработки и тестового окружения.
- **Конфиг-модуль** (`lib/server/config.ts`) — единая точка чтения env, с проверкой обязательных переменных на старте (упасть сразу, если `DEEPSEEK_API_KEY` или `TELEGRAM_BOT_TOKEN` не заданы).
- `.env.example`: `DEEPSEEK_API_KEY=`, `TELEGRAM_BOT_TOKEN=`, `DATABASE_URL=file:./data/app.db`, `NODE_ENV=`.
- **Docker**: `Dockerfile` — multi-stage (build + node runtime), `docker-compose.yml` — volume под `./data` (SQLite-файл) и `./logs`.

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
