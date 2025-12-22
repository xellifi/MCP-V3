import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

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
                    Text Content (Optional)
                </label>
                <textarea
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    placeholder="Add a note or description for this step..."
                    rows={3}
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-amber-500/50 outline-none transition-all placeholder-slate-500 resize-none"
                />
                <p className="mt-2 text-xs text-slate-400">
                    This text is for your reference only and won't be sent to users.
                </p>
            </div>

            {/* Delay */}
            <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                    <Clock className="w-4 h-4 inline mr-2" />
                    Delay (seconds)
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
                    Wait this many seconds before executing the next action (0-300 seconds).
                </p>
            </div>

            {/* Info */}
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                <p className="text-sm text-amber-300">
                    <strong>Use this node to:</strong>
                </p>
                <ul className="mt-2 text-sm text-amber-200 space-y-1 list-disc list-inside">
                    <li>Add a delay between actions</li>
                    <li>Organize your flow with notes</li>
                    <li>Create a more natural conversation pace</li>
                </ul>
            </div>

            {/* Preview */}
            {delaySeconds > 0 && (
                <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
                    <h4 className="text-sm font-semibold text-slate-300 mb-2">Preview</h4>
                    <p className="text-sm text-white">
                        ⏱️ Will wait <strong>{delaySeconds} second{delaySeconds !== 1 ? 's' : ''}</strong> before continuing
                    </p>
                </div>
            )}
        </div>
    );
};

export default TextNodeForm;
