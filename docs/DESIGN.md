# Design Document: Transcripts SaaS

**Status:** Approved & Implemented  
**Last Updated:** 2026-05-13  
**Version:** 1.0

---

## Context

Transcripts é um SaaS de transcrição de mídia (áudio/vídeo) com backend Python (Faster-Whisper) e frontend Next.js. Processamento é assíncrono via worker Bun que puxa jobs de `transcription_jobs` table. Usuários uploadam mídia, o sistema transcreve (provider: local, Groq, ou OpenAI), e exibe transcrição editável com segmentos sincronizados por timestamp.

A UI é escura por padrão, inspirada em dashboards modernos (Figma-like), com glassmorphism subtle, animations via Framer Motion, e componentes base ShadCN/UI new-york.

---

## Problem

1. **Múltiplos provedores de transcrição** — local (Faster-Whisper) vs APIs cloud (Groq, OpenAI). Sistema deve ser extensível sem mudar handlers.
2. **Processamento async + worker stateless** — job ficar em estado consistente enquanto worker falha ou está offline.
3. **Upload de mídia** — suportar áudio (.mp3, .wav, .flac) e vídeo (.mp4, .webm, .mov), com pré-processamento FFmpeg (normalização → MP3 16kHz mono).
4. **Transcrição com stream** — quando provider suporta (local), renderizar segmentos progressivamente sem aguardar final.
5. **UI responsivo**: desktop (sidebar 260px colapsável, grid 3-4 colunas) vs mobile (100% layout, drawer sidebar).
6. **Notificações real-time** — bell polling `/api/notifications` 30s + toast Sonner.
7. **Dark mode default** — tema escuro com hierarquia visual clara, tokens semânticos.
8. **Drag-and-drop reordering** — transcrições persistem ordem via `@dnd-kit`.

---

## Goals & Non-Goals

### Goals
- ✅ Suportar 3+ provedores de transcrição sem código duplicado.
- ✅ Worker Bun stateless; falhas não travam jobs.
- ✅ Upload seguro (validação MIME, size limit, quarantine folder).
- ✅ Streaming de segmentos em tempo real (não aguardar fim).
- ✅ UI dark, glassmorphism, motion fade+slide 200ms.
- ✅ Notifications bell + Sonner toast feedback imediato.
- ✅ Drag-and-drop reordering com persistência DB.
- ✅ Responsivo mobile-first (≥xs, ≥sm, ≥md, ≥lg, ≥xl).

### Non-Goals
- ❌ Edit de áudio (trim, fade-in/out) — apenas transcrição de texto.
- ❌ Collaboration real-time (múltiplos editores simultâneos).
- ❌ Transcrição multi-idioma (detecção automática) — hardcoded `pt-BR`.
- ❌ Export audio com edits sincronizadas.

---

## Proposed Design

### 1. Fluxo de Transcrição (Sequence Diagram)

```mermaid
sequenceDiagram
  participant User as Usuário
  participant Next as Next.js (UI)
  participant API as Elysia API
  participant DB as PostgreSQL
  participant FFmpeg as FFmpeg
  participant Provider as Transcriber (Local/Groq/OpenAI)
  participant Worker as Bun Worker

  User->>Next: Upload mídia + título
  Next->>API: POST /api/transcripts/create + multipart
  API->>DB: INSERT transcripts, media (status=pending)
  API->>FFmpeg: Pré-processar vídeo→MP3 16kHz mono
  FFmpeg-->>API: audio.mp3 salvo em STORAGE_DIR
  API->>DB: INSERT transcription_jobs (status=pending)
  API-->>Next: 201 Created + mediaId
  Next->>Next: Dialog fecha, refetch lista, show toast "Transcrição iniciada"

  rect rgb(200, 150, 255)
  Note over Worker: Worker tick (WORKER_INTERVAL_MS = 3000)
  Worker->>API: POST /api/jobs/run?limit=3 (header x-internal-key)
  API->>DB: SELECT transcription_jobs WHERE status=pending LIMIT 3
  API->>DB: UPDATE transcription_jobs SET status=processing
  API->>DB: SELECT media WHERE id=jobMediaId
  API->>Provider: POST /transcribe { audioPath, language: "pt" }
  alt Provider supports streaming
    Provider->>Provider: Stream segment-by-segment
    Provider-->>API: Segment { startMs, endMs, text }
    API->>DB: INSERT transcript_segments (BATCH_SIZE=5)
    API->>DB: UPDATE transcription_jobs SET segmentCount+=
  else Bulk transcription
    Provider-->>API: TranscriptionResult [ segments ]
    API->>DB: INSERT transcript_segments (bulk)
  end
  API->>DB: UPDATE transcription_jobs SET status=done, endedAt
  API->>DB: INSERT notifications (userId, type=transcription_complete)
  API-->>Worker: 200 OK
  end

  Next->>API: GET /api/notifications (polling 30s)
  API-->>Next: [ { type: transcription_complete, ... } ]
  Next->>Next: Sonner toast "Transcrição concluída"
  Next->>API: GET /api/transcripts/:id/media (refetch)
  API-->>Next: [ media { transcriptHtml, segments } ]
  Next->>Next: Render segmentos em transcript-editor, status badge "done" ✓
```

