## graphify

This project has a graphify knowledge graph at graphify-out/.

Rules:

- Before answering architecture or codebase questions, read graphify-out/GRAPH_REPORT.md for god nodes and community structure
- If graphify-out/wiki/index.md exists, navigate it instead of reading raw files
- After modifying code files in this session, run `graphify update .` to keep the graph current (AST-only, no API cost)

---

## Catálogo de Agentes

| Agent                       | Propósito                                                                      | Triggers                  | Escopo                                 | Modelo           |
| --------------------------- | ------------------------------------------------------------------------------ | ------------------------- | -------------------------------------- | ---------------- |
| `project-docs-synchronizer` | Sincronizar CLAUDE.md, AGENTS.md, SDD.md, SPEC.md, DESIGN.md com codebase real | Manual (invocação direta) | READ-ONLY inspection + WRITE-ONLY docs | Claude Haiku 4.5 |

### project-docs-synchronizer

**Propósito:** Manter CLAUDE.md, AGENTS.md, SDD.md, SPEC.md, DESIGN.md sincronizados com codebase real (Bun + Next.js 16 + Elysia 1.1.27 + Drizzle ORM 0.36.4).

**Triggers:**

- Invocação manual quando stack, estrutura ou padrões mudam
- Pós-refatoração arquitetural
- Quando descobrir divergências (ex: doc menciona Prisma, código usa Drizzle)

**Escopo:**

- Inspeciona `/Users/carlosroberto/Workspace/Projetos/fullstack/chegii/transcripts/` (READ-ONLY)
- Escreve apenas `/Users/carlosroberto/Workspace/Projetos/fullstack/chegii/transcripts/{CLAUDE,AGENTS,SDD,SPEC,DESIGN}.md` (WRITE-ONLY)
- Verifica package.json, drizzle.config.ts, tsconfig.json, docker-compose.yml como fonte de verdade
- Preserva seções `graphify`, `CLAUDE.md graphify`, estruturas pré-existentes

**Modelo:** Claude Haiku 4.5 (token-efficient text analysis)

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

**Modelo:** [Claude Haiku 4.5 | Claude Opus | outro]
```

### Idioma e Estilo

- **PT-BR obrigatório** em descriptions, purpose, triggers
- **Inglês** em nomes de agentes (kebab-case)
- Resuma objetivo em uma frase
- Especifique triggers concretos (não "when needed")

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
claude-code invoke project-docs-synchronizer --scope src
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

---

## Limites

### Restrições Técnicas

- **Token budget**: Haiku 4.5 ≈ 200k tokens por sessão
- **Time limit**: 15 minutos max por invocação (timeout padrão)
- **File size**: Max 50MB por arquivo inspecionado
- **Parallelismo**: Máx 5 agents rodando simultaneamente

### Restrições Funcionais

- **project-docs-synchronizer**:
  - Não executa código (READ-ONLY codebase)
  - Não modifica estrutura de diretórios
  - Escreve apenas em `.md` documentação
  - Não commita automaticamente (requer `git add` manual)

### Falhas Esperadas

- Divergências não-reportáveis (ex: código quebrado não sincronizável com docs úteis)
- Stack mismatch não-resolvível (ex: Prisma docs vs Drizzle código)
- Circularidade em dependencies entre docs

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
