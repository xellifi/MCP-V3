import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { api } from '../services/api';

// Use any type to match the existing API response structure
interface SubscriptionContextType {
    currentSubscription: any | null;
    loading: boolean;
    refreshSubscription: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const SubscriptionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [currentSubscription, setCurrentSubscription] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);

    const refreshSubscription = useCallback(async () => {
        try {
            const sub = await api.subscriptions.getCurrentSubscription();
            setCurrentSubscription(sub);
        } catch (error) {
            console.error('Failed to load subscription:', error);
            setCurrentSubscription(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refreshSubscription();
    }, [refreshSubscription]);

    return (
        <SubscriptionContext.Provider value={{ currentSubscription, loading, refreshSubscription }}>
            {children}
        </SubscriptionContext.Provider>
    );
};

export const useSubscription = (): SubscriptionContextType => {
    const context = useContext(SubscriptionContext);
    if (context === undefined) {
        throw new Error('useSubscription must be used within a SubscriptionProvider');
    }
    return context;
};
