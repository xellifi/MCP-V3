import React, { useState } from 'react';
import { api } from '../services/api';
import { User } from '../types';
import { Bot, ArrowRight, AlertCircle, Mail, Lock, RefreshCw, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { supabase } from '../lib/supabase';
import { useFacebookLogin } from '../hooks/useFacebookLogin';

interface LoginProps {
  onLogin: (user: User) => Promise<void>;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailNotConfirmed, setEmailNotConfirmed] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();
  const { login: facebookLogin, isLoading: fbLoading, error: fbError } = useFacebookLogin();

  const handleResendVerification = async () => {
    if (!email) {
      toast.error('Please enter your email address first');
      return;
    }
    setResendingEmail(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email
      });
      if (error) throw error;
      toast.success('Verification email sent! Please check your inbox.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to resend verification email');
    } finally {
      setResendingEmail(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setEmailNotConfirmed(false);
    try {
      const user = await api.auth.login(email, password);
      await onLogin(user);  // Wait for workspaces to load
      toast.success(`Welcome back, ${user.name}!`);
      // Explicitly navigate to dashboard after successful login
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      console.error(err);
      const errorMessage = err?.message?.toLowerCase() || '';

      // Check if the error is about email not being confirmed
      if (errorMessage.includes('email not confirmed') ||
        errorMessage.includes('email_not_confirmed') ||
        errorMessage.includes('invalid login credentials')) {
        setEmailNotConfirmed(true);
        toast.error('Please verify your email before logging in.');
      } else {
        toast.error('Invalid email or password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen py-[10px] bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center relative overflow-hidden">
      {/* Cosmic Background */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-[100px] animate-blob pointer-events-none"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[100px] animate-blob animation-delay-2000 pointer-events-none"></div>

      <div className="w-full max-w-md relative z-10 bg-white/80 dark:bg-white/5 backdrop-blur-xl rounded-3xl overflow-hidden animate-fade-in-up border border-slate-200 dark:border-white/10 shadow-2xl flex flex-col max-h-full">
        <div className="p-8 pb-4 text-center shrink-0">
          <Link to="/" className="inline-block hover:scale-105 transition-transform duration-200 mb-6">
            <div className="flex items-center justify-center gap-3">
              <div className="relative flex-shrink-0">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                  <Bot className="w-7 h-7" />
                </div>
              </div>

              <div className="flex flex-col -space-y-1 text-left">
                <div className="flex items-center text-2xl font-black tracking-tight leading-none">
                  <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">MY</span>
                  <span className="text-indigo-600 dark:text-indigo-400">chat</span>
                  <span className="text-pink-500 dark:text-pink-400">Pilot</span>
                </div>
                <span className="text-[0.7rem] font-bold tracking-[0.2em] text-indigo-500 dark:text-indigo-400 uppercase w-full flex justify-between">
                  <span>A</span><span>U</span><span>T</span><span>O</span><span>M</span><span>A</span><span>T</span><span>I</span><span>N</span><span>G</span>
                  <span className="w-1"></span>
                  <span>T</span><span>O</span><span>O</span><span>L</span>
                </span>
              </div>
            </div>
          </Link>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight mb-2">Welcome back</h2>
          <p className="text-slate-500 dark:text-slate-400">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Email Address</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400 dark:text-slate-500 group-focus-within:text-indigo-500 dark:group-focus-within:text-indigo-400 transition-colors" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-slate-700/50 rounded-xl pl-12 pr-4 py-3.5 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none transition-all text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600"
                  placeholder="name@company.com"
                  required
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Password</label>
                <Link to="/forgot-password" className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 hover:underline transition-colors">Forgot password?</Link>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400 dark:text-slate-500 group-focus-within:text-indigo-500 dark:group-focus-within:text-indigo-400 transition-colors" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-slate-700/50 rounded-xl pl-12 pr-4 py-3.5 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none transition-all text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600"
                  placeholder="Enter your password"
                  required
                />
              </div>
            </div>
          </div>

          {/* Email Verification Warning */}
          {emailNotConfirmed && (
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
              <div className="flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                      Email Not Verified
                    </p>
                    <p className="text-sm text-amber-600 dark:text-amber-500 mt-1">
                      Please check your inbox and click the verification link before logging in.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={resendingEmail}
                  className="flex items-center justify-center gap-2 py-2 px-4 bg-amber-100 dark:bg-amber-800/30 hover:bg-amber-200 dark:hover:bg-amber-800/50 text-amber-700 dark:text-amber-400 font-medium rounded-lg transition-all text-sm disabled:opacity-50"
                >
                  {resendingEmail ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4" />
                      Resend Verification Email
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 group active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in...' : 'Sign In'}
            {!loading && <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
          </button>

          {/* Social Login Options */}
          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-slate-700/50"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white dark:bg-transparent text-slate-500">Or continue with</span>
            </div>
          </div>


          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              disabled={fbLoading}
              onClick={async () => {
                try {
                  const result = await facebookLogin();
                  if (result) {
                    const user = await api.auth.loginWithFacebookSDK(result.user, result.accessToken);
                    await onLogin(user);
                    toast.success(`Welcome, ${user.name}!`);
                    navigate('/dashboard', { replace: true });
                  }
                } catch (err: any) {
                  console.error('Facebook login error:', err);
                  toast.error(err.message || 'Facebook login failed');
                }
              }}
              className="flex items-center justify-center gap-2 py-3 px-4 bg-[#1877F2] hover:bg-[#1565D8] text-white font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {fbLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              )}
              {fbLoading ? 'Connecting...' : 'Facebook'}
            </button>
            <button
              type="button"
              onClick={async () => {
                try {
                  await api.auth.loginWithGoogle();
                } catch (err: any) {
                  toast.error(err.message || 'Google login failed');
                }
              }}
              className="flex items-center justify-center gap-2 py-3 px-4 bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-medium rounded-xl transition-all border border-slate-300 dark:border-slate-600"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Google
            </button>
          </div>

          <div className="text-center pt-2">
            <p className="text-slate-500 dark:text-slate-400">
              Don't have an account?{' '}
              <Link to="/register" className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 font-bold hover:underline transition-colors">Create account</Link>
            </p>
          </div>
        </form>
      </div>

      <p className="mt-8 text-slate-500 text-sm">&copy; {new Date().getFullYear()} Mychat Pilot. All rights reserved.</p>
    </div>
  );
};

export default Login;