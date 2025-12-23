import React, { useState, useEffect } from 'react';
import { Plus, X, Play, Facebook, Loader2 } from 'lucide-react';
import { api } from '../services/api';
import { ConnectedPage } from '../types';

interface StartNodeFormProps {
    workspaceId: string;
    initialConfig?: {
        pageId?: string;
        keywords?: string[];
        matchType?: 'exact' | 'contains';
    };
    onChange: (config: any) => void;
}

const StartNodeForm: React.FC<StartNodeFormProps> = ({
    workspaceId,
    initialConfig,
    onChange
}) => {
    const [pages, setPages] = useState<ConnectedPage[]>([]);
    const [loadingPages, setLoadingPages] = useState(true);
    const [selectedPageId, setSelectedPageId] = useState<string>(initialConfig?.pageId || '');
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
            setLoadingPages(true);
            try {
                const pagesData = await api.workspace.getConnectedPages(workspaceId);
                // Filter to only show pages with automation enabled
                const activePages = pagesData.filter(p => p.isAutomationEnabled);
                setPages(activePages);

                // If there's an initial pageId, keep it; otherwise select first active page
                if (!initialConfig?.pageId && activePages.length > 0) {
                    setSelectedPageId(activePages[0].id);
                    notifyChange(activePages[0].id, keywords, matchType);
                }
            } catch (error) {
                console.error('Error fetching pages:', error);
            } finally {
                setLoadingPages(false);
            }
        };
        fetchPages();
    }, [workspaceId]);

    const notifyChange = (pageId: string, newKeywords: string[], newMatchType: 'exact' | 'contains') => {
        const validKeywords = newKeywords.filter(k => k.trim());
        onChange({ pageId, keywords: validKeywords, matchType: newMatchType });
    };

    const handlePageChange = (pageId: string) => {
        setSelectedPageId(pageId);
        notifyChange(pageId, keywords, matchType);
    };

    const addKeyword = () => {
        const newKeywords = [...keywords, ''];
        setKeywords(newKeywords);
        notifyChange(selectedPageId, newKeywords, matchType);
    };

    const removeKeyword = (index: number) => {
        const newKeywords = keywords.filter((_, i) => i !== index);
        setKeywords(newKeywords);
        notifyChange(selectedPageId, newKeywords, matchType);
    };

    const updateKeyword = (index: number, value: string) => {
        const newKeywords = [...keywords];
        newKeywords[index] = value;
        setKeywords(newKeywords);
        notifyChange(selectedPageId, newKeywords, matchType);
    };

    const handleMatchTypeChange = (type: 'exact' | 'contains') => {
        setMatchType(type);
        notifyChange(selectedPageId, keywords, type);
    };

    const selectedPage = pages.find(p => p.id === selectedPageId);

    return (
        <div className="space-y-6">
            {/* Page Selection */}
            <div>
                <label className="block text-sm font-semibold text-slate-300 mb-3">
                    <Facebook className="w-4 h-4 inline mr-2" />
                    Select Facebook Page
                </label>

                {loadingPages ? (
                    <div className="flex items-center gap-2 text-slate-400 py-4">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm">Loading pages...</span>
                    </div>
                ) : pages.length === 0 ? (
                    <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                        <p className="text-sm text-amber-300">
                            No active pages found. Please enable automation on at least one Facebook page in the Pages section.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {pages.map(page => (
                            <button
                                key={page.id}
                                type="button"
                                onClick={() => handlePageChange(page.id)}
                                className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${selectedPageId === page.id
                                        ? 'bg-blue-500/20 border-blue-500/50'
                                        : 'bg-white/5 border-white/10 hover:border-white/20'
                                    }`}
                            >
                                <img
                                    src={page.pageImageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(page.name)}&background=1877F2&color=fff`}
                                    alt={page.name}
                                    className="w-10 h-10 rounded-full object-cover border-2 border-blue-500/30"
                                />
                                <div className="flex-1">
                                    <span className="text-sm font-medium text-white">{page.name}</span>
                                    <div className="text-xs text-slate-500">Facebook Page</div>
                                </div>
                                {selectedPageId === page.id && (
                                    <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
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
                        ? 'Button payload must exactly match keyword'
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
                                placeholder="e.g., PRICING, GET_STARTED, HELP"
                                className="flex-1 bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-emerald-500/50 outline-none uppercase"
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
                    <strong>Start Node:</strong> This flow will be triggered when a user clicks a button with a matching keyword payload
                    {selectedPage && <span> on <strong>{selectedPage.name}</strong></span>}.
                </p>
            </div>
        </div>
    );
};

export default StartNodeForm;

