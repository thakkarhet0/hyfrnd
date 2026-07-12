import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';

import { Typography, FONT_REGULAR, FONT_BOLD, INK } from '@/constants/theme';
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
  const [inputFocused, setInputFocused] = useState(false);

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
        <View style={[styles.transcriptBox, { borderColor: '#3a3a3e', backgroundColor: '#222225' }]}>
          <Text style={[styles.transcriptText, { color: theme.text + 'AA' }]}>{transcript}</Text>
        </View>
      ) : null}

      <TextInput
        style={[
          styles.input,
          {
            color: theme.text,
            borderBottomColor: inputFocused ? theme.highlight : theme.text + '30',
            borderBottomWidth: inputFocused ? 1.5 : 1,
          },
        ]}
        value={answer}
        onChangeText={setAnswer}
        onFocus={() => setInputFocused(true)}
        onBlur={() => setInputFocused(false)}
        placeholder={t(questionKey)}
        placeholderTextColor={theme.text + '60'}
        autoFocus
        onSubmitEditing={handleSubmit}
        returnKeyType="done"
      />

      <View style={styles.actions}>
        <View style={styles.micBtnContainer}>
          <Pressable
            style={({ pressed }) => [
              styles.micButton,
              {
                backgroundColor: theme.background,
                borderColor: theme.cta,
                transform: [{ translateY: pressed ? 2 : 0 }, { translateX: pressed ? 2 : 0 }],
              },
            ]}
            onPress={() => {}}
            accessibilityLabel="voice input"
          >
            <Text style={[styles.micLabel, { color: theme.cta }]}>🎤</Text>
          </Pressable>
          <View style={[styles.btnShadow, { backgroundColor: theme.cta + '20' }]} />
        </View>

        <View style={styles.submitBtnContainer}>
          <Pressable
            style={({ pressed }) => [
              styles.submitButton,
              {
                backgroundColor: theme.highlight,
                borderColor: theme.text,
                transform: [{ translateY: pressed ? 2 : 0 }, { translateX: pressed ? 2 : 0 }],
              },
            ]}
            onPress={handleSubmit}
            accessibilityLabel={t('common.confirm')}
          >
            <Text style={[styles.submitLabel, { color: INK }]}>
              {t('common.confirm')}
            </Text>
          </Pressable>
          <View style={[styles.btnShadow, { backgroundColor: theme.highlight + '20' }]} />
        </View>
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
    borderWidth: 1.5,
    padding: 12,
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
    gap: 16,
    alignItems: 'center',
  },
  micBtnContainer: {
    width: 48,
    height: 48,
    position: 'relative',
  },
  submitBtnContainer: {
    flex: 1,
    height: 52,
    position: 'relative',
  },
  btnShadow: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: -4,
    bottom: -4,
    borderWidth: 1.5,
    borderColor: '#3a3a3e',
    zIndex: 0,
  },
  micButton: {
    position: 'absolute',
    inset: 0,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  micLabel: {
    fontSize: 20,
  },
  submitButton: {
    position: 'absolute',
    inset: 0,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  submitLabel: {
    fontFamily: FONT_BOLD,
    fontSize: 16,
    textTransform: 'lowercase',
  },
});
