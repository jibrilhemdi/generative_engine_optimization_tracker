import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  CategoryScale,
  Chart as ChartJS,
  LineElement,
  LinearScale,
  PointElement,
  Title,
  Tooltip,
  Legend
} from "chart.js";
import { Line } from "react-chartjs-2";
import { clearHistory, deleteHistoryRecord, getHistory, trackBrand } from "./api";
import { HistoryTable } from "./components/HistoryTable";
import { ProviderCard } from "./components/ProviderCard";
import type { HistoryRecord, ProviderName, TrackPayload } from "./types";
import { downloadBlob, exportHistoryCsv } from "./utils/exportReports";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const PROVIDERS: ProviderName[] = ["openrouter", "local", "gemini"];

const PROVIDER_LABELS: Record<ProviderName, string> = {
  openrouter: "OpenRouter",
  local: "Local LLM",
  gemini: "Gemini"
};

const OPENROUTER_MODELS = [
  "google/gemma-4-31b-it:free",
  "openai/gpt-oss-120b:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "nex-agi/nex-n2-pro:free"
] as const;

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function getMentionCount(record: HistoryRecord): number {
  return record.results.filter((result) => result.mentioned).length;
}

function getMentionFrequency(record: HistoryRecord): number {
  if (record.results.length === 0) return 0;
  return getMentionCount(record) / record.results.length;
}

