import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check } from 'lucide-react'
import Link from 'next/link'

const PLANS = [
  {
    name: 'Grátis',
    price: 0,
    description: 'Para começar',
    features: [
      '30 minutos por mês',
      '1 usuário',
      'Exportação em texto',
      'Suporte por email',
    ],
    featured: false,
  },
  {
    name: 'Pro',
    price: 29,
    description: 'Mais popular',
    features: [
      '20 horas por mês',
      'Até 5 usuários',
      'Compartilhamento seguro',
      'Análise com IA',
      'Exportação SRT/VTT/DOCX',
      'Prioridade média',
    ],
    featured: true,
  },
  {
    name: 'Equipe',
    price: 89,
    description: 'Para empresas',
    features: [
      '80 horas por mês',
      'Usuários ilimitados',
      'API completa',
      'Suporte prioritário 24/7',
      'Webhooks & integrações',
      'SLA garantido',
    ],
    featured: false,
  },
]

export function Pricing() {
  return (
    <section className="px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Planos simples e transparentes
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Comece grátis, escale conforme sua necessidade.
          </p>
        </div>

        <div className="grid gap-8 sm:grid-cols-3">
          {PLANS.map((plan, idx) => (
            <Card
              key={idx}
              className={`relative flex flex-col bg-card/60 backdrop-blur-lg border-border/40 transition-all p-8 ${
                plan.featured
                  ? 'border-primary/40 shadow-2xl shadow-primary/10'
                  : ''
              }`}
            >
              {plan.featured && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground">
                    Mais popular
                  </Badge>
                </div>
              )}

              <div className="space-y-2 mb-6">
                <h3 className="text-xl font-semibold text-foreground">{plan.name}</h3>
                <p className="text-sm text-muted-foreground">{plan.description}</p>
              </div>

              <div className="mb-6">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-foreground">
                    {plan.price === 0 ? 'R$' : `R$ ${plan.price}`}
                  </span>
                  {plan.price > 0 && (
                    <span className="text-sm text-muted-foreground">/mês</span>
                  )}
                </div>
              </div>

              <Button
                asChild
                className={`mb-8 w-full ${
                  plan.featured
                    ? 'bg-primary hover:bg-primary/90'
                    : 'bg-primary/10 hover:bg-primary/20 text-primary'
                }`}
              >
                <Link href="/register">
                  {plan.price === 0 ? 'Começar grátis' : 'Começar trial'}
                </Link>
              </Button>

              <div className="space-y-3 flex-1">
                {plan.features.map((feature, fidx) => (
                  <div key={fidx} className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-foreground">{feature}</span>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
