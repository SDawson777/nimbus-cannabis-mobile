# Production Readiness Guide

_Status: ✅ All hardening phases complete; backend + mobile client are production-ready when following the controls below._

## 1. Operating Environments & Responsibilities

| Environment     | Purpose                                      | Hosting / Tooling                                                                      | Secrets Source                                       | Owner            | Notes                                                                                               |
| --------------- | -------------------------------------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------- | ---------------- | --------------------------------------------------------------------------------------------------- |
| **Local / Dev** | Feature work, smoke testing                  | Node 20 + Expo Go, Postgres via Docker, Redis optional                                 | `.env` & `backend/.env` (copied from `.env.example`) | Individual dev   | Run `./setup.sh` once per machine. Redis strongly recommended to exercise caching and push backoff. |
| **Staging**     | Pre-prod verification with real integrations | Railway/Render (backend), Expo EAS Update channel `staging`, managed Postgres + Redis  | Platform secrets manager                             | Release captain  | Mirrors production env flags, but uses lower rate limits and non-live Stripe keys.                  |
| **Production**  | Customer-facing traffic                      | Railway/DigitalOcean/App Platform backend, Expo Store builds, managed Postgres + Redis | Platform secrets manager + CI (EAS, Vercel)          | Ops lead / Buyer | Requires 24/7 monitoring + on-call rotation. Stripe + Firebase keys must be live values.            |

Required base services per environment:

- **PostgreSQL** (`DATABASE_URL`) – Prisma migrations managed via `npm run prisma:migrate`.
- **Redis** (`REDIS_URL`) – backs caching, rate limiting, concierge degradation, and push token backoff.
- **Firebase Admin** – service account JSON supplied via `FIREBASE_*` env vars, plus platform-specific config files.
- **Stripe** – `STRIPE_SECRET_KEY` backend, `STRIPE_PUBLISHABLE_KEY` mobile.
- **OpenAI & Weather providers** – `OPENAI_API_KEY`, `OPENWEATHER_API_KEY`.
- **Sentry** – DSNs for both mobile and backend clients.

_All new environments must pass the validation script `node backend/test-env-validation.js` before exposure._

## 2. Deployment Workflow (Backend + Mobile)

1. **Code merges**
   - All changes land via PR with green CI: `npm run lint`, `npm run typecheck`, `npm test`, `npm --prefix backend test:ci`, and Detox smoke tests (`npm run test:e2e:smoke`).
   - PR reviewers confirm documentation updates + environment variable diffs.
2. **Backend release**
   - Tag commit and deploy via platform pipeline (Railway/Render). Build command: `npm run build:backend`; start command: `node backend/dist/app.js` (or `start-prod.js`).
   - Run migrations: `npm --prefix backend run prisma:migrate-deploy`.
   - Verify `/api/v1/health` and `/api/v1/ready`.
3. **Mobile release**
   - Bump version in `app.config.ts`.
   - `eas build --platform ios --profile production` and `eas build --platform android --profile production`.
   - Optional OTA: `eas update --channel production` after store builds approved.
4. **Post-deploy verification**
   - Execute `npm run smoke` (API Postman collection) against production base URL.
   - Run concierge, push notification, and Stripe payment sheet flows using seeded staging accounts.
   - Confirm Sentry dashboards receiving events, and that Redis hit rate is healthy (>80% on cached routes).

Rollback plan: redeploy prior backend build + database snapshot, issue EAS update pinned to previous runtime, and revoke problematic Expo updates.

## 3. Observability & Alerting

| Signal                        | Location / Tool                            | Trigger                                                       | Action                                                                       |
| ----------------------------- | ------------------------------------------ | ------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| **Sentry (mobile + backend)** | `SENTRY_DSN` & `SENTRY_SERVER_DSN`         | Error spike > 5/min                                           | On-call investigates stack trace, checks correlationId for backend requests. |
| **Firebase Crashlytics**      | Expo managed builds                        | Crash cluster                                                 | Validate with latest build, roll back OTA if reproducible.                   |
| **Health probes**             | `/api/v1/health`, `/api/v1/ready`          | Probe failure or latency > 1s                                 | Restart service, inspect logs.                                               |
| **Redis metrics**             | Hosting provider dashboard                 | Cache miss > 40% for `products`, `recommendations`, `weather` | Flush + prewarm caches if necessary, validate TTL config.                    |
| **Stripe webhooks**           | `/api/v1/stripe/webhook`                   | Repeated 4XX responses                                        | Check signing secret, ensure webhook secret rotated.                         |
| **Expo push receipts**        | `backend/src/services/pushService.ts` logs | Duplicate errors per token                                    | Tokens disabled automatically; investigate device registration.              |

