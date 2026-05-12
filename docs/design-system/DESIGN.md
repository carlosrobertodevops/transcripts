# FlowLinks Design System

**data:** 07/04/2026 **hora:** 10:00

## 1. Tema Visual e Atmosfera

FlowLinks usa uma linguagem visual inspirada na precisao editorial da Apple, mas aplicada a um produto SaaS multi-tenant de gerenciamento de links. O sistema alterna entre calma operacional e densidade administrativa: o dashboard deve parecer leve e rapido, enquanto admin e plataforma podem concentrar tabelas, estatisticas e controles sem perder clareza.

O visual base e minimalista, com superficies neutras, azul como sinal de acao, geometria arredondada e hierarquia tipografica contida. A interface nao deve competir com o conteudo salvo pelo usuario: links, thumbnails, tags, papeis, convites e estados precisam ser o foco.

FlowLinks tem dois modos de expressao no mesmo sistema:

- **Modo onboarding/auth:** mais atmosferico, com imagem de rede neural, blur, particulas, linhas SVG, glow e card de formulario com borda animada.
- **Modo produto/admin:** mais utilitario, com sidebar, grids, tabs, dialogs, cards compactos, tabelas e filtros.

**Caracteristicas principais:**

- Fundacao neutra: branco, preto e cinzas Apple-like.
- Azul como unico acento estrutural para CTA, foco, links e selecao.
- Dark mode como experiencia de primeira classe, nao tema secundario.
- Glassmorphism usado com parcimonia em auth, cards e dialogs.
- Geometria suave: cards, inputs e botoes com raio progressivo.
- Iconografia Lucide simples, funcional e consistente.
- Densidade controlada: dashboard respira; admin/plataforma condensam.
- Multi-tenant visivel por contexto, papeis, convites e estados.

## 2. Paleta de Cores e Papeis

> **Fontes internas:** `src/app/globals.css`, `docs/design-system/DESIGN-SYSTEM.md`, componentes shadcn em `src/components/ui/*`.

### Primarias

- **FlowLinks Blue Light** (`#007AFF`): acao primaria, links, foco, selecao e marca no light mode.
- **FlowLinks Blue Dark** (`#0A84FF`): acao primaria, links, foco e selecao no dark mode.
- **Ink** (`#1d1d1f`): texto principal no light mode.
- **Absolute Black** (`#000000`): fundo principal no dark mode e base do painel auth visual.

### Superficies

- **Pure White** (`#ffffff`): fundo e cards no light mode.
- **Apple Pale Gray** (`#f5f5f7`): superficie secundaria, sidebar light, muted e accent light.
- **Graphite Card** (`#1c1c1e`): cards, popovers e sidebar dark.
- **Graphite Secondary** (`#2c2c2e`): superficies secundarias, muted e accent dark.
- **Sidebar Light Accent** (`#e8e8ed`): item ativo/hover na sidebar light.

### Texto e Metadados

- **Muted Light** (`#86868b`): texto secundario, labels auxiliares, contadores e placeholders.
- **Muted Dark** (`#98989d`): texto secundario em dark mode.
- **Foreground Dark** (`#f5f5f7`): texto principal em dark mode.
- **White** (`#ffffff`): texto sobre azul, preto ou overlays escuros.

### Semanticas

- **Destructive Light** (`#FF3B30`): erros, exclusao e acoes destrutivas no light mode.
- **Destructive Dark** (`#FF453A`): erros, exclusao e acoes destrutivas no dark mode.
- **Success** (`#34C759` light, `#30D158` dark): visto, ativo, confirmacao.
- **Warning/Owner** (`#FF9500` light, `#FF9F0A` dark): owner, alertas leves, destaque administrativo.
- **Cyan** (`#5AC8FA` light, `#64D2FF` dark): apoio visual em auth, badges e brilho secundario.
- **Pink/Red Accent** (`#FF2D55` light, `#FF375F` dark): enfase visual rara, graficos e tags.

### Tokens CSS

