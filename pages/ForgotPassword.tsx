import React, { useState } from 'react';
import { KeyRound, ArrowRight, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    // Logic to send reset email would go here
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
        <div className="p-8 pb-0 text-center">
          <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center mx-auto mb-4 text-white shadow-lg shadow-amber-200">
            <KeyRound className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Reset Password</h2>
          <p className="text-slate-500 mt-2">Enter your email to receive recovery instructions</p>
        </div>

        {!submitted ? (
          <form onSubmit={handleSubmit} className="p-8 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
              <input 
                type="email" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                required
              />
            </div>
            
            <button 
              type="submit" 
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2"
            >
              Send Reset Link
            </button>

            <div className="text-center mt-6">
              <Link to="/login" className="text-slate-600 hover:text-slate-800 text-sm font-medium flex items-center justify-center gap-1">
                 <ArrowLeft className="w-4 h-4" /> Back to Login
              </Link>
            </div>
          </form>
        ) : (
          <div className="p-8 text-center space-y-4">
            <div className="p-4 bg-green-50 text-green-700 rounded-lg text-sm">
                If an account exists for <strong>{email}</strong>, we have sent a password reset link to it.
            </div>
            <Link to="/login" className="inline-flex items-center text-blue-600 font-medium hover:underline">
                Return to Login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;