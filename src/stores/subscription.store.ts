import { create } from 'zustand';

interface SubscriptionState {
  plan_tier: 'free' | 'unlimited';
  contact_count: number;
  setPlanTier: (tier: 'free' | 'unlimited') => void;
  setContactCount: (count: number) => void;
}

export const useSubscriptionStore = create<SubscriptionState>((set) => ({
  plan_tier: 'free',
  contact_count: 0,
  setPlanTier: (plan_tier) => set({ plan_tier }),
  setContactCount: (contact_count) => set({ contact_count }),
}));
