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

We've added {cafe} to Nook, and here's your page: {link}

We put it together from public info, so if anything's off (hours, menu, photos), just tell us and we'll fix it. Or you can claim your page for free at business.nookph.app and update it yourself anytime. Salamat! ☕`,
  },
  {
    key: "added-no-photos",
    label: "Added, no photos",
    hint: "Same, but the page has no photos yet, so ask for some.",
    body: `Hi {cafe}! 👋 We're Nook, a free app and website that helps people find cafes around Cebu by what they need: WiFi, outlets, study spots and more.

We've added {cafe} to Nook: {link}

Your page doesn't have photos yet. Could you send us a few (interior, drinks, food) so people can see your space? Or you can claim your page for free at business.nookph.app and add them yourself anytime. Salamat! ☕`,
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
    body: `Hi again! Just checking if you saw your Nook page: {link}. Happy to update anything for you, or you can claim it for free at business.nookph.app. ☕`,
  },
]

export const PUBLIC_CAFE_URL = "https://www.nookph.app/cafes/"

export function fillTemplate(body: string, values: { cafe: string; link: string; sender: string }) {
  return body
    .replaceAll("{cafe}", values.cafe)
    .replaceAll("{link}", values.link)
    .replaceAll("{sender}", values.sender)
}
