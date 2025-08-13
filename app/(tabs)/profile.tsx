import { StyleSheet, View, Text, SafeAreaView, Alert, Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useColors } from '@/hooks/useColors';
import { useRouter } from 'expo-router';
import { UIButton } from '@/components/UIButton';
import { dataStore } from '@/store/dataStore';
import LineBreak from '@/components/LineBreak';

export default function Profile() {
    const color = useColors();
    const router = useRouter();

    const { session, setSession, profile, setProfile } = dataStore()

    const handleLogout = async () => {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
        } catch (err) {
            console.warn('Network issue during logout, proceeding with local sign-out:', err);
        } finally {
            dataStore.getState().setSession(null);
            dataStore.getState().setProfile(null);
            router.replace('/');
        }
    };


    return (
        <SafeAreaView style={{ backgroundColor: color.primary_bg, flex: 1, padding: 30 }}>
            <View style={{ padding: 20 }}>

                <LineBreak height={Platform.OS === "android" ? 25 : 0} />

                <View style={{ marginBottom: 30 }}>
                    <Text style={styles.heading}>Profile</Text>
                </View>

                {profile ? (
                    <View style={styles.infoContainer}>
                        <Info label="Name" value={profile.name} />
                        <Info label="Email" value={profile.email} />
                        <Info label="Phone" value={profile.phone} />
                        <Info label="Role" value={profile.role} />
                        <Info label="Address" value={`${profile.house_number}, ${profile.street}`} />
                        <Info label="Town/Postcode" value={`${profile.town}, ${profile.postcode}`} />
                        <Info label="Country" value={profile.country} />
                    </View>
                ) : (
                    <Text>Loading profile...</Text>
                )}

                <UIButton label="Logout" onPress={handleLogout} type="normal" />

            </View>
        </SafeAreaView>
    );
}

function Info({ label, value }: { label: string; value?: string }) {
    return (
        <View style={{ marginBottom: 10 }}>
            <Text style={{ fontWeight: 'bold' }}>{label}:</Text>
            <Text>{value || 'Not set'}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    heading: {
        fontSize: 26,
        fontWeight: 'bold',
    },
    infoContainer: {
        marginBottom: 40,
    },
});
