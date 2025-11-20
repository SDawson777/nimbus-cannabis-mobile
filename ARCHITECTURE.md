# Architecture Overview

## High-Level Systems

- **Mobile App (Expo/React Native)**: Frontend client that communicates with the backend via REST under `/api/v1`. Uses Expo SDK 50, Tailwind, and native modules for push notifications.
- **Backend (Node 20, Express, Prisma)**: Located in `backend/`. Provides REST APIs, authentication, caching, and integrations with external services (Stripe, Firebase, OpenAI, weather APIs).
- **Database (PostgreSQL via Prisma)**: Stores users, orders, products, loyalty data, etc. Prisma client is generated from `backend/prisma/schema.prisma`.
- **Cache Layer (Redis via cacheService)**: Optional but highly recommended. Used for rate limits, product listings, recommendations, weather data, push backoff windows.
- **Firebase Admin**: Used for push notifications and ID token verification.
- **Stripe**: Handles payment sheet setup.
- **OpenAI / Weather APIs**: Provide concierge responses and weather-driven recommendations.

## Backend Structure

```
backend/
  src/
    app.ts           -> Express app wiring
    env.ts           -> zod-based env validation
    middleware/      -> security, auth, rate-limit, validation
    routes/          -> per-feature routers (auth, products, concierge,...)
    services/        -> cacheService, pushService, weatherProvider, etc
    modules/orders/  -> order-specific orchestration
```

- `app.ts` loads env, applies security middleware (`helmet`, `cors`, sanitizers), registers routers under `/api` and `/api/v1`, and exposes `/health`/`/ready` probes.
- `middleware/security.ts` enforces HTTP headers, body size limits, sanitization, suspicious activity logging.
- `middleware/rateLimit.ts` offers Redis-aware throttling configurable via `RATE_LIMIT_*` env vars.
- `middleware/validation.ts` provides drop-in Zod validation for request bodies or query params.

## Request Lifecycle

1. Request hits Express, gets sanitized and logged with correlation ID.
2. Rate limiting (route-specific) and authentication middleware guard protected endpoints.
3. Router handlers call Prisma or services; caching utilities reduce load on DB/external APIs.
4. Responses are wrapped with correlation IDs and consistent error shapes.
5. Global error handler logs exceptions and returns `500 { error: 'internal_error', correlationId }`.

## Integrations

- **Stripe**: `routes/stripe.ts` lazily initializes the SDK and requires `STRIPE_SECRET_KEY`.
- **Firebase**: `firebaseAdmin.ts` bootstraps admin SDK once; `pushService.ts` uses it for notifications.
- **OpenAI**: `routes/concierge.ts` uses the official client with timeout/backoff + cached degradation strategy.
- **Weather APIs**: `services/weatherProvider.ts` fetches remote data with caching/timeout fallbacks and feeds recommendations.

## Deployment Considerations

- Ensure `backend/.env` includes all required secrets. Server fails fast during startup if env validation fails.
- Redis strongly recommended for production to back rate limiting, caching, and push token backoff.
- Prisma migrations managed via `npm run migrate`. Build process: `npm run build` (tsc + tsc-alias), then `node dist/index.js`.
- Mobile app configuration via Expo needs API base URL (`EXPO_PUBLIC_API_BASE_URL`) and matching environment settings.
