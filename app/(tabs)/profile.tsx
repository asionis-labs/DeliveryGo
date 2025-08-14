import { StyleSheet, View, Text, SafeAreaView, Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useColors } from '@/hooks/useColors';
import { useRouter } from 'expo-router';
import { UIButton } from '@/components/UIButton';
import { dataStore } from '@/store/dataStore';
import LineBreak from '@/components/LineBreak';
import { UIText } from "@/components/UIText";

export default function Profile() {
    const color = useColors();
    const router = useRouter();
    const { session, setSession, profile, setProfile } = dataStore();

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

    // A reusable component for each information row
    const InfoRow = ({ label, value }: { label: string; value?: string | number }) => {
        return (
            <View style={profileStyles.row}>
                <UIText type="semiBold" style={profileStyles.label}>{label}</UIText>
                <UIText>{value || 'Not set'}</UIText>
            </View>
        );
    };

    return (
        <SafeAreaView style={{ backgroundColor: color.primary_bg, flex: 1, padding: 30 }}>
            <View style={{ padding: 20 }}>
                <LineBreak height={Platform.OS === "android" ? 25 : 0} />
                <View style={{ marginBottom: 30 }}>
                    <UIText type="title" style={profileStyles.heading}>Profile</UIText>
                </View>

                {profile ? (
                    <View style={profileStyles.infoContainer}>
                        <InfoRow label="Name" value={profile.name} />
                        <LineBreak />
                        <InfoRow label="Email" value={profile.email} />
                        <LineBreak />
                        <InfoRow label="Phone" value={profile.phone} />
                        <LineBreak />
                        <InfoRow label="Role" value={profile.role} />
                        <LineBreak />
                        <InfoRow label="Address" value={`${profile.house_number} ${profile.street}`} />
                        <LineBreak />
                        <InfoRow label="Town/Postcode" value={`${profile.town}, ${profile.postcode}`} />
                        <LineBreak />
                        <InfoRow label="Country" value={profile.country} />
                    </View>
                ) : (
                    <Text>Loading profile...</Text>
                )}

                <UIButton label="Logout" onPress={handleLogout} type="normal" />
            </View>
        </SafeAreaView>
    );
}

const profileStyles = StyleSheet.create({
    heading: {
        fontSize: 26,
    },
    infoContainer: {
        marginBottom: 40,
        gap: 10
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    label: {
        flex: 1,
    }
});