import React from 'react';
import { Facebook, Loader2 } from 'lucide-react';

interface ImportLoadingProps {
    message?: string;
    subMessage?: string;
}

const ImportLoading: React.FC<ImportLoadingProps> = ({
    message = "Connecting to Facebook...",
    subMessage = "Please wait while we set up your connection"
}) => {
    return (
        <div className="col-span-full py-16 text-center glass-panel rounded-3xl border border-blue-500/20 relative overflow-hidden">
            {/* Animated Background */}
            <div className="absolute inset-0">
                <div className="absolute top-0 left-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-0 right-1/4 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-300" />
            </div>

            {/* Content */}
            <div className="relative z-10 flex flex-col items-center">
                {/* Animated Logo Container */}
                <div className="relative mb-8">
                    {/* Rotating Ring */}
                    <div className="absolute inset-0 w-28 h-28 border-4 border-transparent border-t-blue-500 border-r-blue-400 rounded-full animate-spin" />

                    {/* Second Ring - slower */}
                    <div className="absolute inset-2 w-24 h-24 border-4 border-transparent border-b-purple-500 border-l-purple-400 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />

                    {/* Facebook Icon Center */}
                    <div className="w-28 h-28 bg-gradient-to-br from-[#1877F2] to-[#0d5abd] rounded-full flex items-center justify-center shadow-xl shadow-blue-500/30">
                        <Facebook className="w-14 h-14 text-white animate-pulse" />
                    </div>
                </div>

                {/* Loading Text */}
                <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
                    {message}
                </h3>

                <p className="text-slate-400 text-sm max-w-xs">
                    {subMessage}
                </p>

                {/* Animated Dots */}
                <div className="flex gap-1 mt-6">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-blue-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
            </div>
        </div>
    );
};

export default ImportLoading;
