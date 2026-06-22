import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';

import { Typography, FONT_REGULAR, FONT_BOLD } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Screen } from '@/components/Screen';
import { useCaptureStore } from '@/stores/capture.store';
import { getMemoTranscript } from '@/db/queries/memos';

export default function ExtractionReviewScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const {
    extractedName,
    extractedContextPoints,
    extractedFollowUpDate,
    memoId,
    setExtractedName,
    setExtractedContextPoints,
    setExtractedFollowUpDate,
  } = useCaptureStore();

  const [editingField, setEditingField] = useState<'name' | 'context' | 'followUp' | null>(null);
  const [editValue, setEditValue] = useState('');
  const [transcriptVisible, setTranscriptVisible] = useState(false);
  const [transcript, setTranscript] = useState<string | null>(null);

  const handleToggleTranscript = () => {
    if (!transcriptVisible && memoId && transcript === null) {
      getMemoTranscript(memoId)
        .then(({ data }) => setTranscript(data))
        .catch(() => setTranscript(null));
    }
    setTranscriptVisible((v) => !v);
  };

  const startEdit = (field: 'name' | 'context' | 'followUp', current: string) => {
    setEditingField(field);
    setEditValue(current);
  };

  const applyEdit = () => {
    if (editingField === 'name') setExtractedName(editValue.trim() || null);
    if (editingField === 'context') {
      const points = editValue
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);
      setExtractedContextPoints(points.length > 0 ? points : null);
    }
    if (editingField === 'followUp') setExtractedFollowUpDate(editValue.trim() || null);
    setEditingField(null);
    setEditValue('');
  };

  const handleConfirm = () => {
    router.push('/contact-linking');
  };

  return (
    <Screen style={{ backgroundColor: theme.background }} edges={['top', 'bottom']}>
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[styles.header, { color: theme.text }]}>{t('extraction.heresWhatIGot')}</Text>

      <View style={[styles.card, { borderColor: theme.text }]}>
        {/* Name field */}
        <Pressable
          style={styles.fieldRow}
          onPress={() => startEdit('name', extractedName ?? '')}
          accessibilityLabel="edit name"
        >
          {editingField === 'name' ? (
            <TextInput
              style={[styles.input, { color: theme.text, borderBottomColor: theme.cta }]}
              value={editValue}
              onChangeText={setEditValue}
              onBlur={applyEdit}
              onSubmitEditing={applyEdit}
              autoFocus
            />
          ) : (
            <Text style={[styles.fieldValue, { color: theme.text }]}>
              {extractedName ?? '—'}
            </Text>
          )}
          {editingField !== 'name' && (
            <Text style={[styles.editHint, { color: theme.cta }]}>{t('extraction.editField')}</Text>
          )}
        </Pressable>

        <View style={[styles.divider, { backgroundColor: theme.text + '20' }]} />

        {/* Context points */}
        <Pressable
          style={styles.fieldRow}
          onPress={() =>
            startEdit('context', (extractedContextPoints ?? []).join('\n'))
          }
          accessibilityLabel="edit context points"
        >
          {editingField === 'context' ? (
            <TextInput
              style={[
                styles.input,
                styles.multilineInput,
                { color: theme.text, borderBottomColor: theme.cta },
              ]}
              value={editValue}
              onChangeText={setEditValue}
              onBlur={applyEdit}
              multiline
              autoFocus
            />
          ) : (
            <View style={styles.bullets}>
              {(extractedContextPoints ?? []).map((pt, i) => (
                <Text key={i} style={[styles.bullet, { color: theme.text }]}>
                  {'• '}
                  {pt}
                </Text>
              ))}
              {!extractedContextPoints && (
                <Text style={[styles.bullet, { color: theme.text }]}>—</Text>
              )}
            </View>
          )}
          {editingField !== 'context' && (
            <Text style={[styles.editHint, { color: theme.cta }]}>{t('extraction.editField')}</Text>
          )}
        </Pressable>

        {extractedFollowUpDate && (
          <>
            <View style={[styles.divider, { backgroundColor: theme.text + '20' }]} />
            <Pressable
              style={styles.fieldRow}
              onPress={() => startEdit('followUp', extractedFollowUpDate)}
              accessibilityLabel="edit follow up date"
            >
              {editingField === 'followUp' ? (
                <TextInput
                  style={[styles.input, { color: theme.text, borderBottomColor: theme.cta }]}
                  value={editValue}
                  onChangeText={setEditValue}
                  onBlur={applyEdit}
                  onSubmitEditing={applyEdit}
                  autoFocus
                />
              ) : (
                <Text style={[styles.fieldValue, { color: theme.text }]}>
                  {t('extraction.followUpOn')} {extractedFollowUpDate}
                </Text>
              )}
              {editingField !== 'followUp' && (
                <Text style={[styles.editHint, { color: theme.cta }]}>
                  {t('extraction.editField')}
                </Text>
              )}
            </Pressable>
          </>
        )}
      </View>

      {/* Confirm button */}
      <Pressable
        style={[styles.confirmButton, { backgroundColor: theme.cta }]}
        onPress={handleConfirm}
        accessibilityLabel={t('extraction.looksRight')}
      >
        <Text style={[styles.confirmLabel, { color: theme.background }]}>
          {t('extraction.looksRight')}
        </Text>
      </Pressable>

      {/* Collapsed transcript */}
      <Pressable onPress={handleToggleTranscript} style={styles.transcriptToggle}>
        <Text style={[styles.transcriptLabel, { color: theme.cta }]}>
          {t('extraction.transcript')}
        </Text>
      </Pressable>
      {transcriptVisible && (
        <Text style={[styles.transcriptText, { color: theme.text }]}>
          {transcript ?? '—'}
        </Text>
      )}
    </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    paddingTop: 60,
    gap: 24,
  },
  header: {
    ...Typography.heading,
  },
  card: {
    borderWidth: 1,
    borderRadius: 0,
    padding: 16,
    gap: 0,
  },
  fieldRow: {
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  fieldValue: {
    ...Typography.body,
    flex: 1,
  },
  editHint: {
    fontFamily: FONT_REGULAR,
    fontSize: 12,
    textTransform: 'lowercase',
  },
  input: {
    ...Typography.body,
    flex: 1,
    borderBottomWidth: 1,
    paddingBottom: 4,
  },
  multilineInput: {
    minHeight: 80,
  },
  bullets: {
    flex: 1,
    gap: 4,
  },
  bullet: {
    ...Typography.body,
  },
  divider: {
    height: 1,
    marginVertical: 2,
  },
  confirmButton: {
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 0,
  },
  confirmLabel: {
    fontFamily: FONT_BOLD,
    fontSize: 16,
    textTransform: 'lowercase',
  },
  transcriptToggle: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  transcriptLabel: {
    fontFamily: FONT_REGULAR,
    fontSize: 14,
    textTransform: 'lowercase',
  },
  transcriptText: {
    fontFamily: FONT_REGULAR,
    fontSize: 14,
    textTransform: 'lowercase',
    lineHeight: 20,
  },
});
