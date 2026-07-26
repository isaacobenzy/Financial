import { Linking, PermissionsAndroid, Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { supportsSystemNotifications } from '@/lib/runtime';

export type PermissionId = 'sms' | 'storage' | 'notifications' | 'biometrics';

export type PermissionStatus = {
  id: PermissionId;
  label: string;
  description: string;
  granted: boolean;
  available: boolean;
  /** When true, tapping opens paste/import flow instead of OS permission */
  alternateAction?: 'paste-sms' | 'settings';
};

async function checkAndroidPermission(
  permission: (typeof PermissionsAndroid.PERMISSIONS)[keyof typeof PermissionsAndroid.PERMISSIONS],
): Promise<boolean> {
  try {
    return await PermissionsAndroid.check(permission);
  } catch {
    return false;
  }
}

function notificationStatusGranted(status: {
  status?: string;
  granted?: boolean;
  ios?: { status: number };
}): boolean {
  if (status.granted === true) return true;
  if (status.status === 'granted') return true;
  // iOS AuthorizationStatus: DENIED=1, AUTHORIZED=2, PROVISIONAL=3
  const iosStatus = status.ios?.status;
  return iosStatus === 2 || iosStatus === 3;
}

async function getNotificationGranted(): Promise<boolean> {
  // Avoid importing expo-notifications in Expo Go (throws on Android SDK 53+)
  if (!supportsSystemNotifications()) {
    if (Platform.OS === 'android' && Number(Platform.Version) >= 33) {
      return checkAndroidPermission(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
    }
    return false;
  }

  try {
    const Notifications = await import('expo-notifications');
    const settings = await Notifications.getPermissionsAsync();
    return notificationStatusGranted(settings as never);
  } catch {
    if (Platform.OS === 'android' && Number(Platform.Version) >= 33) {
      return checkAndroidPermission(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
    }
    return Platform.OS === 'android';
  }
}

async function requestNotificationPermission(): Promise<boolean> {
  if (!supportsSystemNotifications()) {
    if (Platform.OS === 'android' && Number(Platform.Version) >= 33) {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        {
          title: 'Notification permission',
          message: 'Get alerts for imports, goals, and streaks.',
          buttonPositive: 'Allow',
          buttonNegative: 'Deny',
        },
      );
      return result === PermissionsAndroid.RESULTS.GRANTED;
    }
    return false;
  }

  try {
    const Notifications = await import('expo-notifications');
    const result = await Notifications.requestPermissionsAsync();
    return notificationStatusGranted(result as never);
  } catch {
    if (Platform.OS === 'android' && Number(Platform.Version) >= 33) {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        {
          title: 'Notification permission',
          message: 'Get alerts when a budget is close to its limit.',
          buttonPositive: 'Allow',
          buttonNegative: 'Deny',
        },
      );
      return result === PermissionsAndroid.RESULTS.GRANTED;
    }
    return Platform.OS === 'android';
  }
}

export async function getPermissionStatuses(): Promise<PermissionStatus[]> {
  const { isBiometricHardwareAvailable, isBiometricUnlockEnabled, getBiometricLabel } =
    await import('@/lib/biometrics');
  const bioAvailable = await isBiometricHardwareAvailable();
  const bioEnabled = await isBiometricUnlockEnabled();
  const bioLabel = await getBiometricLabel();
  const notificationsGranted = await getNotificationGranted();

  if (Platform.OS === 'ios') {
    return [
      {
        id: 'sms',
        label: 'Paste SMS / alerts',
        description: 'iOS cannot read the SMS inbox — paste MoMo or bank texts instead',
        granted: false,
        available: true,
        alternateAction: 'paste-sms',
      },
      {
        id: 'storage',
        label: 'Files & documents',
        description: 'Pick PDF bank statements with the system file picker',
        granted: true,
        available: true,
      },
      {
        id: 'notifications',
        label: 'Notifications',
        description: 'Optional alerts for budgets and imports',
        granted: notificationsGranted,
        available: true,
      },
      {
        id: 'biometrics',
        label: bioLabel,
        description: bioAvailable
          ? 'Unlock the app and reveal a hidden balance'
          : 'Not available on this device',
        granted: bioEnabled,
        available: bioAvailable,
      },
    ];
  }

  if (Platform.OS !== 'android') {
    return [
      {
        id: 'sms',
        label: 'Paste SMS',
        description: 'Paste transaction messages into the ledger',
        granted: false,
        available: true,
        alternateAction: 'paste-sms',
      },
      {
        id: 'storage',
        label: 'Files & documents',
        description: 'Pick PDF bank statements',
        granted: true,
        available: true,
      },
      {
        id: 'notifications',
        label: 'Notifications',
        description: 'Optional alerts',
        granted: false,
        available: false,
      },
      {
        id: 'biometrics',
        label: 'Biometrics',
        description: 'Not available on web',
        granted: false,
        available: false,
      },
    ];
  }

  const smsGranted = await checkAndroidPermission(PermissionsAndroid.PERMISSIONS.READ_SMS);

  let storageGranted = true;
  if (Number(Platform.Version) >= 33) {
    storageGranted = await checkAndroidPermission(
      PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
    );
  } else {
    storageGranted = await checkAndroidPermission(
      PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
    );
  }

  return [
    {
      id: 'sms',
      label: 'Read SMS',
      description: 'Import MoMo and bank alerts from your inbox',
      granted: smsGranted,
      available: true,
    },
    {
      id: 'storage',
      label: 'Files & media',
      description: 'Upload PDF statements',
      granted: storageGranted,
      available: true,
    },
    {
      id: 'notifications',
      label: 'Notifications',
      description: 'Budget and import alerts',
      granted: notificationsGranted,
      available: true,
    },
    {
      id: 'biometrics',
      label: bioLabel,
      description: bioAvailable
        ? 'Unlock the app and reveal a hidden balance'
        : 'Not enrolled on this device',
      granted: bioEnabled,
      available: bioAvailable,
    },
  ];
}

export async function requestPermission(id: PermissionId): Promise<boolean> {
  if (id === 'biometrics') {
    const { enableBiometricUnlock, setBiometricUnlockEnabled, isBiometricUnlockEnabled } =
      await import('@/lib/biometrics');
    const already = await isBiometricUnlockEnabled();
    if (already) {
      await setBiometricUnlockEnabled(false);
      return false;
    }
    return enableBiometricUnlock();
  }

  if (id === 'notifications') {
    return requestNotificationPermission();
  }

  if (Platform.OS === 'ios') {
    if (id === 'storage') return true;
    if (id === 'sms') return false; // use paste flow
    return false;
  }

  if (Platform.OS !== 'android') {
    if (id === 'storage') return true;
    return false;
  }

  try {
    if (id === 'sms') {
      const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.READ_SMS, {
        title: 'SMS permission',
        message:
          'Financial Copilot needs SMS access to detect mobile money and bank transactions.',
        buttonPositive: 'Allow',
        buttonNegative: 'Deny',
        buttonNeutral: 'Ask later',
      });
      return result === PermissionsAndroid.RESULTS.GRANTED;
    }

    if (id === 'storage') {
      if (Number(Platform.Version) >= 33) {
        const result = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
          {
            title: 'Files permission',
            message: 'Allow access so you can upload PDF bank statements.',
            buttonPositive: 'Allow',
            buttonNegative: 'Deny',
          },
        );
        return result === PermissionsAndroid.RESULTS.GRANTED;
      }

      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
        {
          title: 'Storage permission',
          message: 'Allow storage access so you can upload PDF bank statements.',
          buttonPositive: 'Allow',
          buttonNegative: 'Deny',
        },
      );
      return result === PermissionsAndroid.RESULTS.GRANTED;
    }
  } catch {
    return false;
  }

  return false;
}

export async function requestAllAppPermissions(): Promise<PermissionStatus[]> {
  if (Platform.OS === 'android') {
    await requestPermission('sms');
    await requestPermission('storage');
  }
  await requestPermission('notifications');
  return getPermissionStatuses();
}

export async function openAppSettings(): Promise<void> {
  await Linking.openSettings();
}

/** Smoke-test document access via the system picker (does not keep the file). */
export async function probeDocumentAccess(): Promise<boolean> {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: false,
    });
    return !result.canceled;
  } catch {
    return false;
  }
}
