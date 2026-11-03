import { IBMPlexMono_500Medium, IBMPlexMono_600SemiBold } from '@expo-google-fonts/ibm-plex-mono';
import { Jost_400Regular, Jost_500Medium, Jost_600SemiBold, useFonts } from '@expo-google-fonts/jost';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Loading } from '@/components/ui';
import { AuthProvider, useAuth } from '@/lib/auth';
import { fonts, useColors } from '@/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1 } } }),
  );
  const [fontsLoaded] = useFonts({
    Jost_400Regular, Jost_500Medium, Jost_600SemiBold, IBMPlexMono_500Medium, IBMPlexMono_600SemiBold,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Navigator />
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

function Navigator() {
  const c = useColors();
  const scheme = useColorScheme();
  const { ready, userId, profile } = useAuth();

  if (!ready) return <Loading />;
  // Signed in but no name yet: the name screen is the only one open until it's filled in.
  const needsName = !!userId && !profile?.first_name.trim();

  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: c.bg },
          headerTintColor: c.ink,
          headerTitleStyle: { fontFamily: fonts.semibold },
          headerShadowVisible: false,
          headerBackButtonDisplayMode: 'minimal',
          contentStyle: { backgroundColor: c.bg },
        }}>
        <Stack.Protected guard={!needsName}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="sign-in" options={{ title: '', presentation: 'modal' }} />
          <Stack.Screen name="jam/[id]" options={{ title: '' }} />
          <Stack.Screen name="session/[id]/requests" options={{ title: 'Requests' }} />
          <Stack.Screen name="session/[id]/chat" options={{ title: 'Chat' }} />
          <Stack.Screen name="invite/[token]" options={{ title: '' }} />
        </Stack.Protected>
        <Stack.Protected guard={needsName}>
          <Stack.Screen name="onboarding" options={{ title: '', headerBackVisible: false, gestureEnabled: false }} />
        </Stack.Protected>
      </Stack>
    </>
  );
}
