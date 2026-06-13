import axios from "axios";
import { env } from "../../config/env.js";
import type { ProviderName } from "../../types.js";
import { analyzeResponse } from "../analysis.js";
import { buildMockResponse } from "../mockResponses.js";

const PROVIDER: ProviderName = "gemini";

export async function queryGemini(brand: string, query: string, aliases: string[] = []) {
  const apiKey = env.GEMINI_API_KEY;

  if (!apiKey) {
    const rawResponse = buildMockResponse(brand, query, PROVIDER);
    return await analyzeResponse(brand, rawResponse, PROVIDER, 0, true, aliases);
  }

  const startedAt = Date.now();
  const prompt = `Answer this search query naturally: "${query}". Only mention brands if they are genuinely relevant to the query. Do not force any brand mention.`;

  const response = await axios.post(
    `${env.GEMINI_API_URL}/models/${env.GEMINI_MODEL}:generateContent`,
    {
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 350
      }
    },
    {
      timeout: 20_000,
      params: {
        key: apiKey
      },
      headers: {
        "Content-Type": "application/json"
      }
    }
  );

  const content =
    response.data?.candidates?.[0]?.content?.parts?.[0]?.text ??
    response.data?.error?.message;

  if (typeof content !== "string" || content.trim().length === 0) {
    throw new Error("Gemini returned an empty or invalid response.");
  }

  return await analyzeResponse(
    brand,
    content,
    PROVIDER,
    Date.now() - startedAt,
    false,
    aliases
  );
}
