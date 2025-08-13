import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Delivery, Shift } from '@/store/dataStore';
import { getReportDataForPeriod } from '@/utils/reportUtils'; // Utility to filter and aggregate

type WeekReportProps = {
     data: {
          deliveries: Delivery[];
          shifts: Shift[];
     };
};

export default function WeekReport({ data }: WeekReportProps) {
     const chartData = useMemo(() => {
          const { earnings, mileage, hours } = getReportDataForPeriod(data, 'week');
          return { earnings, mileage, hours };
     }, [data]);

     const chartConfig = {
          backgroundGradientFrom: '#fff',
          backgroundGradientTo: '#fff',
          color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
     };

     return (
          <View>
               <Text>Earnings Over Last 7 Days</Text>
               {chartData.earnings.datasets[0].data.length > 0 ? (
                    <LineChart
                         data={chartData.earnings}
                         width={350}
                         height={220}
                         chartConfig={chartConfig}
                    />
               ) : (
                    <Text>No data available for this period.</Text>
               )}

               <Text>Mileage Over Last 7 Days</Text>
               {chartData.mileage.datasets[0].data.length > 0 && (
                    <LineChart
                         data={chartData.mileage}
                         width={350}
                         height={220}
                         chartConfig={chartConfig}
                    />
               )}
          </View>
     );
}