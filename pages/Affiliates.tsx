import React, { useEffect, useState } from 'react';
import { User, UserRole, AffiliateStats, Referral, AdminSettings, WithdrawalRequest } from '../types';
import { api } from '../services/api';
import { Banknote, Copy, Check, Users, TrendingUp, Clock, Trash2, Shield, DollarSign, Wallet, FileText, Download } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '../context/ToastContext';

interface AffiliatesProps {
    user: User;
}

const StatCard = ({ title, value, subtext, icon: Icon, color }: any) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
        <div className={`p-3 rounded-lg ${color}`}>
            <Icon className="w-6 h-6 text-white" />
        </div>
        <div>
            <p className="text-sm font-medium text-slate-500">{title}</p>
            <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
            {subtext && <p className="text-xs text-slate-400 mt-1">{subtext}</p>}
        </div>
    </div>
);

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

    const generateInvoiceHtml = (request: WithdrawalRequest) => {
        const currency = settings?.affiliateCurrency || 'USD';
        const amountStr = new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(request.amount);

        return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #333; }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 30px; }
          .logo { font-size: 24px; font-weight: bold; color: #2563eb; }
          .invoice-title { font-size: 32px; color: #1e293b; margin: 0; }
          .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px; }
          .box { background: #f8fafc; padding: 20px; border-radius: 8px; }
          .label { font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px; }
          .value { font-size: 16px; font-weight: 500; }
          .amount-box { background: #ecfdf5; color: #065f46; text-align: right; }
          .total-label { font-size: 14px; margin-bottom: 5px; }
          .total-value { font-size: 36px; font-weight: bold; }
          .footer { margin-top: 60px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #94a3b8; text-align: center; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">Mychat Pilot</div>
          <div>
            <h1 class="invoice-title">PAYOUT INVOICE</h1>
            <p>#${request.id.toUpperCase()}</p>
          </div>
        </div>

        <div class="details-grid">
          <div class="box">
            <div class="label">Billed To</div>
            <div class="value">Mychat Pilot</div>
            <div class="value">123 Tech Boulevard</div>
            <div class="value">San Francisco, CA 94105</div>
          </div>
          <div class="box">
            <div class="label">Payee (Affiliate)</div>
            <div class="value">${request.userName}</div>
            <div class="value">User ID: ${request.userId}</div>
            <div class="value">Method: ${request.method}</div>
          </div>
        </div>

        <div class="box amount-box">
          <div class="total-label">Total Payout Amount</div>
          <div class="total-value">${amountStr}</div>
        </div>

        <div style="margin-top: 30px;">
          <table style="width: 100%; text-align: left; border-collapse: collapse;">
            <thead>
              <tr style="background: #f1f5f9;">
                <th style="padding: 12px;">Description</th>
                <th style="padding: 12px;">Date Requested</th>
                <th style="padding: 12px;">Status</th>
                <th style="padding: 12px; text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding: 12px; border-bottom: 1px solid #eee;">Affiliate Commission Payout</td>
                <td style="padding: 12px; border-bottom: 1px solid #eee;">${format(new Date(request.requestedAt), 'MMM d, yyyy')}</td>
                <td style="padding: 12px; border-bottom: 1px solid #eee;">${request.status}</td>
                <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">${amountStr}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="footer">
          <p>This is a computer-generated document. No signature is required.</p>
          <p>Processed on: ${request.processedAt ? format(new Date(request.processedAt), 'MMM d, yyyy') : 'Pending'}</p>
        </div>
      </body>
      </html>
    `;
    };

    const handleDownloadInvoice = (request: WithdrawalRequest) => {
        const html = generateInvoiceHtml(request);
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Invoice-${request.id}.html`; // In a real app this would be .pdf
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast.success("Invoice downloaded.");
    };

    const handleWithdraw = async () => {
        const minAmount = settings?.affiliateMinWithdrawal || 100;
        if (!stats || stats.unpaidEarnings < minAmount) return;

        const confirmed = window.confirm(`Are you sure you want to withdraw $${stats.unpaidEarnings.toFixed(2)}? An invoice will be emailed to you.`);
        if (!confirmed) return;

        setWithdrawing(true);
        try {
            await api.affiliate.requestWithdrawal(user.id, stats.unpaidEarnings);
            toast.success("Withdrawal request submitted. Invoice sent to your email.");
            await loadData();
            setActiveTab('WITHDRAWALS'); // Switch tab to show the new request
        } catch (e) {
            toast.error("Failed to request withdrawal.");
        } finally {
            setWithdrawing(false);
        }
    };

    const handleDeleteReferral = async (id: string) => {
        if (!window.confirm("Are you sure you want to delete this referral record? This cannot be undone.")) return;
        try {
            await api.affiliate.deleteReferral(id);
            toast.success("Referral record deleted.");
            // Refresh admin list
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

    if (loading && !stats) return <div className="p-8 text-center text-slate-500">Loading affiliate data...</div>;

    if (settings && !settings.affiliateEnabled && !isAdmin) {
        return (
            <div className="flex flex-col items-center justify-center h-96 text-slate-500">
                <Banknote className="w-16 h-16 mb-4 text-slate-300" />
                <h2 className="text-xl font-bold text-slate-900">Affiliate Program Unavailable</h2>
                <p>The affiliate program is currently disabled by the administrator.</p>
            </div>
        );
    }

    const currency = settings?.affiliateCurrency || 'USD';
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency }).format(amount);
    };

    // Logic for enabling withdrawal button
    const currentDay = new Date().getDay(); // 0=Sun, 1=Mon...
    const allowedDays = settings?.affiliateWithdrawalDays || [1];
    const isDayAllowed = allowedDays.includes(currentDay);
    const minWithdrawal = settings?.affiliateMinWithdrawal || 100;
    const isBalanceSufficient = (stats?.unpaidEarnings || 0) >= minWithdrawal;
    const canWithdraw = isBalanceSufficient && isDayAllowed;

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const allowedDayNames = allowedDays.map(d => dayNames[d]).join(', ');

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Affiliate Program</h1>
                    <p className="text-slate-500 mt-1">Earn {formatCurrency(settings?.affiliateCommission || 0)} for every new customer you refer.</p>
                </div>
                {isAdmin && (
                    <div className="bg-slate-100 p-1 rounded-lg flex text-sm font-medium">
                        <button
                            onClick={() => setViewMode('MY')}
                            className={`px-3 py-1.5 rounded-md transition-colors ${viewMode === 'MY' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                        >
                            My Dashboard
                        </button>
                        <button
                            onClick={() => setViewMode('ALL')}
                            className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1 ${viewMode === 'ALL' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                        >
                            <Shield className="w-3 h-3" /> Admin View
                        </button>
                    </div>
                )}
            </div>

            {viewMode === 'MY' ? (
                <>
                    {/* Affiliate Link Card */}
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-8 text-white shadow-lg shadow-blue-200 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                            <Banknote className="w-64 h-64 text-white" />
                        </div>
                        <div className="max-w-3xl relative z-10">
                            <h3 className="text-xl font-bold mb-2">Your Unique Referral Link</h3>
                            <p className="text-blue-100 mb-6">Share this link with your friends and audience. When they sign up, you get paid.</p>

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
                        <StatCard
                            title="Available Balance"
                            value={formatCurrency(stats?.unpaidEarnings || 0)}
                            subtext={`Min: ${formatCurrency(minWithdrawal)}`}
                            icon={Wallet}
                            color="bg-emerald-500"
                        />
                        <StatCard
                            title="Total Paid Out"
                            value={formatCurrency((stats?.totalEarnings || 0) - (stats?.unpaidEarnings || 0))}
                            icon={Banknote}
                            color="bg-blue-500"
                        />
                        <StatCard
                            title="Pending Commission"
                            value={formatCurrency(stats?.pendingEarnings || 0)}
                            subtext="Awaiting validation"
                            icon={Clock}
                            color="bg-amber-500"
                        />
                        <StatCard
                            title="Total Referrals"
                            value={stats?.referrals || 0}
                            icon={Users}
                            color="bg-indigo-500"
                        />
                    </div>

                    {/* Action Bar */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                                <h3 className="font-bold text-slate-900">Wallet Actions</h3>
                                <div className="text-xs text-slate-500 mt-1 flex flex-col gap-1">
                                    <p>Minimum withdrawal: <span className="font-semibold text-slate-700">{formatCurrency(minWithdrawal)}</span></p>
                                    <p>Withdrawals available on: <span className="font-semibold text-slate-700">{allowedDayNames || 'None'}</span></p>
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                                <button
                                    onClick={handleWithdraw}
                                    disabled={!canWithdraw || withdrawing}
                                    className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold transition-all shadow-sm ${canWithdraw
                                            ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-200'
                                            : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                        }`}
                                    title={!isDayAllowed ? "Not available today" : !isBalanceSufficient ? "Insufficient balance" : ""}
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

                    <div className="space-y-4">
                        {/* Tabs */}
                        <div className="flex gap-4 border-b border-slate-200">
                            <button
                                onClick={() => setActiveTab('REFERRALS')}
                                className={`pb-3 text-sm font-medium transition-colors ${activeTab === 'REFERRALS' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-800'}`}
                            >
                                Referrals History
                            </button>
                            <button
                                onClick={() => setActiveTab('WITHDRAWALS')}
                                className={`pb-3 text-sm font-medium transition-colors ${activeTab === 'WITHDRAWALS' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-800'}`}
                            >
                                Withdrawal Requests
                            </button>
                        </div>

                        {activeTab === 'REFERRALS' ? (
                            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
                                            <tr>
                                                <th className="px-6 py-4">Referred User</th>
                                                <th className="px-6 py-4">Date</th>
                                                <th className="px-6 py-4">Commission</th>
                                                <th className="px-6 py-4">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {referrals.map(ref => (
                                                <tr key={ref.id}>
                                                    <td className="px-6 py-4 font-medium text-slate-900">{ref.referredUserName}</td>
                                                    <td className="px-6 py-4 text-slate-500">{format(new Date(ref.createdAt), 'MMM d, yyyy')}</td>
                                                    <td className="px-6 py-4 font-medium text-green-600">+{formatCurrency(ref.commission)}</td>
                                                    <td className="px-6 py-4">
                                                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${ref.status === 'PAID' || ref.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                                                                ref.status === 'PENDING' ? 'bg-amber-100 text-amber-800' :
                                                                    'bg-slate-100 text-slate-600'
                                                            }`}>
                                                            {ref.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                            {referrals.length === 0 && (
                                                <tr>
                                                    <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                                                        No referrals yet. Share your link to get started!
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
                                            <tr>
                                                <th className="px-6 py-4">Request Date</th>
                                                <th className="px-6 py-4">Amount</th>
                                                <th className="px-6 py-4">Status</th>
                                                <th className="px-6 py-4 text-right">Invoice</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {withdrawals.map(w => (
                                                <tr key={w.id}>
                                                    <td className="px-6 py-4 text-slate-500">{format(new Date(w.requestedAt), 'MMM d, yyyy HH:mm')}</td>
                                                    <td className="px-6 py-4 font-bold text-slate-900">{formatCurrency(w.amount)}</td>
                                                    <td className="px-6 py-4">
                                                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${w.status === 'PAID' ? 'bg-green-100 text-green-800' :
                                                                w.status === 'PENDING' ? 'bg-blue-100 text-blue-800' :
                                                                    'bg-red-100 text-red-800'
                                                            }`}>
                                                            {w.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <button
                                                            onClick={() => handleDownloadInvoice(w)}
                                                            className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1 rounded transition-colors"
                                                        >
                                                            <Download className="w-3 h-3" />
                                                            Download
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {withdrawals.length === 0 && (
                                                <tr>
                                                    <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
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
                    {/* Tabs */}
                    <div className="flex gap-4 border-b border-slate-200">
                        <button
                            onClick={() => setActiveTab('REFERRALS')}
                            className={`pb-3 text-sm font-medium transition-colors ${activeTab === 'REFERRALS' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-800'}`}
                        >
                            All Referrals
                        </button>
                        <button
                            onClick={() => setActiveTab('WITHDRAWALS')}
                            className={`pb-3 text-sm font-medium transition-colors ${activeTab === 'WITHDRAWALS' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-800'}`}
                        >
                            Withdrawal Requests ({adminWithdrawals.filter(w => w.status === 'PENDING').length})
                        </button>
                    </div>

                    {activeTab === 'REFERRALS' ? (
                        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                            <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                                <h3 className="font-bold text-slate-900">All Referrals</h3>
                                <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded">Total: {adminReferrals.length}</span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
                                        <tr>
                                            <th className="px-6 py-4">Referrer</th>
                                            <th className="px-6 py-4">Referred User</th>
                                            <th className="px-6 py-4">Date</th>
                                            <th className="px-6 py-4">Commission</th>
                                            <th className="px-6 py-4">Status</th>
                                            <th className="px-6 py-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {adminReferrals.map(ref => (
                                            <tr key={ref.id} className="hover:bg-slate-50">
                                                <td className="px-6 py-4 text-slate-600 font-mono text-xs">{ref.referrerId}</td>
                                                <td className="px-6 py-4 font-medium text-slate-900">
                                                    {ref.referredUserName}
                                                    <div className="text-xs text-slate-400 font-normal">{ref.referredUserEmail}</div>
                                                </td>
                                                <td className="px-6 py-4 text-slate-500 text-sm">{format(new Date(ref.createdAt), 'MMM d, yyyy')}</td>
                                                <td className="px-6 py-4 font-medium text-green-600">{formatCurrency(ref.commission)}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${ref.status === 'PAID' ? 'bg-green-100 text-green-800' :
                                                            ref.status === 'PENDING' ? 'bg-amber-100 text-amber-800' :
                                                                'bg-slate-100 text-slate-600'
                                                        }`}>
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
                        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                            <div className="p-4 border-b border-slate-100">
                                <h3 className="font-bold text-slate-900">Withdrawal Requests</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
                                        <tr>
                                            <th className="px-6 py-4">User</th>
                                            <th className="px-6 py-4">Amount</th>
                                            <th className="px-6 py-4">Method Details</th>
                                            <th className="px-6 py-4">Requested</th>
                                            <th className="px-6 py-4">Status</th>
                                            <th className="px-6 py-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {adminWithdrawals.map(w => (
                                            <tr key={w.id}>
                                                <td className="px-6 py-4 font-medium text-slate-900">{w.userName}</td>
                                                <td className="px-6 py-4 font-bold text-slate-900">{formatCurrency(w.amount)}</td>
                                                <td className="px-6 py-4 text-sm text-slate-600 max-w-xs truncate" title={w.method}>{w.method}</td>
                                                <td className="px-6 py-4 text-sm text-slate-500">{format(new Date(w.requestedAt), 'MMM d, yyyy')}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${w.status === 'PAID' ? 'bg-green-100 text-green-800' :
                                                            w.status === 'PENDING' ? 'bg-blue-100 text-blue-800' :
                                                                'bg-red-100 text-red-800'
                                                        }`}>
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
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button
                                                                onClick={() => handleDownloadInvoice(w)}
                                                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                                                title="Download Invoice"
                                                            >
                                                                <Download className="w-4 h-4" />
                                                            </button>
                                                            {w.status === 'PAID' && (
                                                                <span className="text-xs text-slate-400 italic">Processed {w.processedAt ? format(new Date(w.processedAt), 'MMM d') : ''}</span>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                        {adminWithdrawals.length === 0 && (
                                            <tr>
                                                <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
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