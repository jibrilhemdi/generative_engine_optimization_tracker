export type ProviderName = "gemini" | "openrouter" | "local";
export type Sentiment = "positive" | "neutral" | "negative";

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

export interface TrackPayload {
  brand: string;
  aliases?: string[];
  query: string;
  providers: ProviderName[];
  localEndpoint?: string;
  localModel?: string;
  openRouterModel?: string;
}
