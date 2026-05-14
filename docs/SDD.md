# Software Design Document (SDD)

**Transcripts** — SaaS de transcrição de mídia (áudio/vídeo) com dashboard web editável.

---

## 1. Visão Geral

Transcripts é um sistema fullstack para upload, transcrição e edição de mídia (áudio/vídeo) em português. Arquitetura em 4 processos independentes em um repositório:

1. **Next.js 16 (App Router)** — UI em `src/app/`
2. **Elysia HTTP** — API REST em `src/server/index.ts` (prefix `/api`), montada via catch-all Next.js
3. **PostgreSQL 16** — Banco de dados via Drizzle ORM (`src/db/schema.ts`)
4. **Worker Bun** — Loop assíncrono `src/workers/loop.ts` que chama `/api/jobs/run` a cada `WORKER_INTERVAL_MS` (padrão 3000ms)
5. **Transcriber Python** — FastAPI + faster-whisper em container separado (`:8000`), ativo quando `TRANSCRIPTION_PROVIDER=local`

---

## 2. Arquitetura Lógica

```mermaid
graph TB
    U["👤 Usuário"]
    UI["Next.js UI<br/>(App Router)"]
    API["Elysia HTTP API<br/>(src/server/)"]
    DB["PostgreSQL 16<br/>(Drizzle ORM)"]
    W["Bun Worker<br/>(loop.ts)"]
    T["Python FastAPI<br/>faster-whisper"]
    GR["Groq API"]
    OA["OpenAI Whisper"]

    U -->|navegação, upload| UI
    UI -->|fetch, POST| API
    API -->|CRUD, jobs| DB
    W -->|POST /api/jobs/run| API
    API -->|FFmpeg pré-proc| W
    W -->|call provider| T
    W -->|call provider| GR
    W -->|call provider| OA
    T -->|segments| DB
    GR -->|segments| DB
    OA -->|segments| DB

    style UI fill:#0ea5e9
    style API fill:#10b981
    style DB fill:#f59e0b
    style W fill:#8b5cf6
    style T fill:#ec4899
    style GR fill:#6366f1
    style OA fill:#6366f1
```

### Fluxo Principal (Upload → Transcrição → Notificação)

1. **Upload**: Usuário faz upload de mídia via POST `/api/media` (Next.js) → arquivo salvo em `STORAGE_DIR` via `LocalStorage`
2. **Job Creation**: API cria `transcription_jobs` com status `pending` + `media` record
3. **Worker Tick**: Worker (`loop.ts`) chama POST `/api/jobs/run` com header `x-internal-key` a cada 3s
4. **Processing**: `runPendingJobs(limit=5)` em `src/server/services/jobs.ts`:
   - Marca job como `processing`
   - **FFmpeg pré-processa**: vídeo → MP3 16kHz mono (se necessário)
   - Chama provider via `getProvider()` (local Whisper, Groq, ou OpenAI)
   - Insere `transcript_segments` em batches de 5 linhas (streaming)
   - Marca job como `done` ou `failed` (até 3 retentativas)
5. **Notification**: Cria notificação para o usuário (tipo `transcription_completed` ou `transcription_failed`)

---

## 3. Arquitetura Física

### Componentes

| Serviço | Localização | Runtime | Porta | Responsabilidade |
|---------|-------------|---------|-------|-----------------|
| **Next.js** | `src/app/` | Bun | 3000 | UI (pages, layouts, components) |
| **Elysia API** | `src/server/index.ts` | Bun (montado em Next.js) | — | REST endpoints (prefix `/api`) |
| **PostgreSQL** | Docker | postgres:16-alpine | 5432 | Persistência (schema Drizzle) |
| **Bun Worker** | `src/workers/loop.ts` | Bun | — | Loop assíncrono (tick a cada 3s) |
| **Transcriber** | `transcriber/main.py` | FastAPI/Python | 8000 | Faster-whisper (local provider) |
| **PgAdmin** (dev) | Docker | pgadmin:latest | 5050 | UI de gerenciamento DB |

