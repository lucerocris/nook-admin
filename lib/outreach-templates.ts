// DM templates for inviting cafés that are already listed to claim their page.
// Kept in step with nook-marketing/content/outreach/templates.md. Placeholders:
// {cafe} the café's name, {link} its public page, {sender} the admin's first name.

export type OutreachTemplateKey = "added" | "added-no-photos" | "form" | "follow-up"

export type OutreachTemplate = {
  key: OutreachTemplateKey
  label: string
  hint: string
  body: string
}

export const OUTREACH_TEMPLATES: OutreachTemplate[] = [
  {
    key: "added",
    label: "Added by us",
    hint: "We listed them from public info; they don't know yet.",
    body: `Hi {cafe}! 👋 We're Nook, a free app and website that helps people find cafes around Cebu by what they need: WiFi, outlets, study spots and more.

We've added {cafe} to Nook, and your listing is ready for you to claim for free: {link}

Claiming it lets you update your hours, menu, photos and amenities yourself anytime. It only takes a few minutes:
1. Go to business.nookph.app and find {cafe}
2. Create your free account
3. Send us the verification code here and we'll approve it right away

We put the page together from public info, so if you'd rather we fix something for you, just tell us. Salamat! ☕`,
  },
  {
    key: "added-no-photos",
    label: "Added, no photos",
    hint: "Same, but the page has no photos yet, so ask for some.",
    body: `Hi {cafe}! 👋 We're Nook, a free app and website that helps people find cafes around Cebu by what they need: WiFi, outlets, study spots and more.

We've added {cafe} to Nook, and your listing is ready for you to claim for free: {link}

It doesn't have photos yet, so claiming it is the quickest way to show people your space. You can add your own photos and keep your hours and menu up to date anytime:
1. Go to business.nookph.app and find {cafe}
2. Create your free account
3. Send us the verification code here and we'll approve it right away

Or if you'd rather, send us a few photos here (interior, drinks, food) and we'll add them for you. Salamat! ☕`,
  },
  {
    key: "form",
    label: "Google Form",
    hint: "They filled out our onboarding form a while back.",
    body: `Hi {cafe}! 👋 It's {sender} from Nook. Thank you again for filling out our form a while back!

Your page is live here: {link}. Nook is now on both iPhone and Android, so more people around Cebu can find you.

You can now claim your page for free at business.nookph.app and update your hours, menu, photos and amenities yourself anytime. Once you've signed up, just send us the verification code here and we'll approve it right away.

Anything you'd like us to update in the meantime? Salamat kaayo! ☕`,
  },
  {
    key: "follow-up",
    label: "Follow-up",
    hint: "No reply after 3–4 days.",
    body: `Hi again! Just checking if you saw your Nook page: {link}. It's still waiting for you to claim it for free at business.nookph.app. Once you've signed up, send us the verification code here and we'll approve it right away. ☕`,
  },
]

export const PUBLIC_CAFE_URL = "https://www.nookph.app/cafes/"

export function fillTemplate(body: string, values: { cafe: string; link: string; sender: string }) {
  return body
    .replaceAll("{cafe}", values.cafe)
    .replaceAll("{link}", values.link)
    .replaceAll("{sender}", values.sender)
}
