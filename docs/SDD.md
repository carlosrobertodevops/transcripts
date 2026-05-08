# System Design Document (SDD)

## 1. Context

**Transcripts** é uma aplicação web colaborativa para transcrição de mídia com IA. MVP suporta upload de áudio/vídeo, transcrição assíncrona em português brasileiro via Groq Whisper, compartilhamento entre usuários e notificações push. Usuários autenticam via JWT, fazem upload de mídia, acompanham progresso de transcrição e compartilham transcritos com colegas.

Stack: Fullstack monorepo Next.js 15 (App Router, React 19) + Elysia 1.1 REST API (Bun runtime) + Drizzle ORM (PostgreSQL 15) + Docker Compose (app + db + worker).

## 2. Goals & Non-Goals

### Goals

- REST API autenticada (JWT httpOnly, HS256)
- Upload multipart de áudio/vídeo com streaming
- Transcrição assíncrona via Groq Whisper-large-v3 (PT-BR)
- Armazenamento abstrato (local filesystem primeira versão)
- Compartilhamento granular (transcript por usuário)
- Notificações em tempo quasi-real (database polling)
- Reordenação de transcritos com otimismo UI
- Papéis de acesso (user, admin)

### Non-Goals

- Realtime SSE/WebSocket
- Billing/monetização
- Mobile app nativa
- Legendagem automática
- Editor rico de texto (apenas visualização de segmentos)

---

## 3. Architecture

### 3.1 System Diagram

```mermaid
graph TB
    Browser["🌐 Browser<br/>(React 19)"]
    NextApp["Next.js 15 App Router<br/>(Route Handler)"]
    Elysia["Elysia 1.1 REST API<br/>(/api prefix)"]
    Drizzle["Drizzle ORM<br/>(Query Builder)"]
    PG["🐘 PostgreSQL 15<br/>(Relational)"]
    Storage["📁 Local Storage<br/>(./uploads/)"]
    Worker["⚙️ Worker Loop<br/>(15s polling)"]
    Groq["🤖 Groq API<br/>(Whisper-large-v3)"]

    Browser -->|Fetch /api/*| NextApp
    NextApp -->|app.handle| Elysia
    Elysia -->|Select/Insert| Drizzle
    Drizzle -->|SQL| PG
    Elysia -->|Write/Read| Storage
    Worker -->|POST /api/jobs/run| Elysia
    Elysia -->|Submit job| Groq
    Groq -->|Segments + text| Elysia
    Elysia -->|Update status| Drizzle

    style Browser fill:#e1f5ff
    style NextApp fill:#fff3e0
    style Elysia fill:#f3e5f5
    style PG fill:#e8f5e9
    style Worker fill:#fce4ec
    style Groq fill:#ede7f6
```

### 3.2 Data Flow: Transcrição

```mermaid
sequenceDiagram
    participant User
    participant NextApp as Next.js App
    participant Elysia
    participant PG as PostgreSQL
    participant Storage
    participant Worker
    participant Groq

    User->>NextApp: POST /api/transcripts + formdata
    NextApp->>Elysia: app.handle(req)
    Elysia->>Storage: Save file to ./uploads/[transcriptId]/[uuid]-[filename]
    Elysia->>PG: INSERT transcripts, media, transcriptionJobs (status=pending)
    Elysia->>NextApp: 201 {transcriptId, mediaId, job_id}

    Note over Worker: Every 15 seconds
    Worker->>Elysia: POST /api/jobs/run (x-internal-key header)
    Elysia->>PG: SELECT * FROM transcriptionJobs WHERE status='pending'
    loop For each pending job
        Elysia->>PG: UPDATE status='processing'
        Elysia->>Storage: Read media file
        Elysia->>Groq: POST /openai/v1/audio/transcriptions (multipart)
        Groq->>Elysia: {segments: [{startMs, endMs, text}]}
        Elysia->>PG: INSERT transcriptSegments, UPDATE media.durationSeconds
        Elysia->>PG: UPDATE transcriptionJobs status='done'
        Elysia->>PG: INSERT notifications (para owner)
    end

    User->>NextApp: GET /api/transcripts/[id]
    NextApp->>Elysia: Fetch via auth plugin
    Elysia->>PG: SELECT * (owner check)
    Elysia->>NextApp: 200 {transcript, segments, status}
    NextApp->>User: Render UI com status e segments
```

