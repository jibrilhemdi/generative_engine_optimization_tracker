import axios from "axios";
import { env, OPENROUTER_MODELS } from "../../config/env.js";
import type { ProviderName } from "../../types.js";
import { delay } from "../../utils/delay.js";
import { analyzeResponse } from "../analysis.js";
import { buildMockResponse } from "../mockResponses.js";

const PROVIDER: ProviderName = "openrouter";

const OPENROUTER_FALLBACK_MODELS: (typeof OPENROUTER_MODELS)[number][] = [
  "openai/gpt-oss-120b:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "google/gemma-4-31b-it:free",
  "nex-agi/nex-n2-pro:free"
];

type OpenRouterModel = (typeof OPENROUTER_MODELS)[number];

function getModelsToTry(model: OpenRouterModel): OpenRouterModel[] {
  return [model, ...OPENROUTER_FALLBACK_MODELS.filter((candidate) => candidate !== model)];
}

function isOpenRouterRetryableError(error: unknown): boolean {
  const status = axios.isAxiosError(error) ? error.response?.status : undefined;
  return status === 404 || status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}

async function requestOpenRouterContent(
  modelName: OpenRouterModel,
  apiKey: string,
  prompt: string
): Promise<string> {
  const response = await axios.post(
    env.OPENROUTER_API_URL,
    {
      model: modelName,
      messages: [
        {
          role: "system",
          content:
            "You are a concise search assistant. Answer naturally and do not force brand mentions unless they are relevant."
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.2,
      max_tokens: 500
    },
    {
      timeout: 45_000,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://github.com/open-source-geo-tracker",
        "X-Title": "Open-Source GEO Tracker"
      }
    }
  );

  const content = response.data?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || content.trim().length === 0) {
    throw new Error("OpenRouter returned an empty or invalid response.");
  }

  return content;
}

export async function queryOpenRouter(
  brand: string,
  query: string,
  model = env.OPENROUTER_MODEL,
  aliases: string[] = []
) {
  const apiKey = env.OPENROUTER_API_KEY;

  if (!apiKey) {
    const rawResponse = buildMockResponse(brand, query, PROVIDER);
    return await analyzeResponse(brand, rawResponse, PROVIDER, 0, true, aliases);
  }

  const startedAt = Date.now();
  const prompt = `Answer this search query naturally: "${query}". Only mention brands if they are genuinely relevant to the query. Do not force any brand mention.`;
  const modelsToTry = getModelsToTry(model);
  let lastError: unknown;

  for (const [index, modelName] of modelsToTry.entries()) {
    try {
      const content = await requestOpenRouterContent(modelName, apiKey, prompt);
      return await analyzeResponse(
        brand,
        content,
        PROVIDER,
        Date.now() - startedAt,
        false,
        aliases
      );
    } catch (error) {
      lastError = error;

      if (!isOpenRouterRetryableError(error) || index === modelsToTry.length - 1) {
        break;
      }

      await delay(1_000);
    }
  }

  throw new Error(
    `OpenRouter request failed: ${(lastError as Error).message}`
  );
}