**Pontos-chave:**
- Worker é stateless; contato via HTTP POST com header `x-internal-key`.
- FFmpeg normaliza vídeo antes de Whisper (reduz falsos positivos).
- Streaming insere segmentos progressivamente (UX: transcrição aparece em tempo real).
- Notifications via polling 30s (não WebSocket para simplicidade).

---

### 2. Arquitetura de Provedores

**File:** `src/server/services/transcription.ts`

```typescript
interface TranscriptionProvider {
  transcribeStream?(audioPath: string, language: string): AsyncGenerator<TranscriptionSegment>;
  transcribe?(audioPath: string, language: string): Promise<TranscriptionSegment[]>;
}

async function getProvider(): Promise<TranscriptionProvider> {
  if (TRANSCRIPTION_PROVIDER === 'local') return localProvider;
  if (TRANSCRIPTION_PROVIDER === 'groq') return groqProvider;
  if (TRANSCRIPTION_PROVIDER === 'openai') return openaiProvider;
  throw new Error('Unknown provider');
}

async function transcribeWithFallback(audioPath: string, language: string): Promise<TranscriptionSegment[]> {
  try {
    const provider = await getProvider();
    if (typeof provider.transcribeStream === 'function') {
      return await collectStream(provider, audioPath, mediaId, jobId);
    }
    return await provider.transcribe(audioPath, language);
  } catch (e) {
    if (TRANSCRIPTION_PROVIDER_FALLBACK) {
      return transcribeWithFallback(audioPath, language);
    }
    throw e;
  }
}
```

**Design Rationale:**
- Provider abstraction permite adicionar/remover provedores sem mudar job runner.
- Streaming retorna `AsyncGenerator` → insere segmentos em batch (5 segs).
- Fallback automático se provider falhar.

---

### 3. Worker Contract (HTTP Polling)

**Endpoint:** `POST /api/jobs/run`  
**Header:** `x-internal-key: $INTERNAL_API_KEY`  
**Query:** `?limit=3` (default, max 5)

**Lógica (`src/server/services/jobs.ts`):**
```typescript
async function runPendingJobs(limit: number = 3): Promise<void> {
  const jobs = await db
    .select()
    .from(transcriptionJobs)
    .where(eq(transcriptionJobs.status, 'pending'))
    .limit(limit);

  for (const job of jobs) {
    try {
      await db.update(transcriptionJobs)
        .set({ status: 'processing' })
        .where(eq(transcriptionJobs.id, job.id));

      const media = await db.query.media.findFirst({
        where: eq(media.id, job.mediaId),
      });

      const audioPath = path.join(STORAGE_DIR, media.filename);
      const segments = await transcribeWithFallback(audioPath, 'pt');

      await db.transaction(async (tx) => {
        await tx.insert(transcriptSegments).values(
          segments.map(s => ({ ...s, mediaId: job.mediaId }))
        );
        await tx.update(transcriptionJobs)
          .set({ status: 'done', endedAt: new Date(), segmentCount: segments.length })
          .where(eq(transcriptionJobs.id, job.id));
        await tx.insert(notifications).values({
          userId: job.userId,
          type: 'transcription_complete',
          message: `Transcrição de ${media.filename} concluída.`,
          read: false,
        });
      });
    } catch (error) {
      const retries = job.retryCount || 0;
      if (retries < 3) {
        await db.update(transcriptionJobs)
          .set({ retryCount: retries + 1 })
          .where(eq(transcriptionJobs.id, job.id));
      } else {
        await db.update(transcriptionJobs)
          .set({ status: 'failed', error: error.message })
          .where(eq(transcriptionJobs.id, job.id));
      }
    }
  }
}
```

