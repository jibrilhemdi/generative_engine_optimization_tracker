import { Router } from "express";
import { clearHistory, deleteHistoryRecord, getHistory } from "../services/history.js";
import { trackBrand } from "../services/track.js";

export const trackRouter = Router();

trackRouter.post("/", async (req, res, next) => {
  try {
    const record = await trackBrand(req.body);
    res.status(201).json(record);
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      res.status(400).json({ error: error.message });
      return;
    }
    next(error);
  }
});

trackRouter.get("/history", async (_req, res, next) => {
  try {
    const records = await getHistory(10);
    res.json(records);
  } catch (error) {
    next(error);
  }
});

trackRouter.delete("/history/:id", async (req, res, next) => {
  try {
    const previousLength = (await getHistory(10)).length;
    const records = await deleteHistoryRecord(req.params.id);

    if (records.length === previousLength) {
      res.status(404).json({ error: "History record not found" });
      return;
    }

    res.json(records);
  } catch (error) {
    next(error);
  }
});

trackRouter.delete("/history", async (_req, res, next) => {
  try {
    const records = await clearHistory();
    res.json(records);
  } catch (error) {
    next(error);
  }
});
