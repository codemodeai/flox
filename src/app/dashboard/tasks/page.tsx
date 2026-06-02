"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, CheckSquare2, Flag, Flame, Trophy, Target,
  CalendarDays, AlertCircle, X, ChevronDown, RefreshCw, CheckCircle2, Circle,
  Inbox, Clock, Tag, Trash2, ChevronRight,
} from "lucide-react";
import {
  dateISO, formatTarget, milestoneProgress,
  isRoutineActiveOn, routineStreak,
} from "@/lib/task-store";
import type { RoadmapData, DailyTask, RoutineStore, QuickTask, QuickTaskTag, QuickTaskPriority } from "@/lib/task-store";
import { createClient } from "@/lib/supabase/client";

type Filter = "All" | "Today" | "ThisWeek" | "Overdue" | "Done";

const FILTER_LABEL: Record<Filter, string> = {
  All: "All", Today: "Today", ThisWeek: "This week", Overdue: "Overdue", Done: "Done",
};

/* ── streak calc ─────────────────────────────────────────── */
function calcStreak(tasks: DailyTask[]) {
  const today = new Date();
  const doneByDate: Record<string, number> = {};
  tasks.forEach(t => { if (t.completedAt) doneByDate[t.completedAt] = (doneByDate[t.completedAt] || 0) + 1; });

  let current = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date(today); d.setDate(today.getDate() - i);
    if (doneByDate[dateISO(d)]) current++;
    else break;
  }
  const last14 = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today); d.setDate(today.getDate() - 13 + i);
    return doneByDate[dateISO(d)] || 0;
  });
  const dow = today.getDay();
  const mon = new Date(today); mon.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1));
  let thisWeek = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(mon); d.setDate(mon.getDate() + i);
    if (doneByDate[dateISO(d)]) thisWeek++;
  }
  const sorted = Object.keys(doneByDate).sort();
  let longest = 0, run = 0; let prev: string | null = null;
  for (const ds of sorted) {
    if (prev) {
      const diff = Math.round((new Date(ds).getTime() - new Date(prev).getTime()) / 86400000);
      run = diff === 1 ? run + 1 : 1;
    } else run = 1;
    longest = Math.max(longest, run);
    prev = ds;
  }
  return { current, longest, thisWeek, last14 };
}
function tileColor(count: number) {
  if (count === 0) return "bg-secondary border border-black/[0.06]";
  if (count === 1) return "bg-blue-200";
  if (count === 2) return "bg-blue-400 shadow-[0_1px_6px_rgba(59,130,246,0.25)]";
  return "bg-blue-600 shadow-[0_2px_10px_rgba(37,99,235,0.35)]";
}

/* ── week / day helpers ──────────────────────────────────── */
function thisWeekRange() {
  const today = new Date();
  const dow = today.getDay();
  const mon = new Date(today); mon.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1));
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
  return { start: dateISO(mon), end: dateISO(sun) };
}

