import React, { useState } from 'react';
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
    UserPlus
} from 'lucide-react';

// Dummy Data
const INITIAL_SUBSCRIBERS = [
    { id: 1, name: "Alice Freeman", email: "alice@example.com", plan: "Pro", status: "Active", billing: "Yearly", amount: 350, nextBill: "Oct 24, 2026", avatar: "" },
    { id: 2, name: "Bob Smith", email: "bob.smith@company.com", plan: "Pro", status: "Active", billing: "Monthly", amount: 35, nextBill: "Feb 12, 2026", avatar: "" },
    { id: 3, name: "Charlie Davis", email: "charlie@startup.io", plan: "Starter", status: "Past Due", billing: "Monthly", amount: 15, nextBill: "Jan 05, 2026", avatar: "" },
    { id: 4, name: "Diana Prince", email: "diana@amazon.com", plan: "Free", status: "Active", billing: "Monthly", amount: 0, nextBill: "-", avatar: "" },
    { id: 5, name: "Evan Wright", email: "evan@agency.net", plan: "Pro", status: "Cancelled", billing: "Monthly", amount: 35, nextBill: "-", avatar: "" },
    { id: 6, name: "Fiona Gallagher", email: "fiona@store.com", plan: "Pro", status: "Active", billing: "Yearly", amount: 350, nextBill: "Mar 15, 2026", avatar: "" },
    { id: 7, name: "George Miller", email: "george@freelance.org", plan: "Starter", status: "Active", billing: "Monthly", amount: 15, nextBill: "Feb 20, 2026", avatar: "" },
    { id: 8, name: "Hannah Lee", email: "hannah@design.co", plan: "Pro", status: "Active", billing: "Monthly", amount: 35, nextBill: "Feb 28, 2026", avatar: "" },
];

const AdminSubscriptions: React.FC = () => {
    const [subscribers, setSubscribers] = useState(INITIAL_SUBSCRIBERS);
    const [filterStatus, setFilterStatus] = useState('All');
    const [searchTerm, setSearchTerm] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    // Form state
    const [newSubscriber, setNewSubscriber] = useState({
        name: '',
        email: '',
        plan: 'Starter',
        billing: 'Monthly',
        status: 'Active'
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Active': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
            case 'Past Due': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
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

    const getPlanAmount = (plan: string, billing: string) => {
        if (plan === 'Free') return 0;
        if (billing === 'Yearly') {
            if (plan === 'Starter') return 150;
            if (plan === 'Pro') return 350;
        } else {
            if (plan === 'Starter') return 15;
            if (plan === 'Pro') return 35;
        }
        return 0;
    };

    const handleAddSubscriber = (e: React.FormEvent) => {
        e.preventDefault();
        const amount = getPlanAmount(newSubscriber.plan, newSubscriber.billing);

        // Calculate dummy next bill date (1 month from now)
        const date = new Date();
        date.setMonth(date.getMonth() + 1);
        const nextBill = date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });

        const newItem = {
            id: subscribers.length + 1,
            ...newSubscriber,
            amount,
            nextBill,
            avatar: ''
        };

        setSubscribers([newItem, ...subscribers]);
        setIsAddModalOpen(false);
        setNewSubscriber({ name: '', email: '', plan: 'Starter', billing: 'Monthly', status: 'Active' });
    };

    const filteredSubscribers = subscribers.filter(sub => {
        const matchesSearch = sub.name.toLowerCase().includes(searchTerm.toLowerCase()) || sub.email.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter = filterStatus === 'All' || sub.status === filterStatus;
        return matchesSearch && matchesFilter;
    });

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
                        <span className="flex items-center gap-1 text-green-600 text-xs font-semibold bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-full">
                            <TrendingUp className="w-3 h-3" /> +12.5%
                        </span>
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white">$45,231</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Monthly Recurring Revenue</p>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400">
                            <Users className="w-5 h-5" />
                        </div>
                        <span className="flex items-center gap-1 text-green-600 text-xs font-semibold bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-full">
                            <TrendingUp className="w-3 h-3" /> +8.2%
                        </span>
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white">1,234</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Active Subscribers</p>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-10 h-10 rounded-lg bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center text-pink-600 dark:text-pink-400">
                            <AlertCircle className="w-5 h-5" />
                        </div>
                        <span className="flex items-center gap-1 text-red-600 text-xs font-semibold bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded-full">
                            <TrendingUp className="w-3 h-3" /> +2.4%
                        </span>
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white">2.4%</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Churn Rate (Avg)</p>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                            <CheckCircle className="w-5 h-5" />
                        </div>
                        <span className="text-slate-400 text-xs">High End</span>
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white">142</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Enterprise Plans</p>
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
                    <select
                        className="px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none dark:text-white appearance-none cursor-pointer"
                    >
                        <option value="All">All Plans</option>
                        <option value="Starter">Starter</option>
                        <option value="Pro">Pro</option>
                    </select>
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
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                            {filteredSubscribers.map((sub) => (
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
                                    <td className="px-6 py-4 text-right">
                                        <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                                            <MoreHorizontal className="w-5 h-5" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div className="text-sm text-slate-500 dark:text-slate-400">
                        Showing <span className="font-medium text-slate-900 dark:text-white">1</span> to <span className="font-medium text-slate-900 dark:text-white">{filteredSubscribers.length}</span> of <span className="font-medium text-slate-900 dark:text-white">{filteredSubscribers.length}</span> results
                    </div>
                    <div className="flex gap-2">
                        <button className="px-3 py-1 text-sm border border-slate-200 dark:border-slate-700 rounded-md disabled:opacity-50 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800" disabled>Previous</button>
                        <button className="px-3 py-1 text-sm border border-slate-200 dark:border-slate-700 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">Next</button>
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
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Full Name</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                                    value={newSubscriber.name}
                                    onChange={e => setNewSubscriber({ ...newSubscriber, name: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Email Address</label>
                                <input
                                    type="email"
                                    required
                                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                                    value={newSubscriber.email}
                                    onChange={e => setNewSubscriber({ ...newSubscriber, email: e.target.value })}
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
                                        <option value="Free">Free</option>
                                        <option value="Starter">Starter</option>
                                        <option value="Pro">Pro</option>
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
        </div>
    );
};

export default AdminSubscriptions;
