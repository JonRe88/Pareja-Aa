import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Text, TextInput } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import {
  SofiaSans_300Light,
  SofiaSans_400Regular,
  SofiaSans_500Medium,
  SofiaSans_600SemiBold,
} from '@expo-google-fonts/sofia-sans';
import { Parisienne_400Regular } from '@expo-google-fonts/parisienne';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { AuthProvider } from '@/contexts/AuthContext';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useFrameworkReady();

  const [fontsLoaded, fontError] = useFonts({
    SofiaSans_300Light,
    SofiaSans_400Regular,
    SofiaSans_500Medium,
    SofiaSans_600SemiBold,
    Parisienne_400Regular,
  });

  useEffect(() => {
    if (fontError) {
      console.error(fontError);
    }
  }, [fontError]);

  useEffect(() => {
    if (fontsLoaded) {
      // Fuente base global para toda la app
      Text.defaultProps = Text.defaultProps || {};
      Text.defaultProps.style = [{ fontFamily: 'SofiaSans_400Regular' }];

      TextInput.defaultProps = TextInput.defaultProps || {};
      TextInput.defaultProps.style = [{ fontFamily: 'SofiaSans_400Regular' }];
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </AuthProvider>
  );
}
