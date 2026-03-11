/// <reference types="expo-secure-store" />
/**
 * Data Services – API layer for Supabase queries.
 * Rule I: Logic layer is "blind" – doesn't know about UI.
 * Rule I: Agnosticismo de Dependencias – wraps all Supabase calls.
 * Last update: 2026-03-08
 */

import { supabase } from './supabase';
import { getCurrentMonthKey } from './dateHelpers';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type {
    Profile,
    FixedExpense,
    DailyExpense,
    DashboardData,
} from '../types';

const isWeb = Platform.OS === 'web';

const storage = {
    getItem: async (key: string) => {
        if (isWeb) {
            return (typeof window !== 'undefined' && window.localStorage) ? window.localStorage.getItem(key) : null;
        }
        return SecureStore.getItemAsync(key);
    },
    setItem: async (key: string, value: string) => {
        if (isWeb) {
            if (typeof window !== 'undefined' && window.localStorage) {
                window.localStorage.setItem(key, value);
            }
            return;
        }
        return SecureStore.setItemAsync(key, value);
    },
    deleteItem: async (key: string) => {
        if (isWeb) {
            if (typeof window !== 'undefined' && window.localStorage) {
                window.localStorage.removeItem(key);
            }
            return;
        }
        return SecureStore.deleteItemAsync(key);
    },
};

const CACHE_KEYS = {
    PROFILE: (userId: string) => `cache_profile_${userId}`,
    DASHBOARD: (userId: string) => `cache_dashboard_${userId}`,
    FIXED_EXPENSES: (userId: string, month: string) => `cache_fixed_${userId}_${month}`,
    DAILY_EXPENSES: (userId: string, start: string, end: string) => `cache_daily_${userId}_${start}_${end}`,
};

const DEFAULT_TIMEOUT = 8000; // 8 seconds

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number = DEFAULT_TIMEOUT): Promise<T> {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) =>
            setTimeout(() => reject(new Error('TIMEOUT')), timeoutMs)
        ),
    ]);
}

// ────────────────────────── Profile ──────────────────────────

export async function getProfile(userId: string, useCacheFirst = false): Promise<Profile | null> {
    const cacheKey = CACHE_KEYS.PROFILE(userId);

    if (useCacheFirst) {
        try {
            const cached = await storage.getItem(cacheKey);
            if (cached) return JSON.parse(cached);
        } catch (e) {
            console.warn('Failed to read profile from cache', e);
        }
    }

    try {
        const { data, error } = (await withTimeout(
            supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single()
        )) as { data: Profile | null, error: any };

        if (error && error.code !== 'PGRST116') {
            throw new Error(`getProfile: ${error.message}`);
        }

        if (data) {
            await storage.setItem(cacheKey, JSON.stringify(data));
        }
        return data;
    } catch (err: any) {
        if (err.message === 'TIMEOUT' && !isWeb) {
            const cached = await SecureStore.getItemAsync(cacheKey).catch(() => null);
            if (cached) return JSON.parse(cached);
        }
        throw err;
    }
}

export async function upsertProfile(
    userId: string,
    updates: Partial<Pick<Profile, 'full_name' | 'monthly_salary' | 'currency' | 'alert_threshold' | 'alert_email'>>,
): Promise<Profile> {
    const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

    if (error) throw new Error(`upsertProfile: ${error.message}`);
    return data;
}


// ────────────────────── Fixed Expenses ───────────────────────

export async function getFixedExpenses(
    userId: string,
    monthFirstDay: string,
    useCacheFirst = false
): Promise<FixedExpense[]> {
    const cacheKey = CACHE_KEYS.FIXED_EXPENSES(userId, monthFirstDay);

    if (useCacheFirst) {
        try {
            const cached = await storage.getItem(cacheKey);
            if (cached) return JSON.parse(cached);
        } catch (e) {
            console.warn('Failed to read fixed expenses from cache', e);
        }
    }

    try {
        const { data, error } = (await withTimeout(
            supabase
                .from('fixed_expenses')
                .select('*')
                .eq('user_id', userId)
                .eq('month', monthFirstDay)
                .order('created_at', { ascending: false })
        )) as { data: FixedExpense[] | null, error: any };

        if (error) throw new Error(`getFixedExpenses: ${error.message}`);
        
        const result = data ?? [];
        await storage.setItem(cacheKey, JSON.stringify(result));
        return result;
    } catch (err: any) {
        if (err.message === 'TIMEOUT') {
            const cached = await storage.getItem(cacheKey).catch(() => null);
            if (cached) return JSON.parse(cached);
        }
        throw err;
    }
}

