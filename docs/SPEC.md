# Technical Specification — Chegii Transcripts

**Data:** 2026-05-14 | **Schema:** `src/db/schema.ts` | **Rotas:** `src/server/routes/*.ts` | **Última migração:** `drizzle/0008_add_media_hash.sql`

SaaS transcrição: upload média → fila assíncrona → Whisper local/Groq/OpenAI → edição com segmentos editáveis.

---

## API Overview

| Item | Valor |
|------|-------|
| **Base URL** | `/api` (Elysia via Next.js App Router catch-all) |
| **Auth** | JWT em cookies `transcripts_access` (7d) + `transcripts_refresh` (30d) |
| **Payload JWT** | `{ sub: user.id, email, role }` — **sempre ler `sub` como user ID** |
| **Content-Type** | `application/json` (multipart/form-data para upload) |
| **Validação** | Zod 4 (schemas em `src/lib/zod.ts`) |
| **Status codes** | RFC 7231: 200, 201, 204, 400, 401, 403, 404, 409, 413, 422, 500 |
| **Errors** | `{ error: "code" }` ou `{ error: "code", message: "..." }` |

---

## Database Schema

PostgreSQL 16 + Drizzle ORM. Real file: `src/db/schema.ts`.

### Users

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | random | PK |
| `email` | text | NO | — | UNIQUE |
| `passwordHash` | text | YES | — | bcrypt |
| `name` | text | YES | — | |
| `avatarUrl` | text | YES | — | |
| `role` | enum | NO | 'user' | 'user' \| 'admin' |
| `createdAt` | timestamp | NO | now() | |
| `updatedAt` | timestamp | NO | now() | |

### Transcripts

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | random | PK |
| `ownerId` | uuid | NO | — | FK → users, cascade |
| `title` | text | NO | — | |
| `operationName` | text | YES | — | |
| `operationDate` | timestamp | YES | — | |
| `transcriptionDate` | timestamp | YES | — | |
| `analysis` | text | YES | — | |
| `transcriptHtml` | text | YES | — | rendered segments |
| `status` | enum | NO | 'pending' | pending \| processing \| done \| failed |
| `position` | int | NO | 0 | custom order (DnD) |
| `deletedAt` | timestamp | YES | — | soft delete |
| `createdAt` | timestamp | NO | now() | |
| `updatedAt` | timestamp | NO | now() | |

### Media

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | random | PK |
| `transcriptId` | uuid | NO | — | FK → transcripts, cascade |
| `filename` | text | NO | — | original name |
| `mime` | text | NO | — | audio/\* or video/\* |
| `sizeBytes` | int | YES | — | |
| `storagePath` | text | YES | — | relative to STORAGE_DIR |
| `durationSeconds` | float | YES | — | from worker |
| `description` | text | YES | — | user-provided |
| `transcriptHtml` | text | YES | — | rendered segments |
| `hash` | text | YES | — | SHA-256 do arquivo (migração 0008). Populado em uploads novos; legados ficam null até `backfill-media-hash.ts`. |
| `createdAt` | timestamp | NO | now() | |

### Transcription Jobs

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | random | PK |
| `mediaId` | uuid | NO | — | FK → media, cascade |
| `provider` | text | NO | — | local \| groq \| openai |
| `status` | enum | NO | 'pending' | pending \| processing \| done \| failed |
| `attempts` | int | NO | 0 | retry counter (max 3) |
| `error` | text | YES | — | error message on fail |
| `segmentCount` | int | NO | 0 | # of segments created |
| `processingMs` | int | YES | — | duration |
| `startedAt` | timestamp | YES | — | |
| `finishedAt` | timestamp | YES | — | |
| `createdAt` | timestamp | NO | now() | |

### Transcript Segments

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | random | PK |
| `mediaId` | uuid | NO | — | FK → media, cascade |
| `startMs` | int | NO | — | milliseconds from start |
| `endMs` | int | NO | — | milliseconds from start |
| `text` | text | NO | — | segment transcription |

### Shares

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | random | PK |
| `transcriptId` | uuid | NO | — | FK → transcripts, cascade |
| `ownerId` | uuid | NO | — | FK → users (owner), cascade |
| `sharedWithUserId` | uuid | NO | — | FK → users (recipient), cascade |
| `canEdit` | boolean | NO | true | false = read-only |
| `createdAt` | timestamp | NO | now() | |
| **UNIQUE** | — | — | — | (transcriptId, sharedWithUserId) |

