import React, { useEffect, useState } from 'react';
import { User, UserRole, AdminSettings as AdminSettingsType } from '../types';
import { api } from '../services/api';
import { Lock, Save, ShieldAlert, Eye, EyeOff, Server, ChevronDown, ChevronUp, Mail, List, MoveUp, MoveDown, Send, Banknote, Key, Copy, Check } from 'lucide-react';
import { useToast } from '../context/ToastContext';

interface SystemSettingsProps {
  user: User;
}

const DEFAULT_MENU_ORDER = [
  { id: '/', label: 'Dashboard' },
  { id: '/connections', label: 'Connections' },
  { id: '/connected-pages', label: 'Pages' },
  { id: '/subscribers', label: 'Subscribers' },
  { id: '/messages', label: 'Inbox' },
  { id: '/flows', label: 'Flows' },
  { id: '/scheduled', label: 'Posts' },
  { id: '/settings', label: 'Settings' },
  { id: '/affiliates', label: 'Affiliates' },
];

const DAYS_OF_WEEK = [
  { id: 0, label: 'Sunday' },
  { id: 1, label: 'Monday' },
  { id: 2, label: 'Tuesday' },
  { id: 3, label: 'Wednesday' },
  { id: 4, label: 'Thursday' },
  { id: 5, label: 'Friday' },
  { id: 6, label: 'Saturday' },
];

interface CopyButtonProps {
  text: string;
  label?: string;
}

const CopyButton: React.FC<CopyButtonProps> = ({ text, label }) => {
  const [copied, setCopied] = useState(false);
  const toast = useToast();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success(label ? `${label} copied to clipboard!` : 'Copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy to clipboard');
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-slate-700 hover:bg-blue-600 text-slate-300 hover:text-white transition-all duration-200 group"
      title="Copy to clipboard"
    >
      {copied ? (
        <Check className="w-4 h-4 text-green-400" />
      ) : (
        <Copy className="w-4 h-4 group-hover:scale-110 transition-transform" />
      )}
    </button>
  );
};

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
    <div className="bg-slate-900 rounded-xl shadow-sm border border-slate-700 overflow-hidden">
      <div
        className="p-5 border-b border-slate-700 bg-slate-800/50 flex items-center justify-between cursor-pointer hover:bg-slate-800 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${colorClass}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-100">{title}</h3>
            <p className="text-xs text-slate-400">{subtitle}</p>
          </div>
        </div>
        <div className="text-slate-400">
          {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </div>
      </div>
      {isOpen && (
        <div className="p-5 bg-slate-900">
          {children}
        </div>
      )}
    </div>
  );
};