| Token                |     Light |      Dark | Uso                   |
| -------------------- | --------: | --------: | --------------------- |
| `--background`       | `#ffffff` | `#000000` | Fundo de pagina       |
| `--foreground`       | `#1d1d1f` | `#f5f5f7` | Texto primario        |
| `--card`             | `#ffffff` | `#1c1c1e` | Cards e containers    |
| `--primary`          | `#007AFF` | `#0A84FF` | CTA, foco, selecao    |
| `--secondary`        | `#f5f5f7` | `#2c2c2e` | Superficie secundaria |
| `--muted`            | `#f5f5f7` | `#2c2c2e` | Fundos sutis          |
| `--muted-foreground` | `#86868b` | `#98989d` | Texto secundario      |
| `--destructive`      | `#FF3B30` | `#FF453A` | Erro e exclusao       |
| `--ring`             | `#007AFF` | `#0A84FF` | Focus ring            |
| `--sidebar`          | `#f5f5f7` | `#1c1c1e` | Sidebar               |
| `--sidebar-accent`   | `#e8e8ed` | `#2c2c2e` | Item ativo/hover      |

### Gradientes

O produto principal evita gradientes decorativos persistentes. Gradientes existem para:

- Texto da marca em auth: cyan para azul.
- Overlays de legibilidade sobre imagem auth.
- Separadores sutis via `linear-gradient(90deg, transparent, var(--foreground), transparent)`.
- Borda animada do card auth com `conic-gradient`.

## 3. Regras de Tipografia

### Familia

- **Sans principal:** Inter via `--font-sans`.
- **Heading:** Inter, usando a mesma familia para manter consistencia.
- **Mono:** JetBrains Mono via `--font-mono`, reservado para URLs, slugs e trechos tecnicos.
- **Substituto Apple:** Inter cumpre papel similar ao SF Pro em densidade, neutralidade e legibilidade.

### Hierarquia

| Papel           | Tamanho |    Peso | Line-height | Uso                                  |
| --------------- | ------: | ------: | ----------: | ------------------------------------ |
| Auth Hero       | 36-40px |     700 |       tight | Mensagem visual no painel esquerdo   |
| Auth Form Title |    24px |     700 |       tight | Login, registro, convite             |
| Page Title      | 18-24px | 600-700 |       tight | Dashboard, admin, plataforma, perfil |
| Section Title   | 16-20px |     600 |       tight | Cards, tabs, dialogs                 |
| Body            |    14px |     400 |      normal | Conteudo geral                       |
| Body Emphasis   |    14px | 500-600 |      normal | Labels, valores e estados            |
| Small           |    12px | 400-600 |      normal | Metadados, contadores, ajuda         |
| Micro UI        | 10-11px | 500-600 |      normal | Badges, labels uppercase, counters   |
| Mono            |    14px |     400 |      normal | URLs e dados tecnicos                |
| Stat            |    24px |     700 |       tight | Numeros em paines administrativos    |

### Principios

- **Compacta, nao apertada:** admin pode ter informacao densa, mas labels e contadores precisam respirar.
- **Peso antes de cor:** use `font-medium` ou `font-semibold` antes de adicionar novas cores.
- **Tracking pontual:** use `tracking-tight` em marca/titulos; use `tracking-wider` em labels uppercase da sidebar.
- **Microcopy discreta:** textos auxiliares devem usar `text-muted-foreground` e tamanho `xs`.
- **URLs legiveis:** URLs em cards devem ter truncamento e, quando necessario, fonte mono.

## 4. Estilo de Componentes

### Botoes

- **Primary:** fundo `primary`, texto `primary-foreground`, raio `md`, hover `primary/90`. Usar para entrar, criar conta, salvar, criar link, convidar.
- **Ghost:** transparente, texto muted, hover em `accent`. Usar para acoes secundarias e icones.
- **Outline:** transparente com contencao sutil. Usar para cancelar, voltar e opcoes neutras.
- **Destructive:** fundo `destructive`, texto branco. Usar apenas para deletar, suspender ou confirmar exclusao.
- **Icon:** quadrado 32-40px, raio `md`, iconografia Lucide 14-20px.
- **Capsules:** tags, filtros ativos e badges usam raio `full` com padding horizontal compacto.

### Cards e Containers

- **Link Card:** `card/60`, `backdrop-blur-lg`, thumbnail, titulo, URL, tags e acoes.
- **Auth Card:** max-width `md`, padding 32-40px, `rounded-2xl`, borda `border/30`, `glass-border-animated`.
- **Stat Card:** compacto, numero forte, label muted, usado em admin/plataforma/perfil.
- **Dialog Card:** superficie `card`, blur alto, borda sutil e conteudo vertical claro.
- **Admin Panels:** cards e tabelas devem favorecer leitura horizontal, com tabs separando dominios.

### Inputs e Forms

