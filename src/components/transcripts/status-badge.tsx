"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CheckCircle, Clock, AlertCircle, Loader2 } from "lucide-react";

type Status = "pending" | "processing" | "done" | "failed";

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

const statusConfig: Record<Status, { label: string; icon: React.ReactNode; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: {
    label: "Pendente",
    icon: <Clock className="size-3" />,
    variant: "secondary",
  },
  processing: {
    label: "Transcrevendo...",
    icon: <Loader2 className="size-3 animate-spin" />,
    variant: "default",
  },
  done: {
    label: "Concluído",
    icon: <CheckCircle className="size-3" />,
    variant: "default",
  },
  failed: {
    label: "Erro",
    icon: <AlertCircle className="size-3" />,
    variant: "destructive",
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <Badge variant={config.variant} className={cn("gap-1.5", className)}>
      {config.icon}
      {config.label}
    </Badge>
  );
}
