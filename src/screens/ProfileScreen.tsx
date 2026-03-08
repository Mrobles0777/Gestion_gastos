/**
 * ProfileScreen – User settings and alert configuration.
 * Rule III: Design System tokens used for visual excellence.
 */

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Alert,
    TouchableOpacity,
} from 'react-native';
import { User, Bell, Calendar, LogOut, Save } from 'lucide-react-native';
import { useAuth } from '../contexts/AuthContext';
import { getProfile, upsertProfile } from '../lib/dataService';
import { Colors, Spacing, Radius, Typography, Shadows } from '../theme/tokens';
import { Button, Input, Card } from '../components/common';
import { Profile } from '../types';

export function ProfileScreen() {
    const { user, signOut } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [profile, setProfile] = useState<Profile | null>(null);

    // Form states
    const [fullName, setFullName] = useState('');
    const [salary, setSalary] = useState('');
    const [threshold, setThreshold] = useState('75');
    const [alertEmail, setAlertEmail] = useState('');

    useEffect(() => {
        loadProfile();
    }, []);

    async function loadProfile() {
        if (!user) return;
        try {
            const data = await getProfile(user.id);
            if (data) {
                setProfile(data);
                setFullName(data.full_name || '');
                setSalary(data.monthly_salary.toString());
                setThreshold((data.alert_threshold || 75).toString());
                setAlertEmail(data.alert_email || data.email || '');
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    async function handleSave() {
        if (!user) return;
        setSaving(true);
        try {
            await upsertProfile(user.id, {
                full_name: fullName,
                monthly_salary: parseFloat(salary) || 0,
                alert_threshold: parseFloat(threshold) || 75,
                alert_email: alertEmail,
            });
            Alert.alert('Éxito', 'Perfil actualizado correctamente');
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <Text>Cargando perfil...</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <View style={styles.header}>
                <View style={styles.avatarCircle}>
                    <User color={Colors.brand.primary} size={40} />
                </View>
                <Text style={styles.title}>{fullName || 'Usuario'}</Text>
                <Text style={styles.email}>{user?.email}</Text>
            </View>

            <Card style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Calendar color={Colors.brand.primary} size={20} />
                    <Text style={styles.sectionTitle}>Ajustes Mensuales</Text>
                </View>

                <Input
                    label="Nombre Completo"
                    value={fullName}
                    onChangeText={setFullName}
                    placeholder="Tu nombre"
                />

                <Input
                    label="Sueldo Mensual"
                    value={salary}
                    onChangeText={setSalary}
                    keyboardType="numeric"
                    placeholder="Ej: 1000000"
                />
            </Card>

            <Card style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Bell color={Colors.brand.secondary} size={20} />
                    <Text style={styles.sectionTitle}>Configuración de Alerta</Text>
                </View>

                <Input
                    label="Umbral de Alerta (%)"
                    value={threshold}
                    onChangeText={setThreshold}
                    keyboardType="numeric"
                    placeholder="Ej: 75"
                />

                <Input
                    label="Correo de Notificación"
                    value={alertEmail}
                    onChangeText={setAlertEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    placeholder="Donde llegará el aviso"
                />

                <Text style={styles.helperText}>
                    Te enviaremos un correo cuando tus gastos superen el {threshold}% de tu sueldo.
                </Text>
            </Card>

            <Button
                title="Guardar Cambios"
                onPress={handleSave}
                isLoading={saving}
                icon={<Save color={Colors.text.inverse} size={20} />}
                style={styles.saveButton}
            />

            <TouchableOpacity style={styles.logoutButton} onPress={signOut}>
                <LogOut color={Colors.status.danger} size={20} />
                <Text style={styles.logoutText}>Cerrar Sesión</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background.main,
    },
    content: {
        padding: Spacing.lg,
        paddingTop: 60,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.background.main,
    },
    header: {
        alignItems: 'center',
        marginBottom: Spacing.xl,
    },
    avatarCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: Colors.brand.primary + '20',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    title: {
        fontFamily: Typography.family.bold,
        fontSize: Typography.size.h2,
        color: Colors.text.primary,
    },
    email: {
        fontFamily: Typography.family.regular,
        fontSize: Typography.size.body,
        color: Colors.text.secondary,
        marginTop: 4,
    },
    section: {
        marginBottom: Spacing.lg,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    sectionTitle: {
        fontFamily: Typography.family.bold,
        fontSize: Typography.size.body,
        color: Colors.text.primary,
        marginLeft: Spacing.sm,
    },
    helperText: {
        fontFamily: Typography.family.regular,
        fontSize: Typography.size.tiny,
        color: Colors.text.secondary,
        marginTop: -Spacing.xs,
        fontStyle: 'italic',
    },
    saveButton: {
        marginTop: Spacing.md,
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: Spacing.xl,
        paddingBottom: Spacing.xl,
    },
    logoutText: {
        fontFamily: Typography.family.medium,
        fontSize: Typography.size.body,
        color: Colors.status.danger,
        marginLeft: Spacing.sm,
    },
});
