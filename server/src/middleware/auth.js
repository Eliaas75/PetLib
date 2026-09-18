import jwt from "jsonwebtoken";
import config from "../config.js";

function getToken(req) {
  const cookieToken = req.cookies?.token;
  if (cookieToken) return cookieToken;

  const header = req.get("authorization") || "";
  if (header.startsWith("Bearer ")) return header.slice(7).trim();

  return null;
}

export function requireAuth(req, res, next) {
  const token = getToken(req);
  if (!token) return res.status(401).json({ error: "Authentification requise" });

  try {
    const payload = jwt.verify(token, config.jwtSecret);
    req.auth = {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
    };
    return next();
  } catch {
    return res.status(401).json({ error: "Session invalide ou expirée" });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.auth) return res.status(401).json({ error: "Authentification requise" });
    if (!roles.includes(req.auth.role)) return res.status(403).json({ error: "Accès refusé" });
    return next();
  };
}