async function exportPdfReport(history: HistoryRecord[]) {
  type PdfDocument = {
    internal: {
      pageSize: {
        getWidth: () => number;
        getHeight: () => number;
      };
    };
    lastAutoTable?: {
      finalY: number;
    };
    setFontSize: (size: number) => PdfDocument;
    setFont: (fontName: string, fontStyle?: string) => PdfDocument;
    text: (text: string | string[], x: number, y: number) => PdfDocument;
    addPage: () => PdfDocument;
    save: (filename: string) => void;
  };

  const jsPDFModule = await import("jspdf");
  const autoTableModule = await import("jspdf-autotable");
  const doc = new jsPDFModule.default({ unit: "pt", format: "a4" }) as PdfDocument;
  const autoTablePdf = autoTableModule.autoTable as (
    doc: PdfDocument,
    options: Record<string, unknown>
  ) => void;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const generatedAt = new Date().toLocaleString();
  const orderedHistory = [...history].reverse();
  const brands = Array.from(new Set(orderedHistory.map((record) => record.brand)));

  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("Brand Monitoring Report", 40, 52);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Generated: ${generatedAt}`, 40, 72);
  doc.text(`Records included: ${orderedHistory.length}`, 40, 88);

  const summaryRows = brands.map((brandName) => {
    const records = orderedHistory.filter((record) => record.brand === brandName);
    const mentionCount = records.reduce((total, record) => total + getMentionCount(record), 0);
    const totalResults = records.reduce((total, record) => total + record.results.length, 0);
    const mentionRate = totalResults === 0 ? 0 : mentionCount / totalResults;

    return [brandName, records.length, `${mentionCount}/${totalResults}`, `${Math.round(mentionRate * 100)}%`];
  });

  autoTablePdf(doc, {
    startY: 110,
    head: [["Brand", "Runs", "Mentions", "Mention rate"]],
    body: summaryRows,
    theme: "grid",
    styles: { fontSize: 8 },
    headStyles: { fillColor: [16, 185, 129] }
  });

  let nextY = (doc as PdfDocument & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 150;
  if (nextY + 150 > pageHeight - 40) {
    doc.addPage();
    nextY = 40;
  }

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Run details", 40, nextY);
  doc.setFont("helvetica", "normal");

  autoTablePdf(doc, {
    startY: nextY + 10,
    head: [["Time", "Brand", "Aliases", "Query", "Mentions", "Rate", "Providers"]],
    body: orderedHistory.map((record) => [
      new Date(record.createdAt).toLocaleString(),
      record.brand,
      record.aliases?.join("; ") ?? "",
      record.query,
      `${getMentionCount(record)}/${record.results.length}`,
      `${Math.round(getMentionFrequency(record) * 100)}%`,
      record.providers.map((provider) => PROVIDER_LABELS[provider]).join(", ")
    ]),
    theme: "grid",
    styles: { fontSize: 7, cellPadding: 3 },
    headStyles: { fillColor: [16, 185, 129] },
    columnStyles: {
      2: { cellWidth: 85 },
      3: { cellWidth: 145 },
      6: { cellWidth: 85 }
    }
  });

  nextY = (doc as PdfDocument & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 150;
  if (nextY + 150 > pageHeight - 40) {
    doc.addPage();
    nextY = 40;
  }

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Provider results", 40, nextY);
  doc.setFont("helvetica", "normal");

  const providerRows = orderedHistory.flatMap((record) =>
    record.results.map((result) => [
      new Date(record.createdAt).toLocaleString(),
      record.brand,
      PROVIDER_LABELS[result.provider],
      result.error ? "error" : result.mentioned ? "mentioned" : "not mentioned",
      result.matchedAlias ?? "",
      result.sentiment,
      result.latencyMs,
      result.snippet
    ])
  );

  autoTablePdf(doc, {
    startY: nextY + 10,
    head: [["Time", "Brand", "Provider", "Status", "Matched alias", "Sentiment", "Latency", "Snippet"]],
    body: providerRows,
    theme: "grid",
    styles: { fontSize: 7, cellPadding: 3 },
    headStyles: { fillColor: [16, 185, 129] },
    columnStyles: {
      0: { cellWidth: 82 },
      2: { cellWidth: 60 },
      4: { cellWidth: 70 },
      6: { cellWidth: 45 },
      7: { cellWidth: pageWidth - 397 }
    }
  });

  doc.save(`geo-tracker-report-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export default function App() {
  const [brand, setBrand] = useState("Netto");
  const [aliases, setAliases] = useState("Netto Denmark, Netto Supermarket");
  const [query, setQuery] = useState("best discount supermarket in Denmark");
  const [providers, setProviders] = useState<ProviderName[]>(["openrouter", "local"]);
  const [localEndpoint, setLocalEndpoint] = useState("http://localhost:11434");
  const [localModel, setLocalModel] = useState("gemma4:e2b");
  const [openRouterModel, setOpenRouterModel] = useState<(typeof OPENROUTER_MODELS)[number]>(
    OPENROUTER_MODELS[0]
  );
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [latestRecord, setLatestRecord] = useState<HistoryRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(false);

  const refreshHistory = () => {
    getHistory().then(setHistory).catch(() => setHistory([]));
  };

  useEffect(() => {
    const savedTheme = localStorage.getItem("geo-tracker-theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const nextTheme = savedTheme ?? (prefersDark ? "dark" : "light");
    setDarkMode(nextTheme === "dark");
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
  }, []);

  useEffect(() => {
    refreshHistory();
  }, []);

  const chartData = useMemo(() => {
    const labels = [...history].reverse().map((record) => {
      const date = new Date(record.createdAt);
      return `${record.brand} · ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    });

    return {
      labels,
      datasets: [
        {
          label: "Mention frequency",
          data: history.map((record) => {
            if (record.results.length === 0) return 0;
            return record.results.filter((result) => result.mentioned).length / record.results.length;
          }),
          borderColor: "#10b981",
          backgroundColor: "rgba(16, 185, 129, 0.15)",
          tension: 0.35,
          fill: true,
          pointRadius: 4,
          pointHoverRadius: 6
        }
      ]
    };
  }, [history]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: document.documentElement.classList.contains("dark") ? "#cbd5e1" : "#334155"
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 1,
        ticks: {
          color: document.documentElement.classList.contains("dark") ? "#94a3b8" : "#64748b",
          callback: (value: number | string) => `${Number(value) * 100}%`
        },
        grid: {
          color: document.documentElement.classList.contains("dark") ? "rgba(148, 163, 184, 0.15)" : "rgba(100, 116, 139, 0.15)"
        }
      },
      x: {
        ticks: {
          color: document.documentElement.classList.contains("dark") ? "#94a3b8" : "#64748b"
        },
        grid: {
          color: document.documentElement.classList.contains("dark") ? "rgba(148, 163, 184, 0.1)" : "rgba(100, 116, 139, 0.1)"
        }
      }
    }
  };

  const toggleProvider = (provider: ProviderName) => {
    setProviders((current) =>
      current.includes(provider)
        ? current.filter((item) => item !== provider)
        : [...current, provider]
    );
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const payload: TrackPayload = {
        brand: brand.trim(),
        aliases: aliases
          .split(",")
          .map((alias) => alias.trim())
          .filter(Boolean),
        query: query.trim(),
        providers,
        localEndpoint: providers.includes("local") ? localEndpoint.trim() : undefined,
        localModel: providers.includes("local") ? localModel.trim() : undefined,
        openRouterModel: providers.includes("openrouter") ? openRouterModel : undefined
      };

      const record = await trackBrand(payload);
      setLatestRecord(record);
      setHistory((current) => [record, ...current].slice(0, 10));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to track brand.");
    } finally {
      setLoading(false);
    }
  };

  const toggleTheme = () => {
    const next = !darkMode;
    setDarkMode(next);
    localStorage.setItem("geo-tracker-theme", next ? "dark" : "light");
    document.documentElement.classList.toggle("dark", next);
  };

  const exportHistory = () => {
    downloadJson(`geo-tracker-history-${new Date().toISOString().slice(0, 10)}.json`, history);
  };

  const exportCsv = () => {
    exportHistoryCsv(history);
  };

  const exportPdf = () => {
    exportPdfReport(history);
  };

  const removeHistoryRecord = (id: string) => {
    deleteHistoryRecord(id).then(setHistory).catch(refreshHistory);
  };

  const clearAllHistory = () => {
    if (!window.confirm("Clear all tracking history?")) {
      return;
    }

    clearHistory().then(setHistory).catch(refreshHistory);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 transition-colors dark:bg-slate-950 dark:text-slate-100">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-6 sm:px-6 lg:px-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">
              Open-Source GEO Tracker
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">Brand Monitoring for Any Brand in LLM Answers</h1>
          </div>
          <button
            onClick={toggleTheme}
            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-900"
          >
            {darkMode ? "Light mode" : "Dark mode"}
          </button>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:px-8 lg:grid-cols-[500px_minmax(0,1fr)]">
        <section className="space-y-6">
          <form onSubmit={handleSubmit} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-xl font-semibold">Track a brand</h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Query selected LLMs and see whether a brand, store, product, or company appears in generated answers.
            </p>

            <div className="mt-6 space-y-5">
              <label className="block">
                <span className="text-sm font-medium">Brand name</span>
                <input
                  value={brand}
                  onChange={(event) => setBrand(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:border-slate-700 dark:bg-slate-950"
                  placeholder="Netto"
                  required
                />
                <span className="mt-2 block text-xs text-slate-500 dark:text-slate-400">
                  Use any brand or business name, for example Netto, Nike, or a local shop.
                </span>
              </label>

              <label className="block">
                <span className="text-sm font-medium">Brand aliases (optional)</span>
                <input
                  value={aliases}
                  onChange={(event) => setAliases(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:border-slate-700 dark:bg-slate-950"
                  placeholder="Netto Denmark, Netto Supermarket"
                />
                <span className="mt-2 block text-xs text-slate-500 dark:text-slate-400">
                  Add comma-separated variants so mentions like “Netto Denmark” are counted too.
                </span>
              </label>

              <label className="block">
                <span className="text-sm font-medium">Search query</span>
                <textarea
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="mt-2 min-h-28 w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:border-slate-700 dark:bg-slate-950"
                  placeholder="best discount supermarket in Denmark"
                  required
                />
              </label>

              <fieldset>
                <legend className="text-sm font-medium">LLM providers</legend>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  {PROVIDERS.map((provider) => (
                    <label
                      key={provider}
                      className="flex w-full cursor-pointer items-center gap-3 rounded-xl border border-slate-300 p-3 transition hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                    >
                      <input
                        type="checkbox"
                        checked={providers.includes(provider)}
                        onChange={() => toggleProvider(provider)}
                        className="h-4 w-4 shrink-0 accent-emerald-600"
                      />
                      <span className="font-medium">{PROVIDER_LABELS[provider]}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              {providers.includes("local") && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-medium">Local endpoint</span>
                    <input
                      value={localEndpoint}
                      onChange={(event) => setLocalEndpoint(event.target.value)}
                      className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:border-slate-700 dark:bg-slate-950"
                      placeholder="http://localhost:11434"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium">Local model</span>
                    <input
                      value={localModel}
                      onChange={(event) => setLocalModel(event.target.value)}
                      className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:border-slate-700 dark:bg-slate-950"
                      placeholder="gemma4:e2b"
                    />
                  </label>
                </div>
              )}

              {providers.includes("openrouter") && (
                <label className="block">
                  <span className="text-sm font-medium">OpenRouter model</span>
                  <select
                    value={openRouterModel}
                    onChange={(event) =>
                      setOpenRouterModel(event.target.value as typeof OPENROUTER_MODELS[number])
                    }
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:border-slate-700 dark:bg-slate-950"
                  >
                    {OPENROUTER_MODELS.map((model) => (
                      <option key={model} value={model}>
                        {model}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {error && (
                <div className="rounded-2xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-200">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || providers.length === 0}
                className="w-full rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Tracking providers..." : "Run brand tracking"}
              </button>
            </div>
          </form>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">Historical mention frequency</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Past 10 queries stored locally.</p>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <button
                  onClick={exportHistory}
                  disabled={history.length === 0}
                  className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-900"
                >
                  Export JSON
                </button>
                <button
                  onClick={exportCsv}
                  disabled={history.length === 0}
                  className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-900"
                >
                  Export CSV
                </button>
                <button
                  onClick={exportPdf}
                  disabled={history.length === 0}
                  className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-900"
                >
                  Export PDF
                </button>
                <button
                  onClick={clearAllHistory}
                  disabled={history.length === 0}
                  className="rounded-full border border-rose-300 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-rose-800 dark:text-rose-200 dark:hover:bg-rose-950/30"
                >
                  Clear all
                </button>
              </div>
            </div>
            <div className="mt-4 h-64">
              <Line data={chartData} options={chartOptions} />
            </div>
          </section>
        </section>

        <section className="space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">Latest results</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Green means the brand or an alias was mentioned; red means it was not.
                </p>
              </div>
              {latestRecord && (
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold dark:bg-slate-800">
                  {latestRecord.results.filter((result) => result.mentioned).length}/{latestRecord.results.length} mentioned
                </span>
              )}
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {loading
                ? PROVIDERS.filter((provider) => providers.includes(provider)).map((provider) => (
                    <article
                      key={provider}
                      className="animate-pulse rounded-2xl border border-slate-200 p-5 dark:border-slate-800"
                    >
                      <div className="h-5 w-24 rounded bg-slate-200 dark:bg-slate-800" />
                      <div className="mt-4 h-24 rounded bg-slate-200 dark:bg-slate-800" />
                      <div className="mt-4 h-4 w-16 rounded bg-slate-200 dark:bg-slate-800" />
                    </article>
                  ))
                : latestRecord?.results.map((result) => <ProviderCard key={result.provider} result={result} />)}
            </div>
          </section>

          <section>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Past queries</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Recent tracking runs.</p>
              </div>
              <button
                onClick={refreshHistory}
                className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                Refresh
              </button>
            </div>
            <HistoryTable history={history} onDelete={removeHistoryRecord} />
          </section>
        </section>
      </main>
    </div>
  );
}
