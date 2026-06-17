"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"

type Stage = "loading" | "form" | "error"

function SetPasswordForm({ className }: React.ComponentProps<"div">) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [stage, setStage] = React.useState<Stage>("loading")
  const [role, setRole] = React.useState<string | null>(null)
  const [newPassword, setNewPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
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
    if (!newPassword || !confirmPassword) {
      setFormError("Please fill in both fields")
      return
    }
    if (newPassword !== confirmPassword) {
      setFormError("Passwords do not match")
      return
    }
    if (newPassword.length < 8) {
      setFormError("Password must be at least 8 characters")
      return
    }
    setFormError("")
    setSaving(true)

    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
      data: { password_changed: true },
    })

    if (error) {
      setFormError(error.message)
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
    return (
      <div className={cn("flex flex-col gap-6", className)}>
        <Card className="overflow-hidden p-0">
          <CardContent className="p-6 md:p-8 flex flex-col items-center gap-3 text-center">
            <p className="text-sm text-muted-foreground">Verifying your link…</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (stage === "error") {
    return (
      <div className={cn("flex flex-col gap-6", className)}>
        <Card className="overflow-hidden p-0">
          <CardContent className="p-6 md:p-8 flex flex-col items-center gap-4 text-center">
            <h1 className="text-2xl font-bold">Link expired</h1>
            <p className="text-sm text-muted-foreground">
              This link has expired or already been used. Please request a new
              one.
            </p>
            <Button variant="outline" onClick={() => router.push("/login")}>
              Back to login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form
            className="p-6 md:p-8"
            onSubmit={(e) => {
              e.preventDefault()
              handleSetPassword()
            }}
          >
            <FieldGroup>
              <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-2xl font-bold">Set new password</h1>
                <p className="text-sm text-balance text-muted-foreground">
                  Choose a strong password for your account.
                </p>
              </div>

              <Field>
                <Field className="grid grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel htmlFor="new-password">New password</FieldLabel>
                    <Input
                      id="new-password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="confirm-password">
                      Confirm password
                    </FieldLabel>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </Field>
                </Field>
                <FieldDescription>Must be at least 8 characters long.</FieldDescription>
                {formError && <FieldError>{formError}</FieldError>}
              </Field>

              <Field>
                <Button type="submit" className="w-full" disabled={saving}>
                  {saving ? "Saving…" : "Set password"}
                </Button>
              </Field>
            </FieldGroup>
          </form>

          <div className="relative hidden bg-muted md:block" />
        </CardContent>
      </Card>
    </div>
  )
}

export default function SetPasswordPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-muted p-6 md:p-10">
      <div className="w-full max-w-sm md:max-w-4xl">
        <React.Suspense fallback={null}>
          <SetPasswordForm />
        </React.Suspense>
      </div>
    </div>
  )
}
