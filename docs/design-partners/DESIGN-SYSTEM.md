# DESIGN-SYSTEM.md — Tokens e Componentes (Genérico)

**Versão** 1.0 | **Maio 2026** | **Apple-Inspired Dark/Light**

Este documento é a **referência canônica de tokens e componentes** para qualquer projeto que adote este sistema de design. Serve como base para implementação em qualquer stack (Next.js + Tailwind, React + CSS Modules, Vue, etc.).

**Documentação complementar:** Ver `./DESIGN.md` para princípios visuais, padrões de uso e diretrizes de aplicação.

---

## 1. Tipografia

### Font Stack

```css
/* Sans Serif — Principal */
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;

/* Monospace — Código, Terminal */
font-family: 'JetBrains Mono', 'Courier New', monospace;
```

**Recomendações:**
- Inter via `next/font/google` (Next.js) ou similar.
- Variações: Regular (400), Medium (500), Semibold (600), Bold (700).
- JetBrains Mono para blocos de código, terminais, valores numéricos.

### Escala Tipográfica

| Token                   | Tamanho  | Peso  | Line Height | Caso de Uso                     |
| ----------------------- | -------- | ----- | ----------- | ------------------------------- |
| `text-xs`               | 12px     | 400   | 1.25        | Legenda, meta, timestamp        |
| `text-sm`               | 14px     | 400   | 1.43        | Texto secundário, hint          |
| `text-base`             | 16px     | 400   | 1.5         | Corpo padrão (paragrafos)       |
| `text-lg`               | 18px     | 500   | 1.56        | Subtítulo, label importante     |
| `text-xl`               | 20px     | 600   | 1.4         | Heading 5 (card title)          |
| `text-2xl`              | 24px     | 600   | 1.33        | Heading 4 (section title)       |
| `text-3xl`              | 30px     | 700   | 1.2         | Heading 3 (page title)          |
| `text-4xl`              | 36px     | 700   | 1.11        | Heading 2 (major section)       |
| `text-5xl`              | 48px     | 700   | 1           | Heading 1 (principal)           |

---

## 2. Paleta de Cores

### Light Mode

| Token                  | Hex       | Uso                                   |
| ---------------------- | --------- | ------------------------------------- |
| `--background`         | `#ffffff` | Fundo da página                       |
| `--foreground`         | `#1d1d1f` | Texto principal                       |
| `--card`               | `#ffffff` | Fundo de cards                        |
| `--card-foreground`    | `#1d1d1f` | Texto em cards                        |
| `--primary`            | `#007AFF` | Botões, links, destaques (Apple Blue) |
| `--primary-foreground` | `#ffffff` | Texto sobre primary                   |
| `--secondary`          | `#f5f5f7` | Fundos secundários                    |
| `--muted`              | `#f5f5f7` | Fundos sutis                          |
| `--muted-foreground`   | `#86868b` | Texto secundário                      |
| `--destructive`        | `#FF3B30` | Erros, ações destrutivas (Apple Red)  |
| `--border`             | `#e5e5ea` | Bordas                                |
| `--ring`               | `#007AFF` | Focus ring (accessibility)            |

### Dark Mode

| Token                  | Hex       | Uso                             |
| ---------------------- | --------- | ------------------------------- |
| `--background`         | `#000000` | Fundo (preto puro Apple)        |
| `--foreground`         | `#f5f5f7` | Texto principal                 |
| `--card`               | `#1c1c1e` | Fundo de cards                  |
| `--card-foreground`    | `#f5f5f7` | Texto em cards                  |
| `--primary`            | `#0A84FF` | Botões, links (Apple Blue dark) |
| `--primary-foreground` | `#ffffff` | Texto sobre primary             |
| `--secondary`          | `#2c2c2e` | Fundos secundários              |
| `--muted`              | `#2c2c2e` | Fundos sutis                    |
| `--muted-foreground`   | `#98989d` | Texto secundário                |
| `--destructive`        | `#FF453A` | Erros (Apple Red dark)          |
| `--ring`               | `#0A84FF` | Focus ring (accessibility)      |

### Cores Complementares (Charts, Tags, Badges)

