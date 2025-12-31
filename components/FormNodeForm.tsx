import React, { useState, useEffect } from 'react';
import { Plus, Trash2, GripVertical, Image, Type, Mail, Phone, Hash, AlignLeft, ChevronDown, CircleDot, CheckSquare, Timer, Sparkles } from 'lucide-react';
import { FormField } from '../types';

interface FormNodeFormProps {
    workspaceId: string;
    initialConfig?: {
        formName?: string;
        headerImageUrl?: string;
        submitButtonText?: string;
        submitButtonColor?: string;
        borderRadius?: 'rounded' | 'round' | 'full';
        successMessage?: string;
        googleSheetId?: string;
        googleSheetName?: string;
        fields?: FormField[];
        countdownMinutes?: number;
        countdownEnabled?: boolean;
    };
    onChange: (config: any) => void;
}

const FIELD_TYPES = [
    { value: 'text', label: 'Text', icon: Type },
    { value: 'email', label: 'Email', icon: Mail },
    { value: 'phone', label: 'Phone', icon: Phone },
    { value: 'number', label: 'Number', icon: Hash },
    { value: 'textarea', label: 'Long Text', icon: AlignLeft },
    { value: 'select', label: 'Dropdown', icon: ChevronDown },
    { value: 'radio', label: 'Radio', icon: CircleDot },
    { value: 'checkbox', label: 'Checkbox', icon: CheckSquare },
];

const COLOR_PRESETS = [
    '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
    '#ec4899', '#f43f5e', '#ef4444', '#f97316',
    '#eab308', '#84cc16', '#22c55e', '#14b8a6',
    '#06b6d4', '#0ea5e9', '#3b82f6', '#1e293b',
];

