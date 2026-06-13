import { env } from "../config/env.js";
import type { Sentiment } from "../types.js";

const POSITIVE_WORDS = [
  "best",
  "excellent",
  "great",
  "leading",
  "innovative",
  "trusted",
  "powerful",
  "recommended",
  "impressive",
  "reliable",
  "top",
  "strong",
  "positive",
  "award",
  "love",
  "favorite"
];

const NEGATIVE_WORDS = [
  "bad",
  "poor",
  "weak",
  "worst",
  "slow",
  "unreliable",
  "expensive",
  "limited",
  "avoid",
  "negative",
  "concern",
  "problem",
  "issue",
  "disappointing",
  "overrated"
];

type SentimentClassifier = (text: string) => Promise<Sentiment>;

let classifierPromise: Promise<SentimentClassifier> | null = null;

function keywordSentiment(text: string): Sentiment {
  const lowerResponse = text.toLowerCase();
  const positiveScore = POSITIVE_WORDS.reduce(
    (count, word) => count + (lowerResponse.includes(word) ? 1 : 0),
    0
  );
  const negativeScore = NEGATIVE_WORDS.reduce(
    (count, word) => count + (lowerResponse.includes(word) ? 1 : 0),
    0
  );

  if (positiveScore > negativeScore) return "positive";
  if (negativeScore > positiveScore) return "negative";
  return "neutral";
}

async function loadSentimentClassifier(): Promise<SentimentClassifier> {
  const { pipeline, env: transformersEnv } = await import("@xenova/transformers");

  transformersEnv.allowLocalModels = false;
  transformersEnv.useBrowserCache = false;

  const classifier = await pipeline("sentiment-analysis", env.SENTIMENT_MODEL);

  return async (text: string) => {
    const output = await classifier(text.slice(0, env.SENTIMENT_MAX_CHARS), { topk: 1 });
    const firstResult = Array.isArray(output) ? output[0] : output;
    const label = String((firstResult as { label?: unknown }).label ?? "").toLowerCase();

    if (label.includes("positive") || label.includes("star")) return "positive";
    if (label.includes("negative")) return "negative";
    return "neutral";
  };
}

export async function classifySentiment(text: string): Promise<Sentiment> {
  if (!env.ENABLE_ML_SENTIMENT) {
    return keywordSentiment(text);
  }

  try {
    if (!classifierPromise) {
      classifierPromise = loadSentimentClassifier();
    }

    const classifier = await classifierPromise;
    return await classifier(text);
  } catch {
    return keywordSentiment(text);
  }
}
