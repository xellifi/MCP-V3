import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { ShoppingCart, X, Sparkles } from 'lucide-react';

interface ProductConfig {
    productName: string;
    productDescription: string;
    productPrice: number;
    productComparePrice: number;
    productImage: string;
    productCategory: string;
    currency: string;
}

const ProductPreview: React.FC = () => {
    const [searchParams] = useSearchParams();
    const [config, setConfig] = React.useState<ProductConfig | null>(null);
    const [error, setError] = React.useState('');

    React.useEffect(() => {
        try {
            const encodedConfig = searchParams.get('config');
            if (encodedConfig) {
                const decodedConfig = JSON.parse(decodeURIComponent(encodedConfig));
                setConfig(decodedConfig);
            } else {
                setError('No configuration provided');
            }
        } catch (err) {
            console.error('Error decoding config:', err);
            setError('Invalid configuration');
        }
    }, [searchParams]);

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
                <div className="text-center">
                    <div className="text-6xl mb-4">🔧</div>
                    <h1 className="text-xl font-bold text-white mb-2">Preview Mode</h1>
                    <p className="text-slate-400">{error}</p>
                </div>
            </div>
        );
    }

    if (!config) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    const currencySymbol = config.currency === 'USD' ? '$' : config.currency === 'EUR' ? '€' : '₱';
    const hasDiscount = config.productComparePrice && config.productComparePrice > config.productPrice;
    const discountPercent = hasDiscount
        ? Math.round((1 - config.productPrice / config.productComparePrice) * 100)
        : 0;

    return (
        <div className="min-h-screen bg-white flex flex-col">
            {/* Preview Banner */}
            <div className="bg-slate-800 py-2 px-4 text-center border-b border-slate-700">
                <span className="text-xs text-slate-400 flex items-center justify-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    Live Preview Mode
                </span>
            </div>

            {/* Header */}
            <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-slate-200 px-4 py-3 flex items-center justify-between">
                <button className="p-2 rounded-full hover:bg-slate-100 transition-colors">
                    <X className="w-5 h-5 text-slate-600" />
                </button>
                <h1 className="font-semibold text-slate-800 truncate max-w-[200px]">
                    {config.productName || 'Product'}
                </h1>
                <button className="relative p-2 rounded-full hover:bg-slate-100 transition-colors">
                    <ShoppingCart className="w-5 h-5 text-slate-600" />
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center font-bold">
                        0
                    </span>
                </button>
            </header>

            {/* Main Content */}
            <div className="flex-1 flex items-center justify-center p-4 md:p-8">
                <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
                    {/* Product Image */}
                    <div className="relative bg-slate-100 aspect-square overflow-hidden">
                        {config.productImage ? (
                            <img
                                src={config.productImage}
                                alt={config.productName}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center">
                                <Sparkles className="w-16 h-16 text-slate-300" />
                            </div>
                        )}

                        {/* Category Badge */}
                        {config.productCategory && (
                            <span className="absolute top-4 left-4 px-3 py-1.5 bg-emerald-500 text-white text-sm font-medium rounded-full shadow-lg">
                                {config.productCategory}
                            </span>
                        )}

                        {/* Discount Badge */}
                        {hasDiscount && (
                            <span className="absolute top-4 right-4 px-3 py-1.5 bg-red-500 text-white text-sm font-bold rounded-full shadow-lg">
                                -{discountPercent}%
                            </span>
                        )}
                    </div>

                    {/* Product Info */}
                    <div className="p-6">
                        <h2 className="text-xl font-bold text-slate-900 mb-2">
                            {config.productName || 'Product Name'}
                        </h2>

                        {config.productDescription && (
                            <p className="text-slate-600 text-sm mb-4">
                                {config.productDescription}
                            </p>
                        )}

                        {/* Price */}
                        <div className="flex items-baseline gap-3 mb-6">
                            <span className="text-2xl font-bold text-emerald-600">
                                {currencySymbol}{config.productPrice?.toLocaleString() || '0'}
                            </span>
                            {hasDiscount && (
                                <span className="text-lg text-slate-400 line-through">
                                    {currencySymbol}{config.productComparePrice?.toLocaleString()}
                                </span>
                            )}
                        </div>

                        {/* Add to Cart Button */}
                        <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg">
                            <ShoppingCart className="w-5 h-5" />
                            Add to Cart
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductPreview;