/* ════════════════════════════════════════════════════════════ */
export default function TasksPage() {
  const supabase = createClient();
  const [userId, setUserId] = useState<string | null>(null);

  const [data, setData]       = useState<RoadmapData>({ dreams: [], goals: [], milestones: [], tasks: [] });
  const [routineStore, setRoutineStore] = useState<RoutineStore>({ routines: [], logs: [] });
  const [quickTasks, setQuickTasks]     = useState<QuickTask[]>([]);
  const [qtForm, setQtForm] = useState<{ title: string; date: string; time: string; tag: QuickTaskTag | ""; priority: QuickTaskPriority }>({ title: "", date: "", time: "", tag: "", priority: "Medium" });
  const [qtOpen, setQtOpen] = useState(false);
  const [qtFilter, setQtFilter] = useState<"All"|"Today"|"Done">("All");
  const [filter, setFilter]   = useState<Filter>("All");
  const [goalFilter, setGoalFilter] = useState<string>("All");
  const [selected, setSelected]     = useState<Set<string>>(new Set());
  const [quickAdd, setQuickAdd] = useState<Record<string, { description: string; dayLabel: string; date: string }>>({});

  useEffect(() => {
    supabase.auth.getUser().then(({ data: d }) => { if (d.user) setUserId(d.user.id); });
  }, []);

  useEffect(() => {
    if (!userId) return;
    async function load() {
      const [dr, gr, mr, tr, rr, lr, qr] = await Promise.all([
        supabase.from("dreams").select("*").eq("user_id", userId!).order("created_at"),
        supabase.from("goals").select("*").eq("user_id", userId!).order("created_at"),
        supabase.from("milestones").select("*").eq("user_id", userId!).order("created_at"),
        supabase.from("daily_tasks").select("*").eq("user_id", userId!).order("created_at"),
        supabase.from("routines").select("*").eq("user_id", userId!).order("created_at"),
        supabase.from("routine_logs").select("*").eq("user_id", userId!),
        supabase.from("quick_tasks").select("*").eq("user_id", userId!).order("created_at"),
      ]);
      setData({
        dreams: (dr.data ?? []).map(d => ({ id: d.id, title: d.title, emoji: d.emoji, timeframe: d.timeframe, targetDate: d.target_date, createdAt: d.created_at })),
        goals: (gr.data ?? []).map(g => ({ id: g.id, dreamId: g.dream_id, name: g.name, timeframe: g.timeframe, targetDate: g.target_date })),
        milestones: (mr.data ?? []).map(m => ({ id: m.id, goalId: m.goal_id, name: m.name, timeframe: m.timeframe, targetDate: m.target_date })),
        tasks: (tr.data ?? []).map(t => ({ id: t.id, milestoneId: t.milestone_id, description: t.description, dayLabel: t.day_label, assignedDate: t.assigned_date, done: t.done, completedAt: t.completed_at ?? undefined })),
      });
      setRoutineStore({
        routines: (rr.data ?? []).map(r => ({ id: r.id, name: r.name, color: r.color, daysOfWeek: r.days_of_week, description: r.description ?? undefined, time: r.time ?? undefined, createdAt: r.created_at })),
        logs: (lr.data ?? []).map(l => ({ id: l.id, routineId: l.routine_id, date: l.date, done: l.done })),
      });
      setQuickTasks((qr.data ?? []).map(q => ({
        id: q.id, title: q.title, date: q.date, time: q.time ?? undefined,
        tag: q.tag as QuickTaskTag | undefined, priority: q.priority as QuickTaskPriority,
        done: q.done, createdAt: q.created_at, completedAt: q.completed_at ?? undefined,
      })));
    }
    load();
  }, [userId]);

  /* ── derived ─────────────────────────────────────────── */
  const today = dateISO(new Date());
  const week = useMemo(() => thisWeekRange(), []);

  // milestones to show, scoped by goal filter
  const visibleMilestones = useMemo(() => {
    if (goalFilter === "All") return data.milestones;
    return data.milestones.filter(m => m.goalId === goalFilter);
  }, [data.milestones, goalFilter]);

  // grouped tasks (milestoneId -> filtered tasks)
  const grouped = useMemo(() => {
    const passes = (t: DailyTask): boolean => {
      if (filter === "All")     return true;
      if (filter === "Today")   return t.assignedDate === today && !t.done;
      if (filter === "ThisWeek")return t.assignedDate >= week.start && t.assignedDate <= week.end && !t.done;
      if (filter === "Overdue") return t.assignedDate < today && !t.done;
      if (filter === "Done")    return t.done;
      return true;
    };
    const out: Record<string, DailyTask[]> = {};
    for (const m of visibleMilestones) {
      out[m.id] = data.tasks.filter(t => t.milestoneId === m.id && passes(t));
    }
    return out;
  }, [data.tasks, visibleMilestones, filter, today, week]);

  const totalVisible = Object.values(grouped).reduce((a, ts) => a + ts.length, 0);

  // counts per filter
  const counts = useMemo(() => ({
    All:      data.tasks.length,
    Today:    data.tasks.filter(t => t.assignedDate === today && !t.done).length,
    ThisWeek: data.tasks.filter(t => t.assignedDate >= week.start && t.assignedDate <= week.end && !t.done).length,
    Overdue:  data.tasks.filter(t => t.assignedDate < today && !t.done).length,
    Done:     data.tasks.filter(t => t.done).length,
  }), [data.tasks, today, week]);

  const streak = useMemo(() => calcStreak(data.tasks), [data.tasks]);

  const todayRoutines = useMemo(
    () => routineStore.routines.filter(r => isRoutineActiveOn(r, new Date())),
    [routineStore]
  );
  function isRoutineDone(id: string) {
    return routineStore.logs.find(l => l.routineId === id && l.date === today)?.done ?? false;
  }
  async function toggleRoutine(id: string) {
    if (!userId) return;
    const existing = routineStore.logs.find(l => l.routineId === id && l.date === today);
    if (existing) {
      const done = !existing.done;
      await supabase.from("routine_logs").update({ done }).eq("id", existing.id!);
      setRoutineStore(s => ({ ...s, logs: s.logs.map(l => l.id === existing.id ? { ...l, done } : l) }));
    } else {
      const { data: row } = await supabase.from("routine_logs").insert({ user_id: userId, routine_id: id, date: today, done: true }).select().single();
      if (row) setRoutineStore(s => ({ ...s, logs: [...s.logs, { id: row.id, routineId: row.routine_id, date: row.date, done: row.done }] }));
    }
  }
  const routineDoneCount = todayRoutines.filter(r => isRoutineDone(r.id)).length;

  /* quick task helpers */
  const TAG_COLORS: Record<string, string> = {
    Meeting: "bg-blue-500/15 text-blue-700 border-blue-500/30",
    Personal: "bg-violet-500/15 text-violet-700 border-violet-500/30",
    Work:     "bg-amber-500/15 text-amber-700 border-amber-500/30",
    Health:   "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
    Errand:   "bg-rose-500/15 text-rose-700 border-rose-500/30",
    Other:    "bg-secondary text-muted-foreground border-border",
  };
  const PRIORITY_COLORS: Record<string, string> = {
    High:   "bg-rose-500",
    Medium: "bg-amber-400",
    Low:    "bg-blue-400",
  };

  const filteredQT = useMemo(() => {
    return quickTasks.filter(t => {
      if (qtFilter === "Today")  return t.date === today && !t.done;
      if (qtFilter === "Done")   return t.done;
      return true;
    }).sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      return a.date.localeCompare(b.date) || (a.time ?? "").localeCompare(b.time ?? "");
    });
  }, [quickTasks, qtFilter, today]);

  async function addOneOffTask() {
    if (!userId || !qtForm.title.trim()) return;
    const { data: row } = await supabase.from("quick_tasks").insert({
      user_id: userId, title: qtForm.title.trim(),
      date: qtForm.date || today, time: qtForm.time || null,
      tag: qtForm.tag || null, priority: qtForm.priority, done: false,
    }).select().single();
    if (row) setQuickTasks(prev => [...prev, {
      id: row.id, title: row.title, date: row.date, time: row.time ?? undefined,
      tag: row.tag as QuickTaskTag | undefined, priority: row.priority as QuickTaskPriority,
      done: row.done, createdAt: row.created_at, completedAt: row.completed_at ?? undefined,
    }]);
    setQtForm(f => ({ ...f, title: "", time: "" }));
    setQtOpen(false);
  }
  async function checkQT(id: string) {
    const qt = quickTasks.find(t => t.id === id); if (!qt) return;
    const done = !qt.done;
    await supabase.from("quick_tasks").update({ done, completed_at: done ? new Date().toISOString() : null }).eq("id", id);
    setQuickTasks(prev => prev.map(t => t.id === id ? { ...t, done } : t));
  }
  async function deleteQT(id: string) {
    await supabase.from("quick_tasks").delete().eq("id", id);
    setQuickTasks(prev => prev.filter(t => t.id !== id));
  }

  /* ── actions ─────────────────────────────────────────── */
  async function check(id: string) {
    const task = data.tasks.find(t => t.id === id); if (!task) return;
    const done = !task.done;
    await supabase.from("daily_tasks").update({ done, completed_at: done ? new Date().toISOString() : null }).eq("id", id);
    setData(d => ({ ...d, tasks: d.tasks.map(t => t.id === id ? { ...t, done, completedAt: done ? dateISO(new Date()) : undefined } : t) }));
  }
  async function remove(id: string) {
    await supabase.from("daily_tasks").delete().eq("id", id);
    setData(d => ({ ...d, tasks: d.tasks.filter(t => t.id !== id) }));
  }
  function toggleSelect(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  }
  async function bulkDone() {
    const ids = Array.from(selected);
    await supabase.from("daily_tasks").update({ done: true, completed_at: new Date().toISOString() }).in("id", ids);
    setData(d => ({ ...d, tasks: d.tasks.map(t => ids.includes(t.id) ? { ...t, done: true, completedAt: dateISO(new Date()) } : t) }));
    setSelected(new Set());
  }
  async function bulkReassign(newDate: string) {
    if (!newDate) return;
    const ids = Array.from(selected);
    await supabase.from("daily_tasks").update({ assigned_date: newDate }).in("id", ids);
    setData(d => ({ ...d, tasks: d.tasks.map(t => ids.includes(t.id) ? { ...t, assignedDate: newDate } : t) }));
    setSelected(new Set());
  }

  async function addQuickTask(milestoneId: string) {
    if (!userId) return;
    const q = quickAdd[milestoneId];
    if (!q || !q.description.trim()) return;
    const { data: row } = await supabase.from("daily_tasks").insert({
      user_id: userId, milestone_id: milestoneId,
      description: q.description.trim(),
      day_label: q.dayLabel.trim() || "Day 1",
      assigned_date: q.date || today, done: false,
    }).select().single();
    if (row) {
      const t: DailyTask = { id: row.id, milestoneId, description: row.description, dayLabel: row.day_label, assignedDate: row.assigned_date, done: false };
      setData(d => ({ ...d, tasks: [...d.tasks, t] }));
    }
    setQuickAdd(prev => ({ ...prev, [milestoneId]: { description: "", dayLabel: q.dayLabel, date: q.date } }));
  }
  function updateQuickAdd(milestoneId: string, patch: Partial<{ description: string; dayLabel: string; date: string }>) {
    setQuickAdd(prev => {
      const base = prev[milestoneId] ?? { description: "", dayLabel: "Day 1", date: today };
      return { ...prev, [milestoneId]: { ...base, ...patch } };
    });
  }

  /* ════════════════════════════════════════════════════════ */
  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">

      {/* ── Header ─────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-border px-6 py-4 flex-shrink-0">
        <div>
          <p className="text-xs text-muted-foreground">{new Date().toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
          <h1 className="text-xl font-bold mt-0.5 flex items-center gap-2">
            <CheckSquare2 className="h-5 w-5 text-blue-600"/>
            Your Tasks
          </h1>
        </div>
        <Link
          href="/dashboard/roadmap"
          className="flex items-center gap-1.5 h-9 rounded-xl bg-blue-500 px-4 text-xs font-semibold text-white hover:bg-blue-400 transition-colors"
        >
          <Target className="h-4 w-4"/> Open roadmap
        </Link>
      </div>

      {/* ── Body ───────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-5 grid grid-cols-12 gap-4 min-h-0 content-start">

        {/* ══ LEFT: filters + milestone groups ═══════════ */}
        <div className="col-span-9 flex flex-col gap-4 min-w-0">

          {/* Filter bar */}
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-2.5">
            <div className="flex items-center gap-1.5 flex-wrap">
              {(["All","Today","ThisWeek","Overdue","Done"] as Filter[]).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all
                    ${filter === f ? "bg-blue-500 text-white" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}
                >
                  {FILTER_LABEL[f]}
                  <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${filter === f ? "bg-white/20" : "bg-secondary"}`}>{counts[f]}</span>
                </button>
              ))}
            </div>
            <div className="relative">
              <select
                value={goalFilter}
                onChange={e => setGoalFilter(e.target.value)}
                className="appearance-none h-8 rounded-lg border border-border bg-secondary pl-3 pr-8 text-xs outline-none focus:border-blue-500/60 transition-all"
              >
                <option value="All">All goals</option>
                {data.goals.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none"/>
            </div>
          </div>

          {/* Bulk action bar */}
          <AnimatePresence>
            {selected.size > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="flex items-center justify-between rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-2.5"
              >
                <span className="text-xs font-semibold text-blue-700">{selected.size} selected</span>
                <div className="flex items-center gap-2">
                  <button onClick={bulkDone} className="rounded-lg bg-blue-500 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-blue-400 transition-colors">Mark done</button>
                  <input
                    type="date"
                    onChange={e => bulkReassign(e.target.value)}
                    className="h-7 rounded-lg border border-border bg-secondary px-2 text-[11px] outline-none [color-scheme:light]"
                  />
                  <button onClick={() => setSelected(new Set())} className="text-[11px] text-muted-foreground hover:text-foreground">Clear</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Empty state */}
          {data.milestones.length === 0 && (
            <div className="rounded-2xl border border-border bg-card p-10 flex flex-col items-center gap-4 text-center">
              <div className="h-14 w-14 rounded-3xl bg-blue-500/15 flex items-center justify-center">
                <Target className="h-7 w-7 text-blue-600"/>
              </div>
              <div>
                <p className="font-semibold text-base">No milestones yet</p>
                <p className="text-sm text-muted-foreground mt-1">Daily tasks live inside milestones. Head over to Roadmap to set one up.</p>
              </div>
              <Link href="/dashboard/roadmap" className="flex items-center gap-2 rounded-xl bg-blue-500 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-400 transition-colors">
                <Plus className="h-4 w-4"/> Go to Roadmap
              </Link>
            </div>
          )}

          {/* Milestone groups */}
          <div className="flex flex-col gap-3">
            {visibleMilestones.map(m => {
              const goal     = data.goals.find(g => g.id === m.goalId);
              const dream    = goal ? data.dreams.find(d => d.id === goal.dreamId) : null;
              const tasks    = grouped[m.id] || [];
              const progress = milestoneProgress(m.id, data);
              if (tasks.length === 0 && filter !== "All") return null;
              const q = quickAdd[m.id] ?? { description: "", dayLabel: "Day 1", date: today };

              return (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className="rounded-2xl border border-border bg-card overflow-hidden"
                >
                  {/* Group header */}
                  <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/60 bg-gradient-to-r from-blue-500/[0.05] to-transparent">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 flex-shrink-0 rounded-xl bg-blue-500/15 flex items-center justify-center">
                        <Flag className="h-4 w-4 text-blue-700"/>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold truncate">{m.name}</p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {dream && <span>{dream.emoji} {dream.title} · </span>}
                          {goal?.name ?? "—"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className="rounded-full bg-blue-500/15 border border-blue-500/40 text-blue-800 px-2.5 py-0.5 text-[10px] font-bold whitespace-nowrap">
                        {progress.done}/{progress.total}
                      </span>
                      <span className="text-xs font-bold text-foreground/80 w-9 text-right">{progress.pct}%</span>
                    </div>
                  </div>

                  {/* Rows */}
                  <div className="flex flex-col">
                    {tasks.length === 0 && filter === "All" && (
                      <p className="px-5 py-3 text-xs text-muted-foreground italic">No tasks yet — add one below.</p>
                    )}
                    <AnimatePresence>
                      {tasks.map(t => (
                        <motion.div
                          key={t.id}
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          transition={{ duration: 0.2 }}
                          className="group flex items-center gap-3 px-5 py-2.5 border-b border-border/30 last:border-0 hover:bg-secondary/30 transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={selected.has(t.id)}
                            onChange={() => toggleSelect(t.id)}
                            className="h-3.5 w-3.5 accent-blue-500 cursor-pointer opacity-30 group-hover:opacity-100 transition-opacity"
                          />
                          <button
                            onClick={() => check(t.id)}
                            className={`h-5 w-5 flex-shrink-0 rounded-md border-[1.5px] flex items-center justify-center transition-all
                              ${t.done ? "bg-blue-500 border-blue-500" : "border-muted-foreground/40 hover:border-blue-400"}`}
                          >
                            {t.done && <CheckSquare2 className="h-3.5 w-3.5 text-white"/>}
                          </button>
                          <span className="font-mono text-[10px] text-muted-foreground/60 w-16 flex-shrink-0">{t.dayLabel}</span>
                          <span className={`text-sm flex-1 min-w-0 truncate ${t.done ? "line-through text-muted-foreground/50" : ""}`}>{t.description}</span>
                          <span className={`text-[10px] flex-shrink-0 ${t.assignedDate < today && !t.done ? "text-rose-700 font-semibold" : "text-muted-foreground"}`}>
                            {formatTarget(t.assignedDate)}
                          </span>
                          <span className="rounded-full bg-secondary border border-border px-2 py-0.5 text-[9px] font-semibold text-muted-foreground whitespace-nowrap">{m.name}</span>
                          <button
                            onClick={() => remove(t.id)}
                            className="h-6 w-6 rounded-md hover:bg-rose-500/15 flex items-center justify-center text-muted-foreground hover:text-rose-700 transition-all opacity-0 group-hover:opacity-100"
                          ><X className="h-3 w-3"/></button>
                        </motion.div>
                      ))}
                    </AnimatePresence>

                    {/* Quick-add */}
                    <div className="flex items-center gap-2 px-5 py-2.5 bg-background/30 border-t border-border/40">
                      <Plus className="h-3.5 w-3.5 text-blue-600 flex-shrink-0"/>
                      <input
                        value={q.description}
                        onChange={e => updateQuickAdd(m.id, { description: e.target.value })}
                        onKeyDown={e => e.key === "Enter" && addQuickTask(m.id)}
                        placeholder="Quick add task…"
                        className="flex-1 min-w-0 bg-transparent text-xs outline-none placeholder:text-muted-foreground/40"
                      />
                      <input
                        value={q.dayLabel}
                        onChange={e => updateQuickAdd(m.id, { dayLabel: e.target.value })}
                        placeholder="Day 1"
                        className="w-16 h-7 bg-secondary rounded-md px-2 text-[10px] outline-none focus:ring-1 focus:ring-blue-500/40"
                      />
                      <input
                        type="date"
                        value={q.date}
                        onChange={e => updateQuickAdd(m.id, { date: e.target.value })}
                        className="w-32 h-7 bg-secondary rounded-md px-2 text-[10px] outline-none focus:ring-1 focus:ring-blue-500/40 [color-scheme:light]"
                      />
                      <button
                        onClick={() => addQuickTask(m.id)}
                        disabled={!q.description.trim()}
                        className="rounded-md bg-blue-500 px-2.5 py-1 text-[10px] font-semibold text-white hover:bg-blue-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}

            {visibleMilestones.length > 0 && totalVisible === 0 && filter !== "All" && (
              <div className="rounded-2xl border border-border bg-card p-8 flex flex-col items-center gap-3 text-center">
                <AlertCircle className="h-8 w-8 text-muted-foreground/40"/>
                <p className="text-sm font-medium">No tasks match this filter</p>
                <p className="text-xs text-muted-foreground">Try switching to <span className="font-semibold text-foreground">All</span> or adding a task below a milestone.</p>
              </div>
            )}
          </div>
        </div>

        {/* ══ RIGHT: quick tasks + streak + routine + roadmap */}
        <div className="col-span-3 flex flex-col gap-4">

          {/* ── Quick Tasks (compact) ─────────────────────── */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
              <div className="flex items-center gap-2">
                <Inbox className="h-3.5 w-3.5 text-blue-600"/>
                <p className="text-xs font-bold">Quick Tasks</p>
                {quickTasks.filter(t => !t.done).length > 0 && (
                  <span className="rounded-full bg-blue-500/15 px-1.5 py-0.5 text-[9px] font-bold text-blue-700">
                    {quickTasks.filter(t => !t.done).length}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                {(["All","Today"] as const).map(f => (
                  <button key={f} onClick={() => setQtFilter(f)}
                    className={`px-2 py-0.5 rounded-md text-[9px] font-semibold transition-colors
                      ${qtFilter === f ? "bg-blue-500 text-white" : "text-muted-foreground hover:bg-secondary"}`}>
                    {f}
                  </button>
                ))}
                <button onClick={() => setQtOpen(o => !o)}
                  className="h-6 w-6 rounded-lg bg-blue-500 flex items-center justify-center text-white hover:bg-blue-400 transition-colors">
                  <Plus className="h-3 w-3"/>
                </button>
              </div>
            </div>

            {/* Inline add form */}
            <AnimatePresence>
              {qtOpen && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }}
                  className="overflow-hidden border-b border-border/60 bg-secondary/20">
                  <div className="flex flex-col gap-2 px-3 py-2.5">
                    <input autoFocus value={qtForm.title}
                      onChange={e => setQtForm(f => ({ ...f, title: e.target.value }))}
                      onKeyDown={e => e.key === "Enter" && addOneOffTask()}
                      placeholder="Task title…"
                      className="h-8 w-full rounded-lg border border-border bg-input px-2.5 text-xs placeholder:text-muted-foreground/40 outline-none focus:border-blue-500/50 transition-all"/>
                    <div className="grid grid-cols-2 gap-1.5">
                      <input type="date" value={qtForm.date} onChange={e => setQtForm(f => ({ ...f, date: e.target.value }))}
                        className="h-7 rounded-lg border border-border bg-input px-2 text-[10px] outline-none [color-scheme:light] col-span-2"/>
                      <input type="time" value={qtForm.time} onChange={e => setQtForm(f => ({ ...f, time: e.target.value }))}
                        className="h-7 rounded-lg border border-border bg-input px-2 text-[10px] outline-none [color-scheme:light]"/>
                      <select value={qtForm.tag} onChange={e => setQtForm(f => ({ ...f, tag: e.target.value as QuickTaskTag | "" }))}
                        className="h-7 rounded-lg border border-border bg-input px-2 text-[10px] outline-none appearance-none">
                        <option value="">Tag…</option>
                        {(["Meeting","Personal","Work","Health","Errand","Other"] as QuickTaskTag[]).map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                      <select value={qtForm.priority} onChange={e => setQtForm(f => ({ ...f, priority: e.target.value as QuickTaskPriority }))}
                        className="h-7 rounded-lg border border-border bg-input px-2 text-[10px] outline-none appearance-none col-span-2">
                        {(["High","Medium","Low"] as QuickTaskPriority[]).map(p => <option key={p} value={p}>{p} priority</option>)}
                      </select>
                    </div>
                    <div className="flex gap-1.5">
                      <button onClick={addOneOffTask} disabled={!qtForm.title.trim()}
                        className="flex-1 h-7 rounded-lg bg-blue-500 text-[10px] font-semibold text-white hover:bg-blue-400 transition-colors disabled:opacity-40">
                        Add task
                      </button>
                      <button onClick={() => setQtOpen(false)}
                        className="h-7 w-7 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                        <X className="h-3 w-3"/>
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Task rows */}
            <div className="flex flex-col max-h-56 overflow-y-auto">
              {filteredQT.length === 0 ? (
                <div className="py-5 flex flex-col items-center gap-1.5">
                  <Inbox className="h-5 w-5 text-muted-foreground/20"/>
                  <p className="text-[10px] text-muted-foreground text-center">
                    {qtFilter === "Today" ? "No tasks for today." : "No quick tasks yet."}
                  </p>
                </div>
              ) : (
                <AnimatePresence>
                  {filteredQT.map(t => (
                    <motion.div key={t.id}
                      initial={{ opacity: 0, y: -3 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -16 }}
                      transition={{ duration: 0.15 }}
                      className="group flex items-start gap-2 px-3 py-2 border-b border-border/30 last:border-0 hover:bg-secondary/20 transition-colors"
                    >
                      <div className={`mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full ${PRIORITY_COLORS[t.priority]}`}/>
                      <button onClick={() => checkQT(t.id)}
                        className={`mt-0.5 h-4 w-4 flex-shrink-0 rounded border-[1.5px] flex items-center justify-center transition-all
                          ${t.done ? "bg-blue-500 border-blue-500" : "border-muted-foreground/40 hover:border-blue-400"}`}>
                        {t.done && <CheckSquare2 className="h-2.5 w-2.5 text-white"/>}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`text-[11px] leading-tight truncate ${t.done ? "line-through text-muted-foreground/40" : "font-medium"}`}>{t.title}</p>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          {t.time && <span className="text-[9px] text-muted-foreground flex items-center gap-0.5"><Clock className="h-2 w-2"/>{t.time}</span>}
                          <span className={`text-[9px] ${t.date < today && !t.done ? "text-rose-600 font-semibold" : "text-muted-foreground"}`}>{formatTarget(t.date)}</span>
                          {t.tag && <span className={`rounded-full border px-1.5 py-px text-[8px] font-semibold ${TAG_COLORS[t.tag] ?? TAG_COLORS.Other}`}>{t.tag}</span>}
                        </div>
                      </div>
                      <button onClick={() => deleteQT(t.id)}
                        className="mt-0.5 h-5 w-5 rounded flex items-center justify-center text-muted-foreground hover:text-rose-600 transition-colors opacity-0 group-hover:opacity-100">
                        <Trash2 className="h-2.5 w-2.5"/>
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>
          </div>

          {/* Streak panel (compact) */}
          <div className="rounded-2xl border border-border bg-card p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold flex items-center gap-2"><Flame className="h-4 w-4 text-emerald-600"/> Streak</p>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-end gap-1.5">
                <span className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-b from-emerald-500 to-emerald-700 leading-none">{streak.current}</span>
                <span className="text-xs text-muted-foreground pb-1">days</span>
              </div>
              <div className="grid grid-cols-7 gap-0.5">
                {streak.last14.slice(7).map((c, i) => <div key={i} className={`h-3.5 w-3.5 rounded-md ${tileColor(c)}`}/>)}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-1 border-t border-border/50 pt-2">
              {[
                { label: "Current", val: streak.current, color: "text-emerald-600" },
                { label: "Longest", val: streak.longest, color: "text-blue-600" },
                { label: "This wk", val: streak.thisWeek, color: "text-emerald-700" },
              ].map(({ label, val, color }) => (
                <div key={label} className="flex flex-col items-center gap-0.5">
                  <span className={`text-lg font-bold ${color}`}>{val}</span>
                  <span className="text-[9px] text-muted-foreground">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Routine panel ─────────────────────────────── */}
          <div className="rounded-2xl border border-emerald-500/20 bg-card flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/60 bg-emerald-500/5">
              <p className="text-sm font-bold flex items-center gap-2">
                <RefreshCw className="h-3.5 w-3.5 text-emerald-600"/> Today&apos;s Routines
              </p>
              <span className="text-[10px] font-semibold text-emerald-700">{routineDoneCount}/{todayRoutines.length}</span>
            </div>

            {/* Progress bar */}
            {todayRoutines.length > 0 && (
              <div className="h-1 bg-secondary">
                <div
                  className="h-full bg-emerald-500 transition-all duration-500"
                  style={{ width: todayRoutines.length > 0 ? `${(routineDoneCount / todayRoutines.length) * 100}%` : "0%" }}
                />
              </div>
            )}

            {/* Routine rows */}
            <div className="flex flex-col">
              {todayRoutines.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-5 px-4 text-center">
                  <RefreshCw className="h-6 w-6 text-muted-foreground/20"/>
                  <p className="text-[11px] text-muted-foreground">No routines for today.</p>
                  <Link href="/dashboard/routine" className="text-[11px] text-emerald-600 hover:text-emerald-500 font-medium transition-colors">Set up routines →</Link>
                </div>
              ) : (
                todayRoutines.map(r => {
                  const done = isRoutineDone(r.id);
                  const streak2 = routineStreak(routineStore, r);
                  return (
                    <div key={r.id} className={`flex items-center gap-3 px-4 py-2.5 border-b border-border/30 last:border-0 transition-colors ${done ? "bg-emerald-500/[0.04]" : "hover:bg-secondary/30"}`}>
                      <button
                        onClick={() => toggleRoutine(r.id)}
                        className={`h-5 w-5 flex-shrink-0 rounded-full border-[1.5px] flex items-center justify-center transition-all
                          ${done ? "bg-emerald-500 border-emerald-500 text-white" : "border-muted-foreground/30 hover:border-emerald-500"}`}
                      >
                        {done ? <CheckCircle2 className="h-3.5 w-3.5"/> : <Circle className="h-3.5 w-3.5 text-transparent"/>}
                      </button>
                      <div className={`h-2 w-2 flex-shrink-0 rounded-full ${r.color}`}/>
                      <span className={`text-xs flex-1 min-w-0 truncate ${done ? "line-through text-muted-foreground/50" : "font-medium"}`}>{r.name}</span>
                      {streak2 > 0 && (
                        <div className="flex items-center gap-0.5 flex-shrink-0">
                          <Flame className="h-2.5 w-2.5 text-emerald-500"/>
                          <span className="text-[9px] font-bold text-emerald-600">{streak2}</span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {todayRoutines.length > 0 && (
              <div className="px-4 py-2.5 border-t border-border/40">
                <Link href="/dashboard/routine" className="text-[11px] text-emerald-600 hover:text-emerald-500 font-medium transition-colors">
                  Manage routines →
                </Link>
              </div>
            )}
          </div>

          {/* Roadmap summary (compact) */}
          <div className="rounded-2xl border border-border bg-card p-4 flex flex-col gap-2">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Roadmap</p>
            {[
              { icon: Target,       label: "Dreams",      count: data.dreams.length,     color: "text-blue-600" },
              { icon: Trophy,       label: "Goals",       count: data.goals.length,      color: "text-blue-700" },
              { icon: Flag,         label: "Milestones",  count: data.milestones.length, color: "text-blue-700" },
              { icon: CheckSquare2, label: "Daily tasks", count: data.tasks.length,      color: "text-blue-600" },
            ].map(({ icon: Icon, label, count, color }) => (
              <div key={label} className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Icon className={`h-3 w-3 ${color}`}/>
                  <span className="text-xs text-muted-foreground">{label}</span>
                </div>
                <span className="text-xs font-bold">{count}</span>
              </div>
            ))}
            <Link href="/dashboard/roadmap" className="mt-1 rounded-lg bg-secondary py-1.5 text-center text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-500/10 transition-colors">
              Open Roadmap →
            </Link>
          </div>

          {/* Today CTA */}
          <div className="rounded-2xl border border-dashed border-blue-500/20 bg-blue-500/5 p-4 flex items-center gap-3">
            <div className="h-8 w-8 flex-shrink-0 rounded-xl bg-blue-500/15 flex items-center justify-center">
              <CalendarDays className="h-4 w-4 text-blue-600"/>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold">{counts.Today} task{counts.Today !== 1 ? "s" : ""} today</p>
              <button onClick={() => setFilter("Today")} className="text-[10px] text-blue-600 hover:text-blue-500 font-medium transition-colors">Show today →</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
