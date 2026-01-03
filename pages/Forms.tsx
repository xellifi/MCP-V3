import React, { useEffect, useState } from 'react';
import { Workspace } from '../types';
import { api } from '../services/api';
import { supabase } from '../lib/supabase';
import { useTheme } from '../context/ThemeContext';
import { format, formatDistanceToNow } from 'date-fns';
import {
    Search,
    Plus,
    FileText,
    Trash2,
    ExternalLink,
    Eye,
    X,
    LayoutGrid,
    List,
    ChevronLeft,
    ChevronRight,
    Package,
    DollarSign,
    Calendar,
    ShoppingCart,
    ClipboardList,
    Filter,
    Download,
    Clock,
    CheckCircle,
    AlertCircle,
    Truck,
    Box,
    XCircle
} from 'lucide-react';

interface FormsProps {
    workspace: Workspace;
}

interface Form {
    id: string;
    name: string;
    product_name?: string;
    product_price?: number;
    currency?: string;
    is_order_form?: boolean;
    created_at: string;
    updated_at?: string;
    google_sheet_id?: string;
    form_template?: string;
}

interface FormSubmission {
    id: string;
    form_id: string;
    subscriber_name?: string;
    data: Record<string, any>;
    synced_to_sheets: boolean;
    created_at: string;
}

const ORDER_STATUSES = [
    { id: 'pending', label: 'Order Placed', color: 'yellow', icon: Clock },
    { id: 'processing', label: 'Confirmed', color: 'blue', icon: Box },
    { id: 'shipped', label: 'Shipped', color: 'purple', icon: Truck },
    { id: 'delivered', label: 'Delivered', color: 'green', icon: CheckCircle },
    { id: 'cancelled', label: 'Cancelled', color: 'red', icon: XCircle },
];

