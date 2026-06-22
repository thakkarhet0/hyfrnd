import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';

import { Typography, FONT_REGULAR, FONT_BOLD } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Screen } from '@/components/Screen';
import { useCaptureStore } from '@/stores/capture.store';
import { getMemoTranscript } from '@/db/queries/memos';

type MissingField = 'name' | 'context' | 'followUp';

function getNextMissingField(
  name: string | null,
  context: string[] | null,
  followUp: string | null,
): MissingField | null {
  if (name === null) return 'name';
  if (context === null) return 'context';
  if (followUp === null) return 'followUp';
  return null;
}

export default function MissingFieldScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const {
    memoId,
    extractedName,
    extractedContextPoints,
    extractedFollowUpDate,
    setExtractedName,
    setExtractedContextPoints,
    setExtractedFollowUpDate,
  } = useCaptureStore();

  const [answer, setAnswer] = useState('');
  const [transcript, setTranscript] = useState<string | null>(null);

  const currentField = getNextMissingField(
    extractedName,
    extractedContextPoints,
    extractedFollowUpDate,
  );

  useEffect(() => {
    if (memoId) {
      getMemoTranscript(memoId)
        .then(({ data }) => setTranscript(data))
        .catch(() => setTranscript(null));
    }
  }, [memoId]);

  useEffect(() => {
    if (currentField === null) {
      router.replace('/extraction-review');
    }
  }, [currentField]);

  const handleSubmit = () => {
    const trimmed = answer.trim();
    if (!trimmed) return;

    if (currentField === 'name') {
      setExtractedName(trimmed);
    } else if (currentField === 'context') {
      setExtractedContextPoints([trimmed]);
    } else if (currentField === 'followUp') {
      setExtractedFollowUpDate(trimmed);
    }
    setAnswer('');
  };

  const questionKey =
    currentField === 'name'
      ? 'extraction.namePrompt'
      : currentField === 'context'
        ? 'extraction.contextPrompt'
        : 'extraction.followUpPrompt';

  if (currentField === null) return null;

  return (
    <Screen style={{ backgroundColor: theme.background }} edges={['top', 'bottom']}>
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[styles.question, { color: theme.text }]}>{t(questionKey)}</Text>

      {transcript ? (
        <View style={[styles.transcriptBox, { borderColor: theme.text + '30' }]}>
          <Text style={[styles.transcriptText, { color: theme.text + 'AA' }]}>{transcript}</Text>
        </View>
      ) : null}

      <TextInput
        style={[styles.input, { color: theme.text, borderBottomColor: theme.cta }]}
        value={answer}
        onChangeText={setAnswer}
        placeholder={t(questionKey)}
        placeholderTextColor={theme.text + '60'}
        autoFocus
        onSubmitEditing={handleSubmit}
        returnKeyType="done"
      />

      <View style={styles.actions}>
        {/* Mic stub — voice input planned for Epic 4 */}
        <Pressable
          style={[styles.micButton, { borderColor: theme.cta }]}
          onPress={() => {}}
          accessibilityLabel="voice input"
        >
          <Text style={[styles.micLabel, { color: theme.cta }]}>🎤</Text>
        </Pressable>

        <Pressable
          style={[styles.submitButton, { backgroundColor: theme.cta }]}
          onPress={handleSubmit}
          accessibilityLabel={t('common.confirm')}
        >
          <Text style={[styles.submitLabel, { color: theme.background }]}>
            {t('common.confirm')}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    paddingTop: 80,
    gap: 24,
  },
  question: {
    ...Typography.heading,
  },
  transcriptBox: {
    borderWidth: 1,
    padding: 12,
    borderRadius: 0,
  },
  transcriptText: {
    fontFamily: FONT_REGULAR,
    fontSize: 14,
    textTransform: 'lowercase',
    lineHeight: 20,
  },
  input: {
    ...Typography.body,
    borderBottomWidth: 1,
    paddingBottom: 8,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  micButton: {
    width: 48,
    height: 48,
    borderWidth: 1,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micLabel: {
    fontSize: 20,
  },
  submitButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 0,
  },
  submitLabel: {
    fontFamily: FONT_BOLD,
    fontSize: 16,
    textTransform: 'lowercase',
  },
});
