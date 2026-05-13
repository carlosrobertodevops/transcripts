## graphify

This project has a graphify knowledge graph at graphify-out/.

## Atentions

- Don't over-explain, over-engineer, or add unrequested improvements.
- When making widespread changes to a file, use one "Write” instead of many
  sequential `Edit`calls. Speed matters.

Don't fetch well-known websites (Apple, Google, Stripe, etc.) for design/
JAPI inspiration if you already know the patterns. Just start working.

## Interaction Rules

"Again" or "re-run" means repeat the same workflow with the same approach never rebuild from scratch.
For tasks >3 steps involving an external API or tool, outline your plan
in 3-5 bullets and wait for approval before executing.
Only make the specific edits requested. Never add face swaps, composite
changes, extra refactors, or modifications that weren't asked for.

- When iterating on creative work (thumbnails, designs, copy),
  change only
  what the user asked to change. Preserve everything else excty

## Browser Automation

Never focus/foreground browser tabs or windows during automation. Run
browser tasks in the background.

If Chrome MCP tools fail twice, stop retrying. Fall back to WebFetch/
WebSearch or ask the user.

Before browser-heavy sessions, kill stale Chrome processes and clear temp
profiles if MCP is unresponsive.

Rules:

- Before answering architecture or codebase questions, read graphify-out/GRAPH_REPORT.md for god nodes and community structure
- If graphify-out/wiki/index.md exists, navigate it instead of reading raw files
- After modifying code files in this session, run `graphify update .` to keep the graph current (AST-only, no API cost)

---

## Catálogo de Agentes

