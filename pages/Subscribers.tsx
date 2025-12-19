import React, { useEffect, useState } from 'react';
import { Workspace, Subscriber } from '../types';
import { api } from '../services/api';
import { Search, Filter, Download, User, MoreHorizontal, Facebook, Instagram } from 'lucide-react';
import { format } from 'date-fns';

interface SubscribersProps {
  workspace: Workspace;
}

const Subscribers: React.FC<SubscribersProps> = ({ workspace }) => {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSubscribers = async () => {
      setLoading(true);
      const data = await api.workspace.getSubscribers(workspace.id);
      setSubscribers(data);
      setLoading(false);
    };
    loadSubscribers();
  }, [workspace.id]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight text-glow">Subscribers</h1>
          <p className="text-slate-400 mt-1">Manage and view your audience contacts</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-slate-200 hover:bg-white/10 font-medium transition-colors shadow-sm">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      <div className="glass-panel rounded-2xl overflow-hidden text-slate-100">
        {/* Toolbar */}
        <div className="p-4 border-b border-white/10 flex flex-col sm:flex-row gap-4 bg-white/5 backdrop-blur-sm">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search subscribers by name..."
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-black/20 border border-white/10 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent placeholder-slate-500 transition-all"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2.5 border border-white/10 bg-black/20 rounded-xl text-slate-300 hover:bg-white/5 text-sm font-medium transition-colors shadow-sm">
            <Filter className="w-4 h-4" />
            Filter
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-white/5 text-slate-400 text-xs uppercase font-semibold border-b border-white/10">
              <tr>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Tags</th>
                <th className="px-6 py-4">Last Active</th>
                <th className="px-6 py-4 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-500"></div>
                    </div>
                  </td>
                </tr>
              ) : subscribers.map(sub => (
                <tr key={sub.id} className="hover:bg-white/5 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        {sub.avatarUrl ? (
                          <img src={sub.avatarUrl} alt={sub.name} className="w-10 h-10 rounded-full object-cover border border-white/10" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-slate-400">
                            <User className="w-5 h-5" />
                          </div>
                        )}
                        <div className={`absolute -bottom-1 -right-1 p-0.5 rounded-full bg-slate-900 border border-slate-700 shadow-sm ${sub.platform === 'FACEBOOK' ? 'text-blue-500' : 'text-pink-500'
                          }`}>
                          {sub.platform === 'FACEBOOK' ? <Facebook className="w-3 h-3" /> : <Instagram className="w-3 h-3" />}
                        </div>
                      </div>
                      <div>
                        <p className="font-semibold text-white">{sub.name}</p>
                        <p className="text-xs text-slate-500 font-mono">ID: {sub.externalId}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${sub.status === 'SUBSCRIBED'
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                      : 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                      }`}>
                      {sub.status.charAt(0) + sub.status.slice(1).toLowerCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {sub.tags.map(tag => (
                        <span key={tag} className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 rounded text-xs border border-indigo-500/30 font-medium">
                          {tag}
                        </span>
                      ))}
                      {sub.tags.length === 0 && <span className="text-slate-500 text-sm">-</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-400">
                    {format(new Date(sub.lastActiveAt), 'MMM d, yyyy')}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {subscribers.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center">
                      <User className="w-12 h-12 text-slate-600 mb-3" />
                      <p>No subscribers found.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Subscribers;