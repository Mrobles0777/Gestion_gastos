/**
 * Design Tokens – Single source of truth for visual styles.
 * Rule III: No magic numbers or hard-coded colors.
 */

export const Colors = {
    brand: {
        primary: '#6366f1',
        primaryLight: '#818cf8',
        secondary: '#a855f7',
        accent: '#06b6d4',
    },
    status: {
        success: '#10b981',
        warning: '#f59e0b',
        danger: '#ef4444',
        info: '#3b82f6',
    },
    categories: {
        food: '#f59e0b',    // Orange
        transport: '#3b82f6', // Blue
        shopping: '#a855f7',  // Violet
        housing: '#6366f1',   // Indigo
        utilities: '#06b6d4', // Cyan
        health: '#10b981',    // Emerald
        entertainment: '#ec4899', // Pink
        other: '#64748b',     // Slate
    },
    neutral: {
        900: '#f8fafc', // Light background
        800: '#f1f5f9',
        700: '#e2e8f0', // Border color
        600: '#94a3b8',
        500: '#64748b',
        400: '#475569',
        300: '#334155',
        100: '#0f172a', // Dark text
        white: '#ffffff',
    },
    background: {
        main: '#f8fafc',
        card: '#ffffff',
        cardHighlight: '#f1f5f9',
        input: '#ffffff',
        overlay: 'rgba(0,0,0,0.4)',
    },
    text: {
        primary: '#0f172a',
        secondary: '#475569',
        muted: '#94a3b8',
        inverse: '#ffffff',
    },
    gradient: {
        primary: ['#6366f1', '#a855f7'] as const,
        danger: ['#ef4444', '#dc2626'] as const,
        success: ['#10b981', '#059669'] as const,
        surface: ['#ffffff', '#f1f5f9'] as const,
    },
} as const;

export const Spacing = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
} as const;

export const Radius = {
    sm: 6,
    md: 12,
    lg: 16,
    xl: 24,
    full: 9999,
} as const;

export const Typography = {
    family: {
        regular: 'Outfit_400Regular',
        medium: 'Outfit_500Medium',
        semiBold: 'Outfit_600SemiBold',
        bold: 'Outfit_700Bold',
    },
    size: {
        h1: 32,
        h2: 24,
        h3: 20,
        body: 16,
        small: 14,
        tiny: 12,
    },
} as const;

export const Shadows = {
    card: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    button: {
        shadowColor: '#6366f1',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
} as const;
