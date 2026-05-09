import React from "react";

export interface TagRef {
  id: string;
  name: string;
  color: string;
}

const escapeRegExp = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const escapeHtml = (s: string): string =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const buildPattern = (tags: TagRef[]): RegExp | null => {
  if (tags.length === 0) return null;
  const sorted = [...tags].sort((a, b) => b.name.length - a.name.length);
  const alt = sorted.map((t) => escapeRegExp(t.name)).join("|");
  return new RegExp(`\\b(${alt})\\b`, "gi");
};

export const highlightToHtml = (text: string, tagList: TagRef[]): string => {
  if (!text) return "";
  const pattern = buildPattern(tagList);
  const safeText = escapeHtml(text);
  if (!pattern) return safeText;

  const colorByLower = new Map<string, string>();
  for (const t of tagList) colorByLower.set(t.name.toLowerCase(), t.color);

  return safeText.replace(pattern, (match) => {
    const color = colorByLower.get(match.toLowerCase()) ?? "currentColor";
    return `<strong class="tag-highlight" style="color:${color};font-weight:700">${match}</strong>`;
  });
};

export const segmentsToHighlightedHtml = (
  segments: Array<{ text: string }>,
  tagList: TagRef[]
): string => {
  const joined = segments.map((s) => s.text).join(" ");
  return `<p>${highlightToHtml(joined, tagList)}</p>`;
};

interface HighlightedTextProps {
  text: string;
  tags: TagRef[];
  className?: string;
}

export const HighlightedText = ({ text, tags, className }: HighlightedTextProps) => {
  const pattern = buildPattern(tags);
  if (!pattern) return <span className={className}>{text}</span>;

  const colorByLower = new Map<string, string>();
  for (const t of tags) colorByLower.set(t.name.toLowerCase(), t.color);

  const parts: React.ReactNode[] = [];
  let lastIdx = 0;
  let m: RegExpExecArray | null;
  pattern.lastIndex = 0;
  while ((m = pattern.exec(text)) !== null) {
    if (m.index > lastIdx) parts.push(text.slice(lastIdx, m.index));
    const color = colorByLower.get(m[0].toLowerCase()) ?? "currentColor";
    parts.push(
      <strong key={`${m.index}-${m[0]}`} style={{ color, fontWeight: 700 }}>
        {m[0]}
      </strong>
    );
    lastIdx = m.index + m[0].length;
  }
  if (lastIdx < text.length) parts.push(text.slice(lastIdx));

  return <span className={className}>{parts}</span>;
};
