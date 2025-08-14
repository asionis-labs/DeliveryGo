import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, TextInput, Text, Button, Alert, ScrollView, TouchableOpacity, ActivityIndicator, SafeAreaView, KeyboardAvoidingView, Platform } from 'react-native';
import { dataStore } from '@/store/dataStore';
import { supabase } from '@/lib/supabase';
import { useColors } from '@/hooks/useColors';
import { UIText } from '@/components/UIText';
import LineBreak from '@/components/LineBreak';
import { UIButton } from '@/components/UIButton';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import Ionicons from '@expo/vector-icons/Ionicons';
import { UIInput } from '@/components/UIInput';

// Define the Connection type with the missing property
type Connection = {
    id: string;
    driver_id: string;
    restaurant_id: string;
    hourly_rate: number;
    mileage_rate: number;
    invited_by: 'driver' | 'restaurant';
    status: 'pending' | 'accepted' | 'declined';
    driver_name: string;
    restaurant_name: string;
    restaurant_postcode: string; // This property was missing
};


const DEFAULT_RESTAURANT_ID = "cf61e4f7-082d-4843-96a5-396093049ad1";
const DEFAULT_DRIVER_ID = "2ca629ba-cf8a-4906-9e13-f54524cf20d9";
const DEFAULT_RESTAURANT_POSTCODE = "AL10 0JP"

interface FormState {
    name: string;
    email: string;
    role: 'driver' | 'restaurant';
    house_number: string;
    street: string;
    town: string;
    postcode: string;
    country: string;
    hourly_rate: number;
    mileage_rate: number;
}

