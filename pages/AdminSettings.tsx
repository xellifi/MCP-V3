import React, { useEffect, useState } from 'react';
import { User, UserRole, AdminSettings as AdminSettingsType } from '../types';
import { api } from '../services/api';
import { Lock, Save, ShieldAlert, Eye, EyeOff } from 'lucide-react';
import { useToast } from '../context/ToastContext';

interface AdminSettingsProps {
  user: User;
}

const AdminSettings: React.FC<AdminSettingsProps> = ({ user }) => {
  const [settings, setSettings] = useState<AdminSettingsType>({
    facebookAppId: '',
    facebookAppSecret: '',
    facebookVerifyToken: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
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

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Global Admin Settings</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg">Configure the Global Facebook App used by all workspaces.</p>
      </div>

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

          <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-primary-500/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-5 h-5" />
              {saving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminSettings;