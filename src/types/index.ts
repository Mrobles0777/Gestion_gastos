/**
 * Domain types – Reflects the Supabase data model.
 * Rule I: Separación Estricta de Responsabilidades.
 */

export interface Profile {
    id: string;
    email: string;
    full_name: string;
    monthly_salary: number;
    currency: string;
    alert_threshold: number;
    alert_email: string | null;
    alert_sent_month: string | null; // 'YYYY-MM' format
    created_at: string;
}

export interface FixedExpense {
    id: string;
    user_id: string;
    category: FixedExpenseCategory;
    label: string | null;
    amount: number;
    month: string; // 'YYYY-MM-DD' first day of month
    due_day?: number;
    is_paid?: boolean;
    created_at: string;
}

export interface DailyExpense {
    id: string;
    user_id: string;
    description: string;
    amount: number;
    category: string | null;
    date: string; // 'YYYY-MM-DD'
    created_at: string;
}

export type FixedExpenseCategory =
    | 'arriendo'
    | 'luz'
    | 'agua'
    | 'internet'
    | 'otros';

export const FIXED_EXPENSE_CATEGORIES: {
    value: FixedExpenseCategory;
    label: string;
    icon: string;
    colorKey: string;
}[] = [
        { value: 'arriendo', label: 'Arriendo', icon: 'Home', colorKey: 'housing' },
        { value: 'luz', label: 'Luz', icon: 'Zap', colorKey: 'food' }, // Luz is energy, using food color (orange) as requested for "patrones"
        { value: 'agua', label: 'Agua', icon: 'Droplets', colorKey: 'utilities' },
        { value: 'internet', label: 'Internet', icon: 'Wifi', colorKey: 'transport' },
        { value: 'otros', label: 'Otros', icon: 'MoreHorizontal', colorKey: 'other' },
    ];

export type DailyExpenseCategory =
    | 'comida'
    | 'transporte'
    | 'compras'
    | 'salud'
    | 'entretenimiento'
    | 'otros';

export const DAILY_EXPENSE_CATEGORIES: {
    value: DailyExpenseCategory;
    label: string;
    icon: string;
    colorKey: string;
}[] = [
        { value: 'comida', label: 'Comida', icon: 'Pizza', colorKey: 'food' },
        { value: 'transporte', label: 'Transporte', icon: 'Car', colorKey: 'transport' },
        { value: 'compras', label: 'Compras', icon: 'ShoppingBag', colorKey: 'shopping' },
        { value: 'salud', label: 'Salud', icon: 'Heart', colorKey: 'health' },
        { value: 'entretenimiento', label: 'Entretenimiento', icon: 'Gamepad2', colorKey: 'entertainment' },
        { value: 'otros', label: 'Otros', icon: 'MoreHorizontal', colorKey: 'other' },
    ];

export interface DashboardData {
    salary: number;
    totalFixed: number;
    totalDaily: number;
    totalSpent: number;
    available: number;
    percentConsumed: number;
    alertThreshold: number;
    pendingPayments?: number;
}

export interface MonthKey {
    year: number;
    month: number; // 1-12
    key: string; // 'YYYY-MM'
    firstDay: string; // 'YYYY-MM-01'
    lastDay: string; // 'YYYY-MM-DD' last day
}
