import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Lightbulb } from 'lucide-react';

interface CollapsibleTipsProps {
    title?: string;
    color?: 'amber' | 'blue' | 'indigo' | 'purple' | 'green';
    children: React.ReactNode;
    defaultExpanded?: boolean;
}

const colorClasses = {
    amber: {
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/20',
        text: 'text-amber-300',
        icon: 'text-amber-400',
        hover: 'hover:bg-amber-500/20'
    },
    blue: {
        bg: 'bg-blue-500/10',
        border: 'border-blue-500/20',
        text: 'text-blue-300',
        icon: 'text-blue-400',
        hover: 'hover:bg-blue-500/20'
    },
    indigo: {
        bg: 'bg-indigo-500/10',
        border: 'border-indigo-500/20',
        text: 'text-indigo-300',
        icon: 'text-indigo-400',
        hover: 'hover:bg-indigo-500/20'
    },
    purple: {
        bg: 'bg-purple-500/10',
        border: 'border-purple-500/20',
        text: 'text-purple-300',
        icon: 'text-purple-400',
        hover: 'hover:bg-purple-500/20'
    },
    green: {
        bg: 'bg-green-500/10',
        border: 'border-green-500/20',
        text: 'text-green-300',
        icon: 'text-green-400',
        hover: 'hover:bg-green-500/20'
    }
};

const CollapsibleTips: React.FC<CollapsibleTipsProps> = ({
    title = 'Tips & Info',
    color = 'amber',
    children,
    defaultExpanded = false
}) => {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);
    const colors = colorClasses[color];

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
