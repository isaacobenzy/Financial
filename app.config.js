/**
 * Dynamic Expo config so EXPO_PUBLIC_OPENROUTER_* from .env / EAS env
 * is available both via process.env (Metro) and Constants.expoConfig.extra.
 * Local `expo start` / `expo run:*` pick up .env; EAS builds need the same
 * vars set on the Expo project environment (preview / production).
 */
const appJson = require('./app.json');

module.exports = () => {
  const apiKey = process.env.EXPO_PUBLIC_OPENROUTER_API_KEY ?? '';
  const model = process.env.EXPO_PUBLIC_OPENROUTER_MODEL ?? '';

  return {
    ...appJson.expo,
    extra: {
      ...(appJson.expo.extra ?? {}),
      openRouterApiKey: apiKey,
      openRouterModel: model,
    },
  };
};
