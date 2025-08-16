import { View, StyleSheet, TouchableOpacity, Platform, Alert } from "react-native";
import { UIText } from "@/components/UIText";
import { useColors } from "@/hooks/useColors";
import { useMemo, useState, useEffect } from "react";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { UIModal } from "@/components/UIModal";
import { UIButton } from "@/components/UIButton";
import Foundation from '@expo/vector-icons/Foundation';
import { dataStore } from "@/store/dataStore";
import { supabase } from "@/lib/supabase";

const LineBreak = ({ height = 10 }: { height?: number }) => <View style={{ height }} />;

interface Delivery {
    id: string;
    earning: number;
    status: 'ongoing' | 'completed';
    start_time: string;
    distance_miles: number;
    connection_id: string;
}

interface Shift {
    id: string;
    start_time: string;
    end_time: string | null;
    status: 'active' | 'ended';
    connection_id: string;
}

interface Connection {
    id: string;
    restaurant_name: string;
    driver_name: string;
    hourly_rate: number;
    mileage_rate: number;
    restaurant_id: string;
    driver_id: string;
    status: 'accepted' | 'pending' | 'denied';
    subscription_end: string,
    created_at: string
}

interface Profile {
    id: string;
    role: 'driver' | 'restaurant';
    hourly_rate: number;
    mileage_rate: number;
    active_connection_id: string | null;
    active_connection_name: string | null;
    name: string;
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
    const { profile, setProfile } = dataStore();

    const deliveries = data?.deliveries || [];
    const connections = data?.connections || [];
    const shifts = data?.shifts || [];
    const activeConnection = connections.find(c => c.id === profile?.active_connection_id);

    const isSubscriptionActive = useMemo(() => {
        if (!activeConnection?.subscription_end) return false;
        const subscriptionEnd = new Date(activeConnection.subscription_end);
        const now = new Date();
        return now < subscriptionEnd;
    }, [activeConnection]);

