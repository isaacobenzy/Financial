import AsyncStorage from '@react-native-async-storage/async-storage';

const CONSENT_KEY = 'financial_share_consent_v1';

/**
 * There is no authenticated backend in this repo. A client-held OpenRouter key
 * would be compiled into the binary, so chat cannot send ledger data.
 * Consent is stored for a future server the owner chooses. This build never
 * treats consent as permission to call a provider from the phone.
 */
export type ShareBlockReason = 'consent_required' | 'unconfigured';

export type ShareDecision =
  | { ok: false; reason: ShareBlockReason; message: string };

const MESSAGES: Record<ShareBlockReason, string> = {
  consent_required:
    'Sharing is off. Your ledger stays on this phone until you agree to send it to a server you control. This build has no server, so nothing is sent either way.',
  unconfigured:
    'AI is off. This app does not include a provider API key, and there is no backend to answer from your ledger. Nothing was sent.',
};

export function isAiConfigured(): boolean {
  return false;
}

export async function hasFinancialShareConsent(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(CONSENT_KEY)) === '1';
  } catch {
    return false;
  }
}

export async function setFinancialShareConsent(allowed: boolean): Promise<void> {
  if (allowed) await AsyncStorage.setItem(CONSENT_KEY, '1');
  else await AsyncStorage.removeItem(CONSENT_KEY);
}

export async function clearFinancialShareConsent(): Promise<void> {
  await AsyncStorage.removeItem(CONSENT_KEY);
}

/** Consent is checked first. Even with consent, this build does not send. */
export async function decideFinancialShare(): Promise<ShareDecision> {
  const consent = await hasFinancialShareConsent();
  if (!consent) return { ok: false, reason: 'consent_required', message: MESSAGES.consent_required };
  return { ok: false, reason: 'unconfigured', message: MESSAGES.unconfigured };
}
