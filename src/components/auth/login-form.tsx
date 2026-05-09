'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useProximity } from '@/hooks/use-proximity'
import type { CSSProperties } from 'react'

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
})

type LoginFormData = z.infer<typeof loginSchema>

export function LoginForm() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const { ref: cardRef, proximity } = useProximity<HTMLDivElement>({ radius: 260 })
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        toast.error(error.message || error.error || 'Credenciais inválidas')
        setIsLoading(false)
        return
      }

      toast.success('Login realizado com sucesso!')
      router.push('/dashboard')
    } catch (error) {
      toast.error('Erro ao conectar ao servidor')
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Entrar
        </h1>
        <p className="text-sm text-muted-foreground">
          Acesse sua conta transcripts
        </p>
      </div>

      <Card
        ref={cardRef}
        style={{ '--proximity': proximity } as CSSProperties}
        className="glass-border-animated border border-border/40 bg-card/60 backdrop-blur-lg p-[16pt]"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              {...register('email')}
              disabled={isLoading}
              className="border-border/40 bg-background/50"
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              {...register('password')}
              disabled={isLoading}
              className="border-border/40 bg-background/50"
            />
            {errors.password && (
              <p className="text-xs text-destructive">
                {errors.password.message}
              </p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full bg-primary hover:bg-primary/90"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Entrando...
              </>
            ) : (
              'Entrar'
            )}
          </Button>
        </form>
      </Card>

      <p className="text-center text-sm text-muted-foreground">
        Não tem conta?{' '}
        <Link href="/register" className="text-primary hover:underline">
          Criar conta
        </Link>
      </p>
    </div>
  )
}
