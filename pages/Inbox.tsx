import React, { useEffect, useState, useRef } from 'react';
import { Workspace, Conversation, Message, Subscriber, ConnectedPage } from '../types';
import { api } from '../services/api';
import { format } from 'date-fns';
import { Search, Send, User, Facebook, Instagram, Image as ImageIcon, Smile, MoreVertical, MessageSquare, ArrowLeft, Paperclip, X, FileText, Video, RefreshCw, ChevronDown } from 'lucide-react';
import { supabase } from '../lib/supabase';


import { useTheme } from '../context/ThemeContext';

interface InboxProps {
  workspace: Workspace;
}

const Inbox: React.FC<InboxProps> = ({ workspace }) => {
  const { isDark } = useTheme();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [subscribers, setSubscribers] = useState<Record<string, Subscriber>>({});
  const [connectedPages, setConnectedPages] = useState<ConnectedPage[]>([]);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingPages, setLoadingPages] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [inputText, setInputText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [showPageDropdown, setShowPageDropdown] = useState(false);
  const [showConversationMenu, setShowConversationMenu] = useState(false);


  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData();

    // Subscribe to real-time message updates
    const messagesSubscription = supabase
      .channel('messages-channel')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          console.log('New message received:', payload);
          // If the message is for the selected conversation, add it
          if (payload.new.conversation_id === selectedConversationId) {
            const newMessage = {
              id: payload.new.id,
              conversationId: payload.new.conversation_id,
              direction: payload.new.direction,
              content: payload.new.content,
              type: payload.new.type,
              attachmentUrl: payload.new.attachment_url,
              fileName: payload.new.file_name,
              createdAt: payload.new.created_at,
              status: payload.new.status,
              externalId: payload.new.external_id,
              senderId: payload.new.sender_id
            } as Message;
            setMessages(prev => [...prev, newMessage]);
          }
          // Reload conversations to update preview and unread count
          loadConversations();
        }
      )
      .subscribe();

    // Subscribe to conversation updates
    const conversationsSubscription = supabase
      .channel('conversations-channel')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'conversations', filter: `workspace_id=eq.${workspace.id}` },
        () => {
          loadConversations();
        }
      )
      .subscribe();

    return () => {
      messagesSubscription.unsubscribe();
      conversationsSubscription.unsubscribe();
    };
  }, [workspace.id, selectedConversationId]);


  useEffect(() => {
    if (selectedConversationId) {
      loadMessages(selectedConversationId);
      // Clear inputs when changing conversation
      setInputText('');
      clearFile();
    } else {
      setMessages([]);
    }
  }, [selectedConversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Reload conversations when selected page changes
  useEffect(() => {
    if (!loadingPages) {
      loadConversations();
    }
  }, [selectedPageId]);

  // Clean up object URL on unmount or file change
  useEffect(() => {
    return () => {
      if (filePreview) URL.revokeObjectURL(filePreview);
    };
  }, [filePreview]);

  const loadData = async () => {
    await Promise.all([loadPages(), loadConversations()]);
  };

  const loadPages = async () => {
    setLoadingPages(true);
    try {
      const pages = await api.workspace.getConnectedPages(workspace.id);
      // Filter only pages with automation enabled
      const automatedPages = pages.filter(p => p.isAutomationEnabled);
      setConnectedPages(automatedPages);
    } catch (error) {
      console.error('Error loading pages:', error);
    } finally {
      setLoadingPages(false);
    }
  };

  const handleSync = async () => {
    if (!selectedConversationId) return;

    setSyncing(true);
    try {
      // Fetch latest messages from Facebook for this conversation
      const conv = conversations.find(c => c.id === selectedConversationId);
      if (conv?.externalId && conv?.platform === 'FACEBOOK') {
        await api.workspace.fetchConversationMessages(selectedConversationId);
        // Reload messages after sync
        await loadMessages(selectedConversationId);
      }
    } catch (error) {
      console.error('Error syncing messages:', error);
    } finally {
      setSyncing(false);
    }
  };

  const loadConversations = async () => {
    setLoadingConversations(true);
    try {
      // Fetch conversations, optionally filtered by page
      const convs = await api.workspace.getConversations(workspace.id, selectedPageId || undefined);
      const subs = await api.workspace.getSubscribers(workspace.id);

      // Create subscriber map for easy lookup
      const subMap: Record<string, Subscriber> = {};
      subs.forEach(s => subMap[s.id] = s);

      setConversations(convs);
      setSubscribers(subMap);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoadingConversations(false);
    }
  };

  const syncMessages = async () => {
    setSyncing(true);
    try {
      // Fetch conversations from Facebook, optionally filtered by page
      await api.workspace.fetchMessengerConversations(workspace.id, selectedPageId || undefined);
      // Reload conversations from database
      await loadConversations();
    } catch (error: any) {
      console.error('Error syncing messages:', error);
      alert(error.message || 'Failed to sync messages');
    } finally {
      setSyncing(false);
    }
  };

  const loadMessages = async (convId: string) => {
    setLoadingMessages(true);
    try {
      // Load messages from database only (much faster)
      // Facebook sync happens via Sync button or real-time subscriptions
      const msgs = await api.workspace.getMessages(convId);
      setMessages(msgs);
    } catch (error) {
      console.error('Error loading messages:', error);
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleDeleteConversation = async () => {
    if (!selectedConversationId) return;

    const confirmed = window.confirm('Are you sure you want to delete this conversation? This action cannot be undone.');
    if (!confirmed) return;

    try {
      await api.workspace.deleteConversation(selectedConversationId);
      // Remove from local state
      setConversations(prev => prev.filter(c => c.id !== selectedConversationId));
      setSelectedConversationId(null);
      setMessages([]);
      setShowConversationMenu(false);
    } catch (error) {
      console.error('Error deleting conversation:', error);
      alert('Failed to delete conversation');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);

      // Create preview for images AND videos
      if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
        setFilePreview(URL.createObjectURL(file));
      } else {
        setFilePreview(null);
      }
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!inputText.trim() && !selectedFile) || !selectedConversationId) return;

    // Determine type for optimistic update
    let type: Message['type'] = 'TEXT';
    let attachmentUrl = undefined;

    if (selectedFile) {
      if (selectedFile.type.startsWith('image/')) type = 'IMAGE';
      else if (selectedFile.type.startsWith('video/')) type = 'VIDEO';
      else type = 'FILE';
      // Use temporary blob URL for immediate preview
      attachmentUrl = URL.createObjectURL(selectedFile);
    }

    const tempId = `temp-${Date.now()}`;
    const newMessage: Message = {
      id: tempId,
      conversationId: selectedConversationId,
      direction: 'OUTBOUND',
      content: inputText,
      type: type,
      attachmentUrl: attachmentUrl,
      fileName: selectedFile?.name,
      createdAt: new Date().toISOString(),
      status: 'SENT'
    };

    // Optimistic update with SENT status (will show as sending)
    setMessages(prev => [...prev, { ...newMessage, status: 'SENT' }]);
    const fileToSend = selectedFile;
    const textToSend = inputText;

    // Clear UI immediately
    setInputText('');
    clearFile();

    try {
      const sentMessage = await api.workspace.sendMessage(selectedConversationId, textToSend, fileToSend || undefined);
      // Update with actual message from database (includes real Supabase URL)
      setMessages(prev => prev.map(m => m.id === tempId ? sentMessage : m));
    } catch (error) {
      console.error("Failed to send", error);
      // Update to FAILED on error
      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: 'FAILED' } : m));
    }
  };

  const handleRetryMessage = async (message: Message) => {
    if (!selectedConversationId) return;

    // Update status to SENT (sending)
    setMessages(prev => prev.map(m => m.id === message.id ? { ...m, status: 'SENT' } : m));

    try {
      await api.workspace.sendMessage(selectedConversationId, message.content, undefined);
      // Update to DELIVERED after successful send
      setMessages(prev => prev.map(m => m.id === message.id ? { ...m, status: 'DELIVERED' } : m));
    } catch (error) {
      console.error("Failed to retry", error);
      // Update back to FAILED on error
      setMessages(prev => prev.map(m => m.id === message.id ? { ...m, status: 'FAILED' } : m));
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const selectedConversation = conversations.find(c => c.id === selectedConversationId);
  const selectedSubscriber = selectedConversation ? subscribers[selectedConversation.subscriberId] : null;

  return (
    <div className={`h-[calc(100dvh-6rem)] md:h-[calc(100vh-8rem)] rounded-2xl border flex overflow-hidden animate-fade-in shadow-2xl ${isDark
      ? 'glass-panel border-white/10 shadow-black/20'
      : 'bg-white border-slate-200 shadow-slate-200/50'
      }`}>

      {/* Sidebar List - Hidden on mobile if conversation selected */}
      <div className={`
        w-full md:w-80 lg:w-96 border-r flex-col backdrop-blur-sm
        ${selectedConversationId ? 'hidden md:flex' : 'flex'}
        ${isDark ? 'border-white/10 bg-slate-900/50' : 'border-slate-200 bg-slate-50/80'}
      `}>
        <div className={`p-4 border-b flex-shrink-0 ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
          <div className="flex items-center justify-between mb-4 px-1">
            <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>Inbox</h2>
            <button
              onClick={syncMessages}
              disabled={syncing}
              className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-500/50 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-all shadow-lg shadow-indigo-500/20"
              title="Sync messages from Facebook"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync'}
            </button>
          </div>

          {/* Page Selector */}
          <div className="mb-3">
            {loadingPages ? (
              <div className={`w-full px-4 py-2.5 border rounded-xl text-sm flex items-center justify-center ${isDark ? 'bg-white/5 border-white/10 text-slate-400' : 'bg-white border-slate-200 text-slate-500'}`}>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-500"></div>
              </div>
            ) : (
              <div className="relative">
                <button
                  onClick={() => setShowPageDropdown(!showPageDropdown)}
                  className={`w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all cursor-pointer flex items-center gap-2 ${isDark
                    ? 'bg-white/5 border-white/10 text-slate-200 hover:bg-white/10'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                >
                  {selectedPageId ? (
                    <>
                      {connectedPages.find(p => p.pageId === selectedPageId)?.pageImageUrl ? (
                        <img
                          src={connectedPages.find(p => p.pageId === selectedPageId)?.pageImageUrl}
                          alt=""
                          className={`w-8 h-8 rounded-full object-cover ring-2 ${isDark ? 'ring-white/10' : 'ring-slate-100'}`}
                        />
                      ) : (
                        <Facebook className="w-6 h-6 text-blue-500" />
                      )}
                      <span className="flex-1 text-left truncate font-medium">
                        {connectedPages.find(p => p.pageId === selectedPageId)?.name}
                      </span>
                    </>
                  ) : (
                    <>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-blue-400 ring-2 ${isDark ? 'bg-blue-500/20 ring-white/10' : 'bg-blue-50 ring-slate-100'}`}>
                        <Facebook className="w-5 h-5" />
                      </div>
                      <span className="flex-1 text-left font-medium">All Pages ({connectedPages.length})</span>
                    </>
                  )}
                  <ChevronDown className={`w-4 h-4 transition-transform ${showPageDropdown ? 'rotate-180' : ''} ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
                </button>

                {showPageDropdown && (
                  <div className={`absolute z-50 w-full mt-2 border rounded-xl shadow-2xl max-h-64 overflow-y-auto custom-scrollbar backdrop-blur-xl ${isDark
                    ? 'bg-slate-900 border-white/10'
                    : 'bg-white border-slate-200'
                    }`}>
                    {/* All Pages Option */}
                    <button
                      onClick={() => {
                        setSelectedPageId(null);
                        setShowPageDropdown(false);
                      }}
                      className={`w-full px-3 py-2.5 text-left transition-colors flex items-center gap-2 ${!selectedPageId
                        ? 'bg-indigo-500/20 text-indigo-300'
                        : isDark ? 'text-slate-300 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-50'
                        }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-blue-400 ${isDark ? 'bg-blue-500/20' : 'bg-blue-50'}`}>
                        <Facebook className="w-5 h-5" />
                      </div>
                      <span className="flex-1 text-sm font-medium">All Pages ({connectedPages.length})</span>
                    </button>

                    {/* Individual Pages */}
                    {connectedPages.map(page => (
                      <button
                        key={page.id}
                        onClick={() => {
                          setSelectedPageId(page.pageId);
                          setShowPageDropdown(false);
                        }}
                        className={`w-full px-3 py-2.5 text-left transition-colors flex items-center gap-2 ${selectedPageId === page.pageId
                          ? 'bg-indigo-500/20 text-indigo-300'
                          : isDark ? 'text-slate-300 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-50'
                          }`}
                      >
                        {page.pageImageUrl ? (
                          <img
                            src={page.pageImageUrl}
                            alt={page.name}
                            className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
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
            )}
          </div>

          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
            <input
              type="text"
              placeholder="Search conversations..."
              className={`w-full pl-10 pr-4 py-2 border focus:border-indigo-500/50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all ${isDark
                ? 'bg-white/5 border-transparent focus:bg-white/10 text-white placeholder-slate-500'
                : 'bg-white border-slate-200 focus:bg-white text-slate-800 placeholder-slate-400'
                }`}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {loadingConversations ? (
            <div className="p-8 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {conversations.map(conv => {
                const sub = subscribers[conv.subscriberId];
                if (!sub) return null;
                const isSelected = selectedConversationId === conv.id;

                // Find the page for this conversation to show badge
                const conversationPage = connectedPages.find(p => p.pageId === conv.pageId);

                return (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConversationId(conv.id)}
                    className={`w-full p-4 flex items-start gap-3 transition-all duration-200 text-left border-l-[3px] ${isSelected
                      ? 'bg-indigo-500/10 border-indigo-500 shadow-[inset_0_0_20px_rgba(99,102,241,0.1)]'
                      : `border-transparent ${isDark ? 'hover:bg-white/5' : 'hover:bg-slate-100'}`}`}
                  >
                    <div className="relative flex-shrink-0">
                      {sub.avatarUrl ? (
                        <img src={sub.avatarUrl} alt={sub.name} className={`w-12 h-12 rounded-full object-cover shadow-sm ${isDark ? 'border border-white/10' : 'border border-slate-200'}`} />
                      ) : (
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-slate-400 border ${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-100 border-slate-200'}`}>
                          <User className="w-6 h-6" />
                        </div>
                      )}
                      {/* Page Badge - Show only when "All Pages" is selected */}
                      {!selectedPageId && conversationPage && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center overflow-hidden shadow-sm" title={conversationPage.name}>
                          {conversationPage.pageImageUrl ? (
                            <img
                              src={conversationPage.pageImageUrl}
                              alt={conversationPage.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Facebook className="w-3 h-3 text-blue-500" />
                          )}
                        </div>
                      )}
                      {/* Platform Badge */}
                      <div className={`absolute -bottom-1 -right-1 p-0.5 rounded-full bg-slate-900 border border-slate-700 shadow-sm ${conv.platform === 'FACEBOOK' ? 'text-blue-500' : 'text-pink-500'
                        }`}>
                        {conv.platform === 'FACEBOOK' ? <Facebook className="w-3 h-3" /> : <Instagram className="w-3 h-3" />}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-1">
                        <span className={`font-semibold truncate ${isSelected ? (isDark ? 'text-white' : 'text-indigo-900') : (isDark ? 'text-slate-200' : 'text-slate-800')}`}>{sub.name}</span>
                        <span className="text-xs text-slate-500 flex-shrink-0 ml-2 font-medium">
                          {format(new Date(conv.updatedAt), 'MMM d')}
                        </span>
                      </div>
                      <p className={`text-sm truncate ${conv.unreadCount > 0 ? (isDark ? 'font-semibold text-white' : 'font-semibold text-slate-900') : 'text-slate-500'}`}>
                        {conv.lastMessagePreview}
                      </p>
                    </div>
                    {conv.unreadCount > 0 && (
                      <div className="min-w-[1.25rem] h-5 rounded-full bg-indigo-500 text-white text-xs font-bold flex items-center justify-center px-1.5 mt-1 shadow-lg shadow-indigo-500/40">
                        {conv.unreadCount}
                      </div>
                    )}
                  </button>
                );
              })}
              {conversations.length === 0 && (
                <div className="p-12 text-center text-slate-500 flex flex-col items-center">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 border ${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-100 border-slate-200'}`}>
                    <MessageSquare className="w-8 h-8 opacity-40" />
                  </div>
                  <h3 className={`font-medium mb-1 ${isDark ? 'text-white' : 'text-slate-800'}`}>No conversations</h3>
                  <p className="text-sm">When you receive messages, they will appear here.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Chat Area - Hidden on mobile if no conversation selected */}
      <div className={`
        flex-1 flex-col min-w-0 transition-colors
        ${selectedConversationId ? 'flex' : 'hidden md:flex'}
        ${isDark ? 'bg-slate-900/50 backdrop-blur-md' : 'bg-white'}
      `}>
        {selectedConversationId ? (
          <>
            {/* Chat Header */}
            <div className={`h-16 px-4 md:px-6 border-b flex items-center justify-between flex-shrink-0 z-10 shadow-lg relative ${isDark
              ? 'border-white/10 bg-slate-900/80 backdrop-blur-xl'
              : 'border-slate-200 bg-white/90 backdrop-blur-xl'
              }`}>
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={() => setSelectedConversationId(null)}
                  className={`md:hidden p-2 -ml-2 rounded-full transition-colors ${isDark ? 'text-slate-400 hover:text-white hover:bg-white/10' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'}`}
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>

                {selectedSubscriber && (
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="relative flex-shrink-0">
                      {selectedSubscriber.avatarUrl ? (
                        <img src={selectedSubscriber.avatarUrl} alt={selectedSubscriber.name} className={`w-10 h-10 rounded-full object-cover shadow-sm ${isDark ? 'border border-white/10' : 'border border-slate-200'}`} />
                      ) : (
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-slate-400 ${isDark ? 'bg-white/10' : 'bg-slate-100'}`}>
                          <User className="w-5 h-5" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className={`font-bold truncate text-sm md:text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>{selectedSubscriber.name}</h3>
                      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                        {selectedSubscriber.tags.map(tag => (
                          <span key={tag} className={`px-1.5 py-0.5 text-[10px] uppercase tracking-wide rounded font-semibold flex-shrink-0 border ${isDark
                            ? 'bg-white/5 text-slate-400 border-white/10'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <button
                    onClick={() => setShowConversationMenu(!showConversationMenu)}
                    className={`p-2 rounded-full transition-colors ${isDark
                      ? 'text-slate-400 hover:text-white hover:bg-white/5'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                      }`}
                  >
                    <MoreVertical className="w-5 h-5" />
                  </button>

                  {showConversationMenu && (
                    <div className={`absolute right-0 mt-2 w-56 border rounded-xl shadow-2xl z-50 overflow-hidden ring-1 ring-black/5 animate-fade-in origin-top-right ${isDark
                      ? 'bg-slate-900 border-white/10'
                      : 'bg-white border-slate-200'
                      }`}>
                      <div className={`p-3 border-b ${isDark ? 'border-white/10 bg-white/5' : 'border-slate-100 bg-slate-50'}`}>
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Options</p>
                      </div>
                      <button
                        onClick={handleDeleteConversation}
                        className="w-full px-4 py-3 text-left text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-3"
                      >
                        <X className="w-4 h-4" />
                        <span className="text-sm font-medium">Delete Conversation</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-transparent">
              {loadingMessages ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 opacity-50"></div>
                </div>
              ) : (
                <>
                  {messages.map((msg, idx) => {
                    const isOutbound = msg.direction === 'OUTBOUND';
                    return (
                      <div key={msg.id} className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}>
                        {!isOutbound && (
                          <div className="flex-shrink-0 mr-2 mt-auto">
                            {selectedSubscriber?.avatarUrl ? (
                              <img src={selectedSubscriber.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover border border-white/10" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-slate-400 text-[10px] border border-white/10"><User className="w-4 h-4" /></div>
                            )}
                          </div>
                        )}
                        <div className={`max-w-[75%] md:max-w-[65%] leading-relaxed ${isOutbound ? 'ml-auto' : 'mr-auto'}`}>
                          <div className={`px-4 py-3 shadow-lg text-sm md:text-[15px] backdrop-blur-sm ${isOutbound
                            ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white rounded-2xl rounded-tr-sm border border-indigo-500/20'
                            : isDark
                              ? 'glass-panel bg-slate-800/80 text-slate-200 border-white/10 rounded-2xl rounded-tl-sm'
                              : 'bg-white text-slate-800 border border-slate-200 shadow-sm rounded-2xl rounded-tl-sm'
                            }`}>
                            {msg.type === 'IMAGE' && msg.attachmentUrl && (
                              <img
                                src={msg.attachmentUrl}
                                alt="Attachment"
                                className="rounded-lg mb-2 max-w-full max-h-96 object-contain bg-black/20"
                                onError={(e) => {
                                  console.error('Image load error:', msg.attachmentUrl);
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            )}
                            {msg.type === 'VIDEO' && msg.attachmentUrl && (
                              <video src={msg.attachmentUrl} controls className="rounded-lg mb-2 max-w-full max-h-96 bg-black/20" />
                            )}
                            {msg.type === 'FILE' && msg.attachmentUrl && (
                              <a href={msg.attachmentUrl} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-3 p-3 rounded-lg mb-2 border ${isOutbound ? 'bg-black/10 border-white/20' : 'bg-black/20 border-white/10'}`}>
                                <FileText className="w-5 h-5 opacity-80" />
                                <div className="min-w-0 flex-1">
                                  <span className="text-sm font-medium underline line-clamp-1 break-all">{msg.fileName || 'Download File'}</span>
                                </div>
                              </a>
                            )}
                            {msg.content && <p className="whitespace-pre-wrap break-words">{msg.content}</p>}
                          </div>
                          <div className={`flex items-center gap-2 mt-1 px-1 ${isOutbound ? 'justify-end' : 'justify-start'
                            }`}>
                            {isOutbound && (
                              <>
                                {msg.status === 'SENT' && (
                                  <span className="text-[11px] text-slate-500 font-medium">Sending...</span>
                                )}
                                {msg.status === 'DELIVERED' && (
                                  <span className="text-[11px] text-slate-500 font-medium">
                                    {format(new Date(msg.createdAt), 'h:mm a')}
                                  </span>
                                )}
                                {msg.status === 'FAILED' && (
                                  <>
                                    <span className="text-[11px] text-red-400 font-medium">Failed</span>
                                    <button
                                      onClick={() => handleRetryMessage(msg)}
                                      className="text-[11px] text-indigo-400 hover:underline font-medium ml-1"
                                    >
                                      Retry
                                    </button>
                                  </>
                                )}
                              </>
                            )}
                            {!isOutbound && (
                              <span className="text-[11px] text-slate-500 font-medium">
                                {format(new Date(msg.createdAt), 'h:mm a')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Attachment Preview Area */}
            {selectedFile && (
              <div className="px-4 py-3 border-t border-white/10 bg-slate-900/50 flex items-center gap-4">
                <div className="relative group">
                  {filePreview ? (
                    selectedFile.type.startsWith('video/') ? (
                      <video src={filePreview} className="h-20 w-auto rounded-lg border border-white/10 object-cover shadow-sm" autoPlay muted loop />
                    ) : (
                      <img src={filePreview} alt="Preview" className="h-20 w-auto rounded-lg border border-white/10 object-cover shadow-sm" />
                    )
                  ) : (
                    <div className="h-20 w-20 bg-white/5 rounded-lg border border-white/10 flex items-center justify-center">
                      <FileText className="w-8 h-8 text-slate-400" />
                    </div>
                  )}
                  <button
                    onClick={clearFile}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-colors transform hover:scale-110"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{selectedFile.name}</p>
                  <p className="text-xs text-slate-500">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              </div>
            )}

            {/* Input */}
            <div className={`p-2 md:p-4 pb-3 md:pb-4 border-t flex-shrink-0 z-20 ${isDark ? 'bg-slate-900/80 backdrop-blur-xl border-white/10' : 'bg-white border-slate-200'}`}>
              <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={handleFileSelect}
                  accept="image/*,video/*,application/pdf,.doc,.docx"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={`p-2 md:p-2.5 rounded-lg md:rounded-full flex-shrink-0 transition-all ${selectedFile
                    ? 'text-white bg-indigo-500/20'
                    : isDark ? 'text-slate-400 hover:text-white hover:bg-white/10' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
                  title="Attach file"
                >
                  <Paperclip className="w-5 h-5" />
                </button>
                <button type="button" className={`hidden md:block p-2.5 rounded-full transition-colors ${isDark
                  ? 'text-slate-400 hover:text-amber-400 hover:bg-white/10'
                  : 'text-slate-400 hover:text-amber-500 hover:bg-slate-100'
                  }`}>
                  <Smile className="w-5 h-5" />
                </button>

                <div className={`flex-1 min-w-0 rounded-xl md:rounded-2xl flex items-center border transition-all ${isDark
                  ? 'bg-white/5 border-white/5 focus-within:border-indigo-500/50 focus-within:bg-white/10'
                  : 'bg-slate-50 border-slate-200 focus-within:border-indigo-500/50 focus-within:bg-white'
                  } focus-within:ring-2 focus-within:ring-indigo-500/20`}>
                  <input
                    type="text"
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(e);
                      }
                    }}
                    placeholder={selectedFile ? "Caption..." : "Message..."}
                    className={`flex-1 min-w-0 bg-transparent border-none focus:ring-0 py-2.5 md:py-3 px-3 md:px-4 text-sm ${isDark ? 'text-white placeholder:text-slate-500' : 'text-slate-900 placeholder:text-slate-400'}`}
                  />
                </div>

                <button
                  type="submit"
                  disabled={!inputText.trim() && !selectedFile}
                  className="p-2.5 md:p-3 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-lg md:rounded-full hover:shadow-lg hover:shadow-indigo-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 flex-shrink-0"
                >
                  <Send className="w-4 h-4 md:w-5 md:h-5" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-fade-in">
            <div className={`w-24 h-24 rounded-full border flex items-center justify-center mb-6 shadow-2xl rotate-3 hover:rotate-6 transition-transform duration-500 ${isDark
              ? 'bg-white/5 border-white/10'
              : 'bg-white border-slate-200 shadow-slate-200'
              }`}>
              <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/20 to-transparent rounded-full" />
              <MessageSquare className="w-12 h-12 text-indigo-400 drop-shadow-glow" />
            </div>
            <h3 className={`text-2xl font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>Your Inbox</h3>
            <p className={`max-w-xs mx-auto leading-relaxed text-lg ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Select a conversation from the sidebar to start chatting with your subscribers.
            </p>
          </div>
        )}
      </div >
    </div >
  );
};

export default Inbox;