import React from 'react';
import { useTheme } from '../context/ThemeContext';

const LoadingSpinner: React.FC = () => {
    const { isDark } = useTheme();

    return (
        <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-slate-950' : 'bg-gray-50'}`}>
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>Loading...</p>
            </div>
        </div>
    );
};

export default LoadingSpinner;
