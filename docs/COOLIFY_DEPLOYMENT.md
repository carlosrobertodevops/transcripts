# Coolify Deployment Guide: Multi-Service Stack

## 1. Magic Environment Variables

Coolify auto-generates and injects env vars via `SERVICE_*` pattern. Persists across deployments.

### Syntax
```
SERVICE_URL_<SERVICE>           → http://<SERVICE>-<HASH>.example.com
SERVICE_URL_<SERVICE>_<PORT>    → proxies to specific port, adds path: /api
SERVICE_FQDN_<SERVICE>          → <SERVICE>-<HASH>.example.com (no protocol)
SERVICE_PASSWORD_<SERVICE>      → auto-generated password, reusable across services
```

### Example (your stack)
```yaml
services:
  app:
    environment:
      # URL: http://app-vgsco4o.example.com
      - SERVICE_URL_APP
      # FQDN: app-vgsco4o.example.com
      - APP_DOMAIN=${SERVICE_FQDN_APP}
      # URL with port 3000: http://app-vgsco4o.example.com
      - SERVICE_URL_APP_3000
      # Reuse DB password across services
      - DB_PASSWORD=${SERVICE_PASSWORD_POSTGRES}

  worker:
    environment:
      # Worker lives internally (no domain needed)
      # But can reach app via docker network
      - APP_API_URL=http://app:3000
      # Use same DB password
      - DB_PASSWORD=${SERVICE_PASSWORD_POSTGRES}

  transcriber:
    environment:
      # FastAPI service, internal only
      - SERVICE_URL_TRANSCRIBER_8000
      - TRANSCRIBER_PORT=8000

  postgres:
    image: postgres:16
    environment:
      - POSTGRES_PASSWORD=${SERVICE_PASSWORD_POSTGRES}
    volumes:
      - postgres_data:/var/lib/postgresql/data
```

**Key:** `SERVICE_PASSWORD_<SERVICE>` is identical each time Coolify regenerates.

---

## 2. Traefik Labels & Service Exposure

Coolify uses Traefik for routing. Expose services via labels.

```yaml
services:
  app:
    image: node:20
    labels:
      # Auto-expose to domain (Coolify detects SERVICE_FQDN_APP)
      - traefik.http.routers.app.rule=Host(`${SERVICE_FQDN_APP}`)
      - traefik.http.services.app.loadbalancer.server.port=3000

  transcriber:
    image: transcriber:latest
    labels:
      # Internal service: no traefik router needed
      # Accessible via docker network as hostname 'transcriber'
    ports:
      - "8000:8000"

  # Database: never expose
  postgres:
    image: postgres:16
    # No labels, no ports exposed
```

**Internal networking:** Services reach each other by hostname:
- `app` calls `http://postgres:5432` (no Traefik involved)
- `worker` calls `http://app:3000` (same compose network)
- `app` calls `http://transcriber:8000` when `TRANSCRIPTION_PROVIDER=local`

---

## 3. Persistent Storage & Volumes

Named volumes survive container restarts.

```yaml
volumes:
  postgres_data:          # Postgres data
  uploads:                # Media uploads (STORAGE_DIR)

services:
  app:
    volumes:
      - uploads:/app/uploads

  postgres:
    volumes:
      - postgres_data:/var/lib/postgresql/data
```

**Recommendation:** Use managed PostgreSQL if Coolify offers it (reduces ops burden).

---

## 4. Health Checks

Coolify respects Docker health checks for orchestration.

```yaml
services:
  app:
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 10s
      timeout: 5s
      retries: 3

  postgres:
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 3

  transcriber:
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 15s
      timeout: 5s
      retries: 3
```

---

## 5. Build vs Pre-built Images

### Dev/Local: Build in Compose
```yaml
app:
  build:
    context: .
    dockerfile: Dockerfile
  environment:
    - NODE_ENV=development
```

### Production: Pre-built from Registry
```yaml
app:
  image: ghcr.io/yourorg/transcripts-app:latest
  # Coolify pulls from registry, no build overhead
```

**Strategy:** 
- Push built image to GHCR/Docker Hub via CI (GitHub Actions)
- Compose pulls pre-built in production
- Speeds deploy, reduces build time on Coolify

---

## 6. Connection String Pattern (Next.js App → Postgres)

In Docker Compose network, services resolve by hostname.

```yaml
# Compose
postgres:
  image: postgres:16
  environment:
    POSTGRES_DB: transcripts
    POSTGRES_USER: app
    POSTGRES_PASSWORD: ${SERVICE_PASSWORD_POSTGRES}

app:
  environment:
    # Inside container, postgres resolves to postgres:5432
    - DATABASE_URL=postgresql://app:${SERVICE_PASSWORD_POSTGRES}@postgres:5432/transcripts
```

**No Service URL needed for internal Postgres.** Only use `SERVICE_PASSWORD_POSTGRES` for password injection.

---

## 7. Worker & Sidecar Communication

