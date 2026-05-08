import { Card } from '@/components/ui/card'
import { Mic, Languages, Users, Sparkles } from 'lucide-react'

const FEATURES = [
  {
    icon: Mic,
    title: 'Áudio e vídeo em qualquer formato',
    description: '.opus, .mp3, .wav, .flac, .mp4, .mov, .mkv e mais. Suporta qualquer codec.',
  },
  {
    icon: Languages,
    title: 'Português brasileiro nativo',
    description: 'Whisper-large-v3 fine-tuned para PT-BR. Sem sotaque, gírias e contexto regional.',
  },
  {
    icon: Users,
    title: 'Compartilhe com sua equipe',
    description: 'Compartilhamento por email, edição colaborativa em tempo real e permissões granulares.',
  },
  {
    icon: Sparkles,
    title: 'Análise automática com IA',
    description: 'Resumo, palavras-chave, tópicos principais e sentimento extraídos automaticamente.',
  },
]

export function Features() {
  return (
    <section id="features" className="px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Tudo que você precisa para transcrever
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Ferramentas poderosas para capturar, analisar e compartilhar conhecimento em áudio.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature, idx) => {
            const Icon = feature.icon
            return (
              <Card
                key={idx}
                className="group relative overflow-hidden bg-card/60 backdrop-blur-lg border-border/40 hover:border-primary/40 transition-colors p-6"
              >
                <div className="space-y-3">
                  <div className="inline-flex rounded-lg bg-primary/10 p-3">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              </Card>
            )
          })}
        </div>
      </div>
    </section>
  )
}
