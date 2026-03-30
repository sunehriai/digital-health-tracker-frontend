/**
 * Subscription Service — wraps RevenueCat SDK with flag-off fallback.
 *
 * When EXPO_PUBLIC_SUBSCRIPTION_ENABLED is false (or SDK unavailable),
 * all methods return mock "premium" data so the app behaves as before.
 */

import { Platform } from 'react-native';

const SUBSCRIPTION_ENABLED = process.env.EXPO_PUBLIC_SUBSCRIPTION_ENABLED === 'true';

// RevenueCat SDK is lazily imported — may not be installed yet
let Purchases: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  Purchases = require('react-native-purchases').default;
} catch {
  // SDK not installed — will use mock mode
}

export interface CustomerInfo {
  hasActiveSubscription: boolean;
  isInTrial: boolean;
  expirationDate: string | null;
}

export interface SubscriptionPackage {
  identifier: string;
  title: string;
  priceString: string;
  product: { price: number };
}

class SubscriptionService {
  private initialized = false;

  /** Initialize RevenueCat SDK. Safe to call multiple times. */
  async initialize(): Promise<void> {
    if (!SUBSCRIPTION_ENABLED || !Purchases || this.initialized) return;

    const apiKey = Platform.select({
      android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
      ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
    });

    if (!apiKey) return;

    try {
      Purchases.configure({ apiKey });
      this.initialized = true;
    } catch (e) {
      console.warn('RevenueCat init failed:', e);
    }
  }

  /** Link RevenueCat customer to Firebase UID. */
  async linkCustomer(firebaseUID: string): Promise<void> {
    if (!SUBSCRIPTION_ENABLED || !Purchases || !this.initialized) return;
    try {
      await Purchases.logIn(firebaseUID);
    } catch (e) {
      console.warn('RevenueCat linkCustomer failed:', e);
    }
  }

  /** Get current customer subscription info. */
  async getCustomerInfo(): Promise<CustomerInfo> {
    if (!SUBSCRIPTION_ENABLED || !Purchases || !this.initialized) {
      return { hasActiveSubscription: true, isInTrial: false, expirationDate: null };
    }

    try {
      const info = await Purchases.getCustomerInfo();
      const entitlement = info.entitlements?.active?.['full_access'];
      return {
        hasActiveSubscription: !!entitlement,
        isInTrial: entitlement?.periodType === 'trial',
        expirationDate: entitlement?.expirationDate ?? null,
      };
    } catch {
      // Network error — return mock premium to avoid lockout
      return { hasActiveSubscription: true, isInTrial: false, expirationDate: null };
    }
  }

  /** Get available subscription packages. */
  async getAvailablePackages(): Promise<SubscriptionPackage[]> {
    if (!SUBSCRIPTION_ENABLED || !Purchases || !this.initialized) return [];
    try {
      const offerings = await Purchases.getOfferings();
      return offerings.current?.availablePackages ?? [];
    } catch {
      return [];
    }
  }

  /** Purchase a subscription package. */
  async purchasePackage(pkg: SubscriptionPackage): Promise<CustomerInfo> {
    if (!Purchases || !this.initialized) {
      return { hasActiveSubscription: true, isInTrial: false, expirationDate: null };
    }
    const result = await Purchases.purchasePackage(pkg);
    const entitlement = result.customerInfo?.entitlements?.active?.['full_access'];
    return {
      hasActiveSubscription: !!entitlement,
      isInTrial: entitlement?.periodType === 'trial',
      expirationDate: entitlement?.expirationDate ?? null,
    };
  }

  /** Restore purchases (for users who reinstalled). */
  async restorePurchases(): Promise<CustomerInfo> {
    if (!Purchases || !this.initialized) {
      return { hasActiveSubscription: true, isInTrial: false, expirationDate: null };
    }
    const info = await Purchases.restorePurchases();
    const entitlement = info.entitlements?.active?.['full_access'];
    return {
      hasActiveSubscription: !!entitlement,
      isInTrial: entitlement?.periodType === 'trial',
      expirationDate: entitlement?.expirationDate ?? null,
    };
  }

  /** Whether the subscription feature flag is enabled. */
  get isEnabled(): boolean {
    return SUBSCRIPTION_ENABLED;
  }
}

export const subscriptionService = new SubscriptionService();
