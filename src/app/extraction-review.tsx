import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import * as FileSystem from 'expo-file-system/legacy';
import { nanoid } from 'nanoid';

import { Typography, FONT_REGULAR, FONT_BOLD, INK } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Screen } from '@/components/Screen';
import { useCaptureStore } from '@/stores/capture.store';
import { getMemoTranscript, getMemoById } from '@/db/queries/memos';
import { insertExtractionLog } from '@/db/queries/logs';

export default function ExtractionReviewScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const {
    extractedName,
    extractedContextPoints,
    extractedFollowUpDate,
    extractedFollowUpIntent,
    memoId,
    setExtractedName,
    setExtractedContextPoints,
    setExtractedFollowUpDate,
  } = useCaptureStore();

  const [editingField, setEditingField] = useState<'name' | 'context' | 'followUp' | null>(null);
  const [editValue, setEditValue] = useState('');
  const [transcriptVisible, setTranscriptVisible] = useState(false);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [logStatus, setLogStatus] = useState<string | null>(null);

  const handleLogIt = async () => {
    try {
      setLogStatus('logging...');

      let memoData = null;
      if (memoId) {
        const { data } = await getMemoById(memoId);
        memoData = data;
      }

      const finalTranscript = memoData?.raw_transcript ?? transcript;
      if (finalTranscript && !transcript) {
        setTranscript(finalTranscript);
      }

      const logId = nanoid();
      const AUDIO_DIR = (FileSystem.documentDirectory ?? '') + 'audio/';
      const loggedAudioPath = AUDIO_DIR + logId + '.m4a';

      let savedAudioPath: string | null = null;
      if (memoData?.audio_path) {
        try {
          await FileSystem.copyAsync({ from: memoData.audio_path, to: loggedAudioPath });
          savedAudioPath = loggedAudioPath;
        } catch (copyErr) {
          console.warn('[LOG IT] Failed to copy audio file:', copyErr);
        }
      }

      const logPayload = {
        id: logId,
        memoId: memoId,
        rawTranscript: finalTranscript,
        extractedName: extractedName,
        extractedContextPoints: extractedContextPoints,
        extractedFollowUpDate: extractedFollowUpDate,
        extractedFollowUpIntent: extractedFollowUpIntent,
        audioPath: savedAudioPath,
      };

      const { error: dbError } = await insertExtractionLog(logPayload);

      if (dbError) {
        throw dbError;
      }

      console.log('=================== [LOG IT] EXTRACTION LOG ===================');
      console.log(JSON.stringify(logPayload, null, 2));
      console.log('================================================================');

      setLogStatus('logged!');
      setTimeout(() => setLogStatus(null), 2000);
    } catch (err) {
      console.error('[LOG IT] Error writing log:', err);
      setLogStatus('error!');
      setTimeout(() => setLogStatus(null), 2000);
    }
  };

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

      {/* Action buttons row */}
      <View style={styles.actionButtonsRow}>
        <Pressable
          style={[styles.actionButton, styles.logButton, { borderColor: theme.cta }]}
          onPress={handleLogIt}
          accessibilityLabel="log it"
        >
          <Text style={[styles.actionLabel, { color: theme.cta }]}>
            {logStatus || 'log it'}
          </Text>
        </Pressable>

        <Pressable
          style={[styles.actionButton, styles.confirmButton, { backgroundColor: theme.highlight }]}
          onPress={handleConfirm}
          accessibilityLabel={t('extraction.looksRight')}
        >
          <Text style={[styles.actionLabel, { color: INK }]}>
            {t('extraction.looksRight')}
          </Text>
        </Pressable>
      </View>

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
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 0,
    borderWidth: 2,
  },
  logButton: {
    backgroundColor: 'transparent',
  },
  confirmButton: {
    borderWidth: 0,
  },
  actionLabel: {
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
