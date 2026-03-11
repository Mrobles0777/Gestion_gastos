/**
 * DailyExpensesScreen – CRUD for daily transactions.
 * Rule I: UI delegates to dataService.
 * Rule III: Handles Loading, Empty, Error, and Overflow.
 */

import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    SectionList,
    Alert,
    TouchableOpacity,
    ActivityIndicator,
    Modal,
    useWindowDimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
    Plus,
    MoreVertical,
    Trash2,
} from 'lucide-react-native';
import { Card, Button, Input, ResponsiveScreen } from '../components/common';
import { ExpenseCard } from '../components/expenses';
import { useAuth } from '../contexts/AuthContext';
import {
    getDailyExpenses,
    addDailyExpense,
    deleteDailyExpense,
    checkAndTriggerBudgetAlert,
} from '../lib/dataService';
import { getCurrentMonthKey, formatCurrency, formatDate, todayString } from '../lib/dateHelpers';
import { Colors, Spacing, Typography, Radius } from '../theme/tokens';
import type { DailyExpense, DailyExpenseCategory } from '../types';
import { DAILY_EXPENSE_CATEGORIES } from '../types';

export function DailyExpensesScreen() {
    const { user } = useAuth();
    const { width } = useWindowDimensions();
    const isLargeScreen = width > 850;
    const [expenses, setExpenses] = useState<DailyExpense[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    const month = getCurrentMonthKey();

    const loadData = useCallback(async (useCache = false) => {
        if (!user) return;
        try {
            const data = await getDailyExpenses(user.id, month.firstDay, month.lastDay, useCache);
            setExpenses(data as DailyExpense[]);

            if (useCache) {
                getDailyExpenses(user.id, month.firstDay, month.lastDay).then((data: DailyExpense[]) => setExpenses(data)).catch(() => {});
            }
        } catch (error: any) {
            if (error.message !== 'TIMEOUT') {
                Alert.alert('Error', error.message);
            }
        } finally {
            setIsLoading(false);
        }
    }, [user, month.firstDay, month.lastDay]);

    useFocusEffect(
        useCallback(() => {
            loadData(true); // cache first
        }, [loadData]),
    );

    async function handleDelete(id: string) {
        const performDelete = async () => {
            console.log('Deleting daily expense:', id);
            try {
                await deleteDailyExpense(id);
                setExpenses((prev: DailyExpense[]) => prev.filter((e: DailyExpense) => e.id !== id));
            } catch (error: any) {
                Alert.alert('Error', error.message);
            }
        };

        if (require('react-native').Platform.OS === 'web') {
            if (window.confirm('¿Eliminar este gasto?')) {
                performDelete();
            }
            return;
        }

        Alert.alert('Eliminar', '¿Eliminar este gasto?', [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Eliminar',
                style: 'destructive',
                onPress: performDelete,
            },
        ]);
    }

    async function handleAdd(description: string, amount: number, category: string) {
        if (!user) return;
        try {
            const newExpense = await addDailyExpense({
                user_id: user.id,
                description,
                amount,
                category: category || null,
                date: todayString(),
            });
            setExpenses((prev: DailyExpense[]) => [newExpense, ...prev]);
            setShowModal(false);

            // Check budget alert
            await checkAndTriggerBudgetAlert(user.id, user.email ?? '');
        } catch (error: any) {
            Alert.alert('Error', error.message);
        }
    }

    const handleActionPress = (item: DailyExpense) => {
        Alert.alert(
            item.description,
            'Selecciona una acción:',
            [
                { 
                    text: 'Eliminar', 
                    onPress: () => handleDelete(item.id),
                    style: 'destructive' 
                },
                { text: 'Cancelar', style: 'cancel' },
            ],
            { cancelable: true }
        );
    };

    const total = expenses.reduce((sum: number, e: DailyExpense) => sum + e.amount, 0);

    // Grouping logic: columns of 6
    const groupIntoChunks = (arr: any[], size: number) => {
        const chunks = [];
        for (let i = 0; i < arr.length; i += size) {
            chunks.push(arr.slice(i, i + size));
        }
        return chunks;
    };

    const expenseColumns = groupIntoChunks(expenses, 6);

    if (isLoading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={Colors.brand.primary} />
            </View>
        );
    }

    return (
        <ResponsiveScreen
            useScrollView={!isLargeScreen}
            maxWidth={800}
            contentContainerStyle={styles.responsiveContent}
        >
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerTitleContainer}>
                    <Text style={styles.title}>Gastos Diarios</Text>
                    <Text style={styles.subtitle}>
                        Total mes: {formatCurrency(total)}
                    </Text>
                </View>
                <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => setShowModal(true)}
                >
                    <Plus color={Colors.neutral.white} size={24} />
                </TouchableOpacity>
            </View>

            {/* List */}
            {expenses.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>
                        No hay gastos diarios registrados{'\n'}para este mes.
                    </Text>
                    <Button
                        title="Registrar gasto"
                        onPress={() => setShowModal(true)}
                        style={{ marginTop: Spacing.md }}
                    />
                </View>
            ) : (
                <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={true}
                    contentContainerStyle={styles.horizontalListContent}
                >
                    {expenseColumns.map((column, colIndex) => (
                        <View key={`col-${colIndex}`} style={styles.column}>
                            {column.map((expense) => {
                                const catInfo = DAILY_EXPENSE_CATEGORIES.find(
                                    (c) => c.value === expense.category,
                                ) || DAILY_EXPENSE_CATEGORIES.find(c => c.value === 'otros');
                                
                                return (
                                    <View key={expense.id} style={styles.cardWrapper}>
                                        <ExpenseCard
                                            title={expense.description}
                                            amount={expense.amount}
                                            categoryLabel={catInfo?.label || expense.category || 'Otros'}
                                            categoryIcon={catInfo?.icon || 'MoreHorizontal'}
                                            colorKey={catInfo?.colorKey || 'other'}
                                            subtitle={formatDate(expense.date)}
                                            onActionPress={() => handleActionPress(expense)}
                                        />
                                    </View>
                                );
                            })}
                        </View>
                    ))}
                </ScrollView>
            )}

            {/* Add Modal */}
            <AddDailyExpenseModal
                visible={showModal}
                onClose={() => setShowModal(false)}
                onAdd={handleAdd}
            />
        </ResponsiveScreen>
    );
}

