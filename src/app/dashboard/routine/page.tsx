"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, X, Flame, CheckCircle2, Circle, Trash2, MoreHorizontal,
  Edit2, Clock, RefreshCw,
} from "lucide-react";
import { routineStreak, isRoutineActiveOn, dateISO } from "@/lib/task-store";
import type { Routine, RoutineStore } from "@/lib/task-store";
import { createClient } from "@/lib/supabase/client";

const DAY_LABELS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const DAY_FULL   = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

const COLORS: { bg: string; ring: string; label: string }[] = [
  { bg: "bg-blue-500",    ring: "ring-blue-500",    label: "Blue"    },
  { bg: "bg-violet-500",  ring: "ring-violet-500",  label: "Violet"  },
  { bg: "bg-emerald-500", ring: "ring-emerald-500", label: "Green"   },
  { bg: "bg-rose-500",    ring: "ring-rose-500",    label: "Red"     },
  { bg: "bg-amber-500",   ring: "ring-amber-500",   label: "Amber"   },
  { bg: "bg-cyan-500",    ring: "ring-cyan-500",    label: "Cyan"    },
  { bg: "bg-pink-500",    ring: "ring-pink-500",    label: "Pink"    },
  { bg: "bg-indigo-500",  ring: "ring-indigo-500",  label: "Indigo"  },
];

const EMPTY_FORM = {
  name: "", description: "", color: "bg-blue-500", time: "", daysOfWeek: [] as number[],
};

function last14Days(): string[] {
  const today = new Date();
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today); d.setDate(today.getDate() - 13 + i);
    return dateISO(d);
  });
}

export default function RoutinePage() {
  const supabase = createClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [store, setStore]   = useState<RoutineStore>({ routines: [], logs: [] });
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId]   = useState<string | null>(null);
  const [form, setForm]       = useState({ ...EMPTY_FORM });
  const [menuId, setMenuId]   = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => { if (data.user) setUserId(data.user.id); });
  }, []);

  useEffect(() => {
    if (!userId) return;
    async function load() {
      const [rRes, lRes] = await Promise.all([
        supabase.from("routines").select("*").eq("user_id", userId!).order("created_at"),
        supabase.from("routine_logs").select("*").eq("user_id", userId!),
      ]);
      const routines: Routine[] = (rRes.data ?? []).map(r => ({
        id: r.id, name: r.name, color: r.color, daysOfWeek: r.days_of_week,
        description: r.description ?? undefined, time: r.time ?? undefined, createdAt: r.created_at,
      }));
      const logs = (lRes.data ?? []).map(l => ({ id: l.id, routineId: l.routine_id, date: l.date, done: l.done }));
      setStore({ routines, logs });
    }
    load();
  }, [userId]);

  const today     = useMemo(() => new Date(), []);
  const todayISO  = useMemo(() => dateISO(today), [today]);
  const days14    = useMemo(() => last14Days(), []);
  const todayDow  = today.getDay();

  /* routines active today */
  const todayRoutines = store.routines.filter(r => isRoutineActiveOn(r, today));

  function toggleDay(day: number) {
    const days = form.daysOfWeek.includes(day)
      ? form.daysOfWeek.filter(d => d !== day)
      : [...form.daysOfWeek, day];
    setForm(f => ({ ...f, daysOfWeek: days }));
  }

  function openAdd() {
    setForm({ ...EMPTY_FORM }); setEditId(null); setShowAdd(true);
  }

  function openEdit(r: Routine) {
    setForm({ name: r.name, description: r.description ?? "", color: r.color, time: r.time ?? "", daysOfWeek: [...r.daysOfWeek] });
    setEditId(r.id); setShowAdd(true); setMenuId(null);
  }

  async function save() {
    if (!userId || !form.name.trim()) return;
    if (editId) {
      await supabase.from("routines").update({
        name: form.name, description: form.description||null, color: form.color,
        time: form.time||null, days_of_week: form.daysOfWeek,
      }).eq("id", editId);
      setStore(s => ({ ...s, routines: s.routines.map(r => r.id === editId ? { ...r, ...form } : r) }));
    } else {
      const { data } = await supabase.from("routines").insert({
        user_id: userId, name: form.name, description: form.description||null, color: form.color,
        time: form.time||null, days_of_week: form.daysOfWeek,
      }).select().single();
      if (data) {
        const r: Routine = { id: data.id, name: data.name, color: data.color, daysOfWeek: data.days_of_week, description: data.description??undefined, time: data.time??undefined, createdAt: data.created_at };
        setStore(s => ({ ...s, routines: [...s.routines, r] }));
      }
    }
    setShowAdd(false); setEditId(null);
  }

  async function deleteRoutine(id: string) {
    await supabase.from("routines").delete().eq("id", id);
    setStore(s => ({ routines: s.routines.filter(r => r.id !== id), logs: s.logs.filter(l => l.routineId !== id) }));
    setMenuId(null);
  }

  async function toggle(routineId: string) {
    if (!userId) return;
    const existing = store.logs.find(l => l.routineId === routineId && l.date === todayISO);
    if (existing) {
      const done = !existing.done;
      await supabase.from("routine_logs").update({ done }).eq("id", existing.id!);
      setStore(s => ({ ...s, logs: s.logs.map(l => l.id === existing.id ? { ...l, done } : l) }));
    } else {
      const { data } = await supabase.from("routine_logs").insert({ user_id: userId, routine_id: routineId, date: todayISO, done: true }).select().single();
      if (data) setStore(s => ({ ...s, logs: [...s.logs, { id: data.id, routineId: data.routine_id, date: data.date, done: data.done }] }));
    }
  }

  function isDone(routineId: string, date: string) {
    return store.logs.find(l => l.routineId === routineId && l.date === date)?.done ?? false;
  }

  const todayDoneCount = todayRoutines.filter(r => isDone(r.id, todayISO)).length;

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">

      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-6 py-4 flex-shrink-0">
        <div>
          <p className="text-xs text-muted-foreground">{today.toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long" })}</p>
          <h1 className="text-xl font-bold mt-0.5 flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-emerald-600"/>
            Daily Routines
          </h1>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 h-9 rounded-xl bg-emerald-500 px-4 text-xs font-semibold text-white hover:bg-emerald-400 transition-colors"
        >
          <Plus className="h-4 w-4"/> New routine
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-5 grid grid-cols-12 gap-4 min-h-0 content-start">

        {/* ══ LEFT: today check-off ══ */}
        <div className="col-span-8 flex flex-col gap-4">

          {/* Today progress bar */}
          {store.routines.length > 0 && (
            <div className="rounded-2xl border border-border bg-card px-5 py-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold">Today&apos;s Routines</p>
                <span className="text-xs text-muted-foreground font-semibold">
                  {todayDoneCount}/{todayRoutines.length} done
                </span>
              </div>
              <div className="h-2 rounded-full bg-secondary overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-emerald-500"
                  initial={{ width: 0 }}
                  animate={{ width: todayRoutines.length > 0 ? `${(todayDoneCount / todayRoutines.length) * 100}%` : "0%" }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                {todayDoneCount === todayRoutines.length && todayRoutines.length > 0
                  ? "All done for today! Great work."
                  : `${todayRoutines.length - todayDoneCount} routine${todayRoutines.length - todayDoneCount !== 1 ? "s" : ""} left today`}
              </p>
            </div>
          )}

          {/* Routine list */}
          {store.routines.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-emerald-500/20 bg-emerald-500/5 p-12 flex flex-col items-center gap-4 text-center">
              <div className="h-14 w-14 rounded-3xl bg-emerald-500/15 flex items-center justify-center">
                <RefreshCw className="h-7 w-7 text-emerald-600"/>
              </div>
              <div>
                <p className="font-semibold text-base">No routines yet</p>
                <p className="text-sm text-muted-foreground mt-1">Add daily habits like gym, reading, meditation — and track them every day.</p>
              </div>
              <button onClick={openAdd} className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-400 transition-colors">
                <Plus className="h-4 w-4"/> Add first routine
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <AnimatePresence>
                {store.routines.map((r, i) => {
                  const done    = isDone(r.id, todayISO);
                  const streak  = routineStreak(store, r);
                  const active  = isRoutineActiveOn(r, today);
                  const colorCls = COLORS.find(c => c.bg === r.color) ?? COLORS[0];

                  return (
                    <motion.div
                      key={r.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.97 }}
                      transition={{ delay: i * 0.04, duration: 0.2 }}
                      className={`rounded-2xl border bg-card overflow-hidden transition-all
                        ${done ? "border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.06)]" : "border-border"}`}
                    >
                      <div className="flex items-center gap-4 px-5 py-4">
                        {/* Check button */}
                        <button
                          onClick={() => active && toggle(r.id)}
                          disabled={!active}
                          className={`h-9 w-9 flex-shrink-0 rounded-xl flex items-center justify-center transition-all
                            ${!active ? "opacity-30 cursor-not-allowed" : ""}
                            ${done ? "bg-emerald-500 text-white" : "border-2 border-muted-foreground/30 hover:border-emerald-500 text-transparent hover:text-emerald-500"}`}
                        >
                          {done ? <CheckCircle2 className="h-5 w-5"/> : <Circle className="h-5 w-5"/>}
                        </button>

                        {/* Color dot */}
                        <div className={`h-3 w-3 flex-shrink-0 rounded-full ${r.color}`}/>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={`text-sm font-semibold ${done ? "line-through text-muted-foreground/60" : ""}`}>{r.name}</p>
                            {!active && <span className="rounded-full bg-secondary px-2 py-0.5 text-[9px] font-semibold text-muted-foreground">Not today</span>}
                          </div>
                          <div className="flex items-center gap-2.5 mt-0.5 flex-wrap">
                            {r.description && <p className="text-[11px] text-muted-foreground truncate max-w-[200px]">{r.description}</p>}
                            {r.time && (
                              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                <Clock className="h-2.5 w-2.5"/> {r.time}
                              </span>
                            )}
                            <span className="text-[10px] text-muted-foreground">
                              {r.daysOfWeek.length === 0 ? "Every day" : r.daysOfWeek.sort((a,b)=>a-b).map(d => DAY_LABELS[d]).join(", ")}
                            </span>
                          </div>
                        </div>

                        {/* Streak */}
                        <div className="flex flex-col items-center gap-0.5 flex-shrink-0 w-12">
                          <div className="flex items-center gap-1">
                            <Flame className={`h-3.5 w-3.5 ${streak > 0 ? "text-emerald-500" : "text-muted-foreground/30"}`}/>
                            <span className={`text-sm font-bold ${streak > 0 ? "text-emerald-600" : "text-muted-foreground/40"}`}>{streak}</span>
                          </div>
                          <span className="text-[9px] text-muted-foreground">streak</span>
                        </div>

                        {/* 14-day heatmap mini */}
                        <div className="hidden md:grid grid-cols-7 gap-0.5 flex-shrink-0">
                          {days14.slice(7).map(date => {
                            const d = new Date(date + "T00:00:00");
                            const active2 = isRoutineActiveOn(r, d);
                            const doneTile = isDone(r.id, date);
                            return (
                              <div
                                key={date}
                                title={date}
                                className={`h-3.5 w-3.5 rounded-sm transition-colors
                                  ${!active2 ? "bg-transparent" : doneTile ? `${r.color} opacity-90` : "bg-secondary"}`}
                              />
                            );
                          })}
                        </div>

                        {/* Menu */}
                        <div className="relative flex-shrink-0">
                          <button
                            onClick={e => { e.stopPropagation(); setMenuId(m => m === r.id ? null : r.id); }}
                            className="h-7 w-7 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <MoreHorizontal className="h-3.5 w-3.5"/>
                          </button>
                          {menuId === r.id && (
                            <div onClick={e => e.stopPropagation()} className="absolute top-8 right-0 z-20 w-36 rounded-xl border border-border bg-card shadow-2xl py-1 overflow-hidden">
                              <button onClick={() => openEdit(r)} className="flex items-center gap-2 w-full px-3 py-2 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
                                <Edit2 className="h-3.5 w-3.5"/> Edit
                              </button>
                              <div className="h-px bg-border mx-2 my-1"/>
                              <button onClick={() => deleteRoutine(r.id)} className="flex items-center gap-2 w-full px-3 py-2 text-xs text-rose-700 hover:bg-rose-500/10 transition-colors">
                                <Trash2 className="h-3.5 w-3.5"/> Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* ══ RIGHT: weekly overview ══ */}
        <div className="col-span-4 flex flex-col gap-4">

          {/* This week grid */}
          <div className="rounded-2xl border border-border bg-card p-5 flex flex-col gap-4">
            <p className="text-sm font-bold">This Week</p>
            <div className="grid grid-cols-7 gap-1 text-center">
              {Array.from({ length: 7 }, (_, i) => {
                const d = new Date(today);
                d.setDate(today.getDate() - todayDow + i);
                const iso = dateISO(d);
                const isToday = iso === todayISO;
                const isPast  = iso < todayISO;
                const activeCount = store.routines.filter(r => isRoutineActiveOn(r, d)).length;
                const doneCount   = store.routines.filter(r => isRoutineActiveOn(r, d) && isDone(r.id, iso)).length;
                const pct = activeCount > 0 ? doneCount / activeCount : 0;
                return (
                  <div key={i} className="flex flex-col items-center gap-1.5">
                    <span className={`text-[9px] font-semibold ${isToday ? "text-emerald-600" : "text-muted-foreground/50"}`}>{DAY_LABELS[i]}</span>
                    <div className={`h-8 w-8 rounded-xl flex items-center justify-center text-[11px] font-bold border
                      ${isToday ? "border-emerald-500 text-emerald-600 bg-emerald-500/10" : "border-border text-muted-foreground"}`}>
                      {d.getDate()}
                    </div>
                    {activeCount > 0 && (
                      <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${pct === 1 ? "bg-emerald-500" : pct > 0 ? "bg-amber-400" : isPast ? "bg-rose-400" : "bg-transparent"}`}
                          style={{ width: `${pct * 100}%` }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Per-routine streak cards */}
          {store.routines.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-5 flex flex-col gap-3">
              <p className="text-sm font-bold flex items-center gap-2"><Flame className="h-4 w-4 text-emerald-600"/> Streaks</p>
              {store.routines.map(r => {
                const streak = routineStreak(store, r);
                const colorCls = COLORS.find(c => c.bg === r.color) ?? COLORS[0];
                return (
                  <div key={r.id} className="flex items-center gap-3">
                    <div className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${r.color}`}/>
                    <p className="text-xs text-muted-foreground flex-1 truncate">{r.name}</p>
                    <div className="flex items-center gap-1">
                      <Flame className={`h-3 w-3 ${streak > 0 ? "text-emerald-500" : "text-muted-foreground/20"}`}/>
                      <span className={`text-xs font-bold ${streak > 0 ? "text-emerald-600" : "text-muted-foreground/30"}`}>{streak}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Add / Edit modal ── */}
      <AnimatePresence>
        {showAdd && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowAdd(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.97 }}
              transition={{ duration: 0.25, ease: [0.16,1,0.3,1] }}
              className="fixed inset-x-0 top-[10%] z-50 mx-auto w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl overflow-hidden"
            >
              {/* Modal header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <p className="text-sm font-bold">{editId ? "Edit routine" : "New routine"}</p>
                <button onClick={() => setShowAdd(false)} className="h-7 w-7 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                  <X className="h-4 w-4"/>
                </button>
              </div>

              <div className="flex flex-col gap-4 p-5 max-h-[70vh] overflow-y-auto">
                {/* Name */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Routine name *</label>
                  <input
                    autoFocus
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Morning workout, Read 20 pages…"
                    className="h-10 w-full rounded-xl border border-border bg-input px-3 text-sm placeholder:text-muted-foreground/40 outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  />
                </div>

                {/* Description */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Description (optional)</label>
                  <input
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Brief note about this habit"
                    className="h-10 w-full rounded-xl border border-border bg-input px-3 text-sm placeholder:text-muted-foreground/40 outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  />
                </div>

                {/* Time */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Time (optional)</label>
                  <input
                    type="time"
                    value={form.time}
                    onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                    className="h-10 w-52 rounded-xl border border-border bg-input px-3 text-sm outline-none focus:border-emerald-500/50 transition-all [color-scheme:light]"
                  />
                </div>

                {/* Days of week */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-medium text-muted-foreground">Repeat on <span className="text-muted-foreground/50">(empty = every day)</span></label>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {DAY_LABELS.map((label, idx) => (
                      <button
                        key={idx}
                        onClick={() => toggleDay(idx)}
                        className={`h-8 w-10 rounded-lg text-xs font-semibold border transition-all
                          ${form.daysOfWeek.includes(idx)
                            ? "bg-emerald-500 text-white border-emerald-500"
                            : "border-border text-muted-foreground hover:border-emerald-500/40 hover:text-foreground"}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Color */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-medium text-muted-foreground">Color</label>
                  <div className="flex items-center gap-2 flex-wrap">
                    {COLORS.map(c => (
                      <button
                        key={c.bg}
                        onClick={() => setForm(f => ({ ...f, color: c.bg }))}
                        className={`h-7 w-7 rounded-full ${c.bg} transition-all ${form.color === c.bg ? `ring-2 ring-offset-2 ring-offset-card ${c.ring}` : "opacity-60 hover:opacity-100"}`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex gap-2 px-5 py-4 border-t border-border">
                <button onClick={() => setShowAdd(false)} className="flex-1 h-10 rounded-xl border border-border bg-secondary text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                  Cancel
                </button>
                <button
                  onClick={save}
                  disabled={!form.name.trim()}
                  className="flex-1 h-10 rounded-xl bg-emerald-500 text-sm font-semibold text-white hover:bg-emerald-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editId ? "Save changes" : "Add routine"}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Close menu on outside click */}
      {menuId && <div className="fixed inset-0 z-10" onClick={() => setMenuId(null)}/>}
    </div>
  );
}
