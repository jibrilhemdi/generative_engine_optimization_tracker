import type { HistoryRecord } from "../types";

interface HistoryTableProps {
  history: HistoryRecord[];
  onDelete: (id: string) => void;
}

const providerLabels: Record<string, string> = {
  gemini: "Gemini",
  openrouter: "OpenRouter",
  local: "Local LLM"
};

export function HistoryTable({ history, onDelete }: HistoryTableProps) {
  if (history.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed p-8 text-center text-slate-500 dark:border-slate-700 dark:text-slate-400">
        No tracking history yet. Run your first brand query above.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
          <thead className="bg-slate-50 dark:bg-slate-950">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Time
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Brand
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Query
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Providers
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Mentions
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {history.map((record) => {
              const mentionCount = record.results.filter((result) => result.mentioned).length;
              return (
                <tr key={record.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                    {new Date(record.createdAt).toLocaleString()}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-slate-900 dark:text-slate-100">
                    {record.brand}
                  </td>
                  <td className="max-w-xs px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                    {record.query}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                    {record.providers.map((provider) => providerLabels[provider]).join(", ")}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm">
                    <span
                      className={`rounded-full px-3 py-1 font-semibold ${
                        mentionCount > 0
                          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-200"
                          : "bg-rose-500/15 text-rose-700 dark:text-rose-200"
                      }`}
                    >
                      {mentionCount}/{record.results.length}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                    <button
                      onClick={() => onDelete(record.id)}
                      className="rounded-full border border-rose-300 px-3 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-200 dark:hover:bg-rose-950/30"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
