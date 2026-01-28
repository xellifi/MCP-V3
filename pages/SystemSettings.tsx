import React, { useEffect, useState } from 'react';
import { User, UserRole, AdminSettings as AdminSettingsType } from '../types';
import { api } from '../services/api';
import { Lock, Save, ShieldAlert, Eye, EyeOff, Server, ChevronDown, ChevronUp, Mail, List, MoveUp, MoveDown, Send, Banknote, Key, Copy, Check, RefreshCw, Sun, Moon, LifeBuoy, Shield, X, Plus } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';

// Utility function to generate a secure random token
const generateSecureToken = (length: number = 32): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  let token = '';
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  for (let i = 0; i < length; i++) {
    token += chars[randomValues[i] % chars.length];
  }
  return token;
};

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
  { id: '/forms-manager', label: 'Forms' },
  { id: '/store', label: 'Store' },
  { id: '/orders', label: 'Orders' },
  { id: '/packages', label: 'Packages' },
  { id: '/scheduled', label: 'Posts' },
  { id: '/academy', label: 'Academy' },
  { id: '/settings', label: 'Settings' },
  { id: '/affiliates', label: 'Affiliates' },
  { id: '/support', label: 'Support' },
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

const COMMON_EMAIL_DOMAINS = [
  'gmail.com',
  'yahoo.com',
  'outlook.com',
  'hotmail.com',
  'icloud.com',
  'protonmail.com',
  'aol.com',
  'live.com',
  'msn.com',
  'zoho.com',
  'yandex.com',
  'mail.com'
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
      className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all duration-200 group border border-white/5"
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
    <div className="bg-white dark:glass-panel border border-slate-200 dark:border-none shadow-sm dark:shadow-none rounded-2xl overflow-hidden transition-all duration-300">
      <div
        className={`p-6 border-b border-slate-100 dark:border-white/10 flex items-center justify-between cursor-pointer transition-colors ${isOpen ? 'bg-slate-50 dark:bg-white/10' : 'hover:bg-slate-50 dark:hover:bg-white/5'}`}
        onClick={onToggle}
      >
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-xl shadow-lg shadow-indigo-500/10 ${colorClass}`}>
            <Icon className="w-5 h-5 drop-shadow-glow" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-lg">{title}</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">{subtitle}</p>
          </div>
        </div>
        <div className={`text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
          <ChevronDown className="w-5 h-5" />
        </div>
      </div>
      <div className={`transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
        <div className="p-6 md:p-8 bg-white dark:bg-black/20">
          {children}
        </div>
      </div>
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
    menuSequence: DEFAULT_MENU_ORDER.map(i => i.id),
    defaultTheme: 'dark'
  });

  const [loading, setLoading] = useState(true);

  // Section saving states
  const [savingFacebook, setSavingFacebook] = useState(false);
  const [savingApiKeys, setSavingApiKeys] = useState(false);
  const [savingAffiliate, setSavingAffiliate] = useState(false);
  const [savingMenu, setSavingMenu] = useState(false);
  const [savingSmtp, setSavingSmtp] = useState(false);
  const [savingTheme, setSavingTheme] = useState(false);
  const [savingSupport, setSavingSupport] = useState(false);
  const [savingEmailDomains, setSavingEmailDomains] = useState(false);

  const [showSecret, setShowSecret] = useState(false);
  const [showOpenAi, setShowOpenAi] = useState(false);
  const [showGemini, setShowGemini] = useState(false);
  const toast = useToast();
  const { isDark, theme, toggleTheme } = useTheme();

  // Section states (default collapsed)
  const [openSections, setOpenSections] = useState({
    facebook: true,
    apiKeys: false,
    menu: false,
    smtp: false,
    affiliate: false,
    theme: false,
    support: false,
    emailDomains: false
  });

  // Test Email State
  const [testEmail, setTestEmail] = useState('');
  const [sendingTest, setSendingTest] = useState(false);

  // Email Domain Whitelist State
  const [newDomain, setNewDomain] = useState('');

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

      // Auto-generate Facebook verify token if missing
      if (!data.facebookVerifyToken || data.facebookVerifyToken.trim() === '') {
        data.facebookVerifyToken = generateSecureToken(32);
        // Auto-save the generated token
        try {
          await api.admin.saveSettings(data);
          toast.success('Auto-generated Facebook verify token');
        } catch (err) {
          console.error('Failed to save auto-generated token:', err);
        }
      }

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

      // If saving theme, also update local preference to match immediately
      if (sectionName === 'Theme Settings') {
        if (settings.defaultTheme !== theme) {
          toggleTheme();
          // Explicitly set localStorage to ensure persistence
          localStorage.setItem('theme', settings.defaultTheme as string);
        }
      }

      toast.success(`${sectionName} saved successfully`);
    } catch (err: any) {
      console.error(`Failed to save ${sectionName}:`, err.message);
      toast.error(`Failed to save ${sectionName}: ${err.message || 'Please try again'}`);
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

  // Email domain management functions
  const addEmailDomain = (domain: string) => {
    const cleanDomain = domain.toLowerCase().trim().replace(/^@/, '');
    if (!cleanDomain) return;

    // Validate domain format
    if (!/^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/.test(cleanDomain)) {
      toast.error('Invalid domain format. Example: gmail.com');
      return;
    }

    if (settings.allowedEmailDomains?.includes(cleanDomain)) {
      toast.error('Domain already added');
      return;
    }

    setSettings({
      ...settings,
      allowedEmailDomains: [...(settings.allowedEmailDomains || []), cleanDomain]
    });
    setNewDomain('');
  };

  const removeEmailDomain = (domain: string) => {
    setSettings({
      ...settings,
      allowedEmailDomains: (settings.allowedEmailDomains || []).filter(d => d !== domain)
    });
  };

  const toggleDomainRestriction = () => {
    setSettings({
      ...settings,
      emailDomainRestrictionEnabled: !settings.emailDomainRestrictionEnabled
    });
  };

  // Suggested domains (not yet added)
  const suggestedDomains = COMMON_EMAIL_DOMAINS.filter(
    d => !(settings.allowedEmailDomains || []).includes(d)
  );

  if (user.role !== UserRole.ADMIN && user.role !== UserRole.OWNER) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-slate-500">
        <ShieldAlert className="w-12 h-12 mb-4 text-red-500" />
        <h2 className="text-xl font-bold text-white">Access Denied</h2>
        <p>You do not have permission to view this page.</p>
      </div>
    );
  }



  // Adaptive Input Classes: Light mode (slate-100) vs Dark mode (black/20)
  const inputClasses = "w-full bg-slate-100 dark:bg-black/20 border border-slate-300 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all placeholder-slate-400 dark:placeholder-slate-500";
  const labelClasses = "block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2";
  const buttonPrimary = "flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-indigo-500/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed border border-white/20";

  return (
    <div className="space-y-8 pb-12 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight dark:text-glow">System Settings</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2 text-lg">Configure global application settings and integrations.</p>
          </div>
        </div>

      </div>

      {/* 0. Theme & Appearance */}
      <CollapsibleCard
        title="General Appearance"
        subtitle="Set the global default theme for new users"
        icon={isDark ? Moon : Sun}
        colorClass="bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400 border border-purple-500/20 dark:border-purple-500/30"
        isOpen={openSections.theme}
        onToggle={() => toggleSection('theme')}
        isDark={isDark}
      >
        <div className="space-y-6">
          <div className="flex items-center justify-between p-5 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10">
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Global Default Theme
                <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                  Currently: {settings.defaultTheme === 'light' ? 'Light' : 'Dark'}
                </span>
              </h4>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                This theme will be applied to all pages (including Login and Home) for users who haven't set a preference.
              </p>
            </div>

            <div className="flex items-center gap-2 bg-slate-200 dark:bg-black/40 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setSettings({ ...settings, defaultTheme: 'light' })}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${settings.defaultTheme === 'light'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
              >
                <Sun className="w-4 h-4" />
                Light
              </button>
              <button
                type="button"
                onClick={() => setSettings({ ...settings, defaultTheme: 'dark' })}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${settings.defaultTheme === 'dark'
                  ? 'bg-slate-700 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
              >
                <Moon className="w-4 h-4" />
                Dark
              </button>
            </div>
          </div>

          <div className="flex justify-end pt-6 border-t border-slate-200 dark:border-white/10">
            <button
              onClick={() => handleSaveSection('Theme Settings', setSavingTheme)}
              disabled={savingTheme}
              className={buttonPrimary}
            >
              <Save className="w-4 h-4" />
              {savingTheme ? 'Saving...' : 'Save Theme Settings'}
            </button>
          </div>
        </div>
      </CollapsibleCard>
      <CollapsibleCard
        title="Facebook App Configuration"
        subtitle="Credentials for OAuth and Webhooks"
        icon={Lock}
        colorClass="bg-blue-500/20 text-blue-400 border border-blue-500/30"
        isOpen={openSections.facebook}
        onToggle={() => toggleSection('facebook')}
        isDark={isDark}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className={labelClasses}>App ID</label>
            <input
              type="text"
              value={settings.facebookAppId}
              onChange={e => setSettings({ ...settings, facebookAppId: e.target.value })}
              className={inputClasses}
              placeholder="1234567890"
            />
          </div>

          <div>
            <label className={labelClasses}>App Secret</label>
            <div className="relative">
              <input
                type={showSecret ? "text" : "password"}
                value={settings.facebookAppSecret}
                onChange={e => setSettings({ ...settings, facebookAppSecret: e.target.value })}
                className={`${inputClasses} pr-12 font-mono`}
                placeholder="e.g. 8923489234..."
              />
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
              >
                {showSecret ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="md:col-span-2">
            <label className={labelClasses}>
              <span className="flex items-center gap-2">
                <Key className="w-4 h-4" />
                Webhook Verify Token (Auto-Generated)
              </span>
            </label>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={settings.facebookVerifyToken}
                  readOnly
                  className={`${inputClasses} border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-300 font-mono text-sm cursor-default select-all pr-12`}
                  placeholder="Generating..."
                />
                <CopyButton text={settings.facebookVerifyToken} label="Verify Token" />
              </div>
              <button
                type="button"
                onClick={async () => {
                  const newToken = generateSecureToken(32);
                  const updatedSettings = { ...settings, facebookVerifyToken: newToken };
                  setSettings(updatedSettings);
                  try {
                    await api.admin.saveSettings(updatedSettings);
                    toast.success('New verify token generated and saved!');
                  } catch (err) {
                    toast.error('Failed to save new token');
                  }
                }}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white px-5 py-3 rounded-xl font-bold shadow-lg shadow-green-500/20 transition-all active:scale-95 whitespace-nowrap group border border-white/20"
                title="Generate a new random token"
              >
                <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
                Generate New
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1">
              <ShieldAlert className="w-3 h-3 text-amber-500" />
              This token is auto-generated for security. <strong className="text-slate-900 dark:text-white">Copy and paste</strong> it into Facebook Developer Portal.
            </p>
          </div>

          <div className="md:col-span-2">
            <label className={labelClasses}>
              <span className="flex items-center gap-2">
                <Server className="w-4 h-4" />
                Webhook URL (For Facebook)
              </span>
            </label>
            <div className="relative">
              <div className="bg-slate-100 dark:bg-black/30 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 px-4 py-3 pr-12 rounded-xl font-mono text-sm overflow-x-auto">
                {webhookUrl}
              </div>
              <CopyButton text={webhookUrl} label="Webhook URL" />
            </div>
            <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
              Add this URL to your Facebook App's <strong>Webhooks</strong> settings.
            </p>
          </div>

          <div className="md:col-span-2">
            <label className={labelClasses}>
              <span className="flex items-center gap-2">
                <Lock className="w-4 h-4" />
                OAuth Redirect URL (For Facebook)
              </span>
            </label>
            <div className="relative">
              <div className="bg-slate-100 dark:bg-black/30 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 px-4 py-3 pr-12 rounded-xl font-mono text-sm overflow-x-auto shadow-inner">
                {appDomain}/connections
              </div>
              <CopyButton text={`${appDomain}/connections`} label="OAuth Redirect URL" />
            </div>
            <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
              Add this URL to your Facebook App's <strong>Valid OAuth Redirect URIs</strong> in Facebook Login settings.
            </p>
          </div>

          <div className="md:col-span-2">
            <label className={labelClasses}>
              <span className="flex items-center gap-2">
                <Server className="w-4 h-4" />
                Application Domain URL
              </span>
            </label>
            <div className="relative">
              <div className="bg-slate-100 dark:bg-black/30 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 px-4 py-3 pr-12 rounded-xl font-mono text-sm overflow-x-auto">
                {appDomain}
              </div>
              <CopyButton text={appDomain} label="Domain URL" />
            </div>
            <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
              Your application's base domain. Use this in Facebook App Settings for <strong>App Domains</strong>.
            </p>
          </div>

          <div className="md:col-span-2 flex justify-end pt-6 border-t border-slate-200 dark:border-white/10">
            <button
              onClick={() => handleSaveSection('Facebook Settings', setSavingFacebook)}
              disabled={savingFacebook}
              className={buttonPrimary}
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
        colorClass="bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
        isOpen={openSections.apiKeys}
        onToggle={() => toggleSection('apiKeys')}
        isDark={isDark}
      >
        <div className="space-y-6">
          <div>
            <label className={labelClasses}>OpenAI API Key (System)</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Key className="h-5 w-5 text-slate-500" />
              </div>
              <input
                type={showOpenAi ? "text" : "password"}
                value={settings.openaiApiKey || ''}
                onChange={e => setSettings({ ...settings, openaiApiKey: e.target.value })}
                className={`${inputClasses} pl-12 pr-12 font-mono text-sm`}
                placeholder="sk-..."
              />
              <button
                type="button"
                onClick={() => setShowOpenAi(!showOpenAi)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
              >
                {showOpenAi ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div>
            <label className={labelClasses}>Google Gemini API Key (System)</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Key className="h-5 w-5 text-slate-500" />
              </div>
              <input
                type={showGemini ? "text" : "password"}
                value={settings.geminiApiKey || ''}
                onChange={e => setSettings({ ...settings, geminiApiKey: e.target.value })}
                className={`${inputClasses} pl-12 pr-12 font-mono text-sm`}
                placeholder="AIza..."
              />
              <button
                type="button"
                onClick={() => setShowGemini(!showGemini)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
              >
                {showGemini ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="flex justify-end pt-6 border-t border-slate-200 dark:border-white/10">
            <button
              onClick={() => handleSaveSection('API Keys', setSavingApiKeys)}
              disabled={savingApiKeys}
              className={buttonPrimary}
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
        colorClass="bg-green-500/20 text-green-400 border border-green-500/30"
        isOpen={openSections.affiliate}
        onToggle={() => toggleSection('affiliate')}
        isDark={isDark}
      >
        <div className="space-y-6">
          <div className="flex items-center gap-4 p-5 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10">
            <div className="flex-1">
              <h4 className="font-bold text-slate-900 dark:text-white">Enable Affiliate System</h4>
              <p className="text-sm text-slate-600 dark:text-slate-400">Allow users to refer others and earn commissions.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.affiliateEnabled}
                onChange={e => setSettings({ ...settings, affiliateEnabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-14 h-7 bg-slate-200 dark:bg-white/10 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={labelClasses}>Commission per Referral</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500">
                  {settings.affiliateCurrency === 'USD' ? '$' : settings.affiliateCurrency}
                </div>
                <input
                  type="number"
                  value={settings.affiliateCommission}
                  onChange={e => setSettings({ ...settings, affiliateCommission: parseFloat(e.target.value) })}
                  className={`${inputClasses} pl-10`}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                />
              </div>
            </div>

            <div>
              <label className={labelClasses}>Currency</label>
              <div className="relative">
                <select
                  value={settings.affiliateCurrency}
                  onChange={e => setSettings({ ...settings, affiliateCurrency: e.target.value })}
                  className={`${inputClasses} appearance-none`}
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                  <ChevronDown className="w-4 h-4 text-slate-500" />
                </div>
              </div>
            </div>

            <div>
              <label className={labelClasses}>Minimum Withdrawal Amount</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500">
                  {settings.affiliateCurrency === 'USD' ? '$' : settings.affiliateCurrency}
                </div>
                <input
                  type="number"
                  value={settings.affiliateMinWithdrawal}
                  onChange={e => setSettings({ ...settings, affiliateMinWithdrawal: parseFloat(e.target.value) })}
                  className={`${inputClasses} pl-10`}
                  placeholder="100.00"
                  step="1"
                  min="0"
                />
              </div>
              <p className="mt-2 text-xs text-slate-400">Users must reach this amount before requesting a payout.</p>
            </div>

            <div>
              <label className={labelClasses}>Allowed Withdrawal Days</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-100 dark:bg-black/20 p-3 rounded-xl border border-slate-200 dark:border-white/10">
                {DAYS_OF_WEEK.map(day => (
                  <label key={day.id} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer hover:opacity-80 transition-opacity select-none">
                    <input
                      type="checkbox"
                      checked={(settings.affiliateWithdrawalDays || []).includes(day.id)}
                      onChange={() => handleDayToggle(day.id)}
                      className="rounded border-slate-300 dark:border-white/20 bg-white dark:bg-white/5 text-indigo-500 focus:ring-indigo-500 h-4 w-4"
                    />
                    {day.label}
                  </label>
                ))}
              </div>
              <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">Days when the "Withdraw" button is active for users.</p>
            </div>

            <div className="md:col-span-2 flex justify-end pt-6 border-t border-white/10">
              <button
                onClick={() => handleSaveSection('Affiliate Settings', setSavingAffiliate)}
                disabled={savingAffiliate}
                className={buttonPrimary}
              >
                <Save className="w-4 h-4" />
                {savingAffiliate ? 'Saving...' : 'Save Affiliate Settings'}
              </button>
            </div>
          </div>
        </div>
      </CollapsibleCard>

      {/* Support Settings */}
      <CollapsibleCard
        title="Support Ticket Settings"
        subtitle="Configure support ticket options"
        icon={LifeBuoy}
        colorClass="bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
        isOpen={openSections.support}
        onToggle={() => toggleSection('support')}
        isDark={isDark}
      >
        <div className="space-y-6">
          <div className="flex items-center gap-4 p-5 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10">
            <div className="flex-1">
              <h4 className="font-bold text-slate-900 dark:text-white">Enable File Attachments</h4>
              <p className="text-sm text-slate-600 dark:text-slate-400">Allow users to upload files when creating or replying to support tickets.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.supportAttachmentsEnabled !== false}
                onChange={e => setSettings({ ...settings, supportAttachmentsEnabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-14 h-7 bg-slate-200 dark:bg-white/10 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          <div className="flex justify-end pt-6 border-t border-slate-200 dark:border-white/10">
            <button
              onClick={() => handleSaveSection('Support Settings', setSavingSupport)}
              disabled={savingSupport}
              className={buttonPrimary}
            >
              <Save className="w-4 h-4" />
              {savingSupport ? 'Saving...' : 'Save Support Settings'}
            </button>
          </div>
        </div>
      </CollapsibleCard>

      {/* Email Domain Whitelist */}
      <CollapsibleCard
        title="Allowed Email Domains"
        subtitle="Restrict which email providers users can use"
        icon={Shield}
        colorClass="bg-rose-500/20 text-rose-400 border border-rose-500/30"
        isOpen={openSections.emailDomains}
        onToggle={() => toggleSection('emailDomains')}
        isDark={isDark}
      >
        <div className="space-y-6">
          {/* Enable/Disable Toggle */}
          <div className="flex items-center justify-between p-5 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10">
            <div className="flex-1">
              <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Enable Domain Restriction
                <span className={`text-xs font-normal px-2 py-0.5 rounded-full ${settings.emailDomainRestrictionEnabled
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}>
                  {settings.emailDomainRestrictionEnabled ? 'Active' : 'Inactive'}
                </span>
              </h4>
              <p className="text-sm text-slate-600 dark:text-slate-400">When enabled, users can only register or update their profile with emails from allowed domains.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.emailDomainRestrictionEnabled}
                onChange={toggleDomainRestriction}
                className="sr-only peer"
              />
              <div className="w-14 h-7 bg-slate-200 dark:bg-white/10 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-rose-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-rose-500 peer-checked:to-pink-500"></div>
            </label>
          </div>

          <div className={`space-y-6 transition-opacity ${settings.emailDomainRestrictionEnabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
            {/* Current allowed domains */}
            <div>
              <label className={labelClasses}>Currently Allowed Domains</label>
              <div className="flex flex-wrap gap-2 min-h-[48px] p-3 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl">
                {(settings.allowedEmailDomains || []).length === 0 ? (
                  <span className="text-slate-400 dark:text-slate-500 text-sm italic">No domains added yet. Add domains below.</span>
                ) : (
                  (settings.allowedEmailDomains || []).map(domain => (
                    <span
                      key={domain}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-rose-500 to-pink-500 text-white text-sm font-medium rounded-full shadow-sm hover:shadow-md transition-shadow"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      {domain}
                      <button
                        type="button"
                        onClick={() => removeEmailDomain(domain)}
                        className="ml-1 p-0.5 hover:bg-white/20 rounded-full transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))
                )}
              </div>
            </div>

            {/* Add custom domain */}
            <div>
              <label className={labelClasses}>Add Custom Domain</label>
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">@</span>
                  <input
                    type="text"
                    value={newDomain}
                    onChange={e => setNewDomain(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addEmailDomain(newDomain);
                      }
                    }}
                    className={`${inputClasses} pl-9`}
                    placeholder="example.com"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => addEmailDomain(newDomain)}
                  className="flex items-center gap-2 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-400 hover:to-pink-400 text-white px-5 py-3 rounded-xl font-bold shadow-lg shadow-rose-500/20 transition-all active:scale-95 whitespace-nowrap border border-white/20"
                >
                  <Plus className="w-5 h-5" />
                  Add
                </button>
              </div>
            </div>

            {/* Quick add popular domains */}
            {suggestedDomains.length > 0 && (
              <div>
                <label className={labelClasses}>Quick Add Popular Providers</label>
                <div className="flex flex-wrap gap-2">
                  {suggestedDomains.map(domain => (
                    <button
                      key={domain}
                      type="button"
                      onClick={() => addEmailDomain(domain)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-white/5 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-slate-700 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 text-sm font-medium rounded-full border border-slate-200 dark:border-white/10 hover:border-rose-300 dark:hover:border-rose-500/30 transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      {domain}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Info box */}
            <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
              <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800 dark:text-amber-200">
                <p className="font-semibold mb-1">How it works</p>
                <p className="text-amber-700 dark:text-amber-300">When enabled, users can only register or update their profile with email addresses from the domains listed above. This helps prevent fake or temporary email signups.</p>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-6 border-t border-slate-200 dark:border-white/10">
            <button
              onClick={() => handleSaveSection('Email Domain Settings', setSavingEmailDomains)}
              disabled={savingEmailDomains}
              className={buttonPrimary}
            >
              <Save className="w-4 h-4" />
              {savingEmailDomains ? 'Saving...' : 'Save Email Domain Settings'}
            </button>
          </div>
        </div>
      </CollapsibleCard>

      {/* 4. Menu Sequence */}
      <CollapsibleCard
        title="Side Menu Sequence"
        subtitle="Rearrange the navigation order"
        icon={List}
        colorClass="bg-purple-500/20 text-purple-400 border border-purple-500/30"
        isOpen={openSections.menu}
        onToggle={() => toggleSection('menu')}
        isDark={isDark}
      >
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {settings.menuSequence?.map((itemId, index) => {
              const itemDef = DEFAULT_MENU_ORDER.find(i => i.id === itemId);
              if (!itemDef) return null; // Skip unknown items
              return (
                <div key={itemId} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl hover:border-indigo-500/50 transition-colors group">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-200 dark:bg-white/10 text-xs font-bold text-slate-500 dark:text-slate-400">
                      {index + 1}
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white truncate">{itemDef.label}</span>
                  </div>
                  <div className="flex gap-1 ml-2">
                    <button
                      type="button"
                      onClick={() => moveMenuItem(index, 'up')}
                      disabled={index === 0}
                      className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent transition-colors shadow-sm"
                      title="Move Backward"
                    >
                      <ChevronUp className="w-4 h-4 md:rotate-[-90deg]" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveMenuItem(index, 'down')}
                      disabled={index === (settings.menuSequence?.length || 0) - 1}
                      className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent transition-colors shadow-sm"
                      title="Move Forward"
                    >
                      <ChevronDown className="w-4 h-4 md:rotate-[-90deg]" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 italic">
            The changes will reflect on the sidebar after saving and refreshing the page. Use arrows to reorder.
          </p>

          <div className="flex justify-end pt-6 border-t border-slate-200 dark:border-white/10">
            <button
              onClick={() => handleSaveSection('Menu Sequence', setSavingMenu)}
              disabled={savingMenu}
              className={buttonPrimary}
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
        colorClass="bg-amber-500/20 text-amber-400 border border-amber-500/30"
        isOpen={openSections.smtp}
        onToggle={() => toggleSection('smtp')}
        isDark={isDark}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className={labelClasses}>SMTP Host</label>
            <input
              type="text"
              value={settings.smtpHost || ''}
              onChange={e => setSettings({ ...settings, smtpHost: e.target.value })}
              className={inputClasses}
              placeholder="smtp.example.com"
            />
          </div>
          <div>
            <label className={labelClasses}>Port</label>
            <input
              type="text"
              value={settings.smtpPort || ''}
              onChange={e => setSettings({ ...settings, smtpPort: e.target.value })}
              className={inputClasses}
              placeholder="587"
            />
          </div>
          <div>
            <label className={labelClasses}>Username</label>
            <input
              type="text"
              value={settings.smtpUser || ''}
              onChange={e => setSettings({ ...settings, smtpUser: e.target.value })}
              className={inputClasses}
              placeholder="user@example.com"
            />
          </div>
          <div>
            <label className={labelClasses}>Password</label>
            <input
              type="password"
              value={settings.smtpPassword || ''}
              onChange={e => setSettings({ ...settings, smtpPassword: e.target.value })}
              className={inputClasses}
              placeholder="********"
            />
          </div>
          <div className="md:col-span-2">
            <label className={labelClasses}>From Email</label>
            <input
              type="email"
              value={settings.smtpFromEmail || ''}
              onChange={e => setSettings({ ...settings, smtpFromEmail: e.target.value })}
              className={inputClasses}
              placeholder="no-reply@mychatpilot.com"
            />
          </div>

          {/* Test Email Section */}
          <div className="md:col-span-2 pt-6 border-t border-slate-200 dark:border-white/10">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Test Configuration</h4>
            <div className="flex gap-3">
              <input
                type="email"
                value={testEmail}
                onChange={e => setTestEmail(e.target.value)}
                placeholder="Enter email to test..."
                className="flex-1 bg-slate-100 dark:bg-black/20 border border-slate-300 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/50 outline-none"
              />
              <button
                type="button"
                onClick={handleTestEmail}
                disabled={!testEmail || sendingTest}
                className="flex items-center gap-2 bg-slate-200 hover:bg-slate-300 dark:bg-white/10 dark:hover:bg-white/20 text-slate-700 dark:text-white px-6 py-3 rounded-xl font-bold transition-colors disabled:opacity-50 border border-slate-300 dark:border-white/10"
              >
                {sendingTest ? (
                  <span className="w-5 h-5 border-2 border-slate-500 dark:border-white border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <Send className="w-5 h-5" />
                )}
                Test Email
              </button>
            </div>
          </div>

          <div className="md:col-span-2 flex justify-end pt-6 border-t border-slate-200 dark:border-white/10">
            <button
              onClick={() => handleSaveSection('SMTP Settings', setSavingSmtp)}
              disabled={savingSmtp}
              className={buttonPrimary}
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
