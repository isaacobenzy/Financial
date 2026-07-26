/**
 * Sets expo.modules.notifications.large_notification_icon so Android shade
 * notifications show the full-color app logo (iOS-style large icon).
 * Small status-bar icon remains the white glyph from expo-notifications.
 */
const {
  withDangerousMod,
  withAndroidManifest,
  AndroidConfig,
} = require('expo/config-plugins');
const { generateImageAsync } = require('@expo/image-utils');
const fs = require('fs');
const path = require('path');

const META_KEY = 'expo.modules.notifications.large_notification_icon';
const RESOURCE_NAME = 'notification_large_icon';
const ANDROID_RES = 'android/app/src/main/res';
/** 64dp baseline — Android large notification icon */
const BASELINE_PX = 64;

const DPI = {
  mdpi: 1,
  hdpi: 1.5,
  xhdpi: 2,
  xxhdpi: 3,
  xxxhdpi: 4,
};

async function writeLargeIcons(projectRoot, iconPath) {
  await Promise.all(
    Object.entries(DPI).map(async ([dpi, scale]) => {
      const folder = path.resolve(projectRoot, ANDROID_RES, `drawable-${dpi}`);
      if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });
      const size = Math.round(BASELINE_PX * scale);
      const { source } = await generateImageAsync(
        { projectRoot, cacheType: 'android-notification-large' },
        {
          src: iconPath,
          width: size,
          height: size,
          resizeMode: 'cover',
          backgroundColor: 'transparent',
        },
      );
      fs.writeFileSync(path.resolve(folder, `${RESOURCE_NAME}.png`), source);
    }),
  );
}

function withAndroidNotificationLargeIcon(config, props = {}) {
  const icon =
    props.icon ||
    config.android?.adaptiveIcon?.foregroundImage ||
    config.icon ||
    './assets/images/icon.png';

  config = withDangerousMod(config, [
    'android',
    async (cfg) => {
      await writeLargeIcons(cfg.modRequest.projectRoot, icon);
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
