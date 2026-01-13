import React, { useState } from 'react';
import { Check, X, CreditCard, Zap, Shield, Crown, Rocket, Star, Gift } from 'lucide-react';
import PaymentModal from '../components/PaymentModal';

const SubscriptionPlans: React.FC = () => {
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<{ name: string, price: number } | null>(null);

    const plans = [
        {
            name: 'Free',
            price: 0,
            description: 'Perfect for testing the waters and exploring the platform',
            icon: Rocket,
            color: 'slate',
            features: [
                { name: '100 Active Subscribers', included: true },
                { name: '1 Connected Facebook Page', included: true },
                { name: 'Visual Drag & Drop Flow Builder', included: true },
                { name: 'Basic Keyword Automation', included: true },
                { name: 'Live Chat Inbox', included: true },
                { name: 'Facebook Comment Auto-Reply', included: false },
                { name: 'Broadcasts & Sequences', included: false },
                { name: 'E-commerce Store', included: false },
                { name: 'Zapier & Integrations', included: false },
                { name: 'Remove Branding', included: false },
            ]
        },
        {
            name: 'Starter',
            price: billingCycle === 'monthly' ? 15 : 150,
            description: 'Essential tools to launch your automated chat marketing',
            icon: Zap,
            color: 'blue',
            features: [
                { name: '1,000 Active Subscribers', included: true },
                { name: '2 Connected Facebook Pages', included: true },
                { name: 'Visual Drag & Drop Flow Builder', included: true },
                { name: 'Unlimited Keyword Automation', included: true },
                { name: 'Live Chat Inbox', included: true },
                { name: 'Facebook Comment Auto-Reply', included: true },
                { name: 'Broadcasts & Sequences', included: true },
                { name: 'Email Support', included: true },
                { name: 'E-commerce Store', included: false },
                { name: 'Zapier & Integrations', included: false },
                { name: 'Remove Branding', included: false },
            ]
        },
        {
            name: 'Pro',
            price: billingCycle === 'monthly' ? 35 : 350,
            description: 'Power up your sales with advanced automation & store',
            icon: Crown,
            color: 'purple',
            popular: true,
            features: [
                { name: 'Unlimited Active Subscribers', included: true },
                { name: 'Unlimited Connected Pages', included: true },
                { name: 'Unlimited Flows & Messages', included: true },
                { name: 'Advanced Comment Growth Tools', included: true },
                { name: 'Full E-commerce Store Builder', included: true },
                { name: 'Zapier, Webhook & API Access', included: true },
                { name: 'User Input & Custom Fields', included: true },
                { name: 'Priority Email & Chat Support', included: true },
                { name: 'Remove "Powered by" Branding', included: true },
                { name: 'Team Members Access', included: true },
                { name: 'White Label Domain', included: true },
            ]
        }
    ];

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
                        </div>
                    </div>
                </div>

                {/* Pricing Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
                    {/* Background Glow */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-4xl bg-gradient-to-r from-blue-500/20 to-purple-500/20 blur-3xl rounded-full -z-10" />

                    {plans.map((plan) => (
                        <div
                            key={plan.name}
                            className={`relative group flex flex-col p-8 bg-white dark:bg-slate-900/80 backdrop-blur-xl border-2 rounded-3xl transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl ${plan.popular
                                ? 'border-purple-500 dark:border-purple-500 shadow-purple-500/10 z-10 scale-105 md:scale-110'
                                : 'border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                                }`}
                        >
                            {plan.popular && (
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
                                    <span className="text-lg text-slate-500 dark:text-slate-400 font-medium">/{billingCycle === 'monthly' ? 'mo' : 'yr'}</span>
                                </div>
                            </div>

                            <div className="flex-1 space-y-4 mb-8">
                                {plan.features.map((feature) => (
                                    <div key={feature.name} className="flex items-start gap-3 group/feature">
                                        {feature.included ? (
                                            <div className={`flex-shrink-0 p-1 rounded-full bg-${plan.color}-100 dark:bg-${plan.color}-900/50 text-${plan.color}-600 dark:text-${plan.color}-400 mt-0.5 transition-colors group-hover/feature:bg-${plan.color}-200 dark:group-hover/feature:bg-${plan.color}-800`}>
                                                <Check className="w-3.5 h-3.5" />
                                            </div>
                                        ) : (
                                            <div className="flex-shrink-0 p-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600 mt-0.5">
                                                <X className="w-3.5 h-3.5" />
                                            </div>
                                        )}
                                        <span className={`text-sm ${feature.included ? 'text-slate-700 dark:text-slate-300 font-medium' : 'text-slate-400 dark:text-slate-600 line-through decoration-slate-300 dark:decoration-slate-700'}`}>
                                            {feature.name}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={() => handleSelectPlan(plan)}
                                className={`w-full py-4 px-6 rounded-xl font-bold text-sm transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] ${plan.popular
                                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40'
                                    : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200'
                                    }`}
                            >
                                {plan.popular ? 'Start Your Free Trial' : `Select ${plan.name} Plan`}
                            </button>
                        </div>
                    ))}
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