### Notifications

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | random | PK |
| `userId` | uuid | NO | — | FK → users, cascade |
| `type` | text | NO | — | transcript_updated, etc. |
| `payload` | jsonb | YES | — | context (transcriptId, title, etc.) |
| `readAt` | timestamp | YES | — | null = unread |
| `createdAt` | timestamp | NO | now() | |

### Tags

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | random | PK |
| `ownerId` | uuid | NO | — | FK → users, cascade |
| `name` | text | NO | — | tag label |
| `color` | text | NO | '#6366f1' | hex #rrggbb |
| `createdAt` | timestamp | NO | now() | |
| **UNIQUE** | — | — | — | (ownerId, name) |

---

## Zod Schemas

File: `src/lib/zod.ts`

```typescript
export const emailSchema = z.string().email();
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
    id: z.string().uuid(),
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

### Permissões por role (transcripts/media/shares)

Aplicadas em `src/server/routes/{transcripts,media,shares}.ts` via helpers de `src/lib/permissions.ts`:

| Helper | Regra |
|--------|-------|
| `canViewTranscript(actor, owner, share?)` | self ∨ share ∨ (actor !== "viewer" ∧ rank(actor) ≥ rank(owner)) |
| `canEditTranscript(actor, owner, share?)` | actor !== "viewer" ∧ (self ∨ (share ∧ canEdit) ∨ rank(actor) > rank(owner)) |
| `canDeleteTranscript(actor, owner)` | actor !== "viewer" ∧ (self ∨ rank(actor) > rank(owner)) |
| `canCreateTranscript(actor)` | actor !== "viewer" |
| `visibleOwnerRoles(actor)` | filtro de listagem (`GET /transcripts`) por role do owner |

Rank: `super_admin=4 > admin=3 > pro=2 > viewer=1`.

### Export (`src/server/services/export.ts`)

`GET /api/transcripts/:id/export?format=txt|html|doc|docx` → `200 OK` (binary attachment).

- Validação: `format ∈ {txt, html, doc, docx}` (default `docx`).
- Auth: `requireAuth`. Owner ou share recipient (canEdit irrelevante para read).
- Body retornado por `exportTranscript({ transcript, media, segments, ownerName, ownerEmail })`.
- Inclui em todos os formatos: título, operação, datas, análise (HTML→texto), tabela de mídias com **SHA-256 (`media.hash`)**, segmentos com `[HH:MM:SS]`, footer com proprietário.
- Filename via `buildExportFilename(transcript, format)`.

### Retranscribe (`src/server/routes/media.ts`)

`POST /api/media/:id/retranscribe` → `202 Accepted` ou `200 OK`.

- Cria novo `transcriptionJobs` (status `pending`) para a mídia existente sem reupload.
- Reseta `transcripts.status` se necessário.

### Auth (`src/server/routes/auth.ts`)

#### POST `/auth/register`

**Request:**
```json
{ "name": "João Silva", "email": "joao@example.com", "password": "senha123" }
```

**Response (201):**
```json
{
  "user": { "id": "uuid", "email": "joao@example.com", "name": "João Silva", "role": "user" },
  "access": "jwt-token"
}
```

| Field | Validation |
|-------|-----------|
| name | 2–80 chars |
| email | RFC 5322 |
| password | 6–72 chars |

**Set-Cookie:** `transcripts_access`, `transcripts_refresh` (httpOnly, sameSite=lax)

**Errors:** `409 email_taken`, `422 validation`

---

#### POST `/auth/login`

**Request:**
```json
{ "email": "joao@example.com", "password": "senha123" }
```

**Response (200):**
```json
{
  "user": { "id": "uuid", "email": "joao@example.com", "name": "João Silva", "role": "user" },
  "access": "jwt-token"
}
```

**Set-Cookie:** same as register

**Errors:** `401 invalid_credentials`

---

#### POST `/auth/logout`

**Response (200):**
```json
{ "ok": true }
```

**Set-Cookie:** both cookies with `Max-Age=0`

---

#### GET `/auth/me`

**Auth:** JWT required

**Response (200):**
```json
{
  "user": { "id": "uuid", "email": "joao@example.com", "name": "João Silva", "role": "user" }
}
```

**Errors:** `401 unauthorized`

---

#### POST `/auth/refresh`

**Auth:** cookie `transcripts_refresh`

**Response (200):**
```json
{
  "user": { "id": "uuid", "email": "joao@example.com", "name": "João Silva", "role": "user" }
}
```

**Errors:** `401 invalid_refresh_token`

---

### Transcripts (`src/server/routes/transcripts.ts`)

#### GET `/transcripts?q=...&page=1`

**Auth:** JWT required

**Query params:**
- `q` — search title/operationName/analysis
- `page` — default 1, limit 30

**Response (200):**
```json
{
  "items": [
    {
      "id": "uuid", "ownerId": "uuid", "title": "...", "operationName": "...",
      "operationDate": "2026-05-10T...", "transcriptionDate": "2026-05-11T...",
      "analysis": "...", "transcriptHtml": null,
      "status": "processing", "position": 0, "deletedAt": null,
      "createdAt": "...", "updatedAt": "...",
      "media": [ /* media array */ ]
    }
  ],
  "page": 1,
  "hasMore": false
}
```

**Access:** owner OR shared user (soft-delete: `deletedAt IS NULL`)

---

#### POST `/transcripts`

**Auth:** JWT required

**Request:**
```json
{
  "title": "Operação XYZ",
  "operationName": "xyz-123",
  "operationDate": "2026-05-10",
  "transcriptionDate": "2026-05-11",
  "analysis": "..."
}
```

**Response (201):**
```json
{
  "id": "uuid", "ownerId": "uuid", "title": "Operação XYZ", "operationName": "xyz-123",
  "operationDate": "2026-05-10T00:00:00.000Z", "transcriptionDate": "2026-05-11T00:00:00.000Z",
  "analysis": "...", "transcriptHtml": null,
  "status": "pending", "position": 1, "deletedAt": null,
  "createdAt": "...", "updatedAt": "...",
  "media": []
}
```

**Position:** auto-increments to `MAX(position)+1` for owner.

**Errors:** `401 unauthorized`, `422 title_required`

---

#### GET `/transcripts/:id`

**Auth:** JWT required

**Response (200):**
```json
{
  "transcript": { /* full object */ },
  "media": [ /* media array */ ],
  "segments": [
    { "id": "uuid", "mediaId": "uuid", "startMs": 0, "endMs": 5000, "text": "..." }
  ]
}
```

**Access:** owner OR shared user

**Errors:** `401 unauthorized`, `403 forbidden`, `404 not_found`

---

#### PATCH `/transcripts/:id`

**Auth:** JWT required

**Request:**
```json
{
  "title": "...", "operationName": "...", "operationDate": "...",
  "transcriptionDate": "...", "analysis": "...", "transcriptHtml": "..."
}
```

All fields optional. Notifies shared users via `notifications` (type: `transcript_updated`).

**Response (200):**
```json
{ "ok": true }
```

**Access:** owner OR shared user with `canEdit=true`

**Errors:** `401 unauthorized`, `403 forbidden`, `404 not_found`, `422 validation`

---

#### PATCH `/transcripts/reorder`

**Auth:** JWT required

**Request:**
```json
[
  { "id": "uuid-1", "position": 0 },
  { "id": "uuid-2", "position": 1 }
]
```

**Response (200):**
```json
{ "ok": true }
```

**Validation:** each `id` must be owned by `user.id`. Transaction: Drizzle `db.transaction()`.

**Errors:** `403 forbidden`, `401 unauthorized`

---

#### DELETE `/transcripts/:id`

**Auth:** JWT required

**Response (204)** (no content)

**Access:** owner OR `role='admin'`

**Cascade:** deletes media, jobs, segments, shares.

---

### Media (`src/server/routes/media.ts`)

#### POST `/transcripts/:id/media`

**Auth:** JWT required (owner OR shared with `canEdit`)

**Body:** `multipart/form-data`

| Field | Type | Notes |
|-------|------|-------|
| `files` | File[] | 1+ audio/video files |
| `file` | File | alternative to `files` |
| `description` / `descriptions` | string[] \| string | per-file descriptions (optional) |

**Validation:**
- MIME: audio/* or video/* (or known extension)
- Size: ≤500 MB per file
- At least one file required

**Response (201):**
```json
{
  "media": [
    {
      "id": "uuid", "transcriptId": "uuid", "filename": "audio.mp3",
      "mime": "audio/mpeg", "sizeBytes": 5242880,
      "storagePath": "transcript-id/uuid-audio.mp3",
      "durationSeconds": null, "description": "...",
      "transcriptHtml": null, "createdAt": "..."
    }
  ],
  "jobsQueued": 1
}
```

**Side effects:**
- Creates `transcriptionJobs` (status=pending) for each file
- Updates transcript to status=processing (first upload)
- Saves file to STORAGE_DIR

**Errors:** `400 invalid_mime|no_files`, `401 unauthorized`, `403 forbidden`, `404 not_found`, `413 file_too_large`, `500 storage_failed`

---

#### PATCH `/media/:id`

**Auth:** JWT required (owner of transcript OR shared with `canEdit`)

**Request:**
```json
{ "description": "...", "filename": "...", "transcriptHtml": "..." }
```

**Response (200):**
```json
{
  "id": "uuid", "transcriptId": "uuid", "filename": "novo-nome.mp3",
  "mime": "audio/mpeg", "sizeBytes": 5242880, "storagePath": "...",
  "durationSeconds": null, "description": "...", "transcriptHtml": "...",
  "createdAt": "..."
}
```

**Errors:** `400 no_updates`, `401 unauthorized`, `403 forbidden`, `404 not_found`

---

#### DELETE `/media/:id`

**Auth:** JWT required (owner only)

**Response (204)** (no content)

**Side effects:** deletes file from storage. Cascade deletes jobs + segments.

**Errors:** `401 unauthorized`, `403 forbidden`, `404 not_found`

---

### Jobs (Internal, `src/server/routes/jobs.ts`)

#### POST `/jobs/run`

**Auth:** header `x-internal-key: $INTERNAL_API_KEY` (not JWT)

Worker tick. Called by Bun worker service every `WORKER_INTERVAL_MS` (default 3s).

**Response (200):**
```json
{ "ok": true }
```

**Behavior:** `runPendingJobs(5)` in `src/server/services/jobs.ts`:
1. Fetches jobs with status=pending (limit 5)
2. Marks processing, increments attempts
3. Reads media file, ffmpeg pre-processes video → MP3 16kHz mono
4. Calls `getProvider().transcribe()`
5. Inserts `transcriptSegments` with {startMs, endMs, text}
6. Marks job done, updates media.durationSeconds
7. When all media done: marks transcript done, creates notification
8. On error: retries up to 3x, then marks failed

**Errors:** `401 invalid_internal_key`

---

#### GET `/transcripts/:id/jobs`

**Auth:** JWT required (owner only)

**Response (200):**
```json
{
  "jobs": [
    {
      "id": "uuid", "mediaId": "uuid", "filename": "audio.mp3",
      "status": "processing", "error": null,
      "transcriptText": "...", "segmentCount": 12
    }
  ]
}
```

Live polling for job status + accumulated segments.

**Errors:** `401 unauthorized`, `403 forbidden`, `404 not_found`

---

### Shares (`src/server/routes/shares.ts`)

#### POST `/transcripts/:id/shares`

**Auth:** JWT required (owner only)

**Request:**
```json
{ "email": "partner@example.com", "canEdit": true }
```

**Response (201):**
```json
{
  "share": {
    "id": "uuid", "transcriptId": "uuid", "ownerId": "uuid",
    "sharedWithUserId": "uuid", "canEdit": true, "createdAt": "..."
  }
}
```

**Errors:** `400 cannot_share_with_yourself`, `401 unauthorized`, `404 user_not_found|transcript_not_found`, `409 already_shared`

---

#### GET `/transcripts/:id/shares`

**Auth:** JWT required (owner only)

**Response (200):**
```json
{
  "shares": [
    { "id": "uuid", "transcriptId": "uuid", "ownerId": "uuid", "sharedWithUserId": "uuid", "canEdit": true, "createdAt": "..." }
  ]
}
```

---

#### PATCH `/transcripts/:id/shares/:shareId`

**Auth:** JWT required (owner only)

**Request:**
```json
{ "canEdit": false }
```

**Response (200):**
```json
{
  "share": { "id": "uuid", "transcriptId": "uuid", "ownerId": "uuid", "sharedWithUserId": "uuid", "canEdit": false, "createdAt": "..." }
}
```

---

#### DELETE `/transcripts/:id/shares/:shareId`

**Auth:** JWT required (owner only)

**Response (204)** (no content)

**Errors:** `401 unauthorized`, `403 forbidden`, `404 not_found`

---

### Notifications (`src/server/routes/notifications.ts`)

#### GET `/notifications?page=1`

**Auth:** JWT required

**Query:** `page` (default 1, limit 30)

**Response (200):**
```json
{
  "notifications": [
    {
      "id": "uuid", "userId": "uuid", "type": "transcript_updated",
      "payload": { "transcriptId": "uuid", "title": "..." },
      "readAt": null, "createdAt": "..."
    }
  ],
  "page": 1,
  "hasMore": false
}
```

---

#### PATCH `/notifications/:id/read`

**Auth:** JWT required

**Response (200):**
```json
{
  "notification": {
    "id": "uuid", "userId": "uuid", "type": "transcript_updated",
    "payload": { ... }, "readAt": "2026-05-11T10:35:00.000Z", "createdAt": "..."
  }
}
```

---

#### POST `/notifications/read-all`

**Auth:** JWT required

**Response (200):**
```json
{ "updated": 3 }
```

Marks all unread notifications as read.

---

### Tags (`src/server/routes/tags.ts`)

#### GET `/tags`

**Auth:** JWT required

**Response (200):**
```json
{
  "tags": [
    {
      "id": "uuid", "ownerId": "uuid", "name": "importante",
      "color": "#ef4444", "occurrences": 42, "createdAt": "..."
    }
  ]
}
```

**`occurrences`:** count of segments containing tag (word-boundary regex).

---

#### POST `/tags`

**Auth:** JWT required

**Request:**
```json
{ "name": "importante", "color": "#ef4444" }
```

**Validation:**
- `name` — 1–64 chars (required)
- `color` — hex #rrggbb (default #6366f1)
- Unique: (ownerId, name)

**Response (201):**
```json
{ "id": "uuid", "ownerId": "uuid", "name": "importante", "color": "#ef4444", "createdAt": "..." }
```

**Errors:** `401 unauthorized`, `409 duplicate`, `422 invalid_name`

---

#### PATCH `/tags/:id`

**Auth:** JWT required (owner only)

**Request:**
```json
{ "name": "crítico", "color": "#f97316" }
```

**Response (200):**
```json
{ "id": "uuid", "ownerId": "uuid", "name": "crítico", "color": "#f97316", "createdAt": "..." }
```

**Errors:** `400 no_updates`, `401 unauthorized`, `404 not_found`, `422 invalid_name`

---

#### DELETE `/tags/:id`

**Auth:** JWT required (owner only)

**Response (204)** (no content)

---

## Limits

| Limit | Value |
|-------|-------|
| File size | 500 MB |
| MIME types | audio/*, video/* |
| Password length | 6–72 chars |
| Page size (transcripts) | 30 |
| Page size (notifications) | 30 |
| JWT access TTL | 7 days |
| JWT refresh TTL | 30 days |
| Worker tick interval | 3000 ms (configurable) |
| Job retries | 3 before failed |
| Jobs per tick | max 5 |

---

## Enums

### Admin (`src/server/routes/users.ts`)

Endpoints protegidos por macro `requireAdmin` (verifica `role === 'admin'` no JWT). Cobrem listagem, edição de role e desativação de usuários. UI em `/(app)/admin/users`.

### Migrations (`drizzle/*.sql`)

| Arquivo | Propósito |
|---------|-----------|
| `0000_fuzzy_the_enforcers.sql` | Schema inicial. |
| `0001_soft_delete_transcripts.sql` | Coluna `deletedAt`. |
| `0002_add_dates_transcripts.sql` | `operationDate`, `transcriptionDate`. |
| `0003_add_description_media.sql` | `media.description`. |
| `0004_add_tags.sql` | Tabela `tags`. |
| `0005_add_transcript_html_media.sql` | `media.transcriptHtml`. |
| `0006_old_slayback.sql` | Ajustes diversos. |
| `0007_expand_user_roles.sql` | Enum `user_role` expandido. |
| `0008_add_media_hash.sql` | `media.hash` (SHA-256). |

### User Role
```
'user' | 'admin'
```

### Transcript Status
```
'pending' | 'processing' | 'done' | 'failed'
```

### Job Status
```
'pending' | 'processing' | 'done' | 'failed'
```

### Notification Types
```
'transcript_updated' | 'transcription_done'
```

---

## Implementation Notes

- **Auth plugin** (`src/server/plugins/auth.ts`): injects `user` from cookie; derive pattern.
- **Error plugin** (`src/server/plugins/error.ts`): normalizes Zod → 422, throws → 500.
- **CORS**: allows `NEXT_PUBLIC_APP_URL` + localhost:3000, credentials: true.
- **Drizzle**: transactions used in reorder. Cascading FKs: media, jobs, segments, shares, notifications.
- **Storage**: abstract `StorageProvider` (`src/server/services/storage.ts`). Default: LocalStorage (`STORAGE_DIR=./uploads`). Swap to S3 without route refactor.
- **Transcription**: `getProvider()` returns GroqProvider (default, whisper-large-v3, language=pt) or OpenAIProvider (fallback). FFmpeg pre-processes video → MP3 16kHz mono on worker tick.
