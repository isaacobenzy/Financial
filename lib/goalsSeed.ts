/** Seed goals — kept separate to avoid financeContext ↔ goalsStore cycles. */
export const SEED_GOALS = [
  { name: 'Food & Dining', spent: 850, budget: 1000, icon: 'food' },
  { name: 'Transportation', spent: 300, budget: 500, icon: 'car' },
  { name: 'Shopping', spent: 1200, budget: 1000, icon: 'shopping' },
  { name: 'Bills & Utilities', spent: 450, budget: 600, icon: 'lightning-bolt' },
] as const;
