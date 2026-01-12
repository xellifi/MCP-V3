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
import { Plus, Zap, Sparkles, Table, Globe, Save, Play, Settings, Wrench, X, Eye, Database, BrainCircuit, CalendarDays, ArrowLeft, Clock, MoreHorizontal, Edit, Trash, LayoutGrid, List, Maximize2, Minimize2 } from 'lucide-react';
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
      className={`${isFullScreen ? 'fixed inset-0 z-50 bg-slate-950' : 'h-[calc(100vh-100px)] w-full -m-6 relative bg-slate-950'} transition-all duration-300`}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >

      {/* Header Overlay - Back Button */}
      <div className="absolute top-6 left-6 z-10 hidden md:flex items-center gap-4">
        <button
          onClick={handleBack}
          className="p-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-lg text-white border border-white/10 shadow-lg transition-all"
          title={isFullScreen ? "Exit Full Screen" : "Back"}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight drop-shadow-md">New Schedule</h1>
          <p className="text-slate-400 text-sm drop-shadow-sm font-medium">Visual Automation Builder</p>
        </div>
      </div>

      {/* Floating Toolbar - Top Center */}
      <div className="absolute top-20 md:top-6 left-1/2 -translate-x-1/2 z-20 flex gap-2">
        <div className="glass-panel p-1.5 rounded-xl border border-white/10 shadow-2xl flex items-center gap-1.5 backdrop-blur-xl">
          <div onDragStart={(event) => onDragStart(event, 'visualTrigger')} draggable onClick={() => addNode('visualTrigger')} className="group relative w-9 h-9 bg-gradient-to-br from-orange-500 to-pink-600 rounded-lg flex items-center justify-center text-white shadow-lg hover:scale-105 transition-transform cursor-grab active:cursor-grabbing">
            <Zap className="w-5 h-5" />
            <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">Trigger</div>
          </div>
          <div onDragStart={(event) => onDragStart(event, 'visualAI')} draggable onClick={() => addNode('visualAI')} className="group relative w-9 h-9 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-lg flex items-center justify-center text-white shadow-lg hover:scale-105 transition-transform cursor-grab active:cursor-grabbing">
            <Sparkles className="w-5 h-5" />
            <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">AI Agent</div>
          </div>
          <div onDragStart={(event) => onDragStart(event, 'visualSheet')} draggable onClick={() => addNode('visualSheet')} className="group relative w-9 h-9 bg-gradient-to-br from-emerald-500 to-green-600 rounded-lg flex items-center justify-center text-white shadow-lg hover:scale-105 transition-transform cursor-grab active:cursor-grabbing">
            <Table className="w-5 h-5" />
            <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">Sheet</div>
          </div>
          <div onDragStart={(event) => onDragStart(event, 'visualHTTP')} draggable onClick={() => addNode('visualHTTP')} className="group relative w-9 h-9 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg hover:scale-105 transition-transform cursor-grab active:cursor-grabbing">
            <Globe className="w-5 h-5" />
            <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">HTTP</div>
          </div>
          <div onDragStart={(event) => onDragStart(event, 'visualPreview')} draggable onClick={() => addNode('visualPreview')} className="group relative w-9 h-9 bg-gradient-to-br from-pink-500 to-rose-600 rounded-lg flex items-center justify-center text-white shadow-lg hover:scale-105 transition-transform cursor-grab active:cursor-grabbing">
            <Eye className="w-5 h-5" />
            <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">Preview</div>
          </div>
          <div onDragStart={(event) => onDragStart(event, 'visualMemory')} draggable onClick={() => addNode('visualMemory')} className="group relative w-9 h-9 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center text-white shadow-lg hover:scale-105 transition-transform cursor-grab active:cursor-grabbing">
            <Database className="w-5 h-5" />
            <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">Database</div>
          </div>
          <div onDragStart={(event) => onDragStart(event, 'visualTool')} draggable onClick={() => addNode('visualTool')} className="group relative w-9 h-9 bg-gradient-to-br from-gray-500 to-slate-600 rounded-lg flex items-center justify-center text-white shadow-lg hover:scale-105 transition-transform cursor-grab active:cursor-grabbing">
            <Wrench className="w-5 h-5" />
            <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">Tools</div>
          </div>
          <div onDragStart={(event) => onDragStart(event, 'visualModel')} draggable onClick={() => addNode('visualModel')} className="group relative w-9 h-9 bg-gradient-to-br from-teal-500 to-green-600 rounded-lg flex items-center justify-center text-white shadow-lg hover:scale-105 transition-transform cursor-grab active:cursor-grabbing">
            <BrainCircuit className="w-5 h-5" />
            <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">Memory</div>
          </div>
        </div>
      </div>

      {/* Top Right Controls */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 md:translate-x-0 md:left-auto md:right-6 md:top-6 z-10 flex gap-2 md:gap-3 w-max items-center">
        <button
          onClick={() => setIsFullScreen(!isFullScreen)}
          className="group relative p-2.5 bg-white/5 hover:bg-white/10 backdrop-blur-md rounded-xl text-white border border-white/10 shadow-lg transition-all"
          title={isFullScreen ? "Exit Full Screen (Esc)" : "Full Screen"}
        >
          {isFullScreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            {isFullScreen ? 'Exit (ESC)' : 'Fullscreen'}
          </span>
        </button>
        <button
          className="group relative p-2.5 bg-white/5 hover:bg-white/10 backdrop-blur-md rounded-xl text-white border border-white/10 shadow-lg transition-all"
          title="Save Flow"
        >
          <Save className="w-5 h-5" />
          <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
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

        className="bg-slate-950"
      >
        <Background color="#334155" gap={20} size={1} />
        <Controls className="!bg-slate-800 !border-white/10 !shadow-xl [&>button]:!fill-slate-400 [&>button:hover]:!fill-white" />
      </ReactFlow>
    </div>
  );
};


// --- Main Component ---

const ScheduledPosts: React.FC<ScheduledPostsProps> = ({ workspace }) => {
  const { isDark } = useTheme();
  const [view, setView] = useState<'list' | 'builder'>('list');
  const [scheduledItems, setScheduledItems] = useState<any[]>([]); // Start empty to show empty state
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');

  return (
    <div className="animate-fade-in w-full h-full">
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
                onClick={() => setView('builder')}
                className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-indigo-500/20 transition-all active:scale-95 border border-white/20"
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
                  onClick={() => setView('builder')}
                  className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white px-8 py-3 rounded-xl font-bold shadow-xl shadow-indigo-500/20 transition-all active:scale-95 border border-white/20 transform hover:-translate-y-1"
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