const FormNodeForm: React.FC<FormNodeFormProps> = ({ workspaceId, initialConfig, onChange }) => {
    const [formName, setFormName] = useState(initialConfig?.formName || 'My Form');
    const [headerImageUrl, setHeaderImageUrl] = useState(initialConfig?.headerImageUrl || '');
    const [submitButtonText, setSubmitButtonText] = useState(initialConfig?.submitButtonText || 'Submit');
    const [submitButtonColor, setSubmitButtonColor] = useState(initialConfig?.submitButtonColor || '#6366f1');
    const [borderRadius, setBorderRadius] = useState<'rounded' | 'round' | 'full'>(initialConfig?.borderRadius || 'round');
    const [successMessage, setSuccessMessage] = useState(initialConfig?.successMessage || 'Thank you for your submission!');
    const [fields, setFields] = useState<FormField[]>(initialConfig?.fields || []);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [activeTab, setActiveTab] = useState<'fields' | 'style' | 'settings'>('fields');
    const [countdownEnabled, setCountdownEnabled] = useState(initialConfig?.countdownEnabled || false);
    const [countdownMinutes, setCountdownMinutes] = useState(initialConfig?.countdownMinutes || 10);

    useEffect(() => {
        onChange({
            formName,
            headerImageUrl,
            submitButtonText,
            submitButtonColor,
            borderRadius,
            successMessage,
            fields,
            countdownEnabled,
            countdownMinutes,
        });
    }, [formName, headerImageUrl, submitButtonText, submitButtonColor, borderRadius, successMessage, fields, countdownEnabled, countdownMinutes]);

    const addField = (type: string) => {
        const fieldType = FIELD_TYPES.find(t => t.value === type);
        const newField: FormField = {
            id: `field_${Date.now()}`,
            type: type as FormField['type'],
            label: fieldType?.label || 'New Field',
            placeholder: '',
            required: false,
            options: type === 'select' || type === 'radio' ? ['Option 1', 'Option 2'] : [],
        };
        setFields([...fields, newField]);
    };

    const updateField = (index: number, updates: Partial<FormField>) => {
        const newFields = [...fields];
        newFields[index] = { ...newFields[index], ...updates };
        setFields(newFields);
    };

    const removeField = (index: number) => {
        setFields(fields.filter((_, i) => i !== index));
    };

    const moveField = (fromIndex: number, toIndex: number) => {
        const newFields = [...fields];
        const [removed] = newFields.splice(fromIndex, 1);
        newFields.splice(toIndex, 0, removed);
        setFields(newFields);
    };

    const handleDragStart = (index: number) => setDraggedIndex(index);
    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (draggedIndex !== null && draggedIndex !== index) {
            moveField(draggedIndex, index);
            setDraggedIndex(index);
        }
    };
    const handleDragEnd = () => setDraggedIndex(null);

    const getFieldIcon = (type: string) => {
        const field = FIELD_TYPES.find(t => t.value === type);
        return field?.icon || Type;
    };

    return (
        <div className="space-y-4">
            {/* Form Name */}
            <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Form Name</label>
                <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Enter form name..."
                    className="w-full px-4 py-2.5 bg-slate-800/60 border border-slate-600/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
                />
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-slate-800/60 rounded-xl">
                {[
                    { id: 'fields', label: 'Fields', count: fields.length },
                    { id: 'style', label: 'Style' },
                    { id: 'settings', label: 'Settings' },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${activeTab === tab.id
                                ? 'bg-purple-500 text-white shadow-lg'
                                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                            }`}
                    >
                        {tab.label}
                        {tab.count !== undefined && (
                            <span className={`px-1.5 py-0.5 rounded text-xs ${activeTab === tab.id ? 'bg-purple-600' : 'bg-slate-700'
                                }`}>
                                {tab.count}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Fields Tab */}
            {activeTab === 'fields' && (
                <div className="space-y-3">
                    <div className="grid grid-cols-4 gap-2">
                        {FIELD_TYPES.map((type) => {
                            const Icon = type.icon;
                            return (
                                <button
                                    key={type.value}
                                    onClick={() => addField(type.value)}
                                    className="flex flex-col items-center gap-1 p-2.5 bg-slate-800/40 hover:bg-purple-500/20 border border-slate-600/30 hover:border-purple-500/50 rounded-xl transition-all group"
                                >
                                    <Icon className="w-4 h-4 text-slate-400 group-hover:text-purple-400" />
                                    <span className="text-[10px] text-slate-500 group-hover:text-purple-300">{type.label}</span>
                                </button>
                            );
                        })}
                    </div>

                    <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                        {fields.length === 0 ? (
                            <div className="text-center py-8 text-slate-500 text-sm">
                                Click a field type above to add fields
                            </div>
                        ) : (
                            fields.map((field, index) => {
                                const Icon = getFieldIcon(field.type);
                                return (
                                    <div
                                        key={field.id}
                                        draggable
                                        onDragStart={() => handleDragStart(index)}
                                        onDragOver={(e) => handleDragOver(e, index)}
                                        onDragEnd={handleDragEnd}
                                        className={`bg-slate-800/40 border border-slate-600/30 rounded-xl p-3 transition-all ${draggedIndex === index ? 'opacity-50 scale-95' : ''
                                            }`}
                                    >
                                        <div className="flex items-center gap-2 mb-2">
                                            <GripVertical className="w-4 h-4 text-slate-600 cursor-grab" />
                                            <div className="w-7 h-7 rounded-lg bg-purple-500/20 flex items-center justify-center">
                                                <Icon className="w-3.5 h-3.5 text-purple-400" />
                                            </div>
                                            <input
                                                type="text"
                                                value={field.label}
                                                onChange={(e) => updateField(index, { label: e.target.value })}
                                                className="flex-1 px-2 py-1 bg-transparent border-b border-transparent hover:border-slate-600 focus:border-purple-500 text-sm text-white focus:outline-none"
                                            />
                                            <label className="flex items-center gap-1.5 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={field.required}
                                                    onChange={(e) => updateField(index, { required: e.target.checked })}
                                                    className="w-3.5 h-3.5 rounded border-slate-600 bg-slate-700 text-purple-500"
                                                />
                                                <span className="text-[10px] text-slate-500">Req</span>
                                            </label>
                                            <button
                                                onClick={() => removeField(index)}
                                                className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>

                                        {['text', 'email', 'phone', 'number', 'textarea'].includes(field.type) && (
                                            <input
                                                type="text"
                                                value={field.placeholder || ''}
                                                onChange={(e) => updateField(index, { placeholder: e.target.value })}
                                                placeholder="Placeholder..."
                                                className="w-full px-3 py-1.5 bg-slate-900/50 border border-slate-700/50 rounded-lg text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-purple-500/50"
                                            />
                                        )}

                                        {['select', 'radio'].includes(field.type) && (
                                            <textarea
                                                value={(field.options || []).join('\n')}
                                                onChange={(e) => updateField(index, { options: e.target.value.split('\n').filter(o => o.trim()) })}
                                                placeholder="Option 1&#10;Option 2"
                                                rows={2}
                                                className="w-full px-3 py-1.5 bg-slate-900/50 border border-slate-700/50 rounded-lg text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-purple-500/50 resize-none"
                                            />
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}

            {/* Style Tab */}
            {activeTab === 'style' && (
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">Header Image</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={headerImageUrl}
                                onChange={(e) => setHeaderImageUrl(e.target.value)}
                                placeholder="https://..."
                                className="flex-1 px-4 py-2 bg-slate-800/60 border border-slate-600/50 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                            />
                            {headerImageUrl && (
                                <button onClick={() => setHeaderImageUrl('')} className="p-2 text-red-400 hover:bg-red-500/10 rounded-xl">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                        {headerImageUrl && (
                            <img src={headerImageUrl} alt="" className="mt-2 w-full h-20 object-cover rounded-xl border border-slate-700" />
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Button Text</label>
                            <input
                                type="text"
                                value={submitButtonText}
                                onChange={(e) => setSubmitButtonText(e.target.value)}
                                className="w-full px-3 py-2 bg-slate-800/60 border border-slate-600/50 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Corner Style</label>
                            <select
                                value={borderRadius}
                                onChange={(e) => setBorderRadius(e.target.value as any)}
                                className="w-full px-3 py-2 bg-slate-800/60 border border-slate-600/50 rounded-xl text-white text-sm focus:outline-none cursor-pointer"
                            >
                                <option value="rounded">Rounded</option>
                                <option value="round">Round</option>
                                <option value="full">Pill</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">Button Color</label>
                        <div className="grid grid-cols-8 gap-1.5">
                            {COLOR_PRESETS.map((color) => (
                                <button
                                    key={color}
                                    onClick={() => setSubmitButtonColor(color)}
                                    className={`w-full aspect-square rounded-lg transition-transform hover:scale-110 ${submitButtonColor === color ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900' : ''
                                        }`}
                                    style={{ backgroundColor: color }}
                                />
                            ))}
                        </div>
                    </div>

                    <button
                        className={`w-full py-3 text-white font-semibold text-sm ${borderRadius === 'full' ? 'rounded-full' : borderRadius === 'round' ? 'rounded-2xl' : 'rounded-lg'
                            }`}
                        style={{ backgroundColor: submitButtonColor }}
                    >
                        {submitButtonText || 'Submit'}
                    </button>
                </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
                <div className="space-y-4">
                    {/* Countdown Timer */}
                    <div className="p-4 bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/30 rounded-xl">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <Timer className="w-5 h-5 text-orange-400" />
                                <span className="text-sm font-medium text-white">Countdown Timer</span>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={countdownEnabled}
                                    onChange={(e) => setCountdownEnabled(e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                            </label>
                        </div>
                        {countdownEnabled && (
                            <div className="flex items-center gap-3">
                                <input
                                    type="number"
                                    min="1"
                                    max="60"
                                    value={countdownMinutes}
                                    onChange={(e) => setCountdownMinutes(Math.max(1, Math.min(60, parseInt(e.target.value) || 1)))}
                                    className="w-20 px-3 py-2 bg-slate-800/80 border border-orange-500/30 rounded-lg text-white text-center focus:outline-none focus:border-orange-500"
                                />
                                <span className="text-sm text-slate-400">minutes</span>
                            </div>
                        )}
                        <p className="text-xs text-slate-500 mt-2">Creates urgency with a countdown timer on the form</p>
                    </div>

                    {/* Success Message */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">Success Message</label>
                        <textarea
                            value={successMessage}
                            onChange={(e) => setSuccessMessage(e.target.value)}
                            rows={2}
                            className="w-full px-4 py-2 bg-slate-800/60 border border-slate-600/50 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none"
                        />
                    </div>

                    <div className="p-4 bg-slate-800/30 border border-slate-700/50 rounded-xl opacity-60">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg">📊</span>
                            <span className="text-sm font-medium text-slate-300">Google Sheets</span>
                            <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-[10px] rounded-full">Coming Soon</span>
                        </div>
                        <p className="text-xs text-slate-500">Auto-save submissions to Google Sheets</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FormNodeForm;
