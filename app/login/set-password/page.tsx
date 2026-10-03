"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field } from "@/components/admin/form-kit"
import { AuthError, AuthShell, authInputClass } from "@/components/login-form"

type Stage = "loading" | "form" | "error"

function SetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [stage, setStage] = React.useState<Stage>("loading")
  const [role, setRole] = React.useState<string | null>(null)
  const [newPassword, setNewPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [newPasswordError, setNewPasswordError] = React.useState("")
  const [confirmPasswordError, setConfirmPasswordError] = React.useState("")
  const [formError, setFormError] = React.useState("")
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    if (searchParams.get("error") === "link_expired") {
      setStage("error")
      return
    }

    const hashParams = new URLSearchParams(window.location.hash.slice(1))
    const accessToken = hashParams.get("access_token")
    const refreshToken = hashParams.get("refresh_token")

    if (accessToken && refreshToken) {
      supabase.auth
        .setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(({ data: { session }, error }) => {
          if (error || !session?.user) {
            setStage("error")
            return
          }
          setRole(session.user.app_metadata?.role ?? null)
          setStage("form")
          window.history.replaceState({}, "", window.location.pathname + window.location.search)
        })
      return
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setRole(session.user.app_metadata?.role ?? null)
        setStage("form")
        return
      }
      setStage("error")
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleSetPassword() {
    setFormError("")
    if (!newPassword || !confirmPassword) {
      setNewPasswordError(newPassword ? "" : "Enter a new password.")
      setConfirmPasswordError(confirmPassword ? "" : "Type the password again to confirm it.")
      return
    }
    if (newPassword !== confirmPassword) {
      setNewPasswordError("")
      setConfirmPasswordError("Passwords don’t match. Type the same password in both fields.")
      return
    }
    if (newPassword.length < 8) {
      setNewPasswordError("Use at least 8 characters.")
      setConfirmPasswordError("")
      return
    }
    setNewPasswordError("")
    setConfirmPasswordError("")
    setSaving(true)

    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
      data: { password_changed: true },
    })

    if (error) {
      setFormError(`We couldn’t save your password: ${error.message}`)
      setSaving(false)
      return
    }

    const userRole = role ?? data.user?.app_metadata?.role
    if (userRole === "superadmin") {
      router.push("/admin/dashboard")
      router.refresh()
      return
    }

    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  if (stage === "loading") {
    return <AuthShell title="Set your password" description="Verifying your link…" />
  }

  if (stage === "error") {
    return (
      <AuthShell
        title="This link has expired"
        description="It’s expired or has already been used. Go back to sign in and choose “Forgot your password?” to get a new one."
      >
        <Button className="w-full" onClick={() => router.push("/login")}>
          Back to sign in
        </Button>
      </AuthShell>
    )
  }

  return (
    <AuthShell title="Set your password" description="Choose a password for your Nook admin account.">
      <form
        className="flex flex-col gap-4"
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          handleSetPassword()
        }}
      >
        <Field
          label="New password"
          htmlFor="new-password"
          hint="At least 8 characters."
          error={newPasswordError}
        >
          <Input
            id="new-password"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            aria-invalid={!!newPasswordError || undefined}
            aria-describedby="new-password-hint"
            className={authInputClass}
            required
          />
        </Field>
        <Field label="Confirm password" htmlFor="confirm-password" error={confirmPasswordError}>
          <Input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            aria-invalid={!!confirmPasswordError || undefined}
            aria-describedby={confirmPasswordError ? "confirm-password-hint" : undefined}
            className={authInputClass}
            required
          />
        </Field>
        {formError && <AuthError>{formError}</AuthError>}
        <Button type="submit" className="mt-2 w-full" loading={saving} loadingText="Saving…">
          Set password
        </Button>
      </form>
    </AuthShell>
  )
}

export default function SetPasswordPage() {
  // useSearchParams needs a Suspense boundary; the fallback is the same frame
  // the form shows while it verifies the link.
  return (
    <React.Suspense fallback={<AuthShell title="Set your password" description="Verifying your link…" />}>
      <SetPasswordForm />
    </React.Suspense>
  )
}
