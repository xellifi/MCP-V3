import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, Menu, X, Globe, Shield, Lock, FileText, Database, Server, AlertTriangle, AlertCircle, Cpu } from 'lucide-react';
import Footer from '../components/Footer';

const GdprPolicy: React.FC = () => {
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
                            GDPR <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400">Policy</span>
                        </h1>
                        <p className="text-lg text-slate-400">Last updated: {new Date().toLocaleDateString()}</p>
                    </div>

                    <div className="glass-panel p-8 md:p-12 rounded-3xl border border-white/5 space-y-12 text-slate-300 leading-relaxed">

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                                <span className="p-2 rounded-lg bg-violet-500/10 text-violet-400"><Shield size={24} /></span>
                                1. Introduction
                            </h2>
                            <p className="mb-4">
                                This GDPR Policy describes how <strong>MyChat Pilot</strong> complies with the <strong>General Data Protection Regulation (EU) 2016/679 (GDPR)</strong>, the <strong>UK GDPR</strong>, and applicable data protection laws in <strong>the European Economic Area (EEA), the United Kingdom, and Switzerland</strong>.
                            </p>
                            <p>
                                This document supplements our main <strong>Privacy Policy</strong> and should be read together with it. If there is any inconsistency, the Privacy Policy governs general data handling, while this GDPR Policy specifically explains GDPR concepts, responsibilities, and data subject rights.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">2. Scope of This GDPR Policy</h2>
                            <p className="mb-4">This policy applies where:</p>
                            <ul className="list-disc pl-5 space-y-2 marker:text-violet-500 mb-6">
                                <li>You are located in the EEA, UK, or Switzerland, <strong>and</strong></li>
                                <li>You use MyChat Pilot as a customer, trial user, or website visitor, <strong>or</strong></li>
                                <li>Your personal data is processed because one of our customers has added you as a subscriber, contact, or chatbot user within MyChat Pilot.</li>
                            </ul>
                            <p className="mb-4">This policy explains:</p>
                            <ul className="list-disc pl-5 space-y-2 marker:text-violet-500">
                                <li>When MyChat Pilot acts as a <strong>Data Controller</strong> or <strong>Data Processor</strong></li>
                                <li>The legal bases we rely on under GDPR</li>
                                <li>How we support GDPR rights and compliance</li>
                                <li>Our approach to international transfers, security, and retention</li>
                                <li>How you can exercise your rights</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">3. Key GDPR Definitions</h2>
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                                    <h3 className="font-bold text-white mb-2">Personal Data</h3>
                                    <p className="text-sm text-slate-400">Any information that identifies a person (e.g., name, email, IP).</p>
                                </div>
                                <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                                    <h3 className="font-bold text-white mb-2">Data Subject</h3>
                                    <p className="text-sm text-slate-400">The individual whose personal data is processed (you, your customer).</p>
                                </div>
                                <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                                    <h3 className="font-bold text-white mb-2">Data Controller</h3>
                                    <p className="text-sm text-slate-400">The party that determines <em>why</em> and <em>how</em> data is processed.</p>
                                </div>
                                <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                                    <h3 className="font-bold text-white mb-2">Data Processor</h3>
                                    <p className="text-sm text-slate-400">The party that processes data on behalf of a Controller.</p>
                                </div>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-6">4. Our Role Under GDPR</h2>

                            <div className="mb-8">
                                <h3 className="text-xl font-bold text-white mb-3 text-violet-400">When MyChat Pilot Acts as a Data Controller</h3>
                                <p className="mb-2">We act as a Controller for personal data related to:</p>
                                <ul className="list-disc pl-5 space-y-1 mb-4 text-slate-400">
                                    <li>Your MyChat Pilot account and profile</li>
                                    <li>Subscription and billing information</li>
                                    <li>Platform usage analytics and product improvement</li>
                                    <li>Marketing communications (opt-in)</li>
                                    <li>Support requests</li>
                                </ul>
                            </div>

                            <div>
                                <h3 className="text-xl font-bold text-white mb-3 text-fuchsia-400">When MyChat Pilot Acts as a Data Processor</h3>
                                <p className="mb-2">We act as a Processor for data you upload or generate, including:</p>
                                <ul className="list-disc pl-5 space-y-1 mb-4 text-slate-400">
                                    <li>Subscriber and contact details</li>
                                    <li>Chat messages (WhatsApp, Messenger, etc.)</li>
                                    <li>Tags, metadata, e-commerce data</li>
                                    <li>Custom fields and automation workflows</li>
                                </ul>
                                <p><strong>Note:</strong> You are the Controller of your subscriber data. We process it only per your instructions.</p>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">5. Data Processing Agreement (DPA)</h2>
                            <p>
                                To support GDPR compliance, we offer a <strong>Data Processing Agreement (DPA)</strong> covering responsibilities, subprocessors, security, and rights assistance. Business customers may request a signed DPA by contacting support.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">6. Legal Bases for Processing</h2>
                            <h3 className="text-lg font-semibold text-white mb-2">When We Act as Controller</h3>
                            <ul className="list-disc pl-5 space-y-2 marker:text-violet-500 mb-6">
                                <li><strong>Contractual Necessity:</strong> To provide services and billing.</li>
                                <li><strong>Consent:</strong> For marketing and cookies.</li>
                                <li><strong>Legitimate Interests:</strong> To secure the platform, prevent fraud, and improve features.</li>
                                <li><strong>Legal Obligations:</strong> For tax and regulatory compliance.</li>
                            </ul>
                            <h3 className="text-lg font-semibold text-white mb-2">When We Act as Processor</h3>
                            <p>The legal basis is determined by <strong>you</strong> (the Controller). You must ensure a lawful basis before processing subscriber data.</p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                                <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400"><Lock size={24} /></span>
                                7. GDPR Compliance Support
                            </h2>
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                                    <h3 className="font-bold text-white mb-2">Data Minimization</h3>
                                    <p className="text-sm text-slate-400">We process only necessary data.</p>
                                </div>
                                <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                                    <h3 className="font-bold text-white mb-2">Export & Portability</h3>
                                    <p className="text-sm text-slate-400">Export data (CSV/API) easily.</p>
                                </div>
                                <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                                    <h3 className="font-bold text-white mb-2">Deletion & Erasure</h3>
                                    <p className="text-sm text-slate-400">Delete subscribers or accounts anytime.</p>
                                </div>
                                <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                                    <h3 className="font-bold text-white mb-2">Security Safeguards</h3>
                                    <p className="text-sm text-slate-400">Encryption, access controls, monitoring.</p>
                                </div>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">8. Data Subject Rights</h2>
                            <p className="mb-4">EEA/UK/Swiss users have rights to:</p>
                            <div className="flex flex-wrap gap-2 mb-4">
                                {['Access', 'Rectify', 'Erase', 'Restrict', 'Port', 'Object', 'Withdraw Consent'].map((right) => (
                                    <span key={right} className="px-3 py-1 bg-white/10 rounded-full text-sm text-slate-300 border border-white/5">{right}</span>
                                ))}
                            </div>
                            <p className="text-sm text-slate-400">
                                <strong className="text-white">Note:</strong> When we act as a Processor, we cannot respond to end-user rights requests directly. We will forward them to you (the Controller).
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                                <span className="p-2 rounded-lg bg-blue-500/10 text-blue-400"><Globe size={24} /></span>
                                9-11. Transfers, Security & Subprocessors
                            </h2>
                            <div className="space-y-4">
                                <div>
                                    <h3 className="text-xl font-bold text-white mb-2">Transfers</h3>
                                    <p>Data may be processed globally. We use SCCs, adequacy decisions, and security measures for transfers outside EEA/UK.</p>
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white mb-2">Security & Breach</h3>
                                    <p>We use standard safeguards (encryption, patching). We notify of breaches as legally required.</p>
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white mb-2">Subprocessors</h3>
                                    <p>We use trusted providers for hosting, payments, email, etc., all bound by confidentiality obligations.</p>
                                </div>
                            </div>
                        </section>

                        <section className="bg-violet-900/10 p-6 rounded-2xl border border-violet-500/20">
                            <h2 className="text-2xl font-bold text-white mb-3 flex items-center gap-2">
                                <Cpu className="w-6 h-6 text-violet-400" />
                                12. Automated Decision-Making & AI
                            </h2>
                            <p className="mb-4">
                                MyChat Pilot offers AI features (intent detection, routing) which generally do not produce legal effects.
                            </p>
                            <ul className="list-disc pl-5 space-y-2 marker:text-violet-400">
                                <li>You may disable or override automations.</li>
                                <li>We do <strong>not</strong> use subscriber data to train generalized AI models.</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">13-15. Complaints & Updates</h2>
                            <ul className="list-disc pl-5 space-y-4 marker:text-violet-500">
                                <li><strong>Complaints:</strong> You may complain to your local supervisory authority, but please contact us first.</li>
                                <li><strong>Updates:</strong> We update this policy periodically. Material changes are notified.</li>
                                <li><strong>Contact:</strong> For GDPR questions, please use our support channels.</li>
                            </ul>
                        </section>

                    </div>
                </div>
            </main>

            {/* Footer */}
            <Footer />
        </div>
    );
};

export default GdprPolicy;
