import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../services/api';
import { User } from '../../types';
import { Loader2 } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

interface FacebookCompleteProps {
    onLogin: (user: User) => Promise<void>;
}

interface FacebookLoginData {
    facebookId: string;
    name: string;
    email?: string;
    picture?: string;
    accessToken: string;
    expiresIn?: number;
}

const FacebookComplete: React.FC<FacebookCompleteProps> = ({ onLogin }) => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const toast = useToast();
    const [status, setStatus] = useState<string>('Processing Facebook login...');
    const [error, setError] = useState<string | null>(null);

    // Guard to prevent multiple executions
    const hasRun = useRef(false);

    useEffect(() => {
        // Prevent running multiple times
        if (hasRun.current) {
            console.log('Facebook complete already ran, skipping...');
            return;
        }
        hasRun.current = true;

        const completeLogin = async () => {
            const encodedData = searchParams.get('data');
            const errorParam = searchParams.get('error');

            if (errorParam) {
                setError(errorParam);
                toast.error(errorParam);
                setTimeout(() => navigate('/login', { replace: true }), 2000);
                return;
            }

            if (!encodedData) {
                setError('No login data received');
                toast.error('No login data received');
                setTimeout(() => navigate('/login', { replace: true }), 2000);
                return;
            }

            try {
                // Decode the data from base64
                const decodedData = atob(encodedData);
                const loginData: FacebookLoginData = JSON.parse(decodedData);

                console.log('Facebook login data received:', loginData.name);
                setStatus(`Welcome ${loginData.name}! Creating your account...`);

                // Create/update user in Supabase
                const facebookUser = {
                    id: loginData.facebookId,
                    name: loginData.name,
                    email: loginData.email,
                    picture: loginData.picture ? { data: { url: loginData.picture } } : undefined
                };

                const user = await api.auth.loginWithFacebookSDK(facebookUser, loginData.accessToken);

                setStatus('Login successful! Redirecting...');
                await onLogin(user);

                // Only show one toast
                toast.success(`Welcome, ${user.name}!`);

                // Navigate to dashboard
                navigate('/dashboard', { replace: true });

            } catch (err: any) {
                console.error('Facebook login completion error:', err);
                setError(err.message || 'Login failed');
                toast.error(err.message || 'Login failed');
                setTimeout(() => navigate('/login', { replace: true }), 2000);
            }
        };

        completeLogin();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Empty deps - run once on mount

    if (error) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
                <div className="text-center">
                    <div className="text-red-500 text-xl mb-4">❌</div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Login Failed</h1>
                    <p className="text-slate-600 dark:text-slate-400">{error}</p>
                    <p className="text-sm text-slate-500 mt-4">Redirecting to login page...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
            <div className="text-center">
                <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mx-auto mb-4" />
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{status}</h1>
                <p className="text-slate-600 dark:text-slate-400">Please wait...</p>
            </div>
        </div>
    );
};

export default FacebookComplete;