---

## 4. Camadas (Layered Architecture)

```
┌────────────────────────────────────────────────────────┐
│ Presentation Layer (Next.js UI)                        │
│ • components/ui/ (ShadCN: Button, Card, Dialog, etc) │
│ • (app)/transcripts/page.tsx (Server Components)      │
│ • hooks (use-toast, use-auth)                         │
└────────────────────────────────────────────────────────┘
                         ↓ Fetch /api/*
┌────────────────────────────────────────────────────────┐
│ API Layer (Elysia Route Handlers)                      │
│ • src/server/routes/transcripts.ts                    │
│ • src/server/routes/media.ts                          │
│ • src/server/routes/auth.ts                           │
│ • src/server/routes/shares.ts                         │
│ • src/server/routes/jobs.ts (worker trigger)          │
│ • Error plugin, Auth plugin (JWT validation)          │
└────────────────────────────────────────────────────────┘
                         ↓
┌────────────────────────────────────────────────────────┐
│ Domain Service Layer (Business Logic)                  │
│ • src/server/services/transcription.ts (Groq call)   │
│ • src/server/services/storage.ts (abstração)          │
│ • src/server/services/jobs.ts (fila assíncrona)       │
│ • src/server/services/share.ts (permissões)           │
│ • src/server/services/notification.ts (pub/sub)       │
└────────────────────────────────────────────────────────┘
                         ↓
┌────────────────────────────────────────────────────────┐
│ Data Access Layer (Drizzle ORM)                        │
│ • src/db/schema.ts (Relational schema)                │
│ • src/db/client.ts (Drizzle instance)                 │
│ • Queries via db.select(), db.insert(), etc           │
└────────────────────────────────────────────────────────┘
                         ↓
┌────────────────────────────────────────────────────────┐
│ Database Layer (PostgreSQL 15)                         │
│ • 7 tables: users, transcripts, media, ...             │
│ • Constraints: FK, unique, check, default values      │
└────────────────────────────────────────────────────────┘
```

---

## 5. Modelo de Dados

**Schema Relacional (Drizzle):** `src/db/schema.ts` (300+ linhas)

