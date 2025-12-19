import React, { useState, useCallback, useEffect } from 'react';
import ReactFlow, {
  addEdge,
  Background,
  Controls,
  Connection,
  Edge,
  Node,
  useNodesState,
  useEdgesState,
  MiniMap,
  NodeMouseHandler
} from 'reactflow';
import { useParams, useNavigate } from 'react-router-dom';
import { Workspace } from '../types';
import { INITIAL_NODES, INITIAL_EDGES } from '../constants';
import { Save, ArrowLeft, PlayCircle, Settings2, Sparkles, MessageSquare, Zap, GitBranch } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import NodeConfigModal from '../components/NodeConfigModal';
import TriggerNodeForm from '../components/TriggerNodeForm';
import CommentReplyNodeForm from '../components/CommentReplyNodeForm';
import SendMessageNodeForm from '../components/SendMessageNodeForm';
import { api } from '../services/api';

interface FlowBuilderProps {
  workspace: Workspace;
}

interface NodeConfig {
  [nodeId: string]: any;
}

const FlowBuilder: React.FC<FlowBuilderProps> = ({ workspace }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { isDark } = useTheme();

  const [nodes, setNodes, onNodesChange] = useNodesState(INITIAL_NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState(INITIAL_EDGES);
  const [isSaving, setIsSaving] = useState(false);

  // Node configuration state
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [nodeConfigs, setNodeConfigs] = useState<NodeConfig>({});
  const [currentConfig, setCurrentConfig] = useState<any>({});

  // User API keys for AI integration
  const [userApiKeys, setUserApiKeys] = useState<any>({});

  useEffect(() => {
    // Load user's API keys from settings
    loadUserApiKeys();
  }, []);

  const loadUserApiKeys = async () => {
    try {
      const settings = await api.integrations.get(workspace.ownerId);
      setUserApiKeys({
        openaiApiKey: settings.openaiApiKey,
        geminiApiKey: settings.geminiApiKey
      });
    } catch (error) {
      console.error('Error loading API keys:', error);
    }
  };

  const onConnect = useCallback((params: Connection) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

  const onNodeDoubleClick: NodeMouseHandler = useCallback((event, node) => {
    console.log('Node double-clicked:', node);
    setSelectedNode(node);
    setCurrentConfig(nodeConfigs[node.id] || {});
    setShowConfigModal(true);
  }, [nodeConfigs]);

  const handleSaveConfig = () => {
    if (selectedNode) {
      setNodeConfigs(prev => ({
        ...prev,
        [selectedNode.id]: currentConfig
      }));
      toast.success(`Configuration saved for ${selectedNode.data.label}`);
      setShowConfigModal(false);
      setSelectedNode(null);
    }
  };

  const handleCloseModal = () => {
    setShowConfigModal(false);
    setSelectedNode(null);
    setCurrentConfig({});
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // TODO: Save flow with configurations to database
      await new Promise(r => setTimeout(r, 800));
      toast.success("Flow saved successfully!");
    } catch (error) {
      toast.error("Failed to save flow");
    } finally {
      setIsSaving(false);
    }
  };

  const addNode = (type: string, label: string) => {
    const newNode: Node = {
      id: `${Date.now()}`,
      type: type === 'trigger' ? 'input' : type === 'action' ? 'default' : 'output',
      data: { label: label, nodeType: type },
      position: { x: 250, y: nodes.length * 100 + 50 },
      style: {
        background: 'rgba(30, 41, 59, 0.8)',
        backdropFilter: 'blur(12px)',
        border: type === 'trigger' ? '1px solid #10b981' : type === 'ai' ? '1px solid #6366f1' : type === 'condition' ? '1px solid #f59e0b' : '1px solid #94a3b8',
        color: '#f8fafc',
        width: 180,
        boxShadow: type === 'trigger' ? '0 0 15px rgba(16, 185, 129, 0.3)' : type === 'ai' ? '0 0 15px rgba(99, 102, 241, 0.3)' : type === 'condition' ? '0 0 15px rgba(245, 158, 11, 0.3)' : '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
        borderRadius: '12px',
        padding: '10px',
        cursor: 'pointer'
      }
    };
    setNodes((nds) => nds.concat(newNode));
    toast.info(`Added ${label} node - Double-click to configure`);
  };

  const renderConfigForm = () => {
    if (!selectedNode) return null;

    const nodeLabel = selectedNode.data.label as string;
    const nodeType = selectedNode.data.nodeType as string;

    // Determine which form to show based on node label
    if (nodeLabel.includes('Comment') && nodeType === 'trigger') {
      return (
        <TriggerNodeForm
          workspaceId={workspace.id}
          initialConfig={currentConfig}
          onChange={setCurrentConfig}
        />
      );
    } else if (nodeLabel.includes('Comment') || nodeLabel.includes('Reply')) {
      return (
        <CommentReplyNodeForm
          userId={workspace.ownerId}
          initialConfig={currentConfig}
          onChange={setCurrentConfig}
          userApiKeys={userApiKeys}
        />
      );
    } else if (nodeLabel.includes('Message') || nodeLabel.includes('Send')) {
      return (
        <SendMessageNodeForm
          userId={workspace.ownerId}
          initialConfig={currentConfig}
          onChange={setCurrentConfig}
          userApiKeys={userApiKeys}
        />
      );
    }

    return (
      <div className="text-center py-8">
        <p className="text-slate-400">Configuration form for this node type is coming soon.</p>
      </div>
    );
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col -m-8 animate-fade-in relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-slate-950 z-0" />

      {/* Builder Header */}
      <div className="glass-panel border-b border-white/10 px-6 py-3 flex items-center justify-between z-20 shadow-lg relative">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/flows')}
            className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="font-bold text-white flex items-center gap-2 text-lg">
              {id?.startsWith('new') ? 'Untitled Flow' : 'Welcome Flow'}
              <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-normal border border-indigo-500/30">Draft</span>
            </h2>
            <p className="text-xs text-slate-500">Double-click nodes to configure</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-300 hover:bg-white/5 rounded-lg border border-transparent hover:border-white/10 transition-colors">
            <Settings2 className="w-4 h-4" />
            Config
          </button>
          <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-300 hover:bg-white/5 rounded-lg border border-transparent hover:border-white/10 transition-colors">
            <PlayCircle className="w-4 h-4" />
            Test
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl hover:shadow-lg hover:shadow-indigo-500/20 disabled:opacity-50 transition-all active:scale-95 border border-white/20"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Publish'}
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden relative z-10">
        {/* Nodes Sidebar */}
        <div className="w-72 glass-panel border-r border-white/10 overflow-y-auto p-5 flex flex-col gap-8 z-20 shadow-2xl">
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Triggers</h3>
            <div className="space-y-3">
              <button onClick={() => addNode('trigger', 'New Comment')} className="w-full flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-xl hover:border-green-500/50 hover:bg-green-500/10 hover:shadow-[0_0_15px_rgba(34,197,94,0.1)] transition-all text-left group">
                <div className="p-2.5 bg-green-500/20 text-green-400 rounded-lg group-hover:scale-110 transition-transform">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <span className="text-sm font-semibold text-slate-300 group-hover:text-white transition-colors">Comment</span>
              </button>
              <button onClick={() => addNode('trigger', 'DM Received')} className="w-full flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-xl hover:border-green-500/50 hover:bg-green-500/10 hover:shadow-[0_0_15px_rgba(34,197,94,0.1)] transition-all text-left group">
                <div className="p-2.5 bg-green-500/20 text-green-400 rounded-lg group-hover:scale-110 transition-transform">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <span className="text-sm font-semibold text-slate-300 group-hover:text-white transition-colors">Message</span>
              </button>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Logic & AI</h3>
            <div className="space-y-3">
              <button onClick={() => addNode('ai', 'AI Agent')} className="w-full flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-xl hover:border-indigo-500/50 hover:bg-indigo-500/10 hover:shadow-[0_0_15px_rgba(99,102,241,0.1)] transition-all text-left group">
                <div className="p-2.5 bg-indigo-500/20 text-indigo-400 rounded-lg group-hover:scale-110 transition-transform">
                  <Sparkles className="w-4 h-4" />
                </div>
                <span className="text-sm font-semibold text-slate-300 group-hover:text-white transition-colors">AI Agent</span>
              </button>
              <button onClick={() => addNode('condition', 'Condition')} className="w-full flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-xl hover:border-amber-500/50 hover:bg-amber-500/10 hover:shadow-[0_0_15px_rgba(245,158,11,0.1)] transition-all text-left group">
                <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-lg group-hover:scale-110 transition-transform">
                  <GitBranch className="w-4 h-4" />
                </div>
                <span className="text-sm font-semibold text-slate-300 group-hover:text-white transition-colors">Condition</span>
              </button>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Actions</h3>
            <div className="space-y-3">
              <button onClick={() => addNode('action', 'Comment Reply')} className="w-full flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-xl hover:border-blue-400/50 hover:bg-blue-500/10 transition-all text-left group">
                <div className="p-2.5 bg-blue-500/20 text-blue-300 rounded-lg group-hover:scale-110 transition-transform">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <span className="text-sm font-semibold text-slate-300 group-hover:text-white transition-colors">Comment Reply</span>
              </button>
              <button onClick={() => addNode('action', 'Send Message')} className="w-full flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-xl hover:border-purple-400/50 hover:bg-purple-500/10 transition-all text-left group">
                <div className="p-2.5 bg-purple-500/20 text-purple-300 rounded-lg group-hover:scale-110 transition-transform">
                  <Zap className="w-4 h-4" />
                </div>
                <span className="text-sm font-semibold text-slate-300 group-hover:text-white transition-colors">Send Message</span>
              </button>
            </div>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 h-full bg-slate-950 transition-colors">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeDoubleClick={onNodeDoubleClick}
            fitView
            className="bg-slate-950 transition-colors"
          >
            <Background color="#1e293b" gap={20} />
            <Controls className="bg-slate-800 border-slate-700 fill-slate-300 stroke-slate-300 shadow-xl" />
            <MiniMap
              className="bg-slate-900 border-slate-700 shadow-xl rounded-lg overflow-hidden"
              maskColor="rgba(15, 23, 42, 0.7)"
              nodeColor={(n) => {
                if (n.type === 'input') return '#10b981';
                if (n.type === 'output') return '#64748b';
                if (n.type === 'default') return '#1e293b';
                return '#3b82f6';
              }}
            />
          </ReactFlow>
        </div>
      </div>

      {/* Configuration Modal */}
      {selectedNode && (
        <NodeConfigModal
          isOpen={showConfigModal}
          onClose={handleCloseModal}
          nodeType={selectedNode.data.nodeType as string || 'node'}
          nodeLabel={selectedNode.data.label as string}
          onSave={handleSaveConfig}
        >
          {renderConfigForm()}
        </NodeConfigModal>
      )}
    </div>
  );
};

export default FlowBuilder;