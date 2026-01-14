import React, { useState } from 'react';
import { Check, X, CreditCard, Zap, Shield, Crown, Rocket, Star, Gift, Loader2 } from 'lucide-react';
import PaymentModal from '../components/PaymentModal';
import { api } from '../services/api';
import { Package } from '../types';

const SubscriptionPlans: React.FC = () => {
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly' | 'lifetime'>('monthly');
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<{ name: string, price: number } | null>(null);

    const [plans, setPlans] = useState<any[]>([]); // Using any[] for UI mapped shape, or define interface
    const [loading, setLoading] = useState(true);
    const [currentPackageId, setCurrentPackageId] = useState<string | null>(null);
    const [isPending, setIsPending] = useState(false);
    const [hasLifetimeOptions, setHasLifetimeOptions] = useState(false);

    React.useEffect(() => {
        const fetchPlans = async () => {
            try {
                // Fetch plans and current subscription in parallel
                const [data, currentSub] = await Promise.all([
                    api.admin.getPackages(),
                    api.subscriptions.getCurrentSubscription()
                ]);

                // Set current package ID and check if pending
                if (currentSub && currentSub.package_id) {
                    setCurrentPackageId(currentSub.package_id);
                    setIsPending(currentSub.status === 'Pending');
                }

                if (data && data.length > 0) {
                    // Filter only visible packages
                    const visiblePackages = data.filter(pkg => pkg.isVisible !== false);

                    // Check if any package has lifetime pricing
                    const anyLifetime = visiblePackages.some(pkg => pkg.priceLifetime && pkg.priceLifetime > 0);
                    setHasLifetimeOptions(anyLifetime);

                    // Map DB packages to UI structure
                    const mappedPlans = visiblePackages.map(pkg => {
                        // Determine Icon based on ID or Name
                        let Icon = Star;
                        if (pkg.id === 'free') Icon = Rocket;
                        else if (pkg.id === 'starter') Icon = Zap;
                        else if (pkg.id === 'pro') Icon = Crown;

                        // Determine price based on billing cycle
                        let price = pkg.priceMonthly;
                        if (billingCycle === 'yearly') price = pkg.priceYearly;
                        else if (billingCycle === 'lifetime') price = pkg.priceLifetime || 0;

                        return {
                            ...pkg, // id, name, priceMonthly, priceYearly, priceLifetime, color, features (string[])
                            price: price,
                            description: getDescriptionForPlan(pkg.id),
                            icon: Icon,
                            popular: pkg.id === 'pro', // Default popular logic
                            features: pkg.features || [] // Already string[]
                        };
                    });
                    // Sort by price (Free -> Starter -> Pro)
                    mappedPlans.sort((a, b) => a.priceMonthly - b.priceMonthly);
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

    const getDescriptionForPlan = (id: string) => {
        switch (id) {
            case 'free': return 'Perfect for testing the waters and exploring the platform';
            case 'starter': return 'Essential tools to launch your automated chat marketing';
            case 'pro': return 'Power up your sales with advanced automation & store';
            default: return 'Unlock full potential';
        }
    };

    const handleSelectPlan = (plan: typeof plans[0]) => {
        setSelectedPlan({ name: plan.name, price: plan.price });
        setIsPaymentModalOpen(true);
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 lg:p-10 font-sans">
            <div className="max-w-7xl mx-auto space-y-12">

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
                        <div className="relative flex items-center bg-slate-200 dark:bg-slate-800 p-1 rounded-xl">
                            <button
                                onClick={() => setBillingCycle('monthly')}
                                className={`relative z-10 px-6 py-2 text-sm font-semibold rounded-lg transition-all duration-300 ${billingCycle === 'monthly'
                                    ? 'text-slate-900 dark:text-white shadow-sm bg-white dark:bg-slate-700'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                    }`}
                            >
                                Monthly billing
                            </button>
                            <button
                                onClick={() => setBillingCycle('yearly')}
                                className={`relative z-10 px-6 py-2 text-sm font-semibold rounded-lg transition-all duration-300 ${billingCycle === 'yearly'
                                    ? 'text-slate-900 dark:text-white shadow-sm bg-white dark:bg-slate-700'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                    }`}
                            >
                                Yearly billing <span className="ml-1 text-xs text-green-600 font-bold bg-green-100 dark:bg-green-900/30 px-1.5 py-0.5 rounded-full">-20%</span>
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
                        </div>
                    </div>
                </div>

                {/* Pricing Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
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
                                            {billingCycle === 'lifetime' ? (
                                                <span className="text-lg text-slate-500 dark:text-slate-400 font-medium">one-time</span>
                                            ) : (
                                                <span className="text-lg text-slate-500 dark:text-slate-400 font-medium">/{billingCycle === 'monthly' ? 'mo' : 'yr'}</span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex-1 space-y-4 mb-8">
                                        {plan.features.map((feature: string) => (
                                            <div key={feature} className="flex items-start gap-3 group/feature">
                                                <div className={`flex-shrink-0 p-1 rounded-full bg-${plan.color}-100 dark:bg-${plan.color}-900/50 text-${plan.color}-600 dark:text-${plan.color}-400 mt-0.5 transition-colors group-hover/feature:bg-${plan.color}-200 dark:group-hover/feature:bg-${plan.color}-800`}>
                                                    <Check className="w-3.5 h-3.5" />
                                                </div>
                                                <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">
                                                    {feature}
                                                </span>
                                            </div>
                                        ))}
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
                    planName={selectedPlan.name}
                    billingCycle={billingCycle}
                    price={selectedPlan.price}
                />
            )}
        </div>
    );
};

export default SubscriptionPlans;
