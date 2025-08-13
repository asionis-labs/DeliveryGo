import React, { useState, useEffect, useMemo } from 'react';
import { View, ActivityIndicator, ScrollView, Dimensions, TouchableOpacity, StyleSheet } from 'react-native';
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
    connection_id: string;
    driver_id: string;
}

interface Shift {
    id: string;
    start_time: string;
    end_time: string | null;
    status: 'active' | 'ended';
    created_at: string;
    connection_id: string;
    driver_id: string;
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

interface Profile {
    id: string;
    role: 'driver' | 'restaurant';
    hourly_rate: number;
    mileage_rate: number;
}

const getReportDataForPeriod = (
    data: { deliveries: Delivery[]; shifts: Shift[] },
    period: 'today' | 'week' | 'month' | 'year',
    connections: Connection[],
    selectedConnectionId: string | 'all',
    profile: Profile
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

    const hourlyRate = profile.hourly_rate;

    // Filter deliveries by period and connection first
    const periodDeliveries = data.deliveries.filter(d => {
        const deliveryDate = new Date(d.created_at);
        const isWithinPeriod = deliveryDate >= startDate;
        const isForConnection = selectedConnectionId === 'all' || d.connection_id === selectedConnectionId;
        return isWithinPeriod && isForConnection;
    });

    // --- FIX: Filter for 'completed' deliveries to use for all calculations ---
    const completedDeliveries = periodDeliveries.filter(d => d.status === 'completed' && d.completed_at);

    // Calculate total earnings and mileage from COMPLETED deliveries
    const totalDeliveryEarnings = completedDeliveries.reduce((sum, d) => sum + (d.earning || 0), 0);
    const totalMileage = completedDeliveries.reduce((sum, d) => sum + (d.distance_miles || 0), 0);

    // Calculate shifts earnings (already correct)
    const filteredShifts = data.shifts.filter(s => {
        const shiftStartDate = new Date(s.start_time);
        const isWithinPeriod = shiftStartDate >= startDate;
        const isForConnection = selectedConnectionId === 'all' || s.connection_id === selectedConnectionId;
        return isWithinPeriod && isForConnection;
    });


    let totalHourlyEarning = 0;
    let totalShiftDurationMinutes = 0;

    filteredShifts.forEach(shift => {
        const shiftStart = new Date(shift.start_time);
        const shiftEnd = shift.status === 'ended' && shift.end_time ? new Date(shift.end_time) : now;

        // This is the correct logic you identified
        if (shiftEnd > shiftStart) {
            const shiftDurationMinutes = (shiftEnd.getTime() - shiftStart.getTime()) / (1000 * 60);
            totalShiftDurationMinutes += shiftDurationMinutes;
            totalHourlyEarning += (shiftDurationMinutes / 60) * hourlyRate;
        }
    });

    const aggregatedEarnings = totalDeliveryEarnings + totalHourlyEarning;

    // Calculate delivery-specific metrics based on completed deliveries
    let totalDeliveryDurationMinutes = 0;
    completedDeliveries.forEach(delivery => {
        const start = new Date(delivery.start_time);
        const end = new Date(delivery.completed_at!);

        if (end > start) {
            totalDeliveryDurationMinutes += (end.getTime() - start.getTime()) / (1000 * 60);
        }
    });

    const totalDeliveries = completedDeliveries.length;
    const totalDeliveryHours = totalDeliveryDurationMinutes / 60;
    const hasValidDeliveryTime = totalDeliveryDurationMinutes > 0;

    const avgDeliveryTimeMinutes = hasValidDeliveryTime ? totalDeliveryDurationMinutes / totalDeliveries : 0;
    const deliveriesPerHour = hasValidDeliveryTime ? totalDeliveries / totalDeliveryHours : 0;
    const avgSpeed = hasValidDeliveryTime ? totalMileage / totalDeliveryHours : 0;

    // --- FIX: Chart data points now use only completed deliveries ---
    const chartLabels = [...new Set(completedDeliveries.map(d => new Date(d.created_at).toLocaleDateString()))].sort();

    const earningsDataPoints = chartLabels.map(label => {
        const dailyDeliveries = completedDeliveries.filter(d => new Date(d.created_at).toLocaleDateString() === label);
        const dailyDeliveryEarnings = dailyDeliveries.reduce((sum, d) => sum + (d.earning || 0), 0);

        // Add hourly earnings for the day as well
        const dailyShifts = filteredShifts.filter(s => new Date(s.start_time).toLocaleDateString() === label);
        const dailyHourlyEarnings = dailyShifts.reduce((sum, s) => {
            const shiftStart = new Date(s.start_time);
            const shiftEnd = s.status === 'ended' && s.end_time ? new Date(s.end_time) : now;
            const durationMinutes = (shiftEnd.getTime() - shiftStart.getTime()) / (1000 * 60);
            return sum + (durationMinutes / 60) * hourlyRate;
        }, 0);

        return dailyDeliveryEarnings + dailyHourlyEarnings;
    });

    const mileageDataPoints = chartLabels.map(label =>
        completedDeliveries
            .filter(d => new Date(d.created_at).toLocaleDateString() === label)
            .reduce((sum, d) => sum + (d.distance_miles || 0), 0)
    );

    const combinedChartData = {
        labels: chartLabels.length > 0 ? chartLabels : ['No Data'],
        datasets: [
            {
                data: earningsDataPoints.length > 0 ? earningsDataPoints : [0],
                color: (opacity = 1) => `rgba(26, 96, 248, ${opacity})`,
                strokeWidth: 2,
                legend: "Earnings"
            },
            {
                data: mileageDataPoints.length > 0 ? mileageDataPoints : [0],
                color: (opacity = 1) => `rgba(36, 154, 131, ${opacity})`,
                strokeWidth: 2,
                legend: "Mileage"
            }
        ],
        legend: ["Earnings", "Mileage"]
    };

    return {
        totalEarnings: totalDeliveryEarnings,
        totalMileage,
        totalShiftDurationMinutes,
        hourlyEarning: totalHourlyEarning,
        combinedChart: combinedChartData,
        avgDeliveryTimeMinutes,
        deliveriesPerHour,
        avgSpeed,
        totalDeliveries,
        aggregatedEarnings,
    };
};

const PerformanceChart = ({ score, color }: { score: number; color: any }) => {
    const size = 150;
    const strokeWidth = 15;
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

const ReportView = ({ data, period, profile, connections, selectedConnectionId }: { data: { deliveries: Delivery[]; shifts: Shift[] }, period: 'today' | 'week' | 'month' | 'year', profile: Profile, connections: Connection[], selectedConnectionId: string | 'all' }) => {
    const { aggregatedEarnings, totalEarnings, totalMileage, totalShiftDurationMinutes, hourlyEarning, combinedChart, avgDeliveryTimeMinutes, deliveriesPerHour, avgSpeed, totalDeliveries } = useMemo(() => {
        return getReportDataForPeriod(data, period, connections, selectedConnectionId, profile);
    }, [data, period, connections, selectedConnectionId, profile]);

    const color = useColors();
    const hasData = combinedChart.labels.length > 0 && combinedChart.labels[0] !== 'No Data';

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

    const isRestaurant = profile?.role === 'restaurant';

    return (
        <ScrollView contentContainerStyle={{ padding: 20, alignItems: 'center' }}>
            <View style={{ width: '100%', padding: 15, borderRadius: 10, marginBottom: 20, backgroundColor: color.white }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <View style={{ flex: 1, alignItems: 'flex-start' }}>
                        <UIText type="base" style={{ color: color.text_light }}>{isRestaurant ? "Delivery Payout" : "Delivery Fees"}</UIText>
                        <UIText type="subtitle" style={{ color: color.btn }}>£{totalEarnings.toFixed(2)}</UIText>
                    </View>
                    <View style={{ flex: 1, alignItems: 'flex-start' }}>
                        <UIText type="base" style={{ color: color.text_light }}>Total Miles</UIText>
                        <UIText type="subtitle" style={{ fontSize: 24, color: color.success }}>{totalMileage.toFixed(2)}</UIText>
                    </View>
                </View>
                <View style={{ width: '100%', height: 1, backgroundColor: color.border, marginVertical: 10 }} />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                    <View style={{ flex: 1, alignItems: 'flex-start' }}>
                        <UIText type="base" style={{ color: color.text_light }}>{isRestaurant ? "Hourly Cost" : "Hourly Earning"}</UIText>
                        <UIText type="subtitle" style={{ fontSize: 24, color: color.success }}>£{hourlyEarning.toFixed(2)}</UIText>
                    </View>
                    <View style={{ flex: 1, alignItems: 'flex-start' }}>
                        <UIText type="base" style={{ color: color.text_light }}>Total Earning</UIText>
                        <UIText type="subtitle" style={{ fontSize: 24, color: color.btn }}>£{aggregatedEarnings.toFixed(2)}</UIText>
                    </View>
                </View>
            </View>

            <UIText type="subtitle" style={{ fontSize: 18, marginVertical: 10, alignSelf: 'flex-start', paddingLeft: 10, color: color.text }}>Performance Metrics</UIText>
            <View style={{ width: '100%', padding: 15, borderRadius: 10, marginBottom: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: color.white }}>
                <View style={{ flex: 1.2, alignItems: 'center', justifyContent: 'center' }}>
                    <PerformanceChart score={finalEfficiencyScore} color={color} />
                    {/* <View style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                        <View style={{ alignItems: 'center', justifyContent: 'center', flex: 1, paddingHorizontal: 5 }}>
                            <UIText type="semiBold" style={{ fontSize: 16 }}>£{hourlyEarning.toFixed(2)}</UIText>
                            <UIText type="base" style={{ fontSize: 10, marginTop: 2, color: color.text_light }}>Hourly Earning</UIText>
                        </View>
                        <View style={{ height: '80%', width: 1, backgroundColor: '#ccc' }} />
                        <View style={{ alignItems: 'center', justifyContent: 'center', flex: 1, paddingHorizontal: 5 }}>
                            <UIText type="semiBold" style={{ fontSize: 16 }}>{totalDeliveries}</UIText>
                            <UIText type="base" style={{ fontSize: 10, marginTop: 2, color: color.text_light }}>Deliveries</UIText>
                        </View>
                    </View> */}
                </View>

                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'flex-end' }}>
                    <View style={{ alignItems: 'flex-end' }}>
                        <UIText type="semiBold" style={{ fontSize: 16 }}>{avgDeliveryTimeMinutes.toFixed(0)} min</UIText>
                        <UIText type="base" style={{ fontSize: 10, color: color.text_light }}>Avg. Delivery Time</UIText>
                    </View>
                    <View style={{ width: '80%', height: 1, marginVertical: 5, backgroundColor: color.border }} />
                    <View style={{ alignItems: 'flex-end' }}>
                        <UIText type="semiBold" style={{ fontSize: 16 }}>{deliveriesPerHour.toFixed(1)}</UIText>
                        <UIText type="base" style={{ fontSize: 10, color: color.text_light }}>Deliveries per Hour</UIText>
                    </View>
                    <View style={{ width: '80%', height: 1, marginVertical: 5, backgroundColor: color.border }} />
                    <View style={{ alignItems: 'flex-end' }}>
                        <UIText type="semiBold" style={{ fontSize: 16 }}>{avgSpeed.toFixed(1)} mph</UIText>
                        <UIText type="base" style={{ fontSize: 10, color: color.text_light }}>Avg. Speed</UIText>
                    </View>
                </View>
            </View>

            <UIText type="semiBold" style={{ fontSize: 18, marginVertical: 10, color: color.text, alignSelf: 'flex-start', paddingLeft: 10 }}>Performance Over Time</UIText>

            <LineChart
                data={hasData ? combinedChart : zeroDataChart}
                width={screenWidth - 40}
                height={220}
                chartConfig={{
                    ...chartConfig,
                    backgroundGradientFrom: color.white,
                    backgroundGradientTo: color.white,
                    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                }}
                bezier
                style={{ marginVertical: 8, borderRadius: 16 }}
                withInnerLines={false}
                withOuterLines={false}
            />

            {
                !hasData && (
                    <UIText type="base" style={{ textAlign: 'center', position: 'absolute', top: 580, color: color.text_light }}>No data available for this period.</UIText>
                )
            }
        </ScrollView >
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
        if (!profile) return null;
        return <ReportView
            data={reportData}
            period={route.key}
            profile={profile as Profile}
            connections={connections}
            selectedConnectionId={selectedConnectionId}
        />;
    };

    const handleConnectionSelect = (id: string) => {
        setSelectedConnectionId(id);
        setDropdownVisible(false);
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: color.primary_bg }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: color.border, }}>
                <UIText type="title" style={{ color: color.text }}>Reports</UIText>
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
                    <UIText type="base" style={{ fontSize: 16, color: color.error }}>Error loading data: {error}</UIText>
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
                                indicatorStyle={{ backgroundColor: color.btn }}
                                style={{ backgroundColor: color.border }}
                                activeColor={color.text}
                                inactiveColor={color.text_light}
                                renderLabel={({ route }) => (
                                    <UIText type="semiBold">
                                        {route.title}
                                    </UIText>
                                )}
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
                    <UIText type="base">No connections available.</UIText>
                )}
            </UIModal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({});