export async function addFixedExpense(
    expense: Omit<FixedExpense, 'id' | 'created_at'>,
): Promise<FixedExpense> {
    const { data, error } = await supabase
        .from('fixed_expenses')
        .insert(expense)
        .select()
        .single();

    if (error) throw new Error(`addFixedExpense: ${error.message}`);
    return data;
}

export async function updateFixedExpense(
    id: string,
    updates: Partial<Pick<FixedExpense, 'category' | 'label' | 'amount' | 'due_day' | 'is_paid'>>,
): Promise<FixedExpense> {
    const { data, error } = await supabase
        .from('fixed_expenses')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) throw new Error(`updateFixedExpense: ${error.message}`);
    return data;
}

export async function deleteFixedExpense(id: string): Promise<void> {
    const { error } = await supabase.from('fixed_expenses').delete().eq('id', id);
    if (error) throw new Error(`deleteFixedExpense: ${error.message}`);
}

export async function toggleFixedExpensePaid(id: string, isPaid: boolean): Promise<void> {
    const { error } = await supabase
        .from('fixed_expenses')
        .update({ is_paid: isPaid })
        .eq('id', id);
    if (error) throw new Error(`toggleFixedExpensePaid: ${error.message}`);
}

// ────────────────────── Daily Expenses ───────────────────────

export async function getDailyExpenses(
    userId: string,
    startDate: string,
    endDate: string,
    useCacheFirst = false
): Promise<DailyExpense[]> {
    const cacheKey = CACHE_KEYS.DAILY_EXPENSES(userId, startDate, endDate);

    if (useCacheFirst) {
        try {
            const cached = await storage.getItem(cacheKey);
            if (cached) return JSON.parse(cached);
        } catch (e) {
            console.warn('Failed to read daily expenses from cache', e);
        }
    }

    try {
        const { data, error } = (await withTimeout(
            supabase
                .from('daily_expenses')
                .select('*')
                .eq('user_id', userId)
                .gte('date', startDate)
                .lte('date', endDate)
                .order('date', { ascending: false })
        )) as { data: DailyExpense[] | null, error: any };

        if (error) throw new Error(`getDailyExpenses: ${error.message}`);
        
        const result = data ?? [];
        if (!isWeb) {
            await SecureStore.setItemAsync(cacheKey, JSON.stringify(result));
        }
        return result;
    } catch (err: any) {
        if (err.message === 'TIMEOUT' && !isWeb) {
            const cached = await SecureStore.getItemAsync(cacheKey).catch(() => null);
            if (cached) return JSON.parse(cached);
        }
        throw err;
    }
}

export async function addDailyExpense(
    expense: Omit<DailyExpense, 'id' | 'created_at'>,
): Promise<DailyExpense> {
    const { data, error } = await supabase
        .from('daily_expenses')
        .insert(expense)
        .select()
        .single();

    if (error) throw new Error(`addDailyExpense: ${error.message}`);
    return data;
}

export async function updateDailyExpense(
    id: string,
    updates: Partial<Pick<DailyExpense, 'description' | 'amount' | 'category' | 'date'>>,
): Promise<DailyExpense> {
    const { data, error } = await supabase
        .from('daily_expenses')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) throw new Error(`updateDailyExpense: ${error.message}`);
    return data;
}

export async function deleteDailyExpense(id: string): Promise<void> {
    const { error } = await supabase.from('daily_expenses').delete().eq('id', id);
    if (error) throw new Error(`deleteDailyExpense: ${error.message}`);
}

// ────────────────────── Dashboard ────────────────────────────

