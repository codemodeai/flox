"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowUpRight,
  ArrowDownRight,
  Search,
  Plus,
  CheckSquare2,
  Users,
  TrendingUp,
  Zap,
  Target,
  Trophy,
  Flag,
  BarChart2,
} from "lucide-react";
import {
  dateISO, parseISO, dreamProgress,
} from "@/lib/task-store";
import type { RoadmapData, DailyTask } from "@/lib/task-store";
import { createClient } from "@/lib/supabase/client";

/* ── helpers ── */
const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.45 } }),
};

/* ── Graph types ── */
type Period = "Monthly" | "Annual" | "Lifetime";
type Metric = "Leads" | "Posting" | "Tasks";

const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function buildGraphData(
  tasks: { done: boolean; completedAt?: string; assignedDate: string }[],
  dreamCreatedAt: string | null,
): Record<Metric, Record<Period, { label: string; value: number }[]>> {
  const now   = new Date();
  const year  = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  /* ── completed task counts keyed by YYYY-MM-DD ── */
  const completedByDay: Record<string, number> = {};
  tasks.filter(t => t.done && t.completedAt).forEach(t => {
    completedByDay[t.completedAt!] = (completedByDay[t.completedAt!] || 0) + 1;
  });

  /* ── Monthly: day 1 … daysInMonth, real data only ── */
  const monthPfx = `${year}-${String(month + 1).padStart(2, "0")}-`;
  const monthlyTasks = Array.from({ length: daysInMonth }, (_, i) => {
    const dayKey = monthPfx + String(i + 1).padStart(2, "0");
    return { label: String(i + 1), value: completedByDay[dayKey] ?? 0 };
  });
  const monthlyLeads   = Array.from({ length: daysInMonth }, (_, i) => ({ label: String(i + 1), value: 0 }));
  const monthlyPosting = Array.from({ length: daysInMonth }, (_, i) => ({ label: String(i + 1), value: 0 }));

  /* ── Annual: Jan … Dec, real task data only ── */
  const annualTasks = MONTHS_SHORT.map((label, i) => {
    const pfx = `${year}-${String(i + 1).padStart(2, "0")}-`;
    const real = Object.entries(completedByDay).filter(([k]) => k.startsWith(pfx)).reduce((s, [,v]) => s + v, 0);
    return { label, value: real };
  });
  const annualLeads   = MONTHS_SHORT.map(label => ({ label, value: 0 }));
  const annualPosting = MONTHS_SHORT.map(label => ({ label, value: 0 }));

  /* ── Lifetime: monthly buckets from createdAt → now, real data only ── */
  const start = dreamCreatedAt ? parseISO(dreamCreatedAt) : new Date(year, month, 1);
  const startY = start.getFullYear(), startM = start.getMonth();
  const lifetimeTasks: { label: string; value: number }[] = [];
  const lifetimeLeads: { label: string; value: number }[] = [];
  const lifetimePosting: { label: string; value: number }[] = [];
  for (let y = startY, m = startM; ; m++) {
    if (m > 11) { y++; m = 0; }
    if (y > year || (y === year && m > month)) break;
    const label = `${MONTHS_SHORT[m]}'${String(y).slice(2)}`;
    const pfx   = `${y}-${String(m + 1).padStart(2, "0")}-`;
    const real  = Object.entries(completedByDay).filter(([k]) => k.startsWith(pfx)).reduce((s,[,v]) => s + v, 0);
    lifetimeTasks.push({ label, value: real });
    lifetimeLeads.push({ label, value: 0 });
    lifetimePosting.push({ label, value: 0 });
  }
  /* ensure at least 2 points for line rendering */
  const ensureTwo = (arr: { label: string; value: number }[]) => {
    if (arr.length < 2) arr.unshift({ label: "—", value: 0 });
    return arr;
  };

  return {
    Leads:   { Monthly: monthlyLeads,            Annual: annualLeads,   Lifetime: ensureTwo(lifetimeLeads)   },
    Posting: { Monthly: monthlyPosting,           Annual: annualPosting, Lifetime: ensureTwo(lifetimePosting) },
    Tasks:   { Monthly: monthlyTasks,             Annual: annualTasks,   Lifetime: ensureTwo(lifetimeTasks)   },
  };
}

