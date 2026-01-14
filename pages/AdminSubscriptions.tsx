import React, { useState, useEffect, useRef } from 'react';
import {
    Search,
    Filter,
    MoreHorizontal,
    TrendingUp,
    Users,
    DollarSign,
    AlertCircle,
    Download,
    CheckCircle,
    XCircle,
    Clock,
    X,
    UserPlus,
    Edit,
    Trash2,
    PauseCircle,
    PlayCircle,
    Eye,
    Image
} from 'lucide-react';
import { api } from '../services/api';
import { Package } from '../types';

// Dummy Data
// Dummy Data Removed

const AdminSubscriptions: React.FC = () => {
    const [subscribers, setSubscribers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('All');
    const [searchTerm, setSearchTerm] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [packages, setPackages] = useState<Package[]>([]);

    // Actions dropdown state
    const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Edit modal state
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingSubscription, setEditingSubscription] = useState<any>(null);

    // Delete confirmation state
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deletingSubscription, setDeletingSubscription] = useState<any>(null);

    // Form state
    const [newSubscriber, setNewSubscriber] = useState({
        name: '', // Not used for creation, but for local state if needed
        email: '',
        plan: 'starter',
        billing: 'Monthly',
        status: 'Active'
    });

    const loadData = async () => {
        setLoading(true);
        try {
            const [subsData, packsData] = await Promise.all([
                api.subscriptions.getAll(),
                api.admin.getPackages()
            ]);

            // Map API data to UI format
            const formattedSubs = subsData.map(sub => ({
                id: sub.id,
                name: sub.profiles?.name || 'Unknown User',
                email: sub.profiles?.email || 'No Email',
                plan: sub.packages?.name || 'Unknown',
                status: sub.status,
                billing: sub.billing_cycle,
                amount: sub.amount,
                nextBill: sub.next_billing_date ? new Date(sub.next_billing_date).toLocaleDateString() : '-',
                avatar: sub.profiles?.avatar_url || '',
                proofUrl: sub.proof_url || ''
            }));

            setSubscribers(formattedSubs);
            setPackages(packsData);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setOpenDropdownId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Handle freeze/unfreeze (toggle between Active and Frozen)
    const handleFreeze = async (sub: any) => {
        try {
            const newStatus = sub.status === 'Active' ? 'Frozen' : 'Active';
            await api.subscriptions.update(sub.id, { status: newStatus });
            await loadData();
            setOpenDropdownId(null);
        } catch (error: any) {
            alert('Failed to update subscription: ' + error.message);
        }
    };

    // Handle edit
    const handleEditClick = (sub: any) => {
        setEditingSubscription({
            ...sub,
            packageId: packages.find(p => p.name === sub.plan)?.id || ''
        });
        setIsEditModalOpen(true);
        setOpenDropdownId(null);
    };

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingSubscription) return;

        try {
            const selectedPackage = packages.find(p => p.id === editingSubscription.packageId);
            const amount = editingSubscription.billing === 'Yearly'
                ? (selectedPackage?.priceYearly || 0)
                : (selectedPackage?.priceMonthly || 0);

            await api.subscriptions.update(editingSubscription.id, {
                package_id: editingSubscription.packageId,
                status: editingSubscription.status,
                billing_cycle: editingSubscription.billing,
                amount: amount,
                next_billing_date: editingSubscription.nextBillDate || undefined
            });
            await loadData();
            setIsEditModalOpen(false);
            setEditingSubscription(null);
        } catch (error: any) {
            alert('Failed to update subscription: ' + error.message);
        }
    };

    // Handle delete
    const handleDeleteClick = (sub: any) => {
        setDeletingSubscription(sub);
        setIsDeleteModalOpen(true);
        setOpenDropdownId(null);
    };

    const handleDeleteConfirm = async () => {
        if (!deletingSubscription) return;

        try {
            await api.subscriptions.delete(deletingSubscription.id);
            await loadData();
            setIsDeleteModalOpen(false);
            setDeletingSubscription(null);
        } catch (error: any) {
            alert('Failed to delete subscription: ' + error.message);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Active': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
            case 'Past Due': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
            case 'Frozen': return 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400';
            case 'Cancelled': return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400';
            default: return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
        }
    };

    const getPlanColor = (plan: string) => {
        switch (plan) {
            case 'Enterprise': return 'text-indigo-600 dark:text-indigo-400 font-bold';
            case 'Pro': return 'text-purple-600 dark:text-purple-400 font-semibold';
            case 'Starter': return 'text-blue-600 dark:text-blue-400 font-medium';
            default: return 'text-slate-600 dark:text-slate-400';
        }
    };

    const handleAddSubscriber = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            // Find selected package details
            const selectedPackage = packages.find(p => p.id === newSubscriber.plan);
            const amount = newSubscriber.billing === 'Yearly'
                ? (selectedPackage?.priceYearly || 0)
                : (selectedPackage?.priceMonthly || 0);

            // Calculate next bill date
            const date = new Date();
            date.setMonth(date.getMonth() + 1);

            await api.subscriptions.create({
                email: newSubscriber.email,
                package_id: newSubscriber.plan,
                status: newSubscriber.status as any,
                billing_cycle: newSubscriber.billing as any,
                amount: amount,
                next_billing_date: date.toISOString()
            });

            await loadData(); // Reload list
            setIsAddModalOpen(false);
            setNewSubscriber({ name: '', email: '', plan: 'starter', billing: 'Monthly', status: 'Active' });
        } catch (error: any) {
            alert(error.message);
        }
    };

    const filteredSubscribers = subscribers.filter(sub => {
        const matchesSearch = sub.name.toLowerCase().includes(searchTerm.toLowerCase()) || sub.email.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter = filterStatus === 'All' || sub.status === filterStatus;
        return matchesSearch && matchesFilter;
    });

    // Calculate real stats
    const activeSubscribers = subscribers.filter(s => s.status === 'Active').length;
    const cancelledSubscribers = subscribers.filter(s => s.status === 'Cancelled').length;
    const pendingSubscribers = subscribers.filter(s => s.status === 'Pending').length;
    const totalSubscribers = subscribers.length;

    // Calculate MRR (Monthly Recurring Revenue)
    const mrr = subscribers
        .filter(s => s.status === 'Active')
        .reduce((sum, s) => sum + (s.billing === 'Monthly' ? s.amount : s.amount / 12), 0);

    // Calculate churn rate (cancelled / total * 100)
    const churnRate = totalSubscribers > 0 ? ((cancelledSubscribers / totalSubscribers) * 100).toFixed(1) : '0.0';

    // Count Pro/Enterprise plans (higher tier plans)
    const proPlanSubscribers = subscribers.filter(s =>
        s.plan?.toLowerCase().includes('pro') ||
        s.plan?.toLowerCase().includes('enterprise') ||
        s.plan?.toLowerCase().includes('lifetime')
    ).length;

    return (
        <div className="space-y-8 relative">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Subscriptions</h1>
                    <p className="text-slate-500 dark:text-slate-400">Manage your member billing and plan details.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                        <Download className="w-4 h-4" />
                        Export CSV
                    </button>
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors shadow-sm shadow-primary-500/20"
                    >
                        <Users className="w-4 h-4" />
                        Add Subscriber
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                            <DollarSign className="w-5 h-5" />
                        </div>
                        <span className="text-slate-400 text-xs">Monthly</span>
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white">${mrr.toLocaleString(undefined, { maximumFractionDigits: 0 })}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Monthly Recurring Revenue</p>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400">
                            <Users className="w-5 h-5" />
                        </div>
                        <span className="text-slate-400 text-xs">{totalSubscribers} Total</span>
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{activeSubscribers}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Active Subscribers</p>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
                            <Clock className="w-5 h-5" />
                        </div>
                        <span className="text-slate-400 text-xs">Awaiting</span>
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{pendingSubscribers}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Pending Approvals</p>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
                            <CheckCircle className="w-5 h-5" />
                        </div>
                        <span className="text-slate-400 text-xs">Premium</span>
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{proPlanSubscribers}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Pro/Lifetime Plans</p>
                </div>
            </div>

            {/* Filters and Search */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search by name, email, or invoice ID..."
                        className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all dark:text-white placeholder:text-slate-400"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <select
                            className="pl-10 pr-8 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none dark:text-white appearance-none cursor-pointer"
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                        >
                            <option value="All">All Status</option>
                            <option value="Active">Active</option>
                            <option value="Past Due">Past Due</option>
                            <option value="Cancelled">Cancelled</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Subscriber</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Plan</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Recurring</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Next Billing</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Proof</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                                        Loading subscriptions...
                                    </td>
                                </tr>
                            ) : filteredSubscribers.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                                        No subscriptions found.
                                    </td>
                                </tr>
                            ) : (
                                filteredSubscribers.map((sub) => (
                                    <tr key={sub.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                                                    {sub.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="font-medium text-slate-900 dark:text-white">{sub.name}</div>
                                                    <div className="text-sm text-slate-500 dark:text-slate-400">{sub.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm">
                                            <span className={getPlanColor(sub.plan)}>{sub.plan}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(sub.status)}`}>
                                                {sub.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-slate-900 dark:text-white">${sub.amount}</div>
                                            <div className="text-xs text-slate-500 dark:text-slate-400">{sub.billing}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300">
                                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                                {sub.nextBill}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {sub.proofUrl ? (
                                                <a
                                                    href={sub.proofUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                    View
                                                </a>
                                            ) : (
                                                <span className="text-sm text-slate-400 dark:text-slate-500 flex items-center gap-1">
                                                    <Image className="w-4 h-4" />
                                                    None
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-1">
                                                {/* Edit - Green/Success */}
                                                <button
                                                    onClick={() => handleEditClick(sub)}
                                                    className="p-2 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:text-emerald-300 dark:hover:bg-emerald-900/20 rounded-lg transition-colors"
                                                    title="Edit Subscription"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                {/* Freeze/Unfreeze - Amber/Orange */}
                                                <button
                                                    onClick={() => handleFreeze(sub)}
                                                    className="p-2 text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:text-amber-300 dark:hover:bg-amber-900/20 rounded-lg transition-colors"
                                                    title={sub.status === 'Active' ? 'Freeze Subscription' : 'Unfreeze Subscription'}
                                                >
                                                    {sub.status === 'Active' ? (
                                                        <PauseCircle className="w-4 h-4" />
                                                    ) : (
                                                        <PlayCircle className="w-4 h-4" />
                                                    )}
                                                </button>
                                                {/* Delete - Red/Danger */}
                                                <button
                                                    onClick={() => handleDeleteClick(sub)}
                                                    className="p-2 text-red-500 hover:text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                    title="Delete Subscription"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination (Simplified for now) */}
                <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div className="text-sm text-slate-500 dark:text-slate-400">
                        Showing <span className="font-medium text-slate-900 dark:text-white">1</span> to <span className="font-medium text-slate-900 dark:text-white">{filteredSubscribers.length}</span> of <span className="font-medium text-slate-900 dark:text-white">{filteredSubscribers.length}</span> results
                    </div>
                </div>
            </div>

            {/* Add Subscriber Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-fade-in">
                        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <UserPlus className="w-6 h-6 text-primary-600" />
                                Add New Subscriber
                            </h2>
                            <button
                                onClick={() => setIsAddModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleAddSubscriber} className="p-6 space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Email Address (Must be existing user)</label>
                                <input
                                    type="email"
                                    required
                                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                                    value={newSubscriber.email}
                                    onChange={e => setNewSubscriber({ ...newSubscriber, email: e.target.value })}
                                    placeholder="user@example.com"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Plan</label>
                                    <select
                                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                                        value={newSubscriber.plan}
                                        onChange={e => setNewSubscriber({ ...newSubscriber, plan: e.target.value })}
                                    >
                                        {packages.map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Billing Cycle</label>
                                    <select
                                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                                        value={newSubscriber.billing}
                                        onChange={e => setNewSubscriber({ ...newSubscriber, billing: e.target.value })}
                                    >
                                        <option value="Monthly">Monthly</option>
                                        <option value="Yearly">Yearly</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Status</label>
                                <select
                                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                                    value={newSubscriber.status}
                                    onChange={e => setNewSubscriber({ ...newSubscriber, status: e.target.value })}
                                >
                                    <option value="Active">Active</option>
                                    <option value="Past Due">Past Due</option>
                                    <option value="Cancelled">Cancelled</option>
                                </select>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsAddModalOpen(false)}
                                    className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors font-medium shadow-lg shadow-primary-500/25"
                                >
                                    Add Subscriber
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Subscription Modal */}
            {isEditModalOpen && editingSubscription && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-fade-in">
                        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Edit className="w-6 h-6 text-primary-600" />
                                Edit Subscription
                            </h2>
                            <button
                                onClick={() => { setIsEditModalOpen(false); setEditingSubscription(null); }}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Subscriber</label>
                                <div className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                    {editingSubscription.name} ({editingSubscription.email})
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Plan</label>
                                    <select
                                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                                        value={editingSubscription.packageId}
                                        onChange={e => setEditingSubscription({ ...editingSubscription, packageId: e.target.value })}
                                    >
                                        {packages.map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Billing Cycle</label>
                                    <select
                                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                                        value={editingSubscription.billing}
                                        onChange={e => setEditingSubscription({ ...editingSubscription, billing: e.target.value })}
                                    >
                                        <option value="Monthly">Monthly</option>
                                        <option value="Yearly">Yearly</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Status</label>
                                <select
                                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                                    value={editingSubscription.status}
                                    onChange={e => setEditingSubscription({ ...editingSubscription, status: e.target.value })}
                                >
                                    <option value="Active">Active</option>
                                    <option value="Past Due">Past Due</option>
                                    <option value="Frozen">Frozen</option>
                                    <option value="Cancelled">Cancelled</option>
                                </select>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => { setIsEditModalOpen(false); setEditingSubscription(null); }}
                                    className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors font-medium shadow-lg shadow-primary-500/25"
                                >
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {isDeleteModalOpen && deletingSubscription && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-fade-in">
                        <div className="p-6 text-center">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                                <Trash2 className="w-8 h-8 text-red-600 dark:text-red-400" />
                            </div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                                Delete Subscription
                            </h2>
                            <p className="text-slate-500 dark:text-slate-400 mb-6">
                                Are you sure you want to delete the subscription for <span className="font-semibold text-slate-700 dark:text-slate-200">{deletingSubscription.name}</span>? This action cannot be undone.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => { setIsDeleteModalOpen(false); setDeletingSubscription(null); }}
                                    className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDeleteConfirm}
                                    className="flex-1 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-medium shadow-lg shadow-red-500/25"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminSubscriptions;
