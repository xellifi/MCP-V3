import React, { useEffect, useState } from 'react';
import { Workspace, Flow, ConnectedPage } from '../types';
import { api } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, MoreHorizontal, Play, Edit, Trash, Zap, Facebook } from 'lucide-react';
import { format } from 'date-fns';

interface FlowsProps {
  workspace: Workspace;
}

const Flows: React.FC<FlowsProps> = ({ workspace }) => {
  const [flows, setFlows] = useState<Flow[]>([]);
  const [pages, setPages] = useState<ConnectedPage[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Fetch flows and pages in parallel
        const [flowsData, pagesData] = await Promise.all([
          api.workspace.getFlows(workspace.id),
          api.workspace.getConnectedPages(workspace.id)
        ]);
        setFlows(flowsData);
        setPages(pagesData);
      } catch (error) {
        console.error('Error loading flows data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [workspace.id]);

  // Get page info from flow configuration (trigger node stores pageId)
  const getFlowPage = (flow: Flow): ConnectedPage | null => {
    if (!flow.configurations) return null;

    // Find trigger node configuration that has pageId
    for (const nodeId in flow.configurations) {
      const config = flow.configurations[nodeId];
      if (config?.pageId) {
        // pageId in config refers to connected_pages.id
        return pages.find(p => p.id === config.pageId) || null;
      }
    }
    return null;
  };

  const handleCreate = () => {
    // In a real app, create a new flow in DB then redirect
    // For demo, just go to a new ID
    navigate(`/flows/new-${Date.now()}`);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight text-glow">Automations</h1>
          <p className="text-slate-400 mt-1 text-lg">Build flows to automate conversations</p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-indigo-500/20 transition-all active:scale-95 border border-white/20"
        >
          <Plus className="w-5 h-5" />
          New Flow
        </button>
      </div>

      <div className="glass-panel rounded-2xl overflow-hidden text-slate-100">
        <div className="p-4 border-b border-white/10 flex flex-col md:flex-row gap-4 bg-white/5 backdrop-blur-sm">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search flows..."
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-black/20 border border-white/10 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent placeholder-slate-500 transition-all"
            />
          </div>
          <select className="px-4 py-2.5 text-sm bg-black/20 border border-white/10 text-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all">
            <option>All Status</option>
            <option>Active</option>
            <option>Draft</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-white/5 text-slate-400 text-xs uppercase font-bold border-b border-white/10">
              <tr>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Page</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Last Updated</th>
                <th className="px-6 py-4 text-right">Actions</th>
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
              ) : flows.map(flow => {
                const flowPage = getFlowPage(flow);
                return (
                  <tr key={flow.id} className="hover:bg-white/5 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shadow-lg shadow-indigo-500/10 border border-indigo-500/20">
                          <Zap className="w-5 h-5 drop-shadow-glow" />
                        </div>
                        <span className="font-semibold text-white">{flow.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {flowPage ? (
                        <div className="flex items-center gap-3">
                          <img
                            src={flowPage.pageImageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(flowPage.name)}&background=1877F2&color=fff`}
                            alt={flowPage.name}
                            className="w-8 h-8 rounded-full object-cover border-2 border-blue-500/30"
                          />
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-white truncate max-w-[150px]">{flowPage.name}</span>
                            <span className="text-xs text-slate-500">Facebook Page</span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-slate-500">
                          <Facebook className="w-4 h-4" />
                          <span className="text-sm">No page assigned</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold ${flow.status === 'ACTIVE'
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                        : 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                        }`}>
                        {flow.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-400">
                      {format(new Date(flow.updatedAt), 'MMM d, yyyy HH:mm')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => navigate(`/flows/${flow.id}`)}
                          className="p-2 text-slate-400 hover:text-indigo-400 hover:bg-white/5 rounded-lg transition-colors border border-transparent hover:border-white/10"
                          title="Edit Flow"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          className="p-2 text-slate-400 hover:text-red-400 hover:bg-white/5 rounded-lg transition-colors border border-transparent hover:border-white/10"
                          title="Delete Flow"
                        >
                          <Trash className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {flows.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4 border border-white/10">
                        <Zap className="w-8 h-8 text-slate-500" />
                      </div>
                      <h3 className="text-lg font-bold text-white mb-1">No automations yet</h3>
                      <p className="max-w-xs mx-auto mb-6">Create your first flow to start automating conversations.</p>
                      <button
                        onClick={handleCreate}
                        className="text-indigo-400 font-bold hover:text-indigo-300 hover:underline"
                      >
                        Create New Flow
                      </button>
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

export default Flows;