import React, { useEffect, useState } from 'react';
import { User, Workspace, IntegrationSettings, PayoutSettings } from '../types';
import { api } from '../services/api';
import { Key, Save, Eye, EyeOff, Bot, CreditCard, Mail, Server, ChevronDown, ChevronUp, Send } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';

interface SettingsProps {
  user: User;
  workspace: Workspace;
}

interface CollapsibleCardProps {
  title: string;
  subtitle: string;
  icon: any;
  colorClass: string;
  children: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  isDark?: boolean;
}

const CollapsibleCard: React.FC<CollapsibleCardProps> = ({
  title,
  subtitle,
  icon: Icon,
  colorClass,
  children,
  isOpen,
  onToggle,
  isDark
}) => {
  return (
    <div className={`rounded-2xl overflow-hidden transition-all duration-300 ${isDark ? 'glass-panel' : 'bg-white border border-slate-200 shadow-sm'}`}>
      <div
        className={`p-6 border-b flex items-center justify-between cursor-pointer transition-colors ${isDark
            ? `border-white/10 ${isOpen ? 'bg-white/10' : 'hover:bg-white/5'}`
            : `border-slate-200 ${isOpen ? 'bg-slate-50' : 'hover:bg-slate-50'}`
          }`}
        onClick={onToggle}
      >
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-xl shadow-lg ${colorClass}`}>
            <Icon className="w-5 h-5 drop-shadow-glow" />
          </div>
          <div>
            <h3 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-slate-900'}`}>{title}</h3>
            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{subtitle}</p>
          </div>
        </div>
        <div className={`${isDark ? 'text-slate-400' : 'text-slate-500'} transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
          <ChevronDown className="w-5 h-5" />
        </div>
      </div>
      <div className={`transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
        <div className={`p-6 md:p-8 ${isDark ? 'bg-black/20' : 'bg-slate-50/50'}`}>
          {children}
        </div>
      </div>
    </div>
  );
};

