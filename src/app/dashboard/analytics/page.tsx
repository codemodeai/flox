"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Users, TrendingUp, Heart, MessageCircle, Eye, Zap,
  BarChart2, Download, CheckCircle2, Target, Camera,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.4 } }),
};

const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface FloxStats {
  leadsTotal:         number;
  leadsDelta:         number;
  automationsActive:  number;
  dmsSent:            number;
  tasksCompleted:     number;
  postsPublished:     number;
  postsScheduled:     number;
}

interface IGStats {
  connected:        boolean;
  username?:        string;
  followersCount?:  number;
  profilePic?:      string;
  impressionsDaily: number[];
  reachDaily:       number[];
  engagedDaily:     number[];
}

function daysAgoISO(n: number) {
  const d = new Date(); d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

export default function AnalyticsPage() {
  const supabase = createClient();
  const [userId,  setUserId]  = useState<string | null>(null);
  const [flox,    setFlox]    = useState<FloxStats | null>(null);
  const [ig,      setIg]      = useState<IGStats>({ connected: false, impressionsDaily: Array(7).fill(0), reachDaily: Array(7).fill(0), engagedDaily: Array(7).fill(0) });
  const [period,  setPeriod]  = useState<"7D" | "30D" | "90D">("7D");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => { if (data.user) setUserId(data.user.id); });
  }, []);

  // Load FLOX internal stats
  useEffect(() => {
    if (!userId) return;
    async function load() {
      setLoading(true);
      const days  = period === "7D" ? 7 : period === "30D" ? 30 : 90;
      const since = daysAgoISO(days);
      const prev  = daysAgoISO(days * 2);

      const [leadsAll, leadsRecent, autos, tasks, posts] = await Promise.all([
        supabase.from("leads").select("id, created_at").eq("user_id", userId!),
        supabase.from("leads").select("id, created_at").eq("user_id", userId!).gte("created_at", since),
        supabase.from("automations").select("status, triggered").eq("user_id", userId!),
        supabase.from("daily_tasks").select("done, completed_at").eq("user_id", userId!),
        supabase.from("scheduled_posts").select("status, scheduled_date").eq("user_id", userId!),
      ]);

      const leadsData   = leadsAll.data    ?? [];
      const recentLeads = leadsRecent.data ?? [];
      const autoData    = autos.data       ?? [];
      const taskData    = tasks.data       ?? [];
      const postData    = posts.data       ?? [];

      const prevCount = leadsData.filter(l => l.created_at >= prev && l.created_at < since).length;

      setFlox({
        leadsTotal:        leadsData.length,
        leadsDelta:        recentLeads.length - prevCount,
        automationsActive: autoData.filter(a => a.status === "Active").length,
        dmsSent:           autoData.reduce((s, a) => s + (a.triggered ?? 0), 0),
        tasksCompleted:    taskData.filter(t => t.done).length,
        postsPublished:    postData.filter(p => p.status === "Published").length,
        postsScheduled:    postData.filter(p => p.status === "Scheduled").length,
      });
      setLoading(false);
    }
    load();
  }, [userId, period]);

  // Load Instagram analytics
  useEffect(() => {
    if (!userId) return;
    fetch("/api/instagram/analytics")
      .then(r => r.json())
      .then((data: IGStats) => setIg(data))
      .catch(() => {});
  }, [userId]);

  const floxMax = flox
    ? Math.max(flox.leadsTotal, flox.dmsSent, flox.tasksCompleted, flox.postsPublished, 1)
    : 1;

  // For weekly bar chart: use IG impressions when connected, else placeholder
  const barA = ig.connected ? ig.impressionsDaily : Array(7).fill(0);
  const barB = ig.connected ? ig.reachDaily       : Array(7).fill(0);
  const barMax = Math.max(...barA, ...barB, 1);

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-6 py-4 flex-shrink-0">
        <div>
          <h1 className="text-lg font-semibold">Analytics</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {ig.connected ? `@${ig.username} · ${(ig.followersCount ?? 0).toLocaleString()} followers` : "Your FLOX activity at a glance"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {(["7D", "30D", "90D"] as const).map(r => (
            <button key={r} onClick={() => setPeriod(r)}
              className={`rounded-lg px-3 py-1 text-xs font-medium transition-all ${period === r ? "bg-primary text-white" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
              {r}
            </button>
          ))}
          <button className="flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors ml-1">
            <Download className="h-3.5 w-3.5"/> Export
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-5">

        {/* ── Row 1: Stat cards ── */}
        <div className="grid grid-cols-6 gap-3">
          {/* Instagram stats — first 3 cards */}
          {[
            {
              label: "Followers", icon: Users,
              value: ig.connected ? ig.followersCount : null,
              ig: true,
            },
            {
              label: "Reach (7D)", icon: Eye,
              value: ig.connected ? ig.reachDaily.reduce((s, v) => s + v, 0) : null,
              ig: true,
            },
            {
              label: "Impressions (7D)", icon: TrendingUp,
              value: ig.connected ? ig.impressionsDaily.reduce((s, v) => s + v, 0) : null,
              ig: true,
            },
            // FLOX internal stats
            {
              label: "Total Leads",  icon: Zap,
              value: flox?.leadsTotal ?? null,
              delta: flox ? (flox.leadsDelta > 0 ? `+${flox.leadsDelta}` : flox.leadsDelta < 0 ? `${flox.leadsDelta}` : null) : null,
              ig: false,
            },
            {
              label: "DMs Sent", icon: MessageCircle,
              value: flox?.dmsSent ?? null,
              ig: false,
            },
            {
              label: "Tasks Done", icon: CheckCircle2,
              value: flox?.tasksCompleted ?? null,
              ig: false,
            },
          ].map(({ label, icon: Icon, value, ig: isIg, delta }, i) => (
            <motion.div key={label} custom={i} initial="hidden" animate="visible" variants={fadeUp}
              className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4"
            >
              <div className="flex items-center justify-between">
                <div className={`h-8 w-8 rounded-xl flex items-center justify-center ${isIg ? "bg-gradient-to-br from-purple-500/20 to-rose-500/20" : "bg-secondary"}`}>
                  <Icon className={`h-4 w-4 ${isIg ? "text-rose-500" : "text-muted-foreground"}`}/>
                </div>
                {delta && (
                  <span className={`text-[10px] font-medium ${delta.startsWith("+") ? "text-emerald-600" : "text-rose-500"}`}>{delta}</span>
                )}
              </div>
              <div>
                {value !== null && !loading ? (
                  <p className="text-2xl font-bold">{value?.toLocaleString()}</p>
                ) : (
                  <div className="h-7 w-16 rounded-lg bg-secondary animate-pulse"/>
                )}
                <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* ── Row 2: Chart + breakdown ── */}
        <div className="grid grid-cols-12 gap-4">

          {/* Bar chart */}
          <motion.div custom={7} initial="hidden" animate="visible" variants={fadeUp}
            className="col-span-8 rounded-2xl border border-border bg-card p-5 flex flex-col gap-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">{ig.connected ? "Reach & Impressions" : "Weekly Activity"}</p>
                <p className="text-xs text-muted-foreground">
                  {ig.connected ? "Daily breakdown — last 7 days from Instagram" : "Leads captured & tasks completed — last 7 days"}
                </p>
              </div>
              <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-blue-500 inline-block"/>{ig.connected ? "Reach" : "Leads"}</span>
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-violet-500 inline-block"/>{ig.connected ? "Impressions" : "Tasks done"}</span>
              </div>
            </div>
            <div className="flex items-end gap-3 h-40">
              {WEEK_DAYS.map((day, i) => (
                <div key={day} className="flex flex-1 flex-col items-center gap-1.5">
                  <div className="relative w-full flex items-end justify-center gap-1" style={{ height: "120px" }}>
                    <div className="w-5 rounded-t-lg bg-blue-500/80 transition-all duration-500"
                      style={{ height: `${Math.max(4, (barA[i] / barMax) * 120)}px` }}/>
                    <div className="w-5 rounded-t-lg bg-violet-500/80 transition-all duration-500"
                      style={{ height: `${Math.max(4, (barB[i] / barMax) * 120)}px` }}/>
                  </div>
                  <span className="text-[10px] text-muted-foreground/70">{day}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Summary */}
          <motion.div custom={8} initial="hidden" animate="visible" variants={fadeUp}
            className="col-span-4 rounded-2xl border border-border bg-card p-5 flex flex-col gap-4"
          >
            <p className="text-sm font-semibold">Summary</p>
            {flox ? (
              <div className="flex flex-col gap-3">
                {[
                  { label: "Leads captured", value: flox.leadsTotal,       color: "bg-blue-500"    },
                  { label: "DMs sent",        value: flox.dmsSent,         color: "bg-violet-500"  },
                  { label: "Tasks completed", value: flox.tasksCompleted,  color: "bg-emerald-500" },
                  { label: "Posts published", value: flox.postsPublished,  color: "bg-amber-500"   },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground">{label}</span>
                      <span className="text-[11px] font-semibold">{value}</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                      <div className={`h-full rounded-full ${color} transition-all duration-700`}
                        style={{ width: `${Math.min(100, (value / floxMax) * 100)}%` }}/>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {[1,2,3,4].map(i => (
                  <div key={i} className="flex flex-col gap-1 animate-pulse">
                    <div className="h-3 w-24 rounded bg-secondary"/>
                    <div className="h-1.5 w-full rounded-full bg-secondary"/>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>

        {/* ── Row 3: Top posts / Content pipeline ── */}
        <motion.div custom={9} initial="hidden" animate="visible" variants={fadeUp}
          className="rounded-2xl border border-border bg-card p-5 flex flex-col gap-4"
        >
          <div>
            <p className="text-sm font-semibold">Content Pipeline</p>
            <p className="text-xs text-muted-foreground">Posts across all statuses from your scheduler</p>
          </div>
          {flox && (flox.postsPublished + flox.postsScheduled > 0) ? (
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-emerald-500"/>
                <span className="text-sm font-semibold">{flox.postsPublished}</span>
                <span className="text-xs text-muted-foreground">Published</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-blue-500"/>
                <span className="text-sm font-semibold">{flox.postsScheduled}</span>
                <span className="text-xs text-muted-foreground">Scheduled</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <div className="h-12 w-12 rounded-2xl bg-secondary flex items-center justify-center">
                <BarChart2 className="h-6 w-6 text-muted-foreground/40"/>
              </div>
              <p className="text-sm font-medium text-muted-foreground">No posts yet</p>
              <p className="text-xs text-muted-foreground/60">Add posts in the Scheduler to see them here.</p>
            </div>
          )}
        </motion.div>

        {/* ── Connect CTA — only if not connected ── */}
        {!ig.connected && (
          <motion.div custom={10} initial="hidden" animate="visible" variants={fadeUp}
            className="rounded-2xl border border-dashed border-rose-500/30 bg-gradient-to-r from-purple-500/5 to-rose-500/5 p-6 flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-purple-500/20 to-rose-500/20 flex items-center justify-center">
                <Camera className="h-5 w-5 text-rose-500"/>
              </div>
              <div>
                <p className="text-sm font-semibold">Connect Instagram for live analytics</p>
                <p className="text-xs text-muted-foreground mt-0.5">Real followers, reach, and engagement data will appear once connected.</p>
              </div>
            </div>
            <a href="/api/instagram/connect"
              className="flex-shrink-0 rounded-xl bg-gradient-to-r from-purple-500 to-rose-500 px-4 py-2 text-xs font-semibold text-white hover:opacity-90 transition-opacity">
              Connect now →
            </a>
          </motion.div>
        )}
      </div>
    </div>
  );
}
