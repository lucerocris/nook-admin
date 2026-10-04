import type { Metadata } from "next"
import { getOutreachCafes } from "@/lib/queries/outreach"
import { createClient } from "@/lib/supabase/server"
import { OutreachClient } from "@/components/admin/outreach-client"

export const metadata: Metadata = { title: "Outreach" }
export const dynamic = "force-dynamic"

// Unclaimed cafés with a ready-to-send claim invite each. The queue is small
// (tens of rows), so it all loads at once and the client filters it.
export default async function OutreachPage() {
  const supabase = await createClient()
  const [cafes, { data: { user } }] = await Promise.all([
    getOutreachCafes(),
    supabase.auth.getUser(),
  ])
  const fullName = (user?.user_metadata?.full_name as string | undefined)?.trim()
  const sender = fullName ? fullName.split(/\s+/)[0] : "the Nook team"

  return <OutreachClient cafes={cafes} sender={sender} />
}
