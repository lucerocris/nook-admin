// Switches for admin features that exist in code but aren't offered right now.
// Flip one back to true to bring the feature back; nothing behind it was
// deleted.
export const FEATURES = {
  // Crawls are run by the community now, not from this portal. The pages,
  // queries and server actions are kept; the nav entry is hidden and the
  // routes return 404 while this is off.
  crawls: false,
} as const
