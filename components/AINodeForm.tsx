import React, { useState, useEffect, useRef, memo, useCallback } from 'react';
import {
    Bot, Sparkles, Brain, MessageCircle, Settings, Database, Image as ImageIcon,
    Video, AlertCircle, ChevronDown, ChevronUp, X, Save, Eye, Smartphone, Monitor,
    Tablet, HelpCircle, Zap, MessageSquare, RotateCcw, Sliders, Target, Shield
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AIProvider {
    id: 'openai' | 'gemini';
    name: string;
    logo: string;
    available: boolean;
    models: { id: string; name: string; description: string }[];
}

interface AINodeFormProps {
    workspaceId: string;
    initialConfig?: {
        enabled?: boolean;
        provider?: 'openai' | 'gemini';
        model?: string;
        instructions?: string;
        memoryLines?: number;
        triggerOn?: 'no_match' | 'always' | 'keyword';
        triggerKeywords?: string[];
        fallbackMessage?: string;
        allowMedia?: boolean;
        temperature?: number;
        maxTokens?: number;
        scope?: string[];
        nodeLabel?: string;
    };
    onChange: (config: any) => void;
    onClose?: () => void;
}

const AI_PROVIDERS: AIProvider[] = [
    {
        id: 'openai',
        name: 'OpenAI',
        logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/ChatGPT_logo.svg/512px-ChatGPT_logo.svg.png',
        available: false,
        models: [
            { id: 'gpt-4o', name: 'GPT-4o', description: 'Most capable, best for complex tasks' },
            { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Fast and cost-effective' },
            { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', description: 'Legacy, good for simple tasks' }
        ]
    },
    {
        id: 'gemini',
        name: 'Google Gemini',
        logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Google_Gemini_logo.svg/512px-Google_Gemini_logo.svg.png',
        available: false,
        models: [
            { id: 'gemini-pro', name: 'Gemini Pro', description: 'Balanced performance' },
            { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', description: 'Fast responses' }
        ]
    }
];

const PRESET_COLORS = [
    '#dc2626', '#ea580c', '#ca8a04', '#16a34a', '#0891b2',
    '#2563eb', '#7c3aed', '#db2777', '#1f2937', '#ffffff',
];

// Collapsible Section Component
const CollapsibleSection = memo(({
    title,
    icon: Icon,
    children,
    defaultOpen = true,
    badge
}: {
    title: string;
    icon?: React.ElementType;
    children: React.ReactNode;
    defaultOpen?: boolean;
    badge?: string;
}) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="bg-black/20 rounded-xl overflow-hidden border border-white/5">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
            >
                <div className="flex items-center gap-2">
                    {Icon && <Icon className="w-4 h-4 text-indigo-400" />}
                    <span className="text-sm font-semibold text-white">{title}</span>
                    {badge && (
                        <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 text-xs rounded-full">{badge}</span>
                    )}
                </div>
                {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
            </button>
            {isOpen && (
                <div className="px-4 pb-4 space-y-4 border-t border-white/5">
                    {children}
                </div>
            )}
        </div>
    );
});
CollapsibleSection.displayName = 'CollapsibleSection';

// Toggle Component
const Toggle = memo(({ value, onChange, label, description }: {
    value: boolean;
    onChange: (v: boolean) => void;
    label: string;
    description?: string;
}) => (
    <div className="flex items-start justify-between gap-4">
        <div>
            <label className="text-sm font-medium text-slate-300">{label}</label>
            {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
        </div>
        <button
            type="button"
            onClick={() => onChange(!value)}
            className={`w-12 h-6 rounded-full transition-all flex-shrink-0 ${value ? 'bg-indigo-500' : 'bg-slate-600'}`}
        >
            <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-6' : 'translate-x-0.5'}`} />
        </button>
    </div>
));
Toggle.displayName = 'Toggle';

// Slider Component
const Slider = memo(({ value, onChange, min, max, step, label, description, suffix }: {
    value: number;
    onChange: (v: number) => void;
    min: number;
    max: number;
    step?: number;
    label: string;
    description?: string;
    suffix?: string;
}) => (
    <div className="space-y-2">
        <div className="flex items-center justify-between">
            <div>
                <label className="text-sm font-medium text-slate-300">{label}</label>
                {description && <p className="text-xs text-slate-500">{description}</p>}
            </div>
            <span className="text-sm font-mono text-indigo-400">{value}{suffix}</span>
        </div>
        <input
            type="range"
            min={min}
            max={max}
            step={step || 1}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
        />
    </div>
));
Slider.displayName = 'Slider';

const AINodeForm: React.FC<AINodeFormProps> = ({
    workspaceId,
    initialConfig,
    onChange,
    onClose
}) => {
    // State
    const [enabled, setEnabled] = useState(initialConfig?.enabled ?? true);
    const [provider, setProvider] = useState<'openai' | 'gemini'>(initialConfig?.provider || 'openai');
    const [model, setModel] = useState(initialConfig?.model || 'gpt-4o-mini');
    const [instructions, setInstructions] = useState(initialConfig?.instructions || '');
    const [memoryLines, setMemoryLines] = useState(initialConfig?.memoryLines ?? 20);
    const [triggerOn, setTriggerOn] = useState<'no_match' | 'always' | 'keyword'>(initialConfig?.triggerOn || 'no_match');
    const [triggerKeywords, setTriggerKeywords] = useState<string[]>(initialConfig?.triggerKeywords || []);
    const [fallbackMessage, setFallbackMessage] = useState(initialConfig?.fallbackMessage || 'Sorry, I couldn\'t process your request. Please try again later.');
    const [allowMedia, setAllowMedia] = useState(initialConfig?.allowMedia ?? false);
    const [temperature, setTemperature] = useState(initialConfig?.temperature ?? 0.7);
    const [maxTokens, setMaxTokens] = useState(initialConfig?.maxTokens ?? 500);
    const [scope, setScope] = useState<string[]>(initialConfig?.scope || []);
    const [nodeLabel, setNodeLabel] = useState(initialConfig?.nodeLabel || 'AI Agent');

    // UI State
    const [availableProviders, setAvailableProviders] = useState<AIProvider[]>(AI_PROVIDERS);
    const [loadingProviders, setLoadingProviders] = useState(true);
    const [previewDevice, setPreviewDevice] = useState<'mobile' | 'tablet' | 'desktop'>('mobile');
    const [previewMessages, setPreviewMessages] = useState<Array<{ role: 'user' | 'ai'; content: string }>>([
        { role: 'user', content: 'Hi! Do you have any discounts?' },
        { role: 'ai', content: 'Hello! Yes, we currently have a 20% off sale on all items. Would you like me to help you find something?' }
    ]);
    const [testInput, setTestInput] = useState('');
    const [newKeyword, setNewKeyword] = useState('');
    const [newScope, setNewScope] = useState('');
    const [saveNotification, setSaveNotification] = useState(false);

    // Fetch available providers
    useEffect(() => {
        fetchAvailableProviders();
    }, [workspaceId]);

    const fetchAvailableProviders = async () => {
        setLoadingProviders(true);
        try {
            // First try workspace settings
            const { data: workspaceSettings } = await supabase
                .from('workspace_settings')
                .select('openai_api_key, gemini_api_key')
                .eq('workspace_id', workspaceId)
                .single();

            // Also get admin settings as fallback
            const { data: adminSettings } = await supabase
                .from('admin_settings')
                .select('openai_api_key, gemini_api_key')
                .eq('id', 1)
                .single();

            const providers = AI_PROVIDERS.map(p => {
                let available = false;
                if (p.id === 'openai') {
                    available = !!(workspaceSettings?.openai_api_key || adminSettings?.openai_api_key);
                } else if (p.id === 'gemini') {
                    available = !!(workspaceSettings?.gemini_api_key || adminSettings?.gemini_api_key);
                }
                return { ...p, available };
            });

            setAvailableProviders(providers);

            // If current provider not available, switch to first available
            const currentAvailable = providers.find(p => p.id === provider)?.available;
            if (!currentAvailable) {
                const firstAvailable = providers.find(p => p.available);
                if (firstAvailable) {
                    setProvider(firstAvailable.id);
                    setModel(firstAvailable.models[0].id);
                }
            }
        } catch (error) {
            console.error('Error fetching AI providers:', error);
        } finally {
            setLoadingProviders(false);
        }
    };

    // Notify parent of changes
    const notifyChange = useCallback((updates: Partial<typeof initialConfig> = {}) => {
        onChange({
            enabled,
            provider,
            model,
            instructions,
            memoryLines,
            triggerOn,
            triggerKeywords,
            fallbackMessage,
            allowMedia,
            temperature,
            maxTokens,
            scope,
            nodeLabel,
            ...updates
        });
    }, [enabled, provider, model, instructions, memoryLines, triggerOn, triggerKeywords, fallbackMessage, allowMedia, temperature, maxTokens, scope, nodeLabel, onChange]);

    // Handlers
    const handleProviderChange = (p: 'openai' | 'gemini') => {
        setProvider(p);
        const providerData = availableProviders.find(x => x.id === p);
        const newModel = providerData?.models[0].id || '';
        setModel(newModel);
        notifyChange({ provider: p, model: newModel });
    };

    const handleAddKeyword = () => {
        if (newKeyword.trim() && !triggerKeywords.includes(newKeyword.trim())) {
            const updated = [...triggerKeywords, newKeyword.trim()];
            setTriggerKeywords(updated);
            setNewKeyword('');
            notifyChange({ triggerKeywords: updated });
        }
    };

    const handleRemoveKeyword = (kw: string) => {
        const updated = triggerKeywords.filter(k => k !== kw);
        setTriggerKeywords(updated);
        notifyChange({ triggerKeywords: updated });
    };

    const handleAddScope = () => {
        if (newScope.trim() && !scope.includes(newScope.trim())) {
            const updated = [...scope, newScope.trim()];
            setScope(updated);
            setNewScope('');
            notifyChange({ scope: updated });
        }
    };

    const handleRemoveScope = (s: string) => {
        const updated = scope.filter(x => x !== s);
        setScope(updated);
        notifyChange({ scope: updated });
    };

    const handleSave = () => {
        notifyChange();
        setSaveNotification(true);
        setTimeout(() => setSaveNotification(false), 2000);
    };

    const hasAvailableProviders = availableProviders.some(p => p.available);
    const currentProviderData = availableProviders.find(p => p.id === provider);

    // Device sizes for preview
    const deviceSizes = {
        mobile: { width: 280, height: 480, radius: 40, notch: true },
        tablet: { width: 340, height: 440, radius: 24, notch: false },
        desktop: { width: 400, height: 280, radius: 8, notch: false }
    };

    // Preview Component
    const DevicePreview = () => {
        const size = deviceSizes[previewDevice];

        return (
            <div className="flex flex-col items-center">
                <div className="relative" style={{ width: size.width, height: size.height }}>
                    <div
                        className={`w-full h-full shadow-2xl border-4 flex flex-col ${previewDevice === 'desktop' ? 'bg-slate-200 border-slate-400' : 'bg-slate-900 border-slate-700'}`}
                        style={{ borderRadius: size.radius }}
                    >
                        {/* Notch */}
                        {size.notch && (
                            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-20 h-5 bg-black rounded-full z-10" />
                        )}

                        {/* Screen */}
                        <div
                            className={`w-full h-full overflow-hidden flex flex-col ${previewDevice === 'desktop' ? 'bg-white' : 'bg-gradient-to-b from-slate-800 to-slate-900'}`}
                            style={{ borderRadius: Math.max(size.radius - 6, 4) }}
                        >
                            {/* Header */}
                            <div className={`h-12 flex-shrink-0 flex items-center px-4 gap-3 ${previewDevice === 'desktop' ? 'bg-slate-100 border-b border-slate-200' : 'bg-slate-800 border-b border-white/10'}`}>
                                <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
                                    <Bot className="w-4 h-4 text-white" />
                                </div>
                                <div>
                                    <p className={`text-sm font-semibold ${previewDevice === 'desktop' ? 'text-slate-800' : 'text-white'}`}>{nodeLabel || 'AI Agent'}</p>
                                    <p className={`text-[10px] ${previewDevice === 'desktop' ? 'text-slate-500' : 'text-slate-400'}`}>Usually replies instantly</p>
                                </div>
                            </div>

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto p-3 space-y-3">
                                {previewMessages.map((msg, i) => (
                                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-xs ${msg.role === 'user'
                                            ? 'bg-indigo-500 text-white rounded-br-md'
                                            : previewDevice === 'desktop'
                                                ? 'bg-slate-200 text-slate-800 rounded-bl-md'
                                                : 'bg-slate-700 text-white rounded-bl-md'
                                            }`}>
                                            {msg.content}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Input */}
                            <div className={`h-12 flex-shrink-0 flex items-center px-3 gap-2 ${previewDevice === 'desktop' ? 'bg-slate-100 border-t border-slate-200' : 'bg-slate-800 border-t border-white/10'}`}>
                                <input
                                    type="text"
                                    value={testInput}
                                    onChange={(e) => setTestInput(e.target.value)}
                                    placeholder="Type a message..."
                                    className={`flex-1 text-xs bg-transparent outline-none ${previewDevice === 'desktop' ? 'text-slate-800 placeholder-slate-400' : 'text-white placeholder-slate-500'}`}
                                />
                                <button className="w-7 h-7 bg-indigo-500 rounded-full flex items-center justify-center">
                                    <MessageSquare className="w-3 h-3 text-white" />
                                </button>
                            </div>

                            {/* Home indicator */}
                            {size.notch && (
                                <div className="h-4 flex-shrink-0 flex items-center justify-center">
                                    <div className="w-20 h-1 bg-white/30 rounded-full" />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 flex-shrink-0">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                        <Bot className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-white">AI Agent Configuration</h1>
                        <p className="text-sm text-slate-400">Configure your intelligent assistant</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {saveNotification && (
                        <span className="px-3 py-1 bg-green-500/20 text-green-400 text-sm rounded-lg animate-in fade-in">
                            ✓ Saved
                        </span>
                    )}
                    <button
                        onClick={handleSave}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-400 text-white rounded-xl font-medium transition-all"
                    >
                        <Save className="w-4 h-4" />
                        Save
                    </button>
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    )}
                </div>
            </div>

            {/* Main Content - 3 Columns */}
            <div className="flex-1 overflow-hidden flex">
                {/* Left Column - AI Settings */}
                <div className="w-1/3 border-r border-white/10 overflow-y-auto p-6 space-y-4">
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Settings className="w-5 h-5 text-indigo-400" />
                        AI Configuration
                    </h2>

                    {/* Enable Toggle */}
                    <div className="p-4 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-xl">
                        <Toggle
                            value={enabled}
                            onChange={(v) => { setEnabled(v); notifyChange({ enabled: v }); }}
                            label="Enable AI Agent"
                            description="Turn on/off AI responses for this flow"
                        />
                    </div>

                    {/* Node Label */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Agent Name</label>
                        <input
                            type="text"
                            value={nodeLabel}
                            onChange={(e) => { setNodeLabel(e.target.value); notifyChange({ nodeLabel: e.target.value }); }}
                            placeholder="AI Agent"
                            className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:ring-2 focus:ring-indigo-500/50 outline-none"
                        />
                    </div>

                    {/* Provider Selection */}
                    <CollapsibleSection title="AI Provider" icon={Sparkles} defaultOpen={true}>
                        {loadingProviders ? (
                            <div className="flex items-center justify-center py-4">
                                <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                                <span className="ml-2 text-sm text-slate-400">Loading providers...</span>
                            </div>
                        ) : !hasAvailableProviders ? (
                            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm text-amber-300 font-medium">No AI Providers Configured</p>
                                    <p className="text-xs text-amber-400/70 mt-1">
                                        Please add your OpenAI or Gemini API keys in Settings.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-2 gap-3">
                                    {availableProviders.map((p) => (
                                        <button
                                            key={p.id}
                                            type="button"
                                            onClick={() => p.available && handleProviderChange(p.id)}
                                            disabled={!p.available}
                                            className={`relative p-3 rounded-xl border-2 transition-all ${!p.available
                                                ? 'opacity-40 cursor-not-allowed bg-black/10 border-white/5'
                                                : provider === p.id
                                                    ? 'bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border-indigo-500'
                                                    : 'bg-black/20 border-white/10 hover:border-white/30'
                                                }`}
                                        >
                                            <div className="flex flex-col items-center gap-2">
                                                <div className="w-8 h-8 rounded-lg overflow-hidden bg-white p-1 flex items-center justify-center">
                                                    <img src={p.logo} alt={p.name} className="w-full h-full object-contain" />
                                                </div>
                                                <span className="text-xs font-medium text-white">{p.name}</span>
                                                {!p.available && <span className="text-[10px] text-slate-500">Not configured</span>}
                                            </div>
                                            {provider === p.id && p.available && (
                                                <div className="absolute top-2 right-2 w-2 h-2 bg-green-500 rounded-full" />
                                            )}
                                        </button>
                                    ))}
                                </div>

                                {/* Model Selection */}
                                {currentProviderData && currentProviderData.available && (
                                    <div className="mt-4">
                                        <label className="block text-xs font-medium text-slate-400 mb-2">Model</label>
                                        <div className="space-y-2">
                                            {currentProviderData.models.map((m) => (
                                                <button
                                                    key={m.id}
                                                    type="button"
                                                    onClick={() => { setModel(m.id); notifyChange({ model: m.id }); }}
                                                    className={`w-full p-3 rounded-lg text-left transition-all ${model === m.id
                                                        ? 'bg-indigo-500/20 border-2 border-indigo-500'
                                                        : 'bg-black/20 border border-white/10 hover:border-white/20'
                                                        }`}
                                                >
                                                    <p className={`text-sm font-medium ${model === m.id ? 'text-indigo-300' : 'text-white'}`}>{m.name}</p>
                                                    <p className="text-xs text-slate-500">{m.description}</p>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </CollapsibleSection>

                    {/* Instructions */}
                    <CollapsibleSection title="Instructions" icon={Brain} defaultOpen={true}>
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-2">System Instructions</label>
                            <textarea
                                value={instructions}
                                onChange={(e) => { setInstructions(e.target.value); notifyChange({ instructions: e.target.value }); }}
                                placeholder="You are a helpful sales assistant. Be friendly and informative. Help customers with product inquiries, pricing, and ordering..."
                                rows={6}
                                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:ring-2 focus:ring-indigo-500/50 outline-none resize-none"
                            />
                            <p className="text-xs text-slate-500 mt-2">
                                Tell the AI how to behave, what tone to use, and what topics to handle.
                            </p>
                        </div>
                    </CollapsibleSection>
                </div>

                {/* Middle Column - Advanced Settings */}
                <div className="w-1/3 border-r border-white/10 overflow-y-auto p-6 space-y-4">
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Sliders className="w-5 h-5 text-indigo-400" />
                        Advanced Settings
                    </h2>

                    {/* Trigger Settings */}
                    <CollapsibleSection title="Trigger Condition" icon={Target} defaultOpen={true}>
                        <div className="space-y-2">
                            {[
                                { id: 'no_match', label: 'No Match', desc: 'Respond when no Start node matches' },
                                { id: 'always', label: 'Always', desc: 'Respond to all messages' },
                                { id: 'keyword', label: 'Keywords', desc: 'Respond when message contains keywords' }
                            ].map((opt) => (
                                <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => { setTriggerOn(opt.id as 'no_match' | 'always' | 'keyword'); notifyChange({ triggerOn: opt.id as 'no_match' | 'always' | 'keyword' }); }}
                                    className={`w-full p-3 rounded-lg text-left transition-all ${triggerOn === opt.id
                                        ? 'bg-indigo-500/20 border-2 border-indigo-500'
                                        : 'bg-black/20 border border-white/10 hover:border-white/20'
                                        }`}
                                >
                                    <p className={`text-sm font-medium ${triggerOn === opt.id ? 'text-indigo-300' : 'text-white'}`}>{opt.label}</p>
                                    <p className="text-xs text-slate-500">{opt.desc}</p>
                                </button>
                            ))}
                        </div>

                        {/* Keywords Input */}
                        {triggerOn === 'keyword' && (
                            <div className="mt-4">
                                <label className="block text-xs font-medium text-slate-400 mb-2">Trigger Keywords</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newKeyword}
                                        onChange={(e) => setNewKeyword(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && handleAddKeyword()}
                                        placeholder="Add keyword..."
                                        className="flex-1 bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                                    />
                                    <button
                                        onClick={handleAddKeyword}
                                        className="px-3 py-2 bg-indigo-500 text-white rounded-lg text-sm"
                                    >
                                        Add
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {triggerKeywords.map((kw) => (
                                        <span key={kw} className="px-2 py-1 bg-indigo-500/20 text-indigo-300 rounded-lg text-xs flex items-center gap-1">
                                            {kw}
                                            <button onClick={() => handleRemoveKeyword(kw)} className="hover:text-red-400">
                                                <X className="w-3 h-3" />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </CollapsibleSection>

                    {/* Memory Settings */}
                    <CollapsibleSection title="Memory" icon={Database} defaultOpen={true}>
                        <Slider
                            value={memoryLines}
                            onChange={(v) => { setMemoryLines(v); notifyChange({ memoryLines: v }); }}
                            min={5}
                            max={50}
                            label="Conversation Memory"
                            description="How many messages to remember"
                            suffix=" messages"
                        />
                    </CollapsibleSection>

                    {/* Response Settings */}
                    <CollapsibleSection title="Response Settings" icon={MessageCircle} defaultOpen={true}>
                        <Slider
                            value={temperature}
                            onChange={(v) => { setTemperature(v); notifyChange({ temperature: v }); }}
                            min={0.1}
                            max={1}
                            step={0.1}
                            label="Creativity"
                            description="Higher = more creative, Lower = more focused"
                        />

                        <Slider
                            value={maxTokens}
                            onChange={(v) => { setMaxTokens(v); notifyChange({ maxTokens: v }); }}
                            min={100}
                            max={1000}
                            step={50}
                            label="Max Response Length"
                            description="Maximum tokens per response"
                            suffix=" tokens"
                        />

                        <Toggle
                            value={allowMedia}
                            onChange={(v) => { setAllowMedia(v); notifyChange({ allowMedia: v }); }}
                            label="Allow Media Responses"
                            description="Let AI send image and video URLs"
                        />
                    </CollapsibleSection>

                    {/* Scope Settings */}
                    <CollapsibleSection title="Topic Scope" icon={Shield} defaultOpen={false}>
                        <div>
                            <p className="text-xs text-slate-500 mb-3">
                                Define topics the AI should handle. Leave empty for all topics.
                            </p>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newScope}
                                    onChange={(e) => setNewScope(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleAddScope()}
                                    placeholder="e.g., products, pricing, shipping..."
                                    className="flex-1 bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                                />
                                <button
                                    onClick={handleAddScope}
                                    className="px-3 py-2 bg-indigo-500 text-white rounded-lg text-sm"
                                >
                                    Add
                                </button>
                            </div>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {scope.map((s) => (
                                    <span key={s} className="px-2 py-1 bg-indigo-500/20 text-indigo-300 rounded-lg text-xs flex items-center gap-1">
                                        {s}
                                        <button onClick={() => handleRemoveScope(s)} className="hover:text-red-400">
                                            <X className="w-3 h-3" />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        </div>
                    </CollapsibleSection>

                    {/* Fallback Message */}
                    <CollapsibleSection title="Fallback Message" icon={HelpCircle} defaultOpen={false}>
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-2">Fallback Message</label>
                            <textarea
                                value={fallbackMessage}
                                onChange={(e) => { setFallbackMessage(e.target.value); notifyChange({ fallbackMessage: e.target.value }); }}
                                placeholder="Message to send if AI fails..."
                                rows={3}
                                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:ring-2 focus:ring-indigo-500/50 outline-none resize-none"
                            />
                            <p className="text-xs text-slate-500 mt-2">
                                This message is sent if the AI fails to respond.
                            </p>
                        </div>
                    </CollapsibleSection>
                </div>

                {/* Right Column - Preview */}
                <div className="w-1/3 overflow-y-auto p-6 bg-slate-900/50">
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                        <Eye className="w-5 h-5 text-indigo-400" />
                        Live Preview
                    </h2>

                    {/* Device Selector */}
                    <div className="flex justify-center gap-2 mb-6">
                        {[
                            { id: 'mobile', icon: Smartphone, label: 'Mobile' },
                            { id: 'tablet', icon: Tablet, label: 'Tablet' },
                            { id: 'desktop', icon: Monitor, label: 'Desktop' }
                        ].map(({ id, icon: Icon, label }) => (
                            <button
                                key={id}
                                onClick={() => setPreviewDevice(id as any)}
                                className={`px-3 py-2 rounded-lg flex items-center gap-2 text-xs font-medium transition-all ${previewDevice === id
                                    ? 'bg-indigo-500 text-white'
                                    : 'bg-white/5 text-slate-400 hover:bg-white/10'
                                    }`}
                            >
                                <Icon className="w-4 h-4" />
                                {label}
                            </button>
                        ))}
                    </div>

                    {/* Preview */}
                    <div className="flex justify-center">
                        <DevicePreview />
                    </div>

                    {/* Summary */}
                    <div className="mt-6 p-4 bg-black/20 rounded-xl border border-white/10">
                        <h3 className="text-sm font-semibold text-white mb-3">Configuration Summary</h3>
                        <div className="space-y-2 text-xs">
                            <div className="flex justify-between">
                                <span className="text-slate-400">Status</span>
                                <span className={enabled ? 'text-green-400' : 'text-red-400'}>{enabled ? 'Enabled' : 'Disabled'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400">Provider</span>
                                <span className="text-white">{currentProviderData?.name || provider}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400">Model</span>
                                <span className="text-white">{model}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400">Trigger</span>
                                <span className="text-white capitalize">{triggerOn.replace('_', ' ')}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400">Memory</span>
                                <span className="text-white">{memoryLines} messages</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AINodeForm;
