# Regras Gerais

## Stack

- Bun como runtime, package manager e executor.
- Next.js com App Router para UI.
- Elysia para API HTTP.
- Drizzle ORM com PostgreSQL.
- Zod 4 para validação.
- Docker Compose com `app` e `db`.
- Tailwind CSS e ShadCN/UI na interface.

## Comandos

```bash
bun install
bun run dev              # Next.js + Elysia turbopack
bun run build && bun start
bun run lint             # next lint (eslint-config-next)
bun run typecheck        # tsc --noEmit
bun run format           # prettier --write .
bun run format:check

# DB (Drizzle)
bun run db:generate      # drizzle-kit generate
bun run db:migrate       # aplicar migrations
bun run db:push          # dev: sync schema sem migration
bun run db:studio        # UI Drizzle Studio
bun run db:seed          # bun run src/db/seed.ts

# Workers
bun run worker:loop      # loop infinito (WORKER_INTERVAL_MS, padrão 3s)
bun run worker:tick      # single-shot

# Deploy
bun run deploy           # deploy Easypanel
bun run deploy:push      # git push && deploy

# Compose variants
docker compose up --build                                      # prod padrão
docker compose -f docker-compose.local.yml up --build           # dev local + pgadmin
docker compose -f docker-compose-easypanel.yml up --build       # Easypanel
docker compose -f docker-compose-coolify.yml up --build         # Coolify VPS
```

## Estrutura Esperada

- `src/app/` rotas, layouts, páginas Next.js (App Router 16).
- `src/components/ui/` ShadCN new-york.
- `src/server/` API Elysia (index, routes, services, plugins).
- `src/db/` schema Drizzle + client + seed.
- `src/workers/` loop + tick.
- `transcriber/` FastAPI + faster-whisper (Python 3.12).
- `drizzle/` migrations geradas.
- `docker-compose*.yml` variantes de ambiente (padrão, local, easypanel, coolify).

## MCPs

- Use Context7 para documentação atual de bibliotecas, frameworks, SDKs, APIs e CLIs.
