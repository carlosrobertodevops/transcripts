# Plano de CI/CD — Transcripts

**Escopo:** pipeline único parametrizável capaz de deployar a stack (Next.js + Bun + worker + transcriber Python + Postgres) em 6 plataformas distintas. Stack roda em **ARM64** preferencial; CI builda imagens multi-arch (amd64 + arm64) e empurra para registry.

**Plataformas cobertas:**

1. VPS + **EasyPanel**
2. VPS + **Coolify**
3. **AWS** (ECS Fargate ARM ou EC2 t4g)
4. **Azure** (Container Apps ou App Service)
5. **Digital Ocean** (Droplet + Compose ou App Platform)
6. **Oracle Cloud Infrastructure** (Ampere A1 Always Free)

**Princípio:** 1 workflow GitHub Actions, N targets via reusable workflows + matrix + env-scoped secrets. Build & push 1x; deploy N targets via dispatch ou trigger.

---

## 0. Estado atual auditado

- Sem `.github/workflows/` (agente criou 3 arquivos durante research — **decidir manter, mover p/ `docs/` ou descartar** antes do PR1).
- Sem `test`, `typecheck`, `format` em `package.json`. Só `lint: next lint`.
- Sem suíte de testes (`bun test`, `vitest`, `jest`).
- `.env.example` com 10 vars (5 secrets, 5 públicas).
- `.dockerignore` correto.
- `bun.lock` commitado.
- Sem pre-commit (`.husky/`, `lefthook`).
- Lint só herda `eslint-config-next` default.

**Implicação:** pipeline arranca minimalista (lint + build + image push) e cresce com fundações (test, typecheck, security scan) em ondas.

---

## 1. Fundações antes do CI (Onda 0)

Sem isso CI vira teatro:

| #   | Ação                                                                                                                            | Por quê                                    |
| --- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| 0.1 | Adicionar `typecheck: tsc --noEmit` em `package.json` scripts                                                                   | Pegar erros TS em CI sem build full        |
| 0.2 | Adicionar `format: prettier --write` + `format:check` (ou Biome)                                                                | Quality gate                               |
| 0.3 | Endpoint `GET /api/health` em Elysia (`src/server/routes/health.ts`) retornando `{ ok: true, db: <ping>, transcriber: <ping> }` | Usado por Docker HEALTHCHECK + plataformas |
| 0.4 | Adicionar `bun test` skeleton + 1 smoke test (`src/lib/__tests__/zod.test.ts`)                                                  | CI roda algo real                          |
| 0.5 | `lefthook` ou `husky` pre-commit: lint + typecheck arquivos staged                                                              | Bloqueia commits ruins                     |
| 0.6 | `commitlint` + Conventional Commits enforcement                                                                                 | Já é convenção; tornar obrigatório         |
| 0.7 | `.github/dependabot.yml` semanal p/ Bun + Python + Actions                                                                      | Atualizações automáticas                   |
| 0.8 | Mover/descartar `.github/{GITHUB_ACTIONS_GUIDE.md, workflows/PATTERNS.yml, workflows/ci-cd.yml}` (criados sem autorização)      | Reset limpo antes do plano oficial         |

---

## 2. Arquitetura do pipeline

### 2.1 Trigger model

```
push → main          → CI full + image tag :main-{sha} + deploy staging auto
push → tags v*       → CI full + image tag :{version} + deploy prod (manual approval)
pull_request         → CI sem deploy
workflow_dispatch    → deploy manual escolhendo target + env
```

### 2.2 Estrutura de arquivos

```
.github/
├── dependabot.yml
├── CODEOWNERS
└── workflows/
    ├── ci.yml                    # roda em PR e push (lint, typecheck, test, build)
    ├── release.yml               # roda em tag v*; cria GitHub Release + changelog
    ├── images.yml                # reusable: build & push 4 images multi-arch
    ├── deploy-easypanel.yml      # reusable
    ├── deploy-coolify.yml        # reusable
    ├── deploy-aws-ecs.yml        # reusable
    ├── deploy-aws-ec2.yml        # reusable (SSH compose pull)
    ├── deploy-azure-aca.yml      # reusable (Container Apps)
    ├── deploy-do-droplet.yml     # reusable (SSH compose pull)
    ├── deploy-do-app.yml         # reusable (App Platform)
    ├── deploy-oci-vm.yml         # reusable (SSH compose pull em Ampere A1)
    └── deploy.yml                # orchestrator: workflow_dispatch escolhe target
```

