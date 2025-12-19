import React, { useState, useCallback } from 'react';
import ReactFlow, {
  addEdge,
  Background,
  Controls,
  Connection,
  Edge,
  Node,
  useNodesState,
  useEdgesState,
  MiniMap
} from 'reactflow';
import { useParams, useNavigate } from 'react-router-dom';
import { Workspace } from '../types';
import { INITIAL_NODES, INITIAL_EDGES } from '../constants';
import { Save, ArrowLeft, PlayCircle, Settings2, Sparkles, MessageSquare, Zap, GitBranch } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';

interface FlowBuilderProps {
  workspace: Workspace;
}

const FlowBuilder: React.FC<FlowBuilderProps> = ({ workspace }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { isDark } = useTheme();

  const [nodes, setNodes, onNodesChange] = useNodesState(INITIAL_NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState(INITIAL_EDGES);
  const [isSaving, setIsSaving] = useState(false);

  const onConnect = useCallback((params: Connection) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate API call
    await new Promise(r => setTimeout(r, 800));
    setIsSaving(false);
    toast.success("Flow saved successfully!");
  };

  const addNode = (type: string, label: string) => {
    const newNode: Node = {
      id: `${Date.now()}`,
      type: type === 'trigger' ? 'input' : type === 'action' ? 'default' : 'output',
      data: { label: label },
      position: { x: 250, y: nodes.length * 100 + 50 },
      style: {
        background: type === 'trigger' ? (isDark ? '#064e3b' : '#ecfdf5') : type === 'ai' ? (isDark ? '#172554' : '#eff6ff') : (isDark ? '#1e293b' : '#f8fafc'),
        border: type === 'trigger' ? (isDark ? '1px solid #059669' : '1px solid #10b981') : type === 'ai' ? (isDark ? '1px solid #2563eb' : '1px solid #3b82f6') : (isDark ? '1px solid #334155' : '1px solid #cbd5e1'),
        color: isDark ? '#f8fafc' : '#1e293b',
        width: 180,
        boxShadow: isDark ? 'none' : '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'
      }
    };
    setNodes((nds) => nds.concat(newNode));
    toast.info(`Added ${label} node`);
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col -m-8 animate-fade-in">
      {/* Builder Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-3 flex items-center justify-between z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/flows')}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-400 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
              {id?.startsWith('new') ? 'Untitled Flow' : 'Welcome Flow'}
              <span className="px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 text-xs font-normal border border-yellow-200 dark:border-yellow-800">Draft</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-500">Last saved 2 mins ago</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-colors">
            <Settings2 className="w-4 h-4" />
            Config
          </button>
          <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-colors">
            <PlayCircle className="w-4 h-4" />
            Test
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50 transition-all shadow-lg shadow-primary-500/20 active:scale-95"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Publish'}
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Nodes Sidebar */}
        <div className="w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 overflow-y-auto p-5 flex flex-col gap-8 z-10 shadow-lg md:shadow-none">

          <div>
            <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4">Triggers</h3>
            <div className="space-y-3">
              <button onClick={() => addNode('trigger', 'New Comment')} className="w-full flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-green-500 dark:hover:border-green-500 hover:shadow-md transition-all text-left group">
                <div className="p-2.5 bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400 rounded-lg group-hover:scale-110 transition-transform">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">Comment</span>
              </button>
              <button onClick={() => addNode('trigger', 'DM Received')} className="w-full flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-green-500 dark:hover:border-green-500 hover:shadow-md transition-all text-left group">
                <div className="p-2.5 bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400 rounded-lg group-hover:scale-110 transition-transform">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">Message</span>
              </button>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4">Logic & AI</h3>
            <div className="space-y-3">
              <button onClick={() => addNode('ai', 'AI Agent')} className="w-full flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-primary-500 dark:hover:border-primary-500 hover:shadow-md transition-all text-left group">
                <div className="p-2.5 bg-primary-100 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400 rounded-lg group-hover:scale-110 transition-transform">
                  <Sparkles className="w-4 h-4" />
                </div>
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">AI Agent</span>
              </button>
              <button onClick={() => addNode('condition', 'Condition')} className="w-full flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-amber-500 dark:hover:border-amber-500 hover:shadow-md transition-all text-left group">
                <div className="p-2.5 bg-amber-100 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400 rounded-lg group-hover:scale-110 transition-transform">
                  <GitBranch className="w-4 h-4" />
                </div>
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">Condition</span>
              </button>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4">Actions</h3>
            <div className="space-y-3">
              <button onClick={() => addNode('action', 'Send Message')} className="w-full flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-slate-500 dark:hover:border-slate-500 hover:shadow-md transition-all text-left group">
                <div className="p-2.5 bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400 rounded-lg group-hover:scale-110 transition-transform">
                  <Zap className="w-4 h-4" />
                </div>
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">Send Message</span>
              </button>
            </div>
          </div>

        </div>

        {/* Canvas */}
        <div className="flex-1 h-full bg-slate-50 dark:bg-slate-950 transition-colors">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            fitView
            className="bg-slate-50 dark:bg-slate-950 transition-colors"
          >
            <Background color={isDark ? "#334155" : "#cbd5e1"} gap={20} />
            <Controls className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 fill-slate-600 dark:fill-slate-300 stroke-slate-600 dark:stroke-slate-300 shadow-md" />
            <MiniMap
              className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 shadow-md"
              maskColor={isDark ? "rgba(15, 23, 42, 0.7)" : "rgba(241, 245, 249, 0.7)"}
              nodeColor={(n) => {
                if (n.type === 'input') return isDark ? '#059669' : '#10b981';
                if (n.type === 'output') return isDark ? '#334155' : '#64748b';
                if (n.type === 'default') return isDark ? '#1e293b' : '#94a3b8';
                return isDark ? '#2563eb' : '#3b82f6';
              }}
            />
          </ReactFlow>
        </div>
      </div>
    </div>
  );
};

export default FlowBuilder;