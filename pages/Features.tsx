import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Bot, Zap, MessageCircle, BarChart, ArrowRight, Sparkles, Globe, Shield,
    Menu, X, Home as HomeIcon, Layers, Send, Check, Star, ChevronDown,
    Play, Users, Lock, CreditCard, HelpCircle, ShoppingCart, Calendar, Share2
} from 'lucide-react';
import Footer from '../components/Footer';

const Features: React.FC = () => {
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
                <div className="gradient-orb gradient-orb-1 animate-blob opacity-40"></div>
                <div className="gradient-orb gradient-orb-2 animate-blob animation-delay-2000 opacity-40"></div>
                <div className="gradient-orb gradient-orb-3 animate-blob animation-delay-4000 opacity-40"></div>

                {/* Subtle grid pattern */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(139,92,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.03)_1px,transparent_1px)] bg-[size:60px_60px]"></div>
            </div>

            {/* Navigation */}
            <nav className={`fixed w-full z-50 transition-all duration-500 ${isScrolled ? 'py-3' : 'py-5'}`}>
                <div className="max-w-7xl mx-auto px-6">
                    <div className={`flex justify-between items-center px-6 py-3 rounded-2xl transition-all duration-500 ${isScrolled ? 'glass-nav shadow-2xl' : 'bg-transparent'
                        }`}>
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
                            <span className="text-sm font-medium text-white transition-colors">Features</span>
                            <a href="/#pricing" className="text-sm font-medium hover:text-white transition-colors">Pricing</a>
                            <a href="/#testimonials" className="text-sm font-medium hover:text-white transition-colors">Testimonials</a>
                            <a href="/#faq" className="text-sm font-medium hover:text-white transition-colors">FAQ</a>
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
                    <div
                        className="mobile-drawer-overlay"
                        onClick={() => setIsMobileMenuOpen(false)}
                    />
                    <div className="mobile-drawer">
                        <div className="p-6 h-full flex flex-col">
                            <div className="flex justify-between items-center mb-10">
                                <div className="flex items-center gap-3">
                                    <div className="bg-gradient-to-tr from-violet-600 to-fuchsia-500 p-2 rounded-xl">
                                        <Bot className="w-5 h-5 text-white" />
                                    </div>
                                    <span className="text-lg font-bold text-white">MyChat Pilot</span>
                                </div>
                                <button
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <nav className="space-y-2 flex-1">
                                <MobileNavLink onClick={() => setIsMobileMenuOpen(false)} href="#" icon={<Zap className="w-5 h-5" />}>Features</MobileNavLink>
                                <MobileNavLink onClick={() => { setIsMobileMenuOpen(false); navigate('/#pricing'); }} href="/#pricing" icon={<CreditCard className="w-5 h-5" />}>Pricing</MobileNavLink>
                                <MobileNavLink onClick={() => { setIsMobileMenuOpen(false); navigate('/#testimonials'); }} href="/#testimonials" icon={<Star className="w-5 h-5" />}>Testimonials</MobileNavLink>
                                <MobileNavLink onClick={() => { setIsMobileMenuOpen(false); navigate('/#faq'); }} href="/#faq" icon={<HelpCircle className="w-5 h-5" />}>FAQ</MobileNavLink>
                            </nav>

                            <div className="space-y-3 mt-auto mb-20">
                                <button
                                    onClick={() => { navigate('/login'); setIsMobileMenuOpen(false); }}
                                    className="w-full text-center text-lg text-white/80 hover:text-white px-4 py-3 rounded-xl hover:bg-white/5 transition-all border border-white/5"
                                >
                                    Log In
                                </button>
                                <button
                                    onClick={() => { navigate('/register'); setIsMobileMenuOpen(false); }}
                                    className="w-full shimmer-btn bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white px-4 py-3 rounded-xl font-bold text-lg shadow-lg shadow-violet-500/20"
                                >
                                    Get Started Free
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Hero Section */}
            <main className="relative z-10 pt-32 md:pt-40 pb-20 px-6">
                <div className="max-w-7xl mx-auto text-center">
                    <h1 className="text-4xl mobile-hero-text md:text-6xl lg:text-7xl font-extrabold text-white tracking-tight mb-8 animate-fade-in-up delay-100 leading-tight">
                        Automate Conversations. <br className="hidden md:block" />
                        <span className="gradient-text text-glow">Convert More Leads.</span> <br />
                        Sell on Autopilot.
                    </h1>

                    <p className="mobile-subtext text-lg md:text-xl text-slate-400 max-w-3xl mx-auto mb-10 leading-relaxed animate-fade-in-up delay-200">
                        An all-in-one <strong>AI-powered Messenger automation platform</strong> that helps you reply instantly, capture leads, and generate sales—without hiring a team or writing code.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-5 justify-center items-center animate-fade-in-up delay-300 mb-20">
                        <button
                            onClick={() => navigate('/register')}
                            className="group w-full sm:w-auto shimmer-btn px-8 py-4 bg-gradient-to-r from-violet-600 via-fuchsia-600 to-violet-600 bg-[length:200%_100%] rounded-2xl text-white font-bold text-lg shadow-xl shadow-violet-600/25 hover:shadow-violet-600/40 hover:-translate-y-1 transition-all duration-300 touch-feedback animate-pulse-glow"
                        >
                            <span className="flex items-center justify-center gap-2">
                                Start Growing Today
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </span>
                        </button>
                    </div>
                </div>
            </main>

            {/* Smart AI Section */}
            <section className="py-24 px-6 relative">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
                            <span className="gradient-text-static">Smart AI</span> That Talks, Sells, and Follows Up
                        </h2>
                    </div>
                    <div className="grid md:grid-cols-3 gap-8">
                        <FeatureCard
                            icon={<Bot className="w-8 h-8 text-violet-400" />}
                            title="AI-Powered Replies (24/7)"
                            description="Never miss a message again. Our AI automatically replies to every comment and DM, understands intent, and delivers natural, human-like responses—day or night."
                        />
                        <FeatureCard
                            icon={<Layers className="w-8 h-8 text-fuchsia-400" />}
                            title="AI + Visual Workflow Builder"
                            description="Build powerful automations with AI decisions, conditions, and actions using a simple visual builder. Launch advanced flows in minutes—no technical skills required."
                        />
                        <FeatureCard
                            icon={<Sparkles className="w-8 h-8 text-cyan-400" />}
                            title="Ready-Made & AI Templates"
                            description="Start fast with proven templates or let AI handle everything. Customize flows for support, sales, lead generation, and onboarding effortlessly."
                        />
                    </div>
                </div>
            </section>

            {/* Engagement Section */}
            <section className="py-24 px-6 bg-white/[0.02]">
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-col md:flex-row gap-16 items-center">
                        <div className="flex-1">
                            <h2 className="text-3xl md:text-5xl font-bold text-white mb-8">
                                Turn Engagement Into <br />Conversations (Automatically)
                            </h2>
                            <div className="space-y-8">
                                <FeatureRow
                                    title="Auto Comment Replies"
                                    description="Reply instantly to comments on your posts and turn engagement into private conversations—on autopilot."
                                />
                                <FeatureRow
                                    title="Auto Private DM Replies"
                                    description="Trigger private messages the moment users comment, message, or interact with your content. Perfect for promos, support, and lead capture."
                                />
                                <FeatureRow
                                    title="Smart Scheduled Follow-Ups"
                                    description="Automatically re-engage leads with perfectly timed follow-ups. Increase conversions without chasing anyone manually."
                                />
                            </div>
                        </div>
                        <div className="flex-1 relative">
                            <div className="absolute inset-0 bg-gradient-to-tr from-violet-600/20 to-fuchsia-600/20 blur-3xl rounded-full"></div>
                            <div className="glass-panel p-8 rounded-3xl border border-white/10 relative">
                                <div className="flex items-start gap-4 mb-6">
                                    <div className="w-10 h-10 rounded-full bg-slate-700 flex-shrink-0"></div>
                                    <div className="flex-1 space-y-2">
                                        <div className="h-4 w-32 bg-slate-700 rounded"></div>
                                        <div className="h-16 w-full bg-slate-800/50 rounded p-3 text-sm text-slate-400">
                                            Interested in the new collection! Do you ship to Canada?
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4 justify-end">
                                    <div className="flex-1 space-y-2 text-right">
                                        <div className="h-4 w-24 bg-violet-600/20 rounded ml-auto"></div>
                                        <div className="bg-violet-600/20 border border-violet-500/30 rounded-2xl rounded-tr-sm p-4 text-sm text-white text-left">
                                            Hi there! 👋 Yes, we ship worldwide, including Canada! Would you like to see our shipping rates or browse the collection?
                                        </div>
                                    </div>
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center text-white flex-shrink-0">
                                        <Bot className="w-5 h-5" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Lead Capture Section */}
            <section className="py-24 px-6 relative">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">Capture More Leads Without Forms</h2>
                    </div>
                    <div className="grid md:grid-cols-2 gap-12">
                        <div className="p-8 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 border border-white/10 hover:border-violet-500/30 transition-colors">
                            <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400 mb-6">
                                <Users className="w-6 h-6" />
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-4">Built-In Lead Collection</h3>
                            <p className="text-slate-400 leading-relaxed">
                                Collect emails, phone numbers, and custom data directly inside Messenger or DMs. Frictionless for users, powerful for your business.
                            </p>
                        </div>
                        <div className="p-8 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 border border-white/10 hover:border-green-500/30 transition-colors">
                            <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center text-green-400 mb-6">
                                <BarChart className="w-6 h-6" />
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-4">Google Sheets Integration</h3>
                            <p className="text-slate-400 leading-relaxed">
                                Every lead, message, and order syncs instantly to Google Sheets—so your data stays organized and actionable.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Selling Section */}
            <section className="py-24 px-6 bg-white/[0.02]">
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-col md:flex-row-reverse gap-16 items-center">
                        <div className="flex-1">
                            <h2 className="text-3xl md:text-5xl font-bold text-white mb-8">
                                Sell Directly Inside Messenger
                            </h2>
                            <div className="space-y-8">
                                <FeatureRow
                                    title="Built-In Online Store"
                                    description="Create products and sell directly through Messenger conversations. No redirects. No complicated setups. Just smooth, conversational selling."
                                />
                                <FeatureRow
                                    title="Upsell & Downsell Automation"
                                    description="Maximize every sale with automated upsells and downsells triggered by user behavior. More revenue—without extra ad spend."
                                />
                            </div>
                        </div>
                        <div className="flex-1">
                            <div className="glass-panel p-6 rounded-3xl border border-white/10">
                                <div className="flex gap-4 mb-6 overflow-x-auto pb-4 custom-scrollbar">
                                    {[1, 2, 3].map((i) => (
                                        <div key={i} className="min-w-[160px] bg-slate-800/50 rounded-xl overflow-hidden border border-white/5">
                                            <div className="h-24 bg-slate-700/50"></div>
                                            <div className="p-3">
                                                <div className="h-3 w-3/4 bg-slate-600 rounded mb-2"></div>
                                                <div className="h-3 w-1/2 bg-slate-600 rounded mb-3"></div>
                                                <div className="flex justify-between items-center">
                                                    <div className="h-4 w-10 bg-violet-500/20 text-violet-400 text-xs rounded flex items-center justify-center">$29</div>
                                                    <div className="h-6 w-16 bg-white/10 rounded-lg text-xs flex items-center justify-center cursor-pointer hover:bg-white/20">Buy Now</div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex justify-between items-center p-4 bg-violet-600/10 rounded-2xl border border-violet-500/20">
                                    <div>
                                        <div className="text-sm text-slate-400">Total Revenue</div>
                                        <div className="text-2xl font-bold text-white">$12,450.00</div>
                                    </div>
                                    <ShoppingCart className="w-8 h-8 text-violet-400" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Other Features Grid */}
            <section className="py-24 px-6">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">More Powerful Features</h2>
                    </div>
                    <div className="grid md:grid-cols-3 gap-8">
                        <FeatureCardSmall
                            icon={<MessageCircle className="w-6 h-6 text-pink-400" />}
                            title="Targeted Messenger Campaigns"
                            description="Send promotions, announcements, and updates directly to users who engaged with your brand. Segment your audience and deliver messages that get opened."
                        />
                        <FeatureCardSmall
                            icon={<Share2 className="w-6 h-6 text-orange-400" />}
                            title="Automated Affiliate Program"
                            description="Turn users into promoters with a built-in affiliate system. Offer 10% commission per successful paid referral and track everything automatically."
                        />
                        <FeatureCardSmall
                            icon={<Calendar className="w-6 h-6 text-blue-400" />}
                            title="Scheduled Auto Posting"
                            description="Plan and schedule posts in advance while your AI handles comments and messages in real time. Stay visible, engaged, and responsive—without being online."
                        />
                    </div>
                </div>
            </section>

            {/* Summary Section */}
            <section className="py-24 px-6 bg-gradient-to-b from-slate-900 to-slate-950 border-y border-white/5">
                <div className="max-w-4xl mx-auto text-center">
                    <h2 className="text-3xl md:text-4xl font-bold text-white mb-12">Built for Scale, Designed for Simplicity</h2>
                    <div className="bg-white/5 rounded-3xl p-8 md:p-12 border border-white/10">
                        <p className="text-xl text-slate-300 mb-8">Whether you’re a creator, agency, or business owner, this platform helps you:</p>
                        <div className="grid sm:grid-cols-2 gap-6 text-left max-w-2xl mx-auto">
                            <CheckListItem text="Reply instantly" />
                            <CheckListItem text="Capture more leads" />
                            <CheckListItem text="Convert conversations into sales" />
                            <CheckListItem text="Scale without hiring" />
                        </div>
                    </div>
                </div>
            </section>

            {/* Final CTA */}
            <section className="py-32 px-6 relative overflow-hidden">
                <div className="absolute inset-0 bg-violet-600/10 blur-3xl rounded-full transform scale-150 pointer-events-none"></div>
                <div className="max-w-5xl mx-auto text-center relative z-10">
                    <h2 className="text-4xl md:text-7xl font-bold text-white mb-8 tracking-tight">
                        One Platform. <br />
                        <span className="gradient-text">Endless Automations.</span>
                    </h2>
                    <p className="text-xl text-slate-400 mb-12 max-w-2xl mx-auto">
                        Let AI handle your conversations—so you can focus on growing your business.
                    </p>
                    <button
                        onClick={() => navigate('/register')}
                        className="bg-white text-violet-950 px-12 py-5 rounded-2xl font-bold text-xl shadow-2xl hover:scale-105 hover:shadow-white/20 transition-all duration-300"
                    >
                        Start Your Automation Journey
                    </button>
                </div>
            </section>

            {/* Footer (Simplified) */}
            <Footer />
        </div>
    );
};

