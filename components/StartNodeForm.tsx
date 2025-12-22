import React, { useState } from 'react';
import { Plus, X, Play } from 'lucide-react';

interface StartNodeFormProps {
    userId: string;
    initialConfig?: {
        keywords?: string[];
        matchType?: 'exact' | 'contains';
    };
    onChange: (config: any) => void;
}

const StartNodeForm: React.FC<StartNodeFormProps> = ({
    userId,
    initialConfig,
    onChange
}) => {
    const [keywords, setKeywords] = useState<string[]>(
        initialConfig?.keywords && initialConfig.keywords.length > 0
            ? initialConfig.keywords
            : ['']
    );
    const [matchType, setMatchType] = useState<'exact' | 'contains'>(
        initialConfig?.matchType || 'exact'
    );

    const notifyChange = (newKeywords: string[], newMatchType: 'exact' | 'contains') => {
        const validKeywords = newKeywords.filter(k => k.trim());
        onChange({ keywords: validKeywords, matchType: newMatchType });
    };

    const addKeyword = () => {
        const newKeywords = [...keywords, ''];
        setKeywords(newKeywords);
        notifyChange(newKeywords, matchType);
    };

    const removeKeyword = (index: number) => {
        const newKeywords = keywords.filter((_, i) => i !== index);
        setKeywords(newKeywords);
        notifyChange(newKeywords, matchType);
    };

    const updateKeyword = (index: number, value: string) => {
        const newKeywords = [...keywords];
        newKeywords[index] = value;
        setKeywords(newKeywords);
        notifyChange(newKeywords, matchType);
    };

    const handleMatchTypeChange = (type: 'exact' | 'contains') => {
        setMatchType(type);
        notifyChange(keywords, type);
    };

    return (
        <div className="space-y-6">
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
                    <strong>Start Node:</strong> This flow will be triggered when a user clicks a button with a matching keyword payload.
                </p>
            </div>
        </div>
    );
};

export default StartNodeForm;
