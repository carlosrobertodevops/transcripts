# transcripts — Especificação Técnica

**Data:** 2026-05-08

Documento técnico de especificação de API + modelos de dados para o SaaS `transcripts` (transcrição de mídia → texto PT-BR). Implementação na raiz do repositório (`src/`).

---

## Convenções

- **Base URL**: `/api`
- **Autenticação**: Cookie `transcripts_session` (JWT HS256, 7 dias)
- **Refresh**: Cookie `transcripts_refresh` (JWT HS256, 30 dias)
- **Content-Type**: `application/json` (exceto upload, que é `multipart/form-data`)
- **Charset**: UTF-8
- **Validação**: Zod 4 (schemas em `src/lib/zod.ts`)
- **Status codes**: `200 OK`, `201 Created`, `204 No Content`, `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `409 Conflict`, `413 Payload Too Large`, `422 Unprocessable Entity`, `500 Internal Server Error`
- **Formato de erro**:
  ```json
  { "error": "<code>", "message": "<opcional>", "details": {} }
  ```

---

## Modelos de Dados

Schema real em `src/db/schema.ts`. PostgreSQL 16 + Drizzle ORM 0.36.

### `users`

| Coluna | Tipo | Nullable | Default | Descrição |
| --- | --- | --- | --- | --- |
| `id` | UUID | NO | `gen_random_uuid()` | PK |
| `email` | TEXT | NO | — | Único |
| `passwordHash` | TEXT | NO | — | bcrypt 10 rounds |
| `name` | TEXT | YES | — | Nome do usuário |
| `avatarUrl` | TEXT | YES | — | URL do avatar |
| `role` | ENUM `user_role` | NO | `'user'` | `user` \| `admin` |
| `createdAt` | TIMESTAMP | NO | `now()` | |
| `updatedAt` | TIMESTAMP | NO | `now()` | |

### `transcripts`

| Coluna | Tipo | Nullable | Default | Descrição |
| --- | --- | --- | --- | --- |
| `id` | UUID | NO | `gen_random_uuid()` | PK |
| `ownerId` | UUID | NO | — | FK → `users.id` cascade |
| `title` | TEXT | NO | — | |
| `operationName` | TEXT | YES | — | Nome da operação |
| `analysis` | TEXT | YES | — | Análise/resumo |
| `status` | ENUM `transcript_status` | NO | `'pending'` | `pending` \| `processing` \| `done` \| `failed` |
| `position` | INTEGER | NO | `0` | Ordem (DnD) |
| `createdAt` | TIMESTAMP | NO | `now()` | |
| `updatedAt` | TIMESTAMP | NO | `now()` | |

### `media`

| Coluna | Tipo | Nullable | Default | Descrição |
| --- | --- | --- | --- | --- |
| `id` | UUID | NO | `gen_random_uuid()` | PK |
| `transcriptId` | UUID | NO | — | FK → `transcripts.id` cascade |
| `filename` | TEXT | NO | — | Nome original |
| `mime` | TEXT | NO | — | `audio/*` ou `video/*` |
| `sizeBytes` | INTEGER | NO | — | |
| `storagePath` | TEXT | NO | — | Caminho relativo no `STORAGE_DIR` |
| `durationSeconds` | REAL | YES | — | Definido pelo worker |
| `createdAt` | TIMESTAMP | NO | `now()` | |

### `transcriptionJobs`

| Coluna | Tipo | Nullable | Default | Descrição |
| --- | --- | --- | --- | --- |
| `id` | UUID | NO | `gen_random_uuid()` | PK |
| `mediaId` | UUID | NO | — | FK → `media.id` cascade |
| `provider` | TEXT | NO | — | `groq` \| `openai` |
| `status` | ENUM `job_status` | NO | `'pending'` | `pending` \| `processing` \| `done` \| `failed` |
| `attempts` | INTEGER | NO | `0` | Retries (max 3) |
| `error` | TEXT | YES | — | Mensagem de falha |
| `startedAt` | TIMESTAMP | YES | — | |
| `finishedAt` | TIMESTAMP | YES | — | |
| `createdAt` | TIMESTAMP | NO | `now()` | |

### `transcriptSegments`

| Coluna | Tipo | Nullable | Default | Descrição |
| --- | --- | --- | --- | --- |
| `id` | UUID | NO | `gen_random_uuid()` | PK |
| `mediaId` | UUID | NO | — | FK → `media.id` cascade |
| `startMs` | INTEGER | NO | — | |
| `endMs` | INTEGER | NO | — | |
| `text` | TEXT | NO | — | |

### `shares`

| Coluna | Tipo | Nullable | Default | Descrição |
| --- | --- | --- | --- | --- |
| `id` | UUID | NO | `gen_random_uuid()` | PK |
| `transcriptId` | UUID | NO | — | FK → `transcripts.id` cascade |
| `ownerId` | UUID | NO | — | FK → `users.id` cascade |
| `sharedWithUserId` | UUID | NO | — | FK → `users.id` cascade |
| `canEdit` | BOOLEAN | NO | `true` | |
| `createdAt` | TIMESTAMP | NO | `now()` | |
| **Único** | — | — | — | `(transcriptId, sharedWithUserId)` |

### `notifications`

| Coluna | Tipo | Nullable | Default | Descrição |
| --- | --- | --- | --- | --- |
| `id` | UUID | NO | `gen_random_uuid()` | PK |
| `userId` | UUID | NO | — | FK → `users.id` cascade |
| `type` | TEXT | NO | — | `transcription_done` \| `transcript_updated` \| `transcript_shared` |
| `payload` | JSONB | YES | — | |
| `readAt` | TIMESTAMP | YES | — | `null` = não lida |
| `createdAt` | TIMESTAMP | NO | `now()` | |

---

## Schemas Zod

`src/lib/zod.ts`:

```ts
export const emailSchema = z.email();
export const passwordSchema = z.string().min(6).max(72);

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const registerSchema = z.object({
  name: z.string().min(2).max(80),
  email: emailSchema,
  password: passwordSchema,
});

export const transcriptCreateSchema = z.object({
  title: z.string().min(1).max(120),
  operationName: z.string().max(120).optional(),
  analysis: z.string().optional(),
});

export const transcriptUpdateSchema = transcriptCreateSchema.partial();

export const reorderSchema = z.array(
  z.object({
    id: z.uuid(),
    position: z.number().int().nonnegative(),
  })
);

export const shareSchema = z.object({
  email: emailSchema,
  canEdit: z.boolean().default(true),
});

export const passwordChangeSchema = z.object({
  current: passwordSchema,
  next: passwordSchema,
});
```

---

## Endpoints

### Auth (`src/server/routes/auth.ts`)

#### `POST /api/auth/register`

Cria conta nova.

- **Body** (Zod `registerSchema`): `{ name, email, password }`
- **Response 201**: `{ user: { id, email, name, role }, access }`
- **Set-Cookie**: `transcripts_session` (7d), `transcripts_refresh` (30d) — `httpOnly samesite=lax`
- **Erros**: `409 email_taken`, `422 validation`
- **Auth**: não

#### `POST /api/auth/login`

- **Body** (Zod `loginSchema`): `{ email, password }`
- **Response 200**: `{ user, access }`
- **Set-Cookie**: idem register
- **Erros**: `401 invalid_credentials`, `422 validation`
- **Auth**: não

#### `POST /api/auth/logout`

- **Response 200**: `{ ok: true }`
- **Set-Cookie**: ambos cookies com `Max-Age=0`
- **Auth**: opcional

#### `GET /api/auth/me`

- **Response 200**: `{ user: { id, email, name, role, avatarUrl, createdAt } }`
- **Erros**: `401 unauthorized`
- **Auth**: required

#### `POST /api/auth/refresh`

- **Auth**: cookie `transcripts_refresh`
- **Response 200**: `{ user, access }`
- **Erros**: `401 invalid_refresh`

---

### Transcripts (`src/server/routes/transcripts.ts`)

#### `GET /api/transcripts?q=&page=1`

Lista transcrições acessíveis (owner OR shared) ordenadas por `position asc, createdAt desc`.

- **Query**: `q` (busca em `title`, `operationName`, `analysis`), `page` (default 1, size 30)
- **Response 200**: `{ items: Transcript[], page, hasMore }` — cada item inclui `media[]`
- **Auth**: required

#### `POST /api/transcripts`

- **Body** (Zod `transcriptCreateSchema`): `{ title, operationName?, analysis? }`
- **Response 201**: `{ transcript }` com `position = max(position)+1`
- **Auth**: required

#### `GET /api/transcripts/:id`

- **Response 200**: `{ transcript, media: Media[], segments: Segment[] }`
- **Erros**: `403 forbidden` (não é owner nem shared), `404 not_found`
- **Auth**: required

#### `PATCH /api/transcripts/:id`

- **Body** (Zod `transcriptUpdateSchema`): `{ title?, operationName?, analysis? }`
- **Response 200**: `{ ok: true }`
- **Side-effect**: cria `notifications` para todos `sharedWithUserId` (`type='transcript_updated'`)
- **Permissão**: owner OR share com `canEdit=true`
- **Erros**: `403`, `404`, `422`

#### `PATCH /api/transcripts/reorder`

- **Body** (Zod `reorderSchema`): `Array<{ id, position }>`
- **Response 200**: `{ ok: true }`
- **Transação**: Drizzle `db.transaction`
- **Permissão**: cada id deve ser owned by `user.id`

#### `DELETE /api/transcripts/:id`

- **Response 204**
- **Permissão**: owner OR `role='admin'`
- **Cascade**: media, segments, jobs, shares (FK)

---

### Media (`src/server/routes/media.ts`)

#### `POST /api/transcripts/:id/media`

Upload múltiplo. Valida mime `audio/*` ou `video/*`. Para cada arquivo cria `media` + `transcriptionJobs(status='pending')` e atualiza `transcript.status='processing'`.

- **Body**: `multipart/form-data` campo `files` (múltiplo)
- **Response 201**: `{ media: Media[], jobsQueued: N }`
- **Limites**: 500 MB/arquivo
- **Permissão**: owner OR share com `canEdit`
- **Erros**: `400 invalid_mime`, `413 too_large`

#### `DELETE /api/media/:id`

- **Response 204**
- **Side-effect**: `storage.delete(storagePath)`
- **Permissão**: owner

---

### Shares (`src/server/routes/shares.ts`)

#### `POST /api/transcripts/:id/share`

- **Body** (Zod `shareSchema`): `{ email, canEdit }`
- **Response 201**: `{ share }`
- **Side-effect**: cria `notifications` (`type='transcript_shared'`)
- **Erros**: `404 user_not_found`, `409 already_shared`

#### `GET /api/transcripts/:id/shares`

- **Response 200**: `{ shares: Array<{ id, sharedWithUserId, sharedWithEmail, sharedWithName, canEdit, createdAt }> }`
- **Permissão**: owner

#### `DELETE /api/shares/:id`

- **Response 204**
- **Permissão**: owner do transcript original

---

### Notifications (`src/server/routes/notifications.ts`)

#### `GET /api/notifications?unread=1`

- **Response 200**: `Notification[]` (ordem `createdAt desc`, limit 50)

#### `PATCH /api/notifications/:id/read`

- **Response 200**: `{ notification: { id, readAt } }`

#### `POST /api/notifications/read-all`

- **Response 200**: `{ updated: N }`

---

### Users (`src/server/routes/users.ts`)

#### `GET /api/users/me`

- **Response 200**: user sem `passwordHash`

#### `PATCH /api/users/me`

- **Body**: `{ name?, avatarUrl? }`
- **Response 200**: user atualizado

#### `POST /api/users/me/password`

- **Body** (Zod `passwordChangeSchema`): `{ current, next }`
- **Response 200**: `{ ok: true }`
- **Erros**: `401 invalid_current`, `422`

#### `DELETE /api/users/me`

- **Response 204**
- **Cascade**: deleta tudo que pertence ao user.

---

### Jobs (interno, `src/server/routes/jobs.ts`)

#### `POST /api/jobs/run`

Worker container chama a cada 15s.

- **Header**: `x-internal-key: $INTERNAL_API_KEY`
- **Response 200**: `{ ok: true, processed: N }`
- **Comportamento**: `runPendingJobs(5)` em `src/server/services/jobs.ts`:
  1. Pega jobs `status='pending'` (limit 5)
  2. Marca `processing`, `attempts++`
  3. Lê `media`, ffmpeg pré-processa se vídeo
  4. Chama `getProvider().transcribe(audioPath, 'pt')` (Groq Whisper-large-v3 default)
  5. Insere `transcriptSegments`, atualiza `media.durationSeconds`
  6. Marca job `done`. Quando todos jobs do transcript estão `done`: `transcript.status='done'` + `notifications(type='transcription_done')` para owner
  7. Em erro: marca `failed` se `attempts>=3`, senão volta `pending` para retry
- **Erros**: `401 invalid_internal_key`

---

## Códigos de Erro Globais

| Code | Status | Significado |
| --- | --- | --- |
| `unauthorized` | 401 | Sem cookie de sessão válido |
| `forbidden` | 403 | Sem permissão (não é owner/share/admin) |
| `not_found` | 404 | Recurso inexistente |
| `validation` | 422 | Zod schema inválido (`details` no payload) |
| `email_taken` | 409 | Registro com email já usado |
| `invalid_credentials` | 401 | Login com email/senha errados |
| `user_not_found` | 404 | Email de share não corresponde a user |
| `already_shared` | 409 | Share duplicado |
| `invalid_mime` | 400 | Upload com tipo inválido |
| `too_large` | 413 | Arquivo > 500 MB |
| `invalid_internal_key` | 401 | Worker sem header correto |

---

## Limites

- **Tamanho máx upload**: 500 MB por arquivo
- **MIME aceitos**: `audio/*`, `video/*`
- **Senha**: 6..72 caracteres (limite bcrypt)
- **Page size (transcripts)**: 30
- **Notifications list**: 50
- **JWT TTL**: access 7d, refresh 30d
- **Worker tick**: 15s
- **Job retries**: 3

---

## Exemplos cURL

### Registro + login

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Carla Souza","email":"carla@advsouza.com.br","password":"senha-forte-123"}' \
  -c cookies.txt

curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"carla@advsouza.com.br","password":"senha-forte-123"}' \
  -c cookies.txt
```

### Criar transcrição + upload

```bash
curl -X POST http://localhost:3000/api/transcripts \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"title":"Audiência 12/05 — Souza vs. Acme","operationName":"Acme/2026"}'

# id retornado no JSON acima
TID=...

curl -X POST http://localhost:3000/api/transcripts/$TID/media \
  -b cookies.txt \
  -F "files=@audiencia.opus" \
  -F "files=@anexo.mp4"
```

### Compartilhar

```bash
curl -X POST http://localhost:3000/api/transcripts/$TID/share \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"email":"socio@advsouza.com.br","canEdit":true}'
```

---

## Webhook / Worker Interno

`POST /api/jobs/run` com header `x-internal-key`. O serviço `worker` no `docker-compose.yml` chama esse endpoint a cada 15 segundos. NÃO expor publicamente — em deploy use rede interna.

---

## Notas de Implementação

- Plugin Elysia `auth` (`src/server/plugins/auth.ts`) injeta `user` no contexto via cookie `transcripts_session`.
- Plugin `error` normaliza Zod → 422, throws → 500.
- Plugin `cors` permite `NEXT_PUBLIC_APP_URL` + `localhost:3000`, com `credentials: true`.
- Drizzle transações (`db.transaction(async tx => ...)`) usadas em reorder.
- Cascade de FK em `media`, `transcriptionJobs`, `transcriptSegments`, `shares`, `notifications`.
- Storage abstrato `StorageProvider` (`src/server/services/storage.ts`) com `LocalStorage` em `STORAGE_DIR=./uploads`. Trocar por S3 sem refactor de routes.
- Provedores transcrição (`src/server/services/transcription.ts`): `GroqProvider` (default, `whisper-large-v3`, `language=pt`, `verbose_json`), `OpenAIProvider` (fallback, `whisper-1`).
- ffmpeg via `Bun.spawn(["ffmpeg","-y","-i", input, "-vn","-acodec","libmp3lame","-ar","16000","-ac","1", out])` quando mime começa com `video/`.
