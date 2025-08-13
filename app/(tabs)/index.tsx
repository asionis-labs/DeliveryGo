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

    const triggerRefresh = () => {
        setRefreshKey(prevKey => prevKey + 1);
    };

    useEffect(() => {
        const fetchData = async () => {
            if (!profile?.id) {
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

            // Fetch all connections first for the dropdown menu
            const { data: connectionsData, error: connectionsError } = await supabase
                .from('connections')
                .select('*')
                .or(`driver_id.eq.${profile.id},restaurant_id.eq.${profile.id}`)
                .eq('status', 'accepted');


            if (connectionsError) {
                Alert.alert("Error fetching connections", connectionsError.message);
                setConnections([]);
                setDeliveries([]);
                setShifts([]);
                setLoading(false);
                return;
            }

            setConnections(connectionsData || []);

            // Conditional fetching based on whether a connection is active
            let deliveriesQuery = supabase.from('deliveries').select('*');
            let shiftsQuery = supabase.from('shifts').select('*');
            console.log("Active Conn ID OUTside", profile.active_connection_id);

            if (profile.active_connection_id) {
                console.log("Active Conn ID", profile.active_connection_id);

                // Fetch data for the active connection
                deliveriesQuery = deliveriesQuery.eq('connection_id', profile.active_connection_id);
                shiftsQuery = shiftsQuery.eq('connection_id', profile.active_connection_id);
            } else {
                // Fetch data for the "Self_Driving" state
                if (profile.role === 'driver') {
                    deliveriesQuery = deliveriesQuery.eq('driver_id', profile.id).is('connection_id', null);
                    shiftsQuery = shiftsQuery.eq('driver_id', profile.id).is('connection_id', null);
                } else {
                    deliveriesQuery = deliveriesQuery.eq('restaurant_id', profile.id).is('connection_id', null);
                    shiftsQuery = shiftsQuery.eq('restaurant_id', profile.id).is('connection_id', null);
                }
            }

            // Add date filter to both queries
            deliveriesQuery = deliveriesQuery.gte('created_at', today);
            shiftsQuery = shiftsQuery.gte('created_at', today);

            const [
                { data: deliveriesData, error: deliveriesError },
                { data: shiftsData, error: shiftsError },
            ] = await Promise.all([
                deliveriesQuery,
                shiftsQuery,
            ]);

            if (deliveriesError || shiftsError) {
                Alert.alert("Error fetching data", deliveriesError?.message || shiftsError?.message);
                setDeliveries([]);
                setShifts([]);
            } else {
                setDeliveries(deliveriesData || []);
                setShifts(shiftsData || []);
            }

            setLoading(false);
        };
        fetchData();

    }, [profile?.id, profile?.active_connection_id, refreshKey, setDeliveries, setShifts, setConnections]);

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