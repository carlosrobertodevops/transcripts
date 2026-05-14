"use client";

import { Download, FileText, FileType2, FileCode, File, FileSpreadsheet } from "lucide-react";
import {
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export type ExportableFormat = "pdf" | "docx" | "doc" | "html" | "txt";

interface ExportActionsProps {
  transcriptId: string;
}

const triggerExport = (transcriptId: string, format: ExportableFormat) => {
  if (format === "pdf") {
    const w = window.open(`/transcripts/${transcriptId}/print`, "_blank");
    if (!w) {
      window.location.href = `/transcripts/${transcriptId}/print`;
    }
    return;
  }
  const url = `/api/transcripts/${transcriptId}/export?format=${format}`;
  const a = document.createElement("a");
  a.href = url;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
};

const ITEMS: { format: ExportableFormat; label: string; Icon: typeof FileText }[] = [
  { format: "pdf", label: "PDF", Icon: FileType2 },
  { format: "docx", label: "DOCX (Word)", Icon: FileText },
  { format: "doc", label: "DOC (Word legado)", Icon: File },
  { format: "html", label: "HTML", Icon: FileCode },
  { format: "txt", label: "TXT (texto puro)", Icon: FileSpreadsheet },
];

export const ExportSubmenu = ({ transcriptId }: ExportActionsProps) => (
  <DropdownMenuSub>
    <DropdownMenuSubTrigger>
      <Download className="mr-2 h-4 w-4" />
      Exportar
    </DropdownMenuSubTrigger>
    <DropdownMenuSubContent>
      {ITEMS.map(({ format, label, Icon }) => (
        <DropdownMenuItem
          key={format}
          onClick={(e) => {
            e.stopPropagation();
            triggerExport(transcriptId, format);
          }}
        >
          <Icon className="mr-2 h-4 w-4" />
          {label}
        </DropdownMenuItem>
      ))}
    </DropdownMenuSubContent>
  </DropdownMenuSub>
);

interface ExportButtonProps extends ExportActionsProps {
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
  label?: string;
}

export const ExportButton = ({
  transcriptId,
  variant = "outline",
  size = "default",
  label = "Exportar",
}: ExportButtonProps) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant={variant} size={size}>
        <Download className="size-4 mr-2" />
        {label}
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      {ITEMS.map(({ format, label: itemLabel, Icon }) => (
        <DropdownMenuItem
          key={format}
          onClick={() => triggerExport(transcriptId, format)}
        >
          <Icon className="mr-2 h-4 w-4" />
          {itemLabel}
        </DropdownMenuItem>
      ))}
    </DropdownMenuContent>
  </DropdownMenu>
);
