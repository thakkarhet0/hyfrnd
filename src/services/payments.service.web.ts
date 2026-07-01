export const PRODUCT_ID = 'godsplan_unlimited_monthly';

export type PurchaseResult =
  | { success: true }
  | { success: false; error: string };

export async function initPayments(): Promise<void> {
  // no-op on web
}

export async function endPayments(): Promise<void> {
  // no-op on web
}

export type RestoreResult =
  | { found: true }
  | { found: false; error?: string };

export async function restoreSubscription(): Promise<RestoreResult> {
  return { found: false, error: 'In-app purchases are not supported on web.' };
}

export async function purchaseSubscription(): Promise<PurchaseResult> {
  return { success: false, error: 'In-app purchases are not supported on web.' };
}
