import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

// Meta webhook verification
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode      = searchParams.get("hub.mode");
  const token     = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.META_WEBHOOK_VERIFY_TOKEN) {
    return new Response(challenge ?? "", { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

// Meta webhook events
export async function POST(request: Request) {
  const body = await request.json();

  if (body.object !== "instagram") {
    return NextResponse.json({ status: "ignored" });
  }

  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  for (const entry of body.entry ?? []) {
    const igUserId: string = entry.id;

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, instagram_access_token")
      .eq("instagram_user_id", igUserId)
      .single();

    if (!profile) continue;

    const { data: automations } = await supabase
      .from("automations")
      .select("*")
      .eq("user_id", profile.id)
      .eq("status", "Active");

    if (!automations?.length) continue;

    const token = profile.instagram_access_token!;

    // ── Comment events ──────────────────────────────────────
    for (const change of entry.changes ?? []) {
      if (change.field !== "comments") continue;

      const commentText: string  = change.value?.text    ?? "";
      const commentId:   string  = change.value?.id      ?? "";
      const commenterId: string  = change.value?.from?.id ?? "";
      const commenterUsername: string = change.value?.from?.username ?? "";

      for (const auto of automations) {
        if (auto.trigger_type !== "Comment Keyword") continue;
        const keyword = (auto.trigger_keyword ?? "").toLowerCase().trim();
        if (!keyword || !commentText.toLowerCase().includes(keyword)) continue;

        if (auto.action_type === "Reply Comment") {
          await fetch(`https://graph.facebook.com/v21.0/${commentId}/replies`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: auto.message, access_token: token }),
          });
        } else if (auto.action_type === "Send DM") {
          const dmRes = await fetch(`https://graph.facebook.com/v21.0/${igUserId}/messages`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              recipient: { id: commenterId },
              message:   { text: auto.message },
              access_token: token,
            }),
          });
          const dmData = await dmRes.json();

          // Auto-create a lead when a DM is sent
          if (dmData.message_id && commenterUsername) {
            await supabase.from("leads").insert({
              user_id: profile.id,
              name:    commenterUsername,
              handle:  `@${commenterUsername}`,
              source:  "Instagram Automation",
              status:  "New",
              score:   60,
            });

            await supabase
              .from("automations")
              .update({ leads: (auto.leads ?? 0) + 1 })
              .eq("id", auto.id);
          }
        }

        // Increment triggered count
        await supabase
          .from("automations")
          .update({
            triggered: (auto.triggered ?? 0) + 1,
            last_run:  new Date().toISOString(),
          })
          .eq("id", auto.id);
      }
    }

    // ── DM Keyword events ───────────────────────────────────
    for (const msg of entry.messaging ?? []) {
      const senderId: string  = msg.sender?.id ?? "";
      const msgText:  string  = msg.message?.text ?? "";
      if (!senderId || !msgText) continue;

      for (const auto of automations) {
        if (auto.trigger_type !== "DM Keyword") continue;
        const keyword = (auto.trigger_keyword ?? "").toLowerCase().trim();
        if (!keyword || !msgText.toLowerCase().includes(keyword)) continue;

        await fetch(`https://graph.facebook.com/v21.0/${igUserId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recipient: { id: senderId },
            message:   { text: auto.message },
            access_token: token,
          }),
        });

        await supabase
          .from("automations")
          .update({
            triggered: (auto.triggered ?? 0) + 1,
            last_run:  new Date().toISOString(),
          })
          .eq("id", auto.id);
      }
    }
  }

  return NextResponse.json({ status: "ok" });
}
