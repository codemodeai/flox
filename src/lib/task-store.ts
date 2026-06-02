/* ════════════════════════════════════════════════════════════
   FLOX — Goal Hierarchy Store
   Dream → Goal → Milestone → Daily Task
   ════════════════════════════════════════════════════════════ */

export interface Dream {
  id: string;
  title: string;        // "₹1 Crore Revenue"
  emoji: string;        // "💰"
  timeframe: string;    // "1 year", "2 years"
  targetDate: string;   // "YYYY-MM-DD"
  createdAt: string;
}

export interface Goal {
  id: string;
  dreamId: string;
  name: string;         // "Skill learning"
  timeframe: string;    // "3 months"
  targetDate: string;   // "YYYY-MM-DD"
}

export interface Milestone {
  id: string;
  goalId: string;
  name: string;         // "Research the skill"
  timeframe: string;    // "1 week"
  targetDate: string;   // "YYYY-MM-DD"
}

export interface DailyTask {
  id: string;
  milestoneId: string;
  description: string;  // "Search for in-demand skills online"
  dayLabel: string;     // "Day 1", "Week 2", "Days 2–7"
  assignedDate: string; // "YYYY-MM-DD"
  done: boolean;
  completedAt?: string; // "YYYY-MM-DD"
}

export interface RoadmapData {
  dreams: Dream[];
  goals: Goal[];
  milestones: Milestone[];
  tasks: DailyTask[];
}

/* ── persistence ──────────────────────────────────────────── */
const KEY = "flox_roadmap_v1";
const EVENT = "flox-roadmap-updated";

/* One-time migration: wipe seed data that was auto-loaded in earlier builds.
   Bump CLEAR_VERSION whenever you want to force a fresh wipe. */
const CLEAR_VERSION = "flox_cleared_v2";
export function clearSeedDataOnce(): void {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(CLEAR_VERSION)) return;
  localStorage.removeItem(KEY);
  localStorage.removeItem("flox_routines_v1");
  localStorage.removeItem("flox_quick_tasks_v1");
  localStorage.setItem(CLEAR_VERSION, "1");
}

export function dateISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export function parseISO(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

/* ── seed (illustrative — only used when storage is empty) ── */
function seed(): RoadmapData {
  const today = new Date();
  const inDays = (n: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + n);
    return dateISO(d);
  };

  const dreamId = uid();
  const goalId = uid();
  const m1 = uid(), m2 = uid(), m3 = uid();

  const dreams: Dream[] = [
    {
      id: dreamId,
      title: "₹1 Crore Revenue",
      emoji: "💰",
      timeframe: "2 years",
      targetDate: inDays(730),
      createdAt: dateISO(today),
    },
  ];
  const goals: Goal[] = [
    { id: goalId, dreamId, name: "Skill learning", timeframe: "3 months", targetDate: inDays(90) },
  ];
  const milestones: Milestone[] = [
    { id: m1, goalId, name: "Research the skill",       timeframe: "1 week",  targetDate: inDays(7)  },
    { id: m2, goalId, name: "Learn the skill",          timeframe: "7 weeks", targetDate: inDays(56) },
    { id: m3, goalId, name: "Demo work and portfolio",  timeframe: "4 weeks", targetDate: inDays(84) },
  ];
  const tasks: DailyTask[] = [
    { id: uid(), milestoneId: m1, description: "Search for in-demand skills online",      dayLabel: "Day 1", assignedDate: inDays(0), done: false },
    { id: uid(), milestoneId: m1, description: "Compare 3 skills and rank them",          dayLabel: "Day 2", assignedDate: inDays(1), done: false },
    { id: uid(), milestoneId: m1, description: "Research demand and salary for top skill", dayLabel: "Day 3", assignedDate: inDays(2), done: false },
    { id: uid(), milestoneId: m1, description: "Find 3 learning resources / courses",     dayLabel: "Day 4", assignedDate: inDays(3), done: false },
    { id: uid(), milestoneId: m2, description: "Enroll in course and complete module 1",  dayLabel: "Day 1", assignedDate: inDays(7), done: false },
    { id: uid(), milestoneId: m2, description: "Practice with small exercises daily",     dayLabel: "Days 2–7", assignedDate: inDays(8), done: false },
    { id: uid(), milestoneId: m2, description: "Build a small test project",              dayLabel: "Week 2", assignedDate: inDays(14), done: false },
    { id: uid(), milestoneId: m3, description: "Complete 1 full portfolio project",       dayLabel: "Week 1", assignedDate: inDays(60), done: false },
    { id: uid(), milestoneId: m3, description: "Write a case study",                      dayLabel: "Week 2", assignedDate: inDays(67), done: false },
    { id: uid(), milestoneId: m3, description: "Publish portfolio on website or Behance", dayLabel: "Week 3", assignedDate: inDays(74), done: false },
  ];
  return { dreams, goals, milestones, tasks };
}

export function loadRoadmap(): RoadmapData {
  if (typeof window === "undefined") return { dreams: [], goals: [], milestones: [], tasks: [] };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { dreams: [], goals: [], milestones: [], tasks: [] };
    return JSON.parse(raw) as RoadmapData;
  } catch {
    return { dreams: [], goals: [], milestones: [], tasks: [] };
  }
}

export function saveRoadmap(data: RoadmapData): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
    window.dispatchEvent(new CustomEvent(EVENT));
  } catch {}
}

/* ── ID generator (exported for use in pages) ─────────────── */
export const newId = uid;

/* ── progress rollup ──────────────────────────────────────── */
export function milestoneProgress(milestoneId: string, data: RoadmapData) {
  const ts = data.tasks.filter(t => t.milestoneId === milestoneId);
  if (ts.length === 0) return { done: 0, total: 0, pct: 0 };
  const done = ts.filter(t => t.done).length;
  return { done, total: ts.length, pct: Math.round((done / ts.length) * 100) };
}

