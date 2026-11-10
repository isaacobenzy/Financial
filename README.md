# Financial Copilot

Personal finance companion for Ghana (GHS) — track balance and transactions, set goals, import MoMo/bank alerts, and ask an AI that only answers using **your** ledger data.

Built with **Expo SDK 54**, **Expo Router**, and **React Native**.

---

## Demo login

| Field    | Value                         |
|----------|-------------------------------|
| Email    | `demo@financialcopilot.com`   |
| Password | `demo123`                     |

---

## Features

### Home
- Live **total balance**, income, and expenses (updates after SMS/paste import).
- **Eye toggle** to hide/show amounts (`••••••`). If biometric unlock is enabled, revealing requires Face ID / fingerprint.
- **Financial goals** widget (synced with the Goals tab).
- Compact **money streak** and unlocked achievements.
- Quick actions: Import SMS (Android), Paste SMS, PDF.
- Recent activity list.
- **Floating money AI button** (bottom-right) → opens the chat.

### Goals tab
- Create, edit, and delete monthly/yearly goals.
- Progress bars using the app theme.
- Same floating AI button to ask about goals/spending.

### Settings tab
- Profile avatar and account details.
- **Biometric unlock** (Face ID / fingerprint) toggle.
- Permissions (platform-accurate):
  - **Android:** Read SMS, files/media, notifications.
  - **iOS:** Paste SMS / PDF (Apple does not allow reading the SMS inbox), notifications, Face ID.
- Links to import flows, AI assistant, transactions.
- Short terms / privacy note and log out.

### AI Assistant
- Opened from the floating money icon on Home or Goals (also via Settings).
- **Type free-form messages** or tap quick prompts.
- Grounded on your balance, imported transactions, and **live goals**.
- Refuses off-topic questions (politics, coding, general chat, etc.).
- AI chat is off in this build. There is no backend, and the app does not ship a provider API key.

### Import
| Method | Platform | Notes |
|--------|----------|--------|
| SMS inbox (`/import-sms`) | Android | Permission-first landing → system allow prompt → scan. Real inbox needs a **dev build** (not Expo Go). Sample SMS available anytime. |
| Paste SMS | iOS + Android | Paste a MoMo/bank alert; parsed on-device. |
| PDF statement | Both | File picker only. The file is not read and nothing is added to the ledger. |

### Privacy & security
- Ledger and goals stored on-device (AsyncStorage). New installs do not start with sample balances or sample goals.
- Passwords are stored as PBKDF2 verifiers. Older plaintext passwords are replaced after a successful sign-in.
- Biometric preference in SecureStore. That flag does not encrypt the ledger.
- Soft unlock session (~5 minutes); returning after expiry can require biometrics again.
- SMS parsing stays on the phone.

### Streaks & achievements
- Daily check-in streak when you use the app / import / chat.
- Badges for first import, streaks, budget discipline, healthy buffer, on-device ledger.

---

## App navigation

```
Onboarding → Login → (optional Unlock) → Tabs
                                              ├─ Home
                                              ├─ Goals
                                              └─ Settings
Stack: Assistant, Explore (SMS), Paste SMS, Import PDF, Transactions, Unlock
```

Floating AI (money icon) on **Home** and **Goals** opens **Assistant**, where you type and send messages.

---

## Tech stack

- Expo ~54 / React Native 0.81 / React 19
- Expo Router (file-based routes)
- AsyncStorage, SecureStore
- expo-local-authentication (biometrics)
- expo-notifications (permission prompts)
- expo-document-picker (PDF)
- OpenRouter chat completions API
---


## Project structure (high level)

```
app/                 Expo Router routes (tabs + stack screens)
screens/             Screen UI implementations
components/          BalanceHeader, GoalsWidget, AiFab, StreakCard, …
lib/                 ledgerStore, goalsStore, accounts, biometrics, permissions, aiShare, …
utils/smsParser.ts   Ghana MoMo/bank SMS parsing
constants/theme.ts   Cedar / sage / brass design tokens
```

---

## Setup

### Requirements
- Node **≥ 20.19.4** (`.nvmrc` and EAS profiles pin `20.19.4`)
- pnpm `10.33.3` (`packageManager` in `package.json`; CI uses `pnpm-lock.yaml`)
- Expo Go **or** Android/iOS toolchain for a dev build

### Install

```bash
pnpm install
```

### Environment

Do not put a model-provider API key in `.env` or in the Expo project environment for this app. `EXPO_PUBLIC_*` values are compiled into the binary and the web bundle. Chat stays off until an authenticated backend exists. `.env.example` documents that limit.

**Never commit** `.env` or real API keys.

### Run

```bash
pnpm start
# or clear cache:
pnpm start -- --clear
```

Then open in Expo Go, or:

```bash
pnpm android   # expo run:android — needed for real SMS inbox
pnpm ios
```
---

## Permissions matrix

| Capability | Android | iOS |
|------------|---------|-----|
| SMS inbox | `READ_SMS` | Not available — use Paste SMS |
| Files / PDF | Document picker (+ media where needed) | Document picker + Info.plist usage strings |
| Notifications | `POST_NOTIFICATIONS` | expo-notifications + usage description |
| Biometrics | Fingerprint / biometric | Face ID (`NSFaceIDUsageDescription`) |

