import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../models/User.js";

const router = express.Router();

function cookieOptions() {
  const isProd = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    sameSite: isProd ? "none" : "lax",
    secure: isProd,
    maxAge: 7 * 24 * 60 * 60 * 1000,
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
  if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is required");
  return jwt.sign(
    { sub: user._id.toString(), email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

router.post("/register", async (req, res) => {
  try {
    const { email, password, fullName, role } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: "Email et mot de passe requis" });
    if (String(password).length < 8) return res.status(400).json({ error: "Le mot de passe doit contenir au moins 8 caractères" });

    const normalizedEmail = String(email).trim().toLowerCase();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) return res.status(409).json({ error: "Cet email est déjà utilisé" });

    const allowedPublicRoles = ["owner", "practitioner"];
    const safeRole = allowedPublicRoles.includes(role) ? role : "owner";
    const passwordHash = await bcrypt.hash(String(password), 12);

    const user = await User.create({
      email: normalizedEmail,
      passwordHash,
      fullName: fullName || "",
      role: safeRole,
    });

    res.cookie("token", signToken(user), cookieOptions());
    return res.status(201).json({ ok: true, user: publicUser(user) });
  } catch (error) {
    console.error("register_error", error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: "Email et mot de passe requis" });

    const user = await User.findOne({ email: String(email).trim().toLowerCase() });
    if (!user) return res.status(401).json({ error: "Identifiants invalides" });

    const valid = await bcrypt.compare(String(password), user.passwordHash);
    if (!valid) return res.status(401).json({ error: "Identifiants invalides" });

    res.cookie("token", signToken(user), cookieOptions());
    return res.json({ ok: true, user: publicUser(user) });
  } catch (error) {
    console.error("login_error", error);
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
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.sub);
    return res.json({ user: user ? publicUser(user) : null });
  } catch {
    return res.json({ user: null });
  }
});

export default router;
