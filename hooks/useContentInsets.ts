import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Safe areas; web enforces minimum top/bottom insets per spec. */
export function useContentInsets() {
  const insets = useSafeAreaInsets();
  if (Platform.OS === 'web') {
    return {
      top: Math.max(insets.top, 67),
      bottom: Math.max(insets.bottom, 34),
      left: insets.left,
      right: insets.right,
    };
  }
  return insets;
}
