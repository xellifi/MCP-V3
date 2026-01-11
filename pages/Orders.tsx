import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Workspace } from '../types';
import {
    ShoppingBag, Search, Filter, Download, Eye, Check, X, Truck, Clock,
    Package, ChevronDown, ChevronUp, MoreHorizontal, RefreshCw, Calendar,
    User, Phone, Mail, MapPin, CreditCard, Tag, ChevronLeft, ChevronRight,
    AlertCircle, CheckCircle, XCircle, ArrowUpDown, ExternalLink, Printer
} from 'lucide-react';
import { format } from 'date-fns';

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
}

const STATUS_CONFIG = {
    pending: { label: 'Pending', icon: Clock, color: 'amber', bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30' },
    confirmed: { label: 'Confirmed', icon: Check, color: 'blue', bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' },
    shipped: { label: 'Shipped', icon: Truck, color: 'purple', bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30' },
    delivered: { label: 'Delivered', icon: CheckCircle, color: 'emerald', bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30' },
    cancelled: { label: 'Cancelled', icon: XCircle, color: 'red', bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' }
};

const PAYMENT_ICONS: Record<string, string> = {
    cod: '💵',
    gcash: '📱',
    bank: '🏦',
    card: '💳',
    paypal: '🅿️'
};

const Orders: React.FC<OrdersProps> = ({ workspace }) => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
    const [sortField, setSortField] = useState<'created_at' | 'total' | 'customer_name'>('created_at');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
    const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [showFilters, setShowFilters] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
    const ordersPerPage = 10;

    // Load orders
    const loadOrders = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('orders')
                .select('*')
                .eq('workspace_id', workspace.id)
                .order(sortField, { ascending: sortDirection === 'asc' });

            if (error) throw error;
            setOrders(data || []);
        } catch (error) {
            console.error('Error loading orders:', error);
        } finally {
            setLoading(false);
        }
    }, [workspace.id, sortField, sortDirection]);

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
    }, [orders, searchQuery, statusFilter, dateFilter]);

    // Pagination
    const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);
    const paginatedOrders = filteredOrders.slice(
        (currentPage - 1) * ordersPerPage,
        currentPage * ordersPerPage
    );

    // Statistics
    const stats = useMemo(() => {
        const pending = orders.filter(o => o.status === 'pending').length;
        const confirmed = orders.filter(o => o.status === 'confirmed').length;
        const shipped = orders.filter(o => o.status === 'shipped').length;
        const delivered = orders.filter(o => o.status === 'delivered').length;
        const totalRevenue = orders.filter(o => o.status !== 'cancelled').reduce((sum, o) => sum + o.total, 0);
        return { pending, confirmed, shipped, delivered, totalRevenue, total: orders.length };
    }, [orders]);

    // Update order status
    const updateOrderStatus = async (orderId: string, newStatus: string) => {
        setUpdatingStatus(orderId);
        try {
            const { error } = await supabase
                .from('orders')
                .update({ status: newStatus, updated_at: new Date().toISOString() })
                .eq('id', orderId);

            if (error) throw error;

            setOrders(prev => prev.map(order =>
                order.id === orderId ? { ...order, status: newStatus as any } : order
            ));

            if (selectedOrder?.id === orderId) {
                setSelectedOrder(prev => prev ? { ...prev, status: newStatus as any } : null);
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
        } catch (error) {
            console.error('Error bulk updating orders:', error);
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
            order.items.map(i => `${i.productName} x${i.quantity}`).join('; '),
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

        const statusConfig = STATUS_CONFIG[selectedOrder.status];
        const StatusIcon = statusConfig.icon;

        return (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedOrder(null)}>
                <div className="bg-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden border border-white/10 shadow-2xl" onClick={e => e.stopPropagation()}>
                    {/* Header */}
                    <div className="p-6 border-b border-white/10 flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-bold text-white">Order Details</h2>
                            <p className="text-slate-400 text-sm font-mono mt-1">{selectedOrder.id}</p>
                        </div>
                        <button onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                            <X className="w-5 h-5 text-slate-400" />
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
                        <div className="bg-black/20 rounded-xl p-4 space-y-3">
                            <h3 className="text-white font-semibold flex items-center gap-2">
                                <User className="w-4 h-4 text-emerald-400" />
                                Customer Information
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                                <div className="flex items-center gap-2 text-slate-300">
                                    <User className="w-4 h-4 text-slate-500" />
                                    {selectedOrder.customer_name || 'N/A'}
                                </div>
                                {selectedOrder.customer_phone && (
                                    <div className="flex items-center gap-2 text-slate-300">
                                        <Phone className="w-4 h-4 text-slate-500" />
                                        {selectedOrder.customer_phone}
                                    </div>
                                )}
                                {selectedOrder.customer_email && (
                                    <div className="flex items-center gap-2 text-slate-300">
                                        <Mail className="w-4 h-4 text-slate-500" />
                                        {selectedOrder.customer_email}
                                    </div>
                                )}
                                {selectedOrder.customer_address && (
                                    <div className="flex items-start gap-2 text-slate-300 col-span-2">
                                        <MapPin className="w-4 h-4 text-slate-500 mt-0.5" />
                                        {selectedOrder.customer_address}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Order Items */}
                        <div className="bg-black/20 rounded-xl p-4 space-y-3">
                            <h3 className="text-white font-semibold flex items-center gap-2">
                                <Package className="w-4 h-4 text-emerald-400" />
                                Order Items
                            </h3>
                            <div className="space-y-2">
                                {selectedOrder.items.map((item, idx) => (
                                    <div key={idx} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                                        <div className="flex items-center gap-3">
                                            {item.productImage ? (
                                                <img src={item.productImage} alt="" className="w-10 h-10 rounded-lg object-cover" />
                                            ) : (
                                                <div className="w-10 h-10 bg-slate-600 rounded-lg flex items-center justify-center">
                                                    <Package className="w-5 h-5 text-slate-400" />
                                                </div>
                                            )}
                                            <div>
                                                <p className="text-white text-sm font-medium">{item.productName}</p>
                                                <p className="text-slate-500 text-xs">Qty: {item.quantity || 1}</p>
                                            </div>
                                        </div>
                                        <p className="text-emerald-400 font-semibold">₱{(item.productPrice * (item.quantity || 1)).toLocaleString()}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Payment & Totals */}
                        <div className="bg-black/20 rounded-xl p-4 space-y-3">
                            <h3 className="text-white font-semibold flex items-center gap-2">
                                <CreditCard className="w-4 h-4 text-emerald-400" />
                                Payment Summary
                            </h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between text-slate-300">
                                    <span>Subtotal</span>
                                    <span>₱{selectedOrder.subtotal.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-slate-300">
                                    <span>Shipping</span>
                                    <span className={selectedOrder.shipping_fee === 0 ? 'text-emerald-400' : ''}>
                                        {selectedOrder.shipping_fee === 0 ? 'FREE' : `₱${selectedOrder.shipping_fee.toLocaleString()}`}
                                    </span>
                                </div>
                                {selectedOrder.metadata?.discount > 0 && (
                                    <div className="flex justify-between text-emerald-400">
                                        <span className="flex items-center gap-1">
                                            <Tag className="w-3 h-3" />
                                            Discount
                                            {selectedOrder.metadata?.promoCode && <span className="text-xs opacity-75">({selectedOrder.metadata.promoCode})</span>}
                                        </span>
                                        <span>-₱{selectedOrder.metadata.discount.toLocaleString()}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-white font-bold text-lg pt-2 border-t border-white/10">
                                    <span>Total</span>
                                    <span className="text-emerald-400">₱{selectedOrder.total.toLocaleString()}</span>
                                </div>
                                <div className="flex items-center gap-2 pt-2 text-slate-400">
                                    <span className="text-lg">{PAYMENT_ICONS[selectedOrder.payment_method] || '💳'}</span>
                                    <span>{selectedOrder.payment_method_name || selectedOrder.payment_method}</span>
                                </div>
                            </div>
                        </div>

                        {/* Payment Proof */}
                        {selectedOrder.metadata?.payment?.proofUrl && (
                            <div className="bg-black/20 rounded-xl p-4">
                                <h3 className="text-white font-semibold mb-3">Payment Proof</h3>
                                <a
                                    href={selectedOrder.metadata.payment.proofUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 text-sm"
                                >
                                    <ExternalLink className="w-4 h-4" />
                                    View Payment Proof
                                </a>
                            </div>
                        )}
                    </div>

                    {/* Footer Actions */}
                    <div className="p-6 border-t border-white/10 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <span className="text-slate-400 text-sm">Update Status:</span>
                            <select
                                value={selectedOrder.status}
                                onChange={(e) => updateOrderStatus(selectedOrder.id, e.target.value)}
                                disabled={updatingStatus === selectedOrder.id}
                                className="px-3 py-2 bg-black/30 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500"
                            >
                                {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                                    <option key={key} value={key}>{config.label}</option>
                                ))}
                            </select>
                        </div>
                        <button
                            onClick={() => window.print()}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                        >
                            <Printer className="w-4 h-4" />
                            Print
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6 animate-fade-in pb-12">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl lg:text-4xl font-bold text-white tracking-tight mb-2">Order Management</h1>
                    <p className="text-slate-400">Manage and track all your customer orders</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={loadOrders}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2.5 bg-slate-700/50 hover:bg-slate-700 border border-white/10 rounded-xl text-white transition-colors"
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
                <div className="glass-panel p-4 rounded-xl border border-white/10">
                    <p className="text-slate-400 text-xs uppercase tracking-wider">Total Orders</p>
                    <p className="text-2xl font-bold text-white mt-1">{stats.total}</p>
                </div>
                <div className="glass-panel p-4 rounded-xl border border-amber-500/20">
                    <p className="text-amber-400 text-xs uppercase tracking-wider">Pending</p>
                    <p className="text-2xl font-bold text-amber-400 mt-1">{stats.pending}</p>
                </div>
                <div className="glass-panel p-4 rounded-xl border border-blue-500/20">
                    <p className="text-blue-400 text-xs uppercase tracking-wider">Confirmed</p>
                    <p className="text-2xl font-bold text-blue-400 mt-1">{stats.confirmed}</p>
                </div>
                <div className="glass-panel p-4 rounded-xl border border-purple-500/20">
                    <p className="text-purple-400 text-xs uppercase tracking-wider">Shipped</p>
                    <p className="text-2xl font-bold text-purple-400 mt-1">{stats.shipped}</p>
                </div>
                <div className="glass-panel p-4 rounded-xl border border-emerald-500/20">
                    <p className="text-emerald-400 text-xs uppercase tracking-wider">Delivered</p>
                    <p className="text-2xl font-bold text-emerald-400 mt-1">{stats.delivered}</p>
                </div>
                <div className="glass-panel p-4 rounded-xl border border-white/10">
                    <p className="text-slate-400 text-xs uppercase tracking-wider">Revenue</p>
                    <p className="text-2xl font-bold text-emerald-400 mt-1">₱{stats.totalRevenue.toLocaleString()}</p>
                </div>
            </div>

            {/* Filters & Search */}
            <div className="glass-panel rounded-xl border border-white/10 p-4">
                <div className="flex flex-col lg:flex-row gap-4">
                    {/* Search */}
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by Order ID, Customer, Phone, Email..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
                        />
                    </div>

                    {/* Status Filter */}
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white focus:outline-none focus:border-emerald-500/50"
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
                        className="px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white focus:outline-none focus:border-emerald-500/50"
                    >
                        <option value="all">All Time</option>
                        <option value="today">Today</option>
                        <option value="week">Last 7 Days</option>
                        <option value="month">This Month</option>
                    </select>
                </div>

                {/* Bulk Actions */}
                {selectedOrders.size > 0 && (
                    <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-4">
                        <span className="text-slate-400 text-sm">{selectedOrders.size} selected</span>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => bulkUpdateStatus('confirmed')}
                                className="px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-lg text-sm hover:bg-blue-500/30 transition-colors"
                            >
                                Confirm
                            </button>
                            <button
                                onClick={() => bulkUpdateStatus('shipped')}
                                className="px-3 py-1.5 bg-purple-500/20 text-purple-400 rounded-lg text-sm hover:bg-purple-500/30 transition-colors"
                            >
                                Ship
                            </button>
                            <button
                                onClick={() => bulkUpdateStatus('delivered')}
                                className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg text-sm hover:bg-emerald-500/30 transition-colors"
                            >
                                Deliver
                            </button>
                            <button
                                onClick={() => bulkUpdateStatus('cancelled')}
                                className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-sm hover:bg-red-500/30 transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Orders Table */}
            <div className="glass-panel rounded-xl border border-white/10 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-white/10 text-left">
                                <th className="p-4">
                                    <input
                                        type="checkbox"
                                        checked={selectedOrders.size === paginatedOrders.length && paginatedOrders.length > 0}
                                        onChange={toggleSelectAll}
                                        className="w-4 h-4 rounded border-slate-600 bg-black/30 text-emerald-500 focus:ring-emerald-500/30"
                                    />
                                </th>
                                <th className="p-4 text-slate-400 font-medium text-sm">
                                    <button onClick={() => toggleSort('created_at')} className="flex items-center gap-1 hover:text-white transition-colors">
                                        Order
                                        <ArrowUpDown className="w-3 h-3" />
                                    </button>
                                </th>
                                <th className="p-4 text-slate-400 font-medium text-sm">
                                    <button onClick={() => toggleSort('customer_name')} className="flex items-center gap-1 hover:text-white transition-colors">
                                        Customer
                                        <ArrowUpDown className="w-3 h-3" />
                                    </button>
                                </th>
                                <th className="p-4 text-slate-400 font-medium text-sm">Items</th>
                                <th className="p-4 text-slate-400 font-medium text-sm">
                                    <button onClick={() => toggleSort('total')} className="flex items-center gap-1 hover:text-white transition-colors">
                                        Total
                                        <ArrowUpDown className="w-3 h-3" />
                                    </button>
                                </th>
                                <th className="p-4 text-slate-400 font-medium text-sm">Payment</th>
                                <th className="p-4 text-slate-400 font-medium text-sm">Status</th>
                                <th className="p-4 text-slate-400 font-medium text-sm">Actions</th>
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
                                    const statusConfig = STATUS_CONFIG[order.status];
                                    const StatusIcon = statusConfig.icon;
                                    return (
                                        <tr
                                            key={order.id}
                                            className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer"
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
                                                    className="w-4 h-4 rounded border-slate-600 bg-black/30 text-emerald-500 focus:ring-emerald-500/30"
                                                />
                                            </td>
                                            <td className="p-4">
                                                <p className="text-white font-mono text-sm">{order.id.slice(0, 12)}...</p>
                                                <p className="text-slate-500 text-xs mt-0.5">{format(new Date(order.created_at), 'MMM dd, HH:mm')}</p>
                                            </td>
                                            <td className="p-4">
                                                <p className="text-white font-medium">{order.customer_name || 'N/A'}</p>
                                                {order.customer_phone && (
                                                    <p className="text-slate-500 text-xs mt-0.5">{order.customer_phone}</p>
                                                )}
                                            </td>
                                            <td className="p-4">
                                                <p className="text-slate-300">{order.items.length} item(s)</p>
                                            </td>
                                            <td className="p-4">
                                                <p className="text-emerald-400 font-bold">₱{order.total.toLocaleString()}</p>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-lg">{PAYMENT_ICONS[order.payment_method] || '💳'}</span>
                                                    <span className="text-slate-400 text-sm">{order.payment_method_name || order.payment_method}</span>
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
                                                        className="p-2 hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-white"
                                                        title="View Details"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                    <select
                                                        value={order.status}
                                                        onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                                                        disabled={updatingStatus === order.id}
                                                        className="px-2 py-1 bg-black/30 border border-white/10 rounded-lg text-white text-xs focus:outline-none"
                                                        onClick={e => e.stopPropagation()}
                                                    >
                                                        {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                                                            <option key={key} value={key}>{config.label}</option>
                                                        ))}
                                                    </select>
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
                    <div className="p-4 border-t border-white/10 flex items-center justify-between">
                        <p className="text-slate-400 text-sm">
                            Showing {((currentPage - 1) * ordersPerPage) + 1} to {Math.min(currentPage * ordersPerPage, filteredOrders.length)} of {filteredOrders.length} orders
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                                className="p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-slate-400"
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
                                                : 'hover:bg-white/10 text-slate-400'
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
                                className="p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-slate-400"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Order Detail Modal */}
            <OrderDetailModal />
        </div>
    );
};

export default Orders;
