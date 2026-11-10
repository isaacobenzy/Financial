/**
 * Static Expo config passthrough.
 *
 * Do not read EXPO_PUBLIC_OPENROUTER_API_KEY (or any provider secret) here.
 * Expo inlines EXPO_PUBLIC_* into the native binary and the web bundle.
 * This repo has no authenticated backend, so chat stays off instead of
 * shipping a billable key. See lib/openrouter.ts.
 */
module.exports = ({ config }) => {
  const extra = { ...(config.extra ?? {}) };
  delete extra.openRouterApiKey;
  delete extra.openRouterModel;
  return { ...config, extra };
};
