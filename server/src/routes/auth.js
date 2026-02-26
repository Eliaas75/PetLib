import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../models/User.js";

const router = express.Router();

function setAuthCookie(res, token) {
  res.cookie("token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: false, // mettre true en prod (HTTPS)
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

router.post("/register", async (req, res) => {
  const { email, password, fullName, role } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "email/password required" });
  if (String(password).length < 8) return res.status(400).json({ error: "password must be 8+ chars" });

  const existing = await User.findOne({ email: String(email).toLowerCase() });
  if (existing) return res.status(409).json({ error: "Email already used" });

  const passwordHash = await bcrypt.hash(String(password), 12);
  const user = await User.create({
    email,
    passwordHash,
    fullName: fullName || "",
    role: role || "owner",
  });

  const token = jwt.sign(
    { sub: user._id.toString(), email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  setAuthCookie(res, token);

  return res.json({
    ok: true,
    user: { id: user._id, email: user.email, fullName: user.fullName, role: user.role },
  });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "email/password required" });

  const user = await User.findOne({ email: String(email).toLowerCase() });
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const ok = await bcrypt.compare(String(password), user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });

  const token = jwt.sign(
    { sub: user._id.toString(), email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  setAuthCookie(res, token);

  return res.json({
    ok: true,
    user: { id: user._id, email: user.email, fullName: user.fullName, role: user.role },
  });
});

router.post("/logout", async (_req, res) => {
  res.clearCookie("token", { httpOnly: true, sameSite: "lax", secure: false });
  return res.json({ ok: true });
});

router.get("/me", async (req, res) => {
  const token = req.cookies?.token;
  if (!token) return res.json({ user: null });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.sub).select("email fullName role");
    return res.json({ user });
  } catch {
    return res.json({ user: null });
  }
});

export default router;
