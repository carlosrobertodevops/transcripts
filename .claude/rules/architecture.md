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

- Crie rotas REST com Elysia em `src/server/routes/*`. Registre em `src/server/index.ts` com `.use()`.
- Handlers validam entrada via Zod, chamam services em `src/server/services/*`, retornam status HTTP correto.
- Não coloque lógica de negócio complexa no handler — extraia para services.
- Use Zod 4 para validar body, params, query e response schemas quando aplicável.
- Rotas protegidas usam macros `requireAuth` / `requireAdmin` do plugin `src/server/plugins/auth.ts`.
- Prefix padrão: `/api` (montado via catch-all Next `src/app/api/[...path]/route.ts` → `app.handle(req)`).
- Retorne DTOs, nunca rows brutas do banco com campos sensíveis.

## Drizzle ORM

- Schema em `src/db/schema.ts` (tipos, enums, relações via `relations()`).
- Client em `src/db/client.ts` (export `db` singleton).
- Migrations geradas por `bun run db:generate` (Drizzle introspection), aplicadas por `bun run db:migrate`.
- Para dev: `bun run db:push` sincroniza schema sem migration; `bun run db:studio` abre UI.
- Nunca retorne rows brutas do banco pela API com campos sensíveis — mapeie para DTOs.
- Use `db.transaction()` quando regra altera múltiplas tabelas de forma atômica.
- Exemplo de claim atômico: `UPDATE transcription_jobs SET status='processing' WHERE id=? AND status='pending' RETURNING id` previne corrida entre workers.

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

## Export & Print

- Serviço `src/server/services/export.ts` produz `txt | html | doc | docx` via lib `docx`.
- Endpoint `GET /api/transcripts/:id/export?format=…` retorna arquivo baixável.
- Rota Next `/(app)/transcripts/[id]/print` renderiza versão otimizada para impressão (page + print-view + layout).
- Todos os formatos incluem SHA-256 (`media.hash`) de cada mídia como metadado no documento.
- `dedupeSegments()` em export.ts defende contra dados legados duplicados.

## Permissions & Roles

- Hierarquia: `super_admin > admin > pro (label "Editor") > viewer`.
- **Mesmo tier**: view-only. **Tier inferior**: CRUD completo. **Tier superior**: bloqueado.
- `viewer`: read-only (próprio + shares via token).
- Helpers em `src/lib/permissions.ts`: `canViewTranscript()`, `canEditTranscript()`, `canDeleteTranscript()`, `canCreateTranscript()`, `visibleOwnerRoles()`, `roleRank()`.
- **Super Admin privilégio especial em `canDeleteTranscript`**: pode apagar transcrição de qualquer usuário, inclusive de outro super_admin. Uso: moderação/cleanup. View/Edit mantêm regra padrão (`rank > owner.rank`).
- UI hook: `useActorRole()` em `src/lib/use-actor-role.ts`. Aplicar checagens em `routes/transcripts.ts`, `routes/media.ts`, `routes/shares.ts`.

## Worker

- `src/workers/loop.ts` faz `setInterval(WORKER_INTERVAL_MS, …)`. Padrão `3000` (3s).
- Tick chama `POST /api/jobs/run` com header `x-internal-key: $INTERNAL_API_KEY`.
- `runPendingJobs` em `src/server/services/jobs.ts` processa até `limit` jobs (padrão 3, máx 5). FFmpeg pré-processa vídeo → MP3 16kHz mono. Provider escolhido por `getProvider()`. Retry até 3x antes de marcar `failed`.
- **Claim atômico**: `UPDATE transcription_jobs SET status='processing' … WHERE id=? AND status='pending' RETURNING id` garante que apenas um worker pega cada job (sem corrida em múltiplas instâncias).
- **Idempotência de retry**: antes de inserir segmentos, `DELETE FROM transcript_segments WHERE media_id=?` previne duplicatas.
