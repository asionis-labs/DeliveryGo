import { View, StyleSheet, TouchableOpacity, Platform, Alert } from "react-native";
import { UIText } from "@/components/UIText";
import { useColors } from "@/hooks/useColors";
import { useMemo, useState, useEffect } from "react";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { UIModal } from "@/components/UIModal";
import LineBreak from "@/components/LineBreak";
import { UIButton } from "@/components/UIButton";
import Foundation from '@expo/vector-icons/Foundation';
import { dataStore } from "@/store/dataStore";
import { supabase } from "@/lib/supabase";


// Define interfaces for better type safety
interface Delivery {
    id: string;
    earning: number;
    status: 'ongoing' | 'completed';
    start_time: string;
}

interface Shift {
    id: string;
    start_time: string;
    end_time: string | null;
    status: 'active' | 'ended';
}

interface Connection {
    id: string;
    restaurant_name: string;
    driver_name: string;
    hourly_rate: number;
    mileage_rate: number;
    restaurant_id: string;
}

interface Profile {
    id: string;
    role: 'driver' | 'restaurant';
    hourly_rate: number;
    active_connection_id: string | null;
    active_connection_name: string | null;
}

interface HeaderData {
    deliveries: Delivery[];
    connections: Connection[];
    shifts: Shift[];
    profile: Profile | null;
}

interface DeliveryHeaderProps {
    data: HeaderData;
    onRefresh: () => void;
}

