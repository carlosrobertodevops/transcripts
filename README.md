# transcripts

SaaS de gerenciamento de transcrições de mídia (`.opus`, `.mp3`, `.wav`, `.flac`, `.mp4` e outros) → texto em **português do Brasil**.

## Stack

- **Bun** runtime + package manager
- **Next.js 16** (App Router, React 19, TypeScript)
- **Elysia** API montada via Route Handler
- **Drizzle ORM** + **PostgreSQL 16**
- **Zod 4** validação
- **Tailwind v4** + **ShadCN/UI** + **Lucide** + **Sonner**
- **JWT** (cookie httpOnly) + **bcrypt**
- Provedores transcrição: **Local Faster-Whisper** (default, gratuito) / **Groq Whisper-large-v3** / **OpenAI Whisper**

## Rodar local (sem Docker)

```bash
bun install
cp .env.example .env
# subir só o Postgres
docker compose up -d db
bun run db:generate
bun run db:migrate
bun run db:seed
bun run dev
```

App em http://localhost:3000.

## Rodar tudo via Docker

```bash
cp .env.example .env
docker compose up --build
# em outro terminal, primeira vez:
docker compose exec app bun run db:migrate
docker compose exec app bun run db:seed
```

## Conta seed

- **email**: `admin@transcripts.dev`
- **senha**: `admin123`
- **role**: `admin`

5 transcrições demo criadas.

## Estrutura

```
src/
  app/                # Next.js App Router (marketing, auth, app)
  components/         # UI (shadcn) + features
  server/             # Elysia API + plugins + routes + services
  db/                 # Drizzle client + schema + seed
  lib/                # auth, jwt, utils
  workers/            # job runner para transcrição
```

## Endpoints principais

| Método | Rota | Descrição |
| --- | --- | --- |
| POST | `/api/auth/register` | Criar conta |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/me` | Sessão atual |
| GET | `/api/transcripts?q=` | Listar (busca opcional) |
| POST | `/api/transcripts` | Criar |
| PATCH | `/api/transcripts/:id` | Atualizar |
| DELETE | `/api/transcripts/:id` | Deletar (admin) |
| PATCH | `/api/transcripts/reorder` | DnD persistir ordem |
| POST | `/api/transcripts/:id/media` | Upload múltiplo |
| POST | `/api/transcripts/:id/share` | Compartilhar por email |
| GET | `/api/notifications` | Notificações |
| POST | `/api/jobs/run` | Worker (interno) |

## Transcrição local (gratuita)

### Provedores

Suportados 3 provedores de transcrição:

1. **Faster-Whisper (local, recomendado)** — roda em container Python, gratuito, sem requisitos de API keys
2. **Groq Whisper Large-v3** — nuvem, rápido, requer `GROQ_API_KEY`
3. **OpenAI Whisper** — nuvem, requer `OPENAI_API_KEY`

### Configurar Faster-Whisper (padrão)

```bash
TRANSCRIPTION_PROVIDER=local
WHISPER_MODEL=base                    # tiny, base, small, medium, large
WHISPER_DEVICE=cuda                   # cuda (GPU) ou cpu
WHISPER_COMPUTE_TYPE=float16          # float16 (GPU) ou int8 (CPU)
TRANSCRIBER_URL=http://transcriber:8000
```

- **Modelos**: `tiny` (rápido), `base` (recomendado, balanceado), `small`, `medium`, `large` (melhor qualidade)
- **Device**: `cuda` para GPU NVIDIA, `cpu` para processamento em CPU
- **Compute type**: `float16` para GPU, `int8/int32` para CPU

### Container Python transcriber

Serviço rodando em `http://transcriber:8000` (docker-compose).

**Endpoint**: `POST http://transcriber:8000/transcribe`

Multipart form body:
```
file: (binary audio file)
language: pt (opcional, PT-BR otimizado)
```

Response:
```json
{
  "text": "transcrição do áudio",
  "language": "pt",
  "duration_seconds": 45.2
}
```

## Variáveis de ambiente

Veja [`.env.example`](./.env.example).

## Licença

MIT
# transcripts
