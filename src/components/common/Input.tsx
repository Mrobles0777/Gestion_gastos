/**
 * Reusable Input component.
 * Rule III: Handles Empty, Error, and Data Overflow.
 */

import React from 'react';
import {
    View,
    TextInput,
    Text,
    StyleSheet,
    TextInputProps,
    ViewStyle,
} from 'react-native';
import { Colors, Spacing, Radius, Typography } from '../../theme/tokens';

interface InputProps extends TextInputProps {
    label?: string;
    error?: string;
    containerStyle?: ViewStyle;
}

export function Input(props: any) {
    const {
        label,
        error,
        containerStyle,
        ...textInputProps
    } = props;
    
    return (
        <View style={[styles.container, containerStyle]}>
            {label && <Text style={styles.label}>{label}</Text>}
            <TextInput
                placeholderTextColor={Colors.text.muted}
                style={[
                    styles.input,
                    error ? styles.inputError : null,
                    textInputProps.multiline ? styles.multiline : null,
                ]}
                {...textInputProps}
            />
            {error && <Text style={styles.error}>{error}</Text>}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: Spacing.md,
    },
    label: {
        fontFamily: Typography.family.medium,
        fontSize: Typography.size.small,
        color: Colors.text.secondary,
        marginBottom: Spacing.xs,
    },
    input: {
        backgroundColor: Colors.background.input,
        borderWidth: 1,
        borderColor: Colors.neutral[700],
        borderRadius: Radius.md,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.md,
        fontFamily: Typography.family.regular,
        fontSize: Typography.size.body,
        color: Colors.text.primary,
        minHeight: 52,
    },
    inputError: {
        borderColor: Colors.status.danger,
    },
    multiline: {
        minHeight: 100,
        textAlignVertical: 'top',
    },
    error: {
        fontFamily: Typography.family.regular,
        fontSize: Typography.size.tiny,
        color: Colors.status.danger,
        marginTop: Spacing.xs,
    },
});
