import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    TouchableWithoutFeedback,
} from 'react-native';
import { Pencil, Trash2, X } from 'lucide-react-native';
import { Colors, Spacing, Typography, Radius } from '../../theme/tokens';

interface ActionMenuProps {
    visible: boolean;
    onClose: () => void;
    title: string;
    onEdit?: () => void;
    onDelete?: () => void;
}

export function ActionMenu({
    visible,
    onClose,
    title,
    onEdit,
    onDelete,
}: ActionMenuProps) {
    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.backdrop}>
                    <TouchableWithoutFeedback>
                        <View style={styles.sheet}>
                            <View style={styles.header}>
                                <Text style={styles.title} numberOfLines={1}>{title}</Text>
                                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                                    <X size={20} color={Colors.text.muted} />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.options}>
                                {onEdit && (
                                    <TouchableOpacity 
                                        style={styles.option} 
                                        onPress={() => {
                                            onEdit();
                                            onClose();
                                        }}
                                    >
                                        <View style={[styles.iconContainer, { backgroundColor: Colors.brand.primary + '15' }]}>
                                            <Pencil size={18} color={Colors.brand.primary} />
                                        </View>
                                        <Text style={styles.optionText}>Editar</Text>
                                    </TouchableOpacity>
                                )}

                                {onDelete && (
                                    <TouchableOpacity 
                                        style={styles.option} 
                                        onPress={() => {
                                            onDelete();
                                            onClose();
                                        }}
                                    >
                                        <View style={[styles.iconContainer, { backgroundColor: Colors.status.danger + '15' }]}>
                                            <Trash2 size={18} color={Colors.status.danger} />
                                        </View>
                                        <Text style={[styles.optionText, { color: Colors.status.danger }]}>Eliminar</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
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
    sheet: {
        width: '100%',
        maxWidth: 340,
        backgroundColor: Colors.background.card,
        borderRadius: Radius.lg,
        padding: Spacing.md,
        ...Shadows.card,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.neutral[700],
        paddingBottom: Spacing.sm,
    },
    title: {
        fontFamily: Typography.family.bold,
        fontSize: Typography.size.body,
        color: Colors.text.primary,
        flex: 1,
        marginRight: Spacing.sm,
    },
    closeButton: {
        padding: 4,
    },
    options: {
        gap: Spacing.xs,
    },
    option: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.xs,
        borderRadius: Radius.sm,
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: Spacing.md,
    },
    optionText: {
        fontFamily: Typography.family.medium,
        fontSize: Typography.size.body,
        color: Colors.text.primary,
    },
});

import { Shadows } from '../../theme/tokens';
