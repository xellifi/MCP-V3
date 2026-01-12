import React, { useState, useEffect } from 'react';
import { Play, Edit3 } from 'lucide-react';
import CollapsibleTips from './CollapsibleTips';
import { useTheme } from '../context/ThemeContext';

interface NewFlowNodeFormProps {
    workspaceId: string;
    pageId?: string;
    initialConfig?: {
        flowName?: string;
    };
    onChange: (config: any) => void;
}

const NewFlowNodeForm: React.FC<NewFlowNodeFormProps> = ({
    workspaceId,
    pageId,
    initialConfig,
    onChange
}) => {
    const { isDark } = useTheme();
    const [flowName, setFlowName] = useState(initialConfig?.flowName || '');

    // Notify parent of changes
    useEffect(() => {
        onChange({ flowName, pageId });
    }, [flowName, pageId]);

    return (
        <div className="space-y-6">
            {/* Flow Name Input */}
            <div>
                <label className={`block text-sm font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'} mb-2`}>
                    <Edit3 className="w-4 h-4 inline mr-2" />
                    Flow Name
                </label>
                <input
                    type="text"
                    value={flowName}
                    onChange={(e) => setFlowName(e.target.value)}
                    placeholder="e.g., Pricing Flow, FAQ Response"
                    className={`w-full ${isDark ? 'bg-black/20 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'} border rounded-xl px-4 py-3 focus:ring-2 focus:ring-green-500/50 focus:border-transparent outline-none transition-all`}
                />
                <p className="text-xs text-slate-500 mt-2">
                    This name will be used when saving the flow to the database.
                </p>
            </div>

            {/* Info Panel */}
            <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
                <div className="flex items-center gap-2 text-green-400 mb-2">
                    <Play className="w-5 h-5" />
                    <span className="font-semibold">New Flow Entry Point</span>
                </div>
                <p className="text-sm text-green-300/80">
                    This node marks the start of a sub-flow. When you publish the parent flow:
                </p>
                <ul className="text-sm text-green-300/70 mt-2 space-y-1 list-disc list-inside">
                    <li>This sub-flow will be saved as a separate flow</li>
                    <li>It will appear in the Flows dropdown for other nodes</li>
                    <li>Users can trigger this flow via buttons</li>
                </ul>
            </div>

            {/* Tips */}
            <CollapsibleTips title="Tips & Info" color="green">
                <p className="text-sm">
                    <strong>New Flow Node:</strong> Use this to create branching conversation flows that can be triggered from buttons in other nodes.
                </p>
            </CollapsibleTips>
        </div>
    );
};

export default NewFlowNodeForm;
