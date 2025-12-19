import React, { useEffect, useState, useRef } from 'react';
import { Workspace, Conversation, Message, Subscriber, ConnectedPage } from '../types';
import { api } from '../services/api';
import { format } from 'date-fns';
import { Search, Send, User, Facebook, Instagram, Image as ImageIcon, Smile, MoreVertical, MessageSquare, ArrowLeft, Paperclip, X, FileText, Video, RefreshCw, ChevronDown } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface InboxProps {
  workspace: Workspace;
}

const Inbox: React.FC<InboxProps> = ({ workspace }) => {
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

  const renderAttachment = (msg: Message) => {
    if (!msg.attachmentUrl) return null;

    if (msg.type === 'IMAGE') {
      return (
        <img
          src={msg.attachmentUrl}
          alt="attachment"
          className="rounded-lg max-w-full md:max-w-sm mb-2 border border-slate-700/50"
        />
      );
    } else if (msg.type === 'VIDEO') {
      return (
        <video
          src={msg.attachmentUrl}
          controls
          className="rounded-lg max-w-full md:max-w-sm mb-2 border border-slate-700/50 bg-black"
        />
      );
    } else if (msg.type === 'FILE') {
      return (
        <div className={`flex items-center gap-3 p-3 rounded-lg mb-2 border ${msg.direction === 'OUTBOUND' ? 'bg-white/10 border-white/20' : 'bg-slate-800 border-slate-700'}`}>
          <div className="p-2 bg-slate-700 rounded-lg shadow-sm">
            <FileText className="w-5 h-5 text-slate-300" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{msg.fileName || 'Attachment'}</p>
            <a href={msg.attachmentUrl} download className={`text-xs hover:underline ${msg.direction === 'OUTBOUND' ? 'text-blue-100' : 'text-blue-400'}`}>
              Download
            </a>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-[calc(100dvh-6rem)] md:h-[calc(100vh-8rem)] bg-slate-900 rounded-xl shadow-lg border border-slate-800 flex overflow-hidden">

      {/* Sidebar List - Hidden on mobile if conversation selected */}
      <div className={`
        w-full md:w-80 lg:w-96 border-r border-slate-800 flex-col
        ${selectedConversationId ? 'hidden md:flex' : 'flex'}
      `}>
        <div className="p-4 border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center justify-between mb-4 px-1">
            <h2 className="text-lg font-bold text-slate-100">Inbox</h2>
            <button
              onClick={syncMessages}
              disabled={syncing}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
              title="Sync messages from Facebook"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync'}
            </button>
          </div>

          {/* Page Selector */}
          <div className="mb-3">
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Filter by Page</label>
            {loadingPages ? (
              <div className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-500 flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="relative">
                <button
                  onClick={() => setShowPageDropdown(!showPageDropdown)}
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer flex items-center gap-2"
                >
                  {selectedPageId ? (
                    <>
                      {connectedPages.find(p => p.pageId === selectedPageId)?.pageImageUrl ? (
                        <img
                          src={connectedPages.find(p => p.pageId === selectedPageId)?.pageImageUrl}
                          alt=""
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <Facebook className="w-6 h-6 text-blue-500" />
                      )}
                      <span className="flex-1 text-left truncate">
                        {connectedPages.find(p => p.pageId === selectedPageId)?.name}
                      </span>
                    </>
                  ) : (
                    <>
                      <Facebook className="w-6 h-6 text-blue-500" />
                      <span className="flex-1 text-left">All Pages ({connectedPages.length})</span>
                    </>
                  )}
                  <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${showPageDropdown ? 'rotate-180' : ''}`} />
                </button>

                {showPageDropdown && (
                  <div className="absolute z-50 w-full mt-1 bg-slate-900 border border-slate-800 rounded-lg shadow-xl max-h-64 overflow-y-auto custom-scrollbar">
                    {/* All Pages Option */}
                    <button
                      onClick={() => {
                        setSelectedPageId(null);
                        setShowPageDropdown(false);
                      }}
                      className={`w-full px-3 py-2.5 text-left hover:bg-slate-800 transition-colors flex items-center gap-2 ${!selectedPageId ? 'bg-blue-600/20 text-blue-400' : 'text-slate-200'
                        }`}
                    >
                      <Facebook className="w-6 h-6 text-blue-500 flex-shrink-0" />
                      <span className="flex-1 text-sm">All Pages ({connectedPages.length})</span>
                    </button>

                    {/* Individual Pages */}
                    {connectedPages.map(page => (
                      <button
                        key={page.id}
                        onClick={() => {
                          setSelectedPageId(page.pageId);
                          setShowPageDropdown(false);
                        }}
                        className={`w-full px-3 py-2.5 text-left hover:bg-slate-800 transition-colors flex items-center gap-2 ${selectedPageId === page.pageId ? 'bg-blue-600/20 text-blue-400' : 'text-slate-200'
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
                          <div className="text-sm truncate">{page.name}</div>
                          <div className="text-xs text-slate-500">{page.pageFollowers?.toLocaleString() || 0} followers</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder-slate-600"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingConversations ? (
            <div className="p-8 flex justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
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
                    className={`w-full p-4 flex items-start gap-3 hover:bg-slate-800/50 transition-colors text-left ${isSelected ? 'bg-slate-800 border-l-2 border-blue-500' : ''}`}
                  >
                    <div className="relative flex-shrink-0">
                      {sub.avatarUrl ? (
                        <img src={sub.avatarUrl} alt={sub.name} className="w-12 h-12 rounded-full object-cover border border-slate-700" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-500">
                          <User className="w-6 h-6" />
                        </div>
                      )}
                      {/* Page Badge - Show only when "All Pages" is selected */}
                      {!selectedPageId && conversationPage && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-slate-950 border border-slate-700 flex items-center justify-center overflow-hidden" title={conversationPage.name}>
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
                      <div className={`absolute -bottom-1 -right-1 p-0.5 rounded-full bg-slate-900 border border-slate-800 shadow-sm ${conv.platform === 'FACEBOOK' ? 'text-blue-500' : 'text-pink-500'
                        }`}>
                        {conv.platform === 'FACEBOOK' ? <Facebook className="w-3 h-3" /> : <Instagram className="w-3 h-3" />}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-1">
                        <span className={`font-medium truncate ${isSelected ? 'text-blue-400' : 'text-slate-200'}`}>{sub.name}</span>
                        <span className="text-xs text-slate-500 flex-shrink-0 ml-2">
                          {format(new Date(conv.updatedAt), 'MMM d')}
                        </span>
                      </div>
                      <p className={`text-sm truncate ${conv.unreadCount > 0 ? 'font-semibold text-slate-300' : 'text-slate-500'}`}>
                        {conv.lastMessagePreview}
                      </p>
                    </div>
                    {conv.unreadCount > 0 && (
                      <div className="min-w-[1.25rem] h-5 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center px-1.5 mt-1">
                        {conv.unreadCount}
                      </div>
                    )}
                  </button>
                );
              })}
              {conversations.length === 0 && (
                <div className="p-8 text-center text-slate-500 flex flex-col items-center">
                  <MessageSquare className="w-8 h-8 mb-2 opacity-20" />
                  <p className="text-sm">No conversations found</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Chat Area - Hidden on mobile if no conversation selected */}
      <div className={`
        flex-1 flex-col min-w-0 bg-slate-900
        ${selectedConversationId ? 'flex' : 'hidden md:flex'}
      `}>
        {selectedConversationId ? (
          <>
            {/* Chat Header */}
            <div className="h-16 px-4 md:px-6 border-b border-slate-800 flex items-center justify-between flex-shrink-0 bg-slate-900 z-10">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={() => setSelectedConversationId(null)}
                  className="md:hidden p-2 -ml-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-full"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>

                {selectedSubscriber && (
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="relative flex-shrink-0">
                      {selectedSubscriber.avatarUrl ? (
                        <img src={selectedSubscriber.avatarUrl} alt={selectedSubscriber.name} className="w-9 h-9 rounded-full object-cover border border-slate-700" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-slate-500">
                          <User className="w-5 h-5" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-slate-100 truncate text-sm md:text-base">{selectedSubscriber.name}</h3>
                      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                        {selectedSubscriber.tags.map(tag => (
                          <span key={tag} className="px-1.5 py-0.5 bg-slate-800 text-slate-400 text-[10px] uppercase tracking-wide rounded font-medium flex-shrink-0 border border-slate-700">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSync}
                  disabled={syncing}
                  className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-full transition-colors disabled:opacity-50"
                  title="Sync messages from Facebook"
                >
                  <RefreshCw className={`w-5 h-5 ${syncing ? 'animate-spin' : ''}`} />
                </button>
                <div className="relative">
                  <button
                    onClick={() => setShowConversationMenu(!showConversationMenu)}
                    className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-full transition-colors"
                  >
                    <MoreVertical className="w-5 h-5" />
                  </button>

                  {showConversationMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-slate-900 border border-slate-800 rounded-lg shadow-xl z-50">
                      <button
                        onClick={handleDeleteConversation}
                        className="w-full px-4 py-2.5 text-left text-red-400 hover:bg-slate-800 transition-colors flex items-center gap-2 rounded-lg"
                      >
                        <X className="w-4 h-4" />
                        <span className="text-sm">Delete Conversation</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-slate-950">
              {loadingMessages ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 opacity-20"></div>
                </div>
              ) : (
                <>
                  {messages.map((msg, idx) => {
                    const isOutbound = msg.direction === 'OUTBOUND';
                    return (
                      <div key={msg.id} className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[70%] ${isOutbound ? 'ml-auto' : 'mr-auto'}`}>
                          <div className={`rounded-2xl px-4 py-2 ${isOutbound
                              ? 'bg-blue-600 text-white rounded-br-sm'
                              : 'bg-slate-800 text-slate-100 rounded-bl-sm'
                            }`}>
                            {msg.type === 'IMAGE' && msg.attachmentUrl && (
                              <img
                                src={msg.attachmentUrl}
                                alt="Attachment"
                                className="rounded-lg mb-2 max-w-full max-h-96 object-contain"
                                onError={(e) => {
                                  console.error('Image load error:', msg.attachmentUrl);
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            )}
                            {msg.type === 'VIDEO' && msg.attachmentUrl && (
                              <video src={msg.attachmentUrl} controls className="rounded-lg mb-2 max-w-full max-h-96" />
                            )}
                            {msg.type === 'FILE' && msg.attachmentUrl && (
                              <a href={msg.attachmentUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 mb-2">
                                <FileText className="w-4 h-4" />
                                <span className="text-sm underline">{msg.fileName || 'Download File'}</span>
                              </a>
                            )}
                            {msg.content && <p className="whitespace-pre-wrap break-words">{msg.content}</p>}
                          </div>
                          <div className={`flex items-center gap-2 mt-1 ${isOutbound ? 'justify-end' : 'justify-start'
                            }`}>
                            {isOutbound && (
                              <>
                                {msg.status === 'SENT' && (
                                  <span className="text-xs text-slate-500">Sending...</span>
                                )}
                                {msg.status === 'DELIVERED' && (
                                  <span className="text-xs text-slate-500">
                                    Sent {format(new Date(msg.createdAt), 'h:mm a')}
                                  </span>
                                )}
                                {msg.status === 'FAILED' && (
                                  <>
                                    <span className="text-xs text-red-400">Failed</span>
                                    <button
                                      onClick={() => handleRetryMessage(msg)}
                                      className="text-xs text-blue-400 hover:text-blue-300 underline"
                                    >
                                      Retry
                                    </button>
                                  </>
                                )}
                              </>
                            )}
                            {!isOutbound && (
                              <span className="text-xs text-slate-500">
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
              <div className="px-4 py-2 border-t border-slate-800 bg-slate-900 flex items-center gap-4">
                <div className="relative group">
                  {filePreview ? (
                    selectedFile.type.startsWith('video/') ? (
                      <video src={filePreview} className="h-20 w-auto rounded-lg border border-slate-700 object-cover" autoPlay muted loop />
                    ) : (
                      <img src={filePreview} alt="Preview" className="h-20 w-auto rounded-lg border border-slate-700 object-cover" />
                    )
                  ) : (
                    <div className="h-16 w-16 bg-slate-800 rounded-lg border border-slate-700 flex items-center justify-center">
                      <FileText className="w-8 h-8 text-slate-500" />
                    </div>
                  )}
                  <button
                    onClick={clearFile}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-sm hover:bg-red-600 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-200 truncate">{selectedFile.name}</p>
                  <p className="text-xs text-slate-500">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              </div>
            )}

            {/* Input */}
            <div className="p-3 md:p-4 bg-slate-900 border-t border-slate-800 flex-shrink-0">
              <form onSubmit={handleSendMessage} className="flex items-end gap-2 bg-slate-950 rounded-xl border border-slate-800 p-2 focus-within:ring-2 focus-within:ring-blue-900 focus-within:border-blue-700 transition-all">
                <div className="flex gap-1">
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handleFileSelect}
                    // Accept commonly supported formats
                    accept="image/*,video/*,application/pdf,.doc,.docx"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className={`p-2 rounded-lg transition-colors ${selectedFile ? 'text-blue-500 bg-blue-900/20' : 'text-slate-400 hover:text-blue-500 hover:bg-slate-800'}`}
                    title="Attach file"
                  >
                    <Paperclip className="w-5 h-5" />
                  </button>
                  <button type="button" className="p-2 text-slate-400 hover:text-amber-500 rounded-lg hover:bg-slate-800 transition-colors">
                    <Smile className="w-5 h-5" />
                  </button>
                </div>
                <textarea
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage(e);
                    }
                  }}
                  placeholder={selectedFile ? "Add a caption..." : "Type a message..."}
                  className="flex-1 bg-transparent border-none focus:ring-0 text-slate-200 placeholder:text-slate-600 resize-none py-2 max-h-32 text-sm leading-relaxed"
                  rows={1}
                  style={{ minHeight: '2.5rem' }}
                />
                <button
                  type="submit"
                  disabled={!inputText.trim() && !selectedFile}
                  className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm mb-0.5"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-slate-950 text-slate-500 p-8 text-center">
            <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mb-4 shadow-sm border border-slate-800">
              <MessageSquare className="w-8 h-8 text-slate-700" />
            </div>
            <h3 className="text-slate-200 font-medium mb-1">Your Inbox</h3>
            <p className="text-sm">Select a conversation from the list to start chatting</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Inbox;