import React, { useState, useEffect } from 'react';
import { KeyRound, ArrowLeft, Eye, EyeOff, Loader2, CheckCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const ResetPassword: React.FC = () => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [sessionReady, setSessionReady] = useState(false);
    const [initializing, setInitializing] = useState(true);
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        console.log('ResetPassword: Component mounted');

        // Check URL hash for tokens
        const hash = window.location.hash;

        if (hash.includes('access_token') && hash.includes('type=recovery')) {
            console.log('ResetPassword: Recovery tokens found in URL');

            // Extract access token for later use
            const hashParams = new URLSearchParams(hash.substring(1));
            const token = hashParams.get('access_token');

            if (token) {
                setAccessToken(token);
                setSessionReady(true);
                setInitializing(false);

                // Clear the hash from URL
                window.history.replaceState(null, '', window.location.pathname);
                console.log('ResetPassword: Ready for password reset');
            } else {
                setError('Invalid password reset link. Please request a new one.');
                setInitializing(false);
            }
        } else {
            // No recovery tokens - show error
            console.log('ResetPassword: No recovery tokens found');
            setError('Invalid or expired password reset link. Please request a new one.');
            setInitializing(false);
        }
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Validation
        if (password.length < 8) {
            setError('Password must be at least 8 characters long');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);

        try {
            // First, set the session using the stored access token
            if (accessToken) {
                const hashParams = new URLSearchParams(window.location.hash.substring(1) || '');
                const refreshToken = hashParams.get('refresh_token') || localStorage.getItem('sb-refresh-token') || '';

                // Get refresh token from the original URL if we stored it
                const storedRefresh = sessionStorage.getItem('reset_refresh_token');

                console.log('ResetPassword: Setting session with access token...');
                const { error: sessionError } = await supabase.auth.setSession({
                    access_token: accessToken,
                    refresh_token: storedRefresh || refreshToken,
                });

                if (sessionError) {
                    console.error('ResetPassword: Session error:', sessionError);
                    throw new Error('Session expired. Please request a new password reset link.');
                }
            }

            console.log('ResetPassword: Updating password...');
            const { error } = await supabase.auth.updateUser({
                password: password,
            });

            if (error) {
                throw error;
            }

            console.log('ResetPassword: Password updated successfully!');
            setSuccess(true);

            // Sign out and redirect to login after 3 seconds
            setTimeout(async () => {
                await supabase.auth.signOut();
                navigate('/login');
            }, 3000);
        } catch (err: any) {
            console.error('ResetPassword: Error:', err);
            setError(err.message || 'Failed to reset password. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Store refresh token when we first get it
    useEffect(() => {
        const hash = window.location.hash;
        if (hash.includes('refresh_token')) {
            const hashParams = new URLSearchParams(hash.substring(1));
            const refreshToken = hashParams.get('refresh_token');
            if (refreshToken) {
                sessionStorage.setItem('reset_refresh_token', refreshToken);
            }
        }
    }, []);

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 transition-colors duration-300">
            <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-xl dark:shadow-none border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in duration-300">
                <div className="p-8 pb-4 text-center">
                    <Link to="/" className="inline-block hover:scale-105 transition-transform duration-200">
                        <div className="w-14 h-14 bg-gradient-to-tr from-amber-500 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-6 text-white shadow-lg shadow-amber-500/30">
                            <KeyRound className="w-7 h-7" />
                        </div>
                    </Link>
                    <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Set New Password</h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg">Create a strong password for your account</p>
                </div>

                {initializing ? (
                    <div className="p-8 text-center space-y-4">
                        <Loader2 className="w-8 h-8 animate-spin text-amber-500 mx-auto" />
                        <p className="text-slate-500 dark:text-slate-400">Verifying your reset link...</p>
                    </div>
                ) : success ? (
                    <div className="p-8 text-center space-y-6">
                        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
                            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                        </div>
                        <div className="p-5 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-xl text-sm border border-green-100 dark:border-green-900/30">
                            Your password has been reset successfully! Redirecting to login...
                        </div>
                        <Link to="/login" className="inline-flex items-center text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-bold hover:underline transition-colors">
                            Go to Login Now
                        </Link>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="p-8 space-y-6">
                        {error && (
                            <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-xl text-sm border border-red-100 dark:border-red-900/30">
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">New Password</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3.5 pr-12 focus:ring-2 focus:ring-amber-500 outline-none transition-all text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
                                    placeholder="••••••••"
                                    required
                                    minLength={8}
                                    disabled={loading || !sessionReady}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                                >
                                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                            </div>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Must be at least 8 characters</p>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Confirm Password</label>
                            <div className="relative">
                                <input
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    value={confirmPassword}
                                    onChange={e => setConfirmPassword(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3.5 pr-12 focus:ring-2 focus:ring-amber-500 outline-none transition-all text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
                                    placeholder="••••••••"
                                    required
                                    minLength={8}
                                    disabled={loading || !sessionReady}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                                >
                                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !sessionReady}
                            className="w-full bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-slate-900/10 dark:shadow-none transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Updating...
                                </>
                            ) : (
                                'Reset Password'
                            )}
                        </button>

                        <div className="text-center pt-2">
                            <Link to="/login" className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium transition-colors">
                                <ArrowLeft className="w-4 h-4" /> Back to Login
                            </Link>
                        </div>
                    </form>
                )}
            </div>

            <p className="mt-8 text-slate-400 text-sm">&copy; {new Date().getFullYear()} Mychat Pilot. All rights reserved.</p>
        </div>
    );
};

export default ResetPassword;
