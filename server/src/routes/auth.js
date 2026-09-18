import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import config from "../config.js";
import { loginLimiter, registerLimiter } from "../middleware/security.js";
import { User } from "../models/User.js";

const router = express.Router();
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.use((_req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: config.cookie.sameSite,
    secure: config.cookie.secure,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  };
}

function publicUser(user) {
  return {
    id: user._id,
    email: user.email,
    fullName: user.fullName,
    phone: user.phone,
    role: user.role,
    notificationPreferences: user.notificationPreferences,
  };
}

function signToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), email: user.email, role: user.role },
    config.jwtSecret,
    { expiresIn: "7d" }
  );
}

router.post("/register", registerLimiter, async (req, res) => {
  try {
    const { email, password, fullName, role } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: "Email et mot de passe requis" });

    const normalizedEmail = String(email).trim().toLowerCase();
    if (normalizedEmail.length > 254 || !emailPattern.test(normalizedEmail)) {
      return res.status(400).json({ error: "Adresse email invalide" });
    }

    const passwordValue = String(password);
    if (passwordValue.length < 8 || passwordValue.length > 128) {
      return res.status(400).json({ error: "Le mot de passe doit contenir entre 8 et 128 caractères" });
    }

    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) return res.status(409).json({ error: "Cet email est déjà utilisé" });

    const allowedPublicRoles = ["owner", "practitioner"];
    const safeRole = allowedPublicRoles.includes(role) ? role : "owner";
    const passwordHash = await bcrypt.hash(passwordValue, 12);

    const user = await User.create({
      email: normalizedEmail,
      passwordHash,
      fullName: String(fullName || "").trim().slice(0, 120),
      role: safeRole,
    });

    res.cookie("token", signToken(user), cookieOptions());
    return res.status(201).json({ ok: true, user: publicUser(user) });
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ error: "Cet email est déjà utilisé" });
    console.error("register_error", { name: error?.name, message: error?.message });
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

router.post("/login", loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: "Email et mot de passe requis" });

    const normalizedEmail = String(email).trim().toLowerCase();
    const passwordValue = String(password);
    if (normalizedEmail.length > 254 || passwordValue.length > 128) {
      return res.status(401).json({ error: "Identifiants invalides" });
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) return res.status(401).json({ error: "Identifiants invalides" });

    const valid = await bcrypt.compare(passwordValue, user.passwordHash);
    if (!valid) return res.status(401).json({ error: "Identifiants invalides" });

    res.cookie("token", signToken(user), cookieOptions());
    return res.json({ ok: true, user: publicUser(user) });
  } catch (error) {
    console.error("login_error", { name: error?.name, message: error?.message });
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

router.post("/logout", (_req, res) => {
  res.clearCookie("token", { ...cookieOptions(), maxAge: 0 });
  return res.json({ ok: true });
});

router.get("/me", async (req, res) => {
  const token = req.cookies?.token;
  if (!token) return res.json({ user: null });

  try {
    const payload = jwt.verify(token, config.jwtSecret);
    const user = await User.findById(payload.sub);
    return res.json({ user: user ? publicUser(user) : null });
  } catch {
    return res.json({ user: null });
  }
});

export default router;
