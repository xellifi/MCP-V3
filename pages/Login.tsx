import React, { useState } from 'react';
import { api } from '../services/api';
import { User } from '../types';
import { Bot, ArrowRight, AlertCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';

interface LoginProps {
  onLogin: (user: User) => Promise<void>;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('User@gmail.com');
  const [password, setPassword] = useState('12345678');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await api.auth.login(email, password);
      await onLogin(user);  // Wait for workspaces to load
      toast.success(`Welcome back, ${user.name}!`);
      navigate('/dashboard');  // Navigate to dashboard explicitly
    } catch (err: any) {
      console.error(err);
      toast.error('Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 rounded-2xl shadow-xl border border-slate-800 overflow-hidden">
        <div className="p-8 pb-0 text-center">
          <Link to="/" className="inline-block">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4 text-white shadow-lg shadow-blue-900/40">
              <Bot className="w-8 h-8" />
            </div>
          </Link>
          <h2 className="text-2xl font-bold text-slate-100">Welcome back</h2>
          <p className="text-slate-400 mt-2">Sign in to your Mychat Pilot account</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-200 placeholder-slate-600"
              required
            />
          </div>
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium text-slate-400">Password</label>
              <Link to="/forgot-password" className="text-xs text-blue-500 hover:text-blue-400 hover:underline">Forgot password?</Link>
            </div>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-200 placeholder-slate-600"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg shadow-lg shadow-blue-900/50 transition-all flex items-center justify-center gap-2 group"
          >
            {loading ? 'Signing in...' : 'Sign In'}
            {!loading && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
          </button>

          <div className="text-center mt-6">
            <p className="text-sm text-slate-500">
              Don't have an account?{' '}
              <Link to="/register" className="text-blue-500 hover:text-blue-400 font-medium">Create one</Link>
            </p>
          </div>
        </form>

        <div className="bg-slate-950/50 p-4 text-center text-xs text-slate-500 border-t border-slate-800">
          <p className="font-semibold mb-1">Demo Accounts:</p>
          <p>Admin: admin@mychatpilot.com / admin1</p>
          <p>User: User@gmail.com / 12345678</p>
        </div>
      </div>
    </div>
  );
};

export default Login;