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
            console.log('Starting Facebook login...');
            console.log('App ID:', FACEBOOK_APP_ID);
            console.log('Config ID:', FACEBOOK_CONFIG_ID);

            // Login with Facebook using Config ID
            const authResponse = await new Promise<any>((resolve, reject) => {
                const loginOptions: any = {
                    scope: 'email,public_profile',
                    return_scopes: true
                };

                // Add config_id if available (for Facebook Login for Business)
                if (FACEBOOK_CONFIG_ID) {
                    loginOptions.config_id = FACEBOOK_CONFIG_ID;
                    // Note: Don't override response_type - let SDK handle it
                }

                console.log('Login options:', loginOptions);

                window.FB.login((response: any) => {
                    console.log('FB.login response:', response);

                    if (response.authResponse) {
                        console.log('Auth response received:', response.authResponse);
                        resolve(response.authResponse);
                    } else if (response.status === 'connected') {
                        // Already connected, get auth response
                        console.log('Already connected, fetching auth response...');
                        window.FB.getLoginStatus((statusResponse: any) => {
                            if (statusResponse.authResponse) {
                                resolve(statusResponse.authResponse);
                            } else {
                                reject(new Error('Could not get auth response'));
                            }
                        });
                    } else {
                        console.log('Login failed or cancelled:', response);
                        reject(new Error('Facebook login was cancelled or failed'));
                    }
                }, loginOptions);
            });

            // Get access token - might be in different places depending on response type
            const accessToken = authResponse.accessToken || authResponse.access_token;

            console.log('Got auth response:', authResponse);
            console.log('Access token available:', !!accessToken);

            if (!accessToken) {
                // If using code flow, we might have a code instead
                if (authResponse.code) {
                    console.log('Received authorization code instead of token');
                    // For now, throw error - code exchange needs server-side implementation
                    throw new Error('Facebook Login for Business returned a code. Server-side token exchange is required.');
                }
                throw new Error('No access token received from Facebook');
            }

            // Get user info from Facebook
            console.log('Fetching user info...');
            const userInfo = await new Promise<FacebookUser>((resolve, reject) => {
                window.FB.api('/me', { fields: 'id,name,email,picture.width(200).height(200)' }, (response: any) => {
                    console.log('User info response:', response);
                    if (response.error) {
                        reject(new Error(response.error.message));
                    } else {
                        resolve(response);
                    }
                });
            });

            console.log('Login successful:', userInfo);
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
