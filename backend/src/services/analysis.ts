import type { ProviderResult, Sentiment } from "../types.js";
import { classifySentiment } from "./sentiment.js";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeAlias(alias: string): string {
  return alias.trim();
}

function getBrandNames(brand: string, aliases: string[] = []): string[] {
  return Array.from(new Set([brand, ...aliases].map(normalizeAlias).filter(Boolean))).sort(
    (a, b) => b.length - a.length
  );
}

function buildBrandPattern(brand: string, aliases: string[] = []): RegExp {
  const alternatives = getBrandNames(brand, aliases).map(escapeRegExp).join("|");
  return new RegExp(`\\b(?:${alternatives})\\b`, "i");
}

function getMatchedAlias(brand: string, aliases: string[] = [], text: string): string | undefined {
  const match = text.match(buildBrandPattern(brand, aliases));
  if (!match) return undefined;

  const matchedText = match[0].toLowerCase();
  return getBrandNames(brand, aliases).find((candidate) => candidate.toLowerCase() === matchedText);
}

function extractSentimentContext(text: string, matchedAlias: string | undefined, maxLength = 240): string {
  if (!matchedAlias) return text.slice(0, maxLength);

  const lowerText = text.toLowerCase();
  const lowerAlias = matchedAlias.toLowerCase();
  const index = lowerText.indexOf(lowerAlias);
  if (index === -1) return text.slice(0, maxLength);

  const start = Math.max(0, index - Math.floor(maxLength / 2));
  const end = Math.min(text.length, index + matchedAlias.length + Math.floor(maxLength / 2));
  return text.slice(start, end);
}

export function extractSnippet(text: string, maxLength = 500): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  return normalized.length > maxLength
    ? `${normalized.slice(0, maxLength - 1)}…`
    : normalized;
}

export async function analyzeResponse(
  brand: string,
  rawResponse: string,
  provider: ProviderResult["provider"],
  latencyMs: number,
  mocked = false,
  aliases: string[] = []
): Promise<ProviderResult> {
  const normalizedBrand = brand.trim();
  const brandPattern = buildBrandPattern(normalizedBrand, aliases);
  const mentioned = brandPattern.test(rawResponse);
  const matchedAlias = getMatchedAlias(normalizedBrand, aliases, rawResponse);

  const sentiment: Sentiment = mentioned
    ? await classifySentiment(extractSentimentContext(rawResponse, matchedAlias))
    : "neutral";

  return {
    provider,
    mentioned,
    matchedAlias,
    sentiment,
    snippet: extractSnippet(rawResponse),
    rawResponse,
    latencyMs,
    mocked
  };
}
