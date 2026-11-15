# HealthMaths

HealthMaths is a clinical calculation reference for healthcare professionals, students, and anyone learning how common healthcare formulas work. It helps users find a calculator, enter values with unit conversion, and review the equation and worked steps behind each result.

## Features

- Search and browse formulas by **body system** or **department**
- Formatted equations, readable calculation steps, sources, limitations, and notes
- Unit-aware inputs and outputs
- General drug-dose arithmetic for weight/BSA dosing, dose-to-volume, infusions, pharmacokinetic estimates, and entered dose caps
- Local **Used** and calculation **History** lists
- A **What's New** feed for future formula releases, fixes, and app updates
- An install-to-home-screen prompt after the first formula is opened; **Not now** reminds again after two minutes
- Physiotherapy measures including TUG, six-minute walk distance, gait speed, chair stand, and percentage change
- Obstetric dating including estimated due date and gestational age from LMP
- NEWS2, Winter’s formula, and corrected sodium in hyperglycaemia
- Installable, offline-capable PWA
- Optional feedback form that queues a user-submitted message while offline
- Light and dark themes with a reduced-motion-aware color transition
- Sticky search and connectivity indicator

There is no sign-in or cloud profile. Users may save a username, email, institution, profession/course, and student level in this browser. Profile fields stay local unless the user separately enables profile sharing in the profile form; email is never included. Calculations, history, and Used counts also stay on the user's device. Product analytics are enabled by default for a new visitor after a notice is shown, and can be turned off at any time; previously opted-out users remain opted out. Feedback is sent only when the user chooses to submit it.

## Tech stack

- Next.js 15 (App Router)
- React 19
- TypeScript
- Tailwind CSS v4
- Vitest

## Getting started

### Prerequisites

- Node.js 18+ (current LTS recommended)
- npm

### Install dependencies and run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

### Production build

```bash
npm run build
npm run start
```

## Scripts

```bash
npm run dev      # start the Next.js development server
npm run build    # create a production build
npm run start    # run the production build locally
npm test         # run the test suite
```

## Environment variables

The optional feedback endpoint can use the following server-side variables:

```text
RESEND_API_KEY=
FEEDBACK_TO_EMAIL=
```

## Project structure

```text
app/                 Application routes and entry points
components/          UI components and calculator views
lib/                 Formula registry, unit logic, local storage, feedback queue
public/               Static assets served by the app
scripts/              Build and asset generation utilities
sw/                   Service worker template source
tests/                Automated tests for formulas and logic
```

Key implementation files:

- `lib/formulas.ts` — formula registry, equations, and clinical calculators
- `lib/whats-new.ts` — release notes shown in the What's New popup
- `lib/cardio.ts` — cardiovascular calculator set
- `lib/units.ts` — unit tables and conversion helpers
- `lib/store.ts` — local history and Used data
- `components/App.tsx` — app shell, browse filters, and local state
- `components/Calculator.tsx` — calculator inputs, result, equation, and steps
- `sw/sw.template.js` — service-worker source; generated output lives in `public/sw.js`

## Offline and local data

- History and Used counts are saved in browser `localStorage`; they are not uploaded or backed up. Clearing browser or site data can remove them.
- In-progress calculator values are kept in the current tab's `sessionStorage` so a reload, including an intentional service-worker update reload, can restore the working calculation. They remain on the device and are cleared when the tab's session ends.
- Installing the app enables offline use after the app has been loaded. The service worker checks for updates when the app is opened, resumed, or brought back online.
- Feedback messages may be queued locally while offline and are sent after connectivity returns.

IndexedDB is not used as a special iOS persistence safeguard. Safari/WebKit manages IndexedDB as origin storage too, and browser-managed storage can still be evicted. See [MDN’s storage eviction overview](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria) and [WebKit’s storage policy](https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/).

## Formula catalog and clinical use

The same calculator may be relevant to more than one department. For example, the paediatric 4–2–1 maintenance-fluid estimate is listed under both Paediatrics and Surgery. Cardiovascular calculators are grouped under the Cardiovascular body system rather than separate ECG, echo, haemodynamics, risk-score, and lipid categories.

