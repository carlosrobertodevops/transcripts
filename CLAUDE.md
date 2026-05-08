# CLAUDE.md — Transcrições (SaaS de Transcrição de Mídia)

## Visão

SaaS de transcrição automática com dashboard web. Usuários fazem upload de mídia (áudio/vídeo), sistema processa via Groq Whisper Large V3 ou OpenAI Whisper, retorna transcrição editável. Frontend Next.js 16; backend Elysia; banco PostgreSQL 16; workers async para processamento.

## Stack

**Runtime & Build:**

- Bun 1.x (runtime, package manager, executor)
- Node.js 20+ (compatibilidade)

**Frontend:**

- Next.js 16.0 (App Router, React 19, Server Components padrão)
- React 19 (Server Components, async components, form handling)
- Tailwind CSS 4.0 (utility-first, semantic tokens)
- ShadCN/UI new-york (Button, Card, Dialog, Form, Input, Textarea, etc.)
- react-hook-form 7.53.2 (form state)
- @hookform/resolvers (integração com Zod)
- Lucide React 0.460.0 (ícones)
- Sonner 1.7.0 (notificações toast)
- react-dropzone 14.3.5 (upload de arquivos)
- @dnd-kit/core 6.1.0 + @dnd-kit/sortable 8.0.0 (drag-and-drop)

**Backend & API:**

- Elysia 1.1.27 (HTTP API framework)
- Zod 4 (validação de schemas)
- jose 5.9.6 (JWT generation/verification)
- bcryptjs 2.4.3 (password hashing)

**ORM & Database:**

- Drizzle ORM 0.36.4 (schema-first, TypeScript-native)
- postgres 3.4.5 (PostgreSQL 16 driver)
- PostgreSQL 16.0 (database)

**Workers & Jobs:**

- Bun (background job runner via `bun run worker:loop` e `bun run worker:tick`)

**Transcription:**

- Faster-Whisper Local (padrão, gratuito, rodando em container Python)
- Groq Whisper Large V3 (opcional, chave: GROQ_API_KEY)
- OpenAI Whisper (opcional, chave: OPENAI_API_KEY)

**DevOps:**

- Docker 24+
- Docker Compose 2.0+ (3 serviços: db, app, worker)

**Qualidade de Código:**

- TypeScript 5 (strict mode)
- ESLint (lint, via eslint.config.mjs)
- Prettier (code formatting, opcional)

## Estrutura Esperada

```
/Users/carlosroberto/Workspace/Projetos/fullstack/chegii/transcripts/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (marketing)/              # Rotas públicas
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   └── [slug]/page.tsx
│   │   ├── (auth)/                   # Login, register
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   ├── (app)/                    # Rotas protegidas (autenticadas)
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx              # Dashboard
│   │   │   ├── profile/page.tsx
│   │   │   └── transcripts/
│   │   │       ├── page.tsx
│   │   │       ├── [id]/page.tsx
│   │   │       └── new/page.tsx
│   │   ├── api/                      # Route handlers (mount Elysia)
│   │   │   └── [[...routes]]/route.ts
│   │   └── layout.tsx                # Root layout
│   ├── components/
│   │   ├── ui/                       # ShadCN/UI base components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── form.tsx
│   │   │   ├── input.tsx
│   │   │   └── ...
│   │   ├── app/                      # App-specific components
│   │   │   ├── sidebar.tsx
│   │   │   ├── header.tsx
│   │   │   └── ...
│   │   ├── auth/                     # Auth components
│   │   │   ├── login-form.tsx
│   │   │   └── register-form.tsx
│   │   ├── transcripts/              # Transcript CRUD UI
│   │   │   ├── transcript-grid.tsx
│   │   │   ├── transcript-card.tsx
│   │   │   ├── new-transcript-dialog.tsx
│   │   │   ├── upload-dialog.tsx
│   │   │   └── share-dialog.tsx
│   │   ├── marketing/                # Landing page components
│   │   │   ├── hero.tsx
│   │   │   ├── features.tsx
│   │   │   └── ...
│   │   └── providers/                # Client providers
│   │       ├── theme-provider.tsx
│   │       └── sonner.tsx
│   ├── server/
│   │   ├── routes/                   # Elysia route handlers
│   │   │   ├── transcripts.ts
│   │   │   ├── users.ts
│   │   │   ├── auth.ts
│   │   │   ├── media.ts
│   │   │   ├── shares.ts
│   │   │   └── notifications.ts
│   │   ├── plugins/
│   │   │   ├── auth.ts               # JWT middleware
│   │   │   └── cors.ts
│   │   ├── services/                 # Business logic
│   │   │   ├── transcription.ts
│   │   │   ├── storage.ts
│   │   │   ├── jobs.ts
│   │   │   └── ...
│   │   ├── index.ts                  # Elysia app instance
│   │   └── error.ts                  # Error handling
│   ├── db/
│   │   ├── schema.ts                 # Drizzle schema (tables)
│   │   ├── client.ts                 # Drizzle client instance
│   │   └── seed.ts                   # Database seed
│   ├── workers/
│   │   ├── loop.ts                   # Background job loop
│   │   └── tick.ts                   # Single tick processor
│   ├── hooks/                        # React hooks (useToast, etc.)
│   ├── lib/
│   │   ├── utils.ts                  # Client utilities
│   │   ├── api-client.ts             # API client wrapper
│   │   └── zod.ts                    # Zod schemas
│   ├── types/
│   │   └── index.ts
│   └── styles/
│       └── globals.css
├── drizzle/                          # Generated migrations
│   ├── 0001_migration.sql
│   └── meta/
├── public/                           # Static assets
├── docker-compose.yml
├── package.json
├── tsconfig.json
├── next.config.ts
├── drizzle.config.ts
├── .env.example
├── Dockerfile
├── README.md
└── .gitignore
```

