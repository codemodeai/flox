"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Eye, EyeOff, Zap, ArrowRight, Loader2 } from "lucide-react";

type Mode = "signin" | "signup";

export default function LoginPage() {
  const router   = useRouter();
  const supabase = createClient();

  const [mode,     setMode]     = useState<Mode>("signin");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [name,     setName]     = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [success,  setSuccess]  = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setSuccess(""); setLoading(true);

    if (mode === "signup") {
      const { error: err } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name } },
      });
      if (err) { setError(err.message); setLoading(false); return; }
      setSuccess("Account created! Check your email to confirm, then sign in.");
      setMode("signin");
    } else {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) { setError(err.message); setLoading(false); return; }
      router.push("/dashboard");
      router.refresh();
    }
    setLoading(false);
  }

  async function handleGoogle() {
    setError(""); setLoading(true);
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (err) { setError(err.message); setLoading(false); }
  }

  function switchMode(m: Mode) {
    setMode(m); setError(""); setSuccess("");
  }

  return (
    <div className="min-h-screen flex bg-background">

      {/* ── Left branding panel ── */}
      <div className="hidden lg:flex lg:w-[55%] flex-col justify-between bg-black p-14 relative overflow-hidden">
        <div className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-blue-600/15 blur-3xl pointer-events-none"/>
        <div className="absolute -bottom-40 -right-20 h-[400px] w-[400px] rounded-full bg-blue-500/10 blur-3xl pointer-events-none"/>

        {/* Logo */}
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="FLOX" className="w-auto object-contain"
            style={{ height: 56, mixBlendMode: "screen", transform: "scale(1.8)", transformOrigin: "left center" }}/>
        </div>

        {/* Headline */}
        <div className="space-y-6 max-w-lg">
          <div className="flex items-center gap-2 w-fit rounded-full bg-blue-500/15 border border-blue-500/25 px-3 py-1.5">
            <Zap className="h-3.5 w-3.5 text-blue-400"/>
            <span className="text-xs font-semibold text-blue-300">Instagram Growth OS</span>
          </div>
          <h1 className="text-5xl font-black text-white leading-[1.1]">
            Stay consistent.<br/>
            Capture leads.<br/>
            <span className="text-blue-400">Automate growth.</span>
          </h1>
          <p className="text-base text-white/40 leading-relaxed">
            FLOX is your all-in-one command center — roadmap, routines, automations, leads, and analytics in one clean workspace.
          </p>
        </div>

        {/* Feature pills */}
        <div className="flex flex-wrap gap-2">
          {["Automation","Lead CRM","Content Scheduler","Roadmap","Analytics","Routine Tracker","Calendar","Tasks"].map(f => (
            <span key={f} className="rounded-full bg-white/6 border border-white/10 px-3 py-1 text-xs text-white/40">
              {f}
            </span>
          ))}
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-10 lg:hidden">
            <div className="h-9 w-9 rounded-xl bg-blue-500 flex items-center justify-center">
              <Zap className="h-4.5 w-4.5 text-white"/>
            </div>
            <span className="text-xl font-black tracking-tight">FLOX</span>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold tracking-tight">
              {mode === "signin" ? "Welcome back" : "Create account"}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {mode === "signin"
                ? "Sign in to your FLOX workspace"
                : "Start building your Instagram OS — it's free"}
            </p>
          </div>

          {/* Mode tabs */}
          <div className="flex gap-1 rounded-xl border border-border bg-secondary p-1 mb-6">
            {(["signin","signup"] as Mode[]).map(m => (
              <button key={m} onClick={() => switchMode(m)}
                className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-all
                  ${mode === m ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                {m === "signin" ? "Sign in" : "Sign up"}
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Full name</label>
                <input
                  type="text" value={name} onChange={e => setName(e.target.value)}
                  placeholder="John Doe" required
                  className="w-full rounded-xl border border-border bg-secondary/50 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-muted-foreground/40"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Email</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com" required
                className="w-full rounded-xl border border-border bg-secondary/50 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-muted-foreground/40"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Password</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"} value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Min. 6 characters" required minLength={6}
                  className="w-full rounded-xl border border-border bg-secondary/50 px-4 py-2.5 pr-11 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-muted-foreground/40"
                />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showPw ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 px-4 py-2.5 text-xs text-rose-600 font-medium">
                {error}
              </div>
            )}
            {success && (
              <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-2.5 text-xs text-emerald-600 font-medium">
                {success}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-500 py-2.5 text-sm font-semibold text-white hover:bg-blue-400 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all mt-2">
              {loading
                ? <Loader2 className="h-4 w-4 animate-spin"/>
                : <>{mode === "signin" ? "Sign in" : "Create account"}<ArrowRight className="h-4 w-4"/></>
              }
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-border"/>
            <span className="text-[11px] font-medium text-muted-foreground/60">or continue with</span>
            <div className="flex-1 h-px bg-border"/>
          </div>

          {/* Google */}
          <button onClick={handleGoogle} disabled={loading}
            className="w-full flex items-center justify-center gap-2.5 rounded-xl border border-border bg-card py-2.5 text-sm font-medium hover:bg-secondary/60 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all">
            <svg className="h-4 w-4 flex-shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Google
          </button>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            By continuing you agree to our{" "}
            <span className="text-foreground font-medium cursor-pointer hover:text-blue-600 transition-colors">Terms</span>
            {" "}and{" "}
            <span className="text-foreground font-medium cursor-pointer hover:text-blue-600 transition-colors">Privacy Policy</span>.
          </p>
        </div>
      </div>
    </div>
  );
}
