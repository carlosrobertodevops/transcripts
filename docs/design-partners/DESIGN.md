# DESIGN.md — Padrão Visual Genérico

**Versão:** 1.0  
**Data:** 07/04/2026

Este documento define a filosofia de design visual para aplicações SaaS modernas, aplicável a novos projetos e extensões. Não é específico de produto; serves como template genérico para refletir princípios universalmente adotados em interfaces administrativas, dashboards e fluxos de autenticação.

Ver `./DESIGN-SYSTEM.md` para tokens de cores, tipografia, espaçamento e especificações completas de componentes.

---

## 1. Tema Visual e Atmosfera

A linguagem visual segue a precisão editorial combinada com expressão SaaS moderna. O sistema alterna entre dois modos visuais:

- **Modo autenticação:** mais atmosférico, com elementos decorativos, blur, efeitos de movimento, animações de borda e profundidade visual. Comunica tecnologia, confiança e humanidade.
- **Modo produto:** mais utilitário, com sidebar, grids, tabelas, dialogs e cards compactos. Prioriza funcionalidade, velocidade de leitura e densidade controlada.

**Características principais:**

- Fundação neutra: branco, preto e cinzas em escala linear.
- Azul como único acento estrutural para ações, foco e seleção.
- Dark mode como experiência de primeira classe, com paridade completa.
- Glassmorphism usado com parcimônia em auth, cards e dialogs.
- Geometria suave: raios consistentes, sem arestas duras.
- Iconografia funcional via Lucide, simples e consistente.
- Densidade controlada: dashboard respira; admin concentra informação com hierarquia clara.
- Multi-tenant visível por contexto, papéis, estados e badges discretas.

---

## 2. Paleta de Cores e Papéis

### Cores Primárias

- **Azul Light** (`#007AFF`): ação primária, links, foco e seleção em modo claro.
- **Azul Dark** (`#0A84FF`): ação primária, links, foco e seleção em modo escuro.
- **Texto Light** (`#1d1d1f`): texto principal em fundo claro.
- **Preto Absoluto** (`#000000`): fundo em dark mode e base visual.

### Superfícies

- **Branco Puro** (`#ffffff`): fundo e cards em light mode.
- **Cinza Light Accent** (`#f5f5f7`): superfícies secundárias, sidebar, muted e accent.
- **Card Dark** (`#1c1c1e`): cards, popovers e sidebar em dark mode.
- **Cinza Secundário Dark** (`#2c2c2e`): superfícies e componentes secundários.
- **Sidebar Light Accent** (`#e8e8ed`): item ativo/hover em light mode.

### Texto e Metadados

- **Muted Light** (`#86868b`): texto secundário, labels, placeholders.
- **Muted Dark** (`#98989d`): texto secundário em dark mode.
- **Foreground Dark** (`#f5f5f7`): texto principal em dark mode.
- **Branco** (`#ffffff`): texto sobre cores escuras ou sobreposições.

### Semânticas

- **Destructive Light** (`#FF3B30`): erros e ações destrutivas em light mode.
- **Destructive Dark** (`#FF453A`): erros e ações destrutivas em dark mode.
- **Success** (`#34C759` light, `#30D158` dark): confirmação, estado ativo.
- **Warning** (`#FF9500` light, `#FF9F0A` dark): alertas, destaques leves.
- **Info/Cyan** (`#5AC8FA` light, `#64D2FF` dark): apoio visual, badges, ênfase secundária.

### Tokens CSS

| Token                | Light     | Dark      | Uso                      |
| -------------------- | --------- | --------- | ------------------------ |
| `--background`       | `#ffffff` | `#000000` | Fundo de página          |
| `--foreground`       | `#1d1d1f` | `#f5f5f7` | Texto primário           |
| `--card`             | `#ffffff` | `#1c1c1e` | Cards e containers       |
| `--primary`          | `#007AFF` | `#0A84FF` | CTA, foco, seleção       |
| `--secondary`        | `#f5f5f7` | `#2c2c2e` | Superfície secundária     |
| `--muted`            | `#f5f5f7` | `#2c2c2e` | Fundos sutis             |
| `--muted-foreground` | `#86868b` | `#98989d` | Texto secundário          |
| `--destructive`      | `#FF3B30` | `#FF453A` | Erro e exclusão           |
| `--ring`             | `#007AFF` | `#0A84FF` | Focus ring                |
| `--border`           | `#e5e5e7` | `#424245` | Bordas em cards/inputs    |

### Gradientes

Gradientes decorativos são mínimos fora do modo auth:

- Texto da marca em auth: transição suave de cyan para azul.
- Overlays de legibilidade sobre imagens de fundo.
- Separadores sutis via `linear-gradient(90deg, transparent, var(--foreground), transparent)`.
- Borda animada do card auth via `conic-gradient`.

---

## 3. Regras de Tipografia

### Família

- **Sans principal:** Inter via `--font-sans`.
- **Heading:** Inter (consistência visual).
- **Mono:** JetBrains Mono via `--font-mono`, reservado para URLs, códigos e slugs.

### Hierarquia

| Papel          | Tamanho  | Peso      | Line-height | Uso                               |
| -------------- | -------- | --------- | ----------- | --------------------------------- |
| Auth Hero      | 36-40px  | 700       | tight       | Mensagem visual no painel lateral  |
| Auth Form      | 24px     | 700       | tight       | Login, registro, convites         |
| Page Title     | 18-24px  | 600-700   | tight       | Dashboards, admin, perfil         |
| Section Title  | 16-20px  | 600       | tight       | Cards, tabs, dialogs              |
| Body           | 14px     | 400       | normal      | Conteúdo geral                    |
| Body Emphasis  | 14px     | 500-600   | normal      | Labels, valores, estados          |
| Small          | 12px     | 400-600   | normal      | Metadados, contadores, ajuda      |
| Micro UI       | 10-11px  | 500-600   | normal      | Badges, labels uppercase          |
| Mono           | 14px     | 400       | normal      | URLs e dados técnicos             |
| Stat           | 24px     | 700       | tight       | Números em painéis admin          |

### Princípios

- **Compacta, não apertada:** admin pode ter informação densa com espaçamento respirável.
- **Peso antes de cor:** use `font-medium` ou `font-semibold` antes de adicionar novas cores.
- **Tracking pontual:** use `tracking-tight` em marcas/títulos; `tracking-wider` em labels uppercase.
- **Microcopy discreta:** textos auxiliares usam `text-muted-foreground` e tamanho `xs`.

---

## 4. Estilo de Componentes

### Botões

- **Primary:** fundo `primary`, texto branco, raio `md`, hover `primary/90`. Entrar, criar, salvar.
- **Ghost:** transparente, texto muted, hover em secondary. Ações secundárias.
- **Outline:** borda sutil, fundo transparente. Cancelar, voltar, opções neutras.
- **Destructive:** fundo `destructive`, texto branco. Deletar, suspender, confirmar exclusão.
- **Icon:** quadrado 32-40px, raio `md`, iconografia 14-20px.
- **Pills:** tags, filtros e badges usam raio `full` com padding compacto.

### Cards e Containers

- **Card base:** `card/60`, `backdrop-blur-lg`, borda sutil, padding 16px.
- **Auth card:** max-width `md`, padding 32-40px, `rounded-2xl`, borda animada.
- **Stat card:** compacto, número destacado, label muted.
- **Dialog:** superfície `card`, blur alto, borda sutil, conteúdo vertical claro.
- **Admin panels:** cards e tabelas em layout horizontal claro, tabs separando domínios.

### Inputs e Forms

- Altura padrão: 40px; auth pode usar 44px.
- Fundo: `background/30` ou transparente em contextos glass.
- Borda: token `border` ou contencão visual via blur.
- Focus: `ring` azul com shimmer em auth quando aplicável.
- Placeholder: `muted-foreground`.
- Erro: `destructive` em texto e contorno, sem paleta inventada.

### Navegação

- **Sidebar desktop:** expandida 260px, colapsada 68px, sticky full height.
- **Sidebar mobile:** Sheet lateral aproximadamente 280px.
- **Header dashboard:** 64px, título e controles no desktop, compacto no mobile.
- **Admin/produto:** tabs estruturam domínios; header mantém voltar, título e theme toggle.

### Badges e Tags

- **Role badges:** outline com cor por papel, baixa saturação.
- **Status badges:** outline com verde (ativo) / vermelho (inativo).
- **Tag badges:** cor dinâmica, legibilidade mantida.
- **Contadores:** texto pequeno, opacidade baixa, alinhado à direita.

### Iconografia

Lucide React é a biblioteca padrão. Ícones devem ser funcionais, sem excesso decorativo.

| Ícone                | Uso                         |
| -------------------- | --------------------------- |
| Link2                 | Marca, navegação            |
| LogIn                 | Entrar                      |
| UserPlus              | Criar conta, convidar       |
| ShieldCheck           | Admin                       |
| Globe / Sparkles      | Super-admin, plataforma     |
| Eye / EyeOff          | Visibilidade                |
| Tags                  | Categorização               |
| Trash2                | Exclusão                    |
| Sun / Moon            | Troca de tema               |
| ChevronLeft / Right   | Navegação, colapso          |