// --- Sub Components ---

const MobileNavLink: React.FC<{ children: React.ReactNode, href: string, icon: React.ReactNode, onClick: () => void }> = ({ children, href, icon, onClick }) => (
    <a
        href={href}
        onClick={onClick}
        className="flex items-center gap-4 text-slate-300 hover:text-white px-4 py-4 rounded-xl hover:bg-white/5 transition-all touch-feedback border-b border-white/5 last:border-0"
    >
        <div className="text-violet-400">{icon}</div>
        <span className="font-medium text-lg">{children}</span>
        <ArrowRight className="w-5 h-5 ml-auto text-slate-600" />
    </a>
);

const FeatureCard: React.FC<{ icon: React.ReactNode, title: string, description: string }> = ({ icon, title, description }) => (
    <div className="glass-card p-8 rounded-3xl border border-white/5 hover:border-violet-500/20 transition-all duration-300 hover:-translate-y-1">
        <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center mb-6 border border-white/10">
            {icon}
        </div>
        <h3 className="text-xl font-bold text-white mb-4">{title}</h3>
        <p className="text-slate-400 leading-relaxed">{description}</p>
    </div>
);

const FeatureRow: React.FC<{ title: string, description: string }> = ({ title, description }) => (
    <div className="flex gap-4">
        <div className="w-1 h-auto bg-gradient-to-b from-violet-600 to-transparent rounded-full flex-shrink-0"></div>
        <div>
            <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
            <p className="text-slate-400">{description}</p>
        </div>
    </div>
);

const FeatureCardSmall: React.FC<{ icon: React.ReactNode, title: string, description: string }> = ({ icon, title, description }) => (
    <div className="bg-white/[0.03] p-8 rounded-3xl border border-white/5">
        <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-white/5 rounded-xl">{icon}</div>
            <h3 className="text-lg font-bold text-white">{title}</h3>
        </div>
        <p className="text-sm text-slate-400 leading-relaxed">{description}</p>
    </div>
);

const CheckListItem: React.FC<{ text: string }> = ({ text }) => (
    <div className="flex items-center gap-3">
        <div className="w-6 h-6 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-400 flex-shrink-0">
            <Check className="w-4 h-4" />
        </div>
        <span className="text-lg text-slate-200">{text}</span>
    </div>
);

export default Features;