The catalogue includes NEWS2, Winter’s formula, a corrected-sodium estimate for hyperglycaemia, APRI, Parkland burn-fluid estimation, and additional renal, acid–base, respiratory, obstetric, haematology, endocrine and epidemiology calculators. These include potassium-deficit and free-water estimates, serum osmolality and osmolar gap, qSOFA and CURB-65, Child-Pugh and Apgar scores, paediatric eGFR, urine ACR, HOMA-IR, and eAG. Drug-dose tools cover prescribed weight-based and BSA-based arithmetic, dose-to-volume conversion, weight-based infusion rates, pharmacokinetic loading/maintenance estimates, and an entered paediatric maximum-dose cap. They do not recommend medication-specific doses or regimens; all values and product details must be verified by a qualified clinician against the prescription and local protocol. NEWS2 is based on the [Royal College of Physicians’ NEWS2 resources](https://www.rcp.ac.uk/resources/national-early-warning-score-news-2/); corrected sodium uses the coefficient reviewed by [Tzamaloukas et al.](https://pmc.ncbi.nlm.nih.gov/articles/PMC7479837/). Each calculator includes its source and relevant limitations. Use local protocols and clinical judgement; scores and estimates do not replace assessment or treatment guidance.

To publish a What's New message with a release, edit `lib/whats-new.ts` before deploying and add an entry to `WHATS_NEW`, for example:

```ts
export const WHATS_NEW: WhatsNewEntry[] = [
  {
    id: "2026-11-your-update",
    title: "Your release title",
    body: ["Summarize the new formula, feature, or improvement here."],
    date: "Nov 15, 2026",
  },
];
```

Use a unique ID for every release note and never reuse an old ID. Updates appear as collapsed accordions. Opening one marks it read and leaves an **Opened** check when collapsed; **Read all** marks every visible update read without removing the messages. The pulsing red dot and **NEW** badge appear whenever unread updates remain, including a later release with a new ID. **Clear all** removes every visible update and its accordion. An entry can also provide an action button to open its featured formula.

The current catalogue contains **85 unique formula IDs**: the existing 78 entries plus seven general drug-dose calculation tools. No duplicate IDs were found in the registry, and no existing formulas were removed. The requested 100–150 total and a complete source-by-source clinical revalidation of the entire existing catalogue remain outstanding; formulas should be used with their cited sources, limitations, and local clinical protocols.

The Parkland entry shows the traditional first-24-hour arithmetic estimate and its time split. It is not a fluid order: use a current burn-service protocol and reassessment. APRI includes no universal threshold because interpretation depends on disease and population.

## Optional product analytics

PostHog receives a small, manually selected set of product events. For new visitors analytics are on by default after the first-use privacy notice; users can turn them off from **Privacy choices**. A previously saved opt-out remains off. Events include app opens, formula searches (result counts only), no-result searches, formula views, calculation starts/completions, interpretations, history, feedback submission, install prompts/installs, update availability/application, online/offline transitions, theme/category choices, and profile opens/saves. PostHog autocapture, session recordings, and heatmaps are not enabled. Search text, feedback text, email, calculator inputs, and results are not sent in ordinary events. A random pseudonymous browser ID groups events.

**Keep analytics on** preserves the default. **Turn analytics off** stores the opt-out, stops future events, and clears the local unsent-event queue and random ID. Events already sent to PostHog are not deleted. Non-profile offline events wait on-device, capped at 100 events and seven days, then flush when online.

Profile details are not part of ordinary analytics. In the Profile dialog, a separate unchecked-by-default option lets a user share their username, institution, profession/course, and student level with PostHog on each save. Email is never sent. This requires usage analytics to be on and an internet connection; profile details are not queued offline. Turning off usage analytics or clearing the profile also revokes profile-sharing consent, but cannot delete profile details already sent to PostHog.

To connect PostHog:

1. Sign in at [PostHog](https://posthog.com/) and create or open a HealthMaths project. Choose the correct data region for your organization.
2. In the project settings, copy the **Project API Key** (the public project token, not a personal/private API key) and note the matching ingestion host. PostHog's current cloud hosts are `https://us.i.posthog.com` for US projects and `https://eu.i.posthog.com` for EU projects.
3. Configure both variables in `.env.local` for local development and in your deployment provider's environment settings. The project token can use either variable name below:

```text
NEXT_PUBLIC_POSTHOG_KEY=your_project_api_key
# Or use NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN instead
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

For an EU project use `https://eu.i.posthog.com`. Restart the local dev server after changing `.env.local`; for a deployed site, set the public environment variables in the deployment provider and redeploy so Next.js includes them in its browser bundle. After starting the app, visit **Privacy choices**, confirm the displayed status, and generate activity (for example, open a formula). In PostHog, check the project's events/activity view for events such as `app_opened` or `formula_viewed`. Keep `.env.local` out of source control. The project token is public and shipped in the browser bundle; never use a personal/private API key here. See [PostHog's JavaScript setup](https://posthog.com/docs/libraries/js) for the project key and regional host details. Vercel Analytics is independent and is not changed here.

An X profile link can be enabled by setting `NEXT_PUBLIC_X_URL` to the official profile URL.

### Optional local profile

Choose the profile icon in the header to save a username and, optionally, an email, institution, profession/course of study, and student level. The profile is stored in this browser's local storage; it is not an account or synced to another device. Local storage is not encrypted, so do not save details on a shared device or details you would not want another device user to see. Profile sharing with PostHog is a separate, optional setting in the dialog and excludes email. Use **Clear profile** to remove local profile data and revoke sharing consent. Clearing browser/site data also removes the profile.

The institution selector contains a selected starter list of Nigerian universities with health-sciences programs, not a complete or current accreditation directory. Choose **Other** for an institution not listed. The list should be checked against current official university and regulator information before being treated as comprehensive.

## Testing

The project uses Vitest to validate formula logic, unit conversions, and registry integrity. Add or update worked examples in `tests/formulas.test.ts` when changing the formula library.

```bash
npm test
```
