# Product Requirements Document (PRD)

## Transcripts — Transcrição de Mídia em PT-BR

---

## 1. Visão do Produto

**Nome:** Transcripts  
**Tipo:** SaaS de transcrição de mídia  
**Descrição:** Plataforma web para transcrição automática de áudio e vídeo (`.opus`, `.mp3`, `.wav`, `.flac`, `.mp4`, `.m4a`, `.aac`, `.ogg`) para texto em português brasileiro, com editor colaborativo, análise de conteúdo e compartilhamento com controle de permissões.

**Diferencial:**

- Otimizado para português brasileiro (Whisper large-v3 baseline)
- Edição colaborativa (múltiplos usuários, compartilhamento com permissões)
- Drag-and-drop para reordenação persistente de transcrições
- Busca full-text em título, nome da operação e análise
- Suporte a múltiplas mídias por transcrição (upload em batch)
- Editor rich-text para análise e conteúdo
- Notificações em tempo real (polling 30s)
- Dark mode padrão, light mode disponível
- Deploy em Docker (4 variantes: padrão, local, Easypanel, Coolify)

---

## 2. Problema e Oportunidade

**Problema:**

- Profissionais (advogados, jornalistas, atendimento, podcasters) gastam 2-4h transcrevendo manualmente a cada 1h de áudio.
- Ferramentas estrangeiras (Otter, Rev) erram significativamente em português brasileiro.
- Falta integração com fluxos de trabalho colaborativo.
- Dados sensíveis (áudios legais, médicos) ficam em servidores estrangeiros ou têm cobrança por minuto.

**Oportunidade:**

- Mercado PT-BR carente: ~50k profissionais com gastos >R$ 200/mês em transcrição.
- SaaS recorrente (modelo freemium → pro).
- Suporte a múltiplas mídias e compartilhamento reduz resistência à adoção.

---

## 3. Público-alvo e Personas

| Persona              | Setor       | Caso de Uso                                      | Requisito-chave                              |
| -------------------- | ----------- | ------------------------------------------------ | -------------------------------------------- |
| **Advogada Marina**  | Jurídico    | Transcrever audiências, depoimentos, mediações  | Confidencialidade, precisão, compartilhamento |
| **Jornalista Pedro** | Mídia       | Entrevistas, transcrição de podcast editado     | Busca rápida, compartilhamento com editor    |
| **Gerente Ana**      | Atendimento | Qualidade de voz do cliente, análise sentimento | Análise rich-text, exportação de dados       |
| **Criador Lucas**    | Conteúdo    | Podcasts, vídeos YouTube, múltiplas mídias      | Upload múltiplo, editor de segmentos        |

---

## 4. Objetivos Mensuráveis

| Métrica                             | Target           | Justificativa                 |
| ----------------------------------- | ---------------- | ----------------------------- |
| **Latência p95 transcrição**        | < 0.3x duração   | Provider (local/Groq/OpenAI)  |
| **WER (Word Error Rate) PT-BR**     | < 8% em áudio    | Whisper-large-v3 baseline     |
| **Conversão Free → Pro**            | 30% em D30       | Benchmarks SaaS transcrição   |
| **Retenção D30**                    | > 40%            | Early-stage SaaS típico       |
| **NPS**                             | > 40             | Produto opinável              |
| **Minutos transcritos/usuário/mês** | > 60 (pro)       | Métrica de uso                |
| **Uptime**                          | 99.5% (ops)      | SLA MVP em produção (Coolify) |

---

## 5. Escopo IN (MVP Entregue + Atual)

### 5.1 Autenticação e Conta

- **RF-1:** Registrar usuário com nome, email, senha (bcrypt 10+ rounds)
- **RF-2:** Login com email/senha, JWT em cookie httpOnly, samesite=lax
- **RF-3:** Refresh token automático (7 dias), logout limpa sessão
- **RF-4:** Perfil: visualizar/editar nome, alterar senha
- **Endpoints:** 
  - `POST /auth/register` — criar usuário
  - `POST /auth/login` — autenticar
  - `POST /auth/logout` — destruir sessão
  - `GET /auth/me` — obter usuário atual
  - `POST /auth/refresh` — renovar token
