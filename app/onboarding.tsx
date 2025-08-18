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
import { Line } from 'react-native-svg';

// Define the Connection type
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
    restaurant_postcode: string;
    subscription_end?: string;
    local_rate?: number;
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
    hourly_rate: any;
    mileage_rate: any;
    local_rate: any
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
        hourly_rate: "",
        mileage_rate: 0.7,
        local_rate: ""

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
                mileage_rate: profile.mileage_rate || 0.7,
                local_rate: profile.mileage_rate || 0.7
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
            let subscriptionEndDate: string | null = null;
            const userPhone = session?.user?.phone;

            if (userPhone) {
                // Check if the user has a trial history
                const { data: trialHistory, error: historyError } = await supabase
                    .from('user_trial_history')
                    .select('trial_start_date')
                    .eq('phone', userPhone)
                    .single();

                if (historyError && historyError.code !== 'PGRST116') {
                    // PGRST116 is the "no rows found" error, which is expected for new users.
                    throw historyError;
                }

                if (!trialHistory) {
                    // User has no trial history, so give them a 10-day trial.
                    const trialDurationDays = 10;
                    const trialEndDate = new Date();
                    trialEndDate.setDate(trialEndDate.getDate() + trialDurationDays);
                    subscriptionEndDate = trialEndDate.toISOString();

                    // Insert a record into the trial history table
                    const { error: insertError } = await supabase
                        .from('user_trial_history')
                        .insert({ phone: userPhone });

                    if (insertError) {
                        throw insertError;
                    }
                }
            }

            // Create or update the user's base profile.
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
                local_rate: form.local_rate,
                subscription_end: subscriptionEndDate,
            }).select().single();

            if (profileError) {
                Alert.alert('Error', profileError.message);
                console.log("Error During Profile Create:", profileError.message);
                setLoading(false);
                return;
            }

            let newConnection: Connection | null = null;

            // Create the default connection and get the connection data.
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
                    restaurant_postcode: form.postcode,
                    subscription_end: subscriptionEndDate // **CORRECTED:** Pass the subscription date to the connection table.
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
                    subscription_end: subscriptionEndDate,
                    local_rate: newProfile.local_rate || 0.75
                }).select().single();

                if (connectionError) throw connectionError;
                newConnection = connectionData;
            }

            // Update the profile with the active connection details and subscription end date.
            if (newConnection) {
                const activeConnectionName = newProfile.role === 'driver' ? newConnection.restaurant_name : newConnection.driver_name;

                const { data: updatedProfile, error: updateError } = await supabase.from('profiles').update({
                    active_connection_id: newConnection.id,
                    active_connection_name: activeConnectionName,
                    subscription_end: subscriptionEndDate // **CORRECTED:** Ensure this is included in the final update.
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
                    <UIText type='title'>Create your profile</UIText>
                    <LineBreak height={10} />

                    <LineBreak height={30} />

                    <UIText> Are You Driver or Owner?</UIText>
                    <LineBreak />


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
                                    backgroundColor: form.role === role ? color.error : color.white,
                                    flex: 1
                                }}
                                textStyle={{
                                    color: form.role === role ? color.white : color.black,
                                    fontWeight: 'bold'
                                }}
                            />
                        ))}
                    </View>

                    <UIText type='base'> {form.role === 'restaurant' ? 'Restaurant Name' : 'Full Name'} </UIText>
                    <LineBreak height={5} />


                    <UIInput placeholder={form.role === 'restaurant' ? 'Pizza House' : 'Muhammad Khalid '}
                        value={form.name} onChangeText={(v) => handleChange('name', v)} iconName="user-tie" />


                    <UIText type='base'> Email Address </UIText>
                    <LineBreak height={5} />
                    <UIInput placeholder="example@gmail.com" value={form.email} onChangeText={(v) => handleChange('email', v)} iconName="mail-bulk" keyboardType="email-address" />

                    <UIText type='base'> Payment Per Hour </UIText>
                    <LineBreak height={5} />
                    <UIInput
                        placeholder="£12.21"
                        value={String(form.hourly_rate)}
                        onChangeText={(v) => handleChange('hourly_rate', v)}
                        iconName="pound-sign"
                        keyboardType="numeric"
                    />

                    {form.role === 'restaurant' && (

                        <View>

                            <UIText type='base'> Local delivery rate under 1 mile </UIText>
                            <LineBreak height={5} />
                            <UIInput
                                placeholder="£0.9"
                                value={String(form.local_rate || '')}
                                onChangeText={(v) => handleChange('local_rate', v)}
                                iconName="money-bill-wave"
                                keyboardType="numeric"
                            />

                        </View>

                    )}




                    {form.role === 'restaurant' && (
                        <View>
                            <UIText type='base'>Per Money Per Mileage </UIText>
                            <UIText type='base' style={{ fontSize: 14, color: color.text_light }}>
                                For example driving 4 miles: £{(form.mileage_rate * 2).toFixed(2)} and 8 miles: £{(form.mileage_rate * 4).toFixed(2)}
                            </UIText>
                            <LineBreak height={5} />
                            <UIInput
                                placeholder="£0.75"
                                value={String(form.mileage_rate)}
                                onChangeText={(v) => handleChange('mileage_rate', v)}
                                iconName="car"
                                keyboardType="numeric"
                            />
                        </View>
                    )}




                    <UIText type='base'> Street Address </UIText>
                    <LineBreak height={5} />
                    <UIInput placeholder="99 Kenton Gardens" value={form.street} onChangeText={(v) => handleChange('street', v)} iconName="road" />

                    <UIText type='base'> City or Twon </UIText>
                    <LineBreak height={5} />
                    <UIInput placeholder="Saint Albans" value={form.town} onChangeText={(v) => handleChange('town', v)} iconName="city" />


                    <UIText type='base'> Post Code </UIText>
                    <LineBreak height={5} />
                    <UIInput placeholder="AL1 1JS" value={form.postcode} onChangeText={(v) => handleChange('postcode', v)} iconName="mail-bulk" />
                    <LineBreak />
                    <View style={{ marginTop: 20 }}>

                        <UIButton label={loading ? "Submitting..." : "Create Your Profile"}
                            onPress={submitProfile}
                            disabled={loading}
                        />

                        {loading && (
                            <ActivityIndicator size="small" style={{ marginTop: 10 }} />
                        )}

                        <LineBreak />
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