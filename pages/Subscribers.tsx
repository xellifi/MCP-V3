import React, { useEffect, useState } from 'react';
import { Workspace, Subscriber, Conversation } from '../types';
import { api } from '../services/api';
import { Search, Filter, Download, User, Facebook, Instagram, X, MessageCircle, Calendar, Tag, ExternalLink, ChevronLeft, ChevronRight, LayoutGrid, List, Clock, Users } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { useToast } from '../context/ToastContext';

interface SubscribersProps {
  workspace: Workspace;
}

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
  const itemsPerPage = 12;
  const toast = useToast();

  useEffect(() => {
    const loadSubscribers = async () => {
      setLoading(true);
      try {
        const data = await api.workspace.getSubscribers(workspace.id);
        setSubscribers(data);
      } catch (error) {
        toast.error('Failed to load subscribers');
      } finally {
        setLoading(false);
      }
    };
    loadSubscribers();
  }, [workspace.id]);

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
  }, [searchQuery, statusFilter]);

  // Open subscriber profile modal
  const openSubscriberProfile = async (subscriber: Subscriber) => {
    setSelectedSubscriber(subscriber);
    setLoadingConversations(true);
    try {
      const conversations = await api.workspace.getConversations(workspace.id);
      // Filter conversations for this subscriber
      const subConversations = conversations.filter(c => c.subscriberId === subscriber.id);
      setSubscriberConversations(subConversations);
    } catch (error) {
      console.error('Failed to load conversations', error);
    } finally {
      setLoadingConversations(false);
    }
  };

  const closeProfile = () => {
    setSelectedSubscriber(null);
    setSubscriberConversations([]);
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
          <h1 className="text-2xl md:text-4xl font-bold text-white tracking-tight mb-2">Subscribers</h1>
          <p className="text-slate-400 text-sm md:text-lg">Manage and view your audience contacts</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => toast.info('Export feature coming soon!')}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-slate-200 hover:bg-white/10 font-medium transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export</span>
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

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-panel p-4 rounded-xl border border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/20 rounded-lg">
              <Users className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{subscribers.length}</p>
              <p className="text-xs text-slate-400">Total Subscribers</p>
            </div>
          </div>
        </div>
        <div className="glass-panel p-4 rounded-xl border border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/20 rounded-lg">
              <User className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{subscribers.filter(s => s.status === 'SUBSCRIBED').length}</p>
              <p className="text-xs text-slate-400">Active</p>
            </div>
          </div>
        </div>
        <div className="glass-panel p-4 rounded-xl border border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/20 rounded-lg">
              <Facebook className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{subscribers.filter(s => s.platform === 'FACEBOOK').length}</p>
              <p className="text-xs text-slate-400">Facebook</p>
            </div>
          </div>
        </div>
        <div className="glass-panel p-4 rounded-xl border border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-pink-500/20 rounded-lg">
              <Instagram className="w-5 h-5 text-pink-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{subscribers.filter(s => s.platform === 'INSTAGRAM').length}</p>
              <p className="text-xs text-slate-400">Instagram</p>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="glass-panel rounded-2xl p-4 border border-white/10">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or ID..."
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-black/20 border border-white/10 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent placeholder-slate-500 transition-all"
            />
          </div>

          {/* Status Filter */}
          <div className="flex gap-2">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${statusFilter === 'all' ? 'bg-indigo-500 text-white' : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'}`}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter('SUBSCRIBED')}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${statusFilter === 'SUBSCRIBED' ? 'bg-emerald-500 text-white' : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'}`}
            >
              Active
            </button>
            <button
              onClick={() => setStatusFilter('UNSUBSCRIBED')}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${statusFilter === 'UNSUBSCRIBED' ? 'bg-slate-500 text-white' : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'}`}
            >
              Inactive
            </button>
          </div>
        </div>
      </div>

      {/* Subscribers Grid/List */}
      {paginatedSubscribers.length > 0 ? (
        <div className={viewMode === 'grid'
          ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
          : 'space-y-3'
        }>
          {paginatedSubscribers.map(subscriber => (
            <div
              key={subscriber.id}
              onClick={() => openSubscriberProfile(subscriber)}
              className={`glass-panel border border-white/10 rounded-2xl overflow-hidden cursor-pointer group hover:border-indigo-500/50 hover:shadow-[0_0_30px_rgba(99,102,241,0.15)] transition-all duration-300 ${viewMode === 'grid' ? 'p-5' : 'p-4 flex items-center gap-4'
                }`}
            >
              {/* Avatar */}
              <div className={`relative ${viewMode === 'grid' ? 'flex justify-center mb-4' : 'flex-shrink-0'}`}>
                {subscriber.avatarUrl ? (
                  <img
                    src={subscriber.avatarUrl}
                    alt={subscriber.name}
                    className={`rounded-full object-cover border-2 border-white/10 group-hover:border-indigo-500/50 transition-colors ${viewMode === 'grid' ? 'w-20 h-20' : 'w-12 h-12'
                      }`}
                  />
                ) : (
                  <div className={`rounded-full bg-gradient-to-br from-indigo-500/30 to-purple-500/30 flex items-center justify-center text-slate-300 border-2 border-white/10 group-hover:border-indigo-500/50 transition-colors ${viewMode === 'grid' ? 'w-20 h-20' : 'w-12 h-12'
                    }`}>
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
                <h3 className={`font-bold text-white truncate group-hover:text-indigo-300 transition-colors ${viewMode === 'grid' ? 'text-lg' : 'text-base'
                  }`}>
                  {subscriber.name}
                </h3>
                <p className="text-xs text-slate-500 font-mono truncate mt-0.5">ID: {subscriber.externalId}</p>

                {/* Status & Last Active */}
                <div className={`flex items-center gap-2 mt-2 ${viewMode === 'grid' ? 'justify-center' : ''}`}>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${subscriber.status === 'SUBSCRIBED'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                    }`}>
                    {subscriber.status === 'SUBSCRIBED' ? 'Active' : 'Inactive'}
                  </span>
                </div>

                {/* Tags */}
                {subscriber.tags.length > 0 && (
                  <div className={`flex flex-wrap gap-1 mt-2 ${viewMode === 'grid' ? 'justify-center' : ''}`}>
                    {subscriber.tags.slice(0, 3).map(tag => (
                      <span key={tag} className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 rounded text-xs border border-indigo-500/30">
                        {tag}
                      </span>
                    ))}
                    {subscriber.tags.length > 3 && (
                      <span className="text-xs text-slate-500">+{subscriber.tags.length - 3}</span>
                    )}
                  </div>
                )}

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
          ))}
        </div>
      ) : (
        <div className="py-20 text-center glass-panel rounded-3xl border border-dashed border-white/10">
          <div className="w-20 h-20 bg-indigo-500/10 text-indigo-400 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
            <User className="w-10 h-10" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">No subscribers found</h3>
          <p className="text-slate-400 max-w-sm mx-auto">
            {searchQuery || statusFilter !== 'all'
              ? 'Try adjusting your search or filters.'
              : 'Subscribers will appear here when users interact with your pages.'}
          </p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
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
      )}

      {/* Subscriber Profile Modal */}
      {selectedSubscriber && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={closeProfile}>
          <div
            className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto glass-panel rounded-3xl border border-white/10 shadow-2xl animate-scale-in"
            onClick={e => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={closeProfile}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Profile Header */}
            <div className="relative p-6 pb-0">
              {/* Background Gradient */}
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
                  {/* Platform Badge */}
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
                  <h2 className="text-2xl sm:text-3xl font-bold text-white mb-1">{selectedSubscriber.name}</h2>
                  <p className="text-sm text-slate-500 font-mono mb-3">ID: {selectedSubscriber.externalId}</p>

                  <div className="flex flex-wrap justify-center sm:justify-start gap-2">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold ${selectedSubscriber.status === 'SUBSCRIBED'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                      }`}>
                      {selectedSubscriber.status === 'SUBSCRIBED' ? 'Active Subscriber' : 'Inactive'}
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-white/5 text-slate-300 border border-white/10">
                      {selectedSubscriber.platform === 'FACEBOOK' ? (
                        <>
                          <Facebook className="w-3.5 h-3.5 text-blue-400" />
                          Facebook
                        </>
                      ) : (
                        <>
                          <Instagram className="w-3.5 h-3.5 text-pink-400" />
                          Instagram
                        </>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Profile Details */}
            <div className="p-6 space-y-6">
              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/20 rounded-lg">
                      <Calendar className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Last Active</p>
                      <p className="text-sm font-semibold text-white">{formatDate(selectedSubscriber.lastActiveAt)}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-500/20 rounded-lg">
                      <MessageCircle className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Conversations</p>
                      <p className="text-sm font-semibold text-white">
                        {loadingConversations ? '...' : subscriberConversations.length}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tags */}
              <div>
                <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  Tags
                </h4>
                {selectedSubscriber.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {selectedSubscriber.tags.map(tag => (
                      <span key={tag} className="px-3 py-1.5 bg-indigo-500/20 text-indigo-300 rounded-lg text-sm border border-indigo-500/30 font-medium">
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 text-sm">No tags assigned</p>
                )}
              </div>

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
                  href={`https://facebook.com/${selectedSubscriber.externalId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  View on {selectedSubscriber.platform === 'FACEBOOK' ? 'Facebook' : 'Instagram'}
                </a>
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
      )}
    </div>
  );
};

export default Subscribers;