Log aggregation: ship backend stdout/stderr to hosting provider logs (Railway/Render). Each request includes `x-correlation-id` for traceability.

## 4. Resilience, Backups & Runbooks

### Database & Cache

- Nightly PostgreSQL snapshots retained for 30 days. Manual backup command: `pg_dump $DATABASE_URL > backup-$(date +%F).sql`.
- Redis is ephemeral; rely on deterministic rebuild (product catalog cached via `cacheService.primeProducts`).

### Authentication

- JWT secret rotation: update `JWT_SECRET`, redeploy backend, trigger mobile logout to rehydrate sessions.
- Firebase credential rotation: upload new private key to secret store and redeploy; `firebaseAdmin.ts` fail-fast ensures startup safety.

### Push Notifications

- Token registration handled via `pushService.registerToken` (called from profile + login flows). If Firebase outage occurs, `pushService.sendWithBackoff` automatically retries up to 3 times, then expires token.
- Manual resend: POST to `/api/v1/internal/push/test` (internal route) with `userId` + `message`.

### Concierge / External APIs

- `EXTERNAL_API_TIMEOUT_MS` enforces upstream SLAs (default 3500ms). If OpenAI or weather providers fail, concierge stores degrade using cached recommendations and returns `isFallback: true`.
- To disable concierge temporarily, set `CONCIERGE_DISABLED=true` and redeploy (route returns `503 concierge_unavailable`).

### Stripe Payments

- Webhooks verified via `STRIPE_WEBHOOK_SECRET`. If webhook delivery fails, replay events from Stripe dashboard once backend health is restored.

### Incident Response

1. Page on-call (Slack `#alerts` + SMS).
2. Capture correlation IDs involved.
3. Check logs + Sentry to isolate failing module.
4. Rollback or feature-flag disable using env toggles:
   - `PUSH_NOTIFICATIONS_DISABLED`
   - `RECOMMENDATIONS_CACHE_TTL_OVERRIDE`
   - `CONCIERGE_DISABLED`
5. Document root cause + mitigation in `docs/audit.md`.

## 5. Testing & Quality Gates

| Stage                      | Command                                              | Purpose                                                     |
| -------------------------- | ---------------------------------------------------- | ----------------------------------------------------------- |
| Static analysis            | `npm run lint`                                       | ESLint / TypeScript across monorepo.                        |
| Type safety                | `npm run typecheck`                                  | React Native + backend TS compilation (tsc).                |
| Frontend unit tests        | `npm test`                                           | Jest 29 + Testing Library suites (`src/__tests__`).         |
| Backend unit/integration   | `npm --prefix backend run test:ci`                   | Covers Prisma-backed routes, auth, concierge, Stripe, push. |
| API smoke tests            | `npm run smoke`                                      | Postman collection hitting `/api/v1`.                       |
| Detox smoke                | `npm run test:e2e:smoke`                             | Happy-path cart + checkout flow on Android emulator.        |
| Release build verification | `eas build --profile preview --platform ios/android` | Ensures EAS artifacts compile before promoting to prod.     |

CI must run the first four gates on every PR. Full suite (smoke, Detox, store builds) required for release tags.

## 6. Access & Secrets Management

- Secrets live exclusively in platform managers (Railway Variables, EAS Secrets, Vercel Environment Variables). Never commit `.env` files with real values.
- Rotate keys quarterly or immediately after incidents. Document rotations in `docs/security-log.md` (create if missing).
- GitHub Actions uses OpenID Connect → cloud provider roles; no long-lived deploy keys stored in repo.
- Grant least-privilege RBAC access: Stripe read-only for most devs, write for release captains only.

## 7. Handoff Checklist

1. ✅ Confirm `ARCHITECTURE.md`, `PRODUCTION_DEPLOYMENT.md`, `API_CONTRACT.md`, and `SECURITY_NOTES.md` are up to date.
2. ✅ Verify `.env.example` files include every required env var and descriptions.
3. ✅ Provide buyer with:
   - Access to GitHub, Expo, Stripe, Firebase, hosting providers.
   - Database + Redis credentials.
   - Sentry + analytics dashboards.
4. ✅ Run through onboarding script in README (local setup, Expo login, backend start).
5. ✅ Share incident runbooks (Section 4) and escalation contacts.
6. ✅ Transfer ownership of mobile signing certificates and push keys via secure channel.

Maintaining this checklist across releases ensures a repeatable, high-confidence production posture.
