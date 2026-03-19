const ENTITY_MAP: Record<string, string> = {
  "&lt;": "<",
  "&gt;": ">",
  "&amp;": "&",
  "&quot;": '"',
  "&#39;": "'",
  "&nbsp;": " ",
};

const GENERIC_VALUES = new Set([
  "",
  "alert",
  "unknown",
  "unknown-host",
  "unknown host",
  "n/a",
  "null",
  "undefined",
  "-",
  "--",
]);

const HOST_STOP_WORDS = new Set([
  "event",
  "eventid",
  "problem",
  "alert",
  "trigger",
  "id",
  "severity",
  "status",
]);

const NOISY_HOST_KEYWORDS = [
  "interface",
  "error",
  "rate",
  "link",
  "down",
  "high",
  "low",
  "warning",
  "average",
  "critical",
  "problem",
  "alert",
  "trigger",
  "for5m",
];

const decodeHtmlEntities = (value: string): string =>
  value.replace(/&lt;|&gt;|&amp;|&quot;|&#39;|&nbsp;/g, (match) => ENTITY_MAP[match] ?? match);

const normalizeContent = (value?: string): string => {
  if (!value) return "";

  return decodeHtmlEntities(value)
    .replace(/\r\n/g, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<p[^>]*>/gi, "")
    .replace(/<\/div>/gi, "\n")
    .replace(/<div[^>]*>/gi, "")
    .replace(/<a\s+href="[^"]*"[^>]*>(.*?)<\/a>/gi, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*\n]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};

const toInlineText = (value?: string): string =>
  normalizeContent(value)
    .replace(/\s+/g, " ")
    .replace(/^["'`]+|["'`]+$/g, "")
    .trim();

const isMeaningful = (value?: string): boolean => {
  const normalized = toInlineText(value).toLowerCase();
  return normalized.length > 0 && !GENERIC_VALUES.has(normalized);
};

const isIpLike = (value: string): boolean => /^(\d{1,3}\.){3}\d{1,3}$/.test(value);

const isLikelyHostCandidate = (value?: string): boolean => {
  const normalized = toInlineText(value);
  if (!isMeaningful(normalized)) return false;

  const lower = normalized.toLowerCase();
  if (HOST_STOP_WORDS.has(lower)) return false;
  if (/^\d+$/.test(normalized)) return false;
  if (/^event[-_:]?\d+$/i.test(normalized)) return false;
  if (/^(problem|alert|trigger)[-_:]?\d+$/i.test(normalized)) return false;

  const hasDelimiter = /[._-]/.test(normalized);
  if (/^[a-z0-9]+$/i.test(normalized) && !hasDelimiter && normalized.length > 20) {
    const noisyKeywordHits = NOISY_HOST_KEYWORDS.reduce(
      (hits, keyword) => hits + (lower.includes(keyword) ? 1 : 0),
      0
    );
    if (noisyKeywordHits >= 2) return false;
  }

  if (!hasDelimiter && normalized.length > 18) {
    const noisyKeywordHits = NOISY_HOST_KEYWORDS.reduce(
      (hits, keyword) => hits + (lower.includes(keyword) ? 1 : 0),
      0
    );
    if (noisyKeywordHits >= 1) return false;
  }

  const words = normalized.split(/\s+/).filter(Boolean);
  if (words.length > 4) return false;
  if (normalized.length > 80) return false;

  return isIpLike(normalized) || /[a-z]/i.test(normalized);
};

const escapeRegex = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const extractLabeledValue = (content: string, labels: string[]): string | null => {
  if (!content) return null;

  for (const label of labels) {
    const escapedLabel = escapeRegex(label);
    const boundary = "(?=\\s*(?:\\*\\*[A-Za-z][A-Za-z\\s]+:\\*\\*|[A-Za-z][A-Za-z\\s]+:\\s)|$)";
    const patterns = [
      new RegExp(`\\*\\*${escapedLabel}:\\*\\*\\s*([\\s\\S]*?)${boundary}`, "i"),
      new RegExp(`${escapedLabel}:\\s*([\\s\\S]*?)${boundary}`, "i"),
    ];

    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (!match?.[1]) continue;

      const cleaned = toInlineText(match[1]).replace(/^:+/, "").trim();
      if (isMeaningful(cleaned)) return cleaned;
    }
  }

  return null;
};

const extractHostFromNarrative = (content: string): string | null => {
  if (!content) return null;

  const patterns = [
    /\bon\s+([a-z0-9._-]{2,80})\s+has\b/i,
    /\bhost(?:name)?\s*(?:is|=)?\s*([a-z0-9._-]{2,80})\b/i,
    /\bvm\s+on\s+([a-z0-9._-]{2,80})\b/i,
  ];

  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (!match?.[1]) continue;

    const candidate = toInlineText(match[1]);
    if (isLikelyHostCandidate(candidate)) return candidate;
  }

  return null;
};

const truncate = (value: string, max = 220): string =>
  value.length <= max ? value : `${value.slice(0, max - 3).trim()}...`;

export const extractAlertHost = (options: {
  directHost?: string;
  content?: string;
  dedupeKey?: string;
}): string => {
  const direct = toInlineText(options.directHost);
  if (isLikelyHostCandidate(direct)) return direct;

  const normalizedContent = normalizeContent(options.content);
  const fromContent = extractLabeledValue(normalizedContent, [
    "Host",
    "Hostname",
    "VM",
    "Node",
    "Server",
    "Device",
  ]);
  if (isLikelyHostCandidate(fromContent)) return fromContent;

  const fromNarrative = extractHostFromNarrative(normalizedContent);
  if (isLikelyHostCandidate(fromNarrative)) return fromNarrative;

  const dedupeKey = toInlineText(options.dedupeKey);
  if (isMeaningful(dedupeKey)) {
    const firstToken = dedupeKey
      .split(/[|_\s]+/)
      .map((token) => toInlineText(token))
      .find((token) => isLikelyHostCandidate(token));
    if (firstToken) return firstToken;

    const isDelimited = /[|_\s]/.test(dedupeKey);
    if (isDelimited && isLikelyHostCandidate(dedupeKey)) return dedupeKey;
  }

  return "unknown-host";
};

export const extractAlertProblem = (options: {
  primary?: string;
  content?: string;
  fallbacks?: Array<string | undefined>;
}): string => {
  const fallbackList = options.fallbacks ?? [];
  const candidates = [options.primary, ...fallbackList];

  for (const candidate of candidates) {
    const cleaned = toInlineText(candidate);
    if (isMeaningful(cleaned) && cleaned.toLowerCase() !== "alert") {
      return truncate(cleaned, 220);
    }
  }

  const normalizedContent = normalizeContent(options.content);
  const eventLike = extractLabeledValue(normalizedContent, ["Event", "Problem", "Issue", "Alert"]);
  if (eventLike) return truncate(eventLike, 220);

  const firstMeaningfulLine = normalizedContent
    .split("\n")
    .map((line) => toInlineText(line))
    .find(
      (line) =>
        isMeaningful(line) &&
        !/^zabbix ai analysis$/i.test(line) &&
        !/^zabbix event summary:?$/i.test(line) &&
        !/^host:/i.test(line) &&
        !/^severity:/i.test(line) &&
        !/^impact:/i.test(line) &&
        !/^likely root cause:/i.test(line) &&
        !/^first diagnostics?:/i.test(line) &&
        !/^mitigations?:/i.test(line) &&
        !/^recommended actions?:/i.test(line) &&
        !/^recommendations?:/i.test(line) &&
        !/^confidence:/i.test(line) &&
        !/^false positive risk:/i.test(line) &&
        !/^zabbix url:/i.test(line)
    );

  if (firstMeaningfulLine) return truncate(firstMeaningfulLine, 220);

  return "Unknown Problem";
};

export const normalizeAlertInlineText = (value?: string): string => toInlineText(value);
