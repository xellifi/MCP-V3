import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Workspace, ConnectedPage } from '../types';
import { api } from '../services/api';
import {
    ShoppingBag, Search, Filter, Download, Eye, Check, X, Truck, Clock,
    Package, ChevronDown, ChevronUp, MoreHorizontal, RefreshCw, Calendar,
    User, Phone, Mail, MapPin, CreditCard, Tag, ChevronLeft, ChevronRight,
    AlertCircle, CheckCircle, XCircle, ArrowUpDown, ExternalLink, Printer,
    Pencil, Trash2, Save, AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';
import { useTheme } from '../context/ThemeContext';
import { useCurrency } from '../context/CurrencyContext';
import ShippingModal from '../components/ShippingModal';

interface OrdersProps {
    workspace: Workspace;
}

interface Order {
    id: string;
    workspace_id: string;
    subscriber_id: string;
    customer_name: string;
    customer_phone: string | null;
    customer_email: string | null;
    customer_address: string | null;
    items: any[];
    subtotal: number;
    shipping_fee: number;
    total: number;
    payment_method: string;
    payment_method_name: string;
    status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
    source: string;
    metadata: any;
    created_at: string;
    updated_at: string;
    page_id?: string;
}

const STATUS_CONFIG = {
    pending: { label: 'Pending', icon: Clock, color: 'amber', bg: 'bg-amber-500', text: 'text-white', border: 'border-transparent' },
    confirmed: { label: 'Confirmed', icon: Check, color: 'blue', bg: 'bg-blue-500', text: 'text-white', border: 'border-transparent' },
    shipped: { label: 'Shipped', icon: Truck, color: 'purple', bg: 'bg-purple-500', text: 'text-white', border: 'border-transparent' },
    delivered: { label: 'Delivered', icon: CheckCircle, color: 'emerald', bg: 'bg-emerald-500', text: 'text-white', border: 'border-transparent' },
    cancelled: { label: 'Cancelled', icon: XCircle, color: 'red', bg: 'bg-red-500', text: 'text-white', border: 'border-transparent' }
};

const PAYMENT_ICONS: Record<string, string> = {
    cod: '💵',
    gcash: '📱',
    bank: '🏦',
    card: '💳',
    paypal: '🅿️'
};

const Orders: React.FC<OrdersProps> = ({ workspace }) => {
    const { selectedCurrency } = useCurrency();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [pageFilter, setPageFilter] = useState<string>('all');
    const [pages, setPages] = useState<ConnectedPage[]>([]);
    const [showPageFilter, setShowPageFilter] = useState(false);
    const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
    const [sortField, setSortField] = useState<'created_at' | 'total' | 'customer_name'>('created_at');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
    const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [showFilters, setShowFilters] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
    const [editingOrder, setEditingOrder] = useState<Order | null>(null);
    const [deletingOrder, setDeletingOrder] = useState<Order | null>(null);
    const [editForm, setEditForm] = useState<Partial<Order>>({});
    const [isSaving, setIsSaving] = useState(false);

    // Shipping notification modal state
    const [shippingOrder, setShippingOrder] = useState<Order | null>(null);
    const [shippingInfo, setShippingInfo] = useState({
        carrier: 'J&T Express',
        customCarrier: '',
        trackingNumber: '',
        trackingUrl: '',
        notes: ''
    });
    const [sendingNotification, setSendingNotification] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    const ordersPerPage = 10;
    const { isDark } = useTheme();

    // Load orders
    const loadOrders = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('orders')
                .select('*, subscriber:subscribers(page_id, id)') // Keep subscriber join for old orders
                .eq('workspace_id', workspace.id)
                .order(sortField, { ascending: sortDirection === 'asc' });

            if (error) throw error;
            console.log('Fetched orders:', data?.length);
            setOrders(data || []);
        } catch (error) {
            console.error('Error loading orders:', error);
        } finally {
            setLoading(false);
        }
    }, [workspace.id, sortField, sortDirection]);

    // Load pages
    useEffect(() => {
        const loadPages = async () => {
            try {
                const allPages = await api.workspace.getConnectedPages(workspace.id);
                setPages(allPages.filter(p => p.isAutomationEnabled));
            } catch (error) {
                console.error('Error loading pages:', error);
            }
        };
        loadPages();
    }, [workspace.id]);

    useEffect(() => {
        loadOrders();
    }, [loadOrders]);

    // Filter and search orders
    const filteredOrders = useMemo(() => {
        let result = [...orders];

        // Search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(order =>
                order.id.toLowerCase().includes(query) ||
                order.customer_name?.toLowerCase().includes(query) ||
                order.customer_phone?.toLowerCase().includes(query) ||
                order.customer_email?.toLowerCase().includes(query)
            );
        }

        // Status filter
        if (statusFilter !== 'all') {
            result = result.filter(order => order.status === statusFilter);
        }

        // Page filter
        if (pageFilter !== 'all') {
            result = result.filter(order => {
                // 1. Check direct page_id (accurate for new orders)
                if (order.page_id === pageFilter) return true;

                // 2. Fallback: Check metadata (sometimes present)
                if (order.metadata?.pageId === pageFilter) return true;

                // 3. Fallback: Check subscriber data (legacy orders)
                const sub = (order as any).subscriber;
                const subscriber = Array.isArray(sub) ? sub[0] : sub;
                const subscriberPageId = subscriber?.page_id || subscriber?.pageId;

                return subscriberPageId === pageFilter;
            });
        }

        // Date filter
        if (dateFilter !== 'all') {
            const now = new Date();
            const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const startOfWeek = new Date(startOfToday);
            startOfWeek.setDate(startOfWeek.getDate() - 7);
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

            result = result.filter(order => {
                const orderDate = new Date(order.created_at);
                switch (dateFilter) {
                    case 'today': return orderDate >= startOfToday;
                    case 'week': return orderDate >= startOfWeek;
                    case 'month': return orderDate >= startOfMonth;
                    default: return true;
                }
            });
        }

        return result;
    }, [orders, searchQuery, statusFilter, dateFilter, pageFilter]);

    // Pagination
    const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);
    const paginatedOrders = filteredOrders.slice(
        (currentPage - 1) * ordersPerPage,
        currentPage * ordersPerPage
    );

    // Statistics (Calculate based on FILTERED orders)
    const stats = useMemo(() => {
        const pending = filteredOrders.filter(o => o.status === 'pending').length;
        const confirmed = filteredOrders.filter(o => o.status === 'confirmed').length;
        const shipped = filteredOrders.filter(o => o.status === 'shipped').length;
        const delivered = filteredOrders.filter(o => o.status === 'delivered').length;
        const totalRevenue = filteredOrders.filter(o => o.status !== 'cancelled').reduce((sum, o) => sum + o.total, 0);
        return { pending, confirmed, shipped, delivered, totalRevenue, total: filteredOrders.length };
    }, [filteredOrders]);

    // Update order status
    const updateOrderStatus = async (orderId: string, newStatus: string) => {
        // If changing to 'shipped', open shipping modal instead
        if (newStatus === 'shipped') {
            const order = orders.find(o => o.id === orderId);
            if (order) {
                setShippingOrder(order);
                setShippingInfo({ carrier: 'J&T Express', customCarrier: '', trackingNumber: '', trackingUrl: '', notes: '' });
                return; // Don't update status yet - wait for modal submission
            }
        }

        setUpdatingStatus(orderId);
        try {
            const { error } = await supabase
                .from('orders')
                .update({ status: newStatus, updated_at: new Date().toISOString() })
                .eq('id', orderId);

            if (error) throw error;

            // Update local state
            setOrders(prev => prev.map(order =>
                order.id === orderId ? { ...order, status: newStatus as any } : order
            ));

            if (selectedOrder?.id === orderId) {
                setSelectedOrder(prev => prev ? { ...prev, status: newStatus as any } : null);
            }

            // Send Messenger notification for confirmed, delivered, cancelled statuses
            const notifyStatuses = ['confirmed', 'delivered', 'cancelled'];
            if (notifyStatuses.includes(newStatus)) {
                const order = orders.find(o => o.id === orderId);
                if (order) {
                    // Get the page ID from order
                    let pageId = order.page_id;
                    if (!pageId) {
                        const sub = (order as any).subscriber;
                        const subscriber = Array.isArray(sub) ? sub[0] : sub;
                        pageId = subscriber?.page_id;
                    }
                    if (!pageId && pages.length > 0) {
                        pageId = pages[0].id;
                    }

                    if (pageId && order.subscriber_id) {
                        try {
                            const notifyResponse = await fetch('/api/messenger/send-tracking', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    subscriberId: order.subscriber_id,
                                    pageId: pageId,
                                    orderId: order.id,
                                    customerName: order.customer_name,
                                    items: order.items,
                                    total: order.total,
                                    status: newStatus,
                                    workspaceId: workspace.id
                                })
                            });

                            const notifyResult = await notifyResponse.json();
                            if (notifyResponse.ok) {
                                console.log(`[Orders] ✓ ${newStatus} notification sent`);
                                setToast({ message: `Customer notified: Order ${STATUS_CONFIG[newStatus as keyof typeof STATUS_CONFIG]?.label || newStatus}!`, type: 'success' });
                            } else {
                                console.error(`[Orders] Failed to send ${newStatus} notification:`, notifyResult);
                            }
                        } catch (notifyError) {
                            console.error(`[Orders] Error sending ${newStatus} notification:`, notifyError);
                        }
                    }
                }
            }

            // Also update Google Sheets if webhook is configured
            try {
                // Convert status ID to label (e.g., 'confirmed' -> 'Confirmed')
                const statusLabel = STATUS_CONFIG[newStatus as keyof typeof STATUS_CONFIG]?.label || newStatus;

                const sheetsResponse = await fetch('/api/sheets/sync', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'updateStatus',
                        orderId: orderId,
                        newStatus: statusLabel, // Send display label, not ID
                        updatedAt: new Date().toISOString(),
                        workspaceId: workspace.id // Help API find webhook URL
                    })
                });
                const sheetsResult = await sheetsResponse.json();
                if (sheetsResult.success) {
                    console.log('[Orders] ✓ Status synced to Google Sheets');
                } else {
                    console.log('[Orders] Google Sheets sync result:', sheetsResult);
                }
            } catch (sheetsError) {
                console.log('[Orders] Google Sheets sync skipped (not configured or failed):', sheetsError);
            }
        } catch (error) {
            console.error('Error updating order status:', error);
        } finally {
            setUpdatingStatus(null);
        }
    };


    // Bulk status update
    const bulkUpdateStatus = async (newStatus: string) => {
        if (selectedOrders.size === 0) return;

        const orderIds = Array.from(selectedOrders);
        try {
            const { error } = await supabase
                .from('orders')
                .update({ status: newStatus, updated_at: new Date().toISOString() })
                .in('id', orderIds);

            if (error) throw error;

            setOrders(prev => prev.map(order =>
                selectedOrders.has(order.id) ? { ...order, status: newStatus as any } : order
            ));
            setSelectedOrders(new Set());

            // Also update Google Sheets for each order
            const statusLabel = STATUS_CONFIG[newStatus as keyof typeof STATUS_CONFIG]?.label || newStatus;
            for (const orderId of orderIds) {
                try {
                    await fetch('/api/sheets/sync', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            action: 'updateStatus',
                            orderId: orderId,
                            newStatus: statusLabel, // Send display label
                            updatedAt: new Date().toISOString(),
                            workspaceId: workspace.id
                        })
                    });
                } catch (sheetsError) {
                    // Ignore individual errors, continue with other orders
                }
            }
            console.log('[Orders] Bulk status synced to Google Sheets');
        } catch (error) {
            console.error('Error bulk updating orders:', error);
        }
    };

    // Edit order
    const handleEditOrder = (order: Order) => {
        setEditForm({
            customer_name: order.customer_name,
            customer_phone: order.customer_phone,
            customer_email: order.customer_email,
            customer_address: order.customer_address,
            shipping_fee: order.shipping_fee,
            status: order.status
        });
        setEditingOrder(order);
    };

    // Save edited order
    const saveEditedOrder = async () => {
        if (!editingOrder) return;

        setIsSaving(true);
        try {
            // Calculate new total if shipping fee changed
            const newShippingFee = editForm.shipping_fee ?? editingOrder.shipping_fee;
            const newTotal = editingOrder.subtotal + newShippingFee;

            const updateData = {
                customer_name: editForm.customer_name,
                customer_phone: editForm.customer_phone,
                customer_email: editForm.customer_email,
                customer_address: editForm.customer_address,
                shipping_fee: newShippingFee,
                total: newTotal,
                status: editForm.status,
                updated_at: new Date().toISOString()
            };

            const { error } = await supabase
                .from('orders')
                .update(updateData)
                .eq('id', editingOrder.id);

            if (error) throw error;

            // Update local state
            setOrders(prev => prev.map(order =>
                order.id === editingOrder.id ? { ...order, ...updateData } : order
            ));

            // Update selected order if viewing
            if (selectedOrder?.id === editingOrder.id) {
                setSelectedOrder({ ...selectedOrder, ...updateData } as Order);
            }

            // Sync status change to Google Sheets if status was updated
            if (editForm.status && editForm.status !== editingOrder.status) {
                const statusLabel = STATUS_CONFIG[editForm.status as keyof typeof STATUS_CONFIG]?.label || editForm.status;
                try {
                    await fetch('/api/sheets/sync', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            action: 'updateStatus',
                            orderId: editingOrder.id,
                            newStatus: statusLabel,
                            updatedAt: new Date().toISOString(),
                            workspaceId: workspace.id
                        })
                    });
                } catch (sheetsError) {
                    console.error('[Orders] Failed to sync edit to Sheets:', sheetsError);
                }
            }

            setEditingOrder(null);
            console.log('[Orders] Order updated successfully');
        } catch (error) {
            console.error('Error updating order:', error);
        } finally {
            setIsSaving(false);
        }
    };

    // Delete order
    const deleteOrder = async () => {
        if (!deletingOrder) return;

        setIsSaving(true);
        try {
            const { error } = await supabase
                .from('orders')
                .delete()
                .eq('id', deletingOrder.id);

            if (error) throw error;

            // Update local state
            setOrders(prev => prev.filter(order => order.id !== deletingOrder.id));

            // Close detail modal if viewing the deleted order
            if (selectedOrder?.id === deletingOrder.id) {
                setSelectedOrder(null);
            }

            // Sync deletion to Google Sheets
            try {
                await fetch('/api/sheets/sync', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'deleteOrder',
                        orderId: deletingOrder.id,
                        workspaceId: workspace.id
                    })
                });
                console.log('[Orders] Order deletion synced to Google Sheets');
            } catch (sheetsError) {
                console.error('[Orders] Failed to sync deletion to Sheets:', sheetsError);
            }

            setDeletingOrder(null);
            console.log('[Orders] Order deleted successfully');
        } catch (error) {
            console.error('Error deleting order:', error);
        } finally {
            setIsSaving(false);
        }
    };

    // Export orders to CSV
    const exportToCSV = () => {
        const headers = ['Order ID', 'Date', 'Customer', 'Phone', 'Email', 'Address', 'Items', 'Subtotal', 'Shipping', 'Total', 'Payment', 'Status'];
        const rows = filteredOrders.map(order => [
            order.id,
            format(new Date(order.created_at), 'yyyy-MM-dd HH:mm'),
            order.customer_name || '',
            order.customer_phone || '',
            order.customer_email || '',
            order.customer_address || '',
            (order.items || []).map(i => `${i.productName} x${i.quantity}`).join('; '),
            order.subtotal.toFixed(2),
            order.shipping_fee.toFixed(2),
            order.total.toFixed(2),
            order.payment_method_name || order.payment_method,
            order.status
        ]);

        const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `orders_${format(new Date(), 'yyyy-MM-dd')}.csv`;
        link.click();
    };

    // Toggle sort
    const toggleSort = (field: typeof sortField) => {
        if (sortField === field) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('desc');
        }
    };

    // Select all on current page
    const toggleSelectAll = () => {
        if (selectedOrders.size === paginatedOrders.length) {
            setSelectedOrders(new Set());
        } else {
            setSelectedOrders(new Set(paginatedOrders.map(o => o.id)));
        }
    };

    // Order Detail Modal
    const OrderDetailModal = () => {
        if (!selectedOrder) return null;

        const statusKey = selectedOrder.status && STATUS_CONFIG[selectedOrder.status] ? selectedOrder.status : 'pending';
        const statusConfig = STATUS_CONFIG[statusKey];
        const StatusIcon = statusConfig.icon;

        return (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedOrder(null)}>
                <div className={`rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden border shadow-2xl ${isDark ? 'bg-slate-800 border-white/10' : 'bg-white border-slate-200'}`} onClick={e => e.stopPropagation()}>
                    {/* Header */}
                    <div className={`p-6 border-b flex items-center justify-between ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                        <div>
                            <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Order Details</h2>
                            <p className={`text-sm font-mono mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{selectedOrder.id}</p>
                        </div>
                        <button onClick={() => setSelectedOrder(null)} className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-white/10' : 'hover:bg-slate-100'}`}>
                            <X className={`w-5 h-5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 overflow-y-auto max-h-[60vh] space-y-6">
                        {/* Status & Date */}
                        <div className="flex items-center justify-between">
                            <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${statusConfig.bg} ${statusConfig.border} border`}>
                                <StatusIcon className={`w-4 h-4 ${statusConfig.text}`} />
                                <span className={`font-medium ${statusConfig.text}`}>{statusConfig.label}</span>
                            </div>
                            <div className="text-slate-400 text-sm flex items-center gap-2">
                                <Calendar className="w-4 h-4" />
                                {format(new Date(selectedOrder.created_at), 'MMM dd, yyyy HH:mm')}
                            </div>
                        </div>

                        {/* Customer Info */}
                        <div className={`rounded-xl p-4 space-y-3 ${isDark ? 'bg-black/20' : 'bg-slate-50'}`}>
                            <h3 className={`font-semibold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                <User className="w-4 h-4 text-emerald-400" />
                                Customer Information
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                                <div className={`flex items-center gap-2 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                                    <User className="w-4 h-4 text-slate-500" />
                                    {selectedOrder.customer_name || 'N/A'}
                                </div>
                                {selectedOrder.customer_phone && (
                                    <div className={`flex items-center gap-2 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                                        <Phone className="w-4 h-4 text-slate-500" />
                                        {selectedOrder.customer_phone}
                                    </div>
                                )}
                                {selectedOrder.customer_email && (
                                    <div className={`flex items-center gap-2 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                                        <Mail className="w-4 h-4 text-slate-500" />
                                        {selectedOrder.customer_email}
                                    </div>
                                )}
                                {selectedOrder.customer_address && (
                                    <div className={`flex items-start gap-2 col-span-2 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                                        <MapPin className="w-4 h-4 text-slate-500 mt-0.5" />
                                        {selectedOrder.customer_address}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Order Items */}
                        <div className={`rounded-xl p-4 space-y-3 ${isDark ? 'bg-black/20' : 'bg-slate-50'}`}>
                            <h3 className={`font-semibold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                <Package className="w-4 h-4 text-emerald-400" />
                                Order Items
                            </h3>
                            <div className="space-y-2">
                                {selectedOrder.items.map((item, idx) => (
                                    <div key={idx} className={`flex items-center justify-between py-2 border-b last:border-0 ${isDark ? 'border-white/5' : 'border-slate-200'}`}>
                                        <div className="flex items-center gap-3">
                                            {item.productImage ? (
                                                <img src={item.productImage} alt="" className="w-10 h-10 rounded-lg object-cover" />
                                            ) : (
                                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isDark ? 'bg-slate-600' : 'bg-slate-200'}`}>
                                                    <Package className={`w-5 h-5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
                                                </div>
                                            )}
                                            <div>
                                                <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>{item.productName}</p>
                                                <p className="text-slate-500 text-xs">Qty: {item.quantity || 1}</p>
                                            </div>
                                        </div>
                                        <p className="text-emerald-400 font-semibold">{selectedCurrency} {(item.productPrice * (item.quantity || 1)).toLocaleString()}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Payment & Totals */}
                        <div className={`rounded-xl p-4 space-y-3 ${isDark ? 'bg-black/20' : 'bg-slate-50'}`}>
                            <h3 className={`font-semibold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                <CreditCard className="w-4 h-4 text-emerald-400" />
                                Payment Summary
                            </h3>
                            <div className="space-y-2 text-sm">
                                <div className={`flex justify-between ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                                    <span>Subtotal</span>
                                    <span>{selectedCurrency} {selectedOrder.subtotal.toLocaleString()}</span>
                                </div>
                                <div className={`flex justify-between ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                                    <span>Shipping</span>
                                    <span className={selectedOrder.shipping_fee === 0 ? 'text-emerald-400' : ''}>
                                        {selectedOrder.shipping_fee === 0 ? 'FREE' : `${selectedCurrency} ${selectedOrder.shipping_fee.toLocaleString()}`}
                                    </span>
                                </div>
                                {selectedOrder.metadata?.discount > 0 && (
                                    <div className="flex justify-between text-emerald-400">
                                        <span className="flex items-center gap-1">
                                            <Tag className="w-3 h-3" />
                                            Discount
                                            {selectedOrder.metadata?.promoCode && <span className="text-xs opacity-75">({selectedOrder.metadata.promoCode})</span>}
                                        </span>
                                        <span>-{selectedCurrency} {selectedOrder.metadata.discount.toLocaleString()}</span>
                                    </div>
                                )}
                                <div className={`flex justify-between font-bold text-lg pt-2 border-t ${isDark ? 'text-white border-white/10' : 'text-slate-900 border-slate-200'}`}>
                                    <span>Total</span>
                                    <span className="text-emerald-400">{selectedCurrency} {selectedOrder.total.toLocaleString()}</span>
                                </div>
                                <div className={`flex items-center gap-2 pt-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                    <span className="text-lg">{PAYMENT_ICONS[selectedOrder.payment_method] || '💳'}</span>
                                    <span>{selectedOrder.payment_method_name || selectedOrder.payment_method}</span>
                                </div>
                            </div>
                        </div>

                        {/* Payment Proof */}
                        {selectedOrder.metadata?.payment?.proofUrl && (
                            <div className={`rounded-xl p-4 ${isDark ? 'bg-black/20' : 'bg-indigo-50 border border-indigo-100'}`}>
                                <h3 className={`font-semibold mb-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>Payment Proof</h3>
                                <a
                                    href={selectedOrder.metadata.payment.proofUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`flex items-center gap-2 text-sm ${isDark ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-500'}`}
                                >
                                    <ExternalLink className="w-4 h-4" />
                                    View Payment Proof
                                </a>
                            </div>
                        )}
                    </div>

                    {/* Footer Actions */}
                    <div className={`p-6 border-t flex items-center justify-between gap-4 ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                        <div className="flex items-center gap-2">
                            <span className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Update Status:</span>
                            <select
                                value={selectedOrder.status}
                                onChange={(e) => updateOrderStatus(selectedOrder.id, e.target.value)}
                                disabled={updatingStatus === selectedOrder.id}
                                className={`px-3 py-2 border rounded-lg text-sm focus:outline-none focus:border-emerald-500 ${isDark ? 'bg-black/30 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
                            >
                                {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                                    <option key={key} value={key}>{config.label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => { setSelectedOrder(null); handleEditOrder(selectedOrder); }}
                                className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-colors"
                            >
                                <Pencil className="w-4 h-4" />
                                Edit
                            </button>
                            <button
                                onClick={() => { setSelectedOrder(null); setDeletingOrder(selectedOrder); }}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors border ${isDark ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400 border-red-500/30' : 'bg-red-50 hover:bg-red-100 text-red-600 border-red-200'}`}
                            >
                                <Trash2 className="w-4 h-4" />
                                Delete
                            </button>
                            <button
                                onClick={() => window.print()}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'}`}
                            >
                                <Printer className="w-4 h-4" />
                                Print
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // Edit Order Modal
    const EditOrderModal = () => {
        if (!editingOrder) return null;

        return (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setEditingOrder(null)}>
                <div className={`rounded-2xl w-full max-w-lg overflow-hidden border shadow-2xl ${isDark ? 'bg-slate-800 border-white/10' : 'bg-white border-slate-200'}`} onClick={e => e.stopPropagation()}>
                    {/* Header */}
                    <div className={`p-6 border-b flex items-center justify-between ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-500/20 rounded-lg">
                                <Pencil className="w-5 h-5 text-indigo-400" />
                            </div>
                            <div>
                                <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Edit Order</h2>
                                <p className={`text-sm font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{editingOrder.id}</p>
                            </div>
                        </div>
                        <button onClick={() => setEditingOrder(null)} className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-white/10' : 'hover:bg-slate-100'}`}>
                            <X className={`w-5 h-5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
                        </button>
                    </div>

                    {/* Form */}
                    <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                        <div>
                            <label className={`block text-sm mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>Customer Name</label>
                            <input
                                type="text"
                                value={editForm.customer_name || ''}
                                onChange={(e) => setEditForm({ ...editForm, customer_name: e.target.value })}
                                className={`w-full px-4 py-2.5 rounded-lg focus:outline-none focus:border-indigo-500 border ${isDark ? 'bg-black/30 border-white/10 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={`block text-sm mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>Phone</label>
                                <input
                                    type="text"
                                    value={editForm.customer_phone || ''}
                                    onChange={(e) => setEditForm({ ...editForm, customer_phone: e.target.value })}
                                    className={`w-full px-4 py-2.5 rounded-lg focus:outline-none focus:border-indigo-500 border ${isDark ? 'bg-black/30 border-white/10 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
                                />
                            </div>
                            <div>
                                <label className={`block text-sm mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>Email</label>
                                <input
                                    type="email"
                                    value={editForm.customer_email || ''}
                                    onChange={(e) => setEditForm({ ...editForm, customer_email: e.target.value })}
                                    className={`w-full px-4 py-2.5 rounded-lg focus:outline-none focus:border-indigo-500 border ${isDark ? 'bg-black/30 border-white/10 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
                                />
                            </div>
                        </div>
                        <div>
                            <label className={`block text-sm mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>Address</label>
                            <textarea
                                value={editForm.customer_address || ''}
                                onChange={(e) => setEditForm({ ...editForm, customer_address: e.target.value })}
                                rows={2}
                                className={`w-full px-4 py-2.5 rounded-lg focus:outline-none focus:border-indigo-500 resize-none border ${isDark ? 'bg-black/30 border-white/10 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={`block text-sm mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>Shipping Fee</label>
                                <input
                                    type="number"
                                    value={editForm.shipping_fee || 0}
                                    onChange={(e) => setEditForm({ ...editForm, shipping_fee: parseFloat(e.target.value) || 0 })}
                                    className={`w-full px-4 py-2.5 rounded-lg focus:outline-none focus:border-indigo-500 border ${isDark ? 'bg-black/30 border-white/10 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
                                />
                            </div>
                            <div>
                                <label className={`block text-sm mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>Status</label>
                                <select
                                    value={editForm.status || 'pending'}
                                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value as any })}
                                    className={`w-full px-4 py-2.5 rounded-lg focus:outline-none focus:border-indigo-500 border ${isDark ? 'bg-black/30 border-white/10 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
                                >
                                    {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                                        <option key={key} value={key}>{config.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Order Summary (read-only) */}
                        <div className={`rounded-xl p-4 mt-4 ${isDark ? 'bg-black/20' : 'bg-slate-50'}`}>
                            <h4 className={`font-medium mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>Order Summary</h4>
                            <div className={`text-sm space-y-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                <div className="flex justify-between">
                                    <span>Subtotal:</span>
                                    <span className={isDark ? 'text-white' : 'text-slate-900'}>₱{editingOrder.subtotal.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Shipping:</span>
                                    <span className={isDark ? 'text-white' : 'text-slate-900'}>₱{(editForm.shipping_fee ?? editingOrder.shipping_fee).toLocaleString()}</span>
                                </div>
                                <div className={`flex justify-between pt-2 border-t font-bold ${isDark ? 'border-white/10 text-white' : 'border-slate-200 text-slate-900'}`}>
                                    <span>Total:</span>
                                    <span className="text-emerald-400">₱{(editingOrder.subtotal + (editForm.shipping_fee ?? editingOrder.shipping_fee)).toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className={`p-6 border-t flex items-center justify-end gap-3 ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                        <button
                            onClick={() => setEditingOrder(null)}
                            className={`px-4 py-2 rounded-lg transition-colors ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'}`}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={saveEditedOrder}
                            disabled={isSaving}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white rounded-lg transition-colors"
                        >
                            <Save className="w-4 h-4" />
                            {isSaving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    // Delete Confirmation Modal
    const DeleteConfirmModal = () => {
        if (!deletingOrder) return null;

        return (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setDeletingOrder(null)}>
                <div className={`rounded-2xl w-full max-w-md overflow-hidden border shadow-2xl ${isDark ? 'bg-slate-800 border-white/10' : 'bg-white border-slate-200'}`} onClick={e => e.stopPropagation()}>
                    {/* Header */}
                    <div className="p-6 text-center">
                        <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertTriangle className="w-8 h-8 text-red-400" />
                        </div>
                        <h2 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>Delete Order?</h2>
                        <p className={isDark ? 'text-slate-400' : 'text-slate-600'}>
                            Are you sure you want to delete order <span className={`font-mono ${isDark ? 'text-white' : 'text-slate-900'}`}>{deletingOrder.id.slice(0, 12)}...</span>?
                        </p>
                        <p className="text-red-400 text-sm mt-2">This action cannot be undone.</p>
                    </div>

                    {/* Order Info */}
                    <div className={`mx-6 p-4 rounded-xl mb-6 ${isDark ? 'bg-black/20' : 'bg-slate-50'}`}>
                        <div className="text-sm space-y-2">
                            <div className="flex justify-between">
                                <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>Customer:</span>
                                <span className={isDark ? 'text-white' : 'text-slate-900'}>{deletingOrder.customer_name}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>Total:</span>
                                <span className="text-emerald-400 font-bold">₱{deletingOrder.total.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>Items:</span>
                                <span className={isDark ? 'text-white' : 'text-slate-900'}>{deletingOrder.items.length} item(s)</span>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className={`p-6 border-t flex items-center justify-end gap-3 ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                        <button
                            onClick={() => setDeletingOrder(null)}
                            className={`px-4 py-2 rounded-lg transition-colors ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'}`}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={deleteOrder}
                            disabled={isSaving}
                            className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white rounded-lg transition-colors"
                        >
                            <Trash2 className="w-4 h-4" />
                            {isSaving ? 'Deleting...' : 'Delete Order'}
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    // Send shipping notification and update status
    const handleSendShippingNotification = async () => {
        if (!shippingOrder || !shippingInfo.trackingNumber.trim()) {
            return;
        }

        setSendingNotification(true);
        try {
            // Get the page ID from order (check direct page_id first, then subscriber)
            let pageId = shippingOrder.page_id;
            if (!pageId) {
                const sub = (shippingOrder as any).subscriber;
                const subscriber = Array.isArray(sub) ? sub[0] : sub;
                pageId = subscriber?.page_id;
            }

            if (!pageId) {
                // Get page from pages array if order doesn't have it
                if (pages.length > 0) {
                    pageId = pages[0].id;
                }
            }

            // Send notification via API
            const response = await fetch('/api/messenger/send-tracking', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    subscriberId: shippingOrder.subscriber_id,
                    pageId: pageId,
                    orderId: shippingOrder.id,
                    customerName: shippingOrder.customer_name,
                    items: shippingOrder.items,
                    total: shippingOrder.total,
                    status: 'shipped',
                    carrier: shippingInfo.carrier === 'Other' ? shippingInfo.customCarrier : shippingInfo.carrier,
                    trackingNumber: shippingInfo.trackingNumber,
                    trackingUrl: shippingInfo.trackingUrl,
                    notes: shippingInfo.notes,
                    workspaceId: workspace.id
                })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to send notification');
            }

            console.log('[Orders] ✓ Shipping notification sent:', result);

            // Update local state
            setOrders(prev => prev.map(order =>
                order.id === shippingOrder.id ? { ...order, status: 'shipped' as any } : order
            ));

            if (selectedOrder?.id === shippingOrder.id) {
                setSelectedOrder(prev => prev ? { ...prev, status: 'shipped' as any } : null);
            }

            // Also sync to Google Sheets
            try {
                await fetch('/api/sheets/sync', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'updateStatus',
                        orderId: shippingOrder.id,
                        newStatus: 'Shipped',
                        updatedAt: new Date().toISOString(),
                        workspaceId: workspace.id
                    })
                });
            } catch (sheetsError) {
                console.log('[Orders] Google Sheets sync error:', sheetsError);
            }

            // Close modal
            setShippingOrder(null);

            setToast({ message: 'Shipping notification sent successfully!', type: 'success' });

        } catch (error: any) {
            console.error('[Orders] Error sending notification:', error);
            setToast({ message: `Failed to send notification: ${error.message}`, type: 'error' });
        } finally {
            setSendingNotification(false);
        }
    };

    // Shipping modal and logic moved to ShippingModal component

    return (
        <div className="space-y-6 animate-fade-in pb-12">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
                <div>
                    <h1 className={`text-3xl lg:text-4xl font-bold tracking-tight mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>Order Management</h1>
                    <p className={`${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Manage and track all your customer orders</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={loadOrders}
                        disabled={loading}
                        className={`flex items-center gap-2 px-4 py-2.5 border rounded-xl transition-colors ${isDark
                            ? 'bg-slate-700/50 hover:bg-slate-700 border-white/10 text-white'
                            : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                            }`}
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                    <button
                        onClick={exportToCSV}
                        className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 rounded-xl text-white font-medium transition-colors"
                    >
                        <Download className="w-4 h-4" />
                        Export CSV
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className={`p-4 rounded-xl border ${isDark ? 'glass-panel border-white/10' : 'bg-white border-slate-200 shadow-sm'}`}>
                    <p className={`text-xs uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Total Orders</p>
                    <p className={`text-2xl font-bold mt-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>{stats.total}</p>
                </div>
                <div className={`p-4 rounded-xl border ${isDark ? 'glass-panel border-amber-500/20' : 'bg-amber-50 border-amber-200'}`}>
                    <p className={`text-xs uppercase tracking-wider ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>Pending</p>
                    <p className={`text-2xl font-bold mt-1 ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>{stats.pending}</p>
                </div>
                <div className={`p-4 rounded-xl border ${isDark ? 'glass-panel border-blue-500/20' : 'bg-blue-50 border-blue-200'}`}>
                    <p className={`text-xs uppercase tracking-wider ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>Confirmed</p>
                    <p className={`text-2xl font-bold mt-1 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>{stats.confirmed}</p>
                </div>
                <div className={`p-4 rounded-xl border ${isDark ? 'glass-panel border-purple-500/20' : 'bg-purple-50 border-purple-200'}`}>
                    <p className={`text-xs uppercase tracking-wider ${isDark ? 'text-purple-400' : 'text-purple-600'}`}>Shipped</p>
                    <p className={`text-2xl font-bold mt-1 ${isDark ? 'text-purple-400' : 'text-purple-600'}`}>{stats.shipped}</p>
                </div>
                <div className={`p-4 rounded-xl border ${isDark ? 'glass-panel border-emerald-500/20' : 'bg-emerald-50 border-emerald-200'}`}>
                    <p className={`text-xs uppercase tracking-wider ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>Delivered</p>
                    <p className={`text-2xl font-bold mt-1 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>{stats.delivered}</p>
                </div>
                <div className={`p-4 rounded-xl border ${isDark ? 'glass-panel border-white/10' : 'bg-white border-slate-200 shadow-sm'}`}>
                    <p className={`text-xs uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Revenue</p>
                    <p className={`text-2xl font-bold mt-1 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>₱{stats.totalRevenue.toLocaleString()}</p>
                </div>
            </div>

            {/* Filters & Search */}
            <div className={`rounded-xl border p-4 relative z-30 ${isDark ? 'glass-panel border-white/10' : 'bg-white border-slate-200 can-shadow'}`}>
                <div className="flex flex-col lg:flex-row gap-4">
                    {/* Search */}
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by Order ID, Customer, Phone, Email..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className={`w-full pl-10 pr-4 py-3 border rounded-xl outline-none focus:border-emerald-500/50 ${isDark
                                ? 'bg-black/30 border-white/10 text-white placeholder-slate-500'
                                : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'
                                }`}
                        />
                    </div>

                    {/* Page Filter */}
                    <div className="relative">
                        <button
                            onClick={() => setShowPageFilter(!showPageFilter)}
                            className={`flex items-center gap-2 px-4 py-3 border rounded-xl transition-colors min-w-[200px] justify-between ${isDark
                                ? 'bg-black/30 border-white/10 text-white hover:bg-white/5'
                                : 'bg-white border-slate-200 text-slate-900 hover:bg-slate-50'
                                }`}
                        >
                            <div className="flex items-center gap-2 overflow-hidden">
                                {pageFilter === 'all' ? (
                                    <>
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${isDark ? 'bg-white/10' : 'bg-slate-100'}`}>
                                            <ShoppingBag className="w-3.5 h-3.5" />
                                        </div>
                                        <span className="truncate">All Pages</span>
                                    </>
                                ) : (
                                    (() => {
                                        const page = pages.find(p => p.pageId === pageFilter);
                                        return page ? (
                                            <>
                                                <img src={page.pageImageUrl} alt="" className="w-6 h-6 rounded-full object-cover" />
                                                <span className="truncate">{page.name}</span>
                                            </>
                                        ) : (
                                            <span>Select Page</span>
                                        );
                                    })()
                                )}
                            </div>
                            <ChevronDown className={`w-4 h-4 transition-transform ${showPageFilter ? 'rotate-180' : ''}`} />
                        </button>

                        {showPageFilter && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setShowPageFilter(false)} />
                                <div className={`absolute top-full left-0 mt-2 w-full min-w-[240px] rounded-xl border shadow-xl z-50 overflow-hidden ${isDark ? 'bg-slate-800 border-white/10 shadow-2xl shadow-black/50' : 'bg-white border-slate-200'}`}>
                                    <div className="max-h-[300px] overflow-y-auto p-1">
                                        <button
                                            onClick={() => { setPageFilter('all'); setShowPageFilter(false); }}
                                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${pageFilter === 'all'
                                                ? isDark ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-50 text-indigo-600'
                                                : isDark ? 'text-slate-300 hover:bg-white/5' : 'text-slate-700 hover:bg-slate-50'
                                                }`}
                                        >
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${pageFilter === 'all' ? (isDark ? 'bg-indigo-500/20' : 'bg-indigo-100') : (isDark ? 'bg-white/5' : 'bg-slate-100')}`}>
                                                <ShoppingBag className="w-4 h-4" />
                                            </div>
                                            <span className="font-medium">All Pages</span>
                                        </button>

                                        {pages.map(page => (
                                            <button
                                                key={page.id}
                                                onClick={() => { setPageFilter(page.pageId); setShowPageFilter(false); }}
                                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${pageFilter === page.pageId
                                                    ? isDark ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-50 text-indigo-600'
                                                    : isDark ? 'text-slate-300 hover:bg-white/5' : 'text-slate-700 hover:bg-slate-50'
                                                    }`}
                                            >
                                                <img src={page.pageImageUrl} alt="" className="w-8 h-8 rounded-full object-cover shadow-sm" />
                                                <div className="text-left overflow-hidden">
                                                    <p className="font-medium truncate">{page.name}</p>
                                                    <p className="text-xs opacity-70 truncate">ID: {page.pageId}</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Status Filter */}
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className={`px-4 py-3 border rounded-xl outline-none focus:border-emerald-500/50 ${isDark
                            ? 'bg-black/30 border-white/10 text-white'
                            : 'bg-white border-slate-200 text-slate-900'
                            }`}
                    >
                        <option value="all">All Status</option>
                        {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                            <option key={key} value={key}>{config.label}</option>
                        ))}
                    </select>

                    {/* Date Filter */}
                    <select
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value as any)}
                        className={`px-4 py-3 border rounded-xl outline-none focus:border-emerald-500/50 ${isDark
                            ? 'bg-black/30 border-white/10 text-white'
                            : 'bg-white border-slate-200 text-slate-900'
                            }`}
                    >
                        <option value="all">All Time</option>
                        <option value="today">Today</option>
                        <option value="week">Last 7 Days</option>
                        <option value="month">This Month</option>
                    </select>
                </div>

                {/* Bulk Actions */}
                {selectedOrders.size > 0 && (
                    <div className={`mt-4 pt-4 border-t flex items-center gap-4 ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                        <span className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{selectedOrders.size} selected</span>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => bulkUpdateStatus('confirmed')}
                                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${isDark ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}
                            >
                                Confirm
                            </button>
                            <button
                                onClick={() => bulkUpdateStatus('shipped')}
                                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${isDark ? 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30' : 'bg-purple-50 text-purple-600 hover:bg-purple-100'}`}
                            >
                                Ship
                            </button>
                            <button
                                onClick={() => bulkUpdateStatus('delivered')}
                                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${isDark ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}
                            >
                                Deliver
                            </button>
                            <button
                                onClick={() => bulkUpdateStatus('cancelled')}
                                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${isDark ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Orders Table */}
            <div className={`rounded-xl border overflow-hidden ${isDark ? 'glass-panel border-white/10' : 'bg-white border-slate-200 shadow-sm'}`}>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className={`border-b text-left ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                                <th className="p-4">
                                    <input
                                        type="checkbox"
                                        checked={selectedOrders.size === paginatedOrders.length && paginatedOrders.length > 0}
                                        onChange={toggleSelectAll}
                                        className={`w-4 h-4 rounded focus:ring-emerald-500/30 ${isDark ? 'bg-black/30 border-slate-600 text-emerald-500' : 'bg-white border-slate-300 text-emerald-600'}`}
                                    />
                                </th>
                                <th className={`p-4 font-medium text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                    <button onClick={() => toggleSort('created_at')} className={`flex items-center gap-1 transition-colors ${isDark ? 'hover:text-white' : 'hover:text-slate-900'}`}>
                                        Order
                                        <ArrowUpDown className="w-3 h-3" />
                                    </button>
                                </th>
                                <th className={`p-4 font-medium text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                    <button onClick={() => toggleSort('customer_name')} className={`flex items-center gap-1 transition-colors ${isDark ? 'hover:text-white' : 'hover:text-slate-900'}`}>
                                        Customer
                                        <ArrowUpDown className="w-3 h-3" />
                                    </button>
                                </th>
                                <th className={`p-4 font-medium text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Items</th>
                                <th className={`p-4 font-medium text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                    <button onClick={() => toggleSort('total')} className={`flex items-center gap-1 transition-colors ${isDark ? 'hover:text-white' : 'hover:text-slate-900'}`}>
                                        Total
                                        <ArrowUpDown className="w-3 h-3" />
                                    </button>
                                </th>
                                <th className={`p-4 font-medium text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Payment</th>
                                <th className={`p-4 font-medium text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Status</th>
                                <th className={`p-4 font-medium text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                Array.from({ length: 5 }).map((_, idx) => (
                                    <tr key={idx} className="border-b border-white/5">
                                        <td colSpan={8} className="p-4">
                                            <div className="h-12 bg-white/5 animate-pulse rounded-lg" />
                                        </td>
                                    </tr>
                                ))
                            ) : paginatedOrders.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="p-12 text-center">
                                        <ShoppingBag className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                                        <p className="text-slate-400 font-medium">No orders found</p>
                                        <p className="text-slate-500 text-sm mt-1">Orders will appear here when customers complete checkout</p>
                                    </td>
                                </tr>
                            ) : (
                                paginatedOrders.map((order) => {
                                    const statusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
                                    const StatusIcon = statusConfig.icon;
                                    return (
                                        <tr
                                            key={order.id}
                                            className={`border-b transition-colors cursor-pointer ${isDark
                                                ? 'border-white/5 hover:bg-white/5'
                                                : 'border-slate-100 hover:bg-slate-50'
                                                }`}
                                            onClick={() => setSelectedOrder(order)}
                                        >
                                            <td className="p-4" onClick={e => e.stopPropagation()}>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedOrders.has(order.id)}
                                                    onChange={() => {
                                                        const newSelected = new Set(selectedOrders);
                                                        if (newSelected.has(order.id)) {
                                                            newSelected.delete(order.id);
                                                        } else {
                                                            newSelected.add(order.id);
                                                        }
                                                        setSelectedOrders(newSelected);
                                                    }}
                                                    className={`w-4 h-4 rounded focus:ring-emerald-500/30 ${isDark ? 'bg-black/30 border-slate-600 text-emerald-500' : 'bg-white border-slate-300 text-emerald-600'
                                                        }`}
                                                />
                                            </td>
                                            <td className="p-4">
                                                <p className={`font-mono text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>{order.id.slice(0, 12)}...</p>
                                                <p className={`${isDark ? 'text-slate-500' : 'text-slate-600'} text-xs mt-0.5`}>{format(new Date(order.created_at), 'MMM dd, HH:mm')}</p>
                                            </td>
                                            <td className="p-4">
                                                <p className={`font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>{order.customer_name || 'N/A'}</p>
                                                {order.customer_phone && (
                                                    <p className={`${isDark ? 'text-slate-500' : 'text-slate-600'} text-xs mt-0.5`}>{order.customer_phone}</p>
                                                )}
                                            </td>
                                            <td className="p-4">
                                                <p className={`${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{order.items.length} item(s)</p>
                                            </td>
                                            <td className="p-4">
                                                <p className={`font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>{selectedCurrency} {order.total.toLocaleString()}</p>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-lg">{PAYMENT_ICONS[order.payment_method] || '💳'}</span>
                                                    <span className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{order.payment_method_name || order.payment_method}</span>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full ${statusConfig.bg} ${statusConfig.border} border`}>
                                                    <StatusIcon className={`w-3.5 h-3.5 ${statusConfig.text}`} />
                                                    <span className={`text-xs font-medium ${statusConfig.text}`}>{statusConfig.label}</span>
                                                </div>
                                            </td>
                                            <td className="p-4" onClick={e => e.stopPropagation()}>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => setSelectedOrder(order)}
                                                        className={`p-2 rounded-lg transition-colors ${isDark
                                                            ? 'hover:bg-white/10 text-slate-400 hover:text-white'
                                                            : 'hover:bg-slate-100 text-slate-400 hover:text-slate-900'
                                                            }`}
                                                        title="View Details"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </button>

                                                    <button
                                                        onClick={() => handleEditOrder(order)}
                                                        className={`p-2 rounded-lg transition-colors ${isDark
                                                            ? 'hover:bg-white/10 text-indigo-400 hover:text-indigo-300'
                                                            : 'hover:bg-indigo-50 text-indigo-600 hover:text-indigo-700'
                                                            }`}
                                                        title="Edit Order"
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => setDeletingOrder(order)}
                                                        className={`p-2 rounded-lg transition-colors ${isDark
                                                            ? 'hover:bg-white/10 text-red-500 hover:text-red-400'
                                                            : 'hover:bg-red-50 text-red-600 hover:text-red-700'
                                                            }`}
                                                        title="Delete Order"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className={`p-4 border-t flex items-center justify-between ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                        <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            Showing {((currentPage - 1) * ordersPerPage) + 1} to {Math.min(currentPage * ordersPerPage, filteredOrders.length)} of {filteredOrders.length} orders
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                                className={`p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${isDark ? 'hover:bg-white/10 text-slate-400' : 'hover:bg-slate-100 text-slate-500'
                                    }`}
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
                                                ? 'bg-emerald-500 text-white'
                                                : isDark
                                                    ? 'hover:bg-white/10 text-slate-400'
                                                    : 'hover:bg-slate-100 text-slate-500'
                                                }`}
                                        >
                                            {pageNum}
                                        </button>
                                    );
                                })}
                            </div>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={currentPage === totalPages}
                                className={`p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${isDark ? 'hover:bg-white/10 text-slate-400' : 'hover:bg-slate-100 text-slate-500'
                                    }`}
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Order Detail Modal */}
            <OrderDetailModal />

            {/* Edit Order Modal */}
            <EditOrderModal />

            {/* Delete Confirmation Modal */}
            <DeleteConfirmModal />

            {/* Shipping Notification Modal */}
            <ShippingModal
                shippingOrder={shippingOrder}
                shippingInfo={shippingInfo}
                setShippingInfo={setShippingInfo}
                onClose={() => setShippingOrder(null)}
                onSend={handleSendShippingNotification}
                sendingNotification={sendingNotification}
                isDark={isDark}
            />

            {/* Toast Notification */}
            {toast && (
                <div className={`fixed bottom-4 right-4 px-6 py-4 rounded-xl shadow-2xl z-50 flex items-center gap-3 animate-slide-up bg-white dark:bg-slate-800 border dark:border-white/10 border-slate-200`}>
                    {toast.type === 'success' ? (
                        <CheckCircle className="w-6 h-6 text-emerald-500" />
                    ) : (
                        <AlertCircle className="w-6 h-6 text-red-500" />
                    )}
                    <div>
                        <h4 className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            {toast.type === 'success' ? 'Success' : 'Error'}
                        </h4>
                        <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            {toast.message}
                        </p>
                    </div>
                    <button onClick={() => setToast(null)} className={`ml-2 p-1 rounded-lg ${isDark ? 'hover:bg-white/10' : 'hover:bg-slate-100'}`}>
                        <X className="w-4 h-4 text-slate-400" />
                    </button>
                </div>
            )}
        </div >
    );
};

export default Orders;
