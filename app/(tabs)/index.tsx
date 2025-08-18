import { SafeAreaView, StyleSheet, View, StatusBar, FlatList, Alert, ActivityIndicator, RefreshControl, Platform } from 'react-native';
import React, { useEffect, useMemo, useState } from "react";
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';

import { useColors } from "@/hooks/useColors";
import DeliveryHeader from "@/components/UIS/DeliveryHeader";
import DeliveryItem from "@/components/UIS/DeliveryItem";
import TakePhoto from "@/components/UIS/TakePhoto";
import { dataStore } from "@/store/dataStore";
import { supabase } from "@/lib/supabase";

export default function HomeScreen() {
    const color = useColors();

    const [loading, setLoading] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    const tabBarHeight = useBottomTabBarHeight();
    const [refreshing, setRefreshing] = useState(false);

    const { deliveries, setDeliveries, profile, connections, setConnections, shifts, setShifts } = dataStore();
    const activeConnection = connections.find(c => c.id === profile?.active_connection_id);

    // FIX: Pass the sorted/filtered deliveries to the DataObject
    const sortedDeliveries = useMemo(() => {
        if (!deliveries) return [];

        const activeConnectionId = activeConnection?.id;
        const filtered = deliveries.filter(delivery => delivery.connection_id === activeConnectionId);

        return [...filtered].sort((a, b) => {
            return new Date(b.start_time).getTime() - new Date(a.start_time).getTime();
        });
    }, [deliveries, activeConnection]);

    // FIX: Update DataObject to use the sortedDeliveries list
    const DataObject = {
        deliveries: sortedDeliveries,
        connections: connections,
        shifts: shifts,
        profile: profile
    };

    const triggerRefresh = () => {
        setRefreshing(true);
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

            // Fetch all accepted connections for the current user
            const { data: connectionsData, error: connectionsError } = await supabase
                .from('connections')
                .select('*')
                .or(`driver_id.eq.${profile.id},restaurant_id.eq.${profile.id}`)
                .eq('status', 'accepted');

            if (connectionsError) {
                Alert.alert("Error fetching connections", connectionsError.message);
                setConnections([]);
            } else {
                setConnections(connectionsData || []);
            }

            const now = new Date();
            const startOfPeriod = new Date(now);
            startOfPeriod.setHours(3, 0, 0, 0);
            if (now.getHours() < 3) {
                startOfPeriod.setDate(startOfPeriod.getDate() - 1);
            }
            const todayISO = startOfPeriod.toISOString();

            // Calculate the end of the business day for the query
            const endOfPeriod = new Date(startOfPeriod);
            endOfPeriod.setDate(endOfPeriod.getDate() + 1);
            const endOfPeriodISO = endOfPeriod.toISOString();

            // Fetch all deliveries created since the start of today's period
            const { data: deliveriesData, error: deliveriesError } = await supabase
                .from('deliveries')
                .select('*')
                .eq(profile.role === 'driver' ? 'driver_id' : 'restaurant_id', profile.id)
                .gte('created_at', todayISO);

            // Fetch all shifts that overlap with today's business day
            const { data: shiftsData, error: shiftsError } = await supabase
                .from('shifts')
                .select('*')
                .eq(profile.role === 'driver' ? 'driver_id' : 'restaurant_id', profile.id)
                .or(`status.eq.active,end_time.gte.${todayISO}`)
                .lt('start_time', endOfPeriodISO);

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
                    contentContainerStyle={{ paddingBottom: tabBarHeight + 20 }}
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
                        bottom: Platform.OS === 'ios' ? 8 : -40,
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