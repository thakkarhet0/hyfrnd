import { useCallback, useEffect, useState } from 'react';

import { getSttConsentGranted, upsertConsentState } from '@/db/queries/consent';

/**
 * Reads and grants STT consent. `granted` is `null` while loading, then a boolean.
 * Consent must be granted before any audio is sent to a third-party STT provider
 * (Critical Invariant 2, enforced in stt.service.processQueueItem).
 */
export function useSttConsent() {
  const [granted, setGranted] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    getSttConsentGranted().then(({ data }) => {
      if (!cancelled) setGranted(data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const grant = useCallback(async (): Promise<boolean> => {
    const { error } = await upsertConsentState(true);
    if (!error) setGranted(true);
    return !error;
  }, []);

  return { granted, grant };
}
