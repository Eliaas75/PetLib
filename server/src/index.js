import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import config, { validateConfig } from "./config.js";
import { connectDB } from "./db.js";
import authRoutes from "./routes/auth.js";
import petRoutes from "./routes/pets.js";
import clinicRoutes from "./routes/clinics.js";
import practitionerRoutes from "./routes/practitioners.js";
import availabilityRoutes from "./routes/availability.js";
import searchRoutes from "./routes/search.js";
import appointmentRoutes from "./routes/appointments.js";
import waitlistRoutes from "./routes/waitlist.js";
import proAvailabilityRoutes from "./routes/proAvailability.js";
import proSettingsRoutes from "./routes/proSettings.js";
import proStatsRoutes from "./routes/proStats.js";
import proAppointmentRoutes from "./routes/proAppointments.js";
import proTeamRoutes from "./routes/proTeam.js";
import proRoutes from "./routes/pro.js";
import { startWaitlistSweeper } from "./services/waitlist.js";
import { requireTrustedOrigin } from "./middleware/security.js";

validateConfig();

const app = express();

if (config.trustProxy !== false) {
  app.set("trust proxy", config.trustProxy);
}

app.disable("x-powered-by");
app.use(
  helmet({
    strictTransportSecurity: config.isProduction
      ? { maxAge: 31536000, includeSubDomains: true }
      : false,
  })
);
app.use(express.json({ limit: "256kb" }));
app.use(cookieParser());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || config.clientOrigins.includes(origin)) return callback(null, true);
      const error = new Error("Origin not allowed by CORS");
      error.code = "CORS_ORIGIN_DENIED";
      return callback(error);
    },
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(requireTrustedOrigin);

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "petlib-api" });
});

app.use("/api/auth", authRoutes);
app.use("/api/pets", petRoutes);
app.use("/api/clinics", clinicRoutes);
app.use("/api/practitioners", practitionerRoutes);
app.use("/api/availability", availabilityRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/waitlist", waitlistRoutes);
app.use("/api/pro/availability", proAvailabilityRoutes);
app.use("/api/pro/settings", proSettingsRoutes);
app.use("/api/pro/stats", proStatsRoutes);
app.use("/api/pro/appointments", proAppointmentRoutes);
app.use("/api/pro/team", proTeamRoutes);
app.use("/api/pro", proRoutes);

app.use((_req, res) => {
  res.status(404).json({ error: "Route introuvable" });
});

app.use((err, _req, res, _next) => {
  if (err?.code === "CORS_ORIGIN_DENIED") {
    return res.status(403).json({ error: "Origine non autorisée" });
  }
  if (err?.type === "entity.too.large") {
    return res.status(413).json({ error: "Requête trop volumineuse" });
  }

  console.error("unhandled_error", {
    name: err?.name,
    message: err?.message,
    stack: config.isProduction ? undefined : err?.stack,
  });
  return res.status(500).json({ error: "Erreur serveur" });
});

await connectDB(config.mongoUri);
startWaitlistSweeper();
app.listen(config.port, () => console.log(`PetLib API listening on port ${config.port}`));
