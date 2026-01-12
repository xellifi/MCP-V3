import React from 'react';
import { Copy, Settings, Trash2 } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface NodeToolbarProps {
    onClone?: (e: React.MouseEvent) => void;
    onConfigure?: (e: React.MouseEvent) => void;
    onDelete?: (e: React.MouseEvent) => void;
    color?: string; // Main theme color for the settings button (e.g. 'blue', 'emerald', 'amber', 'rose')
    className?: string;
}

const NodeToolbar: React.FC<NodeToolbarProps> = ({
    onClone,
    onConfigure,
    onDelete,
    color = 'blue',
    className = ''
}) => {
    const { isDark } = useTheme();

    // Map of colors to full class names to prevent Tailwind purging
    const colorClasses: Record<string, { bg: string, hover: string, text: string }> = {
        blue: { bg: 'bg-blue-500', hover: 'hover:bg-blue-600', text: 'text-blue-500' },
        emerald: { bg: 'bg-emerald-500', hover: 'hover:bg-emerald-600', text: 'text-emerald-500' },
        amber: { bg: 'bg-amber-500', hover: 'hover:bg-amber-600', text: 'text-amber-500' },
        rose: { bg: 'bg-rose-500', hover: 'hover:bg-rose-600', text: 'text-rose-500' },
        red: { bg: 'bg-red-500', hover: 'hover:bg-red-600', text: 'text-red-500' },
        green: { bg: 'bg-green-500', hover: 'hover:bg-green-600', text: 'text-green-500' },
        purple: { bg: 'bg-purple-500', hover: 'hover:bg-purple-600', text: 'text-purple-500' },
        cyan: { bg: 'bg-cyan-500', hover: 'hover:bg-cyan-600', text: 'text-cyan-500' },
        indigo: { bg: 'bg-indigo-500', hover: 'hover:bg-indigo-600', text: 'text-indigo-500' },
        violet: { bg: 'bg-violet-500', hover: 'hover:bg-violet-600', text: 'text-violet-500' },
        slate: { bg: 'bg-slate-500', hover: 'hover:bg-slate-600', text: 'text-slate-500' },
        pink: { bg: 'bg-pink-500', hover: 'hover:bg-pink-600', text: 'text-pink-500' },
        orange: { bg: 'bg-orange-500', hover: 'hover:bg-orange-600', text: 'text-orange-500' },
    };

    const scheme = colorClasses[color] || colorClasses.blue;

    return (
        <div className={`absolute -top-3 -right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-50 ${className}`}>
            {onClone && (
                <button
                    onClick={onClone}
                    className={`w-7 h-7 rounded-full shadow-lg flex items-center justify-center transition-colors ${isDark
                        ? 'bg-slate-600 hover:bg-slate-500 text-white'
                        : 'bg-white hover:bg-gray-50 text-slate-600 border border-gray-200'
                        }`}
                    title="Clone node"
                >
                    <Copy className="w-4 h-4" />
                </button>
            )}
            {onConfigure && (
                <button
                    onClick={onConfigure}
                    className={`w-7 h-7 rounded-full shadow-lg flex items-center justify-center transition-colors ${isDark
                        ? `${scheme.bg} ${scheme.hover} text-white`
                        : `bg-white hover:bg-gray-50 ${scheme.text} border border-gray-200`
                        }`}
                    title="Configure"
                >
                    <Settings className="w-4 h-4" />
                </button>
            )}
            {onDelete && (
                <button
                    onClick={onDelete}
                    className={`w-7 h-7 rounded-full shadow-lg flex items-center justify-center transition-colors ${isDark
                        ? 'bg-red-500 hover:bg-red-600 text-white'
                        : 'bg-white hover:bg-gray-50 text-red-500 border border-gray-200'
                        }`}
                    title="Delete"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            )}
        </div>
    );
};

export default NodeToolbar;
