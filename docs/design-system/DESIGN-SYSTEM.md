# FlowLinks — Design System

**Versao** 1.0 | **Abril 2026** | **Apple-Inspired Dark/Light**

Este documento serve como guia completo para reconstruir os mockups no Figma e manter consistencia visual no projeto.

---

## 1. Tipografia

### Font Stack

| Role              | Familia            | Pesos                   | CSS Variable     |
| ----------------- | ------------------ | ----------------------- | ---------------- |
| **Sans (corpo)**  | Inter              | 300, 400, 500, 600, 700 | `--font-sans`    |
| **Mono (codigo)** | JetBrains Mono     | 400, 500                | `--font-mono`    |
| **Heading**       | Inter (mesma sans) | 600, 700                | `--font-heading` |

### Escala Tipografica

| Elemento | Tamanho            | Peso         | Line-height  | Uso                |
| -------- | ------------------ | ------------ | ------------ | ------------------ |
| H1       | 2xl (1.5rem/24px)  | bold (700)   | tight (1.25) | Titulos de pagina  |
| H2       | 4xl (2.25rem/36px) | bold (700)   | tight (1.25) | Branding auth      |
| H3       | 2xl (1.5rem/24px)  | bold (700)   | tight (1.25) | Titulos de secao   |
| Body     | sm (0.875rem/14px) | normal (400) | normal (1.5) | Texto geral        |
| Small    | xs (0.75rem/12px)  | normal (400) | normal (1.5) | Labels, metadata   |
| Micro    | 0.6rem (9.6px)     | medium (500) | normal       | Badges, contadores |
| Mono     | sm (14px)          | normal (400) | normal       | URLs, slugs        |
| Stat     | 2xl (24px)         | bold (700)   | —            | Numeros grandes    |

---

## 2. Paleta de Cores

### Light Mode

| Token                  | Hex       | Uso                                   |
| ---------------------- | --------- | ------------------------------------- |
| `--background`         | `#ffffff` | Fundo da pagina                       |
| `--foreground`         | `#1d1d1f` | Texto principal                       |
| `--card`               | `#ffffff` | Fundo de cards                        |
| `--card-foreground`    | `#1d1d1f` | Texto em cards                        |
| `--primary`            | `#007AFF` | Botoes, links, destaques (Apple Blue) |
| `--primary-foreground` | `#ffffff` | Texto sobre primary                   |
| `--secondary`          | `#f5f5f7` | Fundos secundarios                    |
| `--muted`              | `#f5f5f7` | Fundos sutis                          |
| `--muted-foreground`   | `#86868b` | Texto secundario                      |
| `--destructive`        | `#FF3B30` | Erros, acoes destrutivas (Apple Red)  |
| `--border`             | `#e5e5ea` | Bordas                                |
| `--ring`               | `#007AFF` | Focus ring                            |

### Dark Mode

| Token                  | Hex       | Uso                             |
| ---------------------- | --------- | ------------------------------- |
| `--background`         | `#000000` | Fundo (preto puro Apple)        |
| `--foreground`         | `#f5f5f7` | Texto principal                 |
| `--card`               | `#1c1c1e` | Fundo de cards                  |
| `--card-foreground`    | `#f5f5f7` | Texto em cards                  |
| `--primary`            | `#0A84FF` | Botoes, links (Apple Blue dark) |
| `--primary-foreground` | `#ffffff` | Texto sobre primary             |
| `--secondary`          | `#2c2c2e` | Fundos secundarios              |
| `--muted`              | `#2c2c2e` | Fundos sutis                    |
| `--muted-foreground`   | `#98989d` | Texto secundario                |
| `--destructive`        | `#FF453A` | Erros (Apple Red dark)          |
| `--ring`               | `#0A84FF` | Focus ring                      |

### Cores de Destaque (Charts / Tags)

