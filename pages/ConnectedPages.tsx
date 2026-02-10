import React, { useEffect, useState } from 'react';
import { Workspace, ConnectedPage } from '../types';
import { api } from '../services/api';
import { Facebook, Instagram, RefreshCw, ExternalLink, CheckCircle, Bot, Users, AlertTriangle, LayoutGrid, List, ChevronLeft, ChevronRight, Info } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import { Link } from 'react-router-dom';

interface ConnectedPagesProps {
  workspace: Workspace;
}

type FilterType = 'active' | 'inactive' | 'all';

const ConnectedPages: React.FC<ConnectedPagesProps> = ({ workspace }) => {
  const { isDark } = useTheme();
  const [pages, setPages] = useState<ConnectedPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const [hasConnection, setHasConnection] = useState<boolean | null>(null); // null = loading
  const itemsPerPage = 10; // 5 columns * 2 rows
  const toast = useToast();

  useEffect(() => {
    loadPages();
    checkConnection();
  }, [workspace.id]);

  // Check if Facebook is connected
  const checkConnection = async () => {
    try {
      const connections = await api.workspace.getConnections(workspace.id);
      setHasConnection(connections.length > 0);
    } catch (error) {
      console.error('Failed to check connections:', error);
      setHasConnection(false);
    }
  };

  const loadPages = async () => {
    setLoading(true);
    try {
      const data = await api.workspace.getConnectedPages(workspace.id);
      setPages(data);

      // Smart default: show 'active' tab if user has active pages, otherwise show 'inactive'
      if (filter === null) {
        const hasActivePages = data.some(p => p.isAutomationEnabled);
        setFilter(hasActivePages ? 'active' : 'inactive');
      }
    } catch (error) {
      toast.error("Failed to load connected pages.");
      if (filter === null) setFilter('inactive'); // Default to inactive on error
    } finally {
      setLoading(false);
    }
  };

  // Reset pagination when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, viewMode]);

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

  const handleSubscribeToWebhooks = async (page: ConnectedPage) => {
    toast.info(`Subscribing ${page.name} to webhooks...`);
    try {
      // Get the page access token from the database
      const { supabase } = await import('../lib/supabase');
      const { data: pageData } = await supabase
        .from('connected_pages')
        .select('page_access_token')
        .eq('id', page.id)
        .single();

      if (!pageData?.page_access_token) {
        toast.error('No access token found for this page. Please reconnect your Facebook account.');
        return;
      }

      // Subscribe the page to webhooks
      const subscribeResponse = await fetch(
        `https://graph.facebook.com/v18.0/${page.pageId}/subscribed_apps`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subscribed_fields: ['feed', 'messages', 'messaging_postbacks', 'message_deliveries', 'message_reads'],
            access_token: pageData.page_access_token
          })
        }
      );
      const subscribeResult = await subscribeResponse.json();

      if (subscribeResult.success) {
        toast.success(`${page.name} is now subscribed to webhooks! Automations will work.`);
      } else {
        console.error('Subscribe error:', subscribeResult);
        toast.error(`Failed to subscribe: ${subscribeResult.error?.message || 'Unknown error'}`);
      }
    } catch (error: any) {
      console.error('Subscribe webhook error:', error);
      toast.error(`Error subscribing to webhooks: ${error.message}`);
    }
  };

  const formatFollowers = (num: number | null | undefined) => {
    if (!num || num === 0) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  if (loading) return (
    <div className="flex items-center justify-center p-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
    </div>
  );

  // Filter pages based on selected filter
  const filteredPages = pages.filter(page => {
    if (filter === null) return true; // Show all while determining default
    if (filter === 'active') return page.isAutomationEnabled;
    if (filter === 'inactive') return !page.isAutomationEnabled;
    return true; // 'all'
  });

  // Pagination Logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredPages.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredPages.length / itemsPerPage);

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    // Scroll to top of grid
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className={`text-2xl md:text-4xl font-bold tracking-tight mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>Pages</h1>
          <p className={`text-sm md:text-lg ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Manage bot automations for your Facebook Pages and Instagram Accounts</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => { loadPages(); toast.info("Refreshing page list..."); }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-colors shadow-lg border ${isDark
              ? 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300 hover:text-white'
              : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900'
              }`}
          >
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {/* View Toggle */}
          <div className={`flex p-1 rounded-lg border ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200 shadow-sm'}`}>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-all ${viewMode === 'list'
                ? 'bg-indigo-500 text-white shadow-lg'
                : isDark ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                }`}
              title="List View"
            >
              <List className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md transition-all ${viewMode === 'grid'
                ? 'bg-indigo-500 text-white shadow-lg'
                : isDark ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                }`}
              title="Grid View"
            >
              <LayoutGrid className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Connection Tip Banner */}
      {hasConnection === false && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${isDark
          ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
          : 'bg-amber-50 border-amber-200 text-amber-700'
          }`}>
          <Info className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm">
            <span className="font-medium">No Facebook profile connected.</span>
            {' To see your pages here, '}
            <Link
              to="/connections"
              className={`font-bold underline hover:no-underline ${isDark ? 'text-amber-300 hover:text-amber-200' : 'text-amber-800 hover:text-amber-900'
                }`}
            >
              connect your Facebook profile
            </Link>
            {' first.'}
          </p>
        </div>
      )}
      {/* Filter Tabs */}
      <div className={`flex gap-2 border-b ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
        <button
          onClick={() => setFilter('active')}
          className={`px-4 py-3 font-semibold transition-all border-b-2 hover:text-indigo-400 ${filter === 'active'
            ? 'border-indigo-500 text-indigo-500'
            : `border-transparent ${isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700'}`
            }`}
        >
          Active <span className={`ml-1.5 px-2 py-0.5 rounded-full text-xs ${filter === 'active' ? 'bg-indigo-500/10 text-indigo-500' : isDark ? 'bg-white/5 text-slate-500' : 'bg-slate-100 text-slate-500'}`}>{pages.filter(p => p.isAutomationEnabled).length}</span>
        </button>
        <button
          onClick={() => setFilter('inactive')}
          className={`px-4 py-3 font-semibold transition-all border-b-2 hover:text-indigo-400 ${filter === 'inactive'
            ? 'border-indigo-500 text-indigo-500'
            : `border-transparent ${isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700'}`
            }`}
        >
          Inactive <span className={`ml-1.5 px-2 py-0.5 rounded-full text-xs ${filter === 'inactive' ? 'bg-indigo-500/10 text-indigo-500' : isDark ? 'bg-white/5 text-slate-500' : 'bg-slate-100 text-slate-500'}`}>{pages.filter(p => !p.isAutomationEnabled).length}</span>
        </button>
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-3 font-semibold transition-all border-b-2 hover:text-indigo-400 ${filter === 'all'
            ? 'border-indigo-500 text-indigo-500'
            : `border-transparent ${isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700'}`
            }`}
        >
          All <span className={`ml-1.5 px-2 py-0.5 rounded-full text-xs ${filter === 'all' ? 'bg-indigo-500/10 text-indigo-500' : isDark ? 'bg-white/5 text-slate-500' : 'bg-slate-100 text-slate-500'}`}>{pages.length}</span>
        </button>
      </div>

      {viewMode === 'list' ? (
        <div className={`rounded-2xl overflow-hidden border ${isDark ? 'glass-panel border-white/10' : 'bg-white border-gray-200 shadow-sm'}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className={`text-xs uppercase font-bold border-b ${isDark
                ? 'bg-white/5 text-slate-400 border-white/10'
                : 'bg-slate-50 text-slate-500 border-slate-200'
                }`}>
                <tr>
                  <th className="px-6 py-4">Page</th>
                  <th className="px-6 py-4">ID</th>
                  <th className="px-6 py-4">Followers</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-white/5' : 'divide-slate-100'}`}>
                {currentItems.map(page => (
                  <tr key={page.id} className={`transition-colors group ${isDark ? 'hover:bg-white/5' : 'hover:bg-slate-50'}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className={`relative flex-shrink-0 h-10 w-16 flex items-center justify-start ${page.instagram ? 'pl-0' : 'pl-0'}`}>
                          {/* Main Facebook Page Image */}
                          <div className="relative z-20">
                            <img
                              src={page.pageImageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(page.name)}&background=1877F2&color=fff`}
                              alt={page.name}
                              className={`w-10 h-10 rounded-full border-2 object-cover ${isDark ? 'border-slate-800' : 'border-white'}`}
                            />
                            <div className={`absolute -bottom-1 -right-1 rounded-full p-0.5 shadow-sm z-30 ring-1 ${isDark ? 'bg-slate-900 ring-slate-900' : 'bg-white ring-white'}`}>
                              <div className="bg-[#1877F2] text-white rounded-full p-0.5 flex items-center justify-center">
                                <Facebook className="w-2 h-2 fill-current" />
                              </div>
                            </div>
                          </div>

                          {/* Instagram Image */}
                          {page.instagram && (
                            <div className="absolute left-6 z-10">
                              <img
                                src={page.instagram.imageUrl}
                                alt={page.instagram.username}
                                className={`w-10 h-10 rounded-full border-2 object-cover ${isDark ? 'border-slate-800' : 'border-white'}`}
                              />
                              <div className={`absolute -bottom-1 -right-1 rounded-full p-0.5 shadow-sm z-30 ring-1 ${isDark ? 'bg-slate-900 ring-slate-900' : 'bg-white ring-white'}`}>
                                <div className="bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500 text-white rounded-full p-0.5 flex items-center justify-center">
                                  <Instagram className="w-2 h-2" />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col">
                          <span className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{page.name}</span>
                          {page.instagram && (
                            <span className="text-xs text-slate-500 font-medium">@{page.instagram.username}</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`font-mono text-xs px-2 py-1 rounded ${isDark ? 'bg-black/20 text-slate-400' : 'bg-slate-100 text-slate-600'}`}>
                        {page.pageId}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 text-sm" title="Facebook Followers">
                          <Facebook className={`w-3 h-3 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                          <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>{formatFollowers(page.pageFollowers)}</span>
                        </div>
                        {page.instagram && (
                          <div className="flex items-center gap-1.5 text-sm" title="Instagram Followers">
                            <Instagram className={`w-3 h-3 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                            <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>{formatFollowers(page.instagram.followers)}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleToggleAutomation(page.id, page.isAutomationEnabled)}
                          disabled={toggling === page.id || page.status !== 'CONNECTED'}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-all focus:outline-none ring-0 focus:ring-0 shadow-none ${page.isAutomationEnabled ? 'bg-emerald-500' : 'bg-slate-300'
                            } ${page.status !== 'CONNECTED' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                          title={page.isAutomationEnabled ? 'Disable Automation' : 'Enable Automation'}
                        >
                          <span
                            className={`${page.isAutomationEnabled ? 'translate-x-[18px]' : 'translate-x-0.5'
                              } inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-none border-none`}
                          />
                        </button>

                        {page.status === 'CONNECTED' ? (
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20`}>
                            Active
                          </span>
                        ) : (
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold bg-red-500/10 text-red-500 border border-red-500/20`}>
                            Disconnected
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleSubscribeToWebhooks(page)}
                          className={`p-2 rounded-lg transition-colors border ${isDark
                            ? 'text-slate-400 hover:text-indigo-400 hover:bg-white/5 border-transparent hover:border-white/10'
                            : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 border-transparent hover:border-indigo-100'
                            }`}
                          title="Subscribe to Webhooks"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                        <a
                          href={`https://facebook.com/${page.pageId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`p-2 rounded-lg transition-colors border ${isDark
                            ? 'text-slate-400 hover:text-indigo-400 hover:bg-white/5 border-transparent hover:border-white/10'
                            : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 border-transparent hover:border-indigo-100'
                            }`}
                          title="View on Facebook"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}

                {currentItems.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-20 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4 border border-white/10">
                          <Bot className="w-8 h-8 text-slate-500" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-1">No pages found</h3>
                        <p className="max-w-xs mx-auto">Try adjusting your filters to see more results.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {currentItems.map(page => (
            <div key={page.id} className={`relative rounded-2xl border overflow-hidden group hover:shadow-[0_0_30px_rgba(99,102,241,0.2)] transition-all duration-300 ease-out isolate ${isDark
              ? 'glass-panel border-white/10 hover:border-indigo-500/50'
              : 'bg-white border-gray-200 shadow-sm hover:border-indigo-400 hover:shadow-xl'
              }`}>
              {/* Mobile/Grid Open Page Button (Top Right) */}
              <a
                href={`https://facebook.com/${page.pageId}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`block absolute top-3 right-3 p-2 rounded-full z-10 transition-colors ${isDark ? 'bg-white/10 text-slate-300 hover:text-white hover:bg-white/20' : 'bg-slate-100 text-slate-500 hover:text-slate-900 hover:bg-slate-200'
                  }`}
                title="Open Page"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
              <div className={`p-4 md:p-6 flex flex-col items-center gap-4 md:gap-6`}>

                {/* Overlapping Images Section */}
                <div className={`relative flex-shrink-0 h-28 flex items-center justify-start pl-2 ${page.instagram ? 'w-48' : 'w-28'}`}>

                  {/* Main Facebook Page Image - Z-20 to stay on top of IG if overlapping left-to-right */}
                  <div className="relative z-20 transition-transform group-hover:scale-105 duration-300">
                    <img
                      src={page.pageImageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(page.name)}&background=1877F2&color=fff`}
                      alt={page.name}
                      className={`w-24 h-24 rounded-full border-4 shadow-xl object-cover ${isDark ? 'border-slate-900 bg-slate-800' : 'border-white bg-gray-100'}`}
                    />
                    {/* FB Badge */}
                    <div className={`absolute bottom-0 right-0 rounded-full p-1 shadow-md z-30 ring-2 ${isDark ? 'bg-slate-900 ring-slate-900' : 'bg-white ring-white'}`}>
                      <div className="bg-[#1877F2] text-white rounded-full p-1.5 flex items-center justify-center">
                        <Facebook className="w-4 h-4 fill-current" />
                      </div>
                    </div>
                  </div>

                  {/* Overlapping Instagram Image - Z-10 to sit behind FB */}
                  {page.instagram && (
                    <div className="absolute left-20 z-10 transition-transform group-hover:scale-105 duration-300 delay-75">
                      <img
                        src={page.instagram.imageUrl}
                        alt={page.instagram.username}
                        className={`w-24 h-24 rounded-full border-4 shadow-xl object-cover ${isDark ? 'border-slate-900 bg-slate-800' : 'border-white bg-gray-100'}`}
                      />
                      {/* IG Badge */}
                      <div className={`absolute bottom-0 right-0 rounded-full p-1 shadow-md z-30 ring-2 ${isDark ? 'bg-slate-900 ring-slate-900' : 'bg-white ring-white'}`}>
                        <div className="bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500 text-white rounded-full p-1.5 flex items-center justify-center">
                          <Instagram className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Info Section */}
                <div className={`flex-1 text-center min-w-0 overflow-hidden w-full`}>
                  <div className={`flex flex-col gap-2 mb-1`}>
                    <h3 className={`text-lg md:text-xl font-bold truncate max-w-full ${isDark ? 'text-white' : 'text-slate-900'}`}>{page.name}</h3>
                    {page.instagram && (
                      <span className="text-sm md:text-base font-medium text-slate-500 truncate">@{page.instagram.username}</span>
                    )}
                  </div>

                  <div className={`flex items-center justify-center gap-6 text-sm mt-3 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    <div className="flex items-center gap-2" title="Facebook Followers">
                      <div className={`p-1.5 rounded-full ${isDark ? 'bg-white/5' : 'bg-slate-100'}`}>
                        <Users className={`w-4 h-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
                      </div>
                      <div>
                        <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>{formatFollowers(page.pageFollowers)}</span>
                        <span className="text-xs ml-1 font-medium text-slate-500">followers</span>
                      </div>
                    </div>
                    {page.instagram && (
                      <div className="flex items-center gap-2" title="Instagram Followers">
                        <div className={`p-1.5 rounded-full ${isDark ? 'bg-white/5' : 'bg-slate-100'}`}>
                          <Users className={`w-4 h-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
                        </div>
                        <div>
                          <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>{formatFollowers(page.instagram.followers)}</span>
                          <span className="text-xs ml-1 font-medium text-slate-500">followers</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Automation Toggle & Status */}
                <div className={`flex flex-col items-center w-full gap-3`}>
                  <div className={`flex flex-col items-center gap-2 p-2.5 rounded-xl border w-full justify-center ${isDark ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-200'
                    }`}>
                    <span className={`text-xs font-semibold text-center ${page.isAutomationEnabled ? 'text-indigo-500' : 'text-slate-500'}`}>
                      {page.isAutomationEnabled ? 'Automation On' : 'Automation Off'}
                    </span>
                    <button
                      onClick={() => handleToggleAutomation(page.id, page.isAutomationEnabled)}
                      disabled={toggling === page.id || page.status !== 'CONNECTED'}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all focus:outline-none ring-0 focus:ring-0 shadow-none ${page.isAutomationEnabled ? 'bg-emerald-500' : 'bg-slate-300'
                        } ${page.status !== 'CONNECTED' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-95'}`}
                    >
                      <span
                        className={`${page.isAutomationEnabled ? 'translate-x-[22px]' : 'translate-x-0.5'
                          } inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow-none border-none`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center gap-2 mt-1">
                    {page.status === 'CONNECTED' ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-emerald-500 px-2 py-0.5 rounded-full">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-red-500 px-2 py-0.5 rounded-full">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Disconnected
                      </span>
                    )}
                  </div>
                </div>

              </div>

              <div className={`px-4 md:px-6 py-3 border-t flex flex-col justify-between items-center gap-3 text-xs font-medium ${isDark ? 'bg-white/5 border-white/5 text-slate-400' : 'bg-slate-50 border-gray-100 text-slate-500'
                }`}>
                <div className={`flex gap-4 w-full`}>
                  <span className={`font-mono px-2 py-0.5 rounded truncate w-full text-center ${isDark ? 'bg-black/20 text-slate-500' : 'bg-slate-200 text-slate-600'
                    }`}>ID: {page.pageId}</span>
                </div>
                <div className={`flex gap-3 w-full justify-center`}>
                  <button
                    onClick={() => handleSubscribeToWebhooks(page)}
                    className="flex items-center gap-1.5 text-indigo-500 hover:text-indigo-600 transition-colors group/sub"
                    title="Subscribe this page to receive webhooks for automations"
                  >
                    <RefreshCw className="w-3.5 h-3.5 group-hover/sub:rotate-180 transition-transform duration-500" />
                    Subscribe to Webhooks
                  </button>
                </div>
              </div>
            </div>
          ))}
          {filteredPages.length === 0 && (
            <div className={`py-20 text-center rounded-3xl border border-dashed w-full col-span-full ${isDark ? 'glass-panel border-white/10' : 'bg-white border-slate-300'
              }`}>
              <div className="w-20 h-20 bg-indigo-500/10 text-indigo-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                <Bot className="w-10 h-10" />
              </div>
              <h3 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {filter === 'active' && 'No active pages'}
                {filter === 'inactive' && 'No inactive pages'}
                {filter === 'all' && 'No pages found'}
              </h3>
              <p className={`max-w-sm mx-auto mb-8 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                {filter === 'active' && 'Enable automation on your pages to see them here.'}
                {filter === 'inactive' && 'All your pages have automation enabled!'}
                {filter === 'all' && 'Go to Connections to link your Facebook Profile, then pages will appear here.'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className={`flex items-center justify-between border-t pt-4 ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            Showing <span className={`font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>{indexOfFirstItem + 1}</span> to <span className={`font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>{Math.min(indexOfLastItem, filteredPages.length)}</span> of <span className={`font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>{filteredPages.length}</span> results
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className={`p-2 rounded-lg border disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${isDark
                ? 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                : 'bg-white border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                }`}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${currentPage === page
                    ? 'bg-indigo-500 text-white'
                    : isDark ? 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                >
                  {page}
                </button>
              ))}
            </div>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={`p-2 rounded-lg border disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${isDark
                ? 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                : 'bg-white border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                }`}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConnectedPages;