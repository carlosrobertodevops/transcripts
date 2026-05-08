# SDD — Software Design Document

## Visão Geral

Transcrições é um SaaS de transcrição automática de mídia (áudio/vídeo). Usuários fazem upload de arquivos, sistema processa via Groq Whisper Large V3 ou Faster-Whisper Local, retorna transcrição editável em dashboard web.

**Stack principal:** Next.js 16 (Frontend), Elysia (API), Drizzle ORM (PostgreSQL 16), Bun (runtime), Docker Compose.

---

## Fluxos Principais

### 1. Autenticação e Autorização

- **JWT-based**: Tokens armazenados em cookies HTTP-only.
- **Payload JWT**: `{ sub: user.id, email: user.email, iat, exp }`.
- **Middleware centralizado** em `src/server/plugins/auth.ts`.
- **Refresh tokens** via `JWT_REFRESH_SECRET`.
- **Proteção de rotas**: `(app)` requer autenticação; `(auth)` e `(marketing)` públicas.

**Observação**: `payload.sub` contém `user.id` para identificar usuário em requisições protegidas.

---

### 2. Upload de Mídia e Transcrição

**Fluxo resumido:**

1. Usuário faz upload de arquivo via `MediaSection` na transcript detail page.
2. Arquivo enviado a `POST /api/transcripts/:id/media` (multipart/form-data, campo `file`).
3. Backend valida tipo MIME, salva em `STORAGE_DIR`, cria job de transcrição.
4. Worker async (`worker:loop`) pega jobs, chama API transcription (Groq/Faster-Whisper).
5. Resultado retorna como campo `text` em transcript; media lista anexos processados.
6. Cliente recebe confirmação (201) + metadata `{ media, jobsQueued }`.

**Transcrição providers:**
- `TRANSCRIPTION_PROVIDER=groq` → Groq Whisper Large V3 (requer `GROQ_API_KEY`).
- `TRANSCRIPTION_PROVIDER=local` → Faster-Whisper em container Python (padrão, gratuito).
- `TRANSCRIPTION_PROVIDER=openai` → OpenAI Whisper (requer `OPENAI_API_KEY`).

---

### 3. Componente MediaSection

**Localização:** `src/components/transcripts/media-section.tsx`

**Responsabilidades:**
- Listagem de mídia associada a transcript.
- Upload de novos arquivos via `react-dropzone` ou input file.
- Deleção de mídia com confirmação.
- Indicador de status (processando, completo, erro).

**Fluxo interno:**
1. Fetch mídia por `GET /api/transcripts/:id/media`.
2. Drop/select arquivo → chama `POST /api/transcripts/:id/media` (multipart).
3. Resposta contém `media` (nova entrada) e `jobsQueued` (número de jobs).
4. Polling opcional (ou SSE futuro) para atualizar status de processamento.
5. Delete via `DELETE /api/transcripts/:id/media/:mediaId` com confirmação.

**UI:**
- Cards com preview de arquivo (nome, tamanho, tipo).
- Status badge (Processando/Completo/Erro).
- Botão delete com ícone trash, confirmação em dialog.
- Drag-and-drop zone com visual feedback.

---

### 4. Notifications Bell

**Localização:** `src/components/app/notifications-bell.tsx`

**Responsabilidades:**
- Polling periódico (`GET /api/notifications`, intervalo 30s).
- Dropdown com lista de notificações não lidas.
- Mark individual como lida (`PATCH /api/notifications/:id/read`).
- Mark all as read (`PATCH /api/notifications/read-all`).
- Badge counter com número de não lidas.

**Fluxo interno:**
1. Componente monta → inicia polling a cada 30 segundos.
2. Request: `GET /api/notifications?unread=true`.
3. Resposta: Array `[{ id, title, message, read, createdAt }, ...]`.
4. Renderiza dropdown com ícone bell (Lucide) + badge counter.
5. Click em notificação → `PATCH /api/notifications/:id/read` → remove do dropdown.
6. Click "Mark all read" → `PATCH /api/notifications/read-all` → limpa dropdown.
7. Cleanup ao desmontar: limpar intervalo de polling.

**Data fonte:**
- Notificações armazenadas em tabela `notifications` (Drizzle).
- Filtrar `read = false` para dropdown.
- Atualizar `read = true` ao marcar como lida.

---

### 5. Page Transitions (motion lib)

**Localização:** `src/app/(app)/layout.tsx`

**Implementação:**
- Library: `framer-motion` (importada como `motion`).
- Wrapper `AnimatePresence` ao redor de children, keyed por pathname (`usePathname()`).
- Cada página envolvida em `motion.div` com animação de fade + slide-up.
- Duração: 200ms.
- Easing: `easeInOut` (padrão framer-motion).

**Código padrão:**

```tsx
import { AnimatePresence, motion } from 'framer-motion';
import { usePathname } from 'next/navigation';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ duration: 0.2 }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
```

