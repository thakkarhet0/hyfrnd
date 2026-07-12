import { StyleSheet, View } from 'react-native';

import RecordButtonDOM from './RecordButtonDOM';

export interface RecordButtonProps {
  isRecording: boolean;
  onPress: () => void;
  disabled?: boolean;
}

export function RecordButton({ isRecording, onPress, disabled = false }: RecordButtonProps) {
  return (
    <View style={styles.wrapper}>
      <RecordButtonDOM
        isRecording={isRecording}
        disabled={disabled}
        onPress={async () => onPress()}
        dom={{
          style: styles.dom,
          scrollEnabled: false,
          backgroundColor: 'transparent',
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
  },
  dom: {
    width: 360,
    height: 320,
    backgroundColor: 'transparent',
  },
});