export async function getDashboardData(userId: string, useCacheFirst = false): Promise<DashboardData> {
    const cacheKey = CACHE_KEYS.DASHBOARD(userId);
    const month = getCurrentMonthKey();

    if (useCacheFirst) {
        try {
            const cached = await storage.getItem(cacheKey);
            if (cached) return JSON.parse(cached);
        } catch (e) {
            console.warn('Failed to read dashboard from cache', e);
        }
    }

    try {
        const [profile, fixedExpenses, dailyExpenses] = await withTimeout(
            Promise.all([
                getProfile(userId),
                getFixedExpenses(userId, month.firstDay),
                getDailyExpenses(userId, month.firstDay, month.lastDay),
            ])
        );

        const salary = profile?.monthly_salary ?? 0;
        const alertThreshold = profile?.alert_threshold ?? 75;
        const totalFixed = (fixedExpenses as FixedExpense[]).reduce((sum: number, e: FixedExpense) => sum + e.amount, 0);
        const totalDaily = (dailyExpenses as DailyExpense[]).reduce((sum: number, e: DailyExpense) => sum + e.amount, 0);
        const totalSpent = totalFixed + totalDaily;
        const available = salary - totalSpent;
        const percentConsumed = salary > 0 ? (totalSpent / salary) * 100 : 0;
        const pendingPayments = (fixedExpenses as FixedExpense[]).filter((e: FixedExpense) => !e.is_paid).length;

        const result = { 
            salary, 
            totalFixed, 
            totalDaily, 
            totalSpent, 
            available, 
            percentConsumed, 
            alertThreshold,
            pendingPayments
        };
        if (!isWeb) {
            await SecureStore.setItemAsync(cacheKey, JSON.stringify(result));
        }
        return result;
    } catch (err: any) {
        if (err.message === 'TIMEOUT' && !isWeb) {
            const cached = await SecureStore.getItemAsync(cacheKey).catch(() => null);
            if (cached) return JSON.parse(cached);
        }
        throw err;
    }
}

// ────────────────────── Budget Alert ─────────────────────────

export async function checkAndTriggerBudgetAlert(
    userId: string,
    email: string,
): Promise<boolean> {
    const month = getCurrentMonthKey();
    const dashboard = await getDashboardData(userId);

    if (dashboard.salary === 0) return false;

    const profile = await getProfile(userId);
    const threshold = profile?.alert_threshold ?? 75;
    if (dashboard.percentConsumed < threshold) return false;

    // Invoke Edge Function
    const targetEmail = profile?.alert_email || email;
    const payload = {
        user_id: userId,
        email: targetEmail,
        salary: dashboard.salary,
        totalSpent: dashboard.totalSpent,
        totalFixed: dashboard.totalFixed,
        totalDaily: dashboard.totalDaily,
        pct: Math.round(dashboard.percentConsumed),
        monthKey: month.key,
    };

    console.log('--- Triggering Budget Alert ---');
    console.log('Payload:', payload);

    const { data, error } = await supabase.functions.invoke('budget-alert', {
        body: payload,
    });

    if (error) {
        console.error('Budget alert edge function error:', error);
        return false;
    }

    console.log('Budget alert function response:', data);
    return true;
}

export async function triggerPaymentReminder(): Promise<{ success: boolean; message?: string }> {
    console.log('--- Triggering Payment Reminder Simulation ---');
    const { data, error } = await supabase.functions.invoke('payment-reminder');

    if (error) {
        console.error('Payment reminder edge function error:', error);
        throw new Error(error.message);
    }

    console.log('Payment reminder function response:', data);
    return { success: true, message: data.message };
}

export async function clearUserCache(userId: string): Promise<void> {
    const month = getCurrentMonthKey();
    const keys = [
        CACHE_KEYS.PROFILE(userId),
        CACHE_KEYS.DASHBOARD(userId),
        CACHE_KEYS.FIXED_EXPENSES(userId, month.firstDay),
        CACHE_KEYS.DAILY_EXPENSES(userId, month.firstDay, month.lastDay),
    ];

    for (const key of keys) {
        try {
            await storage.deleteItem(key);
        } catch (e) {
            console.warn(`Failed to delete cache key: ${key}`, e);
        }
    }
}
