const TEMPLATE_KEYS = [
  "report_template",
  "reportTemplate",
  "report_html",
  "reportHtml",
  "html",
  "template",
  "content_html",
  "contentHtml",
  "body_html",
  "bodyHtml",
  "body",
  "content",
  "markup",
] as const;

const WRAPPER_KEYS = [
  "payload",
  "data",
  "result",
  "response",
  "report",
  "details",
  "item",
] as const;

const normalizeEscapes = (value: string): string =>
  value
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\");

const decodeEntities = (value: string): string =>
  value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

const looksLikeHtml = (value: string): boolean => /<\/?[a-z][\s\S]*>/i.test(value);

const stripCodeFence = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed.startsWith("```")) return trimmed;
  return trimmed
    .replace(/^```[a-zA-Z]*\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
};

const extractHtmlFragment = (value: string): string | null => {
  const source = stripCodeFence(value);
  if (!source) return null;

  if (source.startsWith("<") && looksLikeHtml(source)) {
    return source;
  }

  const lower = source.toLowerCase();
  const genericMatch = lower.match(/<(div|section|article|main|table|h1|h2|h3|p|ul|ol|pre|code)\b/);
  const genericIndex = genericMatch ? genericMatch.index ?? -1 : -1;

  const candidates = [lower.indexOf("<!doctype"), lower.indexOf("<html"), lower.indexOf("<body"), genericIndex]
    .filter((index) => index >= 0);

  if (candidates.length === 0) return null;

  const start = Math.min(...candidates);
  const htmlEndIndex = lower.lastIndexOf("</html>");
  const bodyEndIndex = lower.lastIndexOf("</body>");
  const lastTagClose = source.lastIndexOf(">");

  let end = -1;
  if (htmlEndIndex >= 0) end = htmlEndIndex + "</html>".length;
  else if (bodyEndIndex >= 0) end = bodyEndIndex + "</body>".length;
  else if (lastTagClose > start) end = lastTagClose + 1;

  if (end <= start) return null;

  let fragment = source.slice(start, end).trim();
  if (fragment.toLowerCase().startsWith("<body")) {
    fragment = `<html>${fragment}</html>`;
  }
  return looksLikeHtml(fragment) ? fragment : null;
};

const tryParseJson = (value: string): unknown | null => {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const extractHtml = (raw: unknown, depth = 0): string | null => {
  if (depth > 8 || raw == null) return null;

  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return null;

    const normalized = decodeEntities(normalizeEscapes(trimmed));
    const parsed = tryParseJson(normalized);

    if (parsed !== null) {
      const nested = extractHtml(parsed, depth + 1);
      if (nested) return nested;
    }

    const fragment = extractHtmlFragment(normalized);
    if (fragment) return fragment;

    return looksLikeHtml(normalized) ? normalized : null;
  }

  if (Array.isArray(raw)) {
    for (let i = 0; i < raw.length; i += 1) {
      const nested = extractHtml(raw[i], depth + 1);
      if (nested) return nested;
    }
    return null;
  }

  if (typeof raw === "object") {
    const record = raw as Record<string, unknown>;

    for (let i = 0; i < TEMPLATE_KEYS.length; i += 1) {
      const key = TEMPLATE_KEYS[i];
      if (!(key in record)) continue;
      const nested = extractHtml(record[key], depth + 1);
      if (nested) return nested;
    }

    for (let i = 0; i < WRAPPER_KEYS.length; i += 1) {
      const key = WRAPPER_KEYS[i];
      if (!(key in record)) continue;
      const nested = extractHtml(record[key], depth + 1);
      if (nested) return nested;
    }

    const values = Object.values(record);
    for (let i = 0; i < values.length; i += 1) {
      const nested = extractHtml(values[i], depth + 1);
      if (nested) return nested;
    }
  }

  return null;
};

export const normalizeReportTemplateHtml = (raw: unknown): string => extractHtml(raw) ?? "";
