import React from 'react';
import { Copy } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface Variable {
    name: string;
    description: string;
}

interface ClickableVariablesProps {
    variables: Variable[];
    onVariableClick: (variable: string) => void;
    accentColor?: 'indigo' | 'purple' | 'blue' | 'emerald';
}

const ClickableVariables: React.FC<ClickableVariablesProps> = ({
    variables,
    onVariableClick,
    accentColor = 'indigo'
}) => {
    const { isDark } = useTheme();

    const getColorStyles = (color: string) => {
        const isLight = !isDark;
        switch (color) {
            case 'indigo':
                return {
                    badge: isLight
                        ? 'bg-indigo-100 text-indigo-700 border-indigo-200 hover:bg-indigo-200'
                        : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30 hover:bg-indigo-500/30',
                    example: isLight ? 'text-indigo-600' : 'text-indigo-300'
                };
            case 'purple':
                return {
                    badge: isLight
                        ? 'bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200'
                        : 'bg-purple-500/20 text-purple-300 border-purple-500/30 hover:bg-purple-500/30',
                    example: isLight ? 'text-purple-600' : 'text-purple-300'
                };
            case 'blue':
                return {
                    badge: isLight
                        ? 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200'
                        : 'bg-blue-500/20 text-blue-300 border-blue-500/30 hover:bg-blue-500/30',
                    example: isLight ? 'text-blue-600' : 'text-blue-300'
                };
            case 'emerald':
                return {
                    badge: isLight
                        ? 'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200'
                        : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/30',
                    example: isLight ? 'text-emerald-600' : 'text-emerald-300'
                };
            default:
                return {
                    badge: isLight
                        ? 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                        : 'bg-slate-700 text-slate-300 border-slate-600 hover:bg-slate-600',
                    example: isLight ? 'text-slate-600' : 'text-slate-400'
                };
        }
    };

    const colors = getColorStyles(accentColor);

    return (
        <div className={`mt-3 p-3 border rounded-xl ${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
            <p className={`text-xs font-semibold mb-2 flex items-center gap-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                <Copy className="w-3 h-3" />
                Click to insert variable:
            </p>
            <div className="flex flex-wrap gap-1.5">
                {variables.map((variable) => (
                    <button
                        key={variable.name}
                        type="button"
                        onClick={() => onVariableClick(variable.name)}
                        className={`
                            px-2 py-1 text-[10px] md:text-xs font-mono font-medium
                            border rounded-lg transition-all duration-200
                            cursor-pointer active:scale-95
                            ${colors.badge}
                        `}
                        title={variable.description}
                    >
                        {variable.name}
                    </button>
                ))}
            </div>
            <p className={`text-[10px] md:text-xs ${colors.example} mt-2 opacity-80 font-medium`}>
                💡 Tip: Click any variable above to insert it at cursor position
            </p>
        </div>
    );
};

export default ClickableVariables;

// Standard variables for comment/message forms
export const STANDARD_VARIABLES: Variable[] = [
    { name: '{commenter_name}', description: 'Full name of the person who commented' },
    { name: '{first_name}', description: 'First name only of the commenter' },
    { name: '{last_name}', description: 'Last name only of the commenter' }
];