| Tabela                 | Colunas            | Tipo              | FK                       | Default   | Enum                                    |
| ---------------------- | ------------------ | ----------------- | ------------------------ | --------- | --------------------------------------- |
| **users**              |
|                        | `id`               | UUID              | -                        | uuid()    | -                                       |
|                        | `email`            | VARCHAR           | -                        | -         | -                                       |
|                        | `passwordHash`     | VARCHAR           | -                        | -         | -                                       |
|                        | `name`             | VARCHAR           | -                        | -         | -                                       |
|                        | `avatarUrl`        | VARCHAR \| NULL   | -                        | NULL      | -                                       |
|                        | `role`             | VARCHAR           | -                        | 'user'    | user \| admin                           |
|                        | `createdAt`        | TIMESTAMP         | -                        | now()     | -                                       |
|                        | `updatedAt`        | TIMESTAMP         | -                        | now()     | -                                       |
| **transcripts**        |
|                        | `id`               | UUID              | -                        | uuid()    | -                                       |
|                        | `ownerId`          | UUID              | users.id (cascade)       | -         | -                                       |
|                        | `title`            | VARCHAR           | -                        | -         | -                                       |
|                        | `operationName`    | VARCHAR           | -                        | -         | -                                       |
|                        | `analysis`         | TEXT \| NULL      | -                        | NULL      | -                                       |
|                        | `status`           | VARCHAR           | -                        | 'pending' | pending \| processing \| done \| failed |
|                        | `position`         | INT               | -                        | 0         | -                                       |
|                        | `createdAt`        | TIMESTAMP         | -                        | now()     | -                                       |
|                        | `updatedAt`        | TIMESTAMP         | -                        | now()     | -                                       |
| **media**              |
|                        | `id`               | UUID              | -                        | uuid()    | -                                       |
|                        | `transcriptId`     | UUID              | transcripts.id (cascade) | -         | -                                       |
|                        | `filename`         | VARCHAR           | -                        | -         | -                                       |
|                        | `mime`             | VARCHAR           | -                        | -         | -                                       |
|                        | `sizeBytes`        | BIGINT            | -                        | -         | -                                       |
|                        | `storagePath`      | VARCHAR           | -                        | -         | -                                       |
|                        | `durationSeconds`  | FLOAT \| NULL     | -                        | NULL      | -                                       |
|                        | `createdAt`        | TIMESTAMP         | -                        | now()     | -                                       |
| **transcriptionJobs**  |
|                        | `id`               | UUID              | -                        | uuid()    | -                                       |
|                        | `mediaId`          | UUID              | media.id (cascade)       | -         | -                                       |
|                        | `status`           | VARCHAR           | -                        | 'pending' | pending \| processing \| done \| failed |
|                        | `error`            | TEXT \| NULL      | -                        | NULL      | -                                       |
|                        | `processedAt`      | TIMESTAMP \| NULL | -                        | NULL      | -                                       |
| **transcriptSegments** |
|                        | `id`               | UUID              | -                        | uuid()    | -                                       |
|                        | `mediaId`          | UUID              | media.id (cascade)       | -         | -                                       |
|                        | `startMs`          | INT               | -                        | -         | -                                       |
|                        | `endMs`            | INT               | -                        | -         | -                                       |
|                        | `text`             | TEXT              | -                        | -         | -                                       |
| **shares**             |
|                        | `id`               | UUID              | -                        | uuid()    | -                                       |
|                        | `transcriptId`     | UUID              | transcripts.id (cascade) | -         | -                                       |
|                        | `ownerId`          | UUID              | users.id (cascade)       | -         | -                                       |
|                        | `sharedWithUserId` | UUID              | users.id (cascade)       | -         | -                                       |
|                        | `createdAt`        | TIMESTAMP         | -                        | now()     | -                                       |
| **notifications**      |
|                        | `id`               | UUID              | -                        | uuid()    | -                                       |
|                        | `userId`           | UUID              | users.id (cascade)       | -         | -                                       |
|                        | `type`             | VARCHAR           | -                        | -         | -                                       |
|                        | `message`          | TEXT              | -                        | -         | -                                       |
|                        | `read`             | BOOLEAN           | -                        | false     | -                                       |
|                        | `createdAt`        | TIMESTAMP         | -                        | now()     | -                                       |

**Relacionamentos Drizzle:**

- `users.transcripts`: 1:many (user owns many transcripts)
- `transcripts.media`: 1:many (transcript has many media files)
- `media.transcriptionJobs`: 1:1 (job por arquivo)
- `media.transcriptSegments`: 1:many (segmentos extraídos)
- `shares.owner/sharedWith`: many:many via join table

---

## 6. Fluxos Principais

### 6.1 Fluxo de Autenticação & Sessão

```
1. POST /api/auth/login { email, password }
   → Drizzle SELECT * FROM users WHERE email = ?
   → bcryptjs.compare(password, passwordHash)
   ✗ senha inválida → 401 Unauthorized
   ✓ senha OK → jose.jwtVerify() gerador de JWT

2. JWT gerado: { sub: userId, iat, exp: +7d }
   → Assinado com HS256 (JWT_SECRET env var)
   → Anexado a cookie httpOnly { "transcripts_session": "[token]" }
   → SameSite=Strict, Secure (produção)
   → Resposta 200 { userId, email, name }

3. Requisições subsequentes
   → Browser envia cookie automaticamente
   → Next.js Route Handler recebe request
   → Elysia authPlugin: extrair cookie, jose.jwtVerify()
   ✗ inválido/expirado → plugin retorna 401
   ✓ válido → contexto global { userId, email, role }

4. Logout: DELETE /api/auth/logout
   → Limpa cookie via Set-Cookie (Max-Age=0)
```

### 6.2 Fluxo de Cadastro & Transcrição