const METRIC_META: Record<Metric, { label: string; color: string; unit: string; icon: React.ElementType }> = {
  Leads:   { label: "Leads",           color: "#3b82f6", unit: "leads", icon: Users       },
  Posting: { label: "Posting Freq.",   color: "#8b5cf6", unit: "posts", icon: TrendingUp  },
  Tasks:   { label: "Task Completion", color: "#10b981", unit: "tasks", icon: CheckSquare2},
};

const messages: { name: string; msg: string; time: string; avatar: string }[] = [];

/* ── day-label sort: Day 1 < Day 2 < Week 1 < Week 2 < other ── */
function dayLabelKey(label: string): [number, number, string] {
  const m = label.match(/^(Day|Week)\s+(\d+)/i);
  if (m) {
    const bucket = m[1].toLowerCase() === "day" ? 0 : 1;
    return [bucket, parseInt(m[2], 10), label];
  }
  return [2, 0, label];
}
function sortByDayLabel(a: DailyTask, b: DailyTask) {
  const [ab, ai, at] = dayLabelKey(a.dayLabel);
  const [bb, bi, bt] = dayLabelKey(b.dayLabel);
  return ab - bb || ai - bi || at.localeCompare(bt);
}

export default function DashboardPage() {
  const supabase = createClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [data, setData] = useState<RoadmapData>({ dreams: [], goals: [], milestones: [], tasks: [] });
  const [quickTaskCount, setQuickTaskCount] = useState(0);
  const [metric, setMetric] = useState<Metric>("Leads");
  const [period, setPeriod] = useState<Period>("Monthly");

  /* streak heatmap: current month days */
  const now = new Date();
  const streakYear  = now.getFullYear();
  const streakMonth = now.getMonth();
  const daysInStreakMonth = new Date(streakYear, streakMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(streakYear, streakMonth, 1).getDay(); // 0=Sun

  useEffect(() => {
    supabase.auth.getUser().then(({ data: d }) => { if (d.user) setUserId(d.user.id); });
  }, []);

  useEffect(() => {
    if (!userId) return;
    async function load() {
      const [dr, gr, mr, tr, qr] = await Promise.all([
        supabase.from("dreams").select("*").eq("user_id", userId!).order("created_at"),
        supabase.from("goals").select("*").eq("user_id", userId!).order("created_at"),
        supabase.from("milestones").select("*").eq("user_id", userId!).order("created_at"),
        supabase.from("daily_tasks").select("*").eq("user_id", userId!).order("created_at"),
        supabase.from("quick_tasks").select("*").eq("user_id", userId!),
      ]);
      setData({
        dreams: (dr.data ?? []).map(d => ({ id: d.id, title: d.title, emoji: d.emoji, timeframe: d.timeframe, targetDate: d.target_date, createdAt: d.created_at })),
        goals: (gr.data ?? []).map(g => ({ id: g.id, dreamId: g.dream_id, name: g.name, timeframe: g.timeframe, targetDate: g.target_date })),
        milestones: (mr.data ?? []).map(m => ({ id: m.id, goalId: m.goal_id, name: m.name, timeframe: m.timeframe, targetDate: m.target_date })),
        tasks: (tr.data ?? []).map(t => ({ id: t.id, milestoneId: t.milestone_id, description: t.description, dayLabel: t.day_label, assignedDate: t.assigned_date, done: t.done, completedAt: t.completed_at ?? undefined })),
      });
      setQuickTaskCount((qr.data ?? []).filter(t => !t.done).length);
    }
    load();
  }, [userId]);

  const today = dateISO(new Date());

  const graphData = useMemo(
    () => buildGraphData(data.tasks, data.dreams[0]?.createdAt ?? null),
    [data],
  );

  /* days that have at least 1 completed task this month */
  const completedDays = useMemo(() => {
    const set = new Set<number>();
    const pfx = `${streakYear}-${String(streakMonth + 1).padStart(2, "0")}-`;
    data.tasks.filter(t => t.done && t.completedAt?.startsWith(pfx)).forEach(t => {
      set.add(parseInt(t.completedAt!.slice(8), 10));
    });
    return set;
  }, [data.tasks, streakYear, streakMonth]);

  /* current streak from today backwards */
  const currentStreak = useMemo(() => {
    let streak = 0;
    for (let i = 0; i < 90; i++) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const iso = dateISO(d);
      const hasCompletion = data.tasks.some(t => t.done && t.completedAt === iso);
      if (hasCompletion) streak++;
      else if (i > 0) break;
    }
    return streak;
  }, [data.tasks]);

  const totalOpenTasks = useMemo(
    () => data.tasks.filter(t => !t.done).length + quickTaskCount,
    [data.tasks, quickTaskCount],
  );
  const todays = useMemo(
    () => data.tasks.filter(t => t.assignedDate === today).sort(sortByDayLabel),
    [data.tasks, today],
  );
  const doneToday = todays.filter(t => t.done).length;
  const visibleTodays = todays.slice(0, 5);
  const overflow = Math.max(todays.length - 5, 0);

  async function check(id: string) {
    const task = data.tasks.find(t => t.id === id); if (!task) return;
    const done = !task.done;
    await supabase.from("daily_tasks").update({ done, completed_at: done ? new Date().toISOString() : null }).eq("id", id);
    setData(d => ({ ...d, tasks: d.tasks.map(t => t.id === id ? { ...t, done, completedAt: done ? dateISO(new Date()) : undefined } : t) }));
  }

  function milestoneOf(t: DailyTask) {
    return data.milestones.find(m => m.id === t.milestoneId)?.name ?? "";
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">


      {/* ── Body ── */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">

        {/* ── Row 1: Welcome + stat cards ── */}
        <div className="grid grid-cols-12 gap-4">

          {/* Tile 1: Automations — accent highlight card (first) */}
          <motion.div
            custom={0} initial="hidden" animate="visible" variants={fadeUp}
            className="col-span-3 flex flex-col justify-between rounded-2xl bg-blue-500 p-5"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2 text-xs text-blue-100">
                <Zap className="h-3.5 w-3.5" /> Automations
              </div>
              <Link href="/dashboard/automations" className="h-6 w-6 rounded-lg bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors">
                <ArrowUpRight className="h-3.5 w-3.5 text-white" />
              </Link>
            </div>
            <div>
              <p className="text-3xl font-bold text-white">0</p>
              <p className="mt-1 text-xs text-blue-100 flex items-center gap-1">
                <ArrowUpRight className="h-3 w-3" /> Set up your first automation
              </p>
            </div>
          </motion.div>

          {/* Tile 2: Leads */}
          <motion.div
            custom={1} initial="hidden" animate="visible" variants={fadeUp}
            className="col-span-3 flex flex-col justify-between rounded-2xl border border-border bg-card p-5"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Users className="h-3.5 w-3.5" /> Total leads
              </div>
              <Link href="/dashboard/leads" className="h-6 w-6 rounded-lg bg-blue-500/15 flex items-center justify-center hover:bg-blue-500/25 transition-colors">
                <ArrowUpRight className="h-3.5 w-3.5 text-blue-600" />
              </Link>
            </div>
            <div>
              <p className="text-3xl font-bold">0</p>
              <p className="mt-1 text-xs text-emerald-700 flex items-center gap-1">
                <ArrowUpRight className="h-3 w-3" /> Start capturing leads
              </p>
            </div>
          </motion.div>

          {/* Tile 3: Posts scheduled */}
          <motion.div
            custom={2} initial="hidden" animate="visible" variants={fadeUp}
            className="col-span-3 flex flex-col justify-between rounded-2xl border border-border bg-card p-5"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <TrendingUp className="h-3.5 w-3.5" /> Posts scheduled
              </div>
              <Link href="/dashboard/scheduler" className="h-6 w-6 rounded-lg bg-blue-500/15 flex items-center justify-center hover:bg-blue-500/25 transition-colors">
                <ArrowUpRight className="h-3.5 w-3.5 text-blue-600" />
              </Link>
            </div>
            <div>
              <p className="text-3xl font-bold">0</p>
              <p className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
                <ArrowDownRight className="h-3 w-3 text-muted-foreground" /> Schedule your first post
              </p>
            </div>
          </motion.div>

          {/* Tile 4: Task Count */}
          <motion.div
            custom={3} initial="hidden" animate="visible" variants={fadeUp}
            className="col-span-3 flex flex-col justify-between rounded-2xl border border-border bg-card p-5"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <CheckSquare2 className="h-3.5 w-3.5" /> Open tasks
              </div>
              <Link href="/dashboard/tasks" className="h-6 w-6 rounded-lg bg-blue-500/15 flex items-center justify-center hover:bg-blue-500/25 transition-colors">
                <ArrowUpRight className="h-3.5 w-3.5 text-blue-600" />
              </Link>
            </div>
            <div>
              <p className="text-3xl font-bold">{totalOpenTasks}</p>
              <p className="mt-1 text-xs flex items-center gap-1">
                {doneToday > 0
                  ? <><ArrowUpRight className="h-3 w-3 text-emerald-600"/><span className="text-emerald-700">{doneToday} completed today</span></>
                  : <><ArrowUpRight className="h-3 w-3 text-muted-foreground"/><span className="text-muted-foreground">Start knocking them out</span></>}
              </p>
            </div>
          </motion.div>
        </div>

        {/* ── Today's Tasks + Roadmap glance ── */}
        <div className="grid grid-cols-12 gap-4">
          {/* Today's Tasks widget */}
          <motion.div
            custom={4} initial="hidden" animate="visible" variants={fadeUp}
            className="col-span-8 rounded-2xl border border-border bg-card p-5 flex flex-col gap-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-blue-500/15 flex items-center justify-center">
                  <CheckSquare2 className="h-4 w-4 text-blue-600"/>
                </div>
                <div>
                  <p className="text-sm font-bold leading-tight">Today&apos;s Tasks</p>
                  <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                    {new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}
                  </p>
                </div>
              </div>
              {todays.length > 0 && (
                <span className="rounded-full bg-blue-500/15 border border-blue-500/20 text-blue-700 px-3 py-1 text-[11px] font-bold">
                  {doneToday} of {todays.length} done today
                </span>
              )}
            </div>

            {todays.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <div className="h-12 w-12 rounded-2xl bg-secondary flex items-center justify-center">
                  <Target className="h-6 w-6 text-muted-foreground/60"/>
                </div>
                <p className="text-sm font-medium">Nothing scheduled for today</p>
                <Link
                  href="/dashboard/roadmap"
                  className="flex items-center gap-2 rounded-xl bg-blue-500 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-400 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5"/> Add tasks in Roadmap
                </Link>
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-1.5">
                  <AnimatePresence>
                    {visibleTodays.map(t => (
                      <motion.div
                        key={t.id}
                        layout
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: t.done ? 0.45 : 1, y: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.25 }}
                        className="group flex items-center gap-3 rounded-xl border border-border/60 bg-secondary/40 px-3 py-2.5 hover:bg-secondary/70 transition-colors"
                      >
                        <button
                          onClick={() => check(t.id)}
                          className={`h-5 w-5 flex-shrink-0 rounded-md border-[1.5px] flex items-center justify-center transition-all
                            ${t.done ? "bg-blue-500 border-blue-500" : "border-muted-foreground/40 hover:border-blue-400"}`}
                        >
                          {t.done && <CheckSquare2 className="h-3.5 w-3.5 text-white"/>}
                        </button>
                        <span className="font-mono text-[10px] text-muted-foreground/70 w-14 flex-shrink-0">{t.dayLabel}</span>
                        <span className={`text-sm flex-1 min-w-0 truncate ${t.done ? "line-through" : ""}`}>{t.description}</span>
                        <span className="rounded-full bg-card border border-border px-2 py-0.5 text-[9px] font-semibold text-muted-foreground flex-shrink-0 max-w-[10rem] truncate">
                          {milestoneOf(t)}
                        </span>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
                {overflow > 0 && (
                  <Link
                    href="/dashboard/tasks"
                    className="self-start text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    See all {todays.length} →
                  </Link>
                )}
              </>
            )}
          </motion.div>

          {/* Roadmap glance */}
          <motion.div
            custom={5} initial="hidden" animate="visible" variants={fadeUp}
            className="col-span-4 rounded-2xl border border-border bg-card p-5 flex flex-col gap-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-blue-600"/>
                <p className="text-sm font-bold">Roadmap glance</p>
              </div>
              <Link href="/dashboard/roadmap" className="text-[10px] font-semibold text-blue-600 hover:text-blue-700 transition-colors">Open →</Link>
            </div>

            {data.dreams.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-4 text-center">
                <p className="text-xs text-muted-foreground">No dreams yet.</p>
                <Link href="/dashboard/roadmap" className="text-xs font-semibold text-blue-600">+ Create one</Link>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {data.dreams.slice(0, 3).map(d => {
                  const dp = dreamProgress(d.id, data);
                  return (
                    <div key={d.id} className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-base">{d.emoji}</span>
                          <span className="text-xs font-semibold truncate">{d.title}</span>
                        </div>
                        <span className="text-xs font-bold flex-shrink-0">{dp.pct}%</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-black/[0.08] overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${dp.pct}%` }}
                          transition={{ duration: 0.6 }}
                          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-400"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="grid grid-cols-3 gap-1.5 mt-1 pt-3 border-t border-border/50">
              {[
                { icon: Target, label: "Dreams", count: data.dreams.length,     color: "text-blue-600"   },
                { icon: Trophy, label: "Goals",  count: data.goals.length,      color: "text-blue-700" },
                { icon: Flag,   label: "M.stones", count: data.milestones.length, color: "text-blue-700" },
              ].map(({ icon: Icon, label, count, color }) => (
                <div key={label} className="flex flex-col items-center gap-0.5 rounded-lg bg-secondary/40 py-2">
                  <Icon className={`h-3.5 w-3.5 ${color}`}/>
                  <span className="text-sm font-bold">{count}</span>
                  <span className="text-[9px] text-muted-foreground">{label}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* ── Row 3: Consolidated Graph + Month Streak + Messages ── */}
        <div className="grid grid-cols-12 gap-4">

          {/* ── Performance chart ── */}
          <motion.div
            custom={6} initial="hidden" animate="visible" variants={fadeUp}
            className="col-span-6 rounded-2xl border border-border bg-card p-4 flex flex-col gap-2 min-h-0"
          >
            {/* Top controls row */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              {/* Metric tabs */}
              <div className="flex items-center gap-0.5 rounded-xl border border-border bg-secondary p-0.5">
                {(["Leads","Posting","Tasks"] as Metric[]).map(m => {
                  const meta = METRIC_META[m];
                  const Icon = meta.icon;
                  return (
                    <button key={m} onClick={() => setMetric(m)}
                      className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all
                        ${metric === m ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                      <Icon className="h-3 w-3"/>
                      {meta.label}
                    </button>
                  );
                })}
              </div>
              {/* Period pills */}
              <div className="flex items-center gap-0.5 rounded-xl border border-border bg-secondary p-0.5">
                {(["Monthly","Annual","Lifetime"] as Period[]).map(p => (
                  <button key={p} onClick={() => setPeriod(p)}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all
                      ${period === p ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Stock-style chart */}
            <div className="flex flex-col flex-1 min-h-0">
            {(() => {
              const pts   = graphData[metric][period];
              const meta  = METRIC_META[metric];
              const color = meta.color;
              const total = pts.length;
              const vals  = pts.map(p => p.value);
              const max   = Math.max(...vals, 1);
              const min   = Math.min(...vals);
              const last  = vals[total - 1];
              const prev  = vals[total - 2] ?? last;
              const delta = prev > 0 ? ((last - prev) / prev * 100) : 0;
              const hiIdx = vals.indexOf(Math.max(...vals));
              const loIdx = vals.indexOf(Math.min(...vals));
              /* "today" = last point for Annual/Lifetime, or today's day index for Monthly */
              const todayIdx = total - 1;

              /* SVG layout */
              const W   = 600;
              const H   = 160;
              const PL  = 44; // left padding for Y-axis labels
              const PR  = 12;
              const PT  = 16;
              const PB  = 24;
              const chartW = W - PL - PR;
              const chartH = H - PT - PB;
              const range  = max - min || 1;

              /* coordinate helpers */
              const cx = (i: number) => PL + (i / (total - 1)) * chartW;
              const cy = (v: number) => PT + (1 - (v - min) / range) * chartH;

              /* smooth bezier path (Catmull-Rom → cubic bezier) */
              function smoothLinePath(close = false) {
                const coords = pts.map((p, i) => ({ x: cx(i), y: cy(p.value) }));
                let d = `M ${coords[0].x} ${coords[0].y}`;
                for (let i = 1; i < coords.length; i++) {
                  const p0 = coords[Math.max(0, i - 2)];
                  const p1 = coords[i - 1];
                  const p2 = coords[i];
                  const p3 = coords[Math.min(coords.length - 1, i + 1)];
                  const cp1x = p1.x + (p2.x - p0.x) / 6;
                  const cp1y = p1.y + (p2.y - p0.y) / 6;
                  const cp2x = p2.x - (p3.x - p1.x) / 6;
                  const cp2y = p2.y - (p3.y - p1.y) / 6;
                  d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
                }
                if (close) {
                  d += ` L ${coords[coords.length - 1].x} ${PT + chartH} L ${coords[0].x} ${PT + chartH} Z`;
                }
                return d;
              }

              /* Y-axis ticks */
              const yTicks = [0, 0.25, 0.5, 0.75, 1].map(pct => ({
                v: Math.round(min + pct * range),
                y: PT + (1 - pct) * chartH,
              }));

              /* X-axis labels — show ~6 evenly spread */
              const step = Math.max(1, Math.ceil(total / 6));

              /* empty state */
              const hasData = vals.some(v => v > 0);
              if (!hasData) return (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border min-h-0">
                  <BarChart2 className="h-8 w-8 text-muted-foreground/25"/>
                  <div className="text-center">
                    <p className="text-sm font-medium text-muted-foreground">No data yet</p>
                    <p className="text-xs text-muted-foreground/60 mt-0.5">
                      {metric === "Tasks"   ? "Complete tasks to see your performance trend"  :
                       metric === "Leads"   ? "Connect Instagram to track lead data"           :
                                             "Schedule posts to track posting frequency"}
                    </p>
                  </div>
                </div>
              );

              return (
                <div className="flex flex-col flex-1 min-h-0 gap-1">
                  {/* Stats header — matches the image style */}
                  <div className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">
                        Today&apos;s {meta.label}:&nbsp;
                        <span className="font-black">{last.toLocaleString()}</span>
                      </span>
                      <span className={`flex items-center gap-0.5 font-semibold ${delta >= 0 ? "text-emerald-600" : "text-rose-500"}`}>
                        {delta >= 0 ? <ArrowUpRight className="h-3 w-3"/> : <ArrowDownRight className="h-3 w-3"/>}
                        ({delta >= 0 ? "+" : ""}{delta.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-muted-foreground">
                      <span>High: <strong className="text-blue-500">{Math.max(...vals).toLocaleString()}</strong></span>
                      <span>Low: <strong className="text-foreground/70">{Math.min(...vals).toLocaleString()}</strong></span>
                      <span>Change: <strong className={delta >= 0 ? "text-emerald-600" : "text-rose-500"}>{delta >= 0 ? "+" : ""}{delta.toFixed(2)}%</strong></span>
                    </div>
                  </div>

                  {/* SVG chart — fills remaining panel height */}
                  <svg viewBox={`0 0 ${W} ${H}`} className="w-full flex-1" style={{ minHeight: 0 }}>
                    <defs>
                      <linearGradient id={`perf-grad-${metric}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"   stopColor={color} stopOpacity="0.18"/>
                        <stop offset="85%"  stopColor={color} stopOpacity="0.03"/>
                        <stop offset="100%" stopColor={color} stopOpacity="0"/>
                      </linearGradient>
                      <clipPath id={`perf-clip-${metric}`}>
                        <rect x={PL} y={PT} width={chartW} height={chartH}/>
                      </clipPath>
                    </defs>

                    {/* Dashed horizontal grid lines + Y labels */}
                    {yTicks.map(({ v, y }) => (
                      <g key={v}>
                        <line x1={PL} y1={y} x2={W - PR} y2={y}
                          stroke="currentColor" strokeOpacity="0.08"
                          strokeWidth="1" strokeDasharray="4 3"/>
                        <text x={PL - 4} y={y + 3.5} textAnchor="end"
                          fontSize="9" fill="currentColor" fillOpacity="0.4">
                          {v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}
                        </text>
                      </g>
                    ))}

                    {/* Area fill */}
                    <path d={smoothLinePath(true)} fill={`url(#perf-grad-${metric})`}
                      clipPath={`url(#perf-clip-${metric})`}/>

                    {/* Smooth line */}
                    <path d={smoothLinePath(false)} fill="none"
                      stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>

                    {/* Today vertical dashed line */}
                    {(() => {
                      const x = cx(todayIdx);
                      const y = cy(pts[todayIdx].value);
                      return (
                        <>
                          <line x1={x} y1={PT} x2={x} y2={PT + chartH}
                            stroke={color} strokeOpacity="0.35" strokeWidth="1.5" strokeDasharray="5 4"/>
                          {/* Today dot — outer ring + inner fill */}
                          <circle cx={x} cy={y} r={7} fill={color} fillOpacity="0.18"/>
                          <circle cx={x} cy={y} r={4} fill="var(--card)" stroke={color} strokeWidth="2"/>
                        </>
                      );
                    })()}

                    {/* High dot */}
                    {hiIdx !== todayIdx && (() => {
                      const x = cx(hiIdx); const y = cy(pts[hiIdx].value);
                      return <circle cx={x} cy={y} r={3.5} fill="var(--card)" stroke={color} strokeWidth="1.5"/>;
                    })()}

                    {/* Low dot */}
                    {loIdx !== todayIdx && loIdx !== hiIdx && (() => {
                      const x = cx(loIdx); const y = cy(pts[loIdx].value);
                      return <circle cx={x} cy={y} r={3} fill="var(--card)" stroke="currentColor" strokeOpacity="0.3" strokeWidth="1.5"/>;
                    })()}

                    {/* X-axis labels */}
                    {pts.map((p, i) => {
                      if (i % step !== 0 && i !== total - 1) return null;
                      return (
                        <text key={i} x={cx(i)} y={H - 4} textAnchor="middle"
                          fontSize="9" fill="currentColor" fillOpacity="0.4">
                          {p.label}
                        </text>
                      );
                    })}
                  </svg>
                </div>
              );
            })()}
            </div>
          </motion.div>

          {/* ── Contribution heatmap ── */}
          <motion.div
            custom={7} initial="hidden" animate="visible" variants={fadeUp}
            className="col-span-3 rounded-2xl border border-border bg-card p-4 flex flex-col gap-2 min-h-0"
          >
            {/* Header */}
            <div className="flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-blue-500"/>
                <span className="text-sm font-bold">Activity</span>
              </div>
              <span className="text-[11px] font-semibold text-blue-500">
                {currentStreak} day streak
              </span>
            </div>

            {/* Heatmap — fills remaining space */}
            {(() => {
              const GAP = 3;
              const DAY_W = 12; // day-label column width px

              /* 13-week window ending today, starting on Sunday */
              const todayD = new Date(now); todayD.setHours(0,0,0,0);
              const startD = new Date(todayD);
              startD.setDate(startD.getDate() - todayD.getDay() - 12 * 7);

              /* completion count per ISO date from real tasks only */
              const countMap: Record<string, number> = {};
              data.tasks.filter(t => t.done && t.completedAt).forEach(t => {
                countMap[t.completedAt!] = (countMap[t.completedAt!] || 0) + 1;
              });

              /* weeks: array of 7-day arrays Sun→Sat */
              const weeks: Date[][] = [];
              const cur = new Date(startD);
              while (cur <= todayD) {
                const wk: Date[] = [];
                for (let d = 0; d < 7; d++) { wk.push(new Date(cur)); cur.setDate(cur.getDate() + 1); }
                weeks.push(wk);
              }
              const N = weeks.length;

              /* month label at first week of each new month */
              const monthAtCol: Record<number, string> = {};
              weeks.forEach((wk, wi) => {
                for (let di = 0; di < 7; di++) {
                  if (wk[di].getDate() === 1)
                    monthAtCol[wi] = wk[di].toLocaleDateString("en-US", { month: "short" });
                }
              });

              const DAY_LABELS = ["S","M","T","W","T","F","S"];

              function bg(iso: string, future: boolean) {
                if (future) return "var(--secondary)";
                const n = countMap[iso] ?? 0;
                if (n === 0) return "var(--secondary)";
                if (n === 1) return "#bfdbfe";
                if (n === 2) return "#60a5fa";
                if (n === 3) return "#3b82f6";
                return "#1d4ed8";
              }

              return (
                <div className="flex flex-col flex-1 min-h-0 gap-1 select-none">

                  {/* Month label row */}
                  <div className="flex flex-shrink-0" style={{ paddingLeft: DAY_W + GAP }}>
                    {weeks.map((_, wi) => (
                      <div key={wi} className="flex-1 text-[9px] font-semibold text-muted-foreground/60 whitespace-nowrap overflow-visible">
                        {monthAtCol[wi] ?? ""}
                      </div>
                    ))}
                  </div>

                  {/* Day labels + grid */}
                  <div className="flex" style={{ gap: GAP }}>

                    {/* Day-of-week labels — spaced to match grid rows */}
                    <div className="flex flex-col flex-shrink-0" style={{ width: DAY_W, gap: GAP }}>
                      {DAY_LABELS.map((d, i) => (
                        <div key={i} className="flex items-center justify-end flex-1"
                          style={{ aspectRatio: "1" }}>
                          <span className="text-[9px] font-semibold text-muted-foreground/60 leading-none">
                            {d}
                          </span>
                        </div>
                      ))}
                    </div>

                      {/* Cell grid — column-flow so each week is a column, aspect-ratio:1 = square cells */}
                    <div
                      className="flex-1"
                      style={{
                        display: "grid",
                        gridTemplateRows: `repeat(7, 1fr)`,
                        gridAutoFlow: "column",
                        gridAutoColumns: "1fr",
                        gap: GAP,
                      }}
                    >
                      {weeks.map((wk, wi) =>
                        wk.map((day, di) => {
                          const iso = dateISO(day);
                          const future = day > todayD;
                          const isToday = iso === today;
                          return (
                            <div
                              key={`${wi}-${di}`}
                              title={`${iso}${countMap[iso] ? ` · ${countMap[iso]} tasks` : ""}`}
                              style={{
                                aspectRatio: "1",
                                borderRadius: 4,
                                background: bg(iso, future),
                                outline: isToday ? "2px solid #60a5fa" : undefined,
                                outlineOffset: isToday ? "1px" : undefined,
                              }}
                            />
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="text-[9px] text-muted-foreground/50">Goal not meet</span>
                    <div className="flex items-center gap-[3px]">
                      {[undefined,"#bfdbfe","#60a5fa","#3b82f6","#1d4ed8"].map((c, i) => (
                        <div key={i} style={{ width: 10, height: 10, borderRadius: 2, background: c ?? "var(--secondary)" }}/>
                      ))}
                    </div>
                    <span className="text-[9px] text-muted-foreground/50">More</span>
                  </div>
                </div>
              );
            })()}
          </motion.div>

          {/* Messages panel */}
          <motion.div
            custom={8} initial="hidden" animate="visible" variants={fadeUp}
            className="col-span-3 rounded-2xl border border-border bg-card p-5 flex flex-col gap-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Messages</span>
              <button className="h-6 w-6 rounded-lg bg-blue-500/15 flex items-center justify-center hover:bg-blue-500/25 transition-colors">
                <Plus className="h-3.5 w-3.5 text-blue-600" />
              </button>
            </div>

            {/* Search */}
            <div className="flex items-center gap-2 rounded-xl bg-secondary px-3 py-2">
              <Search className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              <input
                placeholder="Search message"
                className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground/60"
              />
            </div>

            {/* Message list */}
            <div className="flex flex-col gap-0.5 flex-1">
              {messages.map(({ name, msg, time, avatar }) => (
                <button
                  key={name}
                  className="flex items-start gap-3 rounded-xl p-2.5 text-left hover:bg-secondary transition-colors"
                >
                  <div className="h-8 w-8 flex-shrink-0 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-[10px] font-semibold text-white">
                    {avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium truncate">{name}</p>
                      <span className="text-[10px] text-muted-foreground ml-2 flex-shrink-0">{time}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">{msg}</p>
                  </div>
                </button>
              ))}
            </div>

            {/* Connect CTA */}
            <div className="rounded-xl border border-dashed border-blue-500/20 bg-blue-500/5 p-3 text-center">
              <p className="text-xs text-muted-foreground">Connect Instagram to see real messages</p>
              <button className="mt-2 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors">
                Connect now →
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
