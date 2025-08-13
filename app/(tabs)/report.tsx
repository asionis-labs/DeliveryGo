import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ActivityIndicator, ScrollView, Dimensions, TouchableOpacity, StyleSheet } from 'react-native';
import { dataStore } from '@/store/dataStore';
import { supabase } from '@/lib/supabase';
import { TabView, TabBar } from 'react-native-tab-view';
import { LineChart } from 'react-native-chart-kit';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { UIModal } from '@/components/UIModal';
import { UIText } from '@/components/UIText';
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Svg, Circle, Text as SvgText } from 'react-native-svg';

const screenWidth = Dimensions.get('window').width;

interface Delivery {
    id: string;
    earning: number;
    status: 'ongoing' | 'completed';
    start_time: string;
    completed_at: string | null;
    created_at: string;
    distance_miles: number;
}

interface Shift {
    id: string;
    start_time: string;
    end_time: string | null;
    status: 'active' | 'ended';
    created_at: string;
}

interface Connection {
    id: string;
    restaurant_name: string;
    driver_name: string;
    hourly_rate: number;
    mileage_rate: number;
    restaurant_id: string;
    driver_id: string;
}

const getReportDataForPeriod = (
    data: { deliveries: Delivery[]; shifts: Shift[] },
    period: 'today' | 'week' | 'month' | 'year'
) => {
    const now = new Date();
    let startDate: Date;

    switch (period) {
        case 'today':
            startDate = new Date(now.setHours(0, 0, 0, 0));
            break;
        case 'week':
            startDate = new Date(now.setDate(now.getDate() - 7));
            break;
        case 'month':
            startDate = new Date(now.setMonth(now.getMonth() - 1));
            break;
        case 'year':
            startDate = new Date(now.setFullYear(now.getFullYear() - 1));
            break;
        default:
            startDate = new Date(0);
    }

    const filteredDeliveries = data.deliveries.filter(d => new Date(d.created_at) >= startDate);
    const filteredShifts = data.shifts.filter(s => new Date(s.start_time) >= startDate);

    const aggregatedEarnings = filteredDeliveries.reduce((sum, d) => sum + (d.earning || 0), 0);
    const aggregatedMileage = filteredDeliveries.reduce((sum, d) => sum + (d.distance_miles || 0), 0);

    let totalShiftDurationMinutes = 0;
    filteredShifts.forEach(shift => {
        if (shift.status === 'ended' && shift.end_time) {
            const start = new Date(shift.start_time);
            const end = new Date(shift.end_time);
            totalShiftDurationMinutes += (end.getTime() - start.getTime()) / (1000 * 60);
        } else if (shift.status === 'active') {
            const start = new Date(shift.start_time);
            totalShiftDurationMinutes += (now.getTime() - start.getTime()) / (1000 * 60);
        }
    });

    const chartLabels = [...new Set(filteredDeliveries.map(d => new Date(d.created_at).toLocaleDateString()))].sort();

    const earningsDataPoints = chartLabels.map(label =>
        filteredDeliveries
            .filter(d => new Date(d.created_at).toLocaleDateString() === label)
            .reduce((sum, d) => sum + (d.earning || 0), 0)
    );

    const mileageDataPoints = chartLabels.map(label =>
        filteredDeliveries
            .filter(d => new Date(d.created_at).toLocaleDateString() === label)
            .reduce((sum, d) => sum + (d.distance_miles || 0), 0)
    );

    const combinedChartData = {
        labels: chartLabels,
        datasets: [
            {
                data: earningsDataPoints,
                color: (opacity = 1) => `rgba(26, 96, 248, ${opacity})`,
                strokeWidth: 2,
                legend: "Earnings"
            },
            {
                data: mileageDataPoints,
                color: (opacity = 1) => `rgba(36, 154, 131, ${opacity})`,
                strokeWidth: 2,
                legend: "Mileage"
            }
        ],
        legend: ["Earnings", "Mileage"]
    };

    const completedDeliveries = filteredDeliveries.filter(d => d.status === 'completed' && d.completed_at);
    let totalDeliveryDurationMinutes = 0;
    completedDeliveries.forEach(delivery => {
        const start = new Date(delivery.start_time);
        const end = new Date(delivery.completed_at!);
        totalDeliveryDurationMinutes += (end.getTime() - start.getTime()) / (1000 * 60);
    });

    const totalDeliveries = completedDeliveries.length;
    const totalShiftHours = totalShiftDurationMinutes / 60;

    const avgDeliveryTimeMinutes = totalDeliveries > 0 ? totalDeliveryDurationMinutes / totalDeliveries : 0;
    const deliveriesPerHour = totalShiftHours > 0 ? totalDeliveries / totalShiftHours : 0;
    const avgSpeed = totalDeliveryDurationMinutes > 0 ? (aggregatedMileage / totalDeliveryDurationMinutes) * 60 : 0;

    return {
        totalEarnings: aggregatedEarnings,
        totalMileage: aggregatedMileage,
        totalShiftDurationMinutes,
        combinedChart: combinedChartData,
        avgDeliveryTimeMinutes,
        deliveriesPerHour,
        avgSpeed,
        totalDeliveries,
    };
};

