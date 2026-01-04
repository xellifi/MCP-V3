import React, { useEffect, useState } from 'react';
import { X, DollarSign, TrendingUp, ShoppingCart, Calendar } from 'lucide-react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Area,
    AreaChart
} from 'recharts';
import { api } from '../services/api';
import { format, subDays, startOfDay, isSameDay } from 'date-fns';

interface SalesSummaryModalProps {
    isOpen: boolean;
    onClose: () => void;
    form: any;
    currencySymbol?: string;
}

const SalesSummaryModal: React.FC<SalesSummaryModalProps> = ({
    isOpen,
    onClose,
    form,
    currencySymbol = '₱'
}) => {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any[]>([]);
    const [stats, setStats] = useState({
        totalRevenue: 0,
        totalOrders: 0,
        averageOrderValue: 0
    });

    useEffect(() => {
        if (isOpen && form) {
            loadData();
        }
    }, [isOpen, form]);

    const loadData = async () => {
        setLoading(true);
        try {
            const submissions = await api.workspace.getFormSubmissions(form.id);
            processData(submissions);
        } catch (error) {
            console.error('Error loading sales data:', error);
        } finally {
            setLoading(false);
        }
    };

    const processData = (submissions: any[]) => {
        // filter distinct valid orders (not cancelled)
        const validOrders = submissions.filter(s =>
            s.data?.order_status !== 'cancelled' &&
            s.data?.total !== undefined
        );

        // Calculate totals
        const totalRevenue = validOrders.reduce((sum, s) => sum + (Number(s.data.total) || 0), 0);
        const totalOrders = validOrders.length;
        const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

        setStats({
            totalRevenue,
            totalOrders,
            averageOrderValue
        });

        // Generate last 30 days data
        const chartData = [];
        const today = new Date();

        for (let i = 29; i >= 0; i--) {
            const date = subDays(today, i);
            const dateStr = format(date, 'MMM dd');

            // Find orders for this day
            const daysOrders = validOrders.filter(s =>
                isSameDay(new Date(s.created_at), date)
            );

            const daysRevenue = daysOrders.reduce((sum, s) => sum + (Number(s.data.total) || 0), 0);

            chartData.push({
                date: dateStr,
                revenue: daysRevenue,
                orders: daysOrders.length
            });
        }

        setData(chartData);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-4xl transform transition-all duration-300 ease-out scale-100 opacity-100">
                <div className="bg-slate-900 rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-white/10">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-emerald-500/20 rounded-lg">
                                <DollarSign className="w-6 h-6 text-emerald-400" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white">Sales Summary</h2>
                                <p className="text-slate-400 text-sm">{form?.name}</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6">
                        {loading ? (
                            <div className="h-64 flex items-center justify-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {/* Stats Cards */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="bg-slate-800/50 p-4 rounded-xl border border-white/5">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="p-2 bg-emerald-500/10 rounded-lg">
                                                <DollarSign className="w-4 h-4 text-emerald-400" />
                                            </div>
                                            <span className="text-slate-400 text-sm font-medium">Total Revenue</span>
                                        </div>
                                        <p className="text-2xl font-bold text-white">
                                            {currencySymbol}{stats.totalRevenue.toLocaleString()}
                                        </p>
                                    </div>

                                    <div className="bg-slate-800/50 p-4 rounded-xl border border-white/5">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="p-2 bg-blue-500/10 rounded-lg">
                                                <ShoppingCart className="w-4 h-4 text-blue-400" />
                                            </div>
                                            <span className="text-slate-400 text-sm font-medium">Total Orders</span>
                                        </div>
                                        <p className="text-2xl font-bold text-white">
                                            {stats.totalOrders}
                                        </p>
                                    </div>

                                    <div className="bg-slate-800/50 p-4 rounded-xl border border-white/5">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="p-2 bg-purple-500/10 rounded-lg">
                                                <TrendingUp className="w-4 h-4 text-purple-400" />
                                            </div>
                                            <span className="text-slate-400 text-sm font-medium">Avg. Order Value</span>
                                        </div>
                                        <p className="text-2xl font-bold text-white">
                                            {currencySymbol}{stats.averageOrderValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                        </p>
                                    </div>
                                </div>

                                {/* Chart */}
                                <div className="bg-slate-800/50 p-6 rounded-xl border border-white/5">
                                    <h3 className="text-white font-medium mb-6 flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-slate-400" />
                                        Last 30 Days Performance
                                    </h3>
                                    <div className="h-[300px] w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={data}>
                                                <defs>
                                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                                                <XAxis
                                                    dataKey="date"
                                                    stroke="#9ca3af"
                                                    tick={{ fill: '#9ca3af', fontSize: 12 }}
                                                    tickLine={false}
                                                    axisLine={false}
                                                />
                                                <YAxis
                                                    stroke="#9ca3af"
                                                    tick={{ fill: '#9ca3af', fontSize: 12 }}
                                                    tickLine={false}
                                                    axisLine={false}
                                                    tickFormatter={(value) => `${currencySymbol}${value}`}
                                                />
                                                <Tooltip
                                                    contentStyle={{
                                                        backgroundColor: '#1f2937',
                                                        borderColor: '#374151',
                                                        borderRadius: '0.75rem',
                                                        color: '#fff'
                                                    }}
                                                    itemStyle={{ color: '#fff' }}
                                                    formatter={(value: number) => [`${currencySymbol}${value.toLocaleString()}`, 'Revenue']}
                                                />
                                                <Area
                                                    type="monotone"
                                                    dataKey="revenue"
                                                    stroke="#10b981"
                                                    strokeWidth={3}
                                                    fillOpacity={1}
                                                    fill="url(#colorRevenue)"
                                                />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SalesSummaryModal;
