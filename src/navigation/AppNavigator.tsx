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
import { Colors, Typography, Radius } from '../theme/tokens';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function TabIconWithBackground({ 
    Icon, 
    color, 
    focused 
}: { 
    Icon: any; 
    color: string; 
    focused: boolean 
}) {
    return (
        <View style={[
            styles.tabIconContainer,
            focused && styles.tabIconContainerActive
        ]}>
            <Icon color={color} size={22} />
        </View>
    );
}

function MainTabs() {
    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: Colors.background.card,
                    borderTopColor: Colors.neutral[700],
                    height: 70,
                    paddingBottom: 12,
                    paddingTop: 8,
                },
                tabBarActiveTintColor: Colors.brand.primary,
                tabBarInactiveTintColor: Colors.text.muted,
                tabBarLabelStyle: {
                    fontFamily: Typography.family.medium,
                    fontSize: 10,
                    marginTop: 4,
                },
            }}
        >
            <Tab.Screen
                name="Dashboard"
                component={DashboardScreen}
                options={{
                    tabBarLabel: 'Resumen',
                    tabBarIcon: ({ color, focused }) => (
                        <TabIconWithBackground Icon={LayoutDashboard} color={color} focused={focused} />
                    ),
                }}
            />
            <Tab.Screen
                name="FixedExpenses"
                component={FixedExpensesScreen}
                options={{
                    tabBarLabel: 'Fijos',
                    tabBarIcon: ({ color, focused }) => (
                        <TabIconWithBackground Icon={Landmark} color={color} focused={focused} />
                    ),
                }}
            />
            <Tab.Screen
                name="DailyExpenses"
                component={DailyExpensesScreen}
                options={{
                    tabBarLabel: 'Diarios',
                    tabBarIcon: ({ color, focused }) => (
                        <TabIconWithBackground Icon={ShoppingBag} color={color} focused={focused} />
                    ),
                }}
            />
            <Tab.Screen
                name="Calendar"
                component={CalendarScreen}
                options={{
                    tabBarLabel: 'Calendario',
                    tabBarIcon: ({ color, focused }) => (
                        <TabIconWithBackground Icon={Calendar} color={color} focused={focused} />
                    ),
                }}
            />
            <Tab.Screen
                name="Profile"
                component={ProfileScreen}
                options={{
                    tabBarLabel: 'Perfil',
                    tabBarIcon: ({ color, focused }) => (
                        <TabIconWithBackground Icon={User} color={color} focused={focused} />
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
        async function checkProfile() {
            if (!user) {
                setNeedsOnboarding(null);
                return;
            }

            try {
                // Use cache first for instant transition
                const profile = await getProfile(user.id, true);
                if (profile) {
                    setNeedsOnboarding(profile.monthly_salary <= 0);
                }

                // Background refresh to ensure data is fresh
                const freshProfile = await getProfile(user.id);
                if (freshProfile) {
                    setNeedsOnboarding(freshProfile.monthly_salary <= 0);
                }
            } catch (error) {
                console.error('Error fetching profile in AppNavigator:', error);
                // If it's a timeout and we still don't have needsOnboarding, default to true
                if (needsOnboarding === null) setNeedsOnboarding(true);
            } finally {
                setCheckingProfile(false);
            }
        }

        checkProfile();
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
    tabIconContainer: {
        width: 48,
        height: 32,
        borderRadius: Radius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    tabIconContainerActive: {
        backgroundColor: Colors.brand.primary + '15', // very soft primary
    },
});
