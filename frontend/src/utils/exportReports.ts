import type { HistoryRecord } from "../types";

function csvEscape(value: unknown): string {
  const text = Array.isArray(value) ? value.join("; ") : value ?? "";
  const stringValue = String(text);

  if (/[",\n\r]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

function buildCsv(headers: string[], rows: unknown[][]): string {
  return [headers, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
}

export function downloadBlob(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function exportHistoryCsv(history: HistoryRecord[]) {
  const headers = [
    "createdAt",
    "brand",
    "aliases",
    "query",
    "provider",
    "mentioned",
    "matchedAlias",
    "sentiment",
    "latencyMs",
    "snippet",
    "rawResponse",
    "error"
  ];

  const rows = history.flatMap((record) =>
    record.results.map((result) => [
      record.createdAt,
      record.brand,
      record.aliases ?? [],
      record.query,
      result.provider,
      result.mentioned,
      result.matchedAlias ?? "",
      result.sentiment,
      result.latencyMs,
      result.snippet,
      result.rawResponse,
      result.error ?? ""
    ])
  );

  downloadBlob(
    `geo-tracker-history-${new Date().toISOString().slice(0, 10)}.csv`,
    buildCsv(headers, rows),
    "text/csv;charset=utf-8"
  );
}
