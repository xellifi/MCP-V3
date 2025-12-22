import React, { useState, useEffect } from 'react';
import { MessageSquare } from 'lucide-react';

interface SendMessageNodeFormProps {
    userId: string;
    initialConfig?: {
        messageTemplate?: string;
    };
    onChange: (config: any) => void;
}

const SendMessageNodeForm: React.FC<SendMessageNodeFormProps> = ({
    userId,
    initialConfig,
    onChange
}) => {
    const [messageTemplate, setMessageTemplate] = useState(initialConfig?.messageTemplate || '');

    useEffect(() => {
        if (initialConfig) {
            setMessageTemplate(initialConfig.messageTemplate || '');
        }
    }, [initialConfig]);

    useEffect(() => {
        onChange({ messageTemplate });
    }, [messageTemplate]);

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
                    <strong>Note:</strong> Direct messages will be sent via Facebook Messenger API. Make sure you have the necessary permissions.
                </p>
            </div>
        </div>
    );
};

export default SendMessageNodeForm;
