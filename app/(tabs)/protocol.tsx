import { View, Text } from 'react-native';
import { COLORS } from '../../constants/theme';

export default function ProtocolScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg,
      alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: COLORS.text }}>Protocol</Text>
    </View>
  );
}