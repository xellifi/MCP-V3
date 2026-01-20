import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, Menu, X, Globe, Shield, Scale, ScrollText, AlertTriangle, FileText, Lock, Users } from 'lucide-react';
import Footer from '../components/Footer';

const TermsOfService: React.FC = () => {
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
                            Terms of <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400">Service</span>
                        </h1>
                        <p className="text-lg text-slate-400">Last updated: {new Date().toLocaleDateString()}</p>
                    </div>

                    <div className="glass-panel p-8 md:p-12 rounded-3xl border border-white/5 space-y-12 text-slate-300 leading-relaxed">

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                                <span className="p-2 rounded-lg bg-violet-500/10 text-violet-400"><Scale size={24} /></span>
                                1. Introduction
                            </h2>
                            <p className="mb-4">
                                Welcome to <strong>MyChat Pilot</strong>. These Terms of Service ("Terms") govern your access to and use of our website, applications, and services (collectively, the "Service").
                            </p>
                            <p>
                                By accessing or using MyChat Pilot, you confirm that you have read, understood, and agree to be legally bound by these Terms, as well as any applicable Data Processing Agreements. If you do not agree, you must not access or use the Service.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">2. About MyChat Pilot</h2>
                            <p className="mb-4">
                                <strong>MyChat Pilot</strong> is a global SaaS platform designed for messaging automation, conversational marketing, and AI-powered customer engagement.
                            </p>
                            <p>
                                We enable businesses to connect with their audiences through platforms such as <strong>WhatsApp, Facebook Messenger, Instagram, Telegram, and website live chat</strong>, using automation workflows, AI tools, and integrated marketing features.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">3. Account Registration & Eligibility</h2>
                            <p className="mb-4">To access most features, you must register an account. By creating an account, you agree to:</p>
                            <ul className="list-disc pl-5 space-y-2 marker:text-violet-500 mb-4">
                                <li>Provide accurate, current, and complete registration information</li>
                                <li>Keep your login credentials secure and confidential</li>
                                <li>Accept responsibility for all activity conducted under your account</li>
                            </ul>
                            <p className="mb-4">
                                You must be <strong>at least 18 years old</strong>, or the legal age in your jurisdiction, to use MyChat Pilot.
                            </p>
                            <p>
                                We reserve the right to suspend, restrict, or terminate accounts at our sole discretion, including for violations of these Terms, misuse of the platform, or suspected fraudulent activity.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">4. Subscriptions, Billing & Payments</h2>
                            <p className="mb-4">MyChat Pilot offers free and paid subscription plans. By purchasing a subscription, you agree to:</p>
                            <ul className="list-disc pl-5 space-y-2 marker:text-violet-500 mb-4">
                                <li>Pay all applicable fees according to the pricing displayed at the time of purchase</li>
                                <li>Authorize us or our payment partners to charge your selected payment method</li>
                                <li>Allow automatic renewals unless canceled before the renewal date</li>
                            </ul>
                            <p>Refunds are granted only in accordance with our <strong>Refund Policy</strong>, which forms part of these Terms.</p>
                        </section>

                        <section className="bg-violet-900/10 p-6 rounded-2xl border border-violet-500/20">
                            <h2 className="text-2xl font-bold text-white mb-3 flex items-center gap-2">
                                <Bot className="w-6 h-6 text-violet-400" />
                                5. AI Features & User Responsibility
                            </h2>
                            <p className="mb-4">
                                MyChat Pilot includes AI-powered capabilities such as message generation, intent recognition, and automation logic. By using these features, you acknowledge and agree that:
                            </p>
                            <ul className="list-disc pl-5 space-y-2 marker:text-violet-400">
                                <li>AI-generated content may be inaccurate, incomplete, outdated, or biased</li>
                                <li>AI outputs must not be relied upon as legal, financial, or medical advice</li>
                                <li>You are solely responsible for reviewing, validating, and approving AI-generated content</li>
                                <li>You will train AI features only with lawful, permitted, and non-sensitive data</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">6. Acceptable Use</h2>
                            <p className="mb-4">You agree not to use MyChat Pilot to:</p>
                            <ul className="list-disc pl-5 space-y-2 marker:text-violet-500 mb-4">
                                <li>Violate any applicable local, national, or international laws</li>
                                <li>Send spam, misleading messages, or unauthorized communications</li>
                                <li>Upload malware, disrupt systems, or exploit platform vulnerabilities</li>
                                <li>Impersonate individuals, brands, or organizations</li>
                                <li>Promote hate speech, violence, harassment, or discrimination</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                                <span className="p-2 rounded-lg bg-red-500/10 text-red-400"><AlertTriangle size={24} /></span>
                                7. Prohibited Illegal Businesses & Activities
                            </h2>
                            <div className="space-y-6">
                                <p>MyChat Pilot may <strong>not</strong> be used for any unlawful business or activity. Prohibited uses include, but are not limited to:</p>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                                        <h3 className="font-bold text-white mb-2">Prohibited Categories</h3>
                                        <ul className="text-sm list-disc pl-4 space-y-1 text-slate-400">
                                            <li>Illegal drugs or substances</li>
                                            <li>Weapons or explosives</li>
                                            <li>Illegal gambling</li>
                                            <li>Pornography or adult content</li>
                                            <li>Fraudulent schemes (Ponzi, Pyramid)</li>
                                            <li>Money laundering</li>
                                        </ul>
                                    </div>
                                    <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                                        <h3 className="font-bold text-white mb-2">Enforcement</h3>
                                        <ul className="text-sm list-disc pl-4 space-y-1 text-slate-400">
                                            <li>Immediate account termination</li>
                                            <li>Reporting to authorities</li>
                                            <li>No refunds for violations</li>
                                            <li>Legal responsibility for damages</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">8. User Content & Data Ownership</h2>
                            <p className="mb-4">
                                You retain ownership of all content you upload or create on MyChat Pilot. By using the Service, you grant MyChat Pilot a <strong>non-exclusive, worldwide, royalty-free license</strong> to store, process, and display your content solely to provide and improve the Service.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">9-11. Privacy, Cookies & IP</h2>
                            <div className="space-y-4">
                                <div>
                                    <h3 className="text-xl font-bold text-white mb-2">9. Privacy & Data Protection</h3>
                                    <p>We handle personal data in accordance with applicable data protection laws and our <strong>Privacy Policy</strong>.</p>
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white mb-2">10. Cookies & Tracking</h3>
                                    <p>We use cookies to support core functionality. Details are in our <strong>Cookie Policy</strong>.</p>
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white mb-2">11. Intellectual Property</h3>
                                    <p>All rights in the platform remain with MyChat Pilot. You are granted a limited, revocable license to use the Service.</p>
                                </div>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">12-14. Third Parties & Liability</h2>
                            <ul className="list-disc pl-5 space-y-4 marker:text-violet-500">
                                <li><strong>Third-Party Platforms:</strong> Integrations with WhatsApp, Meta, etc., are governed by their own terms. We are not responsible for their outages or policies.</li>
                                <li><strong>Limitation of Liability:</strong> MyChat Pilot is not liable for lost profits or data. Total liability is capped at fees paid in the last 3 months.</li>
                                <li><strong>Affiliates:</strong> Participation in affiliate programs is subject to separate policies.</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">15-17. Community & Termination</h2>
                            <ul className="list-disc pl-5 space-y-4 marker:text-violet-500">
                                <li><strong>Community Guidelines:</strong> Users must communicate respectfully. We may remove content or restrict access for violations.</li>
                                <li><strong>Indemnification:</strong> You agree to indemnify MyChat Pilot from claims arising from your use or violations.</li>
                                <li><strong>Termination:</strong> We may terminate access at any time. Your license ends immediately upon termination.</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                                <span className="p-2 rounded-lg bg-blue-500/10 text-blue-400"><Globe size={24} /></span>
                                18. Governing Law & Dispute Resolution
                            </h2>
                            <p className="mb-4">
                                These Terms are governed by the laws of <strong>Philippines</strong>. Disputes will be resolved through informal resolution or binding arbitration under Philippines law. You waive the right to class actions.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">19-20. Changes & Contact</h2>
                            <p className="mb-4">
                                We may update these Terms periodically. Continued use constitutes acceptance. For questions, please contact our support channels.
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

export default TermsOfService;
