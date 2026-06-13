import axios from "axios";
import type { ProviderName } from "../../types.js";
import { analyzeResponse } from "../analysis.js";

const PROVIDER: ProviderName = "local";

function normalizeEndpoint(endpoint: string): string {
  return endpoint.replace(/\/+$/, "");
}

function isOllamaEndpoint(endpoint: string): boolean {
  return (endpoint.includes(":11434") || endpoint.includes("/api/")) && !endpoint.includes("/v1");
}

export async function queryLocal(
  brand: string,
  query: string,
  endpoint = "http://localhost:11434",
  model = "gemma4:e2b",
  aliases: string[] = []
) {
  const normalizedEndpoint = normalizeEndpoint(endpoint);
  const prompt = `Answer this search query naturally: "${query}". Only mention brands if they are genuinely relevant to the query. Do not force any brand mention.`;

  const startedAt = Date.now();
  const errors: string[] = [];

  if (isOllamaEndpoint(normalizedEndpoint)) {
    try {
      const response = await axios.post(
        `${normalizedEndpoint}/api/chat`,
        {
          model,
          messages: [
            {
              role: "system",
              content:
                "You are a concise search assistant. Answer naturally and do not force brand mentions unless they are relevant."
            },
            { role: "user", content: prompt }
          ],
          stream: false
        },
        { timeout: 90_000 }
      );

      const content =
        response.data?.message?.content ??
        response.data?.response ??
        response.data?.choices?.[0]?.message?.content;

      if (typeof content !== "string" || content.trim().length === 0) {
        throw new Error("Local LLM returned an empty response.");
      }

      return await analyzeResponse(
        brand,
        content,
        PROVIDER,
        Date.now() - startedAt,
        false,
        aliases
      );
    } catch (error) {
      errors.push((error as Error).message);
    }
  }

  try {
    const response = await axios.post(
      `${normalizedEndpoint}/chat/completions`,
      {
        model,
        messages: [
          {
            role: "system",
            content:
              "You are a concise search assistant. Answer naturally and do not force brand mentions unless they are relevant."
          },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 500
      },
      { timeout: 30_000 }
    );

    const content = response.data?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || content.trim().length === 0) {
      throw new Error("Local LLM returned an empty response.");
    }

    return await analyzeResponse(
      brand,
      content,
      PROVIDER,
      Date.now() - startedAt,
      false,
      aliases
    );
  } catch (error) {
    errors.push((error as Error).message);
  }

  throw new Error(`Local LLM request failed: ${errors.join(" | ")}`);
}
