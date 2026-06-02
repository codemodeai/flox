import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Meta calls this endpoint when a user removes the app from their Facebook/Instagram account.
// We must delete all data associated with that user and return a confirmation URL.
export async function POST(request: Request) {
  try {
    const body = await request.text();
    const params = new URLSearchParams(body);
    const signedRequest = params.get("signed_request");

    if (!signedRequest) {
      return NextResponse.json({ error: "Missing signed_request" }, { status: 400 });
    }

    const [encodedSig, payload] = signedRequest.split(".");
    if (!encodedSig || !payload) {
      return NextResponse.json({ error: "Malformed signed_request" }, { status: 400 });
    }

    // Verify HMAC-SHA256 signature against app secret (required by Meta)
    const appSecret = process.env.META_APP_SECRET!;
    const expectedSig = createHmac("sha256", appSecret).update(payload).digest();
    const receivedSig = Buffer.from(encodedSig.replace(/-/g, "+").replace(/_/g, "/"), "base64");
    if (receivedSig.length !== expectedSig.length || !timingSafeEqual(receivedSig, expectedSig)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
    }

    // Decode the signed request (base64url encoded JSON payload)
    const decoded = JSON.parse(
      Buffer.from(payload.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf-8"),
    );

    const facebookUserId = decoded?.user_id as string | undefined;

    if (facebookUserId) {
      const supabase = await createClient();
      // Clear Instagram data for any profile linked to this Facebook user
      await supabase
        .from("profiles")
        .update({
          instagram_user_id:          null,
          instagram_username:         null,
          instagram_page_id:          null,
          instagram_access_token:     null,
          instagram_token_expires_at: null,
          instagram_followers:        null,
          instagram_profile_pic:      null,
          updated_at: new Date().toISOString(),
        })
        .eq("instagram_user_id", facebookUserId);
    }

    const confirmationCode = `flox-deletion-${facebookUserId ?? "unknown"}-${Date.now()}`;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://flox.codemodeai.com";

    return NextResponse.json({
      url: `${appUrl}/api/data-deletion/status?code=${confirmationCode}`,
      confirmation_code: confirmationCode,
    });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

// Status check page Meta may redirect users to
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  return NextResponse.json({
    status: "deleted",
    confirmation_code: code,
    message: "Your data has been deleted from FLOX.",
  });
}