### Docker Compose Stack

```yaml
# Serviços principais (docker-compose.yml)
services:
  db:           # PostgreSQL 16, healthcheck via pg_isready
  migrate:      # One-shot Drizzle (depends_on: db)
  transcriber:  # FastAPI :8000 (depends_on: migrate)
  app:          # Next.js + Elysia :3000 (depends_on: transcriber)
  worker:       # Bun worker (depends_on: app, background)

# Variantes
docker-compose.yml                # Prod padrão (sem pgadmin)
docker-compose.local.yml          # Dev com pgadmin :5050
docker-compose-easypanel.yml      # Easypanel (SERVICE_FQDN_*)
docker-compose-coolify.yml        # Coolify VPS (expose, SERVICE_*)
```

**Healthcheck Chain**:
```
db (pg_isready) → migrate (one-shot) → transcriber (GET /health)
    ↓
  app (GET /api/health)
    ↓
  worker (background, no health probe)
```

---

## 4. Decisões de Design (ADRs Resumidos)

### ADR-1: Elysia em Catch-all Next.js

**Decisão**: API HTTP rodada via Elysia, montada em Next.js através de `src/app/api/[...path]/route.ts`.

**Razão**:
- **Unificação**: Um único processo Node.js (Bun) para UI + API.
- **Dev DX**: `bun run dev` sobe turbopack + API juntos.
- **Deploy**: Mesmo container, mesmo Dockerfile, volume único de uploads.
- **Alternativa rejeitada**: API separada (microserviços) → complexity não compensada neste estágio.

**Trade-offs**:
- Coupling UI ↔ API (mitigado por isolamento de rotas em `src/server/routes/`)
- Single failure domain (mitigado por health checks)

---

### ADR-2: Drizzle ORM ao invés de Prisma

**Decisão**: Usar Drizzle para gerenciar schema PostgreSQL.

**Razão**:
- **Type Safety**: schema em TypeScript (`src/db/schema.ts`), relações explícitas.
- **Controle**: Migrations via `drizzle-kit`, sem runtime magic.
- **Performance**: Query builder nativo (sem type-to-SQL IR).
- **Migrations**: Versionadas em `drizzle/`, rodam via one-shot container.

**Trade-offs**:
- Menos abstrações que Prisma → mais SQL manual em queries complexas
- Comunidade menor que Prisma

---

### ADR-3: Worker Stateless, Sem Fila Externa

**Decisão**: Worker Bun (`src/workers/loop.ts`) é stateless. Chama POST `/api/jobs/run` a cada `WORKER_INTERVAL_MS`. Sem Redis, Bull, ou RabbitMQ.

**Razão**:
- **Simplicidade**: SQL do banco já é fila (status `pending` → `processing` → `done`).
- **Cost**: Sem infra adicional.
- **Observabilidade**: Jobs em tabela, visível via `/api/transcripts/:id/jobs`.
- **Escalabilidade incremental**: Futura: múltiplos workers via load-balancer, Kubernetes, etc.

**Claim atômico (anti-corrida)**: `UPDATE transcription_jobs SET status='processing' WHERE id=? AND status='pending' RETURNING id` — só executa o job se `claimed.length > 0`. Garante exactly-one-worker mesmo com múltiplas instâncias.

**Retry idempotente (anti-duplicata)**: antes de inserir segmentos, `DELETE FROM transcript_segments WHERE media_id=?`. Causa raiz histórica de segmentos duplicados (mesmo `start_ms/end_ms/text` repetido 3-4×) foi retries acumularem inserts. Limpeza legacy via `bun run src/scripts/dedupe-segments.ts`.

**Limites atuais**:
- Retry até 3x antes de `failed`.
- Sem priorização de jobs (FIFO, limit 5 por tick).

---

### ADR-4: Bun Runtime

**Decisão**: Node.js substituído por **Bun** (bundle, runtime, package manager, executor).

