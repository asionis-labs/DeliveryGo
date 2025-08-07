import { View, StyleSheet, TouchableOpacity, Platform, Linking, Alert } from "react-native";
import { UIText } from "@/components/UIText";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useColors } from "@/hooks/useColors";
import { useState } from "react";
import { UIModal } from "@/components/UIModal";
import LineBreak from "@/components/LineBreak";
import { UIButton } from "@/components/UIButton";
import { supabase } from "@/lib/supabase";
import { dataStore } from "@/store/dataStore";

interface DeliveryItemProps {
    item: {
        id: string;
        address: string;
        earning: number;
        distance_miles: number;
        verify_code: string;
        customer_phone: string;
        postcode: string;
        country: string;
        status: 'ongoing' | 'completed';
        start_time: string;
        completed_at: string | null;
        driver_id: string;
        restaurant_id: string;
        connection_id: string | null;
        shift_id: string | null;
    };
    onRefresh: () => void;
}

export default function DeliveryItem({ item, onRefresh }: DeliveryItemProps) {

    const [modalVisible, setModalVisible] = useState(false);
    const color = useColors();
    const { deliveries, setDeliveries } = dataStore();

    const handleDirection = (address: string) => {
        const mapURL = Platform.select({
            ios: `http://maps.apple.com/?q=${encodeURIComponent(address)}`,
            android: `geo:0,0?q=${encodeURIComponent(address)}`,
        });
        if (mapURL) {
            Linking.openURL(mapURL);
        }
    };

    const handleMarkAsDelivered = async () => {
        setModalVisible(false);

        // Optimistic UI update: Instantly update Zustand state
        const updatedDeliveries = deliveries.map(delivery => {
            if (delivery.id === item.id) {
                return { ...delivery, status: 'completed', completed_at: new Date().toISOString() };
            }
            return delivery;
        });
        setDeliveries(updatedDeliveries);

        const { error } = await supabase
            .from('deliveries')
            .update({ status: 'completed', completed_at: new Date().toISOString() })
            .eq('id', item.id)
            .select();

        if (error) {
            Alert.alert("Error", `Failed to update delivery status: ${error.message}`);
            setDeliveries(deliveries);
        } else {
            onRefresh();
        }
    };

    const formatTime = (timeString: string | null): string => {
        if (!timeString) return '--:--';
        const date = new Date(timeString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    };

    const statusColor = item.status === 'completed' ? color.success : color.error;

    return (
        <View style={[styles.container, { backgroundColor: color.white }]}>
            <TouchableOpacity
                style={{ flex: 1, rowGap: 5 }}
                onPress={() => setModalVisible(true)}
            >
                <UIText type="semiBold">{item.address}</UIText>
                <View style={{ flexDirection: "row", rowGap: 0, columnGap: 15, flexWrap: "wrap" }}>
                    <UIText type="base" style={{ color: color.btn, fontSize: 16 }}>£{item.earning?.toFixed(2) || '0.00'}</UIText>
                    <UIText type="base" style={{ fontSize: 16, color: color.text_light }}>{item.distance_miles} miles</UIText>
                    <UIText type="base" style={{ fontSize: 16, color: color.text_light }}>{item.verify_code ? `Code: ${item.verify_code}` : null}</UIText>
                </View>
                <View style={{ flexDirection: "row", rowGap: 0, columnGap: 15, flexWrap: "wrap" }}>
                    <UIText type="base" style={{ fontSize: 16, color: statusColor }}>{item.status.charAt(0).toUpperCase() + item.status.slice(1)}</UIText>
                    <UIText type="base" style={{ fontSize: 16, color: color.text_light }}>Phone: {item.customer_phone}</UIText>
                </View>
            </TouchableOpacity>

            <TouchableOpacity
                onPress={() => handleDirection(item.address)}
                style={{ paddingVertical: 20, paddingLeft: 15, paddingRight: 10, borderRadius: 10, }} >
                <FontAwesome name="location-arrow" size={24} color={color.btn} />
            </TouchableOpacity>

            <UIModal
                isVisible={modalVisible}
                onClose={() => setModalVisible(false)}
                title={"Delivery Details"}
            >
                <View style={{ flexDirection: "column", gap: 10 }}>
                    <LineBreak height={20} />
                    <UIText type="subtitle">{item.address}, {item.postcode}, {item.country}</UIText>
                    <LineBreak />
                    <View style={modalStyles.row}>
                        <UIText type="semiBold">Status</UIText>
                        <UIText style={{ color: statusColor }}>{item.status.charAt(0).toUpperCase() + item.status.slice(1)}</UIText>
                    </View>
                    <View style={modalStyles.row}>
                        <UIText type="semiBold">Verification Code</UIText>
                        <UIText>{item.verify_code}</UIText>
                    </View>
                    <View style={modalStyles.row}>
                        <UIText type="semiBold">Customer Phone</UIText>
                        <UIText>{item.customer_phone}</UIText>
                    </View>
                    <View style={modalStyles.row}>
                        <UIText type="semiBold">PostCode</UIText>
                        <UIText>{item.postcode}</UIText>
                    </View>
                    <View style={modalStyles.row}>
                        <UIText type="semiBold">Country</UIText>
                        <UIText>{item.country}</UIText>
                    </View>
                    <View style={modalStyles.row}>
                        <UIText type="semiBold">Distance</UIText>
                        <UIText>{item.distance_miles} miles</UIText>
                    </View>
                    <LineBreak />
                    <View style={modalStyles.row}>
                        <UIText type="semiBold">Start Time</UIText>
                        <UIText>{formatTime(item.start_time)}</UIText>
                    </View>
                    <View style={modalStyles.row}>
                        <UIText type="semiBold">End Time</UIText>
                        <UIText>{formatTime(item.completed_at)}</UIText>
                    </View>
                    <View style={modalStyles.row}>
                        <UIText type="semiBold">Earning</UIText>
                        <UIText style={{ color: color.btn }}>£{item.earning?.toFixed(2) || '0.00'}</UIText>
                    </View>
                    <LineBreak />
                    {item.status === 'ongoing' && (
                        <View style={modalStyles.buttonRow}>
                            <UIButton
                                label="Mark as delivered"
                                onPress={handleMarkAsDelivered}
                                type="normal"
                                style={{ flex: 1, backgroundColor: color.error }}
                            />
                            <UIButton
                                label="Directions"
                                onPress={() => handleDirection(item.address)}
                                type="normal"
                                style={{ flex: 1 }}
                            />
                        </View>
                    )}
                </View>
            </UIModal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        borderRadius: 12,
        padding: 16,
        marginHorizontal: 20,
        marginBottom: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        gap: 5,
        elevation: 3,
    },
});

const modalStyles = StyleSheet.create({
    text: {
        marginTop: 5,
        marginBottom: 15,
        color: 'gray'
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 15,
        marginTop: 15,
        marginBottom: 10,
    },
});