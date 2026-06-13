import { promises as fs } from "node:fs";
import path from "node:path";
import { env } from "../config/env.js";
import type { HistoryFile, HistoryRecord } from "../types.js";

const DEFAULT_HISTORY: HistoryFile = { records: [] };

async function readHistoryFile(): Promise<HistoryFile> {
  const dataPath = path.resolve(env.DATA_FILE);

  try {
    const content = await fs.readFile(dataPath, "utf8");
    return JSON.parse(content) as HistoryFile;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return DEFAULT_HISTORY;
    }
    throw error;
  }
}

async function writeHistoryFile(history: HistoryFile): Promise<void> {
  const dataPath = path.resolve(env.DATA_FILE);

  await fs.mkdir(path.dirname(dataPath), { recursive: true });
  await fs.writeFile(dataPath, JSON.stringify(history, null, 2));
}

export async function appendHistory(record: HistoryRecord): Promise<HistoryRecord> {
  const history = await readHistoryFile();
  const nextRecords = [record, ...history.records].slice(0, 10);

  await writeHistoryFile({ records: nextRecords });

  return record;
}

export async function getHistory(limit = 10): Promise<HistoryRecord[]> {
  const history = await readHistoryFile();
  return history.records.slice(0, limit);
}

export async function deleteHistoryRecord(id: string): Promise<HistoryRecord[]> {
  const history = await readHistoryFile();
  const nextRecords = history.records.filter((record) => record.id !== id);

  await writeHistoryFile({ records: nextRecords });

  return nextRecords;
}

export async function clearHistory(): Promise<HistoryRecord[]> {
  await writeHistoryFile(DEFAULT_HISTORY);

  return [];
}
