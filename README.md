# transcripts

SaaS de gerenciamento de transcrições de mídia (`.opus`, `.mp3`, `.wav`, `.flac`, `.mp4` e outros) → texto em **português do Brasil**.

## Stack

- **Bun** runtime + package manager
- **Next.js 16** (App Router, React 19, TypeScript)
- **Elysia** API montada via Route Handler
- **Drizzle ORM** + **PostgreSQL 16**
- **Zod 4** validação
- **Tailwind v4** + **ShadCN/UI** + **Lucide** + **Sonner** + **Framer Motion**
- **JWT** (cookie httpOnly) + **bcrypt**
- Provedores transcrição: **Local Faster-Whisper** (default, gratuito) / **Groq Whisper-large-v3** / **OpenAI Whisper**

## Recursos

- Transcrição automática com múltiplos provedores (Local Faster-Whisper, Groq, OpenAI)
- Dashboard responsivo com busca por conteúdo
- Upload múltiplo de mídia com drag-and-drop
- Reordenação de transcrições via drag-and-drop
- Compartilhamento de transcrições por email (usuários convidados podem editar)
- Notificações em tempo real (sino de notificações)
- Transições de página animadas com Framer Motion
- Bordas brilhantes animadas em cards
- Layout de login com split 2/3 responsivo
- Edição inline de transcrições

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

**Nota**: O container `app` aguarda que o `db` esteja saudável antes de iniciar. Os comandos de migração e seed devem ser executados após o build.

## Conta seed

Contas padrão criadas após `bun run db:seed`:

**Admin:**
- **email**: `admin@transcripts.dev`
- **senha**: `admin123`

**Usuário comum:**
- **email**: `user@transcripts.dev`
- **senha**: `user123`

5 transcrições demo pré-carregadas (visíveis após login).

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

## Troubleshooting

### Build falha em type check

Se o build falhar com erros de tipo relacionados a `getTranscriptDetail`, verifique se a projeção de campos em `src/server/routes/transcripts.ts` ou `src/server/services/transcription.ts` corresponde aos tipos definidos em `src/db/schema.ts`, especialmente na tabela `MediaSection`.

**Solução comum:**
```bash
# Regenerar tipos Drizzle
bun run db:generate

# Recompile
bun run build
```

### Docker compose falha ao conectar ao banco

Se a aplicação não conseguir conectar ao PostgreSQL, verifique:

1. O container `db` está saudável: `docker compose ps`
2. A variável `DATABASE_URL` em `.env` usa o hostname correto: `db` (não `localhost`)
3. Aguarde alguns segundos após `docker compose up --build` antes de rodar migrations

### Transcrição não inicia

Se jobs de transcrição ficarem pendurados:

1. Confirme que `TRANSCRIPTION_PROVIDER` está definido em `.env`
2. Se usar **Groq** ou **OpenAI**, verifique as chaves de API (`GROQ_API_KEY`, `OPENAI_API_KEY`)
3. Se usar **Local Faster-Whisper**, confirme que o container `transcriber` (ou seu equivalent) está rodando
4. Verifique logs: `docker compose logs app`

## Licença

MIT
# transcripts