### 2.3 Registry

Imagens canônicas em **GitHub Container Registry (GHCR)** — grátis, integrado, multi-arch, push via `GITHUB_TOKEN`:

```
ghcr.io/<org>/<repo>/app:<tag>
ghcr.io/<org>/<repo>/worker:<tag>
ghcr.io/<org>/<repo>/migrate:<tag>
ghcr.io/<org>/<repo>/transcriber:<tag>
```

Mirroring opcional para registry da plataforma (ECR, ACR, OCIR, DOCR) só quando exigido por billing/network.

### 2.4 Tagging

| Trigger    | Tags                          |
| ---------- | ----------------------------- |
| push main  | `main-{sha7}`, `main`         |
| tag v1.2.3 | `1.2.3`, `1.2`, `1`, `latest` |
| PR #42     | `pr-42` (efêmero, expira 7d)  |

---

## 3. Workflow `ci.yml` (esqueleto)

```yaml
name: CI
on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: ${{ github.event_name == 'pull_request' }}

jobs:
  lint-typecheck:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with: { bun-version: 1.3 }
      - uses: actions/cache@v4
        with:
          path: |
            ~/.bun/install/cache
            node_modules
          key: bun-${{ runner.os }}-${{ hashFiles('bun.lock') }}
      - run: bun install --frozen-lockfile
      - run: bun run lint
      - run: bun run typecheck

  test:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: transcripts
          POSTGRES_PASSWORD: transcripts
          POSTGRES_DB: transcripts_test
        ports: ["5432:5432"]
        options: >-
          --health-cmd "pg_isready -U transcripts"
          --health-interval 5s --health-timeout 5s --health-retries 10
    env:
      DATABASE_URL: postgres://transcripts:transcripts@localhost:5432/transcripts_test
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with: { bun-version: 1.3 }
      - uses: actions/cache@v4
        with: { path: ~/.bun/install/cache, key: bun-${{ runner.os }}-${{ hashFiles('bun.lock') }} }
      - run: bun install --frozen-lockfile
      - run: bun run db:migrate
      - run: bun test

  build-images:
    needs: [lint-typecheck, test]
    if: github.event_name == 'push'
    uses: ./.github/workflows/images.yml
    secrets: inherit
```

### 3.1 `images.yml` (reusable, multi-arch matrix)

```yaml
on: { workflow_call: {} }

jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    strategy:
      fail-fast: false
      matrix:
        include:
          - name: app
            dockerfile: Dockerfile
            context: .
            args: "PORT=3001"
          - name: worker
            dockerfile: Dockerfile
            context: .
            args: "PORT=3001"
          - name: migrate
            dockerfile: Dockerfile
            target: migrate
            context: .
          - name: transcriber
            dockerfile: transcriber/Dockerfile
            context: ./transcriber
            args: "WHISPER_MODEL=tiny"
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-qemu-action@v3
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/metadata-action@v5
        id: meta
        with:
          images: ghcr.io/${{ github.repository }}/${{ matrix.name }}
          tags: |
            type=ref,event=branch
            type=sha,prefix=main-,format=short
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}
      - uses: docker/build-push-action@v6
        with:
          context: ${{ matrix.context }}
          file: ${{ matrix.dockerfile }}
          target: ${{ matrix.target || '' }}
          build-args: ${{ matrix.args }}
          platforms: linux/amd64,linux/arm64
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha,scope=${{ matrix.name }}
          cache-to: type=gha,scope=${{ matrix.name }},mode=max
```

---

## 4. Targets de deploy (resumo decisivo)

