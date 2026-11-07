import AsyncStorage from '@react-native-async-storage/async-storage';
import { decideFinancialShare, setFinancialShareConsent } from '@/lib/aiShare';
import { askOpenRouter } from '@/lib/openrouter';

describe('financial data sharing', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    global.fetch = jest.fn();
  });

  it('requires consent and still does not call a provider when consent is on', async () => {
    const blocked = await decideFinancialShare();
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.reason).toBe('consent_required');

    await setFinancialShareConsent(true);
    const unconfigured = await decideFinancialShare();
    expect(unconfigured.ok).toBe(false);
    if (!unconfigured.ok) expect(unconfigured.reason).toBe('unconfigured');

    await expect(askOpenRouter('What did I spend?')).rejects.toThrow(/nothing was sent/i);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