| Função    | Light      | Dark       | Uso                     |
| --------- | ---------- | ---------- | ----------------------- |
| Success   | `#34C759` | `#30B858` | Confirmação, status OK  |
| Warning   | `#FF9500` | `#FF9500` | Alerta, atenção         |
| Info      | `#00B4F1` | `#00C7FF` | Informação               |
| Cyan      | `#00D4FF` | `#30D7FF` | Accent, animações       |

### Cores de Role (Badges Usuário)

| Role        | Cor Light | Cor Dark  | Uso                   |
| ----------- | --------- | --------- | --------------------- |
| Admin       | `#FF3B30` | `#FF453A` | Administrador         |
| Owner       | `#007AFF` | `#0A84FF` | Proprietário          |
| Member      | `#f5f5f7` | `#2c2c2e` | Membro padrão         |
| Guest       | `#e5e5ea` | `#5e5e62` | Acesso limitado       |

### Cores de Status (Indicator)

| Status    | Cor       | Uso                   |
| --------- | --------- | --------------------- |
| Active    | `#34C759` | Usuário online        |
| Idle      | `#FF9500` | Inativo               |
| Offline   | `#86868b` | Desconectado          |

---

## 3. Espacamento e Layout

### Border Radius

| Token        | Px  | Caso de Uso                |
| ------------ | --- | -------------------------- |
| `rounded-xs` | 2px | Inputs, tags pequenos      |
| `rounded-sm` | 4px | Badges, small UI elements  |
| `rounded-md` | 6px | Cards, botões              |
| `rounded-lg` | 8px | Dialogs, modais (padrão)   |
| `rounded-xl` | 12px | Componentes grandes         |
| `rounded-2xl` | 16px | Containers principais      |
| `rounded-full` | 9999px | Circular, pills            |

### Espacamento

| Contexto             | Valor                    | Uso                           |
| -------------------- | ------------------------ | ----------------------------- |
| Gap mínimo           | 1 (4px)                  | Entre ícone e texto em badges |
| Gap padrão           | 2 (8px)                  | Entre elementos inline        |
| Gap seção            | 4 (16px)                 | Entre grupos de form fields   |
| Padding card         | 4 (16px)                 | Cards de listagem             |
| Padding dialog       | 8-10 (32-40px)           | Cards auth, dialogs           |
| Padding página       | 4-8 (16-32px)            | Margens laterais              |
| Max-width form       | `max-w-sm` (384px)       | Formulários simples           |
| Max-width card       | `max-w-md` (448px)       | Auth card (recomendado)       |
| Max-width conteúdo   | `max-w-4xl` (896px)      | Painel admin                  |
| Max-width plataforma | `max-w-5xl` (1024px)     | Painel principal              |
| Sidebar (expandida)  | 240–280px (recomendado)  | Navigation expandida          |
| Sidebar (colapsada)  | 64–72px (recomendado)    | Navigation ícones apenas      |

### Breakpoints (Responsive)

| Label  | Px    | Contexto                |
| ------ | ----- | ----------------------- |
| Mobile | <640  | Telefones              |
| Tablet | 640–1024  | Tablets, landscape     |
| Desktop | >1024  | Desktops, telas largas |

---

## 4. Componentes

### 4.1 Botões

| Variante       | Fundo           | Texto               | Borda        | Uso                              |
| -------------- | --------------- | ------------------- | ------------ | -------------------------------- |
| **Primary**    | `--primary`     | `--primary-foreground` | Nenhuma      | Ação principal, confirmação      |
| **Ghost**      | `transparent`   | `--foreground`      | Nenhuma      | Ações secundárias, inline        |
| **Outline**    | `transparent`   | `--foreground`      | `--border`   | Ações alternativas               |
| **Destructive** | `--destructive` | `#ffffff`           | Nenhuma      | Deletar, ações críticas          |
| **Icon**       | `transparent`   | `--foreground`      | Nenhuma      | Ícones, compacto                 |
| **Capsule**    | `--primary/20`  | `--primary`         | `--primary/50` | Tags ativação, status            |

**Interações:**
- Hover: opacity `0.9` + scale `1.02`.
- Focus: outline `--ring` 2px.
- Disabled: opacity `0.5`, cursor `not-allowed`.

### 4.2 Inputs e Forms

