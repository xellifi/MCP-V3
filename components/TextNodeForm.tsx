import React, { useState, useEffect } from 'react';
import { Clock, MessageSquare } from 'lucide-react';

interface TextNodeFormProps {
    userId: string;
    initialConfig?: {
        textContent?: string;
        delaySeconds?: number;
    };
    onChange: (config: any) => void;
}

const TextNodeForm: React.FC<TextNodeFormProps> = ({
    userId,
    initialConfig,
    onChange
}) => {
    const [textContent, setTextContent] = useState(initialConfig?.textContent || '');
    const [delaySeconds, setDelaySeconds] = useState(initialConfig?.delaySeconds || 0);

    useEffect(() => {
        if (initialConfig) {
            setTextContent(initialConfig.textContent || '');
            setDelaySeconds(initialConfig.delaySeconds || 0);
        }
    }, [initialConfig]);

    useEffect(() => {
        onChange({ textContent, delaySeconds });
    }, [textContent, delaySeconds]);

    return (
        <div className="space-y-6">
            {/* Text Content */}
            <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                    <MessageSquare className="w-4 h-4 inline mr-2" />
                    Message Text
                </label>
                <textarea
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    placeholder="Enter the message you want to send to users..."
                    rows={4}
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-amber-500/50 outline-none transition-all placeholder-slate-500 resize-none"
                />
                <p className="mt-2 text-xs text-green-400">
                    ✓ This text message will be sent to users when this node is executed.
                </p>
            </div>

            {/* Delay */}
            <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                    <Clock className="w-4 h-4 inline mr-2" />
                    Delay Before Sending (seconds)
                </label>
                <input
                    type="number"
                    min="0"
                    max="300"
                    value={delaySeconds}
                    onChange={(e) => setDelaySeconds(parseInt(e.target.value) || 0)}
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-amber-500/50 outline-none transition-all"
                />
                <p className="mt-2 text-xs text-slate-400">
                    Wait this many seconds before sending the message (0-300 seconds).
                </p>
            </div>

            {/* Info */}
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                <p className="text-sm text-amber-300">
                    <strong>Use this node to:</strong>
                </p>
                <ul className="mt-2 text-sm text-amber-200 space-y-1 list-disc list-inside">
                    <li>Send a text message to users</li>
                    <li>Add a delay before sending the message</li>
                    <li>Create a natural conversation flow</li>
                </ul>
            </div>

            {/* Preview */}
            {textContent && (
                <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
                    <h4 className="text-sm font-semibold text-slate-300 mb-2">Message Preview</h4>
                    <div className="bg-indigo-500/20 border border-indigo-500/30 rounded-xl px-4 py-3">
                        <p className="text-sm text-white whitespace-pre-wrap">{textContent}</p>
                    </div>
                    {delaySeconds > 0 && (
                        <p className="text-xs text-slate-400 mt-2">
                            ⏱️ Will wait <strong>{delaySeconds} second{delaySeconds !== 1 ? 's' : ''}</strong> before sending
                        </p>
                    )}
                </div>
            )}
        </div>
    );
};

export default TextNodeForm;
