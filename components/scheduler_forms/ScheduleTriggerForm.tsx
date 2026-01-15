import React, { useState, useEffect } from 'react';
import { X, Clock, Calendar, Repeat, ChevronDown, Info } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { ScheduleTriggerConfig } from '../../types';

interface ScheduleTriggerFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (config: ScheduleTriggerConfig) => void;
    initialConfig?: Partial<ScheduleTriggerConfig>;
}

const TIMEZONES = [
    { value: 'Asia/Manila', label: 'Philippine Standard Time (GMT+8)' },
    { value: 'America/New_York', label: 'Eastern Time (ET)' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
    { value: 'Europe/London', label: 'London (GMT)' },
    { value: 'Europe/Paris', label: 'Central European Time (CET)' },
    { value: 'Asia/Tokyo', label: 'Japan Standard Time (JST)' },
    { value: 'Asia/Singapore', label: 'Singapore Time (SGT)' },
    { value: 'Australia/Sydney', label: 'Australian Eastern Time (AET)' },
    { value: 'UTC', label: 'Coordinated Universal Time (UTC)' },
];

const DAYS_OF_WEEK = [
    { value: 0, label: 'Sun' },
    { value: 1, label: 'Mon' },
    { value: 2, label: 'Tue' },
    { value: 3, label: 'Wed' },
    { value: 4, label: 'Thu' },
    { value: 5, label: 'Fri' },
    { value: 6, label: 'Sat' },
];

const ScheduleTriggerForm: React.FC<ScheduleTriggerFormProps> = ({
    isOpen,
    onClose,
    onSave,
    initialConfig
}) => {
    const { isDark } = useTheme();

    const [config, setConfig] = useState<ScheduleTriggerConfig>({
        frequency: 'daily',
        time: '09:00',
        daysOfWeek: [1, 2, 3, 4, 5], // Mon-Fri default
        dayOfMonth: 1,
        timezone: 'Asia/Manila',
        ...initialConfig
    });

    useEffect(() => {
        if (initialConfig) {
            setConfig(prev => ({ ...prev, ...initialConfig }));
        }
    }, [initialConfig]);

    const handleSave = () => {
        onSave(config);
        onClose();
    };

    if (!isOpen) return null;

    const inputClasses = `w-full rounded-xl px-4 py-3 outline-none transition-all focus:ring-2 focus:ring-indigo-500/50 ${isDark
        ? 'bg-black/30 border border-white/10 text-white placeholder-slate-500'
        : 'bg-white border border-slate-200 text-slate-900 placeholder-slate-400'
        }`;

    const labelClasses = `block text-sm font-semibold mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className={`w-full max-w-lg rounded-2xl shadow-2xl border overflow-hidden animate-fade-in ${isDark
                ? 'bg-slate-900 border-white/10'
                : 'bg-white border-slate-200'
                }`}>
                {/* Header */}
                <div className={`flex items-center justify-between p-6 border-b ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-gradient-to-br from-orange-500 to-pink-600">
                            <Clock className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Schedule Trigger</h2>
                            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Configure when this workflow runs</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className={`p-2 rounded-lg transition-colors ${isDark
                            ? 'hover:bg-white/10 text-slate-400'
                            : 'hover:bg-slate-100 text-slate-500'
                            }`}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className={`p-6 space-y-6 max-h-[60vh] overflow-y-auto ${isDark ? 'bg-slate-900/50' : 'bg-slate-50/50'}`}>
                    {/* Frequency Selection */}
                    <div>
                        <label className={labelClasses}>Frequency</label>
                        <div className="grid grid-cols-4 gap-2">
                            {(['daily', 'weekly', 'monthly', 'custom'] as const).map((freq) => (
                                <button
                                    key={freq}
                                    onClick={() => setConfig({ ...config, frequency: freq })}
                                    className={`px-4 py-3 rounded-xl font-semibold text-sm capitalize transition-all ${config.frequency === freq
                                        ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/20'
                                        : isDark
                                            ? 'bg-white/5 text-slate-300 hover:bg-white/10 border border-white/10'
                                            : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
                                        }`}
                                >
                                    {freq}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Time Picker - Multiple times for daily, weekly, monthly */}
                    {(config.frequency === 'daily' || config.frequency === 'weekly' || config.frequency === 'monthly') ? (
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className={labelClasses.replace('mb-2', '')}>
                                    <Clock className="w-4 h-4 inline mr-2" />
                                    Post Times
                                </label>
                                <button
                                    onClick={() => {
                                        const currentTimes = config.times || [config.time || '09:00'];
                                        setConfig({
                                            ...config,
                                            times: [...currentTimes, '12:00']
                                        });
                                    }}
                                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${isDark
                                        ? 'bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30'
                                        : 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200'
                                        }`}
                                >
                                    <span className="text-lg leading-none">+</span> Add Time
                                </button>
                            </div>
                            <div className="space-y-2">
                                {(config.times || [config.time || '09:00']).map((t, index) => (
                                    <div key={index} className="flex items-center gap-2">
                                        <input
                                            type="time"
                                            value={t}
                                            onChange={(e) => {
                                                const currentTimes = config.times || [config.time || '09:00'];
                                                const newTimes = [...currentTimes];
                                                newTimes[index] = e.target.value;
                                                setConfig({
                                                    ...config,
                                                    times: newTimes,
                                                    time: newTimes[0] // Keep primary time in sync
                                                });
                                            }}
                                            className={`${inputClasses} flex-1`}
                                        />
                                        {(config.times || [config.time]).length > 1 && (
                                            <button
                                                onClick={() => {
                                                    const currentTimes = config.times || [config.time || '09:00'];
                                                    const newTimes = currentTimes.filter((_, i) => i !== index);
                                                    setConfig({
                                                        ...config,
                                                        times: newTimes,
                                                        time: newTimes[0] // Keep primary time in sync
                                                    });
                                                }}
                                                className={`p-3 rounded-xl transition-colors ${isDark
                                                    ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                                                    : 'bg-red-100 text-red-600 hover:bg-red-200'
                                                    }`}
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <p className={`mt-2 text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                Add multiple times to post several times per {config.frequency === 'daily' ? 'day' : config.frequency === 'weekly' ? 'scheduled day' : 'month'}
                            </p>
                        </div>
                    ) : (
                        <div>
                            <label className={labelClasses}>
                                <Clock className="w-4 h-4 inline mr-2" />
                                Time
                            </label>
                            <input
                                type="time"
                                value={config.time}
                                onChange={(e) => setConfig({ ...config, time: e.target.value })}
                                className={inputClasses}
                            />
                        </div>
                    )}

                    {/* Days of Week (for weekly) */}
                    {config.frequency === 'weekly' && (
                        <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                            <label className={labelClasses}>
                                <Calendar className="w-4 h-4 inline mr-2" />
                                Days of Week
                            </label>
                            <div className="flex gap-2 flex-wrap">
                                {DAYS_OF_WEEK.map((day) => (
                                    <button
                                        key={day.value}
                                        onClick={() => {
                                            const days = config.daysOfWeek || [];
                                            const newDays = days.includes(day.value)
                                                ? days.filter(d => d !== day.value)
                                                : [...days, day.value].sort();
                                            setConfig({ ...config, daysOfWeek: newDays });
                                        }}
                                        className={`w-12 h-12 rounded-xl font-bold text-sm transition-all ${(config.daysOfWeek || []).includes(day.value)
                                            ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg'
                                            : isDark
                                                ? 'bg-white/5 text-slate-300 hover:bg-white/10 border border-white/10'
                                                : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
                                            }`}
                                    >
                                        {day.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Day of Month (for monthly) */}
                    {config.frequency === 'monthly' && (
                        <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                            <label className={labelClasses}>
                                <Calendar className="w-4 h-4 inline mr-2" />
                                Day of Month
                            </label>
                            <select
                                value={config.dayOfMonth || 1}
                                onChange={(e) => setConfig({ ...config, dayOfMonth: parseInt(e.target.value) })}
                                className={inputClasses}
                            >
                                {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                                    <option key={day} value={day}>
                                        {day}{day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th'}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Custom Cron (for custom) */}
                    {config.frequency === 'custom' && (
                        <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                            <label className={labelClasses}>
                                <Repeat className="w-4 h-4 inline mr-2" />
                                Cron Expression
                            </label>
                            <input
                                type="text"
                                value={config.customCron || ''}
                                onChange={(e) => setConfig({ ...config, customCron: e.target.value })}
                                placeholder="0 9 * * *"
                                className={inputClasses}
                            />
                            <p className={`mt-2 text-xs flex items-center gap-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                <Info className="w-3 h-3" />
                                Format: minute hour day-of-month month day-of-week
                            </p>
                        </div>
                    )}

                    {/* Timezone */}
                    <div>
                        <label className={labelClasses}>Timezone</label>
                        <div className="relative">
                            <select
                                value={config.timezone}
                                onChange={(e) => setConfig({ ...config, timezone: e.target.value })}
                                className={`${inputClasses} appearance-none pr-10`}
                            >
                                {TIMEZONES.map((tz) => (
                                    <option key={tz.value} value={tz.value}>
                                        {tz.label}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className={`absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
                        </div>
                    </div>

                    {/* Preview */}
                    <div className={`p-4 rounded-xl border ${isDark ? 'bg-indigo-500/10 border-indigo-500/20' : 'bg-indigo-50 border-indigo-100'}`}>
                        <p className={`text-sm font-medium ${isDark ? 'text-indigo-300' : 'text-indigo-700'}`}>
                            <Repeat className="w-4 h-4 inline mr-2" />
                            This workflow will run:
                        </p>
                        <p className={`mt-1 text-sm ${isDark ? 'text-indigo-200' : 'text-indigo-600'}`}>
                            {config.frequency === 'daily' && (
                                (config.times && config.times.length > 1)
                                    ? `Every day at ${config.times.join(', ')} (${config.times.length} posts/day)`
                                    : `Every day at ${config.time}`
                            )}
                            {config.frequency === 'weekly' && (
                                (config.times && config.times.length > 1)
                                    ? `Every ${(config.daysOfWeek || []).map(d => DAYS_OF_WEEK.find(x => x.value === d)?.label).join(', ')} at ${config.times.join(', ')} (${config.times.length} posts/day)`
                                    : `Every ${(config.daysOfWeek || []).map(d => DAYS_OF_WEEK.find(x => x.value === d)?.label).join(', ')} at ${config.time}`
                            )}
                            {config.frequency === 'monthly' && (
                                (config.times && config.times.length > 1)
                                    ? `On the ${config.dayOfMonth}${config.dayOfMonth === 1 ? 'st' : config.dayOfMonth === 2 ? 'nd' : config.dayOfMonth === 3 ? 'rd' : 'th'} at ${config.times.join(', ')} (${config.times.length} posts)`
                                    : `On the ${config.dayOfMonth}${config.dayOfMonth === 1 ? 'st' : config.dayOfMonth === 2 ? 'nd' : config.dayOfMonth === 3 ? 'rd' : 'th'} of each month at ${config.time}`
                            )}
                            {config.frequency === 'custom' && `Custom schedule: ${config.customCron || 'Not set'}`}
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className={`flex justify-end gap-3 p-6 border-t ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                    <button
                        onClick={onClose}
                        className={`px-6 py-3 rounded-xl font-bold transition-all ${isDark
                            ? 'bg-white/10 text-white hover:bg-white/20'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-6 py-3 rounded-xl font-bold bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/20 hover:shadow-xl transition-all"
                    >
                        Save Configuration
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ScheduleTriggerForm;