| Estado      | Borda         | Fundo      | Texto            | Uso                  |
| ----------- | ------------- | ---------- | ---------------- | -------------------- |
| **Default** | `--border`    | `--card`   | `--foreground`   | Estado repouso       |
| **Focus**   | `--ring` 2px  | `--card`   | `--foreground`   | Validação entrada    |
| **Error**   | `--destructive` | `--card`   | `--destructive`  | Erro de validação    |
| **Disabled** | `--muted`     | `--muted`  | `--muted-foreground` | Campo desabilitado   |

**Padrões:**
- Altura padrão: 40px (input), 56px (textarea).
- Padding: 12px horizontal, 8px vertical.
- Placeholder: `--muted-foreground`.

### 4.3 Cards

| Tipo         | Fundo              | Borda                            | Blur               | Uso                              |
| ------------ | ------------------ | -------------------------------- | ------------------ | -------------------------------- |
| **Listagem** | `--card/60%` opaco | `--border`                       | `backdrop-blur-lg` | Cards de recurso, linhas         |
| **Auth**     | `transparent`      | `--border/30%` + `glass-border-animated` | —                  | Login, registro, formulários     |
| **Stat**     | `--card/60%` opaco | `--border`                       | `backdrop-blur-lg` | Estatísticas, métricas           |
| **Dialog**   | `--card` sólido    | `--border`                       | `backdrop-blur-xl` | Modais, alertas, confirmações    |

### 4.4 Badges e Tags

| Tipo       | Fundo             | Texto               | Borda        | Uso                    |
| ---------- | ----------------- | ------------------- | ------------ | ---------------------- |
| **Role**   | Cor role + alpha  | Role cor (escura)   | Nenhuma      | Admin, Owner, Member   |
| **Status** | Status cor        | `#ffffff`           | Nenhuma      | Active, Idle, Offline  |
| **Tag**    | `--secondary`     | `--foreground`      | `--border`   | Categorização          |

### 4.5 Sidebar

| Estado       | Largura        | Icone | Labels  | Transição |
| ------------ | -------------- | ----- | ------- | --------- |
| **Expandida** | 240–280px      | Sim   | Sim     | 0.3s      |
| **Colapsada** | 64–72px        | Sim   | Não     | 0.3s      |
| **Mobile**   | 100% (drawer)  | Sim   | Sim     | Overlay   |

---

## 5. Efeitos e Animações

### 5.1 Glassmorphism (Apple Vision Pro)

```css
/* Cards Auth, Glassmorphism Base */
background: rgba(var(--background-rgb), 0.1);
backdrop-filter: blur(20px);
border: 1px solid rgba(var(--border-rgb), 0.2);
box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
```

**Dark Mode:**
```css
background: rgba(28, 28, 30, 0.15);
border: 1px solid rgba(229, 229, 234, 0.15);
```

### 5.2 Glass Border Animated

Borda com gradiente rotativo (`conic-gradient`) em 2 camadas independentes:

**Layer 1: Primary Glow**
- Duração: **8s** linear (reduzido de 6s para maior calma)
- Cor: `--primary`
- Eixo: rotativo 360°

**Layer 2: Cyan Reverse**
- Duração: **6s** reverse linear (reduzido de 4s para maior calma)
- Cor: cyan (`#00D4FF` light / `#30D7FF` dark)
- Eixo: rotativo 360° (reverso)

**Opacidade Dinâmica:**
- Repouso: `0.25` (suave)
- Hover: `0.7` (destaque)
- Transição: `0.3s cubic-bezier(0.16, 1, 0.3, 1)`

**Espessura (border-width):**
- Repouso: `0.5px`
- Hover: `1px`

**Recomendação de Uso:**
A redução de 6s/4s para 8s/6s é resultado de feedback de projetos em produção. Durações mais curtas (3s/2s) resultaram em percepção de agitação. Usar 8s/6s como padrão para calma visual; 6s/4s apenas se o design exigir movimento mais rápido.

### 5.3 Animações de Entrada (Auth, Onboarding)

