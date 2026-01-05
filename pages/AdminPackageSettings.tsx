import React, { useState } from 'react';
import {
    Package,
    Check,
    Shield,
    CreditCard,
    Edit3,
    Save,
    Image as ImageIcon,
    CheckCircle,
    XCircle,
    Eye,
    Plus
} from 'lucide-react';

// Dummy Data
const INITIAL_PACKAGES = [
    { id: 'free', name: 'Free', price: 0, color: 'slate', features: 3 },
    { id: 'starter', name: 'Starter', price: 29, color: 'blue', features: 8 },
    { id: 'pro', name: 'Pro', price: 79, color: 'purple', features: 12 },
];

const SIDEBAR_ITEMS = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'connections', label: 'Connections' },
    { id: 'subscribers', label: 'Subscribers' },
    { id: 'messages', label: 'Inbox' },
    { id: 'flows', label: 'Flows' },
    { id: 'scheduled', label: 'Scheduler' },
    { id: 'affiliates', label: 'Affiliates' },
    { id: 'academy', label: 'Academy' },
    { id: 'forms', label: 'Forms' },
    { id: 'store', label: 'Store' },
    { id: 'support', label: 'Support' },
];

// Initial permissions matrix (true = allowed)
const INITIAL_PERMISSIONS = {
    free: ['dashboard', 'academy'],
    starter: ['dashboard', 'connections', 'subscribers', 'messages', 'flows', 'forms', 'academy', 'support'],
    pro: ['dashboard', 'connections', 'subscribers', 'messages', 'flows', 'scheduled', 'affiliates', 'academy', 'forms', 'store', 'support'],
};

// Initial limits (null/undefined = unlimited, number = limit)
const INITIAL_LIMITS: Record<string, Record<string, number | string>> = {
    free: {
        subscribers: 100,
        flows: 3,
        connections: 1
    },
    starter: {
        subscribers: 1000,
        flows: 10,
        connections: 2
    },
    pro: {
        subscribers: '', // Unlimited
        flows: '', // Unlimited
        connections: 5
    }
};

const PAYMENT_REQUESTS = [
    { id: 101, user: 'John Doe', method: 'Bank Transfer', amount: 790, plan: 'Pro Yearly', date: '2026-01-04', status: 'Pending', proofUrl: '#' },
    { id: 102, user: 'Sarah Connor', method: 'E-Wallet (GCash)', amount: 29, plan: 'Starter Monthly', date: '2026-01-05', status: 'Pending', proofUrl: '#' },
    { id: 103, user: 'Kyle Reese', method: 'Bank Transfer', amount: 199, plan: 'Enterprise Monthly', date: '2026-01-03', status: 'Approved', proofUrl: '#' },
];

