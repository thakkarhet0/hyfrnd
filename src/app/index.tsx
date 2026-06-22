import { Redirect } from 'expo-router';

import { useAppStore, type OnboardingStep } from '@/stores/app.store';

const STEP_ROUTES: Partial<Record<OnboardingStep, string>> = {
  welcome: '/onboarding/welcome',
  first_capture: '/onboarding/capture',
  battery: '/onboarding/battery',
  contacts: '/onboarding/contacts',
  notifications: '/onboarding/notifications',
};

export default function Index() {
  const onboarding_complete = useAppStore((s) => s.onboarding_complete);
  const onboarding_step = useAppStore((s) => s.onboarding_step);

  if (onboarding_complete) {
    return <Redirect href="/(tabs)/capture" />;
  }

  const resumeRoute = onboarding_step ? STEP_ROUTES[onboarding_step] : undefined;
  if (resumeRoute) {
    return <Redirect href={resumeRoute as any} />;
  }

  return <Redirect href="/onboarding/language" />;
}
