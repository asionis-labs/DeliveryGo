import { UIText } from "@/components/UIText";
import { UIButton } from "@/components/UIButton";
import { View, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { useColors } from "@/hooks/useColors";
import { useMemo, useState } from "react";
import { FontAwesome5 } from "@expo/vector-icons";
import * as ImagePicker from 'expo-image-picker';
import { dataStore } from "@/store/dataStore";
import Constants from 'expo-constants'
import { supabase } from "@/lib/supabase";


const getDistanceAndAddress = async (origin: string, destination: string, google_api_key: string) => {
    try {
        // const encodedDestination = encodeURIComponent(destination);
        const url = `https://maps.googleapis.com/maps/api/distancematrix/json?units=imperial&origins=${origin}&destinations=${destination}&key=${google_api_key}`;

        const response = await fetch(url);
        const data = await response.json();
        console.log("Distance Data", data);


        if (data.status === "OK" && data.rows[0].elements[0].status === "OK") {
            const distanceInMeters = data.rows[0].elements[0].distance.value;
            const distanceInMiles = distanceInMeters * 0.000621371; // Convert meters to miles
            const destination_addresses = data.destination_addresses[0];

            return {
                distance: parseFloat(distanceInMiles.toFixed(2)),
                destination_address: destination_addresses
            };
        } else {
            console.error("Distance Matrix API Error:", data.status, data.error_message);
            return null;
        }
    } catch (error) {
        console.error("Error calculating distance:", error);
    }
    return null;
};

export default function TakePhoto() {
    const color = useColors();
    const [isProcessingImage, setIsProcessingImage] = useState<boolean>(false);
    const { profile, deliveries, connections, shifts, setDeliveries } = dataStore();
    const GEMINI_API = Constants.expoConfig.extra.gemini_api;
    const Google_API = Constants.expoConfig.extra.google_api;
    const activeConnection = connections.find(c => c.id === profile?.active_connection_id);


    const isSubscriptionActive = useMemo(() => {
        if (!activeConnection?.subscription_end) return false;
        const subscriptionEnd = new Date(activeConnection.subscription_end);
        const now = new Date();
        return now < subscriptionEnd;
    }, [activeConnection]);

    const deliveryCount = useMemo(() => {
        if (!deliveries || !activeConnection) return 0;

        // **FIXED LOGIC:** Calculate the start of the current business day
        const now = new Date();
        const startOfPeriod = new Date(now);
        startOfPeriod.setHours(3, 0, 0, 0); // Start of business day is 3 AM
        if (now.getHours() < 3) {
            startOfPeriod.setDate(startOfPeriod.getDate() - 1);
        }
        const startOfPeriodISO = startOfPeriod.toISOString();

        // Filter deliveries by connection_id and created_at date
        return deliveries.filter(
            (delivery) =>
                delivery.connection_id === activeConnection.id &&
                delivery.created_at >= startOfPeriodISO
        ).length;
    }, [deliveries, activeConnection]);


    const addDelivery = async (data: any, activeConnection: any) => {
        const activeShift = shifts.find(s => s.status === 'active');

        if (!profile || !activeConnection || !activeConnection.restaurant_postcode) {
            Alert.alert("Error", "Required profile, connection, or restaurant postcode data is missing.");
            return;
        }

        const restaurantPostcode = activeConnection.restaurant_postcode;
        const distanceAndAddress = await getDistanceAndAddress(restaurantPostcode, data.address, Google_API);

        if (!distanceAndAddress) {
            Alert.alert("Error", "Could not calculate delivery distance. Please try again.");
            return;
        }

        const { distance, destination_address } = distanceAndAddress;


        const demoEarning = distance <= 1 ? activeConnection.local_rate : distance * activeConnection.mileage_rate;
        const earning = parseFloat(demoEarning.toFixed(2));


        console.log("Logs for Distance", distanceAndAddress);


        const { data: newDelivery, error } = await supabase
            .from('deliveries')
            .insert({
                driver_id: profile.id,
                restaurant_id: activeConnection.restaurant_id,
                connection_id: activeConnection.id,
                shift_id: activeShift ? activeShift.id : null,
                earning: earning,
                distance_miles: distance,
                verify_code: data.verify_code || null,
                customer_phone: data.customer_phone || null,
                address: destination_address,
                postcode: data.postcode || null,
                country: data.country || null,
                start_time: new Date().toISOString(),
                status: 'ongoing'
            })
            .select()
            .single();

        if (error) {
            Alert.alert("Error", `Failed to add delivery: ${error.message}`);
            return;
        }

        setDeliveries([...deliveries, newDelivery]);
    };


    const handleTakePhoto = async () => {

        if (!profile || !activeConnection) {
            Alert.alert("Error", "You need to have an active connection to a restaurant.");
            setIsProcessingImage(false);
            return;
        }

        if (!isSubscriptionActive) {
            const limit = 2;
            if (deliveryCount >= limit) {
                Alert.alert(
                    "Limit Reached",
                    "Your connected restaurant's subscription has expired. Please ask them to subscribe to add more deliveries."
                );
                setIsProcessingImage(false);
                return;
            }
        }

        setIsProcessingImage(true);

        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission required', 'Camera access is needed.');
            setIsProcessingImage(false);
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            quality: 1,
            base64: true,
        });

        if (result.canceled || !result.assets || !result.assets[0]) {
            setIsProcessingImage(false);
            return;
        }

        if (!activeConnection) {
            Alert.alert("Error", "You need to have an active connection to a restaurant.");
            setIsProcessingImage(false);
            return;
        }

        try {
            const base64Data = result.assets[0].base64;
            const mimeType = 'image/jpeg';

            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [
                            {
                                parts: [
                                    {
                                        text: `You are a helpful assistant for a food delivery service. I will give you A photo of a delivery note.                                        
                                        Please extract and return a valid JSON with the following fields:
                                        - \`address\`: The full address, like a proper address including House or flat number, street address, town, postcode and country. remove any duplicates.
                                        - \`postcode\`: The postcode of the delivery location (if available).
                                        - \`country\`: Country name -currently United Kingdom.
                                        - \`verify_code\`: Verification code for the delivery (if available).
                                        - \`customer_phone\`: Phone number (if available).
                                        ⚠️ Only return the JSON object with these fields. No markdown, no comments. 
                                        Example: {
                                          "address": "27 Kenton Gardens, St Albans, AL1 1JS, United Kingdom",
                                          "postcode": "AL1 1JS",
                                          "country": "United Kingdom",
                                          "verify_code": "",
                                          "customer_phone": "",
                                        }
                                        If the address is not found, return null for all fields.
                                        `
                                    },
                                    {
                                        inline_data: {
                                            mime_type: mimeType,
                                            data: base64Data,
                                        },
                                    },
                                ],
                            },
                        ],
                    }),
                },
            );

            if (!response.ok) {
                console.error("Gemini API Error:", await response.text());
                Alert.alert('Error', 'Failed to communicate with Gemini API.');
                return;
            }

            const geminiResult = await response.json();
            const rawJsonText = geminiResult?.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!rawJsonText) {
                Alert.alert('No Data', 'Gemini could not extract any data from the image. Please try again with a clearer photo.');
                return;
            }

            const jsonString = rawJsonText.replace(/```json\n|```/g, '').trim();
            const deliveryData = JSON.parse(jsonString);
            console.log("Gemini Response data from Take Photo -- ", jsonString);

            if (!deliveryData.address) {
                Alert.alert('Incomplete Data', 'Address could not be extracted. Please try again.');
                return;
            }

            await addDelivery(deliveryData, activeConnection);

        } catch (error) {
            console.error('Gemini processing error:', error);
            Alert.alert('Error', `Failed to process image: ${error.message}`);
        } finally {
            setIsProcessingImage(false);
        }
    };

    return (
        <View
            style={[
                styles.btnCont,
                { backgroundColor: color.second_bg, borderColor: color.white },
            ]}
        >
            <UIText type="base" style={{ flex: 1 }}>Add Manually</UIText>
            <View style={{}}>
                <UIButton
                    label="Take Photo"
                    type="large"
                    style={{ opacity: isProcessingImage ? 0.6 : 1, paddingHorizontal: 20, paddingVertical: 10 }}
                    textStyle={{ fontSize: 16, fontWeight: 700 }}
                    icon={<FontAwesome5 name="camera" size={24} color={color.white} />}
                    onPress={!isProcessingImage ? handleTakePhoto : undefined}
                />
                {isProcessingImage && (
                    <View style={styles.loader}>
                        <ActivityIndicator size="small" color="#ffffff" />
                    </View>
                )}
            </View>
        </View >
    );
}

// styles are already defined above

const styles = StyleSheet.create({
    btnCont: {
        borderTopWidth: 1,
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        marginBottom: 40,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 10,
    },
    loader: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1,
    },
});