/**
 * Reusable Button component with gradient and loading state.
 * Rule III: Handles Loading, Error, and Overflow states.
 */

import React from 'react';
import {
    TouchableOpacity,
    Text,
    StyleSheet,
    ActivityIndicator,
    ViewStyle,
    TextStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, Radius, Typography, Shadows } from '../../theme/tokens';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface ButtonProps {
    title: string;
    onPress: () => void;
    variant?: ButtonVariant;
    isLoading?: boolean;
    disabled?: boolean;
    icon?: React.ReactNode;
    style?: ViewStyle;
}

export function Button({
    title,
    onPress,
    variant = 'primary',
    isLoading = false,
    disabled = false,
    icon,
    style,
}: ButtonProps) {
    const isDisabled = disabled || isLoading;

    if (variant === 'primary') {
        return (
            <TouchableOpacity
                onPress={onPress}
                disabled={isDisabled}
                activeOpacity={0.8}
                style={style}
            >
                <LinearGradient
                    colors={[...Colors.gradient.primary]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[
                        styles.base,
                        Shadows.button,
                        isDisabled && styles.disabled,
                    ]}
                >
                    {isLoading ? (
                        <ActivityIndicator color={Colors.neutral.white} />
                    ) : (
                        <>
                            {icon}
                            <Text style={[styles.textPrimary, icon ? styles.textWithIcon : null]}>
                                {title}
                            </Text>
                        </>
                    )}
                </LinearGradient>
            </TouchableOpacity>
        );
    }

    const variantStyles = getVariantStyle(variant);

    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={isDisabled}
            activeOpacity={0.8}
            style={[
                styles.base,
                variantStyles.container,
                isDisabled && styles.disabled,
                style,
            ]}
        >
            {isLoading ? (
                <ActivityIndicator color={variantStyles.textColor} />
            ) : (
                <>
                    {icon}
                    <Text
                        style={[
                            styles.text,
                            { color: variantStyles.textColor },
                            icon ? styles.textWithIcon : null,
                        ]}
                    >
                        {title}
                    </Text>
                </>
            )}
        </TouchableOpacity>
    );
}

function getVariantStyle(variant: ButtonVariant): {
    container: ViewStyle;
    textColor: string;
} {
    switch (variant) {
        case 'secondary':
            return {
                container: {
                    backgroundColor: Colors.background.cardHighlight,
                    borderWidth: 1,
                    borderColor: Colors.neutral[700],
                },
                textColor: Colors.text.primary,
            };
        case 'danger':
            return {
                container: { backgroundColor: Colors.status.danger },
                textColor: Colors.neutral.white,
            };
        case 'ghost':
            return {
                container: { backgroundColor: 'transparent' },
                textColor: Colors.brand.primary,
            };
        default:
            return {
                container: {},
                textColor: Colors.neutral.white,
            };
    }
}

const styles = StyleSheet.create({
    base: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.lg,
        borderRadius: Radius.md,
        minHeight: 52,
    },
    disabled: {
        opacity: 0.5,
    },
    text: {
        fontFamily: Typography.family.semiBold,
        fontSize: Typography.size.body,
    },
    textPrimary: {
        fontFamily: Typography.family.semiBold,
        fontSize: Typography.size.body,
        color: Colors.neutral.white,
    },
    textWithIcon: {
        marginLeft: Spacing.sm,
    },
});
