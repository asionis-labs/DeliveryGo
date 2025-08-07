// RootLayout.tsx
import { useEffect, useState } from 'react';
import { View, ActivityIndicator, AppState, Platform } from 'react-native';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useFonts } from 'expo-font';
import { supabase } from '@/lib/supabase';
import { dataStore } from '@/store/dataStore'; // ✅ Use the new single store

export default function RootLayout() {
    const colorScheme = useColorScheme();
    const [fontsLoaded] = useFonts({
        SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    });

    const [profileLoading, setProfileLoading] = useState(true);

    const { session, profile, setSession, setProfile } = dataStore(); // ✅ Access from dataStore

    // This hook handles all auth state changes and initial profile fetching
    useEffect(() => {
        const fetchAndSetProfile = async (currentSession: any) => {
            if (currentSession?.user?.id) {
                const { data } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', currentSession.user.id)
                    .single();
                setProfile(data || null);
            } else {
                setProfile(null);
            }
            setProfileLoading(false);
        };

        const { data: authListener } = supabase.auth.onAuthStateChange((event, newSession) => {
            setSession(newSession);
            setProfileLoading(true);
            fetchAndSetProfile(newSession);
        });

        supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
            setSession(initialSession);
            fetchAndSetProfile(initialSession);
        });

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, []);

    useEffect(() => {
        if (Platform.OS !== 'web') {
            const sub = AppState.addEventListener('change', (state) => {
                if (state === 'active') {
                    supabase.auth.startAutoRefresh();
                } else {
                    supabase.auth.stopAutoRefresh();
                }
            });
            return () => sub.remove();
        }
    }, []);

    const isAuthenticated = !!session?.user;
    const hasProfile = !!profile;

    if (!fontsLoaded || profileLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="small" />
            </View>
        );
    }

    return (
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <Stack>
                <Stack.Protected guard={isAuthenticated && hasProfile}>
                    <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                </Stack.Protected>
                <Stack.Protected guard={isAuthenticated && !hasProfile}>
                    <Stack.Screen name="onboarding" options={{ headerShown: false }} />
                </Stack.Protected>
                <Stack.Protected guard={!isAuthenticated}>
                    <Stack.Screen name="auth" options={{ headerShown: false }} />
                </Stack.Protected>
                <Stack.Screen name="+not-found" />
            </Stack>
            <StatusBar style="auto" />
        </ThemeProvider>
    );
}