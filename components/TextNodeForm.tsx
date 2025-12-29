import React, { useState } from 'react';
import { Clock, MessageSquare, Plus, X, Link } from 'lucide-react';
import CollapsibleTips from './CollapsibleTips';

interface UrlButton {
    title: string;
    url: string;
    webviewHeight: 'compact' | 'tall' | 'full';
}

interface TextNodeFormProps {
    userId: string;
    initialConfig?: {
        textContent?: string;
        delaySeconds?: number;
        buttons?: UrlButton[];
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
    const [buttons, setButtons] = useState<UrlButton[]>(
        initialConfig?.buttons || []
    );

    const notifyChange = (
        newTextContent: string,
        newDelaySeconds: number,
        newButtons: UrlButton[]
    ) => {
        const validButtons = newButtons.filter(b => b.title.trim() && b.url.trim());
        onChange({ textContent: newTextContent, delaySeconds: newDelaySeconds, buttons: validButtons });
    };

    const handleTextChange = (value: string) => {
        setTextContent(value);
        notifyChange(value, delaySeconds, buttons);
    };

    const handleDelayChange = (value: number) => {
        setDelaySeconds(value);
        notifyChange(textContent, value, buttons);
    };

    const addButton = () => {
        if (buttons.length < 3) {
            const newButtons = [...buttons, { title: '', url: '', webviewHeight: 'full' as const }];
            setButtons(newButtons);
            notifyChange(textContent, delaySeconds, newButtons);
        }
    };

    const removeButton = (index: number) => {
        const newButtons = buttons.filter((_, i) => i !== index);
        setButtons(newButtons);
        notifyChange(textContent, delaySeconds, newButtons);
    };

    const updateButton = (index: number, field: keyof UrlButton, value: string) => {
        const newButtons = [...buttons];
        newButtons[index] = { ...newButtons[index], [field]: value };
        setButtons(newButtons);
        notifyChange(textContent, delaySeconds, newButtons);
    };

    return (
        <div className="space-y-6">
            {/* Text Content */}
            <div>
                <label className="block text-xs md:text-sm font-semibold text-slate-300 mb-2">
                    <MessageSquare className="w-4 h-4 inline mr-2" />
                    Message Text
                </label>
                <textarea
                    value={textContent}
                    onChange={(e) => handleTextChange(e.target.value)}
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
                <label className="block text-xs md:text-sm font-semibold text-slate-300 mb-2">
                    <Clock className="w-4 h-4 inline mr-2" />
                    Delay Before Sending (seconds)
                </label>
                <input
                    type="number"
                    min="0"
                    max="300"
                    value={delaySeconds}
                    onChange={(e) => handleDelayChange(parseInt(e.target.value) || 0)}
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-amber-500/50 outline-none transition-all"
                />
                <p className="mt-2 text-xs text-slate-400">
                    Wait this many seconds before sending the message (0-300 seconds).
                </p>
            </div>

            {/* URL Buttons */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <label className="text-xs md:text-sm font-semibold text-slate-300">
                        <Link className="w-4 h-4 inline mr-2" />
                        URL Buttons (optional, max 3)
                    </label>
                    <button
                        type="button"
                        onClick={addButton}
                        disabled={buttons.length >= 3}
                        className="px-3 py-1 bg-amber-500 text-white text-xs rounded-lg hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                    >
                        <Plus className="w-3 h-3" />
                        Add Button
                    </button>
                </div>

                {buttons.length > 0 && (
                    <div className="space-y-4">
                        {buttons.map((button, index) => (
                            <div key={index} className="p-4 bg-white/5 border border-white/10 rounded-xl space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium text-slate-400">Button {index + 1}</span>
                                    <button
                                        type="button"
                                        onClick={() => removeButton(index)}
                                        className="w-6 h-6 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 flex items-center justify-center"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>

                                <input
                                    type="text"
                                    value={button.title}
                                    onChange={(e) => updateButton(index, 'title', e.target.value)}
                                    placeholder="Button text (e.g., Visit Website)"
                                    maxLength={20}
                                    className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-amber-500/50 outline-none"
                                />

                                <input
                                    type="url"
                                    value={button.url}
                                    onChange={(e) => updateButton(index, 'url', e.target.value)}
                                    placeholder="https://example.com"
                                    className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-amber-500/50 outline-none"
                                />

                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Webview Size</label>
                                    <div className="flex gap-2">
                                        {(['compact', 'tall', 'full'] as const).map((size) => (
                                            <button
                                                key={size}
                                                type="button"
                                                onClick={() => updateButton(index, 'webviewHeight', size)}
                                                className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${button.webviewHeight === size
                                                    ? 'bg-amber-500 text-white'
                                                    : 'bg-white/5 text-slate-400 hover:bg-white/10'
                                                    }`}
                                            >
                                                {size.charAt(0).toUpperCase() + size.slice(1)}
                                            </button>
                                        ))}
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1">
                                        {button.webviewHeight === 'compact' && 'Opens a small webview (50% screen height)'}
                                        {button.webviewHeight === 'tall' && 'Opens a tall webview (75% screen height)'}
                                        {button.webviewHeight === 'full' && 'Opens a full-screen webview'}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {buttons.length === 0 && (
                    <p className="text-xs text-slate-500">
                        Optionally add URL buttons that open a webpage when clicked.
                    </p>
                )}
            </div>

            {/* Info */}
            <CollapsibleTips title="Tips & Info" color="amber">
                <p className="text-xs md:text-sm">
                    <strong>Use this node to:</strong>
                </p>
                <ul className="mt-2 text-xs md:text-sm space-y-1 list-disc list-inside opacity-90">
                    <li>Send a text message to users</li>
                    <li>Add a delay before sending (with typing indicator)</li>
                    <li>Include URL buttons that open websites</li>
                </ul>
            </CollapsibleTips>

            {/* Preview */}
            {textContent && (
                <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
                    <h4 className="text-sm font-semibold text-slate-300 mb-2">Message Preview</h4>
                    <div className="bg-indigo-500/20 border border-indigo-500/30 rounded-xl px-4 py-3">
                        <p className="text-sm text-white whitespace-pre-wrap">{textContent}</p>
                        {buttons.filter(b => b.title && b.url).length > 0 && (
                            <div className="mt-3 space-y-2">
                                {buttons.filter(b => b.title && b.url).map((btn, i) => (
                                    <div key={i} className="flex items-center gap-2 px-3 py-2 bg-blue-500/30 rounded-lg text-sm text-blue-200">
                                        <Link className="w-3 h-3" />
                                        {btn.title}
                                        <span className="text-xs text-blue-300/60 ml-auto">({btn.webviewHeight})</span>
                                    </div>
                                ))}
                            </div>
                        )}
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
