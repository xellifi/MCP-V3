import React, { useState, useEffect, useRef } from 'react';
import {
    Store as StoreIcon, Package, ShoppingCart, Settings, Plus, Edit2, Trash2,
    Search, Filter, MoreVertical, Image as ImageIcon, Upload, X, Save,
    Eye, ExternalLink, Copy, Check, Truck, Clock, CheckCircle, XCircle,
    DollarSign, Tag, Box, AlertCircle, Palette, Building2, Link as LinkIcon, HelpCircle
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';
import { Workspace } from '../types';

// Types
interface Product {
    id: string;
    name: string;
    description: string;
    price: number;
    compare_at_price?: number;
    images: string[];
    stock_quantity: number;
    track_inventory: boolean;
    status: 'active' | 'draft' | 'archived';
    category?: string;
    created_at: string;
}

interface Order {
    id: string;
    order_number: string;
    customer_name: string;
    customer_email?: string;
    customer_phone?: string;
    shipping_address?: string;
    status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
    payment_method?: string;
    payment_status: 'pending' | 'pending_verification' | 'paid' | 'failed';
    proof_url?: string;
    subtotal: number;
    shipping_fee: number;
    discount: number;
    total: number;
    notes?: string;
    created_at: string;
    items?: OrderItem[];
}

interface OrderItem {
    id: string;
    product_name: string;
    product_price: number;
    product_image?: string;
    quantity: number;
    line_total: number;
}

interface StoreSettings {
    id?: string;
    name: string;
    slug: string;
    logo_url?: string;
    description?: string;
    primary_color: string;
    accent_color: string;
    email?: string;
    phone?: string;
    address?: string;
    is_active: boolean;
    currency: string;
    google_webhook_url?: string;
    google_sheet_name?: string;
    google_spreadsheet_id?: string;
}

interface StoreProps {
    workspace: Workspace;
}

const TABS = [
    { id: 'products', label: 'Products', icon: Package },
    { id: 'orders', label: 'Orders', icon: ShoppingCart },
    { id: 'settings', label: 'Settings', icon: Settings },
];

const ORDER_STATUSES = [
    { id: 'pending', label: 'Pending', color: 'yellow', icon: Clock },
    { id: 'processing', label: 'Processing', color: 'blue', icon: Box },
    { id: 'shipped', label: 'Shipped', color: 'purple', icon: Truck },
    { id: 'delivered', label: 'Delivered', color: 'green', icon: CheckCircle },
    { id: 'cancelled', label: 'Cancelled', color: 'red', icon: XCircle },
];

const PRESET_COLORS = ['#7c3aed', '#6366f1', '#3b82f6', '#0891b2', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

const Store: React.FC<StoreProps> = ({ workspace }) => {
    const { isDark } = useTheme();
    const [activeTab, setActiveTab] = useState('products');
    const [loading, setLoading] = useState(true);

    // Products state
    const [products, setProducts] = useState<Product[]>([]);
    const [showProductModal, setShowProductModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [productSearch, setProductSearch] = useState('');

    // Orders state
    const [orders, setOrders] = useState<Order[]>([]);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [orderFilter, setOrderFilter] = useState('all');

    // Store settings
    const [store, setStore] = useState<StoreSettings>({
        name: 'My Store',
        slug: '',
        primary_color: '#7c3aed',
        accent_color: '#6366f1',
        is_active: true,
        currency: 'PHP',
    });
    const [slugCopied, setSlugCopied] = useState(false);
    const [showSheetsGuide, setShowSheetsGuide] = useState(false);
    const [scriptCopied, setScriptCopied] = useState(false);

    // File upload
    const fileInputRef = useRef<HTMLInputElement>(null);
    const logoInputRef = useRef<HTMLInputElement>(null);
    const [uploadingImage, setUploadingImage] = useState(false);

    // Load data
    useEffect(() => {
        if (workspace?.id) {
            loadStore();
            loadProducts();
            loadOrders();
        }
    }, [workspace?.id]);

    const loadStore = async () => {
        try {
            const { data, error } = await supabase
                .from('stores')
                .select('*')
                .eq('workspace_id', workspace?.id)
                .single();

            if (data) {
                setStore(data);
            } else if (error?.code === 'PGRST116') {
                // No store exists, create one
                const slug = `store-${Date.now().toString(36)}`;
                const { data: newStore } = await supabase
                    .from('stores')
                    .insert({
                        workspace_id: workspace?.id,
                        name: 'My Store',
                        slug,
                        primary_color: '#7c3aed',
                        accent_color: '#6366f1',
                    })
                    .select()
                    .single();
                if (newStore) setStore(newStore);
            }
        } catch (err) {
            console.error('Error loading store:', err);
        }
    };

    const loadProducts = async () => {
        setLoading(true);
        try {
            const { data } = await supabase
                .from('products')
                .select('*')
                .eq('store_id', store?.id)
                .order('created_at', { ascending: false });
            setProducts(data || []);
        } catch (err) {
            console.error('Error loading products:', err);
        }
        setLoading(false);
    };

    const loadOrders = async () => {
        try {
            const { data } = await supabase
                .from('store_orders')
                .select(`
                    *,
                    order_items (*)
                `)
                .eq('store_id', store?.id)
                .order('created_at', { ascending: false });
            setOrders(data || []);
        } catch (err) {
            console.error('Error loading orders:', err);
        }
    };

    // Refresh when store id changes
    useEffect(() => {
        if (store?.id) {
            loadProducts();
            loadOrders();
        }
    }, [store?.id]);

    // Save store settings
    const saveStore = async () => {
        try {
            const { error } = await supabase
                .from('stores')
                .update({
                    name: store.name,
                    slug: store.slug,
                    logo_url: store.logo_url,
                    description: store.description,
                    primary_color: store.primary_color,
                    accent_color: store.accent_color,
                    email: store.email,
                    phone: store.phone,
                    address: store.address,
                    is_active: store.is_active,
                    currency: store.currency,
                    google_webhook_url: store.google_webhook_url,
                    google_sheet_name: store.google_sheet_name,
                    google_spreadsheet_id: store.google_spreadsheet_id,
                })
                .eq('id', store.id);

            if (!error) {
                alert('Store settings saved!');
            }
        } catch (err) {
            console.error('Error saving store:', err);
        }
    };

    // Upload image
    const uploadImage = async (file: File, type: 'product' | 'logo') => {
        setUploadingImage(true);
        try {
            const fileName = `${type}-${Date.now()}-${file.name}`;
            const { data, error } = await supabase.storage
                .from('attachments')
                .upload(fileName, file);

            if (error) throw error;

            const { data: urlData } = supabase.storage
                .from('attachments')
                .getPublicUrl(fileName);

            return urlData.publicUrl;
        } catch (err) {
            console.error('Upload error:', err);
            return null;
        } finally {
            setUploadingImage(false);
        }
    };

    // Copy store URL
    const copyStoreUrl = () => {
        const url = `${window.location.origin}/store/${store.slug}`;
        navigator.clipboard.writeText(url);
        setSlugCopied(true);
        setTimeout(() => setSlugCopied(false), 2000);
    };

    // Filter products
    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(productSearch.toLowerCase())
    );

    // Filter orders
    const filteredOrders = orders.filter(o =>
        orderFilter === 'all' || o.status === orderFilter
    );

    // Update order status
    const updateOrderStatus = async (orderId: string, status: string) => {
        try {
            // Get order details for sync
            const { data: orderData } = await supabase
                .from('store_orders')
                .select('order_number')
                .eq('id', orderId)
                .single();

            await supabase
                .from('store_orders')
                .update({ status })
                .eq('id', orderId);

            // Sync to Google Sheets if webhook configured
            if (store?.google_webhook_url && orderData?.order_number) {
                try {
                    await fetch('/api/sheets/sync', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            action: 'updateStatus',
                            webhookUrl: store.google_webhook_url,
                            sheetName: store.google_sheet_name || 'Sheet1',
                            orderId: orderData.order_number,
                            newStatus: status,
                            updatedAt: new Date().toISOString()
                        })
                    });
                    console.log('Order status synced to Google Sheets');
                } catch (sheetErr) {
                    console.error('Failed to sync status to sheets:', sheetErr);
                }
            }

            loadOrders();
        } catch (err) {
            console.error('Error updating order:', err);
        }
    };

    // Delete order
    const deleteOrder = async (orderId: string) => {
        if (!confirm('Are you sure you want to delete this order? This cannot be undone.')) return;
        try {
            // First delete order items
            await supabase
                .from('order_items')
                .delete()
                .eq('order_id', orderId);

            // Then delete the order
            await supabase
                .from('store_orders')
                .delete()
                .eq('id', orderId);

            loadOrders();
            setSelectedOrder(null);
        } catch (err) {
            console.error('Error deleting order:', err);
            alert('Failed to delete order');
        }
    };

    // Update payment status
    const updatePaymentStatus = async (orderId: string, paymentStatus: string) => {
        try {
            // Get order details for sync
            const { data: orderData } = await supabase
                .from('store_orders')
                .select('order_number')
                .eq('id', orderId)
                .single();

            await supabase
                .from('store_orders')
                .update({ payment_status: paymentStatus })
                .eq('id', orderId);

            // Sync to Google Sheets if webhook configured
            if (store?.google_webhook_url && orderData?.order_number) {
                try {
                    await fetch('/api/sheets/sync', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            action: 'updatePaymentStatus',
                            webhookUrl: store.google_webhook_url,
                            sheetName: store.google_sheet_name || 'Sheet1',
                            orderId: orderData.order_number,
                            newStatus: paymentStatus === 'paid' ? 'Paid' : paymentStatus === 'pending_verification' ? 'Pending Verification' : 'Pending',
                            updatedAt: new Date().toISOString()
                        })
                    });
                    console.log('Payment status synced to Google Sheets');
                } catch (sheetErr) {
                    console.error('Failed to sync payment status to sheets:', sheetErr);
                }
            }

            loadOrders();
        } catch (err) {
            console.error('Error updating payment status:', err);
        }
    };

    // Delete product
    const deleteProduct = async (productId: string) => {
        if (!confirm('Delete this product?')) return;
        try {
            await supabase.from('products').delete().eq('id', productId);
            loadProducts();
        } catch (err) {
            console.error('Error deleting product:', err);
        }
    };

    return (
        <div className={`min-h-screen p-4 md:p-6 transition-colors duration-300 ${isDark ? 'bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900' : 'bg-slate-50'}`}>
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl">
                            <StoreIcon className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className={`text-2xl font-bold transition-colors ${isDark ? 'text-white' : 'text-slate-900'}`}>{store.name || 'My Store'}</h1>
                            <p className={`text-sm transition-colors ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Manage your products, orders, and store settings</p>
                        </div>
                    </div>

                    {/* Store URL */}
                    <div className="flex items-center gap-2">
                        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-colors ${isDark ? 'bg-black/30 border-white/10' : 'bg-white border-slate-200'}`}>
                            <LinkIcon className={`w-4 h-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
                            <span className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>/store/{store.slug}</span>
                            <button
                                onClick={copyStoreUrl}
                                className={`p-1 rounded transition-colors ${isDark ? 'hover:bg-white/10' : 'hover:bg-slate-100'}`}
                            >
                                {slugCopied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className={`w-4 h-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />}
                            </button>
                        </div>
                        <a
                            href={`/store/${store.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 bg-purple-500 hover:bg-purple-600 rounded-xl transition-colors"
                        >
                            <ExternalLink className="w-5 h-5 text-white" />
                        </a>
                    </div>
                </div>

                {/* Tabs */}
                <div className={`flex gap-1 p-1 rounded-xl w-fit mb-6 border transition-colors ${isDark ? 'bg-black/30 border-white/10' : 'bg-white border-slate-200 shadow-sm'}`}>
                    {TABS.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all ${activeTab === tab.id
                                ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/25'
                                : `${isDark ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`
                                }`}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Products Tab */}
                {activeTab === 'products' && (
                    <div className="space-y-4">
                        {/* Toolbar */}
                        <div className="flex flex-col md:flex-row gap-3">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    value={productSearch}
                                    onChange={(e) => setProductSearch(e.target.value)}
                                    placeholder="Search products..."
                                    className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-purple-500/50 outline-none transition-colors ${isDark
                                        ? 'bg-black/30 border-white/10 text-white'
                                        : 'bg-white border-slate-200 text-slate-900 shadow-sm'
                                        }`}
                                />
                            </div>
                            <button
                                onClick={() => { setEditingProduct(null); setShowProductModal(true); }}
                                className="flex items-center gap-2 px-4 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-xl font-medium transition-colors"
                            >
                                <Plus className="w-5 h-5" />
                                Add Product
                            </button>
                        </div>

                        {/* Products Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {filteredProducts.map(product => (
                                <div
                                    key={product.id}
                                    className={`backdrop-blur-md border rounded-xl overflow-hidden hover:border-purple-500/50 transition-all group ${isDark
                                        ? 'bg-black/30 border-white/10'
                                        : 'bg-white border-slate-200 shadow-sm hover:shadow-md'
                                        }`}
                                >
                                    {/* Product Image */}
                                    <div className={`relative aspect-square ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
                                        {product.images?.[0] ? (
                                            <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <ImageIcon className={`w-12 h-12 ${isDark ? 'text-slate-600' : 'text-slate-300'}`} />
                                            </div>
                                        )}
                                        {/* Status Badge */}
                                        <div className={`absolute top-2 left-2 px-2 py-1 rounded-lg text-xs font-medium ${product.status === 'active' ? 'bg-green-500/20 text-green-400' :
                                            product.status === 'draft' ? 'bg-yellow-500/20 text-yellow-400' :
                                                'bg-red-500/20 text-red-400'
                                            }`}>
                                            {product.status}
                                        </div>
                                        {/* Actions */}
                                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => { setEditingProduct(product); setShowProductModal(true); }}
                                                className="p-1.5 bg-blue-500 hover:bg-blue-600 rounded-lg"
                                            >
                                                <Edit2 className="w-3 h-3 text-white" />
                                            </button>
                                            <button
                                                onClick={() => deleteProduct(product.id)}
                                                className="p-1.5 bg-red-500 hover:bg-red-600 rounded-lg"
                                            >
                                                <Trash2 className="w-3 h-3 text-white" />
                                            </button>
                                        </div>
                                    </div>
                                    {/* Product Info */}
                                    <div className="p-4">
                                        <h3 className={`font-semibold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{product.name}</h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-lg font-bold text-purple-400">₱{product.price.toLocaleString()}</span>
                                            {product.compare_at_price && (
                                                <span className="text-sm text-slate-500 line-through">₱{product.compare_at_price.toLocaleString()}</span>
                                            )}
                                        </div>
                                        {product.track_inventory && (
                                            <div className="text-xs text-slate-400 mt-2">
                                                Stock: {product.stock_quantity}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}

                            {filteredProducts.length === 0 && !loading && (
                                <div className="col-span-full py-12 text-center">
                                    <Package className={`w-12 h-12 mx-auto mb-3 ${isDark ? 'text-slate-600' : 'text-slate-300'}`} />
                                    <p className={`${isDark ? 'text-slate-400' : 'text-slate-500'}`}>No products yet</p>
                                    <button
                                        onClick={() => setShowProductModal(true)}
                                        className="mt-3 text-purple-400 hover:text-purple-300"
                                    >
                                        Add your first product
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Orders Tab */}
                {activeTab === 'orders' && (
                    <div className="space-y-4">
                        {/* Order Filters */}
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => setOrderFilter('all')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${orderFilter === 'all'
                                    ? 'bg-purple-500 text-white'
                                    : isDark
                                        ? 'bg-black/30 text-slate-400 hover:text-white'
                                        : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:border-slate-300'
                                    }`}
                            >
                                All Orders
                            </button>
                            {ORDER_STATUSES.map(status => (
                                <button
                                    key={status.id}
                                    onClick={() => setOrderFilter(status.id)}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${orderFilter === status.id
                                        ? `bg-${status.color}-500 text-white`
                                        : `${isDark ? 'bg-black/30 text-slate-400 hover:text-white' : 'bg-white text-slate-500 hover:text-slate-900 border border-slate-200'}`
                                        }`}
                                >
                                    {status.label}
                                </button>
                            ))}
                        </div>

                        {/* Orders Table */}
                        <div className={`backdrop-blur-md border rounded-xl overflow-hidden transition-colors ${isDark ? 'bg-black/30 border-white/10' : 'bg-white border-slate-200 shadow-sm'}`}>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className={`border-b ${isDark ? 'border-white/10' : 'border-slate-200 bg-slate-50/50'}`}>
                                            <th className={`text-left px-4 py-3 text-xs font-semibold uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Order</th>
                                            <th className={`text-left px-4 py-3 text-xs font-semibold uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Customer</th>
                                            <th className={`text-left px-4 py-3 text-xs font-semibold uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Status</th>
                                            <th className={`text-left px-4 py-3 text-xs font-semibold uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Payment</th>
                                            <th className={`text-left px-4 py-3 text-xs font-semibold uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Total</th>
                                            <th className={`text-left px-4 py-3 text-xs font-semibold uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Date</th>
                                            <th className={`text-left px-4 py-3 text-xs font-semibold uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredOrders.map(order => (
                                            <tr key={order.id} className={`border-b transition-colors ${isDark ? 'border-white/5 hover:bg-white/5' : 'border-slate-100 hover:bg-slate-50'}`}>
                                                <td className="px-4 py-3">
                                                    <span className={`font-mono text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>{order.order_number}</span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className={`text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>{order.customer_name}</div>
                                                    <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{order.customer_email}</div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <select
                                                        value={order.status}
                                                        onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                                                        className={`text-xs font-medium px-2.5 py-1.5 rounded-lg border cursor-pointer ${order.status === 'pending'
                                                            ? isDark ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' : 'bg-yellow-100 text-yellow-700 border-yellow-300'
                                                            : order.status === 'processing'
                                                                ? isDark ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-blue-100 text-blue-700 border-blue-300'
                                                                : order.status === 'shipped'
                                                                    ? isDark ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' : 'bg-purple-100 text-purple-700 border-purple-300'
                                                                    : order.status === 'delivered'
                                                                        ? isDark ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-green-100 text-green-700 border-green-300'
                                                                        : isDark ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-red-100 text-red-700 border-red-300'
                                                            }`}
                                                    >
                                                        {ORDER_STATUSES.map(s => (
                                                            <option key={s.id} value={s.id}>{s.label}</option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{order.payment_method?.toUpperCase() || 'N/A'}</span>
                                                        {order.payment_status === 'pending_verification' && (
                                                            <span className={`px-1.5 py-0.5 text-xs font-medium rounded-md animate-pulse ${isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-700 border border-amber-300'}`}>
                                                                ⚠️ Verify
                                                            </span>
                                                        )}
                                                        {order.payment_status === 'paid' && (
                                                            <span className={`px-1.5 py-0.5 text-xs font-medium rounded-md ${isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700 border border-green-300'}`}>
                                                                ✓ Paid
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>₱{order.total.toLocaleString()}</span>
                                                </td>
                                                <td className={`px-4 py-3 text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                                    {new Date(order.created_at).toLocaleDateString()}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            onClick={() => setSelectedOrder(order)}
                                                            className={`p-1.5 rounded-lg transition-colors ${order.payment_status === 'pending_verification'
                                                                ? isDark ? 'bg-amber-500/20 hover:bg-amber-500/30' : 'bg-amber-100 hover:bg-amber-200'
                                                                : isDark ? 'hover:bg-white/10' : 'hover:bg-slate-100'}`}
                                                            title="View Order"
                                                        >
                                                            <Eye className={`w-4 h-4 ${order.payment_status === 'pending_verification' ? isDark ? 'text-amber-400' : 'text-amber-600' : isDark ? 'text-slate-400' : 'text-slate-500'}`} />
                                                        </button>
                                                        <button
                                                            onClick={() => deleteOrder(order.id)}
                                                            className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-red-500/20' : 'hover:bg-red-100'}`}
                                                            title="Delete Order"
                                                        >
                                                            <Trash2 className={`w-4 h-4 ${isDark ? 'text-slate-400 hover:text-red-400' : 'text-slate-500 hover:text-red-600'}`} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>

                                {filteredOrders.length === 0 && (
                                    <div className="py-12 text-center">
                                        <ShoppingCart className={`w-12 h-12 mx-auto mb-3 ${isDark ? 'text-slate-600' : 'text-slate-300'}`} />
                                        <p className={`${isDark ? 'text-slate-400' : 'text-slate-500'}`}>No orders yet</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Settings Tab */}
                {activeTab === 'settings' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Store Info */}
                        <div className={`backdrop-blur-md border rounded-xl p-6 transition-colors ${isDark ? 'bg-black/30 border-white/10' : 'bg-white border-slate-200 shadow-sm'}`}>
                            <h2 className={`text-lg font-bold mb-4 flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                <Building2 className="w-5 h-5 text-purple-400" />
                                Store Information
                            </h2>

                            <div className="space-y-4">
                                <div>
                                    <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Store Name</label>
                                    <input
                                        type="text"
                                        value={store.name}
                                        onChange={(e) => setStore({ ...store, name: e.target.value })}
                                        className={`w-full border rounded-xl px-4 py-3 focus:ring-2 focus:ring-purple-500/50 outline-none transition-colors ${isDark ? 'bg-black/30 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
                                    />
                                </div>

                                <div>
                                    <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Store URL Slug</label>
                                    <div className="flex items-center gap-2">
                                        <span className="text-slate-500">/store/</span>
                                        <input
                                            type="text"
                                            value={store.slug}
                                            onChange={(e) => setStore({ ...store, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                                            className={`flex-1 border rounded-xl px-4 py-3 focus:ring-2 focus:ring-purple-500/50 outline-none transition-colors ${isDark ? 'bg-black/30 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Description</label>
                                    <textarea
                                        value={store.description || ''}
                                        onChange={(e) => setStore({ ...store, description: e.target.value })}
                                        rows={3}
                                        className={`w-full border rounded-xl px-4 py-3 focus:ring-2 focus:ring-purple-500/50 outline-none resize-none transition-colors ${isDark ? 'bg-black/30 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
                                    />
                                </div>

                                <div>
                                    <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Store Logo</label>
                                    <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            const url = await uploadImage(file, 'logo');
                                            if (url) setStore({ ...store, logo_url: url });
                                        }
                                    }} />
                                    {store.logo_url ? (
                                        <div className="flex items-center gap-3">
                                            <img src={store.logo_url} alt="Logo" className="w-16 h-16 rounded-xl object-cover" />
                                            <button onClick={() => logoInputRef.current?.click()} className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm">
                                                Change
                                            </button>
                                            <button onClick={() => setStore({ ...store, logo_url: '' })} className="p-2 hover:bg-red-500/20 rounded-lg text-red-400">
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => logoInputRef.current?.click()}
                                            className={`w-full py-8 border-2 border-dashed rounded-xl transition-colors flex flex-col items-center gap-2 ${isDark ? 'border-white/20 text-slate-400 hover:text-white' : 'border-slate-300 text-slate-500 hover:text-slate-900 hover:border-purple-500/50'}`}
                                        >
                                            <Upload className="w-6 h-6" />
                                            Upload Logo
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Branding */}
                        <div className={`backdrop-blur-md border rounded-xl p-6 transition-colors ${isDark ? 'bg-black/30 border-white/10' : 'bg-white border-slate-200 shadow-sm'}`}>
                            <h2 className={`text-lg font-bold mb-4 flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                <Palette className="w-5 h-5 text-purple-400" />
                                Branding
                            </h2>

                            <div className="space-y-4">
                                <div>
                                    <div>
                                        <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Primary Color</label>
                                        <div className="flex items-center gap-2">
                                            {PRESET_COLORS.map(color => (
                                                <button
                                                    key={color}
                                                    onClick={() => setStore({ ...store, primary_color: color })}
                                                    className={`w-8 h-8 rounded-full transition-transform ${store.primary_color === color ? 'ring-2 ring-white scale-110' : ''}`}
                                                    style={{ backgroundColor: color }}
                                                />
                                            ))}
                                            <input
                                                type="color"
                                                value={store.primary_color}
                                                onChange={(e) => setStore({ ...store, primary_color: e.target.value })}
                                                className="w-8 h-8 rounded-full cursor-pointer"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Currency</label>
                                        <select
                                            value={store.currency}
                                            onChange={(e) => setStore({ ...store, currency: e.target.value })}
                                            className={`w-full border rounded-xl px-4 py-3 focus:ring-2 focus:ring-purple-500/50 outline-none transition-colors ${isDark ? 'bg-black/30 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
                                        >
                                            <option value="PHP">PHP (₱)</option>
                                            <option value="USD">USD ($)</option>
                                            <option value="EUR">EUR (€)</option>
                                        </select>
                                    </div>

                                    <div className="flex items-center justify-between py-3">
                                        <div>
                                            <div className="font-medium text-white">Store Active</div>
                                            <div className="text-sm text-slate-400">Make your store visible to customers</div>
                                        </div>
                                        <button
                                            onClick={() => setStore({ ...store, is_active: !store.is_active })}
                                            className={`w-12 h-6 rounded-full transition-all ${store.is_active ? 'bg-green-500' : 'bg-slate-600'}`}
                                        >
                                            <div className={`w-5 h-5 bg-white rounded-full transition-transform ${store.is_active ? 'translate-x-6' : 'translate-x-0.5'}`} />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Contact Info */}
                            <div className={`backdrop-blur-md border rounded-xl p-6 lg:col-span-2 transition-colors ${isDark ? 'bg-black/30 border-white/10' : 'bg-white border-slate-200 shadow-sm'}`}>
                                <h2 className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>Contact Information</h2>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Email</label>
                                        <input
                                            type="email"
                                            value={store.email || ''}
                                            onChange={(e) => setStore({ ...store, email: e.target.value })}
                                            placeholder="contact@store.com"
                                            className={`w-full border rounded-xl px-4 py-3 focus:ring-2 focus:ring-purple-500/50 outline-none transition-colors ${isDark ? 'bg-black/30 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
                                        />
                                    </div>
                                    <div>
                                        <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Phone</label>
                                        <input
                                            type="tel"
                                            value={store.phone || ''}
                                            onChange={(e) => setStore({ ...store, phone: e.target.value })}
                                            placeholder="+63 912 345 6789"
                                            className={`w-full border rounded-xl px-4 py-3 focus:ring-2 focus:ring-purple-500/50 outline-none transition-colors ${isDark ? 'bg-black/30 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
                                        />
                                    </div>
                                    <div>
                                        <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Address</label>
                                        <input
                                            type="text"
                                            value={store.address || ''}
                                            onChange={(e) => setStore({ ...store, address: e.target.value })}
                                            placeholder="123 Business St, City"
                                            className={`w-full border rounded-xl px-4 py-3 focus:ring-2 focus:ring-purple-500/50 outline-none transition-colors ${isDark ? 'bg-black/30 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Google Sheets Integration */}
                            <div className={`backdrop-blur-md border rounded-xl p-6 lg:col-span-2 transition-colors ${isDark ? 'bg-black/30 border-white/10' : 'bg-white border-slate-200 shadow-sm'}`}>
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className={`text-lg font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                        <svg className="w-5 h-5 text-green-400" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M19.5 3H4.5C3.12 3 2 4.12 2 5.5v13C2 19.88 3.12 21 4.5 21h15c1.38 0 2.5-1.12 2.5-2.5v-13C22 4.12 20.88 3 19.5 3zM8 17.5H5v-2h3v2zm0-4H5v-2h3v2zm0-4H5v-2h3v2zm11 8H10v-2h9v2zm0-4H10v-2h9v2zm0-4H10v-2h9v2z" />
                                        </svg>
                                        Google Sheets Integration
                                    </h2>
                                    <button
                                        onClick={() => setShowSheetsGuide(true)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg text-sm font-medium transition-colors"
                                    >
                                        <HelpCircle className="w-4 h-4" />
                                        Setup Guide
                                    </button>
                                </div>
                                <p className={`text-sm mb-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                    Automatically sync new orders to a Google Sheet. Click "Setup Guide" for step-by-step instructions.
                                </p>
                                <div className="space-y-4">
                                    <div>
                                        <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Apps Script Webhook URL</label>
                                        <input
                                            type="url"
                                            value={store.google_webhook_url || ''}
                                            onChange={(e) => setStore({ ...store, google_webhook_url: e.target.value })}
                                            placeholder="https://script.google.com/macros/s/.../exec"
                                            className={`w-full border rounded-xl px-4 py-3 focus:ring-2 focus:ring-purple-500/50 outline-none transition-colors ${isDark ? 'bg-black/30 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
                                        />
                                    </div>
                                    <div>
                                        <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Sheet Name</label>
                                        <select
                                            value={store.google_sheet_name || 'Sheet1'}
                                            onChange={(e) => setStore({ ...store, google_sheet_name: e.target.value })}
                                            className={`w-full border rounded-xl px-4 py-3 focus:ring-2 focus:ring-purple-500/50 outline-none transition-colors ${isDark ? 'bg-black/30 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
                                        >
                                            <option value="Sheet1">Sheet1</option>
                                            <option value="Sheet2">Sheet2</option>
                                            <option value="Sheet3">Sheet3</option>
                                            <option value="Sheet4">Sheet4</option>
                                            <option value="Sheet5">Sheet5</option>
                                            <option value="Orders">Orders</option>
                                        </select>
                                    </div>
                                </div>
                                {store.google_webhook_url && (
                                    <div className="mt-3 flex items-center gap-2 text-green-400 text-sm">
                                        <Check className="w-4 h-4" />
                                        <span>Orders will be synced to Google Sheets ({store.google_sheet_name || 'Sheet1'})</span>
                                    </div>
                                )}
                            </div>

                            {/* Save Button */}
                            <div className="lg:col-span-2">
                                <button
                                    onClick={saveStore}
                                    className="w-full py-3 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-all"
                                >
                                    <Save className="w-5 h-5" />
                                    Save Settings
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Product Modal */}
                {showProductModal && (
                    <ProductModal
                        product={editingProduct}
                        storeId={store?.id || ''}
                        onClose={() => { setShowProductModal(false); setEditingProduct(null); }}
                        onSave={() => { setShowProductModal(false); setEditingProduct(null); loadProducts(); }}
                    />
                )}

                {/* Order Detail Modal */}
                {selectedOrder && (
                    <OrderModal
                        order={selectedOrder}
                        onClose={() => setSelectedOrder(null)}
                        onRefresh={loadOrders}
                        store={store}
                    />
                )}

                {/* Google Sheets Setup Guide Modal */}
                {showSheetsGuide && (
                    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
                        <div className={`border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto transition-colors ${isDark ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200 shadow-xl'}`}>
                            <div className={`sticky top-0 border-b px-6 py-4 flex items-center justify-between z-10 ${isDark ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'}`}>
                                <h2 className={`text-xl font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                    <svg className="w-6 h-6 text-green-400" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M19.5 3H4.5C3.12 3 2 4.12 2 5.5v13C2 19.88 3.12 21 4.5 21h15c1.38 0 2.5-1.12 2.5-2.5v-13C22 4.12 20.88 3 19.5 3zM8 17.5H5v-2h3v2zm0-4H5v-2h3v2zm0-4H5v-2h3v2zm11 8H10v-2h9v2zm0-4H10v-2h9v2zm0-4H10v-2h9v2z" />
                                    </svg>
                                    Google Sheets Setup Guide
                                </h2>
                                <button onClick={() => setShowSheetsGuide(false)} className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-white/10' : 'hover:bg-slate-100'}`}>
                                    <X className={`w-5 h-5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
                                </button>
                            </div>
                            <div className="p-6 space-y-6">
                                {/* Step 1 */}
                                <div className="flex gap-4">
                                    <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-white font-bold flex-shrink-0">1</div>
                                    <div>
                                        <h3 className={`font-semibold mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>Create a Google Sheet</h3>
                                        <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Go to <a href="https://sheets.google.com" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">sheets.google.com</a> and create a new spreadsheet for your orders.</p>
                                    </div>
                                </div>

                                {/* Step 2 */}
                                <div className="flex gap-4">
                                    <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-white font-bold flex-shrink-0">2</div>
                                    <div>
                                        <h3 className={`font-semibold mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>Add Column Headers</h3>
                                        <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>In the first row, add these headers:</p>
                                        <div className="bg-black/30 rounded-lg px-3 py-2 mt-2 text-xs text-green-400 font-mono overflow-x-auto">
                                            Order Number | Date | Customer Name | Phone | Email | Shipping Address | Items | Total | Payment Method | Notes
                                        </div>
                                    </div>
                                </div>

                                {/* Step 3 */}
                                <div className="flex gap-4">
                                    <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-white font-bold flex-shrink-0">3</div>
                                    <div>
                                        <h3 className={`font-semibold mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>Open Apps Script</h3>
                                        <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>In your Google Sheet, go to <strong>Extensions → Apps Script</strong></p>
                                    </div>
                                </div>

                                {/* Step 4 */}
                                <div className="flex gap-4">
                                    <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-white font-bold flex-shrink-0">4</div>
                                    <div className="flex-1">
                                        <h3 className={`font-semibold mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>Paste This Code</h3>
                                        <p className={`text-sm mb-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Delete any existing code and paste the following:</p>
                                        <div className="relative">
                                            <pre className="bg-black/50 rounded-lg p-4 text-xs text-green-400 font-mono overflow-x-auto max-h-64 overflow-y-auto">
                                                {`function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var sheet = SpreadsheetApp.getActiveSpreadsheet()
      .getSheetByName(data.sheetName || 'Sheet1');
    
    if (!sheet) {
      sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    }
    
    var rowData = data.rowData;
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var newRow = [];
    
    for (var i = 0; i < headers.length; i++) {
      newRow.push(rowData[headers[i]] || '');
    }
    
    sheet.appendRow(newRow);
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}`}
                                            </pre>
                                            <button
                                                onClick={() => {
                                                    navigator.clipboard.writeText(`function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var sheet = SpreadsheetApp.getActiveSpreadsheet()
      .getSheetByName(data.sheetName || 'Sheet1');
    
    if (!sheet) {
      sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    }
    
    var rowData = data.rowData;
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var newRow = [];
    
    for (var i = 0; i < headers.length; i++) {
      newRow.push(rowData[headers[i]] || '');
    }
    
    sheet.appendRow(newRow);
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}`);
                                                    setScriptCopied(true);
                                                    setTimeout(() => setScriptCopied(false), 2000);
                                                }}
                                                className="absolute top-2 right-2 px-3 py-1.5 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-xs font-medium flex items-center gap-1"
                                            >
                                                {scriptCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                                {scriptCopied ? 'Copied!' : 'Copy'}
                                            </button>
                                        </div>
                                        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 mt-3">
                                            <p className="text-amber-400 text-sm">
                                                <strong>⚠️ Important:</strong> This is a NEW script for Order Sync. Deploy it as a separate web app from your existing Forms script.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Step 5 */}
                                <div className="flex gap-4">
                                    <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-white font-bold flex-shrink-0">5</div>
                                    <div>
                                        <h3 className={`font-semibold mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>Deploy as Web App</h3>
                                        <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Click <strong>Deploy → New deployment</strong>, then:</p>
                                        <ul className={`text-sm mt-2 space-y-1 list-disc list-inside ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                            <li>Select type: <strong>Web app</strong></li>
                                            <li>Execute as: <strong>Me</strong></li>
                                            <li>Who has access: <strong>Anyone</strong></li>
                                            <li>Click <strong>Deploy</strong></li>
                                        </ul>
                                    </div>
                                </div>

                                {/* Step 6 */}
                                <div className="flex gap-4">
                                    <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white font-bold flex-shrink-0">6</div>
                                    <div>
                                        <h3 className={`font-semibold mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>Copy the Webhook URL</h3>
                                        <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Copy the Web app URL (starts with <code className="text-green-400">https://script.google.com/macros/s/...</code>) and paste it in the Store Settings above.</p>
                                    </div>
                                </div>

                                <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 mt-4">
                                    <p className="text-green-400 text-sm font-medium">✓ That's it! New orders will automatically sync to your Google Sheet.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div >
    );
};

// Product Modal Component
const ProductModal: React.FC<{
    product: Product | null;
    storeId: string;
    onClose: () => void;
    onSave: () => void;
}> = ({ product, storeId, onClose, onSave }) => {
    const { isDark } = useTheme();
    const [name, setName] = useState(product?.name || '');
    const [description, setDescription] = useState(product?.description || '');
    const [price, setPrice] = useState(product?.price?.toString() || '');
    const [compareAtPrice, setCompareAtPrice] = useState(product?.compare_at_price?.toString() || '');
    const [images, setImages] = useState<string[]>(product?.images || []);
    const [status, setStatus] = useState(product?.status || 'active');
    const [trackInventory, setTrackInventory] = useState(product?.track_inventory || false);
    const [stockQuantity, setStockQuantity] = useState(product?.stock_quantity?.toString() || '0');
    const [saving, setSaving] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleSave = async () => {
        if (!name || !price) return alert('Please fill in name and price');
        setSaving(true);
        try {
            const data = {
                store_id: storeId,
                name,
                description,
                price: parseFloat(price),
                compare_at_price: compareAtPrice ? parseFloat(compareAtPrice) : null,
                images,
                status,
                track_inventory: trackInventory,
                stock_quantity: parseInt(stockQuantity) || 0,
            };

            if (product?.id) {
                await supabase.from('products').update(data).eq('id', product.id);
            } else {
                await supabase.from('products').insert(data);
            }
            onSave();
        } catch (err) {
            console.error('Error saving product:', err);
        }
        setSaving(false);
    };

    const uploadImage = async (file: File) => {
        const fileName = `product-${Date.now()}-${file.name}`;
        const { error } = await supabase.storage.from('attachments').upload(fileName, file);
        if (error) return;
        const { data } = supabase.storage.from('attachments').getPublicUrl(fileName);
        setImages([...images, data.publicUrl]);
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className={`border rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto transition-colors ${isDark ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200 shadow-xl'}`}>
                <div className={`sticky top-0 border-b px-6 py-4 flex items-center justify-between z-10 ${isDark ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'}`}>
                    <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{product ? 'Edit Product' : 'Add Product'}</h2>
                    <button onClick={onClose} className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-white/10' : 'hover:bg-slate-100'}`}>
                        <X className={`w-5 h-5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    {/* Images */}
                    <div>
                        <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Product Images</label>
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) uploadImage(file);
                        }} />
                        <div className="flex flex-wrap gap-2">
                            {images.map((img, idx) => (
                                <div key={idx} className="relative w-20 h-20">
                                    <img src={img} alt="" className="w-full h-full object-cover rounded-lg" />
                                    <button
                                        onClick={() => setImages(images.filter((_, i) => i !== idx))}
                                        className="absolute -top-1 -right-1 p-1 bg-red-500 rounded-full"
                                    >
                                        <X className="w-3 h-3 text-white" />
                                    </button>
                                </div>
                            ))}
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className={`w-20 h-20 border-2 border-dashed rounded-lg flex items-center justify-center transition-colors ${isDark ? 'border-white/20 hover:border-purple-500/50' : 'border-slate-300 hover:border-purple-500/50'}`}
                            >
                                <Plus className={`w-6 h-6 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
                            </button>
                        </div>
                    </div>

                    {/* Name */}
                    <div>
                        <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Product Name *</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Enter product name"
                            className={`w-full border rounded-xl px-4 py-3 focus:ring-2 focus:ring-purple-500/50 outline-none transition-colors ${isDark ? 'bg-black/30 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Description</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                            className={`w-full border rounded-xl px-4 py-3 focus:ring-2 focus:ring-purple-500/50 outline-none resize-none transition-colors ${isDark ? 'bg-black/30 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                        />
                    </div>

                    {/* Pricing */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Price *</label>
                            <input
                                type="number"
                                value={price}
                                onChange={(e) => setPrice(e.target.value)}
                                placeholder="0.00"
                                className={`w-full border rounded-xl px-4 py-3 focus:ring-2 focus:ring-purple-500/50 outline-none transition-colors ${isDark ? 'bg-black/30 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                            />
                        </div>
                        <div>
                            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Compare at Price</label>
                            <input
                                type="number"
                                value={compareAtPrice}
                                onChange={(e) => setCompareAtPrice(e.target.value)}
                                placeholder="Original price"
                                className={`w-full border rounded-xl px-4 py-3 focus:ring-2 focus:ring-purple-500/50 outline-none transition-colors ${isDark ? 'bg-black/30 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                            />
                        </div>
                    </div>

                    {/* Inventory */}
                    <div className="flex items-center justify-between py-2">
                        <div>
                            <div className={`font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>Track Inventory</div>
                            <div className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Monitor stock levels</div>
                        </div>
                        <button
                            onClick={() => setTrackInventory(!trackInventory)}
                            className={`w-12 h-6 rounded-full transition-all ${trackInventory ? 'bg-purple-500' : isDark ? 'bg-slate-600' : 'bg-slate-300'}`}
                        >
                            <div className={`w-5 h-5 bg-white rounded-full transition-transform shadow-sm ${trackInventory ? 'translate-x-6' : 'translate-x-0.5'}`} />
                        </button>
                    </div>

                    {trackInventory && (
                        <div>
                            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Stock Quantity</label>
                            <input
                                type="number"
                                value={stockQuantity}
                                onChange={(e) => setStockQuantity(e.target.value)}
                                className={`w-full border rounded-xl px-4 py-3 focus:ring-2 focus:ring-purple-500/50 outline-none transition-colors ${isDark ? 'bg-black/30 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                            />
                        </div>
                    )}

                    {/* Status */}
                    <div>
                        <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Status</label>
                        <div className="flex gap-2">
                            {['active', 'draft', 'archived'].map(s => (
                                <button
                                    key={s}
                                    onClick={() => setStatus(s as any)}
                                    className={`px-4 py-2 rounded-lg font-medium text-sm capitalize transition-colors ${status === s
                                        ? s === 'active' ? 'bg-green-500/20 text-green-400' :
                                            s === 'draft' ? 'bg-yellow-500/20 text-yellow-400' :
                                                'bg-red-500/20 text-red-400'
                                        : isDark ? 'bg-black/30 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-500 hover:text-slate-900'
                                        }`}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className={`sticky bottom-0 border-t px-6 py-4 flex gap-3 ${isDark ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'}`}>
                    <button onClick={onClose} className={`flex-1 py-3 rounded-xl font-medium transition-colors ${isDark ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-900'}`}>
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex-1 py-3 bg-purple-500 hover:bg-purple-600 rounded-xl text-white font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                    >
                        {saving ? 'Saving...' : 'Save Product'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// Order Detail Modal
const OrderModal: React.FC<{ order: Order; onClose: () => void; onRefresh?: () => void; store?: StoreSettings | null }> = ({ order, onClose, onRefresh, store }) => {
    const { isDark } = useTheme();
    const statusInfo = ORDER_STATUSES.find(s => s.id === order.status);
    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editForm, setEditForm] = useState({
        customer_name: order.customer_name || '',
        customer_email: order.customer_email || '',
        customer_phone: order.customer_phone || '',
        shipping_address: order.shipping_address || '',
        notes: order.notes || '',
    });

    const handleSaveEdit = async () => {
        setSaving(true);
        try {
            await supabase
                .from('store_orders')
                .update({
                    customer_name: editForm.customer_name,
                    customer_email: editForm.customer_email,
                    customer_phone: editForm.customer_phone,
                    shipping_address: editForm.shipping_address,
                    notes: editForm.notes,
                })
                .eq('id', order.id);
            setIsEditing(false);
            if (onRefresh) onRefresh();
        } catch (err) {
            console.error('Error saving order:', err);
            alert('Failed to save changes');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className={`border rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto transition-colors ${isDark ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200 shadow-xl'}`}>
                <div className={`sticky top-0 border-b px-6 py-4 flex items-center justify-between z-10 ${isDark ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'}`}>
                    <div>
                        <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{order.order_number}</h2>
                        <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{new Date(order.created_at).toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {!isEditing && (
                            <button
                                onClick={() => setIsEditing(true)}
                                className="p-2 hover:bg-blue-500/20 rounded-lg transition-colors"
                                title="Edit Order"
                            >
                                <Edit2 className="w-4 h-4 text-blue-400" />
                            </button>
                        )}
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg">
                            <X className="w-5 h-5 text-slate-400" />
                        </button>
                    </div>
                </div>

                <div className="p-6 space-y-4">
                    {/* Status */}
                    <div className={`flex items-center gap-2 px-4 py-3 rounded-xl ${statusInfo ? `bg-${statusInfo.color}-500/20` : 'bg-slate-500/20'}`}>
                        {statusInfo && <statusInfo.icon className={`w-5 h-5 text-${statusInfo.color}-400`} />}
                        <span className={`font-medium text-${statusInfo?.color}-400`}>{statusInfo?.label}</span>
                    </div>

                    {/* Customer - Editable */}
                    <div>
                        <div className={`text-xs uppercase mb-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Customer</div>
                        {isEditing ? (
                            <div className="space-y-3">
                                <input
                                    type="text"
                                    value={editForm.customer_name}
                                    onChange={(e) => setEditForm({ ...editForm, customer_name: e.target.value })}
                                    placeholder="Customer Name"
                                    className={`w-full px-3 py-2 rounded-lg border text-sm ${isDark
                                        ? 'bg-black/30 border-white/10 text-white'
                                        : 'bg-white border-slate-200 text-slate-900'}`}
                                />
                                <input
                                    type="email"
                                    value={editForm.customer_email}
                                    onChange={(e) => setEditForm({ ...editForm, customer_email: e.target.value })}
                                    placeholder="Email"
                                    className={`w-full px-3 py-2 rounded-lg border text-sm ${isDark
                                        ? 'bg-black/30 border-white/10 text-white'
                                        : 'bg-white border-slate-200 text-slate-900'}`}
                                />
                                <input
                                    type="tel"
                                    value={editForm.customer_phone}
                                    onChange={(e) => setEditForm({ ...editForm, customer_phone: e.target.value })}
                                    placeholder="Phone"
                                    className={`w-full px-3 py-2 rounded-lg border text-sm ${isDark
                                        ? 'bg-black/30 border-white/10 text-white'
                                        : 'bg-white border-slate-200 text-slate-900'}`}
                                />
                                <textarea
                                    value={editForm.shipping_address}
                                    onChange={(e) => setEditForm({ ...editForm, shipping_address: e.target.value })}
                                    placeholder="Shipping Address"
                                    rows={2}
                                    className={`w-full px-3 py-2 rounded-lg border text-sm resize-none ${isDark
                                        ? 'bg-black/30 border-white/10 text-white'
                                        : 'bg-white border-slate-200 text-slate-900'}`}
                                />
                            </div>
                        ) : (
                            <>
                                <div className={`font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>{order.customer_name}</div>
                                {order.customer_email && <div className="text-sm text-slate-400">{order.customer_email}</div>}
                                {order.customer_phone && <div className="text-sm text-slate-400">{order.customer_phone}</div>}
                                {order.shipping_address && (
                                    <div className="mt-2 text-sm text-slate-400">{order.shipping_address}</div>
                                )}
                            </>
                        )}
                    </div>

                    {/* Items */}
                    <div>
                        <div className={`text-xs uppercase mb-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Items</div>
                        <div className="space-y-2">
                            {order.items?.map(item => (
                                <div key={item.id} className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${isDark ? 'bg-black/20' : 'bg-slate-50'}`}>
                                    {item.product_image && (
                                        <img src={item.product_image} alt="" className="w-10 h-10 rounded object-cover" />
                                    )}
                                    <div className="flex-1">
                                        <div className={`text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>{item.product_name}</div>
                                        <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>x{item.quantity}</div>
                                    </div>
                                    <div className={`font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>₱{item.line_total.toLocaleString()}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Totals */}
                    <div className={`border-t pt-4 space-y-2 ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                        <div className="flex justify-between text-sm">
                            <span className={`${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Subtotal</span>
                            <span className={`${isDark ? 'text-white' : 'text-slate-900'}`}>₱{order.subtotal.toLocaleString()}</span>
                        </div>
                        {order.shipping_fee > 0 && (
                            <div className="flex justify-between text-sm">
                                <span className={`${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Shipping</span>
                                <span className={`${isDark ? 'text-white' : 'text-slate-900'}`}>₱{order.shipping_fee.toLocaleString()}</span>
                            </div>
                        )}
                        {order.discount > 0 && (
                            <div className="flex justify-between text-sm">
                                <span className="text-green-400">Discount</span>
                                <span className="text-green-400">-₱{order.discount.toLocaleString()}</span>
                            </div>
                        )}
                        <div className={`flex justify-between text-lg font-bold pt-2 border-t ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                            <span className={`${isDark ? 'text-white' : 'text-slate-900'}`}>Total</span>
                            <span className="text-purple-400">₱{order.total.toLocaleString()}</span>
                        </div>
                    </div>

                    {/* Payment */}
                    {order.payment_method && (
                        <div className="flex items-center gap-2 text-sm">
                            <DollarSign className={`w-4 h-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
                            <span className={`${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Payment:</span>
                            <span className={`${isDark ? 'text-white' : 'text-slate-900'}`}>{order.payment_method}</span>
                            {order.payment_status && (
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${order.payment_status === 'paid' ? 'bg-green-500/20 text-green-400' :
                                    order.payment_status === 'pending_verification' ? 'bg-amber-500/20 text-amber-400' :
                                        order.payment_status === 'failed' ? 'bg-red-500/20 text-red-400' :
                                            'bg-slate-500/20 text-slate-400'
                                    }`}>
                                    {order.payment_status === 'pending_verification' ? 'Needs Verification' : order.payment_status}
                                </span>
                            )}
                        </div>
                    )}

                    {/* Proof of Payment */}
                    {order.proof_url && (
                        <div className={`rounded-xl p-4 ${isDark ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-amber-50 border border-amber-200'}`}>
                            <div className={`text-xs uppercase mb-3 flex items-center gap-2 ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                                <AlertCircle className="w-4 h-4" />
                                Proof of Payment
                            </div>
                            <a
                                href={order.proof_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block rounded-lg overflow-hidden border border-white/10 hover:opacity-80 transition-opacity"
                            >
                                <img
                                    src={order.proof_url}
                                    alt="Proof of Payment"
                                    className="w-full h-48 object-cover"
                                />
                            </a>
                            <p className={`text-xs mt-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                Click image to view full size
                            </p>
                            {order.payment_status === 'pending_verification' && (
                                <button
                                    onClick={async () => {
                                        if (confirm('Mark this payment as verified?')) {
                                            await supabase
                                                .from('store_orders')
                                                .update({ payment_status: 'paid' })
                                                .eq('id', order.id);

                                            // Sync to Google Sheets if webhook configured
                                            if (store?.google_webhook_url && order.order_number) {
                                                try {
                                                    await fetch('/api/sheets/sync', {
                                                        method: 'POST',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({
                                                            action: 'updatePaymentStatus',
                                                            webhookUrl: store.google_webhook_url,
                                                            sheetName: store.google_sheet_name || 'Sheet1',
                                                            orderId: order.order_number,
                                                            newStatus: 'Paid',
                                                            updatedAt: new Date().toISOString()
                                                        })
                                                    });
                                                    console.log('Payment status synced to Google Sheets');
                                                } catch (sheetErr) {
                                                    console.error('Failed to sync payment status to sheets:', sheetErr);
                                                }
                                            }

                                            onClose();
                                            if (onRefresh) onRefresh();
                                        }
                                    }}
                                    className="w-full mt-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2"
                                >
                                    <Check className="w-4 h-4" />
                                    Verify Payment
                                </button>
                            )}
                        </div>
                    )}

                    {/* Notes - Editable */}
                    <div>
                        <div className={`text-xs uppercase mb-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Notes</div>
                        {isEditing ? (
                            <textarea
                                value={editForm.notes}
                                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                                placeholder="Order notes..."
                                rows={2}
                                className={`w-full px-3 py-2 rounded-lg border text-sm resize-none ${isDark
                                    ? 'bg-black/30 border-white/10 text-white'
                                    : 'bg-white border-slate-200 text-slate-900'}`}
                            />
                        ) : (
                            order.notes ? (
                                <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{order.notes}</p>
                            ) : (
                                <p className="text-sm text-slate-500 italic">No notes</p>
                            )
                        )}
                    </div>
                </div>

                {/* Footer Actions */}
                <div className={`sticky bottom-0 border-t px-6 py-4 ${isDark ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'}`}>
                    {isEditing ? (
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setIsEditing(false)}
                                className={`flex-1 py-2 rounded-lg font-medium text-sm transition-colors ${isDark
                                    ? 'bg-slate-700 hover:bg-slate-600 text-white'
                                    : 'bg-slate-200 hover:bg-slate-300 text-slate-700'}`}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveEdit}
                                disabled={saving}
                                className="flex-1 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2"
                            >
                                <Save className="w-4 h-4" />
                                {saving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                                <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Status:</span>
                                <select
                                    value={order.status}
                                    onChange={async (e) => {
                                        await supabase
                                            .from('store_orders')
                                            .update({ status: e.target.value })
                                            .eq('id', order.id);
                                        if (onRefresh) onRefresh();
                                    }}
                                    className={`text-xs font-medium px-2 py-1.5 rounded-lg border cursor-pointer ${isDark
                                        ? 'bg-black/30 border-white/10 text-white'
                                        : 'bg-white border-slate-200 text-slate-700'}`}
                                >
                                    {ORDER_STATUSES.map(s => (
                                        <option key={s.id} value={s.id}>{s.label}</option>
                                    ))}
                                </select>
                            </div>
                            <button
                                onClick={async () => {
                                    if (confirm('Are you sure you want to delete this order? This cannot be undone.')) {
                                        // Delete order items first
                                        await supabase.from('order_items').delete().eq('order_id', order.id);
                                        // Then delete order
                                        await supabase.from('store_orders').delete().eq('id', order.id);
                                        onClose();
                                        if (onRefresh) onRefresh();
                                    }
                                }}
                                className="flex items-center gap-2 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm font-medium transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                                Delete Order
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Store;
