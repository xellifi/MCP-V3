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

interface FlowBuilderProps {
  workspace: Workspace;
}

const FlowBuilder: React.FC<FlowBuilderProps> = ({ workspace }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  
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
        background: type === 'trigger' ? '#064e3b' : type === 'ai' ? '#172554' : '#1e293b',
        border: type === 'trigger' ? '1px solid #059669' : type === 'ai' ? '1px solid #2563eb' : '1px solid #334155',
        color: '#f8fafc',
        width: 180
      }
    };
    setNodes((nds) => nds.concat(newNode));
    toast.info(`Added ${label} node`);
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col -m-8">
      {/* Builder Header */}
      <div className="bg-slate-900 border-b border-slate-800 px-6 py-3 flex items-center justify-between z-10">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/flows')}
            className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="font-bold text-slate-100 flex items-center gap-2">
              {id?.startsWith('new') ? 'Untitled Flow' : 'Welcome Flow'}
              <span className="px-2 py-0.5 rounded-full bg-yellow-900/30 text-yellow-400 text-xs font-normal border border-yellow-800">Draft</span>
            </h2>
            <p className="text-xs text-slate-500">Last saved 2 mins ago</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-400 hover:bg-slate-800 rounded-lg border border-transparent hover:border-slate-700 transition-colors">
            <Settings2 className="w-4 h-4" />
            Config
          </button>
           <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-400 hover:bg-slate-800 rounded-lg border border-transparent hover:border-slate-700 transition-colors">
            <PlayCircle className="w-4 h-4" />
            Test
          </button>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-lg shadow-blue-900/20"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Publish'}
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Nodes Sidebar */}
        <div className="w-64 bg-slate-900 border-r border-slate-800 overflow-y-auto p-4 flex flex-col gap-6 z-10">
          
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Triggers</h3>
            <div className="space-y-2">
              <button onClick={() => addNode('trigger', 'New Comment')} className="w-full flex items-center gap-3 p-3 bg-slate-950 border border-slate-800 rounded-lg hover:border-green-500 hover:shadow-sm transition-all text-left group">
                <div className="p-2 bg-green-900/20 text-green-400 rounded-md group-hover:bg-green-900/30">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium text-slate-300 group-hover:text-slate-100">Comment</span>
              </button>
              <button onClick={() => addNode('trigger', 'DM Received')} className="w-full flex items-center gap-3 p-3 bg-slate-950 border border-slate-800 rounded-lg hover:border-green-500 hover:shadow-sm transition-all text-left group">
                <div className="p-2 bg-green-900/20 text-green-400 rounded-md group-hover:bg-green-900/30">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium text-slate-300 group-hover:text-slate-100">Message</span>
              </button>
            </div>
          </div>

          <div>
             <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Logic & AI</h3>
             <div className="space-y-2">
                <button onClick={() => addNode('ai', 'AI Agent')} className="w-full flex items-center gap-3 p-3 bg-slate-950 border border-slate-800 rounded-lg hover:border-blue-500 hover:shadow-sm transition-all text-left group">
                  <div className="p-2 bg-blue-900/20 text-blue-400 rounded-md group-hover:bg-blue-900/30">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-medium text-slate-300 group-hover:text-slate-100">AI Agent</span>
                </button>
                <button onClick={() => addNode('condition', 'Condition')} className="w-full flex items-center gap-3 p-3 bg-slate-950 border border-slate-800 rounded-lg hover:border-amber-500 hover:shadow-sm transition-all text-left group">
                  <div className="p-2 bg-amber-900/20 text-amber-400 rounded-md group-hover:bg-amber-900/30">
                    <GitBranch className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-medium text-slate-300 group-hover:text-slate-100">Condition</span>
                </button>
             </div>
          </div>

          <div>
             <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Actions</h3>
             <div className="space-y-2">
                <button onClick={() => addNode('action', 'Send Message')} className="w-full flex items-center gap-3 p-3 bg-slate-950 border border-slate-800 rounded-lg hover:border-slate-500 hover:shadow-sm transition-all text-left group">
                  <div className="p-2 bg-slate-800 text-slate-400 rounded-md group-hover:bg-slate-700">
                    <Zap className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-medium text-slate-300 group-hover:text-slate-100">Send Message</span>
                </button>
             </div>
          </div>

        </div>

        {/* Canvas */}
        <div className="flex-1 h-full bg-slate-950">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            fitView
            className="bg-slate-950"
          >
            <Background color="#334155" gap={16} />
            <Controls className="bg-slate-800 border-slate-700 fill-slate-300 stroke-slate-300" />
            <MiniMap 
              className="bg-slate-900 border-slate-700"
              maskColor="rgba(15, 23, 42, 0.7)"
              nodeColor={(n) => {
                if (n.type === 'input') return '#059669';
                if (n.type === 'output') return '#334155';
                if (n.type === 'default') return '#1e293b';
                return '#2563eb';
              }}
            />
          </ReactFlow>
        </div>
      </div>
    </div>
  );
};

export default FlowBuilder;