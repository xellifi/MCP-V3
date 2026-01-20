import React, { useState } from 'react';
import { Mail, RefreshCw, X, CheckCircle, AlertTriangle } from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';

interface EmailVerificationModalProps {
    isOpen: boolean;
    userEmail?: string;
    onClose: () => void;
    onRefresh: () => void;
}

const EmailVerificationModal: React.FC<EmailVerificationModalProps> = ({
    isOpen,
    userEmail,
    onClose,
    onRefresh
}) => {
    const [isResending, setIsResending] = useState(false);
    const [resendSuccess, setResendSuccess] = useState(false);
    const toast = useToast();

    if (!isOpen) return null;

    const handleResendEmail = async () => {
        setIsResending(true);
        setResendSuccess(false);
        try {
            await api.auth.resendVerificationEmail();
            setResendSuccess(true);
            toast.success('Verification email sent! Please check your inbox.');
        } catch (error: any) {
            toast.error(error.message || 'Failed to resend verification email');
        } finally {
            setIsResending(false);
        }
    };

    const handleRefresh = () => {
        onRefresh();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-sm">
            <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                {/* Close button (optional - can be removed to force verification) */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Header */}
                <div className="p-8 pb-4 text-center">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
                        <Mail className="w-10 h-10 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                        Verify Your Email
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400">
                        We've sent a verification link to
                    </p>
                    <p className="text-slate-900 dark:text-white font-semibold mt-1">
                        {userEmail || 'your email address'}
                    </p>
                </div>

                {/* Content */}
                <div className="px-8 pb-8 space-y-4">
                    <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
                            <p className="text-sm text-amber-700 dark:text-amber-400">
                                Please verify your email to access all features. Check your inbox and spam folder for the verification link.
                            </p>
                        </div>
                    </div>

                    {resendSuccess && (
                        <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl">
                            <div className="flex items-center gap-3">
                                <CheckCircle className="w-5 h-5 text-emerald-500" />
                                <p className="text-sm text-emerald-700 dark:text-emerald-400">
                                    Verification email sent successfully!
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="space-y-3 pt-4">
                        <button
                            onClick={handleResendEmail}
                            disabled={isResending}
                            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium rounded-xl shadow-lg shadow-purple-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isResending ? (
                                <>
                                    <RefreshCw className="w-5 h-5 animate-spin" />
                                    Sending...
                                </>
                            ) : (
                                <>
                                    <Mail className="w-5 h-5" />
                                    Resend Verification Email
                                </>
                            )}
                        </button>

                        <button
                            onClick={handleRefresh}
                            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium rounded-xl transition-all"
                        >
                            <RefreshCw className="w-5 h-5" />
                            I've Verified - Refresh
                        </button>
                    </div>

                    <p className="text-center text-xs text-slate-400 dark:text-slate-500 pt-2">
                        Having trouble? Contact support for assistance.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default EmailVerificationModal;
