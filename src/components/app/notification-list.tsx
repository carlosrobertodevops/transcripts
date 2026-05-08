"use client";

import { useState } from "react";
import { BellOff } from "lucide-react";
import { apiPatch, apiPost } from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface Notification {
  id: string;
  type: string;
  payload: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
}

const typeLabels: Record<string, string> = {
  transcription_done: "Transcrição Concluída",
  transcript_updated: "Transcrição Atualizada",
  transcript_shared: "Transcrição Compartilhada",
};

export function NotificationList({ initial }: { initial: Notification[] }) {
  const { toast } = useToast();
  const [notifications, setNotifications] = useState(initial);

  const handleMarkAsRead = async (id: string) => {
    try {
      await apiPatch(`/api/notifications/${id}/read`, {});
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, readAt: new Date().toISOString() } : n
        )
      );
    } catch (e) {
      toast({
        title: "Erro",
        description: (e as Error).message,
        variant: "destructive",
      });
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await apiPost("/api/notifications/read-all", {});
      setNotifications((prev) =>
        prev.map((n) => ({
          ...n,
          readAt: n.readAt || new Date().toISOString(),
        }))
      );
      toast({
        title: "Sucesso",
        description: "Todas as notificações marcadas como lidas.",
      });
    } catch (e) {
      toast({
        title: "Erro",
        description: (e as Error).message,
        variant: "destructive",
      });
    }
  };

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <BellOff className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Sem notificações</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={handleMarkAllAsRead}
        >
          Marcar todas como lidas
        </Button>
      </div>

      <div className="space-y-2">
        {notifications.map((notif) => (
          <Card
            key={notif.id}
            className={notif.readAt ? "opacity-60" : ""}
          >
            <CardContent className="pt-6 flex items-start justify-between">
              <div className="flex-1">
                <p className="font-medium">
                  {typeLabels[notif.type] || notif.type}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {new Date(notif.createdAt).toLocaleDateString("pt-BR")}
                </p>
              </div>
              {!notif.readAt && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleMarkAsRead(notif.id)}
                >
                  Marcar como lida
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
