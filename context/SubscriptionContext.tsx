import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { api, ensureSession } from '../services/api';

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
            // Ensure session is ready before making API call
            const sessionReady = await ensureSession();
            if (!sessionReady) {
                console.log('[Subscription] No session, skipping fetch');
                setCurrentSubscription(null);
                setLoading(false);
                return;
            }

            // Shorter timeout (3s) to prevent UI from hanging
            const timeoutPromise = new Promise<null>((resolve) => {
                setTimeout(() => {
                    console.log('[Subscription] Fetch timed out');
                    resolve(null);
                }, 3000);
            });

            const subPromise = api.subscriptions.getCurrentSubscription();
            const sub = await Promise.race([subPromise, timeoutPromise]);

            setCurrentSubscription(sub);
        } catch (error) {
            console.error('[Subscription] Failed to load:', error);
            setCurrentSubscription(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refreshSubscription();
    }, [refreshSubscription]);

    // Refresh subscription when tab becomes visible (user returns to app)
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && !loading) {
                // Silently refresh in background
                refreshSubscription();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [refreshSubscription, loading]);

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
