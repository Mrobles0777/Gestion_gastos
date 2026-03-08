/**
 * Card component with glassmorphism-like appearance.
 * Rule III: Atomic component for containers.
 */

import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Colors, Spacing, Radius, Shadows } from '../../theme/tokens';

interface CardProps {
    children: React.ReactNode;
    style?: ViewStyle;
    highlight?: boolean;
}

export function Card({ children, style, highlight = false }: CardProps) {
    return (
        <View
            style={[
                styles.card,
                Shadows.card,
                highlight && styles.highlight,
                style,
            ]}
        >
            {children}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: Colors.background.card,
        borderRadius: Radius.lg,
        padding: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.neutral[700],
    },
    highlight: {
        borderColor: Colors.brand.primary,
        backgroundColor: Colors.background.cardHighlight,
    },
});
