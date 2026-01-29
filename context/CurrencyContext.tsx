import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

interface CurrencyContextType {
    selectedCurrency: string;
    setCurrency: (currency: string) => void;
    availableCurrencies: string[];
    isLoading: boolean;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [selectedCurrency, setSelectedCurrency] = useState<string>(() => {
        return localStorage.getItem('selectedCurrency') || 'USD';
    });
    const [availableCurrencies, setAvailableCurrencies] = useState<string[]>(['USD', 'PHP', 'EUR', 'GBP']);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadCurrencySettings = async () => {
            try {
                const settings = await api.admin.getSettings();
                if (settings.availableCurrencies && settings.availableCurrencies.length > 0) {
                    setAvailableCurrencies(settings.availableCurrencies);
                }

                // If no currency is stored in localStorage, use the default from settings
                const storedCurrency = localStorage.getItem('selectedCurrency');
                if (!storedCurrency && settings.defaultCurrency) {
                    setSelectedCurrency(settings.defaultCurrency);
                }
            } catch (error) {
                console.error('Failed to load currency settings:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadCurrencySettings();
    }, []);

    const setCurrency = (currency: string) => {
        setSelectedCurrency(currency);
        localStorage.setItem('selectedCurrency', currency);
    };

    return (
        <CurrencyContext.Provider value={{ selectedCurrency, setCurrency, availableCurrencies, isLoading }}>
            {children}
        </CurrencyContext.Provider>
    );
};

export const useCurrency = () => {
    const context = useContext(CurrencyContext);
    if (context === undefined) {
        throw new Error('useCurrency must be used within a CurrencyProvider');
    }
    return context;
};
