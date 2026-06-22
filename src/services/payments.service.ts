import { Platform } from 'react-native';
import {
  initConnection,
  endConnection,
  fetchProducts,
  requestPurchase,
  purchaseUpdatedListener,
  purchaseErrorListener,
  finishTransaction,
  restorePurchases,
  getAvailablePurchases,
  ErrorCode,
  type Purchase,
  type ProductSubscription,
} from 'react-native-iap';

export const PRODUCT_ID = 'godsplan_unlimited_monthly';

export type PurchaseResult =
  | { success: true }
  | { success: false; error: string };

export async function initPayments(): Promise<void> {
  await initConnection();
}

export async function endPayments(): Promise<void> {
  await endConnection();
}

export type RestoreResult =
  | { found: true }
  | { found: false; error?: string };

export async function restoreSubscription(): Promise<RestoreResult> {
  try {
    await restorePurchases();
    const purchases = await getAvailablePurchases();
    const match = purchases.find((p) => p.productId === PRODUCT_ID);
    if (match) {
      try {
        await finishTransaction({ purchase: match, isConsumable: false });
      } catch {
        // non-fatal — subscription already active in the platform
      }
      return { found: true };
    }
    return { found: false };
  } catch (err) {
    return {
      found: false,
      error: err instanceof Error ? err.message : 'restore failed',
    };
  }
}

export async function purchaseSubscription(): Promise<PurchaseResult> {
  try {
    let offerToken: string | undefined;

    if (Platform.OS === 'android') {
      const products = await fetchProducts({ skus: [PRODUCT_ID], type: 'subs' });
      const sub = products?.[0] as ProductSubscription | undefined;
      // subscriptionOfferDetailsAndroid contains the offerToken required by Play Billing v5+
      const details = (sub as { subscriptionOfferDetailsAndroid?: { offerToken: string }[] } | undefined)
        ?.subscriptionOfferDetailsAndroid;
      offerToken = details?.[0]?.offerToken;
      // Play Billing v5+ rejects purchases without an offerToken — fail fast with a clear message
      if (!offerToken) {
        return { success: false, error: 'Subscription offer not available. Please try again later.' };
      }
    }

    return new Promise<PurchaseResult>((resolve) => {
      const updateSub = purchaseUpdatedListener(async (purchase: Purchase) => {
        try {
          await finishTransaction({ purchase, isConsumable: false });
        } catch {
          // finish errors are non-fatal — purchase already recorded by platform
        }
        updateSub.remove();
        errorSub.remove();
        resolve({ success: true });
      });

      const errorSub = purchaseErrorListener((error) => {
        updateSub.remove();
        errorSub.remove();
        if (error.code === ErrorCode.UserCancelled) {
          resolve({ success: false, error: '' }); // silent cancel
        } else {
          resolve({ success: false, error: error.message ?? 'purchase failed' });
        }
      });

      requestPurchase({
        type: 'subs',
        request: {
          apple: { sku: PRODUCT_ID },
          google: {
            skus: [PRODUCT_ID],
            ...(offerToken && {
              subscriptionOffers: [{ sku: PRODUCT_ID, offerToken }],
            }),
          },
        },
      }).catch((err: Error) => {
        updateSub.remove();
        errorSub.remove();
        resolve({ success: false, error: err.message ?? 'purchase failed' });
      });
    });
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'purchase failed' };
  }
}