```
1. POST /api/transcripts/create
   { title, operationName?, files: [File, File, ...] }
   → multipart/form-data
   → authPlugin valida JWT, injeta userId
   → Zod valida title (min 3 chars)

2. Para cada arquivo:
   → StorageProvider.save() → ./uploads/{transcriptId}/[uuid]-{filename}
   → INSERT media row: { transcriptId, filename, mime, sizeBytes, storagePath }
   → INSERT transcriptionJobs row: { mediaId, status: 'pending' }

3. Resposta 201:
   {
     transcriptId: uuid,
     mediaIds: [uuid, uuid],
     jobIds: [uuid, uuid],
     status: 'pending'
   }

4. Browser inicia polling GET /api/transcripts/{id}
   → Cada 2s: fetch segments, status
   → UI exibe progresso, segmentos conforme chegam
```

### 6.3 Fluxo do Worker (Assíncrono)

```
1. Worker container inicia (docker-compose.yml service "worker")
   → Executa: bun run worker:loop
   → src/workers/loop.ts: tick() a cada 15 segundos

2. Cada tick():
   POST /api/jobs/run { x-internal-key: INTERNAL_API_KEY header }
   → Elysia jobsRoutes valida header (contra env var)
   ✗ inválido → 401
   ✓ válido → continua

3. Elysia jobs.ts handler:
   SELECT * FROM transcriptionJobs WHERE status = 'pending' LIMIT 10
   → Para cada job: UPDATE status = 'processing'
   → storage.read(media.storagePath)
   → TranscriptionService.submit(buffer, mime, language='pt-BR')
   → Groq API call: POST /openai/v1/audio/transcriptions

4. Groq responde:
   {
     text: "transcrição completa...",
     segments: [
       { startMs: 0, endMs: 2500, text: "palavra um" },
       { startMs: 2500, endMs: 5000, text: "palavra dois" }
     ]
   }

5. Elysia salva:
   → UPDATE media SET durationSeconds = Groq.duration
   → INSERT transcriptSegments (startMs, endMs, text)
   → UPDATE transcriptionJobs SET status='done', processedAt=now()
   → INSERT notification { userId: owner, type: 'transcription_complete', ... }

6. Se erro:
   → UPDATE transcriptionJobs SET status='failed', error='...'
   → INSERT notification { type: 'transcription_failed', message: error }
```

### 6.4 Fluxo de Compartilhamento

```
1. POST /api/transcripts/{id}/share
   { sharedWithUserId: uuid }
   → authPlugin: validate owner == userId
   → Zod valida UUID

2. INSERT shares
   { transcriptId, ownerId: userId, sharedWithUserId }

3. SELECT shares WHERE transcriptId = id OR sharedWithUserId = userId
   → Usuários podem ver transcritos compartilhados

4. INSERT notification para sharedWithUserId
   { type: 'transcript_shared', message: "User compartilhou com você" }
```

---

## 7. Decisões de Design (ADRs)

### ADR-1: Elysia atrás de Next.js Route Handler

**Decisão:** Montar Elysia em `/api` via Next.js Route Handler dinâmico.

**Razão:** Simplifica deploy (1 container), reutiliza infraestrutura Next.js, permite Middleware de autenticação Next-level antes de Elysia.

**Trade-offs:** Menor performance que Elysia standalone; acoplamento Next.js. Aceitável para MVP (<10k req/min).

---

### ADR-2: Worker Loop com Polling (não Queue)

**Decisão:** Worker container faz POST `/api/jobs/run` a cada 15s.

**Razão:** Simplicidade (sem Redis/RabbitMQ), não requer transações distribuídas, easy debug, logs centralizados.

**Trade-offs:** Latência máxima 15s, ineficiente se muitos jobs pendentes. Escalável até ~100 jobs/15s com 1 worker.

---

### ADR-3: Groq como Provider Primário

**Decisão:** Whisper-large-v3 PT-BR via Groq API (sem fallback a OpenAI neste MVP).

**Razão:** Melhor custo PT-BR, latência aceitável, qualidade comparável a OpenAI.

**Trade-offs:** Dependência de SLA Groq, sem redundância. Adicionaremos OpenAI como fallback em produção.

---

