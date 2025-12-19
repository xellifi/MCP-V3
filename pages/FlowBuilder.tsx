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
  NodeMouseHandler,
  EdgeMouseHandler,
  NodeTypes
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useParams, useNavigate } from 'react-router-dom';
import { Workspace } from '../types';
import { Save, ArrowLeft, PlayCircle, Menu, X, Grid3x3 } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import NodeConfigModal from '../components/NodeConfigModal';
import TriggerNodeForm from '../components/TriggerNodeForm';
import CommentReplyNodeForm from '../components/CommentReplyNodeForm';
import SendMessageNodeForm from '../components/SendMessageNodeForm';
import CustomTriggerNode from '../components/nodes/CustomTriggerNode';
import CustomActionNode from '../components/nodes/CustomActionNode';
import CustomAINode from '../components/nodes/CustomAINode';
import CustomConditionNode from '../components/nodes/CustomConditionNode';
import { api } from '../services/api';

interface FlowBuilderProps {
  workspace: Workspace;
}

interface NodeConfig {
  [nodeId: string]: any;
}

// Define custom node types
const nodeTypes: NodeTypes = {
  triggerNode: CustomTriggerNode,
  actionNode: CustomActionNode,
  aiNode: CustomAINode,
  conditionNode: CustomConditionNode,
};

