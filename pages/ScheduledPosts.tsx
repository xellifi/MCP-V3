import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
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
import { Workspace, ConnectedPage, ScheduleTriggerConfig, TopicGeneratorConfig, ImageGeneratorConfig, CaptionGeneratorConfig, FacebookPostConfig, IntegrationSettings } from '../types';
import { Plus, Zap, Lightbulb, ImagePlus, PenTool, Facebook, Save, Play, ArrowLeft, Clock, MoreHorizontal, LayoutGrid, List, Maximize2, Minimize2, AlertTriangle, Link as LinkIcon, CalendarDays, Bug, CheckCircle, XCircle, Trash2, Pause, Edit3, PlayCircle } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import VisualTriggerNode from '../components/visual_nodes/VisualTriggerNode';
import VisualTopicNode from '../components/visual_nodes/VisualTopicNode';
import VisualImageGenNode from '../components/visual_nodes/VisualImageGenNode';
import VisualCaptionNode from '../components/visual_nodes/VisualCaptionNode';
import VisualFacebookNode from '../components/visual_nodes/VisualFacebookNode';
import CustomEdge from '../components/edges/CustomEdge';
import { useToast } from '../context/ToastContext';
import { api } from '../services/api';
import { useNavigate } from 'react-router-dom';

// Import scheduler forms
import ScheduleTriggerForm from '../components/scheduler_forms/ScheduleTriggerForm';
import TopicGeneratorForm from '../components/scheduler_forms/TopicGeneratorForm';
import ImageGeneratorForm from '../components/scheduler_forms/ImageGeneratorForm';
import CaptionGeneratorForm from '../components/scheduler_forms/CaptionGeneratorForm';
import FacebookPostForm from '../components/scheduler_forms/FacebookPostForm';

interface ScheduledPostsProps {
  workspace: Workspace;
}

// --- Node Types for Scheduler ---
const nodeTypes: NodeTypes = {
  scheduleTrigger: VisualTriggerNode,
  topicGenerator: VisualTopicNode,
  imageGenerator: VisualImageGenNode,
  captionWriter: VisualCaptionNode,
  facebookPost: VisualFacebookNode,
};

const edgeTypes = {
  custom: CustomEdge,
};

// Node type to form mapping
type SchedulerNodeType = 'scheduleTrigger' | 'topicGenerator' | 'imageGenerator' | 'captionWriter' | 'facebookPost';

interface SchedulerBuilderProps {
  workspace: Workspace;
  onBack: () => void;
  connectionStatus: {
    hasConnection: boolean;
    hasActivePages: boolean;
    loading: boolean;
  };
  connectedPages: ConnectedPage[];
  integrationSettings: IntegrationSettings | null;
}

