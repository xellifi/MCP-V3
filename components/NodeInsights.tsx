import React from 'react';
import { Send, CheckCircle, User, Bug } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface NodeInsightsProps {
    sent?: number;
    delivered?: number;
    subscribers?: number;
    errors?: number;
}

const NodeInsights: React.FC<NodeInsightsProps> = ({
    sent = 0,
    delivered = 0,
    subscribers = 0,
    errors = 0
}) => {
    const { isDark } = useTheme();

    return (
        <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-slate-400/10">
            {/* Sent */}
            <div className="flex items-center gap-1.5" title="Messages Sent">
                <Send className="w-3.5 h-3.5 text-blue-500" />
                <span className={`text-[11px] font-bold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{sent}</span>
            </div>

            {/* Delivered */}
            <div className="flex items-center gap-1.5" title="Delivered">
                <CheckCircle className="w-3.5 h-3.5 text-blue-500" />
                <span className={`text-[11px] font-bold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{delivered}</span>
            </div>

            {/* Subscribers */}
            <div className="flex items-center gap-1.5" title="Subscribers Reached">
                <User className="w-3.5 h-3.5 text-blue-500" />
                <span className={`text-[11px] font-bold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{subscribers}</span>
            </div>

            {/* Errors */}
            <div className="flex items-center gap-1.5" title="Errors">
                <Bug className="w-3.5 h-3.5 text-red-500" />
                <span className={`text-[11px] font-bold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{errors}</span>
            </div>
        </div>
    );
};

export default NodeInsights;
