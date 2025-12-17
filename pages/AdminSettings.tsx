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
        <h2 className="text-xl font-bold text-slate-900">Access Denied</h2>
        <p>You do not have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Global Admin Settings</h1>
        <p className="text-slate-500 mt-1">Configure the Global Facebook App used by all workspaces.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center gap-3">
          <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">Facebook App Configuration</h3>
            <p className="text-xs text-slate-500">These credentials handle OAuth and Webhooks for the entire platform.</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">App ID</label>
              <input 
                type="text" 
                value={settings.facebookAppId}
                onChange={e => setSettings({...settings, facebookAppId: e.target.value})}
                className="w-full border border-slate-200 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="1234567890"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">App Secret</label>
              <div className="relative">
                <input 
                  type={showSecret ? "text" : "password"}
                  value={settings.facebookAppSecret}
                  onChange={e => setSettings({...settings, facebookAppSecret: e.target.value})}
                  className="w-full border border-slate-200 rounded-lg pl-4 pr-10 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                  placeholder="e.g. 8923489234..."
                />
                <button 
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">Webhook Verify Token</label>
              <input 
                type="text" 
                value={settings.facebookVerifyToken}
                onChange={e => setSettings({...settings, facebookVerifyToken: e.target.value})}
                className="w-full border border-slate-200 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none font-mono text-slate-600"
                placeholder="random_secure_string"
              />
              <p className="mt-2 text-xs text-slate-400">
                Use this token when configuring the Webhook product in the Facebook Developer Portal.
              </p>
            </div>
            
            <div className="md:col-span-2">
               <label className="block text-sm font-medium text-slate-700 mb-2">Webhook URL (Read Only)</label>
               <div className="bg-slate-100 border border-slate-200 text-slate-500 px-4 py-2.5 rounded-lg font-mono text-sm">
                 https://api.yourdomain.com/webhooks/meta
               </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button 
              type="submit" 
              disabled={saving}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium shadow-sm shadow-blue-200 transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminSettings;