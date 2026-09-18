import rateLimit from "express-rate-limit";

function jsonRateLimitHandler(message) {
  return (_req, res, _next, options) => {
    res.status(options.statusCode).json({ error: message });
  };
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
