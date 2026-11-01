# HealthMaths

HealthMaths is a clinical calculation reference for healthcare professionals, students, and anyone learning how common healthcare formulas work. It helps users find a calculator, enter values with unit conversion, and review the equation and worked steps behind each result.

## Features

- Search and browse formulas by **body system** or **department**
- Formatted equations, readable calculation steps, sources, limitations, and notes
- Unit-aware inputs and outputs
- Local **Used** and calculation **History** lists
- A **What's New** feed for future formula releases, fixes, and app updates
- Physiotherapy measures including TUG, six-minute walk distance, gait speed, chair stand, and percentage change
- Obstetric dating including estimated due date and gestational age from LMP
- NEWS2, Winter’s formula, and corrected sodium in hyperglycaemia
- Installable, offline-capable PWA
- Optional feedback form that queues a user-submitted message while offline
- Light and dark themes

There are no accounts, school profiles, shared usage statistics, or formula-use analytics. Calculations, history, and Used counts stay in the browser on the user’s device. Feedback is sent only when the user chooses to submit it.

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
- Installing the app enables offline use after the app has been loaded. The service worker checks for updates when the app is opened, resumed, or brought back online.
- Feedback messages may be queued locally while offline and are sent after connectivity returns.

IndexedDB is not used as a special iOS persistence safeguard. Safari/WebKit manages IndexedDB as origin storage too, and browser-managed storage can still be evicted. See [MDN’s storage eviction overview](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria) and [WebKit’s storage policy](https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/).

## Formula catalog and clinical use

The same calculator may be relevant to more than one department. For example, the paediatric 4–2–1 maintenance-fluid estimate is listed under both Paediatrics and Surgery. Cardiovascular calculators are grouped under the Cardiovascular body system rather than separate ECG, echo, haemodynamics, risk-score, and lipid categories.

The catalogue includes NEWS2, Winter’s formula, and a corrected-sodium estimate for hyperglycaemia. NEWS2 is based on the [Royal College of Physicians’ NEWS2 resources](https://www.rcp.ac.uk/resources/national-early-warning-score-news-2/); corrected sodium uses the coefficient reviewed by [Tzamaloukas et al.](https://pmc.ncbi.nlm.nih.gov/articles/PMC7479837/). Each calculator includes its source and relevant limitations. Use local protocols and clinical judgement; scores and estimates do not replace assessment or treatment guidance.

To publish a What's New message, add a new uniquely identified entry to `lib/whats-new.ts`. Unread entries show a badge until read; users can mark all visible entries as read or dismiss them on their device.

Pharmacology dosing calculators are not included in the launch catalogue.

## Testing

The project uses Vitest to validate formula logic, unit conversions, and registry integrity. Add or update worked examples in `tests/formulas.test.ts` when changing the formula library.

```bash
npm test
```