**Invocado por:** `src/workers/loop.ts` a cada `WORKER_INTERVAL_MS` (padrão 3s).

---

### 4. UI: Dialogs & Layouts

#### **Auth Split Layout (2/3 + 1/3)**
- **Desktop (≥md):** Flex row; visual left 60% (imagem/brand), form right 40%.
- **Mobile (<md):** 100% form; visual hidden.
- **File:** `src/app/(auth)/layout.tsx`, `src/components/auth/visual-panel.tsx`

#### **Transcript Grid (Dashboard)**
- **Layout:** Sidebar 260px (colapsável ≤lg) + main content.
- **Grid:** Responsive 1/2/3 cols (xs:1, md:2, lg:3).
- **Cards:** ShadCN `<Card>` com `glass-border-animated` hover.
- **Drag-drop:** `@dnd-kit` + `verticalListSortingStrategy`.
- **File:** `src/components/transcripts/transcript-grid.tsx`

#### **New Transcript Dialog**
1. Dropzone (audio/vídeo upload).
2. Form (title obrigatório, operationName, operationDate, analysis).
3. Media list (thumbnails, duration, size, description).
4. Submit → `POST /api/transcripts/create` → refetch + toast.
- **File:** `src/components/transcripts/new-transcript-dialog.tsx`

#### **Transcript Editor**
- Segmentos listados por timestamp.
- Clique em segmento → scroll editor para aquele tempo.
- Edição inline (contenteditable ou textarea).
- Save → `PATCH /api/transcripts/:id/media/:mediaId` com HTML diff.
- **File:** `src/components/transcripts/transcript-editor.tsx`

#### **Status Badge**
- **pending:** ⏳ `warning` (amarelo)
- **processing:** 🔄 `secondary` + Loader2 spinner
- **done:** ✓ `success` (verde)
- **failed:** ✗ `destructive` (vermelho)
- **File:** `src/components/transcripts/status-badge.tsx`

---

### 5. Tema & Tokens Semânticos

**Tailwind v4 + CSS Variables**

```css
/* src/app/globals.css */
:root {
  --background: 0 0% 100%;
  --foreground: 0 0% 3.6%;
  --primary: 0 0% 9%;
  --primary-foreground: 0 0% 100%;
  --secondary: 0 0% 96.1%;
  --secondary-foreground: 0 0% 9%;
  --destructive: 0 84.2% 60.2%;
  --muted: 0 0% 89.8%;
  --muted-foreground: 0 0% 45.1%;
  --accent: 0 0% 9%;
  --border: 0 0% 89.8%;
}

@media (prefers-color-scheme: dark) {
  :root {
    --background: 0 0% 3.6%;
    --foreground: 0 0% 98%;
    --primary: 0 0% 98%;
    --primary-foreground: 0 0% 3.6%;
    --secondary: 0 0% 14.9%;
    --secondary-foreground: 0 0% 98%;
    --destructive: 0 84.2% 60.2%;
    --muted: 0 0% 14.9%;
    --muted-foreground: 0 0% 63.9%;
    --accent: 0 0% 63.9%;
    --border: 0 0% 14.9%;
  }
}
```