| #   | Plataforma                        | Custo/mês USD                      | ARM64              | Trigger                                                | Caveat                                              |
| --- | --------------------------------- | ---------------------------------- | ------------------ | ------------------------------------------------------ | --------------------------------------------------- |
| 1   | EasyPanel                         | ~$5 + VPS ($6+)                    | Sim (VPS)          | webhook                                                | EasyPanel API token simples; build no servidor pesa |
| 2   | Coolify                           | $0 (self-host) + VPS ($6+)         | Sim                | API REST `POST /api/v1/applications/:id/deploy`        | Mais features que EasyPanel; UX similar             |
| 3   | AWS ECS Fargate ARM               | ~$100 (app+worker+transcriber+RDS) | Graviton           | OIDC + `aws ecs update-service --force-new-deployment` | Setup VPC/IAM complexo                              |
| 3b  | AWS EC2 t4g.medium + Compose      | ~$23 (incluindo Postgres local)    | Graviton t4g       | SSH + `docker compose pull && up -d`                   | Single point of failure                             |
| 4   | Azure Container Apps              | ~$60-80                            | Sim (Ampere)       | `azure/container-apps-deploy-action@v2` + OIDC         | Escala-a-zero nativa                                |
| 4b  | Azure App Service Linux Container | ~$55                               | Limitado           | webhook continuous deploy via ACR                      | Multi-container apenas via Compose limitado         |
| 5   | DO Droplet $8 + Managed PG $15    | ~$23                               | Não (x86)          | SSH + compose                                          | Sem ARM                                             |
| 5b  | DO App Platform                   | ~$12 + DB                          | Não                | git push                                               | Multi-service nativo                                |
| 6   | Oracle Ampere A1 Always Free      | **$0**                             | Sim (4 cores/24GB) | SSH + compose                                          | Termination policy se inativo; OCI CLI menos polida |

**Recomendação por estágio:**

- **Solo dev / MVP:** Oracle A1 Free Tier (custo $0; ARM 24GB cobre tudo)
- **Startup early:** EasyPanel/Coolify em DO/Hetzner Droplet ARM se disponível
- **Tração:** AWS ECS Fargate ARM (auto-scale, RDS managed) ou Azure Container Apps (escala-a-zero ajuda bill)
- **Enterprise:** AWS Fargate ou AKS conforme política org

---

## 5. Especificações por target

### 5.1 EasyPanel

**Setup:**

1. EasyPanel → criar App → Source = "Docker Image" → `ghcr.io/<org>/<repo>/app:main` (e idem worker, transcriber).
2. Criar Postgres add-on managed pelo EasyPanel (interno).
3. Token de API: EasyPanel → Settings → API → criar token. Salvar em GitHub Secret `EASYPANEL_TOKEN`.
4. URL do painel salvar em `EASYPANEL_URL`.

**`deploy-easypanel.yml`:**

```yaml
on: { workflow_call: { inputs: { tag: { type: string, required: true } } } }
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger EasyPanel redeploy (app + worker + transcriber)
        env:
          EP_URL: ${{ secrets.EASYPANEL_URL }}
          EP_TOKEN: ${{ secrets.EASYPANEL_TOKEN }}
          TAG: ${{ inputs.tag }}
        run: |
          for svc in app worker transcriber; do
            curl -sSf -X POST "$EP_URL/api/trpc/projects.deployService" \
              -H "Authorization: Bearer $EP_TOKEN" \
              -H "Content-Type: application/json" \
              -d "{\"projectName\":\"transcripts\",\"serviceName\":\"$svc\",\"image\":\"ghcr.io/${{ github.repository }}/$svc:$TAG\"}"
          done
```

**Notas:**

- EasyPanel não tem webhook oficial documentado uniforme; usar tRPC API direto. Verificar endpoint exato em https://easypanel.io/docs (path pode variar por versão).
- Pull privado de GHCR: configurar Registry Credentials no EasyPanel com Personal Access Token (PAT) tendo `read:packages`.

### 5.2 Coolify

**Setup:**

1. Coolify → New Resource → Docker Compose. Apontar p/ `docker-compose-easypanel.yml` ou variante específica.
2. Configurar Source: GitHub repo + branch main.
3. API token: Coolify → Settings → API → criar. Salvar em `COOLIFY_TOKEN`, `COOLIFY_URL`, `COOLIFY_APP_UUID`.

**`deploy-coolify.yml`:**

```yaml
on: { workflow_call: {} }
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Coolify deploy
        env:
          URL: ${{ secrets.COOLIFY_URL }}
          TOKEN: ${{ secrets.COOLIFY_TOKEN }}
          UUID: ${{ secrets.COOLIFY_APP_UUID }}
        run: |
          curl -sSf -X POST "$URL/api/v1/applications/$UUID/deploy" \
            -H "Authorization: Bearer $TOKEN" \
            -H "Content-Type: application/json" \
            -d '{"branch":"main"}'
```

