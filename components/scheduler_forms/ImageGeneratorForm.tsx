import React, { useState, useEffect } from 'react';
import { X, ImagePlus, Sparkles, Info } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { ImageGeneratorConfig } from '../../types';

interface ImageGeneratorFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (config: ImageGeneratorConfig) => void;
    initialConfig?: Partial<ImageGeneratorConfig>;
    hasOpenAiKey?: boolean;
    hasGeminiKey?: boolean;
}

const SIZE_PRESETS = [
    { value: '1080x1080', label: 'Square', dimensions: '1080 × 1080', description: 'Instagram Feed, Facebook Post', icon: '⬜' },
    { value: '1200x628', label: 'Landscape', dimensions: '1200 × 628', description: 'Facebook Link Preview', icon: '🖼️' },
    { value: '1080x1920', label: 'Portrait', dimensions: '1080 × 1920', description: 'Stories, Reels', icon: '📱' },
    { value: 'custom', label: 'Custom', dimensions: 'Custom size', description: 'Set your own dimensions', icon: '⚙️' },
];

const STYLES = [
    { value: 'photorealistic', label: 'Photorealistic', emoji: '📷' },
    { value: 'illustration', label: 'Illustration', emoji: '🎨' },
    { value: '3d', label: '3D Render', emoji: '🎮' },
    { value: 'cartoon', label: 'Cartoon', emoji: '🖍️' },
    { value: 'minimal', label: 'Minimal', emoji: '⚪' },
];

const ImageGeneratorForm: React.FC<ImageGeneratorFormProps> = ({
    isOpen,
    onClose,
    onSave,
    initialConfig,
    hasOpenAiKey = false,
    hasGeminiKey = false
}) => {
    const { isDark } = useTheme();

    const [config, setConfig] = useState<ImageGeneratorConfig>({
        aiProvider: hasOpenAiKey ? 'openai' : hasGeminiKey ? 'gemini' : 'openai',
        mediaType: 'image',
        size: '1080x1080',
        style: 'photorealistic',
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

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className={`w-full max-w-lg rounded-2xl shadow-2xl border overflow-hidden animate-fade-in ${isDark
                ? 'bg-slate-900 border-white/10'
                : 'bg-white border-slate-200'
                }`}>
                {/* Header */}
                <div className={`flex items-center justify-between p-6 border-b ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600">
                            <ImagePlus className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Image Generator</h2>
                            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Configure AI image generation</p>
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
                                className={`px-4 py-3 rounded-xl font-semibold text-sm transition-all flex flex-col items-center gap-1 ${config.aiProvider === 'openai'
                                        ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg'
                                        : isDark
                                            ? 'bg-white/5 text-slate-300 hover:bg-white/10 border border-white/10'
                                            : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
                                    } ${!hasOpenAiKey ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                <span className="font-bold">OpenAI DALL-E</span>
                                <span className="text-xs opacity-70">High quality images</span>
                            </button>
                            <button
                                onClick={() => setConfig({ ...config, aiProvider: 'gemini' })}
                                disabled={!hasGeminiKey}
                                className={`px-4 py-3 rounded-xl font-semibold text-sm transition-all flex flex-col items-center gap-1 ${config.aiProvider === 'gemini'
                                        ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg'
                                        : isDark
                                            ? 'bg-white/5 text-slate-300 hover:bg-white/10 border border-white/10'
                                            : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
                                    } ${!hasGeminiKey ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                <span className="font-bold">Gemini Imagen</span>
                                <span className="text-xs opacity-70">Google AI images</span>
                            </button>
                        </div>
                    </div>

                    {/* Size Selection */}
                    <div>
                        <label className={labelClasses}>Image Size</label>
                        <div className="grid grid-cols-2 gap-3">
                            {SIZE_PRESETS.map((size) => (
                                <button
                                    key={size.value}
                                    onClick={() => setConfig({ ...config, size: size.value as any })}
                                    className={`p-4 rounded-xl text-left transition-all ${config.size === size.value
                                            ? 'bg-gradient-to-br from-pink-500 to-rose-600 text-white shadow-lg'
                                            : isDark
                                                ? 'bg-white/5 hover:bg-white/10 border border-white/10'
                                                : 'bg-white hover:bg-slate-50 border border-slate-200'
                                        }`}
                                >
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xl">{size.icon}</span>
                                        <span className={`font-bold ${config.size === size.value ? 'text-white' : isDark ? 'text-white' : 'text-slate-900'}`}>
                                            {size.label}
                                        </span>
                                    </div>
                                    <p className={`text-xs ${config.size === size.value ? 'text-white/90' : isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                        {size.dimensions}
                                    </p>
                                    <p className={`text-xs mt-0.5 ${config.size === size.value ? 'text-white/70' : isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                        {size.description}
                                    </p>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Custom Size */}
                    {config.size === 'custom' && (
                        <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
                            <div>
                                <label className={labelClasses}>Width (px)</label>
                                <input
                                    type="number"
                                    value={config.customWidth || 1080}
                                    onChange={(e) => setConfig({ ...config, customWidth: parseInt(e.target.value) })}
                                    min={256}
                                    max={4096}
                                    className={inputClasses}
                                />
                            </div>
                            <div>
                                <label className={labelClasses}>Height (px)</label>
                                <input
                                    type="number"
                                    value={config.customHeight || 1080}
                                    onChange={(e) => setConfig({ ...config, customHeight: parseInt(e.target.value) })}
                                    min={256}
                                    max={4096}
                                    className={inputClasses}
                                />
                            </div>
                        </div>
                    )}

                    {/* Style Selection */}
                    <div>
                        <label className={labelClasses}>Image Style</label>
                        <div className="flex flex-wrap gap-2">
                            {STYLES.map((style) => (
                                <button
                                    key={style.value}
                                    onClick={() => setConfig({ ...config, style: style.value as any })}
                                    className={`px-4 py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center gap-2 ${config.style === style.value
                                            ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg'
                                            : isDark
                                                ? 'bg-white/5 text-slate-300 hover:bg-white/10 border border-white/10'
                                                : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
                                        }`}
                                >
                                    <span>{style.emoji}</span>
                                    {style.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Preview Info */}
                    <div className={`p-4 rounded-xl border ${isDark ? 'bg-pink-500/10 border-pink-500/20' : 'bg-pink-50 border-pink-100'}`}>
                        <p className={`text-sm font-medium ${isDark ? 'text-pink-300' : 'text-pink-700'}`}>
                            <ImagePlus className="w-4 h-4 inline mr-2" />
                            Image will be generated based on the topic from the previous node
                        </p>
                        <p className={`mt-1 text-sm ${isDark ? 'text-pink-200/70' : 'text-pink-600'}`}>
                            Size: {config.size === 'custom' ? `${config.customWidth || 1080} × ${config.customHeight || 1080}` : SIZE_PRESETS.find(s => s.value === config.size)?.dimensions}
                            {' • '}
                            Style: {STYLES.find(s => s.value === config.style)?.label}
                        </p>
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
                        className="px-6 py-3 rounded-xl font-bold bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-lg shadow-pink-500/20 hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Save Configuration
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ImageGeneratorForm;
