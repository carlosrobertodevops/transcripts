## Git

- **SEMPRE** use Conventional Commits. Exemplo: `feat: add workout session endpoint`, `fix: workout validation`, `docs: update stack rules`.
- **NUNCA** faca commit sem permissao explicita do usuario.

## Next.js UI

- Use App Router (Next.js 16).
- Componentes base em `src/components/ui` (ShadCN/UI new-york). Estilize com Tailwind v4.
- Sem links Figma para este projeto. Caso surjam mockups, anexar nesta seção.
- Server Components por padrao; use `"use client"` apenas quando houver estado, efeitos, eventos ou APIs do browser.
- Use ShadCN/UI para componentes de base e Tailwind CSS para layout.
- Componentes ShadCN devem usar composicao completa (`CardHeader`, `CardContent`, `DialogTitle`, etc.).
- Prefira tokens semanticos (`bg-background`, `text-muted-foreground`, `bg-primary`) a cores hardcoded.

## Elysia API

- Crie rotas REST com Elysia em `src/server/`.
- Handlers validam entrada, chamam camada de negócio e retornam HTTP status correto.
- Não coloque regra de negócio complexa diretamente no handler.
- Use Zod 4 para validar body, params, query e responses quando aplicável.
- Rotas protegidas devem centralizar autenticação em middleware/plugin.

## Drizzle ORM

- Schema do banco deve ficar em `src/db/schema.ts` ou arquivos dentro de `src/db/schema/`.
- Client Drizzle deve ficar em `src/db/client.ts` ou `src/db/index.ts`.
- Migrations devem ser geradas por `bunx drizzle-kit generate` e aplicadas por `bunx drizzle-kit migrate`.
- Não retorne linhas do banco diretamente pela API quando houver campos sensíveis ou formato público diferente; mapeie para DTO.
- Use transações Drizzle quando uma regra alterar múltiplas tabelas de forma atômica.

## JWT

- Tokens assinados com payload `{ sub: user.id }`.
- Sempre ler `payload.sub` para identificar usuário, **nunca** `payload.id`.
- Middleware centralizado em `src/server/plugins/auth.ts` verifica e extrai JWT do header `Authorization: Bearer <token>`.
- Refresco automático: cliente usa `refresh_token` para obter novo access token antes de expiração.

## Animations

- Usar lib `motion` (Framer Motion) para transições de página.
- Layout app em `src/app/(app)/layout.tsx` envolve `children` em `<AnimatePresence mode="wait">`.
- Keyar `AnimatePresence` pelo pathname para animar saída/entrada de páginas.
- Fade + slide-up 200ms ease-out padrão para page transitions.

## Notifications

- Bell icon em header polling GET `/api/notifications` a cada 30s.
- Response: `{ id, userId, type, message, read, createdAt }`.
- Marcar lida: PATCH `/api/notifications/:id` com `{ read: true }`.
- Usar Sonner toast para UI feedback imediato.

## Shares Routes

- Nested REST: `/api/transcripts/:id/shares`.
- GET `/api/transcripts/:id/shares` lista shares do transcript.
- POST `/api/transcripts/:id/shares` cria nova share (gera token único).
- PATCH `/api/transcripts/:id/shares/:shareId` atualiza (permissões, expiry).
- DELETE `/api/transcripts/:id/shares/:shareId` revoga acesso.

## Docker

- 4 variantes de compose: `docker-compose.yml` (padrão), `docker-compose.local.yml` (dev), `docker-compose-easypanel.yml`, `docker-compose-coolify.yml`.
- Serviços principais: `db` (postgres:16-alpine, volume persistente), `migrate` (one-shot Drizzle), `transcriber` (python:3.12-slim, :8000, whisper_cache), `app` (Next + Elysia, :3000, uploads volume), `worker` (loop). Dev adiciona `pgadmin` :5050.
- Healthcheck chain: `db` → `migrate` → `transcriber` → `app` → `worker`.
- Variáveis em `.env`/`.env.coolify`/`.env.easypanel`; secrets nunca commitados.
- Coolify usa `expose` (não `ports`) e variáveis `SERVICE_FQDN_APP`, `SERVICE_USER_POSTGRES`, `SERVICE_BASE64_64_*` autogeradas.

## Worker

- `src/workers/loop.ts` faz `setInterval(WORKER_INTERVAL_MS, …)`. Padrão `3000` (3s). Anteriormente documentado como 15s — corrigido.
- Tick chama `POST /api/jobs/run` com header `x-internal-key: $INTERNAL_API_KEY`.
- `runPendingJobs` em `src/server/services/jobs.ts` processa até `limit` jobs (padrão 3). FFmpeg pré-processa vídeo → MP3 16kHz mono. Provider escolhido por `getProvider()`. Retry até 3x antes de marcar `failed`.
