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
    useWindowDimensions,
    ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { 
    ChevronLeft, 
    ChevronRight, 
    CheckCircle2, 
    Circle,
    Calendar as CalendarIcon,
    Bell 
} from 'lucide-react-native';
import { Card, ResponsiveScreen, PaymentReminderModal } from '../components/common';
import { useAuth } from '../contexts/AuthContext';
import { getFixedExpenses, toggleFixedExpensePaid } from '../lib/dataService';
import { getCurrentMonthKey, formatCurrency } from '../lib/dateHelpers';
import { Colors, Spacing, Typography, Radius, Shadows } from '../theme/tokens';
import type { FixedExpense } from '../types';

export function CalendarScreen() {
    const { user } = useAuth();
    const [expenses, setExpenses] = useState<FixedExpense[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedDay, setSelectedDay] = useState<number | null>(new Date().getDate());
    const [showReminder, setShowReminder] = useState(false);

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
            setExpenses((prev: FixedExpense[]) => prev.map((e: FixedExpense) => e.id === id ? { ...e, is_paid: !currentStatus } : e));
        } catch (error: any) {
            Alert.alert('Error', error.message);
        }
    };

    const changeMonth = (offset: number) => {
        const nextDate = new Date(selectedDate);
        nextDate.setMonth(selectedDate.getMonth() + offset);
        setSelectedDate(nextDate);
        setSelectedDay(null);
        setIsLoading(true);
    };

    // Calendar Helper
    const daysInMonth = useMemo(() => {
        const year = selectedDate.getFullYear();
        const month = selectedDate.getMonth();
        const numDays = new Date(year, month + 1, 0).getDate();
        const firstDayOfWeek = new Date(year, month, 1).getDay();
        
        const days = [];
        for (let i = 0; i < firstDayOfWeek; i++) {
            days.push(null);
        }
        for (let i = 1; i <= numDays; i++) {
            days.push(i);
        }
        return days;
    }, [selectedDate]);

    const expensesByDay = useMemo(() => {
        const map: Record<number, FixedExpense[]> = {};
        expenses.forEach((e: FixedExpense) => {
            const day = e.due_day || 1;
            if (!map[day]) map[day] = [];
            map[day].push(e);
        });
        return map;
    }, [expenses]);

    const filteredExpenses = useMemo(() => {
        if (selectedDay === null) return expenses;
        return expenses.filter((e: FixedExpense) => e.due_day === selectedDay);
    }, [expenses, selectedDay]);

    const { width } = useWindowDimensions();
    const isLargeScreen = width > 600; // Lower threshold to catch more devices

    if (isLoading && expenses.length === 0) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={Colors.brand.primary} />
            </View>
        );
    }

    return (
        <ResponsiveScreen
            maxWidth={1100}
            useScrollView={!isLargeScreen}
            contentContainerStyle={styles.responsiveContent}
        >
            {/* Header */}
            <View style={[styles.header, isLargeScreen && styles.headerDesktop]}>
                    <Text style={styles.title}>Calendario de Pagos</Text>
                    <View style={styles.monthSelector}>
                        <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.arrowButton}>
                            <ChevronLeft color={Colors.text.primary} size={20} />
                        </TouchableOpacity>
                        <Text style={styles.monthLabel}>
                            {selectedDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                        </Text>
                        <TouchableOpacity onPress={() => changeMonth(1)} style={styles.arrowButton}>
                            <ChevronRight color={Colors.text.primary} size={20} />
                        </TouchableOpacity>
                        <TouchableOpacity 
                            onPress={() => setShowReminder(true)} 
                            style={[styles.arrowButton, { marginLeft: Spacing.sm, backgroundColor: Colors.brand.primary }]}
                        >
                            <Bell color={Colors.neutral.white} size={20} />
                        </TouchableOpacity>
                    </View>
                </View>

                <PaymentReminderModal 
                    visible={showReminder}
                    onClose={() => setShowReminder(false)}
                    expenses={expenses.filter(e => e.due_day === new Date().getDate() && !e.is_paid).length > 0 
                        ? expenses.filter(e => e.due_day === new Date().getDate() && !e.is_paid)
                        : expenses.slice(0, 2) // Simulation fallback
                    }
                />

                <View style={[isLargeScreen && styles.mainLayout, isLargeScreen && styles.mainLayoutDesktop]}>
                    {/* Left Column: Calendar */}
                    <View style={[isLargeScreen && styles.calendarColumn, isLargeScreen && styles.columnDesktop]}>
                        <View style={styles.calendarContainer}>
                            <View style={styles.weekDays}>
                                {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(d => (
                                    <Text key={d} style={styles.weekDayText}>{d}</Text>
                                ))}
                            </View>
                            <View style={styles.grid}>
                                {daysInMonth.map((day, index) => {
                                    const isSelected = day === selectedDay;
                                    const dayExpenses = day ? expensesByDay[day] : [];
                                    const hasUnpaid = dayExpenses?.some((e: FixedExpense) => !e.is_paid);
                                    const hasPaid = dayExpenses?.some((e: FixedExpense) => e.is_paid);

                                    return (
                                        <TouchableOpacity 
                                            key={index} 
                                            style={[
                                                styles.dayCell,
                                                isSelected && styles.selectedDay
                                            ]}
                                            onPress={() => day && setSelectedDay(day)}
                                            disabled={!day}
                                        >
                                            {day && (
                                                <>
                                                    <Text style={[
                                                        styles.dayNumber,
                                                        isSelected && styles.selectedDayText
                                                    ]}>
                                                        {day}
                                                    </Text>
                                                    <View style={styles.dotContainer}>
                                                        {hasUnpaid && <View style={[styles.dot, styles.dotUnpaid]} />}
                                                        {hasPaid && <View style={[styles.dot, styles.dotPaid]} />}
                                                    </View>
                                                </>
                                            )}
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>
                    </View>

                    {/* Right Column: List */}
                    <View style={[isLargeScreen && styles.listColumn, isLargeScreen && styles.columnDesktop]}>
                        <View style={styles.listHeaderRow}>
                            <Text style={styles.listHeader}>
                                {selectedDay ? `Día ${selectedDay}` : 'Todos los Vencimientos'}
                            </Text>
                            {selectedDay && (
                                <TouchableOpacity onPress={() => setSelectedDay(null)}>
                                    <Text style={styles.clearFilter}>Ver todos</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        <ScrollView 
                            horizontal={true} // Enable for all if needed, but primarily for grid wrapping
                            showsHorizontalScrollIndicator={true}
                            contentContainerStyle={[styles.desktopGridScroll, { paddingBottom: 20 }]}
                        >
                            <View style={styles.desktopGridContainer}>
                                {filteredExpenses
                                    .sort((a: FixedExpense, b: FixedExpense) => (a.due_day || 1) - (b.due_day || 1))
                                    .map((item: FixedExpense) => (
                                        <Card key={item.id} style={[styles.expenseCard, isLargeScreen && styles.expenseCardCompact]}>
                                            <TouchableOpacity 
                                                style={styles.expenseRow}
                                                onPress={() => handleTogglePaid(item.id, !!item.is_paid)}
                                            >
                                                <View style={styles.statusIcon}>
                                                    {item.is_paid ? (
                                                        <CheckCircle2 color={Colors.status.success} size={16} />
                                                    ) : (
                                                        <Circle color={Colors.neutral[700]} size={16} />
                                                    )}
                                                </View>
                                                <View style={styles.expenseInfo}>
                                                    <Text style={[
                                                        styles.expenseTitle, 
                                                        item.is_paid && styles.textPaid,
                                                        styles.expenseTitleCompact
                                                    ]}>
                                                        {item.label || item.category}
                                                    </Text>
                                                    <Text style={[styles.expenseDue, styles.expenseDueCompact]}>
                                                        Día {item.due_day || 1}
                                                    </Text>
                                                </View>
                                                <Text style={[
                                                    styles.expenseAmount, 
                                                    item.is_paid && styles.textPaid,
                                                    styles.expenseAmountCompact
                                                ]}>
                                                    {formatCurrency(item.amount)}
                                                </Text>
                                            </TouchableOpacity>
                                        </Card>
                                    ))}
                                {filteredExpenses.length === 0 && (
                                    <View style={styles.emptyContainer}>
                                        <Text style={styles.emptyText}>No hay gastos.</Text>
                                    </View>
                                )}
                            </View>
                        </ScrollView>
                </View>
            </View>
        </ResponsiveScreen>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: Colors.background.main,
    },
    responsiveContent: {
        flex: 1,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.background.main,
    },
    header: {
        paddingTop: Spacing.xl,
        paddingBottom: Spacing.md,
    },
    headerDesktop: {
        paddingHorizontal: Spacing.xl,
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
        justifyContent: 'space-between',
        backgroundColor: Colors.background.card,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: Radius.md,
        borderWidth: 1,
        borderColor: Colors.neutral[700],
    },
    monthLabel: {
        fontFamily: Typography.family.bold,
        fontSize: Typography.size.small, // Reduced from body
        color: Colors.text.primary,
        textTransform: 'capitalize',
        textAlign: 'center',
    },
    arrowButton: {
        padding: Spacing.xs,
        backgroundColor: Colors.neutral[800],
        borderRadius: Radius.sm,
    },
    mainLayout: {
        flex: 1,
        minHeight: 0, // Ensure flex:1 works for scroll containers
    },
    mainLayoutDesktop: {
        flexDirection: 'row',
        paddingHorizontal: Spacing.lg,
        gap: Spacing.lg,
    },
    calendarColumn: {
        flex: 1,
        maxWidth: 320, // Constrain width on desktop
    },
    listColumn: {
        flex: 1,
        maxWidth: 1000, // Increased for horizontal grid
    },
    columnDesktop: {
        padding: 0,
    },
    calendarContainer: {
        backgroundColor: Colors.background.card,
        marginHorizontal: Spacing.md, // Reduced from lg
        marginBottom: Spacing.md, // Reduced from lg
        padding: Spacing.sm, // Reduced from md
        borderRadius: Radius.lg,
        ...Shadows.card,
    },
    weekDays: {
        flexDirection: 'row',
        marginBottom: Spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: Colors.neutral[700],
        paddingBottom: 8,
    },
    weekDayText: {
        flex: 1,
        textAlign: 'center',
        fontFamily: Typography.family.bold,
        fontSize: 8, // Reduced from 10
        color: Colors.text.muted,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    dayCell: {
        width: '14.28%',
        height: 34, // Reduced by ~30% from 48
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: Radius.sm,
        marginVertical: 1, // Reduced from 2
    },
    selectedDay: {
        backgroundColor: Colors.brand.primary,
        ...Shadows.button,
    },
    dayNumber: {
        fontFamily: Typography.family.medium,
        fontSize: Typography.size.small, // Reduced from body
        color: Colors.text.primary,
    },
    selectedDayText: {
        color: Colors.neutral.white,
        fontFamily: Typography.family.bold,
    },
    dotContainer: {
        flexDirection: 'row',
        gap: 2,
        position: 'absolute',
        bottom: 3, // Reduced from 6
    },
    dot: {
        width: 3, // Reduced from 4
        height: 3, // Reduced from 4
        borderRadius: 1.5,
    },
    dotUnpaid: {
        backgroundColor: Colors.status.danger,
    },
    dotPaid: {
        backgroundColor: Colors.status.success,
    },
    listHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginHorizontal: Spacing.lg,
        marginBottom: Spacing.sm,
    },
    listHeader: {
        fontFamily: Typography.family.bold,
        fontSize: Typography.size.body,
        color: Colors.text.primary,
    },
    clearFilter: {
        fontFamily: Typography.family.medium,
        fontSize: Typography.size.small,
        color: Colors.brand.primary,
    },
    desktopGridScroll: {
        flexGrow: 1,
    },
    desktopGridContainer: {
        flexDirection: 'column',
        flexWrap: 'wrap',
        height: 320, // Reduced height to match shrunken calendar
        paddingRight: Spacing.xl,
        gap: Spacing.xs, // More tight
    },
    listContent: {
        paddingHorizontal: Spacing.lg,
        gap: Spacing.sm,
        paddingBottom: 100, // Clearance for tab bar
    },
    expenseCard: {
        padding: Spacing.md,
    },
    expenseCardCompact: {
        padding: Spacing.xs, // Even smaller padding
        paddingHorizontal: Spacing.sm,
        width: 260, // Narrower cards to fit more columns
        marginBottom: 0,
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
        fontFamily: Typography.family.bold,
        fontSize: Typography.size.body,
        color: Colors.text.primary,
    },
    expenseTitleCompact: {
        fontSize: Typography.size.small,
    },
    expenseDue: {
        fontFamily: Typography.family.regular,
        fontSize: Typography.size.tiny,
        color: Colors.text.muted,
        marginTop: 1,
    },
    expenseDueCompact: {
        fontSize: 10,
    },
    expenseAmount: {
        fontFamily: Typography.family.bold,
        fontSize: Typography.size.body,
        color: Colors.text.primary,
    },
    expenseAmountCompact: {
        fontSize: Typography.size.small,
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
