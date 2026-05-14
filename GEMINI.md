# GEMINI.md

Guia rápido para Gemini / agentes assistentes neste repositório. Responda sempre em **português do Brasil**, objetivo e sem floreios.

## Visão geral

SaaS de transcrição de mídia (áudio/vídeo) em PT-BR. Upload → fila assíncrona → provider Whisper (local Faster-Whisper, Groq ou OpenAI) → transcrição editável com segmentos, compartilhamento e exportação (txt/html/doc/docx).

## Stack canônica

- **Runtime**: Bun (package manager, executor, worker).
- **Frontend**: Next.js 16 App Router + React 19 + TypeScript.
- **UI**: Tailwind v4 + ShadCN/UI (new-york) + Framer Motion + Lucide + Sonner. Editor rich-text via TipTap.
- **API**: Elysia 1.1.x sob prefixo `/api`, montada no Next via catch-all `src/app/api/[...path]/route.ts`.
- **ORM**: Drizzle 0.36.x sobre PostgreSQL 16. Schema único em `src/db/schema.ts`.
- **Validação**: Zod v4 (`src/lib/zod.ts`).
- **Auth**: JWT (jose), payload `{ sub }`, cookie httpOnly samesite=lax.
- **Transcrição local**: container Python 3.12 + FastAPI + faster-whisper em `transcriber/` (porta 8000).
- **Worker**: `src/workers/loop.ts` chama `POST /api/jobs/run` a cada `WORKER_INTERVAL_MS` (padrão 3000ms).
- **Export**: serviço `src/server/services/export.ts` (txt, html, doc, docx via `docx`).
- **Dedup/integridade**: `media.hash` SHA-256 calculado no upload (migração `0008_add_media_hash.sql`).

## Regras

- Antes de responder questões de arquitetura ou codebase, leia `graphify-out/GRAPH_REPORT.md` (god nodes + comunidades).
- Se `graphify-out/wiki/index.md` existir, navegue por ele em vez de ler arquivos crus.
- Após modificar código nesta sessão, rode `graphify update .` (AST-only, sem custo de API).
- Conventional Commits obrigatório. **Nunca** commitar sem aprovação explícita do usuário.
- Server Components por padrão; `"use client"` apenas com estado/efeito/event/browser API.
- Use tokens semânticos Tailwind (`bg-background`, `text-muted-foreground`, `border-border`). Sem cores hardcoded.
- Tabelas Drizzle: `users`, `transcripts`, `media` (com `hash`), `transcription_jobs`, `transcript_segments`, `notifications`, `tags`, `shares`.
- Rotas Elysia registradas em `src/server/index.ts` (auth, transcripts, media, shares, notifications, users, jobs, tags, health).

## Comandos essenciais

```bash
bun install
bun run dev              # Next + Elysia turbopack
bun run typecheck        # tsc --noEmit
bun run lint
bun run db:generate && bun run db:migrate
bun run worker:loop      # loop infinito (3s)
bun run worker:tick      # single-shot
bun run deploy           # bun --env-file=.env.deploy.local scripts/deploy-easypanel.ts
bun run src/scripts/backfill-media-hash.ts   # backfill SHA-256 em media legadas
```

## Docs canônicas

`docs/PRD.md`, `docs/SPEC.md`, `docs/SDD.md`, `docs/DESIGN.md`. Consultar antes de mudanças estruturais.
