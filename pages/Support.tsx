import React, { useEffect, useState, useRef } from 'react';
import { User, Workspace, SupportTicket, TicketMessage, UserRole } from '../types';
import { api } from '../services/api';
import { MessageCircle, Plus, Send, X, User as UserIcon, Shield, Grid, List, Paperclip, Download, Image, FileText, ChevronDown, Check } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';

interface SupportProps {
    user: User;
    workspace: Workspace;
}

const TICKET_STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const;

const Support: React.FC<SupportProps> = ({ user, workspace }) => {
    const [tickets, setTickets] = useState<SupportTicket[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [replyText, setReplyText] = useState('');
    const [viewMode, setViewMode] = useState<'list' | 'grid'>(() => {
        return localStorage.getItem('supportViewMode') as 'list' | 'grid' || 'list';
    });

    // Attachments state
    const [attachments, setAttachments] = useState<{ name: string; url: string; type: string }[]>([]);
    const [uploading, setUploading] = useState(false);
    const [attachmentsEnabled, setAttachmentsEnabled] = useState(true);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Status dropdown state
    const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);

    // New Ticket Form State
    const [newSubject, setNewSubject] = useState('');
    const [newMessage, setNewMessage] = useState('');
    const [creating, setCreating] = useState(false);

    const toast = useToast();
    const { isDark } = useTheme();
    const isAdmin = user.role === UserRole.ADMIN || user.role === UserRole.OWNER;

    useEffect(() => {
        loadTickets();
        loadSettings();
    }, [workspace.id, isAdmin]);

    useEffect(() => {
        localStorage.setItem('supportViewMode', viewMode);
    }, [viewMode]);

    const loadTickets = async () => {
        setLoading(true);
        try {
            let data;
            if (isAdmin) {
                data = await api.support.getAllTickets();
            } else {
                data = await api.support.getTickets(workspace.id);
            }
            setTickets(data);
        } catch (e) {
            toast.error("Failed to load tickets");
        } finally {
            setLoading(false);
        }
    };

    const loadSettings = async () => {
        try {
            const settings = await api.support.getSettings();
            setAttachmentsEnabled(settings.supportAttachmentsEnabled);
        } catch (e) {
            // Default to true if error
        }
    };

    const handleCreateTicket = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newSubject.trim() || !newMessage.trim()) return;

        setCreating(true);
        try {
            await api.support.createTicket(workspace.id, user.id, newSubject, newMessage);
            toast.success("Support ticket created!");
            setIsModalOpen(false);
            setNewSubject('');
            setNewMessage('');
            await loadTickets();
        } catch (e) {
            toast.error("Failed to create ticket");
        } finally {
            setCreating(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setUploading(true);
        try {
            const uploaded: { name: string; url: string; type: string }[] = [];
            for (const file of Array.from(files)) {
                if (file.size > 10 * 1024 * 1024) {
                    toast.error(`File ${file.name} is too large (max 10MB)`);
                    continue;
                }
                const result = await api.support.uploadAttachment(file);
                uploaded.push(result);
            }
            setAttachments(prev => [...prev, ...uploaded]);
            toast.success(`${uploaded.length} file(s) uploaded`);
        } catch (e) {
            toast.error("Failed to upload file");
        } finally {
            setUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleRemoveAttachment = (index: number) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const handleReply = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTicket || (!replyText.trim() && attachments.length === 0)) return;

        const ticketId = selectedTicket.id;
        const tempMsg: TicketMessage = {
            id: `temp-${Date.now()}`,
            ticketId,
            senderId: user.id,
            senderName: isAdmin ? 'Support Agent' : user.name,
            content: replyText,
            createdAt: new Date().toISOString(),
            isAdmin,
            attachments
        };

        const updatedTicket = { ...selectedTicket, messages: [...selectedTicket.messages, tempMsg] };
        setSelectedTicket(updatedTicket);
        setTickets(prev => prev.map(t => t.id === ticketId ? updatedTicket : t));
        setReplyText('');
        setAttachments([]);

        try {
            if (attachments.length > 0) {
                await api.support.replyWithAttachments(ticketId, user.id, replyText, isAdmin, attachments);
            } else {
                await api.support.replyTicket(ticketId, user.id, replyText, isAdmin);
            }
        } catch (e) {
            toast.error("Failed to send reply");
        }
    };

    const handleStatusChange = async (newStatus: typeof TICKET_STATUSES[number]) => {
        if (!selectedTicket) return;

        try {
            await api.support.updateTicketStatus(selectedTicket.id, newStatus);
            const updatedTicket = { ...selectedTicket, status: newStatus };
            setSelectedTicket(updatedTicket);
            setTickets(prev => prev.map(t => t.id === selectedTicket.id ? updatedTicket : t));
            setStatusDropdownOpen(false);
            toast.success(`Ticket marked as ${newStatus.replace('_', ' ')}`);
        } catch (e) {
            toast.error("Failed to update status");
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'OPEN': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
            case 'IN_PROGRESS': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
            case 'RESOLVED': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
            case 'CLOSED': return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400';
            default: return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400';
        }
    };

    const getFileIcon = (type: string) => {
        if (type.startsWith('image/')) return Image;
        return FileText;
    };

    // Semantic colors
    const cardBg = 'bg-white dark:bg-slate-900';
    const borderColor = 'border-slate-200 dark:border-slate-800';
    const cardText = 'text-slate-900 dark:text-white';
    const subText = 'text-slate-500 dark:text-slate-400';

    // Grid view ticket card
    const TicketCard: React.FC<{ ticket: SupportTicket }> = ({ ticket }) => (
        <button
            onClick={() => setSelectedTicket(ticket)}
            className={`w-full text-left p-5 rounded-2xl border transition-all ${selectedTicket?.id === ticket.id
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/10 shadow-lg ring-2 ring-primary-500/50'
                : `${borderColor} hover:border-primary-300 dark:hover:border-primary-700 hover:shadow-md ${cardBg}`
                }`}
        >
            <div className="flex justify-between items-start mb-3">
                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${getStatusColor(ticket.status)}`}>
                    {ticket.status.replace('_', ' ')}
                </span>
                <span className={`text-xs ${subText}`}>{format(new Date(ticket.lastUpdateAt), 'MMM d, h:mm a')}</span>
            </div>
            <h3 className={`font-bold mb-2 line-clamp-2 ${cardText}`}>{ticket.subject}</h3>
            <p className={`text-sm line-clamp-2 ${subText} opacity-80`}>
                {ticket.messages[ticket.messages.length - 1]?.content || 'No messages yet'}
            </p>
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <span className={`text-xs ${subText}`}>{ticket.messages.length} messages</span>
                <span className={`px-1.5 py-0.5 text-[10px] rounded font-bold ${ticket.priority === 'HIGH' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                    ticket.priority === 'LOW' ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' :
                        'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                    }`}>{ticket.priority}</span>
            </div>
        </button>
    );

    // List view ticket row
    const TicketRow: React.FC<{ ticket: SupportTicket }> = ({ ticket }) => (
        <button
            onClick={() => setSelectedTicket(ticket)}
            className={`w-full text-left p-4 rounded-xl border transition-all ${selectedTicket?.id === ticket.id
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/10 shadow-sm ring-1 ring-primary-500'
                : `border-transparent hover:bg-slate-50 dark:hover:bg-slate-800 border-b-slate-100 dark:border-b-slate-800/50`
                }`}
        >
            <div className="flex justify-between items-start mb-2">
                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${getStatusColor(ticket.status)}`}>
                    {ticket.status.replace('_', ' ')}
                </span>
                <span className={`text-xs ${subText}`}>{format(new Date(ticket.lastUpdateAt), 'MMM d')}</span>
            </div>
            <h3 className={`font-semibold mb-1 line-clamp-1 ${cardText}`}>{ticket.subject}</h3>
            <p className={`text-sm line-clamp-2 ${subText} opacity-80`}>
                {ticket.messages[ticket.messages.length - 1]?.content}
            </p>
        </button>
    );

    return (
        <div className="h-[calc(100vh-10rem)] md:h-[calc(100vh-8rem)] flex flex-col gap-4 animate-fade-in">
            {/* Header with view toggle */}
            <div className="flex items-center justify-between flex-shrink-0">
                <div>
                    <h1 className={`text-2xl font-bold ${cardText}`}>
                        {isAdmin ? 'Support Tickets' : 'Get Help'}
                    </h1>
                    <p className={`text-sm ${subText}`}>
                        {isAdmin ? 'Manage and respond to user support requests' : 'View and manage your support requests'}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {/* View toggle */}
                    <div className={`flex items-center p-1 rounded-lg ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-md transition-all ${viewMode === 'list'
                                ? 'bg-white dark:bg-slate-700 shadow-sm text-primary-600 dark:text-primary-400'
                                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                            title="List view"
                        >
                            <List className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2 rounded-md transition-all ${viewMode === 'grid'
                                ? 'bg-white dark:bg-slate-700 shadow-sm text-primary-600 dark:text-primary-400'
                                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                            title="Grid view"
                        >
                            <Grid className="w-4 h-4" />
                        </button>
                    </div>
                    {!isAdmin && (
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors shadow-lg shadow-primary-500/20 font-medium"
                        >
                            <Plus className="w-5 h-5" />
                            <span className="hidden sm:inline">New Ticket</span>
                        </button>
                    )}
                </div>
            </div>

            <div className="flex gap-6 flex-1 min-h-0">
                {/* Ticket List/Grid */}
                <div className={`rounded-2xl shadow-card dark:shadow-none border ${borderColor} overflow-hidden ${cardBg} ${selectedTicket ? 'hidden md:flex' : 'flex'} flex-col ${viewMode === 'grid' ? 'w-full md:w-2/3' : 'w-full md:w-1/3'}`}>
                    <div className={`p-4 border-b flex justify-between items-center ${borderColor} bg-slate-50/50 dark:bg-slate-900/50 flex-shrink-0`}>
                        <h2 className={`font-bold ${cardText}`}>
                            {isAdmin ? 'All Tickets' : 'My Tickets'} ({tickets.length})
                        </h2>
                    </div>

                    <div className={`flex-1 overflow-y-auto p-3 ${viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-max' : 'space-y-2'}`}>
                        {viewMode === 'grid' ? (
                            tickets.map(ticket => <TicketCard key={ticket.id} ticket={ticket} />)
                        ) : (
                            tickets.map(ticket => <TicketRow key={ticket.id} ticket={ticket} />)
                        )}
                        {tickets.length === 0 && !loading && (
                            <div className={`py-12 text-center ${subText} ${viewMode === 'grid' ? 'col-span-full' : ''}`}>
                                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <MessageCircle className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                                </div>
                                <p>No tickets found.</p>
                            </div>
                        )}
                        {loading && (
                            <div className={`flex justify-center p-8 ${viewMode === 'grid' ? 'col-span-full' : ''}`}>
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Ticket Detail / Chat */}
                {(selectedTicket || viewMode === 'list') && (
                    <div className={`flex-1 rounded-2xl md:rounded-2xl rounded-b-none shadow-card dark:shadow-none border ${borderColor} flex-col overflow-hidden ${cardBg} ${selectedTicket ? 'flex fixed md:relative inset-0 top-auto h-[calc(100vh-6rem)] md:h-auto z-40' : 'hidden md:flex'} ${viewMode === 'grid' ? 'md:w-1/3' : ''}`}>
                        {selectedTicket ? (
                            <>
                                <div className={`p-4 border-b flex items-center justify-between ${borderColor} bg-slate-50/50 dark:bg-slate-900/50 flex-shrink-0`}>
                                    <div className="flex items-center gap-3 min-w-0">
                                        <button
                                            className={`md:hidden p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors ${subText}`}
                                            onClick={() => setSelectedTicket(null)}
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                        <div className="min-w-0">
                                            <h2 className={`font-bold ${cardText} text-lg line-clamp-1`}>{selectedTicket.subject}</h2>
                                            <p className={`text-xs ${subText} font-mono mt-0.5`}>ID: {selectedTicket.id.slice(0, 8)}...</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {/* Admin status dropdown */}
                                        {isAdmin && (
                                            <div className="relative">
                                                <button
                                                    onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
                                                    className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${getStatusColor(selectedTicket.status)} hover:opacity-80`}
                                                >
                                                    {selectedTicket.status.replace('_', ' ')}
                                                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${statusDropdownOpen ? 'rotate-180' : ''}`} />
                                                </button>
                                                {statusDropdownOpen && (
                                                    <div className={`absolute right-0 top-full mt-1 w-40 rounded-xl shadow-xl border ${borderColor} ${cardBg} z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150`}>
                                                        {TICKET_STATUSES.map(status => (
                                                            <button
                                                                key={status}
                                                                onClick={() => handleStatusChange(status)}
                                                                className={`w-full text-left px-4 py-2.5 text-sm font-medium flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${selectedTicket.status === status ? 'bg-slate-50 dark:bg-slate-800' : ''
                                                                    }`}
                                                            >
                                                                <span className={`px-2 py-0.5 rounded text-xs font-bold ${getStatusColor(status)}`}>
                                                                    {status.replace('_', ' ')}
                                                                </span>
                                                                {selectedTicket.status === status && (
                                                                    <Check className="w-4 h-4 text-primary-500" />
                                                                )}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        {!isAdmin && (
                                            <span className={`text-xs font-medium px-2 py-1 rounded-lg ${getStatusColor(selectedTicket.status)}`}>
                                                {selectedTicket.status.replace('_', ' ')}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className={`flex-1 overflow-y-auto p-6 space-y-6 ${isDark ? 'bg-slate-950' : 'bg-slate-50'}`}>
                                    {selectedTicket.messages.map(msg => {
                                        const isMe = msg.senderId === user.id;
                                        const isSupport = msg.isAdmin;
                                        const FileIcon = msg.attachments?.length ? getFileIcon(msg.attachments[0].type) : FileText;

                                        return (
                                            <div key={msg.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
                                                <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${isSupport ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' : (isDark ? 'bg-slate-800 text-slate-400' : 'bg-white text-slate-500 border border-slate-200')
                                                    }`}>
                                                    {isSupport ? <Shield className="w-5 h-5" /> : <UserIcon className="w-5 h-5" />}
                                                </div>
                                                <div className={`max-w-[80%] rounded-2xl p-4 shadow-sm ${isMe
                                                    ? 'bg-primary-600 text-white rounded-tr-sm'
                                                    : `bg-white dark:bg-slate-900 border ${borderColor} text-slate-700 dark:text-slate-200 rounded-tl-sm`
                                                    }`}>
                                                    <div className="flex items-baseline justify-between gap-4 mb-1">
                                                        <span className={`text-xs font-bold opacity-80 ${isMe ? 'text-white' : ''}`}>{msg.senderName}</span>
                                                        <span className={`text-[10px] opacity-60 ${isMe ? 'text-white' : ''}`}>
                                                            {format(new Date(msg.createdAt), 'h:mm a')}
                                                        </span>
                                                    </div>
                                                    {msg.content && (
                                                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                                                    )}
                                                    {/* Attachments */}
                                                    {msg.attachments && msg.attachments.length > 0 && (
                                                        <div className="mt-3 space-y-2">
                                                            {msg.attachments.map((att, i) => {
                                                                const AttIcon = getFileIcon(att.type);
                                                                return (
                                                                    <a
                                                                        key={i}
                                                                        href={att.url}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className={`flex items-center gap-2 p-2 rounded-lg transition-colors ${isMe ? 'bg-white/10 hover:bg-white/20' : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                                                                    >
                                                                        {att.type.startsWith('image/') ? (
                                                                            <img src={att.url} alt={att.name} className="w-16 h-16 object-cover rounded" />
                                                                        ) : (
                                                                            <AttIcon className="w-5 h-5 flex-shrink-0" />
                                                                        )}
                                                                        <span className="text-xs truncate flex-1">{att.name}</span>
                                                                        <Download className="w-4 h-4 flex-shrink-0 opacity-60" />
                                                                    </a>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Reply input */}
                                <div className={`p-4 pb-6 md:pb-4 border-t ${borderColor} ${cardBg} relative z-10 flex-shrink-0`}>
                                    {/* Pending attachments preview */}
                                    {attachments.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mb-3">
                                            {attachments.map((att, i) => {
                                                const AttIcon = getFileIcon(att.type);
                                                return (
                                                    <div key={i} className={`flex items-center gap-2 px-3 py-2 rounded-lg ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
                                                        <AttIcon className="w-4 h-4 text-slate-500" />
                                                        <span className="text-xs truncate max-w-[100px]">{att.name}</span>
                                                        <button
                                                            onClick={() => handleRemoveAttachment(i)}
                                                            className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"
                                                        >
                                                            <X className="w-3 h-3 text-slate-400" />
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                    <form onSubmit={handleReply} className="flex gap-2">
                                        {attachmentsEnabled && (
                                            <>
                                                <input
                                                    ref={fileInputRef}
                                                    type="file"
                                                    className="hidden"
                                                    multiple
                                                    onChange={handleFileUpload}
                                                    accept="image/*,.pdf,.doc,.docx,.txt,.zip"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => fileInputRef.current?.click()}
                                                    disabled={uploading}
                                                    className={`p-3 rounded-xl transition-colors ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-400' : 'bg-slate-100 hover:bg-slate-200 text-slate-500'} disabled:opacity-50`}
                                                    title="Attach file"
                                                >
                                                    {uploading ? (
                                                        <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                                    ) : (
                                                        <Paperclip className="w-5 h-5" />
                                                    )}
                                                </button>
                                            </>
                                        )}
                                        <input
                                            type="text"
                                            value={replyText}
                                            onChange={e => setReplyText(e.target.value)}
                                            placeholder="Type your reply..."
                                            className={`flex-1 border ${borderColor} rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary-500 outline-none bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 transition-all`}
                                        />
                                        <button
                                            type="submit"
                                            disabled={!replyText.trim() && attachments.length === 0}
                                            className="bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white px-5 py-3 rounded-xl font-bold transition-all shadow-md shadow-primary-500/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
                                        >
                                            <Send className="w-5 h-5" />
                                        </button>
                                    </form>
                                </div>
                            </>
                        ) : (
                            <div className={`flex-1 flex flex-col items-center justify-center ${subText}`}>
                                <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 ${isDark ? 'bg-slate-800' : 'bg-slate-50'}`}>
                                    <MessageCircle className={`w-10 h-10 ${isDark ? 'text-slate-600' : 'text-slate-300'}`} />
                                </div>
                                <h3 className={`text-lg font-semibold ${cardText} mb-2`}>No conversation selected</h3>
                                <p className="max-w-xs text-center">Select a ticket from the sidebar to view details or start a new conversation.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Create Ticket Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className={`rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200 border ${borderColor} ${cardBg}`}>
                        <div className={`p-5 border-b flex justify-between items-center ${borderColor}`}>
                            <h3 className={`font-bold ${cardText} text-lg`}>New Support Ticket</h3>
                            <button onClick={() => setIsModalOpen(false)} className={`${subText} hover:text-slate-700 dark:hover:text-slate-200 transition-colors`}>
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <form onSubmit={handleCreateTicket} className="p-6 space-y-5">
                            <div>
                                <label className={`block text-sm font-semibold mb-2 ${subText}`}>Subject</label>
                                <input
                                    type="text"
                                    value={newSubject}
                                    onChange={e => setNewSubject(e.target.value)}
                                    className={`w-full border ${borderColor} rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary-500 outline-none bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500`}
                                    placeholder="e.g. Connection Error"
                                    required
                                />
                            </div>
                            <div>
                                <label className={`block text-sm font-semibold mb-2 ${subText}`}>Message</label>
                                <textarea
                                    value={newMessage}
                                    onChange={e => setNewMessage(e.target.value)}
                                    className={`w-full border ${borderColor} rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary-500 outline-none h-32 resize-none bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500`}
                                    placeholder="Describe your issue detailedly..."
                                    required
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className={`px-5 py-2.5 rounded-xl font-medium transition-colors ${isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'}`}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={creating}
                                    className="px-5 py-2.5 bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800 rounded-xl font-bold shadow-lg shadow-primary-500/20 transition-all active:scale-95 disabled:opacity-50"
                                >
                                    {creating ? 'Creating...' : 'Create Ticket'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Support;