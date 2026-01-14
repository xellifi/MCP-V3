import React, { useEffect, useState, useRef } from 'react';
import { Workspace } from '../types';
import { api } from '../services/api';
import { supabase } from '../lib/supabase';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { format, formatDistanceToNow } from 'date-fns';
import FormNodeForm from '../components/FormNodeForm';
import FacebookPageDropdown from '../components/FacebookPageDropdown';
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
    Edit2,
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
    XCircle,
    MoreVertical,
    ThumbsUp,
    ThumbsDown,
    ArrowLeft,
    Users,
    Copy
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
    google_sheet_name?: string;
    google_webhook_url?: string;
    form_template?: string;
    page_id?: string;
    page_logo?: string;
    page_name?: string;
    submission_count?: number;
    fields?: any[];
    submit_button_text?: string;
    submit_button_color?: string;
    border_radius?: string;
    success_message?: string;
    header_image_url?: string;
    countdown_enabled?: boolean;
    countdown_minutes?: number;
    countdown_blink?: boolean;
    max_quantity?: number;
    coupon_enabled?: boolean;
    coupon_code?: string;
    coupon_discount?: number;
    cod_enabled?: boolean;
    ewallet_enabled?: boolean;
    ewallet_options?: string[];
    ewallet_numbers?: Record<string, string>;
    require_proof_upload?: boolean;
    promo_text?: string;
    promo_icon?: string;
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

import SalesSummaryModal from '../components/SalesSummaryModal';

// ... imports remain the same

