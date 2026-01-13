import React from 'react';
import { X, Lock, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface UpgradeModalProps {
    isOpen: boolean;
    onClose: () => void;
    featureName?: string;
    requiredPlan?: string;
}

const UpgradeModal: React.FC<UpgradeModalProps> = ({
    isOpen,
    onClose,
    featureName = "this feature",
    requiredPlan = "Starter"
}) => {
    const navigate = useNavigate();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden transform transition-all animate-fade-in">
                <button
                    onClick={onClose}
                    className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors z-10"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="p-8 text-center feature-locked-pattern">
                    <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
                        <Lock className="w-8 h-8 text-white" />
                    </div>

                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                        Unlock {featureName}
                    </h2>

                    <p className="text-slate-500 dark:text-slate-400 mb-8">
                        This feature is exclusively available on the <span className="font-bold text-purple-600 dark:text-purple-400">{requiredPlan}</span> plan and above. Upgrade your account to get instant access.
                    </p>

                    <div className="space-y-3">
                        <button
                            onClick={() => {
                                onClose();
                                navigate('/packages');
                            }}
                            className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold rounded-xl shadow-lg shadow-purple-500/25 transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2"
                        >
                            <Star className="w-4 h-4 fill-current" />
                            Upgrade Now
                        </button>

                        <button
                            onClick={onClose}
                            className="w-full py-3 px-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                        >
                            Maybe Later
                        </button>
                    </div>
                </div>

                {/* Decorative footer */}
                <div className="px-8 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-center gap-2 text-xs text-slate-400">
                    <Lock className="w-3 h-3" />
                    <span>Secure payments & instant activation</span>
                </div>
            </div>
        </div>
    );
};

export default UpgradeModal;
