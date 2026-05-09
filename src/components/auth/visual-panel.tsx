import Image from 'next/image'
import { AudioWaveform } from 'lucide-react'

export const VisualPanel = () => {
  return (
    <div className="relative h-full flex flex-col items-center px-8 pt-[100px] pb-12 overflow-y-auto">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
        {/* Primary gradient — blue-only fade (no red/accent) */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/8 to-transparent opacity-50 blur-3xl" />

        {/* Centered radial pulse glow — large blue blur behind content */}
        <div
          className="absolute top-1/3 left-1/2 w-[600px] h-[600px] rounded-full blur-3xl opacity-40 animate-pulse"
          style={{
            transform: 'translate(-50%, -50%)',
            background:
              'radial-gradient(circle, color-mix(in srgb, var(--primary) 35%, transparent) 0%, transparent 70%)',
            animationDuration: '6s',
          }}
        />

        {/* Subtle horizontal shimmer sweep */}
        <div
          className="absolute inset-0 opacity-25"
          style={{
            backgroundImage:
              'linear-gradient(90deg, transparent 0%, color-mix(in srgb, var(--primary) 8%, transparent) 50%, transparent 100%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer-sweep 8s linear infinite',
          }}
        />

        {/* Particle SVG — 40 circles, varied sizes, primary only */}
        <svg
          role="presentation"
          aria-hidden="true"
          className="absolute inset-0 h-full w-full opacity-30"
          viewBox="0 0 400 600"
          preserveAspectRatio="xMidYMid slice"
        >
          <defs>
            <filter id="blur">
              <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" />
            </filter>
          </defs>
          {[...Array(40)].map((_, i) => {
            const size = Math.random() * 3 + 0.5 // Vary 0.5–3.5 radius
            return (
              <circle
                key={i}
                cx={Math.random() * 400}
                cy={Math.random() * 600}
                r={size}
                fill="currentColor"
                className="text-primary animate-pulse"
                filter="url(#blur)"
                opacity={Math.random() * 0.6 + 0.25}
                style={{
                  animationDelay: `${Math.random() * 3}s`,
                  animationDuration: `${Math.random() * 4 + 3}s`, // 3–7s per particle
                }}
              />
            )
          })}
        </svg>
      </div>

      {/* Logo top-center */}
      <div className="relative z-10 flex justify-center mb-[100px]">
        <Image
          src="/logo.png"
          alt="Transcripts logo"
          width={300}
          height={300}
          priority
          className="h-[300px] w-[300px] object-contain drop-shadow-[0_0_48px_var(--primary)]"
        />
      </div>

      {/* Content after logo */}
      <div className="relative z-10 text-center space-y-6">
        <div className="flex flex-col items-center gap-4">
          <div className="rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 p-4 backdrop-blur-xl border border-primary/30">
            <AudioWaveform className="h-12 w-12 text-primary" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            transcripts
          </h1>
          <p className="text-lg text-muted-foreground max-w-sm mx-auto">
            Transcreva qualquer áudio em segundos. Em português brasileiro.
          </p>
        </div>

        {/* Benefits */}
        <ul className="space-y-3 text-sm text-muted-foreground flex flex-col items-start">
          <li className="flex items-center gap-3">
            <div className="h-1.5 w-1.5 rounded-full bg-primary" />
            <span>Qualidade profissional com IA</span>
          </li>
          <li className="flex items-center gap-3">
            <div className="h-1.5 w-1.5 rounded-full bg-primary" />
            <span>Compartilhamento seguro com equipe</span>
          </li>
          <li className="flex items-center gap-3">
            <div className="h-1.5 w-1.5 rounded-full bg-primary" />
            <span>Análise automática e insights</span>
          </li>
        </ul>
      </div>

    </div>
  )
}
