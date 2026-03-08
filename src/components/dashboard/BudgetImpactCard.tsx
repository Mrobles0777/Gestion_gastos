import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { TrendingUp, TrendingDown, AlertCircle } from 'lucide-react-native';
import { Card, ProgressBar } from '../common';
import { Colors, Spacing, Typography, Radius, Shadows } from '../../theme/tokens';
import { formatCurrency } from '../../lib/dateHelpers';

interface BudgetImpactCardProps {
    consumed: number;
    available: number;
    total: number;
    percent: number;
    threshold: number;
}

export function BudgetImpactCard({
    consumed,
    available,
    total,
    percent,
    threshold,
}: BudgetImpactCardProps) {
    const isOverBudget = percent >= threshold;
    const statusColor = isOverBudget 
        ? Colors.status.danger 
        : percent >= threshold * 0.75 
            ? Colors.status.warning 
            : Colors.brand.primary;

    return (
        <Card style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>Estado del Presupuesto</Text>
                    <Text style={styles.subtitle}>Basado en tu sueldo mensual</Text>
                </View>
                {isOverBudget && (
                    <View style={styles.errorBadge}>
                        <AlertCircle color={Colors.status.danger} size={16} />
                        <Text style={styles.errorText}>Límite excedido</Text>
                    </View>
                )}
            </View>

            <View style={styles.mainInfo}>
                <View style={styles.infoBlock}>
                    <View style={styles.labelRow}>
                        <TrendingDown color={Colors.text.muted} size={14} />
                        <Text style={styles.label}>Consumido</Text>
                    </View>
                    <Text style={styles.amount}>{formatCurrency(consumed)}</Text>
                </View>

                <View style={[styles.infoDivider, { backgroundColor: Colors.neutral[700] }]} />

                <View style={styles.infoBlock}>
                    <View style={styles.labelRow}>
                        <TrendingUp 
                            color={available >= 0 ? Colors.status.success : Colors.status.danger} 
                            size={14} 
                        />
                        <Text style={styles.label}>Restante</Text>
                    </View>
                    <Text 
                        style={[
                            styles.amount, 
                            { color: available >= 0 ? Colors.status.success : Colors.status.danger }
                        ]}
                    >
                        {formatCurrency(available)}
                    </Text>
                </View>
            </View>

            <View style={styles.progressSection}>
                <ProgressBar 
                    percent={percent} 
                    threshold={threshold} 
                    showLabel={false}
                />
                <View style={styles.progressFooter}>
                    <Text style={styles.progressText}>
                        <Text style={[styles.percentText, { color: statusColor }]}>
                            {Math.round(percent)}%
                        </Text> del presupuesto utilizado
                    </Text>
                    <Text style={styles.totalText}>de {formatCurrency(total)}</Text>
                </View>
            </View>
            
            {/* Glassmorphism subtle background element */}
            <LinearGradient
                colors={['rgba(99, 102, 241, 0.05)', 'rgba(168, 85, 247, 0.02)']}
                style={StyleSheet.absoluteFill}
                pointerEvents="none"
            />
        </Card>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: Spacing.md,
        overflow: 'hidden',
        padding: Spacing.lg,
        borderWidth: 1,
        borderColor: 'rgba(226, 232, 240, 0.5)',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: Spacing.lg,
    },
    title: {
        fontFamily: Typography.family.bold,
        fontSize: Typography.size.body,
        color: Colors.text.primary,
    },
    subtitle: {
        fontFamily: Typography.family.regular,
        fontSize: Typography.size.tiny,
        color: Colors.text.muted,
        marginTop: 2,
    },
    errorBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        paddingHorizontal: Spacing.sm,
        paddingVertical: 4,
        borderRadius: Radius.full,
        gap: 4,
    },
    errorText: {
        fontFamily: Typography.family.medium,
        fontSize: Typography.size.tiny,
        color: Colors.status.danger,
    },
    mainInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: Spacing.xl,
    },
    infoBlock: {
        flex: 1,
    },
    labelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 4,
    },
    label: {
        fontFamily: Typography.family.medium,
        fontSize: Typography.size.tiny,
        color: Colors.text.secondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    amount: {
        fontFamily: Typography.family.bold,
        fontSize: Typography.size.h3,
        color: Colors.text.primary,
    },
    infoDivider: {
        width: 1,
        height: 30,
        marginHorizontal: Spacing.md,
    },
    progressSection: {
        marginTop: Spacing.sm,
    },
    progressFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: Spacing.sm,
    },
    progressText: {
        fontFamily: Typography.family.regular,
        fontSize: Typography.size.small,
        color: Colors.text.secondary,
    },
    percentText: {
        fontFamily: Typography.family.bold,
    },
    totalText: {
        fontFamily: Typography.family.medium,
        fontSize: Typography.size.tiny,
        color: Colors.text.muted,
    },
});
