import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Theme = 'dark' | 'light';

interface ThemeContextType {
    theme: Theme;
    toggleTheme: () => void;
    isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // Initial state from localStorage or system, fallback to 'dark' temporarily
    const [theme, setTheme] = useState<Theme>(() => {
        const stored = localStorage.getItem('theme');
        if (stored === 'dark' || stored === 'light') {
            return stored as Theme;
        }
        return 'dark'; // Default to dark while we check global settings
    });

    useEffect(() => {
        const initTheme = async () => {
            // Check localStorage first
            const stored = localStorage.getItem('theme');
            if (stored === 'dark' || stored === 'light') {
                setTheme(stored as Theme);
                return;
            }

            // If no local preference, fetch global default
            try {
                // Dynamically import API to avoid circular dependencies if any
                const { api } = await import('../services/api');
                const globalDefault = await api.public.getSystemTheme();

                // Only if still no local override (race condition check)
                if (!localStorage.getItem('theme')) {
                    setTheme(globalDefault);
                }
            } catch (e) {
                console.error("Failed to fetch global theme:", e);
                // Fallback to system preference
                if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
                    setTheme('light');
                }
            }
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
        <ThemeContext.Provider value={{ theme, toggleTheme, isDark: theme === 'dark' }}>
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