const AdminPackageSettings: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'packages' | 'features' | 'payments'>('packages');
    const [permissions, setPermissions] = useState<any>(INITIAL_PERMISSIONS);
    const [limits, setLimits] = useState(INITIAL_LIMITS);
    const [packages, setPackages] = useState(INITIAL_PACKAGES);
    const [paymentRequests, setPaymentRequests] = useState(PAYMENT_REQUESTS);
    const [selectedProof, setSelectedProof] = useState<string | null>(null);

    const togglePermission = (planId: string, itemId: string) => {
        setPermissions((prev: any) => {
            const planPermissions = prev[planId] || [];
            const hasPermission = planPermissions.includes(itemId);

            let newPermissions;
            if (hasPermission) {
                newPermissions = planPermissions.filter((id: string) => id !== itemId);
            } else {
                newPermissions = [...planPermissions, itemId];
            }

            return { ...prev, [planId]: newPermissions };
        });
    };

    const handleLimitChange = (planId: string, itemId: string, value: string) => {
        setLimits(prev => ({
            ...prev,
            [planId]: {
                ...prev[planId],
                [itemId]: value
            }
        }));
    };

    const handleApprovePayment = (id: number) => {
        setPaymentRequests(prev => prev.map(req => req.id === id ? { ...req, status: 'Approved' } : req));
    };

    const handleRejectPayment = (id: number) => {
        setPaymentRequests(prev => prev.map(req => req.id === id ? { ...req, status: 'Rejected' } : req));
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Package Settings</h1>
                    <p className="text-slate-500 dark:text-slate-400">Manage plans, features, and payments.</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-slate-200 dark:border-slate-800">
                <nav className="flex space-x-8" aria-label="Tabs">
                    <button
                        onClick={() => setActiveTab('packages')}
                        className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'packages'
                                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
                            }`}
                    >
                        <div className="flex items-center gap-2">
                            <Package className="w-4 h-4" />
                            Packages
                        </div>
                    </button>
                    <button
                        onClick={() => setActiveTab('features')}
                        className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'features'
                                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
                            }`}
                    >
                        <div className="flex items-center gap-2">
                            <Shield className="w-4 h-4" />
                            Feature Permissions
                        </div>
                    </button>
                    <button
                        onClick={() => setActiveTab('payments')}
                        className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'payments'
                                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
                            }`}
                    >
                        <div className="flex items-center gap-2">
                            <CreditCard className="w-4 h-4" />
                            Payments & Proofs
                        </div>
                    </button>
                </nav>
            </div>

            {/* Content */}
            <div className="mt-6">

                {/* PACKAGES TAB */}
                {activeTab === 'packages' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {packages.map((pkg) => (
                            <div key={pkg.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 relative group">
                                <button className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                                    <Edit3 className="w-4 h-4" />
                                </button>
                                <div className={`w-12 h-12 rounded-lg bg-${pkg.color}-100 dark:bg-${pkg.color}-900/30 flex items-center justify-center text-${pkg.color}-600 dark:text-${pkg.color}-400 mb-4`}>
                                    <Package className="w-6 h-6" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">{pkg.name}</h3>
                                <div className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
                                    ${pkg.price}<span className="text-sm font-normal text-slate-500">/mo</span>
                                </div>
                                <ul className="space-y-2 mb-6">
                                    <li className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                                        <Check className="w-4 h-4 text-green-500" /> {pkg.features} Core features
                                    </li>
                                    <li className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                                        <Check className="w-4 h-4 text-green-500" /> Customizable limits
                                    </li>
                                </ul>
                                <button className="w-full py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                    Manage Details
                                </button>
                            </div>
                        ))}

                        {/* Add New Package Card */}
                        <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-6 flex flex-col items-center justify-center text-slate-400 hover:text-slate-600 hover:border-slate-300 dark:hover:border-slate-700 dark:hover:text-slate-300 transition-colors cursor-pointer min-h-[250px]">
                            <Plus className="w-8 h-8 mb-2" />
                            <span className="font-medium">Create New Package</span>
                        </div>
                    </div>
                )}

                {/* FEATURE PERMISSIONS TAB */}
                {activeTab === 'features' && (
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                            <h3 className="font-medium text-slate-900 dark:text-white">Sidebar Menu Access & Limits</h3>
                            <p className="text-sm text-slate-500">Enable features and set usage limits (leave limit blank for unlimited).</p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                                        <th className="px-6 py-4 text-sm font-semibold text-slate-500 uppercase">Module / Page</th>
                                        {packages.map(pkg => (
                                            <th key={pkg.id} className="px-6 py-4 text-sm font-semibold text-slate-500 uppercase text-center w-32">
                                                {pkg.name}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                    {SIDEBAR_ITEMS.map((item) => (
                                        <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                                            <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white">
                                                {item.label}
                                            </td>
                                            {packages.map(pkg => {
                                                const isAllowed = (permissions[pkg.id] || []).includes(item.id);
                                                const limitValue = limits[pkg.id]?.[item.id] ?? '';
                                                return (
                                                    <td key={pkg.id} className="px-6 py-4 text-center">
                                                        <div className="flex flex-col items-center gap-2">
                                                            <div className="flex items-center gap-2">
                                                                <input
                                                                    type="checkbox"
                                                                    className="w-5 h-5 rounded border-slate-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                                                                    checked={isAllowed}
                                                                    onChange={() => togglePermission(pkg.id, item.id)}
                                                                />
                                                                {isAllowed && (
                                                                    <input
                                                                        type="text"
                                                                        className="w-20 px-2 py-1 text-xs border border-slate-200 dark:border-slate-700 rounded bg-slate-50 dark:bg-slate-950 focus:outline-none focus:border-primary-500 text-center placeholder-slate-400 transition-all"
                                                                        placeholder="Unlimited"
                                                                        value={limitValue}
                                                                        onChange={(e) => handleLimitChange(pkg.id, item.id, e.target.value)}
                                                                    />
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end">
                            <button className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors shadow-sm">
                                <Save className="w-4 h-4" /> Save Changes
                            </button>
                        </div>
                    </div>
                )}

                {/* PAYMENTS TAB */}
                {activeTab === 'payments' && (
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">User</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Plan & Amount</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Method</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Proof</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                    {paymentRequests.map(req => (
                                        <tr key={req.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                                            <td className="px-6 py-4 text-sm text-slate-500">{req.date}</td>
                                            <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{req.user}</td>
                                            <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                                                <div>{req.plan}</div>
                                                <div className="font-semibold">${req.amount}</div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{req.method}</td>
                                            <td className="px-6 py-4">
                                                <button
                                                    className="flex items-center gap-1 text-sm text-primary-600 hover:underline"
                                                    onClick={() => setSelectedProof('https://via.placeholder.com/600x800?text=Payment+Proof')}
                                                >
                                                    <ImageIcon className="w-3 h-3" /> View
                                                </button>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${req.status === 'Approved' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                                        req.status === 'Rejected' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                                            'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                                    }`}>
                                                    {req.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {req.status === 'Pending' && (
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => handleApprovePayment(req.id)}
                                                            className="p-1 rounded bg-green-50 text-green-600 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/40"
                                                            title="Approve"
                                                        >
                                                            <CheckCircle className="w-5 h-5" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleRejectPayment(req.id)}
                                                            className="p-1 rounded bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40"
                                                            title="Reject"
                                                        >
                                                            <XCircle className="w-5 h-5" />
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* PROOF MODAL */}
            {selectedProof && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm" onClick={() => setSelectedProof(null)}>
                    <div className="relative max-w-2xl w-full bg-white dark:bg-slate-900 rounded-xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
                            <h3 className="font-bold text-slate-900 dark:text-white">Payment Proof</h3>
                            <button onClick={() => setSelectedProof(null)} className="text-slate-500 hover:text-slate-700">
                                <XCircle className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-4 bg-slate-100 dark:bg-slate-950 flex justify-center">
                            <img src={selectedProof} alt="Proof" className="max-h-[60vh] rounded shadow-sm" />
                        </div>
                        <div className="p-4 flex justify-end gap-2 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
                            <button onClick={() => setSelectedProof(null)} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">Close</button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default AdminPackageSettings;