| Animação         | Duração | Easing                     | Delay         | Uso                           |
| ---------------- | ------- | -------------------------- | ------------- | ----------------------------- |
| `auth-slide-up`  | 0.7s    | `cubic-bezier(0.16,1,0.3,1)` | 0.2–0.8s (stagger) | Branding/visual side          |
| `auth-form-slide` | 0.6s    | `cubic-bezier(0.16,1,0.3,1)` | 0.3–0.6s (stagger) | Form side                     |
| `particle-drift` | 12–18s  | `ease-in-out`              | Variado       | Partículas animadas grandes   |
| `particle-sm-drift` | 5–9s   | `ease-in-out`              | Variado       | Partículas pequenas           |
| `line-dash`      | 8–12s   | `linear`                   | Variado       | Linhas SVG, dashes            |
| `glow-pulse`     | 4–5s    | `ease-in-out`              | —             | Brilho, halos                 |
| `dot-blink`      | 2s      | `ease-in-out`              | —             | Pulsação em badges/status    |

### 5.4 Focus Ring e Acessibilidade

```css
/* Focus Ring — Padrão */
outline: 2px solid var(--ring);
outline-offset: 2px;

/* Fallback em Browsers Antigos */
box-shadow: 0 0 0 2px var(--background), 0 0 0 4px var(--ring);
```

---

## 6. Padrões de Layout

### 6.1 Auth Split Layout

**Desktop (≥768px):**
- Esquerdo (45%): Visual — imagem, gradiente, ilustração, partículas animadas.
- Direito (55%): Form — login/registro, card glassmorphic com `glass-border-animated`, toggle tema, footer.

**Mobile (<768px):**
- 100% form; visual removido ou minimizado (thumb-size).
- Responsivo via `md:flex`, fallback stack vertical.

### 6.2 Dashboard Grid

**Desktop:** Grid 3 colunas (cards de recurso, 1:1 aspect ou adaptável).
**Tablet:** Grid 2 colunas.
**Mobile:** Grid 1 coluna, stack vertical.

Gap: `gap-4` (16px), ajustável por contexto.

### 6.3 Sidebar Pattern

Navegação retratil. Menu items: ícone + label (expandida), ícone apenas (colapsada).

- Transição suave: `transition-all 0.3s ease-out`.
- Tooltip em hover (colapsada).
- Mobile: drawer overlay (100%, dismiss via backdrop).

### 6.4 Stats/Metrics Grid

Grid responsivo de cards de estatística (4 desktop, 2 tablet, 1 mobile).
Cada card: ícone, label, valor grande, trend (delta com cor status).

### 6.5 Tabs Structure

| Componente     | Padrão                    |
| -------------- | ------------------------- |
| Tab bar        | Bordas inferiores, hover underline |
| Active tab     | Underline `--primary`, texto bold |
| Inactive tab   | Texto `--muted-foreground` |
| Content pane   | Fade-in 0.2s ao alternar  |

---

## 7. Ícones

**Biblioteca recomendada:** Lucide Icons (`lucide-react` para React/Next.js).

**Ícones-base sugeridos:**
- Navigation: `Menu`, `Home`, `Settings`, `Bell`, `User`, `LogOut`.
- Actions: `Plus`, `Edit`, `Trash2`, `Copy`, `Share2`, `Download`.
- Status: `Check`, `AlertCircle`, `Info`, `Clock`.
- Ui: `ChevronDown`, `ChevronRight`, `X`, `Search`, `Eye`, `EyeOff`.

**Dimensões padrão:**
- Navegação: 24px.
- Inline: 16px.
- Grandes (hero): 32–64px.

**Cor:** Herdar de `currentColor` (herda texto do elemento pai).

---

## 8. CSS Custom Properties (Variáveis Globais)

Implementar em `globals.css` ou arquivo de tokens equivalente:

```css
/* Light Mode */
[data-theme="light"],
:root {
  --background: #ffffff;
  --foreground: #1d1d1f;
  --card: #ffffff;
  --card-foreground: #1d1d1f;
  --primary: #007AFF;
  --primary-foreground: #ffffff;
  --secondary: #f5f5f7;
  --muted: #f5f5f7;
  --muted-foreground: #86868b;
  --destructive: #FF3B30;
  --border: #e5e5ea;
  --ring: #007AFF;
  --background-rgb: 255, 255, 255;
  --border-rgb: 229, 229, 234;
}

/* Dark Mode */
[data-theme="dark"] {
  --background: #000000;
  --foreground: #f5f5f7;
  --card: #1c1c1e;
  --card-foreground: #f5f5f7;
  --primary: #0A84FF;
  --primary-foreground: #ffffff;
  --secondary: #2c2c2e;
  --muted: #2c2c2e;
  --muted-foreground: #98989d;
  --destructive: #FF453A;
  --ring: #0A84FF;
  --background-rgb: 0, 0, 0;
  --border-rgb: 92, 92, 96;
}
```

