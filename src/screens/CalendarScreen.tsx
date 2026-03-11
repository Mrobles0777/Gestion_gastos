/**
 * CalendarScreen – Monthly view for fixed expense due dates.
 * Rule I: Logic in dataService, UI in components.
 * Rule III: Design Tokens used for consistency.
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { 
    ChevronLeft, 
    ChevronRight, 
    CheckCircle2, 
    Circle,
    Calendar as CalendarIcon 
} from 'lucide-react-native';
import { Card } from '../components/common';
import { useAuth } from '../contexts/AuthContext';
import { getFixedExpenses, toggleFixedExpensePaid } from '../lib/dataService';
import { getCurrentMonthKey, formatCurrency } from '../lib/dateHelpers';
import { Colors, Spacing, Typography, Radius } from '../theme/tokens';
import type { FixedExpense } from '../types';

export function CalendarScreen() {
    const { user } = useAuth();
    const [expenses, setExpenses] = useState<FixedExpense[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(new Date());

    const monthKey = useMemo(() => {
        const year = selectedDate.getFullYear();
        const monthNum = selectedDate.getMonth() + 1;
        const monthStr = monthNum < 10 ? `0${monthNum}` : `${monthNum}`;
        const firstDay = `${year}-${monthStr}-01`;
        return { firstDay, month: monthNum, year };
    }, [selectedDate]);

    const loadData = useCallback(async () => {
        if (!user) return;
        try {
            const data = await getFixedExpenses(user.id, monthKey.firstDay);
            setExpenses(data);
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setIsLoading(false);
        }
    }, [user, monthKey.firstDay]);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [loadData])
    );

    const handleTogglePaid = async (id: string, currentStatus: boolean) => {
        try {
            await toggleFixedExpensePaid(id, !currentStatus);
            setExpenses(prev => prev.map(e => e.id === id ? { ...e, is_paid: !currentStatus } : e));
        } catch (error: any) {
            Alert.alert('Error', error.message);
        }
    };

    const changeMonth = (offset: number) => {
        const nextDate = new Date(selectedDate);
        nextDate.setMonth(selectedDate.getMonth() + offset);
        setSelectedDate(nextDate);
        setIsLoading(true);
    };

    // Calendar Helper
    const daysInMonth = useMemo(() => {
        const year = selectedDate.getFullYear();
        const month = selectedDate.getMonth();
        const numDays = new Date(year, month + 1, 0).getDate();
        const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 (Sun) to 6 (Sat)
        
        const days = [];
        // Padding for previous month
        for (let i = 0; i < firstDayOfWeek; i++) {
            days.push(null);
        }
        // Actual days
        for (let i = 1; i <= numDays; i++) {
            days.push(i);
        }
        return days;
    }, [selectedDate]);

    const expensesByDay = useMemo(() => {
        const map: Record<number, FixedExpense[]> = {};
        expenses.forEach(e => {
            const day = e.due_day || 1;
            if (!map[day]) map[day] = [];
            map[day].push(e);
        });
        return map;
    }, [expenses]);

    if (isLoading && expenses.length === 0) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={Colors.brand.primary} />
            </View>
        );
    }

    return (
        <View style={styles.screen}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>Calendario de Pagos</Text>
                <View style={styles.monthSelector}>
                    <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.arrowButton}>
                        <ChevronLeft color={Colors.text.primary} size={24} />
                    </TouchableOpacity>
                    <Text style={styles.monthLabel}>
                        {selectedDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                    </Text>
                    <TouchableOpacity onPress={() => changeMonth(1)} style={styles.arrowButton}>
                        <ChevronRight color={Colors.text.primary} size={24} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Calendar Grid */}
            <View style={styles.calendarContainer}>
                <View style={styles.weekDays}>
                    {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map(d => (
                        <Text key={d} style={styles.weekDayText}>{d}</Text>
                    ))}
                </View>
                <View style={styles.grid}>
                    {daysInMonth.map((day, index) => {
                        const dayExpenses = day ? expensesByDay[day] : [];
                        const hasUnpaid = dayExpenses?.some(e => !e.is_paid);
                        const hasPaid = dayExpenses?.some(e => e.is_paid);

                        return (
                            <View key={index} style={styles.dayCell}>
                                {day && (
                                    <>
                                        <Text style={styles.dayNumber}>{day}</Text>
                                        <View style={styles.dotContainer}>
                                            {hasUnpaid && <View style={[styles.dot, styles.dotUnpaid]} />}
                                            {hasPaid && <View style={[styles.dot, styles.dotPaid]} />}
                                        </View>
                                    </>
                                )}
                            </View>
                        );
                    })}
                </View>
            </View>

            {/* List of expenses for the month */}
            <FlatList
                data={expenses.sort((a, b) => (a.due_day || 1) - (b.due_day || 1))}
                keyExtractor={(item) => item.id}
                ListHeaderComponent={<Text style={styles.listHeader}>Vencimientos del Mes</Text>}
                contentContainerStyle={styles.listContent}
                renderItem={({ item }) => (
                    <Card style={styles.expenseCard}>
                        <TouchableOpacity 
                            style={styles.expenseRow}
                            onPress={() => handleTogglePaid(item.id, !!item.is_paid)}
                        >
                            <View style={styles.statusIcon}>
                                {item.is_paid ? (
                                    <CheckCircle2 color={Colors.status.success} size={24} />
                                ) : (
                                    <Circle color={Colors.neutral[400]} size={24} />
                                )}
                            </View>
                            <View style={styles.expenseInfo}>
                                <Text style={[styles.expenseTitle, item.is_paid && styles.textPaid]}>
                                    {item.label || item.category}
                                </Text>
                                <Text style={styles.expenseDue}>Vence el día {item.due_day || 1}</Text>
                            </View>
                            <Text style={[styles.expenseAmount, item.is_paid && styles.textPaid]}>
                                {formatCurrency(item.amount)}
                            </Text>
                        </TouchableOpacity>
                    </Card>
                )}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No hay gastos registrados para este mes.</Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: Colors.background.main,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.background.main,
    },
    header: {
        paddingTop: Spacing.xxl + Spacing.lg,
        paddingHorizontal: Spacing.lg,
        paddingBottom: Spacing.md,
    },
    title: {
        fontFamily: Typography.family.bold,
        fontSize: Typography.size.h2,
        color: Colors.text.primary,
        marginBottom: Spacing.md,
    },
    monthSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.lg,
        backgroundColor: Colors.background.card,
        padding: Spacing.sm,
        borderRadius: Radius.lg,
    },
    monthLabel: {
        fontFamily: Typography.family.medium,
        fontSize: Typography.size.body,
        color: Colors.text.primary,
        textTransform: 'capitalize',
        minWidth: 150,
        textAlign: 'center',
    },
    arrowButton: {
        padding: Spacing.xs,
    },
    calendarContainer: {
        backgroundColor: Colors.background.card,
        margin: Spacing.lg,
        marginTop: 0,
        padding: Spacing.md,
        borderRadius: Radius.xl,
        ...Colors.shadow.sm,
    },
    weekDays: {
        flexDirection: 'row',
        marginBottom: Spacing.sm,
    },
    weekDayText: {
        flex: 1,
        textAlign: 'center',
        fontFamily: Typography.family.medium,
        fontSize: Typography.size.tiny,
        color: Colors.text.muted,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    dayCell: {
        width: '14.28%',
        aspectRatio: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 2,
    },
    dayNumber: {
        fontFamily: Typography.family.regular,
        fontSize: Typography.size.small,
        color: Colors.text.primary,
    },
    dotContainer: {
        flexDirection: 'row',
        gap: 2,
        marginTop: 2,
    },
    dot: {
        width: 4,
        height: 4,
        borderRadius: 2,
    },
    dotUnpaid: {
        backgroundColor: Colors.status.danger,
    },
    dotPaid: {
        backgroundColor: Colors.status.success,
    },
    listHeader: {
        fontFamily: Typography.family.bold,
        fontSize: Typography.size.body,
        color: Colors.text.primary,
        marginHorizontal: Spacing.lg,
        marginBottom: Spacing.sm,
    },
    listContent: {
        paddingHorizontal: Spacing.lg,
        paddingBottom: Spacing.xl,
        gap: Spacing.sm,
    },
    expenseCard: {
        padding: Spacing.md,
    },
    expenseRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
    },
    statusIcon: {
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    expenseInfo: {
        flex: 1,
    },
    expenseTitle: {
        fontFamily: Typography.family.medium,
        fontSize: Typography.size.body,
        color: Colors.text.primary,
    },
    expenseDue: {
        fontFamily: Typography.family.regular,
        fontSize: Typography.size.tiny,
        color: Colors.text.muted,
        marginTop: 2,
    },
    expenseAmount: {
        fontFamily: Typography.family.bold,
        fontSize: Typography.size.body,
        color: Colors.text.primary,
    },
    textPaid: {
        color: Colors.text.muted,
        textDecorationLine: 'line-through',
    },
    emptyContainer: {
        padding: Spacing.xl,
        alignItems: 'center',
    },
    emptyText: {
        fontFamily: Typography.family.regular,
        fontSize: Typography.size.body,
        color: Colors.text.muted,
        textAlign: 'center',
    },
});
