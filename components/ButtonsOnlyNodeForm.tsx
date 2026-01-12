import React, { useState } from 'react';
import { Plus, X, SquareMousePointer } from 'lucide-react';
import CollapsibleTips from './CollapsibleTips';
import { useTheme } from '../context/ThemeContext';

interface ButtonsOnlyNodeFormProps {
    userId: string;
    initialConfig?: {
        buttons?: Array<{ title: string; payload: string }>;
    };
    onChange: (config: any) => void;
}

const ButtonsOnlyNodeForm: React.FC<ButtonsOnlyNodeFormProps> = ({
    userId,
    initialConfig,
    onChange
}) => {
    const { isDark } = useTheme();
    const [buttons, setButtons] = useState<Array<{ title: string; payload: string }>>(
        initialConfig?.buttons && initialConfig.buttons.length > 0
            ? initialConfig.buttons
            : [{ title: '', payload: '' }]
    );

    const notifyChange = (newButtons: Array<{ title: string; payload: string }>) => {
        const validButtons = newButtons.filter(b => b.title && b.payload);
        onChange({ buttons: validButtons });
    };

    const addButton = () => {
        if (buttons.length < 13) {
            const newButtons = [...buttons, { title: '', payload: '' }];
            setButtons(newButtons);
            notifyChange(newButtons);
        }
    };

    const removeButton = (index: number) => {
        const newButtons = buttons.filter((_, i) => i !== index);
        setButtons(newButtons);
        notifyChange(newButtons);
    };

    const updateButton = (index: number, field: 'title' | 'payload', value: string) => {
        const newButtons = [...buttons];
        newButtons[index][field] = value;
        setButtons(newButtons);
        notifyChange(newButtons);
    };

    return (
        <div className="space-y-6">
            {/* Buttons */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <label className={`text-sm font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        <SquareMousePointer className="w-4 h-4 inline mr-2" />
                        Quick Reply Buttons (max 13)
                    </label>
                    <button
                        onClick={addButton}
                        disabled={buttons.length >= 13}
                        className="px-3 py-1 bg-indigo-500 text-white text-xs rounded-lg hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
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
                                className={`flex-1 ${isDark ? 'bg-black/20 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'} border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/50 outline-none`}
                            />
                            <input
                                type="text"
                                value={button.payload}
                                onChange={(e) => updateButton(index, 'payload', e.target.value)}
                                placeholder="Payload (e.g., BUTTON_1)"
                                className={`flex-1 ${isDark ? 'bg-black/20 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'} border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/50 outline-none`}
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
            <CollapsibleTips title="Tips & Info" color="indigo">
                <p className="text-sm">
                    <strong>Buttons Only:</strong> Users will see clickable buttons without any text message. When clicked, the payload is sent back to your bot.
                </p>
            </CollapsibleTips>
        </div>
    );
};

export default ButtonsOnlyNodeForm;
