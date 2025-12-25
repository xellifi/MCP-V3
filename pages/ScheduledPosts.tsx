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
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Workspace } from '../types';
import { Plus, Zap, Sparkles, Table, Globe, Save, Play, Settings, Wrench, X } from 'lucide-react';
import VisualTriggerNode from '../components/visual_nodes/VisualTriggerNode';
import VisualAINode from '../components/visual_nodes/VisualAINode';
import VisualSheetNode from '../components/visual_nodes/VisualSheetNode';
import VisualHTTPNode from '../components/visual_nodes/VisualHTTPNode';

interface ScheduledPostsProps {
  workspace: Workspace;
}

const nodeTypes: NodeTypes = {
  visualTrigger: VisualTriggerNode,
  visualAI: VisualAINode,
  visualSheet: VisualSheetNode,
  visualHTTP: VisualHTTPNode,
};

const initialNodes: Node[] = [
  {
    id: '1',
    type: 'visualTrigger',
    position: { x: 100, y: 300 },
    data: { label: 'Start' },
  },
  {
    id: '2',
    type: 'visualAI',
    position: { x: 500, y: 200 },
    data: { label: 'AI Generation' },
  },
];

const initialEdges: Edge[] = [
  { id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: '#6366f1', strokeWidth: 3 } },
];

const ScheduledPosts: React.FC<ScheduledPostsProps> = ({ workspace }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [isToolsOpen, setIsToolsOpen] = useState(true);

  // Auto-collapse tools on mobile by default
  useEffect(() => {
    if (window.innerWidth < 768) {
      setIsToolsOpen(false);
    }
  }, []);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: '#6366f1', strokeWidth: 3 } }, eds)),
    [setEdges],
  );

  const addNode = (type: string) => {
    const id = `${type}-${Date.now()}`;
    const newNode: Node = {
      id,
      type,
      position: { x: Math.random() * 400 + 200, y: Math.random() * 400 + 100 },
      data: { label: `New ${type}` },
    };
    setNodes((nds) => nds.concat(newNode));

    // Auto collapse on mobile after picking
    if (window.innerWidth < 768) {
      setIsToolsOpen(false);
    }
  };

  return (
    <div className="h-[calc(100vh-100px)] w-full -m-6 relative bg-slate-950">

      {/* Header Overlay - Hidden on Mobile */}
      <div className="absolute top-6 left-6 z-10 pointer-events-none hidden md:block">
        <h1 className="text-3xl font-bold text-white tracking-tight drop-shadow-md">Scheduled Workflows</h1>
        <p className="text-slate-400 text-sm drop-shadow-sm font-medium">Visual Automation Builder</p>
      </div>

      {/* Floating Toolbar */}
      <div className={`absolute left-6 top-20 md:top-24 z-10 flex flex-col gap-3 transition-opacity duration-300 ${!isToolsOpen ? 'opacity-0 pointer-events-none md:opacity-100 md:pointer-events-auto' : 'opacity-100'}`}>


        {/* Tools List */}
        <div className={`glass-panel p-3 rounded-2xl border border-white/10 shadow-2xl space-y-3 backdrop-blur-xl transition-all duration-300 origin-top-left ${isToolsOpen ? 'scale-100' : 'scale-95 pointer-events-none md:scale-100 md:pointer-events-auto'}`}>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider text-center mb-2">Tools</p>

          <button
            onClick={() => addNode('visualTrigger')}
            className="w-12 h-12 bg-gradient-to-br from-orange-500 to-pink-600 rounded-xl flex items-center justify-center text-white shadow-lg hover:scale-110 transition-transform group tooltip-container"
            title="Add Trigger"
          >
            <Zap className="w-6 h-6" />
          </button>

          <button
            onClick={() => addNode('visualAI')}
            className="w-12 h-12 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg hover:scale-110 transition-transform"
            title="Add AI Agent"
          >
            <Sparkles className="w-6 h-6" />
          </button>

          <button
            onClick={() => addNode('visualSheet')}
            className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center text-white shadow-lg hover:scale-110 transition-transform"
            title="Add Google Sheet"
          >
            <Table className="w-6 h-6" />
          </button>

          <button
            onClick={() => addNode('visualHTTP')}
            className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg hover:scale-110 transition-transform"
            title="Add HTTP Request"
          >
            <Globe className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Top Right Controls */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 md:translate-x-0 md:left-auto md:right-6 md:top-6 z-10 flex gap-2 md:gap-3 w-max items-center">
        {/* Mobile Tools Toggle */}
        <button
          onClick={() => setIsToolsOpen(!isToolsOpen)}
          className="md:hidden w-8 h-8 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-lg flex items-center justify-center text-white border border-white/10 shadow-lg active:scale-95 transition-all"
        >
          {isToolsOpen ? <X className="w-4 h-4" /> : <Wrench className="w-4 h-4" />}
        </button>

        <button className="flex items-center gap-1.5 md:gap-2 px-3 py-1.5 md:px-5 md:py-2.5 text-xs md:text-sm bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-lg md:rounded-xl text-white font-bold transition-all border border-white/10">
          <Save className="w-3 h-3 md:w-4 md:h-4" />
          <span className="hidden md:inline">Save Workflow</span>
        </button>
        <button className="flex items-center gap-1.5 md:gap-2 px-3 py-1.5 md:px-5 md:py-2.5 text-xs md:text-sm bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg md:rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/20">
          <Play className="w-3 h-3 md:w-4 md:h-4 fill-current" />
          <span className="hidden md:inline">Run Test</span>
        </button>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.35 }}
        minZoom={0.1}
        maxZoom={0.75}
        className="bg-slate-950"
      >
        <Background color="#334155" gap={20} size={1} />
        <Controls className="!bg-slate-800 !border-white/10 !shadow-xl [&>button]:!fill-slate-400 [&>button:hover]:!fill-white" />
      </ReactFlow>
    </div>
  );
};

export default ScheduledPosts;