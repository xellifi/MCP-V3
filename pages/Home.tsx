import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, Zap, MessageCircle, BarChart, ArrowRight, CheckCircle, Sparkles, Globe, Shield } from 'lucide-react';

const Home: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-950 font-sans selection:bg-indigo-500/30">
      {/* Background Gradients */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-[100px] animate-blob"></div>
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[100px] animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-32 left-1/3 w-96 h-96 bg-pink-600/20 rounded-full blur-[100px] animate-blob animation-delay-4000"></div>
      </div>

      {/* Navigation */}
      <nav className="fixed w-full z-50 px-6 py-4 glass-panel border-b-0">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-tr from-indigo-500 to-purple-600 p-2 rounded-xl shadow-lg shadow-indigo-500/20">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">
              Mychat Pilot
            </span>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => navigate('/login')}
              className="text-slate-300 font-medium hover:text-white transition-colors px-4 py-2"
            >
              Log in
            </button>
            <button
              onClick={() => navigate('/register')}
              className="bg-white text-slate-900 px-6 py-2.5 rounded-full font-bold hover:bg-indigo-50 transition-all shadow-lg hover:shadow-indigo-500/20 active:scale-95"
            >
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card border-indigo-500/30 text-indigo-300 text-sm font-medium mb-8 animate-fade-in-up">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span>New: AI-Powered Automation Engine flow</span>
          </div>

          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold text-white tracking-tight mb-8 leading-tight animate-fade-in-up delay-100">
            Automate your <br />
            <span className="gradient-text text-glow">Social Presence</span>
          </h1>

          <p className="text-xl md:text-2xl text-slate-400 max-w-3xl mx-auto mb-12 leading-relaxed animate-fade-in-up delay-200">
            Boost engagement on Facebook and Instagram with our next-gen visual flow builder,
            intelligent auto-replies, and AI-driven content scheduling.
          </p>

          <div className="flex flex-col sm:flex-row gap-6 justify-center animate-fade-in-up delay-300 items-center">
            <button
              onClick={() => navigate('/register')}
              className="group relative px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full text-white font-bold text-lg shadow-xl shadow-indigo-600/30 hover:shadow-indigo-600/50 hover:-translate-y-1 transition-all duration-300 overflow-hidden"
            >
              <div className="absolute inset-0 bg-white/20 group-hover:translate-x-full transition-transform duration-500 skew-x-12 -translate-x-full"></div>
              <span className="flex items-center gap-2">
                Start Free Trial <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </span>
            </button>
            <button
              onClick={() => navigate('/login')}
              className="px-8 py-4 rounded-full text-white font-medium glass-card hover:bg-white/10 transition-all text-lg flex items-center gap-2"
            >
              <Zap className="w-5 h-5 text-yellow-400" />
              View Live Demo
            </button>
          </div>

          {/* Hero Image / Dashboard Preview */}
          <div className="mt-20 relative max-w-5xl mx-auto animate-fade-in-up delay-500 group">
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-1000"></div>
            <div className="relative rounded-2xl overflow-hidden glass-panel border-slate-700/50">
              <div className="aspect-[16/9] bg-slate-900/50 flex items-center justify-center">
                <div className="text-slate-500 flex flex-col items-center gap-4">
                  <BarChart className="w-16 h-16 opacity-50" />
                  <span className="text-lg">Interactive Dashboard Preview</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Features Grid */}
      <section className="relative z-10 py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">Everything you need to scale</h2>
            <p className="text-slate-400 text-xl max-w-2xl mx-auto">Powerful tools designed to supercharge your social media growth and automation.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Zap className="w-8 h-8 text-indigo-400" />}
              title="Visual Flow Builder"
              description="Create complex automation flows with a drag-and-drop interface. No coding required."
              delay="0"
            />
            <FeatureCard
              icon={<MessageCircle className="w-8 h-8 text-pink-400" />}
              title="Omnichannel Inbox"
              description="Manage all your Facebook and Instagram messages in one unified, real-time inbox."
              delay="100"
            />
            <FeatureCard
              icon={<BarChart className="w-8 h-8 text-emerald-400" />}
              title="Detailed Analytics"
              description="Track engagement, reply rates, and automation performance with granular precision."
              delay="200"
            />
            <FeatureCard
              icon={<Globe className="w-8 h-8 text-blue-400" />}
              title="Global Reach"
              description="Connect with audiences worldwide using multi-language support and smart routing."
              delay="300"
            />
            <FeatureCard
              icon={<Shield className="w-8 h-8 text-orange-400" />}
              title="Enterprise Security"
              description="Bank-grade encryption and role-based access control to keep your data safe."
              delay="400"
            />
            <FeatureCard
              icon={<Bot className="w-8 h-8 text-purple-400" />}
              title="AI Assistants"
              description="Deploy intelligent bots that learn from your conversations and improve over time."
              delay="500"
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 bg-slate-950 border-t border-slate-800/50 py-20 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="bg-indigo-600 p-2 rounded-xl">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">Mychat Pilot</span>
          </div>
          <p className="text-slate-500 mb-8">Automating conversations, one message at a time.</p>
          <div className="flex justify-center gap-8 mb-12">
            <a href="#" className="text-slate-400 hover:text-white transition-colors">Privacy</a>
            <a href="#" className="text-slate-400 hover:text-white transition-colors">Terms</a>
            <a href="#" className="text-slate-400 hover:text-white transition-colors">Twitter</a>
            <a href="#" className="text-slate-400 hover:text-white transition-colors">GitHub</a>
          </div>
          <p className="text-slate-600 text-sm">&copy; {new Date().getFullYear()} Mychat Pilot. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

const FeatureCard: React.FC<{ icon: React.ReactNode, title: string, description: string, delay: string }> = ({ icon, title, description, delay }) => {
  return (
    <div className="glass-card p-8 rounded-3xl hover:-translate-y-2 transition-transform duration-300 group">
      <div className="w-16 h-16 bg-slate-800/50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 border border-slate-700/50">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-white mb-4">{title}</h3>
      <p className="text-slate-400 leading-relaxed">
        {description}
      </p>
    </div>
  );
};

export default Home;