const FlowBuilder: React.FC<FlowBuilderProps> = ({ workspace }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isSaving, setIsSaving] = useState(false);

  // Sidebar state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showMobileNodeGrid, setShowMobileNodeGrid] = useState(false);

  // Node configuration state
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [nodeConfigs, setNodeConfigs] = useState<NodeConfig>({});
  const [currentConfig, setCurrentConfig] = useState<any>({});

  // Selected edge for deletion
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);

  // User API keys
  const [userApiKeys, setUserApiKeys] = useState<any>({});

  useEffect(() => {
    loadUserApiKeys();
    // Check if mobile
    const isMobile = window.innerWidth < 768;
    setSidebarCollapsed(isMobile);
  }, []);

  const loadUserApiKeys = async () => {
    try {
      // TODO: Implement proper settings API endpoint
      // const settings = await api.settings.get(workspace.ownerId);
      setUserApiKeys({
        openaiApiKey: '',
        geminiApiKey: ''
      });
    } catch (error) {
      console.error('Error loading API keys:', error);
    }
  };

  const onConnect = useCallback((params: Connection) => {
    setEdges((eds) => addEdge({
      ...params,
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#64748b', strokeWidth: 2 }
    }, eds));
  }, [setEdges]);

  const onNodeDoubleClick: NodeMouseHandler = useCallback((event, node) => {
    setSelectedNode(node);
    setCurrentConfig(nodeConfigs[node.id] || {});
    setShowConfigModal(true);
  }, [nodeConfigs]);

  const onEdgeClick: EdgeMouseHandler = useCallback((event, edge) => {
    setSelectedEdge(edge);
  }, []);

  const handleDeleteEdge = useCallback(() => {
    if (selectedEdge) {
      setEdges((eds) => eds.filter((e) => e.id !== selectedEdge.id));
      setSelectedEdge(null);
      toast.success('Connection deleted');
    }
  }, [selectedEdge, setEdges, toast]);

  const handleDeleteNode = useCallback((nodeId: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    toast.success('Node deleted');
  }, [setNodes, setEdges, toast]);

  const handleConfigureNode = useCallback((node: Node) => {
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

      // Update node data with config
      setNodes((nds) => nds.map((node) => {
        if (node.id === selectedNode.id) {
          return {
            ...node,
            data: {
              ...node.data,
              ...currentConfig,
              aiProvider: currentConfig.useAI ? currentConfig.aiProvider : undefined,
              template: currentConfig.replyTemplate || currentConfig.messageTemplate
            }
          };
        }
        return node;
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
      await new Promise(r => setTimeout(r, 800));
      toast.success("Flow saved successfully!");
    } catch (error) {
      toast.error("Failed to save flow");
    } finally {
      setIsSaving(false);
    }
  };

  const addNode = (nodeType: string, label: string, actionType?: string) => {
    const newNode: Node = {
      id: `${Date.now()}`,
      type: nodeType,
      data: {
        label,
        nodeType,
        actionType,
        onConfigure: () => handleConfigureNode(newNode),
        onDelete: () => handleDeleteNode(newNode.id)
      },
      position: {
        x: 100 + nodes.length * 250,
        y: 200
      },
    };

    setNodes((nds) => nds.concat(newNode));
    toast.info(`Added ${label} - Double-click or click gear to configure`);
    setShowMobileNodeGrid(false);
  };

  const renderConfigForm = () => {
    if (!selectedNode) return null;

    const nodeLabel = selectedNode.data.label as string;
    const nodeType = selectedNode.data.nodeType as string;

    if (nodeLabel.includes('Comment') && nodeType === 'triggerNode') {
      return (
        <TriggerNodeForm
          workspaceId={workspace.id}
          initialConfig={currentConfig}
          onChange={setCurrentConfig}
        />
      );
    } else if (nodeLabel.includes('Reply')) {
      return (
        <CommentReplyNodeForm
          userId={workspace.ownerId}
          initialConfig={currentConfig}
          onChange={setCurrentConfig}
          userApiKeys={userApiKeys}
        />
      );
    } else if (nodeLabel.includes('Message')) {
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

  const NodeButton = ({ onClick, icon: Icon, label, color }: any) => (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-xl hover:border-${color}-500/50 hover:bg-${color}-500/10 transition-all text-left group`}
    >
      <div className={`p-2.5 bg-${color}-500/20 text-${color}-400 rounded-lg group-hover:scale-110 transition-transform`}>
        <Icon className="w-4 h-4" />
      </div>
      <span className="text-sm font-semibold text-slate-300 group-hover:text-white transition-colors">{label}</span>
    </button>
  );

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col -m-8 animate-fade-in relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-slate-950 z-0" />

      {/* Header */}
      <div className="glass-panel border-b border-white/10 px-4 md:px-6 py-3 flex items-center justify-between z-20 shadow-lg relative">
        <div className="flex items-center gap-2 md:gap-4">
          <button
            onClick={() => navigate('/flows')}
            className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* Mobile: Show menu button */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="md:hidden p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            {sidebarCollapsed ? <Menu className="w-5 h-5" /> : <X className="w-5 h-5" />}
          </button>

          <div>
            <h2 className="font-bold text-white flex items-center gap-2 text-base md:text-lg">
              {id?.startsWith('new') ? 'Untitled Flow' : 'Welcome Flow'}
              <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-normal border border-indigo-500/30">Draft</span>
            </h2>
            <p className="text-xs text-slate-500 hidden md:block">Double-click nodes to configure</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-3 md:px-5 py-2 md:py-2.5 text-xs md:text-sm font-bold bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl hover:shadow-lg hover:shadow-indigo-500/20 disabled:opacity-50 transition-all active:scale-95 border border-white/20"
          >
            <Save className="w-4 h-4" />
            <span className="hidden md:inline">{isSaving ? 'Saving...' : 'Publish'}</span>
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden relative z-10">
        {/* Sidebar */}
        <div className={`${sidebarCollapsed ? 'w-0' : 'w-64 md:w-72'} glass-panel border-r border-white/10 overflow-y-auto transition-all duration-300 z-20 shadow-2xl ${sidebarCollapsed ? 'hidden' : 'absolute md:relative h-full'}`}>
          <div className="p-4 md:p-5 space-y-6">
            {/* Desktop: Collapse button */}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="hidden md:flex items-center gap-2 w-full p-2 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition-colors text-sm"
            >
              <Menu className="w-4 h-4" />
              Collapse
            </button>

            {/* Mobile: Grid view button */}
            <button
              onClick={() => setShowMobileNodeGrid(true)}
              className="md:hidden flex items-center gap-2 w-full p-3 bg-indigo-500/20 border border-indigo-500/30 rounded-xl text-white font-semibold"
            >
              <Grid3x3 className="w-5 h-5" />
              View All Nodes
            </button>

            {/* Node Categories */}
            <div className="space-y-6">
              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Triggers</h3>
                <div className="space-y-2">
                  <button onClick={() => addNode('triggerNode', 'New Comment')} className="w-full flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-xl hover:border-green-500/50 hover:bg-green-500/10 transition-all text-left group">
                    <div className="w-8 h-8 bg-green-500/20 text-green-400 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                      <div className="w-3 h-3 rounded-full bg-green-400"></div>
                    </div>
                    <span className="text-sm font-semibold text-slate-300 group-hover:text-white transition-colors">Comment Trigger</span>
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Actions</h3>
                <div className="space-y-2">
                  <button onClick={() => addNode('actionNode', 'Comment Reply', 'reply')} className="w-full flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-xl hover:border-cyan-500/50 hover:bg-cyan-500/10 transition-all text-left group">
                    <div className="w-8 h-8 bg-cyan-500/20 text-cyan-400 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                      <div className="w-3 h-3 rounded-full bg-cyan-400"></div>
                    </div>
                    <span className="text-sm font-semibold text-slate-300 group-hover:text-white transition-colors">Reply to Comment</span>
                  </button>
                  <button onClick={() => addNode('actionNode', 'Send Message', 'message')} className="w-full flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-xl hover:border-purple-500/50 hover:bg-purple-500/10 transition-all text-left group">
                    <div className="w-8 h-8 bg-purple-500/20 text-purple-400 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                      <div className="w-3 h-3 rounded-full bg-purple-400"></div>
                    </div>
                    <span className="text-sm font-semibold text-slate-300 group-hover:text-white transition-colors">Send DM</span>
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Logic & AI</h3>
                <div className="space-y-2">
                  <button onClick={() => addNode('aiNode', 'AI Agent')} className="w-full flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-xl hover:border-indigo-500/50 hover:bg-indigo-500/10 transition-all text-left group">
                    <div className="w-8 h-8 bg-indigo-500/20 text-indigo-400 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                      <div className="w-3 h-3 rounded-full bg-indigo-400"></div>
                    </div>
                    <span className="text-sm font-semibold text-slate-300 group-hover:text-white transition-colors">AI Agent</span>
                  </button>
                  <button onClick={() => addNode('conditionNode', 'Condition')} className="w-full flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-xl hover:border-amber-500/50 hover:bg-amber-500/10 transition-all text-left group">
                    <div className="w-8 h-8 bg-amber-500/20 text-amber-400 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                      <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                    </div>
                    <span className="text-sm font-semibold text-slate-300 group-hover:text-white transition-colors">Condition</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop: Collapsed sidebar button */}
        {sidebarCollapsed && (
          <button
            onClick={() => setSidebarCollapsed(false)}
            className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-30 p-2 bg-white/10 hover:bg-white/20 rounded-r-lg text-white transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        {/* Canvas */}
        <div className="flex-1 h-full bg-slate-950">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeDoubleClick={onNodeDoubleClick}
            onEdgeClick={onEdgeClick}
            nodeTypes={nodeTypes}
            fitView
            className="bg-slate-950"
            defaultEdgeOptions={{
              type: 'smoothstep',
              animated: true,
              style: { stroke: '#64748b', strokeWidth: 2 }
            }}
          >
            <Background color="#1e293b" gap={20} />
            <Controls className="bg-slate-800/80 backdrop-blur-sm border-slate-700 fill-slate-300 stroke-slate-300 shadow-xl rounded-lg" />
            <MiniMap
              className="bg-slate-900/80 backdrop-blur-sm border-slate-700 shadow-xl rounded-lg overflow-hidden"
              maskColor="rgba(15, 23, 42, 0.7)"
              nodeColor={(n) => {
                if (n.type === 'triggerNode') return '#10b981';
                if (n.type === 'actionNode') return '#06b6d4';
                if (n.type === 'aiNode') return '#6366f1';
                if (n.type === 'conditionNode') return '#f59e0b';
                return '#64748b';
              }}
            />
          </ReactFlow>

          {/* Delete Edge Button */}
          {selectedEdge && (
            <button
              onClick={handleDeleteEdge}
              className="absolute bottom-24 right-6 z-30 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg shadow-lg flex items-center gap-2 transition-colors"
            >
              <X className="w-4 h-4" />
              Delete Connection
            </button>
          )}
        </div>
      </div>

      {/* Mobile Node Grid Modal */}
      {showMobileNodeGrid && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel rounded-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">Add Node</h3>
                <button onClick={() => setShowMobileNodeGrid(false)} className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => addNode('triggerNode', 'New Comment')} className="p-4 bg-green-500/20 border border-green-500/30 rounded-xl text-center">
                  <div className="w-12 h-12 bg-green-500/30 rounded-xl mx-auto mb-2 flex items-center justify-center">
                    <div className="w-4 h-4 rounded-full bg-green-400"></div>
                  </div>
                  <p className="text-sm font-semibold text-white">Comment Trigger</p>
                </button>
                <button onClick={() => addNode('actionNode', 'Comment Reply', 'reply')} className="p-4 bg-cyan-500/20 border border-cyan-500/30 rounded-xl text-center">
                  <div className="w-12 h-12 bg-cyan-500/30 rounded-xl mx-auto mb-2 flex items-center justify-center">
                    <div className="w-4 h-4 rounded-full bg-cyan-400"></div>
                  </div>
                  <p className="text-sm font-semibold text-white">Reply</p>
                </button>
                <button onClick={() => addNode('actionNode', 'Send Message', 'message')} className="p-4 bg-purple-500/20 border border-purple-500/30 rounded-xl text-center">
                  <div className="w-12 h-12 bg-purple-500/30 rounded-xl mx-auto mb-2 flex items-center justify-center">
                    <div className="w-4 h-4 rounded-full bg-purple-400"></div>
                  </div>
                  <p className="text-sm font-semibold text-white">Send DM</p>
                </button>
                <button onClick={() => addNode('aiNode', 'AI Agent')} className="p-4 bg-indigo-500/20 border border-indigo-500/30 rounded-xl text-center">
                  <div className="w-12 h-12 bg-indigo-500/30 rounded-xl mx-auto mb-2 flex items-center justify-center">
                    <div className="w-4 h-4 rounded-full bg-indigo-400"></div>
                  </div>
                  <p className="text-sm font-semibold text-white">AI Agent</p>
                </button>
                <button onClick={() => addNode('conditionNode', 'Condition')} className="p-4 bg-amber-500/20 border border-amber-500/30 rounded-xl text-center col-span-2">
                  <div className="w-12 h-12 bg-amber-500/30 rounded-xl mx-auto mb-2 flex items-center justify-center">
                    <div className="w-4 h-4 rounded-full bg-amber-400"></div>
                  </div>
                  <p className="text-sm font-semibold text-white">Condition</p>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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