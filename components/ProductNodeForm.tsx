import React, { useState, useRef, useEffect } from 'react';
import {
    ShoppingBag, Package, Tag, Upload, X, Image as ImageIcon,
    DollarSign, Layers, Eye, Edit3, Plus, Check, Search, Globe,
    ChevronDown, Sparkles, AlertCircle, Smartphone, Tablet, Monitor, ChevronLeft, ChevronRight
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ProductNodeFormProps {
    workspaceId: string;
    storeId?: string;
    initialConfig?: {
        productId?: string;
        productName?: string;
        productDescription?: string;
        productPrice?: number;
        productComparePrice?: number;
        productImage?: string;
        productImages?: string[];
        productCategory?: string;
        productStock?: number;
        trackInventory?: boolean;
        productStatus?: 'active' | 'draft';
        buttonAction?: 'store_page' | 'continue_flow';
        isExistingProduct?: boolean;
    };
    onChange: (config: any) => void;
    onClose?: () => void;
}

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

interface Category {
    id: string;
    name: string;
}

const DEFAULT_CATEGORIES = [
    'Electronics',
    'Clothing',
    'Home & Living',
    'Beauty',
    'Sports',
    'Food & Beverages',
    'Toys & Games',
    'Books',
    'Health',
    'Accessories',
    'Other'
];

const ProductNodeForm: React.FC<ProductNodeFormProps> = ({
    workspaceId,
    storeId,
    initialConfig,
    onChange,
    onClose
}) => {
    // Form state
    const [mode, setMode] = useState<'select' | 'create'>(initialConfig?.isExistingProduct ? 'select' : 'create');
    const [productName, setProductName] = useState(initialConfig?.productName || '');
    const [productDescription, setProductDescription] = useState(initialConfig?.productDescription || '');
    const [productPrice, setProductPrice] = useState(initialConfig?.productPrice?.toString() || '');
    const [productComparePrice, setProductComparePrice] = useState(initialConfig?.productComparePrice?.toString() || '');
    const [productImage, setProductImage] = useState(initialConfig?.productImage || '');
    const [productCategory, setProductCategory] = useState(initialConfig?.productCategory || '');
    const [productStock, setProductStock] = useState(initialConfig?.productStock?.toString() || '0');
    const [trackInventory, setTrackInventory] = useState(initialConfig?.trackInventory || false);
    const [productStatus, setProductStatus] = useState<'active' | 'draft'>(initialConfig?.productStatus || 'active');
    const [selectedProductId, setSelectedProductId] = useState(initialConfig?.productId || '');
    const [buttonAction, setButtonAction] = useState<'store_page' | 'continue_flow'>(initialConfig?.buttonAction || 'store_page');

    // Existing products
    const [existingProducts, setExistingProducts] = useState<Product[]>([]);
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [productSearch, setProductSearch] = useState('');

    // Store info
    const [storeData, setStoreData] = useState<{ id: string; currency: string } | null>(null);

    // Upload
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);

    // Preview toggle for mobile
    const [showPreview, setShowPreview] = useState(false);
    const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('mobile');
    const [isDesktop, setIsDesktop] = useState(typeof window !== 'undefined' && window.innerWidth >= 1024);
    const [mobileStep, setMobileStep] = useState(0);

    useEffect(() => {
        const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const modalWidths = {
        mobile: 'max-w-md',
        tablet: 'max-w-3xl',
        desktop: 'max-w-7xl'
    };

    // Load store and products
    useEffect(() => {
        loadStore();
    }, [workspaceId]);

    useEffect(() => {
        if (storeData?.id) {
            loadProducts();
        }
    }, [storeData?.id]);

    const loadStore = async () => {
        try {
            const { data } = await supabase
                .from('stores')
                .select('id, currency')
                .eq('workspace_id', workspaceId)
                .single();
            if (data) {
                setStoreData(data);
            }
        } catch (err) {
            console.error('Error loading store:', err);
        }
    };

    const loadProducts = async () => {
        if (!storeData?.id) return;
        setLoadingProducts(true);
        try {
            const { data } = await supabase
                .from('products')
                .select('*')
                .eq('store_id', storeData.id)
                .order('created_at', { ascending: false });
            setExistingProducts(data || []);
        } catch (err) {
            console.error('Error loading products:', err);
        }
        setLoadingProducts(false);
    };

    // Save product to store database
    const saveProductToStore = async () => {
        if (!storeData?.id || !productName || !productPrice) {
            console.log('[ProductNodeForm] Cannot save - missing store, name, or price');
            return null;
        }

        // Only save if in create mode and product doesn't exist yet
        if (mode !== 'create') {
            return selectedProductId;
        }

        try {
            // Check if we already created this product (by checking if we have a productId from a previous save)
            if (selectedProductId) {
                // Update existing product
                const { error } = await supabase
                    .from('products')
                    .update({
                        name: productName,
                        description: productDescription,
                        price: parseFloat(productPrice) || 0,
                        compare_at_price: parseFloat(productComparePrice) || null,
                        images: productImage ? [productImage] : [],
                        category: productCategory || null,
                        stock_quantity: parseInt(productStock) || 0,
                        track_inventory: trackInventory,
                        status: productStatus,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', selectedProductId);

                if (error) {
                    console.error('[ProductNodeForm] Update error:', error);
                } else {
                    console.log('[ProductNodeForm] Product updated:', selectedProductId);
                }
                return selectedProductId;
            } else {
                // Create new product
                const { data, error } = await supabase
                    .from('products')
                    .insert({
                        store_id: storeData.id,
                        name: productName,
                        description: productDescription,
                        price: parseFloat(productPrice) || 0,
                        compare_at_price: parseFloat(productComparePrice) || null,
                        images: productImage ? [productImage] : [],
                        category: productCategory || null,
                        stock_quantity: parseInt(productStock) || 0,
                        track_inventory: trackInventory,
                        status: productStatus
                    })
                    .select('id')
                    .single();

                if (error) {
                    console.error('[ProductNodeForm] Insert error:', error);
                    return null;
                }

                console.log('[ProductNodeForm] Product created:', data.id);
                // Update the selectedProductId so we don't create duplicates
                setSelectedProductId(data.id);
                return data.id;
            }
        } catch (err) {
            console.error('[ProductNodeForm] Save error:', err);
            return null;
        }
    };

    // Notify parent of changes
    const notifyChange = async (updates: Partial<typeof initialConfig> = {}) => {
        // If creating a new product with valid data, save it to the database
        let productId = selectedProductId;
        if (mode === 'create' && productName && productPrice && storeData?.id) {
            const savedId = await saveProductToStore();
            if (savedId) {
                productId = savedId;
            }
        }

        const config = {
            nodeType: 'productNode',
            productId: productId,
            productName,
            productDescription,
            productPrice: parseFloat(productPrice) || 0,
            productComparePrice: parseFloat(productComparePrice) || 0,
            productImage,
            productCategory,
            productStock: parseInt(productStock) || 0,
            trackInventory,
            productStatus,
            buttonAction,
            isExistingProduct: mode === 'select' || !!productId,
            storeId: storeData?.id,
            ...updates
        };
        onChange(config);
    };

    // Auto-notify on changes (debounced to prevent too many saves)
    const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);
    useEffect(() => {
        // Clear previous timeout
        if (saveTimeout) {
            clearTimeout(saveTimeout);
        }

        // Debounce the save - wait 1 second after last change
        const timeout = setTimeout(() => {
            notifyChange();
        }, 1000);

        setSaveTimeout(timeout);

        return () => {
            if (timeout) clearTimeout(timeout);
        };
    }, [productName, productDescription, productPrice, productComparePrice, productImage, productCategory, productStock, trackInventory, productStatus, buttonAction, selectedProductId, mode, storeData?.id]);

    // Upload image
    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const fileName = `product-${Date.now()}-${file.name}`;
            const { error } = await supabase.storage.from('attachments').upload(fileName, file);
            if (error) throw error;

            const { data: urlData } = supabase.storage.from('attachments').getPublicUrl(fileName);
            setProductImage(urlData.publicUrl);
        } catch (err) {
            console.error('Upload error:', err);
            alert('Failed to upload image');
        }
        setUploading(false);
    };

    // Select existing product
    const selectProduct = (product: Product) => {
        setSelectedProductId(product.id);
        setProductName(product.name);
        setProductDescription(product.description || '');
        setProductPrice(product.price.toString());
        setProductComparePrice(product.compare_at_price?.toString() || '');
        setProductImage(product.images?.[0] || '');
        setProductCategory(product.category || '');
        setProductStock(product.stock_quantity?.toString() || '0');
        setTrackInventory(product.track_inventory || false);
        setProductStatus(product.status as 'active' | 'draft');
    };

    // Filter products by search
    const filteredProducts = existingProducts.filter(p =>
        p.name.toLowerCase().includes(productSearch.toLowerCase())
    );

    const currencySymbol = storeData?.currency === 'USD' ? '$' : storeData?.currency === 'EUR' ? '€' : '₱';

    // Product preview component
    const ProductPreview = () => (
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            {/* Product Image */}
            <div className="aspect-square bg-gray-100 relative">
                {productImage ? (
                    <img src={productImage} alt={productName} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="w-16 h-16 text-gray-300" />
                    </div>
                )}
                {productCategory && (
                    <span className="absolute top-3 left-3 px-3 py-1 bg-emerald-500 text-white text-xs font-medium rounded-full">
                        {productCategory}
                    </span>
                )}
                {productComparePrice && parseFloat(productComparePrice) > parseFloat(productPrice) && (
                    <span className="absolute top-3 right-3 px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-full">
                        -{Math.round((1 - parseFloat(productPrice) / parseFloat(productComparePrice)) * 100)}%
                    </span>
                )}
            </div>
            {/* Product Info */}
            <div className="p-4">
                <h3 className="font-semibold text-gray-900 mb-1">
                    {productName || 'Product Name'}
                </h3>
                {productDescription && (
                    <p className="text-sm text-gray-500 mb-3 line-clamp-2">{productDescription}</p>
                )}
                <div className="flex items-baseline gap-2 mb-3">
                    <span className="text-xl font-bold text-emerald-600">
                        {currencySymbol}{parseFloat(productPrice || '0').toLocaleString()}
                    </span>
                    {productComparePrice && parseFloat(productComparePrice) > parseFloat(productPrice) && (
                        <span className="text-sm text-gray-400 line-through">
                            {currencySymbol}{parseFloat(productComparePrice).toLocaleString()}
                        </span>
                    )}
                </div>
                <button className="w-full py-2.5 bg-emerald-500 text-white rounded-xl font-medium text-sm">
                    Add to Cart
                </button>
            </div>
        </div>
    );

    // Form content for reuse
    const formContent = (
        <div className="space-y-5">
            {/* Mode Selector */}
            <div className="bg-slate-800/50 rounded-xl p-1 flex gap-1">
                <button
                    onClick={() => setMode('select')}
                    className={`flex-1 py-2.5 px-4 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 ${mode === 'select'
                        ? 'bg-emerald-500 text-white'
                        : 'text-slate-400 hover:text-white hover:bg-slate-700'
                        }`}
                >
                    <Layers className="w-4 h-4" />
                    Choose Existing
                </button>
                <button
                    onClick={() => { setMode('create'); setSelectedProductId(''); }}
                    className={`flex-1 py-2.5 px-4 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 ${mode === 'create'
                        ? 'bg-emerald-500 text-white'
                        : 'text-slate-400 hover:text-white hover:bg-slate-700'
                        }`}
                >
                    <Plus className="w-4 h-4" />
                    Create New
                </button>
            </div>

            {/* Existing Products List */}
            {mode === 'select' && (
                <div className="space-y-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            type="text"
                            value={productSearch}
                            onChange={(e) => setProductSearch(e.target.value)}
                            placeholder="Search products..."
                            className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500/50 outline-none"
                        />
                    </div>

                    <div className="max-h-64 overflow-y-auto space-y-2 rounded-xl">
                        {loadingProducts ? (
                            <div className="text-center py-8 text-slate-500">Loading products...</div>
                        ) : filteredProducts.length === 0 ? (
                            <div className="text-center py-8">
                                <Package className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                                <p className="text-slate-500 text-sm">No products found</p>
                                <button
                                    onClick={() => setMode('create')}
                                    className="mt-2 text-emerald-400 text-sm hover:underline"
                                >
                                    Create a new product
                                </button>
                            </div>
                        ) : (
                            filteredProducts.map(product => (
                                <button
                                    key={product.id}
                                    onClick={() => selectProduct(product)}
                                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${selectedProductId === product.id
                                        ? 'bg-emerald-500/20 border-2 border-emerald-500'
                                        : 'bg-slate-800 border-2 border-transparent hover:border-slate-600'
                                        }`}
                                >
                                    <div className="w-12 h-12 rounded-lg bg-slate-700 overflow-hidden flex-shrink-0">
                                        {product.images?.[0] ? (
                                            <img src={product.images[0]} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <Package className="w-5 h-5 text-slate-500" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 text-left min-w-0">
                                        <div className="font-medium text-white truncate">{product.name}</div>
                                        <div className="text-sm text-emerald-400">{currencySymbol}{product.price.toLocaleString()}</div>
                                    </div>
                                    {selectedProductId === product.id && (
                                        <Check className="w-5 h-5 text-emerald-400" />
                                    )}
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* Create New Product Form */}
            {mode === 'create' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Product Name */}
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Product Name *
                        </label>
                        <input
                            type="text"
                            value={productName}
                            onChange={(e) => setProductName(e.target.value)}
                            placeholder="Enter product name"
                            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500/50 outline-none"
                        />
                    </div>

                    {/* Price */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Price *
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">{currencySymbol}</span>
                            <input
                                type="number"
                                value={productPrice}
                                onChange={(e) => setProductPrice(e.target.value)}
                                placeholder="0.00"
                                className="w-full pl-8 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500/50 outline-none"
                            />
                        </div>
                    </div>

                    {/* Compare at Price */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Compare Price
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">{currencySymbol}</span>
                            <input
                                type="number"
                                value={productComparePrice}
                                onChange={(e) => setProductComparePrice(e.target.value)}
                                placeholder="Original price"
                                className="w-full pl-8 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500/50 outline-none"
                            />
                        </div>
                    </div>

                    {/* Category */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Category
                        </label>
                        <select
                            value={productCategory}
                            onChange={(e) => setProductCategory(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-emerald-500/50 outline-none appearance-none cursor-pointer"
                        >
                            <option value="">Select category</option>
                            {DEFAULT_CATEGORIES.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>

                    {/* Stock */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Stock Quantity
                        </label>
                        <input
                            type="number"
                            value={productStock}
                            onChange={(e) => setProductStock(e.target.value)}
                            placeholder="0"
                            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500/50 outline-none"
                        />
                    </div>

                    {/* Description */}
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Description
                        </label>
                        <textarea
                            value={productDescription}
                            onChange={(e) => setProductDescription(e.target.value)}
                            placeholder="Product description..."
                            rows={3}
                            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500/50 outline-none resize-none"
                        />
                    </div>

                    {/* Image Upload */}
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Product Image
                        </label>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="hidden"
                        />
                        {productImage ? (
                            <div className="relative w-32 h-32 rounded-xl overflow-hidden group">
                                <img src={productImage} alt="" className="w-full h-full object-cover" />
                                <button
                                    onClick={() => setProductImage('')}
                                    className="absolute top-2 right-2 p-1 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <X className="w-3 h-3 text-white" />
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {/* URL Input */}
                                <div className="flex gap-2">
                                    <input
                                        type="url"
                                        placeholder="Enter image URL..."
                                        className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 placeholder-slate-500"
                                        onBlur={(e) => {
                                            if (e.target.value && e.target.value.startsWith('http')) {
                                                setProductImage(e.target.value);
                                            }
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && (e.target as HTMLInputElement).value.startsWith('http')) {
                                                setProductImage((e.target as HTMLInputElement).value);
                                            }
                                        }}
                                    />
                                </div>

                                {/* Divider */}
                                <div className="flex items-center gap-3">
                                    <div className="flex-1 h-px bg-slate-700"></div>
                                    <span className="text-xs text-slate-500">or</span>
                                    <div className="flex-1 h-px bg-slate-700"></div>
                                </div>

                                {/* Upload Button */}
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploading}
                                    className="w-full py-6 border-2 border-dashed border-slate-600 rounded-xl text-slate-400 hover:text-white hover:border-emerald-500/50 transition-all flex flex-col items-center gap-2"
                                >
                                    {uploading ? (
                                        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <Upload className="w-6 h-6" />
                                            <span className="text-sm">Upload from device</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Status & Inventory Toggle */}
                    <div className="md:col-span-2 flex items-center justify-between py-3 px-4 bg-slate-800 rounded-xl">
                        <div>
                            <div className="font-medium text-white">Product Status</div>
                            <div className="text-xs text-slate-400">Active products are visible in store</div>
                        </div>
                        <button
                            onClick={() => setProductStatus(productStatus === 'active' ? 'draft' : 'active')}
                            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${productStatus === 'active'
                                ? 'bg-emerald-500 text-white'
                                : 'bg-slate-700 text-slate-400'
                                }`}
                        >
                            {productStatus === 'active' ? 'Active' : 'Draft'}
                        </button>
                    </div>

                    {/* Button Action */}
                    <div className="md:col-span-2 space-y-3">
                        <label className="block text-sm font-medium text-slate-300">
                            🛒 "Add to Cart" Button Action
                        </label>
                        <div className="grid grid-cols-1 gap-2">
                            <button
                                type="button"
                                onClick={() => setButtonAction('store_page')}
                                className={`p-3 rounded-xl border text-left transition-all ${buttonAction === 'store_page'
                                    ? 'bg-emerald-500/20 border-emerald-500/50 text-white'
                                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                                    }`}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="font-medium">🏪 Open Store Page (Default)</div>
                                    {buttonAction === 'store_page' && <Check className="w-5 h-5 text-emerald-400" />}
                                </div>
                                <div className="text-xs mt-1 opacity-70">
                                    Opens your public store product page where buyers can checkout
                                </div>
                            </button>
                            <button
                                type="button"
                                onClick={() => setButtonAction('continue_flow')}
                                className={`p-3 rounded-xl border text-left transition-all ${buttonAction === 'continue_flow'
                                    ? 'bg-blue-500/20 border-blue-500/50 text-white'
                                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                                    }`}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="font-medium">🔗 Continue Flow (Connect Node)</div>
                                    {buttonAction === 'continue_flow' && <Check className="w-5 h-5 text-blue-400" />}
                                </div>
                                <div className="text-xs mt-1 opacity-70">
                                    Connect to the next node in your flow for custom checkout experience
                                </div>
                            </button>
                        </div>
                        {buttonAction === 'continue_flow' && (
                            <div className="flex items-start gap-2 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                                <AlertCircle className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                                <div className="text-xs text-blue-300">
                                    Connect the Product Node's output to another node (e.g., Form, Text) to continue the flow when users tap "Add to Cart"
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Info Message */}
            <div className="flex items-start gap-3 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                <Sparkles className="w-5 h-5 text-emerald-400 mt-0.5" />
                <div className="text-sm text-slate-300">
                    <p className="font-medium text-emerald-400 mb-1">Pro Tip</p>
                    <p>Products created here will be synced to your Store page and visible on your public storefront.</p>
                </div>
            </div>
        </div>
    );

    // Desktop: Fullscreen responsive layout
    if (isDesktop) {
        return (
            <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 z-50 p-[15px] flex items-center justify-center">
                <div className="w-full max-w-7xl h-full max-h-full flex flex-col bg-slate-800/50 rounded-2xl border border-white/10 overflow-hidden transition-all duration-300">
                    {/* Header with Device Switcher */}
                    <div className="flex-shrink-0 h-14 border-b border-white/10 flex items-center px-4 gap-4">
                        {/* Left: Title */}
                        <div className="flex items-center gap-3 min-w-0 flex-shrink-0">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                                <ShoppingBag className="w-4 h-4 text-white" />
                            </div>
                            <span className="text-base font-bold text-white whitespace-nowrap">Product</span>
                        </div>

                        {/* Center: Device Switcher */}
                        <div className="flex-1 flex justify-center">
                            <div className="flex items-center gap-1 bg-slate-700/50 rounded-lg p-1 border border-white/10">
                                <button
                                    type="button"
                                    onClick={() => setPreviewDevice('mobile')}
                                    className={`p-2 rounded-md transition-all ${previewDevice === 'mobile' ? 'bg-teal-500 text-white' : 'text-slate-400 hover:text-white hover:bg-white/10'}`}
                                    title="Mobile"
                                >
                                    <Smartphone className="w-4 h-4" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPreviewDevice('tablet')}
                                    className={`p-2 rounded-md transition-all ${previewDevice === 'tablet' ? 'bg-teal-500 text-white' : 'text-slate-400 hover:text-white hover:bg-white/10'}`}
                                    title="Tablet"
                                >
                                    <Tablet className="w-4 h-4" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPreviewDevice('desktop')}
                                    className={`p-2 rounded-md transition-all ${previewDevice === 'desktop' ? 'bg-teal-500 text-white' : 'text-slate-400 hover:text-white hover:bg-white/10'}`}
                                    title="Desktop"
                                >
                                    <Monitor className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Right: Live Preview + Globe + Close */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <div className="hidden sm:flex items-center gap-2">
                                <div className="flex items-center gap-1 text-xs text-slate-400">
                                    <Eye className="w-3 h-3" /> Preview
                                </div>
                                <button
                                    type="button"
                                    className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-teal-400 transition-colors"
                                    title="Visit Live Site"
                                >
                                    <Globe className="w-4 h-4" />
                                </button>
                            </div>
                            {onClose && (
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
                                    title="Close"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 grid grid-cols-2 gap-0 overflow-hidden">
                        {/* Left: Form */}
                        <div className="border-r border-white/10 p-6 overflow-y-auto custom-scrollbar">
                            {formContent}
                        </div>
                        {/* Right: Preview */}
                        <div className="p-6 flex items-center justify-center bg-slate-950/50 overflow-auto">
                            <ProductPreview />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ================== MOBILE: Step-by-Step Wizard ==================
    const WIZARD_STEPS = [
        { title: 'Mode', description: 'Select or Create' },
        { title: 'Details', description: 'Product Info' },
        { title: 'Image', description: 'Product Image' },
        { title: 'Settings', description: 'Status & Action' }
    ];

    // Step content for mobile wizard
    const getMobileStepContent = () => {
        switch (mobileStep) {
            case 0: // Mode
                return (
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-white">Mode Selection</h3>
                        <div className="bg-slate-800/50 rounded-xl p-1 flex gap-1">
                            <button onClick={() => setMode('select')}
                                className={`flex-1 py-2.5 px-4 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 ${mode === 'select' ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}>
                                <Layers className="w-4 h-4" /> Choose Existing
                            </button>
                            <button onClick={() => { setMode('create'); setSelectedProductId(''); }}
                                className={`flex-1 py-2.5 px-4 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 ${mode === 'create' ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}>
                                <Plus className="w-4 h-4" /> Create New
                            </button>
                        </div>
                        {mode === 'select' && (
                            <div className="space-y-3">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                    <input type="text" value={productSearch} onChange={(e) => setProductSearch(e.target.value)} placeholder="Search products..."
                                        className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500/50 outline-none" />
                                </div>
                                <div className="max-h-48 overflow-y-auto space-y-2">
                                    {filteredProducts.map(product => (
                                        <button key={product.id} onClick={() => selectProduct(product)}
                                            className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${selectedProductId === product.id ? 'bg-emerald-500/20 border-2 border-emerald-500' : 'bg-slate-800 border-2 border-transparent hover:border-slate-600'}`}>
                                            <div className="w-10 h-10 rounded-lg bg-slate-700 overflow-hidden">
                                                {product.images?.[0] ? <img src={product.images[0]} alt="" className="w-full h-full object-cover" /> : <Package className="w-5 h-5 text-slate-500 m-auto mt-2" />}
                                            </div>
                                            <div className="flex-1 text-left">
                                                <div className="font-medium text-white text-sm truncate">{product.name}</div>
                                                <div className="text-xs text-emerald-400">{currencySymbol}{product.price}</div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                );
            case 1: // Details
                return (
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-white">Product Details</h3>
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Product Name *</label>
                            <input type="text" value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="Enter product name"
                                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Price *</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">{currencySymbol}</span>
                                    <input type="number" value={productPrice} onChange={(e) => setProductPrice(e.target.value)} placeholder="0.00"
                                        className="w-full pl-8 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Compare Price</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">{currencySymbol}</span>
                                    <input type="number" value={productComparePrice} onChange={(e) => setProductComparePrice(e.target.value)} placeholder="Original"
                                        className="w-full pl-8 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white" />
                                </div>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Description</label>
                            <textarea value={productDescription} onChange={(e) => setProductDescription(e.target.value)} placeholder="Product description..." rows={3}
                                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white resize-none" />
                        </div>
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Category</label>
                            <select value={productCategory} onChange={(e) => setProductCategory(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white">
                                <option value="">Select category</option>
                                {DEFAULT_CATEGORIES.map(cat => (<option key={cat} value={cat}>{cat}</option>))}
                            </select>
                        </div>
                    </div>
                );
            case 2: // Image
                return (
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-white">Product Image</h3>
                        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                        {productImage ? (
                            <div className="relative w-32 h-32 rounded-xl overflow-hidden group mx-auto">
                                <img src={productImage} alt="" className="w-full h-full object-cover" />
                                <button onClick={() => setProductImage('')} className="absolute top-2 right-2 p-1 bg-red-500 rounded-full">
                                    <X className="w-3 h-3 text-white" />
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <input type="url" placeholder="Enter image URL..." className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
                                    onBlur={(e) => { if (e.target.value?.startsWith('http')) setProductImage(e.target.value); }} />
                                <div className="text-center text-xs text-slate-500">or</div>
                                <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                                    className="w-full py-6 border-2 border-dashed border-slate-600 rounded-xl text-slate-400 flex flex-col items-center gap-2">
                                    {uploading ? <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /> : <><Upload className="w-6 h-6" /><span className="text-sm">Upload from device</span></>}
                                </button>
                            </div>
                        )}
                    </div>
                );
            case 3: // Settings
                return (
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-white">Product Settings</h3>
                        <div className="flex items-center justify-between py-3 px-4 bg-slate-800 rounded-xl">
                            <div>
                                <div className="font-medium text-white text-sm">Product Status</div>
                                <div className="text-xs text-slate-400">Active products are visible in store</div>
                            </div>
                            <button onClick={() => setProductStatus(productStatus === 'active' ? 'draft' : 'active')}
                                className={`px-4 py-2 rounded-lg font-medium text-sm ${productStatus === 'active' ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-400'}`}>
                                {productStatus === 'active' ? 'Active' : 'Draft'}
                            </button>
                        </div>
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Stock Quantity</label>
                            <input type="number" value={productStock} onChange={(e) => setProductStock(e.target.value)} placeholder="0"
                                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white" />
                        </div>
                        <div className="space-y-2">
                            <label className="block text-xs text-slate-400">Button Action</label>
                            <button type="button" onClick={() => setButtonAction('store_page')}
                                className={`w-full p-3 rounded-xl border text-left ${buttonAction === 'store_page' ? 'bg-emerald-500/20 border-emerald-500/50 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                                <div className="font-medium text-sm">🏪 Open Store Page</div>
                            </button>
                            <button type="button" onClick={() => setButtonAction('continue_flow')}
                                className={`w-full p-3 rounded-xl border text-left ${buttonAction === 'continue_flow' ? 'bg-blue-500/20 border-blue-500/50 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                                <div className="font-medium text-sm">🔗 Continue Flow</div>
                            </button>
                        </div>
                    </div>
                );
            default: return null;
        }
    };

    if (showPreview) {
        return (
            <div className="min-h-screen bg-slate-900 p-4 nodrag nopan" onMouseDown={e => e.stopPropagation()}>
                <button onClick={() => setShowPreview(false)} className="flex items-center gap-2 text-slate-400 mb-4">
                    <ChevronLeft className="w-4 h-4" /> Back to Editor
                </button>
                <div className="flex justify-center"><ProductPreview /></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900 flex flex-col nodrag nopan" onMouseDown={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                        <ShoppingBag className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-bold text-white">Product</span>
                </div>
                <button onClick={() => setShowPreview(true)} className="text-xs text-teal-400 flex items-center gap-1">
                    <Eye className="w-3 h-3" /> Preview
                </button>
            </div>

            {/* Step Indicators */}
            <div className="flex justify-center gap-2 p-4">
                {WIZARD_STEPS.map((step, idx) => (
                    <button key={idx} onClick={() => setMobileStep(idx)}
                        className={`w-2 h-2 rounded-full transition-all ${idx === mobileStep ? 'bg-teal-500 w-6' : 'bg-slate-600'}`} />
                ))}
            </div>

            {/* Step Title */}
            <div className="text-center px-4 mb-4">
                <div className="text-white font-semibold">{WIZARD_STEPS[mobileStep]?.title}</div>
                <div className="text-xs text-slate-400">{WIZARD_STEPS[mobileStep]?.description}</div>
            </div>

            {/* Step Content */}
            <div className="flex-1 overflow-y-auto px-4 pb-24">
                {getMobileStepContent()}
            </div>

            {/* Navigation */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-slate-900 border-t border-white/10 flex gap-3">
                <button onClick={() => setMobileStep(Math.max(0, mobileStep - 1))} disabled={mobileStep === 0}
                    className={`flex-1 py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-2 ${mobileStep === 0 ? 'bg-slate-800 text-slate-500' : 'bg-slate-700 text-white'}`}>
                    <ChevronLeft className="w-4 h-4" /> Previous
                </button>
                <button onClick={() => setMobileStep(Math.min(WIZARD_STEPS.length - 1, mobileStep + 1))} disabled={mobileStep === WIZARD_STEPS.length - 1}
                    className={`flex-1 py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-2 ${mobileStep === WIZARD_STEPS.length - 1 ? 'bg-teal-600 text-white' : 'bg-teal-500 text-white'}`}>
                    {mobileStep === WIZARD_STEPS.length - 1 ? 'Done' : 'Next'} <ChevronRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};

export default ProductNodeForm;
