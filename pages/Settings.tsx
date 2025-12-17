import React, { useEffect, useState } from 'react';
import { User, Workspace, IntegrationSettings, PayoutSettings } from '../types';
import { api } from '../services/api';
import { Key, Save, Eye, EyeOff, Bot, CreditCard, Mail, Server, ChevronDown, ChevronUp, Send } from 'lucide-react';
import { useToast } from '../context/ToastContext';

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
}

const CollapsibleCard: React.FC<CollapsibleCardProps> = ({ 
  title, 
  subtitle, 
  icon: Icon, 
  colorClass, 
  children, 
  isOpen, 
  onToggle 
}) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
      <div 
        className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between cursor-pointer hover:bg-slate-100 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${colorClass}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">{title}</h3>
            <p className="text-xs text-slate-500">{subtitle}</p>
          </div>
        </div>
        <div className="text-slate-400">
          {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </div>
      </div>
      {isOpen && (
        <div className="p-6">
          {children}
        </div>
      )}
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

  const [openSections, setOpenSections] = useState({
    payout: false,
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
      return <div className="p-8 text-center text-slate-500">Loading settings...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500 mt-1">Manage your account preferences, payouts, and workspace configurations.</p>
      </div>

      {/* 1. Payout Settings (User specific) */}
      <CollapsibleCard
        title="Payout Accounts"
        subtitle="Configure where your affiliate commissions are sent"
        icon={CreditCard}
        colorClass="bg-green-100 text-green-600"
        isOpen={openSections.payout}
        onToggle={() => toggleSection('payout')}
      >
        <form onSubmit={handleSavePayouts} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Payout Method</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer border p-3 rounded-lg flex-1 hover:bg-slate-50">
                <input 
                   type="radio" 
                   name="payoutMethod" 
                   value="PAYPAL" 
                   checked={payouts.method === 'PAYPAL'} 
                   onChange={() => setPayouts({...payouts, method: 'PAYPAL'})}
                />
                <span>PayPal</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer border p-3 rounded-lg flex-1 hover:bg-slate-50">
                <input 
                   type="radio" 
                   name="payoutMethod" 
                   value="BANK_TRANSFER" 
                   checked={payouts.method === 'BANK_TRANSFER'} 
                   onChange={() => setPayouts({...payouts, method: 'BANK_TRANSFER'})}
                />
                <span>Bank Transfer</span>
              </label>
            </div>
          </div>

          {payouts.method === 'PAYPAL' && (
            <div>
               <label className="block text-sm font-medium text-slate-700 mb-2">PayPal Email Address</label>
               <input 
                 type="email" 
                 value={payouts.paypalEmail || ''}
                 onChange={e => setPayouts({...payouts, paypalEmail: e.target.value})}
                 className="w-full border border-slate-200 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                 placeholder="name@example.com"
               />
            </div>
          )}

          {payouts.method === 'BANK_TRANSFER' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="md:col-span-2">
                 <label className="block text-sm font-medium text-slate-700 mb-2">Account Holder Name</label>
                 <input 
                   type="text" 
                   value={payouts.accountName || ''}
                   onChange={e => setPayouts({...payouts, accountName: e.target.value})}
                   className="w-full border border-slate-200 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                 />
               </div>
               <div>
                 <label className="block text-sm font-medium text-slate-700 mb-2">Bank Name</label>
                 <input 
                   type="text" 
                   value={payouts.bankName || ''}
                   onChange={e => setPayouts({...payouts, bankName: e.target.value})}
                   className="w-full border border-slate-200 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                 />
               </div>
               <div>
                 <label className="block text-sm font-medium text-slate-700 mb-2">Routing Number / SWIFT</label>
                 <input 
                   type="text" 
                   value={payouts.routingNumber || ''}
                   onChange={e => setPayouts({...payouts, routingNumber: e.target.value})}
                   className="w-full border border-slate-200 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                 />
               </div>
               <div className="md:col-span-2">
                 <label className="block text-sm font-medium text-slate-700 mb-2">Account Number / IBAN</label>
                 <input 
                   type="text" 
                   value={payouts.accountNumber || ''}
                   onChange={e => setPayouts({...payouts, accountNumber: e.target.value})}
                   className="w-full border border-slate-200 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                 />
               </div>
            </div>
          )}

          <div className="flex justify-end">
            <button 
              type="submit" 
              disabled={savingPayouts}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium shadow-sm transition-all disabled:opacity-50"
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
        colorClass="bg-indigo-100 text-indigo-600"
        isOpen={openSections.apiKeys}
        onToggle={() => toggleSection('apiKeys')}
      >
        <form onSubmit={handleSaveIntegrations} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">OpenAI API Key</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Key className="h-4 w-4 text-slate-400" />
              </div>
              <input 
                type={showOpenAi ? "text" : "password"}
                value={integrations.openaiApiKey}
                onChange={e => setIntegrations({...integrations, openaiApiKey: e.target.value})}
                className="w-full border border-slate-200 rounded-lg pl-10 pr-10 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                placeholder="sk-..."
              />
              <button 
                type="button"
                onClick={() => setShowOpenAi(!showOpenAi)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showOpenAi ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Google Gemini API Key</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Key className="h-4 w-4 text-slate-400" />
              </div>
              <input 
                type={showGemini ? "text" : "password"}
                value={integrations.geminiApiKey}
                onChange={e => setIntegrations({...integrations, geminiApiKey: e.target.value})}
                className="w-full border border-slate-200 rounded-lg pl-10 pr-10 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                placeholder="AIza..."
              />
              <button 
                type="button"
                onClick={() => setShowGemini(!showGemini)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showGemini ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex justify-end">
            <button 
              type="submit" 
              disabled={savingKeys}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium shadow-sm transition-all disabled:opacity-50"
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
        colorClass="bg-amber-100 text-amber-600"
        isOpen={openSections.smtp}
        onToggle={() => toggleSection('smtp')}
      >
        <form onSubmit={handleSaveIntegrations} className="space-y-6">
           <div className="bg-amber-50 border border-amber-100 p-4 rounded-lg text-sm text-amber-800 mb-4">
              Override the system default email settings to send notifications from your own domain.
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">SMTP Host</label>
              <input 
                type="text" 
                value={integrations.smtpHost || ''}
                onChange={e => setIntegrations({...integrations, smtpHost: e.target.value})}
                className="w-full border border-slate-200 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="smtp.example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Port</label>
              <input 
                type="text" 
                value={integrations.smtpPort || ''}
                onChange={e => setIntegrations({...integrations, smtpPort: e.target.value})}
                className="w-full border border-slate-200 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="587"
              />
            </div>
             <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Username</label>
              <input 
                type="text" 
                value={integrations.smtpUser || ''}
                onChange={e => setIntegrations({...integrations, smtpUser: e.target.value})}
                className="w-full border border-slate-200 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="user@example.com"
              />
            </div>
             <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Password</label>
              <input 
                type="password" 
                value={integrations.smtpPassword || ''}
                onChange={e => setIntegrations({...integrations, smtpPassword: e.target.value})}
                className="w-full border border-slate-200 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="********"
              />
            </div>
             <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">From Email</label>
              <input 
                type="email" 
                value={integrations.smtpFromEmail || ''}
                onChange={e => setIntegrations({...integrations, smtpFromEmail: e.target.value})}
                className="w-full border border-slate-200 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="notifications@yourdomain.com"
              />
            </div>

            {/* Test Email Section */}
            <div className="md:col-span-2 pt-4 border-t border-slate-100">
               <h4 className="text-sm font-bold text-slate-900 mb-3">Test Configuration</h4>
               <div className="flex gap-2">
                 <input 
                    type="email" 
                    value={testEmail}
                    onChange={e => setTestEmail(e.target.value)}
                    placeholder="Enter email to test..." 
                    className="flex-1 border border-slate-200 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                 />
                 <button 
                   type="button"
                   onClick={handleTestEmail}
                   disabled={!testEmail || sendingTest}
                   className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50"
                 >
                   {sendingTest ? (
                     <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                   ) : (
                     <Send className="w-4 h-4" />
                   )}
                   Test Email
                 </button>
               </div>
            </div>
          </div>

          <div className="flex justify-end">
             <button 
              type="submit" 
              disabled={savingKeys}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium shadow-sm transition-all disabled:opacity-50"
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