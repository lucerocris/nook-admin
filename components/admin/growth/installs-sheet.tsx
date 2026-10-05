"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { DrawerFooter, Field } from "@/components/admin/form-kit"
import { logInstallsAction } from "@/app/admin/growth/actions"
import { manilaWeekStart, shortWeekLabel } from "@/lib/growth/dates"

// App Store Connect and Play Console have no API we can call from here, so
// installs are typed in once a week. The row lands in marketing_weekly_metrics,
// the same table the Marketing page's Targets tab writes, so the two never
// disagree.
export function InstallsSheet({ latest }: { latest: { weekOf: string; total: number } | null }) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const thisWeek = manilaWeekStart(new Date())
  const [weekOf, setWeekOf] = React.useState(thisWeek)
  const [value, setValue] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [saving, startSaving] = React.useTransition()

  const parsed = value.trim() === "" ? null : Number(value.replace(/[,\s]/g, ""))
  const valid = parsed !== null && Number.isInteger(parsed) && parsed >= 0

  function submit() {
    if (!valid) {
      setError("Enter the install total as a whole number.")
      return
    }
    // Any date picks its week; store the Monday.
    const monday = manilaWeekStart(`${weekOf}T12:00:00+08:00`)
    startSaving(async () => {
      const res = await logInstallsAction({ weekOf: monday, installs: parsed! })
      if (!res.ok) {
        setError(res.error)
        return
      }
      toast.success(`Installs logged for the week of ${shortWeekLabel(monday)}`)
      setOpen(false)
      setValue("")
      router.refresh()
    })
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) setError(null)
      }}
    >
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          {latest ? "Log this week's installs" : "Log installs"}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="gap-0 data-[side=right]:w-full data-[side=right]:sm:max-w-md">
        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(e) => {
            e.preventDefault()
            if (!saving) submit()
          }}
        >
          <SheetHeader className="border-b px-5 py-4 pr-12">
            <SheetTitle className="text-base font-semibold">Log store installs</SheetTitle>
            <SheetDescription className="text-[13px]">
              Add App Store Connect’s and Play Console’s all-time totals together. Logging a week
              again replaces its number.
            </SheetDescription>
          </SheetHeader>
          <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-5 py-5">
            <Field
              label="Week"
              htmlFor="installs-week"
              hint={`Saved against the Monday it starts on. This week starts ${shortWeekLabel(thisWeek)}.`}
            >
              <Input
                id="installs-week"
                type="date"
                value={weekOf}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setWeekOf(e.target.value || thisWeek)}
                className="h-10 text-base sm:text-sm"
              />
            </Field>
            <Field
              label="Installs to date"
              htmlFor="installs-total"
              error={error}
              hint={
                latest
                  ? `Last logged: ${latest.total.toLocaleString("en-US")} for the week of ${shortWeekLabel(latest.weekOf)}.`
                  : "iOS units plus Android installs, all time."
              }
            >
              <Input
                id="installs-total"
                inputMode="numeric"
                autoComplete="off"
                placeholder="e.g. 140"
                value={value}
                onChange={(e) => {
                  setValue(e.target.value)
                  setError(null)
                }}
                aria-invalid={!!error || undefined}
                className="h-10 text-base sm:text-sm"
                autoFocus
              />
            </Field>
          </div>
          <DrawerFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving} disabled={!valid}>
              Save installs
            </Button>
          </DrawerFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