- **Implementação:** `/src/server/routes/auth.ts`

### 5.2 Transcrições (CRUD + Reorder)

- **RF-5:** Criar transcrição com título, nome da operação, data operação, data transcrição, análise (rich-text)
- **RF-6:** Listar transcrições do usuário paginadas (30 por página), com search full-text em título/operationName/analysis
- **RF-7:** Editar transcrição: título, operationName, operationDate, transcriptionDate, analysis
- **RF-8:** Soft delete (marca `deletedAt`), listagem exclui soft-deleted
- **RF-9:** Reordenar transcrições via drag-and-drop, persistir coluna `position` em DB
- **RF-10:** Acessar transcrições próprias OU compartilhadas (shares table)
- **Endpoints:**
  - `GET /transcripts` — listar (com ?q=termo, ?page=N)
  - `POST /transcripts` — criar
  - `GET /transcripts/:id` — obter com mídia associada
  - `PUT /transcripts/:id` — atualizar
  - `DELETE /transcripts/:id` — soft delete
  - `POST /transcripts/reorder` — atualizar positions em batch
- **Schema:** `transcripts(id, ownerId, title, operationName, operationDate, transcriptionDate, analysis, transcriptHtml, status, position, deletedAt, createdAt, updatedAt)`
- **Implementação:** `/src/server/routes/transcripts.ts`

### 5.3 Mídia (Upload + Metadata)

- **RF-11:** Upload múltiplo de arquivos (mp3, wav, opus, flac, mp4, m4a, aac, ogg)
- **RF-12:** Validação tipo MIME, tamanho máx 500MB por arquivo
- **RF-13:** Persistir metadata: filename, mime, sizeBytes, storagePath, durationSeconds, description (editável)
- **RF-14:** Pré-processar vídeo → MP3 16kHz mono (FFmpeg) antes de transcrever
- **RF-15:** Editar descrição de mídia após upload
- **RF-16:** Deletar mídia (cascata: job + segments)
- **RF-17:** Obter HTML transcrito da mídia (campo `transcriptHtml`)
- **RF-17.1:** Calcular SHA-256 (`media.hash`) ao gravar arquivo; persistir junto à metadata para integridade e dedup. Backfill via `bun run src/scripts/backfill-media-hash.ts`.
- **RF-17.2:** Retranscrever mídia individualmente sem reupload (`POST /media/:id/retranscribe`).
- **Endpoints:**
  - `POST /transcripts/:id/media` — upload múltiplo
  - `PATCH /media/:id` — editar descrição
  - `DELETE /media/:id` — deletar mídia
  - `POST /media/:id/retranscribe` — recriar job de transcrição
- **Schema:** `media(id, transcriptId, filename, mime, sizeBytes, storagePath, durationSeconds, description, transcriptHtml, hash, createdAt)` — `hash` SHA-256 nullable (legacy), populado em novos uploads.
- **Storage:** filesystem via `STORAGE_DIR` (padrão `./uploads`), Docker volume `/app/uploads`
- **Implementação:** `/src/server/routes/media.ts` · `/src/server/services/storage.ts`
- **Migração:** `drizzle/0008_add_media_hash.sql`

### 5.4 Fila de Transcrição (Worker + Provider)

- **RF-18:** Criar job ao receber media (status=pending)
- **RF-19:** Worker Bun (`src/workers/loop.ts`) chama `POST /api/jobs/run` a cada `WORKER_INTERVAL_MS` (padrão 3000ms)
- **RF-20:** Endpoint `/api/jobs/run` processa até `limit` jobs (padrão 3, máx 5) em paralelo
- **RF-21:** Job flow: pending → processing (FFmpeg prep) → chamar provider → done/failed
- **RF-22:** Providers: `local` (FastAPI Faster-Whisper :8000), `groq`, `openai`, com fallback configurável
- **RF-23:** Retry até 3x antes de marcar `failed`; notificar usuário em erro
- **RF-24:** Grava `transcriptHtml` na mídia, cria `transcriptSegments(startMs, endMs, text)` com timestamps
- **RF-25:** Atualizar `transcripts.status = done/failed` quando todas as mídias finalizarem
- **Endpoints:**
  - `GET /jobs` — listar jobs do usuário (admin: todos)
  - `POST /jobs/run` — processar jobs (autenticação `x-internal-key`)
  - `POST /jobs/:id/retry` — retranscrever mídia
