import React from 'react';
import { Copy } from 'lucide-react';

interface Variable {
    name: string;
    description: string;
}

interface ClickableVariablesProps {
    variables: Variable[];
    onVariableClick: (variable: string) => void;
    accentColor?: 'indigo' | 'purple' | 'blue' | 'emerald';
}

const colorSchemes = {
    indigo: {
        badge: 'bg-indigo-500/20 border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/30 hover:border-indigo-500/50',
        example: 'text-indigo-300'
    },
    purple: {
        badge: 'bg-purple-500/20 border-purple-500/30 text-purple-300 hover:bg-purple-500/30 hover:border-purple-500/50',
        example: 'text-purple-300'
    },
    blue: {
        badge: 'bg-blue-500/20 border-blue-500/30 text-blue-300 hover:bg-blue-500/30 hover:border-blue-500/50',
        example: 'text-blue-300'
    },
    emerald: {
        badge: 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/30 hover:border-emerald-500/50',
        example: 'text-emerald-300'
    }
};

const ClickableVariables: React.FC<ClickableVariablesProps> = ({
    variables,
    onVariableClick,
    accentColor = 'indigo'
}) => {
    const colors = colorSchemes[accentColor];

    return (
        <div className="mt-3 p-3 bg-white/5 border border-white/10 rounded-xl">
            <p className="text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
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
            <p className={`text-[10px] md:text-xs ${colors.example} mt-2 opacity-80`}>
                💡 Tip: Click any variable above to insert it at cursor position
            </p>
        </div>
    );
};

export default ClickableVariables;

// Standard variables for comment/message forms
export const STANDARD_VARIABLES: Variable[] = [
    { name: '{commenter_name}', description: 'Name of the person who commented' },
    { name: '{comment_text}', description: 'The comment message' },
    { name: '{page_name}', description: 'Your Facebook page name' },
    { name: '{post_url}', description: 'URL to the post' }
];