## Comandos Essenciais

```bash
# Setup
bun install
bun run db:generate      # Gera migrations Drizzle
bun run db:migrate       # Aplica migrations ao banco local

# Development
bun run dev              # Next.js + Elysia + hot reload (turbopack)

# Build & Run
bun run build
bun start

# Database
bun run db:push          # Drizzle push (dev only)
bun run db:studio        # Drizzle Studio UI
bun run db:seed          # Seed script

# Workers
bun run worker:loop      # Background job loop (infinito)
bun run worker:tick      # Single job processor

# Lint & Format
bun run lint
bun run format           # (Prettier, se configurado)

# Docker
docker compose up --build
docker compose down
```

## Padrões Obrigatórios

### Next.js UI

- **App Router**: use rotas em `src/app/` com group folders `(group-name)`.
- **Server Components padrão**: páginas e layouts são Server Components. Use `"use client"` apenas em componentes com estado, efeitos, listeners de evento ou APIs browser.
- **ShadCN/UI new-york theme**: componentes em `src/components/ui/`, composição completa (CardHeader, CardContent, DialogTitle, etc.).
- **Tailwind semantic tokens**: use `bg-background`, `text-muted-foreground`, `border-border` em lugar de cores hardcoded (herdadas de `globals.css`).
- **Validação de formulários**: react-hook-form + @hookform/resolvers + Zod.

### Elysia API

- **REST routes** em `src/server/routes/`, importadas e registradas em `src/server/index.ts`.
- **Handlers**: validam entrada (Zod), chamam serviço de negócio, retornam HTTP status correto (200, 201, 400, 401, 404, 500).
- **Autenticação centralizada**: middleware JWT em `src/server/plugins/auth.ts`, aplicado globalmente ou por rota.
- **DTOs**: retorne estruturas mapeadas, nunca linhas raw do banco com campos sensíveis.

### Drizzle ORM

- **Schema**: centralizado em `src/db/schema.ts` (tables, relations, indices).
- **Client**: instância em `src/db/client.ts`, exportada para uso em serviços.
- **Migrations**: geradas por `bunx drizzle-kit generate` → `drizzle/` e aplicadas por `bunx drizzle-kit migrate`.
- **Transações**: use `db.transaction()` quando alterar múltiplas tabelas atomicamente.
- **Tipos gerados**: `drizzle-orm/sqlite` ou `drizzle-orm/postgres` para IntelliSense.

### Validação & Tipos

- **Zod 4**: schemas em `src/lib/zod.ts` para request bodies, query params, responses.
- **TypeScript strict**: `tsconfig.json` com strict mode, noImplicitAny, etc.
- **InferInsertModel/InferSelectModel**: use do Drizzle para tipos correspondentes a tabelas.

### Git & Commits

- **Conventional Commits**: `feat: X`, `fix: Y`, `docs: Z`, `refactor: ...`.
- **Sem commits sem permissão explícita**: nunca commitar sem aprovação do user.
- **Branches**: `main` (produção), `develop` (staging), feature branches `feat/X`.

### Docker

- **3 serviços**: `db` (PostgreSQL 16 com volume persistente), `app` (Next.js 3000), `worker` (background jobs).
- **Variáveis de ambiente**: via `.env` (NUNCA hardcode secrets).
- **Healthchecks**: `db` service com verificação TCP port 5432.

## Variáveis de Ambiente

```bash
# Database
DATABASE_URL=postgresql://postgres:password@db:5432/transcripts

# Auth
JWT_SECRET=<random-secret-min-32-chars>
JWT_REFRESH_SECRET=<random-secret-min-32-chars>

# Internal API
INTERNAL_API_KEY=<random-key>

# Transcription (escolha um ou ambos)
TRANSCRIPTION_PROVIDER=groq              # ou 'openai'
GROQ_API_KEY=<groq-key>
OPENAI_API_KEY=<openai-key>

# Storage & App
STORAGE_DIR=/uploads                    # Volume docker
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development                    # ou 'production'
```

## Workflow Git

1. Criar feature branch: `git checkout -b feat/transcript-editor`
2. Fazer commits com Conventional Commits: `git commit -m "feat: add transcript editor"`
3. Push para remoto: `git push -u origin feat/transcript-editor`
4. **Nunca commitar sem permissão explícita do user.**
5. Merge via PR após review (no clone local, apenas com aprovação).

## graphify

This project has a graphify knowledge graph at graphify-out/.

Rules:

- Before answering architecture or codebase questions, read graphify-out/GRAPH_REPORT.md for god nodes and community structure
- If graphify-out/wiki/index.md exists, navigate it instead of reading raw files
- After modifying code files in this session, run `graphify update .` to keep the graph current (AST-only, no API cost)

## Context Mode

Ativar automaticamente ao iniciar Claude:

```bash
# Em ~/.claude/CLAUDE.md ou localmente
- Ativar context-mode MCP
- Ativar caveman skill
```

Benefícios: context window otimizado, conhecimento base persistente, buscas eficientes.

## MCPs

- **Context7**: Use para documentação atual de bibliotecas (React, Next.js, Drizzle, Zod, Tailwind, etc.). Comando: `npx ctx7@latest library <name> "<question>"` → `npx ctx7@latest docs <id> "<question>"`.
- **Figma MCP**: (opcional) Para designs em Figma quando houver.
- **code-review-graph**: (opcional) Para análise de impacto de mudanças.
