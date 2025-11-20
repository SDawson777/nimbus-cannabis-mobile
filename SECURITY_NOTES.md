# Security Notes

_Last reviewed: January 2025 — Next review due: April 2025_

## 1. Threat Model Snapshot

| Layer              | Primary Risks                                     | Mitigations                                                                                                                                               |
| ------------------ | ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Authentication** | Credential stuffing, JWT forgery                  | Strong `JWT_SECRET` enforcement (`backend/src/env.ts`), rate-limited `/auth/*`, Firebase token verification, password hashing via bcrypt.                 |
| **API Surface**    | Injection, schema drift, abuse                    | Zod-powered validation middleware, consistent error handler, Redis-backed rate limiting, sanitizer middleware, `x-correlation-id` tracing.                |
| **Data**           | PII exposure, weak access controls                | Prisma access scoped to authenticated user ID, least-privilege role checks, encrypted transport (HTTPS everywhere), database snapshots encrypted at rest. |
| **Integrations**   | Stripe or OpenAI secret leakage, webhook spoofing | Secrets isolated per env, Stripe webhook signature verification, OpenAI + Weather timeouts with degradation cache.                                        |
| **Mobile App**     | Reverse engineering, config leaks                 | Expo secure store for tokens, no secrets baked into bundle (only public keys), feature flags & API URLs provided via env.                                 |

## 2. Credential & Secrets Management

- `.env.example` (root + backend) document **all** required secrets. Real values must live in platform secret stores (Railway, EAS, Vercel) — never commit `.env`.
- Rotate high-value credentials quarterly or after any incident: `JWT_SECRET`, `STRIPE_*`, Firebase Admin private key, `OPENAI_API_KEY`.
- Firebase service account JSON is base64 encoded (`FIREBASE_PRIVATE_KEY_B64`) and decoded at runtime to avoid multiline parsing bugs.
- For local development, run `node backend/test-env-validation.js` to catch missing/weak secrets before boot.

## 3. Dependency & Supply-Chain Security

- `npm audit --audit-level=moderate --production` runs in CI; failing advisories block merges.
- Critical packages (Express, Prisma, Firebase Admin, Stripe, Expo SDK) are pinned; upgrades require changelog review + smoke tests.
- Custom overrides in `package.json` patch known transitive CVEs. Removing overrides requires confirming upstream releases.
- Use `npm install --ignore-scripts` when inspecting third-party packages locally to avoid post-install surprises.

## 4. Service Hardening Highlights

- **Rate limiting**: `backend/src/middleware/rateLimit.ts` centralizes IP + user throttles for auth, concierge, weather, Stripe, and push routes. Redis counters persist across pods.
- **Input validation**: `middleware/validation.ts` wraps Zod schemas ensuring payloads are sanitized and typed before hitting business logic.
- **Caching & backoff**: `cacheService` isolates hot data; `pushService.sendWithBackoff` quarantines failing tokens to avoid notification storms.
- **Timeouts**: `EXTERNAL_API_TIMEOUT_MS` ensures upstream calls (OpenAI, weather) fail fast, preventing thread exhaustion.
- **Security headers**: `middleware/security.ts` applies Helmet, CORS, body limits, and sanitizer middleware by default.

## 5. Monitoring & Incident Response Hooks

- **Sentry** captures both mobile and backend exceptions; include `correlationId` to stitch logs together.
- **Audit logging**: Authentication attempts, award redemptions, and Stripe webhook events emit structured logs with user IDs.
- **Alert thresholds** (documented in `PRODUCTION_READINESS.md`) fire for auth failures, cache miss spikes, and concierge fallback spikes.
- During incidents: capture timeline, impacted user IDs, secrets touched, and remediation steps in `docs/audit.md` (create if missing).

## 6. Penetration Testing & Reviews

- Latest internal pen test: December 2024 (focus on auth, push service, webhook spoofing). No critical findings; medium findings addressed in Phase 0–3 hardening.
- Schedule next external assessment before major feature launches or annually, whichever comes first.

## 7. Developer Responsibilities

- Never run `npm audit fix --force` without review; prefer surgical upgrades with PR notes linking advisories.
- Require code owners for changes touching `backend/src/middleware`, `backend/src/services/pushService.ts`, secrets handling, or auth modules.
- Enforce branch protection: passing CI + one approval required for `main`.
- Use `git-crypt` or secure vault for sharing real secrets outside CI; avoid messaging apps.

Staying aligned with these controls keeps the JARS platform within tolerance for the buyer handoff and future audits.
