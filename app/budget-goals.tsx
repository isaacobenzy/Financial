import { Redirect } from 'expo-router';

/** Legacy route — Goals now live in the Goals tab. */
export default function BudgetGoalsRedirect() {
  return <Redirect href="/(tabs)/goals" />;
}
