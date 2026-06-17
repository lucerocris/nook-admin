import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session — keeps cookie alive
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname
  const role = user?.app_metadata?.role

  // Not logged in — redirect to /login
  if (!user) {
    if (path.startsWith("/admin")) {
      return NextResponse.redirect(new URL("/login", request.url))
    }
    return supabaseResponse
  }

  // Logged in — redirect away from /login
  if (path === "/login") {
    if (role === "superadmin") {
      return NextResponse.redirect(new URL("/admin/dashboard", request.url))
    }
    // Has a session but no recognized role — sign out and show /login
    await supabase.auth.signOut()
    return NextResponse.redirect(new URL("/login", request.url))
  }

  // Wrong role for /admin/*
  if (path.startsWith("/admin") && role !== "superadmin") {
    await supabase.auth.signOut()
    return NextResponse.redirect(new URL("/login", request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ["/login", "/admin/:path*"],
}
