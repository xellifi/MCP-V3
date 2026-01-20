import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, Menu, X, Shield, RefreshCw, DollarSign, AlertTriangle, CreditCard, Scale, FileText } from 'lucide-react';
import Footer from '../components/Footer';

const RefundPolicy: React.FC = () => {
    const navigate = useNavigate();
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <div className="min-h-screen bg-slate-950 font-sans selection:bg-violet-500/30 overflow-x-hidden text-slate-300">
            {/* Animated Background */}
            <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="gradient-orb gradient-orb-1 animate-blob opacity-20"></div>
                <div className="gradient-orb gradient-orb-2 animate-blob animation-delay-2000 opacity-20"></div>
                <div className="absolute inset-0 bg-[linear-gradient(rgba(139,92,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.03)_1px,transparent_1px)] bg-[size:60px_60px]"></div>
            </div>

            {/* Navigation */}
            <nav className={`fixed w-full z-50 transition-all duration-500 ${isScrolled ? 'py-3' : 'py-5'}`}>
                <div className="max-w-7xl mx-auto px-6">
                    <div className={`flex justify-between items-center px-6 py-3 rounded-2xl transition-all duration-500 ${isScrolled ? 'glass-nav shadow-2xl' : 'bg-transparent'}`}>
                        {/* Logo */}
                        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
                            <div className="relative">
                                <div className="absolute inset-0 bg-gradient-to-tr from-violet-600 to-fuchsia-500 rounded-xl blur opacity-50"></div>
                                <div className="relative bg-gradient-to-tr from-violet-600 to-fuchsia-500 p-2.5 rounded-xl">
                                    <Bot className="w-5 h-5 text-white" />
                                </div>
                            </div>
                            <span className="text-xl font-bold text-white tracking-tight">
                                Mychat<span className="text-violet-400">Pilot</span>
                            </span>
                        </div>

                        {/* Desktop Navigation */}
                        <div className="hidden md:flex items-center gap-8">
                            <button onClick={() => navigate('/features')} className="text-sm font-medium hover:text-white transition-colors">Features</button>
                            <button onClick={() => navigate('/#pricing')} className="text-sm font-medium hover:text-white transition-colors">Pricing</button>
                            <button onClick={() => navigate('/#testimonials')} className="text-sm font-medium hover:text-white transition-colors">Testimonials</button>
                            <button onClick={() => navigate('/#faq')} className="text-sm font-medium hover:text-white transition-colors">FAQ</button>
                        </div>

                        {/* Right Side Buttons */}
                        <div className="hidden md:flex items-center gap-3">
                            <button
                                onClick={() => navigate('/login')}
                                className="text-slate-300 font-medium hover:text-white transition-colors px-4 py-2 rounded-xl hover:bg-white/5"
                            >
                                Log in
                            </button>
                            <button
                                onClick={() => navigate('/register')}
                                className="shimmer-btn bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:shadow-lg hover:shadow-violet-500/25 transition-all duration-300 active:scale-95 text-sm"
                            >
                                Get Started
                            </button>
                        </div>

                        {/* Mobile Menu Button */}
                        <button
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="md:hidden p-2 text-white hover:bg-white/10 rounded-xl transition-colors touch-feedback"
                        >
                            <Menu className="w-6 h-6" />
                        </button>
                    </div>
                </div>
            </nav>

            {/* Mobile Menu Drawer */}
            {isMobileMenuOpen && (
                <>
                    <div className="mobile-drawer-overlay" onClick={() => setIsMobileMenuOpen(false)} />
                    <div className="mobile-drawer">
                        <div className="p-6 h-full flex flex-col">
                            <div className="flex justify-between items-center mb-10">
                                <div className="flex items-center gap-3">
                                    <div className="bg-gradient-to-tr from-violet-600 to-fuchsia-500 p-2 rounded-xl">
                                        <Bot className="w-5 h-5 text-white" />
                                    </div>
                                    <span className="text-lg font-bold text-white">MyChat Pilot</span>
                                </div>
                                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <nav className="space-y-2 flex-1">
                                <button onClick={() => { setIsMobileMenuOpen(false); navigate('/features'); }} className="flex w-full items-center gap-4 text-slate-300 hover:text-white px-4 py-4 rounded-xl hover:bg-white/5 transition-all">
                                    <span className="font-medium text-lg">Features</span>
                                </button>
                                <button onClick={() => { setIsMobileMenuOpen(false); navigate('/#pricing'); }} className="flex w-full items-center gap-4 text-slate-300 hover:text-white px-4 py-4 rounded-xl hover:bg-white/5 transition-all">
                                    <span className="font-medium text-lg">Pricing</span>
                                </button>
                            </nav>

                            <div className="space-y-3 mt-auto mb-20">
                                <button onClick={() => { navigate('/login'); setIsMobileMenuOpen(false); }} className="w-full text-center text-lg text-white/80 hover:text-white px-4 py-3 rounded-xl hover:bg-white/5 transition-all border border-white/5">
                                    Log In
                                </button>
                                <button onClick={() => { navigate('/register'); setIsMobileMenuOpen(false); }} className="w-full shimmer-btn bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white px-4 py-3 rounded-xl font-bold text-lg shadow-lg shadow-violet-500/20">
                                    Get Started Free
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}

            <main className="relative z-10 pt-32 pb-20 px-6">
                <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-16">
                        <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-6">
                            Refund <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400">Policy</span>
                        </h1>
                        <p className="text-lg text-slate-400">Last updated: {new Date().toLocaleDateString()}</p>
                    </div>

                    <div className="glass-panel p-8 md:p-12 rounded-3xl border border-white/5 space-y-12 text-slate-300 leading-relaxed">

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                                <span className="p-2 rounded-lg bg-violet-500/10 text-violet-400"><FileText size={24} /></span>
                                Introduction
                            </h2>
                            <p className="mb-4">
                                <strong>MyChat Pilot</strong> is committed to transparency, fairness, and responsible billing. This Refund Policy explains how refund requests are handled for subscriptions, AI token packs, and reseller license purchases made on the platform.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">Pricing Plans Overview</h2>
                            <p className="mb-4">MyChat Pilot offers multiple pricing models designed to suit different business needs, including:</p>
                            <ul className="list-disc pl-5 space-y-2 marker:text-violet-500 mb-4">
                                <li>Monthly and subscription plans</li>
                                <li>White-label reseller licenses</li>
                                <li>A free plan that allows users to test core platform features before purchasing</li>
                            </ul>
                            <p>
                                Each paid plan includes defined limits and access levels. The free plan is provided to allow users to fully evaluate the platform before committing to any paid purchase.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                                <span className="p-2 rounded-lg bg-red-500/10 text-red-400"><AlertTriangle size={24} /></span>
                                No General Refund Eligibility
                            </h2>
                            <p className="mb-4">
                                Because MyChat Pilot provides a fully functional free plan for evaluation, <strong>all paid purchases are final and non-refundable</strong>.
                            </p>
                            <p className="mb-2">By upgrading to a paid plan, users acknowledge and agree that:</p>
                            <ul className="list-disc pl-5 space-y-2 marker:text-red-500">
                                <li>All payments are final</li>
                                <li>Refunds will not be issued for change of mind</li>
                                <li>Unused services are not eligible for refunds</li>
                                <li>Accidental purchases are not refundable</li>
                                <li>This policy applies to all subscriptions, AI token packs, and reseller licenses</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                                <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400"><RefreshCw size={24} /></span>
                                Exceptional Refund Cases
                            </h2>
                            <p className="mb-4">
                                Although refunds are generally not provided, MyChat Pilot may consider refund requests in <strong>exceptional circumstances</strong>, including but not limited to:
                            </p>
                            <ul className="list-disc pl-5 space-y-2 marker:text-violet-500 mb-6">
                                <li>Verified technical issues that prevent platform usage</li>
                                <li>Payment processing errors</li>
                                <li>Duplicate or incorrect billing</li>
                                <li>Other critical situations reviewed by our billing team</li>
                            </ul>
                            <div className="bg-white/5 p-6 rounded-2xl border border-white/5">
                                <h3 className="font-bold text-white mb-2">How to Request a Refund</h3>
                                <p className="mb-2">Refund requests must be submitted through our support desk.</p>
                                <p className="text-sm text-slate-400 mb-4">Submitting a support ticket does not guarantee approval. All refund decisions are made at the sole discretion of MyChat Pilot’s billing team after careful review.</p>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">AI Tokens and Reseller License Policy</h2>
                            <ul className="list-disc pl-5 space-y-2 marker:text-violet-500">
                                <li>AI token packs are <strong>non-refundable</strong> and <strong>do not expire</strong></li>
                                <li>Partially used token packs are <strong>non-refundable</strong></li>
                                <li>White-label reseller licenses and onboarding fees are <strong>final and non-refundable under all circumstances</strong></li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">Auto-Renewal and Cancellation</h2>
                            <ul className="list-disc pl-5 space-y-2 marker:text-violet-500">
                                <li>All recurring plans renew automatically at the end of each billing cycle</li>
                                <li>Users receive advance notifications prior to renewal</li>
                                <li>Auto-renewal cannot be disabled manually (please contact support)</li>
                                <li>Cancellation requests must be submitted to support at least <strong>three (3) business days before the renewal date</strong></li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                                <span className="p-2 rounded-lg bg-blue-500/10 text-blue-400"><CreditCard size={24} /></span>
                                Refund Processing (If Approved)
                            </h2>
                            <p className="mb-4">If a refund is approved under exceptional circumstances:</p>
                            <ul className="list-disc pl-5 space-y-2 marker:text-blue-500">
                                <li>Processing will be completed within <strong>fifteen (15) business days</strong></li>
                                <li>Refunds are issued through <strong>PayPro</strong>, our official payment partner</li>
                                <li>Refunds are sent only to the <strong>original payment method</strong> used during purchase</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                                <span className="p-2 rounded-lg bg-red-500/10 text-red-500"><Scale size={24} /></span>
                                Chargeback Policy
                            </h2>
                            <p className="mb-4">Unauthorized chargebacks may result in:</p>
                            <ul className="list-disc pl-5 space-y-2 marker:text-red-500 mb-4">
                                <li>Immediate account suspension</li>
                                <li>Permanent termination of access to MyChat Pilot</li>
                                <li>Possible legal action under the laws of Philippines</li>
                            </ul>
                            <p className="text-slate-400">Users are strongly advised to contact MyChat Pilot support before initiating any chargeback or payment dispute.</p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">Governing Law</h2>
                            <p className="mb-4">
                                This Refund Policy and any disputes arising from it are governed by the laws of the <strong>Republic of the Philippines</strong>.
                            </p>
                            <ul className="list-disc pl-5 space-y-2 marker:text-violet-500">
                                <li>All legal proceedings must be filed exclusively in courts located in Philippines, unless otherwise required by applicable consumer protection laws</li>
                                <li>Users consent to the jurisdiction and venue of these courts</li>
                                <li>If any provision is found invalid or unenforceable, the remaining provisions will remain in full effect</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">Policy Updates</h2>
                            <p className="mb-4">
                                MyChat Pilot reserves the right to update this Refund Policy to reflect changes in services, billing practices, or legal requirements.
                            </p>
                            <p className="mb-4">
                                The latest version will always be available at <strong>/refund-policy</strong>.
                            </p>
                            <p>
                                Continued use of the platform after policy updates constitutes acceptance of the revised terms.
                            </p>
                        </section>

                    </div>
                </div>
            </main>

            {/* Footer */}
            <Footer />
        </div>
    );
};

export default RefundPolicy;
