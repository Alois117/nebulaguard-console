import React from "react";

const decodeHtmlEntities = (value: string): string => {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
};

export const normalizeInsightContent = (content?: string): string => {
  if (!content) return "";

  let normalized = decodeHtmlEntities(content);

  normalized = normalized.replace(/\r\n/g, "\n");

  normalized = normalized
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<p[^>]*>/gi, "")
    .replace(/<\/div>/gi, "\n")
    .replace(/<div[^>]*>/gi, "")
    .replace(/<b>/gi, "**")
    .replace(/<\/b>/gi, "**")
    .replace(/<strong>/gi, "**")
    .replace(/<\/strong>/gi, "**")
    .replace(/<i>/gi, "*")
    .replace(/<\/i>/gi, "*")
    .replace(/<em>/gi, "*")
    .replace(/<\/em>/gi, "*");

  normalized = normalized.replace(
    /<a\s+href="([^"]+)"[^>]*>(.*?)<\/a>/gi,
    (_, href: string, text: string) => `[${text}](${href})`
  );

  normalized = normalized.replace(/<[^>]+>/g, "");
  normalized = normalized.replace(/\n{3,}/g, "\n\n").trim();

  return normalized;
};

const renderInline = (text: string, keyPrefix: string): React.ReactNode[] => {
  const parts: React.ReactNode[] = [];
  const regex = /(\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*)/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let idx = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    if (match[2] && match[3]) {
      parts.push(
        <a
          key={`${keyPrefix}-link-${idx}`}
          href={match[3]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-cyan-400 underline underline-offset-2 hover:text-cyan-300 break-all"
          onClick={(e) => e.stopPropagation()}
        >
          {match[2]}
        </a>
      );
    } else if (match[4]) {
      parts.push(
        <strong
          key={`${keyPrefix}-bold-${idx}`}
          className="font-semibold text-foreground"
        >
          {match[4]}
        </strong>
      );
    } else if (match[5]) {
      parts.push(
        <em key={`${keyPrefix}-italic-${idx}`} className="italic">
          {match[5]}
        </em>
      );
    }

    lastIndex = regex.lastIndex;
    idx += 1;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
};

export const renderInsightContent = (content?: string): React.ReactNode => {
  const normalized = normalizeInsightContent(content);

  if (!normalized) {
    return <p className="text-sm text-muted-foreground">No analysis available.</p>;
  }

  const lines = normalized.split("\n");

  return (
    <div className="space-y-2 text-sm leading-7 text-foreground/90">
      {lines.map((rawLine, index) => {
        const line = rawLine.trim();

        if (!line) {
          return <div key={`spacer-${index}`} className="h-2" />;
        }

        if (/^[•*-]\s+/.test(line)) {
          return (
            <div key={`bullet-${index}`} className="flex gap-2">
              <span className="mt-1 text-cyan-400">•</span>
              <div className="min-w-0">
                {renderInline(line.replace(/^[•*-]\s+/, ""), `bullet-${index}`)}
              </div>
            </div>
          );
        }

        if (/^\d+\.\s+/.test(line)) {
          const number = line.match(/^(\d+)\./)?.[1] ?? "";
          const body = line.replace(/^\d+\.\s+/, "");

          return (
            <div key={`number-${index}`} className="flex gap-2">
              <span className="min-w-[1.5rem] text-muted-foreground">{number}.</span>
              <div className="min-w-0">
                {renderInline(body, `number-${index}`)}
              </div>
            </div>
          );
        }

        return (
          <p key={`line-${index}`} className="break-words">
            {renderInline(line, `line-${index}`)}
          </p>
        );
      })}
    </div>
  );
};

export const extractDisplayHost = (content?: string): string | null => {
  const normalized = normalizeInsightContent(content);

  const match =
    normalized.match(/\*\*Host:\*\*\s*([^\n]+)/i) ??
    normalized.match(/Host:\s*([^\n]+)/i);

  if (!match?.[1]) return null;

  const host = match[1].replace(/\*\*/g, "").trim();
  return host || null;
};