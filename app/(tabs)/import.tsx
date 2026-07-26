import { Redirect } from 'expo-router';

/** Hidden tab stub — use /import-sms stack route. */
export default function ImportTabRedirect() {
  return <Redirect href="/import-sms" />;
}