**Razão**:
- **Performance**: ~3x mais rápido que Node.js em startup e bundling.
- **DX**: `bun install`, `bun run dev`, `bun run worker:loop` — sem npm scripts complexos.
- **Native support**: esbuild, Prisma, sqlite, PostgreSQL.
- **Type safety**: TypeScript nativo (sem `tsx` ou `ts-node`).

---

### ADR-5: Transcriber Python Separado, Não Container

**Decisão**: Transcriber (FastAPI + faster-whisper) roda em container separado, chamado via HTTP de Bun.

**Razão**:
- **Isolamento**: Python deps não poluem Bun environment.
- **Escalabilidade**: Container pode rodar multi-threading (GIL mitigation).
- **Flexibility**: Swap provider em `transcriber/main.py` sem rebuild Next.js.
- **Cache volumes**: Whisper models em volume persistente (`whisper_cache`).
- **Tamanho do modelo**: build-arg `WHISPER_MODEL` (`tiny` para VPS ARM 4GB / `base` para dev). `PRE_BAKE_MODEL=true` embute o modelo na imagem para cold-boot resiliente.

---

### ADR-6: Export Server-Side (txt / html / doc / docx)

**Decisão**: Exportação de transcrição em quatro formatos resolvida no servidor por `src/server/services/export.ts`, expondo `GET /api/transcripts/:id/export?format=…`.

**Razão**:
- **Consistência**: mesmo conteúdo (transcrição + segmentos + metadados + SHA-256 das mídias) em todos os formatos.
- **Lib única**: `docx@^9.6.1` gera `.docx`/`.doc`; HTML/TXT montados via `buildHtml()` (também usado em print view).
- **Auditoria**: inclui `media.hash` em cada formato para garantir integridade do arquivo transcrito.

**Trade-offs**:
- Geração síncrona pode demorar em transcrições muito longas (mitigação futura: streaming).

---

### ADR-8: Role-Based Transcript Permissions (T6)

**Decisão**: hierarquia `super_admin > admin > pro > viewer` controla acesso a transcrições. Mesmo tier → view-only. Tier inferior → CRUD. Tier superior → bloqueado. Viewer → read-only global (apenas próprio + shares).

**Razão**:
- **Modelo simples**: rank numérico (`roleRank`) elimina ifs aninhados.
- **Centralizado**: helpers em `src/lib/permissions.ts` reutilizados em rotas e UI.
- **Compat shares**: `shares.canEdit` continua governando override cross-tier.
- **Display label**: enum value `pro` é mapeado para "Editor" em `ROLE_LABELS` para não quebrar migrations existentes (`0007_expand_user_roles.sql`).

**Aplicação**:
- `routes/transcripts.ts`: GET / filtra por `visibleOwnerRoles`; GET/PATCH/DELETE/:id usam `canView/canEdit/canDelete`; POST / usa `canCreateTranscript`.
- `routes/media.ts`: POST/PATCH/DELETE/retranscribe usam `canEdit/canDelete` via `loadTranscriptContext`.
- `routes/shares.ts`: POST/GET/PATCH/DELETE de shares condicionados a `canEditTranscript`.
- UI: hook `useActorRole` (`src/lib/use-actor-role.ts`) → `canMutate` curto-circuito para Viewer.

**Trade-off**: `GET /transcripts` lista agora pode incluir transcrições alheias para roles superiores — custo `IN (...)` proporcional a quantidade de owners visíveis. Mitigação futura: JOIN direto em `users.role` em vez de pré-buscar `visibleOwnerIds`.

---

### ADR-7: Hash SHA-256 em `media.hash`

**Decisão**: Cada upload calcula SHA-256 ao gravar arquivo em `STORAGE_DIR` e persiste em `media.hash` (migração `0008_add_media_hash.sql`).

**Razão**:
- **Integridade**: identifica corrupção / re-upload acidental.
- **Dedup**: base para detectar mídias iguais entre transcrições.
- **Auditoria**: hash incluído em todos os documentos exportados.

