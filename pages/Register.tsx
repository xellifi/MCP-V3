import React, { useState } from 'react';
import { api } from '../services/api';
import { User } from '../types';
import { Bot, ArrowRight, UserPlus, Mail, Lock, User as UserIcon } from 'lucide-react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useToast } from '../context/ToastContext';

interface RegisterProps {
  onLogin: (user: User) => Promise<void>;
}

const Register: React.FC<RegisterProps> = ({ onLogin }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();
  const [searchParams] = useSearchParams();

  // Get plan info from URL (set when user clicks on a paid plan from pricing)
  const selectedPlan = searchParams.get('plan');
  const selectedBilling = searchParams.get('billing');
  const selectedPrice = searchParams.get('price');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await api.auth.register(name, email, password);
      await onLogin(user);  // Wait for workspaces to load
      toast.success(`Welcome aboard, ${user.name}!`);

      // SaaS Flow: Redirect based on selected plan
      // If user selected a paid plan from pricing, redirect to packages for checkout
      // Otherwise (free plan or direct register), redirect to connections
      try {
        if (selectedPlan) {
          // Paid plan selected - redirect to packages page for checkout
          navigate(`/packages?plan=${selectedPlan}&billing=${selectedBilling}&price=${selectedPrice}`, { replace: true });
        } else {
          // Free plan or direct registration - redirect to connections
          navigate('/connections', { replace: true });
        }
      } catch (navError) {
        // Fallback if navigation fails
        console.error('Navigation error, redirecting to home:', navError);
        navigate('/', { replace: true });
      }
    } catch (error: any) {
      console.error('Registration error:', error);


      // Extract error message and provide user-friendly alternatives
      let errorMessage = error?.response?.data?.error || error?.message || 'Registration failed. Please try again.';

      // Make common errors more user-friendly
      if (errorMessage.includes('already registered') || errorMessage.includes('already been registered')) {
        errorMessage = 'This email address is already registered. Please use a different email or try logging in.';
      } else if (errorMessage.includes('invalid email')) {
        errorMessage = 'Please enter a valid email address.';
      } else if (errorMessage.toLowerCase().includes('password')) {
        errorMessage = 'Password must be at least 6 characters long.';
      }

      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Cosmic Background */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-[100px] animate-blob pointer-events-none"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[100px] animate-blob animation-delay-2000 pointer-events-none"></div>

      <div className="w-full max-w-md relative z-10 glass-panel rounded-3xl overflow-hidden animate-fade-in-up border border-white/10 shadow-2xl">
        <div className="p-8 pb-4 text-center">
          <Link to="/" className="inline-block hover:scale-105 transition-transform duration-200">
            <div className="w-16 h-16 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 text-white shadow-lg shadow-indigo-500/30">
              <UserPlus className="w-8 h-8" />
            </div>
          </Link>
          <h2 className="text-3xl font-bold text-white tracking-tight mb-2">Create Account</h2>
          <p className="text-slate-400">Start automating your business today</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Full Name</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <UserIcon className="h-5 w-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                </div>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-white/5 border border-slate-700/50 rounded-xl pl-12 pr-4 py-3.5 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none transition-all text-white placeholder-slate-600"
                  placeholder="John Doe"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Email Address</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-white/5 border border-slate-700/50 rounded-xl pl-12 pr-4 py-3.5 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none transition-all text-white placeholder-slate-600"
                  placeholder="name@company.com"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-white/5 border border-slate-700/50 rounded-xl pl-12 pr-4 py-3.5 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none transition-all text-white placeholder-slate-600"
                  placeholder="Create a password"
                  required
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 group active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating Account...' : 'Get Started'}
            {!loading && <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
          </button>

          <div className="text-center pt-2">
            <p className="text-slate-400">
              Already have an account?{' '}
              <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-bold hover:underline transition-colors">Sign in</Link>
            </p>
          </div>
        </form>
      </div>

      <p className="mt-8 text-slate-500 text-sm">&copy; {new Date().getFullYear()} Mychat Pilot. All rights reserved.</p>
    </div>
  );
};

export default Register;