/**
 * FixedExpensesScreen – CRUD for monthly recurring expenses.
 * Rule I: UI delegates to dataService.
 * Rule III: Handles Loading, Empty, Error, and Overflow states.
 */

import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
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
    Pencil,
    Trash2,
} from 'lucide-react-native';
import { Card, Button, Input, ResponsiveScreen } from '../components/common';
import { ExpenseCard } from '../components/expenses';
import { useAuth } from '../contexts/AuthContext';
import {
    getFixedExpenses,
    addFixedExpense,
    updateFixedExpense,
    deleteFixedExpense,
    toggleFixedExpensePaid,
} from '../lib/dataService';
import { checkAndTriggerBudgetAlert } from '../lib/dataService';
import { getCurrentMonthKey, formatCurrency } from '../lib/dateHelpers';
import { Colors, Spacing, Typography, Radius } from '../theme/tokens';
import type { FixedExpense, FixedExpenseCategory } from '../types';
import { FIXED_EXPENSE_CATEGORIES } from '../types';



export function FixedExpensesScreen() {
    const { user } = useAuth();
    const { width } = useWindowDimensions();
    const isLargeScreen = width > 850;
    
    // Dynamic columns for grid (max 6)
    const numColumns = Math.min(6, Math.max(1, Math.floor((width - Spacing.lg * 2) / 250)));
    
    const [expenses, setExpenses] = useState<FixedExpense[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingExpense, setEditingExpense] = useState<FixedExpense | null>(null);

    const month = getCurrentMonthKey();

    const loadData = useCallback(async (useCache = false) => {
        if (!user) return;
        try {
            const data = await getFixedExpenses(user.id, month.firstDay, useCache);
            setExpenses(data);

            if (useCache) {
                getFixedExpenses(user.id, month.firstDay).then(setExpenses).catch(() => {});
            }
        } catch (error: any) {
            if (error.message !== 'TIMEOUT') {
                Alert.alert('Error', error.message);
            }
        } finally {
            setIsLoading(false);
        }
    }, [user, month.firstDay]);

    useFocusEffect(
        useCallback(() => {
            loadData(true);
        }, [loadData]),
    );

    async function handleDelete(id: string) {
        const performDelete = async () => {
            console.log('Deleting fixed expense:', id);
            try {
                await deleteFixedExpense(id);
                setExpenses((prev: FixedExpense[]) => prev.filter((e: FixedExpense) => e.id !== id));
            } catch (error: any) {
                Alert.alert('Error', error.message);
            }
        };

        if (require('react-native').Platform.OS === 'web') {
            if (window.confirm('¿Eliminar este gasto fijo?')) {
                performDelete();
            }
            return;
        }

        Alert.alert('Eliminar', '¿Eliminar este gasto fijo?', [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Eliminar',
                style: 'destructive',
                onPress: performDelete,
            },
        ]);
    }

    async function handleAdd(category: FixedExpenseCategory, amount: number, label: string, dueDay: number) {
        if (!user) return;
        try {
            const newExpense = await addFixedExpense({
                user_id: user.id,
                category,
                label: label || null,
                amount,
                month: month.firstDay,
                due_day: dueDay,
            });
            setExpenses((prev: FixedExpense[]) => [newExpense, ...prev]);
            setShowAddModal(false);

            // Check budget alert
            await checkAndTriggerBudgetAlert(user.id, user.email ?? '');
        } catch (error: any) {
            Alert.alert('Error', error.message);
        }
    }

    async function handleEdit(id: string, category: FixedExpenseCategory, amount: number, label: string, dueDay: number) {
        if (!user) return;
        try {
            const updated = await updateFixedExpense(id, {
                category,
                amount,
                label: label || null,
                due_day: dueDay,
            });
            setExpenses((prev) => prev.map((e) => (e.id === id ? updated : e)));
            setEditingExpense(null);

            // Check budget alert
            await checkAndTriggerBudgetAlert(user.id, user.email ?? '');
        } catch (error: any) {
            Alert.alert('Error', error.message);
        }
    }

    const handleActionPress = (item: FixedExpense) => {
        Alert.alert(
            item.label || item.category,
            'Selecciona una acción:',
            [
                { text: 'Editar', onPress: () => setEditingExpense(item) },
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

    const total = expenses.reduce((sum: number, e: FixedExpense) => sum + e.amount, 0);

    if (isLoading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={Colors.brand.primary} />
            </View>
        );
    }

    return (
        <ResponsiveScreen
            maxWidth={800}
            useScrollView={!isLargeScreen}
            contentContainerStyle={styles.responsiveContent}
        >
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>Gastos Fijos</Text>
                    <Text style={styles.subtitle}>
                        Total: {formatCurrency(total)}
                    </Text>
                </View>
                <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => setShowAddModal(true)}
                >
                    <Plus color={Colors.neutral.white} size={24} />
                </TouchableOpacity>
            </View>

            {/* List */}
            {expenses.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>
                        No hay gastos fijos registrados{'\n'}para este mes.
                    </Text>
                    <Button
                        title="Agregar gasto fijo"
                        onPress={() => setShowAddModal(true)}
                        style={{ marginTop: Spacing.md }}
                    />
                </View>
            ) : (
                <FlatList
                    key={`fixed-expenses-grid-${numColumns}`}
                    data={expenses}
                    numColumns={numColumns}
                    columnWrapperStyle={numColumns > 1 ? styles.columnWrapper : undefined}
                    keyExtractor={(item: FixedExpense) => item.id}
                    scrollEnabled={isLargeScreen}
                    style={isLargeScreen ? { flex: 1 } : null}
                    contentContainerStyle={styles.listContent}
                    renderItem={({ item }: { item: FixedExpense }) => {
                        const catInfo = FIXED_EXPENSE_CATEGORIES.find(
                            (c) => c.value === item.category,
                        );
                        return (
                            <ExpenseCard
                                title={item.label || catInfo?.label || item.category}
                                amount={item.amount}
                                categoryLabel={catInfo?.label || item.category}
                                categoryIcon={catInfo?.icon || 'MoreHorizontal'}
                                colorKey={catInfo?.colorKey || 'other'}
                                subtitle={`Vence día ${item.due_day || 1}`}
                                isPaid={item.is_paid}
                                onPress={() => toggleFixedExpensePaid(item.id, !item.is_paid).then(() => loadData(false))}
                                onActionPress={() => handleActionPress(item)}
                            />
                        );
                    }}
                />
            )}

            {/* Add Modal */}
            <AddFixedExpenseModal
                visible={showAddModal}
                onClose={() => setShowAddModal(false)}
                onAdd={handleAdd}
            />

            {/* Edit Modal */}
            {editingExpense && (
                <EditFixedExpenseModal
                    visible={!!editingExpense}
                    expense={editingExpense}
                    onClose={() => setEditingExpense(null)}
                    onEdit={handleEdit}
                />
            )}
        </ResponsiveScreen>
    );
}

