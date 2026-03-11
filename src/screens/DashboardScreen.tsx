/**
 * DashboardScreen – Monthly financial summary.
 * Rule I: Fetches data via dataService; UI only renders.
 * Rule III: Handles Loading, Error, Empty states.
 */

import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    RefreshControl,
    ActivityIndicator,
    Alert,
    TouchableOpacity,
    useWindowDimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import {
    Wallet,
    TrendingDown,
    Calendar,
    PiggyBank,
    LogOut,
    Settings,
    ArrowRight,
} from 'lucide-react-native';
import { Card, ProgressBar, Button, ResponsiveScreen } from '../components/common';
import { BudgetImpactCard } from '../components/dashboard/BudgetImpactCard';
import { useAuth } from '../contexts/AuthContext';
import { getDashboardData, getProfile, getFixedExpenses } from '../lib/dataService';
import { formatCurrency, getCurrentMonthKey } from '../lib/dateHelpers';
import { Colors, Spacing, Typography, Radius, Shadows } from '../theme/tokens';
import type { DashboardData } from '../types';

export function DashboardScreen({ navigation }: { navigation: any }) {
    const { user, signOut } = useAuth();
    const [data, setData] = useState<DashboardData | null>(null);
    const [pendingPayments, setPendingPayments] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const { width } = useWindowDimensions();
    const isLarge = width > 850;

    const monthKey = getCurrentMonthKey();

    const loadData = useCallback(async (useCache = false) => {
        if (!user) return;
        try {
            // If using cache, it will return immediately if data exists
            const dashboard = await getDashboardData(user.id, useCache);
            setData(dashboard);
            setPendingPayments(dashboard.pendingPayments ?? 0);
            
            // If we just loaded from cache, trigger a background refresh
            if (useCache) {
                // Fetch fresh data in background
                getDashboardData(user.id).then(freshData => {
                    setData(freshData);
                    setPendingPayments(freshData.pendingPayments ?? 0);
                }).catch(err => console.warn('Background refresh failed', err));
            }
        } catch (error: any) {
            if (error.message !== 'TIMEOUT') {
                Alert.alert('Error', error.message);
            }
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    }, [user]);

    useFocusEffect(
        useCallback(() => {
            loadData(true); // Load from cache first
        }, [loadData]),
    );

    function handleRefresh() {
        setRefreshing(true);
        loadData();
    }

    if (isLoading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={Colors.brand.primary} />
            </View>
        );
    }

    if (!data) {
        return (
            <View style={styles.centered}>
                <Text style={styles.emptyText}>No se pudieron cargar los datos.</Text>
            </View>
        );
    }

    const monthLabel = new Date(monthKey.year, monthKey.month - 1).toLocaleDateString(
        'es-CL',
        { month: 'long', year: 'numeric' },
    );

    return (
        <ResponsiveScreen
            maxWidth={1100}
            refreshControl={
                <RefreshControl
                    refreshing={refreshing}
                    onRefresh={handleRefresh}
                    tintColor={Colors.brand.primary}
                />
            }
            contentContainerStyle={styles.scrollContent}
        >
            {/* Header */}
            <View style={styles.headerRow}>
                <View>
                    <Text style={styles.greeting}>Dashboard</Text>
                    <Text style={styles.monthLabel}>{monthLabel}</Text>
                </View>
                <Button
                    title=""
                    onPress={signOut}
                    variant="ghost"
                    icon={<LogOut color={Colors.text.secondary} size={22} />}
                />
            </View>

            <View style={[styles.mainGrid, isLarge && styles.mainGridLarge]}>
                {/* Left side on desktop, top on mobile */}
                <View style={[styles.primaryColumn, isLarge && styles.primaryColumnLarge]}>
                    {/* Salary Card */}
                    <LinearGradient
                        colors={[...Colors.gradient.primary]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.salaryCard}
                    >
                        <View style={styles.salaryHeader}>
                            <Wallet color={Colors.neutral.white} size={24} />
                            <Text style={styles.salaryLabel}>Sueldo mensual</Text>
                        </View>
                        <Text style={styles.salaryAmount}>{formatCurrency(data.salary)}</Text>
                    </LinearGradient>

                    {/* Budget Impact Visualization */}
                    <BudgetImpactCard
                        consumed={data.totalSpent}
                        available={data.available}
                        total={data.salary}
                        percent={data.percentConsumed}
                        threshold={data.alertThreshold}
                    />
                </View>

                {/* Right side/Bottom */}
                <View style={styles.secondaryColumn}>
                    {pendingPayments > 0 && (
                        <Card style={styles.pendingCard}>
                            <TouchableOpacity 
                                style={styles.pendingRow}
                                activeOpacity={0.7}
                                onPress={() => (navigation as any).navigate('FixedExpenses')}
                            >
                                <View style={styles.pendingIconBadge}>
                                    <Calendar color={Colors.status.danger} size={20} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.pendingTitle}>Pagos pendientes</Text>
                                    <Text style={styles.pendingText}>
                                        Tienes {pendingPayments} pago{pendingPayments > 1 ? 's' : ''} pendiente{pendingPayments > 1 ? 's' : ''} por cubrir hoy.
                                    </Text>
                                </View>
                                <ArrowRight color={Colors.status.danger} size={18} />
                            </TouchableOpacity>
                        </Card>
                    )}

                    {/* Stats Grid */}
                    <View style={styles.statsGrid}>
                        <StatCard
                            icon={<TrendingDown />}
                            label="Gastos fijos"
                            value={formatCurrency(data.totalFixed)}
                            color={Colors.status.danger}
                            onPress={() => (navigation as any).navigate('FixedExpenses')}
                        />
                        <StatCard
                            icon={<Calendar />}
                            label="Gastos diarios"
                            value={formatCurrency(data.totalDaily)}
                            color={Colors.status.warning}
                            onPress={() => (navigation as any).navigate('DailyExpenses')}
                        />
                        <StatCard
                            icon={<TrendingDown />}
                            label="Total gastado"
                            value={formatCurrency(data.totalSpent)}
                            color={Colors.status.info}
                        />
                    </View>
                </View>
            </View>
        </ResponsiveScreen>
    );
}

