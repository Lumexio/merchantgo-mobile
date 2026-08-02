# Copilot instructions

- This is a React/TypeScript/Vite shared-tablet client packaged with Capacitor 8.
- Preserve PIN entry, short-lived staff context, confirm-order submission, and
  immediate return to the locked station.
- Route remote calls through `src/api/cloudClient.ts`; server authorization is authoritative.
- Avoid editing generated `dist/`, Gradle caches, or Capacitor plugin output.
- Run `npm run lint` and `npm run build`; sync/build Android only for native changes.

## Maintenance matrix

| When changing | Also update or verify |
| --- | --- |
| PIN or shared-device session | `PinKeypad`, app state, timeout/logout/reset, backend auth, tenant/branch context, and privacy on device handoff |
| Order builder or modifiers | `OrderBuilderScreen`, `ModifierModal`, totals/currency, API payload, confirm/reset behavior, backend, and cashier clients |
| API route or payload | `src/api/cloudClient.ts`, TypeScript state, loading/error/retry UI, backend contract, and desktop/web parity |
| Navigation or layout | App shell, tablet portrait/landscape behavior, touch targets, keyboard/accessibility behavior, and screenshots |
| Capacitor or Android config | `capacitor.config.ts`, Android manifest/Gradle, `npx cap sync android`, permissions, release workflow, and device smoke test |
| Environment or API domain | Vite variables, cloud client, build, release workflow, backend CORS, and connectivity checks |
| Dependency or Node/Java version | Manifest, lockfile, Capacitor/Gradle compatibility, Copilot setup, release workflow, lint, and build |
