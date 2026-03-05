/**
 * Data Services – API layer for Supabase queries.
 * Rule I: Logic layer is "blind" – doesn't know about UI.
 * Rule I: Agnosticismo de Dependencias – wraps all Supabase calls.
 */

import { supabase } from './supabase';
import { getCurrentMonthKey } from './dateHelpers';
import type {
    Profile,
    FixedExpense,
    DailyExpense,
    DashboardData,
} from '../types';

// ────────────────────────── Profile ──────────────────────────

export async function getProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

    if (error && error.code !== 'PGRST116') {
        throw new Error(`getProfile: ${error.message}`);
    }
    return data;
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
): Promise<FixedExpense[]> {
    const { data, error } = await supabase
        .from('fixed_expenses')
        .select('*')
        .eq('user_id', userId)
        .eq('month', monthFirstDay)
        .order('created_at', { ascending: false });

    if (error) throw new Error(`getFixedExpenses: ${error.message}`);
    return data ?? [];
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
    updates: Partial<Pick<FixedExpense, 'category' | 'label' | 'amount'>>,
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

// ────────────────────── Daily Expenses ───────────────────────

export async function getDailyExpenses(
    userId: string,
    startDate: string,
    endDate: string,
): Promise<DailyExpense[]> {
    const { data, error } = await supabase
        .from('daily_expenses')
        .select('*')
        .eq('user_id', userId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });

    if (error) throw new Error(`getDailyExpenses: ${error.message}`);
    return data ?? [];
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

export async function getDashboardData(userId: string): Promise<DashboardData> {
    const month = getCurrentMonthKey();

    const [profile, fixedExpenses, dailyExpenses] = await Promise.all([
        getProfile(userId),
        getFixedExpenses(userId, month.firstDay),
        getDailyExpenses(userId, month.firstDay, month.lastDay),
    ]);

    const salary = profile?.monthly_salary ?? 0;
    const totalFixed = fixedExpenses.reduce((sum, e) => sum + e.amount, 0);
    const totalDaily = dailyExpenses.reduce((sum, e) => sum + e.amount, 0);
    const totalSpent = totalFixed + totalDaily;
    const available = salary - totalSpent;
    const percentConsumed = salary > 0 ? (totalSpent / salary) * 100 : 0;

    return { salary, totalFixed, totalDaily, totalSpent, available, percentConsumed };
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

    // Check if alert was already sent this month
    if (profile?.alert_sent_month === month.key) return false;

    // Invoke Edge Function
    const targetEmail = profile?.alert_email || email;
    const { error } = await supabase.functions.invoke('budget-alert', {
        body: {
            user_id: userId,
            email: targetEmail,
            salary: dashboard.salary,
            totalSpent: dashboard.totalSpent,
            pct: Math.round(dashboard.percentConsumed),
            monthKey: month.key,
        },
    });

    if (error) {
        console.error('Budget alert edge function error:', error);
        return false;
    }

    // Mark alert as sent
    await supabase
        .from('profiles')
        .update({ alert_sent_month: month.key })
        .eq('id', userId);

    return true;
}
