# Deploy via Coolify

Guia objetivo para subir o stack `transcripts` (Next.js + Elysia + Worker Bun + Transcriber Python + Postgres) em uma VPS rodando **Coolify v4**.

Arquivos relevantes:
- `docker-compose-coolify.yml` — compose alvo do Coolify
- `.env.coolify` — template de variáveis para o painel
- `Dockerfile` — build multi-stage Bun/Next
- `transcriber/Dockerfile` — FastAPI + faster-whisper

---

## 1. Pré-requisitos da VPS

- 4 vCPU / 8 GB RAM mínimo (8 vCPU / 16 GB recomendado se usar `WHISPER_MODEL=small+`).
- 40 GB SSD livre (modelos Whisper + uploads + DB).
- Docker 24+ instalado (Coolify provisiona automaticamente).
- DNS apontado para a VPS:
  - `app.seudominio.com` → IP da VPS (registro A).
  - opcional: `*.seudominio.com` (wildcard) para FQDNs auto-gerados.

## 2. Provisionar no Coolify

1. **Servers → Add Server** → adicionar VPS (SSH).
2. **Projects → New Project** → criar projeto `chegii-transcripts`.
3. **New Resource → Docker Compose - Empty** (não use "From Git" para Compose, use Empty + colar).
4. Em **Source**:
   - Git Repository: cole URL do repo.
   - Branch: `transcripts-cache-cicd` (ou `main`).
   - Build Pack: **Docker Compose**.
   - Docker Compose Location: `docker-compose-coolify.yml`.
5. **Domains**: o Coolify lerá `SERVICE_FQDN_APP_3000` do compose e gerará um FQDN automático. Para domínio próprio, edite o campo do serviço `app` com `https://app.seudominio.com:3000`.

## 3. Variáveis de ambiente

Vá em **Environment Variables** e cole o conteúdo de `.env.coolify`.

Regras:
- Variáveis prefixadas `SERVICE_*` ficam **vazias** — Coolify gera na 1ª build (senha do Postgres, segredos JWT base64, FQDN).
- `TRANSCRIPTION_PROVIDER=local` usa o container `transcriber`. Se preferir Groq/OpenAI, defina e preencha a respectiva key.
- `WHISPER_MODEL` afeta tempo de build (pré-download no Dockerfile do transcriber) e RAM em runtime:
  - `tiny` → ~150 MB / ~1 GB RAM.
  - `base` → ~300 MB / ~1.5 GB RAM.
  - `small` → ~600 MB / ~2.5 GB RAM.
- Marque "Build Variable" em `SERVICE_FQDN_APP` se o build do Next precisar embutir o domínio.

## 4. Volumes persistentes

Criados automaticamente, nomeados (sobrevivem a redeploy):
- `transcripts_db_data` → dados Postgres.
- `transcripts_uploads` → mídias enviadas pelos usuários.
- `transcripts_whisper_cache` → modelos baixados pelo faster-whisper.

Backup recomendado (Coolify → Backups): habilitar backup diário do volume `transcripts_db_data` para S3/Backblaze.

## 5. Healthchecks e ordem de boot

A cadeia de `depends_on` garante ordem:

```
db (healthy)
 └─ migrate (run-once → completed)
      └─ transcriber (healthy: HTTP /health)
           └─ app (healthy: HTTP /api/health)
                └─ worker (loop)
```

Se `app` ficar `unhealthy`, Coolify reinicia o container. O endpoint `/api/health` precisa estar implementado em `src/server/routes/health.ts` (já existe no projeto).

## 6. Roteamento (Traefik gerenciado pelo Coolify)

- Não declare `ports:` no compose — use `expose:`. Coolify injeta labels Traefik automaticamente a partir de `SERVICE_FQDN_*`.
- TLS (Let's Encrypt) é automático após o domínio resolver para a VPS.
- O serviço `transcriber` fica interno (sem FQDN). Acesso público bloqueado.
- O serviço `db` não tem `expose` nem `ports` — só rede interna.

## 7. Build e primeiro deploy

1. **Deploy** no painel. Logs em tempo real na aba **Deployment**.
2. Primeira build leva 8–15 min (Bun install + Next build + faster-whisper download do modelo).
3. Cache de build: Coolify reusa camadas Docker entre deploys. Force rebuild se trocar `WHISPER_MODEL`.

## 8. Pós-deploy

```bash
# Seed inicial (opcional, ssh na VPS):
docker exec -it $(docker ps -qf name=app) bun run db:seed

# Validar health:
curl https://<seu-fqdn>/api/health
```

Verificar via Coolify Logs:
- `db` → `database system is ready to accept connections`.
- `migrate` → `migrations applied` e `exited (0)`.
- `transcriber` → `Model loaded successfully` + `Uvicorn running`.
- `app` → `Ready in ...`.
- `worker` → ticks a cada `WORKER_INTERVAL_MS`.

## 9. Atualização

`git push` no branch configurado → Coolify auto-deploy (se webhook ativado). Caso contrário, **Redeploy** manual.

Para migrations novas: o serviço `migrate` roda sempre antes do `app`, então `bun run db:generate` localmente + commit das migrations em `drizzle/` é suficiente.

## 10. Troubleshooting

| Sintoma | Causa provável | Fix |
|---|---|---|
| `migrate exited 1` | DB ainda subindo | Coolify retry — aumente `start_period` do db |
| `app unhealthy` | `SERVICE_FQDN_APP` vazio na build | Marcar como Build Variable + Redeploy |
| Worker spam 401 | `INTERNAL_API_KEY` divergiu | Apagar var, salvar, redeploy (Coolify regera) |
| Upload 413 | Limite Traefik | Em **Advanced → Traefik labels** add `traefik.http.middlewares.app-limit.buffering.maxRequestBodyBytes=524288000` |
| Transcriber OOM | Modelo grande p/ VPS | Trocar para `tiny`/`base` |
| Disco cheio | `uploads` cresceu | Configurar política de retenção em `services/storage.ts` |

## 11. Custos esperados

- VPS Hetzner CX31 (8 GB / 4 vCPU) ~€10/mês — roda `tiny`/`base`.
- VPS Hetzner CPX41 (16 GB / 8 vCPU) ~€26/mês — roda `small`/`medium`.
- Storage adicional: ~€1/mês por 10 GB extra.

## 12. Checklist final

- [ ] DNS resolvendo para a VPS.
- [ ] `.env.coolify` colado no painel (vars `SERVICE_*` vazias).
- [ ] `TRANSCRIPTION_PROVIDER` correto (e key se externo).
- [ ] `WHISPER_MODEL` compatível com RAM da VPS.
- [ ] Backup do volume `db_data` agendado.
- [ ] Webhook GitHub → Coolify habilitado.
- [ ] `/api/health` responde 200.
- [ ] Worker logando ticks.
