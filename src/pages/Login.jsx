import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Card from "../components/Card.jsx";
import Input from "../components/Input.jsx";
import Button from "../components/Button.jsx";
import { useAuth } from "../auth/AuthContext.jsx";

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");

  async function submit(e) {
    e.preventDefault();
    setErr("");
    try {
      await login(email, password);
      nav("/");
    } catch (e) {
      setErr(e.message);
    }
  }

  return (
    <div className="max-w-[520px] mx-auto px-6 py-10">
      <Card className="p-6">
        <div className="text-2xl font-semibold">Connexion</div>
        <div className="text-sm text-muted mt-1">Accède à tes RDV et dossiers animaux.</div>

        <form className="mt-6 space-y-3" onSubmit={submit}>
          <Input label="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input label="Mot de passe" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />

          {err ? <div className="text-sm text-red-600">{err}</div> : null}

          <Button className="w-full h-12">Se connecter</Button>
        </form>

        <div className="mt-4 text-sm text-muted">
          Pas de compte ? <Link className="text-brand font-medium" to="/register">Créer un compte</Link>
        </div>
      </Card>
    </div>
  );
}