- Altura padrao: 40px; auth pode usar 44px.
- Fundo: `background/30` ou transparente em contextos glass.
- Borda: token `border` ou contencao visual por superficie/blur.
- Focus: `ring` azul e shimmer em auth quando aplicavel.
- Placeholder: `muted-foreground`.
- Erro: texto e contencao `destructive`, sem inventar nova paleta.

### Navegacao

- **Sidebar desktop:** 260px expandida, 68px colapsada, sticky full height.
- **Sidebar mobile:** Sheet lateral com largura aproximada 280px.
- **Header dashboard:** 64px, titulo e contador no desktop, marca compacta no mobile.
- **Admin/plataforma:** tabs estruturam dominios; header deve manter voltar, titulo e theme toggle.
- **Links de permissao:** admin e plataforma aparecem por papel, com cores discretas de status.

### Badges e Tags

- **Role badges:** outline com cor por papel.
- **Status badges:** outline com verde/vermelho conforme estado.
- **Tag badges:** cor dinamica por tag, legibilidade via `light-dark()` quando aplicavel.
- **Counters:** texto pequeno, baixa opacidade, alinhado a direita na sidebar.

### Imagens

- **Auth:** imagem `auth-network.png`, blur 6px, overlay escuro, particulas e linhas.
- **Link cards:** thumbnail deve apoiar reconhecimento rapido sem dominar layout.
- **Fallback:** ausencia de imagem precisa ser visualmente calma, com icone/link e estado vazio.
- **Refresh:** botao "sem capa" deve ser discreto e comunicar progresso com `RefreshCw` animado.

### Iconografia

Lucide React e a biblioteca padrao. Icones devem ser funcionais, nao decorativos em excesso.

| Icone                          | Uso                          |
| ------------------------------ | ---------------------------- |
| `Link2`                        | Marca, links, estados vazios |
| `LogIn`                        | Entrar                       |
| `UserPlus`                     | Criar conta, convite         |
| `ShieldCheck`                  | Admin de organizacao         |
| `Globe` / `Sparkles`           | Plataforma/super-admin       |
| `Eye` / `EyeOff`               | Vistos e nao vistos          |
| `Tags`                         | Area de tags                 |
| `Clock`                        | Aguardando                   |
| `Trash2`                       | Exclusao                     |
| `Sun` / `Moon`                 | Troca de tema                |
| `ChevronLeft` / `ChevronRight` | Sidebar colapsavel           |

## 5. Principios de Layout

### Sistema de Espacamento

- Unidade base: 4px/8px.
- Gap minimo: 4px para icone + texto em badges.
- Gap padrao: 8px para acoes inline.
- Gap de grupo: 16px para forms e areas funcionais.
- Padding de card: 16px para listagem, 32-40px para auth/dialogs.
- Padding de pagina: 16px mobile, 24-32px desktop.

### Grid e Container

- **Dashboard:** grid responsivo 1 coluna mobile, 2 colunas tablet, 3 colunas desktop largo.
- **Auth:** split 45/55 no desktop; painel visual oculto no mobile.
- **Admin:** largura ate `max-w-4xl`, com tabs e estatisticas.
- **Plataforma:** largura ate `max-w-5xl`, com mais colunas e densidade global.
- **Forms simples:** `max-w-sm` a `max-w-md`.

### Filosofia de Whitespace

- Dashboard deve parecer rapido e leve.
- Admin pode ser denso, mas precisa agrupar por tabs e cards.
- Plataforma pode expor mais informacao por viewport, desde que hierarquia fique obvia.
- Auth deve ser mais expressivo e emocional; produto interno deve ser mais operacional.
- Separacao deve vir de superficie, espaco e tipografia, nao de bordas pesadas.

### Escala de Radius

| Token          | Valor aproximado | Uso                                |
| -------------- | ---------------: | ---------------------------------- |
| `--radius-sm`  |              7px | Badges e tags pequenas             |
| `--radius-md`  |             10px | Inputs e botoes                    |
| `--radius-lg`  |             12px | Cards padrao                       |
| `--radius-xl`  |             17px | Dialogs e sheets                   |
| `--radius-2xl` |             22px | Auth card e containers de destaque |
| `full`         |            999px | Pills, tags, filtros ativos        |
| `50%`          |         circular | Avatar, dots, toggles circulares   |

## 6. Profundidade e Elevacao

