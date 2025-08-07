import {StyleSheet, View, Text, SafeAreaView, Alert} from 'react-native';
import {useEffect, useState} from "react";
import {supabase} from "@/lib/supabase";
import {useColors} from "@/hooks/useColors";
import { useRouter } from 'expo-router';
import {UIButton} from "@/components/UIButton";

export default function Profile() {

    const [isLoading, setIsLoading] = useState(true);
    const color = useColors()
    const router = useRouter();

    const handleLogout = async () => {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            router.replace('/');
        } catch (err) {
            console.error('Error logging out:', err);
            Alert.alert('Error', 'Failed to log out.');
        }
    };

    useEffect(() => {

        const fetchSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            console.log('🔍 Session From Profile:', session);
        };

        fetchSession();

    }, []);

    return (
        <SafeAreaView style={{backgroundColor: color.primary_bg, flex: 1, padding: 50}}>
            <View>
                <Text> Hello </Text>

                <UIButton
                    label="Logout"
                    onPress={handleLogout}
                    type="normal"
                />
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({

});
