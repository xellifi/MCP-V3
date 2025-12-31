import React, { useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { FileText, Settings, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

const CustomFormNode: React.FC<NodeProps> = ({ data, selected }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const handleConfigure = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (data.onConfigure) {
            data.onConfigure();
        }
    };

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (data.onDelete) {
            data.onDelete();
        }
    };

    const toggleExpand = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsExpanded(!isExpanded);
    };

    // Get form fields from config
    const fields = data.fields || [];
    const hasFields = fields.length > 0;
    const formName = data.formName || data.label || 'Form';
    const submitButtonText = data.submitButtonText || 'Submit';
    const submitButtonColor = data.submitButtonColor || '#6366f1';

    return (
        <div className="relative group">
            {/* Node Container */}
            <div
                className={`
                    relative px-4 py-3 rounded-2xl
                    bg-purple-500/10 hover:bg-purple-500/20 backdrop-blur-md
                    border ${selected ? 'border-purple-500/50 shadow-2xl shadow-purple-500/20' : 'border-purple-500/30 shadow-xl'}
                    transition-all duration-300
                    w-[200px]
                `}
            >
                {/* Header - Icon, Label, and Expand Toggle */}
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-500/20 rounded-lg backdrop-blur-sm flex-shrink-0">
                        <FileText className="w-5 h-5 text-purple-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="text-slate-200 font-bold text-sm truncate">
                            {formName}
                        </div>
                        {/* Collapsed preview */}
                        {!isExpanded && (
                            <div className="text-slate-400 text-xs mt-0.5">
                                {hasFields ? `${fields.length} field${fields.length > 1 ? 's' : ''}` : 'No fields'}
                            </div>
                        )}
                    </div>
                    {/* Expand/Collapse Toggle */}
                    <button
                        onClick={toggleExpand}
                        className="p-1 hover:bg-purple-500/30 rounded-lg transition-colors flex-shrink-0"
                        title={isExpanded ? 'Collapse' : 'Expand details'}
                    >
                        {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-purple-400" />
                        ) : (
                            <ChevronDown className="w-4 h-4 text-purple-400" />
                        )}
                    </button>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-purple-500/20">
                        {/* Header Image Preview */}
                        {data.headerImageUrl && (
                            <div className="mb-2 rounded-lg overflow-hidden border border-purple-500/20">
                                <img
                                    src={data.headerImageUrl}
                                    alt="Form header"
                                    className="w-full h-16 object-cover"
                                />
                            </div>
                        )}

                        {/* Fields Preview */}
                        {hasFields ? (
                            <div className="space-y-1.5">
                                <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                                    📋 Form Fields
                                </div>
                                {fields.slice(0, 4).map((field: any, index: number) => (
                                    <div
                                        key={field.id || index}
                                        className="flex items-center gap-2 px-2 py-1 bg-slate-800/40 rounded-lg border border-slate-600/30"
                                    >
                                        <span className="text-[10px] text-purple-400 font-mono uppercase">
                                            {field.type}
                                        </span>
                                        <span className="text-xs text-slate-300 truncate flex-1">
                                            {field.label}
                                        </span>
                                        {field.required && (
                                            <span className="text-red-400 text-xs">*</span>
                                        )}
                                    </div>
                                ))}
                                {fields.length > 4 && (
                                    <div className="text-xs text-slate-500 text-center">
                                        +{fields.length - 4} more fields
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-slate-500 text-xs text-center py-2">
                                Click configure to add fields
                            </div>
                        )}

                        {/* Submit Button Preview */}
                        <div className="mt-2 pt-2 border-t border-purple-500/20">
                            <div
                                className="w-full py-1.5 rounded-lg text-xs font-semibold text-center text-white"
                                style={{ backgroundColor: submitButtonColor }}
                            >
                                {submitButtonText}
                            </div>
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="absolute -top-3 -right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    <button
                        onClick={handleConfigure}
                        className="w-7 h-7 bg-blue-500 rounded-full shadow-lg flex items-center justify-center hover:bg-blue-600 transition-colors"
                        title="Configure"
                    >
                        <Settings className="w-4 h-4 text-white" />
                    </button>
                    <button
                        onClick={handleDelete}
                        className="w-7 h-7 bg-red-500 rounded-full shadow-lg flex items-center justify-center hover:bg-red-600 transition-colors"
                        title="Delete"
                    >
                        <Trash2 className="w-4 h-4 text-white" />
                    </button>
                </div>
            </div>

            {/* Handles */}
            <Handle
                type="target"
                position={Position.Left}
                className="w-3 h-3 !bg-purple-400 !border-2 !border-white"
            />
            {/* Main flow output */}
            <Handle
                type="source"
                position={Position.Right}
                id="flow"
                className="w-3 h-3 !bg-purple-400 !border-2 !border-white"
                style={{ top: '30%' }}
            />
            {/* Google Sheets output */}
            <Handle
                type="source"
                position={Position.Right}
                id="sheets"
                className="w-3 h-3 !bg-green-500 !border-2 !border-white"
                style={{ top: '70%' }}
                title="Connect to Google Sheets"
            />
            {/* Labels for handles */}
            <div className="absolute right-[-45px] top-[25%] text-[9px] text-slate-400">Flow</div>
            <div className="absolute right-[-55px] top-[65%] text-[9px] text-green-400">Sheets</div>
        </div>
    );
};

export default CustomFormNode;
