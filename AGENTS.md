# AGENTS.md

## graphify

This project has a graphify knowledge graph at graphify-out/.

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

**Rules:**

- Before answering architecture or codebase questions, read graphify-out/GRAPH_REPORT.md for god nodes and community structure
- If graphify-out/wiki/index.md exists, navigate it instead of reading raw files
- After modifying code files in this session, run `graphify update .` to keep the graph current (AST-only, no API cost)

---

## Catálogo de Agentes

| Agent | Propósito | Triggers | Escopo | Modelo |
|-------|-----------|----------|--------|--------|
| `worker-loop-agent` | Orquestrar ticks periódicos e invocar job runner para processar transcrições | Timer `WORKER_INTERVAL_MS` (padrão 3000ms) | READ-ONLY jobs/transcription logic | N/A (Bun service) |
| `job-runner-agent` | Executar lote de jobs pendentes (pending → processing → done/failed) | POST /api/jobs/run | READ-WRITE DB (transcriptions, media) | N/A (Elysia route) |
| `export-agent` | Gerar export de transcrição em `txt | html | doc | docx` incluindo SHA-256 das mídias | GET /api/transcripts/:id/export?format=… | READ-ONLY DB; serializa via `src/server/services/export.ts` (lib `docx`) | N/A (Elysia route + service) |
| `media-hash-agent` | Calcular SHA-256 de uploads e persistir em `media.hash`; backfill para mídias legadas | Upload em `POST /transcripts/:id/media` (síncrono) ou `bun run src/scripts/backfill-media-hash.ts` (batch) | WRITE `media.hash`; READ filesystem (`STORAGE_DIR`) | N/A (service + script Bun) |
| `project-docs-synchronizer` | Sincronizar CLAUDE.md, AGENTS.md, PRD.md, SDD.md, SPEC.md, DESIGN.md e .claude/rules/*.md com codebase real. Revisa código e detecta divergências. | Manual (invocação direta ou pós-merge). Usar quando stack/padrões mudarem ou antes de release | READ-ONLY código + graphify. WRITE-ONLY docs/rules | Claude Sonnet 4.5 (qualidade máxima) |

---

## Detalhes dos Agentes

### worker-loop-agent

**Propósito:** Orquestrar ticks periódicos e invocar job runner para processar transcrições assincronamente.

**Triggers:**

- `setInterval(WORKER_INTERVAL_MS, …)` em `src/workers/loop.ts` (padrão 3000ms, configurável via env)
- Executável manual via `bun run worker:loop` (loop infinito) ou `bun run worker:tick` (single tick, exit code 0/1)

**Escopo:**

- Lê configurações de worker (timeout, retry logic)
- Chama `POST /api/jobs/run` com header `x-internal-key`
- Stateless — sem persistência de fila externa
- Responsável apenas por gatilhar, não processar

**Modelo:** Bun service (não Claude — execution nativa)

**Código:** `src/workers/loop.ts`

---

### job-runner-agent

**Propósito:** Processar lote de jobs pendentes, transitando-os de pending → processing → done/failed.

**Triggers:**

- `POST /api/jobs/run` (endpoint Elysia em `src/server/routes/jobs.ts`)
- Requer header `x-internal-key` para autenticação interna
- Invocado por worker-loop-agent a cada `WORKER_INTERVAL_MS` (padrão 3000ms)
- Processa até `limit` jobs por chamada (padrão 3, máx 5)

**Escopo:**

- Lê transcrições com status `pending` de `transcription_jobs`
- Para cada job: marca `processing`, lê arquivo de `STORAGE_DIR`, chama provider (Groq/OpenAI/local Faster-Whisper), grava `transcript_segments`, marca `done` ou `failed`
- Cria notificações ao término
- Transação Drizzle para atomicidade

**Modelo:** Elysia route handler (não Claude — execution nativa)

**Código:** `src/server/routes/jobs.ts` + `src/server/services/jobs.ts`

---

### export-agent

**Propósito:** Gerar exportação de transcrição em múltiplos formatos (txt, html, doc, docx) com SHA-256 das mídias incluído.

**Triggers:**

- `GET /api/transcripts/:id/export?format=txt|html|doc|docx` (endpoint Elysia)
- Invocado pelo frontend ao clicar "Download" ou imprimir

**Escopo:**

- Lê `transcripts` + `transcript_segments` + `media.hash` do banco
- Serializa via `buildHtml()` (god node), depois converte para formato requisitado
- `docx` lib para gerar `.docx`/`.doc`
- HTML/TXT montados via string builders
- Retorna blob com `Content-Disposition: attachment`

**Modelo:** Elysia route handler (não Claude — execution nativa)

**Código:** `src/server/routes/transcripts.ts` + `src/server/services/export.ts`

---

### media-hash-agent

**Propósito:** Calcular e persistir SHA-256 hash de upload de mídia; suporta backfill para mídia legada.

**Triggers:**

- Upload síncrono em `POST /api/transcripts/:id/media` (ao salvar arquivo em `STORAGE_DIR`)
- Batch via `bun run src/scripts/backfill-media-hash.ts` (legacy)

**Escopo:**

- Lê arquivo do disco (`STORAGE_DIR`)
- Calcula SHA-256 (lib nativa `crypto`)
- Escreve em `media.hash`
- Idempotente: calcula hash mesmo se já existe, compara

**Modelo:** Service + script Bun (não Claude — execution nativa)

**Código:** `src/server/services/storage.ts` + `src/scripts/backfill-media-hash.ts`

---

### project-docs-synchronizer

**Propósito:** Revisar código real + sincronizar documentação canônica (CLAUDE.md, AGENTS.md, PRD.md, SDD.md, SPEC.md, DESIGN.md) e rules (.claude/rules/*.md) com estado atual do repositório. Detecta divergências e gera Resumo Executivo com achados de revisão.

**Triggers:**

- Manual quando stack, estrutura ou padrões mudam
- Pós-refatoração arquitetural ou merge de features
- Antes de releases
- Quando descobrir divergências (ex: doc menciona Server Actions, código usa Elysia routes)
- Onboarding de novos contributors

**Escopo:**

- **Inspeciona** (READ-ONLY):
  - `src/app/` (inclui `(app)/admin/users`, `(app)/transcripts/[id]/print`), `src/server/` (rotas + services incl. `export.ts`), `src/db/schema.ts`, `src/workers/`, `src/scripts/` (ex.: `backfill-media-hash.ts`), `transcriber/`
  - `package.json`, `docker-compose*.yml`, `drizzle.config.ts`, `tsconfig.json`, `.env.example`, `drizzle/*.sql`
  - `graphify-out/GRAPH_REPORT.md` (primário), `graphify-out/manifest.json` (frescor), `graphify-out/graph.json` (dependências)
  - `.claude/rules/*.md` (general.md, architecture.md, ui.md, e novos)
  - `docs/PRD.md`, `docs/SPEC.md`, `docs/SDD.md`, `docs/DESIGN.md`
- **Escreve** (WRITE-ONLY):
  - `CLAUDE.md`, `AGENTS.md`, `PRD.md`, `SDD.md`, `SPEC.md`, `DESIGN.md`
  - `.claude/rules/*.md` (quando padrões estáveis no código justificarem)
- **Preserva**: Seções customizadas existentes, decisões de produto, referências externas

**Modelo:** Claude Sonnet 4.5 (qualidade máxima para revisão de arquitetura)

---

## Convenções para Criar Novos Agentes

### Frontmatter Obrigatório

Incluir em AGENTS.md para cada novo agente:

```markdown
### agent-name

**Propósito:** [Uma frase clara]

**Triggers:** [Lista de eventos/condições que invocam]

**Escopo:**

- [Diretórios/files que pode ler]
- [Diretórios/files que pode escrever]
- [Restrições (READ-ONLY, WRITE-ONLY, etc)]

**Modelo:** [Claude Haiku 4.5 | Claude Opus | Bun service | Elysia route | outro]

**Código:** [Caminho(s) relevantes]
```

### Idioma e Estilo

- **PT-BR obrigatório** em descriptions, purpose, triggers
- **Inglês** em nomes de agentes (kebab-case)
- Resuma objetivo em uma frase
- Especifique triggers concretos (não "when needed")
- Indique se é Claude (LLM) ou nativo (Bun/Elysia service)

### Preservação de Seções Críticas

- **graphify section**: Leia antes de reescrever AGENTS.md; inclua verbatim no topo
- **Estrutura de tabela**: Mantenha coluna Agent|Propósito|Triggers|Escopo|Modelo
- **Histórico de agentes**: Não delete agentes inativos; marque como `[DEPRECATED]` se necessário

### Dependências de Rules

Referencie `.claude/rules/` ao definir scope:

- `general.md`: Stack (Bun, Next.js 16, Elysia, Drizzle, Postgres, Zod 4, Tailwind, ShadCN)
- `architecture.md`: Padrões (Git Conventional Commits, Server Components, Elysia REST, Drizzle ORM, Docker)

Agentes devem espelhar esses padrões obrigatoriamente.

---

## Como Invocar

### Invocação Manual Direta

```bash
# project-docs-synchronizer (via Agent tool)
invoke project-docs-synchronizer --scope "CLAUDE.md, AGENTS.md"

# worker-loop-agent
bun run worker:loop      # loop infinito (WORKER_INTERVAL_MS, padrão 3000ms)
bun run worker:tick      # single tick, exit code 0/1

# job-runner-agent (via worker, ou manual para debug)
curl -X POST http://localhost:3000/api/jobs/run \
  -H "x-internal-key: $INTERNAL_API_KEY"

# export-agent (manual)
curl "http://localhost:3000/api/transcripts/:id/export?format=docx" \
  -H "Authorization: Bearer <jwt_token>"
```

### Via Claude Code CLI

```bash
# List available agents
claude-code agents list

# Invoke by name
claude-code invoke <agent-name> --args "<args>"
```

### Configuração Esperada

Agentes assumem:

- Bun 1.x disponível
- `graphify` instalado (se graphify-out/ existe)
- Variáveis de ambiente em `.env` (não commitado)
- Permissão de leitura em `/Users/carlosroberto/Workspace/Projetos/fullstack/chegii/transcripts/`
- Permissão de escrita em `/Users/carlosroberto/Workspace/Projetos/fullstack/chegii/transcripts/*.md`
- `INTERNAL_API_KEY` definida para autenticação de worker

---

## Limites

### Restrições Técnicas

- **Token budget (Claude agents)**: Sonnet 4.5 ≈ 200k tokens por sessão
- **Time limit**: 15 minutos max por invocação (timeout padrão)
- **File size**: Max 50MB por arquivo inspecionado
- **Parallelismo**: Máx 5 agents rodando simultaneamente
- **Worker tick**: `WORKER_INTERVAL_MS` (padrão 3000ms); processa até `limit` jobs por tick (padrão 3, máx 5)

### Restrições Funcionais

- **project-docs-synchronizer**:
  - Não executa código (READ-ONLY codebase)
  - Não modifica estrutura de diretórios
  - Escreve apenas em `.md` documentação
  - Não commita automaticamente (requer `git add` manual)

- **worker-loop-agent**:
  - Não retorna resposta HTTP (fire-and-forget setInterval)
  - Depende de `INTERNAL_API_KEY` para autenticar chamadas ao job runner
  - Exit code 0 se tick bem-sucedido, 1 se erro

- **job-runner-agent**:
  - Requer autenticação interna (header `x-internal-key`)
  - Acesso DB total (lê/escreve transcription_jobs, transcript_segments, notifications)
  - Não exposto ao frontend — apenas worker e admin podem chamar

- **export-agent**:
  - Requer autenticação JWT válida (usuário autenticado)
  - Suporta apenas formatos: txt, html, doc, docx
  - Timeout em exportação: 30s (ajustável via `EXPORT_TIMEOUT_MS`)

- **media-hash-agent**:
  - Calcula hash somente em upload (não retroativamente em todos os arquivos)
  - Hash é imutável após persistência (recomputa apenas se arquivo mudou no disco)

### Falhas Esperadas

- **worker-loop-agent**: Timeout se `TRANSCRIBER_URL` inacessível; retira da fila com status `failed`.
- **job-runner-agent**: Falha em transação se BD desconecta; reintentável próximo tick.
- **export-agent**: 500 se transcription_segments corrompido ou timeout; usuário reclica.
- **media-hash-agent**: Skip silencioso se arquivo não existe em `STORAGE_DIR` (orphaned media).
- **project-docs-synchronizer**: Aborta se graphify-out/ desatualizado; recomenda `graphify update .`.
