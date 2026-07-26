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
- Uses **OpenRouter** with an app-owned API key from `.env` (not editable in the UI).

### Import
| Method | Platform | Notes |
|--------|----------|--------|
| SMS inbox (`/import-sms`) | Android | Permission-first landing → system allow prompt → scan. Real inbox needs a **dev build** (not Expo Go). Sample SMS available anytime. |
| Paste SMS | iOS + Android | Paste a MoMo/bank alert; parsed on-device. |
| PDF statement | Both | Document picker; demo processing in this build. |

### Privacy & security
- Ledger and goals stored on-device (AsyncStorage).
- Biometric preference in SecureStore.
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
lib/                 openrouter, ledgerStore, goalsStore, biometrics, permissions, …
utils/smsParser.ts   Ghana MoMo/bank SMS parsing
constants/theme.ts   Cedar / sage / brass design tokens
```

---

## Setup

### Requirements
- Node **≥ 20.19.4**
- pnpm (recommended)
- Expo Go **or** Android/iOS toolchain for a dev build

### Install

```bash
pnpm install
```

### Environment

Copy `.env.example` → `.env` and set:

```env
EXPO_PUBLIC_OPENROUTER_API_KEY=sk-or-v1-your-key-here
# optional:
# EXPO_PUBLIC_OPENROUTER_MODEL=meta-llama/llama-3.2-3b-instruct
```

Restart Expo after changing `.env` (`pnpm start -- --clear`).

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
| `pnpm start` | Start Metro / Expo |
| `pnpm android` / `pnpm ios` | Native run |
| `pnpm typecheck` | TypeScript |
| `pnpm lint` | ESLint |
| `pnpm test` / `pnpm test:ci` | Jest |
| `pnpm doctor` | expo-doctor |

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

- **In-app Live widget** on Home shows privacy-masked balance, streak, and top goal progress (updates after import).
- **Native iOS home-screen widgets / Live Activities** via `expo-widgets` require **Expo SDK 56+** and a **development build** — this project is on SDK 54, so the snapshot in `lib/widgetBridge.ts` is ready to pipe into `expo-widgets` after an upgrade.
- Widget balance is **always masked** by default (home/lock screens are more exposed than the app).

## Notifications

Local notifications (toast + system when permitted):

| Kind | When |
|------|------|
| Import digest | After SMS/paste import — count + weekly spend |
| Goal milestones | 50% / 90% / 100% progress |
| Spend nudge | Simple grounded anomaly (e.g. food vs usual) |
| Streak at risk | Evening reminder if not checked in |
| Login / logout | Session events |

Action buttons (dev build): **Categorize**, **Ask AI**, **View goals**, **Check in**.

Android notification icon: `assets/images/notification-icon.png` (white glyph). Splash: cedar branding on paper green.

## Notes & limits

- **iOS cannot read the SMS inbox** by design; Paste SMS is the intended path.
- After **Allow SMS**, the app never silently injects demo data. Real inbox import needs a **dev build** with an SMS reader module; Expo Go shows a clear empty state + Paste SMS.
- Real imports **replace demo ledger rows**.
- AI answers are only as good as imported ledger data; it will not invent transactions.
- This build uses demo auth credentials — not production identity (no Clerk/backend yet).

---

## License

Private project — see repository settings for distribution terms.
