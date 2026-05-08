# Product Requirements Document (PRD)

## Transcripts — Transcrição de Mídia em PT-BR

---

## 1. Visão do Produto

**Nome:** Transcripts  
**Tipo:** SaaS de transcrição de mídia  
**Descrição:** Plataforma web para transcrição automática de áudio e vídeo (`.opus`, `.mp3`, `.wav`, `.flac`, `.mp4`, etc.) para texto em português brasileiro. Integra Whisper-large-v3 fine-tuned PT-BR via Groq/OpenAI, colaboração em tempo real, edição colaborativa, análise IA de conteúdo e compartilhamento com controle de permissões.

**Diferencial:**

- Otimizado para português brasileiro (WER < 8% em áudio limpo)
- Colaboração nativa (múltiplos editores simultâneos, notificações)
- Drag-and-drop para reordenação persistente
- Busca full-text em transcrições
- Dark/Light mode nativo

---

## 2. Problema e Oportunidade

**Problema:**

- Profissionais (advogados, jornalistas, atendimento, podcasters) gastam 2-4h transcrevendo manualmente a cada 1h de áudio.
- Ferramentas estrangeiras (Otter, Rev) erram significativamente em português brasileiro.
- Falta integração com fluxos de trabalho colaborativo.
- Dados sensíveis (áudios legais, médicos) ficam em servidores estrangeiros.

**Oportunidade:**

- Mercado PT-BR carente: ~50k profissionais com gastos >R$ 200/mês em transcrição.
- SaaS recorrente (modelo freemium → pro).

---

## 3. Público-alvo e Personas

| Persona              | Setor       | Caso de Uso                                    | Requisito-chave                           |
| -------------------- | ----------- | ---------------------------------------------- | ----------------------------------------- |
| **Advogada Marina**  | Jurídico    | Transcrever audiências, depoimentos, mediações | Confidencialidade, precisão 99%+ legal    |
| **Jornalista Pedro** | Mídia       | Entrevistas, transcrição de podcast editado    | Busca rápida, compartilhamento com editor |
| **Gerente Ana**      | Atendimento | Chamar comercial, qualidade de voz do cliente  | Análise de sentimento, exportação CSV     |
| **Criador Lucas**    | Conteúdo    | Podcasts, vídeos YouTube                       | Integração SRT/VTT, múltiplas mídias      |

---

## 4. Objetivos Mensuráveis

| Métrica                             | Target               | Justificativa                 |
| ----------------------------------- | -------------------- | ----------------------------- |
| **Latência p95 transcrição**        | < 0.3x duração áudio | Groq ~5x realtime, OpenAI ~3x |
| **WER (Word Error Rate) PT-BR**     | < 8% em áudio limpo  | Whisper-large-v3 baseline     |
| **Conversão Free → Pro**            | 30% em D30           | Benchmarks SaaS transcrição   |
| **Retenção D30**                    | > 40%                | Early-stage SaaS típico       |
| **NPS**                             | > 40                 | Produto opinável              |
| **Minutos transcritos/usuário/mês** | > 60 (pro)           | Métrica de uso                |

---

## 5. Escopo IN (MVP Entregue)

### 5.1 Autenticação e Conta

- **RF-1:** Registrar usuário com nome, email, senha
- **RF-2:** Login com email/senha, JWT em cookie httpOnly samesite=lax
- **RF-3:** Refresh token automático, logout limpa sessão
- **RF-4:** Perfil: visualizar/editar nome, alterar senha com bcrypt 10 rounds
- **Endpoint:** `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`, `POST /auth/refresh`

### 5.2 Transcrições (CRUD)

- **RF-5:** Criar transcrição com título, descrição, date
- **RF-6:** Listar transcrições do usuário paginadas
- **RF-7:** Editar título/descrição, editar conteúdo transcrito
- **RF-8:** Deletar transcrição (soft ou hard delete)
- **RF-9:** Reordenar transcrições via drag-and-drop, persistir ordem em DB
- **Endpoint:** `POST /transcripts`, `GET /transcripts`, `GET /transcripts/:id`, `PUT /transcripts/:id`, `DELETE /transcripts/:id`, `POST /transcripts/reorder`
- **Schema:** `transcripts(id, userId, title, content, description, status, createdAt, updatedAt, orderIndex)`

### 5.3 Upload de Mídia

- **RF-10:** Upload múltiplo de arquivos (.mp3, .wav, .opus, .flac, .mp4)
- **RF-11:** Validação tipo MIME, tamanho máx 500MB
- **RF-12:** Persistir metadata: filename, mime, size, duration
- **Endpoint:** `POST /transcripts/:transcriptId/upload`, `GET /media`, `DELETE /media/:id`
- **Schema:** `media(id, transcriptId, filename, mime, sizeBytes, storagePath, durationSeconds, createdAt)`

