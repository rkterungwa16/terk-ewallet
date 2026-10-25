import type { Transaction } from '../types/domain';

/**
 * Derived figures for the dashboard. Every number here is computed from
 * real transactions; "spent" means settled money out of the wallet
 * (transfers sent and withdrawals). Pending and failed rows are excluded
 * because they haven't changed the balance.
 */

function spentNaira(transaction: Transaction): number {
  return transaction.status === 'success' && transaction.amountNaira < 0
    ? Math.abs(transaction.amountNaira)
    : 0;
}

function receivedNaira(transaction: Transaction): number {
  return transaction.status === 'success' && transaction.amountNaira > 0
    ? transaction.amountNaira
    : 0;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Settled money in or out for this calendar month vs. the previous one. */
export function monthlyTotals(
  transactions: readonly Transaction[],
  direction: 'in' | 'out',
  now = new Date(),
) {
  const amountOf = direction === 'in' ? receivedNaira : spentNaira;
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  let thisMonth = 0;
  let lastMonth = 0;

  for (const transaction of transactions) {
    const created = new Date(transaction.createdAt);
    if (created >= thisMonthStart) thisMonth += amountOf(transaction);
    else if (created >= lastMonthStart) lastMonth += amountOf(transaction);
  }

  const changePercent = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : undefined;
  return { thisMonth, lastMonth, changePercent };
}

export interface DaySpend {
  date: Date;
  total: number;
}

/** Spending per day for the last seven days, oldest first, ending today. */
export function weeklySpending(transactions: readonly Transaction[], now = new Date()): DaySpend[] {
  const today = startOfDay(now);
  const days: DaySpend[] = Array.from({ length: 7 }, (_, index) => ({
    date: new Date(today.getFullYear(), today.getMonth(), today.getDate() - (6 - index)),
    total: 0,
  }));

  for (const transaction of transactions) {
    const day = startOfDay(new Date(transaction.createdAt)).getTime();
    const bucket = days.find((entry) => entry.date.getTime() === day);
    if (bucket) bucket.total += spentNaira(transaction);
  }

  return days;
}

export function transactionsToCsv(transactions: readonly Transaction[]): string {
  const header = ['Date', 'Type', 'Status', 'Amount (NGN)', 'Channel', 'Reference', 'Counterparty'];
  const rows = transactions.map((transaction) => [
    transaction.createdAt,
    transaction.operation,
    transaction.status,
    transaction.amountNaira.toFixed(2),
    transaction.channel,
    transaction.reference,
    transaction.destinationAccountNumber ?? '',
  ]);

  return [header, ...rows]
    .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
    .join('\n');
}

export function downloadCsv(filename: string, csv: string): void {
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
