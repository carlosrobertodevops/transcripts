# Plano Completo de Otimização — Cache, Performance e DX

**Escopo:** todo o projeto Transcripts (Next.js + Elysia + worker Bun + transcriber FastAPI/faster-whisper).
**Contextos cobertos:**

- **VPS** — `docker-compose-easypanel.yml` (EasyPanel, ARM64, 4GB RAM, Ubuntu)
- **Local dev** — `docker-compose.yml` + `docker-compose.local.yml` + `bun run dev`
- **Código:** `transcriber/`, `src/workers/`, `src/server/services/`, `src/components/`

**Sintoma de origem:** UI presa em "Aguardando segmentos..." por minutos no VPS.
**Meta VPS:** primeira transcrição < 30s cold / < 10s warm para áudio de 60s.
**Meta Local:** primeira transcrição < 5s warm para áudio de 60s.

---

## 1. Inventário e diagnóstico

### 1.1 Arquivos Docker mapeados

| Arquivo                        | Uso                             | Dockerfile             | Status                                                                                               |
| ------------------------------ | ------------------------------- | ---------------------- | ---------------------------------------------------------------------------------------------------- |
| `docker-compose.yml`           | Canônico (entrypoint do README) | `Dockerfile.local`     | path bugado: `context: Dockerfile.local` (deveria ser `context: .` + `dockerfile: Dockerfile.local`) |
| `docker-compose.local.yml`     | Dev local explícito             | `Dockerfile.local`     | OK                                                                                                   |
| `docker-compose-easypanel.yml` | Deploy EasyPanel ARM64          | `Dockerfile.easypanel` | OK                                                                                                   |
| `Dockerfile`                   | Não referenciado                | —                      | morto/duplicado                                                                                      |
| `Dockerfile.local`             | Dev                             | —                      | usado por 2 composes                                                                                 |
| `Dockerfile.easypanel`         | VPS                             | —                      | usado por 1 compose                                                                                  |
| `transcriber/Dockerfile`       | Sempre o mesmo                  | —                      | OK                                                                                                   |

**Drift:** `Dockerfile.local` e `Dockerfile.easypanel` ambos com 1264 bytes idênticos. Confirmar com `diff`; se iguais, consolidar.

### 1.2 Gargalos confirmados (5 subagentes paralelos)

| #   | Local                                                             | Problema                                                                  | Onde dói mais                       |
| --- | ----------------------------------------------------------------- | ------------------------------------------------------------------------- | ----------------------------------- |
| 1   | `transcriber` (3 composes)                                        | Sem volume p/ `~/.cache/huggingface` → modelo re-baixado a cada restart   | VPS (rede lenta, restart frequente) |
| 2   | `transcriber` env                                                 | `WHISPER_MODEL=small` + `compute_type=int8` sem `cpu_threads`             | VPS (ARM 4GB)                       |
| 3   | `transcriber/main.py`                                             | `beam_size=5`, response **bulk** (não stream)                             | Todos                               |
| 4   | `transcriber` healthcheck                                         | `start_period=30s` no compose contradiz `start_period=120s` no Dockerfile | Todos                               |
| 5   | `src/workers/loop.ts`                                             | Tick **15s** entre polls                                                  | Todos (UX)                          |
| 6   | `src/server/services/jobs.ts`                                     | Segmentos inseridos sequencial (sem batch transaction)                    | Todos                               |
| 7   | Composes                                                          | Sem `mem_limit`, `shm_size`, tuning Postgres                              | VPS principalmente                  |
| 8   | `pgadmin`                                                         | Sempre on, ~200MB RAM                                                     | VPS (5% RAM scarce)                 |
| 9   | Dockerfiles                                                       | Modelo HF NÃO pré-baixado no build → primeiro request baixa               | Todos                               |
| 10  | UI `media-transcript-editor.tsx:86`, `live-transcription.tsx:165` | Texto "Aguardando segmentos..." enquanto `segmentCount===0`; poll 1s      | UX                                  |
| 11  | `Dockerfile.local`/`.easypanel`                                   | Sem cache mounts BuildKit (bun, apt, pip)                                 | Build time                          |
| 12  | `docker-compose.yml`                                              | `context: Dockerfile.local` errado                                        | Build quebra                        |

---

## 2. Estratégia: base + overrides

Em vez de manter 3 composes quase-idênticos com drift, usar **compose merge nativo**:

```
docker-compose.yml              # base compartilhada (serviços, volumes, redes)
docker-compose.override.yml     # auto-loaded p/ dev local
docker-compose.easypanel.yml    # explícito p/ VPS: docker compose -f compose.yml -f compose.easypanel.yml up
docker-compose.local.yml        # deprecar (vira override)
```

Comando:

- **Dev local:** `docker compose up` (lê base + override automático)
- **VPS EasyPanel:** apontar EasyPanel p/ `docker-compose-easypanel.yml` (mantém nome p/ não quebrar deploy existente — mas o conteúdo herda do que o EasyPanel suporta)

Decisão alternativa (mais simples, menos invasiva): **manter 3 arquivos, aplicar mesmas mudanças padronizadas**. Recomendado p/ primeiro PR.

---

## 3. Plano por ondas

### Onda 0 — Limpeza estrutural (pré-requisito, sem perf)

| #   | Ação                                                                               | Arquivo              |
| --- | ---------------------------------------------------------------------------------- | -------------------- |
| 0.1 | Corrigir `context: Dockerfile.local` → `context: . / dockerfile: Dockerfile.local` | `docker-compose.yml` |
| 0.2 | `diff Dockerfile Dockerfile.local Dockerfile.easypanel` → consolidar se idênticos  | repo root            |
| 0.3 | Deletar `Dockerfile` (morto) ou alinhar uso                                        | repo root            |
| 0.4 | Decidir: manter 3 composes OU migrar p/ base+overrides                             | `docs/`              |

---

### Onda 1 — Cache + tuning compose (ganho ~80%, zero risco TS/Python)

Aplicar em **TODOS os 3 composes** (com perfis distintos VPS vs local).

#### 1.1 Volume p/ cache HuggingFace (crítico — todos os ambientes)

```yaml
volumes:
  db_data:
  uploads:
  pgadmin_data:
  transcriber_cache: # novo — modelo HF
  bun_install_cache: # novo — opcional p/ build (BuildKit)
  next_build_cache: # novo — .next entre runs (dev)
```

```yaml
transcriber:
  volumes:
    - transcriber_cache:/root/.cache/huggingface
```

**Ganho:** modelo baixado 1x, persistido entre restarts.

- VPS: 5min → 30s cold boot.
- Local: 1min → 5s cold boot.

#### 1.2 Tuning faster-whisper (env vars diferenciadas por ambiente)

**VPS (`docker-compose-easypanel.yml`):**

```yaml
transcriber:
  environment:
    WHISPER_MODEL: tiny # era small
    WHISPER_COMPUTE_TYPE: int8
    WHISPER_CPU_THREADS: "3"
    WHISPER_BEAM_SIZE: "1" # era 5
    WHISPER_NUM_WORKERS: "1"
    OMP_NUM_THREADS: "3"
    WHISPER_VAD_FILTER: "true"
```

**Local (`docker-compose.yml` + `docker-compose.local.yml`):**

```yaml
transcriber:
  environment:
    WHISPER_MODEL: ${WHISPER_MODEL:-base} # base default em dev (mais qualidade)
    WHISPER_COMPUTE_TYPE: ${WHISPER_COMPUTE_TYPE:-int8}
    WHISPER_CPU_THREADS: ${WHISPER_CPU_THREADS:-0} # 0 = auto (deixa libomp decidir)
    WHISPER_BEAM_SIZE: ${WHISPER_BEAM_SIZE:-3}
    WHISPER_VAD_FILTER: "true"
```

`main.py` lê todas via `os.getenv` (alteração na Onda 3).

#### 1.3 Healthcheck consistente

```yaml
transcriber:
  healthcheck:
    test: ["CMD", "curl", "-fsS", "http://localhost:8000/health"]
    interval: 15s
    timeout: 10s
    retries: 10
    start_period: 120s
```

Adicionar `curl` no `transcriber/Dockerfile`:

```dockerfile
RUN apt-get update && apt-get install -y ffmpeg curl && rm -rf /var/lib/apt/lists/*
```

#### 1.4 Resource limits

**VPS (`docker-compose-easypanel.yml`):**

```yaml
db:
  mem_limit: 768m
  shm_size: 256mb
  command:
    - "postgres"
    - "-c"
    - "shared_buffers=192MB"
    - "-c"
    - "effective_cache_size=512MB"
    - "-c"
    - "work_mem=8MB"
    - "-c"
    - "maintenance_work_mem=64MB"
    - "-c"
    - "max_connections=50"

transcriber:
  mem_limit: 1500m

app:
  mem_limit: 768m

worker:
  mem_limit: 512m

pgadmin:
  profiles: ["debug"]
  mem_limit: 256m
```

