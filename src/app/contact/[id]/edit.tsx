import { useCallback, useRef, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as FileSystem from 'expo-file-system/legacy';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { FONT_REGULAR, FONT_BOLD, Spacing, INK } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Screen } from '@/components/Screen';
import { getContactDetail, updateContact } from '@/db/queries/contacts';

export default function EditContactScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const theme = useTheme();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [nameFocused, setNameFocused] = useState(false);
  const [phoneFocused, setPhoneFocused] = useState(false);

  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const load = useCallback(async () => {
    if (!id) return;
    const { data } = await getContactDetail(id);
    if (!data) return;
    setName(data.name);
    setPhone(data.phone ?? '');
    setPhotoUri(data.photo_uri ?? null);
  }, [id]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const handleTakePhoto = useCallback(async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert('Camera permission required');
        return;
      }
    }
    setShowCamera(true);
  }, [permission, requestPermission]);

  const handleCameraCapture = useCallback(async () => {
    const cam = cameraRef.current;
    if (!cam) return;
    const photo = await cam.takePictureAsync({ quality: 0.7, base64: false });
    if (!photo) return;

    const dest = `${FileSystem.documentDirectory}contact-photo-${id}-${Date.now()}.jpg`;
    await FileSystem.copyAsync({ from: photo.uri, to: dest });

    setPhotoUri((prev) => {
      if (prev) {
        void FileSystem.deleteAsync(prev, { idempotent: true });
      }
      return dest;
    });
    setShowCamera(false);
  }, [id]);

  const handleSave = useCallback(async () => {
    if (!name.trim()) return;
    setSaving(true);
    const { error } = await updateContact(id!, {
      name: name.trim(),
      phone: phone.trim() || null,
      photo_uri: photoUri,
    });
    if (error) {
      console.warn('[edit-contact] updateContact error:', error);
      setSaving(false);
      return;
    }
    router.back();
  }, [id, name, phone, photoUri]);

  if (showCamera) {
    return (
      <View style={styles.cameraContainer}>
        <CameraView ref={cameraRef} style={styles.camera} facing="front" />
        <View style={styles.cameraControls}>
          <Pressable
            onPress={() => setShowCamera(false)}
            style={[styles.camBtn, { borderColor: theme.text }]}
          >
            <Text style={[styles.camBtnText, { color: theme.text }]}>{t('common.cancel')}</Text>
          </Pressable>
          <Pressable
            onPress={() => void handleCameraCapture()}
            style={[styles.camBtn, { borderColor: theme.highlight, backgroundColor: theme.highlight }]}
          >
            <Text style={[styles.camBtnText, { color: INK }]}>capture</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <Screen style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* Photo */}
      <Pressable onPress={() => void handleTakePhoto()} style={styles.photoRow} disabled={saving}>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.photo} contentFit="cover" />
        ) : (
          <View style={[styles.photoPlaceholder, { borderColor: theme.cta }]}>
            <Text style={[styles.photoLabel, { color: theme.cta }]}>tap to add photo</Text>
          </View>
        )}
      </Pressable>

      {/* Name */}
      <View style={styles.field}>
        <Text style={[styles.label, { color: theme.text + '80' }]}>name</Text>
        <TextInput
          style={[
            styles.input,
            {
              color: theme.text,
              borderBottomColor: nameFocused ? theme.highlight : theme.text + '30',
              borderBottomWidth: nameFocused ? 1.5 : 1,
            },
          ]}
          value={name}
          onChangeText={setName}
          onFocus={() => setNameFocused(true)}
          onBlur={() => setNameFocused(false)}
          returnKeyType="next"
          autoCapitalize="words"
        />
      </View>

      {/* Phone */}
      <View style={styles.field}>
        <Text style={[styles.label, { color: theme.text + '80' }]}>phone</Text>
        <TextInput
          style={[
            styles.input,
            {
              color: theme.text,
              borderBottomColor: phoneFocused ? theme.highlight : theme.text + '30',
              borderBottomWidth: phoneFocused ? 1.5 : 1,
            },
          ]}
          value={phone}
          onChangeText={setPhone}
          onFocus={() => setPhoneFocused(true)}
          onBlur={() => setPhoneFocused(false)}
          keyboardType="phone-pad"
          returnKeyType="done"
          onSubmitEditing={() => void handleSave()}
        />
      </View>

      {/* Save */}
      <View style={styles.saveBtnContainer}>
        <Pressable
          onPress={() => void handleSave()}
          disabled={saving || !name.trim()}
          style={({ pressed }) => [
            styles.saveBtn,
            {
              backgroundColor: theme.highlight,
              borderColor: theme.text,
              opacity: saving || !name.trim() ? 0.5 : 1,
              transform: [{ translateY: pressed ? 2 : 0 }, { translateX: pressed ? 2 : 0 }],
            },
          ]}
        >
          <Text style={[styles.saveBtnText, { color: INK }]}>
            {saving ? 'saving…' : t('common.save')}
          </Text>
        </Pressable>
        <View style={[styles.saveBtnShadow, { backgroundColor: theme.highlight + '20' }]} />
      </View>
    </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.lg, gap: Spacing.lg, paddingBottom: 48 },
  photoRow: { alignItems: 'center' },
  photo: { width: 120, height: 120 },
  photoPlaceholder: {
    width: 120,
    height: 120,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: '#3a3a3e',
    backgroundColor: '#15161a',
  },
  photoLabel: { fontFamily: FONT_REGULAR, fontSize: 16, textTransform: 'lowercase' },
  field: { gap: 4 },
  label: { fontFamily: FONT_BOLD, fontSize: 15, textTransform: 'lowercase' },
  input: {
    fontFamily: FONT_REGULAR,
    fontSize: 16,
    borderBottomWidth: 1,
    paddingVertical: Spacing.xs,
    textTransform: 'lowercase',
  },
  saveBtnContainer: {
    marginTop: Spacing.md,
    height: 52,
    position: 'relative',
  },
  saveBtnShadow: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: -4,
    bottom: -4,
    borderWidth: 1.5,
    borderColor: '#3a3a3e',
    zIndex: 0,
  },
  saveBtn: {
    position: 'absolute',
    inset: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    zIndex: 1,
  },
  saveBtnText: { fontFamily: FONT_BOLD, fontSize: 16, textTransform: 'lowercase' },
  cameraContainer: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  cameraControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: Spacing.lg,
    backgroundColor: '#000',
  },
  camBtn: {
    borderWidth: 1.5,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  camBtnText: { fontFamily: FONT_REGULAR, fontSize: 16, textTransform: 'lowercase' },
});
