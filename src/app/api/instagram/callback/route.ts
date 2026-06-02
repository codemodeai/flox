import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code  = searchParams.get("code");
  const error = searchParams.get("error");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
  const fail = (reason: string) =>
    NextResponse.redirect(new URL(`/dashboard/settings?ig_error=${reason}`, appUrl));

  if (error || !code) return fail("access_denied");

  const appId      = process.env.META_APP_ID!;
  const appSecret  = process.env.META_APP_SECRET!;
  const redirectUri = `${appUrl}/api/instagram/callback`;

  // 1. Exchange code → short-lived user token
  const shortRes = await fetch("https://graph.facebook.com/v21.0/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: appId, client_secret: appSecret, redirect_uri: redirectUri, code }),
  });
  const shortData = await shortRes.json();
  if (!shortData.access_token) return fail("token_exchange_failed");

  // 2. Exchange short-lived → long-lived token (60 days)
  const longRes = await fetch(
    `https://graph.facebook.com/v21.0/oauth/access_token` +
    `?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortData.access_token}`,
  );
  const longData  = await longRes.json();
  const token     = longData.access_token ?? shortData.access_token;
  const expiresIn = longData.expires_in   ?? 5184000;
  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

  // 3. Fetch Instagram user linked to this token
  const profileRes = await fetch(
    `https://graph.facebook.com/v21.0/me` +
    `?fields=id,name,instagram_business_account` +
    `&access_token=${token}`,
  );
  const fbUser = await profileRes.json();

  // 4. Get Instagram business account details
  const igAccountId = fbUser.instagram_business_account?.id;
  let profile: Record<string, string | number> = {};
  let igUserId = igAccountId ?? fbUser.id;

  if (igAccountId) {
    const igRes = await fetch(
      `https://graph.facebook.com/v21.0/${igAccountId}` +
      `?fields=username,followers_count,profile_picture_url&access_token=${token}`,
    );
    profile = await igRes.json();
  }

  // 4. Persist to Supabase profiles
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", appUrl));

  await supabase.from("profiles").update({
    instagram_user_id:          String(igUserId),
    instagram_username:         (profile.username         as string)  ?? null,
    instagram_page_id:          null,
    instagram_access_token:     token,
    instagram_token_expires_at: expiresAt,
    instagram_followers:        (profile.followers_count  as number)  ?? 0,
    instagram_profile_pic:      (profile.profile_picture_url as string) ?? null,
    updated_at: new Date().toISOString(),
  }).eq("id", user.id);

  return NextResponse.redirect(new URL("/dashboard/settings?ig_connected=1", appUrl));
}