/* ─── Add/Edit Modals ─── */

function AddFixedExpenseModal({
    visible,
    onClose,
    onAdd,
}: {
    visible: boolean;
    onClose: () => void;
    onAdd: (category: FixedExpenseCategory, amount: number, label: string, dueDay: number) => void;
}) {
    const [category, setCategory] = useState<FixedExpenseCategory>('arriendo');
    const [amount, setAmount] = useState('');
    const [label, setLabel] = useState('');
    const [dueDay, setDueDay] = useState('1');

    function handleSubmit() {
        const numAmount = parseInt(amount.replace(/\D/g, ''), 10);
        if (!numAmount || numAmount <= 0) {
            Alert.alert('Error', 'Ingresa un monto válido.');
            return;
        }
        const numDueDay = parseInt(dueDay, 10);
        if (!numDueDay || numDueDay < 1 || numDueDay > 31) {
            Alert.alert('Error', 'Ingresa un día de pago válido (1-31).');
            return;
        }
        onAdd(category, numAmount, label.trim(), numDueDay);
        setAmount('');
        setLabel('');
        setDueDay('1');
    }

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={modalStyles.backdrop}>
                <View style={modalStyles.sheet}>
                    <Text style={modalStyles.title}>Nuevo gasto fijo</Text>

                    {/* Category selector */}
                    <Text style={modalStyles.label}>Categoría</Text>
                    <View style={modalStyles.catRow}>
                        {FIXED_EXPENSE_CATEGORIES.map((cat) => (
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

                    <Input
                        label="Monto (CLP)"
                        placeholder="Ej: 500.000"
                        value={amount}
                        onChangeText={setAmount}
                        keyboardType="numeric"
                    />

                    <Input
                        label="Etiqueta (opcional)"
                        placeholder="Ej: Dto. calle Ejemplo"
                        value={label}
                        onChangeText={setLabel}
                    />

                    <Input
                        label="Día de pago (1-31)"
                        placeholder="Ej: 5"
                        value={dueDay}
                        onChangeText={setDueDay}
                        keyboardType="numeric"
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

function EditFixedExpenseModal({
    visible,
    expense,
    onClose,
    onEdit,
}: {
    visible: boolean;
    expense: FixedExpense;
    onClose: () => void;
    onEdit: (id: string, category: FixedExpenseCategory, amount: number, label: string, dueDay: number) => void;
}) {
    const [category, setCategory] = useState<FixedExpenseCategory>(expense.category);
    const [amount, setAmount] = useState(expense.amount.toString());
    const [label, setLabel] = useState(expense.label || '');
    const [dueDay, setDueDay] = useState((expense.due_day || 1).toString());

    function handleSubmit() {
        const numAmount = parseInt(amount.replace(/\D/g, ''), 10);
        if (!numAmount || numAmount <= 0) {
            Alert.alert('Error', 'Ingresa un monto válido.');
            return;
        }
        const numDueDay = parseInt(dueDay, 10);
        if (!numDueDay || numDueDay < 1 || numDueDay > 31) {
            Alert.alert('Error', 'Ingresa un día de pago válido (1-31).');
            return;
        }
        onEdit(expense.id, category, numAmount, label.trim(), numDueDay);
    }

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={modalStyles.backdrop}>
                <View style={modalStyles.sheet}>
                    <Text style={modalStyles.title}>Editar gasto fijo</Text>

                    {/* Category selector */}
                    <Text style={modalStyles.label}>Categoría</Text>
                    <View style={modalStyles.catRow}>
                        {FIXED_EXPENSE_CATEGORIES.map((cat) => (
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

                    <Input
                        label="Monto (CLP)"
                        placeholder="Ej: 500.000"
                        value={amount}
                        onChangeText={setAmount}
                        keyboardType="numeric"
                    />

                    <Input
                        label="Etiqueta (opcional)"
                        placeholder="Ej: Dto. calle Ejemplo"
                        value={label}
                        onChangeText={setLabel}
                    />

                    <Input
                        label="Día de pago (1-31)"
                        placeholder="Ej: 5"
                        value={dueDay}
                        onChangeText={setDueDay}
                        keyboardType="numeric"
                    />

                    <View style={modalStyles.actions}>
                        <Button
                            title="Cancelar"
                            onPress={onClose}
                            variant="ghost"
                            style={{ flex: 1 }}
                        />
                        <Button
                            title="Guardar"
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
    responsiveContent: {
        paddingHorizontal: 0,
        maxWidth: 1400,
    },
    columnWrapper: {
        gap: Spacing.md,
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
        gap: Spacing.sm,
        paddingBottom: 100, // Clearance for tab bar
    },
    expenseCard: {
        padding: Spacing.md,
    },
    expenseRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.background.cardHighlight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    expenseInfo: {
        flex: 1,
    },
    expenseCat: {
        fontFamily: Typography.family.medium,
        fontSize: Typography.size.body,
        color: Colors.text.primary,
    },
    expenseLabel: {
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
    actionButtons: {
        flexDirection: 'row',
        gap: Spacing.md,
        alignItems: 'center',
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
