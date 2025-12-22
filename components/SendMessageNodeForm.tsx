import React, { useState, useEffect } from 'react';
import { MessageSquare } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

interface Button {
    title: string;
    type: 'startFlow' | 'url';
    flowId?: string;
    url?: string;
    webviewType?: 'full' | 'compact' | 'tall';
}

interface SendMessageNodeFormProps {
    userId: string;
    initialConfig?: {
        messageTemplate?: string;
        buttons?: Button[];
    };
    onChange: (config: any) => void;
}

const SendMessageNodeForm: React.FC<SendMessageNodeFormProps> = ({
    userId,
    initialConfig,
    onChange
}) => {
    const [messageTemplate, setMessageTemplate] = useState(initialConfig?.messageTemplate || '');
    const [buttons, setButtons] = useState<Button[]>(
        initialConfig?.buttons && initialConfig.buttons.length > 0
            ? initialConfig.buttons
            : []
    );
    const [startFlows, setStartFlows] = useState<any[]>([]);

    // Fetch Start flows on mount
    useEffect(() => {
        fetchStartFlows();
    }, [userId]);

    const fetchStartFlows = async () => {
        const { data: flows, error } = await supabase
            .from('flows')
            .select('id, name, flow_data')
            .eq('user_id', userId)
            .eq('status', 'active');

        if (!error && flows) {
            // Filter flows that have Start nodes
            const flowsWithStartNodes = flows.filter(flow => {
                const nodes = flow.flow_data?.nodes || [];
                return nodes.some((n: any) => n.type === 'startNode');
            });
            setStartFlows(flowsWithStartNodes);
        }
    };

    const notifyChange = (newTemplate: string, newButtons: Button[]) => {
        const validButtons = newButtons.filter(b => {
            if (!b.title) return false;
            if (b.type === 'startFlow') return !!b.flowId;
            if (b.type === 'url') return !!b.url;
            return false;
        });
        onChange({ messageTemplate: newTemplate, buttons: validButtons });
    };

    const handleTemplateChange = (value: string) => {
        setMessageTemplate(value);
        notifyChange(value, buttons);
    };

    const addButton = () => {
        if (buttons.length < 3) {
            const newButtons = [...buttons, { title: '', type: 'startFlow' as const }];
            setButtons(newButtons);
            notifyChange(messageTemplate, newButtons);
        }
    };

    const removeButton = (index: number) => {
        const newButtons = buttons.filter((_, i) => i !== index);
        setButtons(newButtons);
        notifyChange(messageTemplate, newButtons);
    };

    const updateButton = (index: number, updates: Partial<Button>) => {
        const newButtons = [...buttons];
        newButtons[index] = { ...newButtons[index], ...updates };
        setButtons(newButtons);
        notifyChange(messageTemplate, newButtons);
    };

    return (
        <div className="space-y-6">
            {/* Message Template */}
            <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                    Direct Message Template
                </label>
                <textarea
                    value={messageTemplate}
                    onChange={(e) => handleTemplateChange(e.target.value)}
                    placeholder="Hi! Thanks for commenting on our post. We'd love to hear more about your thoughts..."
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
                        Example: "Hi {'{commenter_name}'}, we'd love to chat about your comment!"
                    </p>
                </div>
            </div>

            {/* Preview */}
            {messageTemplate && (
                <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
                    <p className="text-xs font-semibold text-slate-400 mb-2">Preview:</p>
                    <p className="text-sm text-white whitespace-pre-wrap">{messageTemplate}</p>
                </div>
            )}

            {/* Quick Reply Buttons */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-semibold text-slate-300">
                        <MessageSquare className="w-4 h-4 inline mr-2" />
                        Quick Reply Buttons (optional, max 3)
                    </label>
                    {buttons.length < 3 && (
                        <button
                            type="button"
                            onClick={addButton}
                            className="px-3 py-1 bg-purple-500 text-white text-xs rounded-lg hover:bg-purple-600"
                        >
                            + Add Button
                        </button>
                    )}
                </div>

                <div className="space-y-4">
                    {buttons.map((button, index) => (
                        <div key={index} className="p-4 bg-black/20 border border-white/10 rounded-xl space-y-3">
                            {/* Button Title */}
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Button Text</label>
                                <input
                                    type="text"
                                    value={button.title}
                                    onChange={(e) => updateButton(index, { title: e.target.value })}
                                    placeholder="e.g., Get Pricing"
                                    className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-purple-500/50 outline-none"
                                    maxLength={20}
                                />
                            </div>

                            {/* Button Type */}
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Button Type</label>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => updateButton(index, { type: 'startFlow', flowId: '', url: undefined, webviewType: undefined })}
                                        className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${button.type === 'startFlow'
                                            ? 'bg-purple-500 text-white'
                                            : 'bg-white/5 text-slate-400 hover:bg-white/10'
                                            }`}
                                    >
                                        Start Flow
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => updateButton(index, { type: 'url', url: '', webviewType: 'full', flowId: undefined })}
                                        className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${button.type === 'url'
                                            ? 'bg-purple-500 text-white'
                                            : 'bg-white/5 text-slate-400 hover:bg-white/10'
                                            }`}
                                    >
                                        URL
                                    </button>
                                </div>
                            </div>

                            {/* Start Flow Selector */}
                            {button.type === 'startFlow' && (
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Select Flow</label>
                                    <select
                                        value={button.flowId || ''}
                                        onChange={(e) => updateButton(index, { flowId: e.target.value })}
                                        className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-purple-500/50 outline-none"
                                    >
                                        <option value="">Select a flow...</option>
                                        {startFlows.map(flow => (
                                            <option key={flow.id} value={flow.id}>
                                                {flow.name}
                                            </option>
                                        ))}
                                    </select>
                                    {startFlows.length === 0 && (
                                        <p className="text-xs text-amber-400 mt-1">No flows with Start nodes found</p>
                                    )}
                                </div>
                            )}

                            {/* URL Input */}
                            {button.type === 'url' && (
                                <>
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">URL</label>
                                        <input
                                            type="url"
                                            value={button.url || ''}
                                            onChange={(e) => updateButton(index, { url: e.target.value })}
                                            placeholder="https://example.com"
                                            className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-purple-500/50 outline-none"
                                        />
                                    </div>

                                    {/* Webview Type */}
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Webview Type</label>
                                        <div className="grid grid-cols-3 gap-2">
                                            <button
                                                type="button"
                                                onClick={() => updateButton(index, { webviewType: 'full' })}
                                                className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${button.webviewType === 'full'
                                                    ? 'bg-blue-500 text-white'
                                                    : 'bg-white/5 text-slate-400 hover:bg-white/10'
                                                    }`}
                                            >
                                                FULL
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => updateButton(index, { webviewType: 'compact' })}
                                                className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${button.webviewType === 'compact'
                                                    ? 'bg-blue-500 text-white'
                                                    : 'bg-white/5 text-slate-400 hover:bg-white/10'
                                                    }`}
                                            >
                                                COMPACT
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => updateButton(index, { webviewType: 'tall' })}
                                                className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${button.webviewType === 'tall'
                                                    ? 'bg-blue-500 text-white'
                                                    : 'bg-white/5 text-slate-400 hover:bg-white/10'
                                                    }`}
                                            >
                                                TALL
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* Remove Button */}
                            <button
                                type="button"
                                onClick={() => removeButton(index)}
                                className="w-full px-3 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 text-xs font-medium"
                            >
                                Remove Button
                            </button>
                        </div>
                    ))}
                </div>

                {buttons.length === 0 && (
                    <p className="text-sm text-slate-500 text-center py-4">
                        No buttons added. Click "+ Add Button" to add quick reply buttons.
                    </p>
                )}
            </div>

            {/* Info */}
            <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                <p className="text-sm text-purple-300">
                    <strong>Quick Replies:</strong> Add buttons that users can click to trigger other flows. The keyword will be used to match and trigger flows.
                </p>
            </div>
        </div>
    );
};

export default SendMessageNodeForm;
