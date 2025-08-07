// HomeScreen.tsx
import { SafeAreaView, StyleSheet, View, StatusBar, FlatList, Alert, ActivityIndicator } from 'react-native';
import { useColors } from "@/hooks/useColors";
import DeliveryHeader from "@/components/UIS/DeliveryHeader";
import DeliveryItem from "@/components/UIS/DeliveryItem";
import TakePhoto from "@/components/UIS/TakePhoto";
import { dataStore } from "@/store/dataStore";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function HomeScreen() {
    const color = useColors();
    const [loading, setLoading] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

    const { deliveries, setDeliveries, profile, connections, setConnections, shifts, setShifts } = dataStore();

    const DataObject = {
        deliveries: deliveries,
        connections: connections,
        shifts: shifts,
        profile: profile
    };

    const sortedDeliveries = useMemo(() => {
        if (!deliveries) return [];
        return [...deliveries].sort((a, b) => {
            return new Date(b.start_time).getTime() - new Date(a.start_time).getTime();
        });
    }, [deliveries]);

    // ✅ Add a function to trigger the refresh
    const triggerRefresh = () => {
        setRefreshKey(prevKey => prevKey + 1);
    };

    useEffect(() => {
        const fetchData = async () => {
            if (!profile?.id || !profile?.active_connection_id) {
                setDeliveries([]);
                setShifts([]);
                setConnections([]);
                setLoading(false);
                return;
            }

            setLoading(true);

            const startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0);
            const today = startOfDay.toISOString();

            const [
                { data: deliveriesData, error: deliveriesError },
                { data: shiftsData, error: shiftsError },
                { data: activeConnectionData, error: connectionError }
            ] = await Promise.all([
                supabase.from('deliveries')
                    .select('*')
                    .eq('connection_id', profile.active_connection_id)
                    .gte('created_at', today),

                supabase.from('shifts')
                    .select('*')
                    .eq('connection_id', profile.active_connection_id)
                    .gte('created_at', today),

                supabase.from('connections')
                    .select('*')
                    .eq('id', profile.active_connection_id)
                    .single(),
            ]);

            if (deliveriesError || shiftsError || connectionError) {
                Alert.alert("Error fetching data", deliveriesError?.message || shiftsError?.message || connectionError?.message);
                console.error("Error fetching data:", deliveriesError || shiftsError || connectionError);
                setDeliveries([]);
                setShifts([]);
                setConnections([]);
            } else {
                setDeliveries(deliveriesData || []);
                setShifts(shiftsData || []);
                setConnections(activeConnectionData ? [activeConnectionData] : []);
            }

            setLoading(false);
        };
        fetchData();

    }, [profile?.active_connection_id, refreshKey, setDeliveries, setShifts, setConnections]);

    if (loading) {
        return (
            <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: color.primary_bg }}>
                <ActivityIndicator size="large" />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: color.primary_bg }}>
            <StatusBar
                backgroundColor={color.primary_bg}
                barStyle="dark-content"
            />
            <View style={{ flex: 1 }}>
                <FlatList
                    data={sortedDeliveries}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => <DeliveryItem item={item} onRefresh={triggerRefresh} />}
                    ListHeaderComponent={() => <DeliveryHeader data={DataObject} onRefresh={triggerRefresh} />}
                    contentContainerStyle={{ paddingBottom: 80 }}
                    extraData={deliveries}
                />
                <TakePhoto />
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({});