const PerformanceChart = ({ score, color }: { score: number; color: any }) => {
    const size = 120;
    const strokeWidth = 12;
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const progress = (score / 100) * circumference;

    return (
        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
            <Svg width={size} height={size}>
                <Circle
                    stroke={color.border}
                    fill="none"
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    strokeWidth={strokeWidth}
                />
                <Circle
                    stroke={color.btn}
                    fill="none"
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    strokeWidth={strokeWidth}
                    strokeDasharray={`${circumference} ${circumference}`}
                    strokeDashoffset={circumference - progress}
                    strokeLinecap="round"
                    transform={`rotate(-90 ${size / 2} ${size / 2})`}
                />
                <SvgText
                    x={size / 2}
                    y={size / 2 + 4}
                    fontSize="24"
                    fontWeight="bold"
                    textAnchor="middle"
                    fill={color.text}
                >
                    {`${score}%`}
                </SvgText>
                <SvgText
                    x={size / 2}
                    y={size / 2 + 20}
                    fontSize="12"
                    textAnchor="middle"
                    fill={color.text_light}
                >
                    Efficiency
                </SvgText>
            </Svg>
        </View>
    );
};

const ReportView = ({ data, period }: { data: { deliveries: Delivery[]; shifts: Shift[] }, period: 'today' | 'week' | 'month' | 'year' }) => {
    const { totalEarnings, totalMileage, totalShiftDurationMinutes, combinedChart, avgDeliveryTimeMinutes, deliveriesPerHour, avgSpeed, totalDeliveries } = useMemo(() => {
        return getReportDataForPeriod(data, period);
    }, [data, period]);

    const color = useColors();
    const hasData = combinedChart.labels.length > 0;

    const actualHourlyEarning = totalShiftDurationMinutes > 0 ? (totalEarnings / totalShiftDurationMinutes) * 60 : 0;
    const netEarning = totalEarnings;

    const goodDeliveriesPerHour = 4;
    const goodAvgDeliveryTime = 15;
    const goodAvgSpeed = 30;

    const badDeliveriesPerHour = 1.5;
    const badAvgDeliveryTime = 40;
    const badAvgSpeed = 10;

    const deliveriesPerHourScore = (Math.max(0, deliveriesPerHour - badDeliveriesPerHour) / (goodDeliveriesPerHour - badDeliveriesPerHour)) * 100;
    const avgDeliveryTimeScore = (1 - Math.max(0, avgDeliveryTimeMinutes - goodAvgDeliveryTime) / (badAvgDeliveryTime - goodAvgDeliveryTime)) * 100;
    const avgSpeedScore = (Math.max(0, avgSpeed - badAvgSpeed) / (goodAvgSpeed - badAvgSpeed)) * 100;

    const efficiencyScore = (
        (deliveriesPerHourScore * 0.4) +
        (avgDeliveryTimeScore * 0.3) +
        (avgSpeedScore * 0.3)
    );

    const finalEfficiencyScore = Math.min(100, Math.max(0, Math.round(efficiencyScore)));

    const chartConfig = {
        backgroundColor: color.primary_bg,
        backgroundGradientFrom: color.primary_bg,
        backgroundGradientTo: color.white,
        decimalPlaces: 2,
        color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
        labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
        style: {
            borderRadius: 16
        },
        propsForDots: {
            r: '6',
            strokeWidth: '2'
        },
    };

    // Prepare a default chart with zero data for when there are no entries
    const zeroDataChart = {
        labels: ['No Data'],
        datasets: [
            {
                data: [0],
                color: (opacity = 1) => `rgba(26, 96, 248, ${opacity})`,
                strokeWidth: 2,
                legend: "Earnings"
            },
            {
                data: [0],
                color: (opacity = 1) => `rgba(36, 154, 131, ${opacity})`,
                strokeWidth: 2,
                legend: "Mileage"
            }
        ],
        legend: ["Earnings", "Mileage"]
    };

    return (
        <ScrollView contentContainerStyle={{ padding: 10, alignItems: 'center' }}>
            <View style={{ width: '95%', padding: 15, borderRadius: 10, marginBottom: 20, backgroundColor: color.primary_bg }}>
                <Text style={{ fontSize: 16, fontWeight: 'bold', marginVertical: 4, color: color.text }}>Total Earnings: <Text style={{ color: color.btn }}>£{totalEarnings.toFixed(2)}</Text></Text>
                <Text style={{ fontSize: 16, fontWeight: 'bold', marginVertical: 4, color: color.text }}>Total Mileage: <Text style={{ color: color.icon }}>{totalMileage.toFixed(2)} miles</Text></Text>
                <Text style={{ fontSize: 16, fontWeight: 'bold', marginVertical: 4, color: color.text }}>Net Earnings: <Text style={{ color: color.success }}>£{netEarning.toFixed(2)}</Text></Text>
            </View>

            <Text style={{ fontSize: 18, fontWeight: 'bold', marginVertical: 10, alignSelf: 'flex-start', paddingLeft: 10, color: color.text }}>Performance Metrics</Text>
            <View style={{ width: '95%', padding: 15, borderRadius: 10, marginBottom: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: color.primary_bg }}>
                <View style={{ flex: 1.2, alignItems: 'center', justifyContent: 'center' }}>
                    <PerformanceChart score={finalEfficiencyScore} color={color} />
                    <View style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                        <View style={{ alignItems: 'center', justifyContent: 'center', flex: 1, paddingHorizontal: 5 }}>
                            <Text style={{ fontSize: 16, fontWeight: 'bold', color: color.text }}>£{actualHourlyEarning.toFixed(2)}</Text>
                            <Text style={{ fontSize: 10, marginTop: 2, color: color.text_light }}>Hourly Earning</Text>
                        </View>
                        <View style={{ height: '80%', width: 1, backgroundColor: '#ccc' }} />
                        <View style={{ alignItems: 'center', justifyContent: 'center', flex: 1, paddingHorizontal: 5 }}>
                            <Text style={{ fontSize: 16, fontWeight: 'bold', color: color.text }}>{totalDeliveries}</Text>
                            <Text style={{ fontSize: 10, marginTop: 2, color: color.text_light }}>Deliveries</Text>
                        </View>
                    </View>
                </View>

                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'flex-end' }}>
                    <View style={{ alignItems: 'flex-end', marginBottom: 8 }}>
                        <Text style={{ fontSize: 16, fontWeight: 'bold', color: color.text }}>{avgDeliveryTimeMinutes.toFixed(0)} min</Text>
                        <Text style={{ fontSize: 10, marginTop: 2, color: color.text_light }}>Avg. Delivery Time</Text>
                    </View>
                    <View style={{ width: '80%', height: 1, marginVertical: 8, backgroundColor: color.border }} />
                    <View style={{ alignItems: 'flex-end', marginBottom: 8 }}>
                        <Text style={{ fontSize: 16, fontWeight: 'bold', color: color.text }}>{deliveriesPerHour.toFixed(1)}</Text>
                        <Text style={{ fontSize: 10, marginTop: 2, color: color.text_light }}>Deliveries per Hour</Text>
                    </View>
                    <View style={{ width: '80%', height: 1, marginVertical: 8, backgroundColor: color.border }} />
                    <View style={{ alignItems: 'flex-end', marginBottom: 8 }}>
                        <Text style={{ fontSize: 16, fontWeight: 'bold', color: color.text }}>{avgSpeed.toFixed(1)} mph</Text>
                        <Text style={{ fontSize: 10, marginTop: 2, color: color.text_light }}>Avg. Speed</Text>
                    </View>
                </View>
            </View>

            <Text style={{ fontSize: 18, fontWeight: 'bold', marginVertical: 10, color: color.text }}>Performance Over Time</Text>
            {/* Conditional rendering for the chart */}
            <LineChart
                data={hasData ? combinedChart : zeroDataChart}
                width={screenWidth - 20}
                height={220}
                chartConfig={{
                    ...chartConfig,
                    backgroundGradientFrom: color.primary_bg,
                    backgroundGradientTo: color.primary_bg,
                    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                }}
                bezier
                style={{ marginVertical: 8, borderRadius: 16 }}
                withInnerLines={false}
                withOuterLines={false}
            />
            {!hasData && (
                <Text style={{ textAlign: 'center', position: 'absolute', top: 580, color: color.text_light }}>No data available for this period.</Text>
            )}
        </ScrollView>
    );
};

