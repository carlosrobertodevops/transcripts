import {
  Document,
  Packer,
  Paragraph,
  HeadingLevel,
  TextRun,
  AlignmentType,
} from "docx";
import dayjs from "dayjs";

export type ExportFormat = "txt" | "html" | "doc" | "docx";

export interface ExportSegment {
  id: string;
  startMs: number;
  endMs: number;
  text: string;
  mediaId: string;
}

export interface ExportMediaLite {
  id: string;
  filename: string;
}

export interface ExportTranscriptInput {
  transcript: {
    id: string;
    title: string;
    operationName: string | null;
    operationDate: Date | string | null;
    transcriptionDate: Date | string | null;
    analysis: string | null;
    transcriptHtml: string | null;
    status: string;
    createdAt: Date | string;
  };
  media: ExportMediaLite[];
  segments: ExportSegment[];
  ownerName?: string | null;
  ownerEmail?: string | null;
}

export interface ExportResult {
  bytes: Buffer;
  mime: string;
  ext: string;
}

const stripHtml = (s: string): string =>
  s
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const escapeHtml = (s: string): string =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const fmtDate = (d: Date | string | null): string => {
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

const sanitizeFilename = (s: string): string =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9_\- ]+/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .slice(0, 80) || "transcricao";

export const buildExportFilename = (
  title: string,
  ext: string,
): string => `${sanitizeFilename(title)}.${ext}`;

const buildPlainText = (input: ExportTranscriptInput): string => {
  const { transcript, media, segments, ownerName, ownerEmail } = input;
  const lines: string[] = [];

  lines.push(transcript.title.toUpperCase());
  lines.push("=".repeat(Math.min(80, transcript.title.length)));
  lines.push("");
  if (transcript.operationName)
    lines.push(`Operação: ${transcript.operationName}`);
  lines.push(`Data da operação: ${fmtDate(transcript.operationDate)}`);
  lines.push(`Data da transcrição: ${fmtDate(transcript.transcriptionDate)}`);
  lines.push(`Status: ${transcript.status}`);
  if (ownerName || ownerEmail)
    lines.push(`Autor: ${ownerName ?? ""} ${ownerEmail ? `<${ownerEmail}>` : ""}`.trim());
  lines.push(`Gerado em: ${dayjs().format("DD/MM/YYYY HH:mm")}`);
  lines.push("");

  if (transcript.analysis && stripHtml(transcript.analysis).length > 0) {
    lines.push("ANÁLISE");
    lines.push("-".repeat(40));
    lines.push(stripHtml(transcript.analysis));
    lines.push("");
  }

  if (segments.length > 0) {
    lines.push("TRANSCRIÇÃO");
    lines.push("-".repeat(40));
    const segByMedia = new Map<string, ExportSegment[]>();
    segments.forEach((s) => {
      if (!segByMedia.has(s.mediaId)) segByMedia.set(s.mediaId, []);
      segByMedia.get(s.mediaId)!.push(s);
    });
    media.forEach((m) => {
      lines.push("");
      lines.push(`[${m.filename}]`);
      const segs = (segByMedia.get(m.id) ?? []).sort((a, b) => a.startMs - b.startMs);
      segs.forEach((s) => {
        lines.push(`  ${fmtMs(s.startMs)} → ${fmtMs(s.endMs)}  ${s.text}`);
      });
    });
  }

  return lines.join("\n");
};

const buildHtml = (input: ExportTranscriptInput): string => {
  const { transcript, media, segments, ownerName, ownerEmail } = input;
  const segByMedia = new Map<string, ExportSegment[]>();
  segments.forEach((s) => {
    if (!segByMedia.has(s.mediaId)) segByMedia.set(s.mediaId, []);
    segByMedia.get(s.mediaId)!.push(s);
  });

  const styles = `
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 900px; margin: 2rem auto; padding: 0 1.5rem; }
    h1 { font-size: 1.75rem; margin: 0 0 0.5rem; }
    h2 { font-size: 1.25rem; margin: 2rem 0 0.75rem; border-bottom: 1px solid #ddd; padding-bottom: 0.25rem; }
    .meta { color: #555; font-size: 0.875rem; margin-bottom: 2rem; }
    .meta div { margin: 0.15rem 0; }
    .analysis { white-space: pre-wrap; }
    .media-block { margin: 1rem 0; padding: 0.75rem 1rem; background: #f7f7f8; border-left: 3px solid #888; border-radius: 4px; }
    .media-block h3 { margin: 0 0 0.5rem; font-size: 1rem; }
    .seg { padding: 0.25rem 0; display: flex; gap: 0.75rem; }
    .seg time { color: #888; font-family: ui-monospace, "SFMono-Regular", monospace; font-size: 0.8125rem; min-width: 90px; }
    .seg p { margin: 0; flex: 1; }
    footer { margin-top: 3rem; padding-top: 1rem; border-top: 1px solid #eee; color: #888; font-size: 0.75rem; }
  `;

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(transcript.title)}</title>
<style>${styles}</style>
</head>
<body>
  <h1>${escapeHtml(transcript.title)}</h1>
  <div class="meta">
    ${transcript.operationName ? `<div><strong>Operação:</strong> ${escapeHtml(transcript.operationName)}</div>` : ""}
    <div><strong>Data da operação:</strong> ${fmtDate(transcript.operationDate)}</div>
    <div><strong>Data da transcrição:</strong> ${fmtDate(transcript.transcriptionDate)}</div>
    <div><strong>Status:</strong> ${escapeHtml(transcript.status)}</div>
    ${
      ownerName || ownerEmail
        ? `<div><strong>Autor:</strong> ${escapeHtml(ownerName ?? "")}${ownerEmail ? ` &lt;${escapeHtml(ownerEmail)}&gt;` : ""}</div>`
        : ""
    }
  </div>

  ${
    transcript.analysis && stripHtml(transcript.analysis).length > 0
      ? `<h2>Análise</h2><div class="analysis">${escapeHtml(stripHtml(transcript.analysis))}</div>`
      : ""
  }

  ${
    segments.length > 0
      ? `<h2>Transcrição</h2>${media
          .map((m) => {
            const segs = (segByMedia.get(m.id) ?? []).sort(
              (a, b) => a.startMs - b.startMs,
            );
            return `<div class="media-block"><h3>${escapeHtml(m.filename)}</h3>${segs
              .map(
                (s) =>
                  `<div class="seg"><time>${fmtMs(s.startMs)} → ${fmtMs(s.endMs)}</time><p>${escapeHtml(s.text)}</p></div>`,
              )
              .join("")}</div>`;
          })
          .join("")}`
      : ""
  }

  <footer>Gerado em ${dayjs().format("DD/MM/YYYY HH:mm")} — transcripts</footer>
</body>
</html>`;
};

const buildDocx = async (input: ExportTranscriptInput): Promise<Buffer> => {
  const { transcript, media, segments, ownerName, ownerEmail } = input;
  const segByMedia = new Map<string, ExportSegment[]>();
  segments.forEach((s) => {
    if (!segByMedia.has(s.mediaId)) segByMedia.set(s.mediaId, []);
    segByMedia.get(s.mediaId)!.push(s);
  });

  const children: Paragraph[] = [];

  children.push(
    new Paragraph({
      text: transcript.title,
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.LEFT,
    }),
  );

  const meta: string[] = [];
  if (transcript.operationName) meta.push(`Operação: ${transcript.operationName}`);
  meta.push(`Data da operação: ${fmtDate(transcript.operationDate)}`);
  meta.push(`Data da transcrição: ${fmtDate(transcript.transcriptionDate)}`);
  meta.push(`Status: ${transcript.status}`);
  if (ownerName || ownerEmail)
    meta.push(`Autor: ${ownerName ?? ""}${ownerEmail ? ` <${ownerEmail}>` : ""}`.trim());
  meta.push(`Gerado em: ${dayjs().format("DD/MM/YYYY HH:mm")}`);
  meta.forEach((line) => {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: line, size: 20, color: "555555" })],
      }),
    );
  });

  if (transcript.analysis && stripHtml(transcript.analysis).length > 0) {
    children.push(
      new Paragraph({
        text: "Análise",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 400 },
      }),
    );
    stripHtml(transcript.analysis)
      .split(/\n\n+/)
      .forEach((p) => {
        children.push(new Paragraph({ text: p }));
      });
  }

  if (segments.length > 0) {
    children.push(
      new Paragraph({
        text: "Transcrição",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 400 },
      }),
    );
    media.forEach((m) => {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: m.filename, bold: true, size: 24 })],
          spacing: { before: 300 },
        }),
      );
      const segs = (segByMedia.get(m.id) ?? []).sort(
        (a, b) => a.startMs - b.startMs,
      );
      segs.forEach((s) => {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `${fmtMs(s.startMs)} → ${fmtMs(s.endMs)}  `,
                color: "888888",
                size: 18,
              }),
              new TextRun({ text: s.text, size: 22 }),
            ],
          }),
        );
      });
    });
  }

  const doc = new Document({ sections: [{ children }] });
  return Packer.toBuffer(doc);
};

const MIME_BY_FORMAT: Record<ExportFormat, string> = {
  txt: "text/plain; charset=utf-8",
  html: "text/html; charset=utf-8",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

export const exportTranscript = async (
  input: ExportTranscriptInput,
  format: ExportFormat,
): Promise<ExportResult> => {
  if (format === "txt") {
    return {
      bytes: Buffer.from(buildPlainText(input), "utf-8"),
      mime: MIME_BY_FORMAT.txt,
      ext: "txt",
    };
  }
  if (format === "html") {
    return {
      bytes: Buffer.from(buildHtml(input), "utf-8"),
      mime: MIME_BY_FORMAT.html,
      ext: "html",
    };
  }
  if (format === "doc") {
    return {
      bytes: Buffer.from(buildHtml(input), "utf-8"),
      mime: MIME_BY_FORMAT.doc,
      ext: "doc",
    };
  }
  return {
    bytes: await buildDocx(input),
    mime: MIME_BY_FORMAT.docx,
    ext: "docx",
  };
};