const Settings: React.FC<SettingsProps> = ({ user, workspace }) => {
  const [integrations, setIntegrations] = useState<IntegrationSettings>({
    workspaceId: workspace.id,
    openaiApiKey: '',
    geminiApiKey: '',
    smtpHost: '',
    smtpPort: '',
    smtpUser: '',
    smtpPassword: '',
    smtpFromEmail: ''
  });

  const [payouts, setPayouts] = useState<PayoutSettings>({
    userId: user.id,
    method: 'PAYPAL',
    paypalEmail: '',
    bankName: '',
    accountNumber: '',
    routingNumber: '',
    accountName: ''
  });

  const [loading, setLoading] = useState(true);
  const [savingKeys, setSavingKeys] = useState(false);
  const [savingPayouts, setSavingPayouts] = useState(false);

  const [showOpenAi, setShowOpenAi] = useState(false);
  const [showGemini, setShowGemini] = useState(false);

  // SMTP Test State
  const [testEmail, setTestEmail] = useState('');
  const [sendingTest, setSendingTest] = useState(false);

  const toast = useToast();
  const { isDark } = useTheme();

  const [openSections, setOpenSections] = useState({
    payout: true,
    apiKeys: false,
    smtp: false
  });

  useEffect(() => {
    loadData();
  }, [workspace.id, user.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [integrationsData, payoutsData] = await Promise.all([
        api.workspace.getIntegrations(workspace.id),
        api.user.getPayoutSettings(user.id)
      ]);
      setIntegrations(integrationsData);
      setPayouts(payoutsData);
    } catch (error) {
      toast.error("Failed to load settings.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveIntegrations = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingKeys(true);
    try {
      await api.workspace.saveIntegrations(workspace.id, integrations);
      toast.success('Workspace settings saved successfully.');
    } catch (error) {
      toast.error('Failed to save workspace settings.');
    } finally {
      setSavingKeys(false);
    }
  };

  const handleSavePayouts = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPayouts(true);
    try {
      await api.user.savePayoutSettings(payouts);
      toast.success('Payout settings updated.');
    } catch (error) {
      toast.error('Failed to save payout settings.');
    } finally {
      setSavingPayouts(false);
    }
  };

  const handleTestEmail = async () => {
    if (!testEmail) return;
    setSendingTest(true);
    try {
      await api.workspace.testSmtp(integrations, testEmail);
      toast.success(`Test email sent to ${testEmail} using custom SMTP.`);
    } catch (e: any) {
      toast.error(`SMTP Test Failed: ${e.message}`);
    } finally {
      setSendingTest(false);
    }
  };

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  const inputClasses = `w-full rounded-xl px-4 py-3 outline-none transition-all focus:ring-2 focus:ring-indigo-500/50 ${isDark
      ? 'bg-black/20 border border-white/10 text-white placeholder-slate-500'
      : 'bg-white border border-slate-200 text-slate-900 placeholder-slate-400'
    }`;

  const labelClasses = `block text-sm font-semibold mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`;

  const buttonPrimary = "bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-indigo-500/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed border border-white/20";

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12 animate-fade-in">
      <div>
        <h1 className={`text-3xl font-bold tracking-tight ${isDark ? 'text-white text-glow' : 'text-slate-900'}`}>Settings</h1>
        <p className={`mt-2 text-lg ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Manage your account preferences, payouts, and workspace configurations.</p>
      </div>

      {/* 1. Payout Settings (User specific) */}
      <CollapsibleCard
        title="Payout Accounts"
        subtitle="Configure where your affiliate commissions are sent"
        icon={CreditCard}
        colorClass="bg-green-500/20 text-green-400 border border-green-500/30"
        isOpen={openSections.payout}
        onToggle={() => toggleSection('payout')}
        isDark={isDark}
      >
        <form onSubmit={handleSavePayouts} className="space-y-6">
          <div>
            <label className={labelClasses}>Payout Method</label>
            <div className="flex gap-4">
              <label className={`flex items-center gap-3 cursor-pointer border p-4 rounded-xl flex-1 transition-all ${payouts.method === 'PAYPAL'
                  ? 'bg-indigo-500/20 border-indigo-500 ring-1 ring-indigo-500'
                  : isDark
                    ? 'bg-white/5 border-white/10 hover:bg-white/10'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}>
                <input
                  type="radio"
                  name="payoutMethod"
                  value="PAYPAL"
                  checked={payouts.method === 'PAYPAL'}
                  onChange={() => setPayouts({ ...payouts, method: 'PAYPAL' })}
                  className="text-indigo-500 focus:ring-indigo-500 h-4 w-4 bg-transparent border-white/20"
                />
                <span className={`font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>PayPal</span>
              </label>
              <label className={`flex items-center gap-3 cursor-pointer border p-4 rounded-xl flex-1 transition-all ${payouts.method === 'BANK_TRANSFER'
                  ? 'bg-indigo-500/20 border-indigo-500 ring-1 ring-indigo-500'
                  : isDark
                    ? 'bg-white/5 border-white/10 hover:bg-white/10'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}>
                <input
                  type="radio"
                  name="payoutMethod"
                  value="BANK_TRANSFER"
                  checked={payouts.method === 'BANK_TRANSFER'}
                  onChange={() => setPayouts({ ...payouts, method: 'BANK_TRANSFER' })}
                  className="text-indigo-500 focus:ring-indigo-500 h-4 w-4 bg-transparent border-white/20"
                />
                <span className={`font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>Bank Transfer</span>
              </label>
            </div>
          </div>

          {payouts.method === 'PAYPAL' && (
            <div className="animate-in fade-in slide-in-from-top-4 duration-300">
              <label className={labelClasses}>PayPal Email Address</label>
              <input
                type="email"
                value={payouts.paypalEmail || ''}
                onChange={e => setPayouts({ ...payouts, paypalEmail: e.target.value })}
                className={inputClasses}
                placeholder="name@example.com"
              />
            </div>
          )}

          {payouts.method === 'BANK_TRANSFER' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="md:col-span-2">
                <label className={labelClasses}>Account Holder Name</label>
                <input
                  type="text"
                  value={payouts.accountName || ''}
                  onChange={e => setPayouts({ ...payouts, accountName: e.target.value })}
                  className={inputClasses}
                />
              </div>
              <div>
                <label className={labelClasses}>Bank Name</label>
                <input
                  type="text"
                  value={payouts.bankName || ''}
                  onChange={e => setPayouts({ ...payouts, bankName: e.target.value })}
                  className={inputClasses}
                />
              </div>
              <div>
                <label className={labelClasses}>Routing Number / SWIFT</label>
                <input
                  type="text"
                  value={payouts.routingNumber || ''}
                  onChange={e => setPayouts({ ...payouts, routingNumber: e.target.value })}
                  className={inputClasses}
                />
              </div>
              <div className="md:col-span-2">
                <label className={labelClasses}>Account Number / IBAN</label>
                <input
                  type="text"
                  value={payouts.accountNumber || ''}
                  onChange={e => setPayouts({ ...payouts, accountNumber: e.target.value })}
                  className={inputClasses}
                />
              </div>
            </div>
          )}

          <div className={`flex justify-end pt-4 border-t ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
            <button
              type="submit"
              disabled={savingPayouts}
              className={buttonPrimary}
            >
              {savingPayouts ? 'Saving...' : 'Save Payout Details'}
            </button>
          </div>
        </form>
      </CollapsibleCard>

      {/* 2. API Keys (Workspace specific) */}
      <CollapsibleCard
        title="AI API Keys"
        subtitle="Configure OpenAI and Google Gemini keys for this workspace"
        icon={Bot}
        colorClass="bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
        isOpen={openSections.apiKeys}
        onToggle={() => toggleSection('apiKeys')}
        isDark={isDark}
      >
        <form onSubmit={handleSaveIntegrations} className="space-y-6">
          <div>
            <label className={labelClasses}>OpenAI API Key</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Key className="h-5 w-5 text-slate-500" />
              </div>
              <input
                type={showOpenAi ? "text" : "password"}
                value={integrations.openaiApiKey}
                onChange={e => setIntegrations({ ...integrations, openaiApiKey: e.target.value })}
                className={`${inputClasses} pl-12 pr-12 font-mono text-sm`}
                placeholder="sk-..."
              />
              <button
                type="button"
                onClick={() => setShowOpenAi(!showOpenAi)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-500 transition-colors"
              >
                {showOpenAi ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div>
            <label className={labelClasses}>Google Gemini API Key</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Key className="h-5 w-5 text-slate-500" />
              </div>
              <input
                type={showGemini ? "text" : "password"}
                value={integrations.geminiApiKey}
                onChange={e => setIntegrations({ ...integrations, geminiApiKey: e.target.value })}
                className={`${inputClasses} pl-12 pr-12 font-mono text-sm`}
                placeholder="AIza..."
              />
              <button
                type="button"
                onClick={() => setShowGemini(!showGemini)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-500 transition-colors"
              >
                {showGemini ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className={`flex justify-end pt-4 border-t ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
            <button
              type="submit"
              disabled={savingKeys}
              className={buttonPrimary}
            >
              {savingKeys ? 'Saving...' : 'Save Keys'}
            </button>
          </div>
        </form>
      </CollapsibleCard>

      {/* 3. SMTP Settings (Workspace specific) */}
      <CollapsibleCard
        title="Custom SMTP Settings"
        subtitle="Use your own email server for workspace notifications"
        icon={Mail}
        colorClass="bg-amber-500/20 text-amber-400 border border-amber-500/30"
        isOpen={openSections.smtp}
        onToggle={() => toggleSection('smtp')}
        isDark={isDark}
      >
        <form onSubmit={handleSaveIntegrations} className="space-y-6">
          <div className={`p-4 rounded-xl text-sm flex items-start gap-3 ${isDark ? 'bg-amber-500/10 border border-amber-500/20 text-amber-200' : 'bg-amber-50 border border-amber-200 text-amber-800'}`}>
            <Server className={`w-5 h-5 flex-shrink-0 mt-0.5 ${isDark ? 'text-amber-400' : 'text-amber-500'}`} />
            <p>Override the system default email settings to send notifications from your own domain.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={labelClasses}>SMTP Host</label>
              <input
                type="text"
                value={integrations.smtpHost || ''}
                onChange={e => setIntegrations({ ...integrations, smtpHost: e.target.value })}
                className={inputClasses}
                placeholder="smtp.example.com"
              />
            </div>
            <div>
              <label className={labelClasses}>Port</label>
              <input
                type="text"
                value={integrations.smtpPort || ''}
                onChange={e => setIntegrations({ ...integrations, smtpPort: e.target.value })}
                className={inputClasses}
                placeholder="587"
              />
            </div>
            <div>
              <label className={labelClasses}>Username</label>
              <input
                type="text"
                value={integrations.smtpUser || ''}
                onChange={e => setIntegrations({ ...integrations, smtpUser: e.target.value })}
                className={inputClasses}
                placeholder="user@example.com"
              />
            </div>
            <div>
              <label className={labelClasses}>Password</label>
              <input
                type="password"
                value={integrations.smtpPassword || ''}
                onChange={e => setIntegrations({ ...integrations, smtpPassword: e.target.value })}
                className={inputClasses}
                placeholder="********"
              />
            </div>
            <div className="md:col-span-2">
              <label className={labelClasses}>From Email</label>
              <input
                type="email"
                value={integrations.smtpFromEmail || ''}
                onChange={e => setIntegrations({ ...integrations, smtpFromEmail: e.target.value })}
                className={inputClasses}
                placeholder="notifications@yourdomain.com"
              />
            </div>

            {/* Test Email Section */}
            <div className={`md:col-span-2 pt-6 border-t ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
              <h4 className={`text-sm font-bold mb-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>Test Configuration</h4>
              <div className="flex gap-3">
                <input
                  type="email"
                  value={testEmail}
                  onChange={e => setTestEmail(e.target.value)}
                  placeholder="Enter email to test..."
                  className={`flex-1 rounded-xl px-4 py-3 outline-none transition-all focus:ring-2 focus:ring-indigo-500/50 ${isDark
                      ? 'bg-black/20 border border-white/10 text-white placeholder-slate-500'
                      : 'bg-white border border-slate-200 text-slate-900 placeholder-slate-400'
                    }`}
                />
                <button
                  type="button"
                  onClick={handleTestEmail}
                  disabled={!testEmail || sendingTest}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-colors disabled:opacity-50 border ${isDark
                      ? 'bg-white/10 hover:bg-white/20 text-white border-white/10'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-900 border-slate-200'
                    }`}
                >
                  {sendingTest ? (
                    <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                  Test Email
                </button>
              </div>
            </div>
          </div>

          <div className={`flex justify-end pt-4 border-t ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
            <button
              type="submit"
              disabled={savingKeys}
              className={buttonPrimary}
            >
              {savingKeys ? 'Saving...' : 'Save SMTP Settings'}
            </button>
          </div>
        </form>
      </CollapsibleCard>

    </div>
  );
};

export default Settings;