const Forms: React.FC<FormsProps> = ({ workspace }) => {
    const { isDark } = useTheme();
    const [forms, setForms] = useState<Form[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedForm, setSelectedForm] = useState<Form | null>(null);
    const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
    const [loadingSubmissions, setLoadingSubmissions] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [formToDelete, setFormToDelete] = useState<Form | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [typeFilter, setTypeFilter] = useState<'all' | 'order' | 'form'>('all');

    const itemsPerPage = 12;

    useEffect(() => {
        loadForms();
    }, [workspace.id]);

    const loadForms = async () => {
        setLoading(true);
        try {
            const data = await api.workspace.getForms(workspace.id);
            setForms(data);
        } catch (error) {
            console.error('Error loading forms:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadSubmissions = async (formId: string) => {
        setLoadingSubmissions(true);
        try {
            const data = await api.workspace.getFormSubmissions(formId);
            setSubmissions(data);
        } catch (error) {
            console.error('Error loading submissions:', error);
            setSubmissions([]);
        } finally {
            setLoadingSubmissions(false);
        }
    };

    const updateSubmissionStatus = async (submissionId: string, status: string) => {
        try {
            // Get current submission data with form info
            const { data: currentSub } = await supabase
                .from('form_submissions')
                .select('data, form_id, forms(google_webhook_url, google_sheet_name)')
                .eq('id', submissionId)
                .single();

            // Merge new status into existing data
            const updatedData = {
                ...(currentSub?.data || {}),
                order_status: status
            };

            // Update database
            await supabase
                .from('form_submissions')
                .update({ data: updatedData })
                .eq('id', submissionId);

            // Update local state
            setSubmissions(prev => prev.map(s =>
                s.id === submissionId
                    ? { ...s, data: { ...s.data, order_status: status } }
                    : s
            ));

            // Sync to Google Sheets if webhook is configured
            const form = (currentSub as any)?.forms;
            if (form?.google_webhook_url) {
                try {
                    // Get status label for display in Sheets
                    const statusLabel = ORDER_STATUSES.find(s => s.id === status)?.label || status;

                    await fetch('/api/sheets/sync', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            webhookUrl: form.google_webhook_url,
                            sheetName: form.google_sheet_name || 'Sheet1',
                            rowData: {
                                ...updatedData,
                                order_status: statusLabel,
                                status_updated_at: new Date().toISOString()
                            }
                        })
                    });
                    console.log('[Forms] Status synced to Google Sheets');
                } catch (sheetError) {
                    console.error('[Forms] Failed to sync status to Sheets:', sheetError);
                }
            }
        } catch (error) {
            console.error('Error updating submission status:', error);
        }
    };

    const openFormDetails = async (form: Form) => {
        setSelectedForm(form);
        await loadSubmissions(form.id);
    };

    const closeFormDetails = () => {
        setSelectedForm(null);
        setSubmissions([]);
    };

    const openDeleteModal = (form: Form, e: React.MouseEvent) => {
        e.stopPropagation();
        setFormToDelete(form);
        setShowDeleteModal(true);
    };

    const closeDeleteModal = () => {
        setShowDeleteModal(false);
        setFormToDelete(null);
    };

    const confirmDelete = async () => {
        if (!formToDelete) return;
        setDeleting(true);
        try {
            await api.workspace.deleteForm(formToDelete.id);
            setForms(forms.filter(f => f.id !== formToDelete.id));
            closeDeleteModal();
            if (selectedForm?.id === formToDelete.id) {
                closeFormDetails();
            }
        } catch (error) {
            console.error('Error deleting form:', error);
        } finally {
            setDeleting(false);
        }
    };

    const getCurrencySymbol = (currency?: string) => {
        const symbols: Record<string, string> = {
            PHP: '₱',
            USD: '$',
            EUR: '€',
            GBP: '£',
            JPY: '¥'
        };
        return symbols[currency || 'PHP'] || '₱';
    };

    const formatDate = (dateString: string) => {
        try {
            return format(new Date(dateString), 'MMM d, yyyy');
        } catch {
            return 'Unknown';
        }
    };

    const formatDateTime = (dateString: string) => {
        try {
            return format(new Date(dateString), 'MMM d, yyyy h:mm a');
        } catch {
            return 'Unknown';
        }
    };

    const formatTimeAgo = (dateString: string) => {
        try {
            return formatDistanceToNow(new Date(dateString), { addSuffix: true });
        } catch {
            return 'Unknown';
        }
    };

    // Filter forms
    const filteredForms = forms.filter(form => {
        const matchesSearch = form.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            form.product_name?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesType = typeFilter === 'all' ||
            (typeFilter === 'order' && form.is_order_form) ||
            (typeFilter === 'form' && !form.is_order_form);
        return matchesSearch && matchesType;
    });

    // Pagination
    const totalPages = Math.ceil(filteredForms.length / itemsPerPage);
    const paginatedForms = filteredForms.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // Stats
    const totalOrders = submissions.reduce((sum, s) => sum + (s.data?.quantity || 1), 0);
    const totalRevenue = submissions.reduce((sum, s) => sum + (s.data?.total || 0), 0);
    const syncedCount = submissions.filter(s => s.synced_to_sheets).length;

    // Theme-aware classes
    const cardBg = isDark
        ? 'bg-white/5 border-white/10 hover:border-indigo-500/50'
        : 'bg-white border-gray-200 hover:border-indigo-400 shadow-sm hover:shadow-md';
    const textPrimary = isDark ? 'text-white' : 'text-gray-900';
    const textSecondary = isDark ? 'text-slate-400' : 'text-gray-500';
    const textMuted = isDark ? 'text-slate-500' : 'text-gray-400';
    const inputBg = isDark
        ? 'bg-black/20 border-white/10 text-white placeholder-slate-500'
        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400';
    const panelBg = isDark ? 'glass-panel' : 'bg-white shadow-lg';
    const modalBg = isDark ? 'bg-slate-800 border-white/10' : 'bg-white border-gray-200';

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className={`text-2xl md:text-4xl font-bold ${textPrimary} tracking-tight mb-2`}>
                        Forms & Orders
                    </h1>
                    <p className={`${textSecondary} text-sm md:text-lg`}>
                        Manage your forms and track order submissions
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {/* View Toggle */}
                    <div className={`flex ${isDark ? 'bg-white/5' : 'bg-gray-100'} p-1 rounded-lg border ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-md transition-all ${viewMode === 'list'
                                ? 'bg-indigo-500 text-white shadow-lg'
                                : `${textSecondary} hover:${textPrimary} ${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-200'}`}`}
                            title="List View"
                        >
                            <List className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2 rounded-md transition-all ${viewMode === 'grid'
                                ? 'bg-indigo-500 text-white shadow-lg'
                                : `${textSecondary} hover:${textPrimary} ${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-200'}`}`}
                            title="Grid View"
                        >
                            <LayoutGrid className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className={`${panelBg} p-4 rounded-xl border ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-indigo-500/20 rounded-lg">
                            <FileText className="w-5 h-5 text-indigo-400" />
                        </div>
                        <div>
                            <p className={`text-2xl font-bold ${textPrimary}`}>{forms.length}</p>
                            <p className={`text-xs ${textMuted}`}>Total Forms</p>
                        </div>
                    </div>
                </div>
                <div className={`${panelBg} p-4 rounded-xl border ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-emerald-500/20 rounded-lg">
                            <ShoppingCart className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div>
                            <p className={`text-2xl font-bold ${textPrimary}`}>{forms.filter(f => f.is_order_form).length}</p>
                            <p className={`text-xs ${textMuted}`}>Order Forms</p>
                        </div>
                    </div>
                </div>
                <div className={`${panelBg} p-4 rounded-xl border ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-purple-500/20 rounded-lg">
                            <ClipboardList className="w-5 h-5 text-purple-400" />
                        </div>
                        <div>
                            <p className={`text-2xl font-bold ${textPrimary}`}>{forms.filter(f => !f.is_order_form).length}</p>
                            <p className={`text-xs ${textMuted}`}>Regular Forms</p>
                        </div>
                    </div>
                </div>
                <div className={`${panelBg} p-4 rounded-xl border ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-amber-500/20 rounded-lg">
                            <CheckCircle className="w-5 h-5 text-amber-400" />
                        </div>
                        <div>
                            <p className={`text-2xl font-bold ${textPrimary}`}>{forms.filter(f => f.google_sheet_id).length}</p>
                            <p className={`text-xs ${textMuted}`}>Sheet Connected</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Toolbar */}
            <div className={`${panelBg} rounded-2xl p-4 border ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                <div className="flex flex-col lg:flex-row gap-4">
                    {/* Search */}
                    <div className="relative flex-1">
                        <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textMuted}`} />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                            placeholder="Search forms..."
                            className={`w-full pl-10 pr-4 py-2.5 text-sm ${inputBg} border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent transition-all`}
                        />
                    </div>

                    {/* Type Filter */}
                    <div className="flex items-center gap-2">
                        <Filter className={`w-4 h-4 ${textMuted}`} />
                        <div className="flex gap-2">
                            <button
                                onClick={() => { setTypeFilter('all'); setCurrentPage(1); }}
                                className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${typeFilter === 'all'
                                    ? 'bg-indigo-500 text-white'
                                    : `${isDark ? 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10' : 'bg-gray-100 text-gray-600 hover:text-gray-900 hover:bg-gray-200'}`
                                    }`}
                            >
                                All
                            </button>
                            <button
                                onClick={() => { setTypeFilter('order'); setCurrentPage(1); }}
                                className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${typeFilter === 'order'
                                    ? 'bg-emerald-500 text-white'
                                    : `${isDark ? 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10' : 'bg-gray-100 text-gray-600 hover:text-gray-900 hover:bg-gray-200'}`
                                    }`}
                            >
                                Orders
                            </button>
                            <button
                                onClick={() => { setTypeFilter('form'); setCurrentPage(1); }}
                                className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${typeFilter === 'form'
                                    ? 'bg-purple-500 text-white'
                                    : `${isDark ? 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10' : 'bg-gray-100 text-gray-600 hover:text-gray-900 hover:bg-gray-200'}`
                                    }`}
                            >
                                Forms
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Forms Grid/List */}
            {paginatedForms.length > 0 ? (
                <div className={viewMode === 'grid'
                    ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
                    : 'space-y-3'
                }>
                    {paginatedForms.map(form => (
                        <div
                            key={form.id}
                            onClick={() => openFormDetails(form)}
                            className={`${cardBg} rounded-2xl border overflow-hidden cursor-pointer group transition-all duration-300 relative ${viewMode === 'grid' ? 'p-5' : 'p-4 flex items-center gap-4'
                                }`}
                        >
                            {/* Delete Button */}
                            <button
                                onClick={(e) => openDeleteModal(form, e)}
                                className={`absolute top-3 right-3 p-1.5 ${isDark ? 'bg-red-500/20 hover:bg-red-500/40 text-red-400 hover:text-red-300 border-red-500/30' : 'bg-red-50 hover:bg-red-100 text-red-500 hover:text-red-600 border-red-200'} rounded-lg opacity-0 group-hover:opacity-100 transition-all z-10 border`}
                                title="Delete form"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>

                            {/* Icon */}
                            <div className={`${viewMode === 'grid' ? 'flex justify-center mb-4' : 'flex-shrink-0'}`}>
                                <div className={`${viewMode === 'grid' ? 'w-16 h-16' : 'w-12 h-12'} rounded-2xl ${form.is_order_form ? 'bg-gradient-to-br from-emerald-500/20 to-teal-500/20' : 'bg-gradient-to-br from-indigo-500/20 to-purple-500/20'} flex items-center justify-center border ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                                    {form.is_order_form ? (
                                        <ShoppingCart className={`${viewMode === 'grid' ? 'w-7 h-7' : 'w-5 h-5'} text-emerald-400`} />
                                    ) : (
                                        <FileText className={`${viewMode === 'grid' ? 'w-7 h-7' : 'w-5 h-5'} text-indigo-400`} />
                                    )}
                                </div>
                            </div>

                            {/* Info */}
                            <div className={viewMode === 'grid' ? 'text-center' : 'flex-1 min-w-0'}>
                                <h3 className={`font-bold ${textPrimary} truncate group-hover:text-indigo-400 transition-colors ${viewMode === 'grid' ? 'text-lg mb-1' : 'text-base'
                                    }`}>
                                    {form.name}
                                </h3>

                                {form.is_order_form && form.product_name && (
                                    <p className={`${textSecondary} text-sm truncate ${viewMode === 'grid' ? 'mb-2' : ''}`}>
                                        {form.product_name} • {getCurrencySymbol(form.currency)}{form.product_price?.toLocaleString()}
                                    </p>
                                )}

                                {/* Type Badge */}
                                <div className={`flex items-center gap-2 mt-2 ${viewMode === 'grid' ? 'justify-center' : ''}`}>
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${form.is_order_form
                                        ? `${isDark ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`
                                        : `${isDark ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' : 'bg-indigo-50 text-indigo-600 border-indigo-200'}`
                                        } border`}>
                                        {form.is_order_form ? 'Order Form' : 'Form'}
                                    </span>

                                    {form.google_sheet_id && (
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${isDark ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-green-50 text-green-600 border-green-200'
                                            } border`}>
                                            <CheckCircle className="w-3 h-3" />
                                            Synced
                                        </span>
                                    )}
                                </div>

                                {/* Date - Grid Only */}
                                {viewMode === 'grid' && (
                                    <div className={`flex items-center justify-center gap-1 mt-3 text-xs ${textMuted}`}>
                                        <Clock className="w-3 h-3" />
                                        {formatTimeAgo(form.created_at)}
                                    </div>
                                )}
                            </div>

                            {/* Date - List Only */}
                            {viewMode === 'list' && (
                                <div className={`hidden sm:flex items-center gap-1 text-xs ${textMuted}`}>
                                    <Clock className="w-3 h-3" />
                                    {formatTimeAgo(form.created_at)}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <div className={`py-20 text-center ${panelBg} rounded-3xl border ${isDark ? 'border-dashed border-white/10' : 'border-dashed border-gray-300'}`}>
                    <div className={`w-20 h-20 ${isDark ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-500'} rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner`}>
                        <FileText className="w-10 h-10" />
                    </div>
                    <h3 className={`text-xl font-bold ${textPrimary} mb-2`}>No forms found</h3>
                    <p className={`${textSecondary} max-w-sm mx-auto`}>
                        {searchQuery || typeFilter !== 'all'
                            ? 'Try adjusting your search or filters.'
                            : 'Forms created in your flows will appear here.'}
                    </p>
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className={`flex items-center justify-between border-t ${isDark ? 'border-white/10' : 'border-gray-200'} pt-4`}>
                    <p className={`text-sm ${textSecondary}`}>
                        Showing <span className={`font-medium ${textPrimary}`}>{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
                        <span className={`font-medium ${textPrimary}`}>{Math.min(currentPage * itemsPerPage, filteredForms.length)}</span> of{' '}
                        <span className={`font-medium ${textPrimary}`}>{filteredForms.length}</span>
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className={`p-2 rounded-lg ${isDark ? 'bg-white/5 border-white/10 text-slate-400 hover:text-white' : 'bg-gray-100 border-gray-200 text-gray-500 hover:text-gray-900'} border disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <div className="flex items-center gap-1">
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                let pageNum;
                                if (totalPages <= 5) {
                                    pageNum = i + 1;
                                } else if (currentPage <= 3) {
                                    pageNum = i + 1;
                                } else if (currentPage >= totalPages - 2) {
                                    pageNum = totalPages - 4 + i;
                                } else {
                                    pageNum = currentPage - 2 + i;
                                }
                                return (
                                    <button
                                        key={pageNum}
                                        onClick={() => setCurrentPage(pageNum)}
                                        className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${currentPage === pageNum
                                            ? 'bg-indigo-500 text-white'
                                            : `${isDark ? 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-900'}`
                                            }`}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}
                        </div>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className={`p-2 rounded-lg ${isDark ? 'bg-white/5 border-white/10 text-slate-400 hover:text-white' : 'bg-gray-100 border-gray-200 text-gray-500 hover:text-gray-900'} border disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            )}

            {/* Form Details Modal */}
            {selectedForm && (
                <div
                    className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${isDark ? 'bg-black/70' : 'bg-black/50'} backdrop-blur-sm animate-fade-in`}
                    onClick={closeFormDetails}
                >
                    <div
                        className={`relative w-full max-w-4xl max-h-[90vh] overflow-hidden ${modalBg} rounded-3xl border shadow-2xl animate-scale-in flex flex-col`}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className={`p-6 border-b ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                            <button
                                onClick={closeFormDetails}
                                className={`absolute top-4 right-4 p-2 ${textSecondary} hover:${textPrimary} ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'} rounded-lg transition-colors z-10`}
                            >
                                <X className="w-5 h-5" />
                            </button>

                            <div className="flex items-center gap-4">
                                <div className={`w-14 h-14 rounded-2xl ${selectedForm.is_order_form ? 'bg-gradient-to-br from-emerald-500/20 to-teal-500/20' : 'bg-gradient-to-br from-indigo-500/20 to-purple-500/20'} flex items-center justify-center border ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                                    {selectedForm.is_order_form ? (
                                        <ShoppingCart className="w-6 h-6 text-emerald-400" />
                                    ) : (
                                        <FileText className="w-6 h-6 text-indigo-400" />
                                    )}
                                </div>
                                <div className="flex-1">
                                    <h2 className={`text-2xl font-bold ${textPrimary}`}>{selectedForm.name}</h2>
                                    {selectedForm.is_order_form && selectedForm.product_name && (
                                        <p className={textSecondary}>
                                            {selectedForm.product_name} • {getCurrencySymbol(selectedForm.currency)}{selectedForm.product_price?.toLocaleString()}
                                        </p>
                                    )}
                                </div>
                                <a
                                    href={`/forms/${selectedForm.id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-medium transition-colors"
                                >
                                    <ExternalLink className="w-4 h-4" />
                                    <span className="hidden sm:inline">Preview</span>
                                </a>
                            </div>
                        </div>

                        {/* Stats */}
                        <div className={`p-6 border-b ${isDark ? 'border-white/10' : 'border-gray-200'} grid grid-cols-2 md:grid-cols-4 gap-4`}>
                            <div className={`${isDark ? 'bg-white/5' : 'bg-gray-50'} rounded-xl p-4`}>
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-indigo-500/20 rounded-lg">
                                        <ClipboardList className="w-5 h-5 text-indigo-400" />
                                    </div>
                                    <div>
                                        <p className={`text-xl font-bold ${textPrimary}`}>{submissions.length}</p>
                                        <p className={`text-xs ${textMuted}`}>Submissions</p>
                                    </div>
                                </div>
                            </div>
                            {selectedForm.is_order_form && (
                                <>
                                    <div className={`${isDark ? 'bg-white/5' : 'bg-gray-50'} rounded-xl p-4`}>
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-emerald-500/20 rounded-lg">
                                                <Package className="w-5 h-5 text-emerald-400" />
                                            </div>
                                            <div>
                                                <p className={`text-xl font-bold ${textPrimary}`}>{totalOrders}</p>
                                                <p className={`text-xs ${textMuted}`}>Total Orders</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className={`${isDark ? 'bg-white/5' : 'bg-gray-50'} rounded-xl p-4`}>
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-amber-500/20 rounded-lg">
                                                <DollarSign className="w-5 h-5 text-amber-400" />
                                            </div>
                                            <div>
                                                <p className={`text-xl font-bold ${textPrimary}`}>
                                                    {getCurrencySymbol(selectedForm.currency)}{totalRevenue.toLocaleString()}
                                                </p>
                                                <p className={`text-xs ${textMuted}`}>Total Revenue</p>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                            <div className={`${isDark ? 'bg-white/5' : 'bg-gray-50'} rounded-xl p-4`}>
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-green-500/20 rounded-lg">
                                        <CheckCircle className="w-5 h-5 text-green-400" />
                                    </div>
                                    <div>
                                        <p className={`text-xl font-bold ${textPrimary}`}>{syncedCount}</p>
                                        <p className={`text-xs ${textMuted}`}>Synced to Sheets</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Submissions List */}
                        <div className="flex-1 overflow-auto p-6">
                            <h3 className={`text-lg font-bold ${textPrimary} mb-4`}>Recent Submissions</h3>

                            {loadingSubmissions ? (
                                <div className="flex items-center justify-center py-12">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                                </div>
                            ) : submissions.length > 0 ? (
                                <div className="space-y-3">
                                    {submissions.slice(0, 20).map(submission => (
                                        <div
                                            key={submission.id}
                                            className={`${isDark ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'} rounded-xl p-4 border`}
                                        >
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                                                        <span className={`font-semibold ${textPrimary}`}>
                                                            {submission.subscriber_name || submission.data?.subscriber_name || 'Anonymous'}
                                                        </span>
                                                        {submission.synced_to_sheets ? (
                                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-50 text-green-600'}`}>
                                                                <CheckCircle className="w-3 h-3" />
                                                                Synced
                                                            </span>
                                                        ) : (
                                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${isDark ? 'bg-yellow-500/20 text-yellow-400' : 'bg-yellow-50 text-yellow-600'}`}>
                                                                <AlertCircle className="w-3 h-3" />
                                                                Pending Sync
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Order Details */}
                                                    {selectedForm.is_order_form && (
                                                        <div className={`text-sm ${textSecondary} space-y-1`}>
                                                            {submission.data?.quantity && (
                                                                <p>Qty: {submission.data.quantity} • Total: {getCurrencySymbol(selectedForm.currency)}{submission.data.total?.toLocaleString()}</p>
                                                            )}
                                                            {submission.data?.payment_method && (
                                                                <p>Payment: {submission.data.payment_method === 'cod' ? 'Cash on Delivery' : submission.data.ewallet_selected || 'E-Wallet'}</p>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Form Fields */}
                                                    {!selectedForm.is_order_form && (
                                                        <div className={`text-sm ${textSecondary} space-y-1`}>
                                                            {Object.entries(submission.data || {}).slice(0, 3).map(([key, value]) => (
                                                                <p key={key} className="truncate">
                                                                    <span className="font-medium capitalize">{key.replace(/_/g, ' ')}:</span> {String(value)}
                                                                </p>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {/* Order Status & Actions for Order Forms */}
                                                    {selectedForm.is_order_form && (
                                                        <div className="flex items-center gap-3 mt-3 flex-wrap">
                                                            {/* Status Dropdown */}
                                                            <select
                                                                value={submission.data?.order_status || 'pending'}
                                                                onChange={(e) => updateSubmissionStatus(submission.id, e.target.value)}
                                                                className={`text-xs font-medium px-3 py-1.5 rounded-lg border-0 cursor-pointer transition-all ${(submission.data?.order_status || 'pending') === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                                                                    submission.data?.order_status === 'processing' ? 'bg-blue-500/20 text-blue-400' :
                                                                        submission.data?.order_status === 'shipped' ? 'bg-purple-500/20 text-purple-400' :
                                                                            submission.data?.order_status === 'delivered' ? 'bg-green-500/20 text-green-400' :
                                                                                'bg-red-500/20 text-red-400'
                                                                    }`}
                                                            >
                                                                {ORDER_STATUSES.map(s => (
                                                                    <option key={s.id} value={s.id}>{s.label}</option>
                                                                ))}
                                                            </select>

                                                            {/* View Invoice */}
                                                            <a
                                                                href={`/api/invoices/view?id=${submission.id}&company=${encodeURIComponent(selectedForm.name)}&color=${encodeURIComponent('#6366f1')}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${isDark
                                                                    ? 'bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30'
                                                                    : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                                                                    }`}
                                                            >
                                                                <Eye className="w-3 h-3" />
                                                                View Invoice
                                                            </a>

                                                            {/* Track Order */}
                                                            <a
                                                                href={`/api/track/view?id=${submission.id}&company=${encodeURIComponent(selectedForm.name)}&color=${encodeURIComponent('#6366f1')}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${isDark
                                                                    ? 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30'
                                                                    : 'bg-purple-50 text-purple-600 hover:bg-purple-100'
                                                                    }`}
                                                            >
                                                                <Truck className="w-3 h-3" />
                                                                Track
                                                            </a>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className={`text-xs ${textMuted} text-right whitespace-nowrap`}>
                                                    <p>{formatDateTime(submission.created_at)}</p>
                                                    <p className="mt-1">{formatTimeAgo(submission.created_at)}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className={`py-12 text-center ${isDark ? 'bg-white/5' : 'bg-gray-50'} rounded-xl border ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                                    <ClipboardList className={`w-12 h-12 ${textMuted} mx-auto mb-3`} />
                                    <p className={textSecondary}>No submissions yet</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && formToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className={`absolute inset-0 ${isDark ? 'bg-black/60' : 'bg-black/40'} backdrop-blur-sm`}
                        onClick={closeDeleteModal}
                    />
                    <div className={`relative ${modalBg} rounded-2xl border shadow-2xl max-w-md w-full p-6 animate-fade-in`}>
                        <button
                            onClick={closeDeleteModal}
                            className={`absolute top-4 right-4 p-1 ${textSecondary} hover:${textPrimary} transition-colors`}
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="flex items-center justify-center w-14 h-14 bg-red-500/20 rounded-full mx-auto mb-4">
                            <Trash2 className="w-7 h-7 text-red-400" />
                        </div>

                        <h3 className={`text-xl font-bold ${textPrimary} text-center mb-2`}>Delete Form</h3>
                        <p className={`${textSecondary} text-center mb-6`}>
                            Are you sure you want to delete <span className={`${textPrimary} font-semibold`}>"{formToDelete.name}"</span>?
                            This will also delete all submissions. This action cannot be undone.
                        </p>

                        <div className="flex gap-3">
                            <button
                                onClick={closeDeleteModal}
                                className={`flex-1 px-4 py-3 ${isDark ? 'bg-white/5 hover:bg-white/10 text-white border-white/10' : 'bg-gray-100 hover:bg-gray-200 text-gray-900 border-gray-200'} rounded-xl font-semibold transition-colors border`}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                disabled={deleting}
                                className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {deleting ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Deleting...
                                    </>
                                ) : (
                                    'Delete'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Forms;
