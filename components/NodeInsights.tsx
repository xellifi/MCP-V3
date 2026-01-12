import React from 'react';
import { Send, CheckCircle, Users, AlertTriangle } from 'lucide-react';

interface NodeInsightsProps {
    sent?: number;
    delivered?: number;
    subscribers?: number;
    errors?: number;
}

/**
 * Compact insights bar for flow nodes
 * Shows: Sent, Delivered, Subscribers, Errors
 */
const NodeInsights: React.FC<NodeInsightsProps> = ({
    sent = 0,
    delivered = 0,
    subscribers = 0,
    errors = 0
}) => {
    return (
        <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-slate-400/20">
            {/* Sent */}
            <div className="flex items-center gap-1" title="Messages Sent">
                <Send className="w-3 h-3 text-blue-500 dark:text-blue-400" />
                <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">{sent}</span>
            </div>

            {/* Delivered */}
            <div className="flex items-center gap-1" title="Delivered">
                <CheckCircle className="w-3 h-3 text-green-500 dark:text-green-400" />
                <span className="text-[10px] font-bold text-green-600 dark:text-green-400">{delivered}</span>
            </div>

            {/* Subscribers */}
            <div className="flex items-center gap-1" title="Subscribers Reached">
                <Users className="w-3 h-3 text-cyan-500 dark:text-cyan-400" />
                <span className="text-[10px] font-bold text-cyan-600 dark:text-cyan-400">{subscribers}</span>
            </div>

            {/* Errors */}
            <div className="flex items-center gap-1" title="Errors">
                <AlertTriangle className="w-3 h-3 text-red-500 dark:text-red-400" />
                <span className="text-[10px] font-bold text-red-600 dark:text-red-400">{errors}</span>
            </div>
        </div>
    );
};

export default NodeInsights;
