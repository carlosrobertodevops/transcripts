import { AudioWaveform } from 'lucide-react'

export function VisualPanel() {
  return (
    <div className="relative h-full flex flex-col items-center justify-center px-8">
      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Radial glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-blue-500/5 to-transparent opacity-40 blur-3xl" />

        {/* Animated dots */}
        <svg
          className="absolute inset-0 h-full w-full opacity-20"
          viewBox="0 0 400 600"
          preserveAspectRatio="xMidYMid slice"
        >
          <defs>
            <filter id="blur">
              <feGaussianBlur in="SourceGraphic" stdDeviation="2" />
            </filter>
          </defs>
          {[...Array(20)].map((_, i) => (
            <circle
              key={i}
              cx={Math.random() * 400}
              cy={Math.random() * 600}
              r={Math.random() * 2 + 1}
              fill="rgba(0, 200, 255, 0.6)"
              filter="url(#blur)"
              opacity={Math.random() * 0.5 + 0.3}
              className="animate-pulse"
              style={{
                animationDelay: `${Math.random() * 2}s`,
              }}
            />
          ))}
        </svg>
      </div>

      {/* Content */}
      <div className="relative z-10 text-center space-y-6">
        <div className="flex justify-center">
          <div className="rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 p-4 backdrop-blur-xl border border-cyan-500/30">
            <AudioWaveform className="h-12 w-12 text-cyan-400" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-white">
            transcripts
          </h1>
          <p className="text-lg text-slate-300 max-w-sm mx-auto">
            Transcreva qualquer áudio em segundos. Em português brasileiro.
          </p>
        </div>

        {/* Benefits */}
        <ul className="space-y-3 text-sm text-slate-400 flex flex-col items-start">
          <li className="flex items-center gap-3">
            <div className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
            <span>Qualidade profissional com IA</span>
          </li>
          <li className="flex items-center gap-3">
            <div className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
            <span>Compartilhamento seguro com equipe</span>
          </li>
          <li className="flex items-center gap-3">
            <div className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
            <span>Análise automática e insights</span>
          </li>
        </ul>
      </div>
    </div>
  )
}
