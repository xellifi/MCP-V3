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

            // For Facebook Login for Business with config_id, use redirect-based OAuth
            // This gives us a known redirect_uri for the token exchange
            if (FACEBOOK_CONFIG_ID) {
                console.log('Using redirect-based OAuth for Facebook Login for Business...');

                // Store current URL to return to after login
                sessionStorage.setItem('fb_login_return_url', window.location.href);

                // Build the OAuth URL
                const redirectUri = `${window.location.origin}/api/auth/facebook-callback`;
                const state = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(7);
                sessionStorage.setItem('fb_oauth_state', state);

                const oauthUrl = new URL('https://www.facebook.com/v18.0/dialog/oauth');
                oauthUrl.searchParams.set('client_id', FACEBOOK_APP_ID);
                oauthUrl.searchParams.set('redirect_uri', redirectUri);
                oauthUrl.searchParams.set('state', state);
                oauthUrl.searchParams.set('scope', 'email,public_profile');
                oauthUrl.searchParams.set('response_type', 'code');
                oauthUrl.searchParams.set('config_id', FACEBOOK_CONFIG_ID);

                console.log('Redirecting to Facebook OAuth:', oauthUrl.toString());

                // Redirect to Facebook
                window.location.href = oauthUrl.toString();

                // Return null since we're redirecting
                return null;
            }

            // For standard Facebook Login (without config_id), use popup
            const authResponse = await new Promise<any>((resolve, reject) => {
                const loginOptions: any = {
                    scope: 'email,public_profile',
                    return_scopes: true
                };

                console.log('Login options:', JSON.stringify(loginOptions, null, 2));

                window.FB.login((response: any) => {
                    console.log('=== FB.login callback ===');
                    console.log('Full response:', JSON.stringify(response, null, 2));

                    if (response.authResponse) {
                        console.log('AuthResponse:', JSON.stringify(response.authResponse, null, 2));
                        resolve(response.authResponse);
                    } else if (response.status === 'connected') {
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

            const accessToken = authResponse.accessToken;

            if (!accessToken) {
                throw new Error('No access token received from Facebook');
            }

            // Get user info from Facebook
            console.log('=== Fetching user info ===');
            const userInfo = await new Promise<FacebookUser>((resolve, reject) => {
                window.FB.api('/me', { fields: 'id,name,email,picture.width(200).height(200)' }, (response: any) => {
                    console.log('User info response:', JSON.stringify(response, null, 2));
                    if (response.error) {
                        reject(new Error(response.error.message));
                    } else {
                        resolve(response);
                    }
                });
            });

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