**Notas:**

- Coolify v4: ✓ rolling deploy nativo via Docker Compose.
- Webhook GitHub também é opção (Coolify gera URL única); preferir API token p/ controle no CI.

### 5.3 AWS ECS Fargate ARM

**Setup IaC** (Terraform recomendado, fora do escopo deste workflow):

- ECR repos: `transcripts/app`, `transcripts/worker`, `transcripts/transcriber`.
- ECS Cluster + 3 Services (app, worker, transcriber) + Task Definitions ARM64 (`runtimePlatform: { cpuArchitecture: ARM64, operatingSystemFamily: LINUX }`).
- RDS Postgres 16 (db.t4g.micro $13-15/mês).
- ALB roteando p/ service `app`.
- IAM Role OIDC `gha-deploy-role` com trust policy `token.actions.githubusercontent.com`.

**`deploy-aws-ecs.yml`:**

```yaml
on:
  {
    workflow_call:
      {
        inputs:
          {
            tag: { type: string, required: true },
            env: { type: string, required: true },
          },
      },
  }
permissions:
  id-token: write
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: ${{ vars.AWS_REGION }}
      - name: Mirror images GHCR → ECR
        run: |
          aws ecr get-login-password --region ${{ vars.AWS_REGION }} | \
            docker login --username AWS --password-stdin ${{ vars.AWS_ECR_REGISTRY }}
          for svc in app worker transcriber; do
            docker buildx imagetools create \
              -t ${{ vars.AWS_ECR_REGISTRY }}/transcripts/$svc:${{ inputs.tag }} \
              ghcr.io/${{ github.repository }}/$svc:${{ inputs.tag }}
          done
      - name: Force new deployment
        run: |
          for svc in app worker transcriber; do
            aws ecs update-service \
              --cluster transcripts-${{ inputs.env }} \
              --service $svc \
              --force-new-deployment
          done
      - name: Wait stable
        run: |
          aws ecs wait services-stable \
            --cluster transcripts-${{ inputs.env }} \
            --services app worker transcriber
```

**Variante MVP — EC2 t4g.medium + Compose** (mais barato, sem auto-scale):

```yaml
- name: SSH deploy
  uses: appleboy/ssh-action@v1
  with:
    host: ${{ secrets.EC2_HOST }}
    username: ubuntu
    key: ${{ secrets.EC2_SSH_KEY }}
    script: |
      cd /srv/transcripts
      docker compose pull
      docker compose up -d --remove-orphans
      docker image prune -f
```

### 5.4 Azure Container Apps

**Setup:**

- Resource Group `rg-transcripts`.
- Container Apps Environment `cae-transcripts` (Consumption plan).
- 3 Container Apps: `ca-app`, `ca-worker`, `ca-transcriber`.
- Azure Database for PostgreSQL Flexible Server (Burstable B1ms ARM ≈ $13/mês).
- ACR `acrtranscripts` (Basic $5/mês).
- Federated credential GitHub → Azure AD App p/ OIDC.

**`deploy-azure-aca.yml`:**

```yaml
on: { workflow_call: { inputs: { tag: { type: string, required: true } } } }
permissions:
  id-token: write
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
      - name: Mirror images to ACR
        run: |
          az acr login -n acrtranscripts
          for svc in app worker transcriber; do
            docker buildx imagetools create \
              -t acrtranscripts.azurecr.io/transcripts/$svc:${{ inputs.tag }} \
              ghcr.io/${{ github.repository }}/$svc:${{ inputs.tag }}
          done
      - name: Update Container Apps
        run: |
          for svc in app worker transcriber; do
            az containerapp update \
              -n ca-$svc -g rg-transcripts \
              --image acrtranscripts.azurecr.io/transcripts/$svc:${{ inputs.tag }}
          done
```

**Notas:**

- Container Apps escala-a-zero: economia óbvia p/ ambientes staging.
- Worker em ACA: usar `minReplicas: 1` p/ não dormir polling.

### 5.5 Digital Ocean

**Variante A — Droplet $8/mês + Managed Postgres $15:**
Mesmo padrão SSH + compose pull do EC2.