**Estado legado**: coluna `NULL`-able para mídias antigas. Backfill batch: `bun run src/scripts/backfill-media-hash.ts` lê do `storagePath`, calcula SHA-256, escreve em `media.hash` onde `IS NULL`.

---

## 5. Modelo de Dados (Drizzle Schema)

### Tabelas

#### `users` (Identity & Auth)
```
id (UUID, PK)
email (TEXT, UNIQUE)
passwordHash (TEXT)
name (TEXT)
avatarUrl (TEXT)
role (ENUM: user | admin) — default: user
createdAt, updatedAt (TIMESTAMP)
```

#### `transcripts` (Container de mídia)
```
id (UUID, PK)
ownerId (UUID, FK → users.id, CASCADE)
title (TEXT)
operationName (TEXT) — contexto do usuário (ex: "reunião 2025-02-15")
operationDate (TIMESTAMP)
transcriptionDate (TIMESTAMP)
analysis (TEXT) — análise gerada (ex: summary, sentiment)
transcriptHtml (TEXT) — HTML editável
status (ENUM: pending | processing | done | failed)
position (INTEGER) — ordem na lista
deletedAt (TIMESTAMP) — soft delete
createdAt, updatedAt (TIMESTAMP)
```

#### `media` (Arquivos de áudio/vídeo)
```
id (UUID, PK)
transcriptId (UUID, FK → transcripts.id, CASCADE)
filename (TEXT) — nome original (ex: "meeting.mp4")
mime (TEXT) — MIME type
sizeBytes (INTEGER) — tamanho em bytes
storagePath (TEXT) — caminho relativo em STORAGE_DIR
durationSeconds (REAL) — duração do vídeo (segundos)
description (TEXT) — anotações do usuário
transcriptHtml (TEXT) — HTML editável desta mídia
hash (TEXT, NULL-able) — SHA-256 do arquivo (migração 0008), incluído em exports
createdAt (TIMESTAMP)
```

#### `transcription_jobs` (Processamento assíncrono)
```
id (UUID, PK)
mediaId (UUID, FK → media.id, CASCADE)
provider (TEXT) — "local" | "groq" | "openai"
status (ENUM: pending | processing | done | failed)
attempts (INTEGER) — contador de retentativas (0-3)
error (TEXT) — mensagem de erro se falhar
segmentCount (INTEGER) — número de segmentos inseridos
processingMs (INTEGER) — tempo total de processamento (ms)
startedAt, finishedAt (TIMESTAMP)
createdAt (TIMESTAMP)
```

#### `transcript_segments` (Dados de transcrição)
```
id (UUID, PK)
mediaId (UUID, FK → media.id, CASCADE)
startMs (INTEGER) — início em milissegundos
endMs (INTEGER) — fim em milissegundos
text (TEXT) — texto do segmento
```

#### `shares` (Compartilhamento entre usuários)
```
id (UUID, PK)
transcriptId (UUID, FK → transcripts.id, CASCADE)
ownerId (UUID, FK → users.id, CASCADE) — quem compartilhou
sharedWithUserId (UUID, FK → users.id, CASCADE) — com quem compartilhou
canEdit (BOOLEAN) — permissão de escrita
createdAt (TIMESTAMP)
UNIQUE INDEX (transcriptId, sharedWithUserId) — uma share por par
```

#### `tags` (Categorização)
```
id (UUID, PK)
ownerId (UUID, FK → users.id, CASCADE)
name (TEXT) — nome da tag
color (TEXT) — cor HEX (default: #6366f1)
createdAt (TIMESTAMP)
UNIQUE INDEX (ownerId, name) — uma tag por nome por usuário
```

#### `notifications` (Sistema de eventos)
```
id (UUID, PK)
userId (UUID, FK → users.id, CASCADE)
type (TEXT) — "transcription_completed" | "transcription_failed" | "share_received"
payload (JSONB) — dados contextuais (ex: {transcriptId, errorMessage})
readAt (TIMESTAMP) — null = unread
createdAt (TIMESTAMP)
```

