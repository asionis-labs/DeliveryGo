import { useColorScheme } from '@/hooks/useColorScheme';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
// import {supabase} from "@/lib/supabase";

export default function RootLayout() {

    const colorScheme = useColorScheme()

    const [loaded] = useFonts({
        SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    });

    if (!loaded) {
        return null;
    }

    return (
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>

            <Stack.Protected guard={false}>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            </Stack.Protected>

            <Stack.Protected guard={true}>
                <Stack.Screen name="auth" options={{ headerShown: false }} />
            </Stack.Protected>

            <Stack.Screen name="+not-found" />

            <StatusBar style="auto" />
        </ThemeProvider>
    );
}