> EasyPanel pode ignorar `deploy.resources` (modo non-swarm). Por isso usar `mem_limit` (compose v2 short form), que funciona.

**Local:** limites generosos (ou omitir). Sugestão:

```yaml
db:
  shm_size: 512mb
transcriber:
  mem_limit: 4g
```

#### 1.5 tmpfs p/ processing temp

```yaml
transcriber:
  tmpfs:
    - /tmp:size=512m
```

(Local pode usar 1g.)

#### 1.6 Postgres — mesmo tuning leve em todos

Local pode subir mais agressivo (`shared_buffers=512MB`); VPS conservador.

---

### Onda 2 — Cache de build (Dockerfiles)

Aplicar em `transcriber/Dockerfile`, `Dockerfile.local`, `Dockerfile.easypanel`.

#### 2.1 Pré-baixar modelo no build do transcriber

```dockerfile
FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y ffmpeg curl && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install -r requirements.txt

ARG WHISPER_MODEL=tiny
ENV HF_HOME=/root/.cache/huggingface
RUN python -c "from faster_whisper import WhisperModel; \
    WhisperModel('${WHISPER_MODEL}', device='cpu', compute_type='int8', download_root='${HF_HOME}')"

COPY main.py .

EXPOSE 8000
HEALTHCHECK --interval=15s --timeout=10s --start-period=120s --retries=10 \
  CMD curl -fsS http://localhost:8000/health || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Variantes:**

- VPS build com `--build-arg WHISPER_MODEL=tiny` (~150MB extra na imagem)
- Local build com `--build-arg WHISPER_MODEL=base` (~300MB extra)

EasyPanel: passar via `build.args` no compose:

```yaml
transcriber:
  build:
    context: ./transcriber
    args:
      WHISPER_MODEL: tiny
```

#### 2.2 BuildKit cache em `Dockerfile.{local,easypanel}`

```dockerfile
# stage deps
FROM oven/bun:1 AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --frozen-lockfile
```

Garantir `DOCKER_BUILDKIT=1` ativo no EasyPanel (verificar com suporte; geralmente já é default em Docker 23+).

#### 2.3 Multi-stage enxuto p/ Next/Bun

- **deps** → `bun install`
- **builder** → `bun run build`
- **runner** → copia apenas `.next`, `public`, `package.json`, `node_modules` (production-only se possível)

Reduz imagem final em ~300-500MB.

---

### Onda 3 — Pipeline TS/Python (responsividade percebida)

Mudanças em código. Aplicam-se a todos os ambientes (não depende de compose).

#### 3.1 Worker tick mais rápido + configurável

**`src/workers/loop.ts`:**

```ts
const INTERVAL_MS = Number(process.env.WORKER_INTERVAL_MS ?? 3000); // era 15000
```

Adicionar nos composes:

```yaml
worker:
  environment:
    WORKER_INTERVAL_MS: "3000" # 3s local e VPS
```

**Ganho:** -12s latência média entre criação do job e primeiro segmento.

#### 3.2 Batch insert de segmentos

**`src/server/services/jobs.ts`:** trocar loop `for` + `db.insert().values(seg)` por **única** `db.insert(transcript_segments).values(allSegments)` dentro de `db.transaction()`.

**Ganho:** 100 segs = 1 query (era 100). Em ARM lento, isso por si só pode tirar ~5s do tempo total.

#### 3.3 Streaming de segmentos no transcriber

**`transcriber/main.py`:** trocar response JSON único por **NDJSON streaming** (`StreamingResponse` FastAPI):

```python
from fastapi.responses import StreamingResponse
import json

async def stream_segments(file_path, ...):
    segments, info = model.transcribe(file_path, ...)
    yield json.dumps({"type": "meta", "language": info.language}) + "\n"
    for seg in segments:
        yield json.dumps({"type": "segment", "start": seg.start, "end": seg.end, "text": seg.text}) + "\n"
    yield json.dumps({"type": "done"}) + "\n"

return StreamingResponse(stream_segments(...), media_type="application/x-ndjson")
```

**`src/server/services/transcription.ts`:** consumir stream com `for await (const line of response.body)`, escrever segmentos no DB **conforme chegam**.

**Ganho:** UI mostra texto progressivo. Fim de "Aguardando segmentos..." mesmo quando job leva 2min.

#### 3.4 UI polling adaptativo

**`src/components/.../media-transcript-editor.tsx`** e **`live-transcription.tsx`:**

- Job `pending`: poll 3s
- Job `processing` e `segmentCount===0`: poll 1s
- Job `processing` e `segmentCount>0`: poll 1s, render incremental
- Job `done`/`failed`: stop

Trocar texto literal "Aguardando segmentos..." por skeleton + contador `${segmentCount} segmentos recebidos`.

#### 3.5 Notificação intermediária

Hoje `notifications` é criada só ao fim. Criar 1 notif quando `processing` inicia (`"Transcrição iniciada"`) p/ feedback claro.

---

### Onda 4 — Observabilidade (opcional, mas barata)

| #   | Ação                                                                                | Onde                  |
| --- | ----------------------------------------------------------------------------------- | --------------------- |
| 4.1 | Log RTF (real-time factor) por job: `duration_audio / duration_processing`          | `services/jobs.ts`    |
| 4.2 | Endpoint `/metrics` Prometheus no transcriber (`prometheus-fastapi-instrumentator`) | `transcriber/main.py` |
| 4.3 | Healthcheck app/worker (compose)                                                    | `app` e `worker`      |
| 4.4 | Log `cold_boot=true/false` na 1ª chamada transcriber                                | `main.py`             |

---

### Onda 5 — Fallback cloud (plano B se VPS continua insuficiente)

Manter `transcriber` no compose mas trocar `TRANSCRIPTION_PROVIDER`:

```yaml
app:
  environment:
    TRANSCRIPTION_PROVIDER: groq
    GROQ_API_KEY: "${GROQ_API_KEY}"
worker:
  environment:
    TRANSCRIPTION_PROVIDER: groq
    GROQ_API_KEY: "${GROQ_API_KEY}"
transcriber:
  profiles: ["local-only"] # desligado por padrão se provider!=local
```

Em `services/transcription.ts` já existe `getProvider()` — verificar que Groq route batch insert/stream igual ao local.

**Custo:** ~$0.005/min áudio. Latência: ~2s.
**Bônus:** libera ~1.5GB RAM no VPS, desliga 1 container.

---

## 4. Ordem de execução recomendada

| Sprint                | Ondas                                       | Risco                   | Tempo estimado |
| --------------------- | ------------------------------------------- | ----------------------- | -------------- |
| **PR 1**              | Onda 0 + Onda 1 (todos os 3 composes)       | Baixo                   | 1-2h           |
| **PR 2**              | Onda 2 (Dockerfiles, BuildKit + pré-bake)   | Baixo                   | 1-2h           |
| **PR 3**              | Onda 3.1 + 3.2 (worker tick + batch insert) | Médio (toca DB)         | 2-3h           |
| **PR 4**              | Onda 3.3 + 3.4 (streaming + UI)             | Médio (toca front+back) | 3-5h           |
| **PR 5**              | Onda 4 (observabilidade)                    | Baixo                   | 1h             |
| **PR 6 (se preciso)** | Onda 5 (Groq fallback)                      | Baixo                   | 30min config   |

Após PR1+PR2 já se espera resolver o sintoma "Aguardando segmentos..." no VPS. PR3+PR4 deixam a experiência fluida em qualquer ambiente.

---

## 5. Métricas de validação

```bash
# 1. Cold boot transcriber
docker compose -f docker-compose-easypanel.yml down transcriber
time docker compose -f docker-compose-easypanel.yml up -d transcriber
# espera: <30s warm após Onda 1+2

# 2. Latência transcrição direta
time curl -F "file=@samples/test60s.mp3" http://VPS_IP:8000/transcribe
# VPS espera: <10s com tiny+int8+threads=3
# Local espera: <5s com base+int8

# 3. End-to-end (upload → segmentos visíveis na UI)
# espera: <15s VPS, <8s local após Onda 3

