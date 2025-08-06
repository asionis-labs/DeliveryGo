import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';

import { HapticTab } from '@/hooks/HapticTab';
import TabBarBackground from '@/hooks/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';

export default function TabLayout() {
    const colorScheme = useColorScheme();

    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: Colors[colorScheme ?? 'light'].btn,
                headerShown: false,
                tabBarButton: HapticTab,
                tabBarBackground: TabBarBackground,
                tabBarStyle: Platform.select({
                    ios: {
                        position: 'absolute',
                    },
                    default: {},
                }),
            }}>

            <Tabs.Screen
                name="index"
                options={{
                    title: 'Delivery',
                    tabBarIcon: ({ color }) => <FontAwesome5 name="car" size={24} color={color} />,
                }}
            />

            <Tabs.Screen
                name="connection"
                options={{
                    title: "Connection",
                    tabBarIcon: ({ color }) => <FontAwesome5 name="car" size={24} color={color} />,
                }}
            />

        </Tabs>
    );
}
