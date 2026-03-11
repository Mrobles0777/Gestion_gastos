/**
 * Date helpers for monthly calculations.
 * Pure functions – no side effects (Rule I: Immutability).
 */

import type { MonthKey } from '../types';

export function getCurrentMonthKey(): MonthKey {
    const now = new Date();
    return buildMonthKey(now.getFullYear(), now.getMonth() + 1);
}

export function buildMonthKey(year: number, month: number): MonthKey {
    const monthStr = month < 10 ? `0${month}` : `${month}`;
    const key = `${year}-${monthStr}`;
    const firstDay = `${key}-01`;
    const lastDay = new Date(year, month, 0).toISOString().split('T')[0];
    return { year, month, key, firstDay, lastDay };
}

export function formatCurrency(amount: number, currency = 'CLP'): string {
    return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}

export function formatDate(dateString: string): string {
    const date = new Date(dateString + 'T12:00:00'); // Avoid timezone shifts
    return new Intl.DateTimeFormat('es-CL', {
        day: '2-digit',
        month: 'short',
    }).format(date);
}

export function todayString(): string {
    return new Date().toISOString().split('T')[0];
}
