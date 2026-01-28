import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Check, X, CreditCard, Zap, Shield, Crown, Rocket, Star, Gift, Loader2 } from 'lucide-react';
import PaymentModal from '../components/PaymentModal';
import { api } from '../services/api';
import { Package } from '../types';
import { useSubscription } from '../context/SubscriptionContext';

const SubscriptionPlans: React.FC = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly' | 'lifetime' | 'custom'>('monthly');
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<{ name: string, price: number, durationDays?: number, effectiveBillingCycle?: 'monthly' | 'yearly' | 'lifetime' | 'custom' } | null>(null);

    const [plans, setPlans] = useState<any[]>([]); // Using any[] for UI mapped shape, or define interface
    const [loading, setLoading] = useState(true);
    const [hasLifetimeOptions, setHasLifetimeOptions] = useState(false);
    const [hasCustomOptions, setHasCustomOptions] = useState(false);

    // Use shared subscription context for realtime updates
    const { currentSubscription, refreshSubscription } = useSubscription();
    const currentPackageId = currentSubscription?.package_id || null;
    const isPending = currentSubscription?.status === 'Pending';
    const hasPendingUpgrade = (currentSubscription as any)?.hasPendingUpgrade === true;
    const pendingPackage = (currentSubscription as any)?.pendingPackage;
    const isExpired = (currentSubscription as any)?.isExpired === true;

    React.useEffect(() => {
        const fetchPlans = async () => {
            try {
                // Fetch plans and current subscription in parallel
                const [data, currentSub] = await Promise.all([
                    api.admin.getPackages(),
                    api.subscriptions.getCurrentSubscription()
                ]);

                // Subscription is now managed by SubscriptionContext
                // No need to set local state here

                if (data && data.length > 0) {
                    // Filter only visible packages
                    const visiblePackages = data.filter(pkg => pkg.isVisible === true || pkg.isVisible === undefined);

                    // Check if any package has lifetime pricing
                    const anyLifetime = visiblePackages.some(pkg => pkg.priceLifetime && pkg.priceLifetime > 0);
                    setHasLifetimeOptions(anyLifetime);

                    // Check if any package has custom duration pricing
                    const anyCustom = visiblePackages.some(pkg =>
                        ((pkg as any).priceCustom || (pkg as any).priceDaily) &&
                        ((pkg as any).priceCustom > 0 || (pkg as any).priceDaily > 0) &&
                        pkg.durationDays && pkg.durationDays > 0
                    );
                    setHasCustomOptions(anyCustom);

                    // Map DB packages to UI structure
                    const mappedPlans = visiblePackages.map(pkg => {
                        // Determine Icon based on ID or Name
                        let Icon = Star;
                        if (pkg.id === 'free') Icon = Rocket;
                        else if (pkg.id === 'starter') Icon = Zap;
                        else if (pkg.id === 'pro') Icon = Crown;

                        // Get custom price (supports both old priceDaily and new priceCustom)
                        const customPrice = (pkg as any).priceCustom || (pkg as any).priceDaily || 0;
                        const durationDays = pkg.durationDays || 0;
                        const hasCustomPricing = customPrice > 0 && durationDays > 0;

                        // Check if this is a lifetime-only package (no monthly/yearly pricing)
                        const isLifetimeOnly = (!pkg.priceMonthly || pkg.priceMonthly === 0) &&
                            (!pkg.priceYearly || pkg.priceYearly === 0) &&
                            (pkg.priceLifetime && pkg.priceLifetime > 0);

                        // Check if this is a custom-only package (no monthly/yearly/lifetime pricing)
                        const isCustomOnly = (!pkg.priceMonthly || pkg.priceMonthly === 0) &&
                            (!pkg.priceYearly || pkg.priceYearly === 0) &&
                            (!pkg.priceLifetime || pkg.priceLifetime === 0) &&
                            hasCustomPricing;

                        // Determine price based on billing cycle
                        let price = pkg.priceMonthly;
                        let effectiveBillingCycle = billingCycle;

                        if (isCustomOnly) {
                            price = customPrice;
                            effectiveBillingCycle = 'custom';
                        } else if (isLifetimeOnly) {
                            price = pkg.priceLifetime;
                            effectiveBillingCycle = 'lifetime';
                        } else if (billingCycle === 'yearly') {
                            price = pkg.priceYearly;
                        } else if (billingCycle === 'lifetime') {
                            price = pkg.priceLifetime || 0;
                        } else if (billingCycle === 'custom' && hasCustomPricing) {
                            price = customPrice;
                        }

                        return {
                            ...pkg, // id, name, priceMonthly, priceYearly, priceLifetime, color, features (string[])
                            price: price,
                            customPrice: customPrice,
                            durationDays: durationDays,
                            hasCustomPricing: hasCustomPricing,
                            isLifetimeOnly: isLifetimeOnly, // Flag for UI rendering
                            isCustomOnly: isCustomOnly,
                            effectiveBillingCycle: effectiveBillingCycle,
                            description: pkg.description || getDescriptionForPlan(pkg.id),
                            icon: Icon,
                            popular: pkg.id === 'pro', // Default popular logic
                            features: pkg.features || [] // Already string[]
                        };
                    });

                    // Sort by displayOrder from database (already comes sorted from API, but ensure client-side consistency)
                    mappedPlans.sort((a, b) => {
                        // Primary sort: by displayOrder
                        const orderA = a.displayOrder ?? 99;
                        const orderB = b.displayOrder ?? 99;
                        return orderA - orderB;
                    });
                    setPlans(mappedPlans);
                }
            } catch (error) {
                console.error('Failed to load public plans:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchPlans();
    }, [billingCycle]); // Re-map when billing cycle changes

    // Auto-open payment modal if redirected from registration with a plan selected
    useEffect(() => {
        const planFromUrl = searchParams.get('plan');
        const billingFromUrl = searchParams.get('billing');
        const priceFromUrl = searchParams.get('price');

        if (planFromUrl && priceFromUrl && plans.length > 0) {
            // Find the plan in loaded plans
            const matchedPlan = plans.find(p => p.id === planFromUrl);
            if (matchedPlan) {
                // Set billing cycle from URL
                if (billingFromUrl === 'monthly' || billingFromUrl === 'yearly' || billingFromUrl === 'lifetime') {
                    setBillingCycle(billingFromUrl);
                }
                // Open payment modal with the selected plan
                setSelectedPlan({ name: matchedPlan.name, price: parseFloat(priceFromUrl) });
                setIsPaymentModalOpen(true);
                // Clear URL params after handling
                setSearchParams({});
            }
        }
    }, [plans, searchParams, setSearchParams]);

    const getDescriptionForPlan = (id: string) => {
        switch (id) {
            case 'free': return 'Perfect for testing the waters and exploring the platform';
            case 'starter': return 'Essential tools to launch your automated chat marketing';
            case 'pro': return 'Power up your sales with advanced automation & store';
            default: return 'Unlock full potential';
        }
    };

    const handleSelectPlan = (plan: typeof plans[0]) => {
        setSelectedPlan({
            name: plan.name,
            price: plan.price,
            durationDays: plan.effectiveBillingCycle === 'custom' ? plan.durationDays : undefined,
            effectiveBillingCycle: plan.effectiveBillingCycle
        });
        setIsPaymentModalOpen(true);
    };

    // Refresh subscription status after successful payment - now uses shared context
    // The refreshSubscription from context will update Layout header badge in realtime

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 lg:p-10 font-sans">
            <div className="max-w-7xl mx-auto space-y-12">

                {/* Pending Upgrade Status Banner - Show when expired user has submitted a plan purchase */}
                {(hasPendingUpgrade || (isExpired && isPending)) && pendingPackage && (
                    <div className="mb-8 p-6 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-2 border-amber-200 dark:border-amber-700 rounded-2xl">
                        <div className="flex items-center gap-4">
                            <div className="flex-shrink-0 w-12 h-12 bg-amber-100 dark:bg-amber-900/50 rounded-xl flex items-center justify-center">
                                <CreditCard className="w-6 h-6 text-amber-600" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-bold text-amber-800 dark:text-amber-300">
                                    Your {pendingPackage.name} Subscription is Pending Approval
                                </h3>
                                <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                                    Your payment has been received. Once verified by our team, your subscription will be activated and you'll have full access to all features.
                                </p>
                            </div>
                            <div className="flex-shrink-0">
                                <span className="inline-flex items-center gap-2 px-4 py-2 bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200 rounded-full text-sm font-bold">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Pending Review
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Header Section */}
                <div className="text-center space-y-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-sm font-medium mb-4">
                        <Star className="w-4 h-4 fill-current" />
                        <span>Upgrade your business capability</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                        Simple Pricing, Maximum Power <br className="hidden md:block" />
                    </h1>
                    <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                        Unlock the full potential of your chat marketing. From startup to enterprise, we have a plan that fits your ambition.
                    </p>

                    {/* Billing Toggle */}
                    <div className="flex justify-center mt-8">
                        <div className="relative flex items-center flex-wrap justify-center gap-1 bg-slate-200 dark:bg-slate-800 p-1 rounded-xl">
                            <button
                                onClick={() => setBillingCycle('monthly')}
                                className={`relative z-10 px-6 py-2 text-sm font-semibold rounded-lg transition-all duration-300 ${billingCycle === 'monthly'
                                    ? 'text-slate-900 dark:text-white shadow-sm bg-white dark:bg-slate-700'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                    }`}
                            >
                                Monthly
                            </button>
                            <button
                                onClick={() => setBillingCycle('yearly')}
                                className={`relative z-10 px-6 py-2 text-sm font-semibold rounded-lg transition-all duration-300 ${billingCycle === 'yearly'
                                    ? 'text-slate-900 dark:text-white shadow-sm bg-white dark:bg-slate-700'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                    }`}
                            >
                                Yearly <span className="ml-1 text-xs text-green-600 font-bold bg-green-100 dark:bg-green-900/30 px-1.5 py-0.5 rounded-full">-20%</span>
                            </button>
                            {hasLifetimeOptions && (
                                <button
                                    onClick={() => setBillingCycle('lifetime')}
                                    className={`relative z-10 px-6 py-2 text-sm font-semibold rounded-lg transition-all duration-300 ${billingCycle === 'lifetime'
                                        ? 'text-slate-900 dark:text-white shadow-sm bg-white dark:bg-slate-700'
                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                        }`}
                                >
                                    Lifetime <span className="ml-1 text-xs text-amber-600 font-bold bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 rounded-full">∞</span>
                                </button>
                            )}
                            {hasCustomOptions && (
                                <button
                                    onClick={() => setBillingCycle('custom')}
                                    className={`relative z-10 px-6 py-2 text-sm font-semibold rounded-lg transition-all duration-300 ${billingCycle === 'custom'
                                        ? 'text-slate-900 dark:text-white shadow-sm bg-white dark:bg-slate-700'
                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                        }`}
                                >
                                    Custom <span className="ml-1 text-xs text-purple-600 font-bold bg-purple-100 dark:bg-purple-900/30 px-1.5 py-0.5 rounded-full">
                                        {plans.find(p => p.hasCustomPricing)?.durationDays || 'X'} days
                                    </span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Pricing Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative items-stretch">
                    {/* Background Glow */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-4xl bg-gradient-to-r from-blue-500/20 to-purple-500/20 blur-3xl rounded-full -z-10" />

                    {loading ? (
                        <div className="col-span-full flex justify-center py-20">
                            <Loader2 className="w-10 h-10 animate-spin text-primary-500" />
                        </div>
                    ) : (
                        plans.map((plan) => {
                            const isCurrentPlan = plan.id === currentPackageId;
                            return (
                                <div
                                    key={plan.id || plan.name}
                                    className={`relative group flex flex-col p-8 bg-white dark:bg-slate-900/80 backdrop-blur-xl border-2 rounded-3xl transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl ${isCurrentPlan
                                        ? 'border-emerald-500 dark:border-emerald-500 shadow-emerald-500/20 ring-2 ring-emerald-500/30'
                                        : plan.popular
                                            ? 'border-purple-500 dark:border-purple-500 shadow-purple-500/10 z-10 scale-105 md:scale-110'
                                            : 'border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                                        }`}
                                >
                                    {/* Current Plan Badge - Artistic & Noticeable */}
                                    {isCurrentPlan && (
                                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20">
                                            <div className="relative flex items-center gap-2">
                                                {/* Glow effect */}
                                                <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-teal-500 blur-md opacity-60 rounded-full"></div>
                                                {/* Badge */}
                                                <div className="relative px-5 py-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-white text-xs font-black uppercase tracking-widest rounded-full shadow-xl flex items-center gap-1.5 animate-pulse">
                                                    <Check className="w-3.5 h-3.5" />
                                                    <span>Current Plan</span>
                                                </div>
                                                {/* Pending Badge */}
                                                {isPending && (
                                                    <div className="relative px-3 py-1.5 bg-amber-500 text-white text-xs font-bold uppercase tracking-wide rounded-full shadow-lg">
                                                        Pending
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Popular Badge (only show if not current plan) */}
                                    {plan.popular && !isCurrentPlan && (
                                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-bold uppercase tracking-wider rounded-full shadow-lg flex items-center gap-1">
                                            <Rocket className="w-3 h-3" /> Most Popular
                                        </div>
                                    )}

                                    <div className="mb-6 space-y-4">
                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center bg-${plan.color}-100 dark:bg-${plan.color}-900/30 text-${plan.color}-600 dark:text-${plan.color}-400 shadow-sm`}>
                                            <plan.icon className="w-7 h-7" />
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{plan.name}</h3>
                                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{plan.description}</p>
                                        </div>
                                    </div>

                                    <div className="mb-8">
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">${plan.price}</span>
                                            {(plan.effectiveBillingCycle === 'lifetime' || plan.isLifetimeOnly) ? (
                                                <span className="text-lg text-slate-500 dark:text-slate-400 font-medium">one-time</span>
                                            ) : (plan.effectiveBillingCycle === 'custom' || plan.isCustomOnly) ? (
                                                <span className="text-lg text-slate-500 dark:text-slate-400 font-medium">/ {plan.durationDays} {plan.durationDays === 1 ? 'day' : 'days'}</span>
                                            ) : (
                                                <span className="text-lg text-slate-500 dark:text-slate-400 font-medium">/{billingCycle === 'monthly' ? 'mo' : 'yr'}</span>
                                            )}
                                        </div>
                                        {/* Show monthly equivalent for yearly billing */}
                                        {billingCycle === 'yearly' && plan.price > 0 && !plan.isLifetimeOnly && (
                                            <p className="text-sm text-emerald-500 dark:text-emerald-400 mt-1">
                                                Only ${(plan.price / 12).toFixed(0)}/mo — Save {Math.round((1 - (plan.price / 12) / plan.priceMonthly) * 100)}%
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex-1 space-y-4 mb-8">
                                        {plan.features.map((feature: string) => {
                                            const isUnavailable = feature.startsWith('-');
                                            const displayText = isUnavailable ? feature.slice(1) : feature;

                                            return (
                                                <div key={feature} className="flex items-start gap-3 group/feature">
                                                    {isUnavailable ? (
                                                        <div className="flex-shrink-0 p-1 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 mt-0.5">
                                                            <X className="w-3.5 h-3.5" />
                                                        </div>
                                                    ) : (
                                                        <div className={`flex-shrink-0 p-1 rounded-full bg-${plan.color}-100 dark:bg-${plan.color}-900/50 text-${plan.color}-600 dark:text-${plan.color}-400 mt-0.5 transition-colors group-hover/feature:bg-${plan.color}-200 dark:group-hover/feature:bg-${plan.color}-800`}>
                                                            <Check className="w-3.5 h-3.5" />
                                                        </div>
                                                    )}
                                                    <span className={`text-sm font-medium ${isUnavailable
                                                        ? 'text-slate-400 dark:text-slate-500 line-through'
                                                        : 'text-slate-700 dark:text-slate-300'}`}>
                                                        {displayText}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                        {(plan.features.length === 0) && (
                                            <div className="text-sm text-slate-400 italic">No features listed</div>
                                        )}
                                    </div>

                                    <button
                                        onClick={() => !isCurrentPlan && handleSelectPlan(plan)}
                                        disabled={isCurrentPlan}
                                        className={`w-full py-4 px-6 rounded-xl font-bold text-sm transition-all duration-200 transform ${isCurrentPlan
                                            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 cursor-default border-2 border-emerald-500/50'
                                            : plan.popular
                                                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 hover:scale-[1.02] active:scale-[0.98]'
                                                : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200 hover:scale-[1.02] active:scale-[0.98]'
                                            }`}
                                    >
                                        {isCurrentPlan ? (
                                            <span className="flex items-center justify-center gap-2">
                                                <Check className="w-4 h-4" />
                                                Current Plan
                                            </span>
                                        ) : plan.popular ? 'Start Your Free Trial' : `Select ${plan.name} Plan`}
                                    </button>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* FAQ Teaser / Additional Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-10">
                    <div className="p-6 bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
                        <div className="mx-auto w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-green-600 mb-3">
                            <Shield className="w-5 h-5" />
                        </div>
                        <h4 className="font-bold text-slate-900 dark:text-white mb-1">Secure & Reliable</h4>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Enterprise-grade security with 99.9% uptime guarantee.</p>
                    </div>
                    <div className="p-6 bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
                        <div className="mx-auto w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 mb-3">
                            <Gift className="w-5 h-5" />
                        </div>
                        <h4 className="font-bold text-slate-900 dark:text-white mb-1">14-Day Free Trial</h4>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Experience the full power of Pro plan risk-free.</p>
                    </div>
                    <div className="p-6 bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
                        <div className="mx-auto w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center text-orange-600 mb-3">
                            <Zap className="w-5 h-5" />
                        </div>
                        <h4 className="font-bold text-slate-900 dark:text-white mb-1">Instant Setup</h4>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Get started in minutes with our one-click templates.</p>
                    </div>
                </div>
            </div>

            {/* Payment Modal */}
            {selectedPlan && (
                <PaymentModal
                    isOpen={isPaymentModalOpen}
                    onClose={() => setIsPaymentModalOpen(false)}
                    onSuccess={refreshSubscription}
                    planName={selectedPlan.name}
                    billingCycle={selectedPlan.effectiveBillingCycle || billingCycle}
                    price={selectedPlan.price}
                    durationDays={selectedPlan.durationDays}
                />
            )}
        </div>
    );
};

export default SubscriptionPlans;
