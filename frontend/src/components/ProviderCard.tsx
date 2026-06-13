import type { ProviderResult } from "../types";

interface ProviderCardProps {
  result: ProviderResult;
}

const providerLabels: Record<ProviderResult["provider"], string> = {
  gemini: "Gemini",
  openrouter: "OpenRouter",
  local: "Local LLM"
};

export function ProviderCard({ result }: ProviderCardProps) {
  const statusClass = result.error
    ? "border-amber-400 bg-amber-50 text-amber-950 dark:bg-amber-950/30 dark:text-amber-100"
    : result.mentioned
      ? "border-emerald-400 bg-emerald-50 text-emerald-950 dark:bg-emerald-950/30 dark:text-emerald-100"
      : "border-rose-400 bg-rose-50 text-rose-950 dark:bg-rose-950/30 dark:text-rose-100";

  const sentimentClass =
    result.sentiment === "positive"
      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-200"
      : result.sentiment === "negative"
        ? "bg-rose-500/15 text-rose-700 dark:text-rose-200"
        : "bg-slate-500/15 text-slate-700 dark:text-slate-200";

  return (
    <article className={`max-h-80 overflow-y-auto rounded-2xl border p-5 shadow-sm ${statusClass}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">{providerLabels[result.provider]}</h3>
          <p className="mt-1 text-sm opacity-80">
            {result.error ? "Request failed" : result.mentioned ? "Brand mentioned" : "Brand not mentioned"}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${sentimentClass}`}
        >
          {result.error ? "error" : result.sentiment}
        </span>
      </div>

      <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-relaxed opacity-90">
        {result.error ?? result.snippet}
      </p>

      {result.matchedAlias && (
        <p className="mt-3 text-xs font-medium opacity-80">Matched alias: {result.matchedAlias}</p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs opacity-75">
        {result.mocked && <span className="rounded-full bg-slate-200 px-2 py-1 dark:bg-slate-700">mock fallback</span>}
        <span>{result.latencyMs}ms</span>
        {!result.error && <span>{result.rawResponse.length} chars</span>}
      </div>
    </article>
  );
}
