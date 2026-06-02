import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await supabase.from("profiles").update({
    instagram_user_id:          null,
    instagram_username:         null,
    instagram_page_id:          null,
    instagram_access_token:     null,
    instagram_token_expires_at: null,
    instagram_followers:        0,
    instagram_profile_pic:      null,
    updated_at: new Date().toISOString(),
  }).eq("id", user.id);

  return NextResponse.json({ success: true });
}
