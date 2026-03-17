import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { z } from "zod";
import { config } from "@/config";
import { HttpError } from "@/http/errors";
import { healthRouter } from "@/routes/health";
import { authRouter } from "@/routes/auth";
import { adminRouter } from "@/routes/admin";

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: true,
    credentials: true,
    allowedHeaders: ["content-type", "authorization", "x-tenant-slug"],
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

app.get("/", (_req, res) => res.json({ ok: true, service: "ai-csgts-api" }));
app.use("/v1", healthRouter);
app.use("/v1", authRouter);
app.use("/v1", adminRouter);

app.use((_req, _res, next) => next(new HttpError(404, "NOT_FOUND", "Route not found")));

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ ok: false, error: { code: err.code, message: err.message } });
  }
  if (err instanceof z.ZodError) {
    return res.status(400).json({
      ok: false,
      error: { code: "VALIDATION_ERROR", message: "Invalid request", issues: err.issues },
    });
  }
  // eslint-disable-next-line no-console
  console.error(err);
  return res.status(500).json({ ok: false, error: { code: "INTERNAL", message: "Internal server error" } });
});

app.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(`API listening on http://localhost:${config.port}`);
});

