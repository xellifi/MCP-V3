import React, { useEffect, useState } from 'react';
import { Workspace, Flow } from '../types';
import { api } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, MoreHorizontal, Play, Edit, Trash } from 'lucide-react';
import { format } from 'date-fns';

interface FlowsProps {
  workspace: Workspace;
}

const Flows: React.FC<FlowsProps> = ({ workspace }) => {
  const [flows, setFlows] = useState<Flow[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadFlows = async () => {
      setLoading(true);
      const data = await api.workspace.getFlows(workspace.id);
      setFlows(data);
      setLoading(false);
    };
    loadFlows();
  }, [workspace.id]);

  const handleCreate = () => {
    // In a real app, create a new flow in DB then redirect
    // For demo, just go to a new ID
    navigate(`/flows/new-${Date.now()}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Automations</h1>
          <p className="text-slate-400 mt-1">Build flows to automate conversations</p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium shadow-lg shadow-blue-900/30 transition-all"
        >
          <Plus className="w-5 h-5" />
          New Flow
        </button>
      </div>

      <div className="bg-slate-800/50 rounded-xl shadow-lg border border-slate-700 overflow-hidden backdrop-blur-sm">
        <div className="p-4 border-b border-slate-700 flex gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search flows..."
              className="w-full pl-10 pr-4 py-2 text-sm bg-slate-900 border border-slate-700 text-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-slate-500"
            />
          </div>
          <select className="px-4 py-2 text-sm bg-slate-900 border border-slate-700 text-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option>All Status</option>
            <option>Active</option>
            <option>Draft</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-900/50 text-slate-400 text-xs uppercase font-semibold">
              <tr>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Last Updated</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {flows.map(flow => (
                <tr key={flow.id} className="hover:bg-slate-700/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-900/30 text-blue-400 flex items-center justify-center">
                        <Play className="w-5 h-5" />
                      </div>
                      <span className="font-medium text-slate-100">{flow.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${flow.status === 'ACTIVE'
                        ? 'bg-green-900/30 text-green-400 border border-green-800'
                        : 'bg-slate-700 text-slate-400'
                      }`}>
                      {flow.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-400">
                    {format(new Date(flow.updatedAt), 'MMM d, yyyy HH:mm')}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => navigate(`/flows/${flow.id}`)}
                        className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-900/30 rounded-lg"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-900/30 rounded-lg">
                        <Trash className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {flows.length === 0 && !loading && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                    No flows found. Create one to get started!
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