    const displayedName = useMemo(() => {
        if (profile?.role === 'restaurant') {
            return profile.name;
        }
        return profile?.active_connection_name || "Self-Driving";
    }, [profile]);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTime(new Date());
        }, 60000);
        return () => clearInterval(interval);
    }, []);

    const deliveryEarning = useMemo(() => {
        return deliveries
            .filter(d => d.status === 'completed' && (d.connection_id === profile?.active_connection_id || profile?.active_connection_id === null))
            .reduce((sum, d) => sum + (d.earning || 0), 0);
    }, [deliveries, profile]);

    const activeShift = useMemo(() => {
        const filteredShifts = shifts.filter(s => s.connection_id === profile?.active_connection_id || profile?.active_connection_id === null);
        return filteredShifts.find(s => s.status === 'active');
    }, [shifts, profile]);

    const totalShiftDurationAndStart = useMemo(() => {
        let totalMinutes = 0;
        let firstShiftStartTime = '--:--';

        const filteredShifts = shifts.filter(s => s.connection_id === profile?.active_connection_id || profile?.active_connection_id === null);

        const now = new Date();
        const startOfPeriod = new Date(now);
        startOfPeriod.setHours(3, 0, 0, 0);
        if (now.getHours() < 3) {
            startOfPeriod.setDate(startOfPeriod.getDate() - 1);
        }

        const endOfPeriod = new Date(startOfPeriod);
        endOfPeriod.setDate(endOfPeriod.getDate() + 1);

        const todaysShifts = filteredShifts.filter(s => {
            const shiftStartTime = new Date(s.start_time);
            const shiftEndTime = s.end_time ? new Date(s.end_time) : currentTime;

            return (shiftStartTime < endOfPeriod && shiftEndTime >= startOfPeriod);
        });

        if (todaysShifts.length > 0) {
            const firstShift = todaysShifts.reduce((prev, curr) => (new Date(prev.start_time) < new Date(curr.start_time) ? prev : curr));
            const start = new Date(firstShift.start_time);
            firstShiftStartTime = start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
        }

        todaysShifts.forEach(shift => {
            const shiftStart = new Date(shift.start_time);
            let shiftEnd = shift.end_time ? new Date(shift.end_time) : currentTime;

            const effectiveStart = new Date(Math.max(shiftStart.getTime(), startOfPeriod.getTime()));
            const effectiveEnd = new Date(Math.min(shiftEnd.getTime(), endOfPeriod.getTime()));

            if (effectiveEnd > effectiveStart) {
                totalMinutes += (effectiveEnd.getTime() - effectiveStart.getTime()) / (1000 * 60);
            }
        });

        const hours = Math.floor(totalMinutes / 60);
        const minutes = Math.floor(totalMinutes % 60);

        return {
            duration: `${hours}h ${minutes}m`,
            startTime: firstShiftStartTime,
            totalMinutes
        };
    }, [shifts, profile, currentTime]);

    const hourlyEarnings = useMemo(() => {
        const hourlyRate = activeConnection?.hourly_rate || profile?.hourly_rate || 0;
        const totalMinutes = totalShiftDurationAndStart.totalMinutes;
        return (hourlyRate / 60) * totalMinutes;
    }, [profile?.hourly_rate, totalShiftDurationAndStart.totalMinutes]);

    const totalEarning = useMemo(() => {
        return hourlyEarnings + deliveryEarning;
    }, [hourlyEarnings, deliveryEarning]);

    const handleShiftToggle = async () => {
        if (!profile) {
            return Alert.alert("Error", "User profile not loaded.");
        }

        if (!isSubscriptionActive) {
            Alert.alert(
                "Subscription Required",
                "Your subscription has expired. Please update your payment to continue using this feature or call +44 7707 771599."
            );
            return;
        }

        let driverId: string;
        let restaurantId: string;
        let connectionId: string;

        if (profile.role === 'driver') {
            if (!profile.active_connection_id) {
                return Alert.alert("Error", "Please select a connection before starting a shift.");
            }
            if (!activeConnection) {
                return Alert.alert("Error", "Active connection details not found.");
            }
            driverId = profile.id;
            restaurantId = activeConnection.restaurant_id;
            connectionId = activeConnection.id;
        } else {
            if (!activeConnection) {
                return Alert.alert("Error", "Active connection details not found.");
            }
            driverId = activeConnection.driver_id;
            restaurantId = profile.id;
            connectionId = activeConnection.id;
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
                    restaurant_id: restaurantId,
                    connection_id: connectionId,
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

    const handleConnectionSelect = async (newConnectionId: string | null) => {
        if (!profile?.id) return;
        setDropdownVisible(false);

        let updateData: {
            active_connection_id: string | null;
            active_connection_name: string;
        };

        if (newConnectionId === null) {
            updateData = {
                active_connection_id: null,
                active_connection_name: "Self-Driving"
            };
        } else {
            const selectedConnection = connections.find(c => c.id === newConnectionId);
            if (!selectedConnection) return;

            updateData = {
                active_connection_id: selectedConnection.id,
                active_connection_name: selectedConnection.restaurant_name
            };
        }

        const { data: updatedProfile, error } = await supabase
            .from('profiles')
            .update(updateData)
            .eq('id', profile.id)
            .select()
            .single();

        if (error) {
            Alert.alert("Error", `Failed to switch connection: ${error.message}`);
        } else {
            if (updatedProfile) {
                setProfile(updatedProfile);
            }
        }
    };

    const displayedConnections = useMemo(() => {
        if (!connections || !profile) {
            return [];
        }

        if (profile.role === 'driver') {
            return connections.filter(conn => conn.status === 'accepted');
        }
        return [];
    }, [connections, profile]);

    return (
        <View style={{ flex: 1, padding: 20 }}>
            <View style={[{ backgroundColor: color.primary_bg }]}>
                <LineBreak height={Platform.OS === "android" ? 25 : 0} />
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <UIText type="title">Dashboard</UIText>
                    {profile?.role === 'driver' ? (
                        <TouchableOpacity
                            onPress={() => setDropdownVisible(true)}
                            style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingLeft: 20, paddingTop: 20, paddingBottom: 20 }}
                        >
                            <UIText type="semiBold"> {displayedName} </UIText>
                            <FontAwesome name="caret-down" size={16} color={color.text} />
                        </TouchableOpacity>
                    ) : (
                        <View style={{ paddingLeft: 20, paddingTop: 20, paddingBottom: 20 }}>
                            <UIText type="semiBold"> {displayedName} </UIText>
                        </View>
                    )}
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
                            <UIText>Today's Earning </UIText>
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
                    {profile?.role === 'driver' ? (
                        displayedConnections.map((conn) => (
                            <TouchableOpacity
                                key={conn.id}
                                onPress={() => handleConnectionSelect(conn.id)}
                                style={{ paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: color.second_bg }}
                            >
                                <UIText type="base" style={{ fontWeight: profile.active_connection_id === conn.id ? 'bold' : 'normal' }}>
                                    {conn.restaurant_name}
                                </UIText>
                            </TouchableOpacity>
                        ))
                    ) : (
                        <UIText style={{ marginTop: 10 }}>
                            Connections cannot be changed.
                        </UIText>
                    )}
                </UIModal>
            </View>
            <LineBreak height={20} />
            <UIText type="semiBold"> Deliveries ({deliveries.length}) </UIText>
        </View>
    );
}

const styles = StyleSheet.create({});