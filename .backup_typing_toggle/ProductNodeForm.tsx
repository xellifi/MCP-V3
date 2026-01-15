import React, { useState, useRef, useEffect } from 'react';
import {
    ShoppingBag, Package, Tag, Upload, X, Image as ImageIcon,
    DollarSign, Layers, Eye, Edit3, Plus, Check, Search, Globe,
    ChevronDown, Sparkles, AlertCircle, Smartphone, Tablet, Monitor, ChevronLeft, ChevronRight,
    Save, ExternalLink, ArrowRight
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useTheme } from '../context/ThemeContext';

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
    const { isDark } = useTheme();

    // Form state - If we have initial config with productId or productName, start in create mode for editing
    const hasExistingConfig = !!(initialConfig?.productId || initialConfig?.productName);
    const [mode, setMode] = useState<'select' | 'create'>(hasExistingConfig ? 'create' : 'select');

    // Toast notification
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
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

    // Toast helper
    const displayToast = (message: string) => {
        setToastMessage(message);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
    };

    // Generate preview URL
    const getPreviewUrl = () => {
        const previewConfig = {
            productName,
            productDescription,
            productPrice: parseFloat(productPrice) || 0,
            productComparePrice: parseFloat(productComparePrice) || 0,
            productImage,
            productCategory,
            currency: storeData?.currency || 'PHP'
        };
        const encodedConfig = encodeURIComponent(JSON.stringify(previewConfig));
        return `/product-preview?config=${encodedConfig}`;
    };

    const openLivePreview = () => {
        const url = getPreviewUrl();
        window.open(url, '_blank');
    };

    // Manual save function
    const handleManualSave = async () => {
        const savedId = await saveProductToStore();
        if (savedId) {
            displayToast('✓ Product saved successfully!');
            notifyChange();
        } else {
            displayToast('Please fill in product name and price');
        }
    };

    // Save product to store database
    const saveProductToStore = async () => {
        if (!storeData?.id || !productName || !productPrice) {
            console.log('[ProductNodeForm] Cannot save - missing store, name, or price');
            return null;
        }

        try {
            // If we have an existing productId, update it
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

    // Theme helpers
    const inputClass = isDark
        ? "w-full px-4 py-3 bg-slate-800/60 border border-slate-600/50 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all hover:bg-slate-800/80"
        : "w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all hover:border-slate-300 shadow-sm";

    const labelClass = isDark
        ? "block text-sm font-medium text-slate-300 mb-2"
        : "block text-sm font-bold text-slate-700 mb-2";

    const sectionClass = isDark
        ? "bg-slate-800/40 p-1 rounded-xl flex gap-1 border border-slate-700/50"
        : "bg-slate-100/80 p-1 rounded-xl flex gap-1 border border-slate-200";

    const dividerClass = isDark ? "bg-slate-700" : "bg-slate-200";

    // Product preview component - Mobile Device Mockup
    const ProductPreview = () => {
        const deviceSizes = {
            mobile: { width: 280, height: 480, radius: 40, notch: true },
            tablet: { width: 340, height: 440, radius: 24, notch: false },
            desktop: { width: 480, height: 280, radius: 8, notch: false }
        };
        const size = deviceSizes[previewDevice];

        // Desktop has white background, others have dark
        const getScreenBg = () => {
            return previewDevice === 'desktop' ? 'bg-white' : 'bg-slate-50';
        };

        const getStatusBarStyle = () => {
            return previewDevice === 'desktop'
                ? 'text-slate-500 bg-slate-100 border-b border-slate-200'
                : 'text-slate-900';
        };

        return (
            <div className="flex justify-center">
                <div className="relative" style={{ width: size.width, height: size.height }}>
                    {/* Device Frame */}
                    <div className={`w-full h-full shadow-2xl border-4 flex flex-col ${previewDevice === 'desktop' ? 'bg-slate-200 border-slate-400' : 'bg-white border-slate-200'}`} style={{ borderRadius: size.radius }}>
                        {/* Notch - only for mobile */}
                        {size.notch && (
                            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-20 h-5 bg-slate-200 rounded-full z-10" />
                        )}
                        {/* Screen */}
                        <div className={`w-full h-full overflow-hidden flex flex-col ${getScreenBg()}`} style={{ borderRadius: Math.max(size.radius - 6, 4) }}>
                            {/* Status bar */}
                            <div className={`h-6 flex-shrink-0 flex items-center justify-between px-4 text-xs ${getStatusBarStyle()}`}>
                                {previewDevice === 'desktop' ? (
                                    <>
                                        <div className="flex items-center gap-1">
                                            <div className="w-2 h-2 rounded-full bg-red-400"></div>
                                            <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
                                            <div className="w-2 h-2 rounded-full bg-green-400"></div>
                                        </div>
                                        <span className="text-[8px] text-slate-400">mystore.com/product</span>
                                        <div></div>
                                    </>
                                ) : (
                                    <>
                                        <span>9:41</span>
                                        <span>⚡ 100%</span>
                                    </>
                                )}
                            </div>
                            {/* Content */}
                            <div className="flex-1 overflow-y-auto">
                                {/* Product Image */}
                                <div className="aspect-square bg-slate-100 relative">
                                    {productImage ? (
                                        <img src={productImage} alt={productName} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <ImageIcon className="w-16 h-16 text-slate-300" />
                                        </div>
                                    )}
                                    {productCategory && (
                                        <span className="absolute top-3 left-3 px-2 py-1 bg-emerald-500 text-white text-[10px] font-medium rounded-full">
                                            {productCategory}
                                        </span>
                                    )}
                                    {productComparePrice && parseFloat(productComparePrice) > parseFloat(productPrice) && (
                                        <span className="absolute top-3 right-3 px-2 py-1 bg-red-500 text-white text-[10px] font-bold rounded-full">
                                            -{Math.round((1 - parseFloat(productPrice) / parseFloat(productComparePrice)) * 100)}%
                                        </span>
                                    )}
                                </div>
                                {/* Product Info */}
                                <div className="p-4">
                                    <h3 className="font-semibold text-slate-900 text-sm mb-1">
                                        {productName || 'Product Name'}
                                    </h3>
                                    {productDescription && (
                                        <p className="text-xs text-slate-500 mb-3 line-clamp-2">{productDescription}</p>
                                    )}
                                    <div className="flex items-baseline gap-2 mb-3">
                                        <span className="text-lg font-bold text-emerald-600">
                                            {currencySymbol}{parseFloat(productPrice || '0').toLocaleString()}
                                        </span>
                                        {productComparePrice && parseFloat(productComparePrice) > parseFloat(productPrice) && (
                                            <span className="text-xs text-slate-400 line-through">
                                                {currencySymbol}{parseFloat(productComparePrice).toLocaleString()}
                                            </span>
                                        )}
                                    </div>
                                    <button className="w-full py-2.5 bg-blue-600 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2">
                                        <ShoppingBag className="w-4 h-4" />
                                        Add to Cart
                                    </button>
                                </div>
                            </div>
                            {/* Home indicator - only for mobile/tablet */}
                            {previewDevice !== 'desktop' && (
                                <div className="h-5 flex-shrink-0 flex items-center justify-center bg-white">
                                    <div className="w-24 h-1 bg-slate-300 rounded-full" />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // Form content for reuse
    const formContent = (
        <div className="space-y-5">
            {/* Mode Selector */}
            <div className={sectionClass}>
                <button
                    onClick={() => setMode('select')}
                    className={`flex-1 py-2.5 px-4 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 ${mode === 'select'
                        ? 'bg-emerald-500 text-white shadow-sm'
                        : isDark ? 'text-slate-400 hover:text-white hover:bg-slate-700/50' : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                        }`}
                >
                    <Layers className="w-4 h-4" />
                    Choose Existing
                </button>
                <button
                    onClick={() => { setMode('create'); setSelectedProductId(''); }}
                    className={`flex-1 py-2.5 px-4 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 ${mode === 'create'
                        ? 'bg-emerald-500 text-white shadow-sm'
                        : isDark ? 'text-slate-400 hover:text-white hover:bg-slate-700/50' : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
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
                        <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                        <input
                            type="text"
                            value={productSearch}
                            onChange={(e) => setProductSearch(e.target.value)}
                            placeholder="Search products..."
                            className={`pl-10 pr-4 ${inputClass}`}
                        />
                    </div>

                    <div className={`max-h-64 overflow-y-auto space-y-2 rounded-xl custom-scrollbar ${isDark ? '' : 'pr-1'}`}>
                        {loadingProducts ? (
                            <div className="text-center py-8 text-slate-500">Loading products...</div>
                        ) : filteredProducts.length === 0 ? (
                            <div className="text-center py-8">
                                <Package className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                                <p className="text-slate-500 text-sm">No products found</p>
                                <button
                                    onClick={() => setMode('create')}
                                    className="mt-2 text-emerald-500 font-medium text-sm hover:underline"
                                >
                                    Create a new product
                                </button>
                            </div>
                        ) : (
                            filteredProducts.map(product => (
                                <button
                                    key={product.id}
                                    onClick={() => selectProduct(product)}
                                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all border ${selectedProductId === product.id
                                        ? 'bg-emerald-500/10 border-emerald-500 ring-1 ring-emerald-500/50'
                                        : isDark
                                            ? 'bg-slate-800/60 border-slate-700/50 hover:border-slate-600'
                                            : 'bg-white border-slate-200 hover:border-emerald-300 hover:shadow-sm'
                                        }`}
                                >
                                    <div className={`w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 border ${isDark ? 'bg-slate-700 border-slate-600' : 'bg-slate-100 border-slate-200'}`}>
                                        {product.images?.[0] ? (
                                            <img src={product.images[0]} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <Package className="w-5 h-5 text-slate-400" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 text-left min-w-0">
                                        <div className={`font-semibold truncate ${isDark ? 'text-white' : 'text-slate-800'}`}>{product.name}</div>
                                        <div className="text-sm text-emerald-500 font-medium">{currencySymbol}{product.price.toLocaleString()}</div>
                                    </div>
                                    {selectedProductId === product.id && (
                                        <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center shadow-sm">
                                            <Check className="w-3.5 h-3.5 text-white" />
                                        </div>
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
                        <label className={labelClass}>
                            Product Name *
                        </label>
                        <input
                            type="text"
                            value={productName}
                            onChange={(e) => setProductName(e.target.value)}
                            placeholder="Enter product name"
                            className={inputClass}
                        />
                    </div>

                    {/* Price */}
                    <div>
                        <label className={labelClass}>
                            Price *
                        </label>
                        <div className="relative">
                            <span className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{currencySymbol}</span>
                            <input
                                type="number"
                                value={productPrice}
                                onChange={(e) => setProductPrice(e.target.value)}
                                placeholder="0.00"
                                className={`pl-8 ${inputClass}`}
                            />
                        </div>
                    </div>

                    {/* Compare at Price */}
                    <div>
                        <label className={labelClass}>
                            Compare Price
                        </label>
                        <div className="relative">
                            <span className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{currencySymbol}</span>
                            <input
                                type="number"
                                value={productComparePrice}
                                onChange={(e) => setProductComparePrice(e.target.value)}
                                placeholder="Original price"
                                className={`pl-8 ${inputClass}`}
                            />
                        </div>
                    </div>

                    {/* Category */}
                    <div>
                        <label className={labelClass}>
                            Category
                        </label>
                        <div className="relative">
                            <select
                                value={productCategory}
                                onChange={(e) => setProductCategory(e.target.value)}
                                className={`${inputClass} appearance-none cursor-pointer`}
                            >
                                <option value="">Select category</option>
                                {DEFAULT_CATEGORIES.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                            <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                        </div>
                    </div>

                    {/* Stock */}
                    <div>
                        <label className={labelClass}>
                            Stock Quantity
                        </label>
                        <input
                            type="number"
                            value={productStock}
                            onChange={(e) => setProductStock(e.target.value)}
                            placeholder="0"
                            className={inputClass}
                        />
                    </div>

                    {/* Description */}
                    <div className="md:col-span-2">
                        <label className={labelClass}>
                            Description
                        </label>
                        <textarea
                            value={productDescription}
                            onChange={(e) => setProductDescription(e.target.value)}
                            placeholder="Product description..."
                            rows={3}
                            className={`${inputClass} resize-none`}
                        />
                    </div>

                    {/* Image Upload */}
                    <div className="md:col-span-2">
                        <label className={labelClass}>
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
                            <div className="relative w-32 h-32 rounded-xl overflow-hidden group shadow-md border border-slate-200 dark:border-slate-700">
                                <img src={productImage} alt="" className="w-full h-full object-cover" />
                                <button
                                    onClick={() => setProductImage('')}
                                    className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow-sm"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {/* URL Input */}
                                <div className="flex gap-2">
                                    <input
                                        type="url"
                                        placeholder="Enter image URL..."
                                        className={inputClass}
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
                                    <div className={`flex-1 h-px ${dividerClass}`}></div>
                                    <span className={`text-xs font-medium uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>or</span>
                                    <div className={`flex-1 h-px ${dividerClass}`}></div>
                                </div>

                                {/* Upload Button */}
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploading}
                                    className={`w-full py-8 border-2 border-dashed rounded-xl transition-all flex flex-col items-center gap-3 group ${isDark
                                        ? 'border-slate-700 text-slate-400 hover:border-emerald-500/50 hover:bg-slate-800'
                                        : 'border-slate-300 text-slate-500 hover:border-emerald-500/50 hover:bg-emerald-50/30'
                                        }`}
                                >
                                    {uploading ? (
                                        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <div className="p-3 rounded-full bg-emerald-500/10 text-emerald-500 group-hover:scale-110 transition-transform">
                                                <Upload className="w-6 h-6" />
                                            </div>
                                            <div className="text-center">
                                                <span className="text-sm font-semibold text-emerald-500">Click to upload</span>
                                                <span className="text-sm text-slate-500"> or drag and drop</span>
                                                <br />
                                                <span className="text-xs text-slate-400 mt-1 block">SVG, PNG, JPG or GIF (max. 3MB)</span>
                                            </div>
                                        </>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Status & Inventory Toggle */}
                    <div className={`md:col-span-2 flex items-center justify-between py-4 px-5 rounded-xl border ${isDark ? 'bg-slate-800/60 border-slate-700/50' : 'bg-slate-50 border-slate-200'}`}>
                        <div>
                            <div className={`font-medium ${isDark ? 'text-white' : 'text-slate-800'}`}>Product Status</div>
                            <div className="text-xs text-slate-500 mt-0.5">Active products are visible in store</div>
                        </div>
                        <button
                            onClick={() => setProductStatus(productStatus === 'active' ? 'draft' : 'active')}
                            className={`relative w-12 h-6 rounded-full transition-colors ${productStatus === 'active' ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                        >
                            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-sm ${productStatus === 'active' ? 'translate-x-6' : 'translate-x-0'}`} />
                        </button>
                    </div>

                    {/* Button Action */}
                    <div className="md:col-span-2 space-y-3">
                        <label className={labelClass}>
                            🛒 "Add to Cart" Button Action
                        </label>
                        <div className="grid grid-cols-1 gap-3">
                            <button
                                type="button"
                                onClick={() => setButtonAction('store_page')}
                                className={`p-4 rounded-xl border text-left transition-all group ${buttonAction === 'store_page'
                                    ? 'bg-emerald-500/10 border-emerald-500 ring-1 ring-emerald-500/20'
                                    : isDark
                                        ? 'bg-slate-800/60 border-slate-700/50 hover:bg-slate-800'
                                        : 'bg-white border-slate-200 hover:border-emerald-300 hover:shadow-sm'
                                    }`}
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <div className={`font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>🏪 Open Store Page (Default)</div>
                                    {buttonAction === 'store_page' && <Check className="w-5 h-5 text-emerald-500" />}
                                </div>
                                <div className="text-xs text-slate-500 leading-relaxed">
                                    Opens your public store product page where buyers can checkout securely.
                                </div>
                            </button>

                            <button
                                type="button"
                                onClick={() => setButtonAction('continue_flow')}
                                className={`p-4 rounded-xl border text-left transition-all group ${buttonAction === 'continue_flow'
                                    ? 'bg-blue-500/10 border-blue-500 ring-1 ring-blue-500/20'
                                    : isDark
                                        ? 'bg-slate-800/60 border-slate-700/50 hover:bg-slate-800'
                                        : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-sm'
                                    }`}
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <div className={`font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>🔗 Continue Flow (Connect Node)</div>
                                    {buttonAction === 'continue_flow' && <Check className="w-5 h-5 text-blue-500" />}
                                </div>
                                <div className="text-xs text-slate-500 leading-relaxed">
                                    Connect to the next node in your flow for custom checkout experience.
                                </div>
                            </button>
                        </div>
                        {buttonAction === 'continue_flow' && (
                            <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 rounded-xl">
                                <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                                <div className="text-sm text-blue-600 dark:text-blue-200 leading-relaxed">
                                    Connect the Product Node's output to another node (e.g., Form, Text) to continue the flow when users tap "Add to Cart".
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Info Message */}
            <div className={`flex items-start gap-3 p-4 rounded-xl border ${isDark ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-emerald-50 border-emerald-100'}`}>
                <Sparkles className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                    <p className="font-semibold text-emerald-600 dark:text-emerald-400 mb-1">Pro Tip</p>
                    <p className={isDark ? 'text-slate-300' : 'text-slate-600'}>Products created here will be synced to your Store page and visible on your public storefront.</p>
                </div>
            </div>
        </div>
    );

    // Desktop: Fullscreen responsive layout
    if (isDesktop) {
        return (
            <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 z-50 p-[15px] flex items-center justify-center font-sans antialiased">
                <div className={`w-full max-w-7xl h-full max-h-full flex flex-col rounded-2xl border overflow-hidden transition-all duration-300 shadow-2xl ${isDark ? 'bg-slate-900 border-white/10' : 'bg-slate-50 border-white text-slate-900'}`}>
                    {/* Header with Device Switcher */}
                    <div className={`flex-shrink-0 h-16 border-b flex items-center px-6 gap-6 ${isDark ? 'bg-slate-800/50 border-white/10' : 'bg-white border-slate-200'}`}>
                        {/* Left: Title */}
                        <div className="flex items-center gap-3 min-w-0 flex-shrink-0">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                                <ShoppingBag className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h1 className={`text-lg font-bold leading-none ${isDark ? 'text-white' : 'text-slate-900'}`}>Product</h1>
                                <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Configure product display</p>
                            </div>
                        </div>

                        {/* Center: Device Switcher */}
                        <div className="flex-1 flex justify-center">
                            <div className={`flex items-center gap-1 p-1 rounded-xl border ${isDark ? 'bg-slate-900/50 border-white/10' : 'bg-slate-100 border-slate-200'}`}>
                                <button
                                    onClick={() => setPreviewDevice('mobile')}
                                    className={`p-2 rounded-lg transition-all ${previewDevice === 'mobile'
                                        ? 'bg-emerald-500 text-white shadow-sm'
                                        : isDark ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-slate-500 hover:text-slate-900 hover:bg-white'
                                        }`}
                                    title="Mobile"
                                >
                                    <Smartphone className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setPreviewDevice('tablet')}
                                    className={`p-2 rounded-lg transition-all ${previewDevice === 'tablet'
                                        ? 'bg-emerald-500 text-white shadow-sm'
                                        : isDark ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-slate-500 hover:text-slate-900 hover:bg-white'
                                        }`}
                                    title="Tablet"
                                >
                                    <Tablet className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setPreviewDevice('desktop')}
                                    className={`p-2 rounded-lg transition-all ${previewDevice === 'desktop'
                                        ? 'bg-emerald-500 text-white shadow-sm'
                                        : isDark ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-slate-500 hover:text-slate-900 hover:bg-white'
                                        }`}
                                    title="Desktop"
                                >
                                    <Monitor className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Right: Actions */}
                        <div className="flex items-center gap-3">
                            <button
                                onClick={openLivePreview}
                                className={`px-4 py-2 text-sm font-semibold rounded-xl border transition-all flex items-center gap-2 ${isDark
                                    ? 'border-white/10 hover:bg-white/5 text-slate-300 hover:text-white'
                                    : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-900'
                                    }`}
                            >
                                <ExternalLink className="w-4 h-4" />
                                Live Preview
                            </button>

                            <button
                                onClick={onClose}
                                className={`p-2 rounded-xl transition-all ${isDark ? 'hover:bg-white/10 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'}`}
                            >
                                <X className="w-5 h-5" />
                            </button>

                            <div className={`w-px h-8 ${isDark ? 'bg-white/10' : 'bg-slate-200'}`} />

                            <button
                                onClick={handleManualSave}
                                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-blue-500/20"
                            >
                                <Save className="w-4 h-4" />
                                Save & Close
                            </button>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="flex-1 overflow-hidden relative">
                        <div className="absolute inset-0 flex">
                            {/* Configuration Panel */}
                            <div className={`w-[480px] h-full overflow-y-auto border-r ${isDark ? 'bg-slate-800/30 border-white/5 scrollbar-thin scrollbar-thumb-white/10' : 'bg-white border-slate-200 scrollbar-thin scrollbar-thumb-slate-200'}`}>
                                <div className="p-6">
                                    {formContent}
                                </div>
                            </div>

                            {/* Preview Area */}
                            <div className={`flex-1 overflow-hidden relative flex flex-col items-center justify-center p-8 transition-colors duration-500 ${isDark ? 'bg-black/20' : 'bg-slate-50/50'}`}>
                                {/* Use radial gradient for a sophisticated background effect */}
                                <div className={`absolute inset-0 opacity-40 pointer-events-none ${isDark
                                    ? 'bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-900/20 via-slate-900/0 to-slate-900/0'
                                    : 'bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-100/40 via-white/0 to-white/0'
                                    }`} />

                                <div className="z-10 w-full transform transition-all duration-500">
                                    <ProductPreview />
                                </div>

                                <div className={`absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full backdrop-blur-md border text-xs font-medium flex items-center gap-2 ${isDark
                                    ? 'bg-slate-900/50 border-white/10 text-slate-400'
                                    : 'bg-white/50 border-slate-200 text-slate-500'
                                    }`}>
                                    <Eye className="w-3.5 h-3.5" />
                                    Preview Mode
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Toast Notification */}
                {showToast && (
                    <div className="fixed bottom-6 right-6 z-[60] animate-fade-in-up">
                        <div className="bg-emerald-500 text-white px-6 py-3 rounded-xl shadow-lg shadow-emerald-500/30 flex items-center gap-3 font-medium">
                            <Check className="w-5 h-5" />
                            {toastMessage}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // Mobile: Simplified layout
    return (
        <div className="fixed inset-0 bg-slate-50 dark:bg-slate-900 z-50 flex flex-col font-sans">
            {/* Mobile Header */}
            <div className={`flex-shrink-0 h-14 border-b flex items-center justify-between px-4 ${isDark ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'}`}>
                <div className="flex items-center gap-3">
                    <button
                        onClick={onClose}
                        className={`p-2 -ml-2 rounded-lg ${isDark ? 'text-slate-400' : 'text-slate-500'}`}
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Edit Product</span>
                </div>
                <button
                    onClick={handleManualSave}
                    className="text-sm font-semibold text-blue-500"
                >
                    Save
                </button>
            </div>

            {/* Mobile Content */}
            <div className="flex-1 overflow-y-auto">
                <div className="p-4 space-y-6">
                    {/* Preview Toggle Card */}
                    <div className={`rounded-xl border p-1 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}>
                        <div className="grid grid-cols-2 gap-1">
                            <button
                                onClick={() => setShowPreview(false)}
                                className={`py-2 text-sm font-medium rounded-lg transition-all ${!showPreview
                                    ? 'bg-blue-500 text-white shadow-sm'
                                    : isDark ? 'text-slate-400' : 'text-slate-500'
                                    }`}
                            >
                                Edit Check
                            </button>
                            <button
                                onClick={() => setShowPreview(true)}
                                className={`py-2 text-sm font-medium rounded-lg transition-all ${showPreview
                                    ? 'bg-blue-500 text-white shadow-sm'
                                    : isDark ? 'text-slate-400' : 'text-slate-500'
                                    }`}
                            >
                                Preview
                            </button>
                        </div>
                    </div>

                    {showPreview ? (
                        <div className="py-4">
                            <ProductPreview />
                        </div>
                    ) : (
                        formContent
                    )}
                </div>
            </div>

            {/* Toast Notification (Mobile) */}
            {showToast && (
                <div className="fixed bottom-6 left-4 right-4 z-[60] animate-fade-in-up">
                    <div className="bg-emerald-500 text-white px-4 py-3 rounded-xl shadow-lg text-center font-medium text-sm">
                        {toastMessage}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProductNodeForm;
