import React from 'react';
import { RefreshCw, Clock, MessageSquare, Info } from 'lucide-react';

interface FollowupNodeFormProps {
    config: any;
    onChange: (config: any) => void;
}

const FollowupNodeForm: React.FC<FollowupNodeFormProps> = ({ config, onChange }) => {
    const handleChange = (field: string, value: any) => {
        onChange({ ...config, [field]: value });
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3 pb-4 border-b border-white/10">
                <div className="p-3 bg-rose-500/20 rounded-xl">
                    <RefreshCw className="w-6 h-6 text-rose-400" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-white">Follow-up Node</h3>
                    <p className="text-sm text-slate-400">
                        Send reminders to users who didn't submit the form
                    </p>
                </div>
            </div>

            {/* Info Box */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-200">
                        <p className="font-medium mb-1">How it works:</p>
                        <ul className="text-blue-300/80 space-y-1 text-xs">
                            <li>• User opens form but doesn't submit</li>
                            <li>• After the delay, send follow-up message</li>
                            <li>• Continue sending at intervals until max reached</li>
                            <li>• Stays within Facebook's 24-hour window</li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Timing Settings */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 text-white font-semibold">
                    <Clock className="w-4 h-4 text-rose-400" />
                    Timing Settings
                </div>

                {/* First Follow-up Delay */}
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                        First follow-up delay (minutes)
                    </label>
                    <input
                        type="number"
                        value={config.firstDelayMinutes || 30}
                        onChange={(e) => handleChange('firstDelayMinutes', parseInt(e.target.value) || 30)}
                        min={5}
                        max={1380}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500/50"
                        placeholder="30"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                        Wait this long after form is opened before sending first reminder
                    </p>
                </div>

                {/* Interval Between Follow-ups */}
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                        Interval between follow-ups (minutes)
                    </label>
                    <input
                        type="number"
                        value={config.intervalMinutes || 120}
                        onChange={(e) => handleChange('intervalMinutes', parseInt(e.target.value) || 120)}
                        min={30}
                        max={720}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500/50"
                        placeholder="120"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                        Time between 2nd and 3rd follow-ups
                    </p>
                </div>

                {/* Max Follow-ups */}
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                        Maximum follow-ups
                    </label>
                    <select
                        value={config.maxFollowups || 3}
                        onChange={(e) => handleChange('maxFollowups', parseInt(e.target.value))}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500/50"
                    >
                        <option value={1}>1 reminder</option>
                        <option value={2}>2 reminders</option>
                        <option value={3}>3 reminders (recommended)</option>
                    </select>
                    <p className="text-xs text-slate-500 mt-1">
                        Don't spam - 3 is recommended max
                    </p>
                </div>
            </div>

            {/* Message Settings */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 text-white font-semibold">
                    <MessageSquare className="w-4 h-4 text-rose-400" />
                    Follow-up Message
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                        Message Text
                    </label>
                    <textarea
                        value={config.followupMessage || ''}
                        onChange={(e) => handleChange('followupMessage', e.target.value)}
                        rows={4}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500/50 resize-none"
                        placeholder="Hey {commenter_name}! 👋 You left your order incomplete. Complete it now and get 10% off! Limited time offer..."
                    />
                    <p className="text-xs text-slate-500 mt-1">
                        Available variables: {'{commenter_name}'}, {'{followup_number}'}
                    </p>
                </div>
            </div>

            {/* Preview */}
            <div className="bg-slate-800/50 border border-slate-600/40 rounded-xl p-4">
                <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-2">
                    📋 Summary
                </div>
                <div className="text-sm text-slate-300 space-y-1">
                    <p>
                        • First reminder: <span className="text-rose-300 font-medium">{config.firstDelayMinutes || 30} minutes</span> after form opened
                    </p>
                    <p>
                        • Subsequent reminders: every <span className="text-rose-300 font-medium">{config.intervalMinutes || 120} minutes</span>
                    </p>
                    <p>
                        • Maximum: <span className="text-rose-300 font-medium">{config.maxFollowups || 3} reminders</span>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default FollowupNodeForm;
