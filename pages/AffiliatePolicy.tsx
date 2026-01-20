import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, Menu, X, FileText, CheckCircle, Shield, AlertTriangle, Scale, DollarSign, CreditCard, Ban, Gavel, Lock, Info, Mail } from 'lucide-react';
import Footer from '../components/Footer';

const AffiliatePolicy: React.FC = () => {
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
                                MyChat <span className="text-violet-400">Pilot</span>
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
                            Affiliate <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400">Policy</span>
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
                                This Affiliate Policy outlines the terms and conditions for participating in the <strong>MyChat Pilot Affiliate Program</strong>. By applying to or remaining in the program, you agree to comply with this Policy along with all related MyChat Pilot terms, privacy rules, and marketing guidelines.
                            </p>
                            <p>
                                MyChat Pilot is owned and operated by <strong>MyChat Pilot Limited</strong>, a company registered in Philippines. Any reference to “we,” “our,” or “us” refers to MyChat Pilot.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">Eligibility Requirements</h2>
                            <p className="mb-4">To qualify as an affiliate, you must:</p>
                            <ul className="list-disc pl-5 space-y-2 marker:text-violet-500 mb-4">
                                <li>Be <strong>18 years of age or older</strong></li>
                                <li>Operate a legitimate website, social media page, or marketing channel</li>
                                <li>Avoid illegal, deceptive, misleading, or adult-related content</li>
                                <li>Maintain an active MyChat Pilot account</li>
                            </ul>
                            <p>
                                Affiliate applications are reviewed individually. Approval or rejection is at our sole discretion, and we are not obligated to provide an explanation.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                                <span className="p-2 rounded-lg bg-blue-500/10 text-blue-400"><CheckCircle size={24} /></span>
                                Affiliate Obligations
                            </h2>
                            <p className="mb-4">
                                Affiliates are expected to act responsibly and professionally at all times and must not engage in any activity that could damage the reputation or credibility of MyChat Pilot.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">Honest and Accurate Promotion</h2>
                            <p className="mb-4">Affiliates must promote MyChat Pilot truthfully and transparently. You may not:</p>
                            <ul className="list-disc pl-5 space-y-2 marker:text-violet-500 mb-4">
                                <li>Make exaggerated, misleading, or false claims (such as guaranteeing unlimited messaging without restrictions)</li>
                                <li>Misrepresent platform capabilities, pricing, or results</li>
                            </ul>
                            <p>
                                All affiliate promotions must clearly disclose the affiliate relationship in accordance with <strong>FTC guidelines</strong>, <strong>GDPR</strong>, and applicable advertising regulations.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                                <span className="p-2 rounded-lg bg-red-500/10 text-red-400"><AlertTriangle size={24} /></span>
                                Compliance and Prohibited Practices
                            </h2>
                            <p className="mb-4">Affiliates must not:</p>
                            <ul className="list-disc pl-5 space-y-2 marker:text-red-500 mb-6">
                                <li>Use spam, unsolicited messages, fake traffic, bots, or deceptive advertising methods</li>
                                <li>Offer unauthorized discounts or misleading incentives</li>
                                <li>Present themselves as official representatives, employees, or partners of MyChat Pilot without written approval</li>
                                <li>Bid on branded keywords including <strong>MyChat Pilot</strong>, <strong>MyChatPilot</strong>, or close variations</li>
                                <li>Register or use domains, subdomains, or social handles containing MyChat Pilot trademarks</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">Ethical Marketing Standards</h2>
                            <p className="mb-4">
                                All promotional activities must be conducted ethically. Affiliates are responsible for respecting user privacy, complying with data protection laws, and using referral links appropriately.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">Referral Links and Tracking</h2>
                            <p className="mb-4">Approved affiliates receive unique referral links through the MyChat Pilot affiliate dashboard.</p>
                            <ul className="list-disc pl-5 space-y-2 marker:text-violet-500 mb-4">
                                <li>Tracking uses cookies and internal attribution systems</li>
                                <li>Standard cookie duration is <strong>90 days</strong>, unless otherwise stated</li>
                                <li>Commissions are awarded using a <strong>last-click attribution model</strong></li>
                            </ul>
                            <p>
                                Tracking may not function if users block cookies, browse privately, or switch devices. MyChat Pilot is not responsible for lost commissions due to these limitations.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                                <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400"><DollarSign size={24} /></span>
                                Commission Eligibility
                            </h2>
                            <p className="mb-4">Commissions may be earned on qualifying purchases, including:</p>
                            <ul className="list-disc pl-5 space-y-2 marker:text-emerald-500 mb-4">
                                <li>Monthly and annual subscription plans</li>
                                <li>White-label or reseller licenses</li>
                                <li>AI token packs</li>
                                <li>Approved add-on services</li>
                            </ul>
                            <div className="bg-white/5 p-6 rounded-2xl border border-white/5">
                                <h3 className="font-bold text-white mb-2">No commissions are paid on:</h3>
                                <ul className="text-sm list-disc pl-4 space-y-1 text-slate-400">
                                    <li>Refunded or reversed transactions</li>
                                    <li>Chargebacks or fraudulent activity</li>
                                    <li>Self-referrals</li>
                                    <li>Purchases made by affiliates, their employees, or immediate family members</li>
                                </ul>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">Commission Rates</h2>
                            <p className="mb-4">
                                Commission rates typically range between <strong>10% and 20%</strong>, unless otherwise specified. Special campaigns or performance-based arrangements may offer different rates.
                            </p>
                            <p>
                                The affiliate dashboard always displays the most current commission structure. MyChat Pilot reserves the right to modify commission rates at any time.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                                <span className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400"><CreditCard size={24} /></span>
                                Payout Terms
                            </h2>
                            <ul className="list-disc pl-5 space-y-2 marker:text-violet-500 mb-4">
                                <li>Minimum payout threshold: <strong>USD 50</strong> (or equivalent)</li>
                                <li>Supported payout methods:
                                    <ul className="list-circle pl-5 mt-1 text-slate-400">
                                        <li>PayPal</li>
                                        <li>Bank transfer (where available)</li>
                                        <li>Mobile banking options such as <strong>GCash</strong> for affiliates in Philippines</li>
                                    </ul>
                                </li>
                            </ul>
                            <p>
                                Commissions are held for <strong>30 days</strong> to account for refunds or disputes. Funds become withdrawable once the holding period ends.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                                <span className="p-2 rounded-lg bg-red-500/10 text-red-500"><Ban size={24} /></span>
                                Restricted Activities
                            </h2>
                            <p className="mb-4">Affiliates must not:</p>
                            <ul className="list-disc pl-5 space-y-2 marker:text-red-500 mb-4">
                                <li>Create fake or duplicate accounts to generate commissions</li>
                                <li>Use coupon or deal websites without written approval</li>
                                <li>Copy or clone the MyChat Pilot website or branding</li>
                                <li>Claim to be MyChat Pilot staff or representatives</li>
                                <li>Post affiliate links inside MyChat Pilot-managed communities or groups</li>
                                <li>Run paid ads targeting brand keywords without authorization</li>
                                <li>Use aggressive pop-ups, malware, misleading redirects, or forced installs</li>
                            </ul>
                            <p className="text-red-400">Violations may result in immediate termination and forfeiture of unpaid commissions.</p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">Termination</h2>
                            <p className="mb-4">MyChat Pilot may terminate an affiliate account at any time due to:</p>
                            <ul className="list-disc pl-5 space-y-2 marker:text-violet-500 mb-4">
                                <li>Policy violations</li>
                                <li>Fraud or abuse</li>
                                <li>Brand misuse or defamation</li>
                                <li>Inactivity exceeding <strong>180 days</strong></li>
                            </ul>
                            <p>
                                Termination may lead to loss of pending commissions and deactivation of affiliate links. Reinstatement requests may be submitted but approval is not guaranteed.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                                <span className="p-2 rounded-lg bg-violet-500/10 text-violet-400"><Lock size={24} /></span>
                                Intellectual Property
                            </h2>
                            <p className="mb-4">
                                Affiliates may only use official marketing assets provided or approved by MyChat Pilot. Modifying logos, trademarks, or branded materials without permission is prohibited.
                            </p>
                            <p>
                                All intellectual property rights remain exclusively with MyChat Pilot.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">Limitation of Liability</h2>
                            <p className="mb-4">MyChat Pilot is not responsible for:</p>
                            <ul className="list-disc pl-5 space-y-2 marker:text-violet-500 mb-4">
                                <li>Lost earnings due to tracking failures or technical issues</li>
                                <li>Misuse of affiliate materials</li>
                                <li>Any personal or business losses arising from participation in the affiliate program</li>
                            </ul>
                            <p>Affiliates participate at their own risk.</p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">Policy Updates</h2>
                            <p className="mb-4">
                                MyChat Pilot may update this Affiliate Policy at any time. Notifications will be provided via email or the affiliate dashboard. Continued participation constitutes acceptance of the updated terms.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                                <span className="p-2 rounded-lg bg-blue-500/10 text-blue-400"><Mail size={24} /></span>
                                Contact Information
                            </h2>
                            <p className="mb-4">
                                For questions regarding the affiliate program, commissions, or compliance matters, please contact us at: <a href="mailto:support@mychatpilot.com" className="text-violet-400 hover:text-white transition-colors">support@mychatpilot.com</a>
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

export default AffiliatePolicy;
