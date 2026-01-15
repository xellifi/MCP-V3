import React, { useState, useEffect } from 'react';
import { X, PenTool, Sparkles, Hash, Smile, MessageSquare, Info } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { CaptionGeneratorConfig } from '../../types';

interface CaptionGeneratorFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (config: CaptionGeneratorConfig) => void;
    initialConfig?: Partial<CaptionGeneratorConfig>;
    hasOpenAiKey?: boolean;
    hasGeminiKey?: boolean;
}

const TONES = [
    { value: 'professional', label: 'Professional', emoji: '💼', description: 'Polished, business-appropriate tone' },
    { value: 'casual', label: 'Casual', emoji: '😊', description: 'Friendly, conversational style' },
    { value: 'humorous', label: 'Humorous', emoji: '😄', description: 'Light-hearted with wit' },
    { value: 'inspirational', label: 'Inspirational', emoji: '✨', description: 'Motivating and uplifting' },
];

const CaptionGeneratorForm: React.FC<CaptionGeneratorFormProps> = ({
    isOpen,
    onClose,
    onSave,
    initialConfig,
    hasOpenAiKey = false,
    hasGeminiKey = false
}) => {
    const { isDark } = useTheme();

    const [config, setConfig] = useState<CaptionGeneratorConfig>({
        aiProvider: hasOpenAiKey ? 'openai' : hasGeminiKey ? 'gemini' : 'openai',
        tone: 'professional',
        includeHashtags: true,
        hashtagCount: 5,
        includeEmojis: true,
        includeCTA: false,
        ctaText: '',
        maxLength: 280,
        ...initialConfig
    });

    useEffect(() => {
        if (initialConfig) {
            setConfig(prev => ({ ...prev, ...initialConfig }));
        }
    }, [initialConfig]);

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

    const ToggleSwitch = ({ enabled, onChange, label, description }: { enabled: boolean; onChange: () => void; label: string; description: string }) => (
        <div className={`flex items-center justify-between p-4 rounded-xl border ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'}`}>
            <div>
                <p className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{label}</p>
                <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{description}</p>
            </div>
            <button
                onClick={onChange}
                className={`w-14 h-8 rounded-full transition-all relative flex-shrink-0 ${enabled
                        ? 'bg-gradient-to-r from-teal-500 to-emerald-600'
                        : isDark ? 'bg-white/20' : 'bg-slate-300'
                    }`}
            >
                <div className={`w-6 h-6 rounded-full bg-white shadow-md absolute top-1 transition-all ${enabled ? 'right-1' : 'left-1'
                    }`} />
            </button>
        </div>
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className={`w-full max-w-lg rounded-2xl shadow-2xl border overflow-hidden animate-fade-in ${isDark
                ? 'bg-slate-900 border-white/10'
                : 'bg-white border-slate-200'
                }`}>
                {/* Header */}
                <div className={`flex items-center justify-between p-6 border-b ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600">
                            <PenTool className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Caption Writer</h2>
                            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Configure AI caption generation</p>
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
                                className={`px-4 py-3 rounded-xl font-semibold text-sm transition-all ${config.aiProvider === 'openai'
                                        ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg'
                                        : isDark
                                            ? 'bg-white/5 text-slate-300 hover:bg-white/10 border border-white/10'
                                            : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
                                    } ${!hasOpenAiKey ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                OpenAI GPT
                            </button>
                            <button
                                onClick={() => setConfig({ ...config, aiProvider: 'gemini' })}
                                disabled={!hasGeminiKey}
                                className={`px-4 py-3 rounded-xl font-semibold text-sm transition-all ${config.aiProvider === 'gemini'
                                        ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg'
                                        : isDark
                                            ? 'bg-white/5 text-slate-300 hover:bg-white/10 border border-white/10'
                                            : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
                                    } ${!hasGeminiKey ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                Gemini
                            </button>
                        </div>
                    </div>

                    {/* Tone Selection */}
                    <div>
                        <label className={labelClasses}>Caption Tone</label>
                        <div className="grid grid-cols-2 gap-2">
                            {TONES.map((tone) => (
                                <button
                                    key={tone.value}
                                    onClick={() => setConfig({ ...config, tone: tone.value as any })}
                                    className={`p-3 rounded-xl text-left transition-all ${config.tone === tone.value
                                            ? 'bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-lg'
                                            : isDark
                                                ? 'bg-white/5 hover:bg-white/10 border border-white/10'
                                                : 'bg-white hover:bg-slate-50 border border-slate-200'
                                        }`}
                                >
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-lg">{tone.emoji}</span>
                                        <span className={`font-bold text-sm ${config.tone === tone.value ? 'text-white' : isDark ? 'text-white' : 'text-slate-900'}`}>
                                            {tone.label}
                                        </span>
                                    </div>
                                    <p className={`text-xs ${config.tone === tone.value ? 'text-white/80' : isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                        {tone.description}
                                    </p>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Toggles */}
                    <div className="space-y-3">
                        <ToggleSwitch
                            enabled={config.includeHashtags}
                            onChange={() => setConfig({ ...config, includeHashtags: !config.includeHashtags })}
                            label="Include Hashtags"
                            description="Add relevant hashtags to increase reach"
                        />

                        {config.includeHashtags && (
                            <div className="pl-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                <label className={labelClasses}>
                                    <Hash className="w-4 h-4 inline mr-2" />
                                    Number of Hashtags
                                </label>
                                <input
                                    type="range"
                                    min={1}
                                    max={15}
                                    value={config.hashtagCount || 5}
                                    onChange={(e) => setConfig({ ...config, hashtagCount: parseInt(e.target.value) })}
                                    className="w-full accent-teal-500"
                                />
                                <div className="flex justify-between text-xs text-slate-400">
                                    <span>1</span>
                                    <span className={`font-bold ${isDark ? 'text-teal-400' : 'text-teal-600'}`}>{config.hashtagCount}</span>
                                    <span>15</span>
                                </div>
                            </div>
                        )}

                        <ToggleSwitch
                            enabled={config.includeEmojis}
                            onChange={() => setConfig({ ...config, includeEmojis: !config.includeEmojis })}
                            label="Include Emojis"
                            description="Add expressive emojis to the caption"
                        />

                        <ToggleSwitch
                            enabled={config.includeCTA}
                            onChange={() => setConfig({ ...config, includeCTA: !config.includeCTA })}
                            label="Include Call-to-Action"
                            description="Add a CTA at the end of caption"
                        />

                        {config.includeCTA && (
                            <div className="pl-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                <label className={labelClasses}>
                                    <MessageSquare className="w-4 h-4 inline mr-2" />
                                    CTA Text (optional)
                                </label>
                                <input
                                    type="text"
                                    value={config.ctaText || ''}
                                    onChange={(e) => setConfig({ ...config, ctaText: e.target.value })}
                                    placeholder="e.g., Comment below! or Link in bio"
                                    className={inputClasses}
                                />
                            </div>
                        )}
                    </div>

                    {/* Max Length */}
                    <div>
                        <label className={labelClasses}>Maximum Length (characters)</label>
                        <input
                            type="range"
                            min={100}
                            max={2200}
                            step={50}
                            value={config.maxLength || 280}
                            onChange={(e) => setConfig({ ...config, maxLength: parseInt(e.target.value) })}
                            className="w-full accent-teal-500"
                        />
                        <div className="flex justify-between text-xs text-slate-400">
                            <span>100</span>
                            <span className={`font-bold ${isDark ? 'text-teal-400' : 'text-teal-600'}`}>{config.maxLength} chars</span>
                            <span>2200</span>
                        </div>
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
                        className="px-6 py-3 rounded-xl font-bold bg-gradient-to-r from-teal-500 to-emerald-600 text-white shadow-lg shadow-teal-500/20 hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Save Configuration
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CaptionGeneratorForm;
