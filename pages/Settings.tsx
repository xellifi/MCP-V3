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
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-card dark:shadow-none border border-slate-200 dark:border-slate-800 overflow-hidden transition-all duration-300">
      <div
        className={`p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between cursor-pointer transition-colors ${isOpen ? 'bg-slate-50 dark:bg-slate-800/50' : 'hover:bg-slate-50 dark:hover:bg-slate-800/20'}`}
        onClick={onToggle}
      >
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-xl shadow-sm ${colorClass}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-lg">{title}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
          </div>
        </div>
        <div className={`text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
          <ChevronDown className="w-5 h-5" />
        </div>
      </div>
      <div className={`transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
        <div className="p-6 md:p-8">
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  const inputClasses = "w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none transition-all placeholder-slate-400 dark:placeholder-slate-500";
  const labelClasses = "block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2";
  const buttonPrimary = "bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-primary-500/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Settings</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg">Manage your account preferences, payouts, and workspace configurations.</p>
      </div>

      {/* 1. Payout Settings (User specific) */}
      <CollapsibleCard
        title="Payout Accounts"
        subtitle="Configure where your affiliate commissions are sent"
        icon={CreditCard}
        colorClass="bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
        isOpen={openSections.payout}
        onToggle={() => toggleSection('payout')}
        isDark={isDark}
      >
        <form onSubmit={handleSavePayouts} className="space-y-6">
          <div>
            <label className={labelClasses}>Payout Method</label>
            <div className="flex gap-4">
              <label className={`flex items-center gap-3 cursor-pointer border p-4 rounded-xl flex-1 transition-all ${payouts.method === 'PAYPAL' ? 'bg-primary-50 dark:bg-primary-900/10 border-primary-500 ring-1 ring-primary-500' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
                <input
                  type="radio"
                  name="payoutMethod"
                  value="PAYPAL"
                  checked={payouts.method === 'PAYPAL'}
                  onChange={() => setPayouts({ ...payouts, method: 'PAYPAL' })}
                  className="text-primary-600 focus:ring-primary-500 h-4 w-4"
                />
                <span className="font-medium text-slate-900 dark:text-white">PayPal</span>
              </label>
              <label className={`flex items-center gap-3 cursor-pointer border p-4 rounded-xl flex-1 transition-all ${payouts.method === 'BANK_TRANSFER' ? 'bg-primary-50 dark:bg-primary-900/10 border-primary-500 ring-1 ring-primary-500' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
                <input
                  type="radio"
                  name="payoutMethod"
                  value="BANK_TRANSFER"
                  checked={payouts.method === 'BANK_TRANSFER'}
                  onChange={() => setPayouts({ ...payouts, method: 'BANK_TRANSFER' })}
                  className="text-primary-600 focus:ring-primary-500 h-4 w-4"
                />
                <span className="font-medium text-slate-900 dark:text-white">Bank Transfer</span>
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

          <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
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
        colorClass="bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400"
        isOpen={openSections.apiKeys}
        onToggle={() => toggleSection('apiKeys')}
        isDark={isDark}
      >
        <form onSubmit={handleSaveIntegrations} className="space-y-6">
          <div>
            <label className={labelClasses}>OpenAI API Key</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Key className="h-5 w-5 text-slate-400" />
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
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                {showOpenAi ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div>
            <label className={labelClasses}>Google Gemini API Key</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Key className="h-5 w-5 text-slate-400" />
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
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                {showGemini ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
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
        colorClass="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
        isOpen={openSections.smtp}
        onToggle={() => toggleSection('smtp')}
        isDark={isDark}
      >
        <form onSubmit={handleSaveIntegrations} className="space-y-6">
          <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 p-4 rounded-xl text-sm text-amber-800 dark:text-amber-400 mb-6 flex items-start gap-3">
            <Server className="w-5 h-5 flex-shrink-0 mt-0.5" />
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
            <div className="md:col-span-2 pt-6 border-t border-slate-100 dark:border-slate-800">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Test Configuration</h4>
              <div className="flex gap-3">
                <input
                  type="email"
                  value={testEmail}
                  onChange={e => setTestEmail(e.target.value)}
                  placeholder="Enter email to test..."
                  className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                />
                <button
                  type="button"
                  onClick={handleTestEmail}
                  disabled={!testEmail || sendingTest}
                  className="flex items-center gap-2 bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 text-white px-6 py-3 rounded-xl font-bold transition-colors disabled:opacity-50"
                >
                  {sendingTest ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                  Test Email
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
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