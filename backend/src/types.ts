import { OPENROUTER_MODELS } from "./config/env.js";

export type ProviderName = "gemini" | "openrouter" | "local";
export type OpenRouterModel = (typeof OPENROUTER_MODELS)[number];

export type Sentiment = "positive" | "neutral" | "negative";

export interface TrackRequest {
  brand: string;
  aliases?: string[];
  query: string;
  providers: ProviderName[];
  localEndpoint?: string;
  localModel?: string;
  openRouterModel?: OpenRouterModel;
}

export interface ProviderResult {
  provider: ProviderName;
  mentioned: boolean;
  matchedAlias?: string;
  sentiment: Sentiment;
  snippet: string;
  rawResponse: string;
  latencyMs: number;
  mocked: boolean;
  error?: string;
}

export interface HistoryRecord {
  id: string;
  brand: string;
  aliases?: string[];
  query: string;
  providers: ProviderName[];
  createdAt: string;
  results: ProviderResult[];
}

export interface HistoryFile {
  records: HistoryRecord[];
}
