# Ledger total migration — not implemented

Owner confirmation is required before any rewrite of balances already saved on a phone. This document is a proposal, not a privacy policy and not a claim that a store rule is met.

## What the app does now

- A new install, with no saved balance, totals income minus expenses. It does not add GH₵ 12,500, and it does not insert sample merchants.
- If `ledger_balance_v1` is already on the device, opening the app returns that saved total, income, expenses, and import count unchanged.
- A later import adjusts the saved total only by the change in income and expenses, unless the imported alert itself states an available balance. The app does not scan for the pattern `12500 + income - expenses` and does not subtract 12,500 on its own.
- Imported transaction rows are not deleted by opening the app.

## Why there is no automatic rewrite

Older builds added GH₵ 12,500 when they computed a total. A saved total that equals `12500 + income - expenses` can also be a real balance. Subtracting 12,500 without the person asking would change money the app is showing as theirs.

## Proposed opt-in, after the owner approves the copy

Do not ship this control until the owner confirms the wording and the rule.

1. Show it only when a saved total exists.
2. Explain that some older installs added a sample opening figure of GH₵ 12,500, and that this phone cannot tell that figure apart from a real balance.
3. Require an explicit action, separate from sign-in, import, and account deletion. Suggested label: "Subtract GH₵ 12,500 from the saved total on this phone."
4. Apply that subtraction once, to the saved total only. Do not delete transaction rows.
5. Offer no automatic run on launch, update, or the next import.

Until that control exists, saved totals stay as they were stored.
