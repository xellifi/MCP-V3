import React, { useState, useEffect } from 'react';
import { Package as PackageIcon, Check, Shield, CreditCard, Edit3, Save, Image as ImageIcon, CheckCircle, XCircle, Eye, Plus, Loader2, Trash2, ShieldAlert, Banknote, Smartphone, Globe, Settings, LayoutList, LayoutGrid } from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { Package, User, UserRole } from '../types';

// Dummy Data
// Dummy Data

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

// Initial state helpers (empty now as we fetch from DB)
const INITIAL_PERMISSIONS = {};
const INITIAL_LIMITS = {};

const PAYMENT_REQUESTS = [
    { id: 101, user: 'John Doe', method: 'Bank Transfer', amount: 350, plan: 'Pro Yearly', date: '2026-01-04', status: 'Pending', proofUrl: '#' },
    { id: 102, user: 'Sarah Connor', method: 'E-Wallet (GCash)', amount: 15, plan: 'Starter Monthly', date: '2026-01-05', status: 'Pending', proofUrl: '#' },
    { id: 103, user: 'Kyle Reese', method: 'Bank Transfer', amount: 35, plan: 'Pro Monthly', date: '2026-01-03', status: 'Approved', proofUrl: '#' },
];

import { ALL_NAV_ITEMS } from '../constants/navigation';

// Dynamically generate routes from ALL_NAV_ITEMS
// Filter out backward compatibility items if needed (items starting with /api-keys etc if mapped)
const ALL_ROUTES = Object.entries(ALL_NAV_ITEMS)
    .filter(([path]) => path !== '/api-keys') // Exclude hidden/compat routes
    .map(([path, config]) => ({
        id: path,
        label: config.label
    }));

// You can add extra protected routes that aren't in sidebar here if needed
// e.g. { id: '/admin', label: 'Admin Area' }