- **Schema:** `transcriptionJobs(id, mediaId, provider, status, attempts, error, segmentCount, processingMs, startedAt, finishedAt, createdAt)` · `transcriptSegments(id, mediaId, startMs, endMs, text)`
- **Worker:** `/src/workers/loop.ts` (loop infinito), `/src/workers/tick.ts` (single-shot)
- **Implementação:** `/src/server/routes/jobs.ts` · `/src/server/services/jobs.ts` · `/src/server/services/transcription.ts`

### 5.5 Compartilhamento (Shares)

- **RF-26:** Compartilhar transcrição com outro usuário registrado (via email/userId)
- **RF-27:** Permissões: `canEdit=true` (editor) ou `canEdit=false` (viewer)
- **RF-28:** Receptor recebe notificação; pode listar compartilhamentos recebidos
- **RF-29:** Proprietário pode revogar share a qualquer hora
- **RF-30:** Listagem inclui transcrições compartilhadas (via `shares` table)
- **Endpoints:**
  - `POST /transcripts/:id/shares` — criar share
  - `GET /transcripts/:id/shares` — listar shares da transcrição
  - `PATCH /transcripts/:id/shares/:shareId` — atualizar permissões
  - `DELETE /transcripts/:id/shares/:shareId` — revogar share
  - `GET /shares` — listar shares recebidos
- **Schema:** `shares(id, transcriptId, ownerId, sharedWithUserId, canEdit, createdAt)`
- **Implementação:** `/src/server/routes/shares.ts`

### 5.6 Notificações (Polling)

- **RF-31:** Notificar proprietário quando transcrição é compartilhada (type=`share_created`)
- **RF-32:** Notificar quando share recebido é editado (type=`transcript_edited_shared`)
- **RF-33:** Listar notificações não-lidas no dashboard (bell icon, polling 30s)
- **RF-34:** Marcar lida (PATCH /notifications/:id com readAt timestamp)
- **RF-35:** Deletar notificação
- **Endpoints:**
  - `GET /notifications` — listar (com filtro read=true/false)
  - `PATCH /notifications/:id` — marcar lida
  - `DELETE /notifications/:id` — deletar
- **Schema:** `notifications(id, userId, type, payload (JSONB), readAt, createdAt)`
- **Implementação:** `/src/server/routes/notifications.ts` · `/src/server/services/notification.ts`

### 5.7 Tags (Organização)

- **RF-36:** Criar tags customizadas por usuário (nome, cor)
- **RF-37:** Filtrar transcrições por tag (roadmap: implementação full)
- **Schema:** `tags(id, ownerId, name, color, createdAt)`
- **Implementação:** `/src/server/routes/tags.ts` (CRUD básico)

### 5.8 Busca

- **RF-38:** Busca full-text em título, operationName, analysis (ILIKE)
- **RF-39:** Escopo: transcrições próprias + compartilhadas
- **Filtro:** query param `?q=termo`
- **Implementação:** `/src/server/routes/transcripts.ts` (GET /)

### 5.9 Root Redirect

- **RF-40:** Root `/` redireciona anônimo → `/login`, autenticado → `/dashboard`
- **RF-41:** Layout auth: split 2/3 (visual) + 1/3 (form) em desktop; 100% form mobile
- **RF-42:** Layout app: sidebar + header + main (páginas paginadas)
- **Implementação:** `/src/app/page.tsx` (redirect) · `/src/app/(auth)/layout.tsx` · `/src/app/(app)/layout.tsx`

### 5.10 UI/UX

- **RF-43:** Dark mode padrão via `next-themes` + `darkMode: class` no Tailwind
- **RF-44:** Light mode disponível (toggle no header)
- **RF-45:** Componentes ShadCN/UI new-york: Button, Card, Dialog, Input, Form, Select, Textarea, Checkbox, Badge, etc.
- **RF-46:** Cards com `backdrop-blur`, `rounded-lg`, `shadow-sm`, classe `glass-border-animated` no hover
- **RF-47:** Background grid (`<BgGrid />`) em layouts
- **RF-48:** Transições página: Framer Motion fade + slide-up (200ms, ease-out), keyada por pathname
- **RF-49:** Responsive design mobile-first (Tailwind breakpoints: sm, md, lg, xl)
- **RF-50:** Icons Lucide React em toda UI
- **RF-51:** Toast Sonner para feedback (não Alert nativo)
- **RF-52:** Skeleton loaders em data fetching
- **RF-53:** Empty states com ícone + texto + CTA
- **Diretórios:** `/src/components/ui/` (ShadCN) · `/src/components/transcripts/` (domain) · `/src/components/providers/`

### 5.11 Páginas Implementadas

- **`/`** — Redirect (anônimo → login, autenticado → dashboard)
- **`/(auth)/login`** — Login form (email, senha, link register)
- **`/(auth)/register`** — Register form (nome, email, senha, confirmação)
- **`/(app)/dashboard`** — Grid de transcrições (Cards drag-drop), nova transcrição, filtro/busca
- **`/(app)/transcripts/:id`** — Detalhe transcrição com mídias, editor rich-text para analysis
- **`/(app)/transcripts`** — Alias de dashboard (ambos listam transcripts)
- **`/(app)/profile`** — Editar nome, senha, preferências (tema)
- **`/(app)/notifications`** — Listar notificações (lidas/não-lidas)
- **`/(app)/tags`** — Gerenciar tags (create, list, delete)

### 5.12 Configuração de Conta

- **RF-54:** Alterar tema (dark/light)
- **RF-55:** Editar nome e email
- **RF-56:** Alterar senha (validação: força mínima)

### 5.13 Exportação de Transcrição

- **RF-57:** Exportar transcrição completa em `txt`, `html`, `doc` ou `docx` (lib `docx`).
- **RF-58:** Documento exportado inclui: título, operação, datas, análise (rich-text), tabela de mídias com **SHA-256 (`media.hash`)**, segmentos com timestamps, owner.
- **RF-59:** Filename gerado por `buildExportFilename(transcript, format)`.
- **Endpoint:** `GET /transcripts/:id/export?format=txt|html|doc|docx`
- **Implementação:** `/src/server/services/export.ts` (`exportTranscript`, `buildExportFilename`)

### 5.14 Print View

- **RF-60:** Página `/transcripts/:id/print` com layout dedicado a impressão (sem chrome do app).
- **RF-61:** Inclui SHA-256 de cada mídia para auditoria.
- **Implementação:** `/src/app/(app)/transcripts/[id]/print/{layout,page,print-view}.tsx`

### 5.15 Admin

- **RF-62:** Página `/admin/users` para administradores listarem/gerenciarem usuários.
- **RF-63:** Macro `requireAdmin` em rotas Elysia restritas (`src/server/plugins/auth.ts`).
- **Schema:** enum `user_role` estendido em `drizzle/0007_expand_user_roles.sql`.
- **Implementação:** `/src/app/(app)/admin/users/page.tsx` · `/src/server/routes/users.ts`

---

## 6. Escopo OUT (Roadmap Futuro)

- **Pagamento real** (Stripe): stub implementado em v0.1, real em v0.2
- **Realtime SSE:** edição colaborativa simultânea com cursores
- **Painel admin:** analytics, gerenciar usuários, refund
- **Tradução:** suporte para EN, ES, FR
- **Integração:** Zoom, Google Meet, WhatsApp Business, Slack
- **API pública:** webhooks, export SRT/VTT/DOCX completo, integração programática
- **Mobile app** (React Native)
- **OCR:** extrair texto de imagens de documentos
- **Criptografia at-rest:** para áudios sensíveis
- **LDAP/SSO corporativo**
- **Análise de sentimento:** automática na transcrição
- **Speaker diarization:** identificar quem fala em áudio
- **Machine translation:** traduzir transcrição para outros idiomas
- **Custom fine-tuning:** modelo Whisper ajustado ao jargão específico

---

## 7. Requisitos Não-Funcionais

| Requisito           | Especificação                                                                    |
| ------------------- | -------------------------------------------------------------------------------- |
| **Performance**     | GET /transcripts p95 < 200ms. Upload + fila < 1s. Transcrição < 0.3x duração    |
| **Disponibilidade** | 99% uptime (SLA pago em v1.0, MVP em produção via Coolify)                      |
| **Segurança**       | JWT httpOnly samesite=lax. Bcrypt 10+ rounds. Validação Zod toda rota. No secret hardcoded. |
| **Escalabilidade**  | Suportar 1k usuários simultâneos com 1k transcrições/dia (5 min avg).            |
| **Banco de Dados**  | PostgreSQL 16, Drizzle ORM, migrations versionadas, backup daily.                |
| **LGPD**            | Dados em servidores PT-BR (Coolify VPS, Easypanel cloud). Soft-delete, audit.   |
| **Acessibilidade**  | WCAG 2.1 AA (roadmap, MVP em progresso com ShadCN).                             |
| **SEO**             | Meta tags, og:image, sitemap (landing page futura).                             |
| **Build**           | Bun build < 2 min. Docker build < 10 min. Deploy < 5 min.                       |
| **Storage**         | Filesystem local ou S3-compatible. Limite 500MB por arquivo.                    |

---

## 8. Riscos e Mitigações

| Risco                                    | Probabilidade | Impacto | Mitigação                                                    |
| ---------------------------------------- | ------------- | ------- | ------------------------------------------------------------ |
| **Custo Groq/OpenAI escala com uso**     | Alta          | Alto    | Plano pago limita minutos. Cache requests. Fallback provider. |
| **WER ruim em áudio com ruído**          | Alta          | Médio   | Aviso no upload. FFmpeg pré-proc. Guia qualidade áudio.      |
| **Privacidade áudios sensíveis**         | Média         | Alto    | Criptografia at-rest (roadmap). Termo de serviço + LGPD.     |
| **Integração provider falha**            | Baixa         | Alto    | Circuit breaker. Retry exponencial 3x. Notificar usuário.    |
| **Perda dados transcrição**              | Muito Baixa   | Crítico | Transação BD. Backup daily. Audit log.                       |
| **Concorrência edição (race condition)** | Baixa         | Médio   | Lock pessimista on `transcripts.updatedAt`. Roadmap: OT.    |

---

## 9. Stack Tecnológico

| Camada              | Tecnologia                                           |
| ------------------- | ---------------------------------------------------- |
| **Frontend**        | Next.js 16 App Router, React 19, TypeScript          |
| **Estilo**          | Tailwind CSS v4, ShadCN/UI new-york, Framer Motion  |
| **Forms**           | react-hook-form + @hookform/resolvers/zod           |
| **Backend**         | Elysia (Bun), TypeScript, José (JWT)                 |
| **ORM**             | Drizzle ORM                                          |
| **Banco de Dados**  | PostgreSQL 16                                        |
| **Validação**       | Zod v4                                               |
| **Auth**            | JWT (cookie httpOnly, samesite=lax)                  |
| **Transcrição**     | Faster-Whisper (local, Python 3.12) + Groq/OpenAI   |
| **Processamento**   | FFmpeg (MP3 16kHz mono)                              |
| **Date/Time**       | dayjs (locale pt-BR)                                 |
| **Runtime**         | Bun (package manager, executor, worker)              |
| **Hosting**         | Docker Compose (4 variantes)                         |
| **Deployment**      | Coolify VPS (produção) + Easypanel (cloud beta)      |
| **Transcriber**     | Container Python 3.12 + FastAPI + faster-whisper    |
| **Icons**           | Lucide React                                         |
| **Toast**           | Sonner                                               |
| **Rich text**       | TipTap (`@tiptap/react`, `starter-kit`, `extension-link`) |
| **Drag-and-drop**   | `@dnd-kit/core`, `@dnd-kit/sortable`                 |
| **Export**          | `docx` (txt/html/doc/docx)                           |
| **Hash**            | SHA-256 (Node `crypto`) em `media.hash`              |
| **Deploy script**   | `scripts/deploy-easypanel.ts` (`bun run deploy`)     |

---

## 10. Infraestrutura

### 10.1 Docker Compose Variantes

- **`docker-compose.yml`** — Produção padrão (db, migrate, transcriber, app, worker)
- **`docker-compose.local.yml`** — Dev local (+ pgadmin :5050 para debug)
- **`docker-compose-easypanel.yml`** — Cloud Easypanel (expose sem ports, variáveis SERVICE_*)
- **`docker-compose-coolify.yml`** — Coolify VPS (mesmo pattern Easypanel)

### 10.2 Serviços

| Serviço     | Imagem               | Porta | Volume                    | Healthcheck                   |
| ----------- | -------------------- | ----- | ------------------------- | ----------------------------- |
| `db`        | postgres:16-alpine   | 5432  | pgdata (/var/lib/postgresql) | SQL check                     |
| `migrate`   | (Node.js + drizzle)  | —     | —                         | one-shot, exit 0 = ok         |
| `transcriber` | python:3.12-slim     | 8000  | whisper_cache (/root/.cache) | GET /health                   |
| `app`       | (Node.js)            | 3000  | uploads (/app/uploads)    | GET /health (Elysia)          |
| `worker`    | (Node.js)            | —     | uploads (/app/uploads)    | stateless, logs               |
| `pgadmin`   | dpage/pgadmin4 (dev) | 5050  | —                         | (dev only)                    |

### 10.3 Variáveis de Ambiente

```env
# DB
DATABASE_URL=postgres://transcripts:transcripts@db:5432/transcripts
POSTGRES_USER=transcripts
POSTGRES_PASSWORD=transcripts
POSTGRES_DB=transcripts

# Auth
JWT_SECRET=<>
JWT_REFRESH_SECRET=<>
INTERNAL_API_KEY=<> (worker auth)

# App
NODE_ENV=production
PORT=3000
HOSTNAME=0.0.0.0
NEXT_PUBLIC_APP_URL=http://localhost:3000
APP_URL=http://app:3000

# Transcrição
TRANSCRIPTION_PROVIDER=local  # local | groq | openai
TRANSCRIPTION_PROVIDER_FALLBACK= (optional)
TRANSCRIBER_URL=http://transcriber:8000
TRANSCRIBER_TIMEOUT_MS=60000

# Whisper (provider=local)
WHISPER_MODEL=base  # tiny | base | small | medium | large-v3
WHISPER_COMPUTE_TYPE=int8  # int8 | float32
WHISPER_DEVICE=cpu  # cpu | cuda
WHISPER_BEAM_SIZE=3
WHISPER_NUM_WORKERS=1
WHISPER_VAD_FILTER=true

# Providers (optional)
GROQ_API_KEY=<>
OPENAI_API_KEY=<>

# Storage + Worker
STORAGE_DIR=./uploads
WORKER_INTERVAL_MS=3000  # padrão 3 segundos
LOG_LEVEL=INFO

# Coolify (auto-generated)
SERVICE_FQDN_APP=<>
SERVICE_USER_POSTGRES=<>
SERVICE_PASSWORD_POSTGRES=<>
SERVICE_BASE64_64_*=<> (secrets encoded)
```

---

## 11. Métricas de Sucesso

### 11.1 Produto

- Minutos transcritos/usuário/mês > 60 (Pro)
- WER em áudio limpo < 8%
- Latência p95 transcrição < 0.3x duração
- Taxa retenção D30 > 40%

### 11.2 Negócio

- 30% conversão Free → Pro em D30
- NPS > 40
- CAC < R$ 50 (se marketing aplicado)
- Churn mensal < 5%

### 11.3 Técnico

- Uptime 99%+ (monitorado via Coolify/Easypanel)
- Build time < 2 min
- Deploy time < 5 min
- Error rate < 0.5% (HTTP 5xx)
- p95 latência GET /transcripts < 200ms

---

## 12. Roadmap

| Versão   | Release        | Features Principais                                      |
| -------- | -------------- | -------------------------------------------------------- |
| **v0.1** | MVP (Entregue) | Auth, CRUD transcrições, upload múltiplo, fila, shares  |
| **v0.2** | +60 dias       | Stripe real, SSO Google, API pública draft               |
| **v0.3** | +90 dias       | Webhooks, export SRT/VTT, realtime SSE início            |
| **v0.4** | +120 dias      | Realtime colaboração, integração WhatsApp, mobile beta   |

---

## 13. Definições e Convenções

- **Free:** até 60 min/mês, 1 usuário, sem compartilhamento
- **Pro:** até 500 min/mês, 5 compartilhamentos, notificações email
- **Enterprise:** ilimitado, SSO, suporte, custom integração
- **JWT:** JSON Web Token, access 24h, refresh 7 dias
- **WER:** Word Error Rate = (sub + del + ins) / total words
- **Groq:** LLM/transcrição API, ~5x realtime
- **Drag-and-drop:** reorder transcripts persistindo coluna `position`
- **Provider:** local (FastAPI), groq (API), openai (API)
- **Soft Delete:** `deletedAt NOT NULL`, excluded de queries padrão
- **Share:** permissão canEdit true (editor) / false (viewer)

---

## Apêndice A: Mapeamento Código Real

### Routes

| Funcionalidade       | Arquivo                              | Endpoints                                         |
| -------------------- | ------------------------------------ | ------------------------------------------------- |
| **Auth**             | `/src/server/routes/auth.ts`         | POST /register, /login, /logout, GET /me, POST /refresh |
| **Transcrições**     | `/src/server/routes/transcripts.ts`  | GET /, POST /, GET/:id, PATCH/:id, DELETE/:id, PATCH /reorder, **GET /:id/export** |
| **Mídia**            | `/src/server/routes/media.ts`        | POST /transcripts/:id/media, PATCH/:id, DELETE/:id, **POST /:id/retranscribe** |
| **Compartilhamento** | `/src/server/routes/shares.ts`       | GET /shares, DELETE /:shareId (nested em transcripts) |
| **Notificações**     | `/src/server/routes/notifications.ts` | GET /, POST /read-all                            |
| **Jobs/Transcrição** | `/src/server/routes/jobs.ts`         | POST /jobs/run, GET /transcripts/:id/jobs        |
| **Tags**             | `/src/server/routes/tags.ts`         | GET /, POST /, PATCH/:id, DELETE/:id             |
| **Users / Admin**    | `/src/server/routes/users.ts`        | GET /me, DELETE /me, endpoints admin (`requireAdmin`) |
| **Health**           | `/src/server/routes/health.ts`       | GET /health (readiness)                          |

### Schema

| Tabela               | Arquivo              | Campos-chave                                       |
| -------------------- | -------------------- | -------------------------------------------------- |
| **users**            | `/src/db/schema.ts`  | id, email, name, avatarUrl, role, createdAt       |
| **transcripts**      | —                    | id, ownerId, title, operationName, analysis, status, position, deletedAt |
| **media**            | —                    | id, transcriptId, filename, mime, sizeBytes, storagePath, durationSeconds, description, transcriptHtml, **hash** (SHA-256) |
| **transcriptionJobs** | —                    | id, mediaId, provider, status, attempts, error, segmentCount, processingMs |
| **transcriptSegments** | —                    | id, mediaId, startMs, endMs, text                 |
| **shares**           | —                    | id, transcriptId, ownerId, sharedWithUserId, canEdit |
| **notifications**    | —                    | id, userId, type, payload (JSONB), readAt        |
| **tags**             | —                    | id, ownerId, name, color                         |

### Pages (Next.js)

| Página                    | Arquivo                             | Tipo      | Auth    |
| ------------------------- | ----------------------------------- | --------- | ------- |
| **Root Redirect**         | `/src/app/page.tsx`                 | server    | auto    |
| **Login**                 | `/src/app/(auth)/login/page.tsx`    | client    | public  |
| **Register**              | `/src/app/(auth)/register/page.tsx` | client    | public  |
| **Dashboard**             | `/src/app/(app)/dashboard/page.tsx` | client    | auth    |
| **Transcrição (detalhe)** | `/src/app/(app)/transcripts/[id]/page.tsx` | client | auth |
| **Transcrições (list)**   | `/src/app/(app)/transcripts/page.tsx` | client    | auth    |
| **Perfil**                | `/src/app/(app)/profile/page.tsx`   | client    | auth    |
| **Notificações**          | `/src/app/(app)/notifications/page.tsx` | client | auth    |
| **Tags**                  | `/src/app/(app)/tags/page.tsx`      | client    | auth    |
| **Admin Users**           | `/src/app/(app)/admin/users/page.tsx` | client  | admin   |
| **Print View**            | `/src/app/(app)/transcripts/[id]/print/page.tsx` | client/print | auth |

### Componentes (Domain)

| Componente                      | Arquivo                                         | Uso                          |
| ------------------------------- | ----------------------------------------------- | ---------------------------- |
| **NewTranscriptDialog**         | `/src/components/transcripts/new-transcript-dialog.tsx` | Create + upload múltiplo |
| **TranscriptGrid**              | `/src/components/transcripts/transcript-grid.tsx` | Dashboard (cards drag-drop) |
| **MediaTranscriptEditor**       | `/src/components/transcripts/media-transcript-editor.tsx` | Edit segments |
| **LiveTranscription**           | `/src/components/transcripts/live-transcription.tsx` | Monitor fila (real-time UI) |
| **ShareDialog**                 | `/src/components/transcripts/share-dialog.tsx` | Compartilhar transcript |
| **RichTextEditor**              | `/src/components/ui/rich-text-editor.tsx`      | Edit analysis (Tiptap?)     |
| **BgGrid**                      | `/src/components/ui/bg-grid.tsx`                | Background grid visual      |

### Serviços

| Serviço             | Arquivo                              | Funções-chave                                  |
| ------------------- | ------------------------------------ | ---------------------------------------------- |
| **Jobs/Transcrição** | `/src/server/services/jobs.ts`       | runPendingJobs, createTranscriptionJob, retryJob |
| **Transcription**   | `/src/server/services/transcription.ts` | getProvider, transcribeMedia, parseSegments |
| **Notification**    | `/src/server/services/notification.ts` | createNotification, markRead, delete           |
| **Storage**         | `/src/server/services/storage.ts`    | saveFile (+ SHA-256), deleteFile, getMetadata  |
| **Export**          | `/src/server/services/export.ts`     | exportTranscript (txt/html/doc/docx), buildExportFilename, buildHtml |
| **Share**           | `/src/server/services/share.ts`      | createShare, revokeShare                       |
| **User**            | `/src/server/services/user.ts`       | listUsers (admin), updateProfile, deleteAccount |

### Worker

| Componente       | Arquivo                         | Descrição                                |
| ---------------- | ------------------------------- | ---------------------------------------- |
| **Loop infinito** | `/src/workers/loop.ts`          | setInterval(WORKER_INTERVAL_MS, callEndpoint) |
| **Single-shot**  | `/src/workers/tick.ts`          | Manual trigger (bun run worker:tick)    |

### Helpers

| Helper              | Arquivo                      | Uso                                |
| ------------------- | ----------------------------- | ---------------------------------- |
| **Auth (client)**   | `/src/lib/auth.ts`            | getSessionFromCookie, logout helpers |
| **Auth (server)**   | `/src/lib/auth-server.ts`     | verifyJWT, extractPayload (Jose)  |
| **Zod schemas**     | `/src/lib/zod.ts`             | Validadores reutilizáveis         |

---

## Apêndice B: Checklist de Sincronização

- [x] Tabelas refletem schema.ts real
- [x] Endpoints mapeados contra rotas implementadas
- [x] Páginas listadas em `src/app/`
- [x] Docker variantes documentadas
- [x] Variáveis de ambiente alinhadas com .env.example
- [x] Stack tecnológico atualizado (Tailwind v4, Zod v4, etc.)
- [x] Workers (loop + tick) documentados com intervalo correto (3s)
- [x] Componentes domain listados (transcripts, media editor, etc.)
- [x] Providers e fallback explicados (local, groq, openai)
- [x] Roadmap v0.2-v0.4 preservado
- [x] Personas e métricas preservadas do PRD anterior
- [x] Rigor: nenhuma feature inventada — tudo vem do código

