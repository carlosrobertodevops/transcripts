"use client";

import { useEffect } from "react";
import dayjs from "dayjs";
import "dayjs/locale/pt-br";

dayjs.locale("pt-br");

interface Segment {
  id: string;
  mediaId: string;
  startMs: number;
  endMs: number;
  text: string;
}

interface MediaLite {
  id: string;
  filename: string;
  hash?: string | null;
}

interface PrintViewProps {
  transcript: {
    id: string;
    title: string;
    operationName: string | null;
    operationDate: string | null;
    transcriptionDate: string | null;
    analysis: string | null;
    status: string;
  };
  media: MediaLite[];
  segments: Segment[];
  ownerName: string | null;
  ownerEmail: string | null;
}

const stripHtml = (s: string): string =>
  s
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .trim();

const fmtDate = (d: string | null): string => {
  if (!d) return "—";
  const v = dayjs(d);
  return v.isValid() ? v.format("DD/MM/YYYY") : "—";
};

const fmtMs = (ms: number): string => {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
};

export const PrintView = ({
  transcript,
  media,
  segments,
  ownerName,
  ownerEmail,
}: PrintViewProps) => {
  useEffect(() => {
    const t = setTimeout(() => window.print(), 350);
    return () => clearTimeout(t);
  }, []);

  const segByMedia = new Map<string, Segment[]>();
  segments.forEach((s) => {
    if (!segByMedia.has(s.mediaId)) segByMedia.set(s.mediaId, []);
    segByMedia.get(s.mediaId)!.push(s);
  });

  return (
    <>
      <style>{`
        @media print {
          @page { margin: 1.5cm; }
          .no-print { display: none !important; }
          body { background: white !important; color: #1a1a1a !important; }
        }
        html, body { background: white; color: #1a1a1a; }
        .print-root { max-width: 900px; margin: 2rem auto; padding: 0 1.5rem; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; }
        .print-root h1 { font-size: 1.75rem; margin: 0 0 0.5rem; }
        .print-root h2 { font-size: 1.25rem; margin: 2rem 0 0.75rem; border-bottom: 1px solid #ddd; padding-bottom: 0.25rem; }
        .print-meta { color: #555; font-size: 0.875rem; margin-bottom: 2rem; }
        .print-meta div { margin: 0.15rem 0; }
        .print-analysis { white-space: pre-wrap; }
        .print-media { margin: 1rem 0; padding: 0.75rem 1rem; background: #f7f7f8; border-left: 3px solid #888; border-radius: 4px; }
        .print-media h3 { margin: 0 0 0.5rem; font-size: 1rem; }
        .print-seg { padding: 0.25rem 0; display: flex; gap: 0.75rem; }
        .print-seg time { color: #888; font-family: ui-monospace, "SFMono-Regular", monospace; font-size: 0.8125rem; min-width: 90px; }
        .print-seg p { margin: 0; flex: 1; }
        .print-footer { margin-top: 3rem; padding-top: 1rem; border-top: 1px solid #eee; color: #888; font-size: 0.75rem; }
        .print-bar { position: fixed; top: 1rem; right: 1rem; display: flex; gap: 0.5rem; }
        .print-bar button { padding: 0.5rem 1rem; border: 1px solid #ccc; background: white; cursor: pointer; border-radius: 6px; font-size: 0.875rem; }
      `}</style>

      <div className="print-bar no-print">
        <button onClick={() => window.print()}>Imprimir / Salvar PDF</button>
        <button onClick={() => window.close()}>Fechar</button>
      </div>

      <div className="print-root">
        <h1>{transcript.title}</h1>
        <div className="print-meta">
          {transcript.operationName ? (
            <div>
              <strong>Operação:</strong> {transcript.operationName}
            </div>
          ) : null}
          <div>
            <strong>Data da operação:</strong> {fmtDate(transcript.operationDate)}
          </div>
          <div>
            <strong>Data da transcrição:</strong>{" "}
            {fmtDate(transcript.transcriptionDate)}
          </div>
          <div>
            <strong>Status:</strong> {transcript.status}
          </div>
          {ownerName || ownerEmail ? (
            <div>
              <strong>Autor:</strong> {ownerName ?? ""}
              {ownerEmail ? ` <${ownerEmail}>` : ""}
            </div>
          ) : null}
        </div>

        {transcript.analysis && stripHtml(transcript.analysis).length > 0 ? (
          <>
            <h2>Análise</h2>
            <div className="print-analysis">{stripHtml(transcript.analysis)}</div>
          </>
        ) : null}

        {segments.length > 0 ? (
          <>
            <h2>Transcrição</h2>
            {media.map((m) => {
              const segs = (segByMedia.get(m.id) ?? []).sort(
                (a, b) => a.startMs - b.startMs,
              );
              return (
                <div key={m.id} className="print-media">
                  <h3>{m.filename}</h3>
                  {m.hash ? (
                    <div
                      style={{
                        fontFamily: "ui-monospace, monospace",
                        fontSize: "0.75rem",
                        color: "#666",
                        marginBottom: "0.5rem",
                        wordBreak: "break-all",
                      }}
                    >
                      <strong>SHA-256:</strong> {m.hash}
                    </div>
                  ) : null}
                  {segs.map((s) => (
                    <div key={s.id} className="print-seg">
                      <time>
                        {fmtMs(s.startMs)} → {fmtMs(s.endMs)}
                      </time>
                      <p>{s.text}</p>
                    </div>
                  ))}
                </div>
              );
            })}
          </>
        ) : null}

        <div className="print-footer">
          Gerado em {dayjs().format("DD/MM/YYYY HH:mm")} — transcripts
        </div>
      </div>
    </>
  );
};
