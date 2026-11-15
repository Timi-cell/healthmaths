export type WhatsNewEntry = {
  id: string;
  title: string;
  body: string[];
  date?: string;
  action?: { label: string; formulaId: string };
};

// Add a new, never-reused ID here before deploying a release with news.
// The What's New indicator stays visible until each user clears all updates.
export const WHATS_NEW: WhatsNewEntry[] = [
  {
    id: "2026-11-drug-dosage-calculations",
    title: "Drug dosage calculations",
    body: [
      "Explore weight-based, body-surface-area, dose-to-volume, infusion, loading and maintenance, and capped paediatric dose calculations.",
      "Verify every value, unit, dose limit, and protocol with a qualified clinician.",
    ],
    date: "Nov 15, 2026",
    action: { label: "Check it out", formulaId: "dose-weight" },
  },
];
