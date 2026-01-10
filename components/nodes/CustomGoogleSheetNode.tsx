import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Settings, Trash2, Check, AlertCircle, Copy } from 'lucide-react';
import NodeInsights from '../NodeInsights';

// Google Sheets icon as SVG
const SheetsIcon = () => (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
        <rect x="3" y="3" width="18" height="18" rx="2" className="fill-green-500" />
        <rect x="6" y="7" width="12" height="2" rx="0.5" className="fill-white" />
        <rect x="6" y="11" width="12" height="2" rx="0.5" className="fill-white" />
        <rect x="6" y="15" width="8" height="2" rx="0.5" className="fill-white" />
    </svg>
);

const CustomGoogleSheetNode: React.FC<NodeProps> = ({ data, selected }) => {
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

    const handleClone = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (data.onClone) {
            data.onClone();
        }
    };

    const sheetName = data.sheetName || 'Sheet1';
    const spreadsheetId = data.spreadsheetId || '';
    const webhookUrl = data.webhookUrl || '';
    const sourceType = data.sourceType || 'auto';
    const hasSpreadsheet = !!spreadsheetId && spreadsheetId.length > 10;
    const hasWebhook = !!webhookUrl && webhookUrl.includes('script.google.com');
    const isFullyConfigured = hasSpreadsheet && hasWebhook;

    const getSourceLabel = () => {
        switch (sourceType) {
            case 'form': return '📝 Form Data';
            case 'checkout': return '🛒 Order Data';
            default: return '🔗 Auto-detect';
        }
    };

    return (
        <div className="relative group">
            {/* Node Container */}
            <div
                className={`
                    relative px-4 py-3 rounded-2xl
                    bg-green-500/10 hover:bg-green-500/20 backdrop-blur-md
                    border ${selected ? 'border-green-500/50 shadow-2xl shadow-green-500/20' : 'border-green-500/30 shadow-xl'}
                    transition-all duration-300
                    w-[180px]
                `}
            >
                {/* Header */}
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-500/20 rounded-lg backdrop-blur-sm flex-shrink-0">
                        <SheetsIcon />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="text-slate-200 font-bold text-sm truncate">
                            Google Sheets
                        </div>
                        <div className={`text-xs mt-0.5 ${isFullyConfigured ? 'text-green-400' : hasSpreadsheet ? 'text-orange-400' : 'text-slate-500'}`}>
                            {isFullyConfigured ? sheetName : hasSpreadsheet ? 'Missing webhook' : 'Not configured'}
                        </div>
                    </div>
                </div>

                {/* Status Indicator */}
                <div className="mt-2 pt-2 border-t border-green-500/20">
                    {isFullyConfigured ? (
                        <>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                <span className="text-xs text-green-400">Ready to sync</span>
                            </div>
                            <div className="text-[10px] text-slate-400 mt-1">
                                {getSourceLabel()}
                            </div>
                        </>
                    ) : hasSpreadsheet ? (
                        <div className="flex items-center gap-2">
                            <AlertCircle className="w-3 h-3 text-orange-400" />
                            <span className="text-xs text-orange-400">Add webhook URL</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-slate-500 rounded-full"></div>
                            <span className="text-xs text-slate-500">Click ⚙️ to configure</span>
                        </div>
                    )}

                    {hasSpreadsheet && (
                        <div className="text-[10px] text-slate-500 mt-1 truncate" title={spreadsheetId}>
                            ID: {spreadsheetId.substring(0, 12)}...
                        </div>
                    )}
                </div>

                {/* Node Insights */}
                <NodeInsights
                    sent={data.analytics?.sent}
                    delivered={data.analytics?.delivered}
                    subscribers={data.analytics?.subscribers}
                    errors={data.analytics?.errors}
                />

                {/* Action Buttons */}
                <div className="absolute -top-3 -right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    <button
                        onClick={handleClone}
                        className="w-7 h-7 bg-slate-600 rounded-full shadow-lg flex items-center justify-center hover:bg-slate-500 transition-colors"
                        title="Clone node"
                    >
                        <Copy className="w-4 h-4 text-white" />
                    </button>
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

            {/* Handle - Input (receives data from Form/Checkout/Invoice node) */}
            <Handle
                type="target"
                position={Position.Left}
                className="w-3 h-3 !bg-green-500 !border-2 !border-white"
                title="Connect from Form, Checkout, or Invoice node"
            />
            {/* Handle - Output (connect to next flow) */}
            <Handle
                type="source"
                position={Position.Right}
                className="w-3 h-3 !bg-green-500 !border-2 !border-white"
                title="Connect to next node"
            />
        </div>
    );
};

export default CustomGoogleSheetNode;
