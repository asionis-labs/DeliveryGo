import { useEffect, useState } from 'react';
import { View, ActivityIndicator, AppState, Platform } from 'react-native';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useFonts } from 'expo-font';
import { supabase } from '@/lib/supabase';
import { dataStore } from '@/store/dataStore';

export default function RootLayout() {
    const colorScheme = useColorScheme();

    const [fontsLoaded] = useFonts({
        SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    });

    const [profileLoading, setProfileLoading] = useState(true);
    const { session, setSession, setProfile } = dataStore();


    useEffect(() => {
        const fetchAndSetProfile = async (currentSession: any) => {
            if (currentSession?.user?.id) {
                // Fetch profile without .single() to avoid error on 0 rows
                const { data: profileData, error: profileError } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', currentSession.user.id); // Removed .single()

                if (profileError) {
                    console.error('Failed to fetch profile:', profileError);
                    setProfile(null);
                } else if (profileData && profileData.length > 0) {
                    // Check if data exists before setting the profile
                    setProfile(profileData[0]); // Access the first (and only) element
                } else {
                    // No profile found, which is expected for new users
                    setProfile(null);
                }
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
    }, [setSession, setProfile]);

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
    const hasProfile = !!dataStore().profile;

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