export default function DeliveryHeader({ data, onRefresh }: DeliveryHeaderProps) {

    const [dropdownVisible, setDropdownVisible] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());
    const color = useColors();
    const { setProfile, profile } = dataStore();

    const deliveries = data?.deliveries || [];
    const connections = data?.connections || [];
    const shifts = data?.shifts || [];

    const displayedName = data?.profile?.active_connection_name || "Self_Driving";

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTime(new Date());
        }, 60000);

        return () => clearInterval(interval);
    }, []);

    const deliveryEarning = useMemo(() => {
        return deliveries
            .filter(d => d.status === 'completed')
            .reduce((sum, d) => sum + (d.earning || 0), 0);
    }, [deliveries]);

    const activeShift = useMemo(() => {
        return shifts.find(s => s.status === 'active');
    }, [shifts]);

    // ✅ Corrected calculation for total shift duration
    const totalShiftDurationAndStart = useMemo(() => {
        let totalMinutes = 0;
        let firstShiftStartTime = '--:--';

        // Find the earliest shift start time for display
        if (shifts.length > 0) {
            const firstShift = shifts.reduce((prev, curr) => (new Date(prev.start_time) < new Date(curr.start_time) ? prev : curr));
            const start = new Date(firstShift.start_time);
            firstShiftStartTime = start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
        }

        // Calculate the duration of each shift
        shifts.forEach(shift => {
            if (shift.status === 'ended' && shift.end_time) {
                const start = new Date(shift.start_time);
                const end = new Date(shift.end_time);
                totalMinutes += (end.getTime() - start.getTime()) / (1000 * 60);
            } else if (shift.status === 'active') {
                const start = new Date(shift.start_time);
                totalMinutes += (currentTime.getTime() - start.getTime()) / (1000 * 60);
            }
        });

        const hours = Math.floor(totalMinutes / 60);
        const minutes = Math.floor(totalMinutes % 60);

        return {
            duration: `${hours}h ${minutes}m`,
            startTime: firstShiftStartTime,
            totalMinutes
        };
    }, [shifts, activeShift, currentTime]);

    const hourlyEarnings = useMemo(() => {
        const hourlyRate = profile?.hourly_rate || 0;
        const totalMinutes = totalShiftDurationAndStart.totalMinutes;
        return (hourlyRate / 60) * totalMinutes;
    }, [profile?.hourly_rate, totalShiftDurationAndStart.totalMinutes]);

    const totalEarning = useMemo(() => {
        return hourlyEarnings + deliveryEarning;
    }, [hourlyEarnings, deliveryEarning]);

    const handleShiftToggle = async () => {
        if (!profile || !profile.active_connection_id) {
            return Alert.alert("Error", "Please select a connection before starting a shift.");
        }

        const activeConnection = connections.find(c => c.id === profile.active_connection_id);
        if (!activeConnection) {
            return Alert.alert("Error", "Active connection details not found.");
        }

        if (activeShift) {
            const { error } = await supabase
                .from('shifts')
                .update({ status: 'ended', end_time: new Date().toISOString() })
                .eq('id', activeShift.id);

            if (error) {
                Alert.alert("Error", `Failed to end shift: ${error.message}`);
            } else {
                Alert.alert("Shift Ended", "Your shift has been ended successfully.");
                onRefresh();
            }
        } else {
            const { error } = await supabase
                .from('shifts')
                .insert({
                    driver_id: profile.id,
                    restaurant_id: activeConnection.restaurant_id,
                    connection_id: profile.active_connection_id,
                    start_time: new Date().toISOString(),
                    status: 'active'
                });

            if (error) {
                Alert.alert("Error", `Failed to start shift: ${error.message}`);
            } else {
                Alert.alert("Shift Started", "Your shift has been started.");
                onRefresh();
            }
        }
    };

    const handleConnectionSelect = async (newConnection: Connection) => {
        if (!profile?.id) return;
        setDropdownVisible(false);

        const { error } = await supabase
            .from('profiles')
            .update({
                active_connection_id: newConnection.id,
                active_connection_name: profile.role === 'driver' ? newConnection.restaurant_name : newConnection.driver_name
            })
            .eq('id', profile.id);

        if (error) {
            Alert.alert("Error", `Failed to switch connection: ${error.message}`);
        }
        onRefresh();
    };

    return (
        <View style={{ flex: 1, padding: 20 }}>
            <View style={[styles.container, { backgroundColor: color.primary_bg }]}>
                <LineBreak height={Platform.OS === "android" ? 25 : 0} />
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <UIText type="title">Dashboard</UIText>
                    <TouchableOpacity
                        onPress={() => setDropdownVisible(true)}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingLeft: 20, paddingTop: 20, paddingBottom: 20 }}
                    >
                        <UIText type="semiBold"> {displayedName} </UIText>
                        <FontAwesome name="caret-down" size={16} color={color.text} />
                    </TouchableOpacity>
                </View>
                <View style={{
                    backgroundColor: color.white, padding: 20, borderRadius: 15, marginTop: 10,
                    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowRadius: 8, shadowOpacity: 0.1, elevation: 5,
                }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", flex: 1 }}>
                        <View style={{ flex: 1 }}>
                            <UIText>Delivery Fees </UIText>
                            <UIText type="subtitle" style={{ marginTop: 5, color: color.btn }}> £{deliveryEarning.toFixed(2)} </UIText>
                        </View>
                        <View style={{ flex: 1 }}>
                            <UIText style={{ textAlign: "right" }}>Shift Duration </UIText>
                            <UIText type="semiBold" style={{ marginTop: 5, color: color.text_light, textAlign: "right" }}>{totalShiftDurationAndStart.duration}</UIText>
                        </View>
                    </View>
                    <LineBreak height={20} />
                    <View style={{ flex: 1, flexDirection: "row", justifyContent: "space-between", gap: 20, alignItems: "center" }}>
                        <View style={{ flex: 2 }}>
                            <UIText>Today&#39;s Earning </UIText>
                            <UIText type="subtitle" style={{ marginTop: 5, color: color.btn }}> £{totalEarning.toFixed(2)} </UIText>
                        </View>
                        <UIButton
                            label={activeShift ? "End" : "Start"}
                            onPress={handleShiftToggle}
                            style={{
                                flex: 1,
                                paddingVertical: 20,
                                borderRadius: 15,
                                backgroundColor: activeShift ? color.success : color.error
                            }}
                            icon={<Foundation name="key" size={24} color={color.white} />}
                        />
                    </View>
                </View>
                <UIModal title="Select Connection" isVisible={dropdownVisible} onClose={() => setDropdownVisible(false)}>
                    {connections.length > 0 ? (
                        connections.map((conn) => (
                            <TouchableOpacity
                                key={conn.id}
                                onPress={() => handleConnectionSelect(conn)}
                                style={{ paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: color.second_bg }}
                            >
                                <UIText type="base">{profile?.role === 'driver' ? conn.restaurant_name : conn.driver_name}</UIText>
                            </TouchableOpacity>
                        ))
                    ) : (
                        <UIText>No connections available.</UIText>
                    )}
                </UIModal>
            </View>
            <LineBreak height={20} />
            <UIText type="semiBold"> Deliveries ({deliveries.length}) </UIText>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {},
});