### ADR-4: Storage Local (Abstrato)

**Decisão:** `StorageProvider` interface salva em `./uploads/{transcriptId}/` localmente; fácil trocar por S3 depois.

**Razão:** Zero custo MVP, acesso rápido a arquivos para transcrição, simplicidade Docker.

**Trade-offs:** Não escala além de 1 container; perde arquivos se reiniciar. S3/GCS migration planejada para GA.

---

### ADR-5: JWT HS256 em HttpOnly Cookie

**Decisão:** Cookie httpOnly (não localStorage), HS256 (não RS256), 7d expiry.

**Razão:** Proteção CSRF automática, não exposto XSS, simplifica renovação (próxima: refresh token pattern).

**Trade-offs:** Não funciona com múltiplos domínios/subdomínios sem ajuste CORS.

---

## 8. Estratégia de Erros

**Error Plugin Global** (`src/server/plugins/error.ts`):

- Captura todas exceções dentro de handlers Elysia
- Normaliza em formato padrão:
  ```json
  {
    "error": "transcript_not_found",
    "message": "Transcript com ID [id] não existe ou não pertence a você",
    "statusCode": 404
  }
  ```
- Logs estruturados em stdout (capturado por Docker)
- Tipos de erro esperado:
  - `auth_invalid`: JWT inválido/expirado (401)
  - `auth_required`: Sem JWT (401)
  - `forbidden`: Permissão negada (403)
  - `not_found`: Recurso inexistente (404)
  - `validation_error`: Zod falhou (400)
  - `storage_error`: Falha ao salvar arquivo (500)
  - `transcription_error`: Groq falhou (500)
  - `internal_error`: Erro não esperado (500)

**Tratamento UI:**

- Erros 4xx: Toast com mensagem de erro legível
- Erros 5xx: Toast genérico "Algo deu errado", log interno para debugging

---

## 9. Autenticação & Autorização

### Autenticação

- **Método:** JWT HS256 em cookie httpOnly `transcripts_session`
- **Geração:** POST `/api/auth/login` valida email + bcryptjs.compare(senha, hash)
- **Expiração:** 7 dias (configurável via `JWT_EXPIRY` env)
- **Refresh:** Não implementado MVP (refresh token no roadmap)

### Autorização (RBAC)

**Papéis:**

- `user`: Padrão, pode CRUD próprios transcritos, recebe compartilhamentos
- `admin`: Acesso a logs, pode deletar usuários, ajustar quotas (futura)

**Controle de Acesso (verificado no handler Elysia):**

| Ação                             | Permissão                        |
| -------------------------------- | -------------------------------- |
| GET /api/transcripts             | Próprios + compartilhados comigo |
| POST /api/transcripts            | Autenticado (qualquer user)      |
| PUT /api/transcripts/{id}        | `ownerId == userId`              |
| DELETE /api/transcripts/{id}     | `ownerId == userId`              |
| POST /api/transcripts/{id}/share | `ownerId == userId`              |
| GET /api/shares                  | Próprios compartilhamentos       |

**Middleware Elysia authPlugin:**

```typescript
app.use(authPlugin).onBeforeHandle(async ({ request }) => {
  const cookie = request.headers
    .get("cookie")
    ?.match(/transcripts_session=([^;]+)/)?.[1];
  if (!cookie) return new Response("Unauthorized", { status: 401 });
  try {
    const payload = await jwtVerify(cookie, secret);
    context.userId = payload.sub;
    context.role = payload.role;
  } catch {
    return new Response("Unauthorized", { status: 401 });
  }
});
```

---

## 10. Observabilidade

### Logs

- **Nível:** debug, info, warn, error em stdout/stderr
- **Formato:** JSON estruturado (facilita parsing)
  ```json
  {
    "timestamp": "2025-05-08T10:30:45Z",
    "level": "info",
    "service": "elysia",
    "event": "transcription_job_completed",
    "jobId": "uuid",
    "mediaId": "uuid",
    "durationMs": 45000
  }
  ```

### Métricas (Futuro)

- Endpoint latency (p50, p95, p99)
- Transcription success rate
- Worker tick duration
- DB query times

