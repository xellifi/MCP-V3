import React, { useEffect, useState } from 'react';
import { User, Workspace, SupportTicket, TicketMessage, UserRole } from '../types';
import { api } from '../services/api';
import { MessageCircle, Plus, Send, Clock, CheckCircle, AlertCircle, X, User as UserIcon, Shield } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '../context/ToastContext';

interface SupportProps {
  user: User;
  workspace: Workspace;
}

const Support: React.FC<SupportProps> = ({ user, workspace }) => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [replyText, setReplyText] = useState('');
  
  // New Ticket Form State
  const [newSubject, setNewSubject] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [creating, setCreating] = useState(false);

  const toast = useToast();
  const isAdmin = user.role === UserRole.ADMIN || user.role === UserRole.OWNER;

  useEffect(() => {
    loadTickets();
  }, [workspace.id, isAdmin]);

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

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyText.trim()) return;

    const ticketId = selectedTicket.id;
    // Optimistic update
    const tempMsg: TicketMessage = {
        id: `temp-${Date.now()}`,
        ticketId,
        senderId: user.id,
        senderName: isAdmin ? 'Support Agent' : user.name,
        content: replyText,
        createdAt: new Date().toISOString(),
        isAdmin
    };
    
    const updatedTicket = { ...selectedTicket, messages: [...selectedTicket.messages, tempMsg] };
    setSelectedTicket(updatedTicket);
    setTickets(prev => prev.map(t => t.id === ticketId ? updatedTicket : t));
    setReplyText('');

    try {
        await api.support.replyTicket(ticketId, user.id, tempMsg.content, isAdmin);
    } catch (e) {
        toast.error("Failed to send reply");
    }
  };

  const getStatusColor = (status: string) => {
      switch(status) {
          case 'OPEN': return 'bg-blue-100 text-blue-700';
          case 'IN_PROGRESS': return 'bg-amber-100 text-amber-700';
          case 'RESOLVED': return 'bg-green-100 text-green-700';
          case 'CLOSED': return 'bg-slate-100 text-slate-700';
          default: return 'bg-slate-100 text-slate-700';
      }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex gap-6">
        {/* Ticket List */}
        <div className={`flex-col bg-white rounded-xl shadow-sm border border-slate-200 w-full md:w-1/3 overflow-hidden ${selectedTicket ? 'hidden md:flex' : 'flex'}`}>
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h2 className="font-bold text-slate-900">Support Tickets</h2>
                {!isAdmin && (
                    <button 
                        onClick={() => setIsModalOpen(true)}
                        className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                )}
            </div>
            
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {tickets.map(ticket => (
                    <button 
                        key={ticket.id}
                        onClick={() => setSelectedTicket(ticket)}
                        className={`w-full text-left p-4 rounded-lg border transition-all ${
                            selectedTicket?.id === ticket.id 
                            ? 'border-blue-500 bg-blue-50 shadow-md ring-1 ring-blue-500' 
                            : 'border-slate-100 hover:bg-slate-50 hover:border-slate-200'
                        }`}
                    >
                        <div className="flex justify-between items-start mb-1">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded ${getStatusColor(ticket.status)}`}>
                                {ticket.status}
                            </span>
                            <span className="text-xs text-slate-400">{format(new Date(ticket.lastUpdateAt), 'MMM d')}</span>
                        </div>
                        <h3 className="font-semibold text-slate-900 mb-1 line-clamp-1">{ticket.subject}</h3>
                        <p className="text-sm text-slate-500 line-clamp-2">
                            {ticket.messages[ticket.messages.length - 1]?.content}
                        </p>
                    </button>
                ))}
                {tickets.length === 0 && !loading && (
                    <div className="p-8 text-center text-slate-400">
                        <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-20" />
                        <p>No tickets found.</p>
                    </div>
                )}
            </div>
        </div>

        {/* Ticket Detail / Chat */}
        <div className={`flex-1 bg-white rounded-xl shadow-sm border border-slate-200 flex-col overflow-hidden ${selectedTicket ? 'flex' : 'hidden md:flex'}`}>
            {selectedTicket ? (
                <>
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                        <div className="flex items-center gap-3">
                            <button className="md:hidden p-1" onClick={() => setSelectedTicket(null)}>
                                <X className="w-5 h-5 text-slate-500" />
                            </button>
                            <div>
                                <h2 className="font-bold text-slate-900">{selectedTicket.subject}</h2>
                                <p className="text-xs text-slate-500">Ticket ID: {selectedTicket.id}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                             {/* Only Admin controls typically go here */}
                             <span className="text-xs text-slate-400">Priority: {selectedTicket.priority}</span>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
                        {selectedTicket.messages.map(msg => {
                            const isMe = msg.senderId === user.id;
                            const isSupport = msg.isAdmin;
                            
                            return (
                                <div key={msg.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                                        isSupport ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-200 text-slate-600'
                                    }`}>
                                        {isSupport ? <Shield className="w-4 h-4" /> : <UserIcon className="w-4 h-4" />}
                                    </div>
                                    <div className={`max-w-[80%] rounded-xl p-3 shadow-sm ${
                                        isMe 
                                        ? 'bg-blue-600 text-white rounded-tr-none' 
                                        : 'bg-white border border-slate-100 text-slate-800 rounded-tl-none'
                                    }`}>
                                        <div className="text-xs font-bold mb-1 opacity-80">{msg.senderName}</div>
                                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                        <div className="text-[10px] mt-1 text-right opacity-60">
                                            {format(new Date(msg.createdAt), 'h:mm a')}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="p-4 border-t border-slate-200 bg-white">
                        <form onSubmit={handleReply} className="flex gap-2">
                            <input 
                                type="text" 
                                value={replyText}
                                onChange={e => setReplyText(e.target.value)}
                                placeholder="Type your reply..."
                                className="flex-1 border border-slate-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                            <button 
                                type="submit" 
                                disabled={!replyText.trim()}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </form>
                    </div>
                </>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                        <MessageCircle className="w-8 h-8 text-slate-300" />
                    </div>
                    <p>Select a ticket to view details</p>
                </div>
            )}
        </div>

        {/* Create Ticket Modal */}
        {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                    <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                        <h3 className="font-bold text-slate-900">New Support Ticket</h3>
                        <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <form onSubmit={handleCreateTicket} className="p-4 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
                            <input 
                                type="text" 
                                value={newSubject}
                                onChange={e => setNewSubject(e.target.value)}
                                className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="e.g. Connection Error"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Message</label>
                            <textarea 
                                value={newMessage}
                                onChange={e => setNewMessage(e.target.value)}
                                className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none h-32 resize-none"
                                placeholder="Describe your issue..."
                                required
                            />
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <button 
                                type="button" 
                                onClick={() => setIsModalOpen(false)}
                                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                            >
                                Cancel
                            </button>
                            <button 
                                type="submit" 
                                disabled={creating}
                                className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg font-medium shadow-sm disabled:opacity-50"
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