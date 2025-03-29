type Transaction = {
  id: string;
  amount: number;
  type: 'income' | 'expense';
  date: string;
  merchant: string;
  category: string;
  description: string;
  source: 'sms' | 'pdf';
  rawText?: string;
};

type Bank = {
  name: string;
  patterns: {
    amount: RegExp;
    type: RegExp;
    merchant?: RegExp;
    date?: RegExp;
  };
};

const BANKS: Bank[] = [
  {
    name: 'MTN Mobile Money',
    patterns: {
      amount: /GHS\s*([\d,]+\.?\d*)/i,
      type: /(paid|received|withdrawn|sent|deposited)/i,
      merchant: /from\s+(.+?)\s+(?:at|on|ref)/i,
      date: /(\d{2}\/\d{2}\/\d{2,4})/,
    },
  },
  {
    name: 'Standard Chartered',
    patterns: {
      amount: /GHS\s*([\d,]+\.?\d*)/i,
      type: /(credit|debit|payment|transfer)/i,
      merchant: /to\s+(.+?)\s+(?:at|on|ref)/i,
      date: /(\d{2}\/\d{2}\/\d{2,4})/,
    },
  },
];

const CATEGORIES = {
  food: ['restaurant', 'food', 'uber eats', 'groceries', 'shoprite'],
  transport: ['uber', 'bolt', 'taxi', 'transport', 'fuel'],
  shopping: ['mall', 'shop', 'store', 'market'],
  utilities: ['water', 'electricity', 'ecg', 'gwcl', 'dstv'],
  salary: ['salary', 'payroll', 'payment'],
  entertainment: ['cinema', 'movie', 'game', 'spotify'],
};

const categorizeTransaction = (description: string): string => {
  description = description.toLowerCase();
  
  for (const [category, keywords] of Object.entries(CATEGORIES)) {
    if (keywords.some(keyword => description.includes(keyword))) {
      return category;
    }
  }
  
  return 'other';
};

export const parseSMS = (message: string): Transaction | null => {
  for (const bank of BANKS) {
    const amountMatch = message.match(bank.patterns.amount);
    const typeMatch = message.match(bank.patterns.type);
    const merchantMatch = bank.patterns.merchant ? message.match(bank.patterns.merchant) : null;
    const dateMatch = bank.patterns.date ? message.match(bank.patterns.date) : null;

    if (amountMatch && typeMatch) {
      const amount = parseFloat(amountMatch[1].replace(/,/g, ''));
      const type = typeMatch[1].toLowerCase();
      const isExpense = ['paid', 'debit', 'withdrawn', 'sent'].some(t => type.includes(t));
      
      const transaction: Transaction = {
        id: Date.now().toString(),
        amount: isExpense ? -amount : amount,
        type: isExpense ? 'expense' : 'income',
        date: dateMatch ? dateMatch[1] : new Date().toISOString().split('T')[0],
        merchant: merchantMatch ? merchantMatch[1].trim() : 'Unknown',
        category: 'uncategorized',
        description: message,
        source: 'sms',
        rawText: message,
      };

      transaction.category = categorizeTransaction(transaction.merchant);
      
      return transaction;
    }
  }
  
  return null;
};