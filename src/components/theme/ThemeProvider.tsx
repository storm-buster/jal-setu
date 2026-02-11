import React, { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'floodshield.theme';

type ThemeContextValue = {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getSystemTheme(): Theme {
    if (typeof window === 'undefined') return 'light';
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getInitialTheme(): Theme {
    if (typeof window === 'undefined') return 'light';

    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') return saved;

    return getSystemTheme();
}

function applyTheme(theme: Theme) {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setThemeState] = useState<Theme>(() => getInitialTheme());

    const setTheme = (next: Theme) => {
        setThemeState(next);
        window.localStorage.setItem(STORAGE_KEY, next);
    };

    const toggleTheme = () => {
        setTheme(theme === 'dark' ? 'light' : 'dark');
    };

    // Keep the html class in sync with state.
    useEffect(() => {
        applyTheme(theme);
    }, [theme]);

    return (
        <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
    return ctx;
}
