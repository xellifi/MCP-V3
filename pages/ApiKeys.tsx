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
      return <div className="p-8 text-center text-slate-500">Loading settings...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">API Keys</h1>
        <p className="text-slate-500 mt-1">Configure AI provider keys for this workspace ({workspace.name}).</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center gap-3">
          <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">AI Providers</h3>
            <p className="text-xs text-slate-500">These keys allow your automation flows to use AI agents.</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-6">
          
          {/* OpenAI */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">OpenAI API Key</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Key className="h-4 w-4 text-slate-400" />
              </div>
              <input 
                type={showOpenAi ? "text" : "password"}
                value={settings.openaiApiKey}
                onChange={e => setSettings({...settings, openaiApiKey: e.target.value})}
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
            <p className="mt-1 text-xs text-slate-400">Used for GPT-4 and GPT-3.5 Turbo models.</p>
          </div>

          {/* Gemini */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Google Gemini API Key</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Key className="h-4 w-4 text-slate-400" />
              </div>
              <input 
                type={showGemini ? "text" : "password"}
                value={settings.geminiApiKey}
                onChange={e => setSettings({...settings, geminiApiKey: e.target.value})}
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
             <p className="mt-1 text-xs text-slate-400">Used for Gemini Pro and Flash models.</p>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button 
              type="submit" 
              disabled={saving}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium shadow-sm shadow-blue-200 transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Keys'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ApiKeys;