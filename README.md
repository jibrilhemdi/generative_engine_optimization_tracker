# Open-Source GEO Tracker

**Open-Source GEO Tracker** is a full-stack TypeScript web app for monitoring how a brand appears in responses from different large language models. GEO, or **Generative Engine Optimization**, is the practice of improving how a brand, product, person, or topic is represented inside AI-generated answers. As more users ask LLMs for recommendations, comparisons, and summaries, brand visibility in those answers can influence discovery, trust, and purchasing decisions.

This portfolio project demonstrates a production-minded approach to monitoring any brand:

- Querying multiple LLM providers from a single dashboard.
- Recording brand mentions, matched aliases, sentiment, and response snippets.
- Visualizing historical mention frequency.
- Running with free-tier APIs or mock data when no API key is configured.
- Keeping API keys out of source code.

## Screenshots

Add real screenshots after running the app locally:

- `docs/screenshots/dashboard.png` — main dashboard with the tracking form, provider result cards, mention-frequency chart, and history table.
- `docs/screenshots/dark-mode.png` — dashboard in dark mode.
- `docs/screenshots/history.png` — recent query history.

Placeholder screenshot notes are currently stored in `docs/screenshots/dashboard-placeholder.md`.

## Project Structure

```txt
geo-tracker/
├─ backend/
│  ├─ package.json
│  ├─ tsconfig.json
│  └─ src/
│     ├─ config/env.ts
│     ├─ routes/track.ts
│     ├─ services/
│     │  ├─ analysis.ts
│     │  ├─ history.ts
│     │  ├─ mockResponses.ts
│     │  ├─ track.ts
│     │  └─ providers/
│     │     ├─ gemini.ts
│     │     ├─ local.ts
│     │     └─ openrouter.ts
│     ├─ types.ts
│     ├─ utils/
│     │  ├─ delay.ts
│     │  └─ retry.ts
│     └─ server.ts
├─ frontend/
│  ├─ package.json
│  ├─ index.html
│  ├─ tailwind.config.js
│  ├─ postcss.config.js
│  ├─ tsconfig.json
│  ├─ tsconfig.node.json
│  ├─ vite.config.ts
│  └─ src/
│     ├─ api.ts
│     ├─ App.tsx
│     ├─ main.tsx
│     ├─ styles.css
│     ├─ types.ts
│     └─ components/
│        ├─ HistoryTable.tsx
│        └─ ProviderCard.tsx
├─ docs/
│  └─ screenshots/
│     └─ dashboard-placeholder.md
├─ package.json
├─ .env.example
├─ .gitignore
└─ README.md
```

## Architecture

```txt
┌──────────────────────┐
│ React + Vite Frontend │
│ Tailwind + Chart.js   │
└──────────┬───────────┘
           │ HTTP JSON
           ▼
┌──────────────────────┐
│ Express API Backend  │
│ /api/track + history │
└───────┬───────┬──────┘
        │       │
        │       ▼
        │  JSON history file
        │
        ▼
┌────────────────────────────────────────────┐
│ LLM Provider Layer                          │
│ OpenRouter / Local / Gemini                 │
│ API keys are read from env vars.            │
│ If no key is present, the backend returns   │
│ deterministic mock responses for demos.     │
└────────────────────────────────────────────┘
```

## Features

- Brand monitoring form with brand name, optional aliases, query, and provider selection.
- Provider checkboxes for:
  - **OpenRouter** free-tier LLMs with model picker
  - **Local LLM** via Ollama or an OpenAI-compatible local endpoint
  - **Google Gemini**
- Backend retry logic with exponential backoff, max 3 retries.
- Graceful rate-limit and provider-error handling.
- Keyword-based brand mention detection.
- Simple positive/neutral/negative sentiment scoring.
- 500-character response snippets.
- Result cards color-coded by brand mention status.
- Historical mention-frequency line chart.
- Local JSON history file storing the last 10 queries.
- Dark/light mode toggle.
- JSON export for history.
- Mock fallback when API keys are not configured.

## API

### `POST /api/track`

Request:

```json
{
  "brand": "Netto",
  "aliases": ["Netto Denmark", "Netto Supermarket"],
  "query": "best discount supermarket in Denmark",
  "providers": ["openrouter", "local"],
  "localEndpoint": "http://localhost:11434",
  "localModel": "gemma4:e2b",
  "openRouterModel": "google/gemma-4-31b-it:free"
}
```

Response:

```json
{
  "id": "uuid",
  "brand": "Netto",
  "aliases": ["Netto Denmark", "Netto Supermarket"],
  "query": "best discount supermarket in Denmark",
  "providers": ["openrouter", "local"],
  "createdAt": "2026-06-11T00:00:00.000Z",
  "results": [
    {
      "provider": "openrouter",
      "mentioned": true,
      "sentiment": "positive",
      "matchedAlias": "Netto Denmark",
      "snippet": "For \"best discount supermarket in Denmark\", Netto Denmark is a relevant option...",
      "rawResponse": "For \"best discount supermarket in Denmark\", Netto Denmark is a relevant option...",
      "latencyMs": 842,
      "mocked": false
    }
  ]
}
```

### `GET /api/track/history`

Returns the past 10 tracking records stored in the local JSON history file.

## Setup Instructions

### Prerequisites

- Node.js 18 or newer.
- npm, Yarn, or pnpm.
- Optional: Ollama or LM Studio for local LLM testing.

### 1. Clone the project

