// app/(tabs)/index.tsx

import { SafeAreaView, StyleSheet, View, StatusBar, FlatList, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { useColors } from "@/hooks/useColors";
import DeliveryHeader from "@/components/UIS/DeliveryHeader";
import DeliveryItem from "@/components/UIS/DeliveryItem";
import TakePhoto from "@/components/UIS/TakePhoto";
import { dataStore } from "@/store/dataStore";
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';

export default function HomeScreen() {
    const color = useColors();
    const [loading, setLoading] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    const tabBarHeight = useBottomTabBarHeight();
    const [refreshing, setRefreshing] = useState(false);

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

            // Fetch all accepted connections for the current user
            const { data: connectionsData, error: connectionsError } = await supabase
                .from('connections')
                .select('*')
                .or(`driver_id.eq.${profile.id},restaurant_id.eq.${profile.id}`)
                .eq('status', 'accepted');

            console.log();

            if (connectionsError) {
                Alert.alert("Error fetching connections", connectionsError.message);
                setConnections([]);
            } else {
                setConnections(connectionsData || []);
            }

            // Conditional fetching based on whether a connection is active
            let deliveriesQuery = supabase.from('deliveries').select('*');
            let shiftsQuery = supabase.from('shifts').select('*');
            const connectionIds = connectionsData?.map(conn => conn.id) || [];

            if (profile.active_connection_id) {
                deliveriesQuery = deliveriesQuery.eq('connection_id', profile.active_connection_id);
                shiftsQuery = shiftsQuery.eq('connection_id', profile.active_connection_id);
            } else {
                if (profile.role === 'driver') {
                    deliveriesQuery = deliveriesQuery.or(`driver_id.eq.${profile.id},connection_id.in.(${connectionIds})`);
                    shiftsQuery = shiftsQuery.or(`driver_id.eq.${profile.id},connection_id.in.(${connectionIds})`);
                } else { // 'restaurant' role
                    deliveriesQuery = deliveriesQuery.or(`restaurant_id.eq.${profile.id},connection_id.in.(${connectionIds})`);
                    shiftsQuery = shiftsQuery.or(`restaurant_id.eq.${profile.id},connection_id.in.(${connectionIds})`);
                }

            }

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
        setRefreshing(false);


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
                    contentContainerStyle={{ paddingBottom: tabBarHeight + 20 }} // Use tabBarHeight + some extra padding
                    extraData={deliveries}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={triggerRefresh}
                        />
                    }

                />
                <View
                    style={{
                        position: 'absolute',
                        bottom: 8,
                        left: 0,
                        right: 0,
                        paddingHorizontal: 20,
                    }}
                >
                    <TakePhoto />
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({});