export function goalProgress(goalId: string, data: RoadmapData) {
  const ms = data.milestones.filter(m => m.goalId === goalId);
  const totals = ms.map(m => milestoneProgress(m.id, data));
  const done  = totals.reduce((a, t) => a + t.done,  0);
  const total = totals.reduce((a, t) => a + t.total, 0);
  return { done, total, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
}

export function dreamProgress(dreamId: string, data: RoadmapData) {
  const gs = data.goals.filter(g => g.dreamId === dreamId);
  const totals = gs.map(g => goalProgress(g.id, data));
  const done  = totals.reduce((a, t) => a + t.done,  0);
  const total = totals.reduce((a, t) => a + t.total, 0);
  return { done, total, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
}

/* ── deadline status ──────────────────────────────────────── */
export type DeadlineStatus = "Normal" | "Soon" | "Overdue";

export function deadlineStatus(targetISO: string, today = new Date()): DeadlineStatus {
  const target = parseISO(targetISO);
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86400000);
  if (diffDays < 0) return "Overdue";
  if (diffDays <= 7) return "Soon";
  return "Normal";
}

export function formatTarget(targetISO: string): string {
  return parseISO(targetISO).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
}

/* ── mutations ────────────────────────────────────────────── */
export function toggleTaskDone(taskId: string, data: RoadmapData): RoadmapData {
  return {
    ...data,
    tasks: data.tasks.map(t => {
      if (t.id !== taskId) return t;
      const done = !t.done;
      return { ...t, done, completedAt: done ? dateISO(new Date()) : undefined };
    }),
  };
}

/* ════════════════════════════════════════════════════════════
   ROUTINE STORE  (separate from Dream hierarchy)
   ════════════════════════════════════════════════════════════ */

export interface Routine {
  id: string;
  name: string;
  description?: string;
  color: string;        // tailwind bg-* class e.g. "bg-blue-500"
  time?: string;        // "07:00" optional
  daysOfWeek: number[]; // 0=Sun … 6=Sat; empty array = every day
  createdAt: string;
}

export interface RoutineLog {
  id?: string;
  routineId: string;
  date: string;  // YYYY-MM-DD
  done: boolean;
}

export interface RoutineStore {
  routines: Routine[];
  logs: RoutineLog[];
}

const ROUTINE_KEY   = "flox_routines_v1";
const ROUTINE_EVENT = "flox-routines-updated";

export function loadRoutines(): RoutineStore {
  if (typeof window === "undefined") return { routines: [], logs: [] };
  try {
    const raw = localStorage.getItem(ROUTINE_KEY);
    if (!raw) return { routines: [], logs: [] };
    return JSON.parse(raw) as RoutineStore;
  } catch { return { routines: [], logs: [] }; }
}

export function saveRoutines(store: RoutineStore): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ROUTINE_KEY, JSON.stringify(store));
    window.dispatchEvent(new CustomEvent(ROUTINE_EVENT));
  } catch {}
}

export function isRoutineActiveOn(r: Routine, date: Date): boolean {
  if (r.daysOfWeek.length === 0) return true;
  return r.daysOfWeek.includes(date.getDay());
}

export function getRoutineLog(store: RoutineStore, routineId: string, date: string): RoutineLog | undefined {
  return store.logs.find(l => l.routineId === routineId && l.date === date);
}

export function toggleRoutineLog(store: RoutineStore, routineId: string, date: string): RoutineStore {
  const existing = getRoutineLog(store, routineId, date);
  if (existing) {
    return { ...store, logs: store.logs.map(l => l.routineId === routineId && l.date === date ? { ...l, done: !l.done } : l) };
  }
  return { ...store, logs: [...store.logs, { routineId, date, done: true }] };
}

export function routineStreak(store: RoutineStore, routine: Routine): number {
  const today = new Date();
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date(today); d.setDate(today.getDate() - i);
    if (!isRoutineActiveOn(routine, d)) continue;
    const log = getRoutineLog(store, routine.id, dateISO(d));
    if (log?.done) streak++;
    else if (i > 0) break; // allow today to be incomplete
  }
  return streak;
}

/* ════════════════════════════════════════════════════════════
   QUICK TASK STORE  (one-off tasks, not tied to the hierarchy)
   ════════════════════════════════════════════════════════════ */

export type QuickTaskTag = "Meeting" | "Personal" | "Work" | "Health" | "Errand" | "Other";
export type QuickTaskPriority = "Low" | "Medium" | "High";

export interface QuickTask {
  id: string;
  title: string;
  date: string;                  // YYYY-MM-DD
  time?: string;                 // "14:00" optional
  tag?: QuickTaskTag;
  priority: QuickTaskPriority;
  done: boolean;
  completedAt?: string;
  createdAt: string;
}

const QT_KEY   = "flox_quick_tasks_v1";
const QT_EVENT = "flox-quick-tasks-updated";

export function loadQuickTasks(): QuickTask[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(QT_KEY);
    return raw ? (JSON.parse(raw) as QuickTask[]) : [];
  } catch { return []; }
}

export function saveQuickTasks(tasks: QuickTask[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(QT_KEY, JSON.stringify(tasks));
    window.dispatchEvent(new CustomEvent(QT_EVENT));
  } catch {}
}

export function toggleQuickTaskDone(id: string, tasks: QuickTask[]): QuickTask[] {
  return tasks.map(t => {
    if (t.id !== id) return t;
    const done = !t.done;
    return { ...t, done, completedAt: done ? dateISO(new Date()) : undefined };
  });
}
