import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("instagram_user_id,instagram_access_token,instagram_followers,instagram_username,instagram_profile_pic")
    .eq("id", user.id)
    .single();

  if (!profile?.instagram_user_id || !profile.instagram_access_token) {
    return NextResponse.json({ connected: false });
  }

  const igId  = profile.instagram_user_id;
  const token = profile.instagram_access_token;

  // Current profile stats
  const userRes = await fetch(
    `https://graph.instagram.com/v21.0/me` +
    `?fields=user_id,username,name,profile_picture_url,followers_count,media_count&access_token=${token}`,
  );
  const userData = await userRes.json();

  // Daily insights — last 7 days
  const since = Math.floor(Date.now() / 1000) - 7 * 86400;
  const until = Math.floor(Date.now() / 1000);
  const insRes = await fetch(
    `https://graph.instagram.com/v21.0/${igId}/insights` +
    `?metric=impressions,reach,accounts_engaged&period=day&since=${since}&until=${until}&access_token=${token}`,
  );
  const insData = await insRes.json();

  const find = (name: string) =>
    (insData.data ?? []).find((m: { name: string }) => m.name === name)?.values?.map(
      (v: { value: number }) => v.value,
    ) ?? Array(7).fill(0);

  // Refresh stored follower count
  if (userData.followers_count !== undefined) {
    await supabase.from("profiles").update({
      instagram_followers:  userData.followers_count,
      instagram_profile_pic: userData.profile_picture_url ?? null,
      updated_at: new Date().toISOString(),
    }).eq("id", user.id);
  }

  return NextResponse.json({
    connected:        true,
    username:         userData.username         ?? profile.instagram_username,
    followersCount:   userData.followers_count  ?? profile.instagram_followers ?? 0,
    mediaCount:       userData.media_count      ?? 0,
    profilePic:       userData.profile_picture_url ?? profile.instagram_profile_pic,
    impressionsDaily: find("impressions"),
    reachDaily:       find("reach"),
    engagedDaily:     find("accounts_engaged"),
  });
}