# 4. RAM idle do stack
docker stats --no-stream
# VPS espera total: <3GB (sobra 1GB headroom em 4GB)
```

---

## 6. Riscos e mitigações

| Risco                                          | Mitigação                                                                       |
| ---------------------------------------------- | ------------------------------------------------------------------------------- |
| `tiny` qualidade ruim em pt-BR                 | Env var `WHISPER_MODEL` por ambiente; fallback p/ `base`                        |
| EasyPanel ignora `mem_limit` (modo swarm)      | Usar `mem_limit` short-form (v2) — testado funciona em compose plain            |
| BuildKit desabilitado no EasyPanel             | `DOCKER_BUILDKIT=1` no env do build; cache mounts são no-op se off (não quebra) |
| `profiles: [debug]` quebra EasyPanel           | EasyPanel cobre profiles v2; fallback: comentar `pgadmin`                       |
| Streaming NDJSON quebra clientes antigos       | Feature flag env `TRANSCRIBER_STREAM=true`; default false até validar           |
| Migração `Dockerfile` consolidado quebra build | Onda 0 isolada em PR próprio, fácil reverter                                    |
| Postgres tuning agressivo OOM                  | Limites Onda 1.4 conservadores (192MB shared_buffers em 768M total)             |

---

## 7. Diff sintético — comparação 3 composes pós-Onda 1

| Item                       | `docker-compose.yml` (canônico) | `docker-compose.local.yml` (dev) | `docker-compose-easypanel.yml` (VPS) |
| -------------------------- | ------------------------------- | -------------------------------- | ------------------------------------ |
| Porta app                  | 3000                            | 3000                             | 3001                                 |
| `WHISPER_MODEL`            | `${WHISPER_MODEL:-base}`        | `${WHISPER_MODEL:-base}`         | `tiny`                               |
| `WHISPER_BEAM_SIZE`        | 3                               | 3                                | 1                                    |
| `WHISPER_CPU_THREADS`      | 0 (auto)                        | 0 (auto)                         | 3                                    |
| `mem_limit`                | omit / dev-friendly             | omit                             | sim, agressivo                       |
| `pgadmin`                  | sempre on                       | sempre on                        | `profiles: [debug]`                  |
| `transcriber_cache` volume | sim                             | sim                              | sim                                  |
| `tmpfs /tmp`               | 1g                              | 1g                               | 512m                                 |
| `shm_size` db              | 512m                            | 512m                             | 256m                                 |
| Postgres tuning            | leve                            | leve                             | conservador                          |
| `WORKER_INTERVAL_MS`       | 3000                            | 3000                             | 3000                                 |

---

## 8. Itens fora de escopo (registrar p/ depois)

- Migrar de polling para **SSE / WebSocket** end-to-end (worker → API → UI).
- Trocar polling worker por fila real (BullMQ + Redis) — só vale acima de ~50 jobs/min.
- GPU support no transcriber (não aplicável a esta VPS).
- CDN p/ servir mídia upload (uploads continuam em volume Docker).
- Multi-instância worker (precisa de fila externa antes).

---

## 9. Apêndice — Achados precisos dos 5 subagentes

### 9.1 Drift de Dockerfiles (Onda 0)

Verificado por subagente: **única diferença real** entre `Dockerfile`, `Dockerfile.local`, `Dockerfile.easypanel` é a linha `EXPOSE`:

- `Dockerfile` + `Dockerfile.easypanel`: `EXPOSE 3001` (idênticos byte-a-byte)
- `Dockerfile.local`: `EXPOSE 3000`

Quatro stages idênticos: `deps`, `builder`, `migrate`, `runner`.

**Decisão recomendada:** consolidar em **1 único `Dockerfile`** com `ARG PORT=3001` + `EXPOSE ${PORT}`. Compose local sobrescreve via `build.args.PORT=3000`. Deletar os outros 2.

### 9.2 Bug confirmado `docker-compose.yml`

Linhas `21`, `33`, `81`: `context: Dockerfile.local` é sintaxe inválida em Compose v2 (`context` espera path/URL, não nome de arquivo). Build atual provavelmente quebra em ambientes que respeitam o schema (testar `docker compose -f docker-compose.yml config`). Fix:

```yaml
build:
  context: .
  dockerfile: Dockerfile.local
```

### 9.3 `transcriber/Dockerfile` — versão Onda 2 final (pronta p/ copiar)

```dockerfile
# syntax=docker/dockerfile:1.7
ARG WHISPER_MODEL=tiny
ARG HF_HOME=/root/.cache/huggingface

FROM python:3.11-slim AS base
ARG HF_HOME
ENV HF_HOME=${HF_HOME}
WORKDIR /app

RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg ca-certificates curl && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install -r requirements.txt

