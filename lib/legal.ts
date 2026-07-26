export const TERMS_VERSION = '2026-07-26';

export type LegalSection = {
  title: string;
  body: string;
};

export const TERMS_LAST_UPDATED = '26 July 2026';

export const TERMS_INTRO =
  'These Terms & Conditions (“Terms”) govern your use of Financial Copilot (the “App”). By creating an account or continuing to use the App, you agree to these Terms.';

export const TERMS_SECTIONS: LegalSection[] = [
  {
    title: '1. About the App',
    body:
      'Financial Copilot is a personal finance companion that helps you organise transactions, budgets, goals, and insights. The App is provided for personal, non-commercial use unless we agree otherwise in writing.',
  },
  {
    title: '2. Accounts & security',
    body:
      'You are responsible for keeping your login credentials confidential and for activity under your account. Choose a strong password and enable device biometrics where available. Notify us promptly if you suspect unauthorised access. We may suspend access where we reasonably believe security or misuse risk exists.',
  },
  {
    title: '3. On-device storage',
    body:
      'Your ledger data is stored primarily on your device (and related secure device storage). You are responsible for device backups, loss, theft, and factory resets. Clearing app data or uninstalling may permanently remove local information.',
  },
  {
    title: '4. SMS, imports & permissions',
    body:
      'If you grant SMS, file, or notification permissions, the App may parse messages or documents you choose to import in order to extract transaction candidates. Parsing is intended to run locally on your device. You control what you import and can revoke permissions in system settings.',
  },
  {
    title: '5. AI features',
    body:
      'Optional AI assistance may send limited ledger context to a third-party model provider to generate suggestions. AI output can be inaccurate or incomplete. Do not treat AI responses as professional financial, tax, legal, or investment advice. Review outputs before acting.',
  },
  {
    title: '6. Not financial advice',
    body:
      'Financial Copilot provides informational tools only. Nothing in the App constitutes professional advice or a recommendation to buy, sell, or hold any product. Decisions you make based on the App are solely your responsibility.',
  },
  {
    title: '7. Acceptable use',
    body:
      'You agree not to misuse the App, attempt to disrupt services, reverse engineer except where permitted by law, upload unlawful content, or use the App in a way that violates applicable regulations or third-party rights.',
  },
  {
    title: '8. Availability & changes',
    body:
      'We may update, improve, or discontinue features. We may revise these Terms from time to time. Material updates will be reflected by a new “Last updated” date and Terms version. Continued use after an update constitutes acceptance of the revised Terms.',
  },
  {
    title: '9. Limitation of liability',
    body:
      'To the fullest extent permitted by law, Financial Copilot and its contributors are not liable for indirect, incidental, special, consequential, or punitive damages, or for loss of data, profits, or business opportunities arising from your use of the App. Where liability cannot be excluded, it is limited to the greater of fees you paid us for the App in the prior 12 months or USD 50.',
  },
  {
    title: '10. Privacy summary',
    body:
      'We design the App to keep sensitive ledger information on your device whenever practical. Third-party services (for example AI providers or app stores) process only what is needed for the feature you use, subject to their own policies. Review in-app privacy notes and system permission prompts before enabling optional features.',
  },
  {
    title: '11. Termination',
    body:
      'You may stop using the App at any time by signing out and deleting the App or its data. We may terminate or restrict access if you breach these Terms or if continued operation becomes impractical or unlawful.',
  },
  {
    title: '12. Contact',
    body:
      'Questions about these Terms can be directed through the project repository or the support channel listed in the App store listing / project README for your build.',
  },
];

export function termsAcceptanceLabel(accepted: boolean): string {
  return accepted
    ? 'You have accepted the Terms & Conditions'
    : 'Please accept the Terms & Conditions to continue';
}
