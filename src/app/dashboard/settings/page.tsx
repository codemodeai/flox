"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { PageHeader } from "@/components/page-header";
import {
  Link2, User, Bell, Shield, Sun, Moon, Monitor,
  X, Check, Eye, EyeOff, Camera, Loader2, LogOut,
} from "lucide-react";
import { useTheme } from "@/lib/theme";
import { createClient } from "@/lib/supabase/client";

const themes = [
  { value: "light", label: "Light", icon: Sun,  desc: "Clean white interface" },
  { value: "dark",  label: "Dark",  icon: Moon, desc: "Easy on the eyes"      },
] as const;

interface IGProfile {
  username:       string;
  followersCount: number;
  profilePic:     string | null;
}

export default function SettingsPage() {
  return <Suspense><SettingsPageInner /></Suspense>;
}

function SettingsPageInner() {
  const supabase     = createClient();
  const { theme, setTheme } = useTheme();
  const searchParams = useSearchParams();

  const [userId,    setUserId]    = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState("");

  // Camera connection state
  const [igProfile,       setIgProfile]       = useState<IGProfile | null>(null);
  const [igLoading,       setIgLoading]       = useState(true);
  const [igDisconnecting, setIgDisconnecting] = useState(false);

  // Profile modal
  const [profileOpen,   setProfileOpen]   = useState(false);
  const [profileName,   setProfileName]   = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg,    setProfileMsg]    = useState<{ ok: boolean; text: string } | null>(null);

  // Security modal
  const [secOpen,    setSecOpen]    = useState(false);
  const [newPass,    setNewPass]    = useState("");
  const [confirmPass,setConfirmPass]= useState("");
  const [showPass,   setShowPass]   = useState(false);
  const [secSaving,  setSecSaving]  = useState(false);
  const [secMsg,     setSecMsg]     = useState<{ ok: boolean; text: string } | null>(null);

  // Toast
  const [toast, setToast] = useState<{ text: string; ok: boolean } | null>(null);

  function showToast(text: string, ok = true) {
    setToast({ text, ok });
    setTimeout(() => setToast(null), 3500);
  }

  // Read URL params from Instagram callback
  useEffect(() => {
    const connected = searchParams.get("ig_connected");
    const error     = searchParams.get("ig_error");
    if (connected) showToast("Instagram connected successfully! 🎉");
    if (error) {
      const msgs: Record<string, string> = {
        access_denied:                    "Instagram access was denied.",
        token_exchange_failed:            "Could not exchange auth code. Check your Meta App settings.",
        no_facebook_page:                 "No Facebook Page found. Link a Page to your account first.",
        no_instagram_business_account:    "No Instagram Business Account linked to your Facebook Page.",
        meta_not_configured:              "Meta API not configured — add META_APP_ID to .env.local.",
      };
      showToast(msgs[error] ?? `Instagram error: ${error}`, false);
    }
  }, [searchParams]);

  // Load user + instagram status
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      setUserId(data.user.id);
      setUserEmail(data.user.email ?? "");
    });
  }, []);

  useEffect(() => {
    if (!userId) return;
    supabase.from("profiles")
      .select("full_name,instagram_username,instagram_followers,instagram_profile_pic")
      .eq("id", userId).single()
      .then(({ data }) => {
        if (data?.full_name) setProfileName(data.full_name);
        if (data?.instagram_username) {
          setIgProfile({
            username:       data.instagram_username,
            followersCount: data.instagram_followers ?? 0,
            profilePic:     data.instagram_profile_pic ?? null,
          });
        }
        setIgLoading(false);
      });
  }, [userId]);

  async function saveProfile() {
    if (!userId) return;
    setProfileSaving(true); setProfileMsg(null);
    const { error } = await supabase.from("profiles").update({
      full_name: profileName.trim(), updated_at: new Date().toISOString(),
    }).eq("id", userId);
    setProfileSaving(false);
    setProfileMsg(error ? { ok: false, text: error.message } : { ok: true, text: "Profile updated!" });
    if (!error) setTimeout(() => { setProfileMsg(null); setProfileOpen(false); }, 1200);
  }

  async function savePassword() {
    if (newPass.length < 8) { setSecMsg({ ok: false, text: "Password must be at least 8 characters." }); return; }
    if (newPass !== confirmPass) { setSecMsg({ ok: false, text: "Passwords do not match." }); return; }
    setSecSaving(true); setSecMsg(null);
    const { error } = await supabase.auth.updateUser({ password: newPass });
    setSecSaving(false);
    setSecMsg(error ? { ok: false, text: error.message } : { ok: true, text: "Password updated!" });
    if (!error) { setNewPass(""); setConfirmPass(""); setTimeout(() => { setSecMsg(null); setSecOpen(false); }, 1200); }
  }

  async function disconnectInstagram() {
    setIgDisconnecting(true);
    await fetch("/api/instagram/disconnect", { method: "POST" });
    setIgProfile(null);
    setIgDisconnecting(false);
    showToast("Instagram disconnected.");
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-y-auto">
      <PageHeader title="Settings" description="Manage your account and preferences." />

      <div className="p-6 max-w-2xl space-y-6">

        {/* ── Appearance ── */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
          className="rounded-2xl border border-border bg-card p-5 space-y-4"
        >
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 flex-shrink-0 rounded-xl bg-primary/10 flex items-center justify-center">
              <Monitor className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold">Appearance</p>
              <p className="text-xs text-muted-foreground mt-0.5">Choose your preferred interface theme.</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {themes.map(({ value, label, icon: Icon, desc }) => {
              const active = theme === value;
              return (
                <button key={value} onClick={() => setTheme(value)}
                  className={`relative flex flex-col items-center gap-3 rounded-xl border-2 p-5 transition-all ${active ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 hover:bg-secondary/50"}`}
                >
                  <div className={`w-full h-16 rounded-lg overflow-hidden border ${active ? "border-primary/30" : "border-border"} flex`}>
                    {value === "light" ? (
                      <div className="flex-1 bg-white flex flex-col gap-1 p-2">
                        <div className="h-2 w-3/4 rounded-full bg-gray-200"/>
                        <div className="h-2 w-1/2 rounded-full bg-gray-100"/>
                        <div className="mt-1 h-5 w-full rounded-md bg-blue-500/20"/>
                      </div>
                    ) : (
                      <div className="flex-1 bg-neutral-900 flex flex-col gap-1 p-2">
                        <div className="h-2 w-3/4 rounded-full bg-white/20"/>
                        <div className="h-2 w-1/2 rounded-full bg-white/10"/>
                        <div className="mt-1 h-5 w-full rounded-md bg-blue-500/30"/>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${active ? "text-primary" : "text-muted-foreground"}`}/>
                    <span className={`text-sm font-semibold ${active ? "text-primary" : "text-foreground"}`}>{label}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{desc}</p>
                  {active && (
                    <motion.div layoutId="theme-active"
                      className="absolute top-2.5 right-2.5 h-4 w-4 rounded-full bg-primary flex items-center justify-center"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                    >
                      <div className="h-1.5 w-1.5 rounded-full bg-white"/>
                    </motion.div>
                  )}
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* ── Instagram Account ── */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.07, duration: 0.4 }}
          className="rounded-2xl border border-border bg-card px-5 py-4"
        >
          {igLoading ? (
            <div className="flex items-center gap-4">
              <div className="h-9 w-9 flex-shrink-0 rounded-xl bg-primary/10 flex items-center justify-center">
                <Camera className="h-4 w-4 text-primary"/>
              </div>
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-32 rounded bg-secondary animate-pulse"/>
                <div className="h-2.5 w-48 rounded bg-secondary/60 animate-pulse"/>
              </div>
            </div>
          ) : igProfile ? (
            /* Connected state */
            <div className="flex items-center gap-4">
              <div className="relative">
                {igProfile.profilePic ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={igProfile.profilePic} alt={igProfile.username}
                    className="h-10 w-10 rounded-full object-cover border-2 border-border"/>
                ) : (
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-500 to-rose-500 flex items-center justify-center">
                    <Camera className="h-5 w-5 text-white"/>
                  </div>
                )}
                <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-card"/>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold">@{igProfile.username}</p>
                  <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">Connected</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {igProfile.followersCount.toLocaleString()} followers
                </p>
              </div>
              <button onClick={disconnectInstagram} disabled={igDisconnecting}
                className="flex items-center gap-1.5 ml-4 flex-shrink-0 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-rose-500 hover:border-rose-500/30 transition-all disabled:opacity-50">
                {igDisconnecting ? <Loader2 className="h-3.5 w-3.5 animate-spin"/> : <LogOut className="h-3.5 w-3.5"/>}
                Disconnect
              </button>
            </div>
          ) : (
            /* Not connected */
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-9 w-9 flex-shrink-0 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Camera className="h-4 w-4 text-primary"/>
                </div>
                <div>
                  <p className="text-sm font-medium">Instagram Account</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Connect your Instagram Business or Creator account.</p>
                </div>
              </div>
              <a href="/api/instagram/connect"
                className="ml-4 flex-shrink-0 rounded-xl bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-all active:scale-[0.98]">
                Connect
              </a>
            </div>
          )}
        </motion.div>

        {/* ── Notifications ── */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.14, duration: 0.4 }}
          className="flex items-center justify-between rounded-2xl border border-border bg-card px-5 py-4"
        >
          <div className="flex items-center gap-4">
            <div className="h-9 w-9 flex-shrink-0 rounded-xl bg-primary/10 flex items-center justify-center">
              <Bell className="h-4 w-4 text-primary"/>
            </div>
            <div>
              <p className="text-sm font-medium">Notifications</p>
              <p className="text-xs text-muted-foreground mt-0.5">Configure reminders for posting goals, leads, and tasks.</p>
            </div>
          </div>
          <button onClick={() => showToast("Notification settings coming soon!", true)}
            className="ml-4 flex-shrink-0 rounded-xl border border-border bg-card px-4 py-1.5 text-xs font-medium transition-all active:scale-[0.98] hover:bg-secondary">
            Configure
          </button>
        </motion.div>

        {/* ── Profile ── */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.21, duration: 0.4 }}
          className="flex items-center justify-between rounded-2xl border border-border bg-card px-5 py-4"
        >
          <div className="flex items-center gap-4">
            <div className="h-9 w-9 flex-shrink-0 rounded-xl bg-primary/10 flex items-center justify-center">
              <User className="h-4 w-4 text-primary"/>
            </div>
            <div>
              <p className="text-sm font-medium">Profile</p>
              <p className="text-xs text-muted-foreground mt-0.5">Update your display name.</p>
            </div>
          </div>
          <button onClick={() => { setProfileMsg(null); setProfileOpen(true); }}
            className="ml-4 flex-shrink-0 rounded-xl border border-border bg-card px-4 py-1.5 text-xs font-medium transition-all active:scale-[0.98] hover:bg-secondary">
            Edit
          </button>
        </motion.div>

        {/* ── Security ── */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28, duration: 0.4 }}
          className="flex items-center justify-between rounded-2xl border border-border bg-card px-5 py-4"
        >
          <div className="flex items-center gap-4">
            <div className="h-9 w-9 flex-shrink-0 rounded-xl bg-primary/10 flex items-center justify-center">
              <Shield className="h-4 w-4 text-primary"/>
            </div>
            <div>
              <p className="text-sm font-medium">Security</p>
              <p className="text-xs text-muted-foreground mt-0.5">Change your password and manage session security.</p>
            </div>
          </div>
          <button onClick={() => { setSecMsg(null); setNewPass(""); setConfirmPass(""); setSecOpen(true); }}
            className="ml-4 flex-shrink-0 rounded-xl border border-border bg-card px-4 py-1.5 text-xs font-medium transition-all active:scale-[0.98] hover:bg-secondary">
            Manage
          </button>
        </motion.div>
      </div>

      {/* ── Profile modal ── */}
      <AnimatePresence>
        {profileOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setProfileOpen(false)}/>
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }} transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
            >
              <div className="pointer-events-auto w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Edit Profile</p>
                  <button onClick={() => setProfileOpen(false)} className="h-7 w-7 rounded-lg bg-secondary flex items-center justify-center hover:bg-muted transition-colors">
                    <X className="h-3.5 w-3.5 text-muted-foreground"/>
                  </button>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">Display name</label>
                    <input value={profileName} onChange={e => setProfileName(e.target.value)}
                      className="h-10 w-full rounded-xl border border-border bg-secondary px-3 text-sm outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20 transition-all"
                      placeholder="Your name"/>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">Email</label>
                    <input value={userEmail} readOnly
                      className="h-10 w-full rounded-xl border border-border bg-secondary/40 px-3 text-sm text-muted-foreground outline-none cursor-not-allowed"/>
                  </div>
                </div>
                {profileMsg && (
                  <p className={`text-xs flex items-center gap-1.5 ${profileMsg.ok ? "text-emerald-600" : "text-rose-500"}`}>
                    {profileMsg.ok ? <Check className="h-3.5 w-3.5"/> : <X className="h-3.5 w-3.5"/>}
                    {profileMsg.text}
                  </p>
                )}
                <div className="flex gap-2">
                  <button onClick={() => setProfileOpen(false)}
                    className="flex-1 h-10 rounded-xl border border-border bg-secondary text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                    Cancel
                  </button>
                  <button onClick={saveProfile} disabled={profileSaving || !profileName.trim()}
                    className="flex-1 h-10 rounded-xl bg-blue-500 text-sm font-semibold text-white hover:bg-blue-400 transition-colors disabled:opacity-50">
                    {profileSaving ? "Saving…" : "Save"}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Security modal ── */}
      <AnimatePresence>
        {secOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setSecOpen(false)}/>
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }} transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
            >
              <div className="pointer-events-auto w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Change Password</p>
                  <button onClick={() => setSecOpen(false)} className="h-7 w-7 rounded-lg bg-secondary flex items-center justify-center hover:bg-muted transition-colors">
                    <X className="h-3.5 w-3.5 text-muted-foreground"/>
                  </button>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">New password</label>
                    <div className="relative">
                      <input type={showPass ? "text" : "password"} value={newPass} onChange={e => setNewPass(e.target.value)}
                        className="h-10 w-full rounded-xl border border-border bg-secondary px-3 pr-10 text-sm outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20 transition-all"
                        placeholder="Min. 8 characters"/>
                      <button type="button" onClick={() => setShowPass(s => !s)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                        {showPass ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">Confirm password</label>
                    <input type={showPass ? "text" : "password"} value={confirmPass} onChange={e => setConfirmPass(e.target.value)}
                      className="h-10 w-full rounded-xl border border-border bg-secondary px-3 text-sm outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20 transition-all"
                      placeholder="Repeat new password"/>
                  </div>
                </div>
                {secMsg && (
                  <p className={`text-xs flex items-center gap-1.5 ${secMsg.ok ? "text-emerald-600" : "text-rose-500"}`}>
                    {secMsg.ok ? <Check className="h-3.5 w-3.5"/> : <X className="h-3.5 w-3.5"/>}
                    {secMsg.text}
                  </p>
                )}
                <div className="flex gap-2">
                  <button onClick={() => setSecOpen(false)}
                    className="flex-1 h-10 rounded-xl border border-border bg-secondary text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                    Cancel
                  </button>
                  <button onClick={savePassword} disabled={secSaving || !newPass || !confirmPass}
                    className="flex-1 h-10 rounded-xl bg-blue-500 text-sm font-semibold text-white hover:bg-blue-400 transition-colors disabled:opacity-50">
                    {secSaving ? "Saving…" : "Update password"}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Toast ── */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-xl px-4 py-2.5 text-sm font-medium shadow-xl
              ${toast.ok ? "bg-foreground text-background" : "bg-rose-500 text-white"}`}
          >
            {toast.text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
