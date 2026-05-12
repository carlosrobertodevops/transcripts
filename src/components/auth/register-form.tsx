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
import { Loader2, UserPlus, User, Mail, Lock, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { useProximity } from '@/hooks/use-proximity'
import type { CSSProperties } from 'react'

const registerSchema = z
  .object({
    name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
    email: z.email('Email inválido'),
    password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Senhas não conferem',
    path: ['confirmPassword'],
  })

type RegisterFormData = z.infer<typeof registerSchema>

export const RegisterForm = () => {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const { ref: cardRef, proximity } = useProximity<HTMLDivElement>({ radius: 320 })
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  })

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          password: data.password,
        }),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        toast.error(error.message || error.error || 'Erro ao criar conta')
        setIsLoading(false)
        return
      }

      toast.success('Conta criada com sucesso!')
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
            <UserPlus className="h-6 w-6" strokeWidth={2.2} />
          </span>
        </div>
        <div className="space-y-1.5">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Criar conta
          </h1>
          <p className="text-sm text-muted-foreground">
            Comece a transcrever em segundos
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
            <Label htmlFor="name" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Nome
            </Label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
              <Input
                id="name"
                type="text"
                placeholder="Seu nome"
                autoComplete="name"
                className="pl-10"
                {...register('name')}
                disabled={isLoading}
              />
            </div>
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

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
            <Label htmlFor="password" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Senha
            </Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
              <Input
                id="password"
                type="password"
                placeholder="Mínimo 6 caracteres"
                autoComplete="new-password"
                className="pl-10"
                {...register('password')}
                disabled={isLoading}
              />
            </div>
            {errors.password && (
              <p className="text-xs text-destructive">{errors.password.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Confirmar senha
            </Label>
            <div className="relative">
              <ShieldCheck className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Repita a senha"
                autoComplete="new-password"
                className="pl-10"
                {...register('confirmPassword')}
                disabled={isLoading}
              />
            </div>
            {errors.confirmPassword && (
              <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
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
                Criando conta...
              </>
            ) : (
              <>
                Criar conta
                <UserPlus className="ml-1 h-4 w-4" />
              </>
            )}
          </Button>
        </form>
      </Card>

      <p className="text-center text-sm text-muted-foreground auth-form-stagger-3">
        Já tem conta?{' '}
        <Link
          href="/login"
          className="font-medium text-primary hover:underline underline-offset-4 transition-colors"
        >
          Entrar
        </Link>
      </p>
    </div>
  )
}