const AdminPackageSettings: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'packages' | 'payments' | 'modes' | 'pages'>('packages');
    const [permissions, setPermissions] = useState<any>(INITIAL_PERMISSIONS);
    const [routePermissions, setRoutePermissions] = useState<any>({}); // { [packageId]: ['/dashboard', '/settings'] }
    const [limits, setLimits] = useState(INITIAL_LIMITS);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [packages, setPackages] = useState<Package[]>([]);
    const [paymentRequests, setPaymentRequests] = useState<any[]>([]);
    const [selectedProof, setSelectedProof] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [isFixingPermissions, setIsFixingPermissions] = useState(false);
    const [userRole, setUserRole] = useState<UserRole | null>(null);
    const [paymentConfig, setPaymentConfig] = useState<any>({
        xendit: { enabled: false, publicKey: '', secretKey: '' },
        paypal: { enabled: false, clientId: '', clientSecret: '' },
        ewallet: { enabled: false, instructions: '' },
        bank: { enabled: false, instructions: '' },
    });
    // Modal State
    const [settingsModalOpen, setSettingsModalOpen] = useState(false);
    const [activePaymentMethod, setActivePaymentMethod] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentPackage, setCurrentPackage] = useState<Partial<Package>>({});
    const toast = useToast();

    // Fetch packages on mount
    const loadPackages = async () => {
        // setLoading(true); // Handled by checkUserRoleAndLoad
        try {
            const data = await api.admin.getPackages();
            if (data && data.length > 0) {
                setPackages(data);

                // Sync permissions and limits from fetched packages
                const newPermissions: any = {};
                const newLimits: any = {};
                const newRoutePermissions: any = {};

                data.forEach(pkg => {
                    // Load permissions from limits.permissions (new way)
                    // If permissions is undefined, we default to empty array.
                    // We NO LONGER read from pkg.features for permissions as that is for marketing text.
                    newPermissions[pkg.id] = pkg?.limits?.permissions || [];
                    newLimits[pkg.id] = pkg.limits || {};
                    // Load allowed routes for Page Access tab
                    newRoutePermissions[pkg.id] = pkg.allowedRoutes || [];
                });

                setPermissions(newPermissions);
                setLimits(newLimits);
                setRoutePermissions(newRoutePermissions);
            }
        } catch (error) {
            console.error('Failed to load packages', error);
            toast.error('Failed to load packages');
        } finally {
            // Loading state managed by checkUserRoleAndLoad for initial load, but we need to verify if we should turn it off here if called separately
            // For simplicity, just set false if not fixing permissions
            setLoading(false);
        }
    };

    const checkUserRoleAndLoad = async () => {
        setLoading(true);
        try {
            // Check Role
            const user = await api.auth.getCurrentUser();
            if (user) {
                setUserRole(user.role);
                console.log('Current User Role:', user.role);

                // Force upgrade to OWNER to ensure RLS compliance (fixes casing issues like 'admin' vs 'ADMIN')
                if (user.role !== 'OWNER') {
                    // Auto-fix permissions since this is the admin dashboard
                    setIsFixingPermissions(true);
                    try {
                        console.log('Promoting user to OWNER...');
                        await api.auth.updateProfile(user.id, { role: 'OWNER' });
                        toast.success('Permissions updated to Owner. Reloading...');
                        // Give DB a moment to propagate
                        setTimeout(() => {
                            window.location.reload();
                        }, 1500);
                        return; // Stop loading packages until reload
                    } catch (err) {
                        console.error('Failed to auto-promote user:', err);
                        toast.error('Failed to update permissions. Please contact support.');
                    }
                }
            }

            // Load Packages
            loadPackages();
            loadSettings();
        } catch (error) {
            console.error('Error checking user role:', error);
            // Try loading packages anyway
            loadPackages();
        } finally {
            if (!isFixingPermissions) setLoading(false);
        }
    };

    const loadSettings = async () => {
        try {
            const settings = await api.admin.getSettings();
            if (settings?.paymentConfig) {
                setPaymentConfig(settings.paymentConfig);
            }
        } catch (error) {
            console.error('Failed to load settings', error);
        }
    };

    const handleSaveSettings = async () => {
        setLoading(true);
        try {
            const currentSettings = await api.admin.getSettings();
            await api.admin.updateSettings({
                ...currentSettings,
                paymentConfig: paymentConfig
            });
            toast.success('Payment settings saved successfully');
        } catch (error) {
            console.error('Failed to save settings', error);
            toast.error('Failed to save settings');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        checkUserRoleAndLoad();
    }, []);

    const handleSaveLimitObject = async () => {
        setLoading(true);
        try {
            // We save permissions INSIDE the limits object now, enabling 'features' column to be used for marketing text
            const updates = packages.map(pkg => {
                const pkgLimits = limits[pkg.id] || {};
                const pkgPermissions = permissions[pkg.id] || [];

                // Merge permissions into limits
                const updatedLimits = {
                    ...pkgLimits,
                    permissions: pkgPermissions
                };

                return api.admin.updatePackage({
                    id: pkg.id,
                    limits: updatedLimits
                    // We do NOT update 'features' here, preserving marketing text
                });
            });

            await Promise.all(updates);
            toast.success('Permissions and limits saved successfully');
            await loadPackages(); // Reload to confirm state
        } catch (error) {
            console.error('Failed to save limits', error);
            toast.error('Failed to save changes');
        } finally {
            setLoading(false);
        }
    };

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

    const handleCreateClick = () => {
        setCurrentPackage({
            name: '',
            priceMonthly: 0,
            priceYearly: 0,
            currency: 'USD',
            color: 'slate',
            isActive: true,
            isVisible: true, // Default to visible
            features: [],
            limits: {}
        });
        setIsModalOpen(true);
    };

    const handleEditClick = (pkg: Package) => {
        setCurrentPackage({ ...pkg });
        setIsModalOpen(true);
    };

    const handleModalSave = async () => {
        if (!currentPackage.name) {
            toast.error('Package name is required');
            return;
        }

        try {
            if (currentPackage.id) {
                // Update
                await api.admin.updatePackage(currentPackage as Package);
                toast.success('Package updated successfully');
            } else {
                // Create
                const newId = currentPackage.name.toLowerCase().replace(/\s+/g, '-');

                // Check locally if ID already exists
                if (packages.some(p => p.id === newId)) {
                    toast.error(`Package with ID '${newId}' already exists. Please choose a different name.`);
                    return;
                }

                await api.admin.createPackage({
                    ...currentPackage,
                    id: newId,
                    features: currentPackage.features || [],
                    limits: currentPackage.limits || {},
                    color: currentPackage.color || 'slate',
                    priceMonthly: Number(currentPackage.priceMonthly) || 0,
                    priceYearly: Number(currentPackage.priceYearly) || 0,
                    priceLifetime: currentPackage.priceLifetime ? Number(currentPackage.priceLifetime) : undefined,
                    currency: currentPackage.currency || 'USD',
                    isActive: currentPackage.isActive !== false,
                    isVisible: currentPackage.isVisible !== false, // Explicitly pass visibility
                } as Package);
                toast.success('Package created successfully');
            }
            setIsModalOpen(false);
            loadPackages(); // Refresh list
        } catch (error: any) {
            console.error('Error saving package:', error);
            const msg = error.message || 'Failed to save package';
            toast.error(msg);
        }
    };

    const [deleteConfirm, setDeleteConfirm] = useState(false);

    const handleDeletePackage = async () => {
        if (!currentPackage.id) return;

        if (!deleteConfirm) {
            setDeleteConfirm(true);
            setTimeout(() => setDeleteConfirm(false), 3000); // Reset after 3s
            return;
        }

        try {
            console.log('Calling API delete...');
            await api.admin.deletePackage(currentPackage.id);
            console.log('API delete success');
            toast.success('Package deleted successfully');
            setIsModalOpen(false);
            loadPackages();
        } catch (error: any) {
            console.error('Error deleting package:', error);
            toast.error(error.message || 'Failed to delete package');
        } finally {
            setDeleteConfirm(false);
        }
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

    const toggleRoutePermission = (planId: string, routeId: string) => {
        setRoutePermissions((prev: any) => {
            const planRoutes = prev[planId] || [];
            const hasRoute = planRoutes.includes(routeId);

            let newRoutes;
            if (hasRoute) {
                newRoutes = planRoutes.filter((id: string) => id !== routeId);
            } else {
                newRoutes = [...planRoutes, routeId];
            }
            return {
                ...prev,
                [planId]: newRoutes
            };
        });
    };

    const handleSaveRoutes = async () => {
        setLoading(true);
        try {
            const updates = packages.map(pkg => {
                return api.admin.updatePackage({
                    id: pkg.id,
                    allowedRoutes: routePermissions[pkg.id] || []
                });
            });

            await Promise.all(updates);
            toast.success('Page permissions saved successfully');
            await loadPackages();
        } catch (error) {
            console.error('Failed to save routes', error);
            toast.error('Failed to save page permissions');
        } finally {
            setLoading(false);
        }
    };

    // Fetch Pending/All Payments
    const loadPayments = async () => {
        setLoading(true);
        try {
            // Re-using getAll but we might want to filter, for now fetch all and filter in UI or API
            // Ideally api.subscriptions.getAll() should return joined data
            const data = await api.subscriptions.getAll();
            if (data) {
                // Map to UI expectation if needed or adjust UI to match API
                // The UI currently expects: id, user, method, amount, plan, date, status, proofUrl
                const mappedData = data.map((sub: any) => ({
                    id: sub.id,
                    user: sub.profiles?.full_name || sub.profiles?.email || 'Unknown User',
                    method: sub.payment_method || 'Unknown',
                    amount: sub.amount,
                    plan: sub.packages?.name || sub.package_id,
                    date: new Date(sub.created_at).toLocaleDateString(),
                    status: sub.status,
                    proofUrl: sub.proof_url
                }));
                // Sort by date desc (newest first)
                mappedData.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
                setPaymentRequests(mappedData);
            }
        } catch (error) {
            console.error('Failed to load payments', error);
            toast.error('Failed to load payments');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'payments') {
            loadPayments();
        }
    }, [activeTab]);


    const handleApprovePayment = async (id: string) => { // Changed id to string
        try {
            await api.subscriptions.approve(id);
            toast.success('Subscription approved');
            loadPayments(); // Refresh
        } catch (error) {
            console.error(error);
            toast.error('Failed to approve');
        }
    };

    const handleRejectPayment = async (id: string) => { // Changed id to string
        if (!window.confirm('Are you sure you want to reject this payment?')) return;
        try {
            await api.subscriptions.reject(id);
            toast.success('Subscription rejected');
            loadPayments(); // Refresh
        } catch (error) {
            console.error(error);
            toast.error('Failed to reject');
        }
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
                            <PackageIcon className="w-4 h-4" />
                            Packages
                        </div>
                    </button>
                    <button
                        onClick={() => setActiveTab('pages')}
                        className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'pages'
                            ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                            : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
                            }`}
                    >
                        <div className="flex items-center gap-2">
                            <Shield className="w-4 h-4" />
                            Page Access
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
                    <button
                        onClick={() => setActiveTab('modes')}
                        className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'modes'
                            ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                            : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
                            }`}
                    >
                        <div className="flex items-center gap-2">
                            <Banknote className="w-4 h-4" />
                            Mode of Payments
                        </div>
                    </button>
                </nav>
            </div>

            {/* Content */}
            <div className="mt-6">

                {/* PACKAGES TAB */}
                {activeTab === 'packages' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                            <div>
                                <h3 className="font-semibold text-slate-900 dark:text-white">Active Plans</h3>
                                <p className="text-xs text-slate-500">Manage subscription packages</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="flex bg-slate-200 dark:bg-slate-800 rounded-lg p-1 border border-slate-300 dark:border-slate-700">
                                    <button
                                        onClick={() => setViewMode('list')}
                                        className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 shadow text-primary-600' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                                        title="List View"
                                    >
                                        <LayoutList className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => setViewMode('grid')}
                                        className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-slate-700 shadow text-primary-600' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                                        title="Grid View"
                                    >
                                        <LayoutGrid className="w-4 h-4" />
                                    </button>
                                </div>
                                <button
                                    onClick={handleCreateClick}
                                    className="flex items-center gap-2 px-3 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm shadow-primary-500/20"
                                >
                                    <Plus className="w-4 h-4" />
                                    <span className="hidden sm:inline">New Package</span>
                                </button>
                            </div>
                        </div>

                        {isFixingPermissions ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                                <ShieldAlert className="w-12 h-12 text-yellow-500 mb-4 animate-pulse" />
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Adjusting Permissions...</h3>
                                <p className="text-slate-500 dark:text-slate-400 max-w-md mt-2">
                                    We detected your account didn't have Admin access. We are updating your role now. The page will reload momentarily.
                                </p>
                            </div>
                        ) : loading ? (
                            <div className="flex justify-center py-12">
                                <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
                            </div>
                        ) : (
                            <>
                                {viewMode === 'grid' ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {packages.map((pkg) => (
                                            <div key={pkg.id} className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 relative group hover:border-primary-500/50 hover:shadow-lg hover:shadow-primary-500/5 transition-all duration-300 ${pkg.isVisible === false ? 'opacity-60' : ''}`}>
                                                {/* Hidden indicator */}
                                                {pkg.isVisible === false && (
                                                    <div className="absolute top-4 left-4 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-xs font-medium">
                                                        Hidden
                                                    </div>
                                                )}
                                                <button
                                                    onClick={() => handleEditClick(pkg)}
                                                    className="absolute top-4 right-4 text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                                                >
                                                    <Edit3 className="w-4 h-4" />
                                                </button>
                                                <div className={`w-12 h-12 rounded-xl bg-${pkg.color}-100 dark:bg-${pkg.color}-900/30 flex items-center justify-center text-${pkg.color}-600 dark:text-${pkg.color}-400 mb-4 shadow-sm`}>
                                                    <PackageIcon className="w-6 h-6" />
                                                </div>
                                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">{pkg.name}</h3>
                                                <div className="text-2xl font-bold text-slate-900 dark:text-white mb-4 flex items-end gap-1">
                                                    {(!pkg.priceMonthly && !pkg.priceYearly && pkg.priceLifetime) ? (
                                                        <>${pkg.priceLifetime}<span className="text-sm font-normal text-slate-500 mb-1">one-time</span></>
                                                    ) : (
                                                        <>${pkg.priceMonthly}<span className="text-sm font-normal text-slate-500 mb-1">/mo</span></>
                                                    )}
                                                </div>
                                                <ul className="space-y-2 mb-6 min-h-[100px]">
                                                    {(pkg.features && Array.isArray(pkg.features) && pkg.features.length > 0) ? (
                                                        pkg.features.slice(0, 5).map((feature: string, idx: number) => (
                                                            <li key={idx} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                                                                <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                                                                <span className="leading-tight line-clamp-1">{feature}</span>
                                                            </li>
                                                        ))
                                                    ) : (
                                                        <li className="flex items-center gap-2 text-sm text-slate-400 italic">
                                                            No features listed
                                                        </li>
                                                    )}
                                                    {pkg.features && pkg.features.length > 5 && (
                                                        <li className="text-xs text-slate-400 pl-6 italic">+{pkg.features.length - 5} more features</li>
                                                    )}
                                                </ul>

                                                <button
                                                    onClick={() => handleEditClick(pkg)}
                                                    className="w-full py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-300"
                                                >
                                                    Manage Details
                                                </button>
                                            </div>
                                        ))}

                                        {/* Create New Card (Grid Only) */}
                                        <div
                                            onClick={handleCreateClick}
                                            className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-6 flex flex-col items-center justify-center text-slate-400 hover:text-primary-600 hover:border-primary-300 dark:hover:border-primary-700 dark:hover:text-primary-400 transition-all cursor-pointer min-h-[250px] bg-slate-50/50 dark:bg-slate-900/50"
                                        >
                                            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3 transition-transform group-hover:scale-110">
                                                <Plus className="w-6 h-6" />
                                            </div>
                                            <span className="font-medium">Create New Package</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left border-collapse">
                                                <thead>
                                                    <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                                                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Order</th>
                                                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Plan Name</th>
                                                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Price (Mo/Yr)</th>
                                                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Limits</th>
                                                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                                    {packages.map((pkg, idx) => (
                                                        <tr key={pkg.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                                            <td className="px-6 py-4 text-slate-400 text-xs">#{idx + 1}</td>
                                                            <td className="px-6 py-4">
                                                                <div className="flex items-center gap-3">
                                                                    <div className={`w-8 h-8 rounded-lg bg-${pkg.color}-100 dark:bg-${pkg.color}-900/30 flex items-center justify-center text-${pkg.color}-600 dark:text-${pkg.color}-400`}>
                                                                        <PackageIcon className="w-4 h-4" />
                                                                    </div>
                                                                    <div>
                                                                        <div className="font-medium text-slate-900 dark:text-white">{pkg.name}</div>
                                                                        <div className="text-xs text-slate-500 capitalize">{pkg.color} Theme</div>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <div className="text-sm text-slate-900 dark:text-white font-medium">${pkg.priceMonthly} <span className="text-slate-400 font-normal">/mo</span></div>
                                                                <div className="text-xs text-slate-500">${pkg.priceYearly} /yr</div>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <div className="flex flex-wrap gap-2">
                                                                    {Object.entries(pkg.limits || {}).slice(0, 3).map(([key, val]) => (
                                                                        <span key={key} className="px-2 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                                                            {key}: {val || '∞'}
                                                                        </span>
                                                                    ))}
                                                                    {Object.keys(pkg.limits || {}).length > 3 && (
                                                                        <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-400">+{Object.keys(pkg.limits || {}).length - 3}</span>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 text-right">
                                                                <button
                                                                    onClick={() => handleEditClick(pkg)}
                                                                    className="px-3 py-1.5 text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors shadow-sm"
                                                                >
                                                                    Manage
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                            {packages.length === 0 && (
                                                <div className="p-8 text-center text-slate-500">
                                                    No packages found. Create one to get started.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}



                {/* PAGES TAB */}
                {activeTab === 'pages' && (
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
                        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                                <Shield className="w-5 h-5 text-primary-500" />
                                <h3 className="font-semibold">Page Access Control</h3>
                            </div>
                            <p className="text-sm text-slate-500 mt-1">
                                Control which pages/routes are accessible for each plan. Users will effectively see a locked page or be redirected if they try to access restricted areas.
                            </p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-1/3">
                                            Page / Route
                                        </th>
                                        {packages.map(pkg => (
                                            <th key={pkg.id} className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">
                                                <span className={`px-2 py-1 rounded-full text-[10px] bg-${pkg.color}-100 text-${pkg.color}-700 border border-${pkg.color}-200 dark:bg-${pkg.color}-900/30 dark:text-${pkg.color}-400`}>
                                                    {pkg.name}
                                                </span>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                    {ALL_ROUTES.map((route) => (
                                        <tr key={route.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-slate-900 dark:text-white">{route.label}</div>
                                                <div className="text-xs text-slate-500 font-mono">{route.id}</div>
                                            </td>
                                            {packages.map(pkg => {
                                                const isAllowed = (routePermissions[pkg.id] || []).includes(route.id);
                                                return (
                                                    <td key={pkg.id} className="px-6 py-4 text-center">
                                                        <div className="flex justify-center">
                                                            <input
                                                                type="checkbox"
                                                                className="w-5 h-5 rounded border-slate-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                                                                checked={isAllowed}
                                                                onChange={() => toggleRoutePermission(pkg.id, route.id)}
                                                            />
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
                            <button
                                onClick={handleSaveRoutes}
                                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors shadow-sm"
                            >
                                <Save className="w-4 h-4" /> Save Page Permissions
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
                                                    onClick={() => setSelectedProof(req.proofUrl || null)}
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

                {/* MODES OF PAYMENT TAB */}
                {activeTab === 'modes' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Xendit */}
                            <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 relative overflow-hidden group">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-white font-bold">X</div>
                                        <div>
                                            <h3 className="text-white font-bold">Xendit</h3>
                                            <p className="text-slate-400 text-sm">Credit / Debit Card</p>
                                        </div>
                                    </div>
                                    {paymentConfig.xendit?.enabled && <CheckCircle className="text-primary-500 w-6 h-6" />}
                                </div>
                                <div className="flex items-center gap-3 mt-6">
                                    <button
                                        onClick={() => setPaymentConfig({ ...paymentConfig, xendit: { ...paymentConfig.xendit, enabled: !paymentConfig.xendit?.enabled } })}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${paymentConfig.xendit?.enabled ? 'bg-primary-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                                    >
                                        {paymentConfig.xendit?.enabled ? 'Enabled' : 'Enable'}
                                    </button>
                                    <button
                                        onClick={() => { setActivePaymentMethod('xendit'); setSettingsModalOpen(true); }}
                                        className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                                    >
                                        <Settings className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {/* PayPal */}
                            <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 relative overflow-hidden group">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-blue-900 flex items-center justify-center text-white font-bold">P</div>
                                        <div>
                                            <h3 className="text-white font-bold">PayPal</h3>
                                            <p className="text-slate-400 text-sm">Safe Payment</p>
                                        </div>
                                    </div>
                                    {paymentConfig.paypal?.enabled && <CheckCircle className="text-primary-500 w-6 h-6" />}
                                </div>
                                <div className="flex items-center gap-3 mt-6">
                                    <button
                                        onClick={() => setPaymentConfig({ ...paymentConfig, paypal: { ...paymentConfig.paypal, enabled: !paymentConfig.paypal?.enabled } })}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${paymentConfig.paypal?.enabled ? 'bg-primary-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                                    >
                                        {paymentConfig.paypal?.enabled ? 'Enabled' : 'Enable'}
                                    </button>
                                    <button
                                        onClick={() => { setActivePaymentMethod('paypal'); setSettingsModalOpen(true); }}
                                        className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                                    >
                                        <Settings className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {/* E-Wallet */}
                            <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 relative overflow-hidden group">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-purple-900/30 flex items-center justify-center text-purple-400">
                                            <Smartphone className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="text-white font-bold">E-Wallet</h3>
                                            <p className="text-slate-400 text-sm">GCash, Maya, GrabPay</p>
                                        </div>
                                    </div>
                                    {paymentConfig.ewallet?.enabled && <CheckCircle className="text-primary-500 w-6 h-6" />}
                                </div>
                                <div className="flex items-center gap-3 mt-6">
                                    <button
                                        onClick={() => setPaymentConfig({ ...paymentConfig, ewallet: { ...paymentConfig.ewallet, enabled: !paymentConfig.ewallet?.enabled } })}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${paymentConfig.ewallet?.enabled ? 'bg-primary-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                                    >
                                        {paymentConfig.ewallet?.enabled ? 'Enabled' : 'Enable'}
                                    </button>
                                    <button
                                        onClick={() => { setActivePaymentMethod('ewallet'); setSettingsModalOpen(true); }}
                                        className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                                    >
                                        <Settings className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {/* Online Banking */}
                            <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 relative overflow-hidden group">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-emerald-900/30 flex items-center justify-center text-emerald-400">
                                            <Globe className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="text-white font-bold">Online Banking</h3>
                                            <p className="text-slate-400 text-sm">Direct Bank Transfer</p>
                                        </div>
                                    </div>
                                    {paymentConfig.bank?.enabled && <CheckCircle className="text-primary-500 w-6 h-6" />}
                                </div>
                                <div className="flex items-center gap-3 mt-6">
                                    <button
                                        onClick={() => setPaymentConfig({ ...paymentConfig, bank: { ...paymentConfig.bank, enabled: !paymentConfig.bank?.enabled } })}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${paymentConfig.bank?.enabled ? 'bg-primary-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                                    >
                                        {paymentConfig.bank?.enabled ? 'Enabled' : 'Enable'}
                                    </button>
                                    <button
                                        onClick={() => { setActivePaymentMethod('bank'); setSettingsModalOpen(true); }}
                                        className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                                    >
                                        <Settings className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end pt-6 border-t border-slate-200 dark:border-slate-800">
                            <button
                                onClick={handleSaveSettings}
                                className="flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors shadow-lg font-bold"
                            >
                                <Save className="w-5 h-5" /> Save Configuration
                            </button>
                        </div>
                    </div>
                )}
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}>
                        <div className="relative max-w-lg w-full bg-white dark:bg-slate-900 rounded-xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                                    {currentPackage.id ? 'Edit Package' : 'Create New Package'}
                                </h3>
                                <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-slate-700">
                                    <XCircle className="w-6 h-6" />
                                </button>
                            </div>
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Package Name</label>
                                    <input
                                        type="text"
                                        value={currentPackage.name || ''}
                                        onChange={e => setCurrentPackage({ ...currentPackage, name: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                                        placeholder="e.g. Enterprise"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Marketing Features</label>
                                    <div className="space-y-2 mb-2">
                                        {(currentPackage.features || []).map((feature: string, idx: number) => (
                                            <div key={idx} className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    value={feature}
                                                    onChange={(e) => {
                                                        const newFeatures = [...(currentPackage.features || [])];
                                                        newFeatures[idx] = e.target.value;
                                                        setCurrentPackage({ ...currentPackage, features: newFeatures });
                                                    }}
                                                    className="flex-1 px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                                                />
                                                <button
                                                    onClick={() => {
                                                        const newFeatures = (currentPackage.features || []).filter((_, i) => i !== idx);
                                                        setCurrentPackage({ ...currentPackage, features: newFeatures });
                                                    }}
                                                    className="text-slate-400 hover:text-red-500 p-1"
                                                >
                                                    <XCircle className="w-5 h-5" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                    <button
                                        onClick={() => setCurrentPackage({
                                            ...currentPackage,
                                            features: [...(currentPackage.features || []), "New Feature"]
                                        })}
                                        className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
                                    >
                                        <Plus className="w-4 h-4" /> Add Feature Line
                                    </button>
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Monthly Price ($)</label>
                                        <input
                                            type="number"
                                            value={currentPackage.priceMonthly || 0}
                                            onChange={e => setCurrentPackage({ ...currentPackage, priceMonthly: parseFloat(e.target.value) })}
                                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Yearly Price ($)</label>
                                        <input
                                            type="number"
                                            value={currentPackage.priceYearly || 0}
                                            onChange={e => setCurrentPackage({ ...currentPackage, priceYearly: parseFloat(e.target.value) })}
                                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Lifetime Price ($)</label>
                                        <input
                                            type="number"
                                            value={currentPackage.priceLifetime || 0}
                                            onChange={e => setCurrentPackage({ ...currentPackage, priceLifetime: parseFloat(e.target.value) || undefined })}
                                            placeholder="One-time payment"
                                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                                        />
                                        <p className="text-xs text-slate-500 mt-1">Leave 0 to disable lifetime option</p>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Color Theme</label>
                                    <select
                                        value={currentPackage.color || 'slate'}
                                        onChange={e => setCurrentPackage({ ...currentPackage, color: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                                    >
                                        <option value="slate">Slate (Gray)</option>
                                        <option value="blue">Blue</option>
                                        <option value="purple">Purple</option>
                                        <option value="indigo">Indigo</option>
                                        <option value="emerald">Emerald</option>
                                        <option value="rose">Rose</option>
                                        <option value="amber">Amber</option>
                                    </select>
                                </div>
                                <div className="flex flex-col gap-3">
                                    <label className="flex items-center gap-3 p-3 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={currentPackage.isActive !== false}
                                            onChange={e => setCurrentPackage({ ...currentPackage, isActive: e.target.checked })}
                                            className="w-5 h-5 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                                        />
                                        <div>
                                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Is Active</span>
                                            <p className="text-xs text-slate-500">Enable or disable this package</p>
                                        </div>
                                    </label>
                                    <label className="flex items-center gap-3 p-3 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={currentPackage.isVisible !== false}
                                            onChange={e => setCurrentPackage({ ...currentPackage, isVisible: e.target.checked })}
                                            className="w-5 h-5 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                                        />
                                        <div>
                                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Show on Pricing Page</span>
                                            <p className="text-xs text-slate-500">Display this package in the public pricing page</p>
                                        </div>
                                    </label>
                                </div>
                            </div>
                            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 flex justify-between gap-3 border-t border-slate-200 dark:border-slate-800">
                                {currentPackage.id && (
                                    <button
                                        type="button"
                                        onClick={handleDeletePackage}
                                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${deleteConfirm
                                            ? 'bg-red-600 text-white hover:bg-red-700'
                                            : 'text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20'
                                            }`}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        {deleteConfirm ? 'Confirm Delete?' : 'Delete'}
                                    </button>
                                )}
                                <div className="flex gap-3 ml-auto">
                                    <button
                                        onClick={() => setIsModalOpen(false)}
                                        className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleModalSave}
                                        className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors shadow-sm flex items-center gap-2"
                                    >
                                        <Save className="w-4 h-4" />
                                        {currentPackage.id ? 'Save Changes' : 'Create Package'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}


                {/* PAYMENT METHOD SETTINGS MODAL */}
                {settingsModalOpen && activePaymentMethod && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm" onClick={() => setSettingsModalOpen(false)}>
                        <div className="relative max-w-md w-full bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between p-6 border-b border-slate-800">
                                <h3 className="text-xl font-bold text-white capitalize">
                                    {activePaymentMethod === 'ewallet' ? 'E-Wallet' : activePaymentMethod} Configuration
                                </h3>
                                <button onClick={() => setSettingsModalOpen(false)} className="text-slate-400 hover:text-white">
                                    <XCircle className="w-6 h-6" />
                                </button>
                            </div>
                            <div className="p-6 space-y-4">
                                {activePaymentMethod === 'xendit' && (
                                    <>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-300 mb-2">Public Key</label>
                                            <input
                                                type="text"
                                                value={paymentConfig.xendit?.publicKey || ''}
                                                onChange={e => setPaymentConfig({ ...paymentConfig, xendit: { ...paymentConfig.xendit, publicKey: e.target.value } })}
                                                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-primary-500 outline-none"
                                                placeholder="Enter Xendit Public Key"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-300 mb-2">Secret Key</label>
                                            <input
                                                type="password"
                                                value={paymentConfig.xendit?.secretKey || ''}
                                                onChange={e => setPaymentConfig({ ...paymentConfig, xendit: { ...paymentConfig.xendit, secretKey: e.target.value } })}
                                                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-primary-500 outline-none"
                                                placeholder="Enter Xendit Secret Key"
                                            />
                                        </div>
                                    </>
                                )}

                                {activePaymentMethod === 'paypal' && (
                                    <>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-300 mb-2">Client ID</label>
                                            <input
                                                type="text"
                                                value={paymentConfig.paypal?.clientId || ''}
                                                onChange={e => setPaymentConfig({ ...paymentConfig, paypal: { ...paymentConfig.paypal, clientId: e.target.value } })}
                                                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-primary-500 outline-none"
                                                placeholder="Enter PayPal Client ID"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-300 mb-2">Client Secret</label>
                                            <input
                                                type="password"
                                                value={paymentConfig.paypal?.clientSecret || ''}
                                                onChange={e => setPaymentConfig({ ...paymentConfig, paypal: { ...paymentConfig.paypal, clientSecret: e.target.value } })}
                                                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-primary-500 outline-none"
                                                placeholder="Enter PayPal Secret"
                                            />
                                        </div>
                                    </>
                                )}

                                {(activePaymentMethod === 'ewallet' || activePaymentMethod === 'bank') && (
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-2">Payment Instructions / Account Details</label>
                                        <textarea
                                            rows={4}
                                            value={paymentConfig[activePaymentMethod]?.instructions || ''}
                                            onChange={e => setPaymentConfig({ ...paymentConfig, [activePaymentMethod]: { ...paymentConfig[activePaymentMethod], instructions: e.target.value } })}
                                            className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-primary-500 outline-none"
                                            placeholder="Enter account number, bank name, etc."
                                        />
                                    </div>
                                )}
                            </div>
                            <div className="p-6 border-t border-slate-800 flex justify-end">
                                <button
                                    onClick={() => setSettingsModalOpen(false)}
                                    className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors"
                                >
                                    Done
                                </button>
                            </div>
                        </div>
                    </div>
                )}


                {/* PROOF MODAL */}
                {
                    selectedProof && (
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
                    )
                }

            </div >
        </div>
    );
};

export default AdminPackageSettings;
