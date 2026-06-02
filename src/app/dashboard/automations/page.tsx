"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Search, Filter, Zap, MessageCircle, UserPlus, AtSign,
  Link2, Mail, Play, ArrowRight, X, MoreHorizontal, Copy,
  Trash2, TrendingUp, Users, CheckCircle2, PauseCircle,
  LayoutGrid, List, UserCheck, ChevronDown, ChevronUp, Sparkles, Film,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/types";

/* ─── types ─────────────────────────────────────────────── */
type TriggerType = "Comment Keyword" | "DM Keyword" | "New Follower" | "Story Reply" | "Mention" | "Bio Link Click";
type ActionType  = "Send DM" | "Reply Comment" | "Add to Leads" | "Send Story";
type AutoStatus  = "Active" | "Paused" | "Draft";

interface Reel {
  id: string;
  name: string;
  gradient: string;
  emoji: string;
}

interface Automation {
  id: string;
  name: string;
  triggerType: TriggerType;
  triggerKeyword?: string;
  actionType: ActionType;
  message: string;
  status: AutoStatus;
  triggered: number;
  leads: number;
  lastRun?: string;
  createdAt: string;
  reels: Reel[];
  requireFollow: boolean;
}

/* ─── constants ─────────────────────────────────────────── */
const TRIGGER_META: Record<TriggerType, { icon: React.ComponentType<{className?:string}>; color: string; bg: string; border: string }> = {
  "Comment Keyword": { icon: MessageCircle, color:"text-blue-600",    bg:"bg-blue-500/10",    border:"border-blue-500/20"   },
  "DM Keyword":      { icon: Mail,          color:"text-blue-700",  bg:"bg-blue-500/10",  border:"border-blue-500/20" },
  "New Follower":    { icon: UserPlus,      color:"text-emerald-700", bg:"bg-emerald-500/10", border:"border-emerald-500/20"},
  "Story Reply":     { icon: Play,          color:"text-emerald-700",  bg:"bg-emerald-500/10",  border:"border-emerald-500/20" },
  "Mention":         { icon: AtSign,        color:"text-blue-700",    bg:"bg-blue-500/10",    border:"border-blue-500/20"   },
  "Bio Link Click":  { icon: Link2,         color:"text-blue-700",    bg:"bg-blue-500/10",    border:"border-blue-500/20"   },
};
const ACTION_META: Record<ActionType, { icon: React.ComponentType<{className?:string}>; color: string }> = {
  "Send DM":       { icon: Mail,          color:"text-blue-600"    },
  "Reply Comment": { icon: MessageCircle, color:"text-blue-700"  },
  "Add to Leads":  { icon: Users,         color:"text-emerald-700" },
  "Send Story":    { icon: Play,          color:"text-emerald-700"  },
};

const ALL_TRIGGERS: TriggerType[] = ["Comment Keyword","DM Keyword","New Follower","Story Reply","Mention","Bio Link Click"];
const ALL_ACTIONS:  ActionType[]  = ["Send DM","Reply Comment","Add to Leads","Send Story"];

const REEL_GRADIENTS = [
  "from-blue-600 to-indigo-700",
  "from-blue-600 to-purple-700",
  "from-blue-600 to-cyan-700",
  "from-rose-600 to-blue-700",
  "from-rose-600 to-emerald-700",
  "from-emerald-600 to-green-700",
  "from-blue-600 to-rose-700",
  "from-sky-600 to-blue-700",
];

/* ─── DM presets ─────────────────────────────────────────── */
const DM_PRESETS = [
  { label:"Free Resource", msg:"Hey {first_name}! 👋 Thanks for commenting! Here's the link you asked for → [link] 🔥 Let me know if you have questions!" },
  { label:"Unlock Access", msg:"Heyy {first_name}! 🎉 You just unlocked access! Grab it here: [link] 💫 Enjoy!" },
  { label:"Friendly Drop", msg:"Hey {first_name}! 🙌 Saw your comment — here's the free resource: [link] ✨ Hope it helps!" },
  { label:"Guide Delivery", msg:"Hi {first_name}! ✅ Here's your guide: [link] 📖 Let me know if you have any Qs! 💬" },
  { label:"Hype Drop",     msg:"What's up {first_name}! 🚀 You asked for it — here it is: [link] Go crush it! 💪🔥" },
  { label:"VIP Secret",    msg:"Hey {first_name}! 💌 Your exclusive link is ready → [link] 🤫 Don't share it — it's just for you!" },
  { label:"Follow CTA",    msg:"Hey {first_name}! 🎁 Here's your freebie: [link] ✨ PS — make sure you follow for more like this! 👀" },
  { label:"Confirmed",     msg:"Hi {first_name}! 📲 Your access is confirmed! Click here: [link] 🙌 See you inside!" },
  { label:"Warm Welcome",  msg:"Welcome {first_name}! 🌟 So glad you're here! I made this just for you: [link] 💙 Reply anytime!" },
  { label:"Story Reply",   msg:"Hey {first_name}! 😍 Loved that you replied to my story! Here's what you were looking for: [link] 🎯" },
];

