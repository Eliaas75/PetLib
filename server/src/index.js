import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { connectDB } from "./db.js";
import authRoutes from "./routes/auth.js";
import petRoutes from "./routes/pets.js";

const app = express();
const port = Number(process.env.PORT || 4000);
const allowedOrigins = String(process.env.CLIENT_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("Origin not allowed by CORS"));
    },
    credentials: true,
  })
);

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "petlib-api", environment: process.env.NODE_ENV || "development" });
});

app.use("/api/auth", authRoutes);
app.use("/api/pets", petRoutes);

app.use((_req, res) => {
  res.status(404).json({ error: "Route introuvable" });
});

app.use((err, _req, res, _next) => {
  console.error("unhandled_error", err);
  res.status(500).json({ error: "Erreur serveur" });
});

await connectDB(process.env.MONGO_URI);
app.listen(port, () => console.log(`PetLib API listening on port ${port}`));
