"use client"

import { useEffect, useMemo, useState } from "react"
import {
  ArrowSquareOutIcon,
  CheckIcon,
  CopyIcon,
  FacebookLogoIcon,
  InstagramLogoIcon,
  LinkSimpleIcon,
  MagnifyingGlassIcon,
  PaperPlaneTiltIcon,
} from "@phosphor-icons/react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import {
  PageHeader,
  SearchField,
  StatusChip,
  StatusTabs,
  TableEmpty,
  Thumb,
  Toolbar,
  shortDate,
} from "@/components/admin/table-kit"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"
import {
  OUTREACH_TEMPLATES,
  PUBLIC_CAFE_URL,
  fillTemplate,
  type OutreachTemplateKey,
} from "@/lib/outreach-templates"
import type { OutreachCafe } from "@/lib/queries/outreach"

// When each café's message was last copied. Per browser only: it's a "did I
// already DM them" reminder, not a shared record.
const SENT_KEY = "nook-admin:outreach-copied"

function readSent(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(SENT_KEY) ?? "{}") as Record<string, string>
  } catch {
    return {}
  }
}

function writeSent(sent: Record<string, string>) {
  try {
    localStorage.setItem(SENT_KEY, JSON.stringify(sent))
  } catch {
    // Private window or blocked storage: the copy still worked.
  }
}

async function copyText(text: string, what: string) {
  try {
    await navigator.clipboard.writeText(text)
    toast.success(`${what} copied`)
    return true
  } catch {
    toast.error("Couldn't copy. Select the text and copy it manually.")
    return false
  }
}

function defaultTemplate(cafe: OutreachCafe): OutreachTemplateKey {
  return cafe.photo_count === 0 ? "added-no-photos" : "added"
}