---

## 9. Implementação por Stack

### Next.js + Tailwind v4 + ShadCN/UI (new-york theme)

**1. Setup Tailwind config:**

```javascript
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: "hsl(var(--card))",
        "card-foreground": "hsl(var(--card-foreground))",
        primary: "hsl(var(--primary))",
        "primary-foreground": "hsl(var(--primary-foreground))",
        secondary: "hsl(var(--secondary))",
        muted: "hsl(var(--muted))",
        "muted-foreground": "hsl(var(--muted-foreground))",
        destructive: "hsl(var(--destructive))",
        border: "hsl(var(--border))",
        ring: "hsl(var(--ring))",
      },
    },
  },
};
```

**2. globals.css:**

```css
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 0 0% 11.4%;
    /* ... demais tokens em HSL ou HEX conforme preferência */
  }

  [data-theme="dark"] {
    --background: 0 0% 0%;
    --foreground: 0 0% 96.1%;
    /* ... demais tokens dark */
  }
}

@layer components {
  .glass-border-animated {
    background: rgba(var(--background-rgb, 255, 255, 255), 0.1);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(var(--border-rgb, 229, 229, 234), 0.2);
    animation: border-glow-dual infinite;
  }

  @keyframes border-glow-dual {
    0%, 100% {
      border-color: rgba(var(--primary-rgb), 0.25);
    }
    50% {
      border-color: rgba(var(--primary-rgb), 0.7);
    }
  }
}
```

**3. Componentes ShadCN:**

```bash
# Instalar base
npx shadcn-ui@latest init --defaults

# Adicionar específicas
npx shadcn-ui@latest add button card dialog input form
```

Usar composição completa:
```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export function MyCard() {
  return (
    <Card className="glass-border-animated">
      <CardHeader>
        <CardTitle>Título</CardTitle>
        <CardDescription>Descrição</CardDescription>
      </CardHeader>
      <CardContent>{/* content */}</CardContent>
    </Card>
  );
}
```

**4. next-themes para modo escuro:**

```tsx
// app/layout.tsx
import { ThemeProvider } from "next-themes";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <ThemeProvider attribute="data-theme" defaultTheme="dark">
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

### React Puro + CSS Modules

**1. Token file (`tokens.css`):**

Usar variables CSS globais (acima).

**2. Component:**

```tsx
import styles from "./MyComponent.module.css";

export function MyComponent() {
  return <div className={styles.card}>{/* ... */}</div>;
}
```

**3. Stylesheet:**

```css
/* MyComponent.module.css */
.card {
  background: var(--card);
  border: 1px solid var(--border);
  padding: 1rem;
  border-radius: 0.5rem;
}

.card:hover {
  background: var(--secondary);
}
```

### Vue + Tailwind v4

Mesma estratégia Tailwind config + CSS variables.

---

## 10. Validação e Checklist de Implementação

- [ ] Todos os tokens de cor definidos em `globals.css` ou equivalente.
- [ ] Tailwind config estende cores via variables.
- [ ] ShadCN/UI instalado com theme `new-york`.
- [ ] Focus rings testados (TAB navigation).
- [ ] Dark/light mode toggle funcional.
- [ ] Glass border animated aplicado a cards auth.
- [ ] Responsividade testada (mobile, tablet, desktop).
- [ ] Acessibilidade: contraste ≥4.5:1 (WCAG AA).
- [ ] Ícones Lucide importados e aplicados.
- [ ] Animações suave em transições de página (200ms fade + slide).

---

## 11. Referências Externas

- **Apple Human Interface Guidelines:** https://developer.apple.com/design/
- **Lucide Icons:** https://lucide.dev/
- **ShadCN/UI:** https://ui.shadcn.com/
- **Tailwind CSS:** https://tailwindcss.com/
- **Next.js App Router:** https://nextjs.org/docs/app