```yaml
app:
  environment:
    - INTERNAL_API_KEY=${SERVICE_PASSWORD_INTERNAL_API}
    # Health endpoint for worker checks
    - HEALTH_CHECK_URL=http://app:3000/health

worker:
  image: node:20-alpine
  command: bun run worker:loop
  environment:
    # Worker reaches app via docker network
    - API_URL=http://app:3000
    - INTERNAL_API_KEY=${SERVICE_PASSWORD_INTERNAL_API}
  depends_on:
    app:
      condition: service_healthy

transcriber:
  image: transcriber:latest
  environment:
    - PORT=8000
  # App reaches transcriber at http://transcriber:8000
```

---

## 8. Secrets: .env vs Coolify UI

### Best Practice
1. **Coolify UI:** Set non-sensitive env vars + magic vars
   - `NODE_ENV=production`
   - `SERVICE_PASSWORD_POSTGRES` (auto-generated)
   - `JWT_SECRET` (generate once, paste into UI)

2. **.env file (gitignored):**
   - Local dev only
   - Not committed; ignored in Coolify

3. **Docker Compose:**
   - Reference `${VAR_NAME}` — Coolify injects at deploy time
   - Never hardcode secrets

### Example .env (local only)
```bash
DATABASE_URL=postgresql://app:postgres@localhost:5432/transcripts
JWT_SECRET=dev-key-only
INTERNAL_API_KEY=dev-only
GROQ_API_KEY=sk-...
```

---

## 9. Recommended docker-compose.yml for Coolify

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: transcripts
      POSTGRES_USER: app
      POSTGRES_PASSWORD: ${SERVICE_PASSWORD_POSTGRES:?}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app"]
      interval: 10s
      timeout: 5s
      retries: 3
    networks:
      - internal

  app:
    image: ${APP_IMAGE:-node:20-alpine}  # or ghcr.io/yourorg/app:latest in prod
    build:
      context: .
      dockerfile: Dockerfile
    environment:
      NODE_ENV: ${NODE_ENV:?production}
      DATABASE_URL: postgresql://app:${SERVICE_PASSWORD_POSTGRES}@postgres:5432/transcripts
      INTERNAL_API_KEY: ${SERVICE_PASSWORD_INTERNAL_API:?}
      TRANSCRIPTION_PROVIDER: ${TRANSCRIPTION_PROVIDER:?groq}
      GROQ_API_KEY: ${GROQ_API_KEY:?}
      STORAGE_DIR: /app/uploads
      NEXT_PUBLIC_APP_URL: ${SERVICE_URL_APP:?}
      JWT_SECRET: ${JWT_SECRET:?}
    volumes:
      - uploads:/app/uploads
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 10s
      timeout: 5s
      retries: 3
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - internal
    labels:
      traefik.http.routers.app.rule: Host(`${SERVICE_FQDN_APP:?}`)
      traefik.http.services.app.loadbalancer.server.port: "3000"

  worker:
    image: ${APP_IMAGE:-node:20-alpine}
    build:
      context: .
      dockerfile: Dockerfile
    command: bun run worker:loop
    environment:
      NODE_ENV: ${NODE_ENV:?production}
      DATABASE_URL: postgresql://app:${SERVICE_PASSWORD_POSTGRES}@postgres:5432/transcripts
      API_URL: http://app:3000
      INTERNAL_API_KEY: ${SERVICE_PASSWORD_INTERNAL_API}
      TRANSCRIPTION_PROVIDER: ${TRANSCRIPTION_PROVIDER:?groq}
    depends_on:
      app:
        condition: service_healthy
    networks:
      - internal
    restart: always

  transcriber:
    image: transcriber:latest
    build:
      context: ./transcriber
      dockerfile: Dockerfile
    environment:
      PORT: "8000"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 15s
      timeout: 5s
      retries: 3
    networks:
      - internal
    restart: always

volumes:
  postgres_data:
  uploads:

networks:
  internal:
    driver: bridge
```

---

## 10. Deployment Checklist

- [ ] Use pre-built image (`ghcr.io/...`) in production
- [ ] Set `NODE_ENV=production` in Coolify UI
- [ ] Generate `JWT_SECRET`, `INTERNAL_API_KEY` once; paste in UI (not in repo)
- [ ] `SERVICE_PASSWORD_POSTGRES` auto-generated by Coolify
- [ ] All internal services (worker, transcriber, postgres) use `networks: [internal]`
- [ ] Only `app` has Traefik labels (exposes domain)
- [ ] Database URL uses hostname `postgres:5432` (not localhost)
- [ ] Health checks on all services
- [ ] `depends_on` with `condition: service_healthy`
- [ ] `.env` file gitignored, never committed
- [ ] Volumes mounted for postgres data + uploads

---

## 11. Domain Mapping Summary

| Service | Exposed? | Domain | URL |
|---------|----------|--------|-----|
| app | Yes | `${SERVICE_FQDN_APP}` | `http://${SERVICE_FQDN_APP}` (Traefik routes to :3000) |
| worker | No | N/A | Reaches app via `http://app:3000` |
| transcriber | No | N/A | Reaches via `http://transcriber:8000` |
| postgres | No | N/A | Reaches via `postgres:5432` (internal) |

---

## 12. References

- Magic Variables: https://coolify.io/docs/knowledge-base/docker/compose
- Traefik: https://coolify.io/docs/knowledge-base/proxy/traefik/protect-services-with-authentik
- Env Vars: https://coolify.io/docs/knowledge-base/environment-variables
