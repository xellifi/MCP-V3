import React, { useState, useEffect } from 'react';
import { Sparkles, AlertCircle } from 'lucide-react';

interface CommentReplyNodeFormProps {
    userId: string;
    initialConfig?: {
        replyTemplate?: string;
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

const CommentReplyNodeForm: React.FC<CommentReplyNodeFormProps> = ({
    userId,
    initialConfig,
    onChange,
    userApiKeys
}) => {
    const [replyTemplate, setReplyTemplate] = useState(initialConfig?.replyTemplate || '');
    const [useAI, setUseAI] = useState(initialConfig?.useAI ?? false);
    const [aiProvider, setAiProvider] = useState(initialConfig?.aiProvider || 'openai');
    const [aiPrompt, setAiPrompt] = useState(initialConfig?.aiPrompt || 'Generate a friendly and helpful reply to this comment');

    useEffect(() => {
        onChange({
            replyTemplate,
            useAI,
            aiProvider,
            aiPrompt
        });
    }, [replyTemplate, useAI, aiProvider, aiPrompt]);

    const availableProviders = [];
    if (userApiKeys?.openaiApiKey) availableProviders.push({ value: 'openai', label: 'OpenAI' });
    if (userApiKeys?.geminiApiKey) availableProviders.push({ value: 'gemini', label: 'Google Gemini' });

    const hasAnyApiKey = availableProviders.length > 0;

    return (
        <div className="space-y-6">
            {/* Reply Template */}
            <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                    Comment Reply Template
                </label>
                <textarea
                    value={replyTemplate}
                    onChange={(e) => setReplyTemplate(e.target.value)}
                    placeholder="Thank you for your comment! {commenter_name}"
                    rows={4}
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all placeholder-slate-500 resize-none"
                />
                <p className="mt-2 text-xs text-slate-400">
                    <strong>Available variables:</strong> {'{commenter_name}'}, {'{comment_text}'}, {'{page_name}'}, {'{post_url}'}
                </p>
            </div>

            {/* AI Integration */}
            <div className="p-4 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-xl">
                <div className="flex items-start gap-4">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <Sparkles className="w-4 h-4 text-indigo-400" />
                            <h4 className="font-bold text-white">AI-Generated Replies</h4>
                        </div>
                        <p className="text-sm text-slate-400">
                            Use AI to generate personalized replies based on comment content
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
                        <div className="w-14 h-7 bg-white/10 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-indigo-600 peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"></div>
                    </label>
                </div>

                {!hasAnyApiKey && (
                    <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                        <div className="flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                            <div className="text-sm text-amber-200">
                                <strong>No AI provider configured.</strong> Add your OpenAI or Gemini API key in{' '}
                                <a href="/settings" className="underline hover:text-amber-100">Settings</a> to enable AI-generated replies.
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
                                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all appearance-none bg-slate-900"
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
                                placeholder="Generate a friendly and helpful reply..."
                                rows={3}
                                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all placeholder-slate-500 resize-none"
                            />
                            <p className="mt-2 text-xs text-slate-400">
                                Tell the AI how to respond to comments. The AI will receive the comment text and generate a reply.
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Preview */}
            {replyTemplate && !useAI && (
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
        </div>
    );
};

export default CommentReplyNodeForm;
