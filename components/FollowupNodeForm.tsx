import React, { useState } from 'react';
import { RefreshCw, Clock, MessageSquare, Info, Plus, Trash2, Tag, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';

interface ScheduledFollowup {
    id: string;
    type: 'delay' | 'scheduled';
    delayMinutes: number;
    scheduledTime: string;
    scheduledDays: number;
    messageTag: string;
    message: string;
    enabled: boolean;
}

interface FollowupNodeFormProps {
    config: any;
    onChange: (config: any) => void;
}

const MESSAGE_TAGS = [
    { value: '', label: 'None (within 24hr only)', tip: 'Standard message, must be within 24 hours of user interaction' },
    { value: 'POST_PURCHASE_UPDATE', label: 'Post Purchase Update', tip: 'Best for abandoned cart - use for order/shipping updates only' },
    { value: 'CONFIRMED_EVENT_UPDATE', label: 'Confirmed Event Update', tip: 'For event reminders only - user must have registered for the event' },
    { value: 'ACCOUNT_UPDATE', label: 'Account Update', tip: 'For account-related notifications like password changes, approvals' },
];

const TIME_OPTIONS = [
    { value: '00:00', label: '12:00 AM (Midnight)' },
    { value: '01:00', label: '1:00 AM' },
    { value: '02:00', label: '2:00 AM' },
    { value: '03:00', label: '3:00 AM' },
    { value: '04:00', label: '4:00 AM' },
    { value: '05:00', label: '5:00 AM' },
    { value: '06:00', label: '6:00 AM' },
    { value: '07:00', label: '7:00 AM' },
    { value: '08:00', label: '8:00 AM' },
    { value: '09:00', label: '9:00 AM' },
    { value: '10:00', label: '10:00 AM' },
    { value: '11:00', label: '11:00 AM' },
    { value: '12:00', label: '12:00 PM (Noon)' },
    { value: '13:00', label: '1:00 PM' },
    { value: '14:00', label: '2:00 PM' },
    { value: '15:00', label: '3:00 PM' },
    { value: '16:00', label: '4:00 PM' },
    { value: '17:00', label: '5:00 PM' },
    { value: '18:00', label: '6:00 PM' },
    { value: '19:00', label: '7:00 PM' },
    { value: '20:00', label: '8:00 PM' },
    { value: '21:00', label: '9:00 PM' },
    { value: '22:00', label: '10:00 PM' },
    { value: '23:00', label: '11:00 PM' },
];

const DAY_OPTIONS = [
    { value: 0, label: 'Same day' },
    { value: 1, label: 'Next day (+1)' },
    { value: 2, label: '2 days later' },
    { value: 3, label: '3 days later' },
    { value: 7, label: '1 week later' },
];

const FollowupNodeForm: React.FC<FollowupNodeFormProps> = ({ config, onChange }) => {
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const scheduledFollowups: ScheduledFollowup[] = config.scheduledFollowups || [];

    const handleAddFollowup = () => {
        const newFollowup: ScheduledFollowup = {
            id: `followup_${Date.now()}`,
            type: 'delay',
            delayMinutes: 30,
            scheduledTime: '09:00',
            scheduledDays: 1,
            messageTag: '',
            message: '',
            enabled: true,
        };
        const updated = [...scheduledFollowups, newFollowup];
        onChange({ ...config, scheduledFollowups: updated });
        setExpandedId(newFollowup.id);
    };

    const handleUpdateFollowup = (id: string, field: string, value: any) => {
        const updated = scheduledFollowups.map(f =>
            f.id === id ? { ...f, [field]: value } : f
        );
        onChange({ ...config, scheduledFollowups: updated });
    };

    const handleDeleteFollowup = (id: string) => {
        const updated = scheduledFollowups.filter(f => f.id !== id);
        onChange({ ...config, scheduledFollowups: updated });
    };

    const isOutside24hr = (followup: ScheduledFollowup) => {
        if (followup.type === 'delay') {
            return followup.delayMinutes > 1380; // 23 hours
        }
        return followup.scheduledDays >= 1;
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
                        Schedule reminders for abandoned forms
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
                            <li>• Click <strong>+ Add Follow-up</strong> to create scheduled messages</li>
                            <li>• Messages within 24hr: send anytime (promotional OK)</li>
                            <li>• Messages outside 24hr: require Message Tags (non-promotional only)</li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Scheduled Follow-ups List */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-white font-semibold">
                        <Clock className="w-4 h-4 text-rose-400" />
                        Scheduled Follow-ups
                    </div>
                    <button
                        onClick={handleAddFollowup}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded-lg text-sm font-medium transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Add Follow-up
                    </button>
                </div>

                {scheduledFollowups.length === 0 ? (
                    <div className="bg-slate-800/50 border border-dashed border-slate-600 rounded-xl p-6 text-center">
                        <MessageSquare className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                        <p className="text-slate-400 text-sm">No follow-ups scheduled</p>
                        <p className="text-slate-500 text-xs mt-1">Click + Add Follow-up to create one</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {scheduledFollowups.map((followup, index) => {
                            const isExpanded = expandedId === followup.id;
                            const outside24 = isOutside24hr(followup);
                            const needsTag = outside24 && !followup.messageTag;

                            return (
                                <div
                                    key={followup.id}
                                    className={`bg-slate-800/60 border rounded-xl overflow-hidden transition-all ${needsTag ? 'border-amber-500/50' : 'border-slate-600/50'
                                        }`}
                                >
                                    {/* Header */}
                                    <div
                                        className="flex items-center gap-3 p-4 cursor-pointer hover:bg-white/5 transition-colors"
                                        onClick={() => setExpandedId(isExpanded ? null : followup.id)}
                                    >
                                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-rose-500/20 text-rose-300 font-bold text-sm">
                                            #{index + 1}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-white font-medium text-sm">
                                                    {followup.type === 'delay'
                                                        ? `${followup.delayMinutes} minutes after open`
                                                        : `Day ${followup.scheduledDays} at ${TIME_OPTIONS.find(t => t.value === followup.scheduledTime)?.label || followup.scheduledTime}`
                                                    }
                                                </span>
                                                {outside24 && (
                                                    <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 text-xs rounded-full">
                                                        Outside 24hr
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-slate-400 text-xs truncate mt-0.5">
                                                {followup.message || 'No message set'}
                                            </p>
                                        </div>
                                        {needsTag && (
                                            <AlertTriangle className="w-4 h-4 text-amber-400" />
                                        )}
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDeleteFollowup(followup.id); }}
                                            className="p-1.5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-lg transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                        {isExpanded ? (
                                            <ChevronUp className="w-4 h-4 text-slate-400" />
                                        ) : (
                                            <ChevronDown className="w-4 h-4 text-slate-400" />
                                        )}
                                    </div>

                                    {/* Expanded Content */}
                                    {isExpanded && (
                                        <div className="px-4 pb-4 space-y-4 border-t border-slate-700/50 pt-4">
                                            {/* Type Selector */}
                                            <div>
                                                <label className="block text-xs font-medium text-slate-400 mb-2">Send Type</label>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <button
                                                        onClick={() => handleUpdateFollowup(followup.id, 'type', 'delay')}
                                                        className={`p-3 rounded-lg border text-sm font-medium transition-all ${followup.type === 'delay'
                                                            ? 'bg-rose-500/20 border-rose-500/50 text-rose-300'
                                                            : 'bg-slate-700/50 border-slate-600 text-slate-400 hover:border-slate-500'
                                                            }`}
                                                    >
                                                        ⏱️ Delay-based
                                                    </button>
                                                    <button
                                                        onClick={() => handleUpdateFollowup(followup.id, 'type', 'scheduled')}
                                                        className={`p-3 rounded-lg border text-sm font-medium transition-all ${followup.type === 'scheduled'
                                                            ? 'bg-rose-500/20 border-rose-500/50 text-rose-300'
                                                            : 'bg-slate-700/50 border-slate-600 text-slate-400 hover:border-slate-500'
                                                            }`}
                                                    >
                                                        📅 Specific Time
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Delay-based settings */}
                                            {followup.type === 'delay' && (
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-400 mb-2">
                                                        Minutes after form opened
                                                    </label>
                                                    <input
                                                        type="number"
                                                        value={followup.delayMinutes}
                                                        onChange={(e) => handleUpdateFollowup(followup.id, 'delayMinutes', parseInt(e.target.value) || 30)}
                                                        min={1}
                                                        max={10080}
                                                        className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/50"
                                                    />
                                                    <p className="text-xs text-slate-500 mt-1">
                                                        1-1380 min = within 24hr | 1381+ min = requires Message Tag
                                                    </p>
                                                </div>
                                            )}

                                            {/* Scheduled settings */}
                                            {followup.type === 'scheduled' && (
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="block text-xs font-medium text-slate-400 mb-2">Day</label>
                                                        <select
                                                            value={followup.scheduledDays}
                                                            onChange={(e) => handleUpdateFollowup(followup.id, 'scheduledDays', parseInt(e.target.value))}
                                                            className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/50 appearance-none cursor-pointer"
                                                            style={{
                                                                backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%239ca3af' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                                                                backgroundPosition: 'right 0.5rem center',
                                                                backgroundRepeat: 'no-repeat',
                                                                backgroundSize: '1.25em 1.25em',
                                                                paddingRight: '2rem'
                                                            }}
                                                        >
                                                            {DAY_OPTIONS.map(opt => (
                                                                <option key={opt.value} value={opt.value} className="bg-slate-800">{opt.label}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-slate-400 mb-2">Time (user's timezone)</label>
                                                        <select
                                                            value={followup.scheduledTime}
                                                            onChange={(e) => handleUpdateFollowup(followup.id, 'scheduledTime', e.target.value)}
                                                            className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/50 appearance-none cursor-pointer"
                                                            style={{
                                                                backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%239ca3af' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                                                                backgroundPosition: 'right 0.5rem center',
                                                                backgroundRepeat: 'no-repeat',
                                                                backgroundSize: '1.25em 1.25em',
                                                                paddingRight: '2rem'
                                                            }}
                                                        >
                                                            {TIME_OPTIONS.map(opt => (
                                                                <option key={opt.value} value={opt.value} className="bg-slate-800">{opt.label}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Message Tag (for outside 24hr) */}
                                            {outside24 && (
                                                <div>
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <Tag className="w-3.5 h-3.5 text-purple-400" />
                                                        <label className="text-xs font-medium text-slate-400">Message Tag (required for outside 24hr)</label>
                                                    </div>
                                                    <select
                                                        value={followup.messageTag}
                                                        onChange={(e) => handleUpdateFollowup(followup.id, 'messageTag', e.target.value)}
                                                        className={`w-full bg-slate-700/50 border rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/50 appearance-none cursor-pointer ${needsTag ? 'border-amber-500/50' : 'border-slate-600'
                                                            }`}
                                                        style={{
                                                            backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%239ca3af' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                                                            backgroundPosition: 'right 0.5rem center',
                                                            backgroundRepeat: 'no-repeat',
                                                            backgroundSize: '1.25em 1.25em',
                                                            paddingRight: '2rem'
                                                        }}
                                                    >
                                                        {MESSAGE_TAGS.map(tag => (
                                                            <option key={tag.value} value={tag.value} className="bg-slate-800">{tag.label}</option>
                                                        ))}
                                                    </select>
                                                    {followup.messageTag && (
                                                        <p className="text-xs text-purple-300/80 mt-1.5 flex items-start gap-1.5">
                                                            <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                                            {MESSAGE_TAGS.find(t => t.value === followup.messageTag)?.tip}
                                                        </p>
                                                    )}
                                                    {needsTag && (
                                                        <p className="text-xs text-amber-400 mt-1.5 flex items-center gap-1.5">
                                                            <AlertTriangle className="w-3 h-3" />
                                                            Select a tag to send messages outside 24hr window
                                                        </p>
                                                    )}
                                                </div>
                                            )}

                                            {/* Message */}
                                            <div>
                                                <label className="block text-xs font-medium text-slate-400 mb-2">
                                                    <MessageSquare className="w-3.5 h-3.5 inline mr-1" />
                                                    Message
                                                </label>
                                                <textarea
                                                    value={followup.message}
                                                    onChange={(e) => handleUpdateFollowup(followup.id, 'message', e.target.value)}
                                                    rows={3}
                                                    className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500/50 resize-none"
                                                    placeholder="Hey {commenter_name}! 👋 Your cart is waiting..."
                                                />
                                                <p className="text-xs text-slate-500 mt-1">
                                                    Variables: {'{commenter_name}'}, {'{followup_number}'}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Warning for outside 24hr */}
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
                <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-amber-200">
                        <p className="font-medium mb-1">⚠️ Outside 24hr Policy:</p>
                        <ul className="text-amber-300/80 space-y-1 text-xs">
                            <li>• Messages MUST be non-promotional (no deals, discounts, offers)</li>
                            <li>• Only use Message Tags for their intended purpose</li>
                            <li>• Misuse can result in Page restrictions or bans</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FollowupNodeForm;