### Relações Drizzle

```typescript
users → many(transcripts, shares, notifications)
transcripts → one(users), many(media, shares)
media → one(transcripts), many(jobs, segments)
transcriptionJobs → one(media)
transcriptSegments → one(media)
shares → one(transcripts), one(users as owner), one(users as sharedWith)
notifications → one(users)
```

---

## 6. API Contracts

### Autenticação

**Plugin**: `src/server/plugins/auth.ts`

- **Método**: JWT via cookie + header `Authorization: Bearer <token>`
- **Payload**: `{ sub: user.id, email, role, iat, exp }`
- **Leitura**: `.derive()` aplica em todas as rotas → `user: Session | null` globalmente
- **Macros**:
  - `.macro(({ onBeforeHandle }) => ({ requireAuth(handler) { ... } }))`
  - `.macro(({ onBeforeHandle }) => ({ requireAdmin(handler) { ... } }))`

**Status codes**:
- `401 Unauthorized` — token inválido/expirado
- `403 Forbidden` — user autenticado mas sem permissão (role check)

---

### Rotas Principais (Elysia)

#### **POST /api/jobs/run** (Worker Internal)
```
Headers:
  x-internal-key: $INTERNAL_API_KEY

Response:
  { ok: true }

Status:
  401 — key inválida
  200 — sucesso (processa até 5 jobs)
```

**Lógica**:
```javascript
// src/server/services/jobs.ts
export const runPendingJobs = async (limit: number = 3) => {
  const pendingJobs = await db
    .select()
    .from(transcriptionJobs)
    .where(eq(transcriptionJobs.status, "pending"))
    .limit(limit);

  for (const job of pendingJobs) {
    await db.update(transcriptionJobs).set({ status: "processing" });
    try {
      // FFmpeg pré-processa vídeo → MP3 16kHz mono
      // Chama provider (streaming ou non-streaming)
      // Insere segments em batches de 5
      // Status → done, notifica usuário
    } catch (err) {
      // Retry até 3x, depois status → failed, notifica
    }
  }
};
```

#### **POST /api/media** (Upload)
```
Body:
  FormData { file: File, transcriptId: string }

Response:
  {
    id: uuid,
    transcriptId: uuid,
    filename: string,
    mime: string,
    sizeBytes: number,
    storagePath: string,
    createdAt: ISO8601
  }

Status:
  401 — não autenticado
  400 — transcriptId inválido
  201 — criado
```

#### **GET /api/transcripts/:id/jobs** (Monitor Live)
```
Response:
  {
    jobs: [
      {
        id: uuid,
        status: "pending" | "processing" | "done" | "failed",
        provider: string,
        segmentCount: number,
        processingMs: number | null,
        startedAt: ISO8601 | null,
        finishedAt: ISO8601 | null,
        error: string | null
      }
    ],
    segments: [
      { startMs, endMs, text }
    ]
  }

Status:
  401 — não autenticado
  403 — não é owner
  404 — transcript não existe
  200 — sucesso
```

---

## 7. Fluxo de Transcrição (Detalhe Técnico)

### Entrada do Worker

```typescript
// src/workers/loop.ts
const WORKER_INTERVAL_MS = Number(process.env.WORKER_INTERVAL_MS ?? 3000);
setInterval(async () => {
  await fetch(`${APP_URL}/api/jobs/run`, {
    method: "POST",
    headers: { "x-internal-key": INTERNAL_API_KEY },
  });
}, WORKER_INTERVAL_MS);
```

### Provider Selection

```typescript
// src/server/services/transcription.ts
export const getProvider = (): TranscriptionProvider => {
  const explicit = process.env.TRANSCRIPTION_PROVIDER;
  if (explicit) return createProvider(explicit);
  
  // Auto-detect by env var presence
  if (process.env.TRANSCRIBER_URL) return new LocalWhisperProvider();
  if (process.env.GROQ_API_KEY) return new GroqProvider();
  if (process.env.OPENAI_API_KEY) return new OpenAIProvider();
  
  throw new Error("No provider configured");
};
```

