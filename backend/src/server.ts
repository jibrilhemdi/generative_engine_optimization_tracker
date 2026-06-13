import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import { trackRouter } from "./routes/track.js";

const app = express();

app.use(cors());
app.use(express.json({ limit: "50kb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/track", trackRouter);

app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const message = error instanceof Error ? error.message : "Unexpected server error";
  res.status(500).json({ error: message });
});

app.listen(env.PORT, () => {
  console.log(`GEO Tracker API listening on http://localhost:${env.PORT}`);
});
