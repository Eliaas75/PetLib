import rateLimit from "express-rate-limit";
import config from "../config.js";

const safeMethods = new Set(["GET", "HEAD", "OPTIONS"]);

function jsonRateLimitHandler(message) {
  return (_req, res, _next, options) => {
    res.status(options.statusCode).json({ error: message });
  };
}

function requestOrigin(req) {
  const origin = req.get("origin");
  if (origin) return origin;

  const referer = req.get("referer");
  if (!referer) return "";

  try {
    return new URL(referer).origin;
  } catch {
    return "";
  }
}

export function requireTrustedOrigin(req, res, next) {
  if (safeMethods.has(req.method)) return next();

  const authorization = req.get("authorization") || "";
  if (authorization.startsWith("Bearer ")) return next();

  const origin = requestOrigin(req);
  if (!origin) {
    if (!config.isProduction) return next();
    return res.status(403).json({ error: "Origine de la requête requise" });
  }

  if (!config.clientOrigins.includes(origin)) {
    return res.status(403).json({ error: "Origine de la requête non autorisée" });
  }

  return next();
}

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: jsonRateLimitHandler("Trop de tentatives de connexion. Réessaie dans quelques minutes."),
});

export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: jsonRateLimitHandler("Trop de créations de compte depuis cette adresse. Réessaie plus tard."),
});
