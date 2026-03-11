/**
 * ExpenseCard – A compact, categorical card for both Fixed and Daily expenses.
 * Rule III: Design Tokens, Visual Resilience, and Componentization.
 */

import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
} from 'react-native';
import * as LucideIcons from 'lucide-react-native';
import { Colors, Spacing, Typography, Radius, Shadows } from '../../theme/tokens';
import { formatCurrency } from '../../lib/dateHelpers';
import { Card } from '../common';

interface ExpenseCardProps {
    title: string;
    amount: number;
    categoryLabel: string;
    categoryIcon: string;
    colorKey: string;
    subtitle?: string; // e.g., "Día 5" or "12 Mar"
    onPress?: () => void;
    onActionPress?: () => void;
    isPaid?: boolean;
}

export function ExpenseCard({
    title,
    amount,
    categoryLabel,
    categoryIcon,
    colorKey,
    subtitle,
    onPress,
    onActionPress,
    isPaid = false,
}: ExpenseCardProps) {
    // Dynamically get the icon component
    const IconComponent = (LucideIcons as any)[categoryIcon] || LucideIcons.MoreHorizontal;
    const categoryColor = (Colors.categories as any)[colorKey] || Colors.neutral[500];

    return (
        <Card style={styles.cardContainer}>
            <View style={styles.containerRow}>
                <TouchableOpacity 
                    style={styles.mainContent} 
                    onPress={onPress}
                    activeOpacity={0.7}
                >
                    <View style={[styles.iconBadge, { backgroundColor: `${categoryColor}15` }]}>
                        <IconComponent size={20} color={categoryColor} />
                    </View>

                    <View style={styles.detailsContainer}>
                        <View style={styles.topRow}>
                            <Text 
                                style={[
                                    styles.title, 
                                    isPaid && styles.textMuted
                                ]} 
                                numberOfLines={1}
                            >
                                {title}
                            </Text>
                            <Text 
                                style={[
                                    styles.amount,
                                    isPaid && styles.textMuted
                                ]}
                            >
                                {formatCurrency(amount)}
                            </Text>
                        </View>

                        <View style={styles.bottomRow}>
                            <View style={[styles.categoryChip, { backgroundColor: `${categoryColor}20` }]}>
                                <View style={[styles.dot, { backgroundColor: categoryColor }]} />
                                <Text style={[styles.categoryText, { color: categoryColor }]}>
                                    {categoryLabel}
                                </Text>
                            </View>
                            {subtitle && (
                                <Text style={styles.subtitle}>
                                    {subtitle}
                                </Text>
                            )}
                        </View>
                    </View>
                </TouchableOpacity>

                {onActionPress && (
                    <TouchableOpacity 
                        style={styles.actionButton} 
                        onPress={onActionPress}
                        hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                    >
                        <LucideIcons.MoreVertical size={18} color={Colors.text.muted} />
                    </TouchableOpacity>
                )}
            </View>
        </Card>
    );
}

const styles = StyleSheet.create({
    cardContainer: {
        flex: 1,
        padding: 0,
        marginBottom: Spacing.sm,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: Colors.neutral[700],
    },
    containerRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    mainContent: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.md,
    },
    iconBadge: {
        width: 36,
        height: 36,
        borderRadius: Radius.sm,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: Spacing.md,
    },
    detailsContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    title: {
        fontFamily: Typography.family.medium,
        fontSize: Typography.size.body,
        color: Colors.text.primary,
        flex: 1,
        marginRight: Spacing.sm,
    },
    amount: {
        fontFamily: Typography.family.bold,
        fontSize: Typography.size.body,
        color: Colors.neutral[100], // Darker amount
    },
    bottomRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        marginTop: 2,
    },
    categoryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 6,
        paddingVertical: 1,
        borderRadius: Radius.sm,
    },
    dot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        marginRight: 4,
    },
    categoryText: {
        fontFamily: Typography.family.medium,
        fontSize: 10,
        textTransform: 'capitalize',
    },
    subtitle: {
        fontFamily: Typography.family.regular,
        fontSize: Typography.size.tiny,
        color: Colors.text.secondary, // Gray medium
    },
    actionButton: {
        marginLeft: Spacing.sm,
        padding: 4,
    },
    textMuted: {
        color: Colors.text.muted,
        textDecorationLine: 'line-through',
    },
});
