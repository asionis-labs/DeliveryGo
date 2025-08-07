
import {StyleSheet, View, Text, SafeAreaView} from 'react-native';

export default function Auth() {
    return (
        <SafeAreaView style={{backgroundColor: "red", flex: 1, padding: 50}}>
            <View>
                <Text> Hello </Text>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({

});




// import { useRouter } from 'expo-router';
// import React, { useState, useRef } from 'react';
// import {Button, SafeAreaView, StyleSheet, View, Alert, useColorScheme, TextInput} from 'react-native';
// import { supabase } from '@/lib/supabase';
// import {UIText} from "@/components/UIText";
// import LineBreak from "@/components/LineBreak";
// const PhoneInput = require('react-native-phone-number-input').default;
//
//
// export default function AuthScreen() {
//     const [loading, setLoading] = useState(false)
//     const [phone, setPhone] = useState("")
//     const [sentOTP, setSentOTP] = useState(false)
//     const [otp, setOTP] = useState('')
//     const router = useRouter();
//     const phoneInput = useRef<any>(null);
//
//     const colorScheme = useColorScheme();
//     const isDark = colorScheme === 'dark';
//
//
//     async function signInWithPhone() {
//         setLoading(true)
//
//         const isValid = phoneInput.current?.isValidNumber(phone);
//
//         if (!isValid){
//             Alert.alert('Invalid Phone Number', 'Please enter a valid phone number.');
//         } else {
//             const { data, error } = await supabase.auth.signInWithOtp({ phone })
//
//             if (error) {
//                 console.error('Error signing in with phone:', error)
//                 Alert.alert('Error signing in with phone', error.message || 'An error occurred while sending the OTP.');
//             } else {
//                 console.log('OTP sent successfully:', data)
//                 setSentOTP(true);
//             }
//
//             setSentOTP(true);
//         }
//
//     }
//     async function VerifyOTP() {
//
//         const { data: { session }, error, } = await supabase.auth.verifyOtp({
//             phone, token: otp, type: 'sms'
//         })
//
//         if (error) {
//             console.error('Error verifying OTP:', error)
//             Alert.alert('Invalid OTP, Try Again', error.message || 'An error occurred while verifying the OTP.');
//         } else {
//
//             console.log('OTP verified successfully:', session)
//             router.replace('/');
//         }
//     }
//
//
//     return (
//         <SafeAreaView style={styles.safeArea}>
//             <View style={styles.container}>
//
//                 <View style={styles.header}>
//                     <UIText type="subtitle">Welcome to</UIText>
//                     <LineBreak height={10}/>
//                     <UIText type="large">DeliveryGo</UIText>
//                     <LineBreak height={20}/>
//                     <UIText type="subtitle">Sign in with your phone number</UIText>
//                 </View>
//
//                 <LineBreak height={30}/>
//
//                 <View>
//                     <PhoneInput
//                         ref={phoneInput}
//                         placeholder="Phone Number"
//                         defaultValue={phone}
//                         defaultCode="GB"
//                         layout="second"
//                         onChangeFormattedText={setPhone}
//                         containerStyle={styles.phone}
//                         textInputStyle={styles.textInput}
//                         codeTextStyle={styles.countryInput}
//                         withDarkTheme={isDark}
//                         withShadow
//                         disabled={sentOTP}
//                     />
//                     <LineBreak height={20}/>
//
//                     <Button disabled={sentOTP} title="Login Now" onPress={signInWithPhone} />
//                 </View>
//
//
//                 {sentOTP && (
//                     <View>
//                         <TextInput
//                             onChangeText={(text) => setOTP(text)}
//                             value={otp}
//                             placeholder="Enter OTP"
//                             keyboardType="number-pad"
//                             autoComplete="one-time-code"
//                             maxLength={6}
//                             style={[styles.optInput, { borderColor: "t" }]}
//                         />
//                         <LineBreak height={20}/>
//                         <Button onPress={VerifyOTP} title={"Verify Phone"} />
//
//
//                     </View>
//
//                 )}
//
//
//
//             </View>
//         </SafeAreaView>
//     )
// }
//
// const styles = StyleSheet.create({
//     safeArea: {
//         flex: 1,
//         // backgroundColor: "red"
//     },
//
//     container: {
//         flex: 1,
//         paddingHorizontal: 30,
//         paddingVertical: 30,
//     },
//
//     header: {
//         alignContent: "flex-start",
//         marginTop: 40,
//         marginBottom: 20,
//     },
//
//     phone: {
//         borderRadius: 10,
//         overflow: 'hidden',
//         width: '100%',
//     },
//
//     textInput:{
//         fontSize: 20,
//         letterSpacing: 1.5,
//     },
//     countryInput:{
//         fontSize: 18,
//         letterSpacing: 1,
//     },
//
//     optInput:{
//         fontSize: 18,
//         letterSpacing: 1,
//         borderWidth: 0,
//         borderRadius: 10,
//         padding: 20,
//         marginTop: 20,
//         backgroundColor: 'white',
//     }
//
// })
