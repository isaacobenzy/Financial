import { PermissionsAndroid, Platform } from 'react-native';
import { requestPermission } from '@/lib/permissions';

describe('SMS permission disclosure', () => {
  const originalOs = Platform.OS;

  afterEach(() => {
    Platform.OS = originalOs;
    jest.restoreAllMocks();
  });

  it('does not open the Android SMS prompt before the in-app disclosure is accepted', async () => {
    Platform.OS = 'android';
    jest.spyOn(PermissionsAndroid, 'check').mockResolvedValue(false);
    const request = jest
      .spyOn(PermissionsAndroid, 'request')
      .mockResolvedValue(PermissionsAndroid.RESULTS.GRANTED);

    await expect(requestPermission('sms')).resolves.toBe(false);
    expect(request).not.toHaveBeenCalled();

    await expect(requestPermission('sms', { disclosureAccepted: true })).resolves.toBe(true);
    expect(request).toHaveBeenCalledTimes(1);
  });
});
