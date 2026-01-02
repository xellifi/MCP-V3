import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
    ShoppingCart, Package, Plus, Minus, X, Trash2, CheckCircle,
    MapPin, Phone, Mail, Store as StoreIcon, ArrowLeft, Heart,
    ShoppingBag, Sparkles
} from 'lucide-react';
import { supabase } from '../lib/supabase';

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
    status: string;
    category?: string;
}

interface Store {
    id: string;
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
}

interface CartItem {
    product: Product;
    quantity: number;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
    PHP: '₱',
    USD: '$',
    EUR: '€',
};

const StoreView: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const [store, setStore] = useState<Store | null>(null);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Cart state
    const [cart, setCart] = useState<CartItem[]>([]);
    const [showCart, setShowCart] = useState(false);

    // Checkout state
    const [showCheckout, setShowCheckout] = useState(false);
    const [checkoutStep, setCheckoutStep] = useState(1);
    const [orderPlaced, setOrderPlaced] = useState(false);

    // Customer form
    const [customerName, setCustomerName] = useState('');
    const [customerEmail, setCustomerEmail] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [shippingAddress, setShippingAddress] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('cod');
    const [notes, setNotes] = useState('');

    // Selected product for detail view
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

    // Load store and products
    useEffect(() => {
        loadStore();
    }, [slug]);

    const loadStore = async () => {
        setLoading(true);
        try {
            const { data: storeData, error: storeError } = await supabase
                .from('stores')
                .select('*')
                .eq('slug', slug)
                .eq('is_active', true)
                .single();

            if (storeError || !storeData) {
                setError('Store not found');
                setLoading(false);
                return;
            }

            setStore(storeData);

            const { data: productsData } = await supabase
                .from('products')
                .select('*')
                .eq('store_id', storeData.id)
                .eq('status', 'active')
                .order('created_at', { ascending: false });

            setProducts(productsData || []);
        } catch (err) {
            console.error('Error loading store:', err);
            setError('Failed to load store');
        }
        setLoading(false);
    };

    const currencySymbol = CURRENCY_SYMBOLS[store?.currency || 'PHP'] || '₱';

    // Cart functions
    const addToCart = (product: Product) => {
        const existing = cart.find(item => item.product.id === product.id);
        if (existing) {
            setCart(cart.map(item =>
                item.product.id === product.id
                    ? { ...item, quantity: item.quantity + 1 }
                    : item
            ));
        } else {
            setCart([...cart, { product, quantity: 1 }]);
        }
    };

    const removeFromCart = (productId: string) => {
        setCart(cart.filter(item => item.product.id !== productId));
    };

    const updateQuantity = (productId: string, quantity: number) => {
        if (quantity < 1) {
            removeFromCart(productId);
            return;
        }
        setCart(cart.map(item =>
            item.product.id === productId ? { ...item, quantity } : item
        ));
    };

    const cartTotal = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
    const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

    // Place order
    const placeOrder = async () => {
        if (!customerName || !customerPhone) {
            alert('Please fill in your name and phone number');
            return;
        }

        try {
            const { data: order, error: orderError } = await supabase
                .from('store_orders')
                .insert({
                    store_id: store?.id,
                    customer_name: customerName,
                    customer_email: customerEmail,
                    customer_phone: customerPhone,
                    shipping_address: shippingAddress,
                    payment_method: paymentMethod,
                    subtotal: cartTotal,
                    total: cartTotal,
                    notes,
                })
                .select()
                .single();

            if (orderError) throw orderError;

            const orderItems = cart.map(item => ({
                order_id: order.id,
                product_id: item.product.id,
                product_name: item.product.name,
                product_price: item.product.price,
                product_image: item.product.images?.[0],
                quantity: item.quantity,
                line_total: item.product.price * item.quantity,
            }));

            await supabase.from('order_items').insert(orderItems);

            setCart([]);
            setOrderPlaced(true);
        } catch (err) {
            console.error('Error placing order:', err);
            alert('Failed to place order. Please try again.');
        }
    };

    // Loading state
    if (loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-gray-900 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-500">Loading store...</p>
                </div>
            </div>
        );
    }

    // Error state
    if (error || !store) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="text-center">
                    <StoreIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-gray-800 mb-2">Store Not Found</h1>
                    <p className="text-gray-500">{error || 'This store does not exist or is not active.'}</p>
                </div>
            </div>
        );
    }

    // Order success state
    if (orderPlaced) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center p-4">
                <div className="text-center max-w-md">
                    <div
                        className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
                        style={{ backgroundColor: store.primary_color }}
                    >
                        <CheckCircle className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-3">Order Placed!</h1>
                    <p className="text-gray-600 mb-6">
                        Thank you for your order! We'll contact you soon to confirm the details.
                    </p>
                    <button
                        onClick={() => { setOrderPlaced(false); setShowCheckout(false); setCheckoutStep(1); }}
                        className="px-8 py-4 rounded-full text-white font-semibold text-lg shadow-lg hover:shadow-xl transition-all"
                        style={{ backgroundColor: store.primary_color }}
                    >
                        Continue Shopping
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-white border-b border-gray-100">
                <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {store.logo_url ? (
                            <img src={store.logo_url} alt={store.name} className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                            <div
                                className="w-10 h-10 rounded-full flex items-center justify-center"
                                style={{ backgroundColor: store.primary_color }}
                            >
                                <StoreIcon className="w-5 h-5 text-white" />
                            </div>
                        )}
                        <div>
                            <h1 className="font-bold text-gray-900">{store.name}</h1>
                            {store.description && (
                                <p className="text-xs text-gray-500 line-clamp-1 max-w-[200px]">{store.description}</p>
                            )}
                        </div>
                    </div>

                    {/* Cart Button */}
                    <button
                        onClick={() => setShowCart(true)}
                        className="relative p-3 rounded-full hover:bg-gray-100 transition-colors"
                    >
                        <ShoppingBag className="w-6 h-6 text-gray-800" />
                        {cartItemCount > 0 && (
                            <span
                                className="absolute top-1 right-1 w-5 h-5 rounded-full text-xs text-white flex items-center justify-center font-bold"
                                style={{ backgroundColor: store.primary_color }}
                            >
                                {cartItemCount}
                            </span>
                        )}
                    </button>
                </div>
            </header>

            {/* Hero Section */}
            <section
                className="py-12 px-4"
                style={{ background: `linear-gradient(135deg, ${store.primary_color}15 0%, ${store.primary_color}05 100%)` }}
            >
                <div className="max-w-6xl mx-auto text-center">
                    <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
                        Welcome to {store.name}
                    </h2>
                    <p className="text-gray-600 max-w-md mx-auto">
                        {store.description || 'Discover our amazing collection of products'}
                    </p>
                </div>
            </section>

            {/* Products Grid */}
            <main className="max-w-6xl mx-auto px-4 py-10">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900">All Products</h3>
                        <p className="text-sm text-gray-500">{products.length} items</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                    {products.map(product => (
                        <div
                            key={product.id}
                            className="group bg-white rounded-2xl overflow-hidden border border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all duration-300"
                        >
                            {/* Product Image */}
                            <div
                                className="relative aspect-square bg-gray-50 cursor-pointer overflow-hidden"
                                onClick={() => setSelectedProduct(product)}
                            >
                                {product.images?.[0] ? (
                                    <img
                                        src={product.images[0]}
                                        alt={product.name}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <Package className="w-12 h-12 text-gray-300" />
                                    </div>
                                )}

                                {/* Discount Badge */}
                                {product.compare_at_price && product.compare_at_price > product.price && (
                                    <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-bold text-white bg-red-500">
                                        -{Math.round((1 - product.price / product.compare_at_price) * 100)}%
                                    </div>
                                )}

                                {/* Quick Add Button */}
                                <button
                                    onClick={(e) => { e.stopPropagation(); addToCart(product); }}
                                    className="absolute bottom-3 right-3 p-2.5 rounded-full bg-white shadow-lg opacity-0 group-hover:opacity-100 transition-all hover:scale-110"
                                    style={{ color: store.primary_color }}
                                >
                                    <Plus className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Product Info */}
                            <div className="p-4">
                                <h3 className="font-medium text-gray-900 line-clamp-2 text-sm mb-2 min-h-[40px]">{product.name}</h3>
                                <div className="flex items-baseline gap-2 mb-3">
                                    <span className="text-lg font-bold text-gray-900">
                                        {currencySymbol}{product.price.toLocaleString()}
                                    </span>
                                    {product.compare_at_price && (
                                        <span className="text-sm text-gray-400 line-through">
                                            {currencySymbol}{product.compare_at_price.toLocaleString()}
                                        </span>
                                    )}
                                </div>
                                <button
                                    onClick={() => addToCart(product)}
                                    className="w-full py-2.5 rounded-full font-medium text-sm transition-all border-2 hover:opacity-90"
                                    style={{
                                        borderColor: store.primary_color,
                                        color: store.primary_color,
                                    }}
                                >
                                    Add to Cart
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {products.length === 0 && (
                    <div className="py-20 text-center">
                        <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-gray-800 mb-2">No Products Yet</h3>
                        <p className="text-gray-500">Check back soon for amazing products!</p>
                    </div>
                )}
            </main>

            {/* Footer */}
            <footer className="bg-gray-50 border-t border-gray-100 py-12">
                <div className="max-w-6xl mx-auto px-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div>
                            <div className="flex items-center gap-3 mb-4">
                                {store.logo_url ? (
                                    <img src={store.logo_url} alt={store.name} className="w-10 h-10 rounded-full object-cover" />
                                ) : (
                                    <div
                                        className="w-10 h-10 rounded-full flex items-center justify-center"
                                        style={{ backgroundColor: store.primary_color }}
                                    >
                                        <StoreIcon className="w-5 h-5 text-white" />
                                    </div>
                                )}
                                <span className="font-bold text-lg text-gray-900">{store.name}</span>
                            </div>
                            {store.description && <p className="text-gray-500 text-sm">{store.description}</p>}
                        </div>

                        <div>
                            <h4 className="font-semibold text-gray-900 mb-4">Contact Us</h4>
                            <div className="space-y-2 text-sm text-gray-600">
                                {store.email && (
                                    <div className="flex items-center gap-2">
                                        <Mail className="w-4 h-4 text-gray-400" />
                                        {store.email}
                                    </div>
                                )}
                                {store.phone && (
                                    <div className="flex items-center gap-2">
                                        <Phone className="w-4 h-4 text-gray-400" />
                                        {store.phone}
                                    </div>
                                )}
                                {store.address && (
                                    <div className="flex items-center gap-2">
                                        <MapPin className="w-4 h-4 text-gray-400" />
                                        {store.address}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div>
                            <h4 className="font-semibold text-gray-900 mb-4">Shop Info</h4>
                            <div className="space-y-2 text-sm text-gray-600">
                                <p>✨ {products.length} Products</p>
                                <p>🚚 Fast Delivery</p>
                                <p>🔒 Secure Checkout</p>
                            </div>
                        </div>
                    </div>
                    <div className="border-t border-gray-200 mt-8 pt-8 text-center text-sm text-gray-500">
                        © {new Date().getFullYear()} {store.name}. All rights reserved.
                    </div>
                </div>
            </footer>

            {/* Cart Sidebar */}
            {showCart && (
                <div className="fixed inset-0 z-50">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowCart(false)} />
                    <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl animate-slide-in">
                        <div className="flex flex-col h-full">
                            {/* Cart Header */}
                            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                                <div className="flex items-center gap-2">
                                    <ShoppingBag className="w-5 h-5" style={{ color: store.primary_color }} />
                                    <h2 className="text-lg font-bold text-gray-900">Your Cart</h2>
                                </div>
                                <button onClick={() => setShowCart(false)} className="p-2 hover:bg-gray-100 rounded-full">
                                    <X className="w-5 h-5 text-gray-500" />
                                </button>
                            </div>

                            {/* Cart Items */}
                            <div className="flex-1 overflow-y-auto p-6">
                                {cart.length === 0 ? (
                                    <div className="py-16 text-center">
                                        <ShoppingBag className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                                        <p className="text-gray-500 font-medium">Your cart is empty</p>
                                        <p className="text-gray-400 text-sm mt-1">Add some products to get started</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {cart.map(item => (
                                            <div key={item.product.id} className="flex gap-4 p-4 bg-gray-50 rounded-2xl">
                                                <div className="w-20 h-20 rounded-xl overflow-hidden bg-white flex-shrink-0">
                                                    {item.product.images?.[0] ? (
                                                        <img src={item.product.images[0]} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center">
                                                            <Package className="w-8 h-8 text-gray-300" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-medium text-gray-900 line-clamp-1">{item.product.name}</h4>
                                                    <p className="text-sm font-bold mt-1" style={{ color: store.primary_color }}>
                                                        {currencySymbol}{item.product.price.toLocaleString()}
                                                    </p>
                                                    <div className="flex items-center gap-3 mt-2">
                                                        <button
                                                            onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                                                            className="w-7 h-7 flex items-center justify-center bg-white rounded-full border hover:bg-gray-50"
                                                        >
                                                            <Minus className="w-3 h-3" />
                                                        </button>
                                                        <span className="font-semibold text-gray-900">{item.quantity}</span>
                                                        <button
                                                            onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                                                            className="w-7 h-7 flex items-center justify-center bg-white rounded-full border hover:bg-gray-50"
                                                        >
                                                            <Plus className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => removeFromCart(item.product.id)}
                                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full h-fit"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Cart Footer */}
                            {cart.length > 0 && (
                                <div className="border-t border-gray-100 p-6 space-y-4 bg-white">
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-600">Subtotal</span>
                                        <span className="text-xl font-bold text-gray-900">{currencySymbol}{cartTotal.toLocaleString()}</span>
                                    </div>
                                    <button
                                        onClick={() => { setShowCart(false); setShowCheckout(true); }}
                                        className="w-full py-4 rounded-full font-semibold text-white text-lg shadow-lg hover:shadow-xl transition-all"
                                        style={{ backgroundColor: store.primary_color }}
                                    >
                                        Checkout
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Checkout Modal */}
            {showCheckout && (
                <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white rounded-3xl w-full max-w-lg my-8 shadow-2xl">
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                            <div className="flex items-center gap-3">
                                {checkoutStep > 1 && (
                                    <button onClick={() => setCheckoutStep(checkoutStep - 1)} className="p-2 hover:bg-gray-100 rounded-full">
                                        <ArrowLeft className="w-5 h-5" />
                                    </button>
                                )}
                                <h2 className="text-lg font-bold text-gray-900">
                                    {checkoutStep === 1 ? 'Your Details' : 'Review Order'}
                                </h2>
                            </div>
                            <button onClick={() => setShowCheckout(false)} className="p-2 hover:bg-gray-100 rounded-full">
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        <div className="p-6">
                            {checkoutStep === 1 && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name *</label>
                                        <input
                                            type="text"
                                            value={customerName}
                                            onChange={(e) => setCustomerName(e.target.value)}
                                            placeholder="Juan Dela Cruz"
                                            className="w-full px-4 py-3.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number *</label>
                                        <input
                                            type="tel"
                                            value={customerPhone}
                                            onChange={(e) => setCustomerPhone(e.target.value)}
                                            placeholder="+63 912 345 6789"
                                            className="w-full px-4 py-3.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Email (Optional)</label>
                                        <input
                                            type="email"
                                            value={customerEmail}
                                            onChange={(e) => setCustomerEmail(e.target.value)}
                                            placeholder="juan@email.com"
                                            className="w-full px-4 py-3.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Shipping Address</label>
                                        <textarea
                                            value={shippingAddress}
                                            onChange={(e) => setShippingAddress(e.target.value)}
                                            placeholder="Street, Barangay, City, Province"
                                            rows={3}
                                            className="w-full px-4 py-3.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-all resize-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {[
                                                { id: 'cod', label: 'Cash', icon: '💵' },
                                                { id: 'gcash', label: 'GCash', icon: '📱' },
                                                { id: 'bank', label: 'Bank', icon: '🏦' }
                                            ].map(method => (
                                                <button
                                                    key={method.id}
                                                    onClick={() => setPaymentMethod(method.id)}
                                                    className={`p-3 rounded-xl border-2 text-center transition-all ${paymentMethod === method.id
                                                            ? 'border-gray-900 bg-gray-50'
                                                            : 'border-gray-200 hover:border-gray-300'
                                                        }`}
                                                >
                                                    <div className="text-2xl mb-1">{method.icon}</div>
                                                    <div className="text-xs font-medium text-gray-700">{method.label}</div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setCheckoutStep(2)}
                                        disabled={!customerName || !customerPhone}
                                        className="w-full py-4 rounded-full font-semibold text-white transition-all disabled:opacity-50 mt-4"
                                        style={{ backgroundColor: store.primary_color }}
                                    >
                                        Continue
                                    </button>
                                </div>
                            )}

                            {checkoutStep === 2 && (
                                <div className="space-y-4">
                                    {/* Order Summary */}
                                    <div className="bg-gray-50 rounded-2xl p-4">
                                        <h3 className="font-semibold text-gray-900 mb-3">Order Summary</h3>
                                        <div className="space-y-2">
                                            {cart.map(item => (
                                                <div key={item.product.id} className="flex justify-between text-sm">
                                                    <span className="text-gray-600">{item.product.name} × {item.quantity}</span>
                                                    <span className="font-medium text-gray-900">{currencySymbol}{(item.product.price * item.quantity).toLocaleString()}</span>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="border-t border-gray-200 mt-3 pt-3 flex justify-between">
                                            <span className="font-bold text-gray-900">Total</span>
                                            <span className="font-bold text-lg" style={{ color: store.primary_color }}>{currencySymbol}{cartTotal.toLocaleString()}</span>
                                        </div>
                                    </div>

                                    {/* Customer Info */}
                                    <div className="bg-gray-50 rounded-2xl p-4">
                                        <h3 className="font-semibold text-gray-900 mb-2">Shipping To</h3>
                                        <p className="font-medium text-gray-900">{customerName}</p>
                                        <p className="text-sm text-gray-500">{customerPhone}</p>
                                        {shippingAddress && <p className="text-sm text-gray-500 mt-1">{shippingAddress}</p>}
                                    </div>

                                    {/* Notes */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Order Notes (Optional)</label>
                                        <textarea
                                            value={notes}
                                            onChange={(e) => setNotes(e.target.value)}
                                            placeholder="Any special instructions..."
                                            rows={2}
                                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-all resize-none"
                                        />
                                    </div>

                                    <button
                                        onClick={placeOrder}
                                        className="w-full py-4 rounded-full font-semibold text-white shadow-lg hover:shadow-xl transition-all"
                                        style={{ backgroundColor: store.primary_color }}
                                    >
                                        Place Order
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Product Detail Modal */}
            {selectedProduct && (
                <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white rounded-3xl w-full max-w-2xl my-8 overflow-hidden shadow-2xl">
                        <div className="md:flex">
                            {/* Image */}
                            <div className="md:w-1/2 aspect-square bg-gray-50">
                                {selectedProduct.images?.[0] ? (
                                    <img src={selectedProduct.images[0]} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <Package className="w-16 h-16 text-gray-300" />
                                    </div>
                                )}
                            </div>

                            {/* Info */}
                            <div className="md:w-1/2 p-6 flex flex-col">
                                <button
                                    onClick={() => setSelectedProduct(null)}
                                    className="self-end p-2 hover:bg-gray-100 rounded-full mb-4"
                                >
                                    <X className="w-5 h-5 text-gray-500" />
                                </button>

                                <h2 className="text-2xl font-bold text-gray-900 mb-2">{selectedProduct.name}</h2>

                                <div className="flex items-baseline gap-3 mb-4">
                                    <span className="text-3xl font-bold text-gray-900">
                                        {currencySymbol}{selectedProduct.price.toLocaleString()}
                                    </span>
                                    {selectedProduct.compare_at_price && (
                                        <span className="text-lg text-gray-400 line-through">
                                            {currencySymbol}{selectedProduct.compare_at_price.toLocaleString()}
                                        </span>
                                    )}
                                </div>

                                {selectedProduct.description && (
                                    <p className="text-gray-600 mb-6 flex-1">{selectedProduct.description}</p>
                                )}

                                <button
                                    onClick={() => { addToCart(selectedProduct); setSelectedProduct(null); }}
                                    className="w-full py-4 rounded-full font-semibold text-white shadow-lg hover:shadow-xl transition-all"
                                    style={{ backgroundColor: store.primary_color }}
                                >
                                    Add to Cart
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Custom Styles */}
            <style>{`
                @keyframes slide-in {
                    from { transform: translateX(100%); }
                    to { transform: translateX(0); }
                }
                .animate-slide-in {
                    animation: slide-in 0.3s ease-out;
                }
            `}</style>
        </div>
    );
};

export default StoreView;