### 5.4 Transcrição Automática (Groq/OpenAI)

- **RF-13:** Disparar job ao receber media via `/transcripts/:transcriptId/upload`
- **RF-14:** Job queue com status: pending → processing → done/failed
- **RF-15:** Groq Whisper API (padrão, mais rápido), fallback OpenAI Whisper
- **RF-16:** Atualizar `transcripts.content` ao concluir, marcar status=done
- **Endpoint:** `GET /jobs`, `POST /jobs/:jobId/retry` (se implementado)
- **Schema:** `transcriptionJobs(id, mediaId, status, result, errorMsg, provider, createdAt, startedAt, completedAt)`

### 5.5 Edição Colaborativa

- **RF-17:** Compartilhar transcrição via email com outro usuário registrado
- **RF-18:** Receptor pode visualizar e editar a transcrição compartilhada
- **RF-19:** Aplicar permissão: editor (view + edit) ou viewer (view only)
- **Endpoint:** `POST /shares/transcripts/:transcriptId`, `GET /shares`, `DELETE /shares/:shareId`
- **Schema:** `shares(id, transcriptId, fromUserId, toEmail, permission, createdAt, status)`

### 5.6 Notificações

- **RF-20:** Notificar proprietário quando compartilhado
- **RF-21:** Notificar quando transcrição compartilhada é editada (nome do editor, timestamp)
- **RF-22:** Listar notificações não-lidas no dashboard
- **Endpoint:** `GET /notifications`, `PATCH /notifications/:id/read`, `DELETE /notifications/:id`
- **Schema:** `notifications(id, toUserId, type, transcriptId, fromUserId, message, read, createdAt)`

### 5.7 Busca

- **RF-23:** Busca full-text em título + conteúdo de transcrições do usuário
- **Endpoint:** `GET /transcripts?q=searchterm` (implementado em `transcripts.ts`)

### 5.8 Root Redirect (Landing Page Removida)

- **RF-24:** Root `/` redireciona usuário anônimo para `/login`, usuário autenticado para `/dashboard`
- **RF-25:** Tela inicial de autenticação: login + register em `/src/app/(auth)/`
- **RF-26:** Sem marketing landing pública (roadmap futuro: landing page SaaS após v0.1)

### 5.9 UI/UX

- **RF-28:** Dark mode nativo (Tailwind darkMode: class)
- **RF-29:** Light mode (padrão)
- **RF-30:** Componentes ShadCN/UI: Button, Card, Dialog, Input, Select, Toast
- **RF-31:** Efeitos: blur em cards/diálogos, bordas arredondadas, sombras suaves
- **RF-32:** Animações CSS Tailwind em hover/transição
- **RF-33:** Responsive design mobile-first
- **Diretório:** `/src/components/ui/` (ShadCN), `/src/components/marketing/` (Hero, Features, Pricing, Footer)

### 5.10 Configuração de Conta

- **RF-34:** Alterar tema (dark/light)
- **RF-35:** Prefere (se implementado): notificações push, email

---

## 6. Escopo OUT (Roadmap Futuro)

- Pagamento real (Stripe): stub implementado, real em v0.2
- Realtime SSE: edição colaborativa simultânea com cursores
- Painel admin: analytics, gerenciar usuários, refund
- Tradução: suporte para EN, ES, FR
- Integração: Zoom, Google Meet, WhatsApp Business
- API pública: webhook, export SRT/VTT/DOCX completo
- Mobile app (React Native)
- OCR em imagens de documentos
- Criptografia at-rest para áudios sensíveis
- LDAP/SSO corporativo

---

## 7. Requisitos Não-Funcionais

| Requisito           | Especificação                                                                       |
| ------------------- | ----------------------------------------------------------------------------------- |
| **Performance**     | Latência p95 GET /transcripts: < 200ms. Upload + fila < 1s.                         |
| **Disponibilidade** | 99% uptime (SLA pago em v1.0, MVP sem SLA)                                          |
| **Segurança**       | JWT em httpOnly cookie, samesite=lax. Bcrypt 10 rounds. Validação Zod em toda rota. |
| **Escalabilidade**  | Suportar 1k usuários simultâneos com 1k transcrições/dia (5 minutos avg).           |
| **Banco de Dados**  | PostgreSQL 15+, Drizzle ORM, migrations versionadas.                                |
| **LGPD**            | Dados em servidores PT-BR (roadmap: S3 localizado ou criptografia at-rest).         |
| **Acessibilidade**  | WCAG 2.1 AA (roadmap, MVP sem).                                                     |
| **SEO**             | Meta tags, og:image, sitemap (landing page otimizada).                              |

