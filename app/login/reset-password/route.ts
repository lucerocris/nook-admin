import { NextRequest, NextResponse } from "next/server"
import type { EmailOtpType } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/server"

const OTP_TYPES: EmailOtpType[] = ["recovery", "invite", "email", "magiclink", "signup", "email_change"]

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const code = params.get("code")
  const tokenHash = params.get("token_hash")
  const type = params.get("type") as EmailOtpType | null

  if (!code && !tokenHash) {
    return NextResponse.redirect(new URL("/login/set-password", request.url))
  }

  const supabase = await createClient()

  // token_hash links are verified server-side with no PKCE verifier, so they
  // work when the email is opened in a different browser or device from the one
  // that requested it. A `code` link only exchanges in the browser that holds
  // the verifier cookie, so it stays as a fallback for older emails.
  const { error } =
    tokenHash && type && OTP_TYPES.includes(type)
      ? await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
      : code
        ? await supabase.auth.exchangeCodeForSession(code)
        : { error: new Error("invalid_link") }

  if (error) {
    return NextResponse.redirect(
      new URL("/login/set-password?error=link_expired", request.url)
    )
  }

  return NextResponse.redirect(new URL("/login/set-password", request.url))
}
