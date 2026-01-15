import React, { useState, useEffect } from 'react';
import { X, Lightbulb, Sparkles, Plus, Tag, Trash2, Info } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { TopicGeneratorConfig } from '../../types';

interface TopicGeneratorFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (config: TopicGeneratorConfig) => void;
    initialConfig?: Partial<TopicGeneratorConfig>;
    hasOpenAiKey?: boolean;
    hasGeminiKey?: boolean;
}

const TONES = [
    { value: 'professional', label: 'Professional', emoji: '💼' },
    { value: 'casual', label: 'Casual', emoji: '😊' },
    { value: 'humorous', label: 'Humorous', emoji: '😄' },
    { value: 'inspirational', label: 'Inspirational', emoji: '✨' },
];

const SAMPLE_NICHES = [
    'Fitness & Health', 'Technology', 'Food & Cooking', 'Travel',
    'Fashion', 'Business', 'Education', 'Entertainment'
];

const TopicGeneratorForm: React.FC<TopicGeneratorFormProps> = ({
    isOpen,
    onClose,
    onSave,
    initialConfig,
    hasOpenAiKey = false,
    hasGeminiKey = false
}) => {
    const { isDark } = useTheme();
    const [newTopic, setNewTopic] = useState('');

    const [config, setConfig] = useState<TopicGeneratorConfig>({
        aiProvider: hasOpenAiKey ? 'openai' : hasGeminiKey ? 'gemini' : 'openai',
        seedTopics: [],
        tone: 'professional',
        niche: '',
        avoidDuplicates: true,
        ...initialConfig
    });

    useEffect(() => {
        if (initialConfig) {
            setConfig(prev => ({ ...prev, ...initialConfig }));
        }
    }, [initialConfig]);

    const handleAddTopic = () => {
        if (newTopic.trim() && !config.seedTopics.includes(newTopic.trim())) {
            setConfig({ ...config, seedTopics: [...config.seedTopics, newTopic.trim()] });
            setNewTopic('');
        }
    };

    const handleRemoveTopic = (topic: string) => {
        setConfig({ ...config, seedTopics: config.seedTopics.filter(t => t !== topic) });
    };

    const handleSave = () => {
        onSave(config);
        onClose();
    };

    if (!isOpen) return null;

    const inputClasses = `w-full rounded-xl px-4 py-3 outline-none transition-all focus:ring-2 focus:ring-indigo-500/50 ${isDark
        ? 'bg-black/30 border border-white/10 text-white placeholder-slate-500'
        : 'bg-white border border-slate-200 text-slate-900 placeholder-slate-400'
        }`;

    const labelClasses = `block text-sm font-semibold mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`;

    const noApiKeysConfigured = !hasOpenAiKey && !hasGeminiKey;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className={`w-full max-w-lg rounded-2xl shadow-2xl border overflow-hidden animate-fade-in ${isDark
                ? 'bg-slate-900 border-white/10'
                : 'bg-white border-slate-200'
                }`}>
                {/* Header */}
                <div className={`flex items-center justify-between p-6 border-b ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600">
                            <Lightbulb className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Topic Generator</h2>
                            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Configure AI topic generation</p>
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
                    {/* API Key Warning */}
                    {noApiKeysConfigured && (
                        <div className={`p-4 rounded-xl border ${isDark ? 'bg-amber-500/10 border-amber-500/20' : 'bg-amber-50 border-amber-200'}`}>
                            <p className={`text-sm font-medium flex items-center gap-2 ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>
                                <Info className="w-4 h-4" />
                                No AI API keys configured
                            </p>
                            <p className={`mt-1 text-sm ${isDark ? 'text-amber-200/70' : 'text-amber-600'}`}>
                                Go to Settings → AI API Keys to add your OpenAI or Gemini API key.
                            </p>
                        </div>
                    )}

                    {/* AI Provider Selection */}
                    <div>
                        <label className={labelClasses}>
                            <Sparkles className="w-4 h-4 inline mr-2" />
                            AI Provider
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setConfig({ ...config, aiProvider: 'openai' })}
                                disabled={!hasOpenAiKey}
                                className={`px-4 py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${config.aiProvider === 'openai'
                                        ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg'
                                        : isDark
                                            ? 'bg-white/5 text-slate-300 hover:bg-white/10 border border-white/10'
                                            : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
                                    } ${!hasOpenAiKey ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                OpenAI
                                {!hasOpenAiKey && <span className="text-xs opacity-70">(No Key)</span>}
                            </button>
                            <button
                                onClick={() => setConfig({ ...config, aiProvider: 'gemini' })}
                                disabled={!hasGeminiKey}
                                className={`px-4 py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${config.aiProvider === 'gemini'
                                        ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg'
                                        : isDark
                                            ? 'bg-white/5 text-slate-300 hover:bg-white/10 border border-white/10'
                                            : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
                                    } ${!hasGeminiKey ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                Gemini
                                {!hasGeminiKey && <span className="text-xs opacity-70">(No Key)</span>}
                            </button>
                        </div>
                    </div>

                    {/* Niche/Industry */}
                    <div>
                        <label className={labelClasses}>Niche / Industry</label>
                        <input
                            type="text"
                            value={config.niche || ''}
                            onChange={(e) => setConfig({ ...config, niche: e.target.value })}
                            placeholder="e.g., Fitness, Technology, Food..."
                            className={inputClasses}
                            list="niches"
                        />
                        <datalist id="niches">
                            {SAMPLE_NICHES.map(n => <option key={n} value={n} />)}
                        </datalist>
                    </div>

                    {/* Seed Topics */}
                    <div>
                        <label className={labelClasses}>
                            <Tag className="w-4 h-4 inline mr-2" />
                            Seed Topics (Keywords)
                        </label>
                        <div className="flex gap-2 mb-3">
                            <input
                                type="text"
                                value={newTopic}
                                onChange={(e) => setNewTopic(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddTopic()}
                                placeholder="Add a topic keyword..."
                                className={`flex-1 ${inputClasses}`}
                            />
                            <button
                                onClick={handleAddTopic}
                                className="px-4 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold hover:shadow-lg transition-all"
                            >
                                <Plus className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {config.seedTopics.map((topic) => (
                                <span
                                    key={topic}
                                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium ${isDark
                                        ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                                        : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                        }`}
                                >
                                    {topic}
                                    <button
                                        onClick={() => handleRemoveTopic(topic)}
                                        className="hover:text-red-500 transition-colors"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </span>
                            ))}
                            {config.seedTopics.length === 0 && (
                                <p className={`text-sm ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                    Add keywords to guide topic generation
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Tone Selection */}
                    <div>
                        <label className={labelClasses}>Tone</label>
                        <div className="grid grid-cols-2 gap-2">
                            {TONES.map((tone) => (
                                <button
                                    key={tone.value}
                                    onClick={() => setConfig({ ...config, tone: tone.value as any })}
                                    className={`px-4 py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${config.tone === tone.value
                                            ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg'
                                            : isDark
                                                ? 'bg-white/5 text-slate-300 hover:bg-white/10 border border-white/10'
                                                : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
                                        }`}
                                >
                                    <span>{tone.emoji}</span>
                                    {tone.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Avoid Duplicates Toggle */}
                    <div className={`flex items-center justify-between p-4 rounded-xl border ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'}`}>
                        <div>
                            <p className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Avoid Duplicate Topics</p>
                            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                Track previously generated topics to ensure uniqueness
                            </p>
                        </div>
                        <button
                            onClick={() => setConfig({ ...config, avoidDuplicates: !config.avoidDuplicates })}
                            className={`w-14 h-8 rounded-full transition-all relative ${config.avoidDuplicates
                                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600'
                                    : isDark ? 'bg-white/20' : 'bg-slate-300'
                                }`}
                        >
                            <div className={`w-6 h-6 rounded-full bg-white shadow-md absolute top-1 transition-all ${config.avoidDuplicates ? 'right-1' : 'left-1'
                                }`} />
                        </button>
                    </div>
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
                        disabled={noApiKeysConfigured}
                        className="px-6 py-3 rounded-xl font-bold bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/20 hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Save Configuration
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TopicGeneratorForm;