/* ─── Stat Card Sub-component ─── */

function StatCard({
    icon,
    label,
    value,
    color,
    onPress,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    color: string;
    onPress?: () => void;
}) {
    return (
        <Card style={styles.stat}>
            <TouchableOpacity 
                onPress={onPress} 
                activeOpacity={0.7}
                disabled={!onPress}
            >
                <View style={[styles.statIconBadge, { backgroundColor: `${color}15` }]}>
                    {React.cloneElement(icon as React.ReactElement, { color, size: 20 })}
                </View>
                <Text style={styles.statLabel}>{label}</Text>
                <Text style={[styles.statValue, { color }]} numberOfLines={1}>
                    {value}
                </Text>
            </TouchableOpacity>
        </Card>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: Colors.background.main,
    },
    scrollContent: {
        paddingTop: Spacing.xl,
        paddingHorizontal: 0, // ResponsiveScreen handles padding
    },
    mainGrid: {
        flexDirection: 'column',
    },
    mainGridLarge: {
        flexDirection: 'row',
        gap: Spacing.xl,
        alignItems: 'flex-start',
    },
    primaryColumn: {
        flex: 1,
    },
    primaryColumnLarge: {
        flex: 1.5,
    },
    secondaryColumn: {
        flex: 1,
    },
    centered: {
        flex: 1,
        backgroundColor: Colors.background.main,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyText: {
        fontFamily: Typography.family.regular,
        fontSize: Typography.size.body,
        color: Colors.text.muted,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.lg,
    },
    greeting: {
        fontFamily: Typography.family.bold,
        fontSize: Typography.size.h2,
        color: Colors.text.primary,
    },
    monthLabel: {
        fontFamily: Typography.family.regular,
        fontSize: Typography.size.small,
        color: Colors.text.secondary,
        textTransform: 'capitalize',
        marginTop: Spacing.xs,
    },
    salaryCard: {
        borderRadius: Radius.xl,
        padding: Spacing.lg,
        marginBottom: Spacing.md,
        ...Shadows.card,
    },
    salaryHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        marginBottom: Spacing.sm,
    },
    salaryLabel: {
        fontFamily: Typography.family.medium,
        fontSize: Typography.size.body,
        color: 'rgba(255,255,255,0.8)',
    },
    salaryAmount: {
        fontFamily: Typography.family.bold,
        fontSize: 36,
        color: Colors.neutral.white,
    },
    progressCard: {
        marginBottom: Spacing.md,
    },
    alertBadge: {
        marginTop: Spacing.md,
        backgroundColor: 'rgba(239,68,68,0.15)',
        borderRadius: Radius.md,
        padding: Spacing.md,
    },
    alertText: {
        fontFamily: Typography.family.medium,
        fontSize: Typography.size.small,
        color: Colors.status.danger,
        textAlign: 'center',
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.md,
    },
    stat: {
        width: '47%',
        flexGrow: 1,
        padding: Spacing.md,
    },
    statIconBadge: {
        width: 40,
        height: 40,
        borderRadius: Radius.md,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.sm,
    },
    statLabel: {
        fontFamily: Typography.family.regular,
        fontSize: Typography.size.tiny,
        color: Colors.text.secondary,
        marginBottom: Spacing.xs,
    },
    statValue: {
        fontFamily: Typography.family.bold,
        fontSize: Typography.size.h3,
    },
    pendingCard: {
        backgroundColor: Colors.status.danger + '08', // Even more subtle
        borderColor: Colors.status.danger + '20',
        borderWidth: 1,
        marginBottom: Spacing.md,
        padding: Spacing.md,
    },
    pendingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
    },
    pendingIconBadge: {
        width: 40,
        height: 40,
        borderRadius: Radius.md,
        backgroundColor: Colors.status.danger + '20',
        alignItems: 'center',
        justifyContent: 'center',
    },
    pendingTitle: {
        fontFamily: Typography.family.bold,
        fontSize: Typography.size.small,
        color: Colors.status.danger,
    },
    pendingText: {
        fontFamily: Typography.family.regular,
        fontSize: Typography.size.tiny,
        color: Colors.text.secondary,
        marginTop: 2,
    },
});