### Providers Disponíveis

| Provider | Classe | Configuração | Streaming |
|----------|--------|--------------|-----------|
| **Local** | `LocalWhisperProvider` | `TRANSCRIBER_URL=http://transcriber:8000` | ✅ Sim |
| **Groq** | `GroqProvider` | `GROQ_API_KEY=...` | ❌ Não |
| **OpenAI** | `OpenAIProvider` | `OPENAI_API_KEY=...` | ❌ Não |

**Fallback** (opcional):
```env
TRANSCRIPTION_PROVIDER=local
TRANSCRIPTION_PROVIDER_FALLBACK=groq
TRANSCRIBER_TIMEOUT_MS=60000
```

### Processamento com Streaming

```typescript
// LocalWhisperProvider.transcribeStream()
const stream = await fetch(`${url}/transcribe/stream`, {
  method: "POST",
  body: formData,
});

// Lê chunks JSON-lines (cada linha = um evento)
for await (const segment of provider.transcribeStream(audioPath, "pt")) {
  // Insert batch de 5 segments de uma vez
  if (batch.length >= 5) {
    await db.insert(transcriptSegments).values(batch);
    await db.update(transcriptionJobs).set({ segmentCount: insertedCount });
  }
}
```

### Status do Job

```
pending  →  processing  →  done
                      ↘  failed (retry até 3x)
```

---

## 8. Estratégias de Erro & Resiliência

### Job Retries

```typescript
// src/server/services/jobs.ts
if (job.attempts < 3) {
  // Re-insert com status pending
  await db.update(transcriptionJobs).set({
    status: "pending",
    attempts: job.attempts + 1,
  });
} else {
  // 3 retentativas esgotadas → failed
  await db.update(transcriptionJobs).set({
    status: "failed",
    error: err.message,
    finishedAt: new Date(),
  });
}
```

### Timeout

```typescript
const timeoutMs = Number(process.env.TRANSCRIBER_TIMEOUT_MS ?? 60000);
const withTimeout = (promise) =>
  Promise.race([
    promise,
    new Promise((_, rej) =>
      setTimeout(() => rej(new Error("transcriber_timeout")), timeoutMs),
    ),
  ]);
```

### Fallback Provider

```typescript
try {
  return await withTimeout(primary.transcribe(filePath, lang));
} catch (err) {
  if (!fallbackName || fallbackName === primary.name) throw err;
  console.warn(`[transcription] primary failed; falling back to ${fallbackName}`);
  const fallback = createProvider(fallbackName);
  return fallback.transcribe(filePath, lang);
}
```

### Storage Cleanup

```typescript
// Se job falhar, arquivos NÃO são deletados automaticamente
// (para debug/retry). Cleanup manual via admin endpoint (future).
```

---

## 9. Autenticação & Autorização

### Flow

```
1. Login: POST /api/auth/login { email, password }
   → Valida, gera JWT, armazena em cookie httpOnly

2. Derive: Middleware .derive() extrai cookie → user object

3. Route Protection:
   - .macro(requireAuth) → 401 se user === null
   - .macro(requireAdmin) → 403 se user.role !== "admin"
   - Manual checks: if (user?.id !== ownerId) throw 403

4. Refresh: Automático via refresh_token antes de exp
```

### JWT Payload

```typescript
{
  sub: user.id,        // SEMPRE use sub, nunca id
  email: user.email,
  role: user.role,     // "user" | "admin"
  iat: timestamp,
  exp: timestamp,
}
```

---

## 10. Observabilidade

### Logging

```
[worker] starting loop interval=3000ms
[worker] tick 200
[authPlugin] cookie=..., session=...
[transcription] primary=local failed; falling back to groq
[jobs] mediaId=..., provider=local, segments=125, ms=45000
```

