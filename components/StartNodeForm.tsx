import React, { useState, useEffect, useRef } from 'react';
import { Plus, X, Play, Facebook, ChevronDown, AlertCircle } from 'lucide-react';
import { api } from '../services/api';
import { ConnectedPage } from '../types';

interface StartNodeFormProps {
    workspaceId: string;
    flowPageId?: string; // Page selected from header dropdown
    onPageChange?: (pageId: string) => void; // Callback when user changes page in form
    initialConfig?: {
        pageId?: string;
        keywords?: string[];
        matchType?: 'exact' | 'contains';
    };
    onChange: (config: any) => void;
}

const StartNodeForm: React.FC<StartNodeFormProps> = ({
    workspaceId,
    flowPageId,
    onPageChange,
    initialConfig,
    onChange
}) => {
    const [pages, setPages] = useState<ConnectedPage[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPageId, setSelectedPageId] = useState<string>(flowPageId || initialConfig?.pageId || '');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [keywords, setKeywords] = useState<string[]>(
        initialConfig?.keywords && initialConfig.keywords.length > 0
            ? initialConfig.keywords
            : ['']
    );
    const [matchType, setMatchType] = useState<'exact' | 'contains'>(
        initialConfig?.matchType || 'exact'
    );

    // Fetch connected pages
    useEffect(() => {
        const fetchPages = async () => {
            setLoading(true);
            try {
                const pagesData = await api.workspace.getConnectedPages(workspaceId);
                // Filter to only show pages with automation enabled
                const activePages = pagesData.filter(p => p.isAutomationEnabled);
                setPages(activePages);

                // Only auto-select first page if no page was already selected
                // Use a ref to check what was initially set, not closure variable
                const currentSelection = initialConfig?.pageId || flowPageId;
                if (!currentSelection && activePages.length > 0) {
                    setSelectedPageId(activePages[0].id);
                } else if (currentSelection) {
                    // Ensure we're using the saved pageId
                    setSelectedPageId(currentSelection);
                }
            } catch (error) {
                console.error('Error fetching pages:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchPages();
    }, [workspaceId]);

    // ALWAYS sync with flowPageId from header - header is the source of truth
    useEffect(() => {
        if (flowPageId && flowPageId !== selectedPageId) {
            console.log('[StartNodeForm] Syncing with header flowPageId:', flowPageId);
            setSelectedPageId(flowPageId);
        }
    }, [flowPageId]);

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

    // Notify parent of changes
    useEffect(() => {
        const validKeywords = keywords.filter(k => k.trim());
        onChange({ pageId: selectedPageId, keywords: validKeywords, matchType });
    }, [selectedPageId, keywords, matchType]);

    const handlePageChange = (pageId: string) => {
        console.log('[StartNodeForm] User selected page:', pageId);
        setSelectedPageId(pageId);
        setIsDropdownOpen(false);
        // Notify parent to sync header dropdown
        if (onPageChange) {
            onPageChange(pageId);
        }
    };

    const addKeyword = () => {
        setKeywords([...keywords, '']);
    };

    const removeKeyword = (index: number) => {
        setKeywords(keywords.filter((_, i) => i !== index));
    };

    const updateKeyword = (index: number, value: string) => {
        const newKeywords = [...keywords];
        newKeywords[index] = value;
        setKeywords(newKeywords);
    };

    const handleMatchTypeChange = (type: 'exact' | 'contains') => {
        setMatchType(type);
    };

    const selectedPage = pages.find(p => p.id === selectedPageId);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
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
                    className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors text-sm font-medium"
                >
                    Go to Pages
                </a>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Page Selection Dropdown */}
            <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                    <Facebook className="w-4 h-4 inline mr-2" />
                    Select Facebook Page
                </label>
                <div className="relative" ref={dropdownRef}>
                    {/* Custom Dropdown Trigger */}
                    <button
                        type="button"
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className="w-full flex items-center gap-3 bg-black/20 border border-white/10 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-transparent transition-all cursor-pointer hover:border-emerald-500/30"
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
                                    onClick={() => handlePageChange(page.id)}
                                    className={`w-full flex items-center gap-3 p-3 hover:bg-white/5 transition-colors ${selectedPageId === page.id ? 'bg-emerald-500/20' : ''
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
                                        <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0">
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
            </div>

            {/* Match Type */}
            <div>
                <label className="block text-sm font-semibold text-slate-300 mb-3">
                    Keyword Match Type
                </label>
                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={() => handleMatchTypeChange('exact')}
                        className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${matchType === 'exact'
                            ? 'bg-emerald-500 text-white'
                            : 'bg-white/5 text-slate-400 hover:bg-white/10'
                            }`}
                    >
                        Exact Match
                    </button>
                    <button
                        type="button"
                        onClick={() => handleMatchTypeChange('contains')}
                        className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${matchType === 'contains'
                            ? 'bg-emerald-500 text-white'
                            : 'bg-white/5 text-slate-400 hover:bg-white/10'
                            }`}
                    >
                        Contains
                    </button>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                    {matchType === 'exact'
                        ? 'Button payload must exactly match keyword (case-insensitive)'
                        : 'Button payload contains keyword (case-insensitive)'}
                </p>
            </div>

            {/* Keywords */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-semibold text-slate-300">
                        <Play className="w-4 h-4 inline mr-2" />
                        Trigger Keywords
                    </label>
                    <button
                        type="button"
                        onClick={addKeyword}
                        className="px-3 py-1 bg-emerald-500 text-white text-xs rounded-lg hover:bg-emerald-600 flex items-center gap-1"
                    >
                        <Plus className="w-3 h-3" />
                        Add Keyword
                    </button>
                </div>

                <div className="space-y-3">
                    {keywords.map((keyword, index) => (
                        <div key={index} className="flex gap-2">
                            <input
                                type="text"
                                value={keyword}
                                onChange={(e) => updateKeyword(index, e.target.value)}
                                placeholder="e.g., pricing, get_started, HELP"
                                className="flex-1 bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-emerald-500/50 outline-none"
                            />
                            {keywords.length > 1 && (
                                <button
                                    type="button"
                                    onClick={() => removeKeyword(index)}
                                    className="w-8 h-8 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 flex items-center justify-center"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Info */}
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                <p className="text-sm text-emerald-300">
                    <strong>Start Node:</strong> This flow will be triggered when a user sends a message or clicks a button matching the keywords
                    {selectedPage && <span> on <strong>{selectedPage.name}</strong></span>}.
                </p>
            </div>
        </div>
    );
};

export default StartNodeForm;
