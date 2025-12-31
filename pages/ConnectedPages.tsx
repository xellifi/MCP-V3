import React, { useEffect, useState } from 'react';
import { Workspace, ConnectedPage } from '../types';
import { api } from '../services/api';
import { Facebook, Instagram, RefreshCw, ExternalLink, CheckCircle, Bot, Users, AlertTriangle, LayoutGrid, List, ChevronLeft, ChevronRight } from 'lucide-react';
import { useToast } from '../context/ToastContext';

interface ConnectedPagesProps {
  workspace: Workspace;
}

type FilterType = 'active' | 'inactive' | 'all';

const ConnectedPages: React.FC<ConnectedPagesProps> = ({ workspace }) => {
  const [pages, setPages] = useState<ConnectedPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10; // 5 columns * 2 rows
  const toast = useToast();

  useEffect(() => {
    loadPages();
  }, [workspace.id]);

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
        toast.success(`✓ ${page.name} is now subscribed to webhooks! Automations will work.`);
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
          <h1 className="text-2xl md:text-4xl font-bold text-white tracking-tight mb-2">Pages</h1>
          <p className="text-slate-400 text-sm md:text-lg">Manage bot automations for your Facebook Pages and Instagram Accounts</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => { loadPages(); toast.info("Refreshing page list..."); }}
            className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white px-5 py-2.5 rounded-xl font-medium transition-colors shadow-lg"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {/* View Toggle */}
          <div className="flex bg-white/5 p-1 rounded-lg border border-white/10">
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
              title="List View"
            >
              <List className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
              title="Grid View"
            >
              <LayoutGrid className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-white/10">
        <button
          onClick={() => setFilter('active')}
          className={`px-4 py-3 font-semibold transition-all border-b-2 hover:text-indigo-400 ${filter === 'active'
            ? 'border-indigo-500 text-indigo-400'
            : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
        >
          Active <span className={`ml-1.5 px-2 py-0.5 rounded-full text-xs ${filter === 'active' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-white/5 text-slate-500'}`}>{pages.filter(p => p.isAutomationEnabled).length}</span>
        </button>
        <button
          onClick={() => setFilter('inactive')}
          className={`px-4 py-3 font-semibold transition-all border-b-2 hover:text-indigo-400 ${filter === 'inactive'
            ? 'border-indigo-500 text-indigo-400'
            : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
        >
          Inactive <span className={`ml-1.5 px-2 py-0.5 rounded-full text-xs ${filter === 'inactive' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-white/5 text-slate-500'}`}>{pages.filter(p => !p.isAutomationEnabled).length}</span>
        </button>
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-3 font-semibold transition-all border-b-2 hover:text-indigo-400 ${filter === 'all'
            ? 'border-indigo-500 text-indigo-400'
            : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
        >
          All <span className={`ml-1.5 px-2 py-0.5 rounded-full text-xs ${filter === 'all' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-white/5 text-slate-500'}`}>{pages.length}</span>
        </button>
      </div>

      <div className={`grid gap-4 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5' : 'grid-cols-1'}`}>
        {currentItems.map(page => (
          <div key={page.id} className="relative glass-panel rounded-2xl border border-white/10 overflow-hidden group hover:border-indigo-500/50 hover:shadow-[0_0_30px_rgba(99,102,241,0.2)] transition-all duration-300 ease-out isolate">
            {/* Mobile/Grid Open Page Button (Top Right) */}
            <a
              href={`https://facebook.com/${page.pageId}`}
              target="_blank"
              rel="noopener noreferrer"
              className={`${viewMode === 'grid' ? 'block' : 'md:hidden'} absolute top-3 right-3 p-2 bg-white/10 rounded-full text-slate-300 hover:text-white hover:bg-white/20 z-10 transition-colors`}
              title="Open Page"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
            <div className={`p-4 md:p-6 flex flex-col ${viewMode === 'list' ? 'md:flex-row' : ''} items-center gap-4 md:gap-6`}>

              {/* Overlapping Images Section */}
              <div className={`relative flex-shrink-0 h-28 flex items-center justify-start pl-2 ${page.instagram ? 'w-48' : 'w-28'}`}>

                {/* Main Facebook Page Image - Z-20 to stay on top of IG if overlapping left-to-right */}
                <div className="relative z-20 transition-transform group-hover:scale-105 duration-300">
                  <img
                    src={page.pageImageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(page.name)}&background=1877F2&color=fff`}
                    alt={page.name}
                    className="w-24 h-24 rounded-full border-4 border-slate-900 shadow-xl object-cover bg-slate-800"
                  />
                  {/* FB Badge */}
                  <div className="absolute bottom-0 right-0 bg-slate-900 rounded-full p-1 shadow-md z-30 ring-2 ring-slate-900">
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
                      className="w-24 h-24 rounded-full border-4 border-slate-900 shadow-xl object-cover bg-slate-800"
                    />
                    {/* IG Badge */}
                    <div className="absolute bottom-0 right-0 bg-slate-900 rounded-full p-1 shadow-md z-30 ring-2 ring-slate-900">
                      <div className="bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500 text-white rounded-full p-1.5 flex items-center justify-center">
                        <Instagram className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Info Section */}
              <div className={`flex-1 text-center ${viewMode === 'list' ? 'md:text-left' : ''} min-w-0 overflow-hidden w-full`}>
                <div className={`flex flex-col ${viewMode === 'list' ? 'md:flex-row md:items-center' : ''} gap-2 mb-1`}>
                  <h3 className="text-lg md:text-xl font-bold text-white truncate max-w-full">{page.name}</h3>
                  {page.instagram && (
                    <span className="hidden md:inline text-slate-600 mx-1">|</span>
                  )}
                  {page.instagram && (
                    <span className="text-sm md:text-base font-medium text-slate-400 truncate">@{page.instagram.username}</span>
                  )}
                </div>

                <div className={`flex items-center justify-center ${viewMode === 'list' ? 'md:justify-start' : ''} gap-6 text-sm text-slate-400 mt-3`}>
                  <div className="flex items-center gap-2" title="Facebook Followers">
                    <div className="p-1.5 bg-white/5 rounded-full">
                      <Users className="w-4 h-4 text-slate-400" />
                    </div>
                    <div>
                      <span className="font-bold text-white">{formatFollowers(page.pageFollowers)}</span>
                      <span className="text-xs ml-1 font-medium text-slate-500">followers</span>
                    </div>
                  </div>
                  {page.instagram && (
                    <div className="flex items-center gap-2" title="Instagram Followers">
                      <div className="p-1.5 bg-white/5 rounded-full">
                        <Users className="w-4 h-4 text-slate-400" />
                      </div>
                      <div>
                        <span className="font-bold text-white">{formatFollowers(page.instagram.followers)}</span>
                        <span className="text-xs ml-1 font-medium text-slate-500">followers</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Automation Toggle & Status */}
              <div className={`flex flex-col items-center ${viewMode === 'list' ? 'md:items-end' : ''} gap-3 min-w-[200px]`}>
                <div className="flex items-center gap-3 bg-white/5 p-2.5 rounded-xl border border-white/5 shadow-inner">
                  <span className={`text-sm font-semibold ${page.isAutomationEnabled ? 'text-indigo-400' : 'text-slate-500'}`}>
                    {page.isAutomationEnabled ? 'Automation On' : 'Automation Off'}
                  </span>
                  <button
                    onClick={() => handleToggleAutomation(page.id, page.isAutomationEnabled)}
                    disabled={toggling === page.id || page.status !== 'CONNECTED'}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all focus:outline-none ring-2 ring-transparent focus:ring-indigo-500/50 ${page.isAutomationEnabled ? 'bg-gradient-to-r from-emerald-400 to-emerald-600 shadow-[0_0_10px_rgba(52,211,153,0.5)]' : 'bg-slate-700'
                      } ${page.status !== 'CONNECTED' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-105 active:scale-95'}`}
                  >
                    <span
                      className={`${page.isAutomationEnabled ? 'translate-x-[22px]' : 'translate-x-0.5'
                        } inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow-md`}
                    />
                  </button>
                </div>

                <div className="flex items-center gap-2 mt-1">
                  {page.status === 'CONNECTED' ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      <CheckCircle className="w-3.5 h-3.5" />
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Disconnected
                    </span>
                  )}
                </div>
              </div>

            </div>

            <div className={`bg-white/5 px-4 md:px-6 py-3 border-t border-white/5 flex flex-col ${viewMode === 'list' ? 'sm:flex-row' : ''} justify-between items-start ${viewMode === 'list' ? 'sm:items-center' : 'items-center'} gap-3 text-xs font-medium text-slate-400`}>
              <div className={`flex gap-4 w-full ${viewMode === 'list' ? 'sm:w-auto' : ''}`}>
                <span className={`font-mono bg-black/20 px-2 py-0.5 rounded text-slate-500 truncate w-full ${viewMode === 'list' ? 'sm:w-auto text-center sm:text-left' : 'text-center'}`}>ID: {page.pageId}</span>
              </div>
              <div className={`flex gap-3 w-full ${viewMode === 'list' ? 'sm:w-auto justify-center sm:justify-start' : 'justify-center'}`}>
                <button
                  onClick={() => handleSubscribeToWebhooks(page)}
                  className="flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 transition-colors group/sub"
                  title="Subscribe this page to receive webhooks for automations"
                >
                  <RefreshCw className="w-3.5 h-3.5 group-hover/sub:rotate-180 transition-transform duration-500" />
                  Subscribe to Webhooks
                </button>
                {viewMode === 'list' && (
                  <>
                    <span className="hidden md:inline text-slate-600">|</span>
                    <a
                      href={`https://facebook.com/${page.pageId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hidden md:flex items-center gap-1.5 hover:text-white transition-colors group/link"
                      title="View on Facebook"
                    >
                      Open Page
                      <ExternalLink className="w-3.5 h-3.5 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform" />
                    </a>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}

        {filteredPages.length === 0 && (
          <div className="py-20 text-center glass-panel rounded-3xl border border-dashed border-white/10 w-full col-span-full">
            <div className="w-20 h-20 bg-indigo-500/10 text-indigo-400 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
              <Bot className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">
              {filter === 'active' && 'No active pages'}
              {filter === 'inactive' && 'No inactive pages'}
              {filter === 'all' && 'No pages found'}
            </h3>
            <p className="text-slate-400 max-w-sm mx-auto mb-8">
              {filter === 'active' && 'Enable automation on your pages to see them here.'}
              {filter === 'inactive' && 'All your pages have automation enabled!'}
              {filter === 'all' && 'Go to Connections to link your Facebook Profile, then pages will appear here.'}
            </p>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-white/10 pt-4">
          <p className="text-sm text-slate-400">
            Showing <span className="font-medium text-white">{indexOfFirstItem + 1}</span> to <span className="font-medium text-white">{Math.min(indexOfLastItem, filteredPages.length)}</span> of <span className="font-medium text-white">{filteredPages.length}</span> results
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-2 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                    : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                    }`}
                >
                  {page}
                </button>
              ))}
            </div>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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