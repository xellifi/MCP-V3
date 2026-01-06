import React from 'react';
import { X } from 'lucide-react';

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
    if (!isOpen) {
        return null;
    }

    // Fullscreen mode - render children directly without modal wrapper
    if (fullscreen) {
        return (
            <div className="fixed inset-0 z-50 bg-slate-900">
                {/* Close button - floating */}
                <button
                    onClick={onClose}
                    className="fixed top-4 right-4 z-[60] p-3 bg-red-500/20 hover:bg-red-500/40 rounded-xl text-red-400 hover:text-white transition-all border border-red-500/30 shadow-lg backdrop-blur-sm"
                    title="Close"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Save button - floating */}
                <button
                    onClick={onSave}
                    className="fixed bottom-6 right-6 z-[60] px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-bold rounded-xl shadow-2xl transition-all active:scale-95 border border-white/20"
                >
                    Save Configuration
                </button>

                {/* Fullscreen content */}
                <div className="w-full h-full overflow-hidden">
                    {children}
                </div>
            </div>
        );
    }

    // Regular modal mode
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-md"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative glass-panel border border-white/10 rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-fade-in">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/10 bg-white/5">
                    <div>
                        <h2 className="text-lg md:text-xl font-bold text-white text-glow">Configure {nodeLabel}</h2>
                        <p className="text-xs md:text-sm text-slate-400 mt-1">Set up your {nodeType} node settings</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-black/20">
                    {children}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-6 border-t border-white/10 bg-white/5">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 text-xs md:text-sm font-medium text-slate-300 hover:bg-white/5 rounded-xl border border-white/10 hover:border-white/20 transition-colors"
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
