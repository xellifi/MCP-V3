import React, { useState, useEffect } from 'react';
import { Plus, Trash2, GripVertical, Upload, ChevronDown, ChevronUp, Eye } from 'lucide-react';
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
    };
    onChange: (config: any) => void;
}

const FIELD_TYPES = [
    { value: 'text', label: 'Text Input' },
    { value: 'email', label: 'Email' },
    { value: 'phone', label: 'Phone Number' },
    { value: 'number', label: 'Number' },
    { value: 'textarea', label: 'Text Area' },
    { value: 'select', label: 'Dropdown Select' },
    { value: 'radio', label: 'Radio Buttons' },
    { value: 'checkbox', label: 'Checkbox' },
];

const BORDER_RADIUS_OPTIONS = [
    { value: 'rounded', label: 'Rounded (8px)', preview: 'rounded-lg' },
    { value: 'round', label: 'Round (16px)', preview: 'rounded-2xl' },
    { value: 'full', label: 'Full (Pill)', preview: 'rounded-full' },
];

const COLOR_PRESETS = [
    '#6366f1', // Indigo
    '#8b5cf6', // Purple
    '#ec4899', // Pink
    '#f43f5e', // Rose
    '#ef4444', // Red
    '#f97316', // Orange
    '#eab308', // Yellow
    '#22c55e', // Green
    '#14b8a6', // Teal
    '#0ea5e9', // Sky
    '#3b82f6', // Blue
];

