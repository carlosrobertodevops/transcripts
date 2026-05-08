# UI Design Rules

## Tailwind & Tokens

- **PROIBIDO** cores hardcoded (ex: `bg-blue-500`, `text-red-600`).
- **OBRIGATÓRIO** tokens semânticos: `bg-background`, `bg-primary`, `bg-secondary`, `bg-destructive`, `bg-muted`, `text-foreground`, `text-muted-foreground`, `border-border`, `ring-ring`.
- Tokens herdados de `globals.css` via variáveis CSS (ex: `--background`, `--foreground`).
- Tailwind config referencia tokens via `colors` e `backgroundColor`.

## Cards & Dialogs

- `backdrop-blur` (overlay semitransparente com blur).
- `rounded-lg` (border-radius consistente).
- `shadow-sm` (sombra suave, não pesada).
- Classe `glass-border-animated` no hover (efeito glassmorphism com animação sutil de borda).
- Composição completa ShadCN: `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`.

## Background Pages

- Usar componente `<BgGrid />` em layouts.
- `BgGrid` renderiza linhas verticais + horizontais finais com blur gradual.
- Posiciona-se como background fixo atrás de `children`.
- Cria profundidade visual sem poluição.

## Login Layout

- **Desktop (≥768px)**: split 2/3 (visual/brand) + 1/3 (form).
- **Mobile (<768px)**: 100% form (visual removido ou thumb-size).
- Responsive via `md:flex` Tailwind.
- Visual side: imagem, gradiente ou ilustração; form side: inputs, botões, links.

## Page Transitions

- Motion lib (Framer Motion) para fade + slide-up.
- Duração: 200ms.
- Easing: `ease-out`.
- Keyar por pathname via `<AnimatePresence mode="wait" key={pathname}>`.

## Theme

- Dark mode **default**.
- Light mode via toggle.
- Usar `next-themes` + system preference detection.
- `<ThemeToggle />` em header (ícone Sol/Lua).
- Provider wrapper em root layout.

## Fontes

- **Sans**: Inter via `next/font/google`.
- **Mono**: JetBrains Mono via `next/font/google`.
- Aplicar ao `<html>` ou via CSS variable fallback.

## ShadCN/UI Components

- Theme: **new-york** (default moderno, sem arredondamentos extremos).
- Sempre composição completa (ex: `CardHeader` + `CardTitle` + `CardDescription` + `CardContent`).
- Prefira componentes base (Button, Card, Dialog, Form, Input, Textarea) a custom HTML.
- Estilize com Tailwind, nunca sobrescreva classes core ShadCN.

## Padrões Comuns

- **Forms**: react-hook-form + Zod + `<Form>` ShadCN para labels, inputs, errors.
- **Dialogs**: `<Dialog>` + `<DialogContent>` + `<DialogHeader>` + `<DialogTitle>` + body.
- **Loading**: skeleton loaders via ShadCN `<Skeleton>` ou spinner Lucide.
- **Empty states**: ícone Lucide + texto descritivo + CTA.
- **Notifications**: Sonner toast (não Alert nativo).

## Accessibility

- Labels explícitos em inputs.
- ARIA attributes quando necessário (role, aria-label, aria-describedby).
- Contraste ≥ 4.5:1 (WCAG AA) com tokens semânticos.
- Keyboard navigation: tab order lógico, focus outline visível.
