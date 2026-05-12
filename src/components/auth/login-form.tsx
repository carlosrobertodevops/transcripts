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
import { Loader2, LogIn, Mail, Lock } from 'lucide-react'
import { toast } from 'sonner'
import { useProximity } from '@/hooks/use-proximity'
import type { CSSProperties } from 'react'

const loginSchema = z.object({
  email: z.email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
})

type LoginFormData = z.infer<typeof loginSchema>

export const LoginForm = () => {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const { ref: cardRef, proximity } = useProximity<HTMLDivElement>({ radius: 320 })
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
    } catch {
      toast.error('Erro ao conectar ao servidor')
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full space-y-7 auth-form-entrance">
      <div className="space-y-3 text-center auth-form-stagger-1">
        <div className="flex justify-center">
          <span className="auth-brand-mark">
            <LogIn className="h-6 w-6" strokeWidth={2.2} />
          </span>
        </div>
        <div className="space-y-1.5">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Bem-vindo de volta
          </h1>
          <p className="text-sm text-muted-foreground">
            Acesse sua conta para continuar
          </p>
        </div>
      </div>

      <Card
        ref={cardRef}
        style={{ '--proximity': proximity } as CSSProperties}
        className="auth-card glass-border-animated p-8 auth-form-stagger-2"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Email
            </Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                autoComplete="email"
                className="pl-10"
                {...register('email')}
                disabled={isLoading}
              />
            </div>
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Senha
              </Label>
              <Link href="/forgot-password" className="text-xs text-muted-foreground hover:text-primary transition-colors">
                Esqueceu?
              </Link>
            </div>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                className="pl-10"
                {...register('password')}
                disabled={isLoading}
              />
            </div>
            {errors.password && (
              <p className="text-xs text-destructive">{errors.password.message}</p>
            )}
          </div>

          <Button
            type="submit"
            size="lg"
            className="w-full font-semibold"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Entrando...
              </>
            ) : (
              <>
                Entrar
                <LogIn className="ml-1 h-4 w-4" />
              </>
            )}
          </Button>
        </form>
      </Card>

      <p className="text-center text-sm text-muted-foreground auth-form-stagger-3">
        Não tem conta?{' '}
        <Link
          href="/register"
          className="font-medium text-primary hover:underline underline-offset-4 transition-colors"
        >
          Criar conta
        </Link>
      </p>
    </div>
  )
}