/* ─── Helpers ─── */

function groupByDate(expenses: DailyExpense[]) {
    const map: Record<string, DailyExpense[]> = {};
    for (const e of expenses) {
        const key = e.date;
        if (!map[key]) map[key] = [];
        map[key].push(e);
    }
    return Object.entries(map)
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([date, data]) => ({
            title: formatDate(date),
            dayTotal: data.reduce((sum, e) => sum + e.amount, 0),
            data,
        }));
}

/* ─── Add Modal ─── */

function AddDailyExpenseModal({
    visible,
    onClose,
    onAdd,
}: {
    visible: boolean;
    onClose: () => void;
    onAdd: (description: string, amount: number, category: string) => void;
}) {
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState<DailyExpenseCategory>('otros');

    function handleSubmit() {
        if (!description.trim()) {
            Alert.alert('Error', 'Ingresa una descripción.');
            return;
        }
        const numAmount = parseInt(amount.replace(/\D/g, ''), 10);
        if (!numAmount || numAmount <= 0) {
            Alert.alert('Error', 'Ingresa un monto válido.');
            return;
        }
        onAdd(description.trim(), numAmount, category);
        setDescription('');
        setAmount('');
        setCategory('otros');
    }

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={modalStyles.backdrop}>
                <View style={modalStyles.sheet}>
                    <Text style={modalStyles.title}>Nuevo gasto diario</Text>

                    <Input
                        label="Descripción"
                        placeholder="Ej: Almuerzo, Transporte..."
                        value={description}
                        onChangeText={setDescription}
                    />

                    <Input
                        label="Monto (CLP)"
                        placeholder="Ej: 5.000"
                        value={amount}
                        onChangeText={setAmount}
                        keyboardType="numeric"
                    />

                    <Text style={modalStyles.label}>Categoría</Text>
                    <View style={modalStyles.catRow}>
                        {DAILY_EXPENSE_CATEGORIES.map((cat) => (
                            <TouchableOpacity
                                key={cat.value}
                                style={[
                                    modalStyles.catChip,
                                    category === cat.value && modalStyles.catChipActive,
                                ]}
                                onPress={() => setCategory(cat.value)}
                            >
                                <Text
                                    style={[
                                        modalStyles.catChipText,
                                        category === cat.value && modalStyles.catChipTextActive,
                                    ]}
                                >
                                    {cat.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <View style={modalStyles.actions}>
                        <Button
                            title="Cancelar"
                            onPress={onClose}
                            variant="ghost"
                            style={{ flex: 1 }}
                        />
                        <Button
                            title="Agregar"
                            onPress={handleSubmit}
                            style={{ flex: 1 }}
                        />
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: Colors.background.main,
    },
    centered: {
        flex: 1,
        backgroundColor: Colors.background.main,
        alignItems: 'center',
        justifyContent: 'center',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: Spacing.xl,
        paddingBottom: Spacing.md,
    },
    headerTitleContainer: {
        flex: 1,
    },
    title: {
        fontFamily: Typography.family.bold,
        fontSize: Typography.size.h2,
        color: Colors.text.primary,
    },
    subtitle: {
        fontFamily: Typography.family.regular,
        fontSize: Typography.size.small,
        color: Colors.text.secondary,
        marginTop: Spacing.xs,
    },
    addButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: Colors.brand.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    responsiveContent: {
        paddingHorizontal: 0,
        flex: 1,
        maxWidth: '100.1%',
    },
    horizontalListContent: {
        paddingHorizontal: Spacing.lg,
        paddingBottom: 40,
        gap: Spacing.md,
    },
    column: {
        width: 280,
    },
    cardWrapper: {
        marginBottom: Spacing.xs,
    },
    expenseCard: {
        padding: Spacing.md,
        marginBottom: Spacing.sm,
    },
    expenseRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: Colors.background.cardHighlight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    expenseInfo: {
        flex: 1,
    },
    expenseDesc: {
        fontFamily: Typography.family.medium,
        fontSize: Typography.size.body,
        color: Colors.text.primary,
    },
    expenseCat: {
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
});

const modalStyles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: Colors.background.overlay,
        justifyContent: 'flex-end',
    },
    sheet: {
        backgroundColor: Colors.background.card,
        borderTopLeftRadius: Radius.xl,
        borderTopRightRadius: Radius.xl,
        padding: Spacing.lg,
        paddingBottom: Spacing.xxl,
    },
    title: {
        fontFamily: Typography.family.bold,
        fontSize: Typography.size.h3,
        color: Colors.text.primary,
        marginBottom: Spacing.lg,
        textAlign: 'center',
    },
    label: {
        fontFamily: Typography.family.medium,
        fontSize: Typography.size.small,
        color: Colors.text.secondary,
        marginBottom: Spacing.sm,
    },
    catRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
        marginBottom: Spacing.lg,
    },
    catChip: {
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: Radius.full,
        backgroundColor: Colors.background.cardHighlight,
        borderWidth: 1,
        borderColor: Colors.neutral[700],
    },
    catChipActive: {
        backgroundColor: Colors.brand.primary,
        borderColor: Colors.brand.primary,
    },
    catChipText: {
        fontFamily: Typography.family.medium,
        fontSize: Typography.size.small,
        color: Colors.text.secondary,
    },
    catChipTextActive: {
        color: Colors.neutral.white,
    },
    actions: {
        flexDirection: 'row',
        gap: Spacing.md,
        marginTop: Spacing.md,
    },
});
