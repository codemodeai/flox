"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, X, Target, Trophy, Flag, CheckSquare2, Sparkles,
  Calendar as CalIcon, Trash2, ChevronRight, ArrowRight,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatTarget, deadlineStatus } from "@/lib/task-store";
import type { DeadlineStatus } from "@/lib/task-store";
import type { Tables } from "@/lib/supabase/types";

type Dream     = Tables<"dreams">;
type Goal      = Tables<"goals">;
type Milestone = Tables<"milestones">;
type DailyTask = Tables<"daily_tasks">;

function dateISO(d: Date) { return d.toISOString().split("T")[0]; }

function milestoneProgress(msId: string, tasks: DailyTask[]) {
  const ts = tasks.filter(t => t.milestone_id === msId);
  const done = ts.filter(t => t.done).length;
  return { total: ts.length, done, pct: ts.length > 0 ? Math.round((done / ts.length) * 100) : 0 };
}
function goalProgress(goalId: string, milestones: Milestone[], tasks: DailyTask[]) {
  const ms = milestones.filter(m => m.goal_id === goalId);
  const allT = tasks.filter(t => ms.some(m => m.id === t.milestone_id));
  const done = allT.filter(t => t.done).length;
  return { total: allT.length, done, pct: allT.length > 0 ? Math.round((done / allT.length) * 100) : 0 };
}
function dreamProgress(dreamId: string, goals: Goal[], milestones: Milestone[], tasks: DailyTask[]) {
  const gs = goals.filter(g => g.dream_id === dreamId);
  const ms = milestones.filter(m => gs.some(g => g.id === m.goal_id));
  const allT = tasks.filter(t => ms.some(m => m.id === t.milestone_id));
  const done = allT.filter(t => t.done).length;
  return { total: allT.length, done, pct: allT.length > 0 ? Math.round((done / allT.length) * 100) : 0 };
}

