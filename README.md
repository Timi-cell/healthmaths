# HealthMaths

HealthMaths v1.0 is a clinical calculator app. It helps clinicians, students, and curious users quickly compute values, review the calculation steps, and keep a local history of recent work without creating an account.

## Overview

The app is built with Next.js (App Router), TypeScript, and Tailwind CSS. It provides a searchable catalog of formulas grouped by body system, each with:

- clear input fields and unit handling
- step-by-step calculation explanations
- result interpretation and thresholds
- search, filtering, and recent usage tracking
- offline-first data persistence and installable PWA behavior

## Features

- Searchable formula library across body systems
- Unit-aware inputs and conversions
- Formula-by-formula explanations and result notes
- Local history and “Used” tracking saved on the device
- Mobile-first responsive interface with desktop support
- Installable app experience and offline support via service worker
- Optional feedback form that queues offline submissions until connectivity returns

## Tech stack

- Next.js 15
- React 19
- TypeScript
- Tailwind CSS v4
- Vitest for testing

## Getting started

### Prerequisites

- Node.js 18+ (recommended: current LTS)
- npm

### Install dependencies

```bash
npm install
```

### Run the app locally

```bash
npm run dev
```

Then open http://localhost:3000

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

The app includes an example environment file:

```bash
cp .env.example .env.local
```


## Project structure

```text
app/                 Application routes and entry points
components/         UI components and calculator views
lib/                Formula registry, unit logic, local storage, feedback queue
public/             Static assets served by the app
scripts/            Build and asset generation utilities
sw/                  Service worker template source
tests/               Automated tests for formulas and logic
```

Key implementation files:

- `lib/formulas.ts` — formula registry and clinical calculators
- `lib/units.ts` — unit tables and conversion helpers
- `components/App.tsx` — primary app shell and state orchestration
- `components/Calculator.tsx` — calculator UI and result renderer
- `sw/sw.template.js` — service worker source; generated output lives in `public/sw.js`

## Offline-first behavior

HealthMaths is designed for a lightweight offline experience:

- calculation history and usage data are stored locally in the browser
- the app can install as a PWA and work without a network connection after the first load
- each calculator can be opened directly with its `/?f=<formula-id>` link; the app checks for service-worker updates when opened, resumed, or brought back online and offers an in-app update action
- the welcome screen appears on a browser's first visit and each time the installed app is launched
- feedback submissions are queued locally and sent when connectivity returns
- service worker assets are generated automatically during build and dev startup via `scripts/build-sw.mjs`

## Testing

The project uses Vitest to validate formula logic, unit conversions, and registry integrity.

```bash
npm test
```

When adding a new formula, add or update a worked example in `tests/formulas.test.ts` to keep the formula library verified.

## Notes

This project is a clinical calculation utility and should be used as a decision-support tool. Always verify formula assumptions and clinical context before relying on outputs in practice.
