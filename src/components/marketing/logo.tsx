import { AudioWaveform } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
}

export function Logo({ size = 'md' }: LogoProps) {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-10 w-10',
  }

  const textClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
  }

  return (
    <div className="flex items-center gap-2">
      <div className={cn('flex items-center justify-center rounded-lg bg-primary/10 p-1.5')}>
        <AudioWaveform className={cn('text-primary', sizeClasses[size])} />
      </div>
      <span className={cn('font-semibold tracking-tight text-foreground', textClasses[size])}>
        transcripts
      </span>
    </div>
  )
}