| Agent | Propósito | Triggers | Escopo | Modelo |
|-------|-----------|----------|--------|--------|
| `worker-loop-agent` | Orquestrar ticks periódicos e invocar job runner para processar transcrições | Timer `WORKER_INTERVAL_MS` (padrão 3000ms) | READ-ONLY jobs/transcription logic | N/A (Bun service) |
| `job-runner-agent` | Executar lote de jobs pendentes (pending → processing → done/failed) | POST /api/jobs/run | READ-WRITE DB (transcriptions, media) | N/A (Elysia route) |
| `project-docs-synchronizer` | Sincronizar CLAUDE.md, AGENTS.md, PRD.md, SDD.md, SPEC.md, DESIGN.md e .claude/rules/*.md com codebase real. Revisa código e detecta divergências. | Manual (invocação direta ou pós-merge). Usar quando stack/padrões mudarem ou antes de release | READ-ONLY código + graphify. WRITE-ONLY docs/rules | Claude Sonnet 4.5 (qualidade máxima) |

---

## Detalhes dos Agentes

### worker-loop-agent

**Propósito:** Orquestrar ticks periódicos e invocar job runner para processar transcrições assincronamente.

**Triggers:**

- `setInterval(WORKER_INTERVAL_MS, …)` em `src/workers/loop.ts` (padrão 3000ms, configurável via env)
- Executável manual via `bun run worker:loop` (loop infinito) ou `bun run worker:tick` (single tick, exit code)

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

### project-docs-synchronizer

**Propósito:** Revisar código real + sincronizar documentação canônica (CLAUDE.md, AGENTS.md, PRD.md, SDD.md, SPEC.md, DESIGN.md) e rules (.claude/rules/*.md) com estado atual do repositório. Detecta divergências, violations de regras, e gera Resumo Executivo com achados de revisão.

**Triggers:**

- Manual quando stack, estrutura ou padrões mudam
- Pós-refatoração arquitetural ou merge de features
- Antes de releases
- Quando descobrir divergências (ex: doc menciona Prisma, código usa Drizzle)
- Onboarding de novos contributors

**Escopo:**

- **Inspeciona** (READ-ONLY): 
  - `src/app/`, `src/server/`, `src/db/schema.ts`, `src/workers/`, `transcriber/`
  - `package.json`, `docker-compose*.yml`, `drizzle.config.ts`, `tsconfig.json`, `.env.example`
  - `graphify-out/GRAPH_REPORT.md` (primário), `graphify-out/manifest.json` (frescor), `graphify-out/graph.json` (dependências)
  - `.claude/rules/*.md` (general.md, architecture.md, ui.md, e novos)
- **Escreve** (WRITE-ONLY):
  - `CLAUDE.md`, `AGENTS.md`, `PRD.md`, `SDD.md`, `SPEC.md`, `DESIGN.md`
  - `.claude/rules/*.md` (quando padrões estáveis no código justificarem)
- **Preserva**: Seções customizadas existentes, links Figma, decisões de produto

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
```

### Idioma e Estilo

- **PT-BR obrigatório** em descriptions, purpose, triggers
- **Inglês** em nomes de agentes (kebab-case)
- Resuma objetivo em uma frase
- Especifique triggers concretos (não "when needed")
- Indique se é Claude (LLM) ou nativo (Bun/Elysia service)

### Preservação de Seções Críticas

- **graphify section**: Leia antes de reescrever AGENTS.md; inclua verbatim no final
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
# project-docs-synchronizer
claude-code invoke project-docs-synchronizer --scope src

# worker-loop-agent
bun run worker:loop      # loop infinito (15s)
bun run worker:tick      # single tick, exit code

# job-runner-agent (via worker, ou manual para debug)
curl -X POST http://localhost:3000/api/jobs/run \
  -H "x-internal-key: $INTERNAL_API_KEY"
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

- **Token budget (Claude agents)**: Haiku 4.5 ≈ 200k tokens por sessão
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

### Falhas Esperadas

- Divergências não-reportáveis (ex: código quebrado não sincronizável com docs úteis)
- Stack mismatch não-resolvível (ex: Prisma docs vs Drizzle código)
- Circularidade em dependencies entre docs
- Worker offline ou timeout: jobs acumulam em `pending` até próximo tick bem-sucedido

**Fallback:** Reportar divergências e parar; não tentar "consertar" código.

---

## Memória Persistente

### Estrutura de Arquivo

```
.claude/agent-memory/
├── project-docs-synchronizer/
│   ├── last-sync.json          # timestamp + files modified
│   ├── divergences.md          # Bugs/mismatches found
│   └── stack-snapshot.json     # Versões confirmadas de package.json
```

### last-sync.json

```json
{
  "timestamp": "2025-05-08T14:30:00Z",
  "files_modified": ["CLAUDE.md", "AGENTS.md"],
  "divergences_found": [
    "Agent definition references Prisma; codebase uses Drizzle ORM 0.36.4"
  ],
  "next_review": "2025-06-08"
}
```

### divergences.md

Log de inconsistências encontradas e status de resolução:

```markdown
## Divergência: Prisma vs Drizzle

**Encontrado em:** AGENTS.md (antigo) linhas 15-20  
**Problema:** Documentação mencionava Prisma Server Actions  
**Realidade:** Código usa Drizzle ORM 0.36.4  
**Resolução:** Atualizar CLAUDE.md Stack com "Drizzle ORM 0.36.4 (NOT Prisma)"  
**Status:** ✅ FIXED em CLAUDE.md  
**Data:** 2025-05-08
```

### stack-snapshot.json

Versões confirmadas de dependencies críticas (source: package.json):

```json
{
  "runtime": "bun@1.x",
  "framework": "next@16.0.0",
  "api": "elysia@1.1.27",
  "orm": "drizzle-orm@0.36.4",
  "database": "postgres@16-alpine",
  "validation": "zod@4.x",
  "ui": {
    "tailwind": "4.0.0",
    "shadcn": "new-york"
  },
  "auth": "jose@5.9.6",
  "sync_date": "2025-05-08"
}
```

### Uso Pela Próxima Invocação

1. Agente lê `last-sync.json` pra saber qual foi última data
2. Se > 30 dias: força re-inspeção completa
3. Verifica `divergences.md` pra contexto histórico
4. Valida `stack-snapshot.json` contra package.json atual
5. Atualiza all 3 arquivos ao final da sessão