export default function OnboardingScreen() {

    const router = useRouter()
    const { session, setSession, profile, setProfile } = dataStore()
    const [loading, setLoading] = useState(false)
    const color = useColors()
    const trialEndDate = new Date();

    const [form, setForm] = useState<FormState>({
        name: '',
        email: '',
        role: 'driver',
        house_number: '',
        street: '',
        town: '',
        postcode: '',
        country: '',
        hourly_rate: 12.21,
        mileage_rate: 0.9,
    });

    useEffect(() => {
        if (profile) {
            setForm({
                name: profile.name || '',
                email: profile.email || '',
                role: profile.role || 'driver',
                house_number: profile.house_number || '',
                street: profile.street || '',
                town: profile.town || '',
                postcode: profile.postcode || '',
                country: profile.country || 'United Kingdom',
                hourly_rate: profile.hourly_rate || 12.21,
                mileage_rate: profile.mileage_rate || 0.9
            });
        }
    }, [profile]);

    const handleChange = (field: keyof FormState, value: string) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const handleRoleSelect = (role: 'driver' | 'restaurant') => {
        setForm((prev) => ({ ...prev, role }));
    };

    const submitProfile = async () => {
        if (!form.name || !form.email) {
            return Alert.alert('Error', 'Name and Email are required');
        }
        setLoading(true);

        try {
            // 1. Create or update the user's base profile first.
            trialEndDate.setDate(trialEndDate.getDate() + 7);

            const { data: newProfile, error: profileError } = await supabase.from('profiles').upsert({
                id: session?.user?.id,
                name: form.name,
                email: form.email,
                phone: session?.user?.phone,
                role: form.role,
                house_number: form.house_number,
                street: form.street,
                town: form.town,
                postcode: form.postcode,
                country: form.country,
                hourly_rate: form.hourly_rate,
                mileage_rate: form.mileage_rate,
                // isPaid: false,
                subscription_end: trialEndDate.toISOString(),


            }).select().single();

            if (profileError) {
                Alert.alert('Error', profileError.message);
                console.log("Error During Profile Create:", profileError.message);
                setLoading(false);
                return;
            }

            let newConnection: Connection | null = null; // Use the corrected type

            // 2. Create the default connection and get the connection data.
            if (newProfile.role === 'driver') {
                const { data: connectionData, error: connectionError } = await supabase.from('connections').insert({
                    driver_id: newProfile.id,
                    restaurant_id: DEFAULT_RESTAURANT_ID,
                    hourly_rate: newProfile.hourly_rate,
                    mileage_rate: newProfile.mileage_rate,
                    invited_by: 'restaurant',
                    status: 'accepted',
                    driver_name: newProfile.name,
                    restaurant_name: 'Demo_Restaurant',
                    restaurant_postcode: form.postcode // Correctly use form.postcode
                }).select().single();

                if (connectionError) throw connectionError;
                newConnection = connectionData;

            } else if (newProfile.role === 'restaurant') {
                const { data: connectionData, error: connectionError } = await supabase.from('connections').insert({
                    driver_id: DEFAULT_DRIVER_ID,
                    restaurant_id: newProfile.id,
                    hourly_rate: newProfile.hourly_rate,
                    mileage_rate: newProfile.mileage_rate,
                    invited_by: 'driver',
                    status: 'accepted',
                    driver_name: 'Demo_Driver',
                    restaurant_name: newProfile.name,
                    restaurant_postcode: DEFAULT_RESTAURANT_POSTCODE,
                    // isPaid: false

                }).select().single();

                if (connectionError) throw connectionError;

                newConnection = connectionData;
            }

            // 3. Update the profile with the active connection details using a new API call.
            if (newConnection) {
                const activeConnectionName = newProfile.role === 'driver' ? newConnection.restaurant_name : newConnection.driver_name;

                const { data: updatedProfile, error: updateError } = await supabase.from('profiles').update({
                    active_connection_id: newConnection.id,
                    active_connection_name: activeConnectionName,
                }).eq('id', newProfile.id).select().single();

                if (updateError) {
                    Alert.alert('Error', 'Profile created, but failed to set default connection: ' + updateError.message);
                    console.log("Error During Profile Update:", updateError.message);
                    setProfile(newProfile);
                } else {
                    Alert.alert('Success', 'Profile and default connection created!');
                    setProfile(updatedProfile);
                }

                router.replace('/(tabs)');
            } else {
                Alert.alert('Error', 'Profile created but failed to create a default connection.');
                console.log('Error - Profile created but failed to create a default connection.');
                setProfile(newProfile);
            }

        } catch (err: any) {
            console.error("Profile submission failed", err);
            Alert.alert('Network Error', err.message || 'Profile submission failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={{ backgroundColor: color.primary_bg, flex: 1 }}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <ScrollView contentContainerStyle={{ padding: 20, flexGrow: 1 }}>

                    <LineBreak height={Platform.OS === "android" ? 50 : 0} />
                    <UIText type='title'>Complete your profile</UIText>
                    <LineBreak height={10} />

                    <UIText type='base'>Please enter all details to create your profile</UIText>

                    <LineBreak height={30} />

                    <View style={{ flexDirection: 'row', gap: 15, marginBottom: 20 }}>
                        {['driver', 'restaurant'].map((role) => (

                            <UIButton
                                key={role}
                                label={role.charAt(0).toUpperCase() + role.slice(1)}
                                onPress={() => handleRoleSelect(role as 'driver' | 'restaurant')}
                                icon={role === 'driver' ? <FontAwesome5 name="car" size={24} color={form.role === role ? color.white : color.black} /> : <Ionicons name="restaurant" size={24} color={form.role === role ? color.white : color.black} />}

                                style={{
                                    paddingVertical: 15,
                                    paddingHorizontal: 20,
                                    borderRadius: 8,
                                    backgroundColor: form.role === role ? color.success : color.white,
                                    flex: 1
                                }}
                                textStyle={{
                                    color: form.role === role ? color.white : color.black,
                                    fontWeight: 'bold'
                                }}
                            />
                        ))}
                    </View>
                    <UIText> You are Registering as a {form.role} </UIText>
                    <LineBreak />

                    <UIInput placeholder={form.role === 'restaurant' ? 'Restaurant Name' : 'Full Name'}
                        value={form.name} onChangeText={(v) => handleChange('name', v)} iconName="user-tie" />
                    <UIInput placeholder="Email" value={form.email} onChangeText={(v) => handleChange('email', v)} iconName="mail-bulk" keyboardType="email-address" />

                    <UIInput
                        placeholder="Hourly Rate"
                        value={String(form.hourly_rate)}
                        onChangeText={(v) => handleChange('hourly_rate', v)}
                        iconName="pound-sign"
                        keyboardType="numeric"
                    />

                    {/* New Input for Mileage Rate */}
                    <UIInput
                        placeholder="Mileage Rate"
                        value={String(form.mileage_rate)}
                        onChangeText={(v) => handleChange('mileage_rate', v)}
                        iconName="car"
                        keyboardType="numeric"
                    />
                    {/* <UIInput placeholder="House Number" value={form.house_number} onChangeText={(v) => handleChange('house_number', v)} iconName="home" /> */}
                    <UIInput placeholder="Street Address" value={form.street} onChangeText={(v) => handleChange('street', v)} iconName="road" />
                    <UIInput placeholder="Town" value={form.town} onChangeText={(v) => handleChange('town', v)} iconName="city" />
                    <UIInput placeholder="Postcode" value={form.postcode} onChangeText={(v) => handleChange('postcode', v)} iconName="mail-bulk" />
                    {/* <UIInput placeholder="Country" value={form.country} onChangeText={(v) => handleChange('country', v)} iconName="globe" /> */}
                    <LineBreak />





                    <View style={{ marginTop: 20 }}>

                        <UIButton label={loading ? "Submitting..." : "Submit Profile"}
                            onPress={submitProfile}
                            disabled={loading}
                        />

                        {loading && (
                            <ActivityIndicator size="small" style={{ marginTop: 10 }} />
                        )}
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const input = {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 12,
    marginBottom: 12,
    borderRadius: 8,
};