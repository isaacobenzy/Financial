/**
 * Dynamic Expo config so EXPO_PUBLIC_OPENROUTER_* from .env / EAS env
 * is available both via process.env (Metro) and Constants.expoConfig.extra.
 * Local `expo start` / `expo run:*` pick up .env; EAS builds need the same
 * vars set on the Expo project environment (preview / production).
 *
 * Uses the `config` argument (values from app.json) so expo-doctor accepts
 * having both a static app.json and this dynamic app.config.js.
 */
module.exports = ({ config }) => {
  const apiKey = process.env.EXPO_PUBLIC_OPENROUTER_API_KEY ?? '';
  const model = process.env.EXPO_PUBLIC_OPENROUTER_MODEL ?? '';

  return {
    ...config,
    extra: {
      ...(config.extra ?? {}),
      openRouterApiKey: apiKey,
      openRouterModel: model,
    },
  };
};
