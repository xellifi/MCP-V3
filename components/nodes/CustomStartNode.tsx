import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Play, Settings, Trash2 } from 'lucide-react';

const CustomStartNode: React.FC<NodeProps> = ({ data, selected }) => {
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

    const keywords = data.keywords || [];

    return (
        <div className="relative group">
            {/* FB Page Logo - Top Left */}
            {data.pageImageUrl && (
                <img
                    src={data.pageImageUrl}
                    alt={data.pageName || 'Page'}
                    className="absolute -top-2 -left-2 w-8 h-8 rounded-full border-2 border-white shadow-lg z-10 object-cover"
                    onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(data.pageName || 'Page')}&background=1877F2&color=fff&size=32`;
                    }}
                />
            )}
            {/* Node Container */}
            <div
                className={`
                    relative px-6 py-4 rounded-2xl
                    bg-emerald-500/10 hover:bg-emerald-500/20 backdrop-blur-md
                    border ${selected ? 'border-emerald-500/50 shadow-2xl shadow-emerald-500/20' : 'border-emerald-500/30 shadow-xl'}
                    transition-all duration-300
                    min-w-[180px]
                `}
            >
                {/* Icon and Label */}
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/20 rounded-lg backdrop-blur-sm">
                        <Play className="w-5 h-5 text-emerald-400" fill="currentColor" />
                    </div>
                    <div className="flex-1">
                        <div className="text-slate-200 font-bold text-sm">
                            {data.label || 'Start'}
                        </div>
                        {keywords.length > 0 && (
                            <div className="text-emerald-300 text-xs mt-0.5">
                                {keywords.length} keyword{keywords.length !== 1 ? 's' : ''}
                            </div>
                        )}
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="absolute -top-3 -right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    <button
                        onClick={handleConfigure}
                        className="w-7 h-7 bg-emerald-500 rounded-full shadow-lg flex items-center justify-center hover:bg-emerald-600 transition-colors"
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

            {/* Only source handle - Start nodes don't have inputs */}
            <Handle
                type="source"
                position={Position.Right}
                className="w-3 h-3 !bg-emerald-400 !border-2 !border-white"
            />
        </div>
    );
};

export default CustomStartNode;
