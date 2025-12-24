import React, { useState, useEffect } from 'react';
import { Bot, Sparkles, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AIProvider {
    id: 'openai' | 'gemini';
    name: string;
    logo: string;
    available: boolean;
}

interface CommentReplyNodeFormProps {
    userId: string;
    initialConfig?: {
        replyTemplate?: string;
        useAiReply?: boolean;
        aiProvider?: 'openai' | 'gemini';
        aiPrompt?: string;
    };
    onChange: (config: any) => void;
}

const CommentReplyNodeForm: React.FC<CommentReplyNodeFormProps> = ({
    userId,
    initialConfig,
    onChange
}) => {
    const [replyTemplate, setReplyTemplate] = useState(initialConfig?.replyTemplate || '');

    // AI Reply state
    const [useAiReply, setUseAiReply] = useState(initialConfig?.useAiReply || false);
    const [aiProvider, setAiProvider] = useState<'openai' | 'gemini'>(initialConfig?.aiProvider || 'openai');
    const [aiPrompt, setAiPrompt] = useState(initialConfig?.aiPrompt || '');
    const [availableProviders, setAvailableProviders] = useState<AIProvider[]>([]);
    const [loadingProviders, setLoadingProviders] = useState(true);

    // AI Provider configurations with logos
    const AI_PROVIDERS: AIProvider[] = [
        {
            id: 'openai',
            name: 'OpenAI GPT',
            logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/ChatGPT_logo.svg/512px-ChatGPT_logo.svg.png',
            available: false
        },
        {
            id: 'gemini',
            name: 'Google Gemini',
            logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Google_Gemini_logo.svg/512px-Google_Gemini_logo.svg.png',
            available: false
        }
    ];

    useEffect(() => {
        if (initialConfig) {
            setReplyTemplate(initialConfig.replyTemplate || '');
            setUseAiReply(initialConfig.useAiReply || false);
            setAiProvider(initialConfig.aiProvider || 'openai');
            setAiPrompt(initialConfig.aiPrompt || '');
        }
    }, [initialConfig]);

    useEffect(() => {
        fetchAvailableProviders();
    }, []);

    const fetchAvailableProviders = async () => {
        setLoadingProviders(true);
        try {
            // Get admin-level settings (available to all users)
            const { data: adminSettings } = await supabase
                .from('admin_settings')
                .select('openai_api_key, gemini_api_key')
                .eq('id', 1)
                .single();

            console.log('Admin settings for AI:', adminSettings);

            const providers = AI_PROVIDERS.map(provider => {
                let available = false;
                if (provider.id === 'openai') {
                    available = !!(adminSettings?.openai_api_key);
                } else if (provider.id === 'gemini') {
                    available = !!(adminSettings?.gemini_api_key);
                }
                return { ...provider, available };
            });

            setAvailableProviders(providers);

            // If current provider is not available, switch to first available
            const currentProviderAvailable = providers.find(p => p.id === aiProvider)?.available;
            if (!currentProviderAvailable && useAiReply) {
                const firstAvailable = providers.find(p => p.available);
                if (firstAvailable) {
                    setAiProvider(firstAvailable.id);
                }
            }
        } catch (error) {
            console.error('Error fetching AI providers:', error);
            setAvailableProviders(AI_PROVIDERS);
        } finally {
            setLoadingProviders(false);
        }
    };

    const notifyChange = (
        newTemplate: string,
        newUseAi?: boolean,
        newAiProvider?: 'openai' | 'gemini',
        newAiPrompt?: string
    ) => {
        onChange({
            replyTemplate: newTemplate,
            useAiReply: newUseAi !== undefined ? newUseAi : useAiReply,
            aiProvider: newAiProvider !== undefined ? newAiProvider : aiProvider,
            aiPrompt: newAiPrompt !== undefined ? newAiPrompt : aiPrompt
        });
    };

    const handleTemplateChange = (value: string) => {
        setReplyTemplate(value);
        notifyChange(value);
    };

    const handleAiToggle = (enabled: boolean) => {
        setUseAiReply(enabled);
        notifyChange(replyTemplate, enabled, aiProvider, aiPrompt);
    };

    const handleAiProviderChange = (provider: 'openai' | 'gemini') => {
        setAiProvider(provider);
        notifyChange(replyTemplate, useAiReply, provider, aiPrompt);
    };

    const handleAiPromptChange = (prompt: string) => {
        setAiPrompt(prompt);
        notifyChange(replyTemplate, useAiReply, aiProvider, prompt);
    };

    const hasAvailableProviders = availableProviders.some(p => p.available);

    return (
        <div className="space-y-6">
            {/* AI Reply Toggle */}
            <div className="p-4 bg-gradient-to-r from-indigo-500/10 to-cyan-500/10 border border-indigo-500/20 rounded-xl">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-indigo-500 to-cyan-500 rounded-lg">
                            <Bot className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-white">AI-Powered Reply</h3>
                            <p className="text-xs text-slate-400">Let AI generate comment replies</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => handleAiToggle(!useAiReply)}
                        className={`relative w-14 h-7 rounded-full transition-all duration-300 ${useAiReply
                                ? 'bg-gradient-to-r from-indigo-500 to-cyan-500'
                                : 'bg-slate-600'
                            }`}
                    >
                        <div
                            className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-lg transition-all duration-300 ${useAiReply ? 'left-8' : 'left-1'
                                }`}
                        />
                        {useAiReply && (
                            <Sparkles className="absolute right-1.5 top-1.5 w-4 h-4 text-white" />
                        )}
                    </button>
                </div>
            </div>

            {/* AI Configuration Section */}
            {useAiReply && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                    {/* AI Provider Selection */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-300 mb-3">
                            Select AI Provider
                        </label>

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
                                        Please add your OpenAI or Gemini API keys in Settings to enable AI replies.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-3">
                                {availableProviders.map((provider) => (
                                    <button
                                        key={provider.id}
                                        type="button"
                                        onClick={() => provider.available && handleAiProviderChange(provider.id)}
                                        disabled={!provider.available}
                                        className={`relative p-4 rounded-xl border-2 transition-all duration-200 ${!provider.available
                                                ? 'opacity-40 cursor-not-allowed bg-black/10 border-white/5'
                                                : aiProvider === provider.id
                                                    ? 'bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 border-indigo-500 ring-2 ring-indigo-500/30'
                                                    : 'bg-black/20 border-white/10 hover:border-white/30 hover:bg-white/5'
                                            }`}
                                    >
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="w-10 h-10 rounded-lg overflow-hidden bg-white p-1.5 flex items-center justify-center">
                                                <img
                                                    src={provider.logo}
                                                    alt={provider.name}
                                                    className="w-full h-full object-contain"
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).style.display = 'none';
                                                    }}
                                                />
                                            </div>
                                            <span className={`text-sm font-medium ${aiProvider === provider.id && provider.available
                                                    ? 'text-white'
                                                    : 'text-slate-300'
                                                }`}>
                                                {provider.name}
                                            </span>
                                            {!provider.available && (
                                                <span className="text-xs text-slate-500">Not configured</span>
                                            )}
                                        </div>
                                        {aiProvider === provider.id && provider.available && (
                                            <div className="absolute top-2 right-2 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* AI Prompt Configuration */}
                    {hasAvailableProviders && (
                        <div>
                            <label className="block text-sm font-semibold text-slate-300 mb-2">
                                AI Instructions
                            </label>
                            <textarea
                                value={aiPrompt}
                                onChange={(e) => handleAiPromptChange(e.target.value)}
                                placeholder="Tell the AI how to reply to comments. Example: 'Be friendly and thankful. Acknowledge their comment and encourage engagement. Keep replies short and personable.'"
                                rows={4}
                                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all placeholder-slate-500 resize-none"
                            />
                            <div className="mt-2 space-y-1">
                                <p className="text-xs text-slate-400">
                                    The AI will receive the commenter's name and comment text automatically.
                                </p>
                                <p className="text-xs text-indigo-300">
                                    Tip: Specify the tone, length, and whether to include questions or calls-to-action.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Manual Reply Template - Only show when AI is OFF */}
            {!useAiReply && (
                <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                    <label className="block text-sm font-semibold text-slate-300 mb-2">
                        Comment Reply Template
                    </label>
                    <textarea
                        value={replyTemplate}
                        onChange={(e) => handleTemplateChange(e.target.value)}
                        placeholder="Thank you for your comment!"
                        rows={4}
                        className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all placeholder-slate-500 resize-none"
                    />
                    <div className="mt-2 space-y-1">
                        <p className="text-xs font-semibold text-slate-300">
                            Available variables:
                        </p>
                        <div className="text-xs text-slate-400 space-y-0.5 pl-2">
                            <p><code className="px-1.5 py-0.5 bg-white/10 rounded">{'{commenter_name}'}</code> - Name of the person who commented</p>
                            <p><code className="px-1.5 py-0.5 bg-white/10 rounded">{'{comment_text}'}</code> - The comment message</p>
                            <p><code className="px-1.5 py-0.5 bg-white/10 rounded">{'{page_name}'}</code> - Your Facebook page name</p>
                            <p><code className="px-1.5 py-0.5 bg-white/10 rounded">{'{post_url}'}</code> - URL to the post</p>
                        </div>
                        <p className="text-xs text-indigo-300 mt-2">
                            Example: "Hi {'{commenter_name}'}, thanks for your comment!"
                        </p>
                    </div>
                </div>
            )}

            {/* Preview - Only for manual template */}
            {!useAiReply && replyTemplate && (
                <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
                    <h4 className="text-sm font-semibold text-slate-300 mb-2">Preview</h4>
                    <p className="text-sm text-white">
                        {replyTemplate
                            .replace('{commenter_name}', 'John Doe')
                            .replace('{comment_text}', 'Great post!')
                            .replace('{page_name}', 'Your Page')
                            .replace('{post_url}', 'https://facebook.com/...')}
                    </p>
                </div>
            )}

            {/* Info */}
            <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                <p className="text-sm text-indigo-300">
                    {useAiReply ? (
                        <>
                            <strong>AI Reply:</strong> The AI will generate a personalized public comment reply based on the commenter's message and your instructions.
                        </>
                    ) : (
                        <>
                            <strong>Comment Reply:</strong> This reply will be posted publicly on the comment. Use variables to personalize your response.
                        </>
                    )}
                </p>
            </div>
        </div>
    );
};

export default CommentReplyNodeForm;
