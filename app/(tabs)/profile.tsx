import { StyleSheet, View, Text, SafeAreaView, Platform, Linking, Alert, TouchableOpacity, ScrollView } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useColors } from '@/hooks/useColors';
import { useRouter } from 'expo-router';
import { UIButton } from '@/components/UIButton';
import { dataStore } from '@/store/dataStore';
import LineBreak from '@/components/LineBreak';
import { UIText } from "@/components/UIText";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useMemo } from 'react';

export default function Profile() {
    const color = useColors();
    const router = useRouter();
    const { profile, connections } = dataStore();

    // Get the active connection to check subscription status
    const activeConnection = connections.find(c => c.id === profile?.active_connection_id);

    const subscriptionStatus = useMemo(() => {
        if (!activeConnection?.subscription_end) {
            return {
                text: 'Not Subscribed',
                isActive: false,
                textColor: 'red'
            };
        }

        const subscriptionEnd = new Date(activeConnection.subscription_end);
        const now = new Date();

        if (now < subscriptionEnd) {
            const daysLeft = Math.ceil((subscriptionEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            return {
                text: `Active (Expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'})`,
                isActive: true,
                textColor: 'green'
            };
        } else {
            return {
                text: `Expired on ${subscriptionEnd.toLocaleDateString()}`,
                isActive: false,
                textColor: 'red'
            };
        }
    }, [activeConnection]);

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

    const handleUpgrade = () => {
        if (profile?.id) {
            const upgradeUrl = `https://www.deliverygo.co.uk/billing?id=${profile.id}`;
            Linking.openURL(upgradeUrl).catch(err => {
                Alert.alert("Error", "Failed to open the upgrade link. Please try again later.");
                console.error("Failed to open URL:", err);
            });
        }
    };

    const handleDeleteAccount = () => {
        Alert.alert(
            "Delete Account",
            "Are you sure you want to delete your account? This action is permanent and cannot be undone.",
            [
                {
                    text: "Cancel",
                    style: "cancel"
                },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        if (!profile?.id) {
                            Alert.alert("Error", "Profile ID is missing. Cannot delete account.");
                            return;
                        }

                        Alert.alert("Deleting...", "Your account deletion is being processed. This may take a moment.");

                        // Call a secure Supabase Edge Function to handle the deletion.
                        // This avoids exposing sensitive keys in the app.
                        try {
                            const { data, error } = await supabase.functions.invoke('delete-user', {
                                body: JSON.stringify({ userId: profile.id }),
                            });

                            if (error) {
                                throw error;
                            }

                            if (data.success) {
                                // Logout the user and navigate to the home screen after a successful server response.
                                Alert.alert("Success", "Your account has been successfully deleted.");
                                handleLogout();
                            } else {
                                Alert.alert("Error", data.message || "Failed to delete account. Please try again or contact support.");
                            }
                        } catch (err) {
                            Alert.alert("Error", `An error occurred while deleting your account: ${err.message}. Please try again later.`);
                            console.error("Account deletion failed:", err);
                        }
                    }
                }
            ]
        );
    };

    const handleSupportCall = () => {
        Linking.openURL(`tel:+447707771599`).catch(err => {
            Alert.alert("Error", "Could not open phone dialer.");
            console.error("Failed to open phone dialer:", err);
        });
    };

    const handleSupportEmail = () => {
        Linking.openURL(`mailto:support@deliverygo.co.uk`).catch(err => {
            Alert.alert("Error", "Could not open email client.");
            console.error("Failed to open email client:", err);
        });
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
        <SafeAreaView style={{ backgroundColor: color.primary_bg, flex: 1 }}>
            <ScrollView contentContainerStyle={{ padding: 20 }}>
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
                        {/* <LineBreak /> */}
                        {/* <InfoRow label="Role" value={profile.role} /> */}
                        <LineBreak />
                        <InfoRow label="Address" value={`${profile.house_number} ${profile.street}`} />
                        <LineBreak />
                        <InfoRow label="Addres" value={`${profile.town}, ${profile.postcode}`} />
                        <LineBreak />
                        <InfoRow label="Country" value={profile.country} />


                        {profile.role === 'restaurant' && (
                            <>
                                <LineBreak />
                                <InfoRow label="Hourly Rate" value={`£${profile.hourly_rate}`} />
                                <LineBreak />
                                <InfoRow label="Mileage Rate" value={`£${profile.mileage_rate}`} />
                                <LineBreak />
                                <InfoRow label="Local Rate" value={profile.local_rate ? `£${profile.local_rate}` : 'Not Set'} />
                            </>
                        )}

                    </View>

                ) : (
                    <Text>Loading profile...</Text>
                )}



                <View style={profileStyles.card}>

                    {profile?.role === 'restaurant' && (
                        <>
                            <UIText type="base" style={profileStyles.sectionHeading}>Subscription Status</UIText>
                            <UIText
                                type="base"
                                style={[
                                    profileStyles.cardText,
                                    { color: subscriptionStatus.textColor, fontWeight: 'bold' }
                                ]}
                            >
                                {subscriptionStatus.text}
                            </UIText>
                            <UIButton label="Manage Subscription" onPress={handleUpgrade} type="normal" style={profileStyles.upgradeButton} />

                            <LineBreak height={20} />
                        </>


                    )}


                    <UIText type="base" style={profileStyles.sectionHeading}>Support</UIText>
                    <View style={profileStyles.supportRow}>
                        <FontAwesome name="envelope" size={20} color={color.text} />
                        <TouchableOpacity onPress={handleSupportEmail}>
                            <UIText type="base" style={profileStyles.supportText}>support@deliverygo.co.uk</UIText>
                        </TouchableOpacity>
                    </View>
                    <LineBreak height={5} />
                    <View style={profileStyles.supportRow}>
                        <FontAwesome name="phone" size={20} color={color.text} />
                        <TouchableOpacity onPress={handleSupportCall}>
                            <UIText type="base" style={profileStyles.supportText}>+44 7707 771599</UIText>
                        </TouchableOpacity>
                    </View>
                </View>



                <View style={profileStyles.actionButtonsContainer}>
                    <UIButton label="Delete My Account" onPress={handleDeleteAccount} type="normal" style={{ backgroundColor: color.error, flex: 2 }} />
                    <UIButton label="Logout" onPress={handleLogout} type="normal" style={{ flex: 1 }} />
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const profileStyles = StyleSheet.create({
    heading: {
        fontSize: 26,
    },
    infoContainer: {
        marginBottom: 40,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    label: {
        flex: 1,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 15,
        padding: 20,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
    },
    cardTitle: {
        fontSize: 18,
        marginBottom: 10,
    },
    sectionHeading: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    cardText: {
        marginBottom: 15,
    },
    upgradeButton: {
        paddingVertical: 12,
        borderRadius: 10,
    },
    supportRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    supportText: {
        // textDecorationLine: 'underline',
    },
    actionButtonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 20,
        gap: 20
    },
});