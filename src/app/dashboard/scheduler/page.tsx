"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { PageHeader } from "@/components/page-header";
import {
  Plus, CalendarDays, Clock, Image as ImageIcon, Film, ChevronLeft, ChevronRight,
  MoreHorizontal, Trash2, Edit3, Copy, CheckCircle2, AlertCircle, Send,
  Link2, Hash, Smile, X, Upload, Globe, Lock, Eye, Zap,
} from "lucide-react";

/* ─── types ───────────────────────────────────────────────── */
type PostType   = "Reel" | "Post" | "Story" | "Carousel";
type PostStatus = "Scheduled" | "Published" | "Draft" | "Failed";

interface ScheduledPost {
  id: string;
  type: PostType;
  caption: string;
  hashtags: string;
  mediaUrl: string;
  scheduledDate: string; // "YYYY-MM-DD"
  scheduledTime: string; // "HH:MM"
  status: PostStatus;
  thumbnail: string; // gradient class
  emoji: string;
  platform: "Instagram";
  engagement?: { likes: number; comments: number; reach: number };
}

/* ─── constants ───────────────────────────────────────────── */
function uid() { return Math.random().toString(36).slice(2, 9); }

const TYPE_META: Record<PostType, { icon: React.ReactNode; color: string; bg: string; border: string }> = {
  Reel:     { icon: <Film className="h-3 w-3"/>,      color:"text-blue-700",  bg:"bg-blue-500/10",  border:"border-blue-500/20" },
  Post:     { icon: <ImageIcon className="h-3 w-3"/>, color:"text-blue-600",    bg:"bg-blue-500/10",    border:"border-blue-500/20" },
  Story:    { icon: <Zap className="h-3 w-3"/>,       color:"text-rose-700",   bg:"bg-rose-500/10",   border:"border-rose-500/20" },
  Carousel: { icon: <Copy className="h-3 w-3"/>,      color:"text-blue-700",    bg:"bg-blue-500/10",    border:"border-blue-500/20" },
};

const STATUS_META: Record<PostStatus, { label: string; color: string; bg: string; dot: string }> = {
  Scheduled: { label:"Scheduled", color:"text-blue-600",    bg:"bg-blue-500/10 border border-blue-500/20",    dot:"bg-blue-400" },
  Published: { label:"Published", color:"text-emerald-700", bg:"bg-emerald-500/10 border border-emerald-500/20", dot:"bg-emerald-400" },
  Draft:     { label:"Draft",     color:"text-zinc-400",    bg:"bg-zinc-500/10 border border-zinc-500/20",    dot:"bg-zinc-400" },
  Failed:    { label:"Failed",    color:"text-rose-700",    bg:"bg-rose-500/10 border border-rose-500/20",    dot:"bg-rose-400" },
};

const GRADIENTS = [
  "from-blue-500 to-blue-500","from-blue-500 to-cyan-400","from-rose-500 to-emerald-500",
  "from-blue-500 to-emerald-400","from-rose-500 to-blue-400","from-indigo-500 to-blue-500",
  "from-sky-500 to-blue-400","from-green-500 to-blue-400",
];
const EMOJIS = ["🎬","📸","⚡","🎠","🌟","🔥","✨","💫","🚀","🎯","💡","🎁"];

const CAPTION_PRESETS = [
  "Drop a 💙 if this helped you!",
  "Save this for later! 🔖",
  "Which one are you? Comment below 👇",
  "Follow for more tips like this! 🚀",
  "Tag someone who needs to see this 🙌",
  "This changed everything for me ✨",
];

const HASHTAG_PRESETS = [
  "#instagram #growth #contentcreator",
  "#reels #viral #trending #explore",
  "#socialmedia #marketing #digitalmarketing",
  "#instagramtips #growyourbusiness #brandbuilding",
];

const TODAY = new Date();

function dateISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function addDays(d: Date, n: number) {
  const r = new Date(d); r.setDate(r.getDate() + n); return r;
}

function fmtDate(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" });
}

function fmtTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2,"0")} ${ampm}`;
}


const FORM_DEFAULT = {
  type:"Reel" as PostType, caption:"", hashtags:"", mediaUrl:"", scheduledDate: dateISO(addDays(TODAY, 1)),
  scheduledTime:"09:00", status:"Scheduled" as PostStatus, thumbnail: GRADIENTS[0], emoji: EMOJIS[0],
};

/* ─── week strip ──────────────────────────────────────────── */
function WeekStrip({ weekStart, posts, onDayClick }: { weekStart: Date; posts: ScheduledPost[]; onDayClick:(iso:string)=>void }) {
  const days = Array.from({length:7}, (_,i) => addDays(weekStart, i));
  const todayISO = dateISO(TODAY);
  return (
    <div className="grid grid-cols-7 gap-1">
      {days.map(d => {
        const iso = dateISO(d);
        const dayPosts = posts.filter(p => p.scheduledDate === iso);
        const isToday = iso === todayISO;
        return (
          <button key={iso} onClick={() => onDayClick(iso)}
            className={`flex flex-col items-center gap-1 rounded-xl p-2 transition-all hover:bg-secondary/60 ${isToday ? "bg-blue-500/10 border border-blue-500/20" : ""}`}>
            <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
              {d.toLocaleDateString("en-US", { weekday:"short" })}
            </span>
            <span className={`text-sm font-bold ${isToday ? "text-blue-600" : "text-foreground"}`}>
              {d.getDate()}
            </span>
            <div className="flex gap-0.5 flex-wrap justify-center min-h-[8px]">
              {dayPosts.slice(0,3).map((p,i) => (
                <span key={i} className={`h-1.5 w-1.5 rounded-full bg-gradient-to-br ${p.thumbnail} opacity-90`}/>
              ))}
              {dayPosts.length > 3 && <span className="text-[8px] text-muted-foreground">+{dayPosts.length-3}</span>}
            </div>
          </button>
        );
      })}
    </div>
  );
}

/* ─── post card ───────────────────────────────────────────── */
function PostCard({ post, onDelete, onEdit, onDuplicate, onPublish }: {
  post: ScheduledPost;
  onDelete: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onPublish: () => void;
}) {
  const [menu, setMenu] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const tm = TYPE_META[post.type];
  const sm = STATUS_META[post.status];

  return (
    <motion.div layout initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
      className={`group relative rounded-2xl border bg-card overflow-hidden transition-all hover:border-black/15
        ${post.status==="Scheduled" ? "border-border shadow-[0_0_20px_rgba(59,130,246,0.04)]" : "border-border/60"}`}>
      <div className="flex gap-3 p-3">
        {/* Thumbnail */}
        <div className={`h-16 w-12 rounded-xl bg-gradient-to-br ${post.thumbnail} flex items-center justify-center text-xl flex-shrink-0 shadow-sm`}>
          {post.emoji}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold border ${tm.bg} ${tm.color} ${tm.border}`}>
                {tm.icon}{post.type}
              </span>
              <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${sm.bg} ${sm.color}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${sm.dot}`}/>
                {sm.label}
              </span>
            </div>
            {/* Menu */}
            <div className="relative flex-shrink-0">
              <button onClick={()=>setMenu(m=>!m)}
                className="h-6 w-6 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-all opacity-0 group-hover:opacity-100">
                <MoreHorizontal className="h-3.5 w-3.5"/>
              </button>
              {menu && (
                <div onClick={e=>e.stopPropagation()}
                  className="absolute top-7 right-0 z-20 w-40 rounded-xl border border-border bg-card shadow-2xl py-1 overflow-hidden">
                  <button onClick={()=>{onEdit();setMenu(false);}} className="flex items-center gap-2 w-full px-3 py-2 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
                    <Edit3 className="h-3.5 w-3.5"/> Edit post
                  </button>
                  <button onClick={()=>{onDuplicate();setMenu(false);}} className="flex items-center gap-2 w-full px-3 py-2 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
                    <Copy className="h-3.5 w-3.5"/> Duplicate
                  </button>
                  {post.mediaUrl && post.status === "Scheduled" && (
                    <button onClick={async ()=>{
                      setMenu(false); setPublishing(true);
                      await onPublish();
                      setPublishing(false);
                    }} className="flex items-center gap-2 w-full px-3 py-2 text-xs text-emerald-700 hover:bg-emerald-500/10 transition-colors">
                      <Send className="h-3.5 w-3.5"/> {publishing ? "Publishing…" : "Publish now"}
                    </button>
                  )}
                  <div className="h-px bg-border mx-2 my-1"/>
                  <button onClick={()=>{onDelete();setMenu(false);}} className="flex items-center gap-2 w-full px-3 py-2 text-xs text-rose-700 hover:bg-rose-500/10 transition-colors">
                    <Trash2 className="h-3.5 w-3.5"/> Delete
                  </button>
                </div>
              )}
            </div>
          </div>

          <p className="text-xs text-foreground/80 mt-1.5 line-clamp-2 leading-relaxed">{post.caption}</p>

          {post.hashtags && (
            <p className="text-[10px] text-blue-600/70 mt-1 truncate">{post.hashtags}</p>
          )}

          <div className="flex items-center gap-3 mt-2">
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <CalendarDays className="h-3 w-3"/>
              {fmtDate(post.scheduledDate)}
            </div>
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Clock className="h-3 w-3"/>
              {fmtTime(post.scheduledTime)}
            </div>
          </div>

          {post.engagement && (
            <div className="flex items-center gap-3 mt-2 pt-2 border-t border-border/40">
              <span className="text-[10px] text-muted-foreground">❤️ {post.engagement.likes.toLocaleString()}</span>
              <span className="text-[10px] text-muted-foreground">💬 {post.engagement.comments}</span>
              <span className="text-[10px] text-muted-foreground">👁️ {post.engagement.reach.toLocaleString()}</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* ─── main ────────────────────────────────────────────────── */
export default function SchedulerPage() {
  const supabase = createClient();
  const [userId, setUserId] = useState<string|null>(null);

  const [posts, setPosts]         = useState<ScheduledPost[]>([]);
  const [showAdd, setShowAdd]     = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => { if (data.user) setUserId(data.user.id); });
  }, []);

  useEffect(() => {
    if (!userId) return;
    supabase.from("scheduled_posts").select("*").eq("user_id", userId).order("scheduled_date").order("scheduled_time")
      .then(({ data }) => {
        if (data) setPosts(data.map(r => ({
          id: r.id, type: r.type as PostType, caption: r.caption, hashtags: r.hashtags,
          mediaUrl: r.media_url ?? "",
          scheduledDate: r.scheduled_date, scheduledTime: r.scheduled_time,
          status: r.status as PostStatus, thumbnail: r.thumbnail, emoji: r.emoji,
          platform: "Instagram" as const,
          engagement: r.likes!=null ? { likes: r.likes, comments: r.comments??0, reach: r.reach??0 } : undefined,
        })));
      });
  }, [userId]);
  const [editId, setEditId]       = useState<string|null>(null);
  const [form, setForm]           = useState({...FORM_DEFAULT});
  const [tab, setTab]             = useState<"Queue"|"Published"|"Drafts">("Queue");
  const [view, setView]           = useState<"list"|"calendar">("list");
  const [weekStart, setWeekStart] = useState<Date>(()=>{
    const d = new Date(TODAY); d.setDate(d.getDate() - d.getDay()); return d;
  });
  const [filterDay, setFilterDay] = useState<string|null>(null);
  const [showCaptionPresets, setShowCaptionPresets] = useState(false);
  const [showHashPresets, setShowHashPresets]       = useState(false);

  const todayISO = dateISO(TODAY);

  /* filtered list per tab */
  const tabPosts = posts.filter(p => {
    if (tab === "Queue")     return p.status === "Scheduled";
    if (tab === "Published") return p.status === "Published";
    if (tab === "Drafts")    return p.status === "Draft" || p.status === "Failed";
    return true;
  });

  const displayPosts = filterDay
    ? tabPosts.filter(p => p.scheduledDate === filterDay)
    : tabPosts;

  const sorted = [...displayPosts].sort((a,b)=>{
    const dt = (p: ScheduledPost) => p.scheduledDate + "T" + p.scheduledTime;
    return dt(a) < dt(b) ? -1 : 1;
  });

  /* stats */
  const scheduledCount  = posts.filter(p=>p.status==="Scheduled").length;
  const publishedCount  = posts.filter(p=>p.status==="Published").length;
  const draftCount      = posts.filter(p=>p.status==="Draft").length;
  const todayCount      = posts.filter(p=>p.scheduledDate===todayISO && p.status==="Scheduled").length;

  function openAdd(dateISO_?: string) {
    setEditId(null);
    setForm({ ...FORM_DEFAULT, scheduledDate: dateISO_ || FORM_DEFAULT.scheduledDate });
    setShowAdd(true);
  }

  function openEdit(post: ScheduledPost) {
    setEditId(post.id);
    setForm({ type:post.type, caption:post.caption, hashtags:post.hashtags,
      scheduledDate:post.scheduledDate, scheduledTime:post.scheduledTime,
      status:post.status, thumbnail:post.thumbnail, emoji:post.emoji });
    setShowAdd(true);
  }

  async function savePost() {
    if (!userId || !form.caption.trim()) return;
    const row = {
      user_id: userId, type: form.type, caption: form.caption, hashtags: form.hashtags,
      media_url: form.mediaUrl || null,
      scheduled_date: form.scheduledDate, scheduled_time: form.scheduledTime,
      status: form.status, thumbnail: form.thumbnail, emoji: form.emoji, platform: "Instagram",
    };
    if (editId) {
      await supabase.from("scheduled_posts").update(row).eq("id", editId);
      setPosts(p => p.map(x => x.id===editId ? { ...x, ...form } : x));
    } else {
      const { data } = await supabase.from("scheduled_posts").insert(row).select().single();
      if (data) setPosts(p => [{
        id: data.id, type: form.type, caption: form.caption, hashtags: form.hashtags,
        mediaUrl: form.mediaUrl,
        scheduledDate: form.scheduledDate, scheduledTime: form.scheduledTime,
        status: form.status, thumbnail: form.thumbnail, emoji: form.emoji, platform: "Instagram",
      }, ...p]);
    }
    setShowAdd(false); setEditId(null); setForm({...FORM_DEFAULT});
    setShowCaptionPresets(false); setShowHashPresets(false);
  }

  async function deletePost(id: string) {
    await supabase.from("scheduled_posts").delete().eq("id", id);
    setPosts(p=>p.filter(x=>x.id!==id));
  }

  async function publishPost(id: string) {
    const res = await fetch("/api/instagram/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId: id }),
    });
    if (res.ok) {
      setPosts(p => p.map(x => x.id === id ? { ...x, status: "Published" as PostStatus } : x));
    }
  }

  async function duplicatePost(id: string) {
    if (!userId) return;
    const src = posts.find(x=>x.id===id); if (!src) return;
    const { data } = await supabase.from("scheduled_posts").insert({
      user_id: userId, type: src.type, caption: src.caption, hashtags: src.hashtags,
      scheduled_date: src.scheduledDate, scheduled_time: src.scheduledTime,
      status: "Draft", thumbnail: src.thumbnail, emoji: src.emoji, platform: "Instagram",
    }).select().single();
    if (data) setPosts(p=>[{...src, id:data.id, status:"Draft"}, ...p]);
  }

  /* group by date for list view */
  const groupedDates = [...new Set(sorted.map(p=>p.scheduledDate))];

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <PageHeader
        title="Scheduler"
        description="Queue posts and reels to publish automatically."
        action={
          <button onClick={()=>openAdd()}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 hover:shadow-[0_0_20px_rgba(139,92,246,0.25)] active:scale-[0.98]">
            <Plus className="h-4 w-4"/>
            Schedule post
          </button>
        }
      />

      <div className="flex-1 flex flex-col gap-6 p-6 overflow-auto">

        {/* Stats strip */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label:"Scheduled",  value:scheduledCount,  color:"text-blue-600",    icon:<CalendarDays className="h-4 w-4"/>, bg:"bg-blue-500/10" },
            { label:"Published",  value:publishedCount,  color:"text-emerald-700", icon:<CheckCircle2 className="h-4 w-4"/>, bg:"bg-emerald-500/10" },
            { label:"Drafts",     value:draftCount,      color:"text-zinc-400",    icon:<Edit3 className="h-4 w-4"/>,       bg:"bg-zinc-500/10" },
            { label:"Today",      value:todayCount,      color:"text-blue-700",  icon:<Zap className="h-4 w-4"/>,         bg:"bg-blue-500/10" },
          ].map(s => (
            <motion.div key={s.label} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}}
              className="rounded-2xl border border-border bg-card p-4 flex items-center gap-3">
              <div className={`h-9 w-9 rounded-xl ${s.bg} flex items-center justify-center ${s.color}`}>{s.icon}</div>
              <div>
                <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-[11px] text-muted-foreground">{s.label}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Main content */}
        <div className="flex gap-4 flex-1 min-h-0">

          {/* Left — queue */}
          <div className="flex-1 flex flex-col gap-3 min-w-0">

            {/* Toolbar */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-1 bg-secondary/50 rounded-xl p-1">
                {(["Queue","Published","Drafts"] as const).map(t=>(
                  <button key={t} onClick={()=>setTab(t)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
                      ${tab===t ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                    {t}
                    <span className="ml-1.5 text-[9px] opacity-60">
                      {t==="Queue"?scheduledCount:t==="Published"?publishedCount:draftCount}
                    </span>
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                {filterDay && (
                  <button onClick={()=>setFilterDay(null)}
                    className="flex items-center gap-1 text-[10px] text-blue-600 bg-blue-500/10 border border-blue-500/20 rounded-lg px-2 py-1 hover:bg-blue-500/20 transition-all">
                    <X className="h-3 w-3"/> {fmtDate(filterDay)}
                  </button>
                )}
                <div className="flex items-center bg-secondary/50 rounded-xl p-1 gap-1">
                  <button onClick={()=>setView("list")}
                    className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition-all ${view==="list"?"bg-card text-foreground shadow-sm":"text-muted-foreground"}`}>
                    List
                  </button>
                  <button onClick={()=>setView("calendar")}
                    className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition-all ${view==="calendar"?"bg-card text-foreground shadow-sm":"text-muted-foreground"}`}>
                    Calendar
                  </button>
                </div>
              </div>
            </div>

            {/* Post list */}
            {view === "list" ? (
              <div className="flex flex-col gap-4 overflow-auto">
                {groupedDates.length === 0 ? (
                  <motion.div initial={{opacity:0}} animate={{opacity:1}}
                    className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 py-16 gap-4 text-center">
                    <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                      <CalendarDays className="h-5 w-5 text-primary"/>
                    </div>
                    <div>
                      <p className="font-semibold">Nothing here</p>
                      <p className="text-sm text-muted-foreground mt-1">Schedule your first post to get started.</p>
                    </div>
                    <button onClick={()=>openAdd()} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 active:scale-[0.98] transition-all">
                      <Plus className="h-4 w-4"/> Schedule post
                    </button>
                  </motion.div>
                ) : (
                  groupedDates.map(iso => {
                    const d = new Date(iso + "T00:00:00");
                    const isToday   = iso === todayISO;
                    const isTomorrow= iso === dateISO(addDays(TODAY, 1));
                    const label = isToday ? "Today" : isTomorrow ? "Tomorrow"
                      : d.toLocaleDateString("en-US",{weekday:"long",month:"short",day:"numeric"});
                    const dayPosts = sorted.filter(p=>p.scheduledDate===iso);
                    return (
                      <div key={iso} className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold ${isToday?"text-blue-600":"text-muted-foreground"}`}>{label}</span>
                          <div className="flex-1 h-px bg-border/40"/>
                          <span className="text-[10px] text-muted-foreground">{dayPosts.length} post{dayPosts.length!==1?"s":""}</span>
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                          {dayPosts.map(p=>(
                            <PostCard key={p.id} post={p}
                              onDelete={()=>deletePost(p.id)}
                              onEdit={()=>openEdit(p)}
                              onDuplicate={()=>duplicatePost(p.id)}
                              onPublish={()=>publishPost(p.id)}/>
                          ))}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
              /* Calendar grid view */
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">
                    {weekStart.toLocaleDateString("en-US",{month:"long",year:"numeric"})}
                  </p>
                  <div className="flex items-center gap-1">
                    <button onClick={()=>setWeekStart(d=>addDays(d,-7))}
                      className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-all">
                      <ChevronLeft className="h-4 w-4"/>
                    </button>
                    <button onClick={()=>{ const d=new Date(TODAY); d.setDate(d.getDate()-d.getDay()); setWeekStart(d); setFilterDay(null); }}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground transition-all">
                      Today
                    </button>
                    <button onClick={()=>setWeekStart(d=>addDays(d,7))}
                      className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-all">
                      <ChevronRight className="h-4 w-4"/>
                    </button>
                  </div>
                </div>
                <div className="rounded-2xl border border-border bg-card p-4">
                  <WeekStrip weekStart={weekStart} posts={tabPosts} onDayClick={iso=>{
                    setFilterDay(d=>d===iso?null:iso); setView("list");
                  }}/>
                </div>
                {/* Below calendar: all posts in week */}
                <div className="grid grid-cols-2 gap-2">
                  {tabPosts.filter(p=>{
                    const iso=p.scheduledDate;
                    const end=dateISO(addDays(weekStart,6));
                    return iso>=dateISO(weekStart) && iso<=end;
                  }).sort((a,b)=>(a.scheduledDate+a.scheduledTime)<(b.scheduledDate+b.scheduledTime)?-1:1)
                  .map(p=>(
                    <PostCard key={p.id} post={p}
                      onDelete={()=>deletePost(p.id)}
                      onEdit={()=>openEdit(p)}
                      onDuplicate={()=>duplicatePost(p.id)}
                              onPublish={()=>publishPost(p.id)}/>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right sidebar — best times + quick stats */}
          <div className="w-64 flex-shrink-0 flex flex-col gap-3">

            {/* Best times to post */}
            <div className="rounded-2xl border border-border bg-card p-4 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <Zap className="h-3.5 w-3.5 text-blue-700"/>
                </div>
                <p className="text-xs font-bold">Best times to post</p>
              </div>
              <div className="flex flex-col gap-1.5">
                {[
                  { day:"Mon–Fri", time:"9:00 AM",  label:"Morning peak",   strength:92 },
                  { day:"Mon–Fri", time:"12:00 PM", label:"Lunch scroll",   strength:78 },
                  { day:"Mon–Fri", time:"7:00 PM",  label:"Evening peak",   strength:85 },
                  { day:"Sat–Sun", time:"11:00 AM", label:"Weekend browse", strength:70 },
                ].map((t,i)=>(
                  <div key={i} className="rounded-xl bg-secondary/40 px-3 py-2">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[11px] font-semibold">{t.time}</p>
                      <span className="text-[9px] text-emerald-700 font-semibold">{t.strength}%</span>
                    </div>
                    <p className="text-[9px] text-muted-foreground">{t.day} · {t.label}</p>
                    <div className="mt-1.5 h-1 rounded-full bg-secondary overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-500" style={{width:`${t.strength}%`}}/>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Content mix */}
            <div className="rounded-2xl border border-border bg-card p-4 flex flex-col gap-3">
              <p className="text-xs font-bold">Content mix</p>
              <div className="flex flex-col gap-2">
                {(["Reel","Post","Story","Carousel"] as PostType[]).map(type=>{
                  const count = posts.filter(p=>p.type===type).length;
                  const pct   = posts.length ? Math.round(count/posts.length*100) : 0;
                  const tm    = TYPE_META[type];
                  return (
                    <div key={type} className="flex items-center gap-2">
                      <div className={`h-5 w-5 rounded-md flex items-center justify-center ${tm.bg} ${tm.color} flex-shrink-0`}>
                        {tm.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-[10px] font-semibold">{type}</span>
                          <span className="text-[9px] text-muted-foreground">{count}</span>
                        </div>
                        <div className="h-1 rounded-full bg-secondary overflow-hidden">
                          <div className={`h-full rounded-full bg-gradient-to-r ${type==="Reel"?"from-blue-500 to-blue-500":type==="Post"?"from-blue-500 to-cyan-400":type==="Story"?"from-rose-500 to-emerald-400":"from-blue-500 to-emerald-400"}`}
                            style={{width:`${pct}%`}}/>
                        </div>
                      </div>
                      <span className="text-[9px] text-muted-foreground w-6 text-right">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick schedule */}
            <div className="rounded-2xl border border-border bg-card p-4 flex flex-col gap-2">
              <p className="text-xs font-bold">Quick schedule</p>
              <p className="text-[10px] text-muted-foreground">Click a day to schedule a post for that date.</p>
              <div className="grid grid-cols-3 gap-1.5 mt-1">
                {Array.from({length:7},(_,i)=>{
                  const d = addDays(TODAY,i);
                  const iso = dateISO(d);
                  const isToday = iso===todayISO;
                  return (
                    <button key={iso} onClick={()=>openAdd(iso)}
                      className={`flex flex-col items-center rounded-xl py-2 px-1 text-center transition-all hover:bg-secondary
                        ${isToday?"bg-blue-500/10 border border-blue-500/20":""}`}>
                      <span className="text-[8px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {d.toLocaleDateString("en-US",{weekday:"short"})}
                      </span>
                      <span className={`text-sm font-bold mt-0.5 ${isToday?"text-blue-600":""}`}>{d.getDate()}</span>
                    </button>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ── Modal ──────────────────────────────────────────── */}
      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={e=>{if(e.target===e.currentTarget){setShowAdd(false);setShowCaptionPresets(false);setShowHashPresets(false);}}}>
            <motion.div initial={{opacity:0,scale:0.95,y:16}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:0.95,y:8}}
              className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">

              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-xl bg-blue-500/10 flex items-center justify-center">
                    <CalendarDays className="h-4 w-4 text-blue-700"/>
                  </div>
                  <div>
                    <p className="text-sm font-bold">{editId ? "Edit post" : "Schedule a post"}</p>
                    <p className="text-[10px] text-muted-foreground">Instagram · {form.type}</p>
                  </div>
                </div>
                <button onClick={()=>{setShowAdd(false);setShowCaptionPresets(false);setShowHashPresets(false);}}
                  className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-all">
                  <X className="h-4 w-4"/>
                </button>
              </div>

              <div className="overflow-y-auto flex-1 p-5 flex flex-col gap-4">

                {/* Thumbnail preview + emoji picker */}
                <div className="flex items-center gap-3">
                  <div className={`h-16 w-12 rounded-xl bg-gradient-to-br ${form.thumbnail} flex items-center justify-center text-2xl shadow-sm flex-shrink-0`}>
                    {form.emoji}
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] text-muted-foreground mb-1.5">Cover gradient</p>
                    <div className="flex gap-1 flex-wrap">
                      {GRADIENTS.map(g=>(
                        <button key={g} onClick={()=>setForm(f=>({...f,thumbnail:g}))}
                          className={`h-5 w-5 rounded-full bg-gradient-to-br ${g} transition-all ${form.thumbnail===g?"ring-2 ring-offset-1 ring-offset-card ring-white/80 scale-110":""}`}/>
                      ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground mb-1.5 mt-2">Emoji</p>
                    <div className="flex gap-1 flex-wrap">
                      {EMOJIS.map(e=>(
                        <button key={e} onClick={()=>setForm(f=>({...f,emoji:e}))}
                          className={`h-6 w-6 rounded-lg text-base flex items-center justify-center transition-all ${form.emoji===e?"bg-blue-500/10 ring-1 ring-blue-500/40":"hover:bg-black/[0.04]"}`}>{e}</button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Post type */}
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">Post type</label>
                  <div className="grid grid-cols-4 gap-2">
                    {(["Reel","Post","Story","Carousel"] as PostType[]).map(t=>{
                      const tm = TYPE_META[t];
                      return (
                        <button key={t} onClick={()=>setForm(f=>({...f,type:t}))}
                          className={`flex flex-col items-center gap-1.5 rounded-xl border p-2.5 transition-all
                            ${form.type===t ? `${tm.bg} ${tm.border} ${tm.color}` : "border-border bg-card text-muted-foreground hover:bg-secondary"}`}>
                          {tm.icon}
                          <span className="text-[10px] font-semibold">{t}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Caption */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Caption</label>
                    <button onClick={()=>setShowCaptionPresets(p=>!p)}
                      className="flex items-center gap-1 text-[10px] text-blue-600 hover:text-blue-700 transition-colors">
                      <Smile className="h-3 w-3"/> Presets
                    </button>
                  </div>
                  <AnimatePresence>
                    {showCaptionPresets && (
                      <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} exit={{opacity:0,height:0}}
                        className="overflow-hidden mb-2">
                        <div className="flex flex-col gap-1 rounded-xl border border-border bg-secondary/40 p-2">
                          {CAPTION_PRESETS.map(cp=>(
                            <button key={cp} onClick={()=>{setForm(f=>({...f,caption:cp}));setShowCaptionPresets(false);}}
                              className="text-left text-[11px] rounded-lg px-2.5 py-1.5 hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
                              {cp}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <textarea rows={3} placeholder="Write your caption here…" value={form.caption} onChange={e=>setForm(f=>({...f,caption:e.target.value}))}
                    className="w-full resize-none rounded-xl border border-border bg-secondary/40 px-3 py-2 text-sm placeholder:text-muted-foreground/40 outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20 transition-all"/>
                  <p className="text-[9px] text-muted-foreground mt-1 text-right">{form.caption.length} chars</p>
                </div>

                {/* Hashtags */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Hashtags</label>
                    <button onClick={()=>setShowHashPresets(p=>!p)}
                      className="flex items-center gap-1 text-[10px] text-blue-600 hover:text-blue-700 transition-colors">
                      <Hash className="h-3 w-3"/> Presets
                    </button>
                  </div>
                  <AnimatePresence>
                    {showHashPresets && (
                      <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} exit={{opacity:0,height:0}}
                        className="overflow-hidden mb-2">
                        <div className="flex flex-col gap-1 rounded-xl border border-border bg-secondary/40 p-2">
                          {HASHTAG_PRESETS.map(hp=>(
                            <button key={hp} onClick={()=>{setForm(f=>({...f,hashtags:hp}));setShowHashPresets(false);}}
                              className="text-left text-[11px] rounded-lg px-2.5 py-1.5 hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground font-mono">
                              {hp}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <input type="text" placeholder="#hashtag1 #hashtag2 …" value={form.hashtags} onChange={e=>setForm(f=>({...f,hashtags:e.target.value}))}
                    className="w-full rounded-xl border border-border bg-secondary/40 px-3 py-2 text-sm placeholder:text-muted-foreground/40 outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20 transition-all font-mono"/>
                </div>

                {/* Media URL */}
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">
                    Image URL <span className="normal-case font-normal text-muted-foreground/60">(required to publish to Instagram)</span>
                  </label>
                  <div className="relative">
                    <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none"/>
                    <input type="url" placeholder="https://your-public-image-url.jpg" value={form.mediaUrl} onChange={e=>setForm(f=>({...f,mediaUrl:e.target.value}))}
                      className="w-full rounded-xl border border-border bg-secondary/40 pl-8 pr-3 py-2 text-sm placeholder:text-muted-foreground/40 outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20 transition-all"/>
                  </div>
                  <p className="text-[9px] text-muted-foreground mt-1">Must be a publicly accessible URL. Upload your image to Imgur, Cloudinary, or Supabase Storage first.</p>
                </div>

                {/* Date + time */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">Date</label>
                    <input type="date" value={form.scheduledDate} onChange={e=>setForm(f=>({...f,scheduledDate:e.target.value}))}
                      className="w-full rounded-xl border border-border bg-secondary/40 px-3 py-2 text-sm outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20 transition-all"/>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">Time</label>
                    <input type="time" value={form.scheduledTime} onChange={e=>setForm(f=>({...f,scheduledTime:e.target.value}))}
                      className="w-full rounded-xl border border-border bg-secondary/40 px-3 py-2 text-sm outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20 transition-all"/>
                  </div>
                </div>

                {/* Status */}
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">Status</label>
                  <div className="flex gap-2">
                    {(["Scheduled","Draft"] as PostStatus[]).map(s=>{
                      const sm = STATUS_META[s];
                      return (
                        <button key={s} onClick={()=>setForm(f=>({...f,status:s}))}
                          className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-all
                            ${form.status===s ? `${sm.bg} ${sm.color}` : "border-border bg-card text-muted-foreground hover:bg-secondary"}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${sm.dot}`}/>{s}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-5 py-4 border-t border-border flex items-center justify-between gap-3">
                <button onClick={()=>{setShowAdd(false);setShowCaptionPresets(false);setShowHashPresets(false);}}
                  className="px-4 py-2 rounded-xl text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-all">
                  Cancel
                </button>
                <div className="flex items-center gap-2">
                  <button onClick={()=>{setForm(f=>({...f,status:"Draft"}));savePost();}}
                    className="px-4 py-2 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-all">
                    Save as draft
                  </button>
                  <button onClick={savePost} disabled={!form.caption.trim()}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90 hover:shadow-[0_0_20px_rgba(139,92,246,0.3)] active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                    <Send className="h-3.5 w-3.5"/>
                    {editId ? "Save changes" : form.status==="Scheduled" ? "Schedule" : "Create draft"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
