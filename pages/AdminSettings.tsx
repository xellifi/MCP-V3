import React, { useEffect, useState } from 'react';
import { User, UserRole, AdminSettings as AdminSettingsType } from '../types';
import { api } from '../services/api';
import { Lock, Save, ShieldAlert, Eye, EyeOff, Mail, X, Plus, Shield } from 'lucide-react';
import { useToast } from '../context/ToastContext';

interface AdminSettingsProps {
  user: User;
}

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

const AdminSettings: React.FC<AdminSettingsProps> = ({ user }) => {
  const [settings, setSettings] = useState<AdminSettingsType>({
    facebookAppId: '',
    facebookAppSecret: '',
    facebookVerifyToken: '',
    emailDomainRestrictionEnabled: false,
    allowedEmailDomains: []
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [newDomain, setNewDomain] = useState('');
  const toast = useToast();

  useEffect(() => {
    if (user.role !== UserRole.ADMIN && user.role !== UserRole.OWNER) return;
    loadSettings();
  }, [user]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await api.admin.getSettings();
      setSettings(data);
    } catch (error) {
      toast.error("Failed to load global settings");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.admin.saveSettings(settings);
      toast.success('Settings saved successfully');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const addDomain = (domain: string) => {
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

  const removeDomain = (domain: string) => {
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

  if (user.role !== UserRole.ADMIN && user.role !== UserRole.OWNER) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-slate-500">
        <ShieldAlert className="w-12 h-12 mb-4 text-red-500" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Access Denied</h2>
        <p>You do not have permission to view this page.</p>
      </div>
    );
  }

  const inputClasses = "w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none transition-all placeholder-slate-400 dark:placeholder-slate-500";
  const labelClasses = "block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2";

  // Domains not yet added that can be suggested
  const suggestedDomains = COMMON_EMAIL_DOMAINS.filter(
    d => !(settings.allowedEmailDomains || []).includes(d)
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Global Admin Settings</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg">Configure system-wide settings for your platform.</p>
      </div>

      {/* Facebook App Configuration */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-card dark:shadow-none border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center gap-4 bg-slate-50/50 dark:bg-slate-950/50">
          <div className="p-3 bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 rounded-xl shadow-sm">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-lg">Facebook App Configuration</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">These credentials handle OAuth and Webhooks for the entire platform.</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                  tabIndex={-1}
                >
                  {showSecret ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="md:col-span-2">
              <label className={labelClasses}>Webhook Verify Token</label>
              <input
                type="text"
                value={settings.facebookVerifyToken}
                onChange={e => setSettings({ ...settings, facebookVerifyToken: e.target.value })}
                className={`${inputClasses} font-mono`}
                placeholder="random_secure_string"
              />
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                Use this token when configuring the Webhook product in the Facebook Developer Portal.
              </p>
            </div>

            <div className="md:col-span-2">
              <label className={labelClasses}>Webhook URL (Read Only)</label>
              <div className="bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 px-4 py-3 rounded-xl font-mono text-sm overflow-x-auto">
                https://api.yourdomain.com/webhooks/meta
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* Email Domain Whitelist Section */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-card dark:shadow-none border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-indigo-50/50 to-purple-50/50 dark:from-indigo-950/30 dark:to-purple-950/30">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-500 text-white rounded-xl shadow-lg shadow-indigo-500/20">
              <Mail className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-lg">Allowed Email Domains</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Restrict which email providers users can use to register or update their profile.</p>
            </div>
          </div>

          {/* Toggle Switch */}
          <button
            type="button"
            onClick={toggleDomainRestriction}
            className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${settings.emailDomainRestrictionEnabled
                ? 'bg-gradient-to-r from-indigo-500 to-purple-500'
                : 'bg-slate-300 dark:bg-slate-700'
              }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform duration-300 ${settings.emailDomainRestrictionEnabled ? 'translate-x-8' : 'translate-x-1'
                }`}
            />
          </button>
        </div>

        <div className={`transition-all duration-300 ${settings.emailDomainRestrictionEnabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
          <div className="p-8 space-y-6">
            {/* Current allowed domains */}
            <div>
              <label className={labelClasses}>Currently Allowed Domains</label>
              <div className="flex flex-wrap gap-2 min-h-[48px] p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl">
                {(settings.allowedEmailDomains || []).length === 0 ? (
                  <span className="text-slate-400 dark:text-slate-500 text-sm italic">No domains added yet. Add domains below.</span>
                ) : (
                  (settings.allowedEmailDomains || []).map(domain => (
                    <span
                      key={domain}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-sm font-medium rounded-full shadow-sm hover:shadow-md transition-shadow"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      {domain}
                      <button
                        type="button"
                        onClick={() => removeDomain(domain)}
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
                        addDomain(newDomain);
                      }
                    }}
                    className={`${inputClasses} pl-9`}
                    placeholder="example.com"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => addDomain(newDomain)}
                  className="px-5 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/20 transition-all active:scale-95 flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Add
                </button>
              </div>
            </div>

            {/* Suggested domains */}
            {suggestedDomains.length > 0 && (
              <div>
                <label className={labelClasses}>Quick Add Popular Providers</label>
                <div className="flex flex-wrap gap-2">
                  {suggestedDomains.map(domain => (
                    <button
                      key={domain}
                      type="button"
                      onClick={() => addDomain(domain)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 text-sm font-medium rounded-full border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all"
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
              <Shield className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800 dark:text-amber-200">
                <p className="font-semibold mb-1">How it works</p>
                <p className="text-amber-700 dark:text-amber-300">When enabled, users can only register or update their profile with email addresses from the domains listed above. This helps prevent fake or temporary email signups.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-primary-500/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="w-5 h-5" />
          {saving ? 'Saving...' : 'Save All Settings'}
        </button>
      </div>
    </div>
  );
};

export default AdminSettings;
