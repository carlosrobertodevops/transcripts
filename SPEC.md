# SPEC — API Specification

## Overview

REST API baseada em Elysia, rotas em `src/server/routes/`, validação com Zod 4, autenticação JWT centralizada em middleware.

**Base URL:** `http://localhost:3000/api` (dev) | `https://app.transcripts.com/api` (production)

---

## Authentication

- **Method**: JWT Bearer token em Authorization header ou cookie HTTP-only.
- **Header**: `Authorization: Bearer <token>`
- **Token format**: `{ sub: user.id, email: user.email, iat, exp }`
- **Refresh**: Via endpoint `/api/auth/refresh` com refresh token.
- **Protected routes**: Middleware `requireAuth` valida e injeta `{ user, token }` no contexto.

---

## Responses

Padrão de resposta para erros:

```json
{
  "error": "Error message",
  "status": 400,
  "timestamp": "2025-05-08T10:00:00Z"
}
```

Sucessos retornam dados diretos com HTTP 200/201/204.

---

## Endpoints

### Auth

#### `POST /api/auth/register`

Registra novo usuário.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "name": "John Doe"
}
```

**Response (201):**
```json
{
  "user": { "id": "uuid", "email": "user@example.com", "name": "John Doe", "createdAt": "..." },
  "token": "eyJ...",
  "refreshToken": "eyJ..."
}
```

**Errors:**
- `400`: Email já existe ou validação falhou.
- `500`: Erro interno.

---

#### `POST /api/auth/login`

Faz login.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response (200):**
```json
{
  "user": { "id": "uuid", "email": "user@example.com", "name": "John Doe" },
  "token": "eyJ...",
  "refreshToken": "eyJ..."
}
```

**Errors:**
- `401`: Email/senha inválidos.
- `404`: Usuário não encontrado.

---

#### `POST /api/auth/refresh`

Renova access token.

**Request:**
```json
{
  "refreshToken": "eyJ..."
}
```

**Response (200):**
```json
{
  "token": "eyJ...",
  "refreshToken": "eyJ..."
}
```

---

#### `POST /api/auth/logout`

Logout (opcional, token descartado no cliente).

**Response (204):** Sem conteúdo.

---

### Transcripts

#### `GET /api/transcripts`

Lista transcripts do usuário autenticado.

**Query params:**
- `page` (optional, default 1): Número da página.
- `limit` (optional, default 10): Itens por página.
- `search` (optional): Busca por título.

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "title": "Meeting Notes",
      "description": "Quarterly sync",
      "text": "Conteúdo da transcrição...",
      "language": "pt-BR",
      "duration": 3600,
      "status": "completed",
      "mediaCount": 2,
      "createdAt": "2025-05-01T10:00:00Z",
      "updatedAt": "2025-05-01T10:30:00Z"
    }
  ],
  "pagination": { "page": 1, "limit": 10, "total": 5 }
}
```

---

#### `GET /api/transcripts/:id`

Obtém detalhe de um transcript.

**Response (200):**
```json
{
  "id": "uuid",
  "title": "Meeting Notes",
  "description": "...",
  "text": "...",
  "language": "pt-BR",
  "duration": 3600,
  "status": "completed",
  "createdAt": "...",
  "updatedAt": "..."
}
```

**Errors:**
- `404`: Transcript não encontrado.
- `403`: Sem permissão (não é proprietário).

---

#### `POST /api/transcripts`

Cria novo transcript.

**Request:**
```json
{
  "title": "Meeting Notes",
  "description": "Quarterly sync",
  "language": "pt-BR"
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "title": "Meeting Notes",
  "description": "Quarterly sync",
  "text": "",
  "language": "pt-BR",
  "status": "pending",
  "createdAt": "2025-05-08T10:00:00Z"
}
```

---

#### `PATCH /api/transcripts/:id`

Atualiza transcript (título, descrição, texto).

**Request:**
```json
{
  "title": "Updated Title",
  "text": "Editado manualmente pelo usuário...",
  "description": "Nova descrição"
}
```

**Response (200):** Transcript atualizado.

---

#### `DELETE /api/transcripts/:id`

Deleta transcript e mídias associadas.

**Response (204):** Sem conteúdo.

---

### Media (Upload & Listagem)

#### `POST /api/transcripts/:id/media`

Faz upload de arquivo de mídia (áudio/vídeo).

**Content-Type:** `multipart/form-data`

