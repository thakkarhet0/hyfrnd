import { create } from 'zustand';

import { DEFAULT_LANGUAGE, LanguageCode } from '@/constants/languages';

export type OnboardingStep =
  | 'language'
  | 'welcome'
  | 'battery'
  | 'first_capture'
  | 'contacts'
  | 'notifications'
  | 'complete';

export type ThemePreference = 'system' | 'light' | 'dark';

interface AppState {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  onboarding_step: OnboardingStep | null;
  setOnboardingStep: (step: OnboardingStep) => void;
  onboarding_complete: boolean;
  setOnboardingComplete: (v: boolean) => void;
  theme_preference: ThemePreference;
  setThemePreference: (pref: ThemePreference) => void;
}

export const useAppStore = create<AppState>((set) => ({
  language: DEFAULT_LANGUAGE,
  setLanguage: (language) => set({ language }),
  onboarding_step: null,
  setOnboardingStep: (onboarding_step) => set({ onboarding_step }),
  onboarding_complete: false,
  setOnboardingComplete: (onboarding_complete) => set({ onboarding_complete }),
  theme_preference: 'system',
  setThemePreference: (theme_preference) => set({ theme_preference }),
}));
