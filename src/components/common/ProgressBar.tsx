/**
 * Budget progress bar with dynamic color thresholds.
 * Turns warning at 50%, danger at 75%.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, Radius, Typography } from '../../theme/tokens';

interface ProgressBarProps {
    percent: number; // 0–100+
    showLabel?: boolean;
}

export function ProgressBar({ percent, showLabel = true }: ProgressBarProps) {
    const clampedPercent = Math.min(Math.max(percent, 0), 100);
    const gradientColors = getGradientForPercent(clampedPercent);

    return (
        <View style={styles.container}>
            {showLabel && (
                <View style={styles.labelRow}>
                    <Text style={styles.label}>Consumido</Text>
                    <Text style={[styles.value, { color: gradientColors[0] }]}>
                        {Math.round(percent)}%
                    </Text>
                </View>
            )}
            <View style={styles.track}>
                <LinearGradient
                    colors={[...gradientColors]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.fill, { width: `${clampedPercent}%` }]}
                />
                {/* 75% threshold marker */}
                <View style={[styles.threshold, { left: '75%' }]} />
            </View>
        </View>
    );
}

function getGradientForPercent(
    pct: number,
): readonly [string, string] {
    if (pct >= 75) return Colors.gradient.danger;
    if (pct >= 50) return [Colors.status.warning, '#ea580c'] as const;
    return Colors.gradient.success;
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
    },
    labelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: Spacing.sm,
    },
    label: {
        fontFamily: Typography.family.medium,
        fontSize: Typography.size.small,
        color: Colors.text.secondary,
    },
    value: {
        fontFamily: Typography.family.bold,
        fontSize: Typography.size.body,
    },
    track: {
        height: 12,
        backgroundColor: Colors.neutral[700],
        borderRadius: Radius.full,
        overflow: 'hidden',
        position: 'relative',
    },
    fill: {
        height: '100%',
        borderRadius: Radius.full,
    },
    threshold: {
        position: 'absolute',
        top: 0,
        width: 2,
        height: '100%',
        backgroundColor: Colors.neutral[300],
        opacity: 0.6,
    },
});
