import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { LogBox } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { useIconFonts } from '@/src/hooks/use-icon-fonts';
import { AuthProvider, useAuth } from '@/src/lib/auth';
import { ToastProvider } from '@/src/components/Toast';
import { theme } from '@/src/lib/theme';

LogBox.ignoreAllLogs(true);
SplashScreen.preventAutoHideAsync();

function Gate() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const first = segments[0];
    const inAuth = first === '(auth)';
    const inAdmin = first === 'admin';
    const inTabs = first === '(tabs)';

    if (!user) {
      if (!inAuth) router.replace('/(auth)/login');
      return;
    }
    if (user.role === 'superadmin') {
      if (!inAdmin) router.replace('/admin/dashboard');
      return;
    }
    // aluno
    if (inAuth) router.replace('/(tabs)/home');
    if (inAdmin) router.replace('/(tabs)/home');
    if (!inTabs && !inAuth && first !== 'instrument' && first !== 'lesson') {
      router.replace('/(tabs)/home');
    }
  }, [user, loading, segments, router]);

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.bg } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="admin" />
      <Stack.Screen name="instrument/[id]" />
      <Stack.Screen name="lesson/[id]" />
    </Stack>
  );
}

export default function RootLayout() {
  const [loaded, error] = useIconFonts();
  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync();
  }, [loaded, error]);
  if (!loaded && !error) return null;
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <AuthProvider>
        <ToastProvider>
          <Gate />
        </ToastProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