**Uso obrigatório:**
- `bg-background`, `bg-primary`, `bg-secondary`, `bg-muted`
- `text-foreground`, `text-muted-foreground`
- `border-border`, `ring-ring`
- **Proibido:** `bg-blue-500`, `text-red-600` (cores hardcoded).

---

### 6. Glassmorphism & Motion

#### **Glass Border Animated**
```css
/* tailwind.config.ts */
extend: {
  keyframes: {
    'glass-border-shimmer': {
      '0%': { opacity: '0.3' },
      '50%': { opacity: '1' },
      '100%': { opacity: '0.3' },
    },
  },
  animation: {
    'glass-border': 'glass-border-shimmer 3s infinite',
  },
}
```

**Aplicar em dialogs/cards:**
```tsx
<Card className="backdrop-blur-lg bg-secondary/80 border border-border/20 hover:border-border/40 hover:shadow-lg transition-all duration-300">
  {children}
</Card>
```

#### **Page Transitions**
- **Componente:** `src/components/providers/page-transition.tsx`
- **Duration:** 200ms
- **Easing:** `ease-out`
- **Animation:** Fade (0 → 1 opacity) + Slide-up (y: 8px → 0px)
- **Trigger:** Layout wrapper detecta pathname change via `usePathname()` → AnimatePresence keyada por pathname.

```tsx
<motion.div
  key={pathname}
  initial={{ opacity: 0, y: 8 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -8 }}
  transition={{ duration: 0.2, ease: 'easeOut' }}
>
  {children}
</motion.div>
```

---

### 7. Notifications & Feedback

#### **Bell Polling**
- Component: `src/components/app/notifications-bell.tsx`
- Endpoint: `GET /api/notifications` (sem query; retorna últimas 10)
- Interval: 30s (`setInterval`)
- Toast: Sonner 2s bottom-right auto-close.

#### **Sonner Setup**
```tsx
<Toaster
  richColors
  closeButton
  position="bottom-right"
  theme={theme as 'light' | 'dark'}
/>
```

**Feedback imediato:**
- Form submit → `toast.loading("Salvando...")` → refetch → `toast.success("Salvo!")` ou `toast.error("Erro: ...")`.
- Media upload → `toast.loading("Enviando...")` → `toast.success("Enviado!")`.
- Transcrição completa (via notification poll) → `toast.success("Transcrição concluída!")`.

---

### 8. Responsividade

#### **Breakpoints (Tailwind v4)**
| Breakpoint | Min Width | Device |
|-----------|-----------|--------|
| `xs` | 0px | Mobile (default) |
| `sm` | 640px | Tablet portrait |
| `md` | 768px | Tablet landscape / Laptop |
| `lg` | 1024px | Desktop |
| `xl` | 1280px | Widescreen |

#### **Componente Sidebar**
```tsx
// Desktop: fixed 260px left, main content right
// Mobile: drawer (fullscreen overlay, close on outside click)
className="md:flex hidden w-[260px] border-r"
// Mobile: sheet component
<Sheet open={open} onOpenChange={setOpen}>
  <SheetContent side="left" className="w-[260px]">
    {/* Sidebar content */}
  </SheetContent>
</Sheet>
```

#### **Grid de Transcrições**
```tsx
// xs: 1 col, sm: 1 col, md: 2 cols, lg: 3 cols
className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
```

#### **Touch Targets**
- Mínimo 44px × 44px em mobile.
- Buttons: `h-10 px-4` (desktop) → `h-12 px-6` (mobile).

---

## Alternatives Considered

1. **WebSocket vs HTTP Polling para notifications**
   - ✅ **Escolhido:** HTTP polling 30s (simplicidade, reduz infra).
   - ❌ **Rejeitado:** WebSocket (requer servidor stateful; complexity vs latência 30s aceitável).

2. **Next.js Server Actions vs Elysia routes**
   - ✅ **Escolhido:** Elysia routes montadas via catch-all Next (type-safe DTOs, reutilizável em SDKs futuros).
   - ❌ **Rejeitado:** Server Actions (tighter coupling a Next.js; difícil testar isolado).

