# MerchantGo Mobile Agent Guide

## Purpose and structure

This React 19/TypeScript/Vite application is packaged with Capacitor for shared
Android waiter and bartender stations. `src/screens/` owns station workflows,
`src/components/` owns the PIN and modifier UI, `src/api/cloudClient.ts` owns
remote calls, and `android/` is the native project.

## Commands

```bash
npm ci
npm run dev
npm run lint
npm run build
npx cap sync android
```

Run Gradle or native release builds only when native configuration changes.

## Rules

- Preserve the confirm-order auto-lock and shared-device privacy model.
- Treat client PIN, role, tenant, and branch checks as UX; enforce them in the backend.
- Keep touch targets, tablet layouts, intermittent-network errors, and safe retries usable.
- Do not hand-edit generated Capacitor output unless the native project owns the file.
- Keep order/modifier payloads aligned with backend and cashier clients.

## Maintenance cascade

Order changes require screen/component state, API payloads, totals, lock/reset
behavior, backend contracts, desktop/web parity, and tests. Native changes also
require Capacitor config, Android manifest/Gradle, sync, release workflow, and
device verification.
