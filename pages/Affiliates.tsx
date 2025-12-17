import React, { useEffect, useState } from 'react';
import { User, UserRole, AffiliateStats, Referral, AdminSettings, WithdrawalRequest } from '../types';
import { api } from '../services/api';
import { Banknote, Copy, Check, Users, TrendingUp, Clock, Trash2, Shield, DollarSign, Wallet, FileText, Download } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';

interface AffiliatesProps {
    user: User;
}

const Affiliates: React.FC<AffiliatesProps> = ({ user }) => {
    const [stats, setStats] = useState<AffiliateStats | null>(null);
    const [referrals, setReferrals] = useState<Referral[]>([]);
    const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
    const [adminReferrals, setAdminReferrals] = useState<Referral[]>([]);
    const [adminWithdrawals, setAdminWithdrawals] = useState<WithdrawalRequest[]>([]);
    const [settings, setSettings] = useState<AdminSettings | null>(null);

    const [loading, setLoading] = useState(true);
    const [withdrawing, setWithdrawing] = useState(false);
    const [copied, setCopied] = useState(false);
    const [viewMode, setViewMode] = useState<'MY' | 'ALL'>('MY');
    const [activeTab, setActiveTab] = useState<'REFERRALS' | 'WITHDRAWALS'>('REFERRALS');

    const toast = useToast();
    const { isDark } = useTheme();

    const isAdmin = user.role === UserRole.ADMIN || user.role === UserRole.OWNER;
    const affiliateLink = `${window.location.origin}/register?ref=${user.affiliateCode || user.id}`;

    useEffect(() => {
        loadData();
    }, [user.id, viewMode]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [statsData, referralsData, settingsData, withdrawalData] = await Promise.all([
                api.affiliate.getStats(user.id),
                api.affiliate.getMyReferrals(user.id),
                api.admin.getSettings(),
                api.affiliate.getWithdrawals(user.id)
            ]);
            setStats(statsData);
            setReferrals(referralsData);
            setSettings(settingsData);
            setWithdrawals(withdrawalData);

            if (isAdmin && viewMode === 'ALL') {
                const [allRefs, allWithdrawals] = await Promise.all([
                    api.affiliate.getAllReferrals(),
                    api.affiliate.getWithdrawals()
                ]);
                setAdminReferrals(allRefs);
                setAdminWithdrawals(allWithdrawals);
            }
        } catch (e) {
            console.error("Failed to load affiliate data", e);
            toast.error("Failed to load data");
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(affiliateLink);
        setCopied(true);
        toast.success("Affiliate link copied to clipboard!");
        setTimeout(() => setCopied(false), 2000);
    };

    const handleWithdraw = async () => {
        const minAmount = settings?.affiliateMinWithdrawal || 100;
        if (!stats || stats.unpaidEarnings < minAmount) return;

        const confirmed = window.confirm(`Are you sure you want to withdraw $${stats.unpaidEarnings.toFixed(2)}?`);
        if (!confirmed) return;

        setWithdrawing(true);
        try {
            await api.affiliate.requestWithdrawal(user.id, stats.unpaidEarnings);
            toast.success("Withdrawal request submitted.");
            await loadData();
            setActiveTab('WITHDRAWALS');
        } catch (e) {
            toast.error("Failed to request withdrawal.");
        } finally {
            setWithdrawing(false);
        }
    };

    const handleDeleteReferral = async (id: string) => {
        if (!window.confirm("Are you sure you want to delete this referral record?")) return;
        try {
            await api.affiliate.deleteReferral(id);
            toast.success("Referral record deleted.");
            const allRefs = await api.affiliate.getAllReferrals();
            setAdminReferrals(allRefs);
        } catch (e) {
            toast.error("Failed to delete referral.");
        }
    };

    const handleUpdateWithdrawal = async (id: string, status: 'PAID' | 'REJECTED') => {
        try {
            await api.affiliate.updateWithdrawalStatus(id, status);
            toast.success(`Withdrawal request marked as ${status}.`);
            const allWithdrawals = await api.affiliate.getWithdrawals();
            setAdminWithdrawals(allWithdrawals);
        } catch (e) {
            toast.error("Failed to update status.");
        }
    };

    if (loading && !stats) return (
        <div className={`p-8 text-center ${isDark ? 'text-slate-500' : 'text-slate-600'}`}>
            Loading affiliate data...
        </div>
    );

    if (settings && !settings.affiliateEnabled && !isAdmin) {
        return (
            <div className={`flex flex-col items-center justify-center h-96 ${isDark ? 'text-slate-500' : 'text-slate-600'}`}>
                <Banknote className={`w-16 h-16 mb-4 ${isDark ? 'text-slate-700' : 'text-slate-300'}`} />
                <h2 className={`text-xl font-bold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>Affiliate Program Unavailable</h2>
                <p>The affiliate program is currently disabled.</p>
            </div>
        );
    }

    const currency = settings?.affiliateCurrency || 'USD';
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
    };

    const currentDay = new Date().getDay();
    const allowedDays = settings?.affiliateWithdrawalDays || [1];
    const isDayAllowed = allowedDays.includes(currentDay);
    const minWithdrawal = settings?.affiliateMinWithdrawal || 100;
    const isBalanceSufficient = (stats?.unpaidEarnings || 0) >= minWithdrawal;
    const canWithdraw = isBalanceSufficient && isDayAllowed;
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const allowedDayNames = allowedDays.map(d => dayNames[d]).join(', ');

    // Theme-aware classes
    const cardBg = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
    const cardText = isDark ? 'text-slate-100' : 'text-slate-900';
    const subText = isDark ? 'text-slate-400' : 'text-slate-600';
    const tableBg = isDark ? 'bg-slate-800/50' : 'bg-slate-50';
    const tableRowHover = isDark ? 'hover:bg-slate-700/50' : 'hover:bg-slate-50';
    const borderColor = isDark ? 'border-slate-700' : 'border-slate-200';

    const StatCard = ({ title, value, subtext, icon: Icon, color }: any) => (
        <div className={`p-6 rounded-xl shadow-sm border flex items-center gap-4 ${cardBg}`}>
            <div className={`p-3 rounded-lg ${color}`}>
                <Icon className="w-6 h-6 text-white" />
            </div>
            <div>
                <p className={`text-sm font-medium ${subText}`}>{title}</p>
                <h3 className={`text-2xl font-bold ${cardText}`}>{value}</h3>
                {subtext && <p className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{subtext}</p>}
            </div>
        </div>
    );

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className={`text-2xl font-bold ${cardText}`}>Affiliate Program</h1>
                    <p className={subText}>Earn {formatCurrency(settings?.affiliateCommission || 0)} for every new customer you refer.</p>
                </div>
                {isAdmin && (
                    <div className={`p-1 rounded-lg flex text-sm font-medium ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
                        <button
                            onClick={() => setViewMode('MY')}
                            className={`px-3 py-1.5 rounded-md transition-colors ${viewMode === 'MY' ? (isDark ? 'bg-slate-700 text-slate-100' : 'bg-white text-slate-900 shadow-sm') : subText}`}
                        >
                            My Dashboard
                        </button>
                        <button
                            onClick={() => setViewMode('ALL')}
                            className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1 ${viewMode === 'ALL' ? (isDark ? 'bg-slate-700 text-slate-100' : 'bg-white text-slate-900 shadow-sm') : subText}`}
                        >
                            <Shield className="w-3 h-3" /> Admin View
                        </button>
                    </div>
                )}
            </div>

            {viewMode === 'MY' ? (
                <>
                    {/* Affiliate Link Card */}
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-8 text-white shadow-lg relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                            <Banknote className="w-64 h-64 text-white" />
                        </div>
                        <div className="max-w-3xl relative z-10">
                            <h3 className="text-xl font-bold mb-2">Your Unique Referral Link</h3>
                            <p className="text-blue-100 mb-6">Share this link with your friends. When they sign up, you get paid.</p>

                            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm p-2 pl-4 rounded-lg border border-white/20">
                                <code className="flex-1 font-mono text-sm truncate">{affiliateLink}</code>
                                <button
                                    onClick={handleCopy}
                                    className="bg-white text-blue-600 px-4 py-2 rounded-md font-medium text-sm hover:bg-blue-50 transition-colors flex items-center gap-2"
                                >
                                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                    {copied ? 'Copied!' : 'Copy Link'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <StatCard title="Available Balance" value={formatCurrency(stats?.unpaidEarnings || 0)} subtext={`Min: ${formatCurrency(minWithdrawal)}`} icon={Wallet} color="bg-emerald-500" />
                        <StatCard title="Total Paid Out" value={formatCurrency((stats?.totalEarnings || 0) - (stats?.unpaidEarnings || 0))} icon={Banknote} color="bg-blue-500" />
                        <StatCard title="Pending Commission" value={formatCurrency(stats?.pendingEarnings || 0)} subtext="Awaiting validation" icon={Clock} color="bg-amber-500" />
                        <StatCard title="Total Referrals" value={stats?.referrals || 0} icon={Users} color="bg-indigo-500" />
                    </div>

                    {/* Action Bar */}
                    <div className={`p-6 rounded-xl shadow-sm border ${cardBg}`}>
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                                <h3 className={`font-bold ${cardText}`}>Wallet Actions</h3>
                                <div className={`text-xs mt-1 flex flex-col gap-1 ${subText}`}>
                                    <p>Minimum withdrawal: <span className={`font-semibold ${cardText}`}>{formatCurrency(minWithdrawal)}</span></p>
                                    <p>Withdrawals available on: <span className={`font-semibold ${cardText}`}>{allowedDayNames || 'None'}</span></p>
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                                <button
                                    onClick={handleWithdraw}
                                    disabled={!canWithdraw || withdrawing}
                                    className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold transition-all shadow-sm ${canWithdraw ? 'bg-emerald-600 text-white hover:bg-emerald-700' : (isDark ? 'bg-slate-700 text-slate-500' : 'bg-slate-100 text-slate-400')} cursor-${canWithdraw ? 'pointer' : 'not-allowed'}`}
                                >
                                    {withdrawing ? 'Processing...' : 'Withdraw Funds'}
                                    {!withdrawing && <DollarSign className="w-4 h-4" />}
                                </button>
                                {!isDayAllowed && (
                                    <span className="text-xs text-amber-600 font-medium bg-amber-50 px-2 py-1 rounded">
                                        Wait until {allowedDayNames.split(',')[0]}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Tabs & Tables */}
                    <div className="space-y-4">
                        <div className={`flex gap-4 border-b ${borderColor}`}>
                            <button
                                onClick={() => setActiveTab('REFERRALS')}
                                className={`pb-3 text-sm font-medium transition-colors ${activeTab === 'REFERRALS' ? 'text-blue-600 border-b-2 border-blue-600' : subText}`}
                            >
                                Referrals History
                            </button>
                            <button
                                onClick={() => setActiveTab('WITHDRAWALS')}
                                className={`pb-3 text-sm font-medium transition-colors ${activeTab === 'WITHDRAWALS' ? 'text-blue-600 border-b-2 border-blue-600' : subText}`}
                            >
                                Withdrawal Requests
                            </button>
                        </div>

                        {activeTab === 'REFERRALS' ? (
                            <div className={`rounded-xl shadow-sm border overflow-hidden ${cardBg}`}>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead className={`text-xs uppercase font-semibold ${tableBg} ${subText}`}>
                                            <tr>
                                                <th className="px-6 py-4">Referred User</th>
                                                <th className="px-6 py-4">Date</th>
                                                <th className="px-6 py-4">Commission</th>
                                                <th className="px-6 py-4">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className={`divide-y ${borderColor}`}>
                                            {referrals.map(ref => (
                                                <tr key={ref.id} className={tableRowHover}>
                                                    <td className={`px-6 py-4 font-medium ${cardText}`}>{ref.referredUserName}</td>
                                                    <td className={`px-6 py-4 ${subText}`}>{format(new Date(ref.createdAt), 'MMM d, yyyy')}</td>
                                                    <td className="px-6 py-4 font-medium text-green-500">+{formatCurrency(ref.commission)}</td>
                                                    <td className="px-6 py-4">
                                                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${ref.status === 'PAID' || ref.status === 'APPROVED' ? 'bg-green-100 text-green-800' : ref.status === 'PENDING' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>
                                                            {ref.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                            {referrals.length === 0 && (
                                                <tr>
                                                    <td colSpan={4} className={`px-6 py-12 text-center ${subText}`}>
                                                        No referrals yet. Share your link to get started!
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ) : (
                            <div className={`rounded-xl shadow-sm border overflow-hidden ${cardBg}`}>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead className={`text-xs uppercase font-semibold ${tableBg} ${subText}`}>
                                            <tr>
                                                <th className="px-6 py-4">Request Date</th>
                                                <th className="px-6 py-4">Amount</th>
                                                <th className="px-6 py-4">Status</th>
                                                <th className="px-6 py-4 text-right">Invoice</th>
                                            </tr>
                                        </thead>
                                        <tbody className={`divide-y ${borderColor}`}>
                                            {withdrawals.map(w => (
                                                <tr key={w.id} className={tableRowHover}>
                                                    <td className={`px-6 py-4 ${subText}`}>{format(new Date(w.requestedAt), 'MMM d, yyyy HH:mm')}</td>
                                                    <td className={`px-6 py-4 font-bold ${cardText}`}>{formatCurrency(w.amount)}</td>
                                                    <td className="px-6 py-4">
                                                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${w.status === 'PAID' ? 'bg-green-100 text-green-800' : w.status === 'PENDING' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'}`}>
                                                            {w.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <button className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 px-2 py-1 rounded transition-colors">
                                                            <Download className="w-3 h-3" /> Download
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {withdrawals.length === 0 && (
                                                <tr>
                                                    <td colSpan={4} className={`px-6 py-12 text-center ${subText}`}>
                                                        No withdrawal history found.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            ) : (
                /* Admin View */
                <div className="space-y-6">
                    <div className={`flex gap-4 border-b ${borderColor}`}>
                        <button
                            onClick={() => setActiveTab('REFERRALS')}
                            className={`pb-3 text-sm font-medium transition-colors ${activeTab === 'REFERRALS' ? 'text-blue-600 border-b-2 border-blue-600' : subText}`}
                        >
                            All Referrals
                        </button>
                        <button
                            onClick={() => setActiveTab('WITHDRAWALS')}
                            className={`pb-3 text-sm font-medium transition-colors ${activeTab === 'WITHDRAWALS' ? 'text-blue-600 border-b-2 border-blue-600' : subText}`}
                        >
                            Withdrawal Requests ({adminWithdrawals.filter(w => w.status === 'PENDING').length})
                        </button>
                    </div>

                    {activeTab === 'REFERRALS' ? (
                        <div className={`rounded-xl shadow-sm border overflow-hidden ${cardBg}`}>
                            <div className={`p-4 border-b ${borderColor} flex justify-between items-center`}>
                                <h3 className={`font-bold ${cardText}`}>All Referrals</h3>
                                <span className={`text-xs px-2 py-1 rounded ${isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>Total: {adminReferrals.length}</span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className={`text-xs uppercase font-semibold ${tableBg} ${subText}`}>
                                        <tr>
                                            <th className="px-6 py-4">Referrer</th>
                                            <th className="px-6 py-4">Referred User</th>
                                            <th className="px-6 py-4">Date</th>
                                            <th className="px-6 py-4">Commission</th>
                                            <th className="px-6 py-4">Status</th>
                                            <th className="px-6 py-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className={`divide-y ${borderColor}`}>
                                        {adminReferrals.map(ref => (
                                            <tr key={ref.id} className={tableRowHover}>
                                                <td className={`px-6 py-4 font-mono text-xs ${subText}`}>{ref.referrerId}</td>
                                                <td className={`px-6 py-4 font-medium ${cardText}`}>
                                                    {ref.referredUserName}
                                                    <div className={`text-xs font-normal ${subText}`}>{ref.referredUserEmail}</div>
                                                </td>
                                                <td className={`px-6 py-4 text-sm ${subText}`}>{format(new Date(ref.createdAt), 'MMM d, yyyy')}</td>
                                                <td className="px-6 py-4 font-medium text-green-500">{formatCurrency(ref.commission)}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${ref.status === 'PAID' ? 'bg-green-100 text-green-800' : ref.status === 'PENDING' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>
                                                        {ref.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button
                                                        onClick={() => handleDeleteReferral(ref.id)}
                                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Delete Record"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        <div className={`rounded-xl shadow-sm border overflow-hidden ${cardBg}`}>
                            <div className={`p-4 border-b ${borderColor}`}>
                                <h3 className={`font-bold ${cardText}`}>Withdrawal Requests</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className={`text-xs uppercase font-semibold ${tableBg} ${subText}`}>
                                        <tr>
                                            <th className="px-6 py-4">User</th>
                                            <th className="px-6 py-4">Amount</th>
                                            <th className="px-6 py-4">Method</th>
                                            <th className="px-6 py-4">Requested</th>
                                            <th className="px-6 py-4">Status</th>
                                            <th className="px-6 py-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className={`divide-y ${borderColor}`}>
                                        {adminWithdrawals.map(w => (
                                            <tr key={w.id} className={tableRowHover}>
                                                <td className={`px-6 py-4 font-medium ${cardText}`}>{w.userName}</td>
                                                <td className={`px-6 py-4 font-bold ${cardText}`}>{formatCurrency(w.amount)}</td>
                                                <td className={`px-6 py-4 text-sm max-w-xs truncate ${subText}`}>{w.method}</td>
                                                <td className={`px-6 py-4 text-sm ${subText}`}>{format(new Date(w.requestedAt), 'MMM d, yyyy')}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${w.status === 'PAID' ? 'bg-green-100 text-green-800' : w.status === 'PENDING' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'}`}>
                                                        {w.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    {w.status === 'PENDING' ? (
                                                        <div className="flex justify-end gap-2">
                                                            <button
                                                                onClick={() => handleUpdateWithdrawal(w.id, 'PAID')}
                                                                className="px-3 py-1 bg-green-600 text-white text-xs font-bold rounded hover:bg-green-700 shadow-sm"
                                                            >
                                                                Approve
                                                            </button>
                                                            <button
                                                                onClick={() => handleUpdateWithdrawal(w.id, 'REJECTED')}
                                                                className="px-3 py-1 bg-white border border-red-200 text-red-600 text-xs font-bold rounded hover:bg-red-50"
                                                            >
                                                                Reject
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <span className={`text-xs italic ${subText}`}>
                                                            Processed {w.processedAt ? format(new Date(w.processedAt), 'MMM d') : ''}
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                        {adminWithdrawals.length === 0 && (
                                            <tr>
                                                <td colSpan={6} className={`px-6 py-12 text-center ${subText}`}>
                                                    No withdrawal requests found.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Affiliates;