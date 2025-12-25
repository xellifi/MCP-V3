import React, { useState, useEffect, useRef } from 'react';
import { ConnectedPage } from '../types';
import { api } from '../services/api';
import { AlertCircle, CheckCircle2, ChevronDown } from 'lucide-react';

interface TriggerNodeFormProps {
    workspaceId: string;
    flowPageId?: string; // Page selected from header dropdown
    onPageChange?: (pageId: string) => void; // Callback when user changes page in form
    initialConfig?: {
        pageId?: string;
        enableCommentReply?: boolean;
        enableSendMessage?: boolean;
    };
    onChange: (config: any) => void;
}

const TriggerNodeForm: React.FC<TriggerNodeFormProps> = ({
    workspaceId,
    flowPageId,
    onPageChange,
    initialConfig,
    onChange
}) => {
    const [pages, setPages] = useState<ConnectedPage[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPageId, setSelectedPageId] = useState(initialConfig?.pageId || '');
    const [enableCommentReply, setEnableCommentReply] = useState(initialConfig?.enableCommentReply !== undefined ? initialConfig.enableCommentReply : true);
    const [enableSendMessage, setEnableSendMessage] = useState(initialConfig?.enableSendMessage !== undefined ? initialConfig.enableSendMessage : true);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const isInitialMount = useRef(true);
    const lastNotifiedConfig = useRef<string>('');

    useEffect(() => {
        loadPages();
    }, [workspaceId]);

    // Sync form state when initialConfig changes (when modal reopens with saved config)
    useEffect(() => {
        if (initialConfig) {
            setSelectedPageId(initialConfig.pageId || '');
            setEnableCommentReply(initialConfig.enableCommentReply !== undefined ? initialConfig.enableCommentReply : true);
            setEnableSendMessage(initialConfig.enableSendMessage !== undefined ? initialConfig.enableSendMessage : true);
        }
        // Mark initial mount complete after first sync
        isInitialMount.current = false;
    }, [initialConfig]);

    // Sync with flowPageId from header when it changes (only if no user selection yet)
    useEffect(() => {
        if (flowPageId && flowPageId !== selectedPageId && !initialConfig?.pageId) {
            setSelectedPageId(flowPageId);
        }
    }, [flowPageId]);

    // Handle page selection by user - notify parent
    const handlePageSelect = (pageId: string) => {
        setSelectedPageId(pageId);
        setIsDropdownOpen(false);
        if (onPageChange) {
            onPageChange(pageId);
        }
    };

    // Only call onChange when user makes actual changes, not on initial sync
    useEffect(() => {
        // Skip if this is initial mount or if values haven't actually changed
        const configKey = `${selectedPageId}-${enableCommentReply}-${enableSendMessage}`;
        if (lastNotifiedConfig.current === configKey) {
            return;
        }
        lastNotifiedConfig.current = configKey;

        onChange({
            pageId: selectedPageId,
            enableCommentReply,
            enableSendMessage
        });
    }, [selectedPageId, enableCommentReply, enableSendMessage]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const loadPages = async () => {
        try {
            setLoading(true);
            const allPages = await api.workspace.getConnectedPages(workspaceId);
            // Filter to only show pages with automation enabled
            const automationPages = allPages.filter(p => p.isAutomationEnabled);
            setPages(automationPages);

            // Auto-select first page if none selected
            if (!selectedPageId && automationPages.length > 0) {
                setSelectedPageId(automationPages[0].id);
            }
        } catch (error) {
            console.error('Error loading pages:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (pages.length === 0) {
        return (
            <div className="text-center py-12">
                <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-white mb-2">No Pages with Automation</h3>
                <p className="text-slate-400 mb-4">
                    You need to enable automation on at least one Facebook page.
                </p>
                <a
                    href="/connected-pages"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-colors text-sm font-medium"
                >
                    Go to Pages
                </a>
            </div>
        );
    }

    const selectedPage = pages.find(p => p.id === selectedPageId);

    return (
        <div className="space-y-6">
            {/* Page Selection */}
            <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                    Select Facebook Page
                </label>
                <div className="relative" ref={dropdownRef}>
                    {/* Custom Dropdown Trigger */}
                    <button
                        type="button"
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className="w-full flex items-center gap-3 bg-black/20 border border-white/10 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent transition-all cursor-pointer hover:border-indigo-500/30"
                    >
                        {selectedPage ? (
                            <>
                                <img
                                    src={selectedPage.pageImageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedPage.name)}&background=1877F2&color=fff`}
                                    alt={selectedPage.name}
                                    className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                                />
                                <div className="flex-1 text-left">
                                    <div className="text-white font-medium">{selectedPage.name}</div>
                                    <div className="text-xs text-slate-400">{selectedPage.pageFollowers?.toLocaleString() || 0} followers</div>
                                </div>
                            </>
                        ) : (
                            <span className="text-slate-400">Choose a page...</span>
                        )}
                        <ChevronDown className={`w-5 h-5 text-slate-400 ml-auto transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Custom Dropdown Menu */}
                    {isDropdownOpen && (
                        <div className="absolute z-50 w-full mt-2 bg-slate-800 border border-white/10 rounded-xl shadow-2xl max-h-64 overflow-y-auto">
                            {pages.map((page) => (
                                <button
                                    key={page.id}
                                    type="button"
                                    onClick={() => handlePageSelect(page.id)}
                                    className={`w-full flex items-center gap-3 p-3 hover:bg-white/5 transition-colors ${selectedPageId === page.id ? 'bg-indigo-500/20' : ''
                                        }`}
                                >
                                    <img
                                        src={page.pageImageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(page.name)}&background=1877F2&color=fff`}
                                        alt={page.name}
                                        className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                                    />
                                    <div className="flex-1 text-left">
                                        <div className="text-white font-medium text-sm">{page.name}</div>
                                        <div className="text-xs text-slate-400">{page.pageFollowers?.toLocaleString() || 0} followers</div>
                                    </div>
                                    {selectedPageId === page.id && (
                                        <div className="w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center flex-shrink-0">
                                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                <p className="mt-2 text-xs text-slate-400">
                    Only pages with automation enabled are shown
                </p>
            </div>

            {/* Comment Reply Toggle */}
            <div className="flex items-start gap-4 p-4 bg-white/5 rounded-xl border border-white/10">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                        <h4 className="font-bold text-white">Auto-Reply to Comments</h4>
                    </div>
                    <p className="text-sm text-slate-400">
                        Automatically reply to new comments on this page's posts
                    </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                    <input
                        type="checkbox"
                        checked={enableCommentReply}
                        onChange={(e) => setEnableCommentReply(e.target.checked)}
                        className="sr-only peer"
                    />
                    <div className="w-14 h-7 bg-white/10 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
            </div>

            {/* Send Message Toggle */}
            <div className="flex items-start gap-4 p-4 bg-white/5 rounded-xl border border-white/10">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <CheckCircle2 className="w-4 h-4 text-purple-400" />
                        <h4 className="font-bold text-white">Send Direct Message</h4>
                    </div>
                    <p className="text-sm text-slate-400">
                        Send a private message to users who comment
                    </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                    <input
                        type="checkbox"
                        checked={enableSendMessage}
                        onChange={(e) => setEnableSendMessage(e.target.checked)}
                        className="sr-only peer"
                    />
                    <div className="w-14 h-7 bg-white/10 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
            </div>

            {/* Info Box */}
            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                <p className="text-sm text-blue-300">
                    <strong>Note:</strong> This trigger will activate when someone comments on any post from the selected page.
                    Connect action nodes below to define what happens next.
                </p>
            </div>
        </div>
    );
};

export default TriggerNodeForm;
