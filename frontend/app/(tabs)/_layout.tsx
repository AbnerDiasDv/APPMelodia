import { Tabs } from 'expo-router';
import { Home, Music2, BookOpen, BarChart3, User } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/src/lib/theme';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.bg2,
          borderTopColor: theme.border,
          borderTopWidth: 1,
          height: 64 + insets.bottom,
          paddingTop: 8,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
        },
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textMute,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
      }}
    >
      <Tabs.Screen name="home" options={{ title: 'Início', tabBarIcon: ({ color, size }) => <Home color={color} size={size - 2} strokeWidth={2.5} /> }} />
      <Tabs.Screen name="practice" options={{ title: 'Estudar', tabBarIcon: ({ color, size }) => <Music2 color={color} size={size - 2} strokeWidth={2.5} /> }} />
      <Tabs.Screen name="chords" options={{ title: 'Acordes', tabBarIcon: ({ color, size }) => <BookOpen color={color} size={size - 2} strokeWidth={2.5} /> }} />
      <Tabs.Screen name="progress" options={{ title: 'Progresso', tabBarIcon: ({ color, size }) => <BarChart3 color={color} size={size - 2} strokeWidth={2.5} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Perfil', tabBarIcon: ({ color, size }) => <User color={color} size={size - 2} strokeWidth={2.5} /> }} />
    </Tabs>
  );
}
