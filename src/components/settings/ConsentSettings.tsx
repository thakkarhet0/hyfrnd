import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { FONT_BOLD, FONT_REGULAR, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getSttConsentGranted, upsertConsentState } from '@/db/queries/consent';
import { useAppStore } from '@/stores/app.store';
import { deleteAllData } from '@/services/deletion.service';

export function ConsentSettings() {
  const { t } = useTranslation();
  const theme = useTheme();
  const store = useAppStore();

  const [sttConsent, setSttConsent] = useState(false);
  const [consentLoaded, setConsentLoaded] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    getSttConsentGranted().then(({ data }) => {
      setSttConsent(data);
      setConsentLoaded(true);
    });
  }, []);

  const handleToggleConsent = useCallback(async (newValue: boolean) => {
    setSttConsent(newValue);
    const { error } = await upsertConsentState(newValue);
    if (error) {
      console.warn('[ConsentSettings] upsertConsentState failed:', error);
      setSttConsent(!newValue);
    }
  }, []);

  const handleDeletePress = useCallback(() => {
    Alert.alert(
      t('consent.deleteConfirmTitle'),
      t('consent.deleteConfirmBody'),
      [
        { text: t('consent.deleteCancel'), style: 'cancel' },
        {
          text: t('consent.deleteConfirm'),
          style: 'destructive',
          onPress: () => {
            setIsDeleting(true);
            setDeleteError(null);
            deleteAllData().then(({ error }) => {
              if (error) {
                setIsDeleting(false);
                setDeleteError(error);
                return;
              }
              setIsDeleting(false);
              store.setOnboardingComplete(false);
              store.setOnboardingStep('language');
              router.replace('/onboarding/language');
            }).catch((err: unknown) => {
              setIsDeleting(false);
              setDeleteError(String(err));
            });
          },
        },
      ],
    );
  }, [t, store]);

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('consent.title')}</Text>

      <View style={styles.cardContainer}>
        <View style={styles.consentRow}>
          <View style={styles.consentText}>
            <Text style={[styles.label, { color: theme.text }]}>{t('consent.sttToggle')}</Text>
            <Text style={[styles.detail, { color: theme.text + '80' }]}>{t('consent.sttDetail')}</Text>
          </View>
          <Pressable
            onPress={() => void handleToggleConsent(!sttConsent)}
            disabled={!consentLoaded}
            style={[
              styles.toggle,
              { backgroundColor: sttConsent ? theme.cta : theme.text + '20', opacity: consentLoaded ? 1 : 0.4 },
            ]}
            accessibilityRole="switch"
            accessibilityState={{ checked: sttConsent, disabled: !consentLoaded }}
          >
            <View
              style={[
                styles.toggleKnob,
                { backgroundColor: theme.background, transform: [{ translateX: sttConsent ? 20 : 0 }] },
              ]}
            />
          </Pressable>
        </View>
      </View>

      <View style={[styles.cardContainer, { borderColor: '#c0392b' }]}>
        <Text style={[styles.detail, { color: theme.text }]}>{t('consent.deleteDisclosure')}</Text>

        {deleteError ? (
          <Text style={styles.errorText}>{deleteError}</Text>
        ) : null}

        <View style={styles.btnContainer}>
          <Pressable
            onPress={handleDeletePress}
            disabled={isDeleting}
            style={({ pressed }) => [
              styles.deleteButton,
              {
                backgroundColor: theme.background,
                borderColor: '#c0392b',
                opacity: isDeleting ? 0.5 : 1,
                transform: [{ translateY: pressed ? 2 : 0 }, { translateX: pressed ? 2 : 0 }],
              },
            ]}
            accessibilityRole="button"
          >
            <Text style={[styles.deleteButtonText, { color: '#c0392b' }]}>
              {isDeleting ? t('consent.deleting') : t('consent.deleteButton')}
            </Text>
          </Pressable>
          <View style={[styles.btnShadow, { borderColor: '#c0392b', backgroundColor: 'rgba(192, 57, 43, 0.1)' }]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.md,
  },
  sectionTitle: {
    fontFamily: FONT_BOLD,
    fontSize: 18,
    textTransform: 'lowercase',
  },
  cardContainer: {
    borderWidth: 1.5,
    borderColor: '#3a3a3e',
    backgroundColor: '#222225',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  consentText: {
    flex: 1,
    gap: 4,
  },
  label: {
    fontFamily: FONT_BOLD,
    fontSize: 15,
    textTransform: 'lowercase',
  },
  detail: {
    fontFamily: FONT_REGULAR,
    fontSize: 14,
    lineHeight: 20,
    textTransform: 'lowercase',
  },
  toggle: {
    width: 44,
    height: 24,
    justifyContent: 'center',
    paddingHorizontal: 2,
    borderWidth: 1,
    borderColor: '#3a3a3e',
  },
  toggleKnob: {
    width: 18,
    height: 18,
  },
  btnContainer: {
    height: 52,
    position: 'relative',
    marginTop: Spacing.xs,
  },
  btnShadow: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: -4,
    bottom: -4,
    borderWidth: 1.5,
    zIndex: 0,
  },
  deleteButton: {
    position: 'absolute',
    inset: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    zIndex: 1,
  },
  deleteButtonText: {
    fontFamily: FONT_BOLD,
    fontSize: 16,
    textTransform: 'lowercase',
  },
  errorText: {
    fontFamily: FONT_REGULAR,
    fontSize: 13,
    color: '#c0392b',
    textTransform: 'lowercase',
  },
});
