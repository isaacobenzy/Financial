import { Redirect } from 'expo-router';

/** Legacy path — Import SMS lives at /import-sms */
export default function ExploreRedirect() {
  return <Redirect href="/import-sms" />;
}
