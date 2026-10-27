"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [aceito, setAceito] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "signup" && password.length < 8) {
      setError("A senha precisa ter no mínimo 8 caracteres. Você digitou " + password.length + ".");
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);
    const supabase = createClient();

    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      router.push("/");
      router.refresh();
      return;
    }

    const { error, data } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setLoading(false);
    if (error) {
      setError(
        (error as { code?: string }).code === "weak_password"
          ? "Essa senha é muito comum ou já apareceu em vazamentos. Escolha outra, com pelo menos 8 caracteres."
          : error.message
      );
      return;
    }
    if (data.session) {
      router.push("/");
      router.refresh();
      return;
    }
    setMessage("Conta criada. Confira seu e-mail para confirmar o acesso antes de entrar.");
  }

  async function handleForgotPassword() {
    if (!email) {
      setError("Preencha o e-mail acima antes de clicar em \"Esqueci minha senha\".");
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setMessage("Enviamos um e-mail com um link para redefinir sua senha.");
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-brand">FARO</div>
        <p className="auth-sub">Foco, Ação, Rotina e Objetivos</p>
        <div className="auth-tabs">
          <button
            type="button"
            className={mode === "signin" ? "active" : ""}
            onClick={() => setMode("signin")}
          >
            Entrar
          </button>
          <button
            type="button"
            className={mode === "signup" ? "active" : ""}
            onClick={() => setMode("signup")}
          >
            Criar conta
          </button>
        </div>
        <form onSubmit={handleSubmit} className="auth-form">
          <label>
            E-mail
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </label>
          <label>
            Senha
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
            />
            {mode === "signup" && (
              <span className={"auth-dica" + (password.length > 0 && password.length < 8 ? " alerta" : "")}>
                Mínimo de 8 caracteres{password.length > 0 ? ` (${password.length} até agora)` : ""}.
              </span>
            )}
          </label>
          {mode === "signup" && (
            <label className="auth-consent">
              <input type="checkbox" required checked={aceito} onChange={(e) => setAceito(e.target.checked)} />
              <span>
                Li e aceito os{" "}
                <a href="/termos" target="_blank" rel="noreferrer">
                  Termos de uso
                </a>{" "}
                e a{" "}
                <a href="/privacidade" target="_blank" rel="noreferrer">
                  Política de privacidade
                </a>
                , inclusive o tratamento dos dados de saúde que eu registrar (humor, sono, dieta etc.).
              </span>
            </label>
          )}
          {error && <div className="auth-error">{error}</div>}
          {message && <div className="auth-message">{message}</div>}
          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? "Aguarde…" : mode === "signin" ? "Entrar" : "Criar conta"}
          </button>
          {mode === "signin" && (
            <button type="button" className="auth-forgot" onClick={handleForgotPassword} disabled={loading}>
              Esqueci minha senha
            </button>
          )}
        </form>
        <p className="auth-legal">
          <a href="/termos">Termos de uso</a> · <a href="/privacidade">Política de privacidade</a>
        </p>
      </div>
    </div>
  );
}
