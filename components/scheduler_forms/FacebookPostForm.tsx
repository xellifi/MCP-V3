import React, { useState, useEffect } from 'react';
import { X, Facebook, Info, CheckCircle, AlertCircle } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { FacebookPostConfig, ConnectedPage } from '../../types';

interface FacebookPostFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (config: FacebookPostConfig) => void;
    initialConfig?: Partial<FacebookPostConfig>;
    connectedPages: ConnectedPage[];
    loading?: boolean;
}

const FacebookPostForm: React.FC<FacebookPostFormProps> = ({
    isOpen,
    onClose,
    onSave,
    initialConfig,
    connectedPages,
    loading = false
}) => {
    const { isDark } = useTheme();

    const [config, setConfig] = useState<FacebookPostConfig>({
        pageId: '',
        pageName: '',
        publishImmediately: true,
        ...initialConfig
    });

    useEffect(() => {
        if (initialConfig) {
            setConfig(prev => ({ ...prev, ...initialConfig }));
        }
    }, [initialConfig]);

    // Auto-select first page if none selected
    useEffect(() => {
        if (!config.pageId && connectedPages.length > 0) {
            const activePage = connectedPages.find(p => p.isAutomationEnabled);
            if (activePage) {
                setConfig(prev => ({
                    ...prev,
                    pageId: activePage.pageId,
                    pageName: activePage.name
                }));
            }
        }
    }, [connectedPages, config.pageId]);

    const handlePageSelect = (page: ConnectedPage) => {
        setConfig({ ...config, pageId: page.pageId, pageName: page.name });
    };

    const handleSave = () => {
        onSave(config);
        onClose();
    };

    if (!isOpen) return null;

    const activePages = connectedPages.filter(p => p.isAutomationEnabled);
    const hasNoPages = activePages.length === 0;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className={`w-full max-w-lg rounded-2xl shadow-2xl border overflow-hidden animate-fade-in ${isDark
                ? 'bg-slate-900 border-white/10'
                : 'bg-white border-slate-200'
                }`}>
                {/* Header */}
                <div className={`flex items-center justify-between p-6 border-b ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700">
                            <Facebook className="w-5 h-5 text-white fill-white" />
                        </div>
                        <div>
                            <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Facebook Post</h2>
                            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Select page to post to</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className={`p-2 rounded-lg transition-colors ${isDark
                            ? 'hover:bg-white/10 text-slate-400'
                            : 'hover:bg-slate-100 text-slate-500'
                            }`}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className={`p-6 space-y-6 max-h-[60vh] overflow-y-auto ${isDark ? 'bg-slate-900/50' : 'bg-slate-50/50'}`}>
                    {/* Loading State */}
                    {loading && (
                        <div className="flex items-center justify-center py-8">
                            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                    )}

                    {/* No Pages Warning */}
                    {!loading && hasNoPages && (
                        <div className={`p-6 rounded-xl border text-center ${isDark ? 'bg-amber-500/10 border-amber-500/20' : 'bg-amber-50 border-amber-200'}`}>
                            <AlertCircle className={`w-12 h-12 mx-auto mb-3 ${isDark ? 'text-amber-400' : 'text-amber-500'}`} />
                            <p className={`font-bold mb-2 ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>
                                No Facebook Pages Available
                            </p>
                            <p className={`text-sm mb-4 ${isDark ? 'text-amber-200/70' : 'text-amber-600'}`}>
                                Connect your Facebook profile and enable automation on at least one page.
                            </p>
                            <button
                                onClick={onClose}
                                className="px-4 py-2 rounded-lg bg-amber-500 text-white font-bold text-sm hover:bg-amber-600 transition-colors"
                            >
                                Go to Connected Pages
                            </button>
                        </div>
                    )}

                    {/* Page Selection */}
                    {!loading && !hasNoPages && (
                        <>
                            <div>
                                <label className={`block text-sm font-semibold mb-3 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                    Select Facebook Page
                                </label>
                                <div className="space-y-2">
                                    {activePages.map((page) => (
                                        <button
                                            key={page.pageId}
                                            onClick={() => handlePageSelect(page)}
                                            className={`w-full p-4 rounded-xl text-left transition-all flex items-center gap-4 ${config.pageId === page.pageId
                                                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/20'
                                                    : isDark
                                                        ? 'bg-white/5 hover:bg-white/10 border border-white/10'
                                                        : 'bg-white hover:bg-slate-50 border border-slate-200'
                                                }`}
                                        >
                                            {/* Page Image */}
                                            <img
                                                src={page.pageImageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(page.name)}&background=1877F2&color=fff`}
                                                alt={page.name}
                                                className="w-12 h-12 rounded-full object-cover border-2 border-white/20"
                                            />

                                            {/* Page Info */}
                                            <div className="flex-1 min-w-0">
                                                <p className={`font-bold truncate ${config.pageId === page.pageId ? 'text-white' : isDark ? 'text-white' : 'text-slate-900'}`}>
                                                    {page.name}
                                                </p>
                                                <p className={`text-sm ${config.pageId === page.pageId ? 'text-white/80' : isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                                    {page.pageFollowers?.toLocaleString() || 0} followers
                                                </p>
                                            </div>

                                            {/* Selected Indicator */}
                                            {config.pageId === page.pageId && (
                                                <CheckCircle className="w-6 h-6 text-white flex-shrink-0" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Publish Toggle */}
                            <div className={`flex items-center justify-between p-4 rounded-xl border ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'}`}>
                                <div>
                                    <p className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Publish Immediately</p>
                                    <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                        Post will be published as soon as the workflow runs
                                    </p>
                                </div>
                                <button
                                    onClick={() => setConfig({ ...config, publishImmediately: !config.publishImmediately })}
                                    className={`w-14 h-8 rounded-full transition-all relative ${config.publishImmediately
                                            ? 'bg-gradient-to-r from-blue-600 to-blue-700'
                                            : isDark ? 'bg-white/20' : 'bg-slate-300'
                                        }`}
                                >
                                    <div className={`w-6 h-6 rounded-full bg-white shadow-md absolute top-1 transition-all ${config.publishImmediately ? 'right-1' : 'left-1'
                                        }`} />
                                </button>
                            </div>

                            {/* Preview Info */}
                            {config.pageId && (
                                <div className={`p-4 rounded-xl border ${isDark ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-50 border-blue-100'}`}>
                                    <p className={`text-sm font-medium flex items-center gap-2 ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
                                        <Info className="w-4 h-4" />
                                        Ready to post
                                    </p>
                                    <p className={`mt-1 text-sm ${isDark ? 'text-blue-200/70' : 'text-blue-600'}`}>
                                        Content will be posted to <strong>{config.pageName}</strong> with the generated caption and image.
                                    </p>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className={`flex justify-end gap-3 p-6 border-t ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                    <button
                        onClick={onClose}
                        className={`px-6 py-3 rounded-xl font-bold transition-all ${isDark
                            ? 'bg-white/10 text-white hover:bg-white/20'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={hasNoPages || !config.pageId}
                        className="px-6 py-3 rounded-xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/20 hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Save Configuration
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FacebookPostForm;