3. **Prisma vs Drizzle ORM**
   - ✅ **Escolhido:** Drizzle (schema TS-first, migrations SQL inspecionáveis, melhor type safety).
   - ❌ **Rejeitado:** Prisma (migrations abstratas; menos controle).

4. **Queue (BullMQ/Temporal) vs Worker HTTP**
   - ✅ **Escolhido:** Worker Bun polling HTTP (1 container, sem Redis dependency).
   - ❌ **Rejeitado:** BullMQ (adds Redis, complexity; overkill para 3s interval).

5. **Framer Motion vs Vanilla CSS + Web Animations API**
   - ✅ **Escolhido:** Framer Motion (simplify page transitions, keyframe editing).
   - ❌ **Rejeitado:** CSS vanilla (tedious timing, less reusable).

---

## Trade-offs

| Decision | Benefit | Cost |
|----------|---------|------|
| **HTTP polling 30s** | Simples, sem WebSocket infra | Latência até 30s em notificações |
| **Worker stateless** | Tolerante a falhas; scale horizontal fácil | Job state fica no DB; sem in-memory progress |
| **FFmpeg pré-processing** | Reduz false positives Whisper | +latência 5-15s upload (vídeo) |
| **Streaming segments** | Real-time UX; não aguarda fim | Complexo: batch insert + DB update freq |
| **Dark default** | Moderno; menos eye strain noturno | Light mode needs manual toggle |
| **Drag-drop reordering** | UX intuitiva | `@dnd-kit` dependencies; complexo mobile |

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| **Provider API rate limit (Groq/OpenAI)** | Medium | Job falha; usuário não notificado | Queue com backoff exponencial; fallback local provider; alerts |
| **FFmpeg crash em vídeo corrupto** | Low | Worker trava processando job | Timeout 60s; catch `spawn error`; mark failed |
| **Segment insert batch slow (>1000 segs)** | Low | Worker perde tick; jobs não processados | Batch size = 5; índices DB em (mediaId, startMs) |
| **Polling notification overhead** | Low | GET `/notifications` 30s × N usuários | Caching header; IF-MODIFIED-SINCE; lazy load bell |
| **Notification poll race (create + poll same time)** | Medium | Usuário não vê notification até next tick | Publish notification **antes** de job completo |
| **Mobile touch targets < 44px** | Medium | Missclicks; frustration | Audit Tailwind; enforce `h-10 px-4` min |
| **Dark mode + low contrast cards** | Low | Accessibility; WCAG AA fail | Audit tokens (4.5:1 ratio); token values validated |

---

## Rollout Plan

### Phase 1: Foundation (Já implementado)
- ✅ Elysia API routes (auth, transcripts, media, jobs, notifications).
- ✅ Drizzle schema + migrations.
- ✅ Next.js UI (login, dashboard, transcript editor).
- ✅ Worker Bun loop.

### Phase 2: Refinement (Current)
- ⏳ Glassmorphism polish (glass-border-animated, backdrop-blur).
- ⏳ Page transition animations (200ms fade+slide).
- ⏳ Notification bell + Sonner integração.
- ⏳ Drag-drop reordering visual feedback.

### Phase 3: Optimize (Future)
- 📅 Caching notifications (IF-MODIFIED-SINCE).
- 📅 Streaming segments UI progress (skeleton → text progressively).
- 📅 Provider fallback auto-retry UX.
- 📅 Audit accessibility (WCAG AA, keyboard nav).

---

## Open Questions

1. **Quantos segmentos por notificação job?**
   - Atual: Notificação só ao final (status=done). Considerar notificação cada 50 segs? (Progressive feedback)

2. **Timeout de FFmpeg**
   - Atualmente hardcoded 60s. Escalar dinamicamente por file size?

3. **Suporte a captions (SRT/VTT export)?**
   - Roadmap: POST `/api/transcripts/:id/export?format=srt`.

4. **Compartilhamento de transcrições?**
   - `shares` table já existe; UI (share button, copy link, expiry) pendente.

5. **Histórico de edits (versioning)?**
   - Audit trail: cada PATCH mantém snapshot anterior?

---

## Appendix

### A. File Mapping (Design → Código)

