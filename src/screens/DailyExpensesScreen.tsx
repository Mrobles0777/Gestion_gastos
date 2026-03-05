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
    SectionList,
    Alert,
    TouchableOpacity,
    ActivityIndicator,
    Modal,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
    Plus,
    Trash2,
    ShoppingCart,
} from 'lucide-react-native';
import { Card, Button, Input } from '../components/common';
import { useAuth } from '../contexts/AuthContext';
import {
    getDailyExpenses,
    addDailyExpense,
    deleteDailyExpense,
    checkAndTriggerBudgetAlert,
} from '../lib/dataService';
import { getCurrentMonthKey, formatCurrency, formatDate, todayString } from '../lib/dateHelpers';
import { Colors, Spacing, Typography, Radius } from '../theme/tokens';
import type { DailyExpense } from '../types';

export function DailyExpensesScreen() {
    const { user } = useAuth();
    const [expenses, setExpenses] = useState<DailyExpense[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    const month = getCurrentMonthKey();

    const loadData = useCallback(async () => {
        if (!user) return;
        try {
            const data = await getDailyExpenses(user.id, month.firstDay, month.lastDay);
            setExpenses(data);
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setIsLoading(false);
        }
    }, [user, month.firstDay, month.lastDay]);

    useFocusEffect(
        useCallback(() => {
            setIsLoading(true);
            loadData();
        }, [loadData]),
    );

    async function handleDelete(id: string) {
        Alert.alert('Eliminar', '¿Eliminar este gasto?', [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Eliminar',
                style: 'destructive',
                onPress: async () => {
                    console.log('Deleting daily expense:', id);
                    try {
                        await deleteDailyExpense(id);
                        setExpenses((prev) => prev.filter((e) => e.id !== id));
                    } catch (error: any) {
                        Alert.alert('Error', error.message);
                    }
                },
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
            setExpenses((prev) => [newExpense, ...prev]);
            setShowModal(false);

            // Check budget alert
            await checkAndTriggerBudgetAlert(user.id, user.email ?? '');
        } catch (error: any) {
            Alert.alert('Error', error.message);
        }
    }

    const total = expenses.reduce((sum, e) => sum + e.amount, 0);

    // Group by date for SectionList
    const sections = groupByDate(expenses);

    if (isLoading) {
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
                <View>
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
                <SectionList
                    sections={sections}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                    renderSectionHeader={({ section: { title } }) => (
                        <Text style={styles.sectionHeader}>{title}</Text>
                    )}
                    renderItem={({ item }) => (
                        <Card style={styles.expenseCard}>
                            <View style={styles.expenseRow}>
                                <View style={styles.iconContainer}>
                                    <ShoppingCart color={Colors.text.secondary} size={18} />
                                </View>
                                <View style={styles.expenseInfo}>
                                    <Text style={styles.expenseDesc} numberOfLines={1}>
                                        {item.description}
                                    </Text>
                                    {item.category && (
                                        <Text style={styles.expenseCat} numberOfLines={1}>
                                            {item.category}
                                        </Text>
                                    )}
                                </View>
                                <Text style={styles.expenseAmount}>
                                    {formatCurrency(item.amount)}
                                </Text>
                                <TouchableOpacity onPress={() => handleDelete(item.id)}>
                                    <Trash2 color={Colors.status.danger} size={18} />
                                </TouchableOpacity>
                            </View>
                        </Card>
                    )}
                />
            )}

            {/* Add Modal */}
            <AddDailyExpenseModal
                visible={showModal}
                onClose={() => setShowModal(false)}
                onAdd={handleAdd}
            />
        </View>
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
    const [category, setCategory] = useState('');

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
        onAdd(description.trim(), numAmount, category.trim());
        setDescription('');
        setAmount('');
        setCategory('');
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

                    <Input
                        label="Categoría (opcional)"
                        placeholder="Ej: Comida, Transporte"
                        value={category}
                        onChangeText={setCategory}
                    />

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
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.xxl + Spacing.lg,
        paddingBottom: Spacing.md,
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
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: Spacing.lg,
    },
    emptyText: {
        fontFamily: Typography.family.regular,
        fontSize: Typography.size.body,
        color: Colors.text.muted,
        textAlign: 'center',
    },
    listContent: {
        padding: Spacing.lg,
        paddingTop: 0,
    },
    sectionHeader: {
        fontFamily: Typography.family.semiBold,
        fontSize: Typography.size.small,
        color: Colors.text.secondary,
        marginTop: Spacing.md,
        marginBottom: Spacing.sm,
        textTransform: 'uppercase',
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
    actions: {
        flexDirection: 'row',
        gap: Spacing.md,
        marginTop: Spacing.md,
    },
});