| Nivel | Tratamento                                | Uso                           |
| ----- | ----------------------------------------- | ----------------------------- |
| 0     | Superficie plana `background`             | Fundo de pagina               |
| 1     | Tonal step `muted`, `secondary`, `accent` | Sidebar, filtros, estados     |
| 2     | `card/60` + `backdrop-blur-lg`            | Link cards, stats, rows       |
| 3     | `card` + `backdrop-blur-xl`               | Dialogs, popovers, sheets     |
| 4     | Glow/particulas/borda animada             | Auth apenas                   |
| Focus | `ring` azul                               | Teclado, selecao, input ativo |

Profundidade deve ser contida. Evite pilhas de sombra. FlowLinks ganha hierarquia com contraste, blur leve, raio e densidade.

### Profundidade Decorativa

- Auth pode usar particulas, linhas, glow e blur para comunicar tecnologia e rede.
- Produto interno deve evitar decoracao solta.
- Efeitos animados precisam ter baixa opacidade e nao bloquear leitura.

## 7. Do's and Don'ts

### Do

- Use tokens existentes de `globals.css` antes de criar novas cores.
- Reserve azul para acao, foco, links e selecao real.
- Preserve dark/light parity em todos componentes.
- Use Lucide com tamanho consistente e sem excesso decorativo.
- Agrupe areas administrativas por tabs, cards e labels claros.
- Mantenha auth mais visual e dashboard/admin mais utilitarios.
- Use estados vazios calmos, com icone, titulo curto e proxima acao.
- Trunque URLs e nomes longos sem quebrar grid.
- Mantenha permissao/role visivel quando ela muda comportamento.

### Don't

- Nao criar nova paleta de marca fora do azul/cinza/semanticas existentes.
- Nao usar sombras fortes para resolver separacao.
- Nao transformar todo componente em glassmorphism.
- Nao misturar familias tipograficas novas sem decisao explicita.
- Nao esconder acoes criticas atras de icones sem label quando contexto for ambiguidade.
- Nao usar cores de role como CTA principal.
- Nao deixar admin/plataforma parecerem outro produto.
- Nao remover foco visivel em inputs, botoes e menus.

## 8. Comportamento Responsivo

### Breakpoints

| Nome         |     Largura | Mudancas                                                      |
| ------------ | ----------: | ------------------------------------------------------------- |
| Small Mobile |   ate 374px | Uma coluna, labels compactos, filtros em pills                |
| Mobile       |   375-640px | Sidebar vira sheet, auth sem painel visual, header compacto   |
| Tablet       |   641-833px | Cards em 1-2 colunas, dialogs mantem max-width                |
| Tablet Wide  |  834-1023px | Sidebar desktop pode aparecer, grids mais estaveis            |
| Desktop      | 1024-1240px | Auth split, admin/plataforma completos, dashboard 2-3 colunas |
| Desktop Wide |     1241px+ | Dashboard 3 colunas, mais respiro lateral                     |

### Touch Targets

- Acoes principais devem ter 40px ou mais de altura.
- Icon buttons devem manter area clicavel 32-40px.
- Pills de filtro devem ter padding suficiente para toque.
- Tags no mobile devem quebrar linha sem sobrepor conteudo.

### Colapso

- Sidebar desktop colapsa para 68px e preserva icones.
- Sidebar mobile vira Sheet e deve fechar apos selecao de filtro/tag.
- Auth remove painel visual no mobile e preserva marca compacta.
- Link cards empilham em uma coluna e mantem acoes acessiveis.
- Admin/plataforma priorizam tabs, depois grids, depois tabelas com overflow controlado.

### Componentes Interativos Multi-Organização

#### Org-Switcher Dropdown

Localizado na sidebar (mobile: Sheet lateral), o seletor de organização permite trocar entre múltiplas memberships do usuário sem novo login.

**Estrutura visual:**

- **Trigger:** ícone `Building2` (primário), texto com nome da org (truncado em `max-w-[calc(100vw-2rem)]` mobile), role como sublabel `text-[0.65rem] muted-foreground` (desktop/tablet apenas), chevrons collapse indicator. Em collapse mode, apenas ícone e spinner visível.
- **Ativo:** ícone `Loader2` animado durante transição (cor `primary`, `animate-spin`).
- **Content:** largura fixa 256px, máximo 100vw menos margins.
- **Memberships lista:** cada item mostra name (truncado), star icon (`h-3 w-3 fill-yellow-500`) se default, check mark (`text-primary`) se active org.
- **Sub-menu "Definir padrão":** lista de orgs com badge "atual" em secondary variant para membership já padrão; itens ativos disabled.
- **"Sair desta organização":** item destrutivo (texto `destructive`), apenas se user não é owner ou orgs count > 1. Confirma via `window.confirm()` antes de executar.