| Design Section | Files |
|---|---|
| Auth layout 2/3+1/3 | `src/app/(auth)/layout.tsx`, `src/components/auth/visual-panel.tsx` |
| Sidebar + main grid | `src/components/app/sidebar.tsx`, `src/components/transcripts/transcript-grid.tsx` |
| New Transcript dialog | `src/components/transcripts/new-transcript-dialog.tsx` |
| Transcript editor | `src/components/transcripts/transcript-editor.tsx`, `src/components/transcripts/media-transcript-editor.tsx` |
| Status badges | `src/components/transcripts/status-badge.tsx` |
| Drag-drop | `src/components/transcripts/sortable-card.tsx` |
| Page transitions | `src/components/providers/page-transition.tsx` |
| Notifications | `src/components/app/notifications-bell.tsx` |
| Tokens + theme | `src/app/globals.css`, `src/app/layout.tsx`, `tailwind.config.ts` |
| API provider abstraction | `src/server/services/transcription.ts` |
| Job runner | `src/server/services/jobs.ts` |
| Worker loop | `src/workers/loop.ts` |

### B. Key Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/health` | Liveness check |
| `POST` | `/api/auth/login` | JWT login |
| `GET` | `/api/transcripts` | List (paginated) |
| `POST` | `/api/transcripts` | Create |
| `PATCH` | `/api/transcripts/:id` | Update metadata |
| `DELETE` | `/api/transcripts/:id` | Delete (cascade media + jobs) |
| `GET` | `/api/transcripts/:id/media` | List media + segments |
| `PATCH` | `/api/transcripts/:id/media/:mediaId` | Update transcript HTML |
| `POST` | `/api/jobs/run` | Worker tick (internal) |
| `GET` | `/api/notifications` | Poll (bell) |
| `PATCH` | `/api/notifications/:id` | Mark read |

### C. Environment Variables

```bash
# Database
DATABASE_URL=postgres://user:pass@host:5432/transcripts

# Auth (JWT)
JWT_SECRET=<random>
JWT_REFRESH_SECRET=<random>
INTERNAL_API_KEY=<random>  # Worker authentication

# Transcrição
TRANSCRIPTION_PROVIDER=local          # local | groq | openai
TRANSCRIBER_URL=http://transcriber:8000
TRANSCRIBER_TIMEOUT_MS=60000
GROQ_API_KEY=<if provider=groq>
OPENAI_API_KEY=<if provider=openai>

# Whisper (local provider)
WHISPER_MODEL=base                    # tiny | base | small | medium | large-v3
WHISPER_COMPUTE_TYPE=int8             # int8 | float32
WHISPER_DEVICE=cpu                    # cpu | cuda
WHISPER_BEAM_SIZE=3
WHISPER_VAD_FILTER=true

# Worker + Storage
WORKER_INTERVAL_MS=3000               # 3s default
STORAGE_DIR=./uploads
LOG_LEVEL=INFO
```

### D. Component Composition Examples

**Card com Glass:**
```tsx
<Card className="backdrop-blur-lg bg-secondary/80 border border-border/20 hover:border-border/40 transition-all">
  <CardHeader>
    <CardTitle>Título</CardTitle>
  </CardHeader>
  <CardContent>
    {/* Conteúdo */}
  </CardContent>
</Card>
```

**Dialog básico:**
```tsx
<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent className="backdrop-blur-lg">
    <DialogHeader>
      <DialogTitle>Novo</DialogTitle>
      <DialogDescription>Descrição</DialogDescription>
    </DialogHeader>
    {/* Form */}
  </DialogContent>
</Dialog>
```

**Status Badge:**
```tsx
<Badge variant={status === 'done' ? 'success' : status === 'failed' ? 'destructive' : 'warning'}>
  {status === 'processing' && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
  {statusLabel}
</Badge>
```

---

## Sign-off

**Design Lead:** Product Team  
**Implementation Lead:** Engineering  
**Last Reviewed:** 2026-05-13  
**Next Review:** 2026-06-13 (ou quando mudança estrutural ocorra)
