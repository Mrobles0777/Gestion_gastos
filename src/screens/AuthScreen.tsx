/**
 * AuthScreen – Login/Register with Email and Google OAuth.
 * Rule I: UI is "dumb" – delegates auth logic to AuthContext.
 */

import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { Wallet, Mail, Lock, Chrome } from 'lucide-react-native';
import { Button, Input } from '../components/common';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Colors, Spacing, Typography, Radius } from '../theme/tokens';

WebBrowser.maybeCompleteAuthSession();

type AuthMode = 'login' | 'register';

export function AuthScreen() {
    const { signInWithEmail, signUpWithEmail } = useAuth();

    const [mode, setMode] = useState<AuthMode>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);

    async function handleEmailAuth() {
        if (!email.trim() || !password.trim()) {
            Alert.alert('Error', 'Completa todos los campos.');
            return;
        }

        setIsLoading(true);
        const action = mode === 'login' ? signInWithEmail : signUpWithEmail;
        const { error } = await action(email.trim(), password);
        setIsLoading(false);

        if (error) {
            Alert.alert('Error', error.message);
            return;
        }

        if (mode === 'register') {
            Alert.alert('Registro exitoso', 'Revisa tu correo para confirmar tu cuenta.');
        }
    }

    async function handleGoogleAuth() {
        setIsGoogleLoading(true);
        try {
            const redirectTo = makeRedirectUri({ scheme: 'gestion-de-gastos' });
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo,
                    skipBrowserRedirect: true,
                },
            });

            if (error) throw error;
            if (data.url) {
                const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
                if (result.type === 'success' && result.url) {
                    const url = new URL(result.url);
                    const params = new URLSearchParams(url.hash.substring(1));
                    const accessToken = params.get('access_token');
                    const refreshToken = params.get('refresh_token');

                    if (accessToken && refreshToken) {
                        await supabase.auth.setSession({
                            access_token: accessToken,
                            refresh_token: refreshToken,
                        });
                    }
                }
            }
        } catch (error: any) {
            Alert.alert('Error', error?.message ?? 'No se pudo iniciar sesión con Google.');
        } finally {
            setIsGoogleLoading(false);
        }
    }

    const isLogin = mode === 'login';

    return (
        <LinearGradient
            colors={['#ffffff', '#f1f5f9']}
            style={styles.gradient}
        >
            <KeyboardAvoidingView
                style={styles.flex}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.iconCircle}>
                            <Wallet color={Colors.neutral.white} size={40} />
                        </View>
                        <Text style={styles.title}>Gestión de Gastos</Text>
                        <Text style={styles.subtitle}>
                            Controla tu sueldo y gastos diarios
                        </Text>
                    </View>

                    {/* Form */}
                    <View style={styles.form}>
                        <Input
                            label="Correo electrónico"
                            placeholder="tu@correo.com"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                        <Input
                            label="Contraseña"
                            placeholder="••••••••"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                        />

                        <Button
                            title={isLogin ? 'Iniciar sesión' : 'Crear cuenta'}
                            onPress={handleEmailAuth}
                            isLoading={isLoading}
                            icon={<Mail color={Colors.neutral.white} size={20} />}
                        />

                        {/* Divider */}
                        <View style={styles.dividerRow}>
                            <View style={styles.dividerLine} />
                            <Text style={styles.dividerText}>o</Text>
                            <View style={styles.dividerLine} />
                        </View>

                        <Button
                            title="Continuar con Google"
                            onPress={handleGoogleAuth}
                            variant="secondary"
                            isLoading={isGoogleLoading}
                            icon={<Chrome color={Colors.brand.primary} size={20} />}
                        />

                        {/* Toggle mode */}
                        <View style={styles.toggleRow}>
                            <Text style={styles.toggleText}>
                                {isLogin ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}
                            </Text>
                            <Button
                                title={isLogin ? 'Crear cuenta' : 'Iniciar sesión'}
                                onPress={() => setMode(isLogin ? 'register' : 'login')}
                                variant="ghost"
                            />
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    gradient: {
        flex: 1,
    },
    flex: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.xxl,
    },
    header: {
        alignItems: 'center',
        marginBottom: Spacing.xl,
    },
    iconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: Colors.brand.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.md,
    },
    title: {
        fontFamily: Typography.family.bold,
        fontSize: Typography.size.h1,
        color: Colors.text.primary,
        marginBottom: Spacing.xs,
    },
    subtitle: {
        fontFamily: Typography.family.regular,
        fontSize: Typography.size.body,
        color: Colors.text.secondary,
    },
    form: {
        gap: Spacing.sm,
    },
    dividerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: Spacing.md,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: Colors.neutral[700],
    },
    dividerText: {
        fontFamily: Typography.family.regular,
        fontSize: Typography.size.small,
        color: Colors.text.muted,
        marginHorizontal: Spacing.md,
    },
    toggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: Spacing.md,
    },
    toggleText: {
        fontFamily: Typography.family.regular,
        fontSize: Typography.size.small,
        color: Colors.text.secondary,
    },
});
