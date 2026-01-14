import React, { useState, useCallback, useEffect } from 'react';
import ReactFlow, {
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  NodeTypes,
  ReactFlowProvider,
  useReactFlow,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Workspace } from '../types';
import { Plus, Zap, Sparkles, Table, Globe, Save, Play, Settings, Wrench, X, Eye, Database, BrainCircuit, CalendarDays, ArrowLeft, Clock, MoreHorizontal, Edit, Trash, LayoutGrid, List, Maximize2, Minimize2, AlertTriangle, Link as LinkIcon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import VisualTriggerNode from '../components/visual_nodes/VisualTriggerNode';
import VisualAINode from '../components/visual_nodes/VisualAINode';
import VisualSheetNode from '../components/visual_nodes/VisualSheetNode';
import VisualHTTPNode from '../components/visual_nodes/VisualHTTPNode';
import VisualPreviewNode from '../components/visual_nodes/VisualPreviewNode';
import VisualMemoryNode from '../components/visual_nodes/VisualMemoryNode';
import VisualToolNode from '../components/visual_nodes/VisualToolNode';
import VisualModelNode from '../components/visual_nodes/VisualModelNode';
import CustomEdge from '../components/edges/CustomEdge';
import { useToast } from '../context/ToastContext';
import { api } from '../services/api';
import { useNavigate } from 'react-router-dom';

interface ScheduledPostsProps {
  workspace: Workspace;
}

// --- Builder Components ---

const nodeTypes: NodeTypes = {
  visualTrigger: VisualTriggerNode,
  visualAI: VisualAINode,
  visualSheet: VisualSheetNode,
  visualHTTP: VisualHTTPNode,
  visualPreview: VisualPreviewNode,
  visualMemory: VisualMemoryNode,
  visualTool: VisualToolNode,
  visualModel: VisualModelNode,
};

const edgeTypes = {
  custom: CustomEdge,
};

interface SchedulerBuilderProps {
  workspace: Workspace;
  onBack: () => void;
}

const SchedulerBuilder: React.FC<SchedulerBuilderProps> = ({ workspace, onBack }) => {
  const { isDark } = useTheme();
  const toast = useToast();
  const { screenToFlowPosition } = useReactFlow();
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Handle Escape key to exit full screen
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isFullScreen) {
        setIsFullScreen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullScreen]);

  const handleConfigureNode = useCallback(() => {
    toast.info('Under Development: This feature is coming soon!');
  }, [toast]);

  const handleDeleteNode = useCallback((id: string) => {
    setNodes((nds) => nds.filter((node) => node.id !== id));
  }, []);

  const [nodes, setNodes, onNodesChange] = useNodesState([
    {
      id: '1',
      type: 'visualTrigger',
      position: { x: 250, y: 300 },
      data: { label: 'Start' },
    },
  ]);

  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => {
        const data = node.data as any;
        if (!data.onDelete || !data.onConfigure) {
          return {
            ...node,
            data: {
              ...data,
              onDelete: () => handleDeleteNode(node.id),
              onConfigure: handleConfigureNode,
            },
          };
        }
        return node;
      })
    );
  }, [handleDeleteNode, handleConfigureNode, setNodes]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({
      ...params,
      type: 'custom',
      style: { stroke: '#94a3b8', strokeWidth: 2 },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: '#94a3b8',
        width: 13,
        height: 13,
      },
    }, eds)),
    [setEdges],
  );

  const addNode = (type: string, position?: { x: number; y: number }) => {
    const id = `${type}-${Date.now()}`;
    const newNode: Node = {
      id,
      type,
      position: position || { x: Math.random() * 400 + 200, y: Math.random() * 400 + 100 },
      data: {
        label: `New ${type}`,
        onConfigure: handleConfigureNode,
        onDelete: () => handleDeleteNode(id),
      },
      style: ['visualMemory', 'visualTool', 'visualModel'].includes(type)
        ? { background: 'transparent', border: 'none', borderRadius: '50%' }
        : undefined,
    };
    setNodes((nds) => nds.concat(newNode));
  };

  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData('application/reactflow');
      if (typeof type === 'undefined' || !type) {
        return;
      }
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      addNode(type, position);
    },
    [screenToFlowPosition],
  );

  const handleBack = () => {
    if (isFullScreen) {
      setIsFullScreen(false);
    } else {
      onBack();
    }
  };

  return (
    <div
      className={`${isFullScreen ? 'fixed inset-0 z-50' : 'h-[calc(100vh-100px)] w-full -m-6 relative'} transition-all duration-300 ${isDark ? 'bg-slate-950' : 'bg-slate-50'
        }`}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >

      {/* Header Overlay - Back Button */}
      <div className="absolute top-6 left-6 z-10 hidden md:flex items-center gap-4">
        <button
          onClick={handleBack}
          className={`p-2 backdrop-blur-md rounded-lg border shadow-lg transition-all ${isDark
            ? 'bg-white/10 hover:bg-white/20 text-white border-white/10'
            : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
            }`}
          title={isFullScreen ? "Exit Full Screen" : "Back"}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className={`text-2xl font-bold tracking-tight drop-shadow-md ${isDark ? 'text-white' : 'text-slate-900'}`}>New Schedule</h1>
          <p className={`text-sm drop-shadow-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Visual Automation Builder</p>
        </div>
      </div>

      {/* Floating Toolbar - Top Center */}
      <div className="absolute top-20 md:top-6 left-1/2 -translate-x-1/2 z-20 flex gap-2">
        <div className={`p-1.5 rounded-xl border shadow-2xl flex items-center gap-1.5 backdrop-blur-xl ${isDark
          ? 'glass-panel border-white/10'
          : 'bg-white/80 border-white/20 shadow-slate-200/50'
          }`}>
          <div onDragStart={(event) => onDragStart(event, 'visualTrigger')} draggable onClick={() => addNode('visualTrigger')} className="group relative w-9 h-9 bg-gradient-to-br from-orange-500 to-pink-600 rounded-lg flex items-center justify-center text-white shadow-lg hover:scale-105 transition-transform cursor-grab active:cursor-grabbing">
            <Zap className="w-5 h-5" />
            <div className={`absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2 py-1 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none ${isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900 shadow-lg border border-slate-100'}`}>Trigger</div>
          </div>
          <div onDragStart={(event) => onDragStart(event, 'visualAI')} draggable onClick={() => addNode('visualAI')} className="group relative w-9 h-9 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-lg flex items-center justify-center text-white shadow-lg hover:scale-105 transition-transform cursor-grab active:cursor-grabbing">
            <Sparkles className="w-5 h-5" />
            <div className={`absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2 py-1 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none ${isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900 shadow-lg border border-slate-100'}`}>AI Agent</div>
          </div>
          <div onDragStart={(event) => onDragStart(event, 'visualSheet')} draggable onClick={() => addNode('visualSheet')} className="group relative w-9 h-9 bg-gradient-to-br from-emerald-500 to-green-600 rounded-lg flex items-center justify-center text-white shadow-lg hover:scale-105 transition-transform cursor-grab active:cursor-grabbing">
            <Table className="w-5 h-5" />
            <div className={`absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2 py-1 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none ${isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900 shadow-lg border border-slate-100'}`}>Sheet</div>
          </div>
          <div onDragStart={(event) => onDragStart(event, 'visualHTTP')} draggable onClick={() => addNode('visualHTTP')} className="group relative w-9 h-9 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg hover:scale-105 transition-transform cursor-grab active:cursor-grabbing">
            <Globe className="w-5 h-5" />
            <div className={`absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2 py-1 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none ${isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900 shadow-lg border border-slate-100'}`}>HTTP</div>
          </div>
          <div onDragStart={(event) => onDragStart(event, 'visualPreview')} draggable onClick={() => addNode('visualPreview')} className="group relative w-9 h-9 bg-gradient-to-br from-pink-500 to-rose-600 rounded-lg flex items-center justify-center text-white shadow-lg hover:scale-105 transition-transform cursor-grab active:cursor-grabbing">
            <Eye className="w-5 h-5" />
            <div className={`absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2 py-1 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none ${isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900 shadow-lg border border-slate-100'}`}>Preview</div>
          </div>
          <div onDragStart={(event) => onDragStart(event, 'visualMemory')} draggable onClick={() => addNode('visualMemory')} className="group relative w-9 h-9 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center text-white shadow-lg hover:scale-105 transition-transform cursor-grab active:cursor-grabbing">
            <Database className="w-5 h-5" />
            <div className={`absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2 py-1 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none ${isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900 shadow-lg border border-slate-100'}`}>Database</div>
          </div>
          <div onDragStart={(event) => onDragStart(event, 'visualTool')} draggable onClick={() => addNode('visualTool')} className="group relative w-9 h-9 bg-gradient-to-br from-gray-500 to-slate-600 rounded-lg flex items-center justify-center text-white shadow-lg hover:scale-105 transition-transform cursor-grab active:cursor-grabbing">
            <Wrench className="w-5 h-5" />
            <div className={`absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2 py-1 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none ${isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900 shadow-lg border border-slate-100'}`}>Tools</div>
          </div>
          <div onDragStart={(event) => onDragStart(event, 'visualModel')} draggable onClick={() => addNode('visualModel')} className="group relative w-9 h-9 bg-gradient-to-br from-teal-500 to-green-600 rounded-lg flex items-center justify-center text-white shadow-lg hover:scale-105 transition-transform cursor-grab active:cursor-grabbing">
            <BrainCircuit className="w-5 h-5" />
            <div className={`absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2 py-1 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none ${isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900 shadow-lg border border-slate-100'}`}>Memory</div>
          </div>
        </div>
      </div>

      {/* Top Right Controls */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 md:translate-x-0 md:left-auto md:right-6 md:top-6 z-10 flex gap-2 md:gap-3 w-max items-center">
        <button
          onClick={() => setIsFullScreen(!isFullScreen)}
          className={`group relative p-2.5 backdrop-blur-md rounded-xl border shadow-lg transition-all ${isDark
            ? 'bg-white/5 hover:bg-white/10 text-white border-white/10'
            : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-slate-200/50'
            }`}
          title={isFullScreen ? "Exit Full Screen (Esc)" : "Full Screen"}
        >
          {isFullScreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          <span className={`absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none ${isDark ? 'bg-slate-800 text-white' : 'bg-slate-900 text-white'}`}>
            {isFullScreen ? 'Exit (ESC)' : 'Fullscreen'}
          </span>
        </button>
        <button
          className={`group relative p-2.5 backdrop-blur-md rounded-xl border shadow-lg transition-all ${isDark
            ? 'bg-white/5 hover:bg-white/10 text-white border-white/10'
            : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-slate-200/50'
            }`}
          title="Save Flow"
        >
          <Save className="w-5 h-5" />
          <span className={`absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none ${isDark ? 'bg-slate-800 text-white' : 'bg-slate-900 text-white'}`}>
            Save
          </span>
        </button>
        <button
          className="group relative p-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-500/20 transition-all"
          title="Run Test"
        >
          <Play className="w-5 h-5 fill-current" />
          <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            Run Test
          </span>
        </button>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        maxZoom={3}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultViewport={{ x: 300, y: -100, zoom: 1.5 }}
        minZoom={0.3}

        className={isDark ? 'bg-slate-950' : 'bg-slate-50'}
      >
        <Background
          color={isDark ? '#334155' : '#cbd5e1'}
          gap={20}
          size={1}
        />
        <Controls
          className={isDark
            ? '!bg-slate-800 !border-white/10 !shadow-xl [&>button]:!fill-slate-400 [&>button:hover]:!fill-white'
            : '!bg-white !border-slate-200 !shadow-xl [&>button]:!fill-slate-500 [&>button:hover]:!fill-slate-800'
          }
        />
      </ReactFlow>
    </div>
  );
};


// --- Main Component ---

const ScheduledPosts: React.FC<ScheduledPostsProps> = ({ workspace }) => {
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [view, setView] = useState<'list' | 'builder'>('list');
  const [scheduledItems, setScheduledItems] = useState<any[]>([]); // Start empty to show empty state
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');

  // Connection check state
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{
    hasConnection: boolean;
    hasActivePages: boolean;
    loading: boolean;
  }>({ hasConnection: true, hasActivePages: true, loading: true });

  // Check Facebook connection and active pages on mount
  useEffect(() => {
    const checkConnections = async () => {
      try {
        const [connections, pages] = await Promise.all([
          api.workspace.getConnections(workspace.id),
          api.workspace.getConnectedPages(workspace.id)
        ]);

        const hasConnection = connections.length > 0;
        const hasActivePages = pages.some(page => page.isAutomationEnabled);

        setConnectionStatus({
          hasConnection,
          hasActivePages,
          loading: false
        });

        // Show modal if either condition is not met
        if (!hasConnection || !hasActivePages) {
          setShowConnectionModal(true);
        }
      } catch (error) {
        console.error('Failed to check connections:', error);
        setConnectionStatus({ hasConnection: false, hasActivePages: false, loading: false });
        setShowConnectionModal(true);
      }
    };

    checkConnections();
  }, [workspace.id]);

  // Helper to check if user can create schedules
  const canCreateSchedule = connectionStatus.hasConnection && connectionStatus.hasActivePages;

  // Handler for create schedule button when requirements not met
  const handleCreateClick = () => {
    if (!canCreateSchedule) {
      setShowConnectionModal(true);
    } else {
      setView('builder');
    }
  };

  return (
    <div className="animate-fade-in w-full h-full">
      {/* Connection Required Modal */}
      {showConnectionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
          <div className={`relative w-full max-w-md rounded-2xl shadow-2xl border overflow-hidden animate-fade-in ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
            {/* Header */}
            <div className="p-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-500/10 flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-amber-500" />
              </div>
              <h2 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Setup Required
              </h2>
              <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                To use the Scheduler feature, you need to complete the following:
              </p>
            </div>

            {/* Checklist */}
            <div className={`px-6 py-4 space-y-3 border-t border-b ${isDark ? 'border-slate-800 bg-slate-800/50' : 'border-slate-100 bg-slate-50'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${connectionStatus.hasConnection
                  ? 'bg-green-500/20 text-green-500'
                  : 'bg-red-500/20 text-red-500'
                  }`}>
                  {connectionStatus.hasConnection ? '✓' : '1'}
                </div>
                <span className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Connect your Facebook Profile
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${connectionStatus.hasActivePages
                  ? 'bg-green-500/20 text-green-500'
                  : 'bg-red-500/20 text-red-500'
                  }`}>
                  {connectionStatus.hasActivePages ? '✓' : '2'}
                </div>
                <span className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Activate automation on at least one Facebook Page
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="p-6 space-y-3">
              {!connectionStatus.hasConnection && (
                <button
                  onClick={() => navigate('/connections')}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-all"
                >
                  <LinkIcon className="w-5 h-5" />
                  Connect Facebook Profile
                </button>
              )}
              {connectionStatus.hasConnection && !connectionStatus.hasActivePages && (
                <button
                  onClick={() => navigate('/connected-pages')}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-all"
                >
                  <Zap className="w-5 h-5" />
                  Activate Page Automation
                </button>
              )}
              <button
                onClick={() => setShowConnectionModal(false)}
                className={`w-full px-4 py-3 rounded-xl font-medium transition-all ${isDark
                  ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {view === 'list' && (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className={`text-3xl font-bold tracking-tight mb-1 ${isDark ? 'text-white text-glow' : 'text-slate-900'}`}>Scheduler</h1>
              <p className={`text-lg ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Plan and automate your content</p>
            </div>
            <div className="flex items-center gap-3">
              <div className={`flex p-1 rounded-xl border ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200 shadow-sm'}`}>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition-all ${viewMode === 'list'
                    ? 'bg-indigo-500 text-white shadow-md'
                    : isDark ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50'
                    }`}
                  title="List View"
                >
                  <List className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition-all ${viewMode === 'grid'
                    ? 'bg-indigo-500 text-white shadow-md'
                    : isDark ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50'
                    }`}
                  title="Grid View"
                >
                  <LayoutGrid className="w-5 h-5" />
                </button>
              </div>
              <button
                onClick={handleCreateClick}
                disabled={connectionStatus.loading}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold shadow-lg transition-all border border-white/20 ${canCreateSchedule
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white shadow-indigo-500/20 active:scale-95'
                    : 'bg-slate-600 text-slate-300 cursor-not-allowed opacity-70'
                  }`}
                title={!canCreateSchedule ? 'Connect Facebook and activate pages first' : 'Create new schedule'}
              >
                <Plus className="w-5 h-5" />
                New Schedule
              </button>
            </div>
          </div>

          {/* Main Content Area */}
          <div className={`rounded-2xl border min-h-[60vh] flex items-center justify-center p-8 ${isDark ? 'glass-panel border-white/10' : 'bg-white border-slate-200 shadow-sm'
            }`}>
            {scheduledItems.length === 0 ? (
              /* Empty State */
              <div className="flex flex-col items-center justify-center text-center">
                <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 border shadow-inner ${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'
                  }`}>
                  <CalendarDays className={`w-8 h-8 ${isDark ? 'text-slate-500' : 'text-indigo-500'}`} />
                </div>
                <h3 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>No scheduled posts yet</h3>
                <p className={`max-w-sm mb-8 text-lg ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Create your first automated schedule to publish content automatically.
                </p>
                <button
                  onClick={handleCreateClick}
                  disabled={connectionStatus.loading}
                  className={`flex items-center gap-2 px-8 py-3 rounded-xl font-bold shadow-xl transition-all border border-white/20 transform ${canCreateSchedule
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white shadow-indigo-500/20 active:scale-95 hover:-translate-y-1'
                      : 'bg-slate-600 text-slate-300 cursor-not-allowed opacity-70'
                    }`}
                  title={!canCreateSchedule ? 'Connect Facebook and activate pages first' : 'Create new schedule'}
                >
                  <Plus className="w-5 h-5" />
                  Create New Schedule
                </button>
              </div>
            ) : (
              /* List View (Mocked) */
              <div className="w-full self-start">
                <table className="w-full text-left">
                  <thead className={`text-xs uppercase font-bold border-b ${isDark ? 'bg-white/5 text-slate-400 border-white/10' : 'bg-slate-50 text-slate-500 border-slate-200'
                    }`}>
                    <tr>
                      <th className="px-6 py-4">Name</th>
                      <th className="px-6 py-4">Channels</th>
                      <th className="px-6 py-4">Next Run</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDark ? 'divide-white/5' : 'divide-slate-100'}`}>
                    {scheduledItems.map(item => (
                      <tr key={item.id} className={`transition-colors ${isDark ? 'hover:bg-white/5' : 'hover:bg-slate-50'}`}>
                        <td className={`px-6 py-4 font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>{item.name}</td>
                        <td className="px-6 py-4 text-slate-400">{item.channels}</td>
                        <td className="px-6 py-4 text-slate-400 flex items-center gap-2">
                          <Clock className="w-4 h-4" /> {item.nextRun}
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex px-2 py-1 rounded-full text-xs font-bold bg-green-500/20 text-green-400 border border-green-500/30">Active</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button className={`p-2 transition-colors ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-400 hover:text-slate-700'
                            }`}>
                            <MoreHorizontal className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {view === 'builder' && (
        <ReactFlowProvider>
          <SchedulerBuilder workspace={workspace} onBack={() => setView('list')} />
        </ReactFlowProvider>
      )}
    </div>
  );
};

export default ScheduledPosts;