| Token       | Light     | Dark      | Uso                  |
| ----------- | --------- | --------- | -------------------- |
| `--chart-1` | `#007AFF` | `#0A84FF` | Azul primary         |
| `--chart-2` | `#5AC8FA` | `#64D2FF` | Cyan (links, badges) |
| `--chart-3` | `#FF2D55` | `#FF375F` | Rosa/vermelho        |
| `--chart-4` | `#FF9500` | `#FF9F0A` | Laranja/amber        |
| `--chart-5` | `#34C759` | `#30D158` | Verde/sucesso        |

### Cores de Role (Badges)

| Role         | Borda            | Texto Light   | Texto Dark    |
| ------------ | ---------------- | ------------- | ------------- |
| Owner        | `amber-500/50`   | `amber-600`   | `amber-400`   |
| Admin Org    | `blue-500/50`    | `blue-600`    | `blue-400`    |
| Criador      | `emerald-500/50` | `emerald-600` | `emerald-400` |
| Visualizador | `slate-500/50`   | `slate-600`   | `slate-400`   |
| Super-Admin  | `purple-500/50`  | `purple-600`  | `purple-400`  |

### Cores de Status

| Status   | Cor                           |
| -------- | ----------------------------- |
| Ativa    | `emerald-500` / `emerald-400` |
| Suspensa | `red-500` / `red-400`         |
| Expirado | `red-500` / `red-400`         |
| Visto    | `green-500` / `green-400`     |

---

## 3. Espacamento e Layout

### Border Radius

| Token          | Formula     | Valor (base 0.625rem) | Uso                   |
| -------------- | ----------- | --------------------- | --------------------- |
| `--radius-sm`  | base \* 0.6 | 6px                   | Badges, tags pequenas |
| `--radius-md`  | base \* 0.8 | 8px                   | Inputs, botoes        |
| `--radius-lg`  | base        | 10px                  | Cards                 |
| `--radius-xl`  | base \* 1.4 | 14px                  | Dialogs               |
| `--radius-2xl` | base \* 1.8 | 18px                  | Auth card             |

### Espacamento

| Contexto             | Valor                            | Uso                           |
| -------------------- | -------------------------------- | ----------------------------- |
| Gap minimo           | 1 (4px)                          | Entre icone e texto em badges |
| Gap padrao           | 2 (8px)                          | Entre elementos inline        |
| Gap secao            | 4 (16px)                         | Entre grupos de form fields   |
| Padding card         | 4 (16px)                         | Cards de listagem             |
| Padding dialog       | 8-10 (32-40px)                   | Auth card, dialogs            |
| Padding pagina       | 4-8 (16-32px)                    | Margens laterais              |
| Max-width form       | `max-w-sm` (384px)               | Formularios simples           |
| Max-width card       | `max-w-md` (448px)               | Auth card                     |
| Max-width conteudo   | `max-w-4xl` (896px)              | Admin panel                   |
| Max-width plataforma | `max-w-5xl` (1024px)             | Plataforma panel              |
| Sidebar largura      | 260px expandida / 68px colapsada |

---

## 4. Componentes

### 4.1 Botoes

| Variante        | Fundo         | Texto                | Borda    | Hover            | Uso                         |
| --------------- | ------------- | -------------------- | -------- | ---------------- | --------------------------- |
| **Primary**     | `primary`     | `primary-foreground` | —        | `primary/90`     | CTA (Entrar, Criar conta)   |
| **Ghost**       | transparente  | `muted-foreground`   | —        | `accent`         | Acoes secundarias           |
| **Outline**     | transparente  | `foreground`         | `border` | `accent`         | Cancelar                    |
| **Destructive** | `destructive` | branco               | —        | `destructive/90` | Deletar, confirmar exclusao |
| **Icon**        | transparente  | `muted-foreground`   | —        | `foreground`     | Botoes de icone (8x8)       |

**Tamanhos:**

- `default`: h-10 px-4 py-2
- `sm`: h-8 px-3 text-xs
- `icon`: h-8 w-8 (ou h-10 w-10)

### 4.2 Inputs

