'use client'

import { useEffect, useState } from 'react'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/pt-br'

dayjs.extend(relativeTime)
dayjs.locale('pt-br')

interface Notification {
  id: string
  type: string
  payload?: Record<string, any>
  readAt: string | null
  createdAt: string
}

const notificationTypeLabel: Record<string, string> = {
  transcript_complete: 'Transcrição concluída',
  transcript_failed: 'Falha na transcrição',
  share_received: 'Compartilhamento recebido',
  share_accepted: 'Compartilhamento aceito',
  media_uploaded: 'Mídia enviada',
}

const getNotificationLabel = (type: string): string => {
  return notificationTypeLabel[type] || type
}

const getPayloadPreview = (payload?: Record<string, any>): string => {
  if (!payload) return ''
  if (payload.transcriptName) return payload.transcriptName
  if (payload.sharedByUser) return `Por: ${payload.sharedByUser}`
  if (payload.fileName) return payload.fileName
  return ''
}

export const NotificationsBell = () => {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications?page=1')
      if (!res.ok) throw new Error('Erro ao carregar notificações')

      const data = await res.json()
      setNotifications(data.notifications || [])

      const unread = data.notifications.filter((n: Notification) => !n.readAt).length
      setUnreadCount(unread)
    } catch (error) {
      console.error('Erro ao buscar notificações:', error)
      toast.error('Erro ao carregar notificações')
    }
  }

  const handleMarkAsRead = async (id: string) => {
    try {
      const res = await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' })
      if (!res.ok) throw new Error('Erro ao marcar como lido')

      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n))
      )

      const unread = notifications.filter((n) => !n.readAt && n.id !== id).length
      setUnreadCount(Math.max(0, unread))

      toast.success('Notificação marcada como lida')
    } catch (error) {
      console.error('Erro ao marcar como lido:', error)
      toast.error('Erro ao marcar notificação')
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      const res = await fetch('/api/notifications/read-all', { method: 'POST' })
      if (!res.ok) throw new Error('Erro ao marcar todas como lidas')

      setNotifications((prev) =>
        prev.map((n) => ({ ...n, readAt: new Date().toISOString() }))
      )
      setUnreadCount(0)

      toast.success('Todas as notificações marcadas como lidas')
    } catch (error) {
      console.error('Erro ao marcar todas como lidas:', error)
      toast.error('Erro ao marcar notificações')
    }
  }

  useEffect(() => {
    if (isOpen) {
      fetchNotifications()
    }

    const interval = setInterval(() => {
      if (isOpen) {
        fetchNotifications()
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [isOpen])

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative text-muted-foreground hover:bg-primary/10 hover:text-primary"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 h-5 w-5 rounded-full bg-destructive text-white text-xs font-bold flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto">
        <div className="sticky top-0 bg-background z-10 py-2 px-2">
          <div className="flex items-center justify-between">
            <DropdownMenuLabel>Notificações</DropdownMenuLabel>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-auto px-2 py-1 text-xs text-primary hover:bg-primary/10"
                onClick={handleMarkAllAsRead}
              >
                Marcar todas como lidas
              </Button>
            )}
          </div>
          <DropdownMenuSeparator className="mt-2" />
        </div>

        {notifications.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
            Sem notificações
          </div>
        ) : (
          <div className="space-y-1">
            {notifications.slice(0, 10).map((notification) => (
              <button
                key={notification.id}
                onClick={() => handleMarkAsRead(notification.id)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                  notification.readAt
                    ? 'bg-muted/30 text-muted-foreground hover:bg-muted/50'
                    : 'bg-primary/5 text-foreground hover:bg-primary/10'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="font-medium text-xs">
                      {getNotificationLabel(notification.type)}
                    </p>
                    {getPayloadPreview(notification.payload) && (
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {getPayloadPreview(notification.payload)}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {dayjs(notification.createdAt).fromNow()}
                    </p>
                  </div>
                  {!notification.readAt && (
                    <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