Configured in `app.json`.

---

## Scripts

| Command | Purpose |
|---------|---------|
| `npm start` | Start Metro / Expo |
| `npm run android` / `npm run ios` | Native run |
| `npm run export:web` | Static web export → `dist/` |
| `npm run deploy:web` | Export + [EAS Hosting](https://docs.expo.dev/eas/hosting/get-started/) deploy |
| `npm run build:android:preview` | [Internal Android APK](https://docs.expo.dev/tutorial/eas/internal-distribution-builds/) |
| `npm run typecheck` | TypeScript |
| `npm run lint` | ESLint |
| `npm test` / `npm run test:ci` | Jest |
| `npm run doctor` | expo-doctor |
| `pnpm start:web` | Web dev server on your LAN (open it on a phone browser) |
| `pnpm build:ci` | Web export check used by CI → `dist/` (no deploy) |
| `pnpm validate` | typecheck + lint + unit tests |
| `pnpm pipeline` | `validate` then `build:ci` — run this before opening a PR |
| `pnpm deploy:preview` | Export + `eas deploy` (preview URL). Run by hand only |
| `pnpm deploy:prod` | Export + `eas deploy --prod`. Run by hand only |

CI (`.github/workflows/ci.yml`) runs install → Expo Doctor → typecheck → lint → tests → web export on every PR and push to `features`, `staging`, and `main`. It has read-only permissions and never deploys.

On web, `expo-secure-store` has no implementation, so account and session records fall back to browser storage (`lib/secureKv.ts`). Native builds keep using the Keychain / Keystore.

---

## Share preview links (Android + Web, no Apple account)

You do **not** need an Apple Developer account for Android APKs or the web preview.

### 1. Link the EAS project (once)

```bash
npm install -g eas-cli   # or: npx eas-cli@latest
eas login
eas init                    # writes expo.extra.eas.projectId into app.json
```

Commit the updated `app.json` (with `projectId`). Connect the GitHub repo in the [Expo dashboard](https://expo.dev) so **EAS Workflows** can run (builds + web deploy **without** a GitHub `EXPO_TOKEN`).

Optional: add a GitHub Actions secret `EXPO_TOKEN` only if you want the manual **Deploy Web (optional)** / **EAS Build (optional)** workflows.

### 2. Android install link (BetLive-style internal distribution)

Same flow BetLive uses for testers ([internal distribution](https://docs.expo.dev/tutorial/eas/internal-distribution-builds/)):

```bash
npm run build:android:preview          # shareable APK (no Metro needed)
# optional JS-only updates after they install once:
npm run update:preview -- "Fix goals toast"
```

When the build finishes: EAS dashboard → **Install** / QR → share that link.  
After the APK is installed, publish an OTA so the app fetches new JS **without reinstalling**:

```bash
pnpm update:preview
# or GitHub Actions → "EAS Update (OTA)" / push to staging
```

Installed preview builds listen on channel `preview` (`eas.json`). On launch (and when returning to the foreground), the app runs `checkAndApplyUpdates()` via `expo-updates` and reloads if a newer bundle is available.

**OTA limits:** JS/asset changes only. Native modules (e.g. SMS reader, notification icon plugin) still need a new APK.

EAS Workflows (repo): `.eas/workflows/android-preview-build.yml`, `publish-preview-update.yml`.

### 3. Web preview URL (EAS Hosting) — share without installing

Anyone can open the app in a browser (no APK). SMS inbox / OS push / biometrics still need the Android build.

#### How the preview URL is produced

There are **two deploy paths** (same end result: a public `https://….expo.app` link):

**A. EAS Workflows (preferred — no GitHub `EXPO_TOKEN`)**  
Linked Expo project runs the job itself:

| Workflow | When | Result |
|----------|------|--------|
| [`.eas/workflows/deploy-web-preview.yml`](.eas/workflows/deploy-web-preview.yml) | Push/`PR` → `staging`, dispatch | `type: deploy` with `prod: false` + alias `preview` |
| [`.eas/workflows/deploy-web-production.yml`](.eas/workflows/deploy-web-production.yml) | Push → `main` | `type: deploy` with `prod: true` |

```yaml
jobs:
  deploy_web_preview:
    type: deploy
    params:
      prod: false   # preview hosting, not --prod
      alias: preview
```

**B. GitHub Actions** ([`.github/workflows/deploy-web.yml`](.github/workflows/deploy-web.yml)) — **optional / manual only**, needs repo secret `EXPO_TOKEN`:

1. Manual `workflow_dispatch`
2. Checkout
3. Authenticate EAS CLI via `expo/expo-github-action` + `secrets.EXPO_TOKEN`
4. `pnpm export:web` → static site in `dist/`
5. `eas deploy --non-interactive` → preview URL

Note: Expo project linkage ≠ GitHub Actions secret. If Actions logs show `EXPO_TOKEN` empty, either add that secret under **Repo → Settings → Secrets → Actions**, or rely on EAS Workflows (A) which do not need it.

#### Related (not web hosting)

[`publish-preview-update.yml`](.eas/workflows/publish-preview-update.yml) publishes an **EAS Update** (OTA JS for installed APKs / native clients), **not** a public web URL. The shareable browser URL is specifically from `eas deploy` / the `type: deploy` workflow.

Demo login on web: `demo@financialcopilot.com` / `demo123`.

### Expo Go limits

Expo Go cannot do real SMS inbox, full push notifications, or lock-screen live status. Use the Android preview APK for those. In Expo Go you still get toasts + Paste SMS / sample import. For a no-install demo, prefer the **web preview URL** above.

---

## Typical user flow

1. Onboarding → demo login.
2. (Optional) Enable Face ID / fingerprint in Settings.
3. Import SMS (Android) or Paste SMS / PDF.
4. Set or edit goals on the Goals tab.
5. Tap the floating money button → type questions like “What did I spend on food?”.
6. Hide balance with the eye icon when sharing your screen.

---

## Widgets & Live Activities

- **In-app Live widget** on Home shows hide/show balance, streak, and top goal progress.
- **Android lock-screen live status**: sticky branded notification (`lib/liveActivity.ts`) with the app notification icon — updates on sign-in, goals, and balance refresh. Clear on sign-out.
- **Native iOS Live Activities / home widgets** via `expo-widgets` need **Expo SDK 56+** and a native extension; SDK 54 uses the Android live notification + in-app widget.

## Sensory feedback (BetLive-style)

Three layers — feel / see / hear:

| Layer | Module | Notes |
|-------|--------|--------|
| Haptics | `lib/haptics.ts`, `hooks/useHaptics.ts` | Semantic: `buttonPress`, `select`, `success`… never throws |
| Toasts | `lib/notificationStore.ts` → `notificationService` + `NotificationStack` | Toast always pairs matching haptic |
| Push | `lib/pushNotifications.ts` | Settings gate → Expo Push → local → toast fallback |

Deep links use `data.href` (or `goalId` / `screen`). Settings UI: `/notifications-settings`.

**Expo Go:** Android SDK 53+ cannot use remote push — use `pnpm build:android:preview`. Toasts + haptics still work.

## Splash (animated)

- Native splash via `expo-splash-screen` plugin + `SplashScreen.setOptions({ fade: true })` ([docs](https://docs.expo.dev/versions/latest/sdk/splash-screen/)).
- Custom branded `AnimatedSplash` (logo scale + fade) after fonts load.
- Test splash on a **preview/production** build — Expo Go shows the app icon instead ([guide](https://docs.expo.dev/develop/user-interface/splash-screen-and-app-icon/)).

## Notifications & push

Aligned with [Expo push setup](https://docs.expo.dev/push-notifications/push-notifications-setup/) and [receiving notifications](https://docs.expo.dev/push-notifications/receiving-notifications/):

- Registers `ExpoPushToken` with `eas.projectId` from `app.json`.
- Foreground handler shows banner/list; taps deep-link into Home / Goals / Assistant / Import.
- Incoming payloads are read from `notification.request.content.data`.
- Android notification **icon + color** from the `expo-notifications` plugin.
- Settings → **Register for push** / **Send test push**, or paste the token into [expo.dev/notifications](https://expo.dev/notifications).
- **Android remote push** also needs [FCM V1 credentials](https://docs.expo.dev/push-notifications/fcm-credentials/) on your EAS project (one-time).
- **Live lock-screen widgets** (Android sticky notifications): Overview, Balance, Goals, Streak — toggle in Settings.

| Kind | When |
|------|------|
| Sign in / out | Session start and end (+ live widgets) |
| Goal created / updated | After saving a goal |
| Almost there | Goal reaches ~80%+ |
| Goal milestones | 50% / 90% / 100% |
| Import digest | After SMS/paste import |
| Spend nudge | Grounded anomaly (e.g. food vs usual) |
| Streak at risk | Evening reminder if not checked in |
| Test push | Settings or Expo push tool |

## Haptics

Settings toggle. When on, feedback only for: **login success**, **tab bar**, **AI reply**, **goals**.

## Notes & limits

- **iOS cannot read the SMS inbox** by design; Paste SMS is the intended path.
- After **Allow SMS**, Expo Go exits quickly to Paste SMS / sample — it cannot hang on “Reading financial alerts…”. Real inbox needs `pnpm android` (dev build) with `expo-transaction-sms-reader`.
- A new balance, when none is saved yet, is income minus expenses unless an imported alert states an available balance. Totals already saved on a phone are not rewritten. See `docs/release/LEDGER-TOTAL-MIGRATION.md`.
- Local accounts: sign up on the login screen, or use demo credentials to open an empty demo session. Tap your avatar to edit profile. Settings can delete that account without clearing the shared ledger. Clearing the ledger and goals is a separate action. A password verifier does not encrypt the ledger.
- Store release notes and disclosure drafts: `docs/release/`. Those drafts need the owner's confirmation before they are published.

---

## License

Private project — see repository settings for distribution terms.
