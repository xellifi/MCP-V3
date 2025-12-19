import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, Zap, MessageCircle, BarChart, ArrowRight, CheckCircle } from 'lucide-react';

const Home: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col transition-colors duration-300">
      {/* Navigation */}
      <nav className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="bg-gradient-to-tr from-primary-600 to-indigo-600 p-2 rounded-lg text-white shadow-lg shadow-primary-500/30">
            <Bot className="w-6 h-6" />
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 text-transparent bg-clip-text">
            Mychat Pilot
          </span>
        </div>
        <div className="flex gap-4">
          <button
            onClick={() => navigate('/login')}
            className="text-slate-600 dark:text-slate-300 font-bold hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
          >
            Log in
          </button>
          <button
            onClick={() => navigate('/register')}
            className="bg-primary-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-primary-700 transition-all shadow-lg shadow-primary-500/20 active:scale-95"
          >
            Get Started
          </button>
        </div>
      </nav>

      {/* Hero */}
      <header className="flex-1 flex flex-col items-center justify-center text-center px-4 py-24 bg-gradient-to-b from-white to-slate-50 dark:from-slate-950 dark:to-slate-900">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-sm font-bold mb-8 border border-primary-100 dark:border-primary-800 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Zap className="w-4 h-4 text-primary-500" />
          <span>New: AI-Powered Comment Replies</span>
        </div>
        <h1 className="text-5xl md:text-7xl font-bold text-slate-900 dark:text-white tracking-tight max-w-5xl mb-8 leading-tight animate-in fade-in slide-in-from-bottom-6 duration-700">
          Automate your <span className="text-primary-600 dark:text-primary-400">Social Media</span> Interactions
        </h1>
        <p className="text-xl text-slate-500 dark:text-slate-400 max-w-2xl mb-12 leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-900">
          Boost engagement on Facebook and Instagram with a visual flow builder, auto-replies, and scheduled content.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 animate-in fade-in slide-in-from-bottom-10 duration-1000">
          <button
            onClick={() => navigate('/register')}
            className="flex items-center justify-center gap-2 bg-primary-600 text-white px-8 py-4 rounded-2xl font-bold hover:bg-primary-700 transition-all shadow-xl shadow-primary-500/30 text-lg hover:-translate-y-1 active:scale-95"
          >
            Start Free Trial <ArrowRight className="w-5 h-5" />
          </button>
          <button
            onClick={() => navigate('/login')}
            className="px-8 py-4 rounded-2xl font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:border-primary-500 dark:hover:border-primary-500 hover:text-primary-600 dark:hover:text-primary-400 transition-all text-lg hover:-translate-y-1 active:scale-95"
          >
            View Demo
          </button>
        </div>
      </header>

      {/* Features Grid */}
      <section className="px-4 py-24 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">Everything you need to grow</h2>
            <p className="text-slate-500 dark:text-slate-400 text-lg">Powerful tools to supercharge your social media presence.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-8 rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 hover:border-primary-500/30 dark:hover:border-primary-500/30 transition-all hover:shadow-xl dark:hover:shadow-primary-900/10 group">
              <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Zap className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">Visual Flow Builder</h3>
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed">Create complex automation flows with a drag-and-drop interface. No coding required.</p>
            </div>
            <div className="p-8 rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 hover:border-pink-500/30 dark:hover:border-pink-500/30 transition-all hover:shadow-xl dark:hover:shadow-pink-900/10 group">
              <div className="w-14 h-14 bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <MessageCircle className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">Omnichannel Inbox</h3>
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed">Manage all your Facebook and Instagram messages in one unified inbox.</p>
            </div>
            <div className="p-8 rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 hover:border-emerald-500/30 dark:hover:border-emerald-500/30 transition-all hover:shadow-xl dark:hover:shadow-emerald-900/10 group">
              <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <BarChart className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">Detailed Analytics</h3>
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed">Track engagement, reply rates, and automation performance in real-time.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 dark:bg-slate-950 text-slate-400 py-16 px-6 text-center border-t border-slate-800">
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="bg-primary-600 p-2 rounded-lg text-white">
            <Bot className="w-6 h-6" />
          </div>
          <span className="text-2xl font-bold text-white tracking-tight">
            Mychat Pilot
          </span>
        </div>
        <p className="text-lg mb-8 max-w-md mx-auto">Automating conversations, one message at a time.</p>
        <p className="text-sm border-t border-slate-800 pt-8">&copy; {new Date().getFullYear()} Mychat Pilot. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default Home;