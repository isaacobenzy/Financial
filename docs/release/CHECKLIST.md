# Release checklist

This is an engineering checklist for Financial Copilot (`com.financialcopilot.app`), not a store approval and not legal advice. Nothing here was submitted to Google Play or App Store Connect. No production EAS build was run for this change.

Identity stays Financial Copilot, package/bundle `com.financialcopilot.app`, Expo owner slug `isaacobengz`, EAS project `7659da44-7576-4f69-a623-cc9a77d973f6`.

## Status

**BLOCKED** for store submission. Internal testing of a release binary is also not done: this change was not built with `eas build`.

## What this change already does

- The client does not read or embed an OpenRouter API key. Chat does not call a provider. There is no backend in the repo, so no proxy was added.
- Sharing the ledger requires an on-device consent flag, and even then nothing is sent.
- New installs with no saved balance total income minus expenses and do not mix in sample merchants. A balance already saved on the phone is left unchanged, including when it equals `12500 + income - expenses`. There is no automatic rewrite. A proposed opt-in is described in `LEDGER-TOTAL-MIGRATION.md` and is not implemented.
- Picking a PDF does not report a successful import.
- Android no longer declares photo/media read, broad external storage, `RECEIVE_SMS`, or exact-alarm permissions. `READ_SMS` remains for the import screen and is blocked until the in-app disclosure is accepted. Those permissions are also listed under `android.blockedPermissions`.
- Notification permission is not requested at startup. The notifications screen can still ask.
- New passwords are PBKDF2-HMAC-SHA256 verifiers (100,000 iterations). An older plaintext password is replaced only after that password signs in and the new verifier checks out. If the verifier cannot be checked, the existing row is left as stored. The hash does not encrypt the ledger.
- Deleting an account removes that sign-in record only. The ledger and goals stay, because they are shared by every profile on the phone. A separate action clears that shared ledger and goals and does not delete other accounts.
- New installs do not auto-create sample goals. Goals already saved on a device, including ones an older build seeded, stay until the person deletes on-phone data.
- Duplicate automatic Android preview builds on `main` are reduced to `.eas/workflows/android-preview-build.yml`. `.eas/workflows/build.yml` is manual. Web preview no longer runs on pull requests.
- Expo SDK 54 patch versions were aligned with current `expo-doctor` (`expo` 54.0.38 and the matching `expo-constants`, `expo-local-authentication`, `expo-updates`, and `jest-expo` patches). `expo-crypto` was added for random password salts when `crypto.getRandomValues` is missing.

## Owner decisions still required

1. Whether Android inbox SMS stays. Play’s SMS policy allows a money-management exception only with a core-feature listing, a privacy policy, prominent disclosure, and a Permissions Declaration. Policy: <https://support.google.com/googleplay/android-developer/answer/10208820>. This build has the in-app disclosure. It does not have a privacy-policy URL or a Play declaration.
2. Confirm photo/video permissions stay removed. One-time files should use the system picker: <https://support.google.com/googleplay/android-developer/answer/14115180>.
3. Where AI runs. A billable key must not return to `EXPO_PUBLIC_*` or `app.config.js`. Expo inlines those values: <https://docs.expo.dev/guides/environment-variables/>. Adding a backend is a new service and needs approval. Do not deploy one from this checklist.
4. Publish or reject the disclosure drafts in `DISCLOSURE-DRAFTS.md`. Do not ship them as policy until you confirm the wording.
5. Account deletion web URL. Google requires an in-app path and a web link for apps that create accounts: <https://support.google.com/googleplay/android-developer/answer/13327111>. Apple requires in-app deletion when the app supports account creation: <https://developer.apple.com/app-store/review/guidelines/#5.1.1>. In-app deletion exists. A public web URL does not.
6. Confirm Expo account `isaacobengz` owns the project, and whether an upload keystore, Play service account, FCM V1 key, Apple distribution certificate, and APNs key already exist there. This repo does not contain those files. Do not paste them into git.
7. Export compliance is an owner decision. `ITSAppUsesNonExemptEncryption` was added in an earlier commit on this branch and has been removed. The repo does not answer Apple’s encryption questionnaire. Set the flag only after the owner confirms the answer in App Store Connect. Password hashing is not a statement that the ledger is encrypted.
8. `ios.supportsTablet` is still true, so iPad screenshots are required if you ship that setting.
9. Turn on `expo-updates` code signing, or disable automatic OTA, before a store build. `components/NotificationActions.tsx` still checks for an update on launch.
10. Streak reminders use a date trigger and no longer declare `SCHEDULE_EXACT_ALARM`, so delivery can be inexact. Expo’s own changelog says exact alarms must be declared when a precise timer is required.

## Signing prerequisites (no credentials in this repo)

Android production profile in `eas.json` builds an App Bundle (`app-bundle`) on channel `production`. Submit config targets the Play **internal** track only and has no service-account path. First production build should use EAS-managed credentials unless you already created an upload key. Play Console still needs the app record, data-safety form, content rating, SMS declaration if `READ_SMS` ships, screenshots, and a privacy-policy URL.

iOS has a bundle id and usage strings, and no submit block (`ascAppId`, Apple team id, or ASC API key). A store build is `eas build --platform ios --profile production` after the Apple Developer account and App Store Connect record exist. That command was not run.

Installed React Native `0.81.5` pins `targetSdk` / `compileSdk` 36 in `node_modules/react-native/gradle/libs.versions.toml`. Play requires API 36 for new apps and updates as of 31 Aug 2026: <https://support.google.com/googleplay/android-developer/answer/11926878>. A generated manifest was not produced here, so the binary target is not verified.

## Do not do from this branch

- Do not push `main`.
- Do not run `eas build`, `eas submit`, or `eas update`.
- Do not run the preview APK or web-deploy workflows. Pushing `staging` still starts Android preview and web preview workflows that already exist.
- Demo sign-in remains `demo@financialcopilot.com` / `demo123` and opens an empty local session. It is not a server account.
