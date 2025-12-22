import React, { useState, useEffect } from 'react';
import { MessageSquare } from 'lucide-react';

interface SendMessageNodeFormProps {
    userId: string;
    initialConfig?: {
        messageTemplate?: string;
        buttons?: Array<{ title: string; payload: string }>;
    };
    onChange: (config: any) => void;
}

const SendMessageNodeForm: React.FC<SendMessageNodeFormProps> = ({
    userId,
    initialConfig,
    onChange
}) => {
    const [messageTemplate, setMessageTemplate] = useState(initialConfig?.messageTemplate || '');
    const [buttons, setButtons] = useState<Array<{ title: string; payload: string }>>(
        initialConfig?.buttons && initialConfig.buttons.length > 0
            ? initialConfig.buttons
            : []
    );

    const notifyChange = (newTemplate: string, newButtons: Array<{ title: string; payload: string }>) => {
        const validButtons = newButtons.filter(b => b.title && b.payload);
        onChange({ messageTemplate: newTemplate, buttons: validButtons });
    };

    const handleTemplateChange = (value: string) => {
        setMessageTemplate(value);
        notifyChange(value, buttons);
    };

    const addButton = () => {
        if (buttons.length < 3) {
            const newButtons = [...buttons, { title: '', payload: '' }];
            setButtons(newButtons);
            notifyChange(messageTemplate, newButtons);
        }
    };

    const removeButton = (index: number) => {
        const newButtons = buttons.filter((_, i) => i !== index);
        setButtons(newButtons);
        notifyChange(messageTemplate, newButtons);
    };

    const updateButton = (index: number, field: 'title' | 'payload', value: string) => {
        const newButtons = [...buttons];
        newButtons[index][field] = value;
        setButtons(newButtons);
        notifyChange(messageTemplate, newButtons);
    };

    useEffect(() => {
        if (initialConfig) {
            setMessageTemplate(initialConfig.messageTemplate || '');
            setButtons(initialConfig.buttons && initialConfig.buttons.length > 0 ? initialConfig.buttons : []);
        }
    }, [initialConfig]);

    // The onChange is now handled by notifyChange, so this useEffect is no longer needed.
    // useEffect(() => {
    //     onChange({ messageTemplate });
    // }, [messageTemplate]);

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
                    <button
                        onClick={addButton}
                        disabled={buttons.length >= 3}
                        className="px-3 py-1 bg-purple-500 text-white text-xs rounded-lg hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                    >
                        + Add Button
                    </button>
                </div>

                {buttons.length > 0 && (
                    <div className="space-y-3">
                        {buttons.map((button, index) => (
                            <div key={index} className="flex gap-2">
                                <input
                                    type="text"
                                    value={button.title}
                                    onChange={(e) => updateButton(index, 'title', e.target.value)}
                                    placeholder="Button text (e.g., Get Pricing)"
                                    maxLength={20}
                                    className="flex-1 bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-purple-500/50 outline-none"
                                />
                                <input
                                    type="text"
                                    value={button.payload}
                                    onChange={(e) => updateButton(index, 'payload', e.target.value)}
                                    placeholder="Keyword (e.g., PRICING)"
                                    className="flex-1 bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-purple-500/50 outline-none"
                                />
                                <button
                                    onClick={() => removeButton(index)}
                                    className="w-8 h-8 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 flex items-center justify-center"
                                >
                                    ×
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {buttons.length === 0 && (
                    <p className="text-xs text-slate-500 italic">No buttons added. Click "+ Add Button" to add quick reply options.</p>
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