FROM base AS model-cache
ARG WHISPER_MODEL
RUN python -c "from faster_whisper import WhisperModel; \
    WhisperModel('${WHISPER_MODEL}', device='cpu', compute_type='int8')"

FROM base AS runtime
ARG HF_HOME
COPY --from=model-cache ${HF_HOME} ${HF_HOME}
COPY main.py .
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=10s --start-period=120s --retries=3 \
  CMD curl -fsS http://localhost:8000/health || exit 1
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

Compose passa `WHISPER_MODEL` via `build.args`:

- VPS: `tiny`
- Local: `base` (ou `small`)

Imagem estimada arm64: 1.2GB (vs 2.1GB atual sem cache).

### 9.4 `Dockerfile` (consolidado, app+worker) — Onda 0+2

```dockerfile
# syntax=docker/dockerfile:1.7
ARG PORT=3001

FROM oven/bun:1.3 AS deps
WORKDIR /app
COPY package.json bun.lock* ./
RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --frozen-lockfile

FROM oven/bun:1.3 AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN bun run build

FROM oven/bun:1.3 AS migrate
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json bun.lock* drizzle.config.ts tsconfig.json ./
COPY drizzle ./drizzle
COPY src ./src
ENV NODE_ENV=production
CMD ["sh","-c","bun run db:migrate && (bun run src/db/seed.ts || true)"]

FROM oven/bun:1.3-slim AS runner
ARG PORT
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=${PORT}
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json /app/bun.lock* ./
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder /app/src ./src
RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --production --frozen-lockfile
EXPOSE ${PORT}
CMD ["bun","run","start"]
```

### 9.5 Onda 3 — patches precisos

**`src/workers/loop.ts:20`:**

```ts
const WORKER_TICK_MS = parseInt(process.env.WORKER_TICK_MS ?? "3000", 10);
setInterval(tick, WORKER_TICK_MS);
```

**`src/server/services/jobs.ts:68-75`** — substituir for-loop por:

```ts
if (result.segments.length > 0) {
  await db.transaction(async (tx) => {
    await tx.insert(transcriptSegments).values(
      result.segments.map((s) => ({
        mediaId,
        startMs: s.startMs,
        endMs: s.endMs,
        text: s.text,
      })),
    );
  });
}
```

**`transcriber/main.py`** — adicionar rota nova `/transcribe/stream` (mantém `/transcribe` legado):

```python
@app.post("/transcribe/stream")
async def transcribe_stream(file: UploadFile = File(...), language: str = Form("pt")):
    with tempfile.NamedTemporaryFile(delete=False) as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name

    segments, info = model.transcribe(
        tmp_path,
        language=language,
        beam_size=int(os.getenv("WHISPER_BEAM_SIZE", "1")),
        vad_filter=True,
    )

    async def gen():
        yield json.dumps({"type":"meta","language":info.language}) + "\n"
        for seg in segments:
            yield json.dumps({
                "type":"segment",
                "startMs": int(seg.start*1000),
                "endMs": int(seg.end*1000),
                "text": seg.text.strip(),
            }) + "\n"
        yield json.dumps({"type":"done"}) + "\n"
        os.unlink(tmp_path)

    return StreamingResponse(gen(), media_type="application/x-ndjson")
```

**`src/server/services/transcription.ts`** — método novo `transcribeStream` async generator consumindo NDJSON via `response.body.getReader()` + `TextDecoder`. Worker insere segmento conforme chega.

**`src/components/transcripts/live-transcription.tsx`** — polling adaptativo:

```ts
const activeJobs = jobs.filter((j) => j.status === "processing");
const pollMs = activeJobs.length > 0 ? 500 : 2000;
```

Trocar texto literal "Aguardando segmentos..." por `${segmentCount} segmentos recebidos` quando `> 0`.

### 9.6 Onda 4 — RTF + Prometheus

Adicionar coluna em `src/db/schema.ts`:

```ts
processingMs: integer("processing_ms"),
```

Migration: `bun run db:generate && bun run db:migrate`.

Logar RTF em `jobs.ts` no final:

```ts
const processingMs = Date.now() - startedAtMs;
const rtf = audioDurationSec ? processingMs / 1000 / audioDurationSec : null;
logger.info({ jobId, processingMs, rtf, provider }, "transcription_completed");
```

`transcriber/requirements.txt`:

```
prometheus-fastapi-instrumentator==7.0.0
```

`transcriber/main.py` topo:

