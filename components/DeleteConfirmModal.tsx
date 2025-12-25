import React from 'react';
import { AlertTriangle, X, Trash2 } from 'lucide-react';

interface DeleteConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    itemName: string;
    isLoading?: boolean;
}

const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    itemName,
    isLoading = false
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-md transform transition-all duration-300 ease-out scale-100 opacity-100">
                <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden shadow-2xl shadow-red-500/10">
                    {/* Header */}
                    <div className="relative p-6 pb-0">
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        {/* Warning Icon */}
                        <div className="flex justify-center mb-4">
                            <div className="relative">
                                <div className="absolute inset-0 bg-red-500/20 rounded-full blur-xl animate-pulse" />
                                <div className="relative w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center shadow-lg shadow-red-500/30">
                                    <AlertTriangle className="w-8 h-8 text-white" />
                                </div>
                            </div>
                        </div>

                        {/* Title */}
                        <h2 className="text-xl font-bold text-white text-center mb-2">
                            {title}
                        </h2>
                    </div>

                    {/* Content */}
                    <div className="px-6 py-4">
                        <div className="text-center">
                            <p className="text-slate-300 mb-3">
                                You are about to delete:
                            </p>
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl border border-white/10 mb-4">
                                <span className="font-semibold text-white">{itemName}</span>
                            </div>

                            {/* Warning Box */}
                            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-2">
                                <p className="text-red-400 text-sm font-medium mb-2">
                                    ⚠️ This action cannot be undone!
                                </p>
                                <p className="text-slate-400 text-sm">
                                    All associated data will be permanently deleted:
                                </p>
                                <ul className="text-slate-500 text-xs mt-2 space-y-1">
                                    <li className="flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                                        Connected pages
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                                        Automation flows & settings
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                                        Conversations & messages
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                                        Subscribers & scheduled posts
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="p-6 pt-2 flex flex-col sm:flex-row gap-3">
                        <button
                            onClick={onClose}
                            disabled={isLoading}
                            className="flex-1 py-3 px-4 text-sm font-bold text-slate-300 bg-white/5 hover:bg-white/10 hover:text-white rounded-xl transition-all border border-white/10 disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={onConfirm}
                            disabled={isLoading}
                            className="flex-1 py-3 px-4 text-sm font-bold text-white bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 rounded-xl transition-all shadow-lg shadow-red-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {isLoading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Deleting...
                                </>
                            ) : (
                                <>
                                    <Trash2 className="w-4 h-4" />
                                    Delete Forever
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DeleteConfirmModal;