export default function ReportScreen() {
    const { profile, connections } = dataStore();
    const color = useColors();
    const [selectedConnectionId, setSelectedConnectionId] = useState<'all' | string>('all');
    const [dropdownVisible, setDropdownVisible] = useState(false);
    const [index, setIndex] = useState(1);
    const [reportData, setReportData] = useState<{ deliveries: Delivery[]; shifts: Shift[] }>({ deliveries: [], shifts: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const routes = useMemo(() => ([
        { key: 'today', title: 'Today' },
        { key: 'week', title: 'Week' },
        { key: 'month', title: 'Month' },
        { key: 'year', title: 'Year' },
    ]), []);

    const selectedConnectionName = useMemo(() => {
        if (selectedConnectionId === 'all') {
            return "All Connections";
        }
        const conn = connections.find(c => c.id === selectedConnectionId);
        return profile?.role === 'driver' ? conn?.restaurant_name : conn?.driver_name;
    }, [selectedConnectionId, connections, profile]);

    useEffect(() => {
        const fetchData = async () => {
            if (!profile?.id) {
                setLoading(false);
                return;
            }

            setLoading(true);
            setError(null);

            let deliveriesQuery = supabase.from('deliveries').select('*');
            let shiftsQuery = supabase.from('shifts').select('*');

            if (selectedConnectionId === 'all') {
                if (profile.role === 'driver') {
                    deliveriesQuery = deliveriesQuery.eq('driver_id', profile.id);
                    shiftsQuery = shiftsQuery.eq('driver_id', profile.id);
                } else if (profile.role === 'restaurant') {
                    deliveriesQuery = deliveriesQuery.eq('restaurant_id', profile.id);
                    shiftsQuery = shiftsQuery.eq('restaurant_id', profile.id);
                }
            } else {
                deliveriesQuery = deliveriesQuery.eq('connection_id', selectedConnectionId);
                shiftsQuery = shiftsQuery.eq('connection_id', selectedConnectionId);
            }

            try {
                const [{ data: deliveriesData, error: deliveriesError }, { data: shiftsData, error: shiftsError }] = await Promise.all([
                    deliveriesQuery,
                    shiftsQuery,
                ]);

                if (deliveriesError || shiftsError) {
                    throw new Error(deliveriesError?.message || shiftsError?.message || 'Unknown error');
                }

                setReportData({
                    deliveries: deliveriesData || [],
                    shifts: shiftsData || [],
                });
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [profile?.id, selectedConnectionId]);

    const renderScene = ({ route }: any) => {
        return <ReportView data={reportData} period={route.key} />;
    };

    const handleConnectionSelect = (id: string) => {
        setSelectedConnectionId(id);
        setDropdownVisible(false);
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: color.white }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: color.border }}>
                <Text style={{ fontSize: 24, fontWeight: 'bold', color: color.text }}>Reports</Text>
                <TouchableOpacity
                    onPress={() => setDropdownVisible(true)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingLeft: 20, paddingTop: 20, paddingBottom: 20 }}
                >
                    <UIText type="semiBold">{selectedConnectionName}</UIText>
                    <FontAwesome name="caret-down" size={16} color={color.text} />
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" />
                </View>
            ) : error ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ fontSize: 16, color: color.error }}>Error loading data: {error}</Text>
                </View>
            ) : (
                <View style={{ flex: 1 }}>
                    <TabView
                        navigationState={{ index, routes }}
                        renderScene={renderScene}
                        onIndexChange={setIndex}
                        initialLayout={{ width: screenWidth }}
                        renderTabBar={(props) => (
                            <TabBar
                                {...props}
                                indicatorStyle={{ backgroundColor: color.white }}
                                style={{ backgroundColor: color.btn }}
                                labelStyle={{ color: color.white, fontWeight: 'bold' }}
                            />
                        )}
                    />
                </View>
            )}

            <UIModal title="Select Connection" isVisible={dropdownVisible} onClose={() => setDropdownVisible(false)}>
                <TouchableOpacity
                    onPress={() => handleConnectionSelect('all')}
                    style={{ paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: color.second_bg }}
                >
                    <UIText type="base">All Connections</UIText>
                </TouchableOpacity>

                {connections.length > 0 ? (
                    connections.map((conn) => (
                        <TouchableOpacity
                            key={conn.id}
                            onPress={() => handleConnectionSelect(conn.id)}
                            style={{ paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: color.second_bg }}
                        >
                            <UIText type="base">
                                {profile?.role === 'driver' ? conn.restaurant_name : conn.driver_name}
                            </UIText>
                        </TouchableOpacity>
                    ))
                ) : (
                    <UIText>No connections available.</UIText>
                )}
            </UIModal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({});