/* ── Deadline badge ── */
function DeadlineBadge({ timeframe, target }: { timeframe: string; target: string }) {
  const status = deadlineStatus(target);
  const styles: Record<DeadlineStatus, string> = {
    Normal:  "bg-blue-500/10 text-blue-700 border-blue-500/30",
    Soon:    "bg-amber-500/15 text-amber-700 border-amber-500/40",
    Overdue: "bg-rose-500/15 text-rose-700 border-rose-500/40",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${styles[status]}`}>
      <CalIcon className="h-2.5 w-2.5" />
      {timeframe} · {formatTarget(target)}
    </span>
  );
}

/* ── Progress bar ── */
function ProgressBar({ pct, thin }: { pct: number; thin?: boolean }) {
  return (
    <div className={`w-full rounded-full bg-black/[0.08] overflow-hidden ${thin ? "h-1" : "h-1.5"}`}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-400"
      />
    </div>
  );
}

/* ── Modal ── */
function Modal({ open, onClose, title, icon: Icon, children }: {
  open: boolean; onClose: () => void; title: string;
  icon: React.ComponentType<{ className?: string }>; children: React.ReactNode;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose} className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
            className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[26rem] max-w-[92vw] rounded-2xl border border-border bg-card shadow-2xl p-6 flex flex-col gap-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-blue-500/15 flex items-center justify-center">
                  <Icon className="h-4 w-4 text-blue-600" />
                </div>
                <p className="font-bold text-base">{title}</p>
              </div>
              <button onClick={onClose} className="h-7 w-7 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

const inputClass = "h-10 w-full rounded-xl border border-border bg-secondary px-3 text-sm placeholder:text-muted-foreground/50 outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20 transition-all";
const labelClass = "text-xs font-medium text-muted-foreground";

/* ════════════════════════════════════════════════════════════ */
export default function RoadmapPage() {
  const supabase = createClient();
  const [userId, setUserId] = useState<string | null>(null);

  const [dreams,     setDreams]     = useState<Dream[]>([]);
  const [goals,      setGoals]      = useState<Goal[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [tasks,      setTasks]      = useState<DailyTask[]>([]);
  const [loading,    setLoading]    = useState(true);

  const [activeDreamId,     setActiveDreamId]     = useState<string | null>(null);
  const [activeGoalId,      setActiveGoalId]      = useState<string | null>(null);
  const [activeMilestoneId, setActiveMilestoneId] = useState<string | null>(null);

  const [dreamModal,     setDreamModal]     = useState(false);
  const [goalModal,      setGoalModal]      = useState<{ dreamId: string } | null>(null);
  const [milestoneModal, setMilestoneModal] = useState<{ goalId: string } | null>(null);
  const [taskModal,      setTaskModal]      = useState<{ milestoneId: string } | null>(null);

  const today = dateISO(new Date());
  const [dreamForm,     setDreamForm]     = useState({ title: "", emoji: "🎯", timeframe: "1 year",   targetDate: "" });
  const [goalForm,      setGoalForm]      = useState({ name: "",              timeframe: "3 months", targetDate: "" });
  const [milestoneForm, setMilestoneForm] = useState({ name: "",              timeframe: "1 week",   targetDate: "" });
  const [taskForm,      setTaskForm]      = useState({ description: "", dayLabel: "Day 1", assignedDate: today });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
    });
  }, []);

  useEffect(() => {
    if (!userId) return;
    async function load() {
      setLoading(true);
      const [d, g, m, t] = await Promise.all([
        supabase.from("dreams").select("*").eq("user_id", userId!).order("created_at"),
        supabase.from("goals").select("*").eq("user_id", userId!).order("created_at"),
        supabase.from("milestones").select("*").eq("user_id", userId!).order("created_at"),
        supabase.from("daily_tasks").select("*").eq("user_id", userId!).order("created_at"),
      ]);
      const dreamList = d.data ?? [];
      setDreams(dreamList);
      setGoals(g.data ?? []);
      setMilestones(m.data ?? []);
      setTasks(t.data ?? []);
      if (dreamList.length > 0) setActiveDreamId(id => id ?? dreamList[0].id);
      setLoading(false);
    }
    load();
  }, [userId]);

  useEffect(() => {
    if (!activeDreamId) return;
    const gs = goals.filter(g => g.dream_id === activeDreamId);
    setActiveGoalId(gs[0]?.id ?? null);
    setActiveMilestoneId(null);
  }, [activeDreamId, goals]);

  useEffect(() => {
    if (!activeGoalId) return;
    const ms = milestones.filter(m => m.goal_id === activeGoalId);
    setActiveMilestoneId(ms[0]?.id ?? null);
  }, [activeGoalId, milestones]);

  const overall = useMemo(() => {
    const done = tasks.filter(t => t.done).length;
    return { total: tasks.length, done, pct: tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0 };
  }, [tasks]);

  const activeDream      = dreams.find(d => d.id === activeDreamId) ?? null;
  const activeGoals      = goals.filter(g => g.dream_id === activeDreamId);
  const activeGoal       = activeGoals.find(g => g.id === activeGoalId) ?? null;
  const activeMilestones = milestones.filter(m => m.goal_id === activeGoalId);
  const activeMilestone  = activeMilestones.find(m => m.id === activeMilestoneId) ?? null;
  const activeTasks      = tasks.filter(t => t.milestone_id === activeMilestoneId);

  /* ── Add handlers ── */
  async function addDream() {
    if (!userId || !dreamForm.title.trim() || !dreamForm.targetDate) return;
    const { data, error } = await supabase.from("dreams").insert({
      user_id: userId,
      title: dreamForm.title.trim(),
      emoji: dreamForm.emoji || "🎯",
      timeframe: dreamForm.timeframe,
      target_date: dreamForm.targetDate,
    }).select().single();
    if (error || !data) return;
    setDreams(prev => [...prev, data]);
    setActiveDreamId(data.id);
    setDreamModal(false);
    setDreamForm({ title: "", emoji: "🎯", timeframe: "1 year", targetDate: "" });
  }

  async function addGoal() {
    if (!userId || !goalModal || !goalForm.name.trim() || !goalForm.targetDate) return;
    const { data, error } = await supabase.from("goals").insert({
      user_id: userId,
      dream_id: goalModal.dreamId,
      name: goalForm.name.trim(),
      timeframe: goalForm.timeframe,
      target_date: goalForm.targetDate,
    }).select().single();
    if (error || !data) return;
    setGoals(prev => [...prev, data]);
    setActiveGoalId(data.id);
    setGoalModal(null);
    setGoalForm({ name: "", timeframe: "3 months", targetDate: "" });
  }

  async function addMilestone() {
    if (!userId || !milestoneModal || !milestoneForm.name.trim() || !milestoneForm.targetDate) return;
    const { data, error } = await supabase.from("milestones").insert({
      user_id: userId,
      goal_id: milestoneModal.goalId,
      name: milestoneForm.name.trim(),
      timeframe: milestoneForm.timeframe,
      target_date: milestoneForm.targetDate,
    }).select().single();
    if (error || !data) return;
    setMilestones(prev => [...prev, data]);
    setActiveMilestoneId(data.id);
    setMilestoneModal(null);
    setMilestoneForm({ name: "", timeframe: "1 week", targetDate: "" });
  }

  async function addTask() {
    if (!userId || !taskModal || !taskForm.description.trim() || !taskForm.assignedDate) return;
    const { data, error } = await supabase.from("daily_tasks").insert({
      user_id: userId,
      milestone_id: taskModal.milestoneId,
      description: taskForm.description.trim(),
      day_label: taskForm.dayLabel || "Day 1",
      assigned_date: taskForm.assignedDate,
      done: false,
    }).select().single();
    if (error || !data) return;
    setTasks(prev => [...prev, data]);
    setTaskModal(null);
    setTaskForm({ description: "", dayLabel: "Day 1", assignedDate: today });
  }

  /* ── Delete handlers ── */
  async function deleteDream(id: string) {
    const goalIds = goals.filter(g => g.dream_id === id).map(g => g.id);
    const msIds   = milestones.filter(m => goalIds.includes(m.goal_id)).map(m => m.id);
    await supabase.from("dreams").delete().eq("id", id);
    setDreams(prev => prev.filter(d => d.id !== id));
    setGoals(prev => prev.filter(g => g.dream_id !== id));
    setMilestones(prev => prev.filter(m => !goalIds.includes(m.goal_id)));
    setTasks(prev => prev.filter(t => !msIds.includes(t.milestone_id)));
    const remaining = dreams.filter(d => d.id !== id);
    setActiveDreamId(remaining[0]?.id ?? null);
  }

  async function deleteGoal(id: string) {
    const msIds = milestones.filter(m => m.goal_id === id).map(m => m.id);
    await supabase.from("goals").delete().eq("id", id);
    setGoals(prev => prev.filter(g => g.id !== id));
    setMilestones(prev => prev.filter(m => m.goal_id !== id));
    setTasks(prev => prev.filter(t => !msIds.includes(t.milestone_id)));
    const remaining = activeGoals.filter(g => g.id !== id);
    setActiveGoalId(remaining[0]?.id ?? null);
  }

  async function deleteMilestone(id: string) {
    await supabase.from("milestones").delete().eq("id", id);
    setMilestones(prev => prev.filter(m => m.id !== id));
    setTasks(prev => prev.filter(t => t.milestone_id !== id));
    const remaining = activeMilestones.filter(m => m.id !== id);
    setActiveMilestoneId(remaining[0]?.id ?? null);
  }

  async function deleteTask(id: string) {
    await supabase.from("daily_tasks").delete().eq("id", id);
    setTasks(prev => prev.filter(t => t.id !== id));
  }

  async function checkTask(id: string) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    const done = !task.done;
    await supabase.from("daily_tasks").update({ done, completed_at: done ? new Date().toISOString() : null }).eq("id", id);
    setTasks(prev => prev.map(t => t.id === id ? { ...t, done, completed_at: done ? new Date().toISOString() : null } : t));
  }

  /* ════════════════════════════════════════════════════════ */
  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">

      {/* ── Header ── */}
      <div className="flex items-center justify-between border-b border-border px-6 py-4 flex-shrink-0">
        <div>
          <p className="text-xs text-muted-foreground">{new Date().toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
          <h1 className="text-xl font-bold mt-0.5 flex items-center gap-2"><Target className="h-5 w-5 text-blue-600" />Roadmap</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3.5 py-2">
            <Sparkles className="h-3.5 w-3.5 text-blue-600" />
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60">Overall</span>
              <span className="text-xs font-bold">{overall.done}/{overall.total} · {overall.pct}%</span>
            </div>
            <div className="w-20"><ProgressBar pct={overall.pct} /></div>
          </div>
          <button onClick={() => setDreamModal(true)} className="flex items-center gap-1.5 h-9 rounded-xl bg-blue-500 px-4 text-xs font-semibold text-white hover:bg-blue-400 transition-colors">
            <Plus className="h-4 w-4" /> New dream
          </button>
        </div>
      </div>

      {/* ── Loading ── */}
      {loading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="h-6 w-6 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
        </div>
      )}

      {/* ── Empty state ── */}
      {!loading && dreams.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-4 flex-1 text-center">
          <div className="h-16 w-16 rounded-3xl bg-blue-500/15 flex items-center justify-center">
            <Trophy className="h-8 w-8 text-blue-600" />
          </div>
          <div>
            <p className="font-semibold text-base">Start with a dream</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">Dreams nest goals → milestones → daily tasks you actually do.</p>
          </div>
          <button onClick={() => setDreamModal(true)} className="flex items-center gap-2 rounded-xl bg-blue-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-400 transition-colors">
            <Plus className="h-4 w-4" /> Create your first dream
          </button>
        </div>
      )}

      {!loading && dreams.length > 0 && (
        <div className="flex flex-col flex-1 overflow-hidden">

          {/* ── Dream tabs ── */}
          <div className="flex-shrink-0 flex items-end gap-0 bg-secondary/40 border-b border-border px-4 pt-2 overflow-x-auto">
            {dreams.map(dream => {
              const dp = dreamProgress(dream.id, goals, milestones, tasks);
              const active = dream.id === activeDreamId;
              return (
                <button
                  key={dream.id}
                  onClick={() => setActiveDreamId(dream.id)}
                  className={`group relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all flex-shrink-0 rounded-t-xl border-x border-t
                    ${active
                      ? "bg-background border-border -mb-px z-10 text-foreground shadow-sm"
                      : "bg-transparent border-transparent text-muted-foreground hover:text-foreground hover:bg-background/60"
                    }`}
                >
                  <span className="text-base leading-none">{dream.emoji}</span>
                  <span className="truncate max-w-[140px]">{dream.title}</span>
                  <span className={`text-[10px] font-semibold flex-shrink-0 ${active ? "text-blue-600" : "text-muted-foreground/50"}`}>
                    {dp.pct}%
                  </span>
                  <button
                    onClick={e => { e.stopPropagation(); deleteDream(dream.id); }}
                    className="h-4 w-4 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-rose-500/15 hover:text-rose-600 transition-all ml-0.5"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </button>
              );
            })}
            <button
              onClick={() => setDreamModal(true)}
              className="flex items-center gap-1 px-3 py-2.5 text-xs text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
            >
              <Plus className="h-3.5 w-3.5" /> New
            </button>
          </div>

          {/* ── Goal tabs ── */}
          {activeDream && (
            <div className="flex-shrink-0 flex items-end gap-0 bg-secondary/20 border-b border-border px-4 pt-1.5 overflow-x-auto">
              {activeGoals.map(goal => {
                const gp = goalProgress(goal.id, milestones, tasks);
                const active = goal.id === activeGoalId;
                return (
                  <button
                    key={goal.id}
                    onClick={() => setActiveGoalId(goal.id)}
                    className={`group relative flex items-center gap-2 px-4 py-2 text-xs font-medium transition-all flex-shrink-0 rounded-t-xl border-x border-t
                      ${active
                        ? "bg-background border-border -mb-px z-10 text-foreground shadow-sm"
                        : "bg-transparent border-transparent text-muted-foreground hover:text-foreground hover:bg-background/60"
                      }`}
                  >
                    <Trophy className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate max-w-[120px]">{goal.name}</span>
                    <span className={`text-[9px] font-bold flex-shrink-0 ${active ? "text-blue-600" : "text-muted-foreground/40"}`}>{gp.pct}%</span>
                    <button
                      onClick={e => { e.stopPropagation(); deleteGoal(goal.id); }}
                      className="h-4 w-4 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-rose-500/15 hover:text-rose-600 transition-all"
                    ><X className="h-2.5 w-2.5" /></button>
                  </button>
                );
              })}
              <button
                onClick={() => activeDream && setGoalModal({ dreamId: activeDream.id })}
                className="flex items-center gap-1 px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
              >
                <Plus className="h-3.5 w-3.5" /> Add goal
              </button>
            </div>
          )}

          {/* ── Left + Right panels ── */}
          <div className="flex flex-1 overflow-hidden">

            {/* Left: Milestones */}
            <div className="flex flex-col w-72 flex-shrink-0 border-r border-border overflow-hidden">
              <div className="flex-1 overflow-y-auto p-3">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 px-1 mb-2 pt-1">Milestones</p>

                {activeGoal && activeMilestones.length === 0 && (
                  <p className="text-xs text-muted-foreground italic px-2 py-2">No milestones yet.</p>
                )}

                <div className="flex flex-col gap-1">
                  {activeMilestones.map((m, i) => {
                    const mp = milestoneProgress(m.id, tasks);
                    const active = m.id === activeMilestoneId;
                    return (
                      <motion.div key={m.id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
                        <button
                          onClick={() => setActiveMilestoneId(m.id)}
                          className={`group w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition-all ${active ? "bg-card border border-blue-500/30 shadow-sm" : "hover:bg-secondary/60"}`}
                        >
                          <div className={`h-6 w-6 flex-shrink-0 rounded-md flex items-center justify-center ${active ? "bg-blue-500/15" : "bg-secondary"}`}>
                            <Flag className={`h-3 w-3 ${active ? "text-blue-600" : "text-muted-foreground"}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs font-semibold truncate ${active ? "text-foreground" : "text-muted-foreground"}`}>{m.name}</p>
                            <div className="mt-1"><ProgressBar pct={mp.pct} thin /></div>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <span className="text-[10px] text-muted-foreground">{mp.done}/{mp.total}</span>
                            {active && <ChevronRight className="h-3 w-3 text-blue-500" />}
                            <button
                              onClick={e => { e.stopPropagation(); deleteMilestone(m.id); }}
                              className="h-5 w-5 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 hover:text-rose-600 transition-all"
                            ><Trash2 className="h-3 w-3" /></button>
                          </div>
                        </button>
                      </motion.div>
                    );
                  })}
                </div>

                {activeGoal && (
                  <button
                    onClick={() => activeGoalId && setMilestoneModal({ goalId: activeGoalId })}
                    className="mt-2 flex items-center gap-1.5 w-full rounded-xl border border-dashed border-blue-500/40 px-3 py-2 text-xs text-blue-600 hover:bg-blue-500/10 transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add milestone
                  </button>
                )}
              </div>
            </div>

            {/* Right: Tasks */}
            <div className="flex flex-col flex-1 overflow-hidden">
              {activeMilestone ? (
                <>
                  <div className="flex items-center justify-between border-b border-border px-6 py-4 flex-shrink-0 bg-card/50">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-blue-500/15 flex items-center justify-center flex-shrink-0">
                        <Flag className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-[10px] text-muted-foreground/60 truncate max-w-[120px]">{activeDream?.emoji} {activeDream?.title}</span>
                          <ChevronRight className="h-2.5 w-2.5 text-muted-foreground/40 flex-shrink-0" />
                          <span className="text-[10px] text-muted-foreground/60 truncate max-w-[100px]">{activeGoal?.name}</span>
                          <ChevronRight className="h-2.5 w-2.5 text-muted-foreground/40 flex-shrink-0" />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-semibold uppercase tracking-widest text-blue-600">Milestone</span>
                          <DeadlineBadge timeframe={activeMilestone.timeframe} target={activeMilestone.target_date} />
                        </div>
                        <p className="text-base font-bold leading-tight">{activeMilestone.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {(() => { const mp = milestoneProgress(activeMilestone.id, tasks); return (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{mp.done}/{mp.total} done</span>
                          <div className="w-24"><ProgressBar pct={mp.pct} /></div>
                          <span className="text-sm font-bold text-blue-600">{mp.pct}%</span>
                        </div>
                      ); })()}
                      <button
                        onClick={() => setTaskModal({ milestoneId: activeMilestone.id })}
                        className="flex items-center gap-1.5 h-8 rounded-xl bg-blue-500 px-3 text-xs font-semibold text-white hover:bg-blue-400 transition-colors"
                      >
                        <Plus className="h-3.5 w-3.5" /> Add task
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6">
                    {activeTasks.length === 0 ? (
                      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                        <div className="h-12 w-12 rounded-2xl bg-secondary flex items-center justify-center">
                          <CheckSquare2 className="h-6 w-6 text-muted-foreground/40" />
                        </div>
                        <p className="text-sm font-medium text-muted-foreground">No tasks yet for this milestone</p>
                        <button
                          onClick={() => setTaskModal({ milestoneId: activeMilestone.id })}
                          className="flex items-center gap-1.5 rounded-xl bg-blue-500 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-400 transition-colors"
                        >
                          <Plus className="h-3.5 w-3.5" /> Add first task
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <AnimatePresence>
                          {activeTasks.map((t, i) => (
                            <motion.div
                              key={t.id}
                              initial={{ opacity: 0, x: -8 }}
                              animate={{ opacity: t.done ? 0.5 : 1, x: 0 }}
                              exit={{ opacity: 0, x: 10 }}
                              transition={{ delay: i * 0.04, duration: 0.25 }}
                              className="group flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 hover:border-blue-500/20 hover:bg-card/80 transition-all"
                            >
                              <button
                                onClick={() => checkTask(t.id)}
                                className={`h-5 w-5 flex-shrink-0 rounded-md border-[1.5px] flex items-center justify-center transition-all ${t.done ? "bg-blue-500 border-blue-500" : "border-muted-foreground/30 hover:border-blue-400"}`}
                              >
                                {t.done && <CheckSquare2 className="h-3.5 w-3.5 text-white" />}
                              </button>

                              <span className="font-mono text-[10px] text-muted-foreground/60 w-14 flex-shrink-0 bg-secondary rounded-md px-1.5 py-0.5 text-center">
                                {t.day_label}
                              </span>

                              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/30 flex-shrink-0" />

                              <span className={`text-sm flex-1 min-w-0 truncate ${t.done ? "line-through text-muted-foreground/50" : ""}`}>
                                {t.description}
                              </span>

                              <span className="text-[10px] text-muted-foreground/60 flex-shrink-0">
                                {formatTarget(t.assigned_date)}
                              </span>

                              <button
                                onClick={() => deleteTask(t.id)}
                                className="h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 transition-all opacity-0 group-hover:opacity-100"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center gap-3 flex-1 text-center text-muted-foreground">
                  <Flag className="h-10 w-10 opacity-20" />
                  <p className="text-sm">Select a milestone to see its tasks</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Modals ── */}
      <Modal open={dreamModal} onClose={() => setDreamModal(false)} title="New dream" icon={Target}>
        <div className="grid grid-cols-[5rem_1fr] gap-3">
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Emoji</label>
            <input value={dreamForm.emoji} onChange={e => setDreamForm(f => ({ ...f, emoji: e.target.value }))} className={`${inputClass} text-center text-2xl`} maxLength={4} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Title *</label>
            <input autoFocus value={dreamForm.title} onChange={e => setDreamForm(f => ({ ...f, title: e.target.value }))} placeholder="₹1 Crore Revenue" className={inputClass} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Timeframe</label>
            <input value={dreamForm.timeframe} onChange={e => setDreamForm(f => ({ ...f, timeframe: e.target.value }))} placeholder="2 years" className={inputClass} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Target date *</label>
            <input type="date" value={dreamForm.targetDate} onChange={e => setDreamForm(f => ({ ...f, targetDate: e.target.value }))} className={`${inputClass} [color-scheme:light]`} />
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          <button onClick={() => setDreamModal(false)} className="flex-1 h-10 rounded-xl border border-border bg-secondary text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
          <button onClick={addDream} disabled={!dreamForm.title.trim() || !dreamForm.targetDate} className="flex-1 h-10 rounded-xl bg-blue-500 text-sm font-semibold text-white hover:bg-blue-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Save dream</button>
        </div>
      </Modal>

      <Modal open={!!goalModal} onClose={() => setGoalModal(null)} title="New goal" icon={Trophy}>
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Goal name *</label>
          <input autoFocus value={goalForm.name} onChange={e => setGoalForm(f => ({ ...f, name: e.target.value }))} placeholder="Skill learning" className={inputClass} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Timeframe</label>
            <input value={goalForm.timeframe} onChange={e => setGoalForm(f => ({ ...f, timeframe: e.target.value }))} placeholder="3 months" className={inputClass} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Target date *</label>
            <input type="date" value={goalForm.targetDate} onChange={e => setGoalForm(f => ({ ...f, targetDate: e.target.value }))} className={`${inputClass} [color-scheme:light]`} />
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          <button onClick={() => setGoalModal(null)} className="flex-1 h-10 rounded-xl border border-border bg-secondary text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
          <button onClick={addGoal} disabled={!goalForm.name.trim() || !goalForm.targetDate} className="flex-1 h-10 rounded-xl bg-blue-500 text-sm font-semibold text-white hover:bg-blue-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Save goal</button>
        </div>
      </Modal>

      <Modal open={!!milestoneModal} onClose={() => setMilestoneModal(null)} title="New milestone" icon={Flag}>
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Milestone name *</label>
          <input autoFocus value={milestoneForm.name} onChange={e => setMilestoneForm(f => ({ ...f, name: e.target.value }))} placeholder="Research the skill" className={inputClass} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Timeframe</label>
            <input value={milestoneForm.timeframe} onChange={e => setMilestoneForm(f => ({ ...f, timeframe: e.target.value }))} placeholder="1 week" className={inputClass} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Target date *</label>
            <input type="date" value={milestoneForm.targetDate} onChange={e => setMilestoneForm(f => ({ ...f, targetDate: e.target.value }))} className={`${inputClass} [color-scheme:light]`} />
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          <button onClick={() => setMilestoneModal(null)} className="flex-1 h-10 rounded-xl border border-border bg-secondary text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
          <button onClick={addMilestone} disabled={!milestoneForm.name.trim() || !milestoneForm.targetDate} className="flex-1 h-10 rounded-xl bg-blue-500 text-sm font-semibold text-white hover:bg-blue-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Save milestone</button>
        </div>
      </Modal>

      <Modal open={!!taskModal} onClose={() => setTaskModal(null)} title="New daily task" icon={CheckSquare2}>
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Task description *</label>
          <input autoFocus value={taskForm.description} onChange={e => setTaskForm(f => ({ ...f, description: e.target.value }))} onKeyDown={e => e.key === "Enter" && addTask()} placeholder="Search for in-demand skills online" className={inputClass} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Day label</label>
            <input value={taskForm.dayLabel} onChange={e => setTaskForm(f => ({ ...f, dayLabel: e.target.value }))} placeholder="Day 1" className={inputClass} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Assigned date *</label>
            <input type="date" value={taskForm.assignedDate} onChange={e => setTaskForm(f => ({ ...f, assignedDate: e.target.value }))} className={`${inputClass} [color-scheme:light]`} />
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          <button onClick={() => setTaskModal(null)} className="flex-1 h-10 rounded-xl border border-border bg-secondary text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
          <button onClick={addTask} disabled={!taskForm.description.trim() || !taskForm.assignedDate} className="flex-1 h-10 rounded-xl bg-blue-500 text-sm font-semibold text-white hover:bg-blue-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Save task</button>
        </div>
      </Modal>
    </div>
  );
}
