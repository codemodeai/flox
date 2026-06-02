"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useState } from "react";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    // TODO: wire Supabase auth
    setTimeout(() => setLoading(false), 1000);
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-background px-4">
      {/* Glow */}
      <div aria-hidden className="pointer-events-none fixed inset-0 flex items-center justify-center">
        <div className="h-[50vh] w-[50vw] rounded-full bg-primary/6 blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-sm"
      >
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-2">
          <Link href="/" className="flex items-center justify-center bg-black rounded-2xl px-4 py-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="FLOX" style={{ height: "70px", width: "auto", mixBlendMode: "screen" }} />
          </Link>
          <p className="text-sm text-muted-foreground">Create your free account</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border bg-card p-8">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="name">
                Name
              </label>
              <input
                id="name"
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="h-10 w-full rounded-lg border border-border bg-input px-3 text-sm placeholder:text-muted-foreground/50 outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-10 w-full rounded-lg border border-border bg-input px-3 text-sm placeholder:text-muted-foreground/50 outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                placeholder="Min. 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                required
                className="h-10 w-full rounded-lg border border-border bg-input px-3 text-sm placeholder:text-muted-foreground/50 outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 h-10 w-full rounded-xl bg-primary text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 hover:shadow-[0_0_20px_rgba(139,92,246,0.3)] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? "Creating account…" : "Get started free"}
            </button>
          </form>

          <p className="mt-5 text-center text-xs text-muted-foreground">
            By signing up you agree to our{" "}
            <Link href="/terms" className="text-primary/80 hover:text-primary transition-colors">
              Terms
            </Link>{" "}
            &{" "}
            <Link href="/privacy" className="text-primary/80 hover:text-primary transition-colors">
              Privacy
            </Link>
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="text-primary hover:text-primary/80 transition-colors font-medium">
            Log in
          </Link>
        </p>
      </motion.div>
    </main>
  );
}
