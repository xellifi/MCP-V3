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
                    w-[220px]
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

                {/* Expanded Content - Actual Form Preview */}
                {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-purple-500/20">
                        {/* Form Preview Card */}
                        <div className="bg-white rounded-lg overflow-hidden shadow-lg">
                            {/* Promo Banner - shows when countdown/promo is enabled */}
                            {(data.countdownEnabled || data.headerImageUrl) && (
                                <div className="py-1.5 px-2 bg-gradient-to-r from-red-400 via-rose-400 to-pink-300">
                                    <div className="flex items-center justify-center gap-1 text-[9px]">
                                        <span>{data.promoIcon || '🔥'}</span>
                                        <span className="text-white font-bold drop-shadow">{data.promoText || 'Promo Only!'}</span>
                                        <span>{data.promoIcon || '🔥'}</span>
                                    </div>
                                </div>
                            )}

                            {/* Header Image */}
                            {data.headerImageUrl && (
                                <div className="p-2 bg-slate-50">
                                    <img
                                        src={data.headerImageUrl}
                                        alt="Product"
                                        className="w-full h-20 object-contain"
                                    />
                                </div>
                            )}

                            {/* Product Name Badge */}
                            {data.productName && (
                                <div className="mx-2 my-1.5">
                                    <div className="py-1 px-2 bg-indigo-600 rounded">
                                        <p className="text-[9px] font-bold text-white text-center uppercase tracking-wide truncate">
                                            {data.productName}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Form Content */}
                            <div className="p-2">
                                {/* Step Indicator */}
                                <div className="flex items-center justify-center gap-1 mb-2">
                                    {[1, 2, 3].map(s => (
                                        <div key={s} className="flex items-center">
                                            <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold ${s === 1 ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-400'}`}>
                                                {s}
                                            </div>
                                            {s < 3 && <div className="w-3 h-0.5 bg-gray-200"></div>}
                                        </div>
                                    ))}
                                </div>

                                {/* Fields Preview */}
                                {hasFields && (
                                    <div className="space-y-1">
                                        {fields.slice(0, 3).map((field: any, index: number) => (
                                            <div key={field.id || index}>
                                                <p className="text-[8px] text-gray-500 mb-0.5">
                                                    {field.label} {field.required && <span className="text-red-500">*</span>}
                                                </p>
                                                <div className="h-5 bg-gray-100 rounded border border-gray-200"></div>
                                            </div>
                                        ))}
                                        {fields.length > 3 && (
                                            <p className="text-[8px] text-gray-400 text-center">+{fields.length - 3} more fields</p>
                                        )}
                                    </div>
                                )}

                                {/* Submit Button */}
                                <div
                                    className="mt-2 py-1.5 rounded text-[10px] font-bold text-center text-white uppercase tracking-wide"
                                    style={{ backgroundColor: submitButtonColor }}
                                >
                                    {submitButtonText}
                                </div>
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
            {/* Single output handle */}
            <Handle
                type="source"
                position={Position.Right}
                className="w-3 h-3 !bg-purple-400 !border-2 !border-white"
            />
        </div>
    );
};

export default CustomFormNode;