const SystemSettings: React.FC<SystemSettingsProps> = ({ user }) => {
  const [settings, setSettings] = useState<AdminSettingsType>({
    facebookAppId: '',
    facebookAppSecret: '',
    facebookVerifyToken: '',
    openaiApiKey: '',
    geminiApiKey: '',
    menuSequence: DEFAULT_MENU_ORDER.map(i => i.id)
  });

  const [loading, setLoading] = useState(true);

  // Section saving states
  const [savingFacebook, setSavingFacebook] = useState(false);
  const [savingApiKeys, setSavingApiKeys] = useState(false);
  const [savingAffiliate, setSavingAffiliate] = useState(false);
  const [savingMenu, setSavingMenu] = useState(false);
  const [savingSmtp, setSavingSmtp] = useState(false);

  const [showSecret, setShowSecret] = useState(false);
  const [showOpenAi, setShowOpenAi] = useState(false);
  const [showGemini, setShowGemini] = useState(false);
  const toast = useToast();

  // Section states (default collapsed)
  const [openSections, setOpenSections] = useState({
    facebook: true,
    apiKeys: false,
    menu: false,
    smtp: false,
    affiliate: false
  });

  // Test Email State
  const [testEmail, setTestEmail] = useState('');
  const [sendingTest, setSendingTest] = useState(false);

  // Derive URL from env or window
  const appDomain = (import.meta as any).env.VITE_APP_DOMAIN || window.location.origin;
  const webhookUrl = `${appDomain}/api/webhooks/meta`;

  useEffect(() => {
    if (user.role !== UserRole.ADMIN && user.role !== UserRole.OWNER) return;
    loadSettings();
  }, [user]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await api.admin.getSettings();

      // Ensure menu sequence exists and contains all new default items (migration)
      let currentSequence = data.menuSequence || [];
      if (currentSequence.length === 0) {
        currentSequence = DEFAULT_MENU_ORDER.map(i => i.id);
      } else {
        currentSequence = currentSequence.filter(id => id !== '/api-keys');
        const defaultIds = DEFAULT_MENU_ORDER.map(i => i.id);
        const missingIds = defaultIds.filter(id => !currentSequence.includes(id));
        if (missingIds.length > 0) {
          currentSequence = [...currentSequence, ...missingIds];
        }
      }
      data.menuSequence = currentSequence;

      // Set defaults if missing
      if (data.affiliateCommission === undefined) data.affiliateCommission = 15;
      if (data.affiliateCurrency === undefined) data.affiliateCurrency = 'USD';
      if (data.affiliateMinWithdrawal === undefined) data.affiliateMinWithdrawal = 100;
      if (data.affiliateWithdrawalDays === undefined) data.affiliateWithdrawalDays = [1]; // Monday

      setSettings(data);
    } catch (err) {
      toast.error("Failed to load settings.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSection = async (sectionName: string, setLoadingState: (v: boolean) => void) => {
    setLoadingState(true);
    try {
      await api.admin.saveSettings(settings);
      toast.success(`${sectionName} saved successfully`);
    } catch (err) {
      toast.error(`Failed to save ${sectionName}.`);
    } finally {
      setLoadingState(false);
    }
  };

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const moveMenuItem = (index: number, direction: 'up' | 'down') => {
    if (!settings.menuSequence) return;

    const newOrder = [...settings.menuSequence];
    if (direction === 'up') {
      if (index === 0) return;
      [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    } else {
      if (index === newOrder.length - 1) return;
      [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    }
    setSettings({ ...settings, menuSequence: newOrder });
  };

  const handleTestEmail = async () => {
    if (!testEmail) return;
    setSendingTest(true);
    try {
      await api.admin.testEmail(testEmail);
      toast.success(`Test email sent to ${testEmail} successfully!`);
    } catch (e: any) {
      toast.error(`Failed to send test email: ${e.message}`);
    } finally {
      setSendingTest(false);
    }
  };

  const handleDayToggle = (dayId: number) => {
    const currentDays = settings.affiliateWithdrawalDays || [];
    const newDays = currentDays.includes(dayId)
      ? currentDays.filter(d => d !== dayId)
      : [...currentDays, dayId];
    setSettings({ ...settings, affiliateWithdrawalDays: newDays.sort() });
  };

  if (user.role !== UserRole.ADMIN && user.role !== UserRole.OWNER) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-slate-500">
        <ShieldAlert className="w-12 h-12 mb-4 text-red-500" />
        <h2 className="text-xl font-bold text-slate-100">Access Denied</h2>
        <p>You do not have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">System Settings</h1>
          <p className="text-slate-400 mt-1">Configure global application settings and integrations.</p>
        </div>
      </div>

      {/* 1. Facebook App Config */}
      <CollapsibleCard
        title="Facebook App Configuration"
        subtitle="Credentials for OAuth and Webhooks"
        icon={Lock}
        colorClass="bg-blue-100 text-blue-600"
        isOpen={openSections.facebook}
        onToggle={() => toggleSection('facebook')}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">App ID</label>
            <input
              type="text"
              value={settings.facebookAppId}
              onChange={e => setSettings({ ...settings, facebookAppId: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none text-slate-200 placeholder-slate-500"
              placeholder="1234567890"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">App Secret</label>
            <div className="relative">
              <input
                type={showSecret ? "text" : "password"}
                value={settings.facebookAppSecret}
                onChange={e => setSettings({ ...settings, facebookAppSecret: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-4 pr-10 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none text-slate-200 placeholder-slate-500 font-mono"
                placeholder="e.g. 8923489234..."
              />
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300"
              >
                {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-300 mb-2">Webhook Verify Token</label>
            <input
              type="text"
              value={settings.facebookVerifyToken}
              onChange={e => setSettings({ ...settings, facebookVerifyToken: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none text-slate-200 placeholder-slate-500 font-mono text-slate-300"
              placeholder="random_secure_string"
            />
            <p className="mt-1 text-xs text-slate-400">
              Create a long, random string. You will need to paste this into the Facebook Developer Portal.
            </p>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              <span className="flex items-center gap-2">
                <Server className="w-4 h-4" />
                Webhook URL (For Facebook)
              </span>
            </label>
            <div className="relative">
              <div className="bg-slate-800 border border-slate-700 text-slate-300 px-4 py-2.5 pr-12 rounded-lg font-mono text-sm overflow-x-auto">
                {webhookUrl}
              </div>
              <CopyButton text={webhookUrl} label="Webhook URL" />
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Add this URL to your Facebook App's <strong>Webhooks</strong> settings. Ensure the callback URL is set correctly.
            </p>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              <span className="flex items-center gap-2">
                <Lock className="w-4 h-4" />
                OAuth Redirect URL (For Facebook)
              </span>
            </label>
            <div className="relative">
              <div className="bg-slate-800 border border-blue-700/50 text-slate-200 px-4 py-2.5 pr-12 rounded-lg font-mono text-sm overflow-x-auto shadow-inner">
                {appDomain}/connections
              </div>
              <CopyButton text={`${appDomain}/connections`} label="OAuth Redirect URL" />
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Add this URL to your Facebook App's <strong>Valid OAuth Redirect URIs</strong> in Facebook Login settings.
            </p>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              <span className="flex items-center gap-2">
                <Server className="w-4 h-4" />
                Application Domain URL
              </span>
            </label>
            <div className="relative">
              <div className="bg-slate-800 border border-slate-700 text-slate-200 px-4 py-2.5 pr-12 rounded-lg font-mono text-sm overflow-x-auto">
                {appDomain}
              </div>
              <CopyButton text={appDomain} label="Domain URL" />
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Your application's base domain. Use this in Facebook App Settings for <strong>App Domains</strong>.
            </p>
          </div>

          <div className="md:col-span-2 flex justify-end pt-4 border-t border-slate-700">
            <button
              onClick={() => handleSaveSection('Facebook Settings', setSavingFacebook)}
              disabled={savingFacebook}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium shadow-sm transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {savingFacebook ? 'Saving...' : 'Save Facebook Settings'}
            </button>
          </div>
        </div>
      </CollapsibleCard>

      {/* 2. System API Keys */}
      <CollapsibleCard
        title="System API Keys"
        subtitle="Global AI keys for admin features or system-wide fallback"
        icon={Key}
        colorClass="bg-indigo-100 text-indigo-600"
        isOpen={openSections.apiKeys}
        onToggle={() => toggleSection('apiKeys')}
      >
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">OpenAI API Key (System)</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Key className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type={showOpenAi ? "text" : "password"}
                value={settings.openaiApiKey || ''}
                onChange={e => setSettings({ ...settings, openaiApiKey: e.target.value })}
                className="w-full border border-slate-700 rounded-lg pl-10 pr-10 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                placeholder="sk-..."
              />
              <button
                type="button"
                onClick={() => setShowOpenAi(!showOpenAi)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300"
              >
                {showOpenAi ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Google Gemini API Key (System)</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Key className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type={showGemini ? "text" : "password"}
                value={settings.geminiApiKey || ''}
                onChange={e => setSettings({ ...settings, geminiApiKey: e.target.value })}
                className="w-full border border-slate-700 rounded-lg pl-10 pr-10 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                placeholder="AIza..."
              />
              <button
                type="button"
                onClick={() => setShowGemini(!showGemini)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300"
              >
                {showGemini ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-700">
            <button
              onClick={() => handleSaveSection('API Keys', setSavingApiKeys)}
              disabled={savingApiKeys}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium shadow-sm transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {savingApiKeys ? 'Saving...' : 'Save API Keys'}
            </button>
          </div>
        </div>
      </CollapsibleCard>

      {/* 3. Affiliate Configuration */}
      <CollapsibleCard
        title="Affiliate Program"
        subtitle="Manage referral settings, commissions, and withdrawal rules"
        icon={Banknote}
        colorClass="bg-green-100 text-green-600"
        isOpen={openSections.affiliate}
        onToggle={() => toggleSection('affiliate')}
      >
        <div className="space-y-6">
          <div className="flex items-center gap-4 p-4 bg-slate-800 rounded-lg border border-slate-700">
            <div className="flex-1">
              <h4 className="font-medium text-slate-100">Enable Affiliate System</h4>
              <p className="text-sm text-slate-500">Allow users to refer others and earn commissions.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.affiliateEnabled}
                onChange={e => setSettings({ ...settings, affiliateEnabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Commission per Referral</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  {settings.affiliateCurrency === 'USD' ? '$' : settings.affiliateCurrency}
                </div>
                <input
                  type="number"
                  value={settings.affiliateCommission}
                  onChange={e => setSettings({ ...settings, affiliateCommission: parseFloat(e.target.value) })}
                  className="w-full border border-slate-700 rounded-lg pl-10 pr-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Currency</label>
              <select
                value={settings.affiliateCurrency}
                onChange={e => setSettings({ ...settings, affiliateCurrency: e.target.value })}
                className="w-full border border-slate-700 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Minimum Withdrawal Amount</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  {settings.affiliateCurrency === 'USD' ? '$' : settings.affiliateCurrency}
                </div>
                <input
                  type="number"
                  value={settings.affiliateMinWithdrawal}
                  onChange={e => setSettings({ ...settings, affiliateMinWithdrawal: parseFloat(e.target.value) })}
                  className="w-full border border-slate-700 rounded-lg pl-10 pr-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="100.00"
                  step="1"
                  min="0"
                />
              </div>
              <p className="mt-1 text-xs text-slate-400">Users must reach this amount before requesting a payout.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Allowed Withdrawal Days</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {DAYS_OF_WEEK.map(day => (
                  <label key={day.id} className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={(settings.affiliateWithdrawalDays || []).includes(day.id)}
                      onChange={() => handleDayToggle(day.id)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    {day.label}
                  </label>
                ))}
              </div>
              <p className="mt-1 text-xs text-slate-400">Days when the "Withdraw" button is active for users.</p>
            </div>

            <div className="md:col-span-2 flex justify-end pt-4 border-t border-slate-700">
              <button
                onClick={() => handleSaveSection('Affiliate Settings', setSavingAffiliate)}
                disabled={savingAffiliate}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium shadow-sm transition-all disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {savingAffiliate ? 'Saving...' : 'Save Affiliate Settings'}
              </button>
            </div>
          </div>
        </div>
      </CollapsibleCard>

      {/* 4. Menu Sequence */}
      <CollapsibleCard
        title="Side Menu Sequence"
        subtitle="Rearrange the navigation order"
        icon={List}
        colorClass="bg-purple-100 text-purple-600"
        isOpen={openSections.menu}
        onToggle={() => toggleSection('menu')}
      >
        <div className="space-y-4 max-w-lg">
          <div className="space-y-2">
            {settings.menuSequence?.map((itemId, index) => {
              const itemDef = DEFAULT_MENU_ORDER.find(i => i.id === itemId);
              if (!itemDef) return null; // Skip unknown items
              return (
                <div key={itemId} className="flex items-center justify-between p-3 bg-slate-800 border border-slate-700 rounded-lg">
                  <span className="font-medium text-slate-700">{itemDef.label}</span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => moveMenuItem(index, 'up')}
                      disabled={index === 0}
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-white rounded disabled:opacity-30 disabled:hover:bg-transparent"
                    >
                      <MoveUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveMenuItem(index, 'down')}
                      disabled={index === (settings.menuSequence?.length || 0) - 1}
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-white rounded disabled:opacity-30 disabled:hover:bg-transparent"
                    >
                      <MoveDown className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-slate-500">
            The changes will reflect on the sidebar after saving and refreshing the page.
          </p>

          <div className="flex justify-end pt-4 border-t border-slate-700">
            <button
              onClick={() => handleSaveSection('Menu Sequence', setSavingMenu)}
              disabled={savingMenu}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium shadow-sm transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {savingMenu ? 'Saving...' : 'Save Menu Order'}
            </button>
          </div>
        </div>
      </CollapsibleCard>

      {/* 5. SMTP Settings */}
      <CollapsibleCard
        title="SMTP Email Settings"
        subtitle="Configure email sending service"
        icon={Mail}
        colorClass="bg-amber-100 text-amber-600"
        isOpen={openSections.smtp}
        onToggle={() => toggleSection('smtp')}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">SMTP Host</label>
            <input
              type="text"
              value={settings.smtpHost || ''}
              onChange={e => setSettings({ ...settings, smtpHost: e.target.value })}
              className="w-full border border-slate-700 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="smtp.example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Port</label>
            <input
              type="text"
              value={settings.smtpPort || ''}
              onChange={e => setSettings({ ...settings, smtpPort: e.target.value })}
              className="w-full border border-slate-700 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="587"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Username</label>
            <input
              type="text"
              value={settings.smtpUser || ''}
              onChange={e => setSettings({ ...settings, smtpUser: e.target.value })}
              className="w-full border border-slate-700 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="user@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
            <input
              type="password"
              value={settings.smtpPassword || ''}
              onChange={e => setSettings({ ...settings, smtpPassword: e.target.value })}
              className="w-full border border-slate-700 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="********"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-300 mb-2">From Email</label>
            <input
              type="email"
              value={settings.smtpFromEmail || ''}
              onChange={e => setSettings({ ...settings, smtpFromEmail: e.target.value })}
              className="w-full border border-slate-700 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="no-reply@mychatpilot.com"
            />
          </div>

          {/* Test Email Section */}
          <div className="md:col-span-2 pt-4 border-t border-slate-700">
            <h4 className="text-sm font-bold text-slate-100 mb-3">Test Configuration</h4>
            <div className="flex gap-2">
              <input
                type="email"
                value={testEmail}
                onChange={e => setTestEmail(e.target.value)}
                placeholder="Enter email to test..."
                className="flex-1 border border-slate-700 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
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

          <div className="md:col-span-2 flex justify-end pt-4 border-t border-slate-700">
            <button
              onClick={() => handleSaveSection('SMTP Settings', setSavingSmtp)}
              disabled={savingSmtp}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium shadow-sm transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {savingSmtp ? 'Saving...' : 'Save SMTP Settings'}
            </button>
          </div>
        </div>
      </CollapsibleCard>
    </div>
  );
};

export default SystemSettings;
