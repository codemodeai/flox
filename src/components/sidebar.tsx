"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Zap,
  Users,
  CalendarDays,
  Calendar,
  CheckSquare,
  Target,
  BarChart2,
  Settings,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/dashboard/automations", icon: Zap, label: "Automations" },
  { href: "/dashboard/leads", icon: Users, label: "Leads" },
  { href: "/dashboard/scheduler", icon: CalendarDays, label: "Scheduler" },
  { href: "/dashboard/calendar", icon: Calendar, label: "Calendar" },
  { href: "/dashboard/tasks", icon: CheckSquare, label: "Tasks" },
  { href: "/dashboard/routine", icon: RefreshCw, label: "Routine" },
  { href: "/dashboard/roadmap", icon: Target, label: "Roadmap" },
  { href: "/dashboard/analytics", icon: BarChart2, label: "Analytics" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-52 flex-shrink-0 flex-col border-r border-white/10 bg-black">
      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3 pt-4">
        <p className="px-3 pt-1 pb-2 text-[10px] font-semibold uppercase tracking-widest text-white/30">
          Menu
        </p>
        {nav.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all",
                active
                  ? "text-white font-medium"
                  : "text-white/50 hover:bg-white/10 hover:text-white"
              )}
            >
              {active && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-xl bg-blue-500"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                />
              )}
              <Icon className={cn("relative h-4 w-4 flex-shrink-0 z-10", active ? "text-white" : "")} />
              <span className="relative z-10">{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom: settings only */}
      <div className="flex flex-col gap-0.5 border-t border-white/10 p-3">
        <Link
          href="/dashboard/settings"
          className={cn(
            "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all",
            pathname.startsWith("/dashboard/settings")
              ? "bg-blue-500 text-white font-medium"
              : "text-white/50 hover:bg-white/10 hover:text-white"
          )}
        >
          <Settings className="h-4 w-4 flex-shrink-0" />
          Settings
        </Link>
      </div>
    </aside>
  );
}
