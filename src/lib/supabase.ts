/**
 * Supabase Client Wrapper – Rule I: Agnosticismo de Dependencias.
 * All Supabase access goes through this module.
 * If we swap providers, only this file changes.
 */

import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

/**
 * SecureStore adapter for Supabase Auth session persistence on mobile.
 * Falls back to in-memory on web.
 */
const ExpoSecureStoreAdapter =
    Platform.OS !== 'web'
        ? {
            getItem: (key: string) => SecureStore.getItemAsync(key),
            setItem: (key: string, value: string) =>
                SecureStore.setItemAsync(key, value),
            removeItem: (key: string) => SecureStore.deleteItemAsync(key),
        }
        : undefined;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        storage: ExpoSecureStoreAdapter,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
});
