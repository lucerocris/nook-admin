"use client"

import React from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
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

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter()
  const supabase = createClient()

  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [showPassword, setShowPassword] = React.useState(false)
  const [loginError, setLoginError] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false)
  const [showForgot, setShowForgot] = React.useState(false)
  const [resetEmail, setResetEmail] = React.useState("")
  const [resetSent, setResetSent] = React.useState(false)
  const [resetError, setResetError] = React.useState("")

  async function handleLogin() {
    if (!email || !password) {
      setLoginError("Please enter your email and password")
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
        setLoginError("Invalid email or password")
        return
      }

      const role = data.user?.app_metadata?.role

      if (role === "superadmin") {
        router.push("/admin/dashboard")
        router.refresh()
        return
      }

      await supabase.auth.signOut()
      setLoginError("No admin access for this account")
    } finally {
      setIsLoading(false)
    }
  }

  async function handleForgotPassword() {
    if (!resetEmail.trim()) {
      setResetError("Please enter your email address")
      return
    }
    setResetError("")
    setIsLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/login/reset-password`,
      })
      if (error) {
        setResetError(error.message)
        return
      }
      setResetSent(true)
    } finally {
      setIsLoading(false)
    }
  }

  const imagePanel = (
    <div className="relative hidden bg-muted md:block">
      <img
        src="/loginPic.png"
        alt="Image"
        className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
      />
    </div>
  )

  if (showForgot) {
    return (
      <div className={cn("flex flex-col gap-6", className)} {...props}>
        <Card className="overflow-hidden p-0">
          <CardContent className="grid p-0 md:grid-cols-2">
            <form
              className="p-6 md:p-8"
              onSubmit={(e) => {
                e.preventDefault()
                handleForgotPassword()
              }}
            >
              <FieldGroup>
                <div className="flex flex-col items-center gap-2 text-center">
                  <Image src="/logoT.png" alt="Nook" width={80} height={20} className="h-5 w-auto mb-2" />
                  <h1 className="text-2xl font-bold">Reset password</h1>
                  <p className="text-balance text-muted-foreground">
                    Enter your email and we&apos;ll send you a reset link.
                  </p>
                </div>
                {resetSent ? (
                  <FieldDescription className="rounded-md bg-muted px-3 py-2 text-center">
                    Reset link sent — check your email
                  </FieldDescription>
                ) : (
                  <>
                    <Field>
                      <FieldLabel htmlFor="reset-email">Email</FieldLabel>
                      <Input
                        id="reset-email"
                        type="email"
                        placeholder="you@example.com"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        required
                      />
                      {resetError && <FieldError>{resetError}</FieldError>}
                    </Field>
                    <Field>
                      <Button
                        type="submit"
                        className="w-full"
                        disabled={!resetEmail.trim() || isLoading}
                      >
                        {isLoading ? "Sending…" : "Send reset link"}
                      </Button>
                    </Field>
                  </>
                )}
                <FieldDescription className="text-center">
                  <button
                    type="button"
                    className="underline underline-offset-4 hover:text-primary"
                    onClick={() => {
                      setShowForgot(false)
                      setResetEmail("")
                      setResetError("")
                      setResetSent(false)
                    }}
                  >
                    Back to login
                  </button>
                </FieldDescription>
              </FieldGroup>
            </form>
            {imagePanel}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form
            className="p-6 md:p-8"
            onSubmit={(e) => {
              e.preventDefault()
              handleLogin()
            }}
          >
            <FieldGroup>
              <div className="flex flex-col items-center gap-2 text-center">
                <Image src="/logoT.png" alt="Nook" width={80} height={20} className="h-5 w-auto mb-2" />
                <h1 className="text-2xl font-bold">Welcome back</h1>
                <p className="text-balance text-muted-foreground">
                  Login to your Nook account
                </p>
              </div>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </Field>
              <Field>
                <div className="flex items-center">
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <button
                    type="button"
                    className="ml-auto text-sm underline-offset-2 hover:underline"
                    onClick={() => {
                      setShowForgot(true)
                      setResetSent(false)
                    }}
                  >
                    Forgot your password?
                  </button>
                </div>
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                {loginError && <FieldError>{loginError}</FieldError>}
              </Field>
              <Field>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Signing in…" : "Login"}
                </Button>
              </Field>
            </FieldGroup>
          </form>
          {imagePanel}
        </CardContent>
      </Card>
    </div>
  )
}
