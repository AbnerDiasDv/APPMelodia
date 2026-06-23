// Splash/loading; o Gate em _layout cuida dos redirects.
import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { theme } from '@/src/lib/theme';

export default function Index() {
  return (
    <View style={styles.container} testID="splash-root">
      <Text style={styles.logo}>Harmonia</Text>
      <Text style={styles.tag}>Aprenda música, do seu jeito.</Text>
      <ActivityIndicator color={theme.primary} style={{ marginTop: 24 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center' },
  logo: { color: theme.primary, fontSize: 44, fontWeight: '900', letterSpacing: -1.5 },
  tag: { color: theme.textDim, marginTop: 8, fontSize: 14 },
});