**Feedback:**

- Spinner Loader2 com `animate-spin` durante troca de org.
- Toast success: `toast.success("Agora visualizando [org name]")` após switch.
- Toast error: `toast.error("Organização suspensa ou inativa")` ou mensagem genérica se erro.
- Toast success: `toast.success("[org name] definida como padrão")` após set default.

**Acessibilidade:**

- Trigger: `aria-label="Trocar organização"` em DropdownMenuTrigger.
- Cada org item: `aria-current="true"` quando `isActive`, undefined caso contrário.
- Focus ring: `focus-visible:ring-2 focus-visible:ring-ring` (via `ring` token).
- Keyboard: arrow keys navegar orgs, Enter/Space ativa, Escape fecha dropdown (ShadCN padrão).
- Spinner animation: `Loader2` com `animate-spin` não bloqueia input, apenas visual.

#### Loader2 Spinner Pattern

Sempre que uma ação multi-org está em curso (`handleSwitch`, `handleDefault`, `handleLeave`), exibe `Loader2` animado durante transition.

**Uso:**

```tsx
const [pending, start] = useTransition()
// Em trigger/button: {pending ? <Loader2 className="animate-spin" /> : <IconDefault />}
// Em content: disabled={pending} para impedir múltiplos cliques
```

**Estilo:** `h-4 w-4` (ou `h-3.5 w-3.5` em compact), `text-primary`, `animate-spin`.

#### Toast Feedback (Sonner)

FlowLinks usa sonner para feedback não-modal durante Server Actions em multi-org:

- **Success:** `toast.success("Mensagem em português")`— verde (token `success`), ícone check.
- **Error:** `toast.error("Mensagem em português")` — vermelho (token `destructive`), ícone X.
- **Default:** `toast("Mensagem")` — neutro, raramente usado em multi-org.

Mensagens devem ser **breves** (máx 60 caracteres), ativas (verbo no gerúndio ou passado simples), e contextuais ("Agora visualizando Acme Inc." em vez de "Organização alterada").

## 9. Guia de Prompts para Agentes

### Referencia Rapida de Cor

- Acao light: `#007AFF`.
- Acao dark: `#0A84FF`.
- Fundo light: `#ffffff`.
- Fundo dark: `#000000`.
- Surface light: `#f5f5f7`.
- Surface dark: `#1c1c1e` / `#2c2c2e`.
- Texto light: `#1d1d1f`.
- Texto dark: `#f5f5f7`.
- Muted light: `#86868b`.
- Muted dark: `#98989d`.
- Destructive light: `#FF3B30`.
- Destructive dark: `#FF453A`.

### Prompts de Componentes

- "Crie um card de link FlowLinks com superficie `card/60`, blur leve, thumbnail, titulo, URL truncada, tags em pills e acoes discretas."
- "Desenhe uma tela auth FlowLinks com split 45/55, painel visual escuro com rede neural, particulas cyan/azul e formulario em card glass com borda animada."
- "Construa um painel admin FlowLinks com tabs, stats compactas, tabela de membros e controles de role usando badges outline por papel."
- "Crie uma sidebar FlowLinks colapsavel com logo `Link2`, filtros Todos/Nao vistos/Vistos, lista de tags com contadores e rodape de acoes."
- "Desenhe estado vazio para dashboard de links com icone `Link2`, texto curto, muted foreground e CTA primario para Novo Link."

### Guia de Iteracao

1. Comece pelos tokens existentes, nao por novas cores.
2. Decida modo da tela: auth atmosferico ou produto operacional.
3. Ajuste densidade antes de adicionar ornamento.
4. Preserve azul apenas para acoes e selecao.
5. Valide dark/light em paralelo.
6. Verifique mobile antes de aceitar layout desktop.
7. Confirme permissao, role e organizacao quando UI mudar por contexto.

### Lacunas Conhecidas

- `docs/design-system/DESIGN-SYSTEM.md` e este documento devem ser mantidos sincronizados quando tokens mudarem.
- Estados de erro/sucesso ainda dependem bastante de classes Tailwind pontuais.
- Tabelas densas de admin/plataforma podem precisar de regras especificas de overflow e truncamento.
- Motion ainda e mais detalhado no auth do que no resto do produto.
