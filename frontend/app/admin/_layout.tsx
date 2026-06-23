import { Stack } from 'expo-router';
import { theme } from '@/src/lib/theme';

export default function AdminLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.bg } }} />;
}
