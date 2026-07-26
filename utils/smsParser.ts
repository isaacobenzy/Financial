import type { Transaction } from '@/lib/financeContext';

export type ParsedSms = Transaction & {
  description: string;
  source: 'sms';
  rawText?: string;
  reportedBalance?: number | null;
};

/** Ghana MoMo / bank senders we treat as financial. */
export const GHANA_FINANCIAL_SENDERS = [
  'mtn',
  'momo',
  'vodafone',
  'telecel',
  'airteltigo',
  'at money',
  'gcb',
  'ecobank',
  'stanbic',
  'absa',
  'calbank',
  'fidelity',
  'zenith',
  'uba',
  'access',
  'republic',
  'adb',
  'prudential',
  'gtbank',
  'firstbank',
];

const FINANCIAL_KEYWORDS =
  /(ghs|gh₵|ghc|credited|debited|received|sent|paid|withdrawn|deposited|payment|transfer|balance|momo|mobile money|available bal)/i;

const CATEGORIES: Record<string, string[]> = {
  food: ['restaurant', 'food', 'uber eats', 'groceries', 'shoprite', 'kfc', 'supermarket'],
  transport: ['uber', 'bolt', 'taxi', 'transport', 'fuel'],
  shopping: ['mall', 'shop', 'store', 'market'],
  utilities: ['water', 'electricity', 'ecg', 'gwcl', 'dstv', 'prepaid'],
  salary: ['salary', 'payroll'],
  entertainment: ['cinema', 'movie', 'game', 'spotify'],
};

function categorizeTransaction(text: string): string {
  const lower = text.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORIES)) {
    if (keywords.some((keyword) => lower.includes(keyword))) {
      return category;
    }
  }
  return 'other';
}

function isExpenseType(typeWord: string): boolean {
  return ['paid', 'debit', 'debited', 'withdrawn', 'sent', 'purchase'].some((t) =>
    typeWord.includes(t),
  );
}

export function isFinancialSms(address: string, body: string): boolean {
  const sender = address.toLowerCase();
  if (sender === 'pasted' || sender.includes('paste')) {
    return FINANCIAL_KEYWORDS.test(body) || /(?:GHS|GH₵|GHC)\s*[\d,]+/i.test(body);
  }
  const senderHit = GHANA_FINANCIAL_SENDERS.some((s) => sender.includes(s));
  return senderHit || FINANCIAL_KEYWORDS.test(body);
}

export function extractReportedBalance(body: string): number | null {
  const match = body.match(
    /(?:current|available|avail(?:able)?\.?)\s*bal(?:ance)?[:\s]*\s*(?:GHS|GH₵|GHC)?\s*([\d,]+\.?\d*)/i,
  );
  if (!match) return null;
  const value = parseFloat(match[1].replace(/,/g, ''));
  return Number.isFinite(value) ? value : null;
}

export const parseSMS = (
  message: string,
  meta?: { id?: string; date?: string; address?: string },
): ParsedSms | null => {
  if (meta?.address && !isFinancialSms(meta.address, message) && !FINANCIAL_KEYWORDS.test(message)) {
    return null;
  }

  const amountMatch = message.match(/(?:GHS|GH₵|GHC)\s*([\d,]+\.?\d*)/i);
  if (!amountMatch) return null;

  const typeMatch = message.match(
    /(credited|debited|received|sent|paid|withdrawn|deposited|payment|transfer|credit|debit)/i,
  );
  if (!typeMatch) return null;

  const amount = parseFloat(amountMatch[1].replace(/,/g, ''));
  if (Number.isNaN(amount)) return null;

  const typeWord = typeMatch[1].toLowerCase();
  const expense = isExpenseType(typeWord);

  const merchantMatch =
    message.match(/(?:from|to|at)\s+([A-Za-z0-9 .,&-]{2,40})/i) ||
    message.match(/([A-Z][A-Za-z0-9 .,&-]{2,30})\s+(?:Current|Available|Fee|Ref)/);

  const date =
    meta?.date && /^\d+$/.test(meta.date)
      ? new Date(parseInt(meta.date, 10)).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];

  const merchant = merchantMatch?.[1]?.trim() || meta?.address?.trim() || 'SMS transfer';

  const uniqueId = `sms-${meta?.id ?? 'x'}-${date}-${Math.abs(amount)}-${merchant}`
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .slice(0, 80);

  return {
    id: uniqueId,
    amount: expense ? -Math.abs(amount) : Math.abs(amount),
    type: expense ? 'expense' : 'income',
    date,
    merchant,
    category: categorizeTransaction(`${merchant} ${message}`),
    description: message,
    source: 'sms',
    rawText: message,
    reportedBalance: extractReportedBalance(message),
  };
};

export function parseSmsList(
  messages: Array<{ id: string; body: string; date: string; address: string }>,
): { transactions: Transaction[]; latestReportedBalance: number | null } {
  const parsed = messages
    .filter((m) => isFinancialSms(m.address, m.body))
    .map((m) => parseSMS(m.body, { id: m.id, date: m.date, address: m.address }))
    .filter((t): t is ParsedSms => Boolean(t));

  let latestReportedBalance: number | null = null;
  for (const item of parsed) {
    if (typeof item.reportedBalance === 'number') {
      latestReportedBalance = item.reportedBalance;
      break; // messages are usually newest-first
    }
  }

  const transactions = parsed.map(({ description: _d, source: _s, rawText: _r, reportedBalance: _b, ...tx }) => tx);
  return { transactions, latestReportedBalance };
}
