export type WhatsNewEntry = {
  id: string;
  title: string;
  body: string[];
  date?: string;
};

// Add a uniquely identified entry here when a release has news to share.
export const WHATS_NEW: WhatsNewEntry[] = [];