**Efeito:**
- Ao navegar entre páginas, conteúdo faz fade-in + slide-up.
- Exit simultâneo (modo `wait`).
- Proporciona UX mais fluida e profissional.

---

### 6. Auth Split Layout (2/3 + 1/3)

**Localização:** `src/app/(auth)/layout.tsx`

**Design:**
- Tela dividida em dois painéis.
- **Painel esquerdo (2/3):** Imagem de fundo (branding/visual).
- **Painel direito (1/3):** Formulário de login/register.

**Componentes:**
- `src/components/auth/login-form.tsx` — Formulário com validação Zod + react-hook-form.
- `src/components/auth/register-form.tsx` — Registro com email/senha/confirm.

**Layout Tailwind:**

```tsx
<div className="flex h-screen">
  <div className="hidden w-2/3 lg:flex bg-gradient-to-br from-primary to-primary/80 items-center justify-center">
    {/* Imagem/branding */}
  </div>
  <div className="w-full lg:w-1/3 flex items-center justify-center bg-background">
    {/* Formulário: children */}
  </div>
</div>
```

**Comportamento responsivo:**
- Mobile (< lg): Painel esquerdo hidden, formulário fullwidth.
- Desktop (>= lg): Ambos visíveis, proporção 2/3 + 1/3.

---

### 7. Root → /login (Marketing Removida)

**Mudança:**
- Landing page pública removida.
- Root path `/` redireciona para `/login` ou dashboard (se autenticado).
- Estrutura de rotas:
  - `(auth)` — Login, Register (públicas, sem autenticação).
  - `(app)` — Dashboard, Transcripts, Profile (protegidas, requerem JWT).

**Middleware de redirecionamento** em `src/middleware.ts` (se necessário):
- Usuário sem token em `/` → redireciona para `/login`.
- Usuário com token em `/login` → redireciona para `/app` (dashboard).

---

## Estrutura de Pastas

```
src/
├── app/
│   ├── (auth)/
│   │   ├── layout.tsx          # Split layout 2/3 + 1/3
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (app)/
│   │   ├── layout.tsx          # Page transitions (motion)
│   │   ├── page.tsx            # Dashboard
│   │   ├── profile/page.tsx
│   │   └── transcripts/
│   │       ├── page.tsx
│   │       ├── [id]/page.tsx   # Detail + MediaSection
│   │       └── new/page.tsx
│   ├── api/
│   │   └── [[...routes]]/route.ts
│   └── layout.tsx
├── components/
│   ├── ui/                     # ShadCN/UI
│   ├── app/
│   │   ├── notifications-bell.tsx
│   │   ├── sidebar.tsx
│   │   ├── header.tsx
│   │   └── ...
│   ├── auth/
│   │   ├── login-form.tsx
│   │   └── register-form.tsx
│   ├── transcripts/
│   │   ├── media-section.tsx   # Upload/listagem/delete
│   │   ├── transcript-card.tsx
│   │   ├── transcript-grid.tsx
│   │   └── ...
│   └── providers/
├── server/
│   ├── routes/
│   │   ├── transcripts.ts
│   │   ├── media.ts
│   │   ├── auth.ts
│   │   ├── notifications.ts
│   │   └── ...
│   ├── plugins/
│   │   └── auth.ts
│   ├── services/
│   │   ├── transcription.ts
│   │   └── ...
│   └── index.ts
├── db/
│   ├── schema.ts
│   ├── client.ts
│   └── seed.ts
├── workers/
│   ├── loop.ts
│   └── tick.ts
├── lib/
│   ├── zod.ts
│   ├── utils.ts
│   └── api-client.ts
├── hooks/
└── styles/
    └── globals.css
```

---

## Variáveis de Ambiente

```bash
# Database
DATABASE_URL=postgresql://postgres:password@db:5432/transcripts

# Auth
JWT_SECRET=<min-32-chars>
JWT_REFRESH_SECRET=<min-32-chars>

# Transcription
TRANSCRIPTION_PROVIDER=groq|local|openai
GROQ_API_KEY=<groq-key>
OPENAI_API_KEY=<openai-key>

# Storage
STORAGE_DIR=/uploads

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

---

## Comandos Essenciais

```bash
# Setup & Database
bun install
bunx drizzle-kit generate
bunx drizzle-kit migrate
bunx drizzle-kit studio

# Development
bun run dev                 # Next.js + Elysia (turbopack)

# Workers
bun run worker:loop         # Background job loop
bun run worker:tick         # Single processor

# Build & Run
bun run build
bun start

# Docker
docker compose up --build
docker compose down

# Lint
bun run lint
```

---

## Convenções de Código

- **Commits**: Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`).
- **Validação**: Zod 4 para schemas (input/output/responses).
- **ORM**: Drizzle com migrations geradas automaticamente.
- **API**: REST com HTTP status correto (200, 201, 400, 401, 404, 500).
- **Componentes**: ShadCN/UI com composição completa + Tailwind semantic tokens.
- **TypeScript**: Strict mode, `noImplicitAny`, tipagem completa.
