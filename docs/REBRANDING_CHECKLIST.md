# Nimbus Cannabis OS – Rebranding Checklist

Use this checklist when rebranding the mobile app for a new tenant.

## 1. Assets & Visual Identity

- [ ] Replace Nimbus icon at `assets/nimbus/nimbus-icon.png`.
- [ ] Replace Nimbus splash at `assets/nimbus/nimbus-splash.png`.
- [ ] Replace Nimbus logos at:
  - `assets/nimbus/nimbus-logo.png`
  - `assets/nimbus/nimbus-logo-dark.png`
- [ ] Update onboarding artwork:
  - `assets/nimbus/onboarding-1.png`
  - `assets/nimbus/onboarding-2.png`
  - `assets/nimbus/onboarding-3.png`
- [ ] Move any previous tenant/Jars‑specific assets to `assets/legacy/`.

## 2. Core App Metadata

- [ ] `app.config.ts`:
  - [ ] `name` set to new brand (e.g., `TenantX Cannabis`).
  - [ ] `slug` set to new slug (e.g., `tenantx-cannabis-mobile`).
  - [ ] `scheme` updated (e.g., `tenantx`).
  - [ ] `ios.bundleIdentifier` updated.
  - [ ] `android.package` updated.
  - [ ] `splash.image` points to `./assets/nimbus/nimbus-splash.png` or tenant asset.
  - [ ] Icon configuration points to `./assets/nimbus/nimbus-icon.png` or tenant icon.

## 3. Deep Links & Schemes

- [ ] In `app.config.ts` `linking.prefixes`:
  - [ ] Update custom scheme prefix (e.g., `tenantx://`).
  - [ ] Update HTTPS prefixes to new domain (e.g., `https://tenantx.app/`).
- [ ] In `app.config.ts` and `src/navigation/linking.ts`:
  - [ ] Verify all screens under `linking.config.screens` map to correct paths.
  - [ ] Preserve legacy paths where possible; add aliases when changing.

## 4. Copy & UX Text

Front‑of‑house copy (safe to change):

- [ ] Onboarding headlines and subtitles.
- [ ] Auth screens (login, signup, forgot password) marketing copy.
- [ ] Home hero section titles and CTAs.
- [ ] Empty states, badges, and section titles for:
  - Deals / promotions
  - My Stash (formerly My Jars)
  - Insights (formerly Jars Insights)
  - Awards (use "Platform Awards" by default)
- [ ] Concierge chat hints, quick prompts, and safety language (ensure platform‑neutral wording).
- [ ] Legal screens (terms, privacy) headers and descriptive copy referencing the old brand.

Back‑of‑house identifiers (change with care):

- [ ] AsyncStorage prefixes: `"@nimbus"` (or tenant‑specific) instead of any legacy `"@jars"` keys.
- [ ] Global accessibility/storage keys: `NIMBUS_A11Y` / `nimbus_a11y_prefs` (or tenant‑namespaced).
- [ ] Global window namespaces: `window.NIMBUS_*` or tenant‑specific.

## 5. Backend & CMS

- [ ] Update backend environment variables in `.env` / deployment config.
- [ ] Confirm `backend/openapi.yaml` contract is still valid for the tenant.
- [ ] Update support/contact emails (e.g., `support@nimbus.app`, `api-support@nimbus.app`).
- [ ] Regenerate any demo or seed data to match tenant naming.

## 6. Native Project Renaming

Android:

- [ ] `android/settings.gradle` `rootProject.name` matches new slug.
- [ ] `android/app/src/main/res/values/strings.xml` `app_name` updated.
- [ ] Adaptive icons in `android/app/src/main/res/mipmap-*` updated.

iOS:

- [ ] Xcode project and scheme renamed from legacy name to new brand.
- [ ] `CFBundleDisplayName` updated in `ios/*/Info.plist`.
- [ ] URL schemes updated in `Info.plist` (`CFBundleURLTypes`).
- [ ] Launch screen storyboard branding updated.

## 7. Documentation & Marketing

- [ ] Update `README.md` to use new app name, screenshots, and description.
- [ ] Update deployment docs (`DEPLOYMENT.md`, production readiness files) to reference new brand.
- [ ] Update CI/CD messaging and notifications (e.g., GitHub Actions summaries, Slack messages).

## 8. Validation

- [ ] Run local checks:
  - [ ] `npm run lint`
  - [ ] `npm run typecheck`
  - [ ] `npm test`
- [ ] Build with EAS:
  - [ ] `eas build -p ios --profile development`
  - [ ] `eas build -p android --profile development`
- [ ] Manual QA:
  - [ ] Splash, icons, and primary screens show new branding only.
  - [ ] Deep links respond to the new scheme and domain.
  - [ ] Navigation, checkout, concierge, awards, profile, and journal flows work end‑to‑end.
