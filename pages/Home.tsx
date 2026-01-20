import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bot, Zap, MessageCircle, BarChart, ArrowRight, Sparkles, Globe, Shield,
  Menu, X, Home as HomeIcon, Layers, Send, Check, Star, ChevronDown,
  Play, Users, Lock, CreditCard, HelpCircle, Loader2, XCircle
} from 'lucide-react';
import Footer from '../components/Footer';
import { api } from '../services/api';
import { Package } from '../types';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [pricingPeriod, setPricingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [activeFaqIndex, setActiveFaqIndex] = useState<number | null>(null);
  const [packages, setPackages] = useState<Package[]>([]);
  const [loadingPackages, setLoadingPackages] = useState(true);

  // Fetch packages from database
  useEffect(() => {
    const fetchPackages = async () => {
      try {
        const data = await api.admin.getPackages();
        // Filter only visible packages and sort by displayOrder
        const visiblePackages = data
          .filter(pkg => pkg.isVisible === true)
          .sort((a, b) => (a.displayOrder ?? 99) - (b.displayOrder ?? 99));
        setPackages(visiblePackages);
      } catch (error) {
        console.error('Failed to fetch packages:', error);
      } finally {
        setLoadingPackages(false);
      }
    };
    fetchPackages();
  }, []);

  // Helper function to get descriptions for packages
  const getPackageDescription = (id: string, name: string): string => {
    const lowerName = name.toLowerCase();
    if (id === 'free' || lowerName.includes('free') || lowerName.includes('starter')) {
      return 'Perfect for individuals and small tests.';
    } else if (id === 'pro' || lowerName.includes('pro')) {
      return 'For growing businesses needing power.';
    } else if (lowerName.includes('enterprise') || lowerName.includes('business')) {
      return 'Ultimate scale and custom solutions.';
    }
    return 'Unlock your business potential.';
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleFaq = (index: number) => {
    setActiveFaqIndex(activeFaqIndex === index ? null : index);
  };

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
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
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
              <button onClick={() => navigate('/features')} className="text-sm font-medium hover:text-white transition-colors bg-transparent border-0 cursor-pointer">Features</button>
              <a href="#pricing" className="text-sm font-medium hover:text-white transition-colors">Pricing</a>
              <a href="#testimonials" className="text-sm font-medium hover:text-white transition-colors">Testimonials</a>
              <a href="#faq" className="text-sm font-medium hover:text-white transition-colors">FAQ</a>
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
                <MobileNavLink onClick={() => { setIsMobileMenuOpen(false); navigate('/features'); }} href="#" icon={<Zap className="w-5 h-5" />}>Features</MobileNavLink>
                <MobileNavLink onClick={() => setIsMobileMenuOpen(false)} href="#pricing" icon={<CreditCard className="w-5 h-5" />}>Pricing</MobileNavLink>
                <MobileNavLink onClick={() => setIsMobileMenuOpen(false)} href="#testimonials" icon={<Star className="w-5 h-5" />}>Testimonials</MobileNavLink>
                <MobileNavLink onClick={() => setIsMobileMenuOpen(false)} href="#faq" icon={<HelpCircle className="w-5 h-5" />}>FAQ</MobileNavLink>
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
      <main className="relative z-10 pt-32 md:pt-48 pb-20 px-6">
        <div className="max-w-7xl mx-auto text-center">
          {/* Badge */}
          <div className="flex justify-center mb-8 animate-fade-in-up">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-sm font-medium hover:bg-violet-500/20 transition-colors cursor-default">
              <Sparkles className="w-4 h-4 text-violet-400" />
              <span>Next-Gen Automations for 2026</span>
            </div>
          </div>

          {/* Hero Text */}
          <h1 className="text-4xl mobile-hero-text md:text-6xl lg:text-7xl font-extrabold text-white tracking-tight mb-8 animate-fade-in-up delay-100 leading-tight">
            Automate your <br className="hidden md:block" />
            <span className="gradient-text text-glow">Social Presence</span>
          </h1>

          <p className="mobile-subtext text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-in-up delay-200">
            Boost engagement on Facebook and Instagram with our visual flow builder,
            intelligent auto-replies, and AI-driven scheduling. No coding required.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-5 justify-center items-center animate-fade-in-up delay-300 mb-20">
            <button
              onClick={() => navigate('/register')}
              className="group w-full sm:w-auto shimmer-btn px-8 py-4 bg-gradient-to-r from-violet-600 via-fuchsia-600 to-violet-600 bg-[length:200%_100%] rounded-2xl text-white font-bold text-lg shadow-xl shadow-violet-600/25 hover:shadow-violet-600/40 hover:-translate-y-1 transition-all duration-300 touch-feedback animate-pulse-glow"
            >
              <span className="flex items-center justify-center gap-2">
                Start 14-Day Free Trial
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </span>
            </button>
            <button
              onClick={() => navigate('/login')}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl text-white font-medium glass-card text-lg flex items-center justify-center gap-2 hover:-translate-y-1 transition-all duration-300 touch-feedback hover:bg-white/10"
            >
              <Play className="w-5 h-5 text-white/70 fill-white/20" />
              Watch Demo
            </button>
          </div>

          {/* Dashboard Preview */}
          <div className="relative animate-fade-in-up delay-500 mx-auto max-w-5xl">
            {/* Glow behind card */}
            <div className="absolute -inset-10 bg-gradient-to-r from-violet-600/30 via-fuchsia-600/30 to-violet-600/30 rounded-[3rem] blur-3xl opacity-50"></div>

            <div className="relative glass-panel rounded-2xl md:rounded-3xl overflow-hidden border border-white/10 hover-tilt shadow-2xl">
              <div className="bg-slate-900/40 backdrop-blur-sm border-b border-white/5 px-4 py-3 flex items-center gap-2">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                  <div className="w-3 h-3 rounded-full bg-amber-500/80"></div>
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80"></div>
                </div>
                <div className="ml-4 px-3 py-1 bg-black/20 rounded-lg text-xs font-mono text-slate-500 flex-1 text-center max-w-sm mx-auto">
                  app.mychatpilot.com/dashboard
                </div>
              </div>
              {/* Image Placeholder for Dashboard Screenshot - Using a gradient placeholder for now */}
              <div className="aspect-[16/9] bg-slate-900/80 relative group overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/20 to-purple-900/20 opacity-50"></div>

                {/* Dashboard UI Simulation */}
                <div className="absolute inset-0 p-8 grid grid-cols-4 gap-6 pointer-events-none">
                  <div className="col-span-1 bg-white/5 rounded-xl border border-white/5 h-full space-y-4 p-4 hidden md:block">
                    <div className="h-8 w-3/4 bg-white/10 rounded-lg"></div>
                    <div className="space-y-2">
                      <div className="h-4 w-full bg-white/5 rounded"></div>
                      <div className="h-4 w-5/6 bg-white/5 rounded"></div>
                      <div className="h-4 w-4/6 bg-white/5 rounded"></div>
                    </div>
                  </div>
                  <div className="col-span-4 md:col-span-3 space-y-6">
                    <div className="flex gap-4">
                      <div className="h-32 flex-1 bg-gradient-to-br from-violet-500/20 to-purple-500/10 rounded-xl border border-white/10 p-4">
                        <div className="h-6 w-8 bg-violet-500/40 rounded mb-2"></div>
                        <div className="h-4 w-24 bg-white/10 rounded"></div>
                        <div className="h-8 w-16 bg-white/20 rounded mt-2"></div>
                      </div>
                      <div className="h-32 flex-1 bg-white/5 rounded-xl border border-white/10 p-4"></div>
                      <div className="h-32 flex-1 bg-white/5 rounded-xl border border-white/10 p-4"></div>
                    </div>
                    <div className="h-64 bg-white/5 rounded-xl border border-white/10 w-full p-4 relative overflow-hidden">
                      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-violet-500/10 to-transparent"></div>
                      {/* Fake chart lines */}
                      <svg className="w-full h-full text-violet-500/50 overflow-visible" preserveAspectRatio="none">
                        <path d="M0,150 Q150,50 300,100 T600,80 T900,120" fill="none" stroke="currentColor" strokeWidth="3" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Play Button Overlay */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                  <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-2xl scale-0 group-hover:scale-100 transition-transform duration-500 delay-100">
                    <Play className="w-6 h-6 text-white ml-1 fill-white" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Trusted By Section */}
      <section className="py-10 border-y border-white/5 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-sm font-medium text-slate-500 uppercase tracking-widest mb-8">Trusted by 1,000+ businesses worldwide</p>
          <div className="flex flex-wrap justify-center gap-12 md:gap-20 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
            {/* Simple Text Logos for Demo Purposes */}
            <div className="text-xl font-bold flex items-center gap-2"><Globe className="w-6 h-6" /> GlobalCorp</div>
            <div className="text-xl font-bold flex items-center gap-2"><Zap className="w-6 h-6" /> FastScale</div>
            <div className="text-xl font-bold flex items-center gap-2"><Shield className="w-6 h-6" /> SecureNet</div>
            <div className="text-xl font-bold flex items-center gap-2"><Layers className="w-6 h-6" /> StackBuild</div>
            <div className="text-xl font-bold flex items-center gap-2"><Bot className="w-6 h-6" /> AI Systems</div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative z-10 py-24 md:py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-24">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
              Everything you need to <span className="gradient-text-static">scale</span>
            </h2>
            <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto">
              Powerful tools designed to supercharge your social media growth.
            </p>
          </div>

          <div className="space-y-24 md:space-y-32">
            {/* Feature Block 1 */}
            <FeatureBlock
              icon={<Zap className="w-6 h-6 text-violet-400" />}
              title="Visual Flow Builder"
              description="Build complex chat automations with our intuitive drag-and-drop editor. No coding skills needed."
              items={["Drag & drop interface", "Conditional logic branch", "Delay & typing indicators", "Rich media support"]}
              imageSide="right"
              gradient="from-violet-600 to-fuchsia-600"
            />
            {/* Feature Block 2 */}
            <FeatureBlock
              icon={<MessageCircle className="w-6 h-6 text-pink-400" />}
              title="Omnichannel Inbox"
              description="Manage all your customer conversations from Facebook and Instagram in one unified dashboard."
              items={["Unified message stream", "Team collaboration tools", "Saved replies & macros", "Customer tagging & notes"]}
              imageSide="left"
              gradient="from-pink-600 to-rose-600"
            />
            {/* Feature Block 3 */}
            <FeatureBlock
              icon={<Bot className="w-6 h-6 text-cyan-400" />}
              title="AI-Powered Assistants"
              description="Deploy smart AI agents that learn from your business data to answer customer queries automatically 24/7."
              items={["OpenAI & Gemini integration", "Knowledge base training", "Sentiment analysis", "Seamless human handoff"]}
              imageSide="right"
              gradient="from-cyan-600 to-blue-600"
            />
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-violet-900/5 -skew-y-3 transform origin-top-left scale-110 pointer-events-none"></div>
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">Simple, transparent pricing</h2>
            <p className="text-slate-400 text-lg max-w-xl mx-auto mb-10">Choose the plan that's right for your business growth.</p>

            {/* Toggle */}
            <div className="flex items-center justify-center gap-4">
              <span className={`text-sm font-medium ${pricingPeriod === 'monthly' ? 'text-white' : 'text-slate-500'}`}>Monthly</span>
              <button
                onClick={() => setPricingPeriod(pricingPeriod === 'monthly' ? 'yearly' : 'monthly')}
                className="w-14 h-8 bg-white/10 rounded-full p-1 relative transition-colors hover:bg-white/20"
              >
                <div className={`w-6 h-6 bg-violet-500 rounded-full shadow-lg transition-transform duration-300 ${pricingPeriod === 'yearly' ? 'translate-x-6' : ''}`}></div>
              </button>
              <span className={`text-sm font-medium ${pricingPeriod === 'yearly' ? 'text-white' : 'text-slate-500'}`}>Yearly <span className="text-violet-400 text-xs ml-1 font-bold">-20%</span></span>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8 items-center">
            {loadingPackages ? (
              <div className="col-span-3 flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
              </div>
            ) : packages.length > 0 ? (
              packages.map((pkg, index) => {
                // Detect if this is a lifetime-only package (no monthly/yearly price, but has lifetime price)
                const isLifetimeOnly = (!pkg.priceMonthly || pkg.priceMonthly === 0) &&
                  (!pkg.priceYearly || pkg.priceYearly === 0) &&
                  (pkg.priceLifetime && pkg.priceLifetime > 0);

                // Calculate the display price
                let displayPrice: string;
                let billingType: 'monthly' | 'yearly' | 'lifetime' = pricingPeriod;

                if (isLifetimeOnly) {
                  displayPrice = String(pkg.priceLifetime || 0);
                  billingType = 'lifetime';
                } else if (pricingPeriod === 'monthly') {
                  displayPrice = String(pkg.priceMonthly || 0);
                } else {
                  displayPrice = String(pkg.priceYearly || Math.round((pkg.priceMonthly || 0) * 0.8));
                }

                // Determine CTA text
                const ctaText = isLifetimeOnly
                  ? "Get Lifetime Access"
                  : (pkg.priceMonthly === 0 ? "Start for Free" : "Get Started");

                return (
                  <PricingCard
                    key={pkg.id}
                    name={pkg.name}
                    price={displayPrice}
                    billingType={billingType}
                    description={getPackageDescription(pkg.id, pkg.name)}
                    features={pkg.features || []}
                    cta={ctaText}
                    active={index === 1}
                    popular={index === 1}
                    onClick={() => navigate('/register')}
                  />
                );
              })
            ) : (
              // Fallback to hardcoded if no packages in database
              <>
                <PricingCard
                  name="Starter"
                  price={pricingPeriod === 'monthly' ? "0" : "0"}
                  description="Perfect for individuals and small tests."
                  features={["1,000 Messages/mo", "1 Facebook Page", "Basic Automation", "Community Support"]}
                  cta="Start for Free"
                  active={false}
                  onClick={() => navigate('/register')}
                />
                <PricingCard
                  name="Pro"
                  price={pricingPeriod === 'monthly' ? "29" : "24"}
                  description="For growing businesses needing power."
                  features={["10,000 Messages/mo", "5 Facebook Pages", "Advanced Flow Builder", "AI Assistant (GPT-4)", "Priority Support", "Remove Branding"]}
                  cta="Get Started"
                  active={true}
                  popular={true}
                  onClick={() => navigate('/register')}
                />
                <PricingCard
                  name="Enterprise"
                  price={pricingPeriod === 'monthly' ? "99" : "79"}
                  description="Ultimate scale and custom solutions."
                  features={["Unlimited Messages", "Unlimited Pages", "Custom AI Training", "Dedicated Success Manager", "API Access", "SLA Guarantee"]}
                  cta="Get Started"
                  active={false}
                  onClick={() => navigate('/register')}
                />
              </>
            )}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-24 px-6 bg-gradient-to-b from-transparent to-black/20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">Loved by businesses</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <TestimonialCard
              quote="MyChat Pilot transformed how we handle customer support. Our response time dropped by 80%!"
              author="Sarah Jenkins"
              role="Marketing Director, TechFlow"
              rating={5}
            />
            <TestimonialCard
              quote="The visual builder is incredible. I built a complex sales funnel in minutes without writing a single line of code."
              author="Michael Chen"
              role="Founder, StartupIO"
              rating={5}
            />
            <TestimonialCard
              quote="ROI was immediate. The AI auto-replies are so natural, customers don't even realize they're talking to a bot."
              author="Emma Watson"
              role="CEO, E-com Elite"
              rating={5}
            />
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">Frequently Asked Questions</h2>
          </div>
          <div className="space-y-4">
            <FaqItem
              question="Can I use MyChat Pilot for free?"
              answer="Yes! We offer a generous free tier that includes 1,000 messages per month and basic automation features so you can test the platform thoroughly."
              isOpen={activeFaqIndex === 0}
              onClick={() => toggleFaq(0)}
            />
            <FaqItem
              question="Do I need coding skills?"
              answer="Not at all. Our Visual Flow Builder is designed for non-technical users. You can create complex conversational flows simply by dragging and dropping elements."
              isOpen={activeFaqIndex === 1}
              onClick={() => toggleFaq(1)}
            />
            <FaqItem
              question="Is my data secure?"
              answer="Absolutely. We use bank-grade encryption for all data in transit and at rest. We are fully GDPR compliant and never sell your customer data."
              isOpen={activeFaqIndex === 2}
              onClick={() => toggleFaq(2)}
            />
            <FaqItem
              question="Can I upgrade or downgrade anytime?"
              answer="Yes, there are no long-term contracts. You can upgrade, downgrade, or cancel your plan at any time directly from your dashboard."
              isOpen={activeFaqIndex === 3}
              onClick={() => toggleFaq(3)}
            />
          </div>
        </div>
      </section>

      {/* CTA Footer Section */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="relative rounded-3xl overflow-hidden p-12 text-center">
            <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-fuchsia-600 opacity-90"></div>
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
            <div className="relative z-10">
              <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">Ready to automate your growth?</h2>
              <p className="text-xl text-white/90 mb-10 max-w-2xl mx-auto">Join 10,000+ marketers and business owners who are saving time and boosting sales with MyChat Pilot.</p>
              <button
                onClick={() => navigate('/register')}
                className="bg-white text-violet-600 px-10 py-4 rounded-xl font-bold text-lg shadow-2xl hover:bg-slate-50 hover:scale-105 transition-all duration-300"
              >
                Get Started for Free
              </button>
              <p className="mt-6 text-white/60 text-sm">No credit card required · 14-day free trial · Cancel anytime</p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Footer */}
      <Footer />

      {/* Mobile Bottom Navigation Spacer & Bar */}
      <div className="md:hidden h-20"></div>
      <div className="md:hidden mobile-bottom-nav">
        <div className="flex justify-around items-center">
          <button className="mobile-nav-item active" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <HomeIcon className="w-6 h-6" />
            <span className="text-xs mt-1">Home</span>
          </button>
          <button className="mobile-nav-item" onClick={() => navigate('/login')}>
            <Layers className="w-6 h-6" />
            <span className="text-xs mt-1">Features</span>
          </button>
          <button onClick={() => navigate('/register')} className="relative -top-4">
            <div className="bg-gradient-to-tr from-violet-600 to-fuchsia-600 p-4 rounded-2xl shadow-lg shadow-violet-600/30 touch-feedback">
              <Send className="w-6 h-6 text-white" />
            </div>
          </button>
          <button className="mobile-nav-item" onClick={() => navigate('/login')}>
            <Users className="w-6 h-6" />
            <span className="text-xs mt-1">Login</span>
          </button>
          <button className="mobile-nav-item" onClick={() => navigate('/login')}>
            <Menu className="w-6 h-6" />
            <span className="text-xs mt-1">Menu</span>
          </button>
        </div>
      </div>
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

const FeatureBlock: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
  items: string[];
  imageSide: 'left' | 'right';
  gradient: string;
}> = ({ icon, title, description, items, imageSide, gradient }) => {
  return (
    <div className="flex flex-col md:flex-row gap-12 lg:gap-20 items-center">
      <div className={`flex-1 ${imageSide === 'right' ? 'md:order-1' : 'md:order-2'}`}>
        <div className="bg-white/5 rounded-2xl w-12 h-12 flex items-center justify-center mb-6 border border-white/10 shadow-inner">
          {icon}
        </div>
        <h3 className="text-3xl font-bold text-white mb-4 leading-tight">{title}</h3>
        <p className="text-slate-400 text-lg mb-8 leading-relaxed max-w-lg">{description}</p>
        <ul className="space-y-4">
          {items.map((item, i) => (
            <li key={i} className="flex items-center gap-3 text-slate-300">
              <div className="w-5 h-5 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-400">
                <Check className="w-3 h-3" />
              </div>
              {item}
            </li>
          ))}
        </ul>
      </div>
      <div className={`flex-1 ${imageSide === 'right' ? 'md:order-2' : 'md:order-1'}`}>
        {/* Abstract Product Visualization */}
        <div className={`bg-gradient-to-br ${gradient} p-1 rounded-3xl opacity-90 transform hover:scale-[1.02] transition-transform duration-500 shadow-2xl`}>
          <div className="bg-slate-900 rounded-[1.4rem] overflow-hidden aspect-[4/3] relative">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
            {/* Fake UI Elements */}
            <div className="absolute top-0 left-0 right-0 h-10 bg-black/20 border-b border-white/5 flex items-center px-4 gap-2">
              <div className="w-2 h-2 rounded-full bg-slate-600"></div>
              <div className="w-2 h-2 rounded-full bg-slate-600"></div>
              <div className="w-2 h-2 rounded-full bg-slate-600"></div>
            </div>
            <div className="absolute inset-0 pt-10 flex items-center justify-center">
              <div className="text-center p-8">
                <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 mx-auto flex items-center justify-center mb-4 shadow-lg backdrop-blur-sm">
                  {icon}
                </div>
                <p className="text-sm font-mono text-white/40">Visual Interface Preview</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const PricingCard: React.FC<{
  name: string;
  price: string;
  billingType?: 'monthly' | 'yearly' | 'lifetime';
  description: string;
  features: string[];
  cta: string;
  active: boolean;
  popular?: boolean;
  onClick?: () => void;
}> = ({ name, price, billingType = 'monthly', description, features, cta, active, popular, onClick }) => {
  // Determine billing label based on type
  const billingLabel = billingType === 'lifetime' ? 'one-time' : (billingType === 'yearly' ? '/year' : '/month');

  return (
    <div className={`relative rounded-3xl p-8 border hover:-translate-y-2 transition-transform duration-300 ${active
      ? 'bg-white/5 border-violet-500/30 ring-1 ring-violet-500/30'
      : 'bg-white/[0.02] border-white/5 hover:border-white/10'
      }`}>
      {popular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wide shadow-lg">
          Most Popular
        </div>
      )}

      <div className="mb-8">
        <h3 className="text-lg font-semibold text-white mb-2">{name}</h3>
        <div className="flex items-baseline gap-1 mb-2">
          <span className="text-4xl font-bold text-white">${price}</span>
          <span className="text-slate-500">{billingLabel}</span>
        </div>
        <p className="text-sm text-slate-400">{description}</p>
      </div>

      <ul className="space-y-4 mb-8">
        {features.map((feature, i) => {
          const isInactive = feature.startsWith('-');
          const displayText = isInactive ? feature.slice(1) : feature;
          return (
            <li key={i} className={`flex items-center gap-3 text-sm ${isInactive ? 'text-slate-500' : 'text-slate-300'}`}>
              {isInactive ? (
                <XCircle className="w-5 h-5 text-slate-600" />
              ) : (
                <Check className={`w-5 h-5 ${active ? 'text-violet-400' : 'text-slate-600'}`} />
              )}
              <span className={isInactive ? 'line-through' : ''}>{displayText}</span>
            </li>
          );
        })}
      </ul>

      <button
        onClick={onClick}
        className={`w-full py-3 rounded-xl font-bold transition-all ${active
          ? 'bg-violet-600 hover:bg-violet-700 text-white shadow-lg shadow-violet-600/25'
          : 'bg-white/10 hover:bg-white/20 text-white'
          }`}
      >
        {cta}
      </button>
    </div>
  );
};

const TestimonialCard: React.FC<{
  quote: string;
  author: string;
  role: string;
  rating: number;
}> = ({ quote, author, role, rating }) => {
  return (
    <div className="bg-white/[0.03] border border-white/5 p-8 rounded-3xl hover:bg-white/[0.05] transition-colors">
      <div className="flex gap-1 mb-4 text-amber-400">
        {[...Array(rating)].map((_, i) => <Star key={i} className="w-4 h-4 fill-current" />)}
      </div>
      <p className="text-lg text-slate-300 italic mb-6">"{quote}"</p>
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center font-bold text-white text-sm">
          {author.charAt(0)}
        </div>
        <div>
          <div className="text-white font-medium">{author}</div>
          <div className="text-xs text-slate-500">{role}</div>
        </div>
      </div>
    </div>
  );
};

const FaqItem: React.FC<{
  question: string;
  answer: string;
  isOpen: boolean;
  onClick: () => void;
}> = ({ question, answer, isOpen, onClick }) => {
  return (
    <div className="border border-white/5 rounded-2xl overflow-hidden bg-white/[0.02]">
      <button
        onClick={onClick}
        className="w-full text-left px-6 py-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
      >
        <span className="font-semibold text-white">{question}</span>
        <ChevronDown className={`w-5 h-5 text-slate-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <div className={`px-6 overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-40 pb-6 opacity-100' : 'max-h-0 opacity-0'}`}>
        <p className="text-slate-400 text-sm leading-relaxed">{answer}</p>
      </div>
    </div>
  );
};

export default Home;