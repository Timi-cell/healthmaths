export type WhatsNewEntry = {
  id: string;
  title: string;
  body: string[];
  date?: string;
};

// Add a new, never-reused ID here before deploying a release with news.
// The What's New indicator stays visible until each user clears all updates.
export const WHATS_NEW: WhatsNewEntry[] = [];
