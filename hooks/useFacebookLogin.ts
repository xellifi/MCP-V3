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
            console.log('=== Starting Facebook Login ===');
            console.log('App ID:', FACEBOOK_APP_ID);
            console.log('Config ID:', FACEBOOK_CONFIG_ID);

            // Login with Facebook using Config ID
            const authResponse = await new Promise<any>((resolve, reject) => {
                const loginOptions: any = {
                    scope: 'email,public_profile',
                    return_scopes: true
                };

                // Add config_id if available (for Facebook Login for Business)
                // When using config_id, response_type must be 'code' not 'token'
                if (FACEBOOK_CONFIG_ID) {
                    loginOptions.config_id = FACEBOOK_CONFIG_ID;
                    loginOptions.response_type = 'code,granted_scopes';
                    loginOptions.override_default_response_type = true;
                }

                console.log('Login options:', JSON.stringify(loginOptions, null, 2));

                window.FB.login((response: any) => {
                    console.log('=== FB.login callback ===');
                    console.log('Full response:', JSON.stringify(response, null, 2));

                    if (response.authResponse) {
                        console.log('AuthResponse:', JSON.stringify(response.authResponse, null, 2));
                        resolve(response.authResponse);
                    } else if (response.status === 'connected') {
                        // Already logged in
                        console.log('Already connected, getting login status...');
                        window.FB.getLoginStatus((statusResponse: any) => {
                            console.log('Login status response:', JSON.stringify(statusResponse, null, 2));
                            if (statusResponse.authResponse) {
                                resolve(statusResponse.authResponse);
                            } else {
                                reject(new Error('Could not get auth response'));
                            }
                        });
                    } else {
                        console.log('Login failed or cancelled');
                        reject(new Error('Facebook login was cancelled or failed'));
                    }
                }, loginOptions);
            });

            console.log('=== Processing auth response ===');
            console.log('authResponse:', authResponse);

            // With code flow, may receive code or accessToken depending on Facebook's response
            let accessToken = authResponse.accessToken || authResponse.access_token;
            const code = authResponse.code;

            console.log('Access Token present:', !!accessToken);
            console.log('Code present:', !!code);

            let userInfo: FacebookUser;

            // If we got a code but no token, exchange it via server-side API
            if (!accessToken && code) {
                console.log('Got authorization code, exchanging for access token via server...');

                // Call server-side API to exchange code for token
                const exchangeResponse = await fetch('/api/auth/facebook-token', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        code,
                        redirectUri: window.location.origin + '/'
                    }),
                });

                const exchangeData = await exchangeResponse.json();
                console.log('Token exchange response:', exchangeData);

                if (!exchangeResponse.ok || !exchangeData.accessToken) {
                    throw new Error(exchangeData.error || 'Failed to exchange code for access token');
                }

                accessToken = exchangeData.accessToken;
                userInfo = exchangeData.user;

                console.log('Token exchange successful!');
            } else if (accessToken) {
                // We have an access token, get user info from Facebook
                console.log('=== Fetching user info ===');
                userInfo = await new Promise<FacebookUser>((resolve, reject) => {
                    window.FB.api('/me', { fields: 'id,name,email,picture.width(200).height(200)' }, (response: any) => {
                        console.log('User info response:', JSON.stringify(response, null, 2));
                        if (response.error) {
                            reject(new Error(response.error.message));
                        } else {
                            resolve(response);
                        }
                    });
                });
            } else {
                throw new Error('No access token or code received from Facebook');
            }

            console.log('=== Login successful! ===');
            console.log('User:', userInfo.name);

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