```bash
git clone <your-repo-url>
cd geo-tracker
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Copy the example environment file:

```bash
cp .env.example .env
```

Minimum variables:

```env
PORT=3001
GEMINI_API_KEY=
DATA_FILE=./data/history.json
```

Optional OpenRouter key file:

```env
OPENROUTER_API_KEY=your_openrouter_key_here
```

The app works without keys by returning mock responses. To use real free-tier APIs, add your keys to `.env`. You can keep `OPENROUTER_API_KEY` in the separate `.env.openrouter` file instead; that file is ignored by Git.

### 4. Run the development servers

```bash
npm run dev
```

Open:

- Frontend: <http://localhost:5173>
- Backend health check: <http://localhost:3001/health>

### 5. Build for production

```bash
npm run build
```

## LLM Integrations

### OpenRouter

OpenRouter is the preferred cloud provider for this project because it exposes multiple models through one OpenAI-compatible chat completions endpoint, including the free-tier models selected for this app.

Get a free API key:

1. Visit <https://openrouter.ai/>.
2. Create or sign in to your account.
3. Generate an API key.
4. Add it to `.env.openrouter`:

```env
OPENROUTER_API_KEY=your_openrouter_key_here
```

The backend also loads `.env`, but `.env.openrouter` is used for the OpenRouter key so you can keep it separate and ignored by Git.

The backend sends requests to:

```txt
https://openrouter.ai/api/v1/chat/completions
```

The frontend model picker supports these free-tier OpenRouter models:

```txt
google/gemma-4-31b-it:free
openai/gpt-oss-120b:free
meta-llama/llama-3.3-70b-instruct:free
nex-agi/nex-n2-pro:free
```

The default model is `google/gemma-4-31b-it:free`. You can also set `OPENROUTER_MODEL` in `.env` to one of the allowed models above.

### Google Gemini

Gemini is available through Google AI Studio and has a free tier for eligible usage.

Get a free API key:

1. Visit <https://aistudio.google.com/>.
2. Create or sign in to your Google account.
3. Create an API key.
4. Add it to `.env`:

```env
GEMINI_API_KEY=your_gemini_key_here
GEMINI_MODEL=gemini-2.0-flash
```

The backend sends requests to Google's Generative Language API.

### Local LLM Option

The local provider supports:

- **Ollama**: `http://localhost:11434`
- **OpenAI-compatible local servers** such as LM Studio: `http://localhost:1234/v1`

Example Ollama setup:

```bash
ollama pull gemma4:e2b
ollama serve
```

Then configure the frontend local endpoint:

```txt
Endpoint: http://localhost:11434
Model: gemma4:e2b
```

For LM Studio:

1. Start the local server.
2. Use an OpenAI-compatible endpoint, commonly `http://localhost:1234/v1`.
3. Enter the model name shown by LM Studio.

## Example Query

Use these values in the dashboard to track Netto in Denmark:

```txt
Brand: Netto
Aliases: Netto Denmark, Netto Supermarket
Query: best discount supermarket in Denmark
Providers: OpenRouter, Local LLM
```

The backend sends each provider a natural search query without injecting the brand into the prompt. It then checks whether the brand name or any configured alias appears in the generated answer.

Expected frontend behavior:

- If OpenRouter mentions Netto or a configured alias, its card appears green.
- If Local LLM does not mention Netto or any alias, its card appears red.
- The history chart updates with the latest mention-frequency point.

## Implementation Notes

### Backend

- Express + TypeScript.
- Zod validates `POST /api/track` payloads.
- Provider services are isolated behind a shared result shape.
- OpenRouter, Gemini, and Local LLM providers all share the same analysis pipeline.
- `retryWithBackoff` retries provider calls up to 3 times.
- Calls are spaced with a short delay to reduce accidental rate-limit bursts.
- History is stored in a JSON file rather than requiring a database.

### Frontend

- React + TypeScript + Vite.
- Tailwind CSS for dashboard styling.
- Chart.js for historical mention frequency.
- Loading skeletons for in-flight provider calls.
- Error states for invalid input and provider failures.
- Dark/light mode toggle persisted in `localStorage`.

### Mock Fallback

If a provider API key is missing, the backend returns a mock response so the app remains usable for demos and portfolio reviews. Mock responses are marked with `mocked: true`. OpenRouter and Gemini follow this fallback behavior when their key is not configured; Local LLM falls back when the local endpoint is unavailable or returns an invalid response.

## Known Limitations

- Sentiment analysis uses simple keyword matching, not a trained sentiment model.
- Brand matching uses whole-word case-insensitive matching. Optional aliases help with variants, but it may still miss stylized brand names, abbreviations, or multilingual mentions.
- JSON history is intended for local demos, not high-volume production storage.
- The local LLM provider does not stream tokens to the UI; it waits for the complete local response.
- Free-tier APIs have rate limits and model availability differences by region/account.
- The prompt asks models to mention the brand "if appropriate"; this keeps responses natural but means mentions are not guaranteed.

## Future Improvements

- Add SQLite persistence with migrations.
- Add result caching for identical queries for 1 hour.
- Add streaming UI for local LLM responses.
- Add more LLM providers such as Mistral, Anthropic, OpenAI, or Perplexity.
- Improve sentiment with a lightweight ML model or external sentiment API.
- Add entity disambiguation, e.g. Netto Denmark vs other Netto brands.
- Add scheduled monitoring and alerts.
- Add user accounts, project workspaces, and saved dashboards.
- Add CSV export and PDF reports.
- Add tests for analysis, provider parsing, and API routes.

## Security and Privacy Notes

- API keys are read only from environment variables.
- `.env` is ignored by Git.
- The app does not include hardcoded provider keys.
- Do not commit `.env` or local history if it contains sensitive brand queries.
# generative_engine_optimization_tracker
