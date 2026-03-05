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
} from 'lucide-react-native';
import { Card, ProgressBar, Button } from '../components/common';
import { useAuth } from '../contexts/AuthContext';
import { getDashboardData, getProfile } from '../lib/dataService';
import { formatCurrency, getCurrentMonthKey } from '../lib/dateHelpers';
import { Colors, Spacing, Typography, Radius, Shadows } from '../theme/tokens';
import type { DashboardData } from '../types';

export function DashboardScreen() {
    const { user, signOut } = useAuth();
    const [data, setData] = useState<DashboardData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const monthKey = getCurrentMonthKey();

    const loadData = useCallback(async () => {
        if (!user) return;
        try {
            const dashboard = await getDashboardData(user.id);
            setData(dashboard);
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    }, [user]);

    useFocusEffect(
        useCallback(() => {
            setIsLoading(true);
            loadData();
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
        <View style={styles.screen}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        tintColor={Colors.brand.primary}
                    />
                }
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

                {/* Progress */}
                <Card style={styles.progressCard}>
                    <ProgressBar percent={data.percentConsumed} />
                    {data.percentConsumed >= 75 && (
                        <View style={styles.alertBadge}>
                            <Text style={styles.alertText}>
                                ⚠️ Has superado el 75% de tu presupuesto
                            </Text>
                        </View>
                    )}
                </Card>

                {/* Stats Grid */}
                <View style={styles.statsGrid}>
                    <StatCard
                        icon={<TrendingDown color={Colors.status.danger} size={22} />}
                        label="Gastos fijos"
                        value={formatCurrency(data.totalFixed)}
                        color={Colors.status.danger}
                    />
                    <StatCard
                        icon={<Calendar color={Colors.status.warning} size={22} />}
                        label="Gastos diarios"
                        value={formatCurrency(data.totalDaily)}
                        color={Colors.status.warning}
                    />
                    <StatCard
                        icon={<TrendingDown color={Colors.status.info} size={22} />}
                        label="Total gastado"
                        value={formatCurrency(data.totalSpent)}
                        color={Colors.status.info}
                    />
                    <StatCard
                        icon={<PiggyBank color={Colors.status.success} size={22} />}
                        label="Disponible"
                        value={formatCurrency(data.available)}
                        color={data.available >= 0 ? Colors.status.success : Colors.status.danger}
                    />
                </View>
            </ScrollView>
        </View>
    );
}

/* ─── Stat Card Sub-component ─── */

function StatCard({
    icon,
    label,
    value,
    color,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    color: string;
}) {
    return (
        <Card style={styles.stat}>
            <View style={styles.statIconRow}>
                {icon}
            </View>
            <Text style={styles.statLabel}>{label}</Text>
            <Text style={[styles.statValue, { color }]} numberOfLines={1}>
                {value}
            </Text>
        </Card>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: Colors.background.main,
    },
    scrollContent: {
        padding: Spacing.lg,
        paddingTop: Spacing.xxl + Spacing.lg,
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
    },
    statIconRow: {
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
});
