import React, { useEffect, useState } from 'react';
import { Workspace, ConnectedPage } from '../types';
import { api } from '../services/api';
import { Facebook, Instagram, RefreshCw, ExternalLink, CheckCircle, Bot, Users, AlertTriangle } from 'lucide-react';
import { useToast } from '../context/ToastContext';

interface ConnectedPagesProps {
  workspace: Workspace;
}

type FilterType = 'active' | 'inactive' | 'all';

const ConnectedPages: React.FC<ConnectedPagesProps> = ({ workspace }) => {
  const [pages, setPages] = useState<ConnectedPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('active');
  const toast = useToast();

  useEffect(() => {
    loadPages();
  }, [workspace.id]);

  const loadPages = async () => {
    setLoading(true);
    try {
      const data = await api.workspace.getConnectedPages(workspace.id);
      setPages(data);
    } catch (error) {
      toast.error("Failed to load connected pages.");
    } finally {
      setLoading(false);
    }
  };

  const fetchPages = async () => {
    setLoading(true);
    toast.info("Fetching pages from Facebook...");
    try {
      const fetchedPages = await api.workspace.fetchPagesFromFacebook(workspace.id);
      if (fetchedPages.length > 0) {
        setPages(fetchedPages);
        toast.success(`Successfully imported ${fetchedPages.length} page(s) from Facebook!`);
      } else {
        toast.warning("No pages found. Make sure you have connected your Facebook profile first.");
      }
    } catch (error: any) {
      console.error("Failed to fetch pages:", error);
      toast.error(`Failed to fetch pages: ${error.message || 'Please try again'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAutomation = async (pageId: string, currentState: boolean) => {
    setToggling(pageId);
    try {
      await api.workspace.togglePageAutomation(pageId, !currentState);
      // Optimistic update
      setPages(prev => prev.map(p => p.id === pageId ? { ...p, isAutomationEnabled: !currentState } : p));
      toast.success(`Automation ${!currentState ? 'enabled' : 'disabled'} successfully.`);
    } catch (error) {
      console.error("Failed to toggle automation", error);
      toast.error("Failed to update automation settings.");
    } finally {
      setToggling(null);
    }
  };

  const formatFollowers = (num: number | null | undefined) => {
    if (!num || num === 0) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading connected pages...</div>;

  // Filter pages based on selected filter
  const filteredPages = pages.filter(page => {
    if (filter === 'active') return page.isAutomationEnabled;
    if (filter === 'inactive') return !page.isAutomationEnabled;
    return true; // 'all'
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Pages</h1>
          <p className="text-slate-400 mt-1">Manage bot automations for your Facebook Pages and Instagram Accounts</p>
        </div>
        <button
          onClick={() => { loadPages(); toast.info("Refreshing page list..."); }}
          className="flex items-center gap-2 bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 px-4 py-2 rounded-lg font-medium transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh List
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-slate-700">
        <button
          onClick={() => setFilter('active')}
          className={`px-4 py-2 font-medium transition-colors border-b-2 ${filter === 'active'
            ? 'border-blue-500 text-blue-400'
            : 'border-transparent text-slate-400 hover:text-slate-300'
            }`}
        >
          Active ({pages.filter(p => p.isAutomationEnabled).length})
        </button>
        <button
          onClick={() => setFilter('inactive')}
          className={`px-4 py-2 font-medium transition-colors border-b-2 ${filter === 'inactive'
            ? 'border-blue-500 text-blue-400'
            : 'border-transparent text-slate-400 hover:text-slate-300'
            }`}
        >
          Inactive ({pages.filter(p => !p.isAutomationEnabled).length})
        </button>
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 font-medium transition-colors border-b-2 ${filter === 'all'
            ? 'border-blue-500 text-blue-400'
            : 'border-transparent text-slate-400 hover:text-slate-300'
            }`}
        >
          All ({pages.length})
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filteredPages.map(page => (
          <div key={page.id} className="bg-slate-800/50 rounded-xl shadow-lg border border-slate-700 overflow-hidden backdrop-blur-sm">
            <div className="p-6 flex flex-col md:flex-row items-center gap-6">

              {/* Overlapping Images Section */}
              <div className={`relative flex-shrink-0 h-28 flex items-center justify-start pl-2 ${page.instagram ? 'w-48' : 'w-28'}`}>

                {/* Main Facebook Page Image - Z-20 to stay on top of IG if overlapping left-to-right */}
                <div className="relative z-20">
                  <img
                    src={page.pageImageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(page.name)}&background=1877F2&color=fff`}
                    alt={page.name}
                    className="w-24 h-24 rounded-full border-4 border-slate-800 shadow-md object-cover bg-slate-700"
                  />
                  {/* FB Badge */}
                  <div className="absolute bottom-0 right-0 bg-slate-800 rounded-full p-1 shadow-md z-30">
                    <div className="bg-[#1877F2] text-white rounded-full p-1.5 flex items-center justify-center">
                      <Facebook className="w-4 h-4 fill-current" />
                    </div>
                  </div>
                </div>

                {/* Overlapping Instagram Image - Z-10 to sit behind FB */}
                {page.instagram && (
                  <div className="absolute left-20 z-10">
                    <img
                      src={page.instagram.imageUrl}
                      alt={page.instagram.username}
                      className="w-24 h-24 rounded-full border-4 border-slate-800 shadow-md object-cover bg-slate-700"
                    />
                    {/* IG Badge */}
                    <div className="absolute bottom-0 right-0 bg-slate-800 rounded-full p-1 shadow-md z-30">
                      <div className="bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500 text-white rounded-full p-1.5 flex items-center justify-center">
                        <Instagram className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Info Section */}
              <div className="flex-1 text-center md:text-left min-w-0">
                <div className="flex flex-col md:flex-row md:items-center gap-2 mb-1">
                  <h3 className="text-xl font-bold text-slate-100 truncate">{page.name}</h3>
                  {page.instagram && (
                    <span className="hidden md:inline text-slate-600 mx-1">|</span>
                  )}
                  {page.instagram && (
                    <span className="text-base font-medium text-slate-400 truncate">@{page.instagram.username}</span>
                  )}
                </div>

                <div className="flex items-center justify-center md:justify-start gap-6 text-sm text-slate-400 mt-2">
                  <div className="flex items-center gap-2" title="Facebook Followers">
                    <div className="p-1 bg-slate-700 rounded-full">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                    <div>
                      <span className="font-bold text-slate-300">{formatFollowers(page.pageFollowers)}</span>
                      <span className="text-xs ml-1">followers</span>
                    </div>
                  </div>
                  {page.instagram && (
                    <div className="flex items-center gap-2" title="Instagram Followers">
                      <div className="p-1 bg-slate-700 rounded-full">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                      <div>
                        <span className="font-bold text-slate-300">{formatFollowers(page.instagram.followers)}</span>
                        <span className="text-xs ml-1">followers</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Automation Toggle & Status */}
              <div className="flex flex-col items-center md:items-end gap-3 min-w-[180px]">
                <div className="flex items-center gap-3 bg-slate-700/50 p-2 rounded-lg border border-slate-600">
                  <span className={`text-sm font-medium ${page.isAutomationEnabled ? 'text-slate-100' : 'text-slate-400'}`}>
                    {page.isAutomationEnabled ? 'Automation On' : 'Automation Off'}
                  </span>
                  <button
                    onClick={() => handleToggleAutomation(page.id, page.isAutomationEnabled)}
                    disabled={toggling === page.id || page.status !== 'CONNECTED'}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900 ${page.isAutomationEnabled ? 'bg-green-500' : 'bg-slate-500'
                      } ${page.status !== 'CONNECTED' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <span
                      className={`${page.isAutomationEnabled ? 'translate-x-6' : 'translate-x-1'
                        } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                    />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  {page.status === 'CONNECTED' ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-400">
                      <CheckCircle className="w-3.5 h-3.5" />
                      Connection Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-400">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Disconnected
                    </span>
                  )}
                </div>
              </div>

            </div>

            <div className="bg-slate-900/50 px-6 py-3 border-t border-slate-700 flex justify-between items-center text-xs text-slate-500">
              <div className="flex gap-4">
                <span className="font-mono">Page ID: {page.pageId}</span>
              </div>
              <div className="flex gap-2">
                <button className="flex items-center gap-1 hover:text-blue-400 transition-colors" title="View on Facebook">
                  <ExternalLink className="w-3 h-3" />
                  Open Page
                </button>
              </div>
            </div>
          </div>
        ))}

        {filteredPages.length === 0 && (
          <div className="py-16 text-center bg-slate-800/50 rounded-xl border-2 border-dashed border-slate-700">
            <div className="w-16 h-16 bg-blue-900/30 text-blue-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bot className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-100">
              {filter === 'active' && 'No active pages'}
              {filter === 'inactive' && 'No inactive pages'}
              {filter === 'all' && 'No pages found'}
            </h3>
            <p className="text-slate-400 max-w-sm mx-auto mt-2 mb-6">
              {filter === 'active' && 'Enable automation on your pages to see them here.'}
              {filter === 'inactive' && 'All your pages have automation enabled!'}
              {filter === 'all' && 'Go to Connections to link your Facebook Profile, then pages will appear here.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConnectedPages;