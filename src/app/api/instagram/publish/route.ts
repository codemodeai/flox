import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { postId } = await request.json();

  const { data: post } = await supabase
    .from("scheduled_posts")
    .select("*")
    .eq("id", postId)
    .eq("user_id", user.id)
    .single();

  if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });
  if (!post.media_url) return NextResponse.json({ error: "No media URL set on this post" }, { status: 400 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("instagram_user_id, instagram_access_token")
    .eq("id", user.id)
    .single();

  if (!profile?.instagram_user_id || !profile?.instagram_access_token) {
    return NextResponse.json({ error: "Instagram not connected" }, { status: 400 });
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
    return NextResponse.json({ error: "Container creation failed", detail: container }, { status: 500 });
  }

  // Step 2: Publish
  const publishRes = await fetch(`https://graph.facebook.com/v21.0/${igUserId}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creation_id: container.id, access_token: token }),
  });
  const published = await publishRes.json();

  if (published.id) {
    await supabase.from("scheduled_posts").update({ status: "Published" }).eq("id", postId);
    return NextResponse.json({ success: true, ig_post_id: published.id });
  }

  return NextResponse.json({ error: "Publish failed", detail: published }, { status: 500 });
}
