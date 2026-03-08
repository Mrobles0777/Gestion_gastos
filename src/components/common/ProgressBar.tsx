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
    threshold?: number;
    showLabel?: boolean;
}

export function ProgressBar({ percent, threshold = 75, showLabel = true }: ProgressBarProps) {
    const clampedPercent = Math.min(Math.max(percent, 0), 100);
    const gradientColors = getGradientForPercent(clampedPercent, threshold);

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
                {/* Dynamic threshold marker */}
                <View style={[styles.threshold, { left: `${threshold}%` }]} />
            </View>
        </View>
    );
}

function getGradientForPercent(
    pct: number,
    threshold: number,
): readonly [string, string] {
    if (pct >= threshold) return Colors.gradient.danger;
    const warningPoint = threshold * 0.66; // Sub-threshold warning
    if (pct >= warningPoint) return [Colors.status.warning, '#ea580c'] as const;
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
        height: 16,
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
        width: 3,
        height: '100%',
        backgroundColor: Colors.neutral[100],
        opacity: 0.4,
        zIndex: 10,
    },
});
