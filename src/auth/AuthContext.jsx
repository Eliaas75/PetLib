import React, { createContext, useContext, useEffect, useState } from "react";
import { api } from "../lib/api.js";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    const r = await api("/api/auth/me");
    setUser(r.user);
  }

  async function login(email, password) {
    const r = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setUser(r.user);
  }

  async function register(payload) {
    const r = await api("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    setUser(r.user);
  }

  async function logout() {
    await api("/api/auth/logout", { method: "POST" });
    setUser(null);
  }

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, []);

  return (
    <AuthCtx.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
