import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
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
import proRoutes from "./routes/pro.js";
import { startWaitlistSweeper } from "./services/waitlist.js";

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
app.use("/api/clinics", clinicRoutes);
app.use("/api/practitioners", practitionerRoutes);
app.use("/api/availability", availabilityRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/waitlist", waitlistRoutes);
app.use("/api/pro/availability", proAvailabilityRoutes);
app.use("/api/pro/settings", proSettingsRoutes);
app.use("/api/pro", proRoutes);

app.use((_req, res) => {
  res.status(404).json({ error: "Route introuvable" });
});

app.use((err, _req, res, _next) => {
  console.error("unhandled_error", err);
  res.status(500).json({ error: "Erreur serveur" });
});

await connectDB(process.env.MONGO_URI);
startWaitlistSweeper();
app.listen(port, () => console.log(`PetLib API listening on port ${port}`));
