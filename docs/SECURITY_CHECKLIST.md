# Security checklist (2026-11-22)

This is the pre-deploy checklist: the 20 core items plus extras E1 to E10. Re-score it before every push to main or deploy.
PASS, FAIL and N/A rows have evidence. "Owner" means a console, credential or store action, not code.

## Financial Copilot (Expo, local-only; PUBLIC repo)

PR base: `staging`. **Verdict: Ready after owner action.** 3 highs remain (Expo chain, SDK upgrade). Native PBKDF2 is below OWASP and needs a native crypto module. Add a privacy policy link before store submission.

| # | Item | Result | Evidence |
|---|---|---|---|
| 1 | SQL injection | N/A | No SQL engine. Data is in local key-value storage. |
| 2 | XSS | PASS | RN rendering. |
| 3 | CSRF | N/A | No backend. |
| 4 | File upload validation | N/A | No uploads. |
| 5 | SSRF | N/A | No server. |
| 6 | BOLA/IDOR | PASS | Data is keyed per local account (`lib/accounts.ts`). |
| 7 | Rate limiting | N/A | No network endpoint. On-device guessing is slowed only by the PBKDF2 cost (see #8). An attempt lockout would be a nice-to-have. |
| 8 | Password hashing | FAIL (partial) | Web raised from 210k to 600k PBKDF2-SHA256 (`lib/authCrypto.ts:7`); old hashes are upgraded at sign-in (`accounts.ts:247`). Native stays at 72k because Hermes runs pure-JS PBKDF2. Needs a native crypto module. |
| 9 | MFA | N/A | Local-only app. No remote account. |
| 10 | Server-side permissions | N/A | No server. |
| 11 | RLS | N/A | No database server. |
| 12 | JWT secrets | N/A | No JWTs. |
| 13 | API keys server-side | PASS | No LLM or API key in the client bundle. |
| 14 | No tokens in localStorage | FAIL (web preview) | Native uses SecureStore. On web, secureKv falls back to localStorage (web is a preview). |
| 15 | Default credentials | PASS | Demo `demo123` is disabled when `APP_MODE='enterprise'`. |
| 16 | CORS | N/A | No server. |
| 17 | Webhook signatures | N/A | No webhooks. |
| 18 | No exposed source maps | PASS | Expo export has no maps. |
| 19 | Clean production logs | PASS | No sensitive logging found. |
| 20 | Vulnerable dependencies | FAIL (planned upgrade) | Highs went from 54 to 3 (`decode-uri-component`, `image-size` via Expo). |
| E1 | Security headers/HTTPS | N/A | No web host config. |
| E2 | Secrets in git history | PASS | Only a `lib/achievements.ts:5` false positive. |
| E3 | Server-side input validation | N/A | No server. Client validation exists. |
| E4 | Mobile safety | PASS | No secrets in app.json. SecureStore used. |
| E5 | Sessions | PASS | Local lock and sign-out. |
| E6 | Privacy/store rules | FAIL (owner) | `SettingsScreen.tsx:299` says there is no privacy-policy link yet. Local data delete exists (`lib/deviceData.ts`). Drafts are in `docs/release/DISCLOSURE-DRAFTS.md`. |
| E7 | Safe errors | PASS | Friendly error states. |
| E8 | Backups/rollback | PASS (doc added) | `docs/SECURITY_CHECKLIST.md`. |
| E9 | CI scanning | PASS (added) | `.github/workflows/security.yml`. |
| E10 | Cross-user tests | PASS | Account isolation unit tests (12 pass). |

## Rollback

- OTA: `eas update:republish --group <previous-group-id>`. All data is on the device; there is no server state to roll back.

## Re-running the checks

- Secrets: `gitleaks git . --redact` (history) and `gitleaks dir . --redact` (working tree).
- Dependencies: `pnpm audit --prod` or `npm audit --omit=dev`. Fix within the same major version first.
- CI: `.github/workflows/security.yml` runs both on pull requests, where present.