### Rastreamento (Futura)

- Distributed traces com correlation IDs
- Parent-child relationship: request → jobs → Groq

---

## 11. Riscos & Mitigações

| Risco                          | Probabilidade | Impacto | Mitigação                                                      |
| ------------------------------ | ------------- | ------- | -------------------------------------------------------------- |
| Groq API down                  | Média         | Alto    | Adicionar fallback OpenAI, status page, notificação automática |
| Arquivo perdido em restart     | Média         | Alto    | S3 migration, volume Docker persistente                        |
| Worker stuck/não processa jobs | Baixa         | Alto    | Health check endpoint `/api/health/worker`, alertas            |
| Autenticação bypass            | Baixa         | Crítico | Audit JWT payload, rate limit login, OWASP top 10 check        |
| XSS via conteúdo transcrito    | Baixa         | Médio   | Sanitizar segmentos antes de renderizar, CSP headers           |
| Overflow de uploads            | Média         | Médio   | Quota por usuário (futura), max file size 500MB                |

---

## 12. Rollout Plan

### Fase 0 (MVP Atual - in-progress)

- ✓ Autenticação JWT básica
- ✓ Upload multipart
- ✓ Transcrição Groq assíncrona
- ✓ Compartilhamento simples
- ✓ Docker Compose (dev)
- [ ] Testes E2E (Next.js + Elysia)
- [ ] Deploy staging

### Fase 1 (v0.1.0)

- Refresh token pattern
- Admin dashboard
- Quotas por usuário
- Email notifications (SendGrid)
- Improved error pages (400/500)

### Fase 2 (v0.2.0)

- S3 storage migration
- Groq + OpenAI fallback
- Editing de segmentos
- Markdown export
- Basic analytics

### Fase 3 (v1.0 - GA)

- Mobile app (React Native)
- Real-time WebSocket updates
- Billing (Stripe)
- Custom vocabulary para Groq
- Integração Slack/Teams

---

## 13. Open Questions

1. **Refresh Token:** Implementar após MVP? Ou apenas logout + re-login?
2. **Quotas:** Limite por usuário? Como enforcement?
3. **Retention:** Deletar transcritos após 30 dias de inatividade?
4. **Privacy:** GDPR/LGPD compliance? Data residency (Brazil)?
5. **Fallback Transcription:** Quando Groq falhar, usar OpenAI ou queue retry?
6. **Real-time UI:** WebSocket no roadmap? Ou polling é suficiente MVP?

---

## 14. Appendix

### Arquivo Estrutura do Projeto

