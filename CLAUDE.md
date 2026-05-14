# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Atentions

- Don't over-explain, over-engineer, or add unrequested improvements.
- When making widespread changes to a file, use one "Write" instead of many
  sequential `Edit` calls. Speed matters.

Don't fetch well-known websites (Apple, Google, Stripe, etc.) for design/
API inspiration if you already know the patterns. Just start working.

## Interaction Rules

"Again" or "re-run" means repeat the same workflow with the same approach, never rebuild from scratch.
For tasks >3 steps involving an external API or tool, outline your plan
in 3-5 bullets and wait for approval before executing.
Only make the specific edits requested. Never add face swaps, composite
changes, extra refactors, or modifications that weren't asked for.

- When iterating on creative work (thumbnails, designs, copy),
  change only what the user asked to change. Preserve everything else exactly.

## Browser Automation

Never focus/foreground browser tabs or windows during automation. Run
browser tasks in the background.

If Chrome MCP tools fail twice, stop retrying. Fall back to WebFetch/
WebSearch or ask the user.

Before browser-heavy sessions, kill stale Chrome processes and clear temp
profiles if MCP is unresponsive.

## Visão Geral

SaaS de transcrição de mídia (áudio/vídeo) com dashboard web. Upload → fila assíncrona → provider Whisper (local Faster-Whisper, Groq, ou OpenAI) → transcrição editável com segmentos. Suporta exportação em múltiplos formatos (txt, html, doc, docx) com hash SHA-256 das mídias.

Responda em **português do Brasil**, objetivo, sem floreios.

## Arquitetura

Cinco processos, um repositório:

1. **Next.js 16 (App Router)** em `src/app/` — UI (Server Components por padrão) + monta a API.
2. **Elysia HTTP** em `src/server/index.ts` (prefix `/api`) — montada dentro do Next via catch-all `src/app/api/[...path]/route.ts`. Toda rota Next `/api/*` cai em `app.handle(req)`.
3. **PostgreSQL 16** via Drizzle ORM. Schema em `src/db/schema.ts`. Client em `src/db/client.ts`. Migrations em `drizzle/`.
4. **Worker Bun** em `src/workers/loop.ts` — chama `POST /api/jobs/run` com header `x-internal-key` a cada `WORKER_INTERVAL_MS` (padrão `3000`). Endpoint roda `runPendingJobs(limit)` em `src/server/services/jobs.ts` (limit padrão 3, aceita até 5).
5. **Transcriber Python** em `transcriber/` (FastAPI + faster-whisper) — container separado em `:8000`, usado quando `TRANSCRIPTION_PROVIDER=local` via `TRANSCRIBER_URL`.

**Fluxo de transcrição:** upload mídia → cria `media` + `transcription_jobs` (status=`pending`) → worker tick → `runPendingJobs` marca `processing`, lê arquivo de `STORAGE_DIR`, chama provider (`getProvider()` em `services/transcription.ts`), grava `transcript_segments`, status `done`/`failed`, cria `notifications`.

### Tabelas (`src/db/schema.ts`)

`users` · `transcripts` · `media` (com `hash` SHA-256, migração `drizzle/0008_add_media_hash.sql`) · `transcription_jobs` · `transcript_segments` · `notifications`.

Enums: `user_role` (estendido em `drizzle/0007_expand_user_roles.sql`), `transcript_status`, `job_status`.

### Export / Print

- Serviço `src/server/services/export.ts` produz `txt | html | doc | docx` (lib `docx`). Inclui SHA-256 de cada mídia como campo no documento exportado.
- Endpoint `GET /api/transcripts/:id/export?format=…`.
- Rota Next `/(app)/transcripts/[id]/print` (`page.tsx` + `print-view.tsx` + `layout.tsx`) renderiza versão otimizada para impressão.

### Admin

- Página `src/app/(app)/admin/users/page.tsx` lista/gerencia usuários (gated por `requireAdmin`).
- Endpoints admin sob `src/server/routes/users.ts` (CRUD além de `GET /me`, `DELETE /me`).

### Auth

