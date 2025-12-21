import React, { useState, useEffect } from 'react';
import { Sparkles, AlertCircle, MessageSquare } from 'lucide-react';

interface SendMessageNodeFormProps {
    userId: string;
    initialConfig?: {
        messageTemplate?: string;
        useAI?: boolean;
        aiProvider?: string;
        aiPrompt?: string;
    };
    onChange: (config: any) => void;
    userApiKeys?: {
        openaiApiKey?: string;
        geminiApiKey?: string;
    };
}

const SendMessageNodeForm: React.FC<SendMessageNodeFormProps> = ({
    userId,
    initialConfig,
    onChange,
    userApiKeys
}) => {
    const [messageTemplate, setMessageTemplate] = useState(initialConfig?.messageTemplate || '');
    const [useAI, setUseAI] = useState(initialConfig?.useAI ?? false);
    const [aiProvider, setAiProvider] = useState(initialConfig?.aiProvider || 'openai');
    const [aiPrompt, setAiPrompt] = useState(initialConfig?.aiPrompt || 'Generate a friendly direct message to send to the commenter');

    useEffect(() => {
        onChange({
            messageTemplate,
            useAI,
            aiProvider,
            aiPrompt
        });
    }, [messageTemplate, useAI, aiProvider, aiPrompt]);

    const availableProviders = [];
    if (userApiKeys?.openaiApiKey) availableProviders.push({ value: 'openai', label: 'OpenAI' });
    if (userApiKeys?.geminiApiKey) availableProviders.push({ value: 'gemini', label: 'Google Gemini' });

    const hasAnyApiKey = availableProviders.length > 0;

    return (
        <div className="space-y-6">
            {/* Message Template */}
            <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                    Direct Message Template
                </label>
                <textarea
                    value={messageTemplate}
                    onChange={(e) => setMessageTemplate(e.target.value)}
                    placeholder="Hi {commenter_name}! Thanks for commenting on our post. We'd love to hear more about your thoughts..."
                    rows={5}
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-purple-500/50 outline-none transition-all placeholder-slate-500 resize-none"
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
                    <p className="text-xs text-purple-300 mt-2">
                        Example: "Hi {'{commenter_name}'}, we'd love to chat about your comment on {'{page_name}'}!"
                    </p>
                </div>
            </div>

            {/* AI Integration */}
            <div className="p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl">
                <div className="flex items-start gap-4">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <Sparkles className="w-4 h-4 text-purple-400" />
                            <h4 className="font-bold text-white">AI-Generated Messages</h4>
                        </div>
                        <p className="text-sm text-slate-400">
                            Use AI to generate personalized direct messages based on comment content
                        </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={useAI}
                            onChange={(e) => setUseAI(e.target.checked)}
                            disabled={!hasAnyApiKey}
                            className="sr-only peer"
                        />
                        <div className="w-14 h-7 bg-white/10 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-purple-600 peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"></div>
                    </label>
                </div>

                {!hasAnyApiKey && (
                    <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                        <div className="flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                            <div className="text-sm text-amber-200">
                                <strong>No AI provider configured.</strong> Add your OpenAI or Gemini API key in{' '}
                                <a href="/settings" className="underline hover:text-amber-100">Settings</a> to enable AI-generated messages.
                            </div>
                        </div>
                    </div>
                )}

                {useAI && hasAnyApiKey && (
                    <div className="mt-4 space-y-4">
                        {/* AI Provider Selection */}
                        <div>
                            <label className="block text-sm font-semibold text-slate-300 mb-2">
                                AI Provider
                            </label>
                            <select
                                value={aiProvider}
                                onChange={(e) => setAiProvider(e.target.value)}
                                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-purple-500/50 outline-none transition-all appearance-none bg-slate-900"
                            >
                                {availableProviders.map((provider) => (
                                    <option key={provider.value} value={provider.value}>
                                        {provider.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* AI Prompt */}
                        <div>
                            <label className="block text-sm font-semibold text-slate-300 mb-2">
                                AI Instructions
                            </label>
                            <textarea
                                value={aiPrompt}
                                onChange={(e) => setAiPrompt(e.target.value)}
                                placeholder="Generate a friendly direct message..."
                                rows={3}
                                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-purple-500/50 outline-none transition-all placeholder-slate-500 resize-none"
                            />
                            <p className="mt-2 text-xs text-slate-400">
                                Tell the AI how to craft the direct message. The AI will receive the comment text and generate a personalized message.
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Preview */}
            {messageTemplate && !useAI && (
                <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                        <MessageSquare className="w-4 h-4 text-purple-400" />
                        <h4 className="text-sm font-semibold text-slate-300">Preview</h4>
                    </div>
                    <p className="text-sm text-white">
                        {messageTemplate
                            .replace('{commenter_name}', 'John Doe')
                            .replace('{comment_text}', 'Great post!')
                            .replace('{page_name}', 'Your Page')
                            .replace('{post_url}', 'https://facebook.com/...')}
                    </p>
                </div>
            )}

            {/* Important Note */}
            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                <p className="text-sm text-blue-300">
                    <strong>Note:</strong> Direct messages will be sent via Facebook Messenger API. Make sure you have the necessary permissions and comply with Facebook's messaging policies.
                </p>
            </div>
        </div>
    );
};

export default SendMessageNodeForm;