function Composer({
  cafe,
  sender,
  sentAt,
  onCopied,
}: {
  cafe: OutreachCafe
  sender: string
  sentAt: string | undefined
  onCopied: () => void
}) {
  const [templateKey, setTemplateKey] = useState<OutreachTemplateKey>(defaultTemplate(cafe))
  const template = OUTREACH_TEMPLATES.find((t) => t.key === templateKey) ?? OUTREACH_TEMPLATES[0]
  const link = PUBLIC_CAFE_URL + cafe.id
  const filled = fillTemplate(template.body, { cafe: cafe.name, link, sender })
  // Edits are kept per template for this café only; a new café starts fresh.
  const [edits, setEdits] = useState<Partial<Record<OutreachTemplateKey, string>>>({})
  const draft = edits[templateKey] ?? filled

  const igSearch = `https://www.instagram.com/explore/search/keyword/?q=${encodeURIComponent(cafe.name)}`

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <Thumb src={cafe.featured_image_url} className="size-11" />
        <div className="min-w-0">
          <p className="truncate font-semibold">{cafe.name}</p>
          <p className="text-[13px] text-muted-foreground">
            {[cafe.neighborhood, cafe.city].filter(Boolean).join(", ")}
            {sentAt && <> · copied {shortDate(sentAt)}</>}
          </p>
        </div>
      </div>

      <div role="radiogroup" aria-label="Message" className="flex flex-wrap gap-1.5">
        {OUTREACH_TEMPLATES.map((t) => (
          <button
            key={t.key}
            type="button"
            role="radio"
            aria-checked={t.key === templateKey}
            onClick={() => setTemplateKey(t.key)}
            className={cn(
              "min-h-11 rounded-full border px-3 text-[13px] font-medium transition-colors sm:min-h-8",
              t.key === templateKey
                ? "border-foreground bg-foreground text-background"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <p className="-mt-2 text-[13px] text-muted-foreground">{template.hint}</p>

      <Textarea
        aria-label="Message to send"
        value={draft}
        onChange={(e) => setEdits((prev) => ({ ...prev, [templateKey]: e.target.value }))}
        className="min-h-56 md:text-sm"
      />

      <Button
        size="lg"
        onClick={async () => {
          if (await copyText(draft, "Message")) onCopied()
        }}
      >
        <CopyIcon aria-hidden />
        Copy message
      </Button>

      <div className="grid grid-cols-2 gap-2">
        {cafe.instagram ? (
          <Button variant="outline" asChild>
            <a href={cafe.instagram} target="_blank" rel="noopener noreferrer">
              <InstagramLogoIcon aria-hidden />
              Open Instagram
            </a>
          </Button>
        ) : (
          <Button variant="outline" asChild>
            <a href={igSearch} target="_blank" rel="noopener noreferrer">
              <MagnifyingGlassIcon aria-hidden />
              Find on Instagram
            </a>
          </Button>
        )}
        {cafe.facebook ? (
          <Button variant="outline" asChild>
            <a href={cafe.facebook} target="_blank" rel="noopener noreferrer">
              <FacebookLogoIcon aria-hidden />
              Open Facebook
            </a>
          </Button>
        ) : (
          <Button variant="outline" onClick={() => copyText(link, "Page link")}>
            <LinkSimpleIcon aria-hidden />
            Copy page link
          </Button>
        )}
        <Button variant="ghost" asChild className="col-span-2">
          <a href={link} target="_blank" rel="noopener noreferrer">
            <ArrowSquareOutIcon aria-hidden />
            Check their page before sending
          </a>
        </Button>
      </div>
    </div>
  )
}

type Tab = "todo" | "copied" | "no-photos" | "all"

export function OutreachClient({ cafes, sender }: { cafes: OutreachCafe[]; sender: string }) {
  const isMobile = useIsMobile()
  const [sent, setSent] = useState<Record<string, string>>({})
  const [tab, setTab] = useState<Tab>("todo")
  const [search, setSearch] = useState("")
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => setSent(readSent()), [])

  const query = search.trim().toLowerCase()
  const counts = {
    todo: cafes.filter((c) => !sent[c.id]).length,
    copied: cafes.filter((c) => sent[c.id]).length,
    "no-photos": cafes.filter((c) => c.photo_count === 0).length,
    all: cafes.length,
  }

  const rows = useMemo(
    () =>
      cafes
        .filter((c) =>
          tab === "todo" ? !sent[c.id] : tab === "copied" ? !!sent[c.id] : tab === "no-photos" ? c.photo_count === 0 : true
        )
        .filter((c) => !query || `${c.name} ${c.city} ${c.neighborhood ?? ""}`.toLowerCase().includes(query)),
    [cafes, sent, tab, query]
  )

  // Desktop keeps a café in the composer at all times; phones open it on tap.
  const selected =
    cafes.find((c) => c.id === selectedId) ?? (isMobile ? undefined : rows[0])

  function markCopied(id: string) {
    const next = { ...sent, [id]: new Date().toISOString() }
    setSent(next)
    writeSent(next)
  }

  function unmark(id: string) {
    const next = { ...sent }
    delete next[id]
    setSent(next)
    writeSent(next)
  }

  const composer = selected && (
    <Composer
      key={selected.id}
      cafe={selected}
      sender={sender}
      sentAt={sent[selected.id]}
      onCopied={() => markCopied(selected.id)}
    />
  )

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-6 sm:px-6 sm:py-8">
      <PageHeader
        title="Outreach"
        summary={`${cafes.length} live cafés haven't claimed their page. Pick one, copy the message, send it from Nook's Instagram.`}
      />

      <StatusTabs
        value={tab}
        onChange={(v) => setTab(v as Tab)}
        tabs={[
          { value: "todo", label: "Not messaged", count: counts.todo },
          { value: "copied", label: "Copied", count: counts.copied },
          { value: "no-photos", label: "No photos", count: counts["no-photos"] },
          { value: "all", label: "All", count: counts.all },
        ]}
      />

      <Toolbar>
        <SearchField value={search} onChange={setSearch} placeholder="Search cafés or cities" />
      </Toolbar>

      <div className="grid items-start gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
        <section className="overflow-hidden rounded-xl border bg-card">
          {rows.length === 0 ? (
            <TableEmpty
              icon={PaperPlaneTiltIcon}
              title={tab === "todo" && !query ? "Everyone's been messaged" : "No cafés match"}
              body={tab === "todo" && !query ? "Check the Copied tab for follow-ups." : undefined}
            />
          ) : (
            <ul className="divide-y">
              {rows.map((c) => {
                const active = selected?.id === c.id
                return (
                  <li key={c.id} className="flex items-center">
                    <button
                      type="button"
                      onClick={() => setSelectedId(c.id)}
                      aria-current={active || undefined}
                      className={cn(
                        "flex min-h-14 min-w-0 flex-1 items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-muted/50 sm:px-5",
                        active && "bg-muted"
                      )}
                    >
                      <Thumb src={c.featured_image_url} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{c.name}</span>
                        <span className="block truncate text-[13px] text-muted-foreground">
                          {[c.neighborhood, c.city].filter(Boolean).join(", ")}
                        </span>
                      </span>
                      <span className="flex shrink-0 flex-wrap justify-end gap-1.5">
                        {c.photo_count === 0 && <StatusChip tone="warning">No photos</StatusChip>}
                        {!c.instagram && !c.facebook && <StatusChip tone="neutral">No socials</StatusChip>}
                        {sent[c.id] && <StatusChip tone="success">Copied {shortDate(sent[c.id])}</StatusChip>}
                      </span>
                    </button>
                    {sent[c.id] && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="mr-2"
                        aria-label={`Mark ${c.name} as not messaged`}
                        title="Mark as not messaged"
                        onClick={() => unmark(c.id)}
                      >
                        <CheckIcon aria-hidden />
                      </Button>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        {!isMobile && composer && (
          <aside className="sticky top-4 rounded-xl border bg-card p-5">{composer}</aside>
        )}
      </div>

      {isMobile && (
        <Sheet open={!!selected} onOpenChange={(open) => !open && setSelectedId(null)}>
          <SheetContent side="bottom" className="max-h-[92dvh] gap-0 overflow-y-auto rounded-t-2xl">
            <SheetHeader className="sr-only">
              <SheetTitle>Message {selected?.name}</SheetTitle>
              <SheetDescription>Pick a message, copy it, and send it on Instagram.</SheetDescription>
            </SheetHeader>
            <div className="px-5 pt-6 pb-8">{composer}</div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  )
}