function uid() { return Math.random().toString(36).slice(2, 9); }

function dbToAuto(row: Tables<"automations">): Automation {
  return {
    id: row.id, name: row.name,
    triggerType: row.trigger_type as TriggerType,
    triggerKeyword: row.trigger_keyword ?? undefined,
    actionType: row.action_type as ActionType,
    message: row.message, status: row.status as AutoStatus,
    triggered: row.triggered, leads: row.leads,
    lastRun: row.last_run ?? undefined,
    createdAt: new Date(row.created_at).toLocaleDateString("en-US",{day:"numeric",month:"short",year:"numeric"}),
    reels: [], requireFollow: row.require_follow,
  };
}

/* ═══════════════════════════════════════════════════════════ */
export default function AutomationsPage() {
  const supabase = createClient();
  const [userId, setUserId] = useState<string|null>(null);

  const [autos,     setAutos]     = useState<Automation[]>([]);
  const [search,    setSearch]    = useState("");
  const [statusF,   setStatusF]   = useState<AutoStatus|"All">("All");
  const [view,      setView]      = useState<"grid"|"list">("grid");
  const [showAdd,   setShowAdd]   = useState(false);
  const [menu,      setMenu]      = useState<string|null>(null);
  const [showPresets, setShowPresets] = useState(false);
  const [reelOpen,  setReelOpen]  = useState(false);

  const [reels,        setReels]        = useState<Reel[]>([]);
  const [showAddReel,  setShowAddReel]  = useState(false);
  const [newReelName,  setNewReelName]  = useState("");
  const [newReelEmoji, setNewReelEmoji] = useState("🎬");
  const [addingReel,   setAddingReel]   = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => { if (data.user) setUserId(data.user.id); });
  }, []);

  useEffect(() => {
    if (!userId) return;
    supabase.from("automations").select("*").eq("user_id", userId).order("created_at", { ascending: false })
      .then(({ data }) => { if (data) setAutos(data.map(dbToAuto)); });
    supabase.from("reels").select("*").eq("user_id", userId).order("created_at")
      .then(({ data }) => {
        if (data) setReels(data.map((r, i) => ({
          id: r.id, name: r.name, emoji: r.emoji,
          gradient: REEL_GRADIENTS[i % REEL_GRADIENTS.length],
        })));
      });
  }, [userId]);

  const FORM_DEFAULT = {
    name:"", triggerType:"Comment Keyword" as TriggerType, triggerKeyword:"",
    actionType:"Send DM" as ActionType, message:"", status:"Draft" as AutoStatus,
    selectedReels:[] as Reel[], requireFollow:false,
  };
  const [form, setForm] = useState({...FORM_DEFAULT});

  const filtered = autos.filter(a=>
    (statusF==="All"||a.status===statusF)&&
    (a.name.toLowerCase().includes(search.toLowerCase())||
     (a.triggerKeyword||"").toLowerCase().includes(search.toLowerCase()))
  );

  const active  = autos.filter(a=>a.status==="Active").length;
  const totTrig = autos.reduce((s,a)=>s+a.triggered,0);
  const totLead = autos.reduce((s,a)=>s+a.leads,0);

  async function setStatus(id: string, s: AutoStatus) {
    await supabase.from("automations").update({ status: s }).eq("id", id);
    setAutos(p=>p.map(a=>a.id===id?{...a,status:s}:a));
  }
  async function toggleActive(id: string) {
    const a = autos.find(x=>x.id===id); if (!a) return;
    const ns = a.status==="Active" ? "Paused" : "Active";
    await supabase.from("automations").update({ status: ns }).eq("id", id);
    setAutos(p=>p.map(x=>x.id===id?{...x,status:ns}:x));
  }
  async function duplicateAuto(id: string) {
    if (!userId) return;
    const a = autos.find(x=>x.id===id); if (!a) return;
    const { data } = await supabase.from("automations").insert({
      user_id: userId, name: a.name+" (copy)", trigger_type: a.triggerType,
      trigger_keyword: a.triggerKeyword??null, action_type: a.actionType,
      message: a.message, status: "Draft", triggered: 0, leads: 0, require_follow: a.requireFollow,
    }).select().single();
    if (data) setAutos(p=>[dbToAuto(data),...p]);
    setMenu(null);
  }
  async function deleteAuto(id: string) {
    await supabase.from("automations").delete().eq("id", id);
    setAutos(p=>p.filter(a=>a.id!==id)); setMenu(null);
  }

  async function addAuto() {
    if (!userId || !form.name.trim() || !form.message.trim()) return;
    const { data } = await supabase.from("automations").insert({
      user_id: userId, name: form.name, trigger_type: form.triggerType,
      trigger_keyword: form.triggerKeyword||null, action_type: form.actionType,
      message: form.message, status: form.status, triggered: 0, leads: 0, require_follow: form.requireFollow,
    }).select().single();
    if (data) setAutos(p=>[{...dbToAuto(data), reels: form.selectedReels},...p]);
    setShowAdd(false); setForm({...FORM_DEFAULT}); setShowPresets(false); setReelOpen(false);
  }

  function toggleReel(reel: Reel) {
    setForm(f=>({...f, selectedReels: f.selectedReels.find(r=>r.id===reel.id)
      ? f.selectedReels.filter(r=>r.id!==reel.id)
      : [...f.selectedReels, reel]
    }));
  }

  async function addReel() {
    if (!userId || !newReelName.trim()) return;
    setAddingReel(true);
    const { data } = await supabase.from("reels").insert({
      user_id: userId, name: newReelName.trim(), emoji: newReelEmoji,
      gradient: REEL_GRADIENTS[reels.length % REEL_GRADIENTS.length],
    }).select().single();
    if (data) {
      const newReel: Reel = { id: data.id, name: data.name, emoji: data.emoji, gradient: REEL_GRADIENTS[reels.length % REEL_GRADIENTS.length] };
      setReels(prev => [...prev, newReel]);
    }
    setNewReelName(""); setNewReelEmoji("🎬"); setShowAddReel(false); setAddingReel(false);
  }

  async function deleteReel(id: string) {
    await supabase.from("reels").delete().eq("id", id);
    setReels(prev => prev.filter(r => r.id !== id));
    setForm(f => ({ ...f, selectedReels: f.selectedReels.filter(r => r.id !== id) }));
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background" onClick={()=>setMenu(null)}>

      {/* ── Header ─────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-border px-6 py-4 flex-shrink-0">
        <div>
          <p className="text-xs text-muted-foreground">{new Date().toLocaleDateString("en-US",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</p>
          <h1 className="text-xl font-bold mt-0.5">Automations <span className="text-muted-foreground font-normal text-base">({autos.length})</span></h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 h-9 rounded-xl border border-border bg-secondary px-3">
            <Search className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0"/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search automations…"
              className="bg-transparent text-xs outline-none w-44 placeholder:text-muted-foreground/50"/>
          </div>
          <button onClick={()=>setShowAdd(true)} className="flex items-center gap-1.5 h-9 rounded-xl bg-blue-500 px-4 text-xs font-semibold text-white hover:bg-blue-400 transition-colors">
            <Plus className="h-4 w-4"/> New automation
          </button>
        </div>
      </div>

      {/* ── Stat strip ─────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-0 border-b border-border flex-shrink-0">
        {[
          { label:"Total",          val:autos.length, color:"text-foreground",  icon:Zap,          bg:"bg-blue-500/10"    },
          { label:"Active",         val:active,        color:"text-emerald-700", icon:CheckCircle2, bg:"bg-emerald-500/10" },
          { label:"Total Triggered",val:totTrig,       color:"text-blue-600",    icon:TrendingUp,   bg:"bg-blue-500/10"    },
          { label:"Leads Captured", val:totLead,       color:"text-blue-700",  icon:Users,        bg:"bg-blue-500/10"  },
        ].map(({label,val,color,icon:Icon,bg},i)=>(
          <div key={label} className={`px-6 py-3 flex items-center gap-3 ${i<3?"border-r border-border":""}`}>
            <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${bg}`}>
              <Icon className={`h-4 w-4 ${color}`}/>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">{label}</p>
              <p className={`text-2xl font-bold ${color}`}>{val.toLocaleString()}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Toolbar ────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-1">
          {(["All","Active","Paused","Draft"] as const).map(s=>(
            <button key={s} onClick={()=>setStatusF(s as AutoStatus|"All")}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all
                ${statusF===s?"bg-blue-500 text-white":"bg-secondary text-muted-foreground hover:text-foreground"}`}>
              {s}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 h-8 rounded-xl border border-border bg-card px-3 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
            <Filter className="h-3.5 w-3.5"/> Filter
          </button>
          <div className="flex items-center rounded-xl border border-border bg-secondary p-0.5 gap-0.5">
            <button onClick={()=>setView("grid")} className={`h-7 w-7 rounded-lg flex items-center justify-center transition-all ${view==="grid"?"bg-card text-foreground shadow-sm":"text-muted-foreground hover:text-foreground"}`}>
              <LayoutGrid className="h-3.5 w-3.5"/>
            </button>
            <button onClick={()=>setView("list")} className={`h-7 w-7 rounded-lg flex items-center justify-center transition-all ${view==="list"?"bg-card text-foreground shadow-sm":"text-muted-foreground hover:text-foreground"}`}>
              <List className="h-3.5 w-3.5"/>
            </button>
          </div>
        </div>
      </div>

      {/* ── Content ────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-6">
        {filtered.length===0?(
          <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
            <div className="h-14 w-14 rounded-2xl bg-blue-500/10 flex items-center justify-center">
              <Zap className="h-7 w-7 text-blue-600"/>
            </div>
            <div>
              <p className="font-semibold">No automations found</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-xs">Create keyword → DM automations to capture leads automatically.</p>
            </div>
            <button onClick={()=>setShowAdd(true)} className="flex items-center gap-2 rounded-xl bg-blue-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-400 transition-colors">
              <Plus className="h-4 w-4"/> Create automation
            </button>
          </div>
        ):view==="grid"?(
          <div className="grid grid-cols-2 gap-4">
            <AnimatePresence>
              {filtered.map((auto,i)=>{
                const TIcon = TRIGGER_META[auto.triggerType].icon;
                const AIcon = ACTION_META[auto.actionType].icon;
                const isActive = auto.status==="Active";
                return (
                  <motion.div key={auto.id}
                    initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} exit={{opacity:0,scale:0.97}}
                    transition={{delay:i*0.05,duration:0.25}}
                    className={`rounded-2xl border bg-card flex flex-row overflow-hidden transition-all
                      ${isActive?"border-blue-500/20 shadow-[0_0_24px_rgba(59,130,246,0.06)]":"border-border"}`}>

                    {/* ── Left: info panel ── */}
                    <div className="flex flex-col flex-1 min-w-0">
                      {/* Header */}
                      <div className="flex items-start justify-between px-5 pt-5 pb-4">
                        <div className="flex-1 min-w-0 pr-3">
                          <p className="text-sm font-bold truncate">{auto.name}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{auto.createdAt}{auto.lastRun?` · Last run ${auto.lastRun}`:""}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button onClick={()=>toggleActive(auto.id)}
                            className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-semibold border transition-all
                              ${isActive
                                ?"bg-emerald-500/12 text-emerald-700 border-emerald-500/25 hover:bg-emerald-500/20"
                                :"bg-rose-500/12 text-rose-700 border-rose-500/25 hover:bg-rose-500/20"}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${isActive?"bg-emerald-400":"bg-rose-400"}`}/>
                            {isActive?"Active":"Paused"}
                          </button>
                          <div className="relative">
                            <button onClick={e=>{e.stopPropagation();setMenu(m=>m===auto.id?null:auto.id);}}
                              className="h-7 w-7 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                              <MoreHorizontal className="h-3.5 w-3.5"/>
                            </button>
                            {menu===auto.id&&(
                              <div onClick={e=>e.stopPropagation()}
                                className="absolute top-8 right-0 z-20 w-44 rounded-xl border border-border bg-card shadow-2xl py-1 overflow-hidden">
                                <button onClick={()=>{toggleActive(auto.id);setMenu(null);}} className="flex items-center gap-2 w-full px-3 py-2 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
                                  <PauseCircle className="h-3.5 w-3.5"/> {isActive?"Pause automation":"Activate"}
                                </button>
                                <button onClick={()=>duplicateAuto(auto.id)} className="flex items-center gap-2 w-full px-3 py-2 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
                                  <Copy className="h-3.5 w-3.5"/> Duplicate
                                </button>
                                <div className="h-px bg-border mx-2 my-1"/>
                                <button onClick={()=>deleteAuto(auto.id)} className="flex items-center gap-2 w-full px-3 py-2 text-xs text-rose-700 hover:bg-rose-500/10 transition-colors">
                                  <Trash2 className="h-3.5 w-3.5"/> Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Trigger → Action */}
                      <div className="flex items-stretch gap-2 px-5 pb-4">
                        <div className={`flex-1 rounded-xl border ${TRIGGER_META[auto.triggerType].border} ${TRIGGER_META[auto.triggerType].bg} p-3 flex flex-col gap-1.5`}>
                          <div className="flex items-center gap-1.5">
                            <TIcon className={`h-3.5 w-3.5 ${TRIGGER_META[auto.triggerType].color}`}/>
                            <span className={`text-[9px] font-bold uppercase tracking-wider ${TRIGGER_META[auto.triggerType].color}`}>Trigger</span>
                          </div>
                          <p className="text-xs font-semibold">{auto.triggerType}</p>
                          {auto.triggerKeyword&&(
                            <span className="self-start rounded-full bg-black/[0.06] px-2 py-0.5 text-[10px] font-mono font-medium">&quot;{auto.triggerKeyword}&quot;</span>
                          )}
                        </div>
                        <div className="flex items-center">
                          <div className="h-6 w-6 rounded-full bg-secondary border border-border flex items-center justify-center">
                            <ArrowRight className="h-3 w-3 text-muted-foreground"/>
                          </div>
                        </div>
                        <div className="flex-1 rounded-xl border border-border bg-secondary/50 p-3 flex flex-col gap-1.5">
                          <div className="flex items-center gap-1.5">
                            <AIcon className={`h-3.5 w-3.5 ${ACTION_META[auto.actionType].color}`}/>
                            <span className={`text-[9px] font-bold uppercase tracking-wider ${ACTION_META[auto.actionType].color}`}>Action</span>
                          </div>
                          <p className="text-xs font-semibold">{auto.actionType}</p>
                          <p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed">{auto.message}</p>
                        </div>
                      </div>

                      {/* Footer stats */}
                      <div className="flex items-center justify-between px-5 py-3 border-t border-border/50 mt-auto">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5">
                            <Zap className="h-3 w-3 text-blue-600"/>
                            <span className="text-[11px] font-semibold">{auto.triggered.toLocaleString()}</span>
                            <span className="text-[10px] text-muted-foreground">triggered</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Users className="h-3 w-3 text-blue-700"/>
                            <span className="text-[11px] font-semibold">{auto.leads.toLocaleString()}</span>
                            <span className="text-[10px] text-muted-foreground">leads</span>
                          </div>
                        </div>
                        {auto.requireFollow&&(
                          <div className="flex items-center gap-1 rounded-full bg-blue-500/10 border border-blue-500/20 px-2 py-0.5">
                            <UserCheck className="h-2.5 w-2.5 text-blue-600"/>
                            <span className="text-[9px] font-semibold text-blue-600">Follow required</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ── Right: reel previews panel ── */}
                    <div className="w-[140px] flex-shrink-0 border-l border-border/50 bg-black/30 flex flex-col">
                      <p className="text-[9px] font-semibold uppercase tracking-wider text-white/30 px-3 pt-3 pb-2">Reels</p>
                      {auto.reels.length>0?(
                        <div className="flex-1 overflow-hidden px-2 pb-2 flex flex-col gap-1.5">
                          {auto.reels.slice(0,3).map((reel,ri)=>{
                            const gradients = [
                              "from-violet-900 via-purple-800 to-indigo-900",
                              "from-blue-900 via-cyan-800 to-teal-900",
                              "from-rose-900 via-pink-800 to-fuchsia-900",
                              "from-amber-900 via-orange-800 to-red-900",
                              "from-emerald-900 via-green-800 to-teal-900",
                            ];
                            const grad = gradients[ri % gradients.length];
                            return (
                              <div key={reel.id} className={`relative rounded-xl overflow-hidden bg-gradient-to-b ${grad} flex-1`} style={{minHeight:"60px"}}>
                                {/* Scanline texture */}
                                <div className="absolute inset-0 opacity-10" style={{backgroundImage:"repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(255,255,255,0.05) 2px,rgba(255,255,255,0.05) 4px)"}}/>
                                {/* Bottom gradient overlay */}
                                <div className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/80 to-transparent"/>
                                {/* Reel label */}
                                <div className="absolute bottom-0 left-0 right-0 px-2 pb-1.5">
                                  <p className="text-[8px] font-semibold text-white leading-tight line-clamp-2">{reel.name}</p>
                                  <p className="text-[7px] text-white/50 mt-0.5">{((auto.triggered/Math.max(auto.reels.length,1))*0.4+ri*120|0).toLocaleString()} views</p>
                                </div>
                                {/* Play indicator */}
                                <div className="absolute top-1.5 right-1.5 h-3.5 w-3.5 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                  <div className="w-0 h-0 border-t-[3px] border-b-[3px] border-l-[5px] border-transparent border-l-white/90 ml-0.5"/>
                                </div>
                              </div>
                            );
                          })}
                          {auto.reels.length>3&&(
                            <p className="text-[9px] text-white/30 text-center pb-1">+{auto.reels.length-3} more</p>
                          )}
                        </div>
                      ):(
                        <div className="flex-1 flex flex-col items-center justify-center gap-1.5 px-3 pb-4">
                          <div className="h-8 w-8 rounded-xl border border-white/10 flex items-center justify-center">
                            <Film className="h-4 w-4 text-white/20"/>
                          </div>
                          <p className="text-[9px] text-white/25 text-center leading-relaxed">No reels assigned</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {/* Add card */}
            <motion.button initial={{opacity:0}} animate={{opacity:1}}
              onClick={()=>setShowAdd(true)}
              className="rounded-2xl border border-dashed border-blue-500/20 bg-blue-500/5 p-5 flex flex-col items-center justify-center gap-3 text-center hover:border-blue-500/40 hover:bg-blue-500/8 transition-all min-h-[240px]">
              <div className="h-10 w-10 rounded-xl bg-blue-500/15 flex items-center justify-center">
                <Plus className="h-5 w-5 text-blue-600"/>
              </div>
              <div>
                <p className="text-sm font-semibold">New automation</p>
                <p className="text-[11px] text-muted-foreground mt-1">Set up a trigger → action flow</p>
              </div>
            </motion.button>
          </div>
        ):(
          /* List view */
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  {["Name","Trigger","Action","Reels","Status","Triggered","Leads",""].map(h=>(
                    <th key={h} className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {filtered.map((auto,i)=>{
                    const TIcon = TRIGGER_META[auto.triggerType].icon;
                    const isActive = auto.status==="Active";
                    return (
                      <motion.tr key={auto.id}
                        initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{delay:i*0.03}}
                        className="group border-b border-border/40 last:border-0 hover:bg-secondary/30 transition-colors">
                        <td className="px-4 py-3.5">
                          <p className="text-xs font-semibold">{auto.name}</p>
                          {auto.requireFollow&&<div className="flex items-center gap-1 mt-0.5"><UserCheck className="h-2.5 w-2.5 text-blue-600"/><span className="text-[9px] text-blue-600">Follow required</span></div>}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <TIcon className={`h-3.5 w-3.5 ${TRIGGER_META[auto.triggerType].color}`}/>
                            <div>
                              <p className="text-[11px] font-medium">{auto.triggerType}</p>
                              {auto.triggerKeyword&&<span className="text-[9px] font-mono text-muted-foreground">"{auto.triggerKeyword}"</span>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-[11px] text-muted-foreground">{auto.actionType}</td>
                        <td className="px-4 py-3.5">
                          <div className="flex -space-x-1.5">
                            {auto.reels.slice(0,3).map(r=>(
                              <div key={r.id} title={r.name} className={`h-6 w-6 rounded-lg bg-gradient-to-br ${r.gradient} border-2 border-card flex items-center justify-center text-xs`}>{r.emoji}</div>
                            ))}
                            {auto.reels.length>3&&<div className="h-6 w-6 rounded-lg bg-secondary border-2 border-card flex items-center justify-center text-[9px] font-bold text-muted-foreground">+{auto.reels.length-3}</div>}
                            {auto.reels.length===0&&<span className="text-[10px] text-muted-foreground/50">—</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <button onClick={()=>toggleActive(auto.id)}
                            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold border transition-all
                              ${isActive?"bg-emerald-500/12 text-emerald-700 border-emerald-500/25":"bg-rose-500/12 text-rose-700 border-rose-500/25"}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${isActive?"bg-emerald-400":"bg-rose-400"}`}/>
                            {isActive?"Active":"Paused"}
                          </button>
                        </td>
                        <td className="px-4 py-3.5"><span className="text-xs font-semibold text-blue-600">{auto.triggered.toLocaleString()}</span></td>
                        <td className="px-4 py-3.5"><span className="text-xs font-semibold text-blue-700">{auto.leads.toLocaleString()}</span></td>
                        <td className="px-4 py-3.5">
                          <button onClick={()=>deleteAuto(auto.id)} className="opacity-0 group-hover:opacity-100 h-6 w-6 rounded-lg hover:bg-rose-500/15 flex items-center justify-center text-muted-foreground hover:text-rose-700 transition-all">
                            <Trash2 className="h-3.5 w-3.5"/>
                          </button>
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ══ CREATE MODAL ════════════════════════════════ */}
      <AnimatePresence>
        {showAdd&&(
          <>
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={()=>setShowAdd(false)} className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"/>
            <motion.div initial={{opacity:0,scale:0.95,y:12}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:0.95,y:12}} transition={{duration:0.2}}
              className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[560px] max-h-[90vh] rounded-2xl border border-border bg-card shadow-2xl flex flex-col overflow-hidden">

              {/* Modal header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-xl bg-blue-500/15 flex items-center justify-center"><Zap className="h-4 w-4 text-blue-600"/></div>
                  <p className="font-bold text-base">New automation</p>
                </div>
                <button onClick={()=>setShowAdd(false)} className="h-7 w-7 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"><X className="h-4 w-4"/></button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5">

                {/* Name */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Automation name *</label>
                  <input autoFocus placeholder='e.g. "Comment FREE → Send Guide"' value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}
                    className="h-10 w-full rounded-xl border border-border bg-secondary px-3 text-sm placeholder:text-muted-foreground/40 outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20 transition-all"/>
                </div>

                {/* ① Trigger */}
                <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 flex flex-col gap-3">
                  <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">① Trigger</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Trigger type</label>
                      <select value={form.triggerType} onChange={e=>setForm(f=>({...f,triggerType:e.target.value as TriggerType}))}
                        className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-blue-500/60 transition-all">
                        {ALL_TRIGGERS.map(t=><option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    {(form.triggerType==="Comment Keyword"||form.triggerType==="DM Keyword")&&(
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Keyword (case-insensitive)</label>
                        <input placeholder='e.g. FREE, PRICE, INFO' value={form.triggerKeyword} onChange={e=>setForm(f=>({...f,triggerKeyword:e.target.value.toUpperCase()}))}
                          className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm font-mono placeholder:text-muted-foreground/40 outline-none focus:border-blue-500/60 transition-all"/>
                      </div>
                    )}
                  </div>
                </div>

                {/* ② Action */}
                <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 flex flex-col gap-3">
                  <p className="text-xs font-bold text-blue-700 uppercase tracking-wider">② Action</p>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Action type</label>
                    <select value={form.actionType} onChange={e=>setForm(f=>({...f,actionType:e.target.value as ActionType}))}
                      className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-blue-500/60 transition-all">
                      {ALL_ACTIONS.map(a=><option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>

                  {/* Message */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-muted-foreground">Message</label>
                      <div className="flex items-center gap-1.5">
                        {["{first_name}","{handle}","{post_title}"].map(v=>(
                          <button key={v} onClick={()=>setForm(f=>({...f,message:f.message+v}))}
                            className="rounded-md bg-card border border-border px-1.5 py-0.5 text-[9px] font-mono text-muted-foreground hover:text-foreground transition-colors">
                            {v}
                          </button>
                        ))}
                      </div>
                    </div>
                    <textarea placeholder="Write your DM message here…" value={form.message} onChange={e=>setForm(f=>({...f,message:e.target.value}))} rows={3}
                      className="w-full resize-none rounded-xl border border-border bg-card px-3 py-2 text-sm placeholder:text-muted-foreground/40 outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20 transition-all"/>

                    {/* Presets toggle */}
                    <button onClick={()=>setShowPresets(p=>!p)}
                      className="flex items-center gap-1.5 text-[11px] text-blue-600 hover:text-blue-700 transition-colors self-start">
                      <Sparkles className="h-3 w-3"/>
                      {showPresets?"Hide":"Browse"} message presets
                      {showPresets?<ChevronUp className="h-3 w-3"/>:<ChevronDown className="h-3 w-3"/>}
                    </button>

                    {/* Presets panel */}
                    <AnimatePresence>
                      {showPresets&&(
                        <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} exit={{opacity:0,height:0}} className="overflow-hidden">
                          <div className="grid grid-cols-2 gap-2 pt-1">
                            {DM_PRESETS.map(p=>(
                              <button key={p.label} onClick={()=>setForm(f=>({...f,message:p.msg}))}
                                className={`flex flex-col gap-1 rounded-xl border p-3 text-left transition-all hover:border-blue-500/40
                                  ${form.message===p.msg?"border-blue-500/50 bg-blue-500/8":"border-border bg-secondary/50 hover:bg-secondary"}`}>
                                <span className="text-[10px] font-semibold text-blue-600">{p.label}</span>
                                <span className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed">{p.msg}</span>
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Require follow toggle */}
                  <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="h-7 w-7 rounded-xl bg-blue-500/10 flex items-center justify-center">
                        <UserCheck className="h-3.5 w-3.5 text-blue-600"/>
                      </div>
                      <div>
                        <p className="text-xs font-semibold">Require follow before sending</p>
                        <p className="text-[10px] text-muted-foreground">User must follow your account to receive the DM</p>
                      </div>
                    </div>
                    <button onClick={()=>setForm(f=>({...f,requireFollow:!f.requireFollow}))}
                      style={{minWidth:"44px"}} className={`relative h-6 w-11 rounded-full transition-colors duration-200 flex-shrink-0 ${form.requireFollow?"bg-blue-500":"bg-muted border border-border"}`}>
                      <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-200 ${form.requireFollow?"translate-x-5":"translate-x-0"}`}/>
                    </button>
                  </div>
                </div>

                {/* ③ Assign to Reels */}
                <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-blue-700 uppercase tracking-wider">③ Assign to Reels <span className="text-muted-foreground font-normal normal-case tracking-normal">(optional)</span></p>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground">{form.selectedReels.length} selected</span>
                      <button onClick={()=>setShowAddReel(s=>!s)}
                        className="text-[10px] font-semibold text-blue-600 hover:text-blue-500 transition-colors flex items-center gap-0.5">
                        <Plus className="h-3 w-3"/>Add reel
                      </button>
                    </div>
                  </div>

                  {/* Add reel inline form */}
                  <AnimatePresence>
                    {showAddReel && (
                      <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} exit={{opacity:0,height:0}}
                        className="overflow-hidden">
                        <div className="flex gap-2 pb-1">
                          <input autoFocus value={newReelName} onChange={e=>setNewReelName(e.target.value)}
                            onKeyDown={e=>e.key==="Enter"&&addReel()}
                            placeholder="Reel title…"
                            className="flex-1 h-8 rounded-lg border border-border bg-card px-2.5 text-xs outline-none focus:border-blue-500/60 transition-all"/>
                          <input value={newReelEmoji} onChange={e=>setNewReelEmoji(e.target.value)}
                            className="h-8 w-10 rounded-lg border border-border bg-card px-2 text-sm text-center outline-none"/>
                          <button onClick={addReel} disabled={addingReel||!newReelName.trim()}
                            className="h-8 px-3 rounded-lg bg-blue-500 text-white text-xs font-semibold disabled:opacity-50 hover:bg-blue-400 transition-colors">
                            Add
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {reels.length === 0 ? (
                    <div className="flex flex-col items-center gap-1.5 py-4 text-center">
                      <Film className="h-6 w-6 text-muted-foreground/30"/>
                      <p className="text-xs text-muted-foreground">No reels yet — add one above to link automations to your content.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {reels.map(reel=>{
                        const sel = !!form.selectedReels.find(r=>r.id===reel.id);
                        return (
                          <button key={reel.id} onClick={()=>toggleReel(reel)}
                            className={`flex items-center gap-2.5 rounded-xl border p-2.5 text-left transition-all group
                              ${sel?"border-blue-500/40 bg-blue-500/8":"border-border bg-card hover:border-blue-500/20 hover:bg-secondary"}`}>
                            <div className={`h-10 w-8 rounded-lg bg-gradient-to-b ${reel.gradient} flex-shrink-0 relative overflow-hidden flex items-center justify-center text-base`}>
                              {reel.emoji}
                              <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/40 to-transparent"/>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] font-semibold truncate leading-tight">{reel.name}</p>
                              <p className="text-[9px] text-muted-foreground mt-0.5">Reel</p>
                            </div>
                            {sel
                              ? <CheckCircle2 className="h-3.5 w-3.5 text-blue-700 flex-shrink-0"/>
                              : <Trash2 onClick={e=>{e.stopPropagation();deleteReel(reel.id);}} className="h-3 w-3 text-muted-foreground/0 group-hover:text-muted-foreground/50 hover:!text-rose-500 flex-shrink-0 transition-colors"/>
                            }
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Status */}
                <div className="flex items-center justify-between rounded-xl border border-border bg-secondary/40 px-4 py-3">
                  <div>
                    <p className="text-xs font-semibold">Activate immediately</p>
                    <p className="text-[10px] text-muted-foreground">Start responding to triggers right away</p>
                  </div>
                  <button onClick={()=>setForm(f=>({...f,status:f.status==="Active"?"Draft":"Active"}))}
                    style={{minWidth:"44px"}} className={`relative h-6 w-11 rounded-full transition-colors duration-200 flex-shrink-0 ${form.status==="Active"?"bg-blue-500":"bg-muted border border-border"}`}>
                    <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-200 ${form.status==="Active"?"translate-x-5":"translate-x-0"}`}/>
                  </button>
                </div>
              </div>

              {/* Footer */}
              <div className="flex gap-2 px-6 py-4 border-t border-border flex-shrink-0">
                <button onClick={()=>setShowAdd(false)} className="flex-1 h-10 rounded-xl border border-border bg-secondary text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
                <button onClick={addAuto} disabled={!form.name.trim()||!form.message.trim()}
                  className="flex-1 h-10 rounded-xl bg-blue-500 text-sm font-semibold text-white hover:bg-blue-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  Create automation
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