| Propriedade   | Valor                                    |
| ------------- | ---------------------------------------- |
| Altura        | h-10 (40px) ou h-11 (44px) no auth       |
| Fundo         | `background/30`                          |
| Borda         | `border`                                 |
| Border-radius | `radius-md`                              |
| Focus         | Border shimmer animado (gradiente 90deg) |
| Placeholder   | `muted-foreground`                       |

### 4.3 Cards

| Tipo         | Fundo        | Borda                                 | Blur               | Uso                     |
| ------------ | ------------ | ------------------------------------- | ------------------ | ----------------------- |
| **Listagem** | `card/60`    | `border`                              | `backdrop-blur-lg` | Link cards, member rows |
| **Auth**     | transparente | `border/30` + `glass-border-animated` | —                  | Login/registro          |
| **Stat**     | `card/60`    | `border`                              | `backdrop-blur-lg` | Estatisticas            |
| **Dialog**   | `card`       | `border`                              | `backdrop-blur-xl` | Modais                  |

### 4.4 Badges

| Variante      | Estilo                                           |
| ------------- | ------------------------------------------------ |
| Role badges   | `variant="outline"` + cor por role (ver secao 2) |
| Status badges | `variant="outline"` + cor por status             |
| Tag badges    | CSS `light-dark()` com cores dinamicas           |
| Counter       | texto `muted-foreground` entre parenteses        |

### 4.5 Sidebar

| Estado    | Largura       | Conteudo                       |
| --------- | ------------- | ------------------------------ |
| Expandida | 260px         | Logo + filtros + tags + footer |
| Colapsada | 68px          | Icones apenas                  |
| Mobile    | Sheet overlay | Hamburger menu                 |

**Secoes (top-down):**

1. Logo FlowLinks (icone Link2 + texto)
2. Filtros: Todos / Nao vistos / Vistos (com contadores)
3. Tags com contadores
4. Rodape: ThemeToggle, Configuracoes, Perfil, Admin, Plataforma, Logout

---

## 5. Efeitos e Animacoes

### Glassmorphism (Apple Vision Pro)

| Elemento | Fundo Light              | Fundo Dark            | Blur               |
| -------- | ------------------------ | --------------------- | ------------------ |
| Cards    | `rgba(255,255,255,0.55)` | `rgba(28,28,30,0.50)` | `backdrop-blur-xl` |
| Dialogs  | `rgba(255,255,255,0.85)` | `rgba(28,28,30,0.85)` | `backdrop-blur-xl` |
| Popovers | `rgba(255,255,255,0.85)` | `rgba(28,28,30,0.85)` | `backdrop-blur-xl` |

### Glass Border Animated

Borda com gradiente rotativo (`conic-gradient`) em 2 camadas:

- Layer 1: `border-glow` 6s linear — cor `primary`
- Layer 2: `border-glow` 4s reverse — cor cyan
- Opacidade: 0.25 normal → 0.7 hover
- Espessura: 0.5px normal → 1px hover

### Animacoes de Entrada (Auth)

| Animacao                 | Duracao | Easing                     | Delay            | Uso                 |
| ------------------------ | ------- | -------------------------- | ---------------- | ------------------- |
| `auth-slide-up`          | 0.7s    | cubic-bezier(0.16,1,0.3,1) | 0.2-0.8s stagger | Branding esquerdo   |
| `auth-form-slide`        | 0.6s    | cubic-bezier(0.16,1,0.3,1) | 0.3-0.6s stagger | Form direito        |
| `auth-particle-drift`    | 12-18s  | ease-in-out                | variado          | Particulas grandes  |
| `auth-particle-sm-drift` | 5-9s    | ease-in-out                | variado          | Particulas pequenas |
| `auth-line-dash`         | 8-12s   | linear                     | variado          | Linhas SVG          |
| `auth-glow`              | 4-5s    | ease-in-out                | —                | Brilho nos cantos   |
| `auth-dot-blink`         | 2s      | ease-in-out                | —                | Dots nos badges     |

### Input Focus

