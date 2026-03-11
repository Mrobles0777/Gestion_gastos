/**
 * PaymentReminderModal – A premium modal to simulate payment alerts.
 * Rule III: Design Tokens used for consistency.
 */

import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { Bell, X, Calendar, ArrowRight, CheckCircle2, Mail } from 'lucide-react-native';
import { Colors, Spacing, Typography, Radius, Shadows } from '../../theme/tokens';
import { formatCurrency } from '../../lib/dateHelpers';
import { triggerPaymentReminder } from '../../lib/dataService';
import type { FixedExpense } from '../../types';
import { FIXED_EXPENSE_CATEGORIES } from '../../types';
import { ExpenseCard } from '../expenses';

interface PaymentReminderModalProps {
    visible: boolean;
    onClose: () => void;
    expenses: FixedExpense[];
}

export function PaymentReminderModal({ visible, onClose, expenses }: PaymentReminderModalProps) {
    const [isSending, setIsSending] = React.useState(false);
    const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);

    const handleSendSimulation = async () => {
        setIsSending(true);
        try {
            await triggerPaymentReminder();
            Alert.alert(
                'Simulación Exitosa',
                'Se ha solicitado el envío del recordatorio. Si tienes gastos vencidos hoy, recibirás un email pronto.'
            );
        } catch (error: any) {
            Alert.alert('Error en Simulación', error.message);
        } finally {
            setIsSending(false);
        }
    };

    return (
        <Modal
            visible={visible}
            animationType="fade"
            transparent
            statusBarTranslucent
        >
            <View style={styles.backdrop}>
                <View style={styles.content}>
                    {/* Header with Background Gradient Simulation */}
                    <View style={styles.header}>
                        <View style={styles.iconContainer}>
                            <Bell color={Colors.brand.primary} size={28} />
                        </View>
                        <Text style={styles.title}>Recordatorio de Pago</Text>
                        <Text style={styles.subtitle}>
                            Hoy tienes {expenses.length} {expenses.length === 1 ? 'gasto vencido' : 'gastos vencidos'}.
                        </Text>
                        
                        <TouchableOpacity style={styles.closeButton} onPress={onClose} disabled={isSending}>
                            <X color={Colors.text.muted} size={20} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
                        <View style={styles.expensesContainer}>
                            {expenses.map((expense) => {
                                const catInfo = FIXED_EXPENSE_CATEGORIES.find(c => c.value === expense.category);
                                return (
                                    <ExpenseCard
                                        key={expense.id}
                                        title={expense.label || catInfo?.label || expense.category}
                                        amount={expense.amount}
                                        categoryLabel={catInfo?.label || expense.category}
                                        categoryIcon={catInfo?.icon || 'MoreHorizontal'}
                                        colorKey={catInfo?.colorKey || 'other'}
                                        subtitle="Vence hoy"
                                        isPaid={expense.is_paid}
                                    />
                                );
                            })}
                        </View>
                    </ScrollView>

                    <View style={styles.footer}>
                        <View style={styles.totalRow}>
                            <View>
                                <Text style={styles.totalLabel}>Total Pendiente</Text>
                                <Text style={styles.totalValue}>{formatCurrency(totalAmount)}</Text>
                            </View>
                            <TouchableOpacity 
                                style={[styles.sendButton, isSending && styles.buttonDisabled]} 
                                onPress={handleSendSimulation}
                                disabled={isSending}
                            >
                                {isSending ? (
                                    <ActivityIndicator size="small" color={Colors.brand.primary} />
                                ) : (
                                    <>
                                        <Mail color={Colors.brand.primary} size={18} />
                                        <Text style={styles.sendButtonText}>Simular Envío</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                        
                        <TouchableOpacity style={styles.actionButton} onPress={onClose} disabled={isSending}>
                            <Text style={styles.actionButtonText}>Entendido</Text>
                            <CheckCircle2 color={Colors.neutral.white} size={18} />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: Colors.background.overlay,
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.lg,
    },
    content: {
        width: '100%',
        maxWidth: 450,
        backgroundColor: Colors.background.card,
        borderRadius: Radius.xl,
        overflow: 'hidden',
        ...Shadows.card,
    },
    header: {
        alignItems: 'center',
        padding: Spacing.xl,
        backgroundColor: Colors.background.cardHighlight,
        borderBottomWidth: 1,
        borderBottomColor: Colors.neutral[700],
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: Colors.neutral.white,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.md,
        ...Shadows.button,
        shadowColor: Colors.brand.primary,
    },
    closeButton: {
        position: 'absolute',
        top: Spacing.md,
        right: Spacing.md,
        padding: Spacing.xs,
    },
    title: {
        fontFamily: Typography.family.bold,
        fontSize: Typography.size.h3,
        color: Colors.text.primary,
        marginBottom: Spacing.xs,
    },
    subtitle: {
        fontFamily: Typography.family.regular,
        fontSize: Typography.size.body,
        color: Colors.text.secondary,
        textAlign: 'center',
    },
    scrollArea: {
        maxHeight: 300,
    },
    expensesContainer: {
        padding: Spacing.lg,
        gap: Spacing.md,
    },
    expenseCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: Spacing.md,
        backgroundColor: Colors.neutral.white,
        borderRadius: Radius.lg,
        borderWidth: 1,
        borderColor: Colors.neutral[700],
    },
    expenseInfo: {
        flex: 1,
    },
    expenseLabel: {
        fontFamily: Typography.family.medium,
        fontSize: Typography.size.body,
        color: Colors.text.primary,
        marginBottom: 4,
    },
    dueTag: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    dueText: {
        fontFamily: Typography.family.regular,
        fontSize: Typography.size.tiny,
        color: Colors.brand.primary,
    },
    expenseAmount: {
        fontFamily: Typography.family.bold,
        fontSize: Typography.size.body,
        color: Colors.text.primary,
    },
    footer: {
        padding: Spacing.lg,
        borderTopWidth: 1,
        borderTopColor: Colors.neutral[700],
        backgroundColor: Colors.neutral.white,
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.lg,
    },
    totalLabel: {
        fontFamily: Typography.family.regular,
        fontSize: Typography.size.body,
        color: Colors.text.secondary,
    },
    totalValue: {
        fontFamily: Typography.family.bold,
        fontSize: Typography.size.h3,
        color: Colors.text.primary,
    },
    sendButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: Radius.full,
        borderWidth: 1,
        borderColor: Colors.brand.primary,
        backgroundColor: Colors.neutral.white,
    },
    sendButtonText: {
        fontFamily: Typography.family.bold,
        fontSize: Typography.size.small,
        color: Colors.brand.primary,
    },
    buttonDisabled: {
        opacity: 0.5,
        borderColor: Colors.neutral[700],
    },
    actionButton: {
        flexDirection: 'row',
        backgroundColor: Colors.brand.primary,
        paddingVertical: Spacing.md,
        borderRadius: Radius.lg,
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
        ...Shadows.button,
    },
    actionButtonText: {
        color: Colors.neutral.white,
        fontFamily: Typography.family.bold,
        fontSize: Typography.size.body,
    },
});