```yaml
- name: SSH deploy
  uses: appleboy/ssh-action@v1
  with:
    host: ${{ secrets.DO_DROPLET_HOST }}
    username: deploy
    key: ${{ secrets.DO_SSH_KEY }}
    script: |
      cd /srv/transcripts
      echo ${{ secrets.GITHUB_TOKEN }} | docker login ghcr.io -u ${{ github.actor }} --password-stdin
      docker compose pull
      docker compose up -d --remove-orphans
```

**Variante B — App Platform:**

- `do-app-spec.yml` define services (app, worker, transcriber) + database addon.
- Deploy:

```yaml
- uses: digitalocean/app_action@v2
  with:
    app_name: transcripts
    token: ${{ secrets.DO_API_TOKEN }}
```

### 5.6 Oracle Cloud Ampere A1 Always Free

**Setup:**

- VM.Standard.A1.Flex 4 OCPU / 24GB RAM ARM Ubuntu 22.04 (Always Free).
- Postgres em container (não usa Autonomous DB — pricing complica).
- Firewall: 80, 443, 22.
- Caddy ou Traefik p/ TLS.

**`deploy-oci-vm.yml`:** mesmo padrão SSH:

```yaml
- name: SSH deploy
  uses: appleboy/ssh-action@v1
  with:
    host: ${{ secrets.OCI_HOST }}
    username: ubuntu
    key: ${{ secrets.OCI_SSH_KEY }}
    script: |
      cd /srv/transcripts
      echo ${{ secrets.GITHUB_TOKEN }} | docker login ghcr.io -u ${{ github.actor }} --password-stdin
      docker compose -f docker-compose-easypanel.yml pull
      docker compose -f docker-compose-easypanel.yml up -d
```

**Caveats Oracle:**

- Termination policy: instances inativas >7 dias podem ser reciclas. Mitigação: cron interno `*/30 * * * * curl localhost/api/health > /dev/null`.
- A1 capacity: às vezes região não tem capacity; tentar outras regiões.
- 24GB RAM cobre toda stack folgado (vs 4GB EasyPanel).

---

## 6. Orquestrador `deploy.yml`

```yaml
name: Deploy
on:
  workflow_dispatch:
    inputs:
      target:
        type: choice
        options:
          [
            easypanel,
            coolify,
            aws-ecs,
            aws-ec2,
            azure-aca,
            do-droplet,
            do-app,
            oci-vm,
          ]
        required: true
      env:
        type: choice
        options: [staging, prod]
        required: true
      tag:
        type: string
        required: true
  push:
    branches: [main] # auto-deploy staging para target default
    tags: ["v*"] # auto-deploy prod (com approval)

jobs:
  deploy:
    name: Deploy ${{ inputs.target }} (${{ inputs.env }})
    environment: ${{ inputs.env || 'staging' }} # requer approval em prod
    uses: ./.github/workflows/deploy-${{ inputs.target || vars.DEFAULT_TARGET }}.yml
    with:
      tag: ${{ inputs.tag || github.ref_name }}
      env: ${{ inputs.env || 'staging' }}
    secrets: inherit
```

GitHub Environment `prod` configurado com **required reviewers** = aprovação manual antes do deploy production.

---

## 7. Secrets & vars matrix

Por GitHub Environment (staging/prod) — ou Repository Secrets quando único:

| Secret                                                        | Targets que usam    |
| ------------------------------------------------------------- | ------------------- |
| `EASYPANEL_URL`, `EASYPANEL_TOKEN`                            | easypanel           |
| `COOLIFY_URL`, `COOLIFY_TOKEN`, `COOLIFY_APP_UUID`            | coolify             |
| `AWS_ROLE_ARN` (var: `AWS_REGION`, `AWS_ECR_REGISTRY`)        | aws-ecs, aws-ec2    |
| `EC2_HOST`, `EC2_SSH_KEY`                                     | aws-ec2             |
| `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID` | azure-aca           |
| `DO_API_TOKEN`                                                | do-app              |
| `DO_DROPLET_HOST`, `DO_SSH_KEY`                               | do-droplet          |
| `OCI_HOST`, `OCI_SSH_KEY`                                     | oci-vm              |
| `JWT_SECRET`, `JWT_REFRESH_SECRET`, `INTERNAL_API_KEY`        | runtime app/worker  |
| `GROQ_API_KEY`, `OPENAI_API_KEY`                              | runtime conditional |