**Fields:**
- `file` (required): Arquivo de mídia (tipos: audio/*, video/*).

**Response (201):**
```json
{
  "media": {
    "id": "uuid",
    "transcriptId": "uuid",
    "filename": "meeting.mp3",
    "mimeType": "audio/mpeg",
    "size": 2048576,
    "status": "processing",
    "createdAt": "2025-05-08T10:00:00Z"
  },
  "jobsQueued": 1
}
```

**Errors:**
- `400`: Tipo MIME inválido.
- `413`: Arquivo muito grande.
- `404`: Transcript não encontrado.
- `403`: Sem permissão.

---

#### `GET /api/transcripts/:id/media`

Lista mídias de um transcript.

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "filename": "meeting.mp3",
      "mimeType": "audio/mpeg",
      "size": 2048576,
      "status": "completed",
      "duration": 3600,
      "createdAt": "2025-05-08T10:00:00Z",
      "updatedAt": "2025-05-08T10:30:00Z"
    }
  ]
}
```

---

#### `DELETE /api/transcripts/:id/media/:mediaId`

Deleta mídia específica.

**Response (204):** Sem conteúdo.

**Errors:**
- `404`: Mídia ou transcript não encontrado.
- `403`: Sem permissão.

---

### Notifications

#### `GET /api/notifications`

Lista notificações do usuário.

**Query params:**
- `unread` (optional, boolean): Filtrar apenas não lidas.
- `limit` (optional, default 20): Limite de resultados.

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "title": "Transcrição Completa",
      "message": "meeting.mp3 foi transcrito com sucesso.",
      "type": "success",
      "read": false,
      "createdAt": "2025-05-08T10:30:00Z"
    }
  ]
}
```

---

#### `PATCH /api/notifications/:id/read`

Marca notificação como lida.

**Response (200):**
```json
{
  "id": "uuid",
  "read": true
}
```

---

#### `PATCH /api/notifications/read-all`

Marca todas as notificações como lidas.

**Response (200):**
```json
{
  "markedCount": 5
}
```

---

### Shares

#### `GET /api/transcripts/:id/shares`

Lista compartilhamentos de um transcript.

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "transcriptId": "uuid",
      "sharedWith": { "id": "uuid", "email": "guest@example.com", "name": "Guest" },
      "permission": "view",
      "createdAt": "2025-05-08T09:00:00Z"
    }
  ]
}
```

---

#### `POST /api/transcripts/:id/shares`

Compartilha transcript com outro usuário.

**Request:**
```json
{
  "email": "guest@example.com",
  "permission": "view"
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "transcriptId": "uuid",
  "sharedWith": { "id": "uuid", "email": "guest@example.com" },
  "permission": "view"
}
```

---

#### `DELETE /api/transcripts/:id/shares/:shareId`

Remove compartilhamento.

**Response (204):** Sem conteúdo.

---

## Status Codes

- `200`: OK — Sucesso em GET/PATCH/DELETE.
- `201`: Created — Sucesso em POST (criar recurso).
- `204`: No Content — Sucesso em DELETE/logout.
- `400`: Bad Request — Validação falhou.
- `401`: Unauthorized — Token inválido ou expirado.
- `403`: Forbidden — Sem permissão.
- `404`: Not Found — Recurso não encontrado.
- `413`: Payload Too Large — Arquivo muito grande.
- `500`: Internal Server Error — Erro do servidor.

---

## Error Handling

Todos os erros retornam estrutura padronizada:

```json
{
  "error": "Descrição do erro",
  "status": 400,
  "timestamp": "2025-05-08T10:00:00Z"
}
```

**Validação Zod:**
```json
{
  "error": "Validação falhou",
  "status": 400,
  "details": [
    { "field": "email", "message": "Email inválido" }
  ]
}
```

---

## Rate Limiting

Não implementado inicialmente. Pode ser adicionado com middleware Elysia.

---

## Pagination

Endpoints que retornam listas suportam:
- `page` (default 1)
- `limit` (default 10, max 100)

Resposta inclui `pagination` object com `{ page, limit, total }`.

---

## Validação Zod

Schemas centralizados em `src/lib/zod.ts`:

```typescript
export const createTranscriptSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  language: z.string().default('pt-BR')
});

export const updateTranscriptSchema = createTranscriptSchema.partial();

export const uploadMediaSchema = z.object({
  file: z.instanceof(File)
    .refine(f => ['audio', 'video'].some(t => f.type.startsWith(t)))
    .refine(f => f.size <= 500 * 1024 * 1024, 'Max 500MB')
});
```

---

## WebSocket (Futuro)

Placeholder para notificações em tempo real via WebSocket em lugar de polling.

**Endpoint:** `ws://localhost:3000/api/ws`

**Events:**
- `notification:new` — Nova notificação.
- `transcript:status` — Status de transcrição atualizado.
- `media:completed` — Mídia processada.

---

## Versioning

- **Versão atual**: v1 (não versionado em URL, implícito).
- **Breaking changes**: Serão versionados como `/api/v2/...` quando necessário.

---

## Security

- **CORS**: Configurado para `NEXT_PUBLIC_APP_URL`.
- **CSRF**: Proteção via SameSite cookies.
- **JWT**: Tokens com expiração curta (15 min) + refresh tokens longos.
- **Password hashing**: bcryptjs com salt 10.
- **Database**: Prepared statements via Drizzle ORM (previne SQL injection).
