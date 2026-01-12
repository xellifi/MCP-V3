import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Lightbulb } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface CollapsibleTipsProps {
    title?: string;
    color?: 'amber' | 'blue' | 'indigo' | 'purple' | 'green' | 'rose';
    children: React.ReactNode;
    defaultExpanded?: boolean;
}

const getColorClasses = (color: string, isDark: boolean) => {
    const base = {
        amber: {
            bg: isDark ? 'bg-amber-500/10' : 'bg-amber-50',
            border: isDark ? 'border-amber-500/20' : 'border-amber-200',
            text: isDark ? 'text-amber-300' : 'text-amber-800',
            icon: isDark ? 'text-amber-400' : 'text-amber-600',
            hover: isDark ? 'hover:bg-amber-500/20' : 'hover:bg-amber-100'
        },
        blue: {
            bg: isDark ? 'bg-blue-500/10' : 'bg-blue-50',
            border: isDark ? 'border-blue-500/20' : 'border-blue-200',
            text: isDark ? 'text-blue-300' : 'text-blue-800',
            icon: isDark ? 'text-blue-400' : 'text-blue-600',
            hover: isDark ? 'hover:bg-blue-500/20' : 'hover:bg-blue-100'
        },
        indigo: {
            bg: isDark ? 'bg-indigo-500/10' : 'bg-indigo-50',
            border: isDark ? 'border-indigo-500/20' : 'border-indigo-200',
            text: isDark ? 'text-indigo-300' : 'text-indigo-800',
            icon: isDark ? 'text-indigo-400' : 'text-indigo-600',
            hover: isDark ? 'hover:bg-indigo-500/20' : 'hover:bg-indigo-100'
        },
        purple: {
            bg: isDark ? 'bg-purple-500/10' : 'bg-purple-50',
            border: isDark ? 'border-purple-500/20' : 'border-purple-200',
            text: isDark ? 'text-purple-300' : 'text-purple-800',
            icon: isDark ? 'text-purple-400' : 'text-purple-600',
            hover: isDark ? 'hover:bg-purple-500/20' : 'hover:bg-purple-100'
        },
        green: {
            bg: isDark ? 'bg-green-500/10' : 'bg-green-50',
            border: isDark ? 'border-green-500/20' : 'border-green-200',
            text: isDark ? 'text-green-300' : 'text-green-800',
            icon: isDark ? 'text-green-400' : 'text-green-600',
            hover: isDark ? 'hover:bg-green-500/20' : 'hover:bg-green-100'
        },
        rose: {
            bg: isDark ? 'bg-rose-500/10' : 'bg-rose-50',
            border: isDark ? 'border-rose-500/20' : 'border-rose-200',
            text: isDark ? 'text-rose-300' : 'text-rose-800',
            icon: isDark ? 'text-rose-400' : 'text-rose-600',
            hover: isDark ? 'hover:bg-rose-500/20' : 'hover:bg-rose-100'
        }
    };
    return base[color as keyof typeof base] || base.amber;
};

const CollapsibleTips: React.FC<CollapsibleTipsProps> = ({
    title = 'Tips & Info',
    color = 'amber',
    children,
    defaultExpanded = false
}) => {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);
    const { isDark } = useTheme();
    const colors = getColorClasses(color, isDark);

    return (
        <div className={`${colors.bg} border ${colors.border} rounded-xl overflow-hidden`}>
            <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className={`w-full px-4 py-3 flex items-center justify-between ${colors.hover} transition-colors`}
            >
                <div className="flex items-center gap-2">
                    <Lightbulb className={`w-4 h-4 ${colors.icon}`} />
                    <span className={`text-xs md:text-sm font-semibold ${colors.text}`}>
                        {title}
                    </span>
                </div>
                {isExpanded ? (
                    <ChevronUp className={`w-4 h-4 ${colors.icon}`} />
                ) : (
                    <ChevronDown className={`w-4 h-4 ${colors.icon}`} />
                )}
            </button>
            {isExpanded && (
                <div className={`px-4 pb-3 ${colors.text}`}>
                    {children}
                </div>
            )}
        </div>
    );
};

export default CollapsibleTips;