---

## 5. Princípios de Layout

### Sistema de Espaçamento

- Unidade base: 4px/8px.
- Gap mínimo: 4px entre ícone + texto.
- Gap padrão: 8px para ações inline.
- Gap de grupo: 16px para forms, áreas funcionais.
- Padding de card: 16px para listas, 32-40px para auth/dialogs.
- Padding de página: 16px mobile, 24-32px desktop.

### Grid e Container

- **Dashboard:** 1 coluna mobile, 2 tablet, 3 desktop.
- **Auth:** split 45/55 desktop; visual oculto mobile.
- **Admin:** até `max-w-4xl`, tabs e estatísticas.
- **Plataforma:** até `max-w-5xl`, mais colunas e densidade.
- **Forms simples:** `max-w-sm` a `max-w-md`.

### Filosofia de Whitespace

- Dashboard deve parecer rápido e leve.
- Admin pode ser denso, mas precisa agrupar por tabs e cards.
- Plataforma pode expor mais informação, desde que hierarquia seja óbvia.
- Auth deve ser mais expressiva; produto interno mais operacional.
- Separação vem de superfície, espaço e tipografia, não bordas pesadas.

### Escala de Radius

| Token        | Valor aproximado | Uso                              |
| ------------ | ---------------: | -------------------------------- |
| `--radius-sm` |              7px | Badges e tags pequenas           |
| `--radius-md` |             10px | Inputs, botões                   |
| `--radius-lg` |             12px | Cards padrão                     |
| `--radius-xl` |             17px | Dialogs, sheets                  |
| `--radius-2xl`|             22px | Auth card, containers destaque   |
| `full`       |            999px | Pills, filtros, tags             |
| `50%`        |         circular | Avatares, toggles circulares     |

---

## 6. Profundidade e Elevação

| Nível | Tratamento                           | Uso                    |
| ----- | ------------------------------------ | ---------------------- |
| 0     | Plana `background`                   | Fundo de página        |
| 1     | Tonal step `muted`, `secondary`      | Sidebar, filtros       |
| 2     | `card/60` + `backdrop-blur-lg`       | Cards, stats, rows     |
| 3     | `card` + `backdrop-blur-xl`          | Dialogs, sheets        |
| 4     | Glow, partículas, borda animada      | Auth apenas            |
| Focus | `ring` azul claro                    | Foco, seleção          |

Profundidade contida. Evitar pilhas de sombra. Ganhar hierarquia com contraste, blur leve, raio e densidade.

### Profundidade Decorativa

- Auth pode usar partículas, linhas, glow e blur para comunicar tecnologia.
- Produto interno evita decoração solta.
- Efeitos animados têm baixa opacidade e não bloqueiam leitura.

---

## 7. Do's and Don'ts

### Do

- Use tokens existentes antes de criar novas cores.
- Reserve azul para ação, foco, links e seleção real.
- Preserve dark/light parity em todos componentes.
- Use Lucide com tamanho consistente, sem excesso decorativo.
- Agrupe áreas administrativas por tabs, cards e labels claros.
- Mantenha auth visual e dashboard utilitário.
- Use estados vazios calmos: ícone, título curto e próxima ação.
- Trunque URLs e nomes longos sem quebrar grid.
- Mantenha papel/permissão visível quando muda comportamento.

### Don't

- Não criar nova paleta de marca fora do azul/cinza/semânticas.
- Não usar sombras fortes para resolver separação.
- Não transformar todo componente em glassmorphism.
- Não misturar famílias tipográficas sem decisão explícita.
- Não esconder ações críticas atrás de ícones sem label quando contexto for ambíguo.
- Não usar cores de papel como CTA principal.
- Não deixar admin/produto parecerem outro produto.
- Não remover foco visível em inputs, botões e menus.

---

## 8. Comportamento Responsivo

### Breakpoints

| Nome        | Largura       | Mudanças                                  |
| ----------- | ------------- | ----------------------------------------- |
| Small Mobile| até 374px     | Uma coluna, labels compactos              |
| Mobile      | 375-640px     | Sidebar vira sheet, auth sem painel       |
| Tablet      | 641-833px     | Cards 1-2 colunas, dialogs mantêm width   |
| Tablet Wide | 834-1023px    | Sidebar desktop pode aparecer             |
| Desktop     | 1024-1240px   | Auth split, admin/produto completos       |
| Desktop Wide| 1241px+       | Mais respiro lateral, grids estáveis      |

