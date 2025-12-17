import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, CheckCircle, Zap, MessageCircle, BarChart, ArrowRight } from 'lucide-react';

const Home: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Navigation */}
      <nav className="bg-white border-b border-slate-100 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Bot className="w-8 h-8 text-blue-600" />
          <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 text-transparent bg-clip-text">
            Mychat Pilot
          </span>
        </div>
        <div className="flex gap-4">
          <button
            onClick={() => navigate('/login')}
            className="text-slate-600 font-medium hover:text-blue-600 transition-colors"
          >
            Log in
          </button>
          <button
            onClick={() => navigate('/register')}
            className="bg-blue-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200"
          >
            Get Started
          </button>
        </div>
      </nav>

      {/* Hero */}
      <header className="flex-1 flex flex-col items-center justify-center text-center px-4 py-20 bg-gradient-to-b from-white to-slate-50">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-sm font-medium mb-6 border border-blue-100">
          <Zap className="w-4 h-4" />
          <span>New: AI-Powered Comment Replies</span>
        </div>
        <h1 className="text-4xl md:text-6xl font-bold text-slate-900 tracking-tight max-w-4xl mb-6">
          Automate your Social Media Interactions
        </h1>
        <p className="text-lg md:text-xl text-slate-500 max-w-2xl mb-10 leading-relaxed">
          Boost engagement on Facebook and Instagram with a visual flow builder, auto-replies, and scheduled content.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={() => navigate('/register')}
            className="flex items-center justify-center gap-2 bg-blue-600 text-white px-8 py-3.5 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 text-lg"
          >
            Start Free Trial <ArrowRight className="w-5 h-5" />
          </button>
          <button
            className="px-8 py-3.5 rounded-xl font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors text-lg"
          >
            View Demo
          </button>
        </div>
      </header>

      {/* Features Grid */}
      <section className="px-4 py-20 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-8 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-6">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Visual Flow Builder</h3>
              <p className="text-slate-500">Create complex automation flows with a drag-and-drop interface. No coding required.</p>
            </div>
            <div className="p-8 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="w-12 h-12 bg-pink-100 text-pink-600 rounded-xl flex items-center justify-center mb-6">
                <MessageCircle className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Omnichannel Inbox</h3>
              <p className="text-slate-500">Manage all your Facebook and Instagram messages in one unified inbox.</p>
            </div>
            <div className="p-8 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center mb-6">
                <BarChart className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Detailed Analytics</h3>
              <p className="text-slate-500">Track engagement, reply rates, and automation performance in real-time.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12 px-6 text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Bot className="w-6 h-6 text-blue-500" />
          <span className="text-lg font-bold text-white">
            Mychat Pilot
          </span>
        </div>
        <p>&copy; {new Date().getFullYear()} Mychat Pilot. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default Home;