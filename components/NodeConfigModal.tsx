import React from 'react';
import { X } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface NodeConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
    nodeType: string;
    nodeLabel: string;
    children: React.ReactNode;
    onSave: () => void;
    fullscreen?: boolean;
}

const NodeConfigModal: React.FC<NodeConfigModalProps> = ({
    isOpen,
    onClose,
    nodeType,
    nodeLabel,
    children,
    onSave,
    fullscreen = false
}) => {
    const { isDark } = useTheme();

    if (!isOpen) {
        return null;
    }

    // Fullscreen mode - render children directly, let form handle close/save
    if (fullscreen) {
        return (
            <div className={`fixed inset-0 z-50 ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
                {/* Fullscreen content - form handles its own close and save buttons */}
                <div className="w-full h-full overflow-hidden">
                    {React.cloneElement(children as React.ReactElement, { onClose })}
                </div>
            </div>
        );
    }

    // Regular modal mode
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className={`absolute inset-0 backdrop-blur-md ${isDark ? 'bg-black/80' : 'bg-slate-900/40'}`}
                onClick={onClose}
            />

            {/* Modal */}
            <div className={`
                relative rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-fade-in
                ${isDark ? 'glass-panel border border-white/10' : 'bg-white border border-slate-200'}
            `}>
                {/* Header */}
                <div className={`
                    flex items-center justify-between p-6 border-b 
                    ${isDark ? 'border-white/10 bg-white/5' : 'border-slate-100 bg-slate-50/50'}
                `}>
                    <div>
                        <h2 className={`text-lg md:text-xl font-bold ${isDark ? 'text-white text-glow' : 'text-slate-900'}`}>
                            Configure {nodeLabel}
                        </h2>
                        <p className={`text-xs md:text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            Set up your {nodeType} node settings
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className={`p-2 rounded-lg transition-colors ${isDark
                            ? 'hover:bg-white/10 text-slate-400 hover:text-white'
                            : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'}`}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className={`flex-1 overflow-y-auto p-6 ${isDark ? 'bg-black/20' : 'bg-white'}`}>
                    {children}
                </div>

                {/* Footer */}
                <div className={`
                    flex items-center justify-end gap-3 p-6 border-t 
                    ${isDark ? 'border-white/10 bg-white/5' : 'border-slate-100 bg-slate-50/50'}
                `}>
                    <button
                        onClick={onClose}
                        className={`px-5 py-2.5 text-xs md:text-sm font-medium rounded-xl border transition-colors ${isDark
                            ? 'text-slate-300 hover:bg-white/5 border-white/10 hover:border-white/20'
                            : 'text-slate-700 hover:bg-white border-slate-200 hover:border-slate-300 shadow-sm bg-white'}`}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onSave}
                        className="px-5 py-2.5 text-xs md:text-sm font-bold bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white rounded-xl shadow-lg shadow-indigo-500/20 transition-all active:scale-95 border border-white/20"
                    >
                        Save Configuration
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NodeConfigModal;