OIDC (federated) preferido sobre long-lived keys quando suportado: AWS, Azure, GCP ✓.

---

## 8. Segurança (gate antes do deploy)

| Etapa           | Ferramenta                                              | Quando                     |
| --------------- | ------------------------------------------------------- | -------------------------- |
| Secret scan     | `trufflesecurity/trufflehog@v3`                         | toda PR                    |
| Dependency scan | `bun audit` + `dependabot`                              | toda PR + semanal          |
| Image scan      | `aquasecurity/trivy-action@v0` severidade HIGH+CRITICAL | após build, antes push tag |
| SBOM            | `anchore/sbom-action@v0`                                | em release                 |
| SAST            | `github/codeql-action@v3`                               | semanal cron               |
| License check   | `fossa-contrib/fossa-action@v3` (opcional)              | em release                 |

Trivy bloqueia merge se CRITICAL.

---

## 9. Observabilidade pós-deploy

Após cada deploy, smoke test:

```yaml
- name: Smoke test
  run: |
    sleep 30
    curl -fsS https://${{ vars.APP_HOST }}/api/health | jq -e '.ok == true'
```

Notificações:

- Slack/Discord webhook em falha.
- Sentry release tracking (`getsentry/action-release@v1`).

---

## 10. Ordem de implementação (PR sequence)

| PR  | Onda | Conteúdo                                                                      | Risco                 |
| --- | ---- | ----------------------------------------------------------------------------- | --------------------- |
| 1   | 0    | Decidir destino dos arquivos `.github/*` já criados; resetar                  | Baixo                 |
| 2   | 0    | Add `typecheck`, `format`, `/api/health`, `bun test` skeleton, `lefthook`     | Baixo                 |
| 3   | A    | `ci.yml` (lint + typecheck + test) + `dependabot.yml`                         | Baixo                 |
| 4   | A    | `images.yml` reusable + push GHCR multi-arch                                  | Médio (testar buildx) |
| 5   | B    | `deploy.yml` orchestrator + 1 target (escolher Oracle Free Tier OU EasyPanel) | Médio                 |
| 6   | B    | Adicionar 2º target                                                           | Baixo                 |
| 7   | C    | Trivy + bun audit gate                                                        | Baixo                 |
| 8   | C    | Demais targets sob demanda                                                    | Conforme uso          |
| 9   | D    | Release workflow (tag → version bump → changelog → deploy prod)               | Médio                 |

---

## 11. Decisões pendentes (precisam input)

1. **Plataforma inicial:** Oracle Free Tier ($0) vs EasyPanel atual (já configurado) — qual virá primeiro?
2. **Registry:** GHCR único, ou mirror obrigatório p/ ECR/ACR/OCIR/DOCR?
3. **Estratégia tags:** semver puro vs SHA puro vs ambos?
4. **Multi-env:** staging + prod necessários desde início, ou só prod até escalar?
5. **Approval gate:** required reviewers em prod sim/não?
6. **Arquivos `.github/*` já criados pelo agente:** manter, mover p/ `docs/cicd-draft/`, ou apagar?

---

## 12. Comparação financeira (1 ano, MVP)

| Cenário                                 | $/mês | $/ano | Caveat                    |
| --------------------------------------- | ----- | ----- | ------------------------- |
| Oracle A1 Free                          | $0    | $0    | Termination risk          |
| EasyPanel + Hetzner CAX21 ARM ($7)      | $7    | $84   | Self-hosted control plane |
| Coolify + Hetzner CAX21 ($7)            | $7    | $84   | Same                      |
| DO Droplet $8 + Managed PG $15          | $23   | $276  | Sem ARM                   |
| AWS EC2 t4g.medium + Postgres container | $23   | $276  | Single host               |
| Azure Container Apps (consumo médio)    | $60   | $720  | Escala-a-zero ajuda       |
| AWS ECS Fargate ARM + RDS               | $100  | $1200 | Production-grade          |

---

## 13. Itens fora de escopo (futuro)

- Preview environments por PR (cada PR sobe stack efêmera).
- Blue/green via ALB target group swap (AWS).
- Canary deploys com weighted routing.
- Argo CD / Flux p/ GitOps em Kubernetes.
- E2E tests Playwright em CI (depende de ter o `bun test` rodando).
- Performance regression bench (k6 / Lighthouse CI).