JWT via `jose`. Plugin em `src/server/plugins/auth.ts` faz `.derive` lendo cookie de sessão (`getSessionFromCookie`), expõe `user: Session | null`. Macros `requireAuth` / `requireAdmin` aplicam em rotas. Payload usa `sub` para id (nunca `id`). Helpers: `src/lib/auth.ts` (cliente) e `src/lib/auth-server.ts`.

### Worker Contract

`src/workers/loop.ts` é stateless — autenticação só por `INTERNAL_API_KEY`. Um endpoint, sem fila externa. Para processar manualmente: `bun run worker:tick` (single-shot, exit code 0/1).

**Claim atômico e retry idempotente** em `runPendingJobs` (`src/server/services/jobs.ts`):

- `UPDATE transcription_jobs SET status='processing' … WHERE id=? AND status='pending' RETURNING id` garante que apenas um worker pega cada job (sem corrida em múltiplas instâncias).
- Antes de inserir segmentos, `DELETE FROM transcript_segments WHERE media_id=?` para que retries não acumulem duplicatas (`(startMs, endMs, text)` repetidos).
- Em export, `dedupeSegments()` em `services/export.ts` defende contra dados legados duplicados.

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
bun run worker:loop      # loop infinito (WORKER_INTERVAL_MS, padrão 3000ms)
bun run worker:tick      # single tick, exit code 0/1

# Tipos / formato
bun run typecheck        # tsc --noEmit
bun run format           # prettier --write .
bun run format:check

# Deploy (Easypanel)
bun run deploy           # bun --env-file=.env.deploy.local scripts/deploy-easypanel.ts
bun run deploy:push      # git push && bun run deploy

# Scripts utilitários
bun run src/scripts/backfill-media-hash.ts   # backfill SHA-256 em media legadas
bun run src/scripts/dedupe-segments.ts       # limpa segmentos duplicados (legacy, pré atomic-claim)

# Docker — 4 variantes de compose
docker compose up --build                                      # prod padrão
docker compose -f docker-compose.local.yml up --build           # dev local + pgadmin
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
- **Rich text**: TipTap (`@tiptap/react` + `starter-kit` + `extension-link`) para `analysis` e `transcriptHtml`.
- **Drag-and-drop**: `@dnd-kit/*` em `transcript-grid` (reorder `transcripts.position`).
- **Export docs**: `docx` lib para gerar `.docx`/`.doc`; HTML/TXT montados via `buildHtml()` (god node em graphify).
- **Hash de mídia**: `media.hash` SHA-256 calculado em `src/server/services/storage.ts` ao salvar; backfill via `src/scripts/backfill-media-hash.ts`. Hash aparece em todos os formatos exportados.
- **Permissões por role (T6)**: hierarquia `super_admin > admin > pro (label "Editor") > viewer`. Mesmo tier: view-only. Tier inferior: CRUD completo. Tier superior: bloqueado. Viewer: read-only (próprio + shares). Helpers em `src/lib/permissions.ts`: `canViewTranscript`, `canEditTranscript`, `canDeleteTranscript`, `canCreateTranscript`, `visibleOwnerRoles`, `roleRank`. Aplicados em `routes/transcripts.ts`, `routes/media.ts`, `routes/shares.ts`. UI usa hook `useActorRole` (`src/lib/use-actor-role.ts`).

## Git

Conventional Commits obrigatório (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`). **Nunca** commitar sem aprovação explícita do usuário.

## graphify

Knowledge graph em `graphify-out/`. Antes de responder questões de arquitetura, leia `graphify-out/GRAPH_REPORT.md` (god nodes, comunidades). Se `graphify-out/wiki/index.md` existir, navegue por ele em vez de ler arquivos crus. Após modificar código nesta sessão, rode `graphify update .` (AST-only, sem custo de API).

## MCPs

- **Context7** para docs de libs (Next.js, Drizzle, Zod, Tailwind, Elysia, etc.) — preferir sobre web search.
- **context-mode** para outputs grandes — usar `ctx_execute_file` em vez de `Bash cat/head/grep` quando saída pode passar 20 linhas.

## Docs do projeto

`docs/PRD.md`, `docs/SPEC.md`, `docs/SDD.md`, `docs/DESIGN.md` — fonte adicional de decisões. Consultar antes de mudanças estruturais.
