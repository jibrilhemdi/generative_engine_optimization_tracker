import axios from "axios";
import type { HistoryRecord, TrackPayload } from "./types";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "",
  timeout: 300_000
});

export async function trackBrand(payload: TrackPayload) {
  const response = await api.post("/api/track", payload);
  return response.data as HistoryRecord;
}

export async function getHistory() {
  const response = await api.get<HistoryRecord[]>("/api/track/history");
  return response.data;
}

export async function deleteHistoryRecord(id: string) {
  const response = await api.delete<HistoryRecord[]>(`/api/track/history/${id}`);
  return response.data;
}

export async function clearHistory() {
  const response = await api.delete<HistoryRecord[]>("/api/track/history");
  return response.data;
}
