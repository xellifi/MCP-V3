import React, { useState, useEffect } from 'react';

interface CommentReplyNodeFormProps {
    userId: string;
    initialConfig?: {
        replyTemplate?: string;
    };
    onChange: (config: any) => void;
}

const CommentReplyNodeForm: React.FC<CommentReplyNodeFormProps> = ({
    userId,
    initialConfig,
    onChange
}) => {
    const [replyTemplate, setReplyTemplate] = useState(initialConfig?.replyTemplate || '');

    useEffect(() => {
        if (initialConfig) {
            setReplyTemplate(initialConfig.replyTemplate || '');
        }
    }, [initialConfig]);

    useEffect(() => {
        onChange({ replyTemplate });
    }, [replyTemplate]);

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

            {/* Preview */}
            {replyTemplate && (
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
