import React, { useEffect, useState } from 'react';
import { Workspace, Subscriber, Conversation, ConnectedPage } from '../types';
import { api } from '../services/api';
import { supabase } from '../lib/supabase';
import { Search, Download, User, Facebook, Instagram, X, MessageCircle, Calendar, Tag, ExternalLink, ChevronLeft, ChevronRight, LayoutGrid, List, Clock, Users, Plus, Check, Filter, Trash2, MoreVertical, ChevronDown, Brain } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';

interface SubscribersProps {
  workspace: Workspace;
}

// Predefined label options with colors
const LABEL_OPTIONS = [
  { name: 'Commenter', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { name: 'Messaged', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  { name: 'Button Click', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  { name: 'VIP', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  { name: 'Lead', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  { name: 'Customer', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  { name: 'Hot Lead', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  { name: 'Cold Lead', color: 'bg-slate-500/20 text-slate-400 border-slate-500/30' },
  { name: 'Purchased', color: 'bg-teal-500/20 text-teal-400 border-teal-500/30' },
  { name: 'Fill-up Form', color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' },
  { name: 'Add to Cart', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  { name: 'Initiate Checkout', color: 'bg-lime-500/20 text-lime-400 border-lime-500/30' },
];

const getLabelColor = (label: string) => {
  const found = LABEL_OPTIONS.find(l => l.name === label);
  return found?.color || 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30';
};

const Subscribers: React.FC<SubscribersProps> = ({ workspace }) => {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedSubscriber, setSelectedSubscriber] = useState<Subscriber | null>(null);
  const [subscriberConversations, setSubscriberConversations] = useState<Conversation[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'SUBSCRIBED' | 'UNSUBSCRIBED'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pages, setPages] = useState<ConnectedPage[]>([]);
  const [selectedPageId, setSelectedPageId] = useState<string>('');
  const [showLabelManager, setShowLabelManager] = useState(false);
  const [savingLabels, setSavingLabels] = useState(false);
  const [subscriberToDelete, setSubscriberToDelete] = useState<Subscriber | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [clearingMemory, setClearingMemory] = useState(false);
  const [showPageDropdown, setShowPageDropdown] = useState(false);
  const itemsPerPage = 12;
  const toast = useToast();
  const { isDark } = useTheme();

  // Click outside handler for menus
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.subscriber-card-menu') && !target.closest('button')) {
        setActiveMenuId(null);
      }
    };
    if (activeMenuId) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeMenuId]);

  // Load connected pages for filter
  useEffect(() => {
    const loadPages = async () => {
      try {
        const pagesData = await api.workspace.getConnectedPages(workspace.id);
        setPages(pagesData);
      } catch (error) {
        console.error('Failed to load pages');
      }
    };
    loadPages();
  }, [workspace.id]);

  // Load subscribers
  useEffect(() => {
    const loadSubscribers = async () => {
      setLoading(true);
      try {
        const data = await api.workspace.getSubscribers(workspace.id, selectedPageId || undefined);
        setSubscribers(data);
      } catch (error) {
        toast.error('Failed to load subscribers');
      } finally {
        setLoading(false);
      }
    };
    loadSubscribers();
  }, [workspace.id, selectedPageId]);

  // Filter subscribers
  const filteredSubscribers = subscribers.filter(sub => {
    const matchesSearch = sub.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.externalId.includes(searchQuery);
    const matchesStatus = statusFilter === 'all' || sub.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Pagination
  const totalPages = Math.ceil(filteredSubscribers.length / itemsPerPage);
  const paginatedSubscribers = filteredSubscribers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, selectedPageId]);

  // Open subscriber profile modal
  const openSubscriberProfile = async (subscriber: Subscriber) => {
    setSelectedSubscriber(subscriber);
    setLoadingConversations(true);
    try {
      const conversations = await api.workspace.getConversations(workspace.id);
      // Try to match by subscriber_id or by external_id in subscriber info
      const subConversations = conversations.filter(c =>
        c.subscriberId === subscriber.id ||
        c.subscriberId === subscriber.externalId ||
        (c as any).participant_id === subscriber.externalId
      );
      setSubscriberConversations(subConversations);
      console.log('Loaded conversations:', subConversations.length);
    } catch (error) {
      console.error('Failed to load conversations', error);
      setSubscriberConversations([]);
    } finally {
      setLoadingConversations(false);
    }
  };

  const closeProfile = () => {
    setSelectedSubscriber(null);
    setSubscriberConversations([]);
    setShowLabelManager(false);
  };

  const toggleLabel = async (label: string) => {
    if (!selectedSubscriber) return;

    const currentLabels = selectedSubscriber.labels || [];
    const newLabels = currentLabels.includes(label)
      ? currentLabels.filter(l => l !== label)
      : [...currentLabels, label];

    setSavingLabels(true);
    try {
      await api.workspace.updateSubscriberLabels(selectedSubscriber.id, newLabels);

      // Update local state
      setSelectedSubscriber({ ...selectedSubscriber, labels: newLabels });
      setSubscribers(subs => subs.map(s =>
        s.id === selectedSubscriber.id ? { ...s, labels: newLabels } : s
      ));

      toast.success('Labels updated');
    } catch (error) {
      toast.error('Failed to update labels');
    } finally {
      setSavingLabels(false);
    }
  };

  // Handle subscriber deletion
  const handleDeleteSubscriber = async (subscriberId: string, subscriberName: string) => {
    console.log('Delete requested for:', subscriberId, subscriberName);
    setDeleting(true);
    try {
      await api.workspace.deleteSubscriber(subscriberId);
      // Remove from local state
      setSubscribers(subs => subs.filter(s => s.id !== subscriberId));
      // Close profile if this subscriber was open
      if (selectedSubscriber?.id === subscriberId) {
        closeProfile();
      }
      toast.success(`${subscriberName} deleted`);
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete subscriber');
    } finally {
      setDeleting(false);
      setSubscriberToDelete(null);
    }
  };

  // Handle clearing AI memory for a subscriber
  const handleClearAIMemory = async (subscriberId: string, subscriberName: string) => {
    setClearingMemory(true);
    try {
      // Get current metadata and clear only ai_chat_history
      const { data: subscriber, error: fetchError } = await supabase
        .from('subscribers')
        .select('metadata')
        .eq('id', subscriberId)
        .single();

      if (fetchError) throw fetchError;

      const currentMetadata = subscriber?.metadata || {};
      const updatedMetadata = {
        ...currentMetadata,
        ai_chat_history: [],
        ai_memory_cleared_at: new Date().toISOString()
      };

      const { error: updateError } = await supabase
        .from('subscribers')
        .update({ metadata: updatedMetadata })
        .eq('id', subscriberId);

      if (updateError) throw updateError;

      toast.success(`AI memory cleared for ${subscriberName}`);
    } catch (error: any) {
      console.error('Clear AI memory error:', error);
      toast.error('Failed to clear AI memory');
    } finally {
      setClearingMemory(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch {
      return 'Unknown';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return 'Unknown';
    }
  };

  const formatDateTime = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy h:mm a');
    } catch {
      return 'Unknown';
    }
  };

  // Get page name by ID
  const getPageName = (pageId: string | undefined) => {
    if (!pageId) return 'Unknown Page';
    const page = pages.find(p => p.id === pageId);
    return page?.name || 'Unknown Page';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className={`text-2xl md:text-4xl font-bold tracking-tight mb-2 ${isDark ? 'text-white' : 'text-gray-900'
            }`}>Subscribers</h1>
          <p className={`text-sm md:text-lg ${isDark ? 'text-slate-400' : 'text-gray-600'
            }`}>Users who interacted with your bot automations</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => toast.info('Export feature coming soon!')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-colors shadow-sm border ${isDark
                ? 'bg-white/5 border-white/10 text-slate-200 hover:bg-white/10'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800'
              }`}
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export</span>
          </button>

          {/* View Toggle */}
          <div className={`flex p-1 rounded-xl border ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200 shadow-sm'}`}>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'list'
                ? 'bg-indigo-500 text-white shadow-md'
                : isDark ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50'
                }`}
              title="List View"
            >
              <List className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'grid'
                ? 'bg-indigo-500 text-white shadow-md'
                : isDark ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50'
                }`}
              title="Grid View"
            >
              <LayoutGrid className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className={`p-4 rounded-xl border ${isDark ? 'glass-panel border-white/10' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-lg ${isDark ? 'bg-indigo-500/20' : 'bg-indigo-50 text-indigo-500'}`}>
              <Users className={`w-5 h-5 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
            </div>
            <div>
              <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{subscribers.length}</p>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Total Subscribers</p>
            </div>
          </div>
        </div>
        <div className={`p-4 rounded-xl border ${isDark ? 'glass-panel border-white/10' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-lg ${isDark ? 'bg-emerald-500/20' : 'bg-emerald-50 text-emerald-500'}`}>
              <User className={`w-5 h-5 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
            </div>
            <div>
              <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{subscribers.filter(s => s.status === 'SUBSCRIBED').length}</p>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Active</p>
            </div>
          </div>
        </div>
        <div className={`p-4 rounded-xl border ${isDark ? 'glass-panel border-white/10' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-lg ${isDark ? 'bg-blue-500/20' : 'bg-blue-50 text-blue-500'}`}>
              <Facebook className={`w-5 h-5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
            </div>
            <div>
              <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{subscribers.filter(s => s.platform === 'FACEBOOK').length}</p>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Facebook</p>
            </div>
          </div>
        </div>
        <div className={`p-4 rounded-xl border ${isDark ? 'glass-panel border-white/10' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-lg ${isDark ? 'bg-pink-500/20' : 'bg-pink-50 text-pink-500'}`}>
              <Instagram className={`w-5 h-5 ${isDark ? 'text-pink-400' : 'text-pink-600'}`} />
            </div>
            <div>
              <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{subscribers.filter(s => s.platform === 'INSTAGRAM').length}</p>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Instagram</p>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className={`rounded-2xl p-4 border overflow-visible relative z-20 ${isDark ? 'glass-panel border-white/10' : 'bg-white border-slate-200 shadow-sm'}`}>
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or ID..."
              className={`w-full pl-10 pr-4 py-2.5 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent transition-all border ${isDark
                ? 'bg-black/20 border-white/10 text-white placeholder-slate-500'
                : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white'
                }`}
            />
          </div>

          {/* Page Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <div className="relative min-w-[200px]">
              <button
                onClick={() => setShowPageDropdown(!showPageDropdown)}
                className={`w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all cursor-pointer flex items-center gap-2 ${isDark
                  ? 'bg-black/20 border-white/10 text-slate-200 hover:bg-white/5'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
              >
                {selectedPageId ? (
                  <>
                    {pages.find(p => p.id === selectedPageId)?.pageImageUrl ? (
                      <img
                        src={pages.find(p => p.id === selectedPageId)?.pageImageUrl}
                        alt=""
                        className="w-6 h-6 rounded-full object-cover ring-1 ring-white/10"
                      />
                    ) : (
                      <Facebook className="w-5 h-5 text-blue-500" />
                    )}
                    <span className="flex-1 text-left truncate font-medium">
                      {pages.find(p => p.id === selectedPageId)?.name}
                    </span>
                  </>
                ) : (
                  <>
                    <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                      <Facebook className="w-4 h-4" />
                    </div>
                    <span className="flex-1 text-left font-medium">All Pages</span>
                  </>
                )}
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showPageDropdown ? 'rotate-180' : ''}`} />
              </button>

              {showPageDropdown && (
                <div className={`absolute z-[999] w-full mt-2 border rounded-xl shadow-2xl max-h-64 overflow-y-auto custom-scrollbar backdrop-blur-xl ${isDark
                  ? 'bg-slate-900 border-white/10'
                  : 'bg-white border-slate-200'
                  }`}>
                  {/* All Pages Option */}
                  <button
                    onClick={() => {
                      setSelectedPageId('');
                      setShowPageDropdown(false);
                    }}
                    className={`w-full px-3 py-2.5 text-left hover:bg-white/5 transition-colors flex items-center gap-2 ${!selectedPageId
                      ? (isDark ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-50 text-indigo-600')
                      : (isDark ? 'text-slate-300 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-50')}`}
                  >
                    <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                      <Facebook className="w-4 h-4" />
                    </div>
                    <span className="flex-1 text-sm font-medium">All Pages ({pages.length})</span>
                  </button>

                  {/* Individual Pages */}
                  {pages.map(page => (
                    <button
                      key={page.id}
                      onClick={() => {
                        setSelectedPageId(page.id);
                        setShowPageDropdown(false);
                      }}
                      className={`w-full px-3 py-2.5 text-left transition-colors flex items-center gap-2 ${selectedPageId === page.id
                        ? (isDark ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-50 text-indigo-600')
                        : (isDark ? 'text-slate-300 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-50')}`}
                    >
                      {page.pageImageUrl ? (
                        <img
                          src={page.pageImageUrl}
                          alt={page.name}
                          className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-xs font-bold">
                            {page.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{page.name}</div>
                        <div className="text-xs text-slate-500">{page.pageFollowers?.toLocaleString() || 0} followers</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Status Filter */}
          <div className="flex gap-2">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${statusFilter === 'all'
                ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/25'
                : isDark ? 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10' : 'bg-slate-100 text-slate-500 hover:text-slate-700'
                }`}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter('SUBSCRIBED')}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${statusFilter === 'SUBSCRIBED'
                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25'
                : isDark ? 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10' : 'bg-slate-100 text-slate-500 hover:text-slate-700'
                }`}
            >
              Active
            </button>
            <button
              onClick={() => setStatusFilter('UNSUBSCRIBED')}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${statusFilter === 'UNSUBSCRIBED'
                ? 'bg-slate-500 text-white shadow-lg shadow-slate-500/25'
                : isDark ? 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10' : 'bg-slate-100 text-slate-500 hover:text-slate-700'
                }`}
            >
              Inactive
            </button>
          </div>
        </div>
      </div>

      {/* Subscribers Grid/List */}
      {paginatedSubscribers.length > 0 ? (
        <div className={`relative z-10 ${viewMode === 'grid'
          ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
          : 'space-y-3'
          }`}>
          {paginatedSubscribers.map(subscriber => (
            <div
              key={subscriber.id}
              onClick={() => openSubscriberProfile(subscriber)}
              className={`border rounded-2xl overflow-hidden cursor-pointer group transition-all duration-300 relative ${isDark
                ? 'glass-panel border-white/10 hover:border-indigo-500/50 hover:shadow-[0_0_30px_rgba(99,102,241,0.15)]'
                : 'bg-white border-slate-200 shadow-sm hover:border-indigo-400 hover:shadow-xl'
                } ${viewMode === 'grid' ? 'p-5' : 'p-4 flex items-center gap-4'}`}
            >
              {/* Actions Menu - Top Right */}
              <div className="absolute top-3 right-3 z-10 flex items-center gap-1">
                {/* Dropdown Menu */}
                {activeMenuId === subscriber.id && (
                  <div
                    className={`subscriber-card-menu flex items-center gap-0.5 p-1 ${isDark ? 'bg-slate-800/95 border-slate-700' : 'bg-white/95 border-gray-200'} rounded-lg shadow-xl backdrop-blur-sm animate-scale-in border`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenuId(null);
                        handleDeleteSubscriber(subscriber.id, subscriber.name);
                      }}
                      title="Delete"
                      className={`relative group/delete p-1.5 rounded-lg ${isDark ? 'hover:bg-red-500/20 text-red-400 hover:text-red-300' : 'hover:bg-red-50 text-red-400 hover:text-red-500'} transition-all`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Trigger Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveMenuId(activeMenuId === subscriber.id ? null : subscriber.id);
                  }}
                  className={`p-1.5 ${isDark ? 'bg-slate-700/80 hover:bg-slate-600 text-white/70 hover:text-white' : 'bg-white/80 hover:bg-white text-gray-500 hover:text-gray-700'} rounded-lg transition-all shadow-lg backdrop-blur-sm`}
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>

              {/* Avatar */}
              <div className={`relative ${viewMode === 'grid' ? 'flex justify-center mb-4' : 'flex-shrink-0'}`}>
                {subscriber.avatarUrl ? (
                  <img
                    src={subscriber.avatarUrl}
                    alt={subscriber.name}
                    className={`rounded-full object-cover border-2 transition-colors ${isDark
                      ? 'border-white/10 group-hover:border-indigo-500/50'
                      : 'border-slate-100 group-hover:border-indigo-500/30'
                      } ${viewMode === 'grid' ? 'w-20 h-20' : 'w-12 h-12'}`}
                  />
                ) : (
                  <div className={`rounded-full flex items-center justify-center border-2 transition-colors ${isDark
                    ? 'bg-gradient-to-br from-indigo-500/30 to-purple-500/30 text-slate-300 border-white/10 group-hover:border-indigo-500/50'
                    : 'bg-gradient-to-br from-indigo-50 to-purple-50 text-indigo-400 border-slate-100 group-hover:border-indigo-500/30'
                    } ${viewMode === 'grid' ? 'w-20 h-20' : 'w-12 h-12'}`}>
                    <User className={viewMode === 'grid' ? 'w-8 h-8' : 'w-5 h-5'} />
                  </div>
                )}
                {/* Platform Badge */}
                <div className={`absolute ${viewMode === 'grid' ? '-bottom-1 right-1/2 translate-x-1/2' : '-bottom-1 -right-1'} p-1 rounded-full bg-slate-900 border border-slate-700 shadow-md`}>
                  {subscriber.platform === 'FACEBOOK' ? (
                    <Facebook className="w-3.5 h-3.5 text-blue-500 fill-current" />
                  ) : (
                    <Instagram className="w-3.5 h-3.5 text-pink-500" />
                  )}
                </div>
              </div>

              {/* Info */}
              <div className={viewMode === 'grid' ? 'text-center' : 'flex-1 min-w-0'}>
                <h3 className={`font-bold truncate group-hover:text-indigo-500 transition-colors ${viewMode === 'grid' ? 'text-lg' : 'text-base'
                  } ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {subscriber.name}
                </h3>

                {/* Page Name */}
                {subscriber.pageId && (
                  <p className="text-xs text-slate-500 truncate mt-0.5">{getPageName(subscriber.pageId)}</p>
                )}

                {/* Status & Source Labels */}
                <div className={`flex flex-wrap items-center gap-1.5 mt-2 ${viewMode === 'grid' ? 'justify-center' : ''}`}>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${subscriber.status === 'SUBSCRIBED'
                    ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30'
                    : 'bg-slate-500/20 text-slate-500 border border-slate-500/30'
                    }`}>
                    {subscriber.status === 'SUBSCRIBED' ? 'Active' : 'Inactive'}
                  </span>
                  {subscriber.labels?.slice(0, 2).map(label => (
                    <span key={label} className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getLabelColor(label)}`}>
                      {label}
                    </span>
                  ))}
                  {(subscriber.labels?.length || 0) > 2 && (
                    <span className="text-xs text-slate-500">+{subscriber.labels!.length - 2}</span>
                  )}
                </div>

                {/* Last Active - Grid Only */}
                {viewMode === 'grid' && (
                  <div className="flex items-center justify-center gap-1 mt-3 text-xs text-slate-500">
                    <Clock className="w-3 h-3" />
                    {formatTimeAgo(subscriber.lastActiveAt)}
                  </div>
                )}
              </div>

              {/* Last Active - List Only */}
              {viewMode === 'list' && (
                <div className="hidden sm:flex items-center gap-1 text-xs text-slate-500">
                  <Clock className="w-3 h-3" />
                  {formatTimeAgo(subscriber.lastActiveAt)}
                </div>
              )}
            </div>
          ))
          }
        </div >
      ) : (
        <div className={`py-20 text-center rounded-3xl border border-dashed ${isDark ? 'glass-panel border-white/10' : 'bg-white border-slate-300'}`}>
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner ${isDark ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-500'}`}>
            <User className="w-10 h-10" />
          </div>
          <h3 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>No subscribers found</h3>
          <p className="text-slate-400 max-w-sm mx-auto">
            {searchQuery || statusFilter !== 'all' || selectedPageId
              ? 'Try adjusting your search or filters.'
              : 'Subscribers will appear here when users interact with your bot automations.'}
          </p>
        </div>
      )}

      {/* Pagination */}
      {
        totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-white/10 pt-4">
            <p className="text-sm text-slate-400">
              Showing <span className="font-medium text-white">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
              <span className="font-medium text-white">{Math.min(currentPage * itemsPerPage, filteredSubscribers.length)}</span> of{' '}
              <span className="font-medium text-white">{filteredSubscribers.length}</span>
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${currentPage === pageNum
                        ? 'bg-indigo-500 text-white'
                        : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                        }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )
      }

      {/* Subscriber Profile Modal */}
      {
        selectedSubscriber && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={closeProfile}>
            <div
              className={`relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border shadow-2xl animate-scale-in ${isDark ? 'glass-panel border-white/10' : 'bg-white border-slate-200'
                }`}
              onClick={e => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={closeProfile}
                className={`absolute top-4 right-4 p-2 rounded-lg transition-colors z-10 ${isDark ? 'text-slate-400 hover:text-white hover:bg-white/10' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                  }`}
              >
                <X className="w-5 h-5" />
              </button>

              {/* Profile Header */}
              <div className="relative p-6 pb-0">
                <div className="absolute inset-0 h-32 bg-gradient-to-b from-indigo-500/20 to-transparent rounded-t-3xl"></div>

                <div className="relative flex flex-col sm:flex-row items-center gap-6">
                  {/* Avatar */}
                  <div className="relative">
                    {selectedSubscriber.avatarUrl ? (
                      <img
                        src={selectedSubscriber.avatarUrl}
                        alt={selectedSubscriber.name}
                        className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover border-4 border-slate-800 shadow-2xl"
                      />
                    ) : (
                      <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-gradient-to-br from-indigo-500/40 to-purple-500/40 flex items-center justify-center text-slate-300 border-4 border-slate-800 shadow-2xl">
                        <User className="w-12 h-12" />
                      </div>
                    )}
                    <div className="absolute -bottom-2 -right-2 p-1.5 rounded-xl bg-slate-900 border border-slate-700 shadow-lg">
                      {selectedSubscriber.platform === 'FACEBOOK' ? (
                        <Facebook className="w-5 h-5 text-blue-500 fill-current" />
                      ) : (
                        <Instagram className="w-5 h-5 text-pink-500" />
                      )}
                    </div>
                  </div>

                  {/* Name & Info */}
                  <div className="flex-1 text-center sm:text-left">
                    <h2 className={`text-2xl sm:text-3xl font-bold mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>{selectedSubscriber.name}</h2>
                    {selectedSubscriber.email && (
                      <p className="text-sm text-indigo-400 mb-1">📧 {selectedSubscriber.email}</p>
                    )}
                    <p className="text-sm text-slate-500 font-mono mb-1">ID: {selectedSubscriber.externalId}</p>
                    {selectedSubscriber.pageId && (
                      <p className="text-sm text-slate-400 mb-3">From: {getPageName(selectedSubscriber.pageId)}</p>
                    )}

                    <div className="flex flex-wrap justify-center sm:justify-start gap-2">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold ${selectedSubscriber.status === 'SUBSCRIBED'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                        }`}>
                        {selectedSubscriber.status === 'SUBSCRIBED' ? 'Active Subscriber' : 'Inactive'}
                      </span>
                      {selectedSubscriber.source && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-white/5 text-slate-300 border border-white/10">
                          {selectedSubscriber.source === 'COMMENT' ? 'From Comment' :
                            selectedSubscriber.source === 'MESSAGE' ? 'From Message' : 'From Button'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Profile Details */}
              <div className="p-6 space-y-6">
                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className={`rounded-xl p-4 border ${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${isDark ? 'bg-indigo-500/20' : 'bg-indigo-100 text-indigo-600'}`}>
                        <Calendar className={`w-5 h-5 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
                      </div>
                      <div>
                        <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Last Active</p>
                        <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{formatDateTime(selectedSubscriber.lastActiveAt)}</p>
                      </div>
                    </div>
                  </div>
                  <div className={`rounded-xl p-4 border ${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${isDark ? 'bg-purple-500/20' : 'bg-purple-100 text-purple-600'}`}>
                        <MessageCircle className={`w-5 h-5 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
                      </div>
                      <div>
                        <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Conversations</p>
                        <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          {loadingConversations ? '...' : subscriberConversations.length}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Labels */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                      <Tag className="w-4 h-4" />
                      Labels
                    </h4>
                    <button
                      onClick={() => setShowLabelManager(!showLabelManager)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 rounded-lg border border-indigo-500/30 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Manage Labels
                    </button>
                  </div>

                  {/* Current Labels */}
                  {selectedSubscriber.labels && selectedSubscriber.labels.length > 0 ? (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {selectedSubscriber.labels.map(label => (
                        <span key={label} className={`px-3 py-1.5 rounded-lg text-sm border font-medium ${getLabelColor(label)}`}>
                          {label}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-500 text-sm mb-3">No labels assigned</p>
                  )}

                  {/* Label Manager */}
                  {showLabelManager && (
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10 mt-3">
                      <p className="text-xs text-slate-400 mb-3">Click to add/remove labels:</p>
                      <div className="flex flex-wrap gap-2">
                        {LABEL_OPTIONS.map(labelOption => {
                          const isActive = selectedSubscriber.labels?.includes(labelOption.name);
                          return (
                            <button
                              key={labelOption.name}
                              onClick={() => toggleLabel(labelOption.name)}
                              disabled={savingLabels}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${isActive
                                ? labelOption.color + ' ring-2 ring-white/20'
                                : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10'
                                } ${savingLabels ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                              {isActive && <Check className="w-3.5 h-3.5" />}
                              {labelOption.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Tags */}
                {selectedSubscriber.tags && selectedSubscriber.tags.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Tags</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedSubscriber.tags.map(tag => (
                        <span key={tag} className="px-3 py-1.5 bg-indigo-500/20 text-indigo-300 rounded-lg text-sm border border-indigo-500/30 font-medium">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Conversations */}
                <div>
                  <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <MessageCircle className="w-4 h-4" />
                    Recent Conversations
                  </h4>
                  {loadingConversations ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-500"></div>
                    </div>
                  ) : subscriberConversations.length > 0 ? (
                    <div className="space-y-2">
                      {subscriberConversations.slice(0, 3).map(conv => (
                        <div key={conv.id} className="bg-white/5 rounded-xl p-4 border border-white/10 hover:bg-white/10 transition-colors">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-white truncate">{conv.lastMessagePreview || 'No messages'}</p>
                              <p className="text-xs text-slate-500 mt-1">{formatTimeAgo(conv.updatedAt)}</p>
                            </div>
                            {conv.unreadCount > 0 && (
                              <span className="flex-shrink-0 bg-indigo-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                                {conv.unreadCount}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-white/5 rounded-xl p-6 border border-white/10 text-center">
                      <MessageCircle className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                      <p className="text-slate-500 text-sm">No conversations yet</p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-white/10">
                  <a
                    href={`https://www.facebook.com/messages/t/${selectedSubscriber.externalId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Open Chat
                  </a>
                  <button
                    type="button"
                    onClick={() => handleClearAIMemory(selectedSubscriber.id, selectedSubscriber.name)}
                    disabled={clearingMemory}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 hover:text-amber-300 rounded-xl font-semibold transition-colors border border-amber-500/30 disabled:opacity-50"
                    title="Clear AI conversation memory for this subscriber"
                  >
                    <Brain className="w-4 h-4" />
                    {clearingMemory ? 'Clearing...' : 'Clear AI Memory'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteSubscriber(selectedSubscriber.id, selectedSubscriber.name)}
                    disabled={deleting}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 hover:text-red-300 rounded-xl font-semibold transition-colors border border-red-500/30 disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    {deleting ? 'Deleting...' : 'Delete'}
                  </button>
                  <button
                    onClick={closeProfile}
                    className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl font-semibold transition-colors border border-white/10"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
};

export default Subscribers;