const SchedulerBuilder: React.FC<SchedulerBuilderProps> = ({
  workspace,
  onBack,
  connectionStatus,
  connectedPages,
  integrationSettings
}) => {
  const { isDark } = useTheme();
  const toast = useToast();
  const navigate = useNavigate();
  const { screenToFlowPosition } = useReactFlow();
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showConnectionWarning, setShowConnectionWarning] = useState(false);

  // Node configuration state
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [nodeConfigurations, setNodeConfigurations] = useState<Record<string, any>>({});

  // Form visibility state
  const [activeForm, setActiveForm] = useState<string | null>(null);

  // Check for API keys
  const hasOpenAiKey = Boolean(integrationSettings?.openaiApiKey);
  const hasGeminiKey = Boolean(integrationSettings?.geminiApiKey);

  // Use ref to track nodes for callbacks without causing re-renders
  const nodesRef = useRef<Node[]>([]);

  // Stable callback functions using refs
  const handleConfigureNode = useCallback((nodeId: string) => {
    const node = nodesRef.current.find(n => n.id === nodeId);
    if (!node) return;

    setSelectedNodeId(nodeId);

    // Open appropriate form based on node type
    switch (node.type) {
      case 'scheduleTrigger':
        setActiveForm('trigger');
        break;
      case 'topicGenerator':
        setActiveForm('topic');
        break;
      case 'imageGenerator':
        setActiveForm('image');
        break;
      case 'captionWriter':
        setActiveForm('caption');
        break;
      case 'facebookPost':
        setActiveForm('facebook');
        break;
    }
  }, []);

  const handleDeleteNode = useCallback((id: string) => {
    setNodes((nds) => nds.filter((node) => node.id !== id));
    setEdges((eds) => eds.filter((edge) => edge.source !== id && edge.target !== id));
  }, []);

  // Create initial nodes with stable callbacks
  const createInitialNodes = (): Node[] => [
    {
      id: 'trigger-1',
      type: 'scheduleTrigger',
      position: { x: 100, y: 200 },
      data: {
        label: 'Schedule Trigger',
        onConfigure: () => handleConfigureNode('trigger-1'),
        onDelete: () => handleDeleteNode('trigger-1'),
      },
    },
    {
      id: 'topic-1',
      type: 'topicGenerator',
      position: { x: 350, y: 200 },
      data: {
        label: 'Topic Generator',
        aiProvider: hasOpenAiKey ? 'OpenAI' : hasGeminiKey ? 'Gemini' : 'Not Set',
        onConfigure: () => handleConfigureNode('topic-1'),
        onDelete: () => handleDeleteNode('topic-1'),
      },
    },
    {
      id: 'image-1',
      type: 'imageGenerator',
      position: { x: 600, y: 200 },
      data: {
        label: 'Image Generator',
        size: '1080×1080',
        onConfigure: () => handleConfigureNode('image-1'),
        onDelete: () => handleDeleteNode('image-1'),
      },
    },
    {
      id: 'caption-1',
      type: 'captionWriter',
      position: { x: 850, y: 200 },
      data: {
        label: 'Caption Writer',
        tone: 'Professional',
        onConfigure: () => handleConfigureNode('caption-1'),
        onDelete: () => handleDeleteNode('caption-1'),
      },
    },
    {
      id: 'facebook-1',
      type: 'facebookPost',
      position: { x: 1100, y: 200 },
      data: {
        label: 'Facebook Post',
        pageName: connectedPages.find(p => p.isAutomationEnabled)?.name || 'Select Page',
        isConfigured: false,
        onConfigure: () => handleConfigureNode('facebook-1'),
        onDelete: () => handleDeleteNode('facebook-1'),
      },
    },
  ];

  // Initial edges connecting the nodes
  const initialEdges: Edge[] = [
    { id: 'e-trigger-topic', source: 'trigger-1', target: 'topic-1', type: 'custom', markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' } },
    { id: 'e-topic-image', source: 'topic-1', target: 'image-1', type: 'custom', markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' } },
    { id: 'e-image-caption', source: 'image-1', target: 'caption-1', type: 'custom', markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' } },
    { id: 'e-caption-facebook', source: 'caption-1', target: 'facebook-1', type: 'custom', markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' } },
  ];

  const [nodes, setNodes, onNodesChange] = useNodesState(createInitialNodes());
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Keep ref in sync with nodes state
  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  // Get selected node from current nodes
  const selectedNode = useMemo(() => {
    return nodes.find(n => n.id === selectedNodeId) || null;
  }, [nodes, selectedNodeId]);

  // Close form helper
  const closeForm = () => {
    setActiveForm(null);
    setSelectedNodeId(null);
  };

  // Save configuration handlers
  const handleSaveTriggerConfig = (config: ScheduleTriggerConfig) => {
    if (!selectedNodeId) return;
    setNodeConfigurations(prev => ({ ...prev, [selectedNodeId]: config }));
    setNodes(nds => nds.map(n =>
      n.id === selectedNodeId
        ? { ...n, data: { ...n.data, frequency: config.frequency, time: config.time } }
        : n
    ));
    toast.success('Schedule trigger configured!');
  };

  const handleSaveTopicConfig = (config: TopicGeneratorConfig) => {
    if (!selectedNodeId) return;
    setNodeConfigurations(prev => ({ ...prev, [selectedNodeId]: config }));
    setNodes(nds => nds.map(n =>
      n.id === selectedNodeId
        ? { ...n, data: { ...n.data, aiProvider: config.aiProvider === 'openai' ? 'OpenAI' : 'Gemini' } }
        : n
    ));
    toast.success('Topic generator configured!');
  };

  const handleSaveImageConfig = (config: ImageGeneratorConfig) => {
    if (!selectedNodeId) return;
    setNodeConfigurations(prev => ({ ...prev, [selectedNodeId]: config }));
    const sizeLabel = config.size === 'custom'
      ? `${config.customWidth}×${config.customHeight}`
      : config.size.replace('x', '×');
    setNodes(nds => nds.map(n =>
      n.id === selectedNodeId
        ? { ...n, data: { ...n.data, size: sizeLabel } }
        : n
    ));
    toast.success('Image generator configured!');
  };

  const handleSaveCaptionConfig = (config: CaptionGeneratorConfig) => {
    if (!selectedNodeId) return;
    setNodeConfigurations(prev => ({ ...prev, [selectedNodeId]: config }));
    setNodes(nds => nds.map(n =>
      n.id === selectedNodeId
        ? { ...n, data: { ...n.data, tone: config.tone.charAt(0).toUpperCase() + config.tone.slice(1) } }
        : n
    ));
    toast.success('Caption writer configured!');
  };

  const handleSaveFacebookConfig = (config: FacebookPostConfig) => {
    if (!selectedNodeId) return;
    setNodeConfigurations(prev => ({ ...prev, [selectedNodeId]: config }));
    setNodes(nds => nds.map(n =>
      n.id === selectedNodeId
        ? { ...n, data: { ...n.data, pageName: config.pageName, isConfigured: true } }
        : n
    ));
    toast.success('Facebook post configured!');
  };

  // Handle save flow
  const handleSaveFlow = useCallback(async () => {
    if (!connectionStatus.hasConnection || !connectionStatus.hasActivePages) {
      setShowConnectionWarning(true);
      return;
    }

    // Warn about unconfigured nodes but don't block saving
    const unconfiguredNodes = nodes.filter(n => !nodeConfigurations[n.id]);
    if (unconfiguredNodes.length > 0) {
      console.warn(`${unconfiguredNodes.length} node(s) not configured yet`);
    }

    try {
      // Extract schedule configuration from trigger node
      const triggerNode = nodes.find(n => n.type === 'scheduleTrigger');
      const triggerConfig = triggerNode ? nodeConfigurations[triggerNode.id] : null;

      // Calculate initial next run time
      const scheduleType = triggerConfig?.frequency || 'daily';
      const scheduleTime = triggerConfig?.time || '09:00';
      const scheduleDays = triggerConfig?.daysOfWeek || (triggerConfig?.dayOfMonth ? [triggerConfig.dayOfMonth] : []);

      // Calculate nextRunAt
      const [hours, minutes] = scheduleTime.split(':').map(Number);
      const now = new Date();
      let nextRunAt = new Date();
      nextRunAt.setHours(hours, minutes, 0, 0);

      if (scheduleType === 'daily') {
        if (nextRunAt <= now) {
          nextRunAt.setDate(nextRunAt.getDate() + 1);
        }
      } else if (scheduleType === 'weekly' && scheduleDays.length > 0) {
        const targetDays = scheduleDays.map(Number);
        for (let i = 0; i < 8; i++) {
          if (i > 0) nextRunAt.setDate(nextRunAt.getDate() + 1);
          if (targetDays.includes(nextRunAt.getDay()) && nextRunAt > now) {
            break;
          }
        }
      } else if (scheduleType === 'monthly' && scheduleDays.length > 0) {
        const dayOfMonth = scheduleDays[0] || 1;
        nextRunAt = new Date(now.getFullYear(), now.getMonth(), dayOfMonth, hours, minutes, 0, 0);
        if (nextRunAt <= now) {
          nextRunAt.setMonth(nextRunAt.getMonth() + 1);
        }
      }

      // Prepare workflow data
      const workflowData = {
        name: 'Auto-Post Workflow',
        description: 'AI-powered content automation for Facebook',
        status: 'active',
        nodes: nodes.map(n => ({
          id: n.id,
          type: n.type,
          position: n.position,
          data: { ...n.data, onConfigure: undefined, onDelete: undefined }
        })),
        edges: edges,
        configurations: nodeConfigurations,
        scheduleType,
        scheduleTime,
        scheduleDays,
        scheduleTimezone: triggerConfig?.timezone || 'Asia/Manila',
        cronExpression: triggerConfig?.customCron,
        nextRunAt: nextRunAt.toISOString()
      };

      // Save to database
      await api.scheduler.createWorkflow(workspace.id, workflowData);
      toast.success('Workflow saved successfully!');
    } catch (error) {
      console.error('Failed to save workflow:', error);
      toast.error('Failed to save workflow. Please try again.');
    }
  }, [connectionStatus, nodes, edges, nodeConfigurations, workspace.id, toast]);

  // Handle test run
  const handleTestRun = useCallback(() => {
    if (!connectionStatus.hasConnection || !connectionStatus.hasActivePages) {
      setShowConnectionWarning(true);
      return;
    }

    if (!hasOpenAiKey && !hasGeminiKey) {
      toast.error('Please add your OpenAI or Gemini API key in Settings first.');
      return;
    }

    toast.info('Test run started! Check back in a few moments...');
    // TODO: Implement actual test run
  }, [connectionStatus, hasOpenAiKey, hasGeminiKey, toast]);

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

  const addNode = (type: SchedulerNodeType, position?: { x: number; y: number }) => {
    const id = `${type}-${Date.now()}`;
    const labels: Record<SchedulerNodeType, string> = {
      scheduleTrigger: 'Schedule Trigger',
      topicGenerator: 'Topic Generator',
      imageGenerator: 'Image Generator',
      captionWriter: 'Caption Writer',
      facebookPost: 'Facebook Post',
    };

    const newNode: Node = {
      id,
      type,
      position: position || { x: Math.random() * 400 + 200, y: Math.random() * 200 + 150 },
      data: {
        label: labels[type],
        onConfigure: () => handleConfigureNode(id),
        onDelete: () => handleDeleteNode(id),
      },
    };
    setNodes((nds) => nds.concat(newNode));
  };

  const onDragStart = (event: React.DragEvent, nodeType: SchedulerNodeType) => {
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
      const type = event.dataTransfer.getData('application/reactflow') as SchedulerNodeType;
      if (!type) return;

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
      className={`${isFullScreen ? 'fixed inset-0 z-50' : 'h-[calc(100vh-100px)] w-full -m-6 relative'} transition-all duration-300 ${isDark ? 'bg-slate-950' : 'bg-slate-50'}`}
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
          <h1 className={`text-2xl font-bold tracking-tight drop-shadow-md ${isDark ? 'text-white' : 'text-slate-900'}`}>Auto-Post Workflow</h1>
          <p className={`text-sm drop-shadow-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>AI-Powered Content Automation</p>
        </div>
      </div>

      {/* Floating Toolbar - Node Types */}
      <div className="absolute top-20 md:top-6 left-1/2 -translate-x-1/2 z-20 flex gap-2">
        <div className={`p-1.5 rounded-xl border shadow-2xl flex items-center gap-1.5 backdrop-blur-xl ${isDark
          ? 'glass-panel border-white/10'
          : 'bg-white/80 border-white/20 shadow-slate-200/50'
          }`}>
          <div
            onDragStart={(event) => onDragStart(event, 'scheduleTrigger')}
            draggable
            onClick={() => addNode('scheduleTrigger')}
            className="group relative w-9 h-9 bg-gradient-to-br from-orange-500 to-pink-600 rounded-lg flex items-center justify-center text-white shadow-lg hover:scale-105 transition-transform cursor-grab active:cursor-grabbing"
          >
            <Clock className="w-5 h-5" />
            <div className={`absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2 py-1 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none ${isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900 shadow-lg border border-slate-100'}`}>Schedule</div>
          </div>
          <div
            onDragStart={(event) => onDragStart(event, 'topicGenerator')}
            draggable
            onClick={() => addNode('topicGenerator')}
            className="group relative w-9 h-9 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center text-white shadow-lg hover:scale-105 transition-transform cursor-grab active:cursor-grabbing"
          >
            <Lightbulb className="w-5 h-5" />
            <div className={`absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2 py-1 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none ${isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900 shadow-lg border border-slate-100'}`}>Topic</div>
          </div>
          <div
            onDragStart={(event) => onDragStart(event, 'imageGenerator')}
            draggable
            onClick={() => addNode('imageGenerator')}
            className="group relative w-9 h-9 bg-gradient-to-br from-pink-500 to-rose-600 rounded-lg flex items-center justify-center text-white shadow-lg hover:scale-105 transition-transform cursor-grab active:cursor-grabbing"
          >
            <ImagePlus className="w-5 h-5" />
            <div className={`absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2 py-1 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none ${isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900 shadow-lg border border-slate-100'}`}>Image</div>
          </div>
          <div
            onDragStart={(event) => onDragStart(event, 'captionWriter')}
            draggable
            onClick={() => addNode('captionWriter')}
            className="group relative w-9 h-9 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-lg flex items-center justify-center text-white shadow-lg hover:scale-105 transition-transform cursor-grab active:cursor-grabbing"
          >
            <PenTool className="w-5 h-5" />
            <div className={`absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2 py-1 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none ${isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900 shadow-lg border border-slate-100'}`}>Caption</div>
          </div>
          <div
            onDragStart={(event) => onDragStart(event, 'facebookPost')}
            draggable
            onClick={() => addNode('facebookPost')}
            className="group relative w-9 h-9 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center text-white shadow-lg hover:scale-105 transition-transform cursor-grab active:cursor-grabbing"
          >
            <Facebook className="w-5 h-5 fill-white" />
            <div className={`absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2 py-1 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none ${isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900 shadow-lg border border-slate-100'}`}>Post</div>
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
        </button>
        <button
          onClick={handleSaveFlow}
          className={`group relative p-2.5 backdrop-blur-md rounded-xl border shadow-lg transition-all ${isDark
            ? 'bg-white/5 hover:bg-white/10 text-white border-white/10'
            : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-slate-200/50'
            }`}
          title="Save Workflow"
        >
          <Save className="w-5 h-5" />
        </button>
        <button
          onClick={handleTestRun}
          className="group relative p-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-500/20 transition-all"
          title="Run Test"
        >
          <Play className="w-5 h-5 fill-current" />
        </button>
      </div>

      {/* Connection Warning Modal */}
      {showConnectionWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
          <div className={`relative w-full max-w-md rounded-2xl shadow-2xl border overflow-hidden animate-fade-in ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="p-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-500/10 flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-amber-500" />
              </div>
              <h2 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Setup Required
              </h2>
              <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                To use this workflow, you need to:
              </p>
            </div>
            <div className={`px-6 py-4 space-y-3 border-t border-b ${isDark ? 'border-slate-800 bg-slate-800/50' : 'border-slate-100 bg-slate-50'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${connectionStatus.hasConnection ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                  {connectionStatus.hasConnection ? '✓' : '1'}
                </div>
                <span className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Connect your Facebook Profile
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${connectionStatus.hasActivePages ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                  {connectionStatus.hasActivePages ? '✓' : '2'}
                </div>
                <span className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Enable automation on a Facebook Page
                </span>
              </div>
            </div>
            <div className="p-6 space-y-3">
              {!connectionStatus.hasConnection && (
                <button
                  onClick={() => navigate('/connections')}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl shadow-lg"
                >
                  <LinkIcon className="w-5 h-5" />
                  Connect Facebook Profile
                </button>
              )}
              {connectionStatus.hasConnection && !connectionStatus.hasActivePages && (
                <button
                  onClick={() => navigate('/connected-pages')}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl shadow-lg"
                >
                  <Zap className="w-5 h-5" />
                  Activate Page Automation
                </button>
              )}
              <button
                onClick={() => setShowConnectionWarning(false)}
                className={`w-full px-4 py-3 rounded-xl font-medium transition-all ${isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ReactFlow Canvas */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        maxZoom={3}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultViewport={{ x: 50, y: 100, zoom: 0.9 }}
        minZoom={0.3}
        className={isDark ? 'bg-slate-950' : 'bg-slate-50'}
      >
        <Background color={isDark ? '#334155' : '#cbd5e1'} gap={20} size={1} />
        <Controls
          className={isDark
            ? '!bg-slate-800 !border-white/10 !shadow-xl [&>button]:!fill-slate-400 [&>button:hover]:!fill-white'
            : '!bg-white !border-slate-200 !shadow-xl [&>button]:!fill-slate-500 [&>button:hover]:!fill-slate-800'
          }
        />
      </ReactFlow>

      {/* Configuration Forms */}
      <ScheduleTriggerForm
        isOpen={activeForm === 'trigger'}
        onClose={closeForm}
        onSave={handleSaveTriggerConfig}
        initialConfig={selectedNodeId ? nodeConfigurations[selectedNodeId] : undefined}
      />

      <TopicGeneratorForm
        isOpen={activeForm === 'topic'}
        onClose={closeForm}
        onSave={handleSaveTopicConfig}
        initialConfig={selectedNodeId ? nodeConfigurations[selectedNodeId] : undefined}
        hasOpenAiKey={hasOpenAiKey}
        hasGeminiKey={hasGeminiKey}
      />

      <ImageGeneratorForm
        isOpen={activeForm === 'image'}
        onClose={closeForm}
        onSave={handleSaveImageConfig}
        initialConfig={selectedNodeId ? nodeConfigurations[selectedNodeId] : undefined}
        hasOpenAiKey={hasOpenAiKey}
        hasGeminiKey={hasGeminiKey}
      />

      <CaptionGeneratorForm
        isOpen={activeForm === 'caption'}
        onClose={closeForm}
        onSave={handleSaveCaptionConfig}
        initialConfig={selectedNodeId ? nodeConfigurations[selectedNodeId] : undefined}
        hasOpenAiKey={hasOpenAiKey}
        hasGeminiKey={hasGeminiKey}
      />

      <FacebookPostForm
        isOpen={activeForm === 'facebook'}
        onClose={closeForm}
        onSave={handleSaveFacebookConfig}
        initialConfig={selectedNodeId ? nodeConfigurations[selectedNodeId] : undefined}
        connectedPages={connectedPages}
      />
    </div>
  );
};


// --- Main Component ---

const ScheduledPosts: React.FC<ScheduledPostsProps> = ({ workspace }) => {
  const { isDark } = useTheme();
  const [view, setView] = useState<'list' | 'builder'>('list');
  const [scheduledItems, setScheduledItems] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
  const [connectedPages, setConnectedPages] = useState<ConnectedPage[]>([]);
  const [integrationSettings, setIntegrationSettings] = useState<IntegrationSettings | null>(null);

  // Connection check state
  const [connectionStatus, setConnectionStatus] = useState<{
    hasConnection: boolean;
    hasActivePages: boolean;
    loading: boolean;
  }>({ hasConnection: true, hasActivePages: true, loading: true });

  // Loading state for workflows
  const [isLoadingWorkflows, setIsLoadingWorkflows] = useState(true);

  const toast = useToast();

  // Action menu state
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoadingWorkflows(true);
      try {
        const [connections, pages, integrations, workflows] = await Promise.all([
          api.workspace.getConnections(workspace.id),
          api.workspace.getConnectedPages(workspace.id),
          api.workspace.getIntegrations(workspace.id),
          api.scheduler.getWorkflows(workspace.id)
        ]);

        const hasConnection = connections.length > 0;
        const hasActivePages = pages.some(page => page.isAutomationEnabled);

        setConnectedPages(pages);
        setIntegrationSettings(integrations);
        setScheduledItems(workflows);
        setConnectionStatus({
          hasConnection,
          hasActivePages,
          loading: false
        });
      } catch (error) {
        console.error('Failed to load data:', error);
        setConnectionStatus({ hasConnection: false, hasActivePages: false, loading: false });
      } finally {
        setIsLoadingWorkflows(false);
      }
    };

    loadData();
  }, [workspace.id]);

  // Action handlers
  const handleDeleteWorkflow = async (id: string) => {
    try {
      await api.scheduler.deleteWorkflow(id);
      setScheduledItems(items => items.filter(item => item.id !== id));
      setDeleteConfirmId(null);
      setActiveMenuId(null);
      toast.success('Workflow deleted successfully');
    } catch (error) {
      console.error('Failed to delete workflow:', error);
      toast.error('Failed to delete workflow');
    }
  };

  const handleTogglePause = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active';
    try {
      await api.scheduler.updateWorkflow(id, { status: newStatus });
      setScheduledItems(items => items.map(item =>
        item.id === id ? { ...item, status: newStatus } : item
      ));
      setActiveMenuId(null);
      toast.success(`Workflow ${newStatus === 'active' ? 'resumed' : 'paused'}`);
    } catch (error) {
      console.error('Failed to update workflow:', error);
      toast.error('Failed to update workflow');
    }
  };

  const handleRunNow = async (id: string) => {
    try {
      // Set next_run_at to now so cron picks it up immediately
      await api.scheduler.runNow(id);
      setActiveMenuId(null);
      toast.success('Workflow will run within 1 minute!');
      // Refresh the list
      const workflows = await api.scheduler.getWorkflows(workspace.id);
      setScheduledItems(workflows);
    } catch (error) {
      console.error('Failed to run workflow:', error);
      toast.error('Failed to trigger workflow');
    }
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setActiveMenuId(null);
    if (activeMenuId) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [activeMenuId]);

  return (
    <div className="animate-fade-in w-full h-full">
      {view === 'list' && (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className={`text-3xl font-bold tracking-tight mb-1 ${isDark ? 'text-white text-glow' : 'text-slate-900'}`}>Scheduler</h1>
              <p className={`text-lg ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>AI-powered auto-posting to Facebook</p>
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
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold shadow-lg transition-all border border-white/20 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white shadow-indigo-500/20 active:scale-95"
              >
                <Plus className="w-5 h-5" />
                New Workflow
              </button>
            </div>
          </div>

          {/* Main Content Area */}
          <div className={`rounded-2xl border min-h-[60vh] flex items-center justify-center p-8 ${isDark ? 'glass-panel border-white/10' : 'bg-white border-slate-200 shadow-sm'}`}>
            {isLoadingWorkflows ? (
              /* Loading State */
              <div className="flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
                <p className={`text-lg ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Loading workflows...</p>
              </div>
            ) : scheduledItems.length === 0 ? (
              /* Empty State */
              <div className="flex flex-col items-center justify-center text-center">
                <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 border shadow-inner ${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                  <CalendarDays className={`w-8 h-8 ${isDark ? 'text-slate-500' : 'text-indigo-500'}`} />
                </div>
                <h3 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>No workflows yet</h3>
                <p className={`max-w-sm mb-8 text-lg ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Create your first AI-powered auto-posting workflow.
                </p>
                <button
                  onClick={() => setView('builder')}
                  className="flex items-center gap-2 px-8 py-3 rounded-xl font-bold shadow-xl transition-all border border-white/20 transform bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white shadow-indigo-500/20 active:scale-95 hover:-translate-y-1"
                >
                  <Plus className="w-5 h-5" />
                  Create Workflow
                </button>
              </div>
            ) : (
              <div className="w-full self-start">
                <table className="w-full text-left">
                  <thead className={`text-xs uppercase font-bold border-b ${isDark ? 'bg-white/5 text-slate-400 border-white/10' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                    <tr>
                      <th className="px-6 py-4">Name</th>
                      <th className="px-6 py-4">Schedule</th>
                      <th className="px-6 py-4">Last Run</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDark ? 'divide-white/5' : 'divide-slate-100'}`}>
                    {scheduledItems.map(item => {
                      // Determine last run status
                      const hasError = item.lastExecution?.status === 'failed';
                      const wasPosted = item.lastExecution?.status === 'completed';
                      const isRunning = item.lastExecution?.status === 'running';
                      const neverRun = !item.lastRunAt;

                      return (
                        <tr key={item.id} className={`transition-colors ${isDark ? 'hover:bg-white/5' : 'hover:bg-slate-50'}`}>
                          <td className={`px-6 py-4 font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            <div className="flex items-center gap-2">
                              {item.name}
                              {hasError && (
                                <span className="relative group">
                                  <Bug className="w-4 h-4 text-red-500 cursor-help" />
                                  <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap max-w-xs ${isDark ? 'bg-red-900/90 text-red-200 border border-red-700' : 'bg-red-50 text-red-700 border border-red-200 shadow-lg'}`}>
                                    <strong>Error:</strong> {item.lastExecution?.error || 'Unknown error'}
                                  </div>
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-slate-400 capitalize">
                            {item.scheduleType} at {item.scheduleTime}
                          </td>
                          <td className="px-6 py-4">
                            {neverRun ? (
                              <span className={`text-sm ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Never run</span>
                            ) : (
                              <div className="flex items-center gap-2">
                                {hasError && (
                                  <XCircle className="w-4 h-4 text-red-500" />
                                )}
                                {wasPosted && (
                                  <CheckCircle className="w-4 h-4 text-green-500" />
                                )}
                                {isRunning && (
                                  <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                )}
                                <span className={`text-sm ${hasError ? 'text-red-400' :
                                  wasPosted ? 'text-green-400' :
                                    isRunning ? 'text-blue-400' :
                                      isDark ? 'text-slate-400' : 'text-slate-500'
                                  }`}>
                                  {hasError ? 'Failed' : wasPosted ? 'Posted' : isRunning ? 'Running...' : new Date(item.lastRunAt).toLocaleString()}
                                </span>
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-bold capitalize ${item.status === 'active'
                              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                              : item.status === 'paused'
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                : 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                              }`}>
                              {item.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="relative">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuId(activeMenuId === item.id ? null : item.id);
                                }}
                                className={`p-2 transition-colors rounded-lg ${isDark ? 'text-slate-400 hover:text-white hover:bg-white/10' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'}`}
                              >
                                <MoreHorizontal className="w-5 h-5" />
                              </button>

                              {/* Dropdown Menu */}
                              {activeMenuId === item.id && (
                                <div
                                  className={`absolute right-0 top-full mt-1 w-44 rounded-xl shadow-xl border z-50 overflow-hidden ${isDark ? 'bg-slate-800 border-white/10' : 'bg-white border-slate-200'}`}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <button
                                    onClick={() => handleRunNow(item.id)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 text-left text-sm transition-colors ${isDark ? 'text-slate-300 hover:bg-white/5' : 'text-slate-700 hover:bg-slate-50'}`}
                                  >
                                    <PlayCircle className="w-4 h-4 text-blue-500" />
                                    Run Now
                                  </button>
                                  <button
                                    onClick={() => handleTogglePause(item.id, item.status)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 text-left text-sm transition-colors ${isDark ? 'text-slate-300 hover:bg-white/5' : 'text-slate-700 hover:bg-slate-50'}`}
                                  >
                                    {item.status === 'active' ? (
                                      <><Pause className="w-4 h-4 text-amber-500" /> Pause</>) : (
                                      <><Play className="w-4 h-4 text-green-500" /> Resume</>
                                    )}
                                  </button>
                                  <div className={`border-t ${isDark ? 'border-white/10' : 'border-slate-100'}`} />
                                  {deleteConfirmId === item.id ? (
                                    <div className="p-3">
                                      <p className={`text-xs mb-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Delete this workflow?</p>
                                      <div className="flex gap-2">
                                        <button
                                          onClick={() => handleDeleteWorkflow(item.id)}
                                          className="flex-1 px-3 py-1.5 text-xs font-bold bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                                        >
                                          Delete
                                        </button>
                                        <button
                                          onClick={() => setDeleteConfirmId(null)}
                                          className={`flex-1 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => setDeleteConfirmId(item.id)}
                                      className={`w-full flex items-center gap-3 px-4 py-3 text-left text-sm transition-colors text-red-500 ${isDark ? 'hover:bg-red-500/10' : 'hover:bg-red-50'}`}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                      Delete
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {view === 'builder' && (
        <ReactFlowProvider>
          <SchedulerBuilder
            workspace={workspace}
            onBack={() => setView('list')}
            connectionStatus={connectionStatus}
            connectedPages={connectedPages}
            integrationSettings={integrationSettings}
          />
        </ReactFlowProvider>
      )}
    </div>
  );
};

export default ScheduledPosts;