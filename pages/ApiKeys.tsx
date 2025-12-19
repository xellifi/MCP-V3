import React, { useEffect, useState } from 'react';
import { Workspace, IntegrationSettings } from '../types';
import { api } from '../services/api';
import { Key, Save, Eye, EyeOff, Bot } from 'lucide-react';
import { useToast } from '../context/ToastContext';

interface ApiKeysProps {
  workspace: Workspace;
}

const ApiKeys: React.FC<ApiKeysProps> = ({ workspace }) => {
  const [settings, setSettings] = useState<IntegrationSettings>({
    workspaceId: workspace.id,
    openaiApiKey: '',
    geminiApiKey: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showOpenAi, setShowOpenAi] = useState(false);
  const [showGemini, setShowGemini] = useState(false);
  const toast = useToast();

  useEffect(() => {
    loadSettings();
  }, [workspace.id]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await api.workspace.getIntegrations(workspace.id);
      setSettings(data);
    } catch (error) {
      toast.error("Failed to load API keys.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.workspace.saveIntegrations(workspace.id, settings);
      toast.success('API keys saved successfully for this workspace.');
    } catch (error) {
      toast.error('Failed to save API keys.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  const inputClasses = "w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none transition-all placeholder-slate-400 dark:placeholder-slate-500 font-mono text-sm";
  const labelClasses = "block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2";

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-12 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">API Keys</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg">Configure AI provider keys for this workspace ({workspace.name}).</p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-card dark:shadow-none border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center gap-4 bg-slate-50/50 dark:bg-slate-950/50">
          <div className="p-3 bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 rounded-xl shadow-sm">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-lg">AI Providers</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">These keys allow your automation flows to use AI agents.</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="p-8 space-y-8">

          {/* OpenAI */}
          <div>
            <label className={labelClasses}>OpenAI API Key</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Key className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type={showOpenAi ? "text" : "password"}
                value={settings.openaiApiKey}
                onChange={e => setSettings({ ...settings, openaiApiKey: e.target.value })}
                className={`${inputClasses} pl-12 pr-12`}
                placeholder="sk-..."
              />
              <button
                type="button"
                onClick={() => setShowOpenAi(!showOpenAi)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                tabIndex={-1}
              >
                {showOpenAi ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Used for GPT-4 and GPT-3.5 Turbo models.</p>
          </div>

          {/* Gemini */}
          <div>
            <label className={labelClasses}>Google Gemini API Key</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Key className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type={showGemini ? "text" : "password"}
                value={settings.geminiApiKey}
                onChange={e => setSettings({ ...settings, geminiApiKey: e.target.value })}
                className={`${inputClasses} pl-12 pr-12`}
                placeholder="AIza..."
              />
              <button
                type="button"
                onClick={() => setShowGemini(!showGemini)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                tabIndex={-1}
              >
                {showGemini ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Used for Gemini Pro and Flash models.</p>
          </div>

          <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-primary-500/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-5 h-5" />
              {saving ? 'Saving...' : 'Save Keys'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ApiKeys;