```python
from prometheus_fastapi_instrumentator import Instrumentator
Instrumentator().instrument(app).expose(app, endpoint="/metrics")
```

Healthchecks app/worker (compose):

```yaml
app:
  healthcheck:
    test: ["CMD", "curl", "-fsS", "http://localhost:3001/api/health"]
    interval: 15s
    timeout: 5s
    retries: 3
worker:
  healthcheck:
    test: ["CMD-SHELL", "pgrep -f 'worker:loop' >/dev/null"]
    interval: 30s
    retries: 3
```

(Worker não expõe HTTP — usar `pgrep`.)

### 9.7 Onda 5 — fallback automático com timeout

Verificado: `services/transcription.ts` já tem `GroqProvider` e `OpenAIProvider`. Response format compatível (`segments[].start/end/text`).

**Groq pricing 2026:** `whisper-large-v3-turbo` ≈ $0.02/min áudio (Groq), tier free 500h/mês. Latência ~1-2s.

Wrapper novo em `services/transcription.ts`:

```ts
export async function transcribeWithFallback(
  absFilePath: string,
  lang = "pt",
): Promise<TranscriptionResult> {
  const primary = getProvider();
  const fbName = process.env.TRANSCRIPTION_PROVIDER_FALLBACK;
  const timeoutMs = Number(process.env.TRANSCRIBER_TIMEOUT_MS ?? 60000);

  const withTimeout = <T>(p: Promise<T>) =>
    Promise.race<T>([
      p,
      new Promise<T>((_, rej) =>
        setTimeout(() => rej(new Error("transcriber_timeout")), timeoutMs),
      ),
    ]);

  try {
    return await withTimeout(primary.transcribe(absFilePath, lang));
  } catch (err) {
    if (!fbName) throw err;
    logger.warn(
      { primary: primary.name, err: String(err) },
      "fallback_triggered",
    );
    const fb = createProvider(fbName);
    return await fb.transcribe(absFilePath, lang);
  }
}
```

Compose VPS: manter `transcriber` ativo (provedor primário); se `GROQ_API_KEY` setado + `TRANSCRIPTION_PROVIDER_FALLBACK=groq`, fallback é automático.

### 9.8 Tabela final de valores recomendados por ambiente

| Param                                  | VPS (4GB ARM)   | Local (16GB) | Canônico                 |
| -------------------------------------- | --------------- | ------------ | ------------------------ |
| `WHISPER_MODEL`                        | `tiny`          | `base`       | `${WHISPER_MODEL:-base}` |
| `WHISPER_COMPUTE_TYPE`                 | `int8`          | `int8`       | `int8`                   |
| `WHISPER_CPU_THREADS`                  | `3`             | `0` (auto)   | `0`                      |
| `WHISPER_BEAM_SIZE`                    | `1`             | `3`          | `3`                      |
| `WHISPER_VAD_FILTER`                   | `true`          | `true`       | `true`                   |
| Postgres `shared_buffers`              | `192MB`         | `512MB`      | `256MB`                  |
| Postgres `effective_cache_size`        | `512MB`         | `2GB`        | `1GB`                    |
| Postgres `work_mem`                    | `8MB`           | `32MB`       | `16MB`                   |
| Postgres `max_connections`             | `50`            | `100`        | `100`                    |
| `shm_size` db                          | `256mb`         | `512mb`      | `512mb`                  |
| `mem_limit` db                         | `768m`          | omit         | omit                     |
| `mem_limit` transcriber                | `1500m`         | `4g`         | omit                     |
| `mem_limit` app                        | `768m`          | omit         | omit                     |
| `mem_limit` worker                     | `512m`          | omit         | omit                     |
| `tmpfs /tmp` transcriber               | `512m`          | `1g`         | `1g`                     |
| `WORKER_TICK_MS`                       | `3000`          | `3000`       | `3000`                   |
| `WORKER_BATCH_SIZE` (runPendingJobs N) | `2`             | `5`          | `5`                      |
| `TRANSCRIBER_TIMEOUT_MS`               | `90000`         | `60000`      | `60000`                  |
| `pgadmin`                              | profile `debug` | sempre on    | sempre on                |
| `transcriber_cache` volume             | sim             | sim          | sim                      |
| `build.args.WHISPER_MODEL`             | `tiny`          | `base`       | `base`                   |
| `build.args.PORT`                      | `3001`          | `3000`       | `3001`                   |
