"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Zap, CalendarDays, TrendingUp, ArrowRight, Link2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.6 },
  }),
};

const features = [
  {
    icon: Zap,
    title: "Automate",
    desc: "Comment triggers → instant DMs. Capture leads while you sleep.",
  },
  {
    icon: CalendarDays,
    title: "Schedule",
    desc: "Plan posts and reels with a visual calendar. Stay consistent effortlessly.",
  },
  {
    icon: TrendingUp,
    title: "Track",
    desc: "Streaks, goals, and insights that keep your growth on track.",
  },
];

export default function LandingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loggedIn, setLoggedIn] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setLoggedIn(true);
        setUserName(user.user_metadata?.full_name ?? user.email ?? null);
      }
    });
  }, [supabase]);

  return (
    <main className="relative flex flex-col min-h-screen overflow-hidden bg-background">
      {/* Background radial glow */}
      <div aria-hidden className="pointer-events-none fixed inset-0 flex items-start justify-center">
        <div className="mt-[-10vh] h-[60vh] w-[60vw] rounded-full bg-primary/8 blur-[140px]" />
      </div>

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-2 md:px-12 bg-black">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="FLOX" style={{ height: "56px", width: "auto", objectFit: "contain", mixBlendMode: "screen", transform: "scale(1.6)", transformOrigin: "left center" }} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="flex items-center gap-3"
        >
          {loggedIn ? (
            <>
              <span className="text-sm text-white/60 hidden sm:block">
                {userName}
              </span>
              <Link
                href="/dashboard"
                className="text-sm text-white/80 hover:text-white transition-colors"
              >
                Dashboard →
              </Link>
            </>
          ) : (
            <Link
              href="/login"
              className="text-sm text-white/60 hover:text-white transition-colors"
            >
              Log in
            </Link>
          )}
        </motion.div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 pt-12 pb-24 text-center">
        {/* Badge */}
        <motion.div
          custom={0}
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="mb-8 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs text-primary"
        >
          <Link2 className="h-3 w-3" />
          Instagram growth, simplified
        </motion.div>

        {/* Headline */}
        <motion.h1
          custom={1}
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="max-w-2xl text-5xl font-bold leading-[1.1] tracking-tight md:text-6xl lg:text-7xl"
        >
          Stay consistent.{" "}
          <span className="text-gradient">Capture leads.</span>{" "}
          Automate growth.
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          custom={2}
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="mt-6 max-w-md text-base text-muted-foreground md:text-lg"
        >
          FLOX is the lightweight operating system for Instagram creators and
          businesses who want to grow without the chaos.
        </motion.p>

        {/* CTAs */}
        <motion.div
          custom={3}
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="mt-10 flex flex-col items-center gap-3 sm:flex-row"
        >
          {loggedIn ? (
            <Link
              href="/dashboard"
              className="group inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 hover:shadow-[0_0_24px_rgba(59,130,246,0.4)] active:scale-[0.98]"
            >
              Go to Dashboard
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          ) : (
            <>
              <Link
                href="/signup"
                className="group inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 hover:shadow-[0_0_24px_rgba(59,130,246,0.4)] active:scale-[0.98]"
              >
                Get started free
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-6 py-3 text-sm font-medium transition-all hover:bg-secondary hover:border-primary/25 active:scale-[0.98]"
              >
                Log in
              </Link>
            </>
          )}
        </motion.div>

        {/* Feature cards */}
        <motion.div
          custom={4}
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="mt-20 grid grid-cols-1 gap-3 sm:grid-cols-3 max-w-3xl w-full"
        >
          {features.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="group relative flex flex-col gap-3 rounded-2xl border border-border bg-card p-6 text-left transition-all hover:border-primary/25 hover:bg-card/60"
            >
              <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold">{title}</p>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  {desc}
                </p>
              </div>
            </div>
          ))}
        </motion.div>
      </section>

      {/* Footer */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.4 }}
        className="relative z-10 flex items-center justify-center gap-1 pb-8 text-xs text-muted-foreground"
      >
        Built by <span className="text-foreground font-medium">CodeMode</span>
        <span className="mx-2">·</span>
        <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
        <span className="mx-2">·</span>
        <Link href="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
      </motion.footer>
    </main>
  );
}
