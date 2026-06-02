"use client";

import { useState, useRef, useEffect } from "react";
import { Sidebar } from "@/components/sidebar";
import { useRouter } from "next/navigation";
import { clearSeedDataOnce } from "@/lib/task-store";
import { createClient } from "@/lib/supabase/client";
import {
  Search, Bell, X, User, Settings, CreditCard,
  HelpCircle, LogOut, ChevronRight, CheckCircle2,
} from "lucide-react";

/* ── notification data ── */
const NOTIFS: { id: string; icon: string; title: string; body: string; time: string; read: boolean }[] = [];

/* ── user menu items ── */
const USER_MENU = [
  { icon: User,        label: "Profile",          sub: "Free plan" },
  { icon: Settings,    label: "Settings",         href: "/dashboard/settings"  },
  { icon: CreditCard,  label: "Upgrade to Pro",   highlight: true              },
  { icon: HelpCircle,  label: "Help & support",                                },
];

function useClickOutside(ref: React.RefObject<HTMLElement | null>, cb: () => void) {
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) cb();
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [ref, cb]);
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => { clearSeedDataOnce(); }, []);

  const [userName,    setUserName]    = useState("Loading...");
  const [userEmail,   setUserEmail]   = useState("");
  const [userInitials,setUserInitials]= useState("?");

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      const name = user.user_metadata?.full_name ?? user.email ?? "User";
      setUserName(name);
      setUserEmail(user.email ?? "");
      const parts = name.split(" ");
      setUserInitials((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? ""));
    });
  }, [supabase]);

  const [searchOpen,  setSearchOpen]  = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [notifOpen,   setNotifOpen]   = useState(false);
  const [userOpen,    setUserOpen]    = useState(false);
  const [notifs,      setNotifs]      = useState(NOTIFS);

  const notifRef = useRef<HTMLDivElement>(null);
  const userRef  = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  useClickOutside(notifRef,  () => setNotifOpen(false));
  useClickOutside(userRef,   () => setUserOpen(false));
  useClickOutside(searchRef, () => { setSearchOpen(false); setSearchQuery(""); });

  const unread = notifs.filter(n => !n.read).length;

  function markAllRead() { setNotifs(ns => ns.map(n => ({ ...n, read: true }))); }
  function markRead(id: string) { setNotifs(ns => ns.map(n => n.id === id ? { ...n, read: true } : n)); }

  /* quick nav search */
  const NAV_PAGES = [
    { label: "Dashboard",   href: "/dashboard"            },
    { label: "Automations", href: "/dashboard/automations"},
    { label: "Leads",       href: "/dashboard/leads"      },
    { label: "Scheduler",   href: "/dashboard/scheduler"  },
    { label: "Calendar",    href: "/dashboard/calendar"   },
    { label: "Tasks",       href: "/dashboard/tasks"      },
    { label: "Routine",     href: "/dashboard/routine"    },
    { label: "Roadmap",     href: "/dashboard/roadmap"    },
    { label: "Analytics",   href: "/dashboard/analytics"  },
    { label: "Settings",    href: "/dashboard/settings"   },
  ];
  const filtered = searchQuery.trim()
    ? NAV_PAGES.filter(p => p.label.toLowerCase().includes(searchQuery.toLowerCase()))
    : NAV_PAGES;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">

      {/* ── Full-width black top bar ── */}
      <header className="flex h-14 flex-shrink-0 items-center bg-black px-4 gap-4 relative z-30">
        {/* Logo */}
        <div className="flex w-52 flex-shrink-0 items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="FLOX" className="w-auto object-contain" style={{ height: "56px", mixBlendMode: "screen", transform: "scale(2.4)", transformOrigin: "left center" }} />
        </div>

        {/* User greeting */}
        <div className="flex flex-col flex-1">
          <p className="text-sm font-semibold leading-tight text-white">{userName}</p>
          <p className="text-xs text-white/50 leading-tight">Let&apos;s build something great today 🚀</p>
        </div>

        {/* Right icons */}
        <div className="flex items-center gap-2">

          {/* ── Search ── */}
          <div className="relative" ref={searchRef}>
            <button
              onClick={() => setSearchOpen(o => !o)}
              className={`h-8 w-8 rounded-xl flex items-center justify-center transition-colors ${searchOpen ? "bg-white/20 text-white" : "bg-white/10 text-white/60 hover:text-white"}`}
            >
              <Search className="h-4 w-4" />
            </button>

            {searchOpen && (
              <div className="absolute right-0 top-11 w-72 rounded-2xl border border-white/10 bg-neutral-900 shadow-2xl overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2.5 border-b border-white/10">
                  <Search className="h-3.5 w-3.5 text-white/40 flex-shrink-0" />
                  <input
                    autoFocus
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search pages…"
                    className="flex-1 bg-transparent text-sm text-white placeholder:text-white/30 outline-none"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery("")} className="text-white/40 hover:text-white transition-colors">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <div className="py-1.5 max-h-64 overflow-y-auto">
                  {filtered.map(p => (
                    <button
                      key={p.href}
                      onClick={() => { router.push(p.href); setSearchOpen(false); setSearchQuery(""); }}
                      className="flex items-center justify-between w-full px-4 py-2 text-sm text-white/70 hover:bg-white/10 hover:text-white transition-colors"
                    >
                      <span>{p.label}</span>
                      <ChevronRight className="h-3.5 w-3.5 text-white/30" />
                    </button>
                  ))}
                  {filtered.length === 0 && (
                    <p className="px-4 py-3 text-xs text-white/30">No pages found</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── Notifications ── */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => { setNotifOpen(o => !o); setUserOpen(false); }}
              className={`relative h-8 w-8 rounded-xl flex items-center justify-center transition-colors ${notifOpen ? "bg-white/20 text-white" : "bg-white/10 text-white/60 hover:text-white"}`}
            >
              <Bell className="h-4 w-4" />
              {unread > 0 && (
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-blue-400 ring-2 ring-black" />
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 top-11 w-80 rounded-2xl border border-white/10 bg-neutral-900 shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-white">Notifications</p>
                    {unread > 0 && (
                      <span className="rounded-full bg-blue-500 px-1.5 py-0.5 text-[9px] font-bold text-white">{unread}</span>
                    )}
                  </div>
                  {unread > 0 && (
                    <button onClick={markAllRead} className="flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 transition-colors">
                      <CheckCircle2 className="h-3 w-3" /> Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto">
                  {notifs.map(n => (
                    <button
                      key={n.id}
                      onClick={() => markRead(n.id)}
                      className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-white/5 transition-colors border-b border-white/[0.05] last:border-0 ${!n.read ? "bg-blue-500/5" : ""}`}
                    >
                      <span className="text-xl flex-shrink-0 mt-0.5">{n.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className={`text-xs font-semibold truncate ${n.read ? "text-white/60" : "text-white"}`}>{n.title}</p>
                          {!n.read && <span className="h-1.5 w-1.5 rounded-full bg-blue-400 flex-shrink-0" />}
                        </div>
                        <p className="text-[11px] text-white/40 mt-0.5 leading-relaxed">{n.body}</p>
                        <p className="text-[10px] text-white/25 mt-1">{n.time}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── User menu ── */}
          <div className="relative" ref={userRef}>
            <button
              onClick={() => { setUserOpen(o => !o); setNotifOpen(false); }}
              className={`h-8 w-8 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-xs font-semibold text-white transition-all ${userOpen ? "ring-2 ring-blue-400 ring-offset-1 ring-offset-black" : "hover:ring-2 hover:ring-white/20"}`}
            >
              {userInitials}
            </button>

            {userOpen && (
              <div className="absolute right-0 top-11 w-64 rounded-2xl border border-white/10 bg-neutral-900 shadow-2xl overflow-hidden">
                {/* User info */}
                <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/10">
                  <div className="h-9 w-9 flex-shrink-0 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-sm font-bold text-white">
                    {userInitials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{userName}</p>
                    <p className="text-[11px] text-white/40 truncate">{userEmail}</p>
                  </div>
                  <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[9px] font-bold text-blue-400">FREE</span>
                </div>

                {/* Menu items */}
                <div className="py-1.5">
                  {USER_MENU.map(({ icon: Icon, label, sub, href, highlight }) => (
                    <button
                      key={label}
                      onClick={() => { if (href) { router.push(href); setUserOpen(false); } }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${highlight ? "text-blue-400 hover:bg-blue-500/10" : "text-white/70 hover:bg-white/8 hover:text-white"}`}
                    >
                      <Icon className={`h-4 w-4 flex-shrink-0 ${highlight ? "text-blue-400" : "text-white/40"}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{label}</p>
                        {sub && <p className="text-[10px] text-white/30">{sub}</p>}
                      </div>
                      {highlight && <ChevronRight className="h-3.5 w-3.5 text-blue-400/60" />}
                    </button>
                  ))}
                </div>

                {/* Logout */}
                <div className="border-t border-white/10 py-1.5">
                  <button className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-rose-400 hover:bg-rose-500/10 transition-colors">
                    <LogOut className="h-4 w-4 flex-shrink-0" />
                    <span className="text-sm font-medium">Log out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Sidebar + content ── */}
      <div className="flex flex-1 overflow-hidden">
        <div className="relative flex-shrink-0 w-52 h-full">
          <Sidebar />
          <div className="absolute top-0 -right-5 h-5 w-5 bg-black" />
          <div className="absolute top-0 -right-5 h-5 w-5 rounded-tl-2xl bg-background" />
        </div>
        <main className="flex flex-1 flex-col overflow-hidden min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
