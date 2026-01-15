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
import { Plus, Zap, Lightbulb, ImagePlus, PenTool, Facebook, Save, Play, ArrowLeft, Clock, MoreHorizontal, LayoutGrid, List, Maximize2, Minimize2, AlertTriangle, Link as LinkIcon, CalendarDays, Bug, CheckCircle, XCircle, Trash2, Pause, Edit3, PlayCircle, History, X, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
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
  onSave: () => void;
  connectionStatus: {
    hasConnection: boolean;
    hasActivePages: boolean;
    loading: boolean;
  };
  connectedPages: ConnectedPage[];
  integrationSettings: IntegrationSettings | null;
  editWorkflow?: any; // Workflow being edited
}

const SchedulerBuilder: React.FC<SchedulerBuilderProps> = ({
  workspace,
  onBack,
  onSave,
  connectionStatus,
  connectedPages,
  integrationSettings,
  editWorkflow
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

  // Workflow name modal state
  const [showNameModal, setShowNameModal] = useState(false);
  const [workflowName, setWorkflowName] = useState(editWorkflow?.name || '');
  const [isSaving, setIsSaving] = useState(false);

  // Execution visualization state
  const [isExecuting, setIsExecuting] = useState(false);
  const [executingNodeId, setExecutingNodeId] = useState<string | null>(null);
  const [completedNodeIds, setCompletedNodeIds] = useState<Set<string>>(new Set());
  const [errorNodeId, setErrorNodeId] = useState<string | null>(null);
  const [executionResults, setExecutionResults] = useState<Record<string, any>>({});
  const [showExecuteTooltip, setShowExecuteTooltip] = useState(false);

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

  // Initialize with edit workflow data if provided
  useEffect(() => {
    if (editWorkflow) {
      // Restore nodes with callbacks
      const restoredNodes = (editWorkflow.nodes || []).map((n: any) => ({
        ...n,
        data: {
          ...n.data,
          onConfigure: () => handleConfigureNode(n.id),
          onDelete: () => handleDeleteNode(n.id),
        }
      }));

      if (restoredNodes.length > 0) {
        setNodes(restoredNodes);
      }

      if (editWorkflow.edges?.length > 0) {
        setEdges(editWorkflow.edges);
      }

      if (editWorkflow.configurations) {
        setNodeConfigurations(editWorkflow.configurations);
      }
    }
  }, [editWorkflow]);

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

  // Handle save flow - show name modal for new workflows
  const handleSaveClick = useCallback(() => {
    if (!connectionStatus.hasConnection || !connectionStatus.hasActivePages) {
      setShowConnectionWarning(true);
      return;
    }

    // For new workflows, show name modal; for edits, save directly
    if (editWorkflow) {
      handleSaveFlow();
    } else {
      setShowNameModal(true);
    }
  }, [connectionStatus, editWorkflow]);

  // Actual save function
  const handleSaveFlow = useCallback(async () => {
    setIsSaving(true);
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
      // Extract times array from trigger config - this is the key for multiple schedules
      const scheduleTimes = triggerConfig?.times && triggerConfig.times.length > 0
        ? triggerConfig.times
        : [scheduleTime];

      const workflowData = {
        name: workflowName.trim() || editWorkflow?.name || 'Auto-Post Workflow',
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
        scheduleTimes, // Multiple times array for cron job
        scheduleDays,
        scheduleTimezone: triggerConfig?.timezone || 'Asia/Manila',
        cronExpression: triggerConfig?.customCron,
        nextRunAt: nextRunAt.toISOString()
      };

      // Save to database - update if editing, create if new
      if (editWorkflow?.id) {
        await api.scheduler.updateWorkflow(editWorkflow.id, workflowData);
        toast.success('Workflow updated successfully!');
      } else {
        await api.scheduler.createWorkflow(workspace.id, workflowData);
        toast.success('Workflow saved successfully!');
      }
      setShowNameModal(false);
      setIsSaving(false);
      onSave(); // Callback to refresh list and go back
    } catch (error) {
      console.error('Failed to save workflow:', error);
      toast.error('Failed to save workflow. Please try again.');
      setIsSaving(false);
    }
  }, [connectionStatus, nodes, edges, nodeConfigurations, workspace.id, toast, editWorkflow, onSave, workflowName]);

  // Handle workflow execution with visual feedback
  const handleExecuteWorkflow = useCallback(async () => {
    if (!connectionStatus.hasConnection || !connectionStatus.hasActivePages) {
      setShowConnectionWarning(true);
      return;
    }

    if (!hasOpenAiKey && !hasGeminiKey) {
      toast.error('Please add your OpenAI or Gemini API key in Settings first.');
      return;
    }

    // Reset execution state
    setIsExecuting(true);
    setCompletedNodeIds(new Set());
    setErrorNodeId(null);
    setExecutionResults({});

    const nodeOrder = ['trigger-1', 'topic-1', 'image-1', 'caption-1', 'facebook-1'];
    let currentResults: Record<string, any> = {};

    // Helper function to check if a node is properly configured
    const isNodeConfigured = (nodeId: string): { configured: boolean; errorMessage: string } => {
      const config = nodeConfigurations[nodeId];

      switch (nodeId) {
        case 'topic-1':
          if (!config?.niche || !config.niche.trim()) {
            return { configured: false, errorMessage: 'Topic Generator requires a Niche/Industry to be set' };
          }
          break;
        case 'image-1':
          // Image generator has defaults, but check if user has opened config
          if (!config) {
            return { configured: false, errorMessage: 'Image Generator must be configured' };
          }
          break;
        case 'caption-1':
          // Caption writer has defaults, but check if user has opened config
          if (!config) {
            return { configured: false, errorMessage: 'Caption Writer must be configured' };
          }
          break;
        case 'facebook-1':
          if (!config?.pageId) {
            return { configured: false, errorMessage: 'Facebook Post requires a page to be selected' };
          }
          break;
      }
      return { configured: true, errorMessage: '' };
    };

    try {
      // Execute each node with visual feedback
      for (const nodeId of nodeOrder) {
        setExecutingNodeId(nodeId);

        // Handle trigger node (instant)
        if (nodeId === 'trigger-1') {
          await new Promise(resolve => setTimeout(resolve, 500));
          setCompletedNodeIds(prev => new Set([...prev, nodeId]));
          continue;
        }

        // Wait 3 seconds while showing the glowing orb
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Check if node is configured
        const validation = isNodeConfigured(nodeId);
        if (!validation.configured) {
          toast.error(validation.errorMessage);
          setErrorNodeId(nodeId);
          setExecutingNodeId(null);
          setIsExecuting(false);
          return;
        }

        // For other nodes, call the execute API step-by-step
        try {
          const response = await fetch('/api/cron?execute=true&step=' + nodeId, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              workspaceId: workspace.id,
              configurations: nodeConfigurations,
              previousResults: currentResults
            })
          });

          const result = await response.json();

          if (result.error) {
            throw new Error(result.error);
          }

          // Store result for next step
          currentResults[nodeId] = result;
          setExecutionResults(prev => ({ ...prev, [nodeId]: result }));
          setCompletedNodeIds(prev => new Set([...prev, nodeId]));

        } catch (stepError: any) {
          toast.error(`Failed at ${nodeId}: ${stepError.message}`);
          setErrorNodeId(nodeId);
          setExecutingNodeId(null);
          setIsExecuting(false);
          return;
        }
      }

      toast.success('Workflow executed successfully! Post created on Facebook.');

    } catch (error: any) {
      toast.error('Execution failed: ' + error.message);
    } finally {
      setIsExecuting(false);
      setExecutingNodeId(null);
    }
  }, [connectionStatus, hasOpenAiKey, hasGeminiKey, toast, workspace.id, nodeConfigurations]);

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

  // Update nodes with execution status
  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => {
        let executionStatus: 'idle' | 'executing' | 'completed' | 'error' | undefined = undefined;

        if (errorNodeId === node.id) {
          executionStatus = 'error';
        } else if (executingNodeId === node.id) {
          executionStatus = 'executing';
        } else if (completedNodeIds.has(node.id)) {
          executionStatus = 'completed';
        }

        // Only update if status changed
        if (node.data.executionStatus !== executionStatus) {
          return {
            ...node,
            data: {
              ...node.data,
              executionStatus,
            },
          };
        }
        return node;
      })
    );
  }, [executingNodeId, completedNodeIds, errorNodeId, setNodes]);

  // Update edges with execution state
  useEffect(() => {
    setEdges((eds) =>
      eds.map((edge) => {
        // Edge is executing when source is completed and target is current
        const sourceCompleted = completedNodeIds.has(edge.source);
        const targetExecuting = executingNodeId === edge.target;
        const targetCompleted = completedNodeIds.has(edge.target);

        let executionState: 'idle' | 'executing' | 'completed' = 'idle';

        if (sourceCompleted && targetCompleted) {
          executionState = 'completed';
        } else if (sourceCompleted && targetExecuting) {
          executionState = 'executing';
        }

        // Only update if state changed
        if (edge.data?.executionState !== executionState) {
          return {
            ...edge,
            data: {
              ...edge.data,
              executionState,
            },
          };
        }
        return edge;
      })
    );
  }, [executingNodeId, completedNodeIds, setEdges]);

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
          onClick={handleSaveClick}
          className={`group relative p-2.5 backdrop-blur-md rounded-xl border shadow-lg transition-all ${isDark
            ? 'bg-white/5 hover:bg-white/10 text-white border-white/10'
            : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-slate-200/50'
            }`}
          title="Save Workflow"
        >
          <Save className="w-5 h-5" />
        </button>
        <div className="relative">
          <button
            onClick={handleExecuteWorkflow}
            onMouseEnter={() => setShowExecuteTooltip(true)}
            onMouseLeave={() => setShowExecuteTooltip(false)}
            disabled={isExecuting}
            className={`group relative p-2.5 rounded-xl shadow-lg transition-all ${isExecuting
              ? 'bg-amber-500 animate-pulse cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/20'
              } text-white`}
            title="Execute Workflow"
          >
            {isExecuting ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Zap className="w-5 h-5" />
            )}
          </button>
          {showExecuteTooltip && !isExecuting && (
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-900 text-white text-xs rounded whitespace-nowrap">
              Execute
            </div>
          )}
        </div>
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

      {/* Workflow Name Modal */}
      {showNameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={`w-full max-w-md rounded-2xl shadow-2xl border overflow-hidden ${isDark ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'}`}>
            <div className={`p-6 border-b ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
              <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Name Your Workflow</h2>
              <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Give your workflow a memorable name</p>
            </div>
            <div className="p-6">
              <input
                type="text"
                value={workflowName}
                onChange={(e) => setWorkflowName(e.target.value)}
                placeholder="e.g., Daily Music Posts, Weekly Tips..."
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && workflowName.trim()) {
                    handleSaveFlow();
                  }
                }}
                className={`w-full px-4 py-3 rounded-xl border text-base transition-colors ${isDark
                  ? 'bg-white/5 border-white/10 text-white placeholder-slate-500 focus:border-indigo-500'
                  : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-indigo-500'
                  } focus:outline-none focus:ring-2 focus:ring-indigo-500/20`}
              />
            </div>
            <div className={`p-4 flex gap-3 justify-end border-t ${isDark ? 'border-white/10 bg-black/20' : 'border-slate-200 bg-slate-50'}`}>
              <button
                onClick={() => {
                  setShowNameModal(false);
                  setWorkflowName('');
                }}
                disabled={isSaving}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${isDark
                  ? 'text-slate-400 hover:text-white hover:bg-white/10'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveFlow}
                disabled={!workflowName.trim() || isSaving}
                className={`px-6 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${workflowName.trim() && !isSaving
                  ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                  : 'bg-indigo-600/50 text-white/50 cursor-not-allowed'
                  }`}
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save & Activate
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
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
  const [editWorkflow, setEditWorkflow] = useState<any>(null);

  // History modal state
  const [historyWorkflow, setHistoryWorkflow] = useState<any>(null);
  const [historyExecutions, setHistoryExecutions] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [expandedHistoryIds, setExpandedHistoryIds] = useState<Set<string>>(new Set());

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

  // Real-time polling for workflow status (every 5 seconds)
  useEffect(() => {
    if (view !== 'list' || scheduledItems.length === 0) return; // Only poll when viewing list (not builder)

    const pollStatus = async () => {
      try {
        const workflows = await api.scheduler.getWorkflows(workspace.id);
        setScheduledItems(workflows);
      } catch (error) {
        console.error('Failed to poll workflows:', error);
      }
    };

    const interval = setInterval(pollStatus, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, [workspace.id, view, scheduledItems.length]);

  // Helper to format time to 12-hour format
  const formatTo12Hour = (time24: string) => {
    if (!time24) return '';
    const [hours, minutes] = time24.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  // Helper to get execution status display
  const getExecutionStatus = (item: any) => {
    const exec = item.lastExecution;
    if (!exec) return { status: 'never', label: 'Never run', color: 'slate' };

    switch (exec.status) {
      case 'running':
        return { status: 'running', label: 'Processing...', color: 'blue' };
      case 'completed':
        return { status: 'completed', label: 'Posted', color: 'green' };
      case 'failed':
        return { status: 'failed', label: 'Failed', color: 'red' };
      default:
        // Check if next_run_at is in the past (queued)
        if (item.nextRunAt && new Date(item.nextRunAt) <= new Date()) {
          return { status: 'queued', label: 'In Queue...', color: 'amber' };
        }
        return { status: 'idle', label: item.lastRunAt ? new Date(item.lastRunAt).toLocaleString() : 'Never run', color: 'slate' };
    }
  };

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

  const handleEditWorkflow = (workflow: any) => {
    setEditWorkflow(workflow);
    setActiveMenuId(null);
    setView('builder');
  };

  const handleSaveComplete = async () => {
    // Refresh workflows list and go back to list view
    const workflows = await api.scheduler.getWorkflows(workspace.id);
    setScheduledItems(workflows);
    setEditWorkflow(null);
    setView('list');
  };

  const handleViewHistory = async (workflow: any) => {
    setHistoryWorkflow(workflow);
    setActiveMenuId(null);
    setIsLoadingHistory(true);
    try {
      const executions = await api.scheduler.getExecutions(workflow.id);
      setHistoryExecutions(executions || []);
    } catch (error) {
      console.error('Failed to load history:', error);
      toast.error('Failed to load execution history');
      setHistoryExecutions([]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Helper to get page info from workflow configurations
  const getWorkflowPageInfo = (workflow: any) => {
    const configs = workflow.configurations || {};
    for (const [nodeId, config] of Object.entries(configs)) {
      const cfg = config as any;
      if (cfg?.pageId) {
        const page = connectedPages.find(p => p.pageId === cfg.pageId);
        if (page) {
          return { name: page.name, imageUrl: page.pageImageUrl || '' };
        }
        // Fallback to pageName if stored in config
        if (cfg?.pageName) {
          return { name: cfg.pageName, imageUrl: '' };
        }
      }
    }
    return null;
  };

  // Helper to get all schedule times from workflow
  const getWorkflowScheduleTimes = (workflow: any): string[] => {
    // First try the scheduleTimes field (from schedule_times DB column)
    if (workflow.scheduleTimes && Array.isArray(workflow.scheduleTimes) && workflow.scheduleTimes.length > 0) {
      return workflow.scheduleTimes;
    }
    // Fallback to configurations (for backward compatibility)
    const configs = workflow.configurations || {};
    for (const [nodeId, config] of Object.entries(configs)) {
      const cfg = config as any;
      if (cfg?.times && Array.isArray(cfg.times) && cfg.times.length > 0) {
        return cfg.times;
      }
    }
    // Final fallback to single time
    return [workflow.scheduleTime || '09:00'];
  };

  // Helper to get status of each scheduled time (posted, pending, upcoming)
  const getTimeStatus = (time: string, allTimes: string[], workflow: any): 'posted' | 'pending' | 'upcoming' => {
    const now = new Date();
    const [hours, minutes] = time.split(':').map(Number);
    const timeDate = new Date();
    timeDate.setHours(hours, minutes, 0, 0);

    // Sort times chronologically
    const sortedTimes = [...allTimes].sort((a, b) => {
      const [aH, aM] = a.split(':').map(Number);
      const [bH, bM] = b.split(':').map(Number);
      return (aH * 60 + aM) - (bH * 60 + bM);
    });

    // Find the first time that hasn't passed yet
    let nextPendingIndex = -1;
    for (let i = 0; i < sortedTimes.length; i++) {
      const [h, m] = sortedTimes[i].split(':').map(Number);
      const checkTime = new Date();
      checkTime.setHours(h, m, 0, 0);
      if (checkTime > now) {
        nextPendingIndex = i;
        break;
      }
    }

    const currentTimeIndex = sortedTimes.indexOf(time);

    if (nextPendingIndex === -1) {
      // All times have passed today
      return 'posted';
    }

    if (currentTimeIndex < nextPendingIndex) {
      return 'posted';
    } else if (currentTimeIndex === nextPendingIndex) {
      return 'pending';
    } else {
      return 'upcoming';
    }
  };

  // State for expanded schedule times
  const [expandedScheduleId, setExpandedScheduleId] = useState<string | null>(null);

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
            ) : viewMode === 'grid' ? (
              /* Grid View */
              <div className="w-full self-start">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {scheduledItems.map(item => {
                    const hasError = item.lastExecution?.status === 'failed';
                    const wasPosted = item.lastExecution?.status === 'completed';
                    const isRunning = item.lastExecution?.status === 'running';
                    const pageInfo = getWorkflowPageInfo(item);

                    return (
                      <div
                        key={item.id}
                        className={`rounded-xl border p-5 transition-all hover:shadow-lg ${isDark ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-white border-slate-200 hover:border-indigo-300'}`}
                      >
                        {/* Header */}
                        <div className="flex items-start justify-between mb-4 relative">
                          <div className="flex-1">
                            <h3 className={`font-bold text-lg mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                              {item.name}
                            </h3>
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold capitalize ${item.status === 'active'
                              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                              : item.status === 'paused'
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                : 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                              }`}>
                              {item.status}
                            </span>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuId(activeMenuId === item.id ? null : item.id);
                            }}
                            className={`p-2 transition-colors rounded-lg ${isDark ? 'text-slate-400 hover:text-white hover:bg-white/10' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'}`}
                          >
                            <MoreHorizontal className="w-5 h-5" />
                          </button>

                          {/* Dropdown Menu for Grid */}
                          {activeMenuId === item.id && (
                            <div
                              className={`absolute right-0 top-10 w-44 rounded-xl shadow-xl border z-50 overflow-hidden ${isDark ? 'bg-slate-800 border-white/10' : 'bg-white border-slate-200'}`}
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
                                onClick={() => handleEditWorkflow(item)}
                                className={`w-full flex items-center gap-3 px-4 py-3 text-left text-sm transition-colors ${isDark ? 'text-slate-300 hover:bg-white/5' : 'text-slate-700 hover:bg-slate-50'}`}
                              >
                                <Edit3 className="w-4 h-4 text-indigo-500" />
                                Edit
                              </button>
                              <button
                                onClick={() => handleViewHistory(item)}
                                className={`w-full flex items-center gap-3 px-4 py-3 text-left text-sm transition-colors ${isDark ? 'text-slate-300 hover:bg-white/5' : 'text-slate-700 hover:bg-slate-50'}`}
                              >
                                <History className="w-4 h-4 text-cyan-500" />
                                History
                              </button>
                              <button
                                onClick={() => handleTogglePause(item.id, item.status)}
                                className={`w-full flex items-center gap-3 px-4 py-3 text-left text-sm transition-colors ${isDark ? 'text-slate-300 hover:bg-white/5' : 'text-slate-700 hover:bg-slate-50'}`}
                              >
                                {item.status === 'active' ? (
                                  <><Pause className="w-4 h-4 text-amber-500" /> Pause</>
                                ) : (
                                  <><Play className="w-4 h-4 text-green-500" /> Resume</>
                                )}
                              </button>
                              <div className={`border-t ${isDark ? 'border-white/10' : 'border-slate-100'}`} />
                              <button
                                onClick={() => {
                                  handleDeleteWorkflow(item.id);
                                }}
                                className={`w-full flex items-center gap-3 px-4 py-3 text-left text-sm transition-colors text-red-500 ${isDark ? 'hover:bg-red-500/10' : 'hover:bg-red-50'}`}
                              >
                                <Trash2 className="w-4 h-4" />
                                Delete
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Facebook Page */}
                        <div className={`flex items-center gap-3 mb-4 p-3 rounded-lg ${isDark ? 'bg-white/5' : 'bg-slate-50'}`}>
                          {pageInfo ? (
                            <>
                              {pageInfo.imageUrl ? (
                                <img
                                  src={pageInfo.imageUrl}
                                  alt={pageInfo.name}
                                  className="w-10 h-10 rounded-full object-cover border-2 border-blue-500/30"
                                />
                              ) : (
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isDark ? 'bg-blue-500/20' : 'bg-blue-100'}`}>
                                  <Facebook className="w-5 h-5 text-blue-500" />
                                </div>
                              )}
                              <div>
                                <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                  {pageInfo.name}
                                </p>
                                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Facebook Page</p>
                              </div>
                            </>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Facebook className={`w-5 h-5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                              <span className={`text-sm ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>No page set</span>
                            </div>
                          )}
                        </div>

                        {/* Schedule & Status Info */}
                        <div className="space-y-2">
                          {(() => {
                            const scheduleTimes = getWorkflowScheduleTimes(item);
                            const hasMultipleTimes = scheduleTimes.length > 1;
                            const isExpanded = expandedScheduleId === item.id;

                            return (
                              <div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (hasMultipleTimes) {
                                      setExpandedScheduleId(isExpanded ? null : item.id);
                                    }
                                  }}
                                  className={`flex items-center gap-2 ${hasMultipleTimes ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}
                                >
                                  <Clock className={`w-4 h-4 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                                  <span className={`text-sm capitalize ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                                    {item.scheduleType}
                                    {hasMultipleTimes ? (
                                      <span className="ml-1">
                                        ({scheduleTimes.length} times/day)
                                      </span>
                                    ) : (
                                      <span className="ml-1">at {formatTo12Hour(scheduleTimes[0])}</span>
                                    )}
                                  </span>
                                  {hasMultipleTimes && (
                                    isExpanded ?
                                      <ChevronUp className={`w-3 h-3 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} /> :
                                      <ChevronDown className={`w-3 h-3 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
                                  )}
                                </button>
                                {isExpanded && hasMultipleTimes && (
                                  <div className={`mt-2 ml-6 p-2 rounded-lg space-y-1.5 ${isDark ? 'bg-white/5' : 'bg-slate-100'}`}>
                                    {scheduleTimes.map((time, idx) => {
                                      const status = getTimeStatus(time, scheduleTimes, item);
                                      return (
                                        <div key={idx} className={`flex items-center gap-2 text-xs ${status === 'posted' ? 'text-green-400' : status === 'pending' ? 'text-amber-400' : isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                          {status === 'posted' ? (
                                            <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                                          ) : status === 'pending' ? (
                                            <div className="w-3.5 h-3.5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                                          ) : (
                                            <div className={`w-1.5 h-1.5 rounded-full ${isDark ? 'bg-slate-500' : 'bg-slate-400'}`} />
                                          )}
                                          <span>{formatTo12Hour(time)}</span>
                                          {status === 'pending' && (
                                            <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/20 text-amber-400">NEXT</span>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                          <div className="flex items-center gap-2">
                            {(() => {
                              const execStatus = getExecutionStatus(item);
                              if (execStatus.status === 'running') {
                                return <><div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /><span className="text-sm text-blue-400">{execStatus.label}</span></>;
                              } else if (execStatus.status === 'queued') {
                                return <><div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" /><span className="text-sm text-amber-400">{execStatus.label}</span></>;
                              } else if (execStatus.status === 'completed') {
                                return <><CheckCircle className="w-4 h-4 text-green-500" /><span className="text-sm text-green-400">{execStatus.label}</span></>;
                              } else if (execStatus.status === 'failed') {
                                return <><XCircle className="w-4 h-4 text-red-500" /><span className="text-sm text-red-400">{execStatus.label}</span></>;
                              } else {
                                return <span className={`text-sm ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{execStatus.label}</span>;
                              }
                            })()}
                          </div>
                        </div>

                        {/* Quick Actions */}
                        <div className={`flex gap-2 mt-4 pt-4 border-t ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                          <button
                            onClick={() => handleRunNow(item.id)}
                            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${isDark
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30'
                              : 'bg-emerald-50 text-emerald-600 border-emerald-300 hover:bg-emerald-100'
                              }`}
                          >
                            <PlayCircle className="w-4 h-4" />
                            Run
                          </button>
                          <button
                            onClick={() => handleEditWorkflow(item)}
                            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${isDark
                              ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30 hover:bg-indigo-500/30'
                              : 'bg-indigo-50 text-indigo-600 border-indigo-300 hover:bg-indigo-100'
                              }`}
                          >
                            <Edit3 className="w-4 h-4" />
                            Edit
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="w-full self-start">
                <table className="w-full text-left">
                  <thead className={`text-xs uppercase font-bold border-b ${isDark ? 'bg-white/5 text-slate-400 border-white/10' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                    <tr>
                      <th className="px-6 py-4">Name</th>
                      <th className="px-6 py-4">Facebook Page</th>
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
                      const pageInfo = getWorkflowPageInfo(item);

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
                          <td className="px-6 py-4">
                            {pageInfo ? (
                              <div className="flex items-center gap-3">
                                {pageInfo.imageUrl ? (
                                  <img
                                    src={pageInfo.imageUrl}
                                    alt={pageInfo.name}
                                    className="w-8 h-8 rounded-full object-cover border border-white/10"
                                  />
                                ) : (
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isDark ? 'bg-blue-500/20' : 'bg-blue-100'}`}>
                                    <Facebook className="w-4 h-4 text-blue-500" />
                                  </div>
                                )}
                                <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-slate-700'}`}>
                                  {pageInfo.name}
                                </span>
                              </div>
                            ) : (
                              <span className={`text-sm ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Not set</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {(() => {
                              const scheduleTimes = getWorkflowScheduleTimes(item);
                              const hasMultipleTimes = scheduleTimes.length > 1;
                              return (
                                <div className="relative group">
                                  <span className={`text-sm capitalize ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                                    {item.scheduleType}
                                    {hasMultipleTimes ? (
                                      <span className="ml-1 px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 text-xs font-medium">
                                        {scheduleTimes.length} times
                                      </span>
                                    ) : (
                                      <span className="ml-1">at {formatTo12Hour(scheduleTimes[0])}</span>
                                    )}
                                  </span>
                                  {hasMultipleTimes && (
                                    <div className={`absolute left-0 top-full mt-1 p-2 rounded-lg shadow-xl border z-50 opacity-0 group-hover:opacity-100 transition-opacity min-w-36 ${isDark ? 'bg-slate-800 border-white/10' : 'bg-white border-slate-200'}`}>
                                      <p className={`text-xs font-semibold mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Scheduled Times:</p>
                                      {scheduleTimes.map((time, idx) => {
                                        const status = getTimeStatus(time, scheduleTimes, item);
                                        return (
                                          <div key={idx} className={`flex items-center gap-2 text-xs py-0.5 ${status === 'posted' ? 'text-green-500' : status === 'pending' ? 'text-amber-500' : isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                                            {status === 'posted' ? (
                                              <CheckCircle className="w-3.5 h-3.5" />
                                            ) : status === 'pending' ? (
                                              <div className="w-3.5 h-3.5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                                            ) : (
                                              <div className={`w-1.5 h-1.5 rounded-full ml-1 ${isDark ? 'bg-slate-500' : 'bg-slate-400'}`} />
                                            )}
                                            <span>{formatTo12Hour(time)}</span>
                                            {status === 'pending' && (
                                              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-600">NEXT</span>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </td>
                          <td className="px-6 py-4">
                            {(() => {
                              const execStatus = getExecutionStatus(item);
                              if (execStatus.status === 'running') {
                                return (
                                  <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                    <span className="text-sm text-blue-400">Processing...</span>
                                  </div>
                                );
                              } else if (execStatus.status === 'queued') {
                                return (
                                  <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                                    <span className="text-sm text-amber-400">In Queue...</span>
                                  </div>
                                );
                              } else if (execStatus.status === 'completed') {
                                return (
                                  <div className="flex items-center gap-2">
                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                    <span className="text-sm text-green-400">Posted</span>
                                  </div>
                                );
                              } else if (execStatus.status === 'failed') {
                                return (
                                  <div className="flex items-center gap-2">
                                    <XCircle className="w-4 h-4 text-red-500" />
                                    <span className="text-sm text-red-400">Failed</span>
                                  </div>
                                );
                              } else {
                                return (
                                  <span className={`text-sm ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                    {execStatus.label}
                                  </span>
                                );
                              }
                            })()}
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
                                    onClick={() => handleEditWorkflow(item)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 text-left text-sm transition-colors ${isDark ? 'text-slate-300 hover:bg-white/5' : 'text-slate-700 hover:bg-slate-50'}`}
                                  >
                                    <Edit3 className="w-4 h-4 text-indigo-500" />
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleViewHistory(item)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 text-left text-sm transition-colors ${isDark ? 'text-slate-300 hover:bg-white/5' : 'text-slate-700 hover:bg-slate-50'}`}
                                  >
                                    <History className="w-4 h-4 text-cyan-500" />
                                    History
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
            onBack={() => {
              setEditWorkflow(null);
              setView('list');
            }}
            onSave={handleSaveComplete}
            connectionStatus={connectionStatus}
            connectedPages={connectedPages}
            integrationSettings={integrationSettings}
            editWorkflow={editWorkflow}
          />
        </ReactFlowProvider>
      )}

      {/* History Modal */}
      {historyWorkflow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={`w-full max-w-3xl max-h-[85vh] rounded-2xl shadow-2xl border overflow-hidden ${isDark ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'}`}>
            {/* Modal Header */}
            <div className={`flex items-center justify-between p-6 border-b ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600">
                  <History className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Execution History</h2>
                  <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{historyWorkflow.name}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setHistoryWorkflow(null);
                  setHistoryExecutions([]);
                }}
                className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-white/10 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className={`p-6 overflow-y-auto max-h-[calc(85vh-120px)] ${isDark ? 'bg-slate-900/50' : 'bg-slate-50/50'}`}>
              {isLoadingHistory ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : historyExecutions.length === 0 ? (
                <div className={`text-center py-12 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No execution history yet</p>
                  <p className="text-sm mt-1">Run the workflow to see activity logs</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {historyExecutions.map((exec, index) => {
                    const startTime = exec.startedAt ? new Date(exec.startedAt) : null;
                    const endTime = exec.completedAt ? new Date(exec.completedAt) : null;
                    const duration = startTime && endTime ? Math.round((endTime.getTime() - startTime.getTime()) / 1000) : null;
                    const execId = exec.id || `exec-${index}`;
                    const isExpanded = expandedHistoryIds.has(execId);
                    const hasDetails = exec.generatedTopic || exec.generatedCaption || exec.generatedImageUrl || exec.error;

                    return (
                      <div
                        key={execId}
                        className={`rounded-xl border overflow-hidden ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'}`}
                      >
                        {/* Execution Header - Always visible */}
                        <button
                          onClick={() => {
                            if (hasDetails) {
                              setExpandedHistoryIds(prev => {
                                const newSet = new Set(prev);
                                if (newSet.has(execId)) {
                                  newSet.delete(execId);
                                } else {
                                  newSet.add(execId);
                                }
                                return newSet;
                              });
                            }
                          }}
                          className={`w-full flex items-center justify-between p-4 text-left ${hasDetails ? 'cursor-pointer hover:bg-white/5' : 'cursor-default'} transition-colors`}
                        >
                          <div className="flex items-center gap-3">
                            {exec.status === 'completed' ? (
                              <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                                <CheckCircle className="w-4 h-4 text-green-500" />
                              </div>
                            ) : exec.status === 'failed' ? (
                              <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
                                <XCircle className="w-4 h-4 text-red-500" />
                              </div>
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                              </div>
                            )}
                            <div>
                              <span className={`font-semibold capitalize ${exec.status === 'completed' ? 'text-green-400' : exec.status === 'failed' ? 'text-red-400' : 'text-blue-400'}`}>
                                {exec.status === 'completed' ? 'Posted Successfully' : exec.status === 'failed' ? 'Failed' : 'Processing'}
                              </span>
                              <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                {startTime ? startTime.toLocaleString() : 'Unknown time'}
                                {duration && ` • ${duration}s`}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {exec.facebookPostId && (
                              <a
                                href={`https://facebook.com/${exec.facebookPostId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors"
                              >
                                <ExternalLink className="w-3 h-3" />
                                View Post
                              </a>
                            )}
                            {hasDetails && (
                              isExpanded ?
                                <ChevronUp className={`w-4 h-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} /> :
                                <ChevronDown className={`w-4 h-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
                            )}
                          </div>
                        </button>

                        {/* Execution Details - Collapsible */}
                        {isExpanded && hasDetails && (
                          <div className={`px-4 pb-4 space-y-3 border-t ${isDark ? 'border-white/10' : 'border-slate-100'}`}>
                            <div className="pt-3">
                              {exec.generatedTopic && (
                                <div className="mb-3">
                                  <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Topic</p>
                                  <p className={`text-sm ${isDark ? 'text-white' : 'text-slate-700'}`}>{exec.generatedTopic}</p>
                                </div>
                              )}

                              {exec.generatedCaption && (
                                <div className="mb-3">
                                  <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Caption</p>
                                  <div className={`text-sm whitespace-pre-wrap p-3 rounded-lg ${isDark ? 'bg-black/30 text-slate-300' : 'bg-slate-100 text-slate-700'}`}>
                                    {exec.generatedCaption}
                                  </div>
                                </div>
                              )}

                              {exec.generatedImageUrl && (
                                <div className="mb-3">
                                  <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Generated Image</p>
                                  <img
                                    src={exec.generatedImageUrl}
                                    alt="Generated"
                                    className="w-full max-w-xs rounded-lg border border-white/10"
                                  />
                                </div>
                              )}

                              {exec.error && (
                                <div>
                                  <p className={`text-xs font-semibold uppercase tracking-wide mb-1 text-red-400`}>Error</p>
                                  <div className="text-sm p-3 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20">
                                    {exec.error}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScheduledPosts;