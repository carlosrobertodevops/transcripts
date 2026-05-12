# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Visão Geral

SaaS de transcrição de mídia (áudio/vídeo) com dashboard web. Upload → fila assíncrona → provider Whisper (local Faster-Whisper, Groq, ou OpenAI) → transcrição editável com segmentos.

Responda em **português do Brasil**, objetivo, sem floreios.

## Arquitetura

Quatro processos, um repositório:

1. **Next.js 16 (App Router)** em `src/app/` — UI + monta a API.
2. **Elysia HTTP** em `src/server/index.ts` (prefix `/api`) — montada dentro do Next via catch-all `src/app/api/[...path]/route.ts`. Toda rota Next `/api/*` cai em `app.handle(req)`.
3. **PostgreSQL 16** via Drizzle ORM. Schema em `src/db/schema.ts`. Client em `src/db/client.ts`.
4. **Worker Bun** em `src/workers/loop.ts` — chama `POST /api/jobs/run` com header `x-internal-key` a cada `WORKER_INTERVAL_MS` (padrão `3000`). Endpoint roda `runPendingJobs(limit)` em `src/server/services/jobs.ts` (limit padrão 3, aceita até 5).
5. **Transcriber Python** em `transcriber/` (FastAPI + faster-whisper) — container separado em `:8000`, usado quando `TRANSCRIPTION_PROVIDER=local` via `TRANSCRIBER_URL`.

Fluxo de transcrição: upload mídia → cria `media` + `transcription_jobs` (status=`pending`) → worker tick → `runPendingJobs` marca `processing`, lê arquivo de `STORAGE_DIR`, chama provider (`getProvider()` em `services/transcription.ts`), grava `transcript_segments`, status `done`/`failed`, cria `notifications`.

### Tabelas (`src/db/schema.ts`)

`users` · `transcripts` · `media` · `transcription_jobs` · `transcript_segments` · `notifications`.

### Auth

JWT via `jose`. Plugin em `src/server/plugins/auth.ts` faz `.derive` lendo cookie de sessão (`getSessionFromCookie`), expõe `user: Session | null`. Macros `requireAuth` / `requireAdmin` aplicam em rotas. Payload usa `sub` para id (nunca `id`). Helpers: `src/lib/auth.ts` (cliente) e `src/lib/auth-server.ts`.

### Worker contract

`src/workers/loop.ts` é stateless — autenticação só por `INTERNAL_API_KEY`. Um endpoint, sem fila externa. Para processar manualmente: `bun run worker:tick` (single-shot, exit code).

## Comandos

```bash
bun install
bun run dev              # Next.js + Elysia turbopack
bun run build && bun start
bun run lint             # next lint (eslint-config-next)

# DB (Drizzle)
bun run db:generate      # drizzle-kit generate → drizzle/
bun run db:migrate       # aplicar migrations
bun run db:push          # dev: sync schema sem migration
bun run db:studio
bun run db:seed          # bun run src/db/seed.ts

# Workers
bun run worker:loop      # loop infinito (WORKER_INTERVAL_MS, padrão 3s)
bun run worker:tick      # single tick

# Docker — 4 variantes de compose
docker compose up --build                                      # prod padrão
docker compose -f docker-compose.local.yml up --build           # dev local
docker compose -f docker-compose-easypanel.yml up --build       # Easypanel
docker compose -f docker-compose-coolify.yml up --build         # Coolify VPS
# Serviços: db (postgres:16-alpine), migrate (one-shot Drizzle),
# transcriber (python:3.12-slim :8000), app (:3000), worker, pgadmin (dev :5050)
```

Sem suite de testes configurada. Não há comando `test`.

## Variáveis (.env.example)

```
# DB
DATABASE_URL=postgres://transcripts:transcripts@localhost:5432/transcripts
POSTGRES_USER=transcripts POSTGRES_PASSWORD=transcripts POSTGRES_DB=transcripts

# Auth
JWT_SECRET= JWT_REFRESH_SECRET= INTERNAL_API_KEY=

# App
NODE_ENV=development PORT=3000 HOSTNAME=0.0.0.0
NEXT_PUBLIC_APP_URL=http://localhost:3000
APP_URL=http://app:3000

# Transcrição
TRANSCRIPTION_PROVIDER=local              # local | groq | openai
TRANSCRIPTION_PROVIDER_FALLBACK=          # opcional
TRANSCRIBER_URL=http://transcriber:8000
TRANSCRIBER_TIMEOUT_MS=60000
GROQ_API_KEY= OPENAI_API_KEY=

# Whisper (provider=local)
WHISPER_MODEL=base                        # tiny | base | small | medium | large-v3
WHISPER_COMPUTE_TYPE=int8                 # int8 | float32
WHISPER_DEVICE=cpu                        # cpu | cuda
WHISPER_BEAM_SIZE=3 WHISPER_NUM_WORKERS=1 WHISPER_VAD_FILTER=true

# Worker + storage
WORKER_INTERVAL_MS=3000
STORAGE_DIR=./uploads
LOG_LEVEL=INFO
```

Para Coolify, ver `.env.coolify` e `docs/COOLIFY_DEPLOY.md` — usa `SERVICE_FQDN_APP`, `SERVICE_USER_POSTGRES`, `SERVICE_PASSWORD_POSTGRES`, `SERVICE_BASE64_64_*` autogerados.

## Convenções

- **Rotas Next**: groups `(auth)` e `(app)`. Root `/` redireciona: anônimo → `/login`, autenticado → `/dashboard`.
- **Server Components** default. `"use client"` só com estado/efeito/event/browser API.
- **Auth split layout**: 2/3 visual + 1/3 form em desktop (≥md); 100% form mobile.
- **ShadCN/UI new-york theme** em `src/components/ui/` — composição completa (`CardHeader`/`CardContent`, etc.). Não sobrescrever classes core.
- **Tailwind v4** com tokens semânticos (`bg-background`, `text-muted-foreground`, `border-border`). Proibido cores hardcoded.
- **Forms**: react-hook-form + `@hookform/resolvers/zod` + Zod 4 (schemas em `src/lib/zod.ts`).
- **Drizzle**: schema único em `src/db/schema.ts`. Use `db.transaction()` quando alterar múltiplas tabelas atômicamente. Nunca retorne row crua com campos sensíveis pela API — mapeie DTO.
- **Elysia routes** em `src/server/routes/*` registradas em `src/server/index.ts`. Lógica em `src/server/services/*`.
- **Page transitions**: `motion` (framer-motion) `AnimatePresence mode="wait"` keyado por `pathname` em `src/components/providers/page-transition.tsx`.
- **Notifications**: bell polling `/api/notifications` 30s; toast Sonner para feedback imediato.
- **Shares nested REST**: `/api/transcripts/:id/shares[/:shareId]`.
- **Theme**: dark default via `next-themes`.
- **Datas**: `dayjs` locale pt-BR.

## Git

Conventional Commits obrigatório (`feat:`, `fix:`, `docs:`, `refactor:`). **Nunca** commitar sem aprovação explícita do usuário.

## graphify

Knowledge graph em `graphify-out/`. Antes de responder questões de arquitetura, leia `graphify-out/GRAPH_REPORT.md` (god nodes, comunidades). Se `graphify-out/wiki/index.md` existir, navegue por ele em vez de ler arquivos crus. Após modificar código nesta sessão, rode `graphify update .` (AST-only, sem custo de API).

## MCPs

- **Context7** para docs de libs (Next.js, Drizzle, Zod, Tailwind, Elysia, etc.) — preferir sobre web search.
- **context-mode** para outputs grandes — usar `ctx_execute_file` em vez de `Bash cat/head/grep` quando saída pode passar 20 linhas.

## Docs do projeto

`docs/PRD.md`, `docs/SPEC.md`, `docs/SDD.md`, `docs/DESIGN.md` — fonte adicional de decisões. Consultar antes de mudanças estruturais.
