import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Card from "../components/Card.jsx";
import Input from "../components/Input.jsx";
import Select from "../components/Select.jsx";
import Button from "../components/Button.jsx";
import { useAuth } from "../auth/AuthContext.jsx";

export default function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("owner");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");

  async function submit(e) {
    e.preventDefault();
    setErr("");
    try {
      const createdUser = await register({ fullName, email, role, password });
      nav(createdUser?.role === "practitioner" ? "/pro" : "/");
    } catch (e) {
      setErr(e.message);
    }
  }

  return (
    <div className="max-w-[520px] mx-auto px-6 py-10">
      <Card className="p-6">
        <div className="text-2xl font-semibold">Créer un compte</div>
        <div className="text-sm text-muted mt-1">Propriétaire ou praticien.</div>

        <form className="mt-6 space-y-3" onSubmit={submit}>
          <Input label="Nom complet" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          <Input label="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Select label="Type de compte" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="owner">Propriétaire</option>
            <option value="practitioner">Praticien</option>
          </Select>
          {role === "practitioner" ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              Le compte professionnel sera créé immédiatement, mais le profil restera non vérifié jusqu’au contrôle PetLib.
            </div>
          ) : null}
          <Input label="Mot de passe (8+)" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />

          {err ? <div className="text-sm text-red-600">{err}</div> : null}

          <Button className="w-full h-12">Créer mon compte</Button>
        </form>

        <div className="mt-4 text-sm text-muted">
          Déjà un compte ? <Link className="text-brand font-medium" to="/login">Se connecter</Link>
        </div>
      </Card>
    </div>
  );
}
