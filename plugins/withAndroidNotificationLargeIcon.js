/**
 * Sets expo.modules.notifications.large_notification_icon so Android shade
 * notifications show the full-color app logo (iOS-style large icon).
 *
 * Uses only Node fs + expo/config-plugins — no @expo/image-utils (pnpm/EAS
 * cannot resolve that package from a root-level plugin path).
 */
const {
  withDangerousMod,
  withAndroidManifest,
  AndroidConfig,
} = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const META_KEY = 'expo.modules.notifications.large_notification_icon';
const RESOURCE_NAME = 'notification_large_icon';
const ANDROID_RES = 'android/app/src/main/res';

const DRAWABLE_FOLDERS = [
  'drawable-mdpi',
  'drawable-hdpi',
  'drawable-xhdpi',
  'drawable-xxhdpi',
  'drawable-xxxhdpi',
];

function resolveIcon(projectRoot, iconPath) {
  const absolute = path.isAbsolute(iconPath)
    ? iconPath
    : path.resolve(projectRoot, iconPath);
  if (!fs.existsSync(absolute)) {
    throw new Error(
      `[withAndroidNotificationLargeIcon] Icon not found: ${absolute}`,
    );
  }
  return absolute;
}

function writeLargeIcons(projectRoot, iconPath) {
  const source = resolveIcon(projectRoot, iconPath);
  for (const folderName of DRAWABLE_FOLDERS) {
    const folder = path.resolve(projectRoot, ANDROID_RES, folderName);
    if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });
    fs.copyFileSync(
      source,
      path.resolve(folder, `${RESOURCE_NAME}.png`),
    );
  }
}

function withAndroidNotificationLargeIcon(config, props = {}) {
  const icon =
    props.icon ||
    config.android?.adaptiveIcon?.foregroundImage ||
    config.icon ||
    './assets/images/icon.png';

  config = withDangerousMod(config, [
    'android',
    (cfg) => {
      writeLargeIcons(cfg.modRequest.projectRoot, icon);
      return cfg;
    },
  ]);

  config = withAndroidManifest(config, (cfg) => {
    const mainApplication = AndroidConfig.Manifest.getMainApplicationOrThrow(
      cfg.modResults,
    );
    AndroidConfig.Manifest.addMetaDataItemToMainApplication(
      mainApplication,
      META_KEY,
      `@drawable/${RESOURCE_NAME}`,
      'resource',
    );
    return cfg;
  });

  return config;
}

module.exports = withAndroidNotificationLargeIcon;
