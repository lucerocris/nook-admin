"use client"

import React from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field } from "@/components/admin/form-kit"

// design.md › Page skeletons › Auth: a small centred form on the canvas, logo
// above, no shell. Sign in, reset, set password and sign up all render inside
// this frame so the four screens read as one.

const LOGO_SRC = "https://lucerocris.sgp1.cdn.digitaloceanspaces.com/nook-sites/logo.svg"

/** Inputs on auth screens: 44px tap target on phones, compact from sm: up. */
export const authInputClass = "h-11 sm:h-9"

/** Quiet secondary link/button under the primary action. */
export const authLinkClass =
  "inline-flex min-h-11 items-center rounded-md text-sm text-muted-foreground underline-offset-4 outline-hidden hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring sm:min-h-0"

export function AuthShell({
  title,
  description,
  children,
}: {
  title: string
  description?: React.ReactNode
  children?: React.ReactNode
}) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 py-12">
      <div className="flex w-full max-w-sm flex-col gap-8">
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={LOGO_SRC} alt="Nook" className="h-7 w-auto" />
            <span className="rounded-md bg-foreground px-1.5 py-0.5 text-[11px] font-semibold text-background">
              Admin
            </span>
          </div>
          <div className="flex flex-col gap-1.5">
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </div>
        </div>
        {children}
      </div>
    </main>
  )
}

/** One bordered line above the primary button for auth failures. */
export function AuthError({ children }: { children: React.ReactNode }) {
  return (
    <p
      role="alert"
      className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
    >
      {children}
    </p>
  )
}

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter()
  const supabase = createClient()

  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [showPassword] = React.useState(false)
  const [emailError, setEmailError] = React.useState("")
  const [passwordError, setPasswordError] = React.useState("")
  const [loginError, setLoginError] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false)
  const [showForgot, setShowForgot] = React.useState(false)
  const [resetEmail, setResetEmail] = React.useState("")
  const [resetSent, setResetSent] = React.useState(false)
  const [resetFieldError, setResetFieldError] = React.useState("")
  const [resetError, setResetError] = React.useState("")

  async function handleLogin() {
    setEmailError(email ? "" : "Enter your email.")
    setPasswordError(password ? "" : "Enter your password.")
    if (!email || !password) {
      setLoginError("")
      return
    }
    setLoginError("")
    setIsLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setLoginError("That email and password don’t match. Check both and try again.")
        return
      }

      const role = data.user?.app_metadata?.role

      if (role === "superadmin") {
        router.push("/admin/dashboard")
        router.refresh()
        return
      }

      await supabase.auth.signOut()
      setLoginError("This account doesn’t have admin access. Sign in with an admin account.")
    } finally {
      setIsLoading(false)
    }
  }

  async function handleForgotPassword() {
    if (!resetEmail.trim()) {
      setResetFieldError("Enter your email address.")
      return
    }
    setResetFieldError("")
    setResetError("")
    setIsLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/login/reset-password`,
      })
      if (error) {
        setResetError(`We couldn’t send the link: ${error.message}`)
        return
      }
      setResetSent(true)
    } finally {
      setIsLoading(false)
    }
  }

  function backToSignIn() {
    setShowForgot(false)
    setResetEmail("")
    setResetFieldError("")
    setResetError("")
    setResetSent(false)
  }

  if (showForgot) {
    if (resetSent) {
      return (
        <AuthShell
          title="Check your email"
          description={
            <>
              We sent a reset link to <span className="font-medium text-foreground">{resetEmail}</span>.
              Open it to set a new password.
            </>
          }
        >
          <div className={cn("flex justify-center", className)} {...props}>
            <button type="button" className={authLinkClass} onClick={backToSignIn}>
              Back to sign in
            </button>
          </div>
        </AuthShell>
      )
    }

    return (
      <AuthShell
        title="Reset your password"
        description="Enter your email and we’ll send you a link to set a new one."
      >
        <div className={cn("flex flex-col gap-6", className)} {...props}>
          <form
            className="flex flex-col gap-4"
            noValidate
            onSubmit={(e) => {
              e.preventDefault()
              handleForgotPassword()
            }}
          >
            <Field label="Email" htmlFor="reset-email" error={resetFieldError}>
              <Input
                id="reset-email"
                type="email"
                autoComplete="email"
                inputMode="email"
                placeholder="you@example.com"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                aria-invalid={!!resetFieldError || undefined}
                aria-describedby={resetFieldError ? "reset-email-hint" : undefined}
                className={authInputClass}
                required
              />
            </Field>
            {resetError && <AuthError>{resetError}</AuthError>}
            <Button
              type="submit"
              className="mt-2 w-full"
              disabled={!resetEmail.trim()}
              loading={isLoading}
              loadingText="Sending…"
            >
              Send reset link
            </Button>
          </form>
          <div className="flex justify-center">
            <button type="button" className={authLinkClass} onClick={backToSignIn}>
              Back to sign in
            </button>
          </div>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell title="Sign in to Nook admin" description="Use your Nook admin email and password.">
      <div className={cn("flex flex-col gap-6", className)} {...props}>
        <form
          className="flex flex-col gap-4"
          noValidate
          onSubmit={(e) => {
            e.preventDefault()
            handleLogin()
          }}
        >
          <Field label="Email" htmlFor="email" error={emailError}>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={!!emailError || undefined}
              aria-describedby={emailError ? "email-hint" : undefined}
              className={authInputClass}
              required
            />
          </Field>
          <Field label="Password" htmlFor="password" error={passwordError}>
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={!!passwordError || undefined}
              aria-describedby={passwordError ? "password-hint" : undefined}
              className={authInputClass}
              required
            />
          </Field>
          {loginError && <AuthError>{loginError}</AuthError>}
          <Button type="submit" className="mt-2 w-full" loading={isLoading} loadingText="Signing in…">
            Sign in
          </Button>
        </form>
        <div className="flex justify-center">
          <button
            type="button"
            className={authLinkClass}
            onClick={() => {
              setShowForgot(true)
              setResetSent(false)
            }}
          >
            Forgot your password?
          </button>
        </div>
      </div>
    </AuthShell>
  )
}
