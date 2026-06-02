"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft, ChevronRight, Plus, X, Clock, Tag, Trash2,
  CheckSquare2, Target,
} from "lucide-react";
import { dateISO, isRoutineActiveOn } from "@/lib/task-store";
import type { RoadmapData, DailyTask, RoutineStore, QuickTask } from "@/lib/task-store";
import { createClient } from "@/lib/supabase/client";

/* ─── types ─────────────────────────────────────────────── */
interface CalEvent {
  id: string;
  title: string;
  date: string;
  startHour: number;
  startMin: number;
  endHour: number;
  endMin: number;
  color: string;
  tag?: string;
  description?: string;
}

/* ─── constants ─────────────────────────────────────────── */
const CELL_H    = 72;
const HOURS     = Array.from({ length: 16 }, (_, i) => i + 6);
const DAYS_FULL = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const DAYS_SH   = ["SUN","MON","TUE","WED","THU","FRI","SAT"];
const MONTHS    = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const COLORS    = [
  { bg: "bg-blue-500",    label: "Blue"   },
  { bg: "bg-blue-500",  label: "Violet" },
  { bg: "bg-blue-500",    label: "Teal"   },
  { bg: "bg-emerald-500", label: "Green"  },
  { bg: "bg-rose-500",    label: "Red"    },
  { bg: "bg-emerald-400",  label: "Orange" },
  { bg: "bg-rose-400",   label: "Yellow" },
  { bg: "bg-blue-500",    label: "Pink"   },
];
const TAGS = ["Content","Meeting","Design","Review","Personal","Task","Collab"];

/* ─── helpers ───────────────────────────────────────────── */
function parseDate(s: string) { const [y,m,d] = s.split("-").map(Number); return new Date(y, m-1, d); }
function fmtTime(h: number, m: number) {
  const ap = h < 12 ? "am" : "pm";
  const hh = h === 0 ? 12 : h > 12 ? h-12 : h;
  return `${hh}:${String(m).padStart(2,"0")}${ap}`;
}
function evTop(e: CalEvent)    { return ((e.startHour - HOURS[0]) + e.startMin/60) * CELL_H; }
function evHeight(e: CalEvent) { return Math.max(((e.endHour + e.endMin/60) - (e.startHour + e.startMin/60)) * CELL_H, 26); }
function weekStart(d: Date)    { const s = new Date(d); s.setDate(d.getDate()-d.getDay()); return s; }
function calDays(year: number, month: number) {
  return { first: new Date(year,month,1).getDay(), total: new Date(year,month+1,0).getDate() };
}
function uid() { return Math.random().toString(36).slice(2,9); }

const EMPTY = { title:"", date: dateISO(new Date()), startHour:9, startMin:0, endHour:10, endMin:0, color:"bg-blue-500", tag:"", description:"" };