---

## 8. Riscos e Mitigações

| Risco                                | Probabilidade | Impacto | Mitigação                                                          |
| ------------------------------------ | ------------- | ------- | ------------------------------------------------------------------ |
| **Custo Groq/OpenAI escala com uso** | Alta          | Alto    | Plano pago limita minutos free. Cache requests. Fallback provider. |
| **WER ruim em áudio com ruído**      | Alta          | Médio   | Exigir pré-processamento ffmpeg. Advertência no upload.            |
| **Privacidade áudios sensíveis**     | Média         | Alto    | Criptografia at-rest (roadmap v0.4). Termo de serviço claro.       |
| **Integração Groq/OpenAI falha**     | Baixa         | Alto    | Circuit breaker. Retry exponencial 3x. Notificar usuário.          |
| **Perda de dados em transcrição**    | Muito Baixa   | Crítico | Transação BD atomicamente. Backup daily.                           |

---

## 9. Stack Tecnológico

| Camada          | Tecnologia                                        |
| --------------- | ------------------------------------------------- |
| **Frontend**    | Next.js 16 App Router, React 19, TypeScript       |
| **Estilo**      | Tailwind CSS, ShadCN/UI                           |
| **Backend**     | Elysia (Bun), TypeScript                          |
| **ORM**         | Drizzle ORM                                       |
| **BD**          | PostgreSQL 15                                     |
| **Validação**   | Zod 4                                             |
| **Auth**        | JWT (cookie httpOnly)                             |
| **Transcrição** | Groq Whisper API (v1) / OpenAI Whisper (fallback) |
| **Runtime**     | Bun (pkg manager, executor)                       |
| **Hosting**     | Docker Compose (app + db)                         |
| **Infra**       | [Pending: Vercel/Railway/Coolify]                 |

---

## 10. Métricas de Sucesso

### 10.1 Produto

- Minutos transcritos/usuário/mês > 60 (Pro)
- WER em áudio limpo < 8%
- Latência p95 transcrição < 0.3x duração

### 10.2 Negócio

- 30% conversão Free → Pro em D30
- Retenção D30 > 40%
- NPS > 40
- CAC < R$ 50 (if marketing applied)

### 10.3 Técnico

- Uptime 99% (sem SLA pago em MVP)
- Build time < 2 min
- Deploy time < 5 min
- Error rate < 0.5% de requisições

---

## 11. Roadmap

| Versão   | Release        | Features                                                        |
| -------- | -------------- | --------------------------------------------------------------- |
| **v0.1** | MVP (Entregue) | Tudo em "Escopo IN"                                             |
| **v0.2** | +60 dias       | Stripe real, SSO Google, API pública draft                      |
| **v0.3** | +90 dias       | Webhooks, exportação SRT/VTT/DOCX, realtime SSE início          |
| **v0.4** | +120 dias      | Realtime colaboração completa, integração WhatsApp, mobile beta |

---

## 12. Definições e Convenções

- **Free:** até 60 min/mês, 1 usuário, sem compartilhamento
- **Pro:** até 500 min/mês, 5 compartilhamentos, notificações email
- **Enterprise:** ilimitado, SSO, suporte prioritário, custom integração
- **JWT:** JSON Web Token, expire 24h, refresh 7 dias
- **WER:** Word Error Rate = (substitutions + deletions + insertions) / total words
- **Groq:** LLM/transcrição API, ~5x realtime (audio 1h → 12 min)
- **Drag-and-drop:** reorder transcripts persistindo `orderIndex` em DB

---

## Apêndice: Mapeamento Código Real

**Autenticação:** `/src/server/routes/auth.ts` (register, login, logout, me, refresh)  
**Transcrições:** `/src/server/routes/transcripts.ts` (CRUD, reorder)  
**Mídia:** `/src/server/routes/media.ts` (upload, delete)  
**Compartilhamento:** `/src/server/routes/shares.ts` (create, list, delete)  
**Notificações:** `/src/server/routes/notifications.ts` (list, read, delete)  
**Jobs:** `/src/server/routes/jobs.ts` (transcrição queue)  
**Schema BD:** `/src/db/schema.ts` (users, transcripts, media, transcriptionJobs, shares, notifications)  
**Root Redirect:** `/src/app/(auth)/` e `/src/app/(app)/` com middleware de autenticação
