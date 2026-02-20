import React, { useState, useEffect } from 'react';
import { KeyRound, ArrowLeft, Mail, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Auto-redirect to login after successful submission
  useEffect(() => {
    if (submitted) {
      const timer = setTimeout(() => {
        navigate('/login');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [submitted, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send reset email');

      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 transition-colors duration-300">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-xl dark:shadow-none border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="p-8 pb-4 text-center">
          <Link to="/" className="inline-block hover:scale-105 transition-transform duration-200">
            <div className="w-14 h-14 bg-gradient-to-tr from-amber-500 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-6 text-white shadow-lg shadow-amber-500/30">
              <KeyRound className="w-7 h-7" />
            </div>
          </Link>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Reset Password</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg">Enter your email to receive recovery instructions</p>
        </div>

        {!submitted ? (
          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-xl text-sm border border-red-100 dark:border-red-900/30">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl pl-12 pr-4 py-3.5 focus:ring-2 focus:ring-amber-500 outline-none transition-all text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
                  placeholder="name@company.com"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-slate-900/10 dark:shadow-none transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <><Loader2 className="w-5 h-5 animate-spin" />Sending...</> : 'Send Reset Link'}
            </button>

            <div className="text-center pt-2">
              <Link to="/login" className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium transition-colors">
                <ArrowLeft className="w-4 h-4" /> Back to Login
              </Link>
            </div>
          </form>
        ) : (
          <div className="p-8 text-center space-y-6">
            <div className="p-5 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-xl text-sm border border-green-100 dark:border-green-900/30">
              If an account exists for <strong className="font-bold">{email}</strong>, we have sent a password reset link to it.
            </div>
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 rounded-xl text-sm border border-amber-100 dark:border-amber-900/30">
              <strong>Important:</strong> Please close this tab before clicking the reset link in your email.
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Redirecting to login in a few seconds...</p>
            <Link to="/login" className="inline-flex items-center text-indigo-600 dark:text-indigo-400 font-bold hover:underline transition-colors">
              Return to Login Now
            </Link>
          </div>
        )}
      </div>
      <p className="mt-8 text-slate-400 text-sm">&copy; {new Date().getFullYear()} Mychat Pilot. All rights reserved.</p>
    </div>
  );
};

export default ForgotPassword;