import React, { useState, useEffect } from 'react';
import { Plus, X, MousePointer2 } from 'lucide-react';
import CollapsibleTips from './CollapsibleTips';

interface ButtonNodeFormProps {
    userId: string;
    initialConfig?: {
        messageText?: string;
        buttons?: Array<{ title: string; payload: string }>;
    };
    onChange: (config: any) => void;
}

const ButtonNodeForm: React.FC<ButtonNodeFormProps> = ({
    userId,
    initialConfig,
    onChange
}) => {
    const [messageText, setMessageText] = useState(initialConfig?.messageText || '');
    const [buttons, setButtons] = useState<Array<{ title: string; payload: string }>>(
        initialConfig?.buttons && initialConfig.buttons.length > 0
            ? initialConfig.buttons
            : [{ title: '', payload: '' }]
    );

    const notifyChange = (newMessageText: string, newButtons: Array<{ title: string; payload: string }>) => {
        const validButtons = newButtons.filter(b => b.title && b.payload);
        onChange({ messageText: newMessageText, buttons: validButtons });
    };

    const handleMessageChange = (value: string) => {
        setMessageText(value);
        notifyChange(value, buttons);
    };

    const addButton = () => {
        if (buttons.length < 13) {
            const newButtons = [...buttons, { title: '', payload: '' }];
            setButtons(newButtons);
            notifyChange(messageText, newButtons);
        }
    };

    const removeButton = (index: number) => {
        const newButtons = buttons.filter((_, i) => i !== index);
        setButtons(newButtons);
        notifyChange(messageText, newButtons);
    };

    const updateButton = (index: number, field: 'title' | 'payload', value: string) => {
        const newButtons = [...buttons];
        newButtons[index][field] = value;
        setButtons(newButtons);
        notifyChange(messageText, newButtons);
    };

    return (
        <div className="space-y-6">
            {/* Message Text */}
            <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                    Message Text
                </label>
                <textarea
                    value={messageText}
                    onChange={(e) => handleMessageChange(e.target.value)}
                    placeholder="Enter your message..."
                    rows={3}
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all placeholder-slate-500 resize-y min-h-[80px]"
                />
            </div>

            {/* Buttons */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-semibold text-slate-300">
                        <MousePointer2 className="w-4 h-4 inline mr-2" />
                        Quick Reply Buttons (max 13)
                    </label>
                    <button
                        onClick={addButton}
                        disabled={buttons.length >= 13}
                        className="px-3 py-1 bg-blue-500 text-white text-xs rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                    >
                        <Plus className="w-3 h-3" />
                        Add Button
                    </button>
                </div>

                <div className="space-y-3">
                    {buttons.map((button, index) => (
                        <div key={index} className="flex gap-2">
                            <input
                                type="text"
                                value={button.title}
                                onChange={(e) => updateButton(index, 'title', e.target.value)}
                                placeholder="Button text"
                                maxLength={20}
                                className="flex-1 bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-blue-500/50 outline-none"
                            />
                            <input
                                type="text"
                                value={button.payload}
                                onChange={(e) => updateButton(index, 'payload', e.target.value)}
                                placeholder="Payload (e.g., BUTTON_1)"
                                className="flex-1 bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-blue-500/50 outline-none"
                            />
                            <button
                                onClick={() => removeButton(index)}
                                className="w-8 h-8 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 flex items-center justify-center"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Info */}
            <CollapsibleTips title="Tips & Info" color="blue">
                <p className="text-sm">
                    <strong>Quick Replies:</strong> Users will see clickable buttons below your message. When clicked, the payload is sent back to your bot.
                </p>
            </CollapsibleTips>
        </div>
    );
};

export default ButtonNodeForm;
