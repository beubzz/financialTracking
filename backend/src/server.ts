import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import authRouter from "./routes/auth.js";
import financeRouter from "./routes/finance.js";

const app = express();
const allowedOrigins = new Set([
  env.FRONTEND_URL,
  "http://localhost:4200",
  "http://localhost:4201",
]);
app.use(
  cors({
    origin: (origin, callback) => {
      const isLocalOrigin = origin
        ? /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)
        : true;
      if (!origin || allowedOrigins.has(origin) || isLocalOrigin)
        return callback(null, true);
      return callback(new Error("Origin not allowed by CORS"));
    },
  }),
);
app.use(express.json());
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/finance", financeRouter);

app.get("/health", (_request, response) => {
  response.json({ status: "ok", service: "financial-tracking-api" });
});

app.use((_request, response) => {
  response.status(404).json({ error: "Route not found" });
});

app.listen(env.PORT, () => {
  console.log(`API listening on port ${env.PORT}`);
});
