import { useState, useCallback, useEffect } from 'react';

// Extend Window interface for Facebook SDK
declare global {
    interface Window {
        FB: any;
        fbAsyncInit: () => void;
        __FACEBOOK_APP_ID__: string;
        __FACEBOOK_CONFIG_ID__: string;
    }
}

interface FacebookUser {
    id: string;
    name: string;
    email?: string;
    picture?: {
        data: {
            url: string;
        };
    };
}

interface UseFacebookLoginResult {
    login: () => Promise<{ user: FacebookUser; accessToken: string } | null>;
    isLoading: boolean;
    isSDKLoaded: boolean;
    error: string | null;
}

// Get config from environment variables
const FACEBOOK_APP_ID = (import.meta as any).env.VITE_FACEBOOK_APP_ID || '';
const FACEBOOK_CONFIG_ID = (import.meta as any).env.VITE_FACEBOOK_CONFIG_ID || '';

export function useFacebookLogin(): UseFacebookLoginResult {
    const [isLoading, setIsLoading] = useState(false);
    const [isSDKLoaded, setIsSDKLoaded] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Initialize SDK and set app ID
    useEffect(() => {
        // Set the app ID for the SDK
        window.__FACEBOOK_APP_ID__ = FACEBOOK_APP_ID;
        window.__FACEBOOK_CONFIG_ID__ = FACEBOOK_CONFIG_ID;

        const checkSDK = () => {
            if (window.FB) {
                // Re-init with correct app ID if needed
                window.FB.init({
                    appId: FACEBOOK_APP_ID,
                    cookie: true,
                    xfbml: true,
                    version: 'v18.0'
                });
                setIsSDKLoaded(true);
            } else {
                // SDK not loaded yet, wait and retry
                setTimeout(checkSDK, 100);
            }
        };

        checkSDK();
    }, []);

    const login = useCallback(async (): Promise<{ user: FacebookUser; accessToken: string } | null> => {
        if (!isSDKLoaded) {
            setError('Facebook SDK not loaded yet. Please try again.');
            return null;
        }

        if (!FACEBOOK_APP_ID) {
            setError('Facebook App ID not configured. Please add VITE_FACEBOOK_APP_ID to your .env file.');
            return null;
        }

        setIsLoading(true);
        setError(null);

        try {
            // Login with Facebook using Config ID
            const authResponse = await new Promise<any>((resolve, reject) => {
                const loginOptions: any = {
                    scope: 'email,public_profile',
                    return_scopes: true
                };

                // Add config_id if available (for Facebook Login for Business)
                if (FACEBOOK_CONFIG_ID) {
                    loginOptions.config_id = FACEBOOK_CONFIG_ID;
                }

                window.FB.login((response: any) => {
                    if (response.authResponse) {
                        resolve(response.authResponse);
                    } else {
                        reject(new Error('Facebook login was cancelled or failed'));
                    }
                }, loginOptions);
            });

            const accessToken = authResponse.accessToken;

            // Get user info from Facebook
            const userInfo = await new Promise<FacebookUser>((resolve, reject) => {
                window.FB.api('/me', { fields: 'id,name,email,picture.width(200).height(200)' }, (response: any) => {
                    if (response.error) {
                        reject(new Error(response.error.message));
                    } else {
                        resolve(response);
                    }
                });
            });

            return { user: userInfo, accessToken };
        } catch (err: any) {
            const errorMessage = err.message || 'Facebook login failed';
            setError(errorMessage);
            console.error('Facebook login error:', err);
            return null;
        } finally {
            setIsLoading(false);
        }
    }, [isSDKLoaded]);

    return { login, isLoading, isSDKLoaded, error };
}

export default useFacebookLogin;
