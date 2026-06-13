import { randomUUID } from "node:crypto";
import { z } from "zod";
import { env, OPENROUTER_MODELS } from "../config/env.js";
import type {
  HistoryRecord,
  ProviderName,
  ProviderResult,
  TrackRequest
} from "../types.js";
import { delay } from "../utils/delay.js";
import { retryWithBackoff } from "../utils/retry.js";
import { appendHistory } from "./history.js";
import { queryGemini } from "./providers/gemini.js";
import { queryLocal } from "./providers/local.js";
import { queryOpenRouter } from "./providers/openrouter.js";

const providerNames = new Set<ProviderName>(["gemini", "openrouter", "local"]);

export const trackRequestSchema = z.object({
  brand: z.string().trim().min(1).max(80),
  aliases: z.array(z.string().trim().min(1).max(80)).max(10).optional(),
  query: z.string().trim().min(1).max(500),
  providers: z
    .array(z.enum(["gemini", "openrouter", "local"]))
    .min(1)
    .max(3)
    .refine((providers) => new Set(providers).size === providers.length, {
      message: "providers must be unique"
    }),
  localEndpoint: z.string().url().optional(),
  localModel: z.string().trim().min(1).max(80).optional(),
  openRouterModel: z
    .enum(OPENROUTER_MODELS)
    .optional()
});

async function queryProvider(
  provider: ProviderName,
  brand: string,
  aliases: string[],
  query: string,
  localEndpoint: string | undefined,
  localModel: string | undefined,
  openRouterModel: (typeof OPENROUTER_MODELS)[number] | undefined
): Promise<ProviderResult> {
  if (provider === "gemini") {
    return queryGemini(brand, query, aliases);
  }

  if (provider === "openrouter") {
    return queryOpenRouter(
      brand,
      query,
      openRouterModel ?? env.OPENROUTER_MODEL,
      aliases
    );
  }

  return queryLocal(
    brand,
    query,
    localEndpoint,
    localModel ?? env.LOCAL_LLM_MODEL,
    aliases
  );
}

export function parseTrackRequest(input: unknown): TrackRequest {
  const parsed = trackRequestSchema.parse(input);

  return {
    ...parsed,
    aliases: parsed.aliases?.map((alias) => alias.trim()).filter(Boolean),
    providers: parsed.providers.filter((provider) => providerNames.has(provider))
  };
}

export async function trackBrand(input: unknown): Promise<HistoryRecord> {
  const request = parseTrackRequest(input);
  const results: ProviderResult[] = [];

  for (const [index, provider] of request.providers.entries()) {
    if (index > 0) {
      await delay(700);
    }

    const startedAt = Date.now();

    try {
      const result = await retryWithBackoff(
        () =>
                  queryProvider(
            provider,
            request.brand,
            request.aliases ?? [],
            request.query,
            request.localEndpoint,
            request.localModel,
            request.openRouterModel
          ),
        3
      );
      results.push(result);
    } catch (error) {
      results.push({
        provider,
        mentioned: false,
        sentiment: "neutral",
        snippet: "The provider failed before a response could be analyzed.",
        rawResponse: "",
        latencyMs: Date.now() - startedAt,
        mocked: false,
        error: (error as Error).message
      });
    }
  }

  const record: HistoryRecord = {
    id: randomUUID(),
    brand: request.brand,
    aliases: request.aliases ?? [],
    query: request.query,
    providers: request.providers,
    createdAt: new Date().toISOString(),
    results
  };

  await appendHistory(record);

  return record;
}
