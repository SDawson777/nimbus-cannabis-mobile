# Nimbus Cannabis OS Mobile

[![CI](https://github.com/SDawson777/nimbus-cannabis-mobile/actions/workflows/ci.yml/badge.svg)](https://github.com/SDawson777/nimbus-cannabis-mobile/actions)

A premium white-label React Native mobile platform for cannabis retailers, designed to deliver an award-winning, legally compliant, and highly personalized cannabis shopping experience.

## 📱 Features (MVP)

- 🌿 Age Verification (21+ Compliance)
- 📍 Store Locator & Selection
- 🛒 Shop & Browse with Filters
- 📦 Product Detail Pages
- 🗂️ Add to Cart & Seamless Checkout
- ✅ "Pay at Pickup" Flow (MVP)
- 👤 User Account & Order History
- 📌 Legal & Support Screens

## ⚡ Tech Stack

- React Native (Expo SDK 50)
- TypeScript
- Tailwind CSS (via NativeWind)
- React Navigation
- Firebase (Auth, Firestore, Analytics)
- Secure Storage (react-native-keychain)
- GitHub Actions (CI/CD)

## 🌟 Design Philosophy

- "Cultivated Clarity" – Clean, premium, accessible UI
- "The Digital Terpene" – Personalized recommendations engine
- Age gating, geofencing, and full legal compliance
- Award-winning user experience with advanced haptics, animations, and accessibility

## 🧭 Buyer Onboarding Playbook

1. **Account & Access handoff**
   - Ensure invites have been accepted for GitHub, Expo, Firebase, Stripe, Sentry, hosting (Railway/Render), and analytics dashboards.
   - Store production secrets exclusively in the platform secret managers; reference the canonical list in `.env.example` and `backend/.env.example`.
2. **Local environment setup (≈10 minutes)**
   - Install Node 20 LTS (`nvm use 20.18`) and run `./setup.sh` to install root + backend dependencies, generate Prisma client, and verify toolchains.
   - Copy env templates: `cp .env.example .env` and `cp backend/.env.example backend/.env`, then fill in API URLs, Firebase keys, and Stripe sandbox credentials.
   - Optional but recommended: start Redis locally (Docker compose) to exercise rate limiting, caching, and push backoff logic.
3. **Running the stack**
   - Backend: `npm run dev:backend` (or `npm --prefix backend run dev`) boots Express on `http://localhost:3000` with health probes at `/api/v1/health` and `/api/v1/ready`.
   - Mobile: `npm run start` (Expo) for the dev menu, or `npm run ios` / `npm run android` for platform targets. Point `EXPO_PUBLIC_API_BASE_URL` to your backend URL.
4. **Quality gates before merging/deploying**
   - `npm run lint`, `npm run typecheck`, `npm test`, `npm --prefix backend run test:ci`, and `npm run smoke` (Postman collection) must all pass.
   - For release tags, also run `npm run test:e2e:smoke` (Detox) and build store binaries via `eas build --profile production --platform ios|android`.
5. **Deployment quick reference**
   - Backend release workflow + rollbacks live in `PRODUCTION_READINESS.md` and `PRODUCTION_DEPLOYMENT.md`.
   - Mobile release checklist (version bumps, OTA strategy, store submission) also described there.
6. **Documentation map**
   - `ARCHITECTURE.md`: systems overview and request lifecycle.
   - `API_CONTRACT.md`: high-level endpoint catalog linked to `backend/openapi.yaml`.
   - `SECURITY_NOTES.md`: current threat model + rotation policies.
   - `docs/` directory: historical audits, QA guides, and per-feature implementation notes.

Completing the steps above gives buyers a fully reproducible environment and clear launch path.

## 🚀 One-Click Deployment

Get the complete backend running with Docker Compose:

```bash
# Clone repository
git clone https://github.com/SDawson777/jars-cannabis-mobile-app.git
cd nimbus-cannabis-mobile

# Configure environment
cp .env.docker.example .env

# Start everything (PostgreSQL + Redis + Backend API)
docker-compose up
```

**Backend available at**: `http://localhost:3000`  
**Full instructions**: See [DEPLOYMENT.md](DEPLOYMENT.md)

Nimbus Cannabis OS Mobile

A complete, white-label mobile commerce platform for cannabis retail—Expo/React Native front-end with a modern Express/TypeScript backend. All core e-commerce, user, and content features built in. Production-ready. Easy to deploy. Fully customizable.

🚀 Features

Modern Expo/React Native mobile frontend (iOS, Android, Web)

Fully-documented Node.js/Express/Prisma backend API (TypeScript)

Auth, product catalog, cart, checkout, orders, user/account management

Community, education, and content modules

Dynamic theming, haptics, animations, accessibility, awards

Sentry error monitoring (just add your DSN)

End-to-end code quality: ESLint, Prettier, Husky, lint-staged, GitHub Actions CI

Cloud deploy ready (Railway, Render)

Fast local setup and test

## 📋 Requirements

- **Node.js**: 20.x - 25.x (tested with 25.1.0, CI uses 20.19.4)
- **Package Manager**: Yarn (primary), npm supported in CI
- **Java**: OpenJDK 17+ (required for Android development)
- **Memory**: 8GB+ recommended for dependency installation
- **Mobile Development**: Expo CLI, Android Studio (for emulator), Xcode (for iOS)

## 🏗️ Monorepo Structure

This project uses a monorepo structure with flexible package management:

- **Root App** (React Native/Expo): Uses `yarn.lock` for dependency management
- **Backend** (Node.js/Express): Uses `package-lock.json` for backend-specific dependencies
- **Dual Package Manager Support**: Yarn for development, npm for CI/CD
- **Node.js Compatibility**: Resolved via `resolutions` field for superstatic package

### CI/CD Pipeline Overview

- **Dual npm ci Installs**: Root and backend dependencies installed separately for optimal caching
- **Cache Strategy**: Keyed to `npm-shrinkwrap.json` for deterministic root installs
- **Memory Optimization**: `NODE_OPTIONS=--max-old-space-size=4096` for large dependency trees
- **Quality Gates**: Lint, TypeScript, format checks, comprehensive test suites
- **EAS Preview Builds**: Automated Android APK and iOS Simulator builds on push/PR
- **Firebase Test Lab**: Automated Robo testing for Android preview builds (when secrets available)
- **Appetize.io**: Automated iOS simulator upload for shareable preview links
- **Fork-Safe**: All secret-dependent steps skip gracefully for external contributors

#### Secrets needed for the e2e smoke workflow

- `EXPO_TOKEN` is required for the Expo/EAS build step.
- `GCP_PROJECT_ID` **and** `GCP_SA_KEY_JSON` unlock the Firebase Test Lab Robo run. Without them, the workflow falls back to a slower ARM emulator + Detox path.
- Details live in `docs/ci.md` for quick reference.

**Installation Commands:**

```bash
# Install all dependencies (root + backend) - Recommended
yarn install --ignore-engines        # Root dependencies (handles Node.js compatibility)
cd backend && npm ci                 # Backend dependencies (uses package-lock.json)

# Alternative: Use install script
npm run install:all                  # Automated installation (both root and backend)

# Node.js Compatibility Note:
# Use --ignore-engines flag with Yarn to handle superstatic/Node.js 25+ compatibility
# CI environment (Node 20.19.4) works without this flag via resolutions field
```

⚡️ Quickstart

1. Clone the repository

```bash
git clone https://github.com/SDawson777/jars-cannabis-mobile-app.git
cd nimbus-cannabis-mobile
```

2. Install Node.js and dependencies

```bash
# Install Node.js 20.x - 25.x (any version in this range works)
# For development with Node 25+, use --ignore-engines flag:
yarn install --ignore-engines

# Install backend dependencies
cd backend && npm ci

# Return to root
cd ..
```

3. Setup Android Development (if needed)

```bash
# Install Java 17
brew install openjdk@17

# Set up Android environment variables
export JAVA_HOME=/opt/homebrew/opt/openjdk@17
export ANDROID_HOME=~/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools

# Add to your shell profile for persistence
echo 'export JAVA_HOME=/opt/homebrew/opt/openjdk@17' >> ~/.bash_profile
echo 'export ANDROID_HOME=~/Library/Android/sdk' >> ~/.bash_profile
echo 'export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools' >> ~/.bash_profile
```

4. Setup the backend

```bash
cd backend
cp .env.example .env # Add your SENTRY_DSN, etc. (see /backend/.env.example and below)
npm run build
npm run dev # Runs backend API at http://localhost:3000
```

5. Setup and run the mobile app

```bash
cd ..
yarn start # Open Expo dev menu (QR code for device/simulator/web)

# Or run specific platforms:
yarn run ios      # iOS simulator
yarn run android  # Android emulator (requires Android SDK setup)
yarn run web      # Web browser
```

## 🎭 Demo Mode (One-Click Testing)

For immediate testing with realistic fake data:

```bash
# 1. Start backend with Docker (includes database)
docker-compose up -d

# 2. Populate comprehensive demo data
docker-compose exec backend npm run seed:demo

# 3. Start mobile app with demo backend
EXPO_PUBLIC_API_URL=http://localhost:3000 npx expo start
```

**Demo Credentials**: `demo+user@example.com` / `demo123`

See [DEPLOYMENT.md](DEPLOYMENT.md#demo-mode) for full demo documentation.

🌐 Backend Deployment (Cloud)

Railway (Recommended)

Go to https://railway.app/

Click “New Project” → “Deploy from GitHub Repo”

Select this repo, set root to backend

Start command: npm start

Add environment variables (SENTRY_DSN, etc.) in Railway UI

Click Deploy—your backend API will be live at https://your-app.up.railway.app

Render (Alternative)

Go to https://render.com/

Create new Web Service → connect your repo

Root directory: backend

Build command: npm install && npm run build

Start command: npm start

Add env vars (SENTRY_DSN, etc.)

Deploy

### Vercel (Frontend only)

Deploy the Expo web or static frontend. This does not run the Express backend—just connect the repository and use Vercel's default build settings.

#### Environment Variables

Backend (`backend/.env`; see `backend/.env.example` for defaults):

```env
# Sentry DSN (error monitoring)
SENTRY_DSN=your-sentry-dsn

# Node environment
NODE_ENV=development

# Port (optional, defaults to 3000)
PORT=3000

# Database (optional, if using Prisma/Postgres)
DATABASE_URL=your-postgres-url
```

### 🚨 Production environment variables

When deploying the backend (for example on Railway/Render), the following variables are required and validated on startup. Missing or invalid values will cause the server to fail fast with a clear error message.

Required in production:

- JWT_SECRET: cryptographically strong secret, at least 32 characters and must contain lowercase, uppercase, numeric, and symbol characters (used to sign/verify JWTs)
- DATABASE_URL: database connection string (e.g., Postgres)
- FIREBASE_PROJECT_ID: Firebase project ID
- FIREBASE_SERVICE_ACCOUNT_BASE64: base64-encoded Firebase service account JSON
- STRIPE_SECRET_KEY: Stripe secret key
- OPENAI_API_KEY: OpenAI API key (used by the concierge route)
- OPENWEATHER_API_KEY: OpenWeather API key (used by weather integrations)

Optional (defaults exist):

- PORT: default 8080
- CORS_ORIGIN: allowed origin(s) for CORS
- WEATHER_API_URL: default https://api.openweathermap.org/data/2.5
- WEATHER_CACHE_TTL_MS: default 300000 (5 minutes)
- DEBUG_DIAG: '0' or '1'
- EXTERNAL_API_TIMEOUT_MS: default 5000 (ms)
- RATE_LIMIT_WINDOW_MS: default 60000 (1 minute)
- RATE_LIMIT_MAX_REQUESTS: default 60 requests per window
- RATE_LIMIT_BLOCK_SECONDS: default 60 seconds to block abusive clients in Redis

Generate a strong JWT secret (copy the output and set JWT_SECRET):

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Or using OpenSSL:

```bash
openssl rand -base64 48
```

Frontend (`.env`):

```env
EXPO_PUBLIC_API_BASE_URL=http://localhost:3000
```

## 🔧 Platform-Specific Setup & Troubleshooting

### Node.js Compatibility

This project resolves Node.js version compatibility issues through:

- **Yarn resolutions**: `superstatic` package override in `package.json`
- **Engine bypassing**: Use `--ignore-engines` flag for Node.js 25+
- **CI compatibility**: Works with Node 20.19.4 in GitHub Actions

### iOS Development

iOS builds are configured to work without Firebase native modules:

- Firebase imports commented out in `ios/JARS/AppDelegate.mm`
- CocoaPods configuration excludes Firebase iOS modules via `react-native.config.js`
- Expo SDK 50 compatible versions used (e.g., `expo-localization@14.8.4`)

### Android Development

Android development requires:

- **Java 17**: `brew install openjdk@17`
- **Android SDK**: Command line tools, platform-tools, build-tools
- **Environment variables**: JAVA_HOME, ANDROID_HOME properly configured

If you encounter Android SDK issues:

```bash
# Download and setup Android SDK manually
mkdir -p ~/Library/Android/sdk
cd ~/Library/Android/sdk
# Download command line tools from https://developer.android.com/studio
# Extract and install required packages via sdkmanager
```

## Sentry Setup

The app is preconfigured with Sentry for crash and error reporting. To use your own
Sentry project:

1. Copy `.env.example` to `.env`.
2. Replace the `SENTRY_DSN` value with the DSN from your Sentry project.
3. Rebuild or restart the app.

With the DSN set, runtime errors and unhandled exceptions will appear in your
Sentry dashboard under that project.

## Design Assets

Certain icons, audio cues and Lottie animations are required under `src/assets`.
The list of files lives in `scripts/expectedAssets.ts` and can be verified with
`npm run check-assets`. CI will fail if any are missing.

The repo also includes a `Terpene_Wheel_Code_Kit.zip` archive. Run
`npm run integrate-terpene-assets` to extract this kit into `assets/terpene-wheel`
when you want to use the terpene wheel module.

🧪 Testing & Quality

**Lint:** `npm run lint` (ESLint with minimatch override for compatibility)

**Format:** `npm run format:ci` (Prettier - fails CI if not formatted)

**Type Safety:** `npm run typecheck` (TypeScript compilation)

**Unit Tests:** `npm run test:ci` (Jest + React Native Testing Library)

**Backend Tests:** `npm --prefix backend run test:ci` (Jest + Supertest)

**E2E Tests:** `npm run test:e2e:android` (Detox with Android emulator)

**Pre-commit hooks:** Linting and formatting run automatically on commit

## � CI/CD Pipeline

### GitHub Actions Workflows

**Main CI (`ci.yml`)**

- Triggers: Push to main, Pull Requests
- Node.js 20.11.1 with 4GB memory allocation
- Runs: lint → format → typecheck → tests → backend tests → audit
- Caches: npm cache, backend node_modules

**E2E Smoke Tests (`e2e-smoke.yml`)**

- Android emulator with API 34 (Pixel XL)
- EAS Build integration for app compilation
- Comprehensive Android SDK caching
- Firebase backend integration for full-stack testing
- Detox test suite: Auth → Cart → Checkout → Concierge → Awards → Weather → Legal

**Lint & Format (`lint-and-format.yml`)**

- Fast formatting and linting checks
- Fails build on format violations

**Newman Smoke Tests (`newman-smoke.yml`)**

- API endpoint testing with Postman collections

### Memory Optimization

All workflows include `NODE_OPTIONS: "--max-old-space-size=4096"` to prevent memory exhaustion during:

- Dependency installation (`npm ci --legacy-peer-deps`)
- ESLint execution with large codebases
- TypeScript compilation
- Test execution

### Caching Strategy

- **npm cache**: Automatic via `actions/setup-node@v4`
- **Android SDK**: system-images, platforms, build-tools, AVDs
- **Backend dependencies**: Separate cache key based on backend/package-lock.json

### Build Artifacts

E2E tests upload artifacts on failure:

- Detox screenshots and videos
- Test execution logs
- Device/emulator state dumps

## 🚀 Local Development

### Run Detox E2E Tests Locally

1. **Setup Android Emulator**

   ```bash
   # Create AVD (if not exists)
   avdmanager create avd --force --name "Pixel_XL_API_34" --package "system-images;android-34;google_apis;x86_64" --tag "google_apis" --abi "x86_64"

   # Start emulator
   emulator -avd Pixel_XL_API_34 -no-snapshot -no-window
   ```

2. **Build E2E App**

   ```bash
   npm run build:e2e:android
   ```

3. **Start Backend (separate terminal)**

   ```bash
   cd backend
   NODE_ENV=test npm start
   ```

4. **Run Tests**
   ```bash
   npm run test:e2e:android
   ```

### Development Scripts

```bash
# Install all dependencies
yarn install --ignore-engines   # Root dependencies (Node.js 25+ compatibility)
npm run install:all             # Automated root + backend install

# Clean reinstall
npm run clean:modules           # Remove node_modules and lockfiles
yarn install --ignore-engines   # Reinstall from scratch

# Start development servers
yarn start                      # Expo dev server
yarn run android               # Android-specific (requires Android SDK)
yarn run ios                   # iOS-specific (requires Xcode)
yarn run web                   # Web demo
npm run demo:web               # Web demo with API connection
npm run start:backend          # Express API server (port 3000)

# Quality checks
yarn lint                      # ESLint
yarn typecheck                 # TypeScript
yarn test                      # Jest tests
yarn format:check              # Prettier format validation
```

## Compliance

### Accessibility

- Interactive elements include screen reader labels, roles, and helpful hints.
- Modals are marked as accessible and announce themselves to assistive technologies.
- Text supports dynamic font scaling for better readability.
- Color choices follow WCAG 2.1 AA contrast guidelines.

📦 Project Structure

```plaintext
jars-cannabis-mobile-app/
├─ backend/            # Node.js/Express/Prisma backend
├─ src/                # React Native app source
│  ├─ screens/
│  ├─ context/
│  └─ navigation/
├─ App.js              # Expo/React Native entry
├─ package.json
└─ README.md
```

FAQ

Where do I set my Sentry DSN? Add to `backend/.env` as `SENTRY_DSN=<your-sentry-dsn>`.

How do I deploy the backend?See Backend Deployment (Cloud) above.

Where is the mobile app code?All React Native code is in /src. Entry point is App.js.

How do I add environment variables in production?Use your platform’s UI (Railway/Render/Heroku/etc).

## CI: EAS Build Secrets (Android & iOS)

To allow CI to produce signed Android APKs and iOS simulator builds for preview, add these GitHub Actions secrets:

**Required for all builds:**

- `EXPO_TOKEN` — your Expo access token (get from `npx eas-cli@latest whoami`)

**Android signing (optional - for signed APKs):**

- `EXPO_ANDROID_KEYSTORE_BASE64` — base64-encoded JKS keystore file (see encoding instructions below)
- `EXPO_ANDROID_KEYSTORE_PASSWORD` — the keystore password (e.g. `DemoPass123`)
- `EXPO_ANDROID_KEY_ALIAS` — the alias inside the keystore (e.g. `upload`)
- `EXPO_ANDROID_KEY_PASSWORD` — the key password (e.g. `DemoPass123`)

**Firebase integration (optional - enables push notifications & analytics):**

- `GOOGLE_SERVICES_JSON_BASE64` — base64-encoded `google-services.json` for Android
- `GOOGLESERVICE_PLIST_BASE64` — base64-encoded `GoogleService-Info.plist` for iOS

How to encode files as base64 for GitHub secrets:

```bash
# Android keystore
base64 -w0 path/to/your.keystore > android-keystore.b64

# Android google-services.json
base64 -w0 apps/android/google-services.json > google-services.b64

# iOS GoogleService-Info.plist
base64 -w0 apps/ios/GoogleService-Info.plist > GoogleService-Info.b64
```

Copy the contents of these `.b64` files into the corresponding GitHub secret.

### CI Prebuild Step

The CI workflow automatically runs `npx expo prebuild --clean` before EAS builds to ensure:

- Native `android/` and `ios/` folders are regenerated with correct Expo SDK versions
- `expo-modules-core` is properly linked
- Firebase modules and all native dependencies are configured
- `compileSdkVersion` is auto-set via Expo SDK

This prebuild step happens automatically in CI before both Android and iOS builds. For local development, you can also run:

```bash
npx expo prebuild --clean
```

One-time local interactive step (recommended):

1. Install and login to EAS locally:

```bash
npm install -g eas-cli
eas login
```

2. Run the interactive configure command and choose Android → "Let EAS manage credentials":

```bash
eas build:configure
# choose: Android -> Let EAS manage credentials
```

This either seeds Expo-managed remote credentials or you can instead provide the keystore via the secrets above (CI reads `EXPO_ANDROID_*` env vars and will use a local keystore if `credentialsSource: "local"` is set in `eas.json`).

Security note: always store keystores and passwords in GitHub Secrets; do not commit them to source control.

🤝Buyer Information & Support

See [docs/buyer-setup.md](docs/buyer-setup.md) for configuring credentials and running production builds.

Licensing & Transfer:

You receive full ownership and source code on sale/transfer.

All code is MIT-licensed unless otherwise stated (customizable for your business needs).

Delivery includes:

Complete GitHub repository access (with full commit history)

All environment variable examples and setup scripts

Full technical documentation (this README)

Setup/deployment walkthrough on request

White-labeling:

All logos, colors, and brand assets can be swapped for your organization.

Codebase is designed for rapid rebranding and custom flows.

Optional Onboarding & Support:

1-on-1 onboarding session (Zoom/Teams) available post-sale for technical handoff.

Priority support for 30 days after transfer (by arrangement).

Future feature additions, design tweaks, or custom integrations available as contract add-ons.

For technical support or additional services, open an issue in your private repo or contact the developer directly.

This project is plug-and-play for cannabis retail: just add your branding, API keys, and deploy.

Contact for licensing, transfer, or deployment help!

## How to Enable Apple Pay After Acquisition

1. Enable Apple Pay in your Apple Developer account and create a Merchant ID.
2. Replace `STRIPE_PUBLISHABLE_KEY` and `STRIPE_MERCHANT_ID` in your `.env` with production values.
3. Add the Merchant ID to the Xcode project and enable the Apple Pay entitlement in both Xcode and App Store Connect.
4. Rebuild and submit the app. Apple Pay activates automatically once the merchant ID is configured.

### App Store Notes

- Apple Pay will activate when a valid merchant ID is added.
- You must enable the Apple Pay entitlement in Xcode and App Store Connect.

## App Store Prep Checklist

- Ensure privacy policy and terms links resolve correctly.
- Provide a support URL and compliance details in `assets/app-store-info.md`.
- Capture final screenshots in `assets/screenshots/` before submission.
- When answering Apple's cannabis questionnaire, include your state license number and confirm sales occur only where legal.

## Local Dev Quick-start

```
cp .env.example .env   # fill keys
npm run dev:emulators  # Firestore/Auth/CF
npm run dev:expo       # Expo client against local emu
```

## Custom Dev Client

Generate native projects and build a custom development client:

```bash
npx expo prebuild
npx expo run:android   # or npx expo run:ios
```

## Push Notifications Setup

1. Add your Firebase config files:
   - Place `google-services.json` in `android/app`.
   - Place `GoogleService-Info.plist` in the iOS project. The repo contains a
     placeholder with dummy keys; download the real file from the Firebase
     console (Project settings → _General_ → _Your apps_) or request it from a
     maintainer and keep it out of version control. If a real key was
     previously committed, rotate it in the Firebase console.
2. **iOS:** Enable Push Notifications and Background Modes (Remote notifications) in Xcode. Upload your APNs key to Firebase.
3. **Android:** Confirm `google-services.json` is present and Firebase Messaging is referenced in `AndroidManifest.xml`.
4. On launch the app requests notification permission and logs the FCM token. Replace the sync stub in `App.tsx` to send the token to your backend if needed.
5. Send a test message from the Firebase console to verify foreground, background, and quit-state behavior.

## New Endpoints (Launch)

- Recommendations: `GET /recommendations/for-you`, `GET /recommendations/related/:productId`
- Reviews: `POST /products/:id/reviews`
- Loyalty: `GET /loyalty/status`, `GET /loyalty/badges`
- Concierge: `POST /concierge/chat`
- Journal: `GET/POST/PUT /journal/entries*`
- AR: `GET /ar/models/:productId`
- Preferences: `GET/PUT /profile/preferences`
- Awards: `GET /awards/status`
- Webhooks: `POST /webhook/stripe` (order status notifications)

## Contributing

We welcome improvements and bug fixes. See [CONTRIBUTING.md](CONTRIBUTING.md) for the development workflow, coding standards, and test instructions.

## Code of Conduct

Please read and follow our [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) to help us maintain a respectful community.

## 🛠️ Troubleshooting

### Common Issues & Solutions

**1. Node.js Engine Compatibility Error**

```bash
# Error: The engine "node" is incompatible with this module
# Solution: Use --ignore-engines flag
yarn install --ignore-engines
```

**2. Firebase iOS Build Errors**

```bash
# Error: 'Firebase/Firebase.h' file not found
# Solution: Firebase iOS modules are disabled by design
# Check ios/JARS/AppDelegate.mm - imports should be commented out
```

**3. Yarn Version Conflicts**

```bash
# Error: This project requires Yarn 3.6.1 but system has 1.x
# Solution: This is resolved - use any Yarn 1.x or 3.x version locally
# CI uses Yarn 3.6.1, development works with Yarn 1.22.22+
```

**4. Android Build Issues**

```bash
# Error: ANDROID_HOME not set
# Solution: Set up Android environment
export JAVA_HOME=/opt/homebrew/opt/openjdk@17
export ANDROID_HOME=~/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools
```

**5. Metro Bundler Issues**

```bash
# Clear Metro cache if experiencing module resolution issues
npx react-native start --reset-cache
# or
yarn start --clear
```

### Build Status Verification

After setup, verify everything works:

```bash
# Run all quality checks
yarn lint && yarn typecheck && yarn test && yarn format:check

# Test iOS build (macOS only)
yarn run ios

# Test Android build (requires Android SDK)
yarn run android
```

All checks should pass ✅ indicating a successful setup.
