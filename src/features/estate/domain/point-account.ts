import type { EstatePointAccount, EstateTransaction } from "./types";

export function normalizeEstatePointAmount(value: number): number {
  if (!Number.isFinite(value)) return 0;

  return Math.max(0, Math.floor(value));
}

export function calculateEstateSpentPoints(
  transactions: readonly EstateTransaction[],
): number {
  return transactions.reduce((sum, transaction) => {
    if (transaction.pointDelta >= 0) return sum;

    return sum + Math.abs(transaction.pointDelta);
  }, 0);
}

export function calculateEstatePointAccount(
  earnedPoints: number,
  transactions: readonly EstateTransaction[],
): EstatePointAccount {
  const normalizedEarnedPoints = normalizeEstatePointAmount(earnedPoints);
  const spentPoints = calculateEstateSpentPoints(transactions);

  return {
    earnedPoints: normalizedEarnedPoints,
    spentPoints,
    availablePoints: Math.max(0, normalizedEarnedPoints - spentPoints),
  };
}

export function hasEnoughEstatePoints(
  earnedPoints: number,
  transactions: readonly EstateTransaction[],
  cost: number,
): boolean {
  if (!Number.isInteger(cost) || cost < 0) return false;

  return (
    calculateEstatePointAccount(earnedPoints, transactions).availablePoints >=
    cost
  );
}
