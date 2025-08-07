import { useRouter } from 'expo-router';
import React, { useState, useRef, useEffect } from 'react';
import { SafeAreaView, View, TextInput, Button, Alert, ActivityIndicator, useColorScheme } from 'react-native';

import { supabase } from '@/lib/supabase';
import { UIText } from '@/components/UIText';
import LineBreak from '@/components/LineBreak';
import { useColors } from '@/hooks/useColors';
import { dataStore } from '@/store/dataStore';
import { UIButton } from '@/components/UIButton';

const PhoneInput = require('react-native-phone-number-input').default;

export default function AuthScreen() {
    const [phone, setPhone] = useState('');
    const [otp, setOTP] = useState('');
    const [sentOTP, setSentOTP] = useState(false);
    const [loading, setLoading] = useState(false);

    const [resendCooldown, setResendCooldown] = useState(0);
    const resendTimer = useRef<number | null>(null);

    const phoneInput = useRef<any>(null);
    const otpInputRef = useRef<TextInput>(null); // ✅ Ref for OTP input
    const color = useColors();
    const isDark = useColorScheme() === 'dark';
    const router = useRouter();

    // ✅ Clean up timer on unmount
    useEffect(() => {
        return () => {
            if (resendTimer.current !== null) {
                clearInterval(resendTimer.current);
            }
        };
    }, []);

    const startResendCooldown = () => {
        setResendCooldown(60);
        resendTimer.current = setInterval(() => {
            setResendCooldown((prev) => {
                if (prev <= 1) {
                    if (resendTimer.current !== null) {
                        clearInterval(resendTimer.current);
                        resendTimer.current = null;
                    }
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const handleSendOTP = async () => {
        const isValid = phoneInput.current?.isValidNumber(phone);
        if (!isValid) {
            Alert.alert('Invalid Phone Number', 'Please enter a valid phone number.');
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.auth.signInWithOtp({ phone });
            if (error) {
                console.error('OTP send error:', error);
                Alert.alert('Failed to send OTP', error.message);
            } else {
                setSentOTP(true);
                startResendCooldown();
                // ✅ Auto-focus the OTP input
                setTimeout(() => otpInputRef.current?.focus(), 100);
            }
        } catch (err) {
            console.error('Network error:', err);
            Alert.alert('Network Error', 'Unable to send OTP. Please try again later.');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOTP = async () => {
        setLoading(true);
        try {
            const { data: { session }, error } = await supabase.auth.verifyOtp({
                phone,
                token: otp,
                type: 'sms',
            });

            if (error) {
                console.error('OTP verification error:', error);
                Alert.alert('Invalid OTP', error.message);
                return;
            }

            if (!session) {
                Alert.alert('Unexpected Error', 'No session returned. Please try again.');
                return;
            }
            dataStore.getState().setSession(session);
            // ✅ Reset state on successful login
            setSentOTP(false);
            setOTP('');
            setResendCooldown(0);
            router.replace('/');

        } catch (err) {
            console.error('Verification failed:', err);
            Alert.alert('Network Error', 'OTP verification failed. Try again later.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: color.primary_bg }}>
            <View style={{ flex: 1, paddingHorizontal: 30, paddingVertical: 30 }}>
                <View style={{ marginTop: 40, marginBottom: 20 }}>
                    <UIText type="subtitle">Welcome to</UIText>
                    <LineBreak height={10} />
                    <UIText type="large">DeliveryGo</UIText>
                    <LineBreak height={20} />
                    <UIText type="subtitle">Sign in with your phone number</UIText>
                </View>

                <LineBreak height={30} />

                <PhoneInput
                    ref={phoneInput}
                    placeholder="Phone Number"
                    defaultValue={phone}
                    defaultCode="GB"
                    layout="second"
                    onChangeFormattedText={setPhone}
                    containerStyle={{
                        borderRadius: 10,
                        overflow: 'hidden',
                        width: '100%',
                        backgroundColor: color.white,
                    }}
                    textInputStyle={{ fontSize: 20, letterSpacing: 1.5 }}
                    codeTextStyle={{ fontSize: 18, letterSpacing: 1 }}
                    withDarkTheme={isDark}
                    withShadow
                    disabled={sentOTP}
                />

                <LineBreak height={20} />

                {!sentOTP && (
                    <UIButton label='Send OTP' onPress={handleSendOTP} disabled={loading} />
                )}


                {sentOTP && (
                    <View>
                        <TextInput
                            ref={otpInputRef}
                            onChangeText={setOTP}
                            value={otp}
                            placeholder="Enter OTP"
                            keyboardType="number-pad"
                            autoComplete="one-time-code"
                            maxLength={6}
                            style={{
                                borderColor: color.inputBG,
                                fontSize: 18,
                                borderWidth: 0,
                                borderRadius: 10,
                                padding: 20,
                                marginTop: 20,
                                backgroundColor: color.white,
                            }}
                        />

                        <LineBreak height={20} />
                        <UIButton label='Verify Phone' onPress={handleVerifyOTP} disabled={loading} />

                        <LineBreak height={20} />
                        {resendCooldown > 0 ? (
                            <Button title={`Resend OTP in ${resendCooldown}s`} disabled />
                        ) : (
                            <Button title="Resend OTP" onPress={handleSendOTP} />
                        )}
                    </View>
                )}

                {loading && (
                    <View style={{ marginTop: 30 }}>
                        <ActivityIndicator size="large" color={color.btn} />
                    </View>
                )}
            </View>
        </SafeAreaView>
    );
}