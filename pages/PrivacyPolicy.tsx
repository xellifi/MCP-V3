import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, ArrowRight, Menu, X, User, Lock, Globe, Shield, CreditCard, ChevronDown } from 'lucide-react';
import Footer from '../components/Footer';

const PrivacyPolicy: React.FC = () => {
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

    const scrollToSection = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
        setIsMobileMenuOpen(false);
    };

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
                            Privacy <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400">Policy</span>
                        </h1>
                        <p className="text-lg text-slate-400">Last updated: {new Date().toLocaleDateString()}</p>
                    </div>

                    <div className="glass-panel p-8 md:p-12 rounded-3xl border border-white/5 space-y-12 text-slate-300 leading-relaxed">

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                                <span className="p-2 rounded-lg bg-violet-500/10 text-violet-400"><Bot size={24} /></span>
                                Introduction
                            </h2>
                            <p className="mb-4">
                                Welcome to <strong>MyChat Pilot</strong>. We value your trust and are committed to protecting your personal information. This Privacy Policy explains how we collect, use, store, share, and protect your data, as well as the choices and rights available to you.
                            </p>
                            <p>
                                This policy applies to all users of the MyChat Pilot platform, including website visitors, customers, account holders, and business partners (collectively referred to as "you" or "users").
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">Who We Are</h2>
                            <p className="mb-4">
                                <strong>MyChat Pilot</strong> is a global Software-as-a-Service (SaaS) platform focused on messaging automation, conversational marketing, and AI-powered customer engagement.
                            </p>
                            <p className="mb-4">
                                Our platform enables businesses to communicate with their audiences across channels such as <strong>WhatsApp, Facebook Messenger, Instagram, Telegram, and website live chat</strong> through automated workflows, AI assistants, broadcasts, and integrated marketing tools.
                            </p>
                            <p>
                                We help organizations generate leads, automate customer interactions, support sales, deliver notifications, and build long-term customer relationships—while maintaining strong standards for privacy, transparency, and responsible data use. Protecting your data is a core part of how MyChat Pilot operates.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">Information We Collect</h2>
                            <p className="mb-6">
                                We collect information necessary to operate our services, improve performance, ensure security, comply with legal obligations, and personalize your experience.
                            </p>

                            <div className="space-y-6">
                                <div className="bg-white/5 p-6 rounded-2xl border border-white/5">
                                    <h3 className="text-xl font-semibold text-white mb-3">A. Information You Provide Directly</h3>
                                    <ul className="list-disc pl-5 space-y-2 marker:text-violet-500">
                                        <li><strong>Account & Registration Information:</strong> Full name, email address, phone number, password, preferred language.</li>
                                        <li><strong>Business & Profile Details:</strong> Business or brand name, industry, company size, website URL, time zone, social media profiles, brand assets (logos).</li>
                                        <li><strong>Billing & Payment Information:</strong> Billing name and address, Tax/VAT details, transaction history. Payment details are processed securely by third-party providers; we do not store card numbers.</li>
                                        <li><strong>Support Communications:</strong> Messages, feedback, inquiries, files, or screenshots sent via support channels.</li>
                                        <li><strong>User-Generated Content:</strong> Chatbot workflows, automation logic, message templates, AI training content, subscriber labels, tags, and notes.</li>
                                        <li><strong>Consent & Preferences:</strong> Communication preferences, cookie consent choices, privacy and notification settings.</li>
                                    </ul>
                                </div>

                                <div className="bg-white/5 p-6 rounded-2xl border border-white/5">
                                    <h3 className="text-xl font-semibold text-white mb-3">B. Information Collected Automatically</h3>
                                    <ul className="list-disc pl-5 space-y-2 marker:text-violet-500">
                                        <li><strong>Device & Technical Data:</strong> IP address, browser type/version, OS, device identifiers, screen resolution.</li>
                                        <li><strong>Usage & Activity Data:</strong> Pages accessed, time spent, interaction logs, error reports, performance metrics.</li>
                                        <li><strong>Location Data:</strong> Approximate location inferred from IP address.</li>
                                        <li><strong>System Logs:</strong> API usage logs, timestamps, request metadata, system diagnostics.</li>
                                    </ul>
                                </div>

                                <div className="bg-white/5 p-6 rounded-2xl border border-white/5">
                                    <h3 className="text-xl font-semibold text-white mb-3">C. Information from Connected Services</h3>
                                    <ul className="list-disc pl-5 space-y-2 marker:text-violet-500">
                                        <li><strong>Messaging & Social Platforms:</strong> Facebook Page IDs, Instagram account data, WhatsApp Business numbers, Telegram bot credentials, access tokens.</li>
                                        <li><strong>E-commerce Platforms:</strong> Store names, order/product info, customer names/emails (for configured automations).</li>
                                        <li><strong>Email, CRM, and Productivity Tools:</strong> Contact lists, tags, event logs, spreadsheet/webhook data (when connected).</li>
                                        <li><strong>Authentication Providers:</strong> OAuth identifiers, basic profile metadata.</li>
                                    </ul>
                                </div>

                                <div className="bg-white/5 p-6 rounded-2xl border border-white/5">
                                    <h3 className="text-xl font-semibold text-white mb-3">D. Cookies & Tracking</h3>
                                    <p className="mb-2">We use cookies, pixels, and similar technologies to understand usage patterns and improve experience.</p>
                                    <h3 className="text-xl font-semibold text-white mb-3 mt-4">E. Aggregated & Anonymous Data</h3>
                                    <p>We may create anonymized datasets for analytics and optimization that do not identify individuals.</p>
                                </div>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">How We Use Your Information</h2>
                            <div className="grid md:grid-cols-2 gap-4">
                                {[
                                    { title: "Service Delivery", desc: "Manage accounts, authenticate users, enable features, process payments, provide support." },
                                    { title: "Personalization", desc: "Customize onboarding, save preferences, improve usability, test features." },
                                    { title: "Communications", desc: "Send service notices, alerts, product updates (opt-in), feedback requests." },
                                    { title: "Analytics", desc: "Monitor system health, understand user behavior, improve marketing." },
                                    { title: "Security & Compliance", desc: "Prevent fraud, enforce terms, comply with laws." },
                                    { title: "AI Development", desc: "Use anonymized data to improve AI. We do NOT use sensitive customer records for generalized AI training." }
                                ].map((item, i) => (
                                    <div key={i} className="bg-white/5 p-4 rounded-xl border border-white/5">
                                        <h3 className="font-bold text-white mb-2">{item.title}</h3>
                                        <p className="text-sm text-slate-400">{item.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                                <span className="p-2 rounded-lg bg-blue-500/10 text-blue-400"><Globe size={24} /></span>
                                GDPR & International Transfers
                            </h2>
                            <p className="mb-4">
                                For EEA, UK, and Swiss users, we process data under lawful bases: Contract Performance, Consent, Legitimate Interests, Legal Obligations, and Vital Interests.
                            </p>
                            <p className="mb-4">
                                <strong>International Transfers:</strong> Data may be processed globally (including US/EU). For EEA/UK users, we rely on Standard Contractual Clauses (SCCs), adequacy decisions, or explicit consent.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">Data Sharing & Security</h2>
                            <p className="mb-4">We <strong>do not sell</strong> personal information. We share data only when necessary with:</p>
                            <ul className="list-disc pl-5 space-y-1 mb-6 marker:text-violet-500">
                                <li>Payment processors (Stripe, Paddle)</li>
                                <li>Email/CRM providers</li>
                                <li>Cloud hosting/analytics</li>
                                <li>Messaging APIs (Meta, WhatsApp, Telegram)</li>
                                <li>Legal authorities when required</li>
                            </ul>

                            <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                                <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400"><Shield size={18} /></span>
                                Security Measures
                            </h3>
                            <p className="mb-4">
                                We use industry-standard measures: Encryption (at rest/transit), Role-based access, 2FA, Security monitoring, and Backups. Payment info is processed by PCI-DSS compliant providers; we never store raw card data.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">Your Rights</h2>
                            <p className="mb-4">Depending on your jurisdiction, you have the right to:</p>
                            <div className="flex flex-wrap gap-2">
                                {['Access Data', 'Correct Inaccuracies', 'Request Deletion', 'Withdraw Consent', 'Object to Processing', 'Data Portability', 'Restrict Processing'].map((right) => (
                                    <span key={right} className="px-3 py-1 bg-white/10 rounded-full text-sm text-slate-300 border border-white/5">{right}</span>
                                ))}
                            </div>
                            <div className="mt-6 pt-6 border-t border-white/10">
                                <h3 className="text-lg font-bold text-white mb-2">California Privacy Rights (CCPA/CPRA)</h3>
                                <p>California residents may request disclosure, deletion, correction, and sensitive data use limitation. We do not sell/share personal data.</p>
                            </div>
                        </section>

                        <section className="bg-violet-900/10 p-6 rounded-2xl border border-violet-500/20">
                            <h2 className="text-2xl font-bold text-white mb-3">Google API Limited Use Disclosure</h2>
                            <p>
                                MyChat Pilot’s use of Google Workspace APIs complies with the <strong>Google API Services User Data Policy</strong>, including Limited Use requirements. Data obtained is used only for visible, user-facing functionality and is not used for generalized AI training.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">Contact & Updates</h2>
                            <p className="mb-4">
                                We may update this policy periodically. Significant changes will be communicated via email or notifications.
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

export default PrivacyPolicy;
