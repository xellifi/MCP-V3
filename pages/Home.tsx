import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, Zap, MessageCircle, BarChart, ArrowRight, Sparkles, Globe, Shield, Menu, X, Home as HomeIcon, Layers, Send } from 'lucide-react';

const Home: React.FC = () => {
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
    <div className="min-h-screen bg-slate-950 font-sans selection:bg-violet-500/30 overflow-x-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="gradient-orb gradient-orb-1 animate-blob"></div>
        <div className="gradient-orb gradient-orb-2 animate-blob animation-delay-2000"></div>
        <div className="gradient-orb gradient-orb-3 animate-blob animation-delay-4000"></div>
        
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(139,92,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.03)_1px,transparent_1px)] bg-[size:60px_60px]"></div>
      </div>

      {/* Navigation */}
      <nav className={`fixed w-full z-50 transition-all duration-500 ${isScrolled ? 'py-3' : 'py-5'}`}>
        <div className="max-w-7xl mx-auto px-6">
          <div className={`flex justify-between items-center px-6 py-3 rounded-2xl transition-all duration-500 ${
            isScrolled ? 'glass-nav shadow-2xl' : 'bg-transparent'
          }`}>
            {/* Logo */}
            <div className="flex items-center gap-3">
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
            <div className="hidden md:flex items-center gap-2">
              <button
                onClick={() => navigate('/login')}
                className="text-slate-300 font-medium hover:text-white transition-colors px-5 py-2.5 rounded-xl hover:bg-white/5"
              >
                Log in
              </button>
              <button
                onClick={() => navigate('/register')}
                className="shimmer-btn bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:shadow-lg hover:shadow-violet-500/25 transition-all duration-300 active:scale-95"
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
            <div className="p-6">
              <div className="flex justify-between items-center mb-10">
                <div className="flex items-center gap-3">
                  <div className="bg-gradient-to-tr from-violet-600 to-fuchsia-500 p-2 rounded-xl">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-lg font-bold text-white">MychatPilot</span>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <nav className="space-y-2">
                <button
                  onClick={() => { navigate('/login'); setIsMobileMenuOpen(false); }}
                  className="w-full text-left text-lg text-slate-300 hover:text-white px-4 py-4 rounded-xl hover:bg-white/5 transition-all touch-feedback"
                >
                  Log in
                </button>
                <button
                  onClick={() => { navigate('/register'); setIsMobileMenuOpen(false); }}
                  className="w-full shimmer-btn bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white px-4 py-4 rounded-xl font-semibold text-lg touch-feedback"
                >
                  Get Started Free
                </button>
              </nav>
            </div>
          </div>
        </>
      )}

      {/* Hero Section */}
      <main className="relative z-10 pt-32 md:pt-40 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Badge */}
          <div className="flex justify-center mb-8 animate-fade-in-up">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-sm font-medium">
              <Sparkles className="w-4 h-4" />
              <span>New: AI-Powered Automation Engine</span>
            </div>
          </div>

          {/* Hero Text */}
          <div className="text-center">
            <h1 className="text-4xl mobile-hero-text md:text-6xl lg:text-7xl font-extrabold text-white tracking-tight mb-6 animate-fade-in-up delay-100">
              Automate your<br />
              <span className="gradient-text text-glow">Social Presence</span>
            </h1>

            <p className="mobile-subtext text-lg md:text-xl lg:text-2xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-in-up delay-200">
              Boost engagement on Facebook and Instagram with our visual flow builder, intelligent auto-replies, and AI-driven scheduling.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-fade-in-up delay-300">
              <button
                onClick={() => navigate('/register')}
                className="group w-full sm:w-auto shimmer-btn px-8 py-4 bg-gradient-to-r from-violet-600 via-fuchsia-600 to-violet-600 bg-[length:200%_100%] rounded-2xl text-white font-bold text-lg shadow-xl shadow-violet-600/25 hover:shadow-violet-600/40 hover:-translate-y-1 transition-all duration-300 touch-feedback animate-pulse-glow"
              >
                <span className="flex items-center justify-center gap-2">
                  Start Free Trial
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
              </button>
              <button
                onClick={() => navigate('/login')}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl text-white font-medium glass-card text-lg flex items-center justify-center gap-2 hover:-translate-y-1 transition-all duration-300 touch-feedback"
              >
                <Zap className="w-5 h-5 text-amber-400" />
                View Live Demo
              </button>
            </div>
          </div>

          {/* Hero Visual - Dashboard Preview */}
          <div className="mt-16 md:mt-24 relative animate-fade-in-up delay-500">
            <div className="relative max-w-4xl mx-auto">
              {/* Glow behind card */}
              <div className="absolute -inset-4 bg-gradient-to-r from-violet-600/20 via-fuchsia-600/20 to-violet-600/20 rounded-3xl blur-2xl"></div>
              
              {/* Main card */}
              <div className="relative glass-panel rounded-3xl overflow-hidden hover-tilt">
                <div className="bg-gradient-to-br from-slate-900/80 to-slate-900/40 p-1">
                  {/* Window controls */}
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5">
                    <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
                    <div className="flex-1 flex justify-center">
                      <div className="px-4 py-1 rounded-lg bg-white/5 text-slate-500 text-xs font-medium">
                        dashboard.mychatpilot.com
                      </div>
                    </div>
                  </div>
                  
                  {/* Dashboard content */}
                  <div className="aspect-[16/9] md:aspect-[16/8] p-6 md:p-8">
                    <div className="h-full grid grid-cols-12 gap-4">
                      {/* Stats cards */}
                      <div className="col-span-4 space-y-4">
                        <div className="glass-card rounded-2xl p-4 animate-float">
                          <div className="text-sm text-slate-400 mb-2">Messages Today</div>
                          <div className="text-3xl font-bold text-white">2,847</div>
                          <div className="text-sm text-emerald-400 mt-1">↑ 12.5%</div>
                        </div>
                        <div className="glass-card rounded-2xl p-4 animate-float-delayed">
                          <div className="text-sm text-slate-400 mb-2">Response Rate</div>
                          <div className="text-3xl font-bold text-white">98.2%</div>
                        </div>
                      </div>
                      
                      {/* Chart area */}
                      <div className="col-span-8 glass-card rounded-2xl p-4 animate-float-slow">
                        <div className="flex justify-between items-center mb-4">
                          <span className="text-slate-300 font-medium">Engagement Overview</span>
                          <div className="flex gap-2">
                            <span className="px-2 py-1 rounded bg-violet-500/20 text-violet-400 text-xs">Week</span>
                          </div>
                        </div>
                        <div className="h-32 flex items-end gap-2">
                          {[40, 65, 55, 80, 70, 95, 85].map((height, i) => (
                            <div key={i} className="flex-1 bg-gradient-to-t from-violet-600 to-fuchsia-500 rounded-t-lg opacity-80" style={{ height: `${height}%` }}></div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Floating elements */}
              <div className="hidden md:block absolute -right-8 top-1/4 animate-float">
                <div className="glass-card p-4 rounded-2xl">
                  <MessageCircle className="w-8 h-8 text-violet-400" />
                </div>
              </div>
              <div className="hidden md:block absolute -left-8 bottom-1/4 animate-float-delayed">
                <div className="glass-card p-4 rounded-2xl">
                  <Zap className="w-8 h-8 text-amber-400" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Features Section */}
      <section className="relative z-10 py-24 md:py-32 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Section header */}
          <div className="text-center mb-16 md:mb-20">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
              Everything you need to <span className="gradient-text-static">scale</span>
            </h2>
            <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto">
              Powerful tools designed to supercharge your social media growth.
            </p>
          </div>

          {/* Features grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={<Zap className="w-6 h-6 text-violet-400" />}
              iconClass="icon-gradient-violet"
              title="Visual Flow Builder"
              description="Create complex automation flows with drag-and-drop. No coding required."
              delay="0"
            />
            <FeatureCard
              icon={<MessageCircle className="w-6 h-6 text-pink-400" />}
              iconClass="icon-gradient-pink"
              title="Omnichannel Inbox"
              description="Manage all your Facebook and Instagram messages in one unified inbox."
              delay="100"
            />
            <FeatureCard
              icon={<BarChart className="w-6 h-6 text-emerald-400" />}
              iconClass="icon-gradient-emerald"
              title="Detailed Analytics"
              description="Track engagement, reply rates, and automation performance with precision."
              delay="200"
            />
            <FeatureCard
              icon={<Globe className="w-6 h-6 text-blue-400" />}
              iconClass="icon-gradient-blue"
              title="Global Reach"
              description="Connect with audiences worldwide using multi-language support."
              delay="300"
            />
            <FeatureCard
              icon={<Shield className="w-6 h-6 text-amber-400" />}
              iconClass="icon-gradient-amber"
              title="Enterprise Security"
              description="Bank-grade encryption and role-based access control for your data."
              delay="400"
            />
            <FeatureCard
              icon={<Bot className="w-6 h-6 text-cyan-400" />}
              iconClass="icon-gradient-cyan"
              title="AI Assistants"
              description="Deploy intelligent bots that learn and improve over time."
              delay="500"
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-tr from-violet-600 to-fuchsia-500 p-2 rounded-xl">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold text-white">MychatPilot</span>
            </div>
            
            <div className="flex flex-wrap justify-center gap-8">
              <a href="#" className="text-slate-400 hover:text-white transition-colors text-sm">Privacy</a>
              <a href="#" className="text-slate-400 hover:text-white transition-colors text-sm">Terms</a>
              <a href="#" className="text-slate-400 hover:text-white transition-colors text-sm">Support</a>
              <a href="#" className="text-slate-400 hover:text-white transition-colors text-sm">Twitter</a>
            </div>
            
            <p className="text-slate-600 text-sm">
              © {new Date().getFullYear()} MychatPilot
            </p>
          </div>
        </div>
      </footer>

      {/* Mobile Bottom Navigation */}
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
            <MessageCircle className="w-6 h-6" />
            <span className="text-xs mt-1">Demo</span>
          </button>
          <button className="mobile-nav-item" onClick={() => navigate('/login')}>
            <Bot className="w-6 h-6" />
            <span className="text-xs mt-1">Login</span>
          </button>
        </div>
      </div>

      {/* Spacer for mobile bottom nav */}
      <div className="md:hidden h-20"></div>
    </div>
  );
};

const FeatureCard: React.FC<{ 
  icon: React.ReactNode; 
  iconClass: string;
  title: string; 
  description: string; 
  delay: string;
}> = ({ icon, iconClass, title, description, delay }) => {
  return (
    <div 
      className="glass-card glow-border p-6 md:p-8 rounded-3xl card-lift group"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={`w-14 h-14 ${iconClass} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
        {icon}
      </div>
      <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
      <p className="text-slate-400 leading-relaxed">
        {description}
      </p>
    </div>
  );
};

export default Home;