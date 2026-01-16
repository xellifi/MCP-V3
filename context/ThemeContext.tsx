import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Theme = 'dark' | 'light';

interface ThemeContextType {
    theme: Theme;
    toggleTheme: () => void;
    isDark: boolean;
    isReady: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Get stored theme synchronously to prevent flash
const getStoredTheme = (): Theme | null => {
    if (typeof window === 'undefined') return null;
    const stored = localStorage.getItem('theme');
    if (stored === 'dark' || stored === 'light') {
        return stored as Theme;
    }
    // Check system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
        return 'light';
    }
    return null;
};

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // Initial state from localStorage or system preference (synchronous check)
    const [theme, setTheme] = useState<Theme>(() => {
        const stored = getStoredTheme();
        return stored || 'light'; // Default to light if nothing stored
    });
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        const initTheme = async () => {
            // Check localStorage first (already done in initial state)
            const stored = localStorage.getItem('theme');
            if (stored === 'dark' || stored === 'light') {
                setTheme(stored as Theme);
                setIsReady(true);
                return;
            }

            // If no local preference, fetch global default
            try {
                const { api } = await import('../services/api');
                const globalDefault = await api.public.getSystemTheme();

                // Only if still no local override
                if (!localStorage.getItem('theme')) {
                    setTheme(globalDefault);
                }
            } catch (e) {
                console.error("Failed to fetch global theme:", e);
                // Keep current theme (already set from system preference)
            }

            setIsReady(true);
        };

        initTheme();
    }, []);

    useEffect(() => {
        // Apply theme class to document root immediately
        const root = document.documentElement;

        if (theme === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }

        // Add transition class after initial render to prevent flash
        if (!root.classList.contains('theme-transition')) {
            setTimeout(() => {
                root.classList.add('theme-transition');
            }, 100);
        }
    }, [theme]);

    const toggleTheme = () => {
        const newTheme = theme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
        localStorage.setItem('theme', newTheme);
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme, isDark: theme === 'dark', isReady }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = (): ThemeContextType => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
