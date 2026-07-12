import { Dimensions, StyleSheet, View } from 'react-native';

import { MetalColors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import RecordButtonDOM from './RecordButtonDOM';

// capture.tsx's `styles.center` applies paddingHorizontal:24 around this
// component; cancel it out below so the box can reach the true screen edges.
const CENTER_PADDING_HORIZONTAL = 24;
const SCREEN_WIDTH = Dimensions.get('window').width;
const BOX_WIDTH = SCREEN_WIDTH;
const BOX_HEIGHT = 320;
// A deliberate, flat panel tone drawn from the darker end of the capture
// screen's own gradient (CaptureScreenBackground uses this same pair as a
// top-to-bottom gradient) — the WebView leaves a faint residual tint no
// matter what's behind it, so matching the true background's own darker
// shade reads as an intentional dark panel instead of a rendering glitch.
const PANEL_BACKGROUND = MetalColors.gradient[0];

export interface RecordButtonProps {
  isRecording: boolean;
  onPress: () => void;
  disabled?: boolean;
}

export function RecordButton({ isRecording, onPress, disabled = false }: RecordButtonProps) {
  const scheme = useColorScheme();
  const panelBg = scheme === 'light' ? '#ffffff' : PANEL_BACKGROUND;

  return (
    <View style={[styles.wrapper, { backgroundColor: panelBg }]}>
      <RecordButtonDOM
        isRecording={isRecording}
        disabled={disabled}
        themeMode={scheme}
        onPress={async () => onPress()}
        dom={{
          style: styles.dom,
          containerStyle: styles.dom,
          scrollEnabled: false,
          backgroundColor: 'transparent',
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // Full screen width (edges no longer visible left/right) and clipped
  // overflow so the WebView's own rendering can't paint over sibling
  // content below it.
  wrapper: {
    width: BOX_WIDTH,
    height: BOX_HEIGHT,
    marginHorizontal: -CENTER_PADDING_HORIZONTAL,
    alignItems: 'center',
    overflow: 'hidden',
  },
  dom: {
    width: BOX_WIDTH,
    height: BOX_HEIGHT,
    backgroundColor: 'transparent',
  },
});
