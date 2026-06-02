"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Plus, Upload, Filter, ArrowUpDown, Download,
  ChevronLeft, ChevronRight, X, MessageCircle, Mail,
  Link2, Users, UserPlus, Play, Globe, Star, CheckCircle2,
} from "lucide-react";

/* ─── types ─────────────────────────────────────────────── */
type LeadStatus = "New Lead" | "Open" | "Contacted" | "Interested" | "Rejected" | "Converted";
type LeadSource = "Instagram Campaign" | "Comment Trigger" | "DM Reply" | "Bio Link" | "Story Swipe" | "Referral" | "Manually Added";

interface Lead {
  id: string;
  name: string;
  handle: string;
  role: string;
  email: string;
  phone: string;
  createdAt: string;
  source: LeadSource;
  status: LeadStatus;
  score: number;
  notes?: string;
}

/* ─── constants ─────────────────────────────────────────── */
const STATUS_STYLE: Record<LeadStatus, string> = {
  "New Lead":  "bg-blue-500/10 text-blue-600 border border-blue-500/25",
  "Open":      "bg-blue-500/10 text-blue-700 border border-blue-500/25",
  "Contacted": "bg-emerald-500/10 text-emerald-700 border border-emerald-500/25",
  "Interested":"bg-blue-500/10 text-blue-700 border border-blue-500/25",
  "Rejected":  "bg-rose-500/10 text-rose-700 border border-rose-500/25",
  "Converted": "bg-green-500/10 text-green-400 border border-green-500/25",
};

const SOURCE_ICON: Record<LeadSource, React.ComponentType<{className?:string}>> = {
  "Instagram Campaign": Link2,
  "Comment Trigger":    MessageCircle,
  "DM Reply":           Mail,
  "Bio Link":           Globe,
  "Story Swipe":        Play,
  "Referral":           Users,
  "Manually Added":     UserPlus,
};

const SOURCE_COLOR: Record<LeadSource, string> = {
  "Instagram Campaign": "text-blue-700",
  "Comment Trigger":    "text-blue-600",
  "DM Reply":           "text-blue-700",
  "Bio Link":           "text-blue-700",
  "Story Swipe":        "text-emerald-700",
  "Referral":           "text-emerald-700",
  "Manually Added":     "text-muted-foreground",
};

function scoreColor(s: number) {
  if (s >= 70) return "text-emerald-700";
  if (s >= 40) return "text-rose-700";
  return "text-rose-700";
}

function uid() { return Math.random().toString(36).slice(2, 9); }

const PAGE_SIZE = 10;
const ALL_STATUSES: LeadStatus[] = ["New Lead","Open","Contacted","Interested","Rejected","Converted"];
const ALL_SOURCES: LeadSource[]  = ["Instagram Campaign","Comment Trigger","DM Reply","Bio Link","Story Swipe","Referral","Manually Added"];

/* ════════════════════════════════════════════════════════════ */
export default function LeadsPage() {
  const supabase = createClient();
  const [userId, setUserId] = useState<string|null>(null);
  const [leads,     setLeads]     = useState<Lead[]>([]);
  const [search,    setSearch]    = useState("");
  const [statusF,   setStatusF]   = useState<LeadStatus|"All">("All");
  const [page,      setPage]      = useState(1);
  const [selected,  setSelected]  = useState<Set<string>>(new Set());
  const [showAdd,   setShowAdd]   = useState(false);
  const [showFilter,setShowFilter]= useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => { if (data.user) setUserId(data.user.id); });
  }, []);

  useEffect(() => {
    if (!userId) return;
    supabase.from("leads").select("*").eq("user_id", userId).order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setLeads(data.map(r => ({
          id: r.id, name: r.name, handle: r.handle??"", role: r.role??"",
          email: r.email??"", phone: r.phone??"",
          createdAt: new Date(r.created_at).toLocaleDateString("en-US",{day:"numeric",month:"short",year:"numeric"}),
          source: r.source as LeadSource, status: r.status as LeadStatus,
          score: r.score, notes: r.notes??undefined,
        })));
      });
  }, [userId]);

  const [form, setForm] = useState({
    name:"", handle:"", role:"", email:"", phone:"",
    source:"Instagram Campaign" as LeadSource,
    status:"New Lead" as LeadStatus,
    score:50, notes:"",
  });

  const filtered = leads.filter(l =>
    (statusF==="All" || l.status===statusF) &&
    (l.name.toLowerCase().includes(search.toLowerCase()) ||
     l.handle.toLowerCase().includes(search.toLowerCase()) ||
     l.role.toLowerCase().includes(search.toLowerCase()))
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE);

  async function addLead() {
    if (!userId || !form.name.trim()) return;
    const { data } = await supabase.from("leads").insert({
      user_id: userId, name: form.name, handle: form.handle||null, role: form.role||null,
      email: form.email||null, phone: form.phone||null, source: form.source,
      status: form.status, score: form.score, notes: form.notes||null,
    }).select().single();
    if (data) {
      const lead: Lead = {
        id: data.id, name: data.name, handle: data.handle??"", role: data.role??"",
        email: data.email??"", phone: data.phone??"",
        createdAt: new Date(data.created_at).toLocaleDateString("en-US",{day:"numeric",month:"short",year:"numeric"}),
        source: data.source as LeadSource, status: data.status as LeadStatus,
        score: data.score, notes: data.notes??undefined,
      };
      setLeads(p=>[lead,...p]);
    }
    setShowAdd(false);
    setForm({ name:"", handle:"", role:"", email:"", phone:"", source:"Instagram Campaign", status:"New Lead", score:50, notes:"" });
    setPage(1);
  }

  async function deleteLead(id: string) {
    await supabase.from("leads").delete().eq("id", id);
    setLeads(p=>p.filter(l=>l.id!==id)); setSelected(s=>{ s.delete(id); return new Set(s); });
  }

  function toggleSelect(id: string) {
    setSelected(s=>{ const n=new Set(s); n.has(id)?n.delete(id):n.add(id); return n; });
  }
  function toggleAll() {
    if (selected.size===paginated.length) setSelected(new Set());
    else setSelected(new Set(paginated.map(l=>l.id)));
  }

  async function cycleStatus(id: string) {
    const order: LeadStatus[] = ["New Lead","Open","Contacted","Interested","Converted","Rejected"];
    const lead = leads.find(l=>l.id===id); if (!lead) return;
    const ns = order[(order.indexOf(lead.status)+1)%order.length];
    await supabase.from("leads").update({ status: ns }).eq("id", id);
    setLeads(p=>p.map(l=>l.id===id?{...l,status:ns}:l));
  }

  const conv     = leads.filter(l=>l.status==="Converted").length;
  const newThis  = leads.filter(l=>l.status==="New Lead").length;
  const avgScore = leads.length ? Math.round(leads.reduce((a,l)=>a+l.score,0)/leads.length) : 0;

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">

      {/* ── Header ─────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-border px-6 py-4 flex-shrink-0">
        <div>
          <p className="text-xs text-muted-foreground">{new Date().toLocaleDateString("en-US",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</p>
          <h1 className="text-xl font-bold mt-0.5">Leads <span className="text-muted-foreground font-normal text-base">({leads.length.toLocaleString()})</span></h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 h-9 rounded-xl border border-border bg-secondary px-3">
            <Search className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0"/>
            <input value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} placeholder="Search leads…"
              className="bg-transparent text-xs outline-none w-44 placeholder:text-muted-foreground/50"/>
          </div>
          <button onClick={()=>setShowAdd(true)} className="flex items-center gap-1.5 h-9 rounded-xl bg-blue-500 px-4 text-xs font-semibold text-white hover:bg-blue-400 transition-colors">
            <Plus className="h-4 w-4"/> Add new
          </button>
        </div>
      </div>

      {/* ── Stat strip ─────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-0 border-b border-border flex-shrink-0">
        {[
          { label:"Total Leads",   val:leads.length,     color:"text-foreground"    },
          { label:"New Leads",     val:newThis,           color:"text-blue-600"      },
          { label:"Converted",     val:conv,              color:"text-emerald-700"   },
          { label:"Avg Score",     val:avgScore,          color:"text-rose-700"     },
        ].map(({label,val,color},i)=>(
          <div key={label} className={`px-6 py-3 flex items-center gap-3 ${i<3?"border-r border-border":""}`}>
            <div>
              <p className="text-[10px] text-muted-foreground">{label}</p>
              <p className={`text-2xl font-bold ${color}`}>{val}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Toolbar ────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <button onClick={()=>setShowAdd(true)} className="flex items-center gap-1.5 h-8 rounded-xl bg-blue-500 px-3 text-xs font-semibold text-white hover:bg-blue-400 transition-colors">
            <Plus className="h-3.5 w-3.5"/> Add Lead
          </button>
          <button className="flex items-center gap-1.5 h-8 rounded-xl border border-border bg-card px-3 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
            <Upload className="h-3.5 w-3.5"/> Import Leads
          </button>
        </div>
        <div className="flex items-center gap-2">
          {/* Status filter pills */}
          <div className="flex items-center gap-1">
            {(["All",...ALL_STATUSES] as const).map(s=>(
              <button key={s} onClick={()=>{setStatusF(s as LeadStatus|"All");setPage(1);}}
                className={`rounded-lg px-2.5 py-1 text-[10px] font-medium transition-all
                  ${statusF===s?"bg-blue-500 text-white":"bg-secondary text-muted-foreground hover:text-foreground"}`}>
                {s}
              </button>
            ))}
          </div>
          <div className="h-4 w-px bg-border"/>
          <button className="flex items-center gap-1.5 h-8 rounded-xl border border-border bg-card px-3 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
            <Filter className="h-3.5 w-3.5"/> Filter
          </button>
          <button className="flex items-center gap-1.5 h-8 rounded-xl border border-border bg-card px-3 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
            <ArrowUpDown className="h-3.5 w-3.5"/> Sort by
          </button>
          <button className="flex items-center gap-1.5 h-8 rounded-xl border border-border bg-card px-3 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
            <Download className="h-3.5 w-3.5"/> Export
          </button>
        </div>
      </div>

      {/* ── Table ──────────────────────────────────────── */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm">
            <tr className="border-b border-border">
              <th className="w-10 px-4 py-3">
                <input type="checkbox" checked={selected.size===paginated.length&&paginated.length>0} onChange={toggleAll}
                  className="h-3.5 w-3.5 rounded accent-blue-500"/>
              </th>
              {["Name","Role","Contact","Lead Created","Lead Source","Lead Status","Lead Score","Notes"].map(h=>(
                <th key={h} className="text-left px-3 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 whitespace-nowrap">
                  <button className="flex items-center gap-1 hover:text-foreground transition-colors">
                    {h} <ArrowUpDown className="h-2.5 w-2.5"/>
                  </button>
                </th>
              ))}
              <th className="w-10"/>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {paginated.length===0&&(
                <tr>
                  <td colSpan={10}>
                    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                      <div className="h-10 w-10 rounded-2xl bg-secondary flex items-center justify-center">
                        <Users className="h-5 w-5 text-muted-foreground"/>
                      </div>
                      <div>
                        <p className="text-sm font-medium">No leads found</p>
                        <p className="text-xs text-muted-foreground mt-1">Try adjusting your search or filters</p>
                      </div>
                      <button onClick={()=>setShowAdd(true)} className="text-xs text-blue-600 hover:text-blue-700 transition-colors">+ Add your first lead</button>
                    </div>
                  </td>
                </tr>
              )}
              {paginated.map((lead,i)=>{
                const SrcIcon = SOURCE_ICON[lead.source];
                return (
                  <motion.tr key={lead.id}
                    initial={{opacity:0,y:-4}} animate={{opacity:1,y:0}} exit={{opacity:0,x:-16}}
                    transition={{delay:i*0.03,duration:0.2}}
                    className={`group border-b border-border/40 last:border-0 transition-colors
                      ${selected.has(lead.id)?"bg-blue-500/5":"hover:bg-secondary/30"}`}>

                    {/* Checkbox */}
                    <td className="px-4 py-3.5">
                      <input type="checkbox" checked={selected.has(lead.id)} onChange={()=>toggleSelect(lead.id)}
                        className="h-3.5 w-3.5 rounded accent-blue-500"/>
                    </td>

                    {/* Name */}
                    <td className="px-3 py-3.5 min-w-[140px]">
                      <div className="flex items-center gap-2.5">
                        <div className="h-7 w-7 flex-shrink-0 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-[10px] font-bold text-white">
                          {lead.name.split(" ").map(n=>n[0]).join("").slice(0,2)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold truncate">{lead.name}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{lead.handle}</p>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="px-3 py-3.5">
                      <span className="text-xs text-muted-foreground whitespace-nowrap">{lead.role}</span>
                    </td>

                    {/* Contact */}
                    <td className="px-3 py-3.5 min-w-[160px]">
                      <p className="text-[11px] text-muted-foreground truncate">{lead.email}</p>
                      <p className="text-[11px] text-muted-foreground/70">{lead.phone}</p>
                    </td>

                    {/* Created */}
                    <td className="px-3 py-3.5 whitespace-nowrap">
                      <span className="text-[11px] text-muted-foreground">{lead.createdAt}</span>
                    </td>

                    {/* Source */}
                    <td className="px-3 py-3.5 min-w-[160px]">
                      <div className="flex items-center gap-1.5">
                        <SrcIcon className={`h-3.5 w-3.5 flex-shrink-0 ${SOURCE_COLOR[lead.source]}`}/>
                        <span className="text-[11px] text-muted-foreground whitespace-nowrap">{lead.source}</span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-3 py-3.5">
                      <button onClick={()=>cycleStatus(lead.id)}
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold whitespace-nowrap transition-all hover:brightness-110 ${STATUS_STYLE[lead.status]}`}>
                        {lead.status}
                      </button>
                    </td>

                    {/* Score */}
                    <td className="px-3 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold ${scoreColor(lead.score)}`}>{lead.score}</span>
                        <div className="w-16 h-1.5 rounded-full bg-secondary overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${lead.score>=70?"bg-emerald-500":lead.score>=40?"bg-rose-500":"bg-rose-500"}`}
                            style={{width:`${lead.score}%`}}/>
                        </div>
                      </div>
                    </td>

                    {/* Notes */}
                    <td className="px-3 py-3.5 max-w-[120px]">
                      <span className="text-[11px] text-muted-foreground/60 truncate block">{lead.notes||"—"}</span>
                    </td>

                    {/* Delete */}
                    <td className="px-3 py-3.5">
                      <button onClick={()=>deleteLead(lead.id)}
                        className="opacity-0 group-hover:opacity-100 h-6 w-6 rounded-lg hover:bg-rose-500/15 flex items-center justify-center text-muted-foreground hover:text-rose-700 transition-all">
                        <X className="h-3.5 w-3.5"/>
                      </button>
                    </td>
                  </motion.tr>
                );
              })}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      {/* ── Pagination ─────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 py-3 border-t border-border flex-shrink-0">
        <span className="text-[11px] text-muted-foreground">
          Showing {Math.min((page-1)*PAGE_SIZE+1, filtered.length)}–{Math.min(page*PAGE_SIZE, filtered.length)} of {filtered.length} leads
        </span>
        <div className="flex items-center gap-1">
          <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}
            className="flex items-center gap-1 h-7 rounded-lg border border-border bg-card px-2.5 text-[11px] text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors">
            <ChevronLeft className="h-3.5 w-3.5"/> Prev
          </button>
          {Array.from({length:totalPages},(_,i)=>i+1).filter(p=>p===1||p===totalPages||Math.abs(p-page)<=1).reduce<(number|"…")[]>((acc,p,i,arr)=>{
            if(i>0&&(p as number)-(arr[i-1] as number)>1) acc.push("…");
            acc.push(p); return acc;
          },[]).map((p,i)=>(
            p==="…"
              ? <span key={`e${i}`} className="h-7 w-7 flex items-center justify-center text-[11px] text-muted-foreground">…</span>
              : <button key={p} onClick={()=>setPage(p as number)}
                  className={`h-7 w-7 rounded-lg text-[11px] font-semibold transition-all
                    ${page===p?"bg-blue-500 text-white":"border border-border bg-card text-muted-foreground hover:text-foreground"}`}>
                  {String(p).padStart(2,"0")}
                </button>
          ))}
          <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages}
            className="flex items-center gap-1 h-7 rounded-lg border border-border bg-card px-2.5 text-[11px] text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors">
            Next <ChevronRight className="h-3.5 w-3.5"/>
          </button>
        </div>
      </div>

      {/* ══ ADD LEAD MODAL ══════════════════════════════ */}
      <AnimatePresence>
        {showAdd&&(
          <>
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={()=>setShowAdd(false)} className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"/>
            <motion.div initial={{opacity:0,scale:0.95,y:12}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:0.95,y:12}} transition={{duration:0.2}}
              className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] rounded-2xl border border-border bg-card shadow-2xl p-6 flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between">
                <p className="font-bold text-base">Add new lead</p>
                <button onClick={()=>setShowAdd(false)} className="h-7 w-7 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"><X className="h-4 w-4"/></button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Full name *</label>
                  <input autoFocus placeholder="e.g. Sarah Johnson" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}
                    className="h-10 w-full rounded-xl border border-border bg-secondary px-3 text-sm placeholder:text-muted-foreground/40 outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20 transition-all"/>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Instagram handle</label>
                  <input placeholder="@handle" value={form.handle} onChange={e=>setForm(f=>({...f,handle:e.target.value}))}
                    className="h-10 w-full rounded-xl border border-border bg-secondary px-3 text-sm placeholder:text-muted-foreground/40 outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20 transition-all"/>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Role / Niche</label>
                <input placeholder="e.g. Creator, Business Owner, Coach" value={form.role} onChange={e=>setForm(f=>({...f,role:e.target.value}))}
                  className="h-10 w-full rounded-xl border border-border bg-secondary px-3 text-sm placeholder:text-muted-foreground/40 outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20 transition-all"/>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Email</label>
                  <input type="email" placeholder="email@example.com" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))}
                    className="h-10 w-full rounded-xl border border-border bg-secondary px-3 text-sm placeholder:text-muted-foreground/40 outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20 transition-all"/>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Phone</label>
                  <input placeholder="+1 555 000 0000" value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))}
                    className="h-10 w-full rounded-xl border border-border bg-secondary px-3 text-sm placeholder:text-muted-foreground/40 outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20 transition-all"/>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Lead Source</label>
                  <select value={form.source} onChange={e=>setForm(f=>({...f,source:e.target.value as LeadSource}))}
                    className="h-10 w-full rounded-xl border border-border bg-secondary px-3 text-sm outline-none focus:border-blue-500/60 transition-all">
                    {ALL_SOURCES.map(s=><option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Status</label>
                  <select value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value as LeadStatus}))}
                    className="h-10 w-full rounded-xl border border-border bg-secondary px-3 text-sm outline-none focus:border-blue-500/60 transition-all">
                    {ALL_STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Lead Score — <span className="text-blue-600">{form.score}</span></label>
                <input type="range" min={0} max={100} value={form.score} onChange={e=>setForm(f=>({...f,score:+e.target.value}))}
                  className="w-full accent-blue-500"/>
                <div className="flex justify-between text-[9px] text-muted-foreground/50"><span>0</span><span>50</span><span>100</span></div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Notes</label>
                <textarea placeholder="Quick note about this lead…" value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} rows={2}
                  className="w-full resize-none rounded-xl border border-border bg-secondary px-3 py-2 text-sm placeholder:text-muted-foreground/40 outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20 transition-all"/>
              </div>

              <div className="flex gap-2 pt-1">
                <button onClick={()=>setShowAdd(false)} className="flex-1 h-10 rounded-xl border border-border bg-secondary text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
                <button onClick={addLead} disabled={!form.name.trim()} className="flex-1 h-10 rounded-xl bg-blue-500 text-sm font-semibold text-white hover:bg-blue-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Add Lead</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
