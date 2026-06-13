import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();
dotenv.config({ path: ".env.openrouter", override: true });

export const OPENROUTER_MODELS = [
  "google/gemma-4-31b-it:free",
  "openai/gpt-oss-120b:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "nex-agi/nex-n2-pro:free"
] as const;

function parseBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return ["1", "true", "yes", "on"].includes(value.toLowerCase());
  return false;
}

const envSchema = z.object({
  PORT: z.coerce.number().default(3001),
  GEMINI_API_KEY: z.string().optional(),
  OPENROUTER_API_KEY: z.string().optional(),
  DATA_FILE: z.string().default("./data/history.json"),
  ENABLE_ML_SENTIMENT: z.preprocess(parseBoolean, z.boolean()).default(true),
  SENTIMENT_MODEL: z.string().default("Xenova/distilbert-base-uncased-finetuned-sst-2-english"),
  SENTIMENT_MAX_CHARS: z.coerce.number().int().positive().default(512),
  GEMINI_API_URL: z
    .string()
    .url()
    .default("https://generativelanguage.googleapis.com/v1beta"),
  GEMINI_MODEL: z.string().default("gemini-2.0-flash"),
  OPENROUTER_API_URL: z
    .string()
    .url()
    .default("https://openrouter.ai/api/v1/chat/completions"),
  OPENROUTER_MODEL: z.enum(OPENROUTER_MODELS).default(OPENROUTER_MODELS[0]),
  LOCAL_LLM_MODEL: z.string().default("gemma4:e2b")
});

export const env = envSchema.parse(process.env);