Shimmer animado no `border-image` com gradiente linear 90deg.

---

## 6. Telas do Projeto

### 6.1 Login (`/login`)

Layout split: 45% esquerdo (imagem rede neural + branding) | 55% direito (form).

- Esquerdo: imagem com blur 6px, overlay 75%, particulas, linhas SVG, badges
- Direito: card transparente com `glass-border-animated`, ThemeToggle top-right, footer copyright

### 6.2 Registro (`/registro`)

Mesmo layout do login, form com campos Nome + Email + Senha.

### 6.3 Dashboard (`/`)

Sidebar retratil + grid de link cards (1/2/3 colunas responsivo).

- Header com botao "Novo Link"
- Cards com thumbnail, titulo, URL, tags, botao visto

### 6.4 Admin (`/admin`)

Header com "Voltar" + ThemeToggle. Tabs: Membros | Convites | Links.

- Estatisticas em grid 4 colunas com progress bars
- Botoes: Promover/Rebaixar, Mudar Org, Remover

### 6.5 Plataforma (`/plataforma`)

Painel super-admin. Stats globais 5 colunas. Tabs: Orgs | Planos | Usuarios.

- Selects inline por usuario: Org, Role, Plano
- CRUD de orgs e planos com dialogs

### 6.6 Perfil (`/perfil`)

Form de edicao: nome, email, senha. Avatar com iniciais. Estatisticas.

### 6.7 Aguardando (`/aguardando`)

Layout auth com icone Clock, mensagem de espera, botao logout.

---

## 7. Icones

Biblioteca: **Lucide React**

| Icone                               | Uso                         |
| ----------------------------------- | --------------------------- |
| `Link2`                             | Logo FlowLinks              |
| `LogIn`                             | Botao Entrar                |
| `UserPlus`                          | Botao Criar conta           |
| `Shield` / `ShieldOff`              | Super-admin toggle          |
| `Crown`                             | Role Owner                  |
| `Pencil`                            | Role Criador / Editar       |
| `Eye` / `EyeOff`                    | Visualizador / Toggle senha |
| `ArrowUpCircle` / `ArrowDownCircle` | Promover / Rebaixar         |
| `ArrowRightLeft`                    | Mudar Org                   |
| `Trash2`                            | Deletar                     |
| `Plus` / `PlusCircle`               | Criar novo                  |
| `Building2`                         | Organizacoes                |
| `CreditCard`                        | Planos                      |
| `Users`                             | Usuarios / Membros          |
| `Tags`                              | Tags                        |
| `Sparkles`                          | Plataforma                  |
| `ShieldCheck`                       | Admin                       |
| `Clock`                             | Aguardando                  |
| `Sun` / `Moon`                      | Theme toggle                |
| `ChevronLeft` / `ChevronRight`      | Sidebar collapse            |

---

## 8. Guia Figma

### Estrutura de Paginas Sugerida

```
flowlinks (Figma File)
├── Cover
├── Design Tokens
│   ├── Colors (Light + Dark)
│   ├── Typography Scale
│   ├── Spacing & Radius
│   └── Shadows & Effects
├── Components
│   ├── Buttons (Primary, Ghost, Outline, Destructive, Icon)
│   ├── Inputs (Default, Focus, Error)
│   ├── Cards (Listing, Auth, Stat, Dialog)
│   ├── Badges (Role, Status, Tag)
│   ├── Sidebar (Expanded, Collapsed, Mobile)
│   └── Dialogs (Alert, Form, Invite)
├── Screens
│   ├── Login (Desktop + Mobile)
│   ├── Registro (Desktop + Mobile)
│   ├── Dashboard (Desktop + Mobile)
│   ├── Admin Panel
│   ├── Plataforma Panel
│   ├── Perfil
│   └── Aguardando / Org Suspensa / Sem Permissao
└── Flows
    ├── Bootstrap (primeiro usuario)
    ├── Auto-cadastro
    ├── Login → Dashboard
    └── Convite → Registro → Dashboard
```
