# Disclosure drafts — owner confirmation required

These paragraphs are drafts for store forms and a future privacy notice. They are not a published privacy policy, not legal advice, and not shown in the app as a policy. Do not paste them into Google Play or App Store Connect until the owner confirms they match the shipped build.

The app is a personal ledger and goal tracker for Ghana cedis, plus an assistant that is off. It does not move money, hold a balance at a bank, or place investments. That description is from the code in this repository. It is not a statement that any regulator has licensed or exempted the app.

## Short description draft

Track mobile-money and bank alerts on your phone, set goals, and hide amounts. AI answers are not available in this version.

## Data the current build handles

- Account name, email, and optional phone, stored on the device.
- A password verifier (PBKDF2), stored on the device. New installs do not store the password itself. An older install may still have the original password until that person signs in once.
- Transactions the person imports or pastes, and goals they save, on the device.
- On Android, if the person accepts the in-app explanation and the system prompt, the app can read SMS to look for financial alerts. Matching text is parsed on the phone.
- This version does not send the ledger to OpenRouter or any other model provider. There is no server account to delete.

## In-app SMS disclosure (already in the import screen)

On Android, this screen can ask to read SMS so it can look for mobile-money and bank alerts. Matching messages are parsed on this phone. This version does not upload SMS to a server. You can skip this and paste an alert instead.

## Deletion draft

Draft only. Do not publish this as a policy.

Deleting an account in Settings removes that sign-in record on the phone. It does not clear the ledger or goals, because those are shared by every profile on the phone. A separate action clears that shared ledger and goals and leaves other account records in place. Neither action contacts a server. A password verifier does not encrypt the ledger. A web deletion page does not exist yet. Google asks apps that create accounts for an in-app path and a web link: https://support.google.com/googleplay/android-developer/answer/13327111

## AI draft, if a server is added later

Do not ship this paragraph until a server exists. If the owner adds one, the notice must name the operator, what is sent (balance, transactions, goals), why, and how to turn it off. The in-app switch only records consent on the phone today. It does not send data.

## What not to claim

- Do not call the app a bank, wallet, payment service, or licensed adviser.
- Do not say SMS parsing “stays on your phone” as a blanket promise if a later build uploads ledger text.
- Do not say biometrics or a password hash encrypt the ledger. Biometrics lock the screen for a short time. The hash only checks the password.
- Do not set `ITSAppUsesNonExemptEncryption` until the owner answers Apple’s export question. This repo does not declare that flag.
- Do not say PDF import works.
