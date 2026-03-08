/**
 * OnboardingScreen – First-time salary setup.
 * Rule I: UI calls dataService for persistence.
 */

import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { DollarSign } from 'lucide-react-native';
import { Button, Input, Card } from '../components/common';
import { useAuth } from '../contexts/AuthContext';
import { upsertProfile } from '../lib/dataService';
import { Colors, Spacing, Typography } from '../theme/tokens';

interface OnboardingScreenProps {
    onComplete: () => void;
}

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
    const { user } = useAuth();
    const [salary, setSalary] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    async function handleSave() {
        const salaryNumber = parseInt(salary.replace(/\D/g, ''), 10);
        if (!salaryNumber || salaryNumber <= 0) {
            Alert.alert('Error', 'Ingresa un sueldo válido.');
            return;
        }
        if (!user) return;

        setIsLoading(true);
        try {
            await upsertProfile(user.id, {
                monthly_salary: salaryNumber,
                currency: 'CLP',
            });
            onComplete();
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <LinearGradient
            colors={['#ffffff', '#f1f5f9']}
            style={styles.gradient}
        >
            <View style={styles.container}>
                <View style={styles.header}>
                    <View style={styles.iconCircle}>
                        <DollarSign color={Colors.neutral.white} size={40} />
                    </View>
                    <Text style={styles.title}>Configura tu sueldo</Text>
                    <Text style={styles.subtitle}>
                        Ingresa tu sueldo mensual para calcular{'\n'}tu presupuesto disponible.
                    </Text>
                </View>

                <Card style={styles.card}>
                    <Input
                        label="Sueldo mensual (CLP)"
                        placeholder="Ej: 1.000.000"
                        value={salary}
                        onChangeText={setSalary}
                        keyboardType="numeric"
                    />
                    <Button
                        title="Guardar y continuar"
                        onPress={handleSave}
                        isLoading={isLoading}
                    />
                </Card>
            </View>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    gradient: {
        flex: 1,
    },
    container: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: Spacing.lg,
    },
    header: {
        alignItems: 'center',
        marginBottom: Spacing.xl,
    },
    iconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: Colors.status.success,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.md,
    },
    title: {
        fontFamily: Typography.family.bold,
        fontSize: Typography.size.h1,
        color: Colors.text.primary,
        textAlign: 'center',
        marginBottom: Spacing.sm,
    },
    subtitle: {
        fontFamily: Typography.family.regular,
        fontSize: Typography.size.body,
        color: Colors.text.secondary,
        textAlign: 'center',
    },
    card: {
        marginTop: Spacing.md,
    },
});