```
/Users/carlosroberto/Workspace/Projetos/fullstack/chegii/transcripts/
├── src/
│   ├── app/                        # Next.js App Router
│   │   ├── api/[...path]/route.ts  # Route Handler bridge → Elysia
│   │   ├── (app)/
│   │   │   ├── transcripts/[id]/page.tsx
│   │   │   ├── transcripts/page.tsx
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx (home)
│   │   └── (auth)/
│   │       ├── login/page.tsx
│   │       └── register/page.tsx
│   ├── components/
│   │   ├── ui/                     # ShadCN/UI components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── input.tsx
│   │   │   ├── textarea.tsx
│   │   │   ├── badge.tsx
│   │   │   └── ... (11 total)
│   │   ├── transcripts/            # Feature components
│   │   │   ├── transcript-card.tsx
│   │   │   ├── transcript-grid.tsx
│   │   │   ├── new-transcript-dialog.tsx
│   │   │   ├── upload-dialog.tsx
│   │   │   ├── share-dialog.tsx
│   │   │   ├── transcript-editor.tsx
│   │   │   └── status-badge.tsx
│   │   └── layout/
│   │       ├── sidebar.tsx
│   │       ├── header.tsx
│   │       └── footer.tsx
│   ├── server/
│   │   ├── index.ts                # Elysia app mount
│   │   ├── routes/
│   │   │   ├── transcripts.ts      # POST/GET/PUT /api/transcripts
│   │   │   ├── media.ts            # POST /api/media/upload
│   │   │   ├── auth.ts             # POST /api/auth/{login,register,logout}
│   │   │   ├── shares.ts           # POST /api/transcripts/{id}/share
│   │   │   ├── jobs.ts             # POST /api/jobs/run (worker trigger)
│   │   │   ├── notifications.ts    # GET /api/notifications
│   │   │   └── users.ts            # GET /api/users/me
│   │   ├── plugins/
│   │   │   ├── error.ts            # Error normalization
│   │   │   ├── auth.ts             # JWT validation, context injection
│   │   │   └── cors.ts
│   │   ├── services/
│   │   │   ├── transcription.ts    # Groq API integration
│   │   │   ├── storage.ts          # File I/O abstraction
│   │   │   ├── jobs.ts             # Job queue logic
│   │   │   ├── share.ts            # Share permissions
│   │   │   └── notification.ts     # DB notification insert
│   │   └── lib/
│   │       ├── jwt.ts              # jose helpers
│   │       ├── auth.ts             # bcryptjs, session validation
│   │       ├── zod.ts              # Shared Zod schemas
│   │       └── utils-server.ts
│   ├── db/
│   │   ├── schema.ts               # Drizzle relations, enums, tables
│   │   ├── client.ts               # Drizzle instance
│   │   └── seed.ts                 # Dev data
│   ├── lib/
│   │   ├── client.ts               # Fetch wrapper, auth header
│   │   └── api-client.ts           # Typed API calls
│   ├── hooks/
│   │   └── use-toast.ts
│   ├── utils.ts                    # cn(), classnames
│   └── styles/
│       └── globals.css
├── src/workers/
│   ├── loop.ts                     # 15s polling main loop
│   └── tick.ts                     # Single job processing
├── docker-compose.yml              # app + db + worker services
├── Dockerfile                      # Multi-stage bun build
├── drizzle/
│   └── [migrations]/               # Auto-generated SQL
├── docs/
│   ├── SDD.md                      # This file
│   ├── PRD.md
│   ├── SPEC.md
│   ├── DESIGN.md
│   └── AGENTS.md
├── package.json                    # Bun dependencies
├── tsconfig.json                   # TypeScript config
├── next.config.ts
├── drizzle.config.ts
├── postcss.config.mjs              # Tailwind CSS
├── eslint.config.mjs
├── .env.example
└── README.md
```

### Variáveis de Ambiente

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/transcripts
DIRECT_URL=postgresql://...         # Drizzle migration URL

# JWT
JWT_SECRET=your-hs256-secret-here
JWT_EXPIRY=7d

# API Keys
GROQ_API_KEY=gsk_...
OPENAI_API_KEY=sk_...               # Futuro fallback

# Worker
INTERNAL_API_KEY=super-secret-key   # Validação POST /api/jobs/run
APP_URL=http://localhost:3000       # Worker envia requests para aqui

# Storage
STORAGE_DIR=./uploads               # Local path (futuro: S3_BUCKET, etc)

# Next.js
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Transcrição
TRANSCRIPTION_PROVIDER=groq          # groq | openai
TRANSCRIPTION_LANGUAGE=pt-BR
```

### Comandos Desenvolvedor

```bash
# Setup
bun install
cp .env.example .env.local
bunx drizzle-kit push               # Sync schema to DB

# Development
bun run dev                          # Next.js + Elysia (via API handler)
docker compose up --build            # App + DB + Worker containers

# Database
bunx drizzle-kit studio              # UI browser → sqlite://localhost:5555
bunx drizzle-kit generate            # Gera migração SQL
bunx drizzle-kit migrate             # Aplica migração

# Validation
bunx tsc --noEmit                    # Type check
bunx eslint .                        # Lint
bun test                             # Jest tests (futuro)
```

### Versões (Locked)

- Node/Bun: v1.1.x (runner)
- Next.js: 15.0.x (App Router)
- React: 19.x
- Elysia: 1.1.x
- Drizzle: 0.36.x
- PostgreSQL: 15-alpine (Docker)
- Tailwind CSS: 4.x
- TypeScript: 5.x
- Zod: 4.x

---

**Última atualização:** 2025-05-08 | **Status:** MVP em progresso | **Próxima review:** Após Fase 1 (v0.1.0)
