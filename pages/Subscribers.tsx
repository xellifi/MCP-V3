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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Subscribers</h1>
          <p className="text-slate-400 mt-1">Manage and view your audience contacts</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 hover:bg-slate-700 font-medium transition-colors">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      <div className="bg-slate-800/50 rounded-xl shadow-lg border border-slate-700 overflow-hidden backdrop-blur-sm">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-700 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search subscribers by name..."
              className="w-full pl-10 pr-4 py-2 text-sm bg-slate-900 border border-slate-700 text-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-slate-500"
            />
          </div>
          <button className="flex items-center gap-2 px-3 py-2 border border-slate-700 rounded-lg text-slate-300 hover:bg-slate-700 text-sm font-medium">
            <Filter className="w-4 h-4" />
            Filter
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-900/50 text-slate-400 text-xs uppercase font-semibold">
              <tr>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Tags</th>
                <th className="px-6 py-4">Last Active</th>
                <th className="px-6 py-4 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {subscribers.map(sub => (
                <tr key={sub.id} className="hover:bg-slate-700/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        {sub.avatarUrl ? (
                          <img src={sub.avatarUrl} alt={sub.name} className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-slate-400">
                            <User className="w-5 h-5" />
                          </div>
                        )}
                        <div className={`absolute -bottom-1 -right-1 p-0.5 rounded-full bg-slate-800 border border-slate-700 shadow-sm ${sub.platform === 'FACEBOOK' ? 'text-blue-400' : 'text-pink-400'
                          }`}>
                          {sub.platform === 'FACEBOOK' ? <Facebook className="w-3 h-3" /> : <Instagram className="w-3 h-3" />}
                        </div>
                      </div>
                      <div>
                        <p className="font-medium text-slate-100">{sub.name}</p>
                        <p className="text-xs text-slate-500 font-mono">ID: {sub.externalId}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${sub.status === 'SUBSCRIBED'
                        ? 'bg-green-900/30 text-green-400 border border-green-800'
                        : 'bg-slate-700 text-slate-400'
                      }`}>
                      {sub.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {sub.tags.map(tag => (
                        <span key={tag} className="px-2 py-0.5 bg-blue-900/30 text-blue-400 rounded text-xs border border-blue-800">
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
                    <button className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded-lg">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {subscribers.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    No subscribers found.
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