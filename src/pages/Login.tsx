import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

type Tab = "login" | "signup";

export function Login() {
  const { user, loading } = useAuth();
  const [tab, setTab] = useState<Tab>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);

  if (loading) return null;
  if (user) return <Navigate to="/" replace />;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);

    if (tab === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) {
        setError(error.message);
      } else {
        setSignupSuccess(true);
      }
    }
    setPending(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="glass-card p-8 w-full max-w-md animate-fade-in-up">
        <h1 className="text-2xl font-extrabold text-foreground mb-1 text-center">
          <span className="text-primary">●</span> AI Engineering Learning Studio
        </h1>
        <p className="text-secondary-custom text-sm text-center mb-6">
          {tab === "login" ? "Sign in to your account" : "Create a new account"}
        </p>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 p-1 rounded-lg" style={{ background: "rgba(255,255,255,0.04)" }}>
          <button
            className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${
              tab === "login"
                ? "bg-primary/20 text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => { setTab("login"); setError(null); setSignupSuccess(false); }}
          >
            Sign In
          </button>
          <button
            className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${
              tab === "signup"
                ? "bg-primary/20 text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => { setTab("signup"); setError(null); setSignupSuccess(false); }}
          >
            Sign Up
          </button>
        </div>

        {signupSuccess ? (
          <div className="p-4 rounded-lg text-sm text-accent" style={{ background: "rgba(34,211,160,0.1)" }}>
            Check your email to confirm your account, then sign in.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="form-label" htmlFor="email">Email</label>
              <input
                id="email"
                className="form-input"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="form-label" htmlFor="password">Password</label>
              <input
                id="password"
                className="form-input"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            {error && (
              <div className="p-3 rounded-lg text-sm text-destructive" style={{ background: "rgba(244,63,94,0.1)" }}>
                {error}
              </div>
            )}

            <button type="submit" className="btn-primary w-full" disabled={pending}>
              {pending ? "Please wait…" : tab === "login" ? "Sign In" : "Sign Up"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