### Touch Targets

- Ações principais: 40px ou mais de altura.
- Icon buttons: 32-40px de área clicável.
- Pills de filtro: padding suficiente para toque.
- Tags mobile: quebram linha sem sobrepor.

### Colapso

- Sidebar desktop colapsa para 68px com ícones.
- Sidebar mobile vira Sheet e fecha após seleção.
- Auth remove painel visual mobile.
- Cards empilham e mantêm ações acessíveis.
- Admin/produto: tabs, depois grids, depois tabelas com overflow controlado.

---

## 9. Padrão de Multi-tenant (Quando Aplicável)

### Org/Workspace Switcher

Localizado na sidebar, permite trocar entre múltiplos contextos sem novo login.

**Estrutura visual:**

- **Trigger:** ícone funcional, texto com nome (truncado), sublabel com papel (desktop apenas), chevron de colapso.
- **Content:** largura fixa 256px, máximo 100vw menos margins.
- **Memberships:** cada item mostra nome, star/check se padrão/ativo.
- **Sub-menu "Definir padrão":** lista com badge "atual" para membership padrão.
- **"Sair deste contexto":** item destrutivo apenas se múltiplos contextos.

**Feedback:**

- Spinner durante troca de contexto.
- Toast success: "Agora visualizando [nome]" após switch.
- Toast error genérico se falha.

**Acessibilidade:**

- `aria-label` no trigger.
- `aria-current="true"` no item ativo.
- Focus ring azul.
- Keyboard: arrow keys navegar, Enter/Space ativa, Escape fecha.

---

## 10. Como Adotar em Novo Projeto

### Checklist de Setup

1. **Clonar tokens:** copie as definições de `DESIGN-SYSTEM.md` para `src/app/globals.css` (ou equivalent).
2. **Instalar dependências:** Tailwind v4, shadcn/ui (new-york theme), Lucide React, Framer Motion.
3. **Theme provider:** configure `next-themes` com dark mode como default.
4. **Fontes:** registre Inter + JetBrains Mono via `next/font/google`.
5. **Layout base:** 2-mode layout com `<AnimatePresence>` para transições (auth + produto).
6. **Sidebar:** componente colapsável 260px/68px desktop, Sheet mobile.
7. **Componentes padrão:** Button, Card, Form, Input, Dialog, DropdownMenu via shadcn.
8. **Validação:** audit dark/light, responsividade mobile, touch targets, foco visível.

### Validação de Conformidade

Antes de aceitar um design novo ou componente:

1. Usa tokens de `globals.css`? (sem hardcoded colors)
2. Dark mode é automaticamente suportado? (não quebra em dark)
3. Touch targets ≥ 40px em mobile? (ou 32px para icon buttons)
4. Focus ring visível em inputs/botões? (ring azul)
5. Hierarquia tipográfica clara? (não mais de 3-4 tamanhos diferentes)
6. Espaçamento consistente? (múltiplos de 4px)
7. Ícones Lucide? (sem ícones customizados não documentados)

### Migração de Design Legado

Se herdando um projeto com design inconsistente:

1. Mapeie cores hardcoded → tokens genéricos mais próximos.
2. Homogeneize radii usando a escala acima.
3. Normalize tipografia para hierarquia padrão.
4. Audit dark mode: adicione fallbacks `light-dark()` onde necessário.
5. Documente exceções em seção "Lacunas Conhecidas" do novo DESIGN.md.

---

## 11. Lacunas Conhecidas e Extensões Futuras

- Estados de erro/sucesso podem precisar de rules Tailwind pontuais por contexto.
- Tabelas densas de admin podem exigir regras de overflow e truncamento específicas.
- Motion pode ser mais detalhado em auth que no resto do produto.
- Suporte a temas customizados (multi-brand) não está definido neste documento.
- Componentes de data picker, time picker podem precisar de guias adicionais.

---

## 12. Referência Rápida de Cor

Azul light: `#007AFF` · Azul dark: `#0A84FF` · Fundo light: `#ffffff` · Fundo dark: `#000000` · Surface light: `#f5f5f7` · Surface dark: `#1c1c1e` · Muted light: `#86868b` · Muted dark: `#98989d` · Destructive light: `#FF3B30` · Destructive dark: `#FF453A` · Success light: `#34C759` · Success dark: `#30D158`

---

**Manutenção:** Este documento e `DESIGN-SYSTEM.md` devem ser sincronizados quando tokens mudarem. Atualizações devem ser propostas via PR com justificativa de mudança.
