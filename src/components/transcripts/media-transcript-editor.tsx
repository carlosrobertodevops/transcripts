"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { segmentsToHighlightedHtml, type TagRef } from "@/lib/highlight-tags";
import { toast } from "sonner";
import { Loader2, Wand2, Save } from "lucide-react";

interface MediaSegment {
  id: string;
  mediaId: string;
  startMs: number;
  endMs: number;
  text: string;
}

interface MediaTranscriptEditorProps {
  mediaId: string;
  segments: MediaSegment[];
  initialHtml: string | null;
  tags: TagRef[];
  onSaved?: (html: string) => void;
}

export const MediaTranscriptEditor = ({
  mediaId,
  segments,
  initialHtml,
  tags,
  onSaved,
}: MediaTranscriptEditorProps) => {
  const [html, setHtml] = useState<string>(initialHtml ?? "");
  const [savedHtml, setSavedHtml] = useState<string>(initialHtml ?? "");
  const [saving, setSaving] = useState(false);
  const [editorKey, setEditorKey] = useState(0);

  useEffect(() => {
    if ((initialHtml ?? "") === "" && segments.length > 0) {
      const sorted = [...segments].sort((a, b) => a.startMs - b.startMs);
      const generated = segmentsToHighlightedHtml(sorted, tags);
      setHtml(generated);
      setEditorKey((k) => k + 1);
    } else {
      setHtml(initialHtml ?? "");
      setSavedHtml(initialHtml ?? "");
      setEditorKey((k) => k + 1);
    }
  }, [mediaId, initialHtml, segments, tags]);

  const dirty = html !== savedHtml;
  const hasContent = segments.length > 0 || (initialHtml ?? "").length > 0;

  const handleApplyTags = () => {
    const sorted = [...segments].sort((a, b) => a.startMs - b.startMs);
    const generated = segmentsToHighlightedHtml(sorted, tags);
    setHtml(generated);
    setEditorKey((k) => k + 1);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/media/${mediaId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ transcriptHtml: html }),
      });
      if (!res.ok) throw new Error("falha");
      setSavedHtml(html);
      onSaved?.(html);
      toast.success("Transcrição salva");
    } catch (err) {
      toast.error("Erro ao salvar transcrição");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (!hasContent) {
    const count = segments.length;
    const label =
      count > 0
        ? `${count} segmento${count === 1 ? "" : "s"} recebido${count === 1 ? "" : "s"}`
        : "Transcrevendo...";
    return (
      <p className="text-xs text-muted-foreground italic flex items-center gap-1.5">
        {count === 0 && <Loader2 className="h-3 w-3 animate-spin shrink-0" />}
        {label}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground">
          Transcrição ({segments.length} segmento{segments.length === 1 ? "" : "s"})
        </Label>
        <div className="flex gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 text-xs"
            onClick={handleApplyTags}
            disabled={tags.length === 0 || segments.length === 0}
            title="Regenerar com tags atuais"
          >
            <Wand2 className="mr-1 h-3 w-3" />
            Aplicar tags
          </Button>
          <Button
            type="button"
            variant={dirty ? "secondary" : "ghost"}
            size="sm"
            className="h-6 text-xs"
            onClick={handleSave}
            disabled={!dirty || saving}
          >
            {saving ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <>
                <Save className="mr-1 h-3 w-3" />
                Salvar
              </>
            )}
          </Button>
        </div>
      </div>
      <RichTextEditor
        key={editorKey}
        value={html}
        onChange={setHtml}
        placeholder="Transcrição..."
        className="min-h-[120px] max-h-[280px] overflow-y-auto"
      />
    </div>
  );
};
