import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
    ShoppingCart, Package, Plus, Minus, X, Trash2, CheckCircle,
    MapPin, Phone, Mail, Store as StoreIcon, ArrowLeft, Heart
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
            // Get store by slug
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

            // Get active products
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
            // Create order
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

            // Create order items
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

            // Clear cart and show success
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
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-slate-500">Loading store...</p>
                </div>
            </div>
        );
    }

    // Error state
    if (error || !store) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
                <div className="text-center">
                    <StoreIcon className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-slate-700 mb-2">Store Not Found</h1>
                    <p className="text-slate-500">{error || 'This store does not exist or is not active.'}</p>
                </div>
            </div>
        );
    }

    // Order success state
    if (orderPlaced) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4" style={{ background: `linear-gradient(135deg, ${store.primary_color}10, ${store.primary_color}05)` }}>
                <div className="text-center max-w-md">
                    <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: `${store.primary_color}20` }}>
                        <CheckCircle className="w-10 h-10" style={{ color: store.primary_color }} />
                    </div>
                    <h1 className="text-3xl font-bold text-slate-800 mb-3">Order Placed!</h1>
                    <p className="text-slate-600 mb-6">
                        Thank you for your order! We'll contact you soon to confirm the details.
                    </p>
                    <button
                        onClick={() => { setOrderPlaced(false); setShowCheckout(false); setCheckoutStep(1); }}
                        className="px-6 py-3 rounded-xl text-white font-medium"
                        style={{ backgroundColor: store.primary_color }}
                    >
                        Continue Shopping
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen" style={{ background: `linear-gradient(180deg, ${store.primary_color}08 0%, white 50%)` }}>
            {/* Header */}
            <header className="sticky top-0 z-40 backdrop-blur-lg bg-white/80 border-b border-slate-100">
                <div className="max-w-6xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            {store.logo_url ? (
                                <img src={store.logo_url} alt={store.name} className="w-10 h-10 rounded-xl object-cover" />
                            ) : (
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: store.primary_color }}>
                                    <StoreIcon className="w-5 h-5 text-white" />
                                </div>
                            )}
                            <div>
                                <h1 className="font-bold text-slate-800">{store.name}</h1>
                                {store.description && (
                                    <p className="text-xs text-slate-500 line-clamp-1">{store.description}</p>
                                )}
                            </div>
                        </div>

                        {/* Cart Button */}
                        <button
                            onClick={() => setShowCart(true)}
                            className="relative p-3 rounded-xl transition-colors hover:bg-slate-100"
                        >
                            <ShoppingCart className="w-6 h-6 text-slate-700" />
                            {cartItemCount > 0 && (
                                <span
                                    className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-xs text-white flex items-center justify-center font-bold"
                                    style={{ backgroundColor: store.primary_color }}
                                >
                                    {cartItemCount}
                                </span>
                            )}
                        </button>
                    </div>
                </div>
            </header>

            {/* Products Grid */}
            <main className="max-w-6xl mx-auto px-4 py-8">
                <div className="mb-6">
                    <h2 className="text-2xl font-bold text-slate-800">Our Products</h2>
                    <p className="text-slate-500">{products.length} products available</p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                    {products.map(product => (
                        <div
                            key={product.id}
                            className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-100"
                        >
                            {/* Product Image */}
                            <div
                                className="relative aspect-square bg-slate-100 cursor-pointer overflow-hidden"
                                onClick={() => setSelectedProduct(product)}
                            >
                                {product.images?.[0] ? (
                                    <img
                                        src={product.images[0]}
                                        alt={product.name}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <Package className="w-12 h-12 text-slate-300" />
                                    </div>
                                )}

                                {/* Discount Badge */}
                                {product.compare_at_price && product.compare_at_price > product.price && (
                                    <div
                                        className="absolute top-2 left-2 px-2 py-1 rounded-lg text-xs font-bold text-white"
                                        style={{ backgroundColor: store.primary_color }}
                                    >
                                        {Math.round((1 - product.price / product.compare_at_price) * 100)}% OFF
                                    </div>
                                )}

                                {/* Quick Add Button */}
                                <button
                                    onClick={(e) => { e.stopPropagation(); addToCart(product); }}
                                    className="absolute bottom-2 right-2 p-2 rounded-xl bg-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                    style={{ color: store.primary_color }}
                                >
                                    <Plus className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Product Info */}
                            <div className="p-4">
                                <h3 className="font-semibold text-slate-800 line-clamp-2 mb-2">{product.name}</h3>
                                <div className="flex items-center gap-2">
                                    <span className="text-lg font-bold" style={{ color: store.primary_color }}>
                                        {currencySymbol}{product.price.toLocaleString()}
                                    </span>
                                    {product.compare_at_price && (
                                        <span className="text-sm text-slate-400 line-through">
                                            {currencySymbol}{product.compare_at_price.toLocaleString()}
                                        </span>
                                    )}
                                </div>
                                <button
                                    onClick={() => addToCart(product)}
                                    className="w-full mt-3 py-2.5 rounded-xl font-medium text-sm text-white transition-all hover:opacity-90"
                                    style={{ backgroundColor: store.primary_color }}
                                >
                                    Add to Cart
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {products.length === 0 && (
                    <div className="py-20 text-center">
                        <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-slate-700 mb-2">No Products Yet</h3>
                        <p className="text-slate-500">Check back soon for new products!</p>
                    </div>
                )}
            </main>

            {/* Footer */}
            <footer className="bg-slate-900 text-white py-12 mt-12">
                <div className="max-w-6xl mx-auto px-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div>
                            <div className="flex items-center gap-3 mb-4">
                                {store.logo_url ? (
                                    <img src={store.logo_url} alt={store.name} className="w-10 h-10 rounded-xl object-cover" />
                                ) : (
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: store.primary_color }}>
                                        <StoreIcon className="w-5 h-5 text-white" />
                                    </div>
                                )}
                                <span className="font-bold text-lg">{store.name}</span>
                            </div>
                            {store.description && <p className="text-slate-400 text-sm">{store.description}</p>}
                        </div>

                        <div>
                            <h4 className="font-semibold mb-4">Contact Us</h4>
                            <div className="space-y-2 text-sm text-slate-400">
                                {store.email && (
                                    <div className="flex items-center gap-2">
                                        <Mail className="w-4 h-4" />
                                        {store.email}
                                    </div>
                                )}
                                {store.phone && (
                                    <div className="flex items-center gap-2">
                                        <Phone className="w-4 h-4" />
                                        {store.phone}
                                    </div>
                                )}
                                {store.address && (
                                    <div className="flex items-center gap-2">
                                        <MapPin className="w-4 h-4" />
                                        {store.address}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div>
                            <h4 className="font-semibold mb-4">Shop</h4>
                            <div className="space-y-2 text-sm text-slate-400">
                                <p>{products.length} Products</p>
                                <p>Fast Delivery</p>
                                <p>Secure Checkout</p>
                            </div>
                        </div>
                    </div>
                    <div className="border-t border-slate-800 mt-8 pt-8 text-center text-sm text-slate-500">
                        © {new Date().getFullYear()} {store.name}. All rights reserved.
                    </div>
                </div>
            </footer>

            {/* Cart Sidebar */}
            {showCart && (
                <div className="fixed inset-0 z-50">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setShowCart(false)} />
                    <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl">
                        <div className="flex flex-col h-full">
                            {/* Cart Header */}
                            <div className="flex items-center justify-between p-4 border-b">
                                <h2 className="text-xl font-bold text-slate-800">Shopping Cart</h2>
                                <button onClick={() => setShowCart(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                                    <X className="w-5 h-5 text-slate-500" />
                                </button>
                            </div>

                            {/* Cart Items */}
                            <div className="flex-1 overflow-y-auto p-4">
                                {cart.length === 0 ? (
                                    <div className="py-12 text-center">
                                        <ShoppingCart className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                        <p className="text-slate-500">Your cart is empty</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {cart.map(item => (
                                            <div key={item.product.id} className="flex gap-3 p-3 bg-slate-50 rounded-xl">
                                                <div className="w-20 h-20 rounded-lg overflow-hidden bg-white flex-shrink-0">
                                                    {item.product.images?.[0] ? (
                                                        <img src={item.product.images[0]} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center">
                                                            <Package className="w-8 h-8 text-slate-300" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-medium text-slate-800 line-clamp-1">{item.product.name}</h4>
                                                    <p className="text-sm font-bold" style={{ color: store.primary_color }}>
                                                        {currencySymbol}{item.product.price.toLocaleString()}
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-2">
                                                        <button
                                                            onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                                                            className="p-1 bg-white rounded border hover:bg-slate-50"
                                                        >
                                                            <Minus className="w-4 h-4" />
                                                        </button>
                                                        <span className="w-8 text-center font-medium">{item.quantity}</span>
                                                        <button
                                                            onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                                                            className="p-1 bg-white rounded border hover:bg-slate-50"
                                                        >
                                                            <Plus className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => removeFromCart(item.product.id)}
                                                    className="p-2 text-red-400 hover:bg-red-50 rounded-lg h-fit"
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
                                <div className="border-t p-4 space-y-4">
                                    <div className="flex justify-between text-lg font-bold">
                                        <span>Total</span>
                                        <span style={{ color: store.primary_color }}>{currencySymbol}{cartTotal.toLocaleString()}</span>
                                    </div>
                                    <button
                                        onClick={() => { setShowCart(false); setShowCheckout(true); }}
                                        className="w-full py-3 rounded-xl font-semibold text-white transition-all hover:opacity-90"
                                        style={{ backgroundColor: store.primary_color }}
                                    >
                                        Proceed to Checkout
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Checkout Modal */}
            {showCheckout && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white rounded-2xl w-full max-w-lg my-8">
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b">
                            <div className="flex items-center gap-3">
                                {checkoutStep > 1 && (
                                    <button onClick={() => setCheckoutStep(checkoutStep - 1)} className="p-2 hover:bg-slate-100 rounded-lg">
                                        <ArrowLeft className="w-5 h-5" />
                                    </button>
                                )}
                                <h2 className="text-xl font-bold text-slate-800">
                                    {checkoutStep === 1 ? 'Your Information' : 'Review Order'}
                                </h2>
                            </div>
                            <button onClick={() => setShowCheckout(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                                <X className="w-5 h-5 text-slate-500" />
                            </button>
                        </div>

                        <div className="p-4">
                            {checkoutStep === 1 && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label>
                                        <input
                                            type="text"
                                            value={customerName}
                                            onChange={(e) => setCustomerName(e.target.value)}
                                            placeholder="Juan Dela Cruz"
                                            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/50 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number *</label>
                                        <input
                                            type="tel"
                                            value={customerPhone}
                                            onChange={(e) => setCustomerPhone(e.target.value)}
                                            placeholder="+63 912 345 6789"
                                            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/50 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Email (Optional)</label>
                                        <input
                                            type="email"
                                            value={customerEmail}
                                            onChange={(e) => setCustomerEmail(e.target.value)}
                                            placeholder="juan@email.com"
                                            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/50 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Shipping Address</label>
                                        <textarea
                                            value={shippingAddress}
                                            onChange={(e) => setShippingAddress(e.target.value)}
                                            placeholder="Street, Barangay, City, Province"
                                            rows={3}
                                            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/50 outline-none resize-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">Payment Method</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {['cod', 'gcash', 'bank'].map(method => (
                                                <button
                                                    key={method}
                                                    onClick={() => setPaymentMethod(method)}
                                                    className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${paymentMethod === method
                                                            ? 'border-purple-500 bg-purple-50 text-purple-700'
                                                            : 'border-slate-200 hover:border-slate-300'
                                                        }`}
                                                >
                                                    {method === 'cod' ? '💵 Cash on Delivery' : method === 'gcash' ? '📱 GCash' : '🏦 Bank Transfer'}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setCheckoutStep(2)}
                                        disabled={!customerName || !customerPhone}
                                        className="w-full py-3 rounded-xl font-semibold text-white transition-all disabled:opacity-50"
                                        style={{ backgroundColor: store.primary_color }}
                                    >
                                        Continue
                                    </button>
                                </div>
                            )}

                            {checkoutStep === 2 && (
                                <div className="space-y-4">
                                    {/* Order Summary */}
                                    <div className="border rounded-xl p-4">
                                        <h3 className="font-semibold mb-3">Order Summary</h3>
                                        <div className="space-y-2">
                                            {cart.map(item => (
                                                <div key={item.product.id} className="flex justify-between text-sm">
                                                    <span>{item.product.name} x{item.quantity}</span>
                                                    <span className="font-medium">{currencySymbol}{(item.product.price * item.quantity).toLocaleString()}</span>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="border-t mt-3 pt-3 flex justify-between font-bold">
                                            <span>Total</span>
                                            <span style={{ color: store.primary_color }}>{currencySymbol}{cartTotal.toLocaleString()}</span>
                                        </div>
                                    </div>

                                    {/* Customer Info */}
                                    <div className="border rounded-xl p-4 text-sm">
                                        <h3 className="font-semibold mb-2">Shipping To</h3>
                                        <p className="font-medium">{customerName}</p>
                                        <p className="text-slate-500">{customerPhone}</p>
                                        {shippingAddress && <p className="text-slate-500 mt-1">{shippingAddress}</p>}
                                    </div>

                                    {/* Notes */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Order Notes (Optional)</label>
                                        <textarea
                                            value={notes}
                                            onChange={(e) => setNotes(e.target.value)}
                                            placeholder="Any special instructions..."
                                            rows={2}
                                            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/50 outline-none resize-none"
                                        />
                                    </div>

                                    <button
                                        onClick={placeOrder}
                                        className="w-full py-3 rounded-xl font-semibold text-white transition-all hover:opacity-90"
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
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white rounded-2xl w-full max-w-2xl my-8 overflow-hidden">
                        <div className="md:flex">
                            {/* Image */}
                            <div className="md:w-1/2 aspect-square bg-slate-100">
                                {selectedProduct.images?.[0] ? (
                                    <img src={selectedProduct.images[0]} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <Package className="w-16 h-16 text-slate-300" />
                                    </div>
                                )}
                            </div>

                            {/* Info */}
                            <div className="md:w-1/2 p-6 flex flex-col">
                                <button
                                    onClick={() => setSelectedProduct(null)}
                                    className="self-end p-2 hover:bg-slate-100 rounded-lg mb-4"
                                >
                                    <X className="w-5 h-5 text-slate-500" />
                                </button>

                                <h2 className="text-2xl font-bold text-slate-800 mb-2">{selectedProduct.name}</h2>

                                <div className="flex items-center gap-3 mb-4">
                                    <span className="text-2xl font-bold" style={{ color: store.primary_color }}>
                                        {currencySymbol}{selectedProduct.price.toLocaleString()}
                                    </span>
                                    {selectedProduct.compare_at_price && (
                                        <span className="text-lg text-slate-400 line-through">
                                            {currencySymbol}{selectedProduct.compare_at_price.toLocaleString()}
                                        </span>
                                    )}
                                </div>

                                {selectedProduct.description && (
                                    <p className="text-slate-600 mb-6 flex-1">{selectedProduct.description}</p>
                                )}

                                <button
                                    onClick={() => { addToCart(selectedProduct); setSelectedProduct(null); }}
                                    className="w-full py-3 rounded-xl font-semibold text-white transition-all hover:opacity-90"
                                    style={{ backgroundColor: store.primary_color }}
                                >
                                    Add to Cart
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StoreView;