/* ════════════════════════════════════════════════════════════ */
export default function CalendarPage() {
  const supabase = createClient();
  const [userId, setUserId] = useState<string | null>(null);
  const today = useMemo(() => new Date(), []);

  const [events,    setEvents]    = useState<CalEvent[]>([]);
  const [roadmap,   setRoadmap]   = useState<RoadmapData>({ dreams: [], goals: [], milestones: [], tasks: [] });
  const [routines,  setRoutines]  = useState<RoutineStore>({ routines: [], logs: [] });
  const [quickTasks, setQuickTasks] = useState<QuickTask[]>([]);
  const [view,      setView]      = useState<"Month"|"Week"|"Day">("Week");
  const [selDate,   setSelDate]   = useState(today);
  const [miniYear,  setMiniYear]  = useState(today.getFullYear());
  const [miniMonth, setMiniMonth] = useState(today.getMonth());
  const [focusEv,   setFocusEv]   = useState<CalEvent|null>(null);
  const [taskPanel, setTaskPanel] = useState<Date|null>(null);
  const [showAdd,   setShowAdd]   = useState(false);
  const [form,      setForm]      = useState({...EMPTY});

  useEffect(() => {
    supabase.auth.getUser().then(({ data: d }) => { if (d.user) setUserId(d.user.id); });
  }, []);

  useEffect(() => {
    if (!userId) return;
    async function load() {
      const [mr, tr, rr, lr, qr, er] = await Promise.all([
        supabase.from("milestones").select("*").eq("user_id", userId!),
        supabase.from("daily_tasks").select("*").eq("user_id", userId!),
        supabase.from("routines").select("*").eq("user_id", userId!),
        supabase.from("routine_logs").select("*").eq("user_id", userId!),
        supabase.from("quick_tasks").select("*").eq("user_id", userId!),
        supabase.from("cal_events").select("*").eq("user_id", userId!),
      ]);
      setRoadmap({
        dreams: [], goals: [],
        milestones: (mr.data ?? []).map(m => ({ id: m.id, goalId: m.goal_id, name: m.name, timeframe: m.timeframe, targetDate: m.target_date })),
        tasks: (tr.data ?? []).map(t => ({ id: t.id, milestoneId: t.milestone_id, description: t.description, dayLabel: t.day_label, assignedDate: t.assigned_date, done: t.done, completedAt: t.completed_at ?? undefined })),
      });
      setRoutines({
        routines: (rr.data ?? []).map(r => ({ id: r.id, name: r.name, color: r.color, daysOfWeek: r.days_of_week, description: r.description ?? undefined, time: r.time ?? undefined, createdAt: r.created_at })),
        logs: (lr.data ?? []).map(l => ({ id: l.id, routineId: l.routine_id, date: l.date, done: l.done })),
      });
      setQuickTasks((qr.data ?? []).map(q => ({
        id: q.id, title: q.title, date: q.date, time: q.time ?? undefined,
        tag: q.tag as any, priority: q.priority as any, done: q.done, createdAt: q.created_at,
      })));
      setEvents((er.data ?? []).map(e => ({
        id: e.id, title: e.title, date: e.date,
        startHour: e.start_hour, startMin: e.start_min,
        endHour: e.end_hour, endMin: e.end_min,
        color: e.color, tag: e.tag ?? undefined, description: e.description ?? undefined,
      })));
    }
    load();
  }, [userId]);

  function tasksOnDate(d: Date): DailyTask[] {
    const s = dateISO(d);
    return roadmap.tasks.filter(t => t.assignedDate === s);
  }
  function milestoneLabel(t: DailyTask): string {
    const m = roadmap.milestones.find(x => x.id === t.milestoneId);
    return m?.name ?? "—";
  }
  async function checkTask(id: string) {
    const task = roadmap.tasks.find(t => t.id === id); if (!task) return;
    const done = !task.done;
    await supabase.from("daily_tasks").update({ done, completed_at: done ? new Date().toISOString() : null }).eq("id", id);
    setRoadmap(r => ({ ...r, tasks: r.tasks.map(t => t.id === id ? { ...t, done } : t) }));
  }

  function routinesOnDate(d: Date) {
    return routines.routines.filter(r => isRoutineActiveOn(r, d));
  }
  function isRoutineDone(routineId: string, d: Date) {
    const iso = dateISO(d);
    return routines.logs.find(l => l.routineId === routineId && l.date === iso)?.done ?? false;
  }
  async function checkRoutine(routineId: string, d: Date) {
    if (!userId) return;
    const iso = dateISO(d);
    const existing = routines.logs.find(l => l.routineId === routineId && l.date === iso);
    if (existing) {
      const done = !existing.done;
      await supabase.from("routine_logs").update({ done }).eq("id", existing.id!);
      setRoutines(s => ({ ...s, logs: s.logs.map(l => l.id === existing.id ? { ...l, done } : l) }));
    } else {
      const { data: row } = await supabase.from("routine_logs").insert({ user_id: userId, routine_id: routineId, date: iso, done: true }).select().single();
      if (row) setRoutines(s => ({ ...s, logs: [...s.logs, { id: row.id, routineId: row.routine_id, date: row.date, done: row.done }] }));
    }
  }

  function quickTasksOnDate(d: Date): QuickTask[] {
    return quickTasks.filter(t => t.date === dateISO(d)).sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""));
  }
  async function checkQT(id: string) {
    const qt = quickTasks.find(t => t.id === id); if (!qt) return;
    const done = !qt.done;
    await supabase.from("quick_tasks").update({ done, completed_at: done ? new Date().toISOString() : null }).eq("id", id);
    setQuickTasks(prev => prev.map(t => t.id === id ? { ...t, done } : t));
  }

  const QT_TAG_COLOR: Record<string, string> = {
    Meeting: "bg-blue-500",
    Personal: "bg-violet-500",
    Work: "bg-amber-500",
    Health: "bg-emerald-500",
    Errand: "bg-rose-500",
    Other: "bg-neutral-400",
  };

  /* derived */
  const ws       = weekStart(selDate);
  const weekDays = Array.from({length:7},(_,i)=>{ const d=new Date(ws); d.setDate(ws.getDate()+i); return d; });
  const { first:miniFirst, total:miniTotal } = calDays(miniYear, miniMonth);
  const miniCells = [...Array(miniFirst).fill(null), ...Array.from({length:miniTotal},(_,i)=>i+1)] as (number|null)[];

  function onDate(d: Date): CalEvent[] {
    const s = dateISO(d);
    return events.filter(e=>e.date===s).sort((a,b)=>a.startHour-b.startHour||a.startMin-b.startMin);
  }

  function openAdd(dateStr?: string) { setForm({...EMPTY, date: dateStr ?? dateISO(selDate)}); setShowAdd(true); }
  async function saveEvent() {
    if (!form.title.trim() || !userId) return;
    const { data } = await supabase.from("cal_events").insert({
      user_id: userId, title: form.title, date: form.date,
      start_hour: form.startHour, start_min: form.startMin,
      end_hour: form.endHour, end_min: form.endMin,
      color: form.color, tag: form.tag || null, description: form.description || null,
    }).select().single();
    if (data) setEvents(prev => [...prev, {
      id: data.id, title: data.title, date: data.date,
      startHour: data.start_hour, startMin: data.start_min,
      endHour: data.end_hour, endMin: data.end_min,
      color: data.color, tag: data.tag ?? undefined, description: data.description ?? undefined,
    }]);
    setShowAdd(false); setForm({...EMPTY});
  }
  async function deleteEvent(id:string) {
    await supabase.from("cal_events").delete().eq("id", id);
    setEvents(prev=>prev.filter(e=>e.id!==id)); setFocusEv(null);
  }

  function nav(dir:1|-1) {
    const d = new Date(selDate);
    if (view==="Month") d.setMonth(d.getMonth()+dir);
    else if (view==="Week") d.setDate(d.getDate()+dir*7);
    else d.setDate(d.getDate()+dir);
    setSelDate(d);
  }
  function viewTitle() {
    if (view==="Month") return `${MONTHS[selDate.getMonth()]} ${selDate.getFullYear()}`;
    if (view==="Week") {
      const e=weekDays[6];
      return weekDays[0].getMonth()===e.getMonth()
        ? `${MONTHS[weekDays[0].getMonth()]} ${weekDays[0].getFullYear()}`
        : `${MONTHS[weekDays[0].getMonth()].slice(0,3)} – ${MONTHS[e.getMonth()].slice(0,3)} ${e.getFullYear()}`;
    }
    return `${DAYS_FULL[selDate.getDay()]}, ${MONTHS[selDate.getMonth()]} ${selDate.getDate()} ${selDate.getFullYear()}`;
  }

  const { first:mFirst, total:mTotal } = calDays(selDate.getFullYear(), selDate.getMonth());
  const mCells = [...Array(mFirst).fill(null), ...Array.from({length:mTotal},(_,i)=>i+1)] as (number|null)[];
  while (mCells.length % 7 !== 0) mCells.push(null);

  /* ════════════════════════════════════════════════════════ */
  return (
    <div className="flex h-full overflow-hidden bg-background">

      {/* ── LEFT PANEL ───────────────────────────────────── */}
      <aside className="w-56 flex-shrink-0 border-r border-border flex flex-col bg-card/40 overflow-y-auto">
        <div className="p-3 border-b border-border flex flex-col gap-2">
          <button onClick={()=>openAdd()} className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-500 py-2.5 text-sm font-semibold text-white hover:bg-blue-400 transition-colors">
            <Plus className="h-4 w-4"/> New event
          </button>
          <Link href="/dashboard/roadmap" className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-secondary py-2 text-sm font-medium text-foreground hover:bg-card hover:border-blue-500/30 transition-colors">
            <Target className="h-4 w-4 text-blue-600"/> Add task in Roadmap
          </Link>
        </div>

        {/* Mini calendar */}
        <div className="p-3 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold">{MONTHS[miniMonth].slice(0,3)} {miniYear}</span>
            <div className="flex gap-0.5">
              <button onClick={()=>{ if(miniMonth===0){setMiniMonth(11);setMiniYear(y=>y-1);}else setMiniMonth(m=>m-1); }} className="h-5 w-5 rounded-lg hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"><ChevronLeft className="h-3 w-3"/></button>
              <button onClick={()=>{ if(miniMonth===11){setMiniMonth(0);setMiniYear(y=>y+1);}else setMiniMonth(m=>m+1); }} className="h-5 w-5 rounded-lg hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"><ChevronRight className="h-3 w-3"/></button>
            </div>
          </div>
          <div className="grid grid-cols-7 mb-1">
            {["S","M","T","W","T","F","S"].map((d,i)=>(
              <div key={i} className="text-center text-[9px] font-semibold text-muted-foreground/60 py-0.5">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-y-0.5">
            {miniCells.map((day,i)=>{
              if (!day) return <div key={i} className="h-6 w-6"/>;
              const d   = new Date(miniYear, miniMonth, day);
              const ds  = dateISO(d);
              const isT = d.toDateString()===today.toDateString();
              const isS = d.toDateString()===selDate.toDateString();
              const hasE= events.some(e=>e.date===ds);
              const hasT= roadmap.tasks.some(t=>t.assignedDate===ds);
              return (
                <div key={i} className="flex items-center justify-center">
                  <button
                    onClick={()=>{ setSelDate(new Date(miniYear,miniMonth,day)); setView("Day"); }}
                    className={`relative h-6 w-6 rounded-full text-[11px] font-medium transition-all flex items-center justify-center
                      ${isS?"bg-blue-500 text-white":isT?"ring-1 ring-blue-500 text-blue-600":"text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
                  >
                    {day}
                    {!isS && (hasE || hasT) && (
                      <span className="absolute bottom-0 left-1/2 -translate-x-1/2 flex gap-0.5">
                        {hasE && <span className="h-1 w-1 rounded-full bg-blue-400"/>}
                        {hasT && <span className="h-1 w-1 rounded-full bg-blue-400"/>}
                      </span>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Upcoming */}
        <div className="flex-1 p-3 overflow-y-auto">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-2">Upcoming</p>
          {events.length===0 && roadmap.tasks.filter(t=>!t.done).length===0 ? (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <div className="h-8 w-8 rounded-xl bg-secondary flex items-center justify-center"><Clock className="h-4 w-4 text-muted-foreground"/></div>
              <p className="text-[11px] text-muted-foreground">No upcoming items.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {[...events].sort((a,b)=>a.date.localeCompare(b.date)||a.startHour-b.startHour).slice(0,5).map(ev=>(
                <button key={ev.id} onClick={()=>setFocusEv(ev)} className="flex items-start gap-2 rounded-xl p-2 text-left hover:bg-secondary transition-colors">
                  <div className={`mt-0.5 h-2 w-2 flex-shrink-0 rounded-full ${ev.color}`}/>
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium truncate">{ev.title}</p>
                    <p className="text-[10px] text-muted-foreground">{parseDate(ev.date).toLocaleDateString("en-US",{month:"short",day:"numeric"})} · {fmtTime(ev.startHour,ev.startMin)}</p>
                  </div>
                </button>
              ))}
              {roadmap.tasks.filter(t=>!t.done).sort((a,b)=>a.assignedDate.localeCompare(b.assignedDate)).slice(0,6).map(t=>(
                <button
                  key={t.id}
                  onClick={() => { const d = parseDate(t.assignedDate); setSelDate(d); setTaskPanel(d); }}
                  className="flex items-start gap-2 rounded-xl p-2 hover:bg-secondary transition-colors text-left"
                >
                  <CheckSquare2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-blue-700"/>
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium truncate">{t.description}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{t.dayLabel} · {milestoneLabel(t)}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </aside>

      {/* ── MAIN ─────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-2.5 flex-shrink-0">
          <h2 className="text-sm font-bold">{viewTitle()}</h2>
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-xl border border-border bg-secondary p-0.5">
              {(["Month","Week","Day"] as const).map(v=>(
                <button key={v} onClick={()=>setView(v)} className={`rounded-lg px-3 py-1 text-xs font-medium transition-all ${view===v?"bg-card text-foreground shadow-sm":"text-muted-foreground hover:text-foreground"}`}>{v}</button>
              ))}
            </div>
            <button onClick={()=>nav(-1)} className="h-7 w-7 rounded-xl border border-border bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"><ChevronLeft className="h-4 w-4"/></button>
            <button onClick={()=>setSelDate(new Date(today))} className="rounded-xl border border-border bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">Today</button>
            <button onClick={()=>nav(1)} className="h-7 w-7 rounded-xl border border-border bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"><ChevronRight className="h-4 w-4"/></button>
            <button onClick={()=>openAdd()} className="flex items-center gap-1.5 rounded-xl bg-blue-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-400 transition-colors"><Plus className="h-3.5 w-3.5"/> Add event</button>
          </div>
        </div>

        {/* ══ MONTH VIEW ══════════════════════════════════ */}
        {view==="Month" && (
          <div className="flex-1 overflow-hidden flex flex-col p-4 gap-0">
            <div className="grid grid-cols-7 mb-2">
              {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d,i)=>(
                <div key={d} className={`py-2 text-center text-[11px] font-semibold tracking-wide
                  ${i===0||i===6?"text-muted-foreground/40":"text-muted-foreground/70"}`}>
                  {d}
                </div>
              ))}
            </div>
            <div className="flex-1 grid grid-cols-7" style={{gridAutoRows:"1fr",minHeight:0}}>
              {mCells.map((day,i)=>{
                if (!day) return (
                  <div key={i} className={`border-b border-r border-border/40 ${i%7===0?"border-l border-border/40":""} ${i<7?"border-t border-border/40":""}`}/>
                );
                const d      = new Date(selDate.getFullYear(), selDate.getMonth(), day);
                const isT    = d.toDateString()===today.toDateString();
                const isS    = d.toDateString()===selDate.toDateString();
                const isWknd = d.getDay()===0||d.getDay()===6;
                const dayEvs      = onDate(d);
                const dayTasks    = tasksOnDate(d);
                const dayRoutines = routinesOnDate(d);
                const dayQT       = quickTasksOnDate(d);
                const col    = i % 7;
                const row    = Math.floor(i / 7);
                const totalRows = Math.ceil(mCells.length/7);

                return (
                  <motion.div
                    key={`${selDate.getFullYear()}-${selDate.getMonth()}-${day}`}
                    initial={{opacity:0}}
                    animate={{opacity:1}}
                    transition={{delay:(row*7+col)*0.008,duration:0.25}}
                    onClick={()=>{ setSelDate(d); setTaskPanel(d); }}
                    className={`group relative flex flex-col cursor-pointer overflow-hidden transition-all duration-150
                      border-b border-r border-border/40
                      ${col===0?"border-l border-border/40":""}
                      ${row===0?"border-t border-border/40":""}
                      ${row===totalRows-1?"":""}
                      ${isT?"bg-blue-500/[0.08]":isS?"bg-blue-500/[0.14]":isWknd?"bg-black/[0.025]":"bg-card"}
                      hover:bg-blue-500/[0.06]
                    `}
                  >
                    {isT && <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 via-blue-400 to-blue-500"/>}
                    {isS && !isT && <div className="absolute top-2 bottom-2 left-0 w-0.5 rounded-full bg-blue-400/60"/>}

                    <div className="flex items-start justify-between px-2.5 pt-2.5 pb-1.5">
                      <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition-all
                        ${isT?"bg-blue-500 text-white shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                          :isS?"text-blue-600 font-extrabold"
                          :isWknd?"text-muted-foreground/40"
                          :"text-foreground/80"}`}>
                        {day}
                      </span>
                      {/* Indicator dots row */}
                      <div className="flex items-center gap-1.5">
                        {dayEvs.length > 0 && (
                          <span className="flex items-center gap-0.5 text-[9px] font-bold text-blue-700/80">
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-400"/>{dayEvs.length}
                          </span>
                        )}
                        {dayTasks.length > 0 && (
                          <span className="flex items-center gap-0.5 text-[9px] font-bold text-blue-700/80">
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-400"/>{dayTasks.length}
                          </span>
                        )}
                        {dayRoutines.length > 0 && (
                          <span className="flex items-center gap-0.5 text-[9px] font-bold text-emerald-700/80">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"/>{dayRoutines.length}
                          </span>
                        )}
                        {dayQT.length > 0 && (
                          <span className="flex items-center gap-0.5 text-[9px] font-bold text-violet-700/80">
                            <span className="h-1.5 w-1.5 rounded-full bg-violet-400"/>{dayQT.length}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Event pills */}
                    <div className="flex flex-col gap-[3px] px-1.5 pb-1.5 flex-1 overflow-hidden">
                      {dayEvs.slice(0,2).map(ev=>(
                        <div
                          key={ev.id}
                          onClick={e=>{e.stopPropagation();setFocusEv(ev);}}
                          className="group/ev flex items-center gap-1.5 rounded-lg overflow-hidden hover:brightness-110 transition-all cursor-pointer"
                          style={{background:"rgba(0,0,0,0.04)"}}
                        >
                          <div className={`w-1 self-stretch flex-shrink-0 rounded-full my-0.5 ml-0.5 ${ev.color}`}/>
                          <div className="flex items-center gap-1 min-w-0 py-[3px] pr-1.5">
                            <span className="text-[9px] text-muted-foreground/60 flex-shrink-0 font-medium">{fmtTime(ev.startHour,ev.startMin)}</span>
                            <span className="text-[10px] font-semibold text-foreground/90 truncate">{ev.title}</span>
                          </div>
                        </div>
                      ))}
                      {dayEvs.length>2 && (
                        <span className="text-[9px] text-muted-foreground/50 px-1.5">+{dayEvs.length-2} event{dayEvs.length-2>1?"s":""}</span>
                      )}

                      {/* Task chips with teal accent */}
                      {dayTasks.slice(0,2).map(t=>(
                        <div
                          key={t.id}
                          onClick={e=>{e.stopPropagation(); setTaskPanel(d);}}
                          className="flex items-center gap-1 rounded-lg overflow-hidden hover:brightness-110 transition-all cursor-pointer"
                          style={{background:"linear-gradient(90deg,rgba(20,184,166,0.25),rgba(20,184,166,0.12))",border:"1px solid rgba(20,184,166,0.35)"}}
                        >
                          <div className="w-1 self-stretch flex-shrink-0 rounded-full my-0.5 ml-0.5 bg-blue-600"/>
                          <div className="flex items-center gap-1 min-w-0 py-[3px] pr-1.5">
                            <CheckSquare2 className="h-2.5 w-2.5 flex-shrink-0 text-blue-700"/>
                            <span className={`text-[10px] font-semibold truncate ${t.done?"line-through text-muted-foreground/50":"text-blue-800"}`}>{t.description}</span>
                          </div>
                        </div>
                      ))}
                      {dayTasks.length>2 && (
                        <button
                          onClick={e=>{e.stopPropagation(); setTaskPanel(d);}}
                          className="self-start rounded-full bg-blue-500/15 text-blue-700 px-1.5 py-0.5 text-[9px] font-semibold hover:bg-blue-500/25 transition-colors"
                        >
                          +{dayTasks.length-2} more
                        </button>
                      )}
                      {/* Routine chips */}
                      {dayRoutines.slice(0,2).map(r => {
                        const done2 = isRoutineDone(r.id, d);
                        return (
                          <div
                            key={r.id}
                            onClick={e=>{e.stopPropagation(); checkRoutine(r.id, d);}}
                            className="flex items-center gap-1 rounded-lg overflow-hidden hover:brightness-110 transition-all cursor-pointer"
                            style={{background:"rgba(16,185,129,0.12)",border:"1px solid rgba(16,185,129,0.3)"}}
                          >
                            <div className={`w-1 self-stretch flex-shrink-0 rounded-full my-0.5 ml-0.5 ${r.color}`}/>
                            <span className={`text-[10px] font-semibold truncate py-[3px] pr-1.5 ${done2 ? "line-through text-muted-foreground/50" : "text-emerald-800"}`}>{r.name}</span>
                          </div>
                        );
                      })}
                      {dayRoutines.length > 2 && (
                        <span className="self-start rounded-full bg-emerald-500/15 text-emerald-700 px-1.5 py-0.5 text-[9px] font-semibold">+{dayRoutines.length-2} routines</span>
                      )}
                      {/* Quick task chips */}
                      {dayQT.slice(0, 2).map(qt => (
                        <div key={qt.id} onClick={e=>{e.stopPropagation(); checkQT(qt.id);}}
                          className="flex items-center gap-1 rounded-lg overflow-hidden cursor-pointer hover:brightness-110 transition-all"
                          style={{background:"rgba(139,92,246,0.12)",border:"1px solid rgba(139,92,246,0.3)"}}>
                          <div className={`w-1 self-stretch flex-shrink-0 rounded-full my-0.5 ml-0.5 ${qt.tag ? QT_TAG_COLOR[qt.tag] : "bg-violet-500"}`}/>
                          <div className="flex items-center gap-1 min-w-0 py-[3px] pr-1.5">
                            {qt.time && <span className="text-[8px] text-muted-foreground/60 flex-shrink-0">{qt.time}</span>}
                            <span className={`text-[10px] font-semibold truncate ${qt.done?"line-through text-muted-foreground/50":"text-violet-800"}`}>{qt.title}</span>
                          </div>
                        </div>
                      ))}
                      {dayQT.length > 2 && (
                        <span className="self-start rounded-full bg-violet-500/15 text-violet-700 px-1.5 py-0.5 text-[9px] font-semibold">+{dayQT.length-2} more</span>
                      )}
                    </div>

                    <button
                      onClick={e=>{e.stopPropagation();openAdd(dateISO(d));}}
                      className="absolute bottom-1.5 right-1.5 h-5 w-5 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-600 opacity-0 group-hover:opacity-100 hover:bg-blue-500/40 transition-all scale-75 group-hover:scale-100"
                    >
                      <Plus className="h-3 w-3"/>
                    </button>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* ══ WEEK VIEW ═══════════════════════════════════ */}
        {view==="Week" && (
          <>
            <div className="flex border-b border-border flex-shrink-0">
              <div className="w-14 flex-shrink-0 border-r border-border"/>
              {weekDays.map((d,i)=>{
                const isT  = d.toDateString()===today.toDateString();
                const cnt  = onDate(d).length;
                const tcnt = tasksOnDate(d).length;
                const rcnt = routinesOnDate(d).length;
                const qcnt = quickTasksOnDate(d).length;
                return (
                  <div key={i} onClick={()=>{setSelDate(d);setView("Day");}} className="flex-1 py-2 text-center border-r border-border last:border-r-0 cursor-pointer hover:bg-secondary/50 transition-colors">
                    <span className="text-[10px] font-semibold text-muted-foreground block">{DAYS_SH[i]}</span>
                    <div className={`mx-auto mt-0.5 h-7 w-7 flex items-center justify-center rounded-full text-sm font-bold ${isT?"bg-blue-500 text-white":"text-foreground"}`}>{d.getDate()}</div>
                    <div className="flex items-center justify-center gap-1 mt-0.5">
                      {cnt>0&&<span className="text-[9px] text-blue-600 font-medium">{cnt}e</span>}
                      {tcnt>0&&<span className="text-[9px] text-blue-700 font-medium">{tcnt}t</span>}
                      {rcnt>0&&<span className="text-[9px] text-emerald-600 font-medium">{rcnt}r</span>}
                      {qcnt>0&&<span className="text-[9px] text-violet-600 font-medium">{qcnt}q</span>}
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Daily Tasks + Routines + Quick Tasks row */}
            {(weekDays.some(d=>tasksOnDate(d).length>0) || weekDays.some(d=>routinesOnDate(d).length>0) || weekDays.some(d=>quickTasksOnDate(d).length>0)) && (
              <div className="flex border-b border-border/50 flex-shrink-0">
                <div className="w-14 flex-shrink-0 border-r border-border flex items-center justify-end pr-2">
                  <span className="text-[9px] text-muted-foreground/50">tasks</span>
                </div>
                {weekDays.map((d,i)=>{
                  const dt  = tasksOnDate(d);
                  const dr  = routinesOnDate(d);
                  const dq  = quickTasksOnDate(d);
                  return (
                    <div key={i} className="flex-1 border-r border-border last:border-r-0 min-h-[32px] flex flex-col gap-0.5 p-1">
                      {dt.slice(0,1).map(t=>(
                        <div key={t.id} onClick={()=>setTaskPanel(d)} className="flex items-center gap-1 rounded-md bg-blue-500/20 border border-blue-500/50 px-1.5 py-0.5 cursor-pointer hover:bg-blue-500/30 transition-colors">
                          <CheckSquare2 className="h-2.5 w-2.5 text-blue-700 flex-shrink-0"/>
                          <span className={`text-[9px] font-semibold truncate ${t.done?"line-through text-muted-foreground/50":"text-blue-800"}`}>{t.description}</span>
                        </div>
                      ))}
                      {dt.length>1 && (
                        <span onClick={()=>setTaskPanel(d)} className="self-start rounded-full bg-blue-500/15 text-blue-700 px-1.5 py-0.5 text-[8px] font-semibold cursor-pointer">+{dt.length-1}t</span>
                      )}
                      {dr.slice(0,1).map(r => {
                        const done2 = isRoutineDone(r.id, d);
                        return (
                          <div key={r.id} onClick={()=>checkRoutine(r.id, d)} className="flex items-center gap-1 rounded-md border px-1.5 py-0.5 cursor-pointer hover:brightness-110 transition-all"
                               style={{background:"rgba(16,185,129,0.12)",borderColor:"rgba(16,185,129,0.3)"}}>
                            <div className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${r.color}`}/>
                            <span className={`text-[9px] font-semibold truncate ${done2?"line-through text-muted-foreground/50":"text-emerald-800"}`}>{r.name}</span>
                          </div>
                        );
                      })}
                      {dr.length>1 && <span className="self-start rounded-full bg-emerald-500/15 text-emerald-700 px-1.5 py-0.5 text-[8px] font-semibold">+{dr.length-1}r</span>}
                      {dq.slice(0,1).map(qt => (
                        <div key={qt.id} onClick={()=>checkQT(qt.id)} className="flex items-center gap-1 rounded-md border px-1.5 py-0.5 cursor-pointer hover:brightness-110 transition-all"
                             style={{background:"rgba(139,92,246,0.12)",borderColor:"rgba(139,92,246,0.3)"}}>
                          {qt.time && <span className="text-[8px] text-muted-foreground/50 flex-shrink-0">{qt.time}</span>}
                          <span className={`text-[9px] font-semibold truncate ${qt.done?"line-through text-muted-foreground/50":"text-violet-800"}`}>{qt.title}</span>
                        </div>
                      ))}
                      {dq.length>1 && <span className="self-start rounded-full bg-violet-500/15 text-violet-700 px-1.5 py-0.5 text-[8px] font-semibold">+{dq.length-1}q</span>}
                    </div>
                  );
                })}
              </div>
            )}
            <div className="flex flex-1 overflow-y-auto min-h-0">
              <div className="w-14 flex-shrink-0 border-r border-border select-none">
                {HOURS.map(h=><div key={h} style={{height:CELL_H}} className="flex items-start justify-end pr-2 pt-1 border-b border-border/30"><span className="text-[10px] text-muted-foreground">{fmtTime(h,0)}</span></div>)}
              </div>
              <div className="flex flex-1 min-w-0">
                {weekDays.map((d,ci)=>{
                  const isT    = d.toDateString()===today.toDateString();
                  const colEvs = onDate(d);
                  return (
                    <div key={ci} className={`relative flex-1 border-r border-border last:border-r-0 min-w-0 ${isT?"bg-blue-500/[0.03]":""}`} style={{minHeight:HOURS.length*CELL_H}}>
                      {HOURS.map(h=>(
                        <div key={h} style={{height:CELL_H}} className="border-b border-border/30 group/hr" onDoubleClick={()=>openAdd(dateISO(d))}>
                          <button onClick={()=>openAdd(dateISO(d))} className="w-full h-full flex items-center justify-center opacity-0 group-hover/hr:opacity-100 transition-opacity">
                            <Plus className="h-4 w-4 text-muted-foreground/30 hover:text-blue-600 transition-colors"/>
                          </button>
                        </div>
                      ))}
                      {colEvs.map(ev=>(
                        <motion.button key={ev.id} initial={{opacity:0,scale:0.96}} animate={{opacity:1,scale:1}} whileHover={{scale:1.02}} onClick={()=>setFocusEv(ev)}
                          style={{position:"absolute",top:evTop(ev),height:evHeight(ev),left:3,right:3}}
                          className={`${ev.color} text-white rounded-xl p-2 text-left overflow-hidden shadow-lg z-10 flex flex-col justify-between hover:brightness-110 transition-all`}>
                          <div>
                            <p className="text-[10px] opacity-80 leading-none">{fmtTime(ev.startHour,ev.startMin)} – {fmtTime(ev.endHour,ev.endMin)}</p>
                            <p className="text-[11px] font-semibold mt-0.5 leading-tight line-clamp-2">{ev.title}</p>
                          </div>
                          {ev.tag&&evHeight(ev)>48&&<span className="text-[9px] bg-white/20 rounded-full px-1.5 py-0.5 self-start mt-1">{ev.tag}</span>}
                        </motion.button>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* ══ DAY VIEW ════════════════════════════════════ */}
        {view==="Day" && (
          <>
            <div className="flex border-b border-border flex-shrink-0">
              <div className="w-14 flex-shrink-0 border-r border-border"/>
              <div className="flex-1 py-3 text-center">
                <span className="text-xs font-semibold text-muted-foreground">{DAYS_FULL[selDate.getDay()].toUpperCase()}</span>
                <div className={`mx-auto mt-0.5 h-9 w-9 flex items-center justify-center rounded-full text-lg font-bold ${selDate.toDateString()===today.toDateString()?"bg-blue-500 text-white":"text-foreground"}`}>{selDate.getDate()}</div>
                <span className="text-[10px] text-muted-foreground">{MONTHS[selDate.getMonth()]} {selDate.getFullYear()}</span>
              </div>
            </div>
            {/* Daily Tasks row */}
            {tasksOnDate(selDate).length>0&&(
              <div className="flex border-b border-border/50 flex-shrink-0">
                <div className="w-14 flex-shrink-0 border-r border-border flex items-center justify-end pr-2">
                  <span className="text-[9px] text-muted-foreground/50">tasks</span>
                </div>
                <div className="flex-1 flex flex-wrap gap-1.5 p-2.5">
                  {tasksOnDate(selDate).map(t=>(
                    <button
                      key={t.id}
                      onClick={()=>checkTask(t.id)}
                      className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 transition-all
                        ${t.done
                          ? "bg-blue-500/10 border-blue-500/30 text-blue-700/70"
                          : "bg-blue-500/20 border-blue-500/50 text-blue-800 hover:bg-blue-500/30"}`}
                    >
                      <div className={`h-3.5 w-3.5 flex-shrink-0 rounded border-[1.5px] flex items-center justify-center
                        ${t.done?"bg-blue-400 border-blue-400":"border-blue-400/60"}`}>
                        {t.done && <CheckSquare2 className="h-3 w-3 text-background"/>}
                      </div>
                      <span className={`text-[11px] font-semibold ${t.done?"line-through":""}`}>{t.description}</span>
                      <span className="text-[9px] opacity-70 font-mono">{t.dayLabel}</span>
                      <span className="text-[9px] opacity-70">· {milestoneLabel(t)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {onDate(selDate).length===0&&tasksOnDate(selDate).length===0&&(
              <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                <div className="h-12 w-12 rounded-2xl bg-secondary flex items-center justify-center"><Clock className="h-6 w-6 text-muted-foreground"/></div>
                <div><p className="font-semibold text-sm">Nothing on this day</p><p className="text-xs text-muted-foreground mt-1">Add an event here, or schedule a task in Roadmap.</p></div>
                <div className="flex gap-2">
                  <button onClick={()=>openAdd(dateISO(selDate))} className="flex items-center gap-2 rounded-xl bg-blue-500 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-400 transition-colors"><Plus className="h-4 w-4"/> Add event</button>
                  <Link href="/dashboard/roadmap" className="flex items-center gap-2 rounded-xl border border-border bg-secondary px-4 py-2 text-sm font-semibold text-foreground hover:bg-card transition-colors"><Target className="h-4 w-4 text-blue-600"/> Roadmap</Link>
                </div>
              </div>
            )}
            <div className="flex flex-1 overflow-y-auto min-h-0">
              <div className="w-14 flex-shrink-0 border-r border-border select-none">
                {HOURS.map(h=><div key={h} style={{height:CELL_H}} className="flex items-start justify-end pr-2 pt-1 border-b border-border/30"><span className="text-[10px] text-muted-foreground">{fmtTime(h,0)}</span></div>)}
              </div>
              <div className="relative flex-1 min-w-0" style={{minHeight:HOURS.length*CELL_H}}>
                {HOURS.map(h=>(
                  <div key={h} style={{height:CELL_H}} className="border-b border-border/30 group/hr" onDoubleClick={()=>openAdd(dateISO(selDate))}>
                    <button onClick={()=>openAdd(dateISO(selDate))} className="w-full h-full flex items-center justify-center opacity-0 group-hover/hr:opacity-100 transition-opacity">
                      <Plus className="h-4 w-4 text-muted-foreground/30 hover:text-blue-600 transition-colors"/>
                    </button>
                  </div>
                ))}
                {onDate(selDate).map(ev=>(
                  <motion.button key={ev.id} initial={{opacity:0,scale:0.96}} animate={{opacity:1,scale:1}} whileHover={{scale:1.01}} onClick={()=>setFocusEv(ev)}
                    style={{position:"absolute",top:evTop(ev),height:evHeight(ev),left:8,right:8}}
                    className={`${ev.color} text-white rounded-xl p-3 text-left overflow-hidden shadow-lg z-10 flex flex-col justify-between hover:brightness-110 transition-all`}>
                    <div>
                      <p className="text-xs opacity-80">{fmtTime(ev.startHour,ev.startMin)} – {fmtTime(ev.endHour,ev.endMin)}</p>
                      <p className="text-sm font-semibold mt-0.5">{ev.title}</p>
                      {ev.description&&<p className="text-xs opacity-70 mt-1 line-clamp-2">{ev.description}</p>}
                    </div>
                    {ev.tag&&<span className="text-[10px] bg-white/20 rounded-full px-2 py-0.5 self-start">{ev.tag}</span>}
                  </motion.button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── TASK DAY-PANEL ─────────────────────────────── */}
      <AnimatePresence>
        {taskPanel && (
          <>
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={()=>setTaskPanel(null)} className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"/>
            <motion.div
              initial={{opacity:0, x:40}} animate={{opacity:1, x:0}} exit={{opacity:0, x:40}}
              transition={{duration:0.2}}
              className="fixed top-0 right-0 bottom-0 z-50 w-96 max-w-[92vw] bg-card border-l border-border shadow-2xl flex flex-col"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-gradient-to-br from-blue-500/[0.08] to-transparent">
                <div className="flex items-center gap-2">
                  <CheckSquare2 className="h-5 w-5 text-blue-700"/>
                  <div>
                    <p className="text-xs text-muted-foreground">{DAYS_FULL[taskPanel.getDay()]}</p>
                    <p className="text-base font-bold">{taskPanel.toLocaleDateString("en-US",{day:"numeric",month:"long",year:"numeric"})}</p>
                  </div>
                </div>
                <button onClick={()=>setTaskPanel(null)} className="h-7 w-7 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"><X className="h-4 w-4"/></button>
              </div>
              <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-2.5">
                {tasksOnDate(taskPanel).length === 0 && (
                  <div className="flex flex-col items-center gap-3 py-10 text-center">
                    <div className="h-12 w-12 rounded-2xl bg-secondary flex items-center justify-center"><Clock className="h-6 w-6 text-muted-foreground"/></div>
                    <p className="text-sm font-medium">No tasks on this day</p>
                    <Link href="/dashboard/roadmap" onClick={()=>setTaskPanel(null)} className="flex items-center gap-2 rounded-xl bg-blue-500 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-400 transition-colors">
                      <Target className="h-4 w-4"/> Add in Roadmap
                    </Link>
                  </div>
                )}
                {tasksOnDate(taskPanel).map(t=>(
                  <div key={t.id} className="flex items-start gap-3 rounded-xl border border-border bg-secondary/30 p-3 hover:bg-secondary/50 transition-colors">
                    <button
                      onClick={()=>checkTask(t.id)}
                      className={`h-5 w-5 mt-0.5 flex-shrink-0 rounded-md border-[1.5px] flex items-center justify-center transition-all
                        ${t.done ? "bg-blue-500 border-blue-500" : "border-muted-foreground/40 hover:border-blue-400"}`}
                    >
                      {t.done && <CheckSquare2 className="h-3.5 w-3.5 text-white"/>}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${t.done?"line-through text-muted-foreground/60":""}`}>{t.description}</p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className="rounded-full bg-blue-500/15 border border-blue-500/20 text-blue-700 px-2 py-0.5 text-[9px] font-bold font-mono">{t.dayLabel}</span>
                        <span className="text-[10px] text-muted-foreground truncate">{milestoneLabel(t)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── ADD EVENT MODAL ─────────────────────────────── */}
      <AnimatePresence>
        {showAdd&&(
          <>
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={()=>setShowAdd(false)} className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"/>
            <motion.div initial={{opacity:0,scale:0.95,y:12}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:0.95,y:12}} transition={{duration:0.2}}
              className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 rounded-2xl border border-border bg-card shadow-2xl p-6 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <p className="font-bold text-base">New event</p>
                <button onClick={()=>setShowAdd(false)} className="h-7 w-7 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"><X className="h-4 w-4"/></button>
              </div>
              <input autoFocus placeholder="Event title *" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&saveEvent()}
                className="h-10 w-full rounded-xl border border-border bg-secondary px-3 text-sm placeholder:text-muted-foreground/50 outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20 transition-all"/>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Date</label>
                <input type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))}
                  className="h-10 w-full rounded-xl border border-border bg-secondary px-3 text-sm outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20 transition-all [color-scheme:light]"/>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Time</label>
                <div className="flex gap-2 items-center">
                  <select value={form.startHour} onChange={e=>setForm(f=>({...f,startHour:+e.target.value,endHour:Math.max(+e.target.value+1,f.endHour)}))}
                    className="h-10 flex-1 rounded-xl border border-border bg-secondary px-3 text-sm outline-none focus:border-blue-500/60 transition-all">
                    {HOURS.map(h=><option key={h} value={h}>{fmtTime(h,0)}</option>)}
                  </select>
                  <span className="text-xs text-muted-foreground flex-shrink-0">to</span>
                  <select value={form.endHour} onChange={e=>setForm(f=>({...f,endHour:+e.target.value}))}
                    className="h-10 flex-1 rounded-xl border border-border bg-secondary px-3 text-sm outline-none focus:border-blue-500/60 transition-all">
                    {HOURS.filter(h=>h>form.startHour).map(h=><option key={h} value={h}>{fmtTime(h,0)}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Tag</label>
                <div className="flex flex-wrap gap-1.5">
                  {TAGS.map(t=>(
                    <button key={t} onClick={()=>setForm(f=>({...f,tag:f.tag===t?"":t}))}
                      className={`flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-medium border transition-all
                        ${form.tag===t?"bg-blue-500/20 border-blue-500/50 text-blue-600":"border-border bg-secondary text-muted-foreground hover:text-foreground"}`}>
                      <Tag className="h-2.5 w-2.5"/> {t}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Color</label>
                <div className="flex gap-2">
                  {COLORS.map(({bg,label})=>(
                    <button key={bg} title={label} onClick={()=>setForm(f=>({...f,color:bg}))}
                      className={`h-6 w-6 rounded-full ${bg} transition-all hover:scale-110 ${form.color===bg?"ring-2 ring-offset-2 ring-offset-card ring-white/60 scale-110":""}`}/>
                  ))}
                </div>
              </div>
              <textarea placeholder="Description (optional)" value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} rows={2}
                className="w-full resize-none rounded-xl border border-border bg-secondary px-3 py-2 text-sm placeholder:text-muted-foreground/50 outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20 transition-all"/>
              <div className="flex gap-2 pt-1">
                <button onClick={()=>setShowAdd(false)} className="flex-1 h-10 rounded-xl border border-border bg-secondary text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
                <button onClick={saveEvent} disabled={!form.title.trim()} className="flex-1 h-10 rounded-xl bg-blue-500 text-sm font-semibold text-white hover:bg-blue-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Save event</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── EVENT DETAIL MODAL ─────────────────────────── */}
      <AnimatePresence>
        {focusEv&&(
          <>
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={()=>setFocusEv(null)} className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"/>
            <motion.div initial={{opacity:0,scale:0.95,y:12}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:0.95,y:12}} transition={{duration:0.2}}
              className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 rounded-2xl border border-border bg-card shadow-2xl p-5 flex flex-col gap-4">
              <div className={`h-1.5 w-full rounded-full ${focusEv.color}`}/>
              <div className="flex items-start justify-between">
                <p className="font-bold text-base leading-tight pr-4">{focusEv.title}</p>
                <button onClick={()=>setFocusEv(null)} className="h-7 w-7 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"><X className="h-4 w-4"/></button>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0"/>
                <span className="text-muted-foreground">{parseDate(focusEv.date).toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">{fmtTime(focusEv.startHour,focusEv.startMin)}</span>
                <span className="text-muted-foreground">–</span>
                <span className="font-medium">{fmtTime(focusEv.endHour,focusEv.endMin)}</span>
                <span className="text-xs text-muted-foreground">({focusEv.endHour-focusEv.startHour}h)</span>
              </div>
              {focusEv.tag&&<div className="flex items-center gap-1.5"><Tag className="h-3.5 w-3.5 text-muted-foreground"/><span className="rounded-full bg-blue-500/15 px-2.5 py-0.5 text-xs font-medium text-blue-600">{focusEv.tag}</span></div>}
              {focusEv.description&&<p className="text-sm text-muted-foreground bg-secondary rounded-xl px-3 py-2">{focusEv.description}</p>}
              <button onClick={()=>deleteEvent(focusEv.id)} className="flex items-center justify-center gap-2 h-10 w-full rounded-xl border border-rose-500/30 bg-rose-500/10 text-sm font-medium text-rose-700 hover:bg-rose-500/20 transition-colors">
                <Trash2 className="h-4 w-4"/> Delete event
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