const Forms: React.FC<FormsProps> = ({ workspace }) => {
    const { isDark } = useTheme();
    const toast = useToast();
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
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [createFormConfig, setCreateFormConfig] = useState<any>(null);
    const [saving, setSaving] = useState(false);
    const [editingForm, setEditingForm] = useState<Form | null>(null);
    const [editFormConfig, setEditFormConfig] = useState<any>(null);
    const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
    const [connectedPages, setConnectedPages] = useState<any[]>([]);
    const [selectedPageId, setSelectedPageId] = useState<string>('');
    const [salesSummaryForm, setSalesSummaryForm] = useState<Form | null>(null);

    const itemsPerPage = 12;

    // Click outside handler for form card menus
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (!target.closest('.form-card-menu') && !target.closest('button')) {
                setActiveMenuId(null);
            }
        };
        if (activeMenuId) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [activeMenuId]);

    // Clone form function
    const cloneForm = async (form: Form) => {
        try {
            const { data, error } = await supabase
                .from('forms')
                .insert({
                    workspace_id: workspace.id,
                    name: `${form.name} (Copy)`,
                    is_order_form: form.is_order_form,
                    product_name: form.product_name,
                    product_price: form.product_price,
                    currency: form.currency,
                    fields: form.fields,
                    submit_button_text: form.submit_button_text,
                    submit_button_color: form.submit_button_color,
                    border_radius: form.border_radius,
                    success_message: form.success_message,
                    header_image_url: form.header_image_url,
                    countdown_enabled: form.countdown_enabled,
                    countdown_minutes: form.countdown_minutes,
                    countdown_blink: form.countdown_blink,
                    max_quantity: form.max_quantity,
                    coupon_enabled: form.coupon_enabled,
                    coupon_code: form.coupon_code,
                    coupon_discount: form.coupon_discount,
                    cod_enabled: form.cod_enabled,
                    ewallet_enabled: form.ewallet_enabled,
                    ewallet_options: form.ewallet_options,
                    ewallet_numbers: form.ewallet_numbers,
                    require_proof_upload: form.require_proof_upload,
                    form_template: form.form_template,
                    promo_text: form.promo_text,
                    promo_icon: form.promo_icon,
                })
                .select()
                .single();

            if (error) throw error;
            toast.success('Form cloned successfully!');
            loadForms();
        } catch (error) {
            console.error('Error cloning form:', error);
            toast.error('Failed to clone form');
        }
    };

    useEffect(() => {
        loadForms();
        loadConnectedPages();
    }, [workspace.id]);

    const loadConnectedPages = async () => {
        try {
            const { data, error } = await supabase
                .from('connected_pages')
                .select('*')
                .eq('workspace_id', workspace.id)
                .eq('is_automation_enabled', true);

            if (!error && data) {
                setConnectedPages(data);
                // Auto-select first page if only one
                if (data.length === 1) {
                    setSelectedPageId(data[0].page_id);
                }
            }
        } catch (error) {
            console.error('Error loading connected pages:', error);
        }
    };

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
            console.log('[Forms] Updating submission:', submissionId, 'with status:', status);

            // Call consolidated API endpoint with PATCH method
            const response = await fetch('/api/forms/actions', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ submissionId, status })
            });

            const result = await response.json();

            if (!response.ok) {
                console.error('[Forms] Failed to update status:', result.error);
                toast.error('Failed to save status. Please try again.');
                return;
            }

            console.log('[Forms] ✓ Status saved to database');


            // Update local state - also mark as synced when confirmed
            setSubmissions(prev => prev.map(s =>
                s.id === submissionId
                    ? {
                        ...s,
                        data: { ...s.data, order_status: status },
                        synced_to_sheets: status === 'processing' ? true : s.synced_to_sheets
                    }
                    : s
            ));

            // Sync to Google Sheets if webhook is configured
            if (result.webhookUrl) {
                try {
                    const statusLabel = ORDER_STATUSES.find(s => s.id === status)?.label || status;

                    await fetch('/api/sheets/sync', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            webhookUrl: result.webhookUrl,
                            sheetName: result.sheetName || 'Sheet1',
                            rowData: {
                                ...result.updatedData,
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

            // Show success notification
            const statusLabel = ORDER_STATUSES.find(s => s.id === status)?.label || status;
            toast.success(`Order status updated to ${statusLabel}`);
        } catch (error) {
            console.error('Error updating submission status:', error);
            toast.error('Failed to save status. Please try again.');
        }
    };

    const deleteSubmission = async (submissionId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('Are you sure you want to delete this order? This action cannot be undone.')) {
            return;
        }

        try {
            // Call consolidated API endpoint with DELETE method
            const response = await fetch('/api/forms/actions', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ submissionId })
            });

            if (!response.ok) {
                const result = await response.json();
                toast.error('Failed to delete: ' + result.error);
                return;
            }

            // Update local state
            setSubmissions(prev => prev.filter(s => s.id !== submissionId));
            toast.success('Order deleted successfully');
        } catch (error) {
            console.error('Error deleting submission:', error);
            toast.error('Failed to delete order. Please try again.');
        }
    };

    // Update regular form submission status (approve/decline)
    const updateRegularFormStatus = async (submissionId: string, action: 'approved' | 'declined') => {
        try {
            console.log('[Forms] Updating regular form submission:', submissionId, 'action:', action);

            // Update submission data with the new status
            const { error } = await supabase
                .from('form_submissions')
                .update({
                    data: supabase.rpc('jsonb_set_key', {
                        target: 'data',
                        path: '{status}',
                        value: action
                    })
                })
                .eq('id', submissionId);

            // Alternative: use raw SQL or just update with spread
            const submission = submissions.find(s => s.id === submissionId);
            if (submission) {
                const { error: updateError } = await supabase
                    .from('form_submissions')
                    .update({
                        data: { ...submission.data, status: action },
                        synced_to_sheets: true // Mark as synced since we're processing it
                    })
                    .eq('id', submissionId);

                if (updateError) {
                    console.error('[Forms] Failed to update status:', updateError);
                    toast.error('Failed to update status');
                    return;
                }

                // Update local state
                setSubmissions(prev => prev.map(s =>
                    s.id === submissionId
                        ? { ...s, data: { ...s.data, status: action }, synced_to_sheets: true }
                        : s
                ));

                // Sync to Google Sheets if webhook is configured
                if (selectedForm?.google_webhook_url) {
                    try {
                        await fetch('/api/sheets/sync', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                webhookUrl: selectedForm.google_webhook_url,
                                sheetName: selectedForm.google_sheet_name || 'Sheet1',
                                rowData: {
                                    ...submission.data,
                                    status: action,
                                    status_updated_at: new Date().toISOString()
                                }
                            })
                        });
                        console.log('[Forms] Status synced to Google Sheets');
                    } catch (sheetError) {
                        console.error('[Forms] Failed to sync status to Sheets:', sheetError);
                    }
                }

                toast.success(`Submission ${action === 'approved' ? 'approved' : 'declined'}`);
            }
        } catch (error) {
            console.error('Error updating submission status:', error);
            toast.error('Failed to update status');
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
                    <div className={`flex items-center p-1 rounded-xl border ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'} shadow-sm`}>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-lg transition-all ${viewMode === 'list'
                                ? 'bg-indigo-500 text-white shadow-md'
                                : `${textSecondary} hover:${textPrimary} hover:bg-gray-100/50`}`}
                            title="List View"
                        >
                            <List className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2 rounded-lg transition-all ${viewMode === 'grid'
                                ? 'bg-indigo-500 text-white shadow-md'
                                : `${textSecondary} hover:${textPrimary} hover:bg-gray-100/50`}`}
                            title="Grid View"
                        >
                            <LayoutGrid className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Create Form Button */}
                    <button
                        onClick={() => {
                            // Initialize with default config including isOrderForm: true
                            setCreateFormConfig({ isOrderForm: true });
                            // Reset or auto-select page
                            if (connectedPages.length === 1) {
                                setSelectedPageId(connectedPages[0].page_id);
                            } else {
                                setSelectedPageId('');
                            }
                            setShowCreateModal(true);
                        }}
                        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white rounded-xl font-medium transition-all shadow-lg shadow-indigo-500/25 active:scale-95"
                    >
                        <Plus className="w-5 h-5" />
                        <span>New Form</span>
                    </button>
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
                viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {paginatedForms.map(form => (
                            <div
                                key={form.id}
                                onClick={() => openFormDetails(form)}
                                className={`${cardBg} rounded-2xl border overflow-hidden cursor-pointer group transition-all duration-300 relative p-5`}
                            >
                                {/* ===== GRID VIEW ===== */}
                                <>
                                    {/* 3-Dot Menu - Upper Right */}
                                    <div className="absolute top-3 right-3 z-10 flex items-center gap-1">
                                        {activeMenuId === form.id && (
                                            <div
                                                className={`form-card-menu flex items-center gap-0.5 p-1 ${isDark ? 'bg-slate-800/95 border-slate-700' : 'bg-white/95 border-gray-200'} rounded-lg border shadow-xl backdrop-blur-sm animate-scale-in`}
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setActiveMenuId(null);
                                                        setSalesSummaryForm(form);
                                                    }}
                                                    title="Sales Summary"
                                                    className={`relative group/sales p-1.5 rounded-lg ${isDark ? 'hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300' : 'hover:bg-emerald-50 text-emerald-500 hover:text-emerald-600'} transition-all`}
                                                >
                                                    <DollarSign className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setActiveMenuId(null);
                                                        setEditingForm(form);
                                                        setSelectedPageId(form.page_id);
                                                        setEditFormConfig({
                                                            formName: form.name,
                                                            isOrderForm: form.is_order_form,
                                                            productName: form.product_name,
                                                            productPrice: form.product_price,
                                                            currency: form.currency,
                                                            fields: form.fields,
                                                            submitButtonText: form.submit_button_text,
                                                            submitButtonColor: form.submit_button_color,
                                                            borderRadius: form.border_radius,
                                                            successMessage: form.success_message,
                                                            headerImageUrl: form.header_image_url,
                                                            countdownEnabled: form.countdown_enabled,
                                                            countdownMinutes: form.countdown_minutes,
                                                            countdownBlink: form.countdown_blink,
                                                            maxQuantity: form.max_quantity,
                                                            couponEnabled: form.coupon_enabled,
                                                            couponCode: form.coupon_code,
                                                            couponDiscount: form.coupon_discount,
                                                            codEnabled: form.cod_enabled,
                                                            ewalletEnabled: form.ewallet_enabled,
                                                            ewalletOptions: form.ewallet_options,
                                                            ewalletNumbers: form.ewallet_numbers,
                                                            requireProofUpload: form.require_proof_upload,
                                                            formTemplate: form.form_template,
                                                            promoText: form.promo_text,
                                                            promoIcon: form.promo_icon,
                                                        });
                                                    }}
                                                    className={`relative group/edit p-1.5 rounded-lg ${isDark ? 'hover:bg-white/10 text-slate-300 hover:text-white' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'} transition-all`}
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); cloneForm(form); }}
                                                    className={`relative group/clone p-1.5 rounded-lg ${isDark ? 'hover:bg-white/10 text-slate-300 hover:text-white' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'} transition-all`}
                                                >
                                                    <Copy className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); openDeleteModal(form, e); }}
                                                    className={`relative group/delete p-1.5 rounded-lg ${isDark ? 'hover:bg-red-500/20 text-red-400 hover:text-red-300' : 'hover:bg-red-50 text-red-400 hover:text-red-500'} transition-all`}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        )}
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === form.id ? null : form.id); }}
                                            className={`p-1.5 ${isDark ? 'bg-slate-700/80 hover:bg-slate-600 text-white/70 hover:text-white' : 'bg-white/80 hover:bg-white text-gray-500 hover:text-gray-700'} rounded-lg transition-all shadow-lg backdrop-blur-sm`}
                                        >
                                            <MoreVertical className="w-4 h-4" />
                                        </button>
                                    </div>

                                    {/* Form Type Badge - Upper Left */}
                                    <div className="absolute top-3 left-3 z-10">
                                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium ${form.is_order_form
                                            ? `${isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`
                                            : `${isDark ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`
                                            }`}>
                                            {form.is_order_form ? <><ShoppingCart className="w-3 h-3" /> Multi Step</> : <><FileText className="w-3 h-3" /> Regular</>}
                                        </span>
                                    </div>

                                    {/* Center Icon - Form Type Icon */}
                                    <div className="flex justify-center mb-4 mt-6">
                                        <div className="relative">
                                            {(form.submission_count || 0) > 0 && (
                                                <div className="absolute -top-2 -right-2 min-w-[20px] h-[20px] bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1.5 shadow-lg z-20 animate-pulse">
                                                    {form.submission_count! > 99 ? '99+' : form.submission_count}
                                                </div>
                                            )}
                                            {/* Glass Style Form Type Icons */}
                                            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border-2 ${form.is_order_form
                                                ? 'bg-emerald-500/10 border-emerald-500/30'
                                                : 'bg-indigo-500/10 border-indigo-500/30'}`}>
                                                {form.is_order_form
                                                    ? <ShoppingCart className="w-8 h-8 text-emerald-400" />
                                                    : <FileText className="w-8 h-8 text-indigo-400" />}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Grid Info */}
                                    <div className="text-center">
                                        <h3 className={`font-bold ${textPrimary} truncate group-hover:text-indigo-400 transition-colors text-lg mb-1`}>{form.name}</h3>
                                        {form.product_name && <p className={`${textSecondary} text-sm truncate mb-2`}>{form.product_name}{form.is_order_form && form.product_price ? ` • ${getCurrencySymbol(form.currency)}${form.product_price.toLocaleString()}` : ''}</p>}
                                        {form.page_name && (
                                            <div className="flex items-center gap-1.5 justify-center">
                                                {form.page_logo && <img src={form.page_logo} alt="" className="w-4 h-4 rounded-full object-cover" />}
                                                <span className={`text-xs ${textMuted} truncate max-w-[120px]`}>{form.page_name}</span>
                                            </div>
                                        )}
                                        <div className={`flex items-center justify-center gap-1 mt-3 text-xs ${textMuted}`}>
                                            <Clock className="w-3 h-3" />
                                            {formatTimeAgo(form.created_at)}
                                        </div>
                                    </div>
                                </>
                            </div>
                        ))}
                    </div>
                ) : (
                    /* ===== LIST VIEW - Table Layout ===== */
                    <div className={`overflow-x-auto ${panelBg} rounded-2xl border ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                        <table className={`min-w-full divide-y ${isDark ? 'divide-white/10' : 'divide-gray-200'}`}>
                            <thead className={isDark ? 'bg-white/5' : 'bg-gray-50'}>
                                <tr>
                                    <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${textMuted} uppercase tracking-wider`}>
                                        Form
                                    </th>
                                    <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${textMuted} uppercase tracking-wider`}>
                                        Details
                                    </th>
                                    <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${textMuted} uppercase tracking-wider`}>
                                        Stats
                                    </th>
                                    <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${textMuted} uppercase tracking-wider`}>
                                        Created
                                    </th>
                                    <th scope="col" className={`px-6 py-3 text-right text-xs font-medium ${textMuted} uppercase tracking-wider`}>
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${isDark ? 'divide-white/10' : 'divide-gray-200'}`}>
                                {paginatedForms.map(form => (
                                    <tr
                                        key={form.id}
                                        onClick={() => openFormDetails(form)}
                                        className={`group cursor-pointer transition-colors ${isDark ? 'hover:bg-white/5' : 'hover:bg-indigo-50/50'}`}
                                    >
                                        {/* Form Column */}
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="flex-shrink-0 h-10 w-10">
                                                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center border ${form.is_order_form
                                                        ? 'bg-emerald-500/10 border-emerald-500/30'
                                                        : 'bg-indigo-500/10 border-indigo-500/30'}`}>
                                                        {form.is_order_form
                                                            ? <ShoppingCart className="w-5 h-5 text-emerald-400" />
                                                            : <FileText className="w-5 h-5 text-indigo-400" />}
                                                    </div>
                                                </div>
                                                <div className="ml-4">
                                                    <div className={`text-sm font-semibold ${textPrimary} group-hover:text-indigo-400 transition-colors`}>
                                                        {form.name}
                                                    </div>
                                                    <div className={`text-xs ${textMuted} flex items-center gap-1 mt-0.5`}>
                                                        <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium ${form.is_order_form
                                                            ? `${isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`
                                                            : `${isDark ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`
                                                            }`}>
                                                            {form.is_order_form ? 'Multi Step' : 'Regular'}
                                                        </span>
                                                        {(form.submission_count || 0) > 0 && (
                                                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-500/20 text-red-400">
                                                                {form.submission_count} New
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Details Column */}
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col gap-1">
                                                {form.product_name && (
                                                    <div className={`text-sm ${textPrimary}`}>
                                                        {form.product_name}
                                                        {form.is_order_form && form.product_price && (
                                                            <span className={`ml-1 ${textSecondary}`}>
                                                                • {getCurrencySymbol(form.currency)}{form.product_price.toLocaleString()}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                                {form.page_name ? (
                                                    <div className="flex items-center gap-1.5">
                                                        {form.page_logo && <img src={form.page_logo} alt="" className="w-4 h-4 rounded-full object-cover" />}
                                                        <span className={`text-xs ${textSecondary}`}>{form.page_name}</span>
                                                    </div>
                                                ) : (
                                                    <span className={`text-xs ${textMuted} italic`}>No page connected</span>
                                                )}
                                            </div>
                                        </td>

                                        {/* Stats Column */}
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-4">
                                                <div className="text-center">
                                                    <div className={`text-sm font-bold ${textPrimary}`}>{form.submission_count || 0}</div>
                                                    <div className={`text-[10px] ${textMuted} uppercase`}>Submissions</div>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Created Column */}
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className={`text-sm ${textSecondary}`}>
                                                {formatDate(form.created_at)}
                                            </div>
                                            <div className={`text-xs ${textMuted}`}>
                                                {formatTimeAgo(form.created_at)}
                                            </div>
                                        </td>

                                        {/* Actions Column */}
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setEditingForm(form);
                                                        setSelectedPageId(form.page_id);
                                                        setEditFormConfig({
                                                            formName: form.name,
                                                            isOrderForm: form.is_order_form,
                                                            productName: form.product_name,
                                                            productPrice: form.product_price,
                                                            currency: form.currency,
                                                            fields: form.fields,
                                                            submitButtonText: form.submit_button_text,
                                                            submitButtonColor: form.submit_button_color,
                                                            borderRadius: form.border_radius,
                                                            successMessage: form.success_message,
                                                            headerImageUrl: form.header_image_url,
                                                            countdownEnabled: form.countdown_enabled,
                                                            countdownMinutes: form.countdown_minutes,
                                                            countdownBlink: form.countdown_blink,
                                                            maxQuantity: form.max_quantity,
                                                            couponEnabled: form.coupon_enabled,
                                                            couponCode: form.coupon_code,
                                                            couponDiscount: form.coupon_discount,
                                                            codEnabled: form.cod_enabled,
                                                            ewalletEnabled: form.ewallet_enabled,
                                                            ewalletOptions: form.ewallet_options,
                                                            ewalletNumbers: form.ewallet_numbers,
                                                            requireProofUpload: form.require_proof_upload,
                                                            formTemplate: form.form_template,
                                                            promoText: form.promo_text,
                                                            promoIcon: form.promo_icon,
                                                        });
                                                    }}
                                                    className={`p-1.5 rounded-lg transition-colors ${isDark
                                                        ? 'text-slate-400 hover:text-white hover:bg-white/10'
                                                        : 'text-gray-400 hover:text-indigo-600 hover:bg-indigo-50'
                                                        }`}
                                                    title="Edit Form"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        cloneForm(form);
                                                    }}
                                                    className={`p-1.5 rounded-lg transition-colors ${isDark
                                                        ? 'text-slate-400 hover:text-white hover:bg-white/10'
                                                        : 'text-gray-400 hover:text-indigo-600 hover:bg-indigo-50'
                                                        }`}
                                                    title="Duplicate Form"
                                                >
                                                    <Copy className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={(e) => openDeleteModal(form, e)}
                                                    className={`p-1.5 rounded-lg transition-colors ${isDark
                                                        ? 'text-slate-400 hover:text-red-400 hover:bg-red-500/10'
                                                        : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                                                        }`}
                                                    title="Delete Form"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )
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

            {/* Form Details - Full Page View */}
            {selectedForm && (
                <div className={`fixed inset-0 z-50 ${isDark ? 'bg-[#0a0a12]' : 'bg-gray-50'} overflow-hidden animate-fade-in`}>
                    {/* Full Page Container */}
                    <div className="h-full flex flex-col">
                        {/* Sticky Header */}
                        <div className={`sticky top-0 z-20 ${isDark ? 'bg-[#0a0a12]/95 border-white/10' : 'bg-white/95 border-gray-200'} backdrop-blur-lg border-b px-4 md:px-6 py-4`}>
                            <div className="max-w-7xl mx-auto">
                                {/* Back Button + Title Row */}
                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={closeFormDetails}
                                        className={`flex items-center gap-2 px-3 py-2 rounded-xl font-medium transition-all ${isDark
                                            ? 'bg-white/5 hover:bg-white/10 text-white/70 hover:text-white'
                                            : 'bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900'
                                            }`}
                                    >
                                        <ArrowLeft className="w-5 h-5" />
                                        <span className="hidden sm:inline">Back to Forms</span>
                                    </button>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3">
                                            <div className={`hidden sm:flex w-12 h-12 rounded-xl ${selectedForm.is_order_form
                                                ? 'bg-gradient-to-br from-emerald-500/20 to-teal-500/20'
                                                : 'bg-gradient-to-br from-indigo-500/20 to-purple-500/20'
                                                } items-center justify-center border ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                                                {selectedForm.is_order_form ? (
                                                    <ShoppingCart className="w-5 h-5 text-emerald-400" />
                                                ) : (
                                                    <FileText className="w-5 h-5 text-indigo-400" />
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <h1 className={`text-xl md:text-2xl font-bold ${textPrimary} truncate`}>
                                                    {selectedForm.name}
                                                </h1>
                                                {selectedForm.is_order_form && selectedForm.product_name && (
                                                    <p className={`${textSecondary} text-sm truncate`}>
                                                        {selectedForm.product_name} • {getCurrencySymbol(selectedForm.currency)}{selectedForm.product_price?.toLocaleString()}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Preview Button */}
                                    <a
                                        href={`/forms/${selectedForm.id}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="hidden md:inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white rounded-xl font-medium transition-all shadow-lg shadow-indigo-500/25"
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                        Preview Form
                                    </a>
                                </div>
                            </div>
                        </div>

                        {/* Scrollable Content */}
                        <div className="flex-1 overflow-y-auto">
                            <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-6">

                                {/* Mobile Preview Button */}
                                <div className="md:hidden">
                                    <a
                                        href={`/forms/${selectedForm.id}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl font-medium shadow-lg"
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                        Preview Form
                                    </a>
                                </div>

                                {/* Stats Grid */}
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                                    <div className={`${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'} rounded-2xl p-4 md:p-5 border shadow-sm`}>
                                        <div className="flex items-center gap-3">
                                            <div className="p-2.5 md:p-3 bg-indigo-500/20 rounded-xl">
                                                <ClipboardList className="w-5 h-5 md:w-6 md:h-6 text-indigo-400" />
                                            </div>
                                            <div>
                                                <p className={`text-2xl md:text-3xl font-bold ${textPrimary}`}>{submissions.length}</p>
                                                <p className={`text-xs md:text-sm ${textMuted}`}>Submissions</p>
                                            </div>
                                        </div>
                                    </div>

                                    {selectedForm.is_order_form && (
                                        <>
                                            <div className={`${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'} rounded-2xl p-4 md:p-5 border shadow-sm`}>
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2.5 md:p-3 bg-emerald-500/20 rounded-xl">
                                                        <Package className="w-5 h-5 md:w-6 md:h-6 text-emerald-400" />
                                                    </div>
                                                    <div>
                                                        <p className={`text-2xl md:text-3xl font-bold ${textPrimary}`}>{totalOrders}</p>
                                                        <p className={`text-xs md:text-sm ${textMuted}`}>Total Orders</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className={`${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'} rounded-2xl p-4 md:p-5 border shadow-sm`}>
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2.5 md:p-3 bg-amber-500/20 rounded-xl">
                                                        <DollarSign className="w-5 h-5 md:w-6 md:h-6 text-amber-400" />
                                                    </div>
                                                    <div>
                                                        <p className={`text-2xl md:text-3xl font-bold ${textPrimary}`}>
                                                            {getCurrencySymbol(selectedForm.currency)}{totalRevenue.toLocaleString()}
                                                        </p>
                                                        <p className={`text-xs md:text-sm ${textMuted}`}>Total Revenue</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    <div className={`${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'} rounded-2xl p-4 md:p-5 border shadow-sm`}>
                                        <div className="flex items-center gap-3">
                                            <div className="p-2.5 md:p-3 bg-green-500/20 rounded-xl">
                                                <CheckCircle className="w-5 h-5 md:w-6 md:h-6 text-green-400" />
                                            </div>
                                            <div>
                                                <p className={`text-2xl md:text-3xl font-bold ${textPrimary}`}>{syncedCount}</p>
                                                <p className={`text-xs md:text-sm ${textMuted}`}>Synced to Sheets</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Submissions Section */}
                                <div className={`${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'} rounded-2xl border shadow-sm overflow-hidden`}>
                                    {/* Section Header */}
                                    <div className={`px-4 md:px-6 py-4 border-b ${isDark ? 'border-white/10' : 'border-gray-200'} flex items-center justify-between`}>
                                        <div className="flex items-center gap-3">
                                            <Users className={`w-5 h-5 ${isDark ? 'text-indigo-400' : 'text-indigo-500'}`} />
                                            <h2 className={`text-lg font-bold ${textPrimary}`}>
                                                {selectedForm.is_order_form ? 'Orders' : 'Submissions'}
                                            </h2>
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${isDark ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
                                                {submissions.length}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Submissions List */}
                                    <div className="divide-y divide-white/5">
                                        {loadingSubmissions ? (
                                            <div className="flex items-center justify-center py-16">
                                                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500"></div>
                                            </div>
                                        ) : submissions.length > 0 ? (
                                            submissions.map(submission => (
                                                <div
                                                    key={submission.id}
                                                    className={`px-4 md:px-6 py-4 ${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50'} transition-colors`}
                                                >
                                                    {/* Mobile Layout */}
                                                    <div className="md:hidden space-y-3">
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div className="min-w-0 flex-1">
                                                                <p className={`font-semibold ${textPrimary} truncate`}>
                                                                    {submission.subscriber_name || submission.data?.subscriber_name || 'Anonymous'}
                                                                </p>
                                                                <p className={`text-xs ${textMuted} mt-0.5`}>
                                                                    {formatTimeAgo(submission.created_at)}
                                                                </p>
                                                            </div>
                                                            {submission.synced_to_sheets ? (
                                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs bg-green-500/20 text-green-400">
                                                                    <CheckCircle className="w-3 h-3" />
                                                                    Synced
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs bg-yellow-500/20 text-yellow-400">
                                                                    <AlertCircle className="w-3 h-3" />
                                                                    Pending
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Details */}
                                                        <div className={`text-sm ${textSecondary} space-y-1`}>
                                                            {selectedForm.is_order_form ? (
                                                                <>
                                                                    {submission.data?.quantity && (
                                                                        <p>Qty: {submission.data.quantity} • Total: {getCurrencySymbol(selectedForm.currency)}{submission.data.total?.toLocaleString()}</p>
                                                                    )}
                                                                    {submission.data?.payment_method && (
                                                                        <p>Payment: {submission.data.payment_method === 'cod' ? 'COD' : submission.data.ewallet_selected || 'E-Wallet'}</p>
                                                                    )}
                                                                </>
                                                            ) : (
                                                                Object.entries(submission.data || {}).slice(0, 2).map(([key, value]) => (
                                                                    <p key={key} className="truncate">
                                                                        <span className="font-medium capitalize">{key.replace(/_/g, ' ')}:</span> {String(value)}
                                                                    </p>
                                                                ))
                                                            )}
                                                        </div>

                                                        {/* Actions */}
                                                        <div className="flex items-center gap-2 flex-wrap pt-2">
                                                            {selectedForm.is_order_form ? (
                                                                <>
                                                                    <select
                                                                        value={submission.data?.order_status || 'pending'}
                                                                        onChange={(e) => updateSubmissionStatus(submission.id, e.target.value)}
                                                                        className={`text-xs font-medium px-3 py-2 rounded-lg border-0 cursor-pointer ${(submission.data?.order_status || 'pending') === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
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
                                                                    <a
                                                                        href={`/api/views/handler?type=invoice&id=${submission.id}&company=${encodeURIComponent(selectedForm.name)}&color=${encodeURIComponent('#6366f1')}`}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-indigo-500/20 text-indigo-400"
                                                                    >
                                                                        <Eye className="w-3 h-3" />
                                                                        Invoice
                                                                    </a>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    {submission.data?.status ? (
                                                                        <span className={`inline-flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium ${submission.data.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                                                                            submission.data.status === 'declined' ? 'bg-red-500/20 text-red-400' :
                                                                                'bg-gray-500/20 text-gray-400'
                                                                            }`}>
                                                                            {submission.data.status === 'approved' && <ThumbsUp className="w-3 h-3" />}
                                                                            {submission.data.status === 'declined' && <ThumbsDown className="w-3 h-3" />}
                                                                            {submission.data.status.charAt(0).toUpperCase() + submission.data.status.slice(1)}
                                                                        </span>
                                                                    ) : (
                                                                        <>
                                                                            <button
                                                                                onClick={() => updateRegularFormStatus(submission.id, 'approved')}
                                                                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-green-500/20 text-green-400"
                                                                            >
                                                                                <ThumbsUp className="w-3 h-3" />
                                                                                Approve
                                                                            </button>
                                                                            <button
                                                                                onClick={() => updateRegularFormStatus(submission.id, 'declined')}
                                                                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-orange-500/20 text-orange-400"
                                                                            >
                                                                                <ThumbsDown className="w-3 h-3" />
                                                                                Decline
                                                                            </button>
                                                                        </>
                                                                    )}
                                                                </>
                                                            )}
                                                            <button
                                                                onClick={(e) => deleteSubmission(submission.id, e)}
                                                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-red-500/20 text-red-400"
                                                            >
                                                                <Trash2 className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Desktop Layout */}
                                                    <div className="hidden md:flex items-center gap-4">
                                                        {/* Name & Details */}
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-3 mb-1">
                                                                <p className={`font-semibold ${textPrimary}`}>
                                                                    {submission.subscriber_name || submission.data?.subscriber_name || 'Anonymous'}
                                                                </p>
                                                                {submission.synced_to_sheets ? (
                                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-500/20 text-green-400">
                                                                        <CheckCircle className="w-3 h-3" />
                                                                        Synced
                                                                    </span>
                                                                ) : (
                                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-yellow-500/20 text-yellow-400">
                                                                        <AlertCircle className="w-3 h-3" />
                                                                        Pending
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className={`text-sm ${textSecondary} flex items-center gap-4`}>
                                                                {selectedForm.is_order_form ? (
                                                                    <>
                                                                        {submission.data?.quantity && (
                                                                            <span>Qty: {submission.data.quantity}</span>
                                                                        )}
                                                                        {submission.data?.total && (
                                                                            <span>Total: {getCurrencySymbol(selectedForm.currency)}{submission.data.total.toLocaleString()}</span>
                                                                        )}
                                                                        {submission.data?.payment_method && (
                                                                            <span>{submission.data.payment_method === 'cod' ? 'COD' : submission.data.ewallet_selected || 'E-Wallet'}</span>
                                                                        )}
                                                                    </>
                                                                ) : (
                                                                    Object.entries(submission.data || {}).slice(0, 3).map(([key, value]) => (
                                                                        <span key={key} className="truncate max-w-[200px]">
                                                                            <span className="font-medium capitalize">{key.replace(/_/g, ' ')}:</span> {String(value)}
                                                                        </span>
                                                                    ))
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Date */}
                                                        <div className={`text-sm ${textMuted} text-right whitespace-nowrap`}>
                                                            <p>{formatDateTime(submission.created_at)}</p>
                                                            <p className="text-xs mt-0.5">{formatTimeAgo(submission.created_at)}</p>
                                                        </div>

                                                        {/* Actions */}
                                                        <div className="flex items-center gap-2">
                                                            {selectedForm.is_order_form ? (
                                                                <>
                                                                    <select
                                                                        value={submission.data?.order_status || 'pending'}
                                                                        onChange={(e) => updateSubmissionStatus(submission.id, e.target.value)}
                                                                        className={`text-xs font-medium px-3 py-1.5 rounded-lg border-0 cursor-pointer ${(submission.data?.order_status || 'pending') === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
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
                                                                    <a
                                                                        href={`/api/views/handler?type=invoice&id=${submission.id}&company=${encodeURIComponent(selectedForm.name)}&color=${encodeURIComponent('#6366f1')}`}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 transition-colors"
                                                                    >
                                                                        <Eye className="w-3 h-3" />
                                                                        Invoice
                                                                    </a>
                                                                    <a
                                                                        href={`/api/views/handler?type=track&id=${submission.id}&company=${encodeURIComponent(selectedForm.name)}&color=${encodeURIComponent('#6366f1')}`}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-colors"
                                                                    >
                                                                        <Truck className="w-3 h-3" />
                                                                        Track
                                                                    </a>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    {submission.data?.status ? (
                                                                        <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium ${submission.data.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                                                                            submission.data.status === 'declined' ? 'bg-red-500/20 text-red-400' :
                                                                                'bg-gray-500/20 text-gray-400'
                                                                            }`}>
                                                                            {submission.data.status === 'approved' && <ThumbsUp className="w-3 h-3" />}
                                                                            {submission.data.status === 'declined' && <ThumbsDown className="w-3 h-3" />}
                                                                            {submission.data.status.charAt(0).toUpperCase() + submission.data.status.slice(1)}
                                                                        </span>
                                                                    ) : (
                                                                        <>
                                                                            <button
                                                                                onClick={() => updateRegularFormStatus(submission.id, 'approved')}
                                                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors"
                                                                            >
                                                                                <ThumbsUp className="w-3 h-3" />
                                                                                Approve
                                                                            </button>
                                                                            <button
                                                                                onClick={() => updateRegularFormStatus(submission.id, 'declined')}
                                                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 transition-colors"
                                                                            >
                                                                                <ThumbsDown className="w-3 h-3" />
                                                                                Decline
                                                                            </button>
                                                                        </>
                                                                    )}
                                                                </>
                                                            )}
                                                            <button
                                                                onClick={(e) => deleteSubmission(submission.id, e)}
                                                                className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-xs font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                                                                title="Delete"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="py-16 text-center">
                                                <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl ${isDark ? 'bg-white/5' : 'bg-gray-100'} flex items-center justify-center`}>
                                                    <ClipboardList className={`w-8 h-8 ${textMuted}`} />
                                                </div>
                                                <p className={`text-lg font-medium ${textPrimary} mb-1`}>No submissions yet</p>
                                                <p className={textSecondary}>Submissions will appear here when people fill out your form</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
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

            {/* Create Form Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className={`absolute inset-0 ${isDark ? 'bg-black/70' : 'bg-black/50'} backdrop-blur-sm`}
                        onClick={() => setShowCreateModal(false)}
                    />
                    <div className={`relative ${modalBg} rounded-2xl border shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-scale-in`}>
                        <div className={`flex items-center justify-between p-4 border-b ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                            <h2 className={`text-xl font-bold ${textPrimary}`}>Create New Form</h2>
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className={`p-2 ${textSecondary} hover:${textPrimary} ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'} rounded-lg transition-colors`}
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4">
                            {/* Facebook Page Selector */}
                            <div className={`mb-6 p-4 rounded-xl ${isDark ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'} border`}>
                                <label className={`block text-sm font-medium ${textPrimary} mb-2`}>
                                    Connect to Facebook Page <span className="text-red-500">*</span>
                                </label>
                                <p className={`text-xs ${textMuted} mb-3`}>
                                    Select which Facebook page this form will be connected to for automation
                                </p>
                                <FacebookPageDropdown
                                    workspaceId={workspace.id}
                                    selectedPageId={selectedPageId}
                                    onSelect={(pageId) => setSelectedPageId(pageId)}
                                    automationEnabledOnly={true}
                                />
                            </div>

                            <FormNodeForm
                                workspaceId={workspace.id}
                                initialConfig={createFormConfig}
                                onChange={(config) => {
                                    setCreateFormConfig(config);
                                }}
                            />
                        </div>
                        {/* Footer with Save Button */}
                        <div className={`flex items-center justify-end gap-3 p-4 border-t ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className={`px-4 py-2 ${isDark ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'} rounded-xl font-medium transition-colors`}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={async () => {
                                    if (!selectedPageId) {
                                        toast.error('Please select a Facebook page');
                                        return;
                                    }
                                    if (!createFormConfig?.formName) {
                                        toast.error('Please enter a form name');
                                        return;
                                    }
                                    setSaving(true);
                                    try {
                                        const { data, error } = await supabase
                                            .from('forms')
                                            .insert({
                                                workspace_id: workspace.id,
                                                page_id: selectedPageId,
                                                name: createFormConfig.formName,
                                                is_order_form: createFormConfig.isOrderForm ?? true,
                                                product_name: createFormConfig.productName || '',
                                                product_price: createFormConfig.productPrice || 0,
                                                currency: createFormConfig.currency || 'PHP',
                                                fields: createFormConfig.fields || [],
                                                submit_button_text: createFormConfig.submitButtonText || 'Place Order',
                                                submit_button_color: createFormConfig.submitButtonColor || '#6366f1',
                                                border_radius: createFormConfig.borderRadius || 'round',
                                                success_message: createFormConfig.successMessage || 'Order placed successfully!',
                                                header_image_url: createFormConfig.headerImageUrl || '',
                                                countdown_enabled: createFormConfig.countdownEnabled || false,
                                                countdown_minutes: createFormConfig.countdownMinutes || 10,
                                                countdown_blink: createFormConfig.countdownBlink ?? true,
                                                max_quantity: createFormConfig.maxQuantity || 10,
                                                coupon_enabled: createFormConfig.couponEnabled || false,
                                                coupon_code: createFormConfig.couponCode || '',
                                                coupon_discount: createFormConfig.couponDiscount || 0,
                                                cod_enabled: createFormConfig.codEnabled ?? true,
                                                ewallet_enabled: createFormConfig.ewalletEnabled ?? true,
                                                ewallet_options: createFormConfig.ewalletOptions || [],
                                                ewallet_numbers: createFormConfig.ewalletNumbers || {},
                                                require_proof_upload: createFormConfig.requireProofUpload ?? true,
                                                form_template: createFormConfig.formTemplate || 'modern',
                                                promo_text: createFormConfig.promoText || 'Promo Only!',
                                                promo_icon: createFormConfig.promoIcon || '🔥',
                                            })
                                            .select()
                                            .single();

                                        if (!error && data) {
                                            toast.success('Form created successfully!');
                                            setShowCreateModal(false);
                                            setCreateFormConfig(null);
                                            loadForms();
                                        } else {
                                            toast.error('Failed to create form');
                                        }
                                    } catch (err) {
                                        console.error('Error creating form:', err);
                                        toast.error('Failed to create form');
                                    } finally {
                                        setSaving(false);
                                    }
                                }}
                                disabled={saving}
                                className="px-6 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white rounded-xl font-medium transition-all shadow-lg disabled:opacity-50 flex items-center gap-2"
                            >
                                {saving ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    'Save Form'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Form Modal */}
            {editingForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className={`absolute inset-0 ${isDark ? 'bg-black/70' : 'bg-black/50'} backdrop-blur-sm`}
                        onClick={() => { setEditingForm(null); setEditFormConfig(null); }}
                    />
                    <div className={`relative ${modalBg} rounded-2xl border shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-scale-in`}>
                        <div className={`flex items-center justify-between p-4 border-b ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                            <h2 className={`text-xl font-bold ${textPrimary}`}>Edit Form: {editingForm.name}</h2>
                            <button
                                onClick={() => { setEditingForm(null); setEditFormConfig(null); }}
                                className={`p-2 ${textSecondary} hover:${textPrimary} ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'} rounded-lg transition-colors`}
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4">
                            {/* Facebook Page Selector */}
                            <div className={`mb-6 p-4 rounded-xl ${isDark ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'} border`}>
                                <label className={`block text-sm font-medium ${textPrimary} mb-2`}>
                                    Connected Page <span className="text-red-500">*</span>
                                </label>
                                <p className={`text-xs ${textMuted} mb-3`}>
                                    Select which Facebook page this form is connected to
                                </p>
                                <FacebookPageDropdown
                                    workspaceId={workspace.id}
                                    selectedPageId={selectedPageId}
                                    onSelect={(pageId) => setSelectedPageId(pageId)}
                                    automationEnabledOnly={true}
                                />
                            </div>

                            <FormNodeForm
                                workspaceId={workspace.id}
                                initialConfig={editFormConfig}
                                onChange={(config) => {
                                    setEditFormConfig(config);
                                }}
                            />
                        </div>
                        {/* Footer with Update Button */}
                        <div className={`flex items-center justify-end gap-3 p-4 border-t ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                            <button
                                onClick={() => { setEditingForm(null); setEditFormConfig(null); }}
                                className={`px-4 py-2 ${isDark ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'} rounded-xl font-medium transition-colors`}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={async () => {
                                    if (!editFormConfig?.formName) {
                                        toast.error('Please enter a form name');
                                        return;
                                    }
                                    setSaving(true);
                                    try {
                                        const { error } = await supabase
                                            .from('forms')
                                            .update({
                                                page_id: selectedPageId,
                                                name: editFormConfig.formName,
                                                is_order_form: editFormConfig.isOrderForm ?? true,
                                                product_name: editFormConfig.productName || '',
                                                product_price: editFormConfig.productPrice || 0,
                                                currency: editFormConfig.currency || 'PHP',
                                                fields: editFormConfig.fields || [],
                                                submit_button_text: editFormConfig.submitButtonText || 'Place Order',
                                                submit_button_color: editFormConfig.submitButtonColor || '#6366f1',
                                                border_radius: editFormConfig.borderRadius || 'round',
                                                success_message: editFormConfig.successMessage || 'Order placed successfully!',
                                                header_image_url: editFormConfig.headerImageUrl || '',
                                                countdown_enabled: editFormConfig.countdownEnabled || false,
                                                countdown_minutes: editFormConfig.countdownMinutes || 10,
                                                countdown_blink: editFormConfig.countdownBlink ?? true,
                                                max_quantity: editFormConfig.maxQuantity || 10,
                                                coupon_enabled: editFormConfig.couponEnabled || false,
                                                coupon_code: editFormConfig.couponCode || '',
                                                coupon_discount: editFormConfig.couponDiscount || 0,
                                                cod_enabled: editFormConfig.codEnabled ?? true,
                                                ewallet_enabled: editFormConfig.ewalletEnabled ?? true,
                                                ewallet_options: editFormConfig.ewalletOptions || [],
                                                ewallet_numbers: editFormConfig.ewalletNumbers || {},
                                                require_proof_upload: editFormConfig.requireProofUpload ?? true,
                                                form_template: editFormConfig.formTemplate || 'modern',
                                                promo_text: editFormConfig.promoText || 'Promo Only!',
                                                promo_icon: editFormConfig.promoIcon || '🔥',
                                                updated_at: new Date().toISOString(),
                                            })
                                            .eq('id', editingForm.id);

                                        if (!error) {
                                            toast.success('Form updated successfully!');
                                            setEditingForm(null);
                                            setEditFormConfig(null);
                                            loadForms();
                                        } else {
                                            toast.error('Failed to update form');
                                        }
                                    } catch (err) {
                                        console.error('Error updating form:', err);
                                        toast.error('Failed to update form');
                                    } finally {
                                        setSaving(false);
                                    }
                                }}
                                disabled={saving}
                                className="px-6 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white rounded-xl font-medium transition-all shadow-lg disabled:opacity-50 flex items-center gap-2"
                            >
                                {saving ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Updating...
                                    </>
                                ) : (
                                    'Update Form'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Sales Summary Modal */}
            <SalesSummaryModal
                isOpen={!!salesSummaryForm}
                onClose={() => setSalesSummaryForm(null)}
                form={salesSummaryForm}
                currencySymbol={getCurrencySymbol(salesSummaryForm?.currency)}
            />
        </div>
    );
};

export default Forms;
