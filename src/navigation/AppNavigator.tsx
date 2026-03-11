/**
 * AppNavigator – Manages auth-gated routing.
 * Rule I: All navigation logic is isolated here; screens are "dumb".
 */

import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import {
    LayoutDashboard,
    Landmark,
    ShoppingBag,
    User,
    Calendar,
} from 'lucide-react-native';

import { useAuth } from '../contexts/AuthContext';
import { getProfile } from '../lib/dataService';
import { AuthScreen } from '../screens/AuthScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { DashboardScreen } from '../screens/DashboardScreen';
import { FixedExpensesScreen } from '../screens/FixedExpensesScreen';
import { DailyExpensesScreen } from '../screens/DailyExpensesScreen';
import { CalendarScreen } from '../screens/CalendarScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { Colors, Typography } from '../theme/tokens';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: Colors.background.card,
                    borderTopColor: Colors.neutral[700],
                    height: 64,
                    paddingBottom: 8,
                    paddingTop: 8,
                },
                tabBarActiveTintColor: Colors.brand.primary,
                tabBarInactiveTintColor: Colors.text.muted,
                tabBarLabelStyle: {
                    fontFamily: Typography.family.medium,
                    fontSize: 11,
                },
            }}
        >
            <Tab.Screen
                name="Dashboard"
                component={DashboardScreen}
                options={{
                    tabBarLabel: 'Dashboard',
                    tabBarIcon: ({ color, size }) => (
                        <LayoutDashboard color={color} size={size} />
                    ),
                }}
            />
            <Tab.Screen
                name="FixedExpenses"
                component={FixedExpensesScreen}
                options={{
                    tabBarLabel: 'Fijos',
                    tabBarIcon: ({ color, size }) => (
                        <Landmark color={color} size={size} />
                    ),
                }}
            />
            <Tab.Screen
                name="DailyExpenses"
                component={DailyExpensesScreen}
                options={{
                    tabBarLabel: 'Diarios',
                    tabBarIcon: ({ color, size }) => (
                        <ShoppingBag color={color} size={size} />
                    ),
                }}
            />
            <Tab.Screen
                name="Calendar"
                component={CalendarScreen}
                options={{
                    tabBarLabel: 'Calendario',
                    tabBarIcon: ({ color, size }) => (
                        <Calendar color={color} size={size} />
                    ),
                }}
            />
            <Tab.Screen
                name="Profile"
                component={ProfileScreen}
                options={{
                    tabBarLabel: 'Perfil',
                    tabBarIcon: ({ color, size }) => (
                        <User color={color} size={size} />
                    ),
                }}
            />
        </Tab.Navigator>
    );
}

export function AppNavigator() {
    const { user, isLoading: authLoading } = useAuth();
    const [needsOnboarding, setNeedsOnboarding] = useState<boolean | null>(null);
    const [checkingProfile, setCheckingProfile] = useState(false);

    useEffect(() => {
        if (!user) {
            setNeedsOnboarding(null);
            return;
        }

        setCheckingProfile(true);
        getProfile(user.id)
            .then((profile) => {
                setNeedsOnboarding(!profile || profile.monthly_salary <= 0);
            })
            .catch(() => {
                setNeedsOnboarding(true);
            })
            .finally(() => setCheckingProfile(false));
    }, [user]);

    if (authLoading || checkingProfile) {
        return (
            <View style={styles.loading}>
                <ActivityIndicator size="large" color={Colors.brand.primary} />
            </View>
        );
    }

    return (
        <NavigationContainer>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
                {!user ? (
                    <Stack.Screen name="Auth" component={AuthScreen} />
                ) : needsOnboarding ? (
                    <Stack.Screen name="Onboarding">
                        {() => (
                            <OnboardingScreen
                                onComplete={() => setNeedsOnboarding(false)}
                            />
                        )}
                    </Stack.Screen>
                ) : (
                    <Stack.Screen name="Main" component={MainTabs} />
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
}

const styles = StyleSheet.create({
    loading: {
        flex: 1,
        backgroundColor: Colors.background.main,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
