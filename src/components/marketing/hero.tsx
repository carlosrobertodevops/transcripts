import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { GlassCard } from '@/components/app/glass-card'
import Link from 'next/link'

export function Hero() {
  return (
    <section className="relative space-y-6 px-4 pt-20 text-center sm:pt-32 sm:px-6 lg:px-8">
      <div className="flex justify-center">
        <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
          Novo • Whisper-large-v3 em PT-BR
        </Badge>
      </div>

      <div className="mx-auto max-w-3xl space-y-4">
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
          Transcreva qualquer áudio em{' '}
          <span className="bg-gradient-to-r from-primary via-blue-400 to-cyan-400 bg-clip-text text-transparent">
            segundos
          </span>
        </h1>
        <p className="text-lg text-muted-foreground sm:text-xl">
          Em português brasileiro nativo. Compartilhe com sua equipe, analise com IA e exporte em múltiplos formatos.
        </p>
      </div>

      <div className="flex flex-col items-center justify-center gap-3 pt-4 sm:flex-row">
        <Link href="/register">
          <Button size="lg" className="bg-primary hover:bg-primary/90">
            Começar grátis
          </Button>
        </Link>
        <Link href="#features">
          <Button size="lg" variant="outline">
            Ver demonstração
          </Button>
        </Link>
      </div>

      <div className="pt-12 sm:pt-16">
        <GlassCard className="mx-auto max-w-2xl p-6 sm:p-8">
          <div className="space-y-4">
            <div className="flex items-start gap-3 border-b border-border/40 pb-4">
              <span className="font-mono text-xs font-semibold text-primary">00:00</span>
              <div className="flex-1 text-left">
                <p className="font-semibold text-foreground">Boa dia a todos vocês</p>
                <p className="text-sm text-muted-foreground">Speaker: João Silva</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="font-mono text-xs font-semibold text-primary">00:03</span>
              <div className="flex-1 text-left">
                <p className="font-semibold text-foreground">Vamos começar a reunião de planejamento trimestral</p>
                <p className="text-sm text-muted-foreground">Speaker: Maria Santos</p>
              </div>
            </div>
          </div>
        </GlassCard>
      </div>
    </section>
  )
}