Controlado por env vars:
```env
AUTH_DEBUG=1     # Log detalhado de auth
LOG_LEVEL=INFO   # INFO | DEBUG | ERROR
```

### Health Checks

```
GET /api/health
  → { status: "ok" } 200

GET /transcriber:8000/health (Python)
  → { status: "ready" } 200
```

### Métricas (Future)

- Jobs por minuto (throughput)
- Error rate (failed jobs %)
- Latência média por provider
- Storage utilização

---

## 11. Variáveis de Ambiente

### Essenciais

```env
# Database
DATABASE_URL=postgres://user:pass@host/db

# Auth
JWT_SECRET=...
JWT_REFRESH_SECRET=...
INTERNAL_API_KEY=...

# App
NODE_ENV=development
PORT=3000
HOSTNAME=0.0.0.0
NEXT_PUBLIC_APP_URL=http://localhost:3000
APP_URL=http://app:3000

# Transcription
TRANSCRIPTION_PROVIDER=local         # local | groq | openai
TRANSCRIBER_URL=http://transcriber:8000
TRANSCRIPTION_PROVIDER_FALLBACK=     # (optional)
TRANSCRIBER_TIMEOUT_MS=60000

# Whisper (provider=local)
WHISPER_MODEL=base                   # tiny | base | small | medium | large-v3
WHISPER_COMPUTE_TYPE=int8            # int8 | float32
WHISPER_DEVICE=cpu                   # cpu | cuda
WHISPER_BEAM_SIZE=3
WHISPER_NUM_WORKERS=1
WHISPER_VAD_FILTER=true

# Worker
WORKER_INTERVAL_MS=3000
STORAGE_DIR=./uploads

# External APIs
GROQ_API_KEY=...
OPENAI_API_KEY=...

# Debug
AUTH_DEBUG=0
LOG_LEVEL=INFO
```

---

## 12. Roadmap Arquitetural

### Phase 1 (Atual)
- Single-container Elysia + Next.js
- Bun worker stateless
- PostgreSQL local ou RDS
- Transcriber Python em container

### Phase 2 (Escalabilidade)
- Múltiplos workers via load-balancer ou Kubernetes
- Redis cache para sessões
- S3/cloud storage (não local)
- Webhook notifications ao invés de polling

### Phase 3 (Multitenancy)
- Organização + workspace
- Row-level security (RLS) no Postgres
- Tenant isolation em storage paths

---

## 13. Resumo de Decisões Técnicas

| Aspecto | Escolha | Razão |
|---------|---------|-------|
| **Runtime** | Bun | Performance, DX, type safety |
| **UI Framework** | Next.js 16 | SSR, App Router, ShadCN integration |
| **API HTTP** | Elysia (em catch-all Next.js) | Unificação, simplicidade |
| **ORM** | Drizzle | Type safety, controle, migrations versionadas |
| **DB** | PostgreSQL 16 | ACID, JSON, relational, maturidade |
| **Auth** | JWT + cookie | Stateless, secure, HTTP-only |
| **Job Queue** | Banco de dados (poll) | Sem infra adicional, suficiente para escala atual |
| **Transcriber** | Python (container separado) | Isolamento, GPU support (future) |
| **UI Components** | ShadCN/UI | Type-safe, customizável, Tailwind |
| **Validation** | Zod 4 | Type inference, runtime safety |

---

## 14. Referências

- **Next.js 16**: https://nextjs.org/docs
- **Elysia**: https://elysiajs.com/
- **Drizzle ORM**: https://orm.drizzle.team/
- **Bun**: https://bun.sh/
- **Zod 4**: https://zod.dev/
- **Tailwind CSS v4**: https://tailwindcss.com/
- **ShadCN/UI**: https://ui.shadcn.com/
- **Faster-Whisper**: https://github.com/SYSTRAN/faster-whisper
- **Groq API**: https://console.groq.com/
- **OpenAI Whisper API**: https://platform.openai.com/docs/api-reference/audio
