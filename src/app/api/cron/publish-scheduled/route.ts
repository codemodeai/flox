import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const now     = new Date();
  const dateISO = now.toISOString().slice(0, 10);
  const timeStr = `${String(now.getUTCHours()).padStart(2, "0")}:${String(now.getUTCMinutes()).padStart(2, "0")}`;

  // Fetch all due scheduled posts that have a media_url
  const { data: posts } = await supabase
    .from("scheduled_posts")
    .select("*")
    .eq("status", "Scheduled")
    .lte("scheduled_date", dateISO);

  if (!posts?.length) return NextResponse.json({ published: 0 });

  // Filter to posts whose time has passed today
  const due = posts.filter(p =>
    p.scheduled_date < dateISO ||
    (p.scheduled_date === dateISO && p.scheduled_time <= timeStr),
  );

  if (!due.length) return NextResponse.json({ published: 0 });

  let published = 0;

  for (const post of due) {
    if (!post.media_url) {
      await supabase.from("scheduled_posts").update({ status: "Failed" }).eq("id", post.id);
      continue;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("instagram_user_id, instagram_access_token")
      .eq("id", post.user_id)
      .single();

    if (!profile?.instagram_user_id || !profile?.instagram_access_token) {
      await supabase.from("scheduled_posts").update({ status: "Failed" }).eq("id", post.id);
      continue;
    }

    const igUserId = profile.instagram_user_id;
    const token    = profile.instagram_access_token;
    const caption  = [post.caption, post.hashtags].filter(Boolean).join("\n\n");

    // Step 1: Create media container
    const containerRes = await fetch(`https://graph.facebook.com/v21.0/${igUserId}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image_url: post.media_url, caption, access_token: token }),
    });
    const container = await containerRes.json();

    if (!container.id) {
      await supabase.from("scheduled_posts").update({ status: "Failed" }).eq("id", post.id);
      continue;
    }

    // Step 2: Publish container
    const publishRes = await fetch(`https://graph.facebook.com/v21.0/${igUserId}/media_publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ creation_id: container.id, access_token: token }),
    });
    const result = await publishRes.json();

    if (result.id) {
      await supabase.from("scheduled_posts").update({ status: "Published" }).eq("id", post.id);
      published++;
    } else {
      await supabase.from("scheduled_posts").update({ status: "Failed" }).eq("id", post.id);
    }
  }

  return NextResponse.json({ published });
}
