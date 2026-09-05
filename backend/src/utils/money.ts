/**
 * All balances and ledger amounts are stored as integer kobo (1 naira =
 * 100 kobo) — the same unit Paystack's API uses. This sidesteps the
 * floating point rounding issues you get from storing money as a JS
 * `number` in naira with decimals.
 *
 * Only the HTTP boundary deals in naira: requests accept a naira amount,
 * responses return both.
 */

export function nairaToKobo(naira: number): number {
  return Math.round(naira * 100);
}

export function koboToNaira(kobo: number): number {
  return Math.round(kobo) / 100;
}