const FormNodeForm: React.FC<FormNodeFormProps> = ({ workspaceId, initialConfig, onChange }) => {
    const [formName, setFormName] = useState(initialConfig?.formName || 'My Form');
    const [headerImageUrl, setHeaderImageUrl] = useState(initialConfig?.headerImageUrl || '');
    const [submitButtonText, setSubmitButtonText] = useState(initialConfig?.submitButtonText || 'Submit');
    const [submitButtonColor, setSubmitButtonColor] = useState(initialConfig?.submitButtonColor || '#6366f1');
    const [borderRadius, setBorderRadius] = useState<'rounded' | 'round' | 'full'>(initialConfig?.borderRadius || 'rounded');
    const [successMessage, setSuccessMessage] = useState(initialConfig?.successMessage || 'Thank you for your submission!');
    const [googleSheetId, setGoogleSheetId] = useState(initialConfig?.googleSheetId || '');
    const [googleSheetName, setGoogleSheetName] = useState(initialConfig?.googleSheetName || '');
    const [fields, setFields] = useState<FormField[]>(initialConfig?.fields || []);
    const [expandedSection, setExpandedSection] = useState<string[]>(['fields', 'styling']);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

    // Notify parent of changes
    useEffect(() => {
        onChange({
            formName,
            headerImageUrl,
            submitButtonText,
            submitButtonColor,
            borderRadius,
            successMessage,
            googleSheetId,
            googleSheetName,
            fields,
        });
    }, [formName, headerImageUrl, submitButtonText, submitButtonColor, borderRadius, successMessage, googleSheetId, googleSheetName, fields]);

    const toggleSection = (section: string) => {
        setExpandedSection(prev =>
            prev.includes(section) ? prev.filter(s => s !== section) : [...prev, section]
        );
    };

    const addField = () => {
        const newField: FormField = {
            id: `field_${Date.now()}`,
            type: 'text',
            label: `Field ${fields.length + 1}`,
            placeholder: '',
            required: false,
            options: [],
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

    // Drag and drop handlers
    const handleDragStart = (index: number) => {
        setDraggedIndex(index);
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (draggedIndex !== null && draggedIndex !== index) {
            moveField(draggedIndex, index);
            setDraggedIndex(index);
        }
    };

    const handleDragEnd = () => {
        setDraggedIndex(null);
    };

    const getBorderRadiusClass = () => {
        switch (borderRadius) {
            case 'round': return 'rounded-2xl';
            case 'full': return 'rounded-full';
            default: return 'rounded-lg';
        }
    };

    return (
        <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent">
            {/* Form Name */}
            <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Form Name</label>
                <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Enter form name..."
                    className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                />
            </div>

            {/* Header Image Section */}
            <div className="border border-white/10 rounded-xl overflow-hidden">
                <button
                    onClick={() => toggleSection('header')}
                    className="w-full flex items-center justify-between px-4 py-3 bg-slate-800/30 hover:bg-slate-800/50 transition-colors"
                >
                    <span className="flex items-center gap-2 text-sm font-medium text-slate-300">
                        <Upload className="w-4 h-4 text-purple-400" />
                        Header Image
                    </span>
                    {expandedSection.includes('header') ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                </button>
                {expandedSection.includes('header') && (
                    <div className="p-4 space-y-3">
                        <input
                            type="text"
                            value={headerImageUrl}
                            onChange={(e) => setHeaderImageUrl(e.target.value)}
                            placeholder="Enter image URL or upload..."
                            className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                        />
                        {headerImageUrl && (
                            <div className="relative rounded-xl overflow-hidden border border-white/10">
                                <img src={headerImageUrl} alt="Header preview" className="w-full h-32 object-cover" />
                                <button
                                    onClick={() => setHeaderImageUrl('')}
                                    className="absolute top-2 right-2 p-1.5 bg-red-500/80 hover:bg-red-500 rounded-lg text-white transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Form Fields Section */}
            <div className="border border-white/10 rounded-xl overflow-hidden">
                <button
                    onClick={() => toggleSection('fields')}
                    className="w-full flex items-center justify-between px-4 py-3 bg-slate-800/30 hover:bg-slate-800/50 transition-colors"
                >
                    <span className="flex items-center gap-2 text-sm font-medium text-slate-300">
                        📋 Form Fields
                        <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded-lg text-xs">
                            {fields.length}
                        </span>
                    </span>
                    {expandedSection.includes('fields') ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                </button>
                {expandedSection.includes('fields') && (
                    <div className="p-4 space-y-3">
                        {fields.map((field, index) => (
                            <div
                                key={field.id}
                                draggable
                                onDragStart={() => handleDragStart(index)}
                                onDragOver={(e) => handleDragOver(e, index)}
                                onDragEnd={handleDragEnd}
                                className={`bg-slate-800/40 border border-white/10 rounded-xl p-4 space-y-3 transition-all ${draggedIndex === index ? 'opacity-50 scale-95' : ''
                                    }`}
                            >
                                {/* Field Header */}
                                <div className="flex items-center gap-2">
                                    <GripVertical className="w-4 h-4 text-slate-500 cursor-grab active:cursor-grabbing" />
                                    <span className="text-xs font-semibold text-slate-400 uppercase">{field.type}</span>
                                    <div className="flex-1" />
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={field.required}
                                            onChange={(e) => updateField(index, { required: e.target.checked })}
                                            className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-purple-500 focus:ring-purple-500/50"
                                        />
                                        <span className="text-xs text-slate-400">Required</span>
                                    </label>
                                    <button
                                        onClick={() => removeField(index)}
                                        className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-lg transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>

                                {/* Field Type */}
                                <select
                                    value={field.type}
                                    onChange={(e) => updateField(index, { type: e.target.value as FormField['type'] })}
                                    className="w-full px-3 py-2 bg-slate-700/50 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                                >
                                    {FIELD_TYPES.map((type) => (
                                        <option key={type.value} value={type.value}>{type.label}</option>
                                    ))}
                                </select>

                                {/* Field Label */}
                                <input
                                    type="text"
                                    value={field.label}
                                    onChange={(e) => updateField(index, { label: e.target.value })}
                                    placeholder="Field label..."
                                    className="w-full px-3 py-2 bg-slate-700/50 border border-white/10 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                                />

                                {/* Placeholder (for applicable types) */}
                                {['text', 'email', 'phone', 'number', 'textarea'].includes(field.type) && (
                                    <input
                                        type="text"
                                        value={field.placeholder || ''}
                                        onChange={(e) => updateField(index, { placeholder: e.target.value })}
                                        placeholder="Placeholder text..."
                                        className="w-full px-3 py-2 bg-slate-700/50 border border-white/10 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                                    />
                                )}

                                {/* Options (for select/radio) */}
                                {['select', 'radio'].includes(field.type) && (
                                    <div className="space-y-2">
                                        <label className="text-xs text-slate-400">Options (one per line)</label>
                                        <textarea
                                            value={(field.options || []).join('\n')}
                                            onChange={(e) => updateField(index, { options: e.target.value.split('\n').filter(o => o.trim()) })}
                                            placeholder="Option 1&#10;Option 2&#10;Option 3"
                                            rows={3}
                                            className="w-full px-3 py-2 bg-slate-700/50 border border-white/10 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none"
                                        />
                                    </div>
                                )}
                            </div>
                        ))}

                        <button
                            onClick={addField}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 rounded-xl text-purple-400 font-medium transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            Add Field
                        </button>
                    </div>
                )}
            </div>

            {/* Styling Section */}
            <div className="border border-white/10 rounded-xl overflow-hidden">
                <button
                    onClick={() => toggleSection('styling')}
                    className="w-full flex items-center justify-between px-4 py-3 bg-slate-800/30 hover:bg-slate-800/50 transition-colors"
                >
                    <span className="flex items-center gap-2 text-sm font-medium text-slate-300">
                        🎨 Button & Styling
                    </span>
                    {expandedSection.includes('styling') ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                </button>
                {expandedSection.includes('styling') && (
                    <div className="p-4 space-y-4">
                        {/* Button Text */}
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-2">Button Text</label>
                            <input
                                type="text"
                                value={submitButtonText}
                                onChange={(e) => setSubmitButtonText(e.target.value)}
                                placeholder="Submit"
                                className="w-full px-3 py-2 bg-slate-700/50 border border-white/10 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                            />
                        </div>

                        {/* Button Color */}
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-2">Button Color</label>
                            <div className="flex flex-wrap gap-2 mb-2">
                                {COLOR_PRESETS.map((color) => (
                                    <button
                                        key={color}
                                        onClick={() => setSubmitButtonColor(color)}
                                        className={`w-8 h-8 rounded-lg transition-transform hover:scale-110 ${submitButtonColor === color ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900' : ''
                                            }`}
                                        style={{ backgroundColor: color }}
                                    />
                                ))}
                            </div>
                            <input
                                type="text"
                                value={submitButtonColor}
                                onChange={(e) => setSubmitButtonColor(e.target.value)}
                                placeholder="#6366f1"
                                className="w-full px-3 py-2 bg-slate-700/50 border border-white/10 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                            />
                        </div>

                        {/* Border Radius */}
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-2">Border Radius</label>
                            <div className="flex gap-2">
                                {BORDER_RADIUS_OPTIONS.map((option) => (
                                    <button
                                        key={option.value}
                                        onClick={() => setBorderRadius(option.value as 'rounded' | 'round' | 'full')}
                                        className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${borderRadius === option.value
                                                ? 'bg-purple-500/30 border-purple-500/50 text-purple-300'
                                                : 'bg-slate-700/50 border-white/10 text-slate-400 hover:bg-slate-700'
                                            }`}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Preview */}
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-2">Preview</label>
                            <button
                                className={`w-full py-3 text-white font-semibold transition-all ${getBorderRadiusClass()}`}
                                style={{ backgroundColor: submitButtonColor }}
                            >
                                {submitButtonText || 'Submit'}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Success Message */}
            <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Success Message</label>
                <textarea
                    value={successMessage}
                    onChange={(e) => setSuccessMessage(e.target.value)}
                    placeholder="Thank you for your submission!"
                    rows={2}
                    className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none"
                />
            </div>

            {/* Google Sheets Section */}
            <div className="border border-white/10 rounded-xl overflow-hidden">
                <button
                    onClick={() => toggleSection('sheets')}
                    className="w-full flex items-center justify-between px-4 py-3 bg-slate-800/30 hover:bg-slate-800/50 transition-colors"
                >
                    <span className="flex items-center gap-2 text-sm font-medium text-slate-300">
                        📊 Google Sheets Integration
                        {googleSheetId && (
                            <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded-lg text-xs">
                                Connected
                            </span>
                        )}
                    </span>
                    {expandedSection.includes('sheets') ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                </button>
                {expandedSection.includes('sheets') && (
                    <div className="p-4 space-y-3">
                        <p className="text-xs text-slate-500">
                            Connect a Google Sheet to automatically save form submissions.
                        </p>
                        <input
                            type="text"
                            value={googleSheetId}
                            onChange={(e) => setGoogleSheetId(e.target.value)}
                            placeholder="Google Sheet ID..."
                            className="w-full px-3 py-2 bg-slate-700/50 border border-white/10 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                        />
                        <input
                            type="text"
                            value={googleSheetName}
                            onChange={(e) => setGoogleSheetName(e.target.value)}
                            placeholder="Sheet name (e.g., Sheet1)..."
                            className="w-full px-3 py-2 bg-slate-700/50 border border-white/10 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default FormNodeForm;
