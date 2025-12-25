import React, { useState, useCallback, useEffect, useRef, DragEvent } from 'react';
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
  NodeTypes,
  useReactFlow,
  ReactFlowProvider
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useParams, useNavigate } from 'react-router-dom';
import { Workspace, ConnectedPage } from '../types';
import { Save, ArrowLeft, PlayCircle, Menu, X, Grid3x3, MessageCircle, Play, Bot, Send, Clock, MousePointer2, SquareMousePointer, Sparkles, GitBranch, MessageSquare, RectangleEllipsis } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import NodeConfigModal from '../components/NodeConfigModal';
import TriggerNodeForm from '../components/TriggerNodeForm';
import CommentReplyNodeForm from '../components/CommentReplyNodeForm';
import SendMessageNodeForm from '../components/SendMessageNodeForm';
import TextNodeForm from '../components/TextNodeForm';
import ButtonNodeForm from '../components/ButtonNodeForm';
import ButtonsOnlyNodeForm from '../components/ButtonsOnlyNodeForm';
import StartNodeForm from '../components/StartNodeForm';
import CustomEdge from '../components/edges/CustomEdge';
import CustomTriggerNode from '../components/nodes/CustomTriggerNode';
import CustomActionNode from '../components/nodes/CustomActionNode';
import CustomAINode from '../components/nodes/CustomAINode';
import CustomConditionNode from '../components/nodes/CustomConditionNode';
import CustomTextNode from '../components/nodes/CustomTextNode';
import CustomButtonNode from '../components/nodes/CustomButtonNode';
import CustomButtonsOnlyNode from '../components/nodes/CustomButtonsOnlyNode';
import CustomStartNode from '../components/nodes/CustomStartNode';
import { api } from '../services/api';
// Import node configuration registry
import '../src/config'; // This initializes all node configs
import { nodeConfigRegistry } from '../src/utils/nodeConfigRegistry';


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
  textNode: CustomTextNode,
  buttonNode: CustomButtonNode,
  buttonsOnlyNode: CustomButtonsOnlyNode,
  startNode: CustomStartNode,
};

// Define custom edge types
const edgeTypes = {
  custom: CustomEdge,
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

  // Save dialog state
  const [showNameDialog, setShowNameDialog] = useState(false);
  const [flowName, setFlowName] = useState('');

  // Inline name editing state
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [currentFlowName, setCurrentFlowName] = useState('Untitled Flow');
  const [flowStatus, setFlowStatus] = useState<'ACTIVE' | 'DRAFT'>('DRAFT');

  // Node configuration state
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [nodeConfigs, setNodeConfigs] = useState<NodeConfig>({});
  const [currentConfig, setCurrentConfig] = useState<any>({});

  // Selected edge for deletion
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);

  // User API keys
  const [userApiKeys, setUserApiKeys] = useState<any>({});

  // Available pages for this workspace
  const [availablePages, setAvailablePages] = useState<ConnectedPage[]>([]);
  const [flowPageId, setFlowPageId] = useState<string>('');
  const [pageDropdownOpen, setPageDropdownOpen] = useState(false);
  const [loadingPages, setLoadingPages] = useState(true);
  const pageDropdownRef = useRef<HTMLDivElement>(null);

  // Ref for ReactFlow wrapper (for drag-drop)
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  // Get ReactFlow instance for coordinate conversion
  const reactFlowInstance = useReactFlow();

  useEffect(() => {
    loadUserApiKeys();
    loadAvailablePages();
    // Check if mobile
    const isMobile = window.innerWidth < 768;
    setSidebarCollapsed(isMobile);

    // Load flow data if editing existing flow
    if (id && !id.startsWith('new')) {
      loadFlowData();
    }
  }, [id]);

  // Close page dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pageDropdownRef.current && !pageDropdownRef.current.contains(event.target as HTMLElement)) {
        setPageDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load available pages for this workspace
  const loadAvailablePages = async () => {
    try {
      setLoadingPages(true);
      const pages = await api.workspace.getConnectedPages(workspace.id);
      // Only show pages with automation enabled
      const automationPages = pages.filter(p => p.isAutomationEnabled);
      setAvailablePages(automationPages);
      console.log('[FlowBuilder] Loaded', automationPages.length, 'pages with automation');
    } catch (error) {
      console.error('[FlowBuilder] Error loading pages:', error);
    } finally {
      setLoadingPages(false);
    }
  };

  // Handle page selection from header dropdown
  const handlePageSelect = (pageId: string) => {
    setFlowPageId(pageId);
    setPageDropdownOpen(false);

    // Update all trigger node configs with this page
    const updatedConfigs = { ...nodeConfigs };
    nodes.forEach(node => {
      if (node.type === 'triggerNode' || node.data?.nodeType === 'triggerNode') {
        updatedConfigs[node.id] = {
          ...updatedConfigs[node.id],
          pageId: pageId
        };
      }
    });
    setNodeConfigs(updatedConfigs);
    console.log('[FlowBuilder] Page selected:', pageId, '- updated trigger configs');
  };

  // Get selected page object
  const selectedPage = availablePages.find(p => p.id === flowPageId);

  const loadFlowData = async () => {
    if (!id || id.startsWith('new')) return;

    try {
      console.log('[FlowBuilder.loadFlowData] ========== LOADING FLOW ==========');
      console.log('[FlowBuilder.loadFlowData] Flow ID:', id);

      const flow = await api.workspace.getFlow(id);

      if (flow) {
        console.log('[FlowBuilder.loadFlowData] ✓ Flow loaded successfully');
        console.log('[FlowBuilder.loadFlowData] Flow name:', flow.name);
        console.log('[FlowBuilder.loadFlowData] Flow status:', flow.status);
        console.log('[FlowBuilder.loadFlowData] Flow configurations:', (flow as any).configurations);

        // Set flow name and status
        setCurrentFlowName(flow.name);
        setFlowStatus(flow.status as 'ACTIVE' | 'DRAFT');

        // First, restore configurations
        const savedConfigs = (flow as any).configurations || {};
        console.log('[FlowBuilder.loadFlowData] Saved configurations object:', savedConfigs);
        console.log('[FlowBuilder.loadFlowData] Configuration keys:', Object.keys(savedConfigs));
        setNodeConfigs(savedConfigs);

        // Restore nodes with their configurations applied
        if (flow.nodes && Array.isArray(flow.nodes)) {
          console.log('[FlowBuilder.loadFlowData] Processing', flow.nodes.length, 'nodes');

          const restoredNodes = flow.nodes.map((node: any) => {
            // Get saved configuration for this node
            const nodeConfig = savedConfigs[node.id] || {};
            console.log(`[FlowBuilder.loadFlowData] ────────────────────────────────`);
            console.log(`[FlowBuilder.loadFlowData] Node ID: ${node.id}`);
            console.log(`[FlowBuilder.loadFlowData] Node label: ${node.data?.label}`);
            console.log(`[FlowBuilder.loadFlowData] Node type: ${node.data?.nodeType}`);
            console.log(`[FlowBuilder.loadFlowData] Saved config for this node:`, nodeConfig);

            if (nodeConfig.enableCommentReply !== undefined) {
              console.log(`[FlowBuilder.loadFlowData] ⚠️ TOGGLE: enableCommentReply = ${nodeConfig.enableCommentReply}`);
            }
            if (nodeConfig.enableSendMessage !== undefined) {
              console.log(`[FlowBuilder.loadFlowData] ⚠️ TOGGLE: enableSendMessage = ${nodeConfig.enableSendMessage}`);
            }

            const mergedNode = {
              ...node,
              data: {
                ...node.data,
                // Merge saved configuration into node data
                ...nodeConfig,
                // Add callbacks for node buttons
                onDelete: () => handleDeleteNode(node.id),
                onConfigure: () => handleConfigureNode(node)
              }
            };

            console.log(`[FlowBuilder.loadFlowData] Merged node data:`, mergedNode.data);
            return mergedNode;
          });

          setNodes(restoredNodes);
          console.log('[FlowBuilder.loadFlowData] ✓ All nodes restored with configurations');
        }

        // Restore edges
        if (flow.edges && Array.isArray(flow.edges)) {
          setEdges(flow.edges);
          console.log('[FlowBuilder.loadFlowData] ✓ Restored', flow.edges.length, 'edges');
        }

        console.log('[FlowBuilder.loadFlowData] ========== FLOW LOAD COMPLETE ==========');

        // Extract page info from trigger node config
        extractPageInfo(savedConfigs);
      } else {
        console.warn('[FlowBuilder.loadFlowData] ✗ Flow not found:', id);
        toast.error('Flow not found');
      }
    } catch (error) {
      console.error('[FlowBuilder.loadFlowData] ✗ ERROR loading flow:', error);
      toast.error('Failed to load flow');
    }
  };

  // Extract page info from trigger node configurations
  const extractPageInfo = (configs: NodeConfig) => {
    // Find trigger node config with pageId and set it
    for (const nodeId in configs) {
      const config = configs[nodeId];
      if (config.pageId) {
        console.log('[FlowBuilder] Found pageId in config:', config.pageId);
        setFlowPageId(config.pageId);
        break;
      }
    }
  };

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
      type: 'custom',
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
    console.log('[FlowBuilder.handleConfigureNode] Opening config modal for node:', node.id);
    console.log('[FlowBuilder.handleConfigureNode] Node data:', node.data);

    const nodeData = node.data;
    const nodeLabel = nodeData.label as string;
    const nodeType = nodeData.nodeType as string;

    // Determine the config type based on node label and type
    let configType = '';
    if (nodeLabel?.includes('Comment') && nodeType === 'triggerNode') {
      configType = 'triggerNode';
    } else if (nodeLabel?.includes('Reply') && !nodeLabel?.includes('Messenger')) {
      configType = 'commentReplyNode';
    } else if (nodeLabel?.includes('Message') || nodeLabel?.includes('Messenger')) {
      configType = 'messengerReplyNode';
    }

    // Use registry to extract configuration from node data
    const extractedConfig = configType
      ? nodeConfigRegistry.extractConfig(configType, nodeData)
      : {};

    // Get saved config from nodeConfigs (this has pageId and other saved settings)
    const savedConfig = nodeConfigs[node.id] || {};

    // Merge saved config with extracted config - saved config takes priority
    const mergedConfig = { ...extractedConfig, ...savedConfig };

    console.log('[FlowBuilder.handleConfigureNode] Config type:', configType);
    console.log('[FlowBuilder.handleConfigureNode] Extracted config:', extractedConfig);
    console.log('[FlowBuilder.handleConfigureNode] Saved config (nodeConfigs):', savedConfig);
    console.log('[FlowBuilder.handleConfigureNode] Merged config:', mergedConfig);

    setSelectedNode(node);
    setCurrentConfig(mergedConfig);
    setShowConfigModal(true);
  }, [nodeConfigs]);

  const handleSaveConfig = () => {
    if (selectedNode) {
      // For trigger nodes, always include the flowPageId
      const isTriggerNode = selectedNode.type === 'triggerNode' ||
        selectedNode.data?.nodeType === 'triggerNode' ||
        selectedNode.data?.label?.includes('Comment');

      const configToSave = isTriggerNode
        ? { ...currentConfig, pageId: flowPageId }
        : currentConfig;

      console.log('[FlowBuilder.handleSaveConfig] Saving config for:', selectedNode.id);
      console.log('[FlowBuilder.handleSaveConfig] Is trigger node:', isTriggerNode);
      console.log('[FlowBuilder.handleSaveConfig] flowPageId:', flowPageId);
      console.log('[FlowBuilder.handleSaveConfig] Config to save:', configToSave);

      setNodeConfigs(prev => ({
        ...prev,
        [selectedNode.id]: configToSave
      }));

      // Update node data with config
      setNodes((nds) => nds.map((node) => {
        if (node.id === selectedNode.id) {
          return {
            ...node,
            data: {
              ...node.data,
              ...configToSave,
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
    console.log('handleSave called, id:', id);
    console.log('Is new flow?', !id || id.startsWith('new'));

    // Always show name dialog for both new and existing flows
    // Pre-populate with current name for existing flows
    if (id && !id.startsWith('new')) {
      // Existing flow - pre-fill with current name
      console.log('Opening name dialog for existing flow with name:', currentFlowName);
      setFlowName(currentFlowName);
    } else {
      // New flow - start with empty name
      console.log('Opening name dialog for new flow');
      setFlowName('');
    }

    setShowNameDialog(true);
  };

  const saveFlow = async (flowId: string, flowName?: string) => {
    setIsSaving(true);
    try {
      console.log('Saving flow:', { flowId, flowName, nodesCount: nodes.length, edgesCount: edges.length });

      // Prepare flow data
      const flowData = {
        name: flowName || 'Untitled Flow',
        nodes: nodes.map(node => ({
          id: node.id,
          type: node.type,
          position: node.position,
          data: node.data
        })),
        edges: edges.map(edge => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          type: edge.type,
          animated: edge.animated
        })),
        configurations: nodeConfigs,
        status: 'ACTIVE' as const
      };

      console.log('Flow data prepared:', flowData);

      if (flowId.startsWith('new')) {
        // Create new flow
        console.log('Creating new flow...');
        const newFlow = await api.workspace.createFlow(workspace.id, flowData.name);
        console.log('New flow created:', newFlow);

        await api.workspace.updateFlow(newFlow.id, flowData);
        console.log('Flow updated with data');

        // Update current flow name and status
        setCurrentFlowName(flowData.name);
        setFlowStatus('ACTIVE');

        // Update URL without causing component remount (replace mode)
        navigate(`/flows/${newFlow.id}`, { replace: true });
        toast.success(`Flow "${flowData.name}" published successfully!`);
      } else {
        // Update existing flow
        console.log('Updating existing flow:', flowId);
        await api.workspace.updateFlow(flowId, flowData);
        console.log('Flow updated successfully');

        // Update current flow name and status
        setCurrentFlowName(flowData.name);
        setFlowStatus('ACTIVE');

        toast.success(`Flow "${flowData.name}" published successfully!`);
      }
    } catch (error: any) {
      console.error('Error saving flow:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        error: error
      });
      toast.error(error.message || "Failed to save flow");
    } finally {
      setIsSaving(false);
      setShowNameDialog(false);
      setFlowName('');
    }
  };

  const handleSaveWithName = () => {
    if (!flowName.trim()) {
      toast.error('Please enter a flow name');
      return;
    }
    saveFlow(id || 'new', flowName);
  };

  const handleNameDoubleClick = () => {
    setEditedName(currentFlowName);
    setIsEditingName(true);
  };

  const handleNameSave = async () => {
    if (!editedName.trim()) {
      toast.error('Flow name cannot be empty');
      setEditedName(currentFlowName);
      setIsEditingName(false);
      return;
    }

    if (editedName === currentFlowName) {
      setIsEditingName(false);
      return;
    }

    try {
      if (id && !id.startsWith('new')) {
        await api.workspace.updateFlow(id, { name: editedName });
        setCurrentFlowName(editedName);
        toast.success('Flow name updated');
      }
    } catch (error) {
      console.error('Error updating flow name:', error);
      toast.error('Failed to update flow name');
      setEditedName(currentFlowName);
    } finally {
      setIsEditingName(false);
    }
  };

  const handleNameKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNameSave();
    } else if (e.key === 'Escape') {
      setEditedName(currentFlowName);
      setIsEditingName(false);
    }
  };

  const addNode = (nodeType: string, label: string, actionType?: string, position?: { x: number; y: number }) => {
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
      position: position || {
        x: 100 + nodes.length * 250,
        y: 200
      },
    };

    setNodes((nds) => nds.concat(newNode));
    toast.info(`Added ${label} - Double-click or click gear to configure`);
    setShowMobileNodeGrid(false);
  };

  // Add Comment Reply Template (3 pre-connected nodes)
  const addCommentReplyTemplate = (position?: { x: number; y: number }) => {
    const baseX = position?.x || 450;
    const baseY = position?.y || 280;

    // Generate unique IDs for the nodes
    const triggerId = `trigger-${Date.now()}`;
    const replyId = `action-${Date.now() + 1}`;
    const messageId = `action-${Date.now() + 2}`;

    // Create the 3 nodes
    const triggerNode = {
      id: triggerId,
      type: 'triggerNode',
      data: {
        label: 'New Comment',
        nodeType: 'triggerNode',
        onConfigure: () => handleConfigureNode({ id: triggerId, data: { label: 'New Comment', nodeType: 'triggerNode' } } as any),
        onDelete: () => handleDeleteNode(triggerId)
      },
      position: { x: baseX, y: baseY },
    };

    const replyNode = {
      id: replyId,
      type: 'actionNode',
      data: {
        label: 'Comment Reply',
        nodeType: 'actionNode',
        actionType: 'reply',
        onConfigure: () => handleConfigureNode({ id: replyId, data: { label: 'Comment Reply', nodeType: 'actionNode', actionType: 'reply' } } as any),
        onDelete: () => handleDeleteNode(replyId)
      },
      position: { x: baseX + 250, y: baseY - 80 },
    };

    const messageNode = {
      id: messageId,
      type: 'actionNode',
      data: {
        label: 'Send Message',
        nodeType: 'actionNode',
        actionType: 'message',
        onConfigure: () => handleConfigureNode({ id: messageId, data: { label: 'Send Message', nodeType: 'actionNode', actionType: 'message' } } as any),
        onDelete: () => handleDeleteNode(messageId)
      },
      position: { x: baseX + 250, y: baseY + 80 },
    };

    // Create edges connecting trigger to both action nodes
    const newEdges = [
      {
        id: `edge-${triggerId}-${replyId}`,
        source: triggerId,
        target: replyId,
        type: 'custom',
        animated: true,
        style: { stroke: '#64748b', strokeWidth: 2 }
      },
      {
        id: `edge-${triggerId}-${messageId}`,
        source: triggerId,
        target: messageId,
        type: 'custom',
        animated: true,
        style: { stroke: '#64748b', strokeWidth: 2 }
      }
    ];

    // Add all nodes and edges
    setNodes((nds) => nds.concat([triggerNode, replyNode, messageNode]));
    setEdges((eds) => eds.concat(newEdges));

    toast.success('Comment Reply template added! Configure each node by double-clicking.');
    setShowMobileNodeGrid(false);
  };

  // Drag and drop handlers
  const onDragStart = (event: DragEvent<HTMLDivElement>, nodeType: string, label: string, actionType?: string) => {
    event.dataTransfer.setData('application/reactflow-type', nodeType);
    event.dataTransfer.setData('application/reactflow-label', label);
    if (actionType) {
      event.dataTransfer.setData('application/reactflow-action', actionType);
    }
    event.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();

      // Check if this is a template drop
      const template = event.dataTransfer.getData('application/reactflow-template');
      if (template) {
        const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
        if (!reactFlowBounds) return;

        const position = reactFlowInstance.screenToFlowPosition({
          x: event.clientX - 90,
          y: event.clientY - 30,
        });

        if (template === 'commentReply') {
          addCommentReplyTemplate(position);
        }
        return;
      }

      // Regular node drop
      const nodeType = event.dataTransfer.getData('application/reactflow-type');
      const label = event.dataTransfer.getData('application/reactflow-label');
      const actionType = event.dataTransfer.getData('application/reactflow-action');

      if (!nodeType || !label) return;

      // Get the bounds of the ReactFlow wrapper
      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
      if (!reactFlowBounds) return;

      // Use screenToFlowPosition for accurate coordinate conversion (accounts for zoom/pan)
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX - 90, // Offset for node width/2
        y: event.clientY - 30,  // Offset for node height/2
      });

      addNode(nodeType, label, actionType || undefined, position);
    },
    [addNode, addCommentReplyTemplate, reactFlowInstance]
  );

  const renderConfigForm = () => {
    if (!selectedNode) return null;

    const nodeLabel = selectedNode.data.label as string;
    const nodeType = selectedNode.data.nodeType as string;
    const actionType = selectedNode.data.actionType as string;

    console.log('[FlowBuilder.renderConfigForm] Rendering form for:', nodeLabel);
    console.log('[FlowBuilder.renderConfigForm] actionType:', actionType);
    console.log('[FlowBuilder.renderConfigForm] currentConfig:', currentConfig);

    // Trigger Node
    if (nodeLabel.includes('Comment') && nodeType === 'triggerNode') {
      return (
        <TriggerNodeForm
          workspaceId={workspace.id}
          flowPageId={flowPageId}
          onPageChange={(pageId) => {
            console.log('[FlowBuilder] Page changed from form:', pageId);
            setFlowPageId(pageId);
          }}
          initialConfig={currentConfig}
          onChange={setCurrentConfig}
        />
      );
    }

    // Comment Reply Node
    if (actionType === 'reply' || nodeLabel.includes('Reply')) {
      return (
        <CommentReplyNodeForm
          userId={workspace.ownerId}
          initialConfig={currentConfig}
          onChange={setCurrentConfig}
        />
      );
    }

    // Send Message Node
    if (actionType === 'message' || nodeLabel.includes('Message')) {
      return (
        <SendMessageNodeForm
          workspaceId={workspace.id}
          initialConfig={currentConfig}
          onChange={setCurrentConfig}
        />
      );
    }

    // Text/Delay Node
    const label = selectedNode.data?.label || '';
    if (nodeType === 'textNode' || label.toLowerCase().includes('text') || label.toLowerCase().includes('delay')) {
      return (
        <TextNodeForm
          userId={workspace.ownerId}
          initialConfig={currentConfig}
          onChange={setCurrentConfig}
        />
      );
    }

    // Button Node
    if (nodeType === 'buttonNode' || label.toLowerCase().includes('text with buttons')) {
      return (
        <ButtonNodeForm
          userId={workspace.ownerId}
          initialConfig={currentConfig}
          onChange={setCurrentConfig}
        />
      );
    }

    // Buttons Only Node
    if (nodeType === 'buttonsOnlyNode' || (label.toLowerCase().includes('button') && !label.toLowerCase().includes('text'))) {
      return (
        <ButtonsOnlyNodeForm
          userId={workspace.ownerId}
          initialConfig={currentConfig}
          onChange={setCurrentConfig}
        />
      );
    }

    // Start Node
    if (nodeType === 'startNode' || label.toLowerCase().includes('start')) {
      return (
        <StartNodeForm
          workspaceId={workspace.id}
          flowPageId={flowPageId}
          onPageChange={(pageId) => {
            console.log('[FlowBuilder] Page changed from StartNodeForm:', pageId);
            setFlowPageId(pageId);
          }}
          initialConfig={currentConfig}
          onChange={setCurrentConfig}
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
            {isEditingName ? (
              <input
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                onBlur={handleNameSave}
                onKeyDown={handleNameKeyPress}
                className="font-bold text-white bg-white/10 border border-indigo-500/50 rounded-lg px-3 py-1 text-sm md:text-lg outline-none focus:ring-2 focus:ring-indigo-500/50"
                autoFocus
                style={{ minWidth: '150px' }}
              />
            ) : (
              <div className="flex items-center gap-2 md:gap-3">
                <h2
                  className="font-bold text-white text-xs md:text-lg cursor-pointer hover:text-indigo-300 transition-colors truncate max-w-[120px] md:max-w-none"
                  onDoubleClick={handleNameDoubleClick}
                  title="Double-click to edit"
                >
                  {currentFlowName}
                </h2>
                <span className={`px-2 py-0.5 rounded-full text-xs font-normal border flex-shrink-0 ${flowStatus === 'ACTIVE'
                  ? 'bg-green-500/20 text-green-300 border-green-500/30'
                  : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                  }`}>
                  {flowStatus === 'ACTIVE' ? 'Active' : 'Draft'}
                </span>
                {/* Page Selector Dropdown */}
                <div className="relative hidden sm:block" ref={pageDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setPageDropdownOpen(!pageDropdownOpen)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 hover:border-white/20 transition-all"
                  >
                    {loadingPages ? (
                      <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                    ) : selectedPage ? (
                      <>
                        <img
                          src={selectedPage.pageImageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedPage.name)}&background=1877F2&color=fff&size=32`}
                          alt={selectedPage.name}
                          className="w-5 h-5 rounded-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedPage.name)}&background=1877F2&color=fff&size=32`;
                          }}
                        />
                        <span className="text-xs text-slate-300 font-medium truncate max-w-[80px] md:max-w-[120px]">
                          {selectedPage.name}
                        </span>
                      </>
                    ) : (
                      <span className="text-xs text-slate-400">Select Page</span>
                    )}
                    <svg className={`w-3 h-3 text-slate-400 transition-transform ${pageDropdownOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>

                  {/* Dropdown Menu */}
                  {pageDropdownOpen && (
                    <div className="absolute top-full left-0 mt-1 w-64 bg-slate-800 border border-white/10 rounded-xl shadow-2xl z-50 max-h-64 overflow-y-auto">
                      {availablePages.length === 0 ? (
                        <div className="p-4 text-center text-sm text-slate-400">
                          No pages with automation enabled
                        </div>
                      ) : (
                        availablePages.map((page) => (
                          <button
                            key={page.id}
                            type="button"
                            onClick={() => handlePageSelect(page.id)}
                            className={`w-full flex items-center gap-3 p-3 hover:bg-white/5 transition-colors ${flowPageId === page.id ? 'bg-blue-500/20' : ''}`}
                          >
                            <img
                              src={page.pageImageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(page.name)}&background=1877F2&color=fff&size=32`}
                              alt={page.name}
                              className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(page.name)}&background=1877F2&color=fff&size=32`;
                              }}
                            />
                            <div className="flex-1 text-left">
                              <div className="text-white font-medium text-sm">{page.name}</div>
                              <div className="text-xs text-slate-400">{page.pageFollowers?.toLocaleString() || 0} followers</div>
                            </div>
                            {flowPageId === page.id && (
                              <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
            <p className="text-xs text-slate-500 hidden md:block">{currentFlowName}</p>
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
                  <div
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('application/reactflow-template', 'commentReply');
                      e.dataTransfer.effectAllowed = 'move';
                    }}
                    onClick={() => addCommentReplyTemplate()}
                    className="w-full flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-xl hover:border-blue-500/50 hover:bg-blue-500/10 transition-all text-left group cursor-grab active:cursor-grabbing"
                  >
                    <div className="w-8 h-8 bg-blue-500/20 text-blue-400 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                      <MessageCircle className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-semibold text-slate-300 group-hover:text-white transition-colors">New Comment</span>
                  </div>
                  <div
                    draggable
                    onDragStart={(e) => onDragStart(e, 'startNode', 'Start')}
                    onClick={() => addNode('startNode', 'Start')}
                    className="w-full flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-xl hover:border-emerald-500/50 hover:bg-emerald-500/10 transition-all text-left group cursor-grab active:cursor-grabbing"
                  >
                    <div className="w-8 h-8 bg-emerald-500/20 text-emerald-400 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Play className="w-4 h-4" fill="currentColor" />
                    </div>
                    <span className="text-sm font-semibold text-slate-300 group-hover:text-white transition-colors">Start</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Actions</h3>
                <div className="space-y-2">
                  <div
                    draggable
                    onDragStart={(e) => onDragStart(e, 'textNode', 'Text')}
                    onClick={() => addNode('textNode', 'Text')}
                    className="w-full flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-xl hover:border-amber-500/50 hover:bg-amber-500/10 transition-all text-left group cursor-grab active:cursor-grabbing"
                  >
                    <div className="w-8 h-8 bg-amber-500/20 text-amber-400 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-semibold text-slate-300 group-hover:text-white transition-colors">Text</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Logic & AI</h3>
                <div className="space-y-2">
                  <div
                    draggable
                    onDragStart={(e) => onDragStart(e, 'aiNode', 'AI Agent')}
                    onClick={() => addNode('aiNode', 'AI Agent')}
                    className="w-full flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-xl hover:border-indigo-500/50 hover:bg-indigo-500/10 transition-all text-left group cursor-grab active:cursor-grabbing"
                  >
                    <div className="w-8 h-8 bg-indigo-500/20 text-indigo-400 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-semibold text-slate-300 group-hover:text-white transition-colors">AI Agent</span>
                  </div>
                  <div
                    draggable
                    onDragStart={(e) => onDragStart(e, 'conditionNode', 'Condition')}
                    onClick={() => addNode('conditionNode', 'Condition')}
                    className="w-full flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-xl hover:border-amber-500/50 hover:bg-amber-500/10 transition-all text-left group cursor-grab active:cursor-grabbing"
                  >
                    <div className="w-8 h-8 bg-amber-500/20 text-amber-400 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                      <GitBranch className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-semibold text-slate-300 group-hover:text-white transition-colors">Condition</span>
                  </div>
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
        <div
          ref={reactFlowWrapper}
          className="flex-1 h-full bg-slate-950"
          onDragOver={onDragOver}
          onDrop={onDrop}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeDoubleClick={onNodeDoubleClick}
            onEdgeClick={onEdgeClick}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView={nodes.length === 0}
            className="bg-slate-950"
            defaultEdgeOptions={{
              type: 'custom',
              animated: true,
              style: { stroke: '#64748b', strokeWidth: 2 }
            }}
            minZoom={0.1}
            maxZoom={1.5}
            zoomOnScroll={true}
            zoomOnPinch={true}
            panOnScroll={false}
            panOnDrag={true}
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

          {/* Delete button now appears on the edge itself when selected */}
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
                  <p className="text-sm font-semibold text-white">Messenger Reply</p>
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

      {/* Flow Name Dialog */}
      {showNameDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
            onClick={() => setShowNameDialog(false)}
          />

          {/* Dialog */}
          <div className="relative glass-panel border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-fade-in">
            <h2 className="text-xl font-bold text-white text-glow mb-2">Save Flow</h2>
            <p className="text-sm text-slate-400 mb-6">Enter a name for your automation flow</p>

            <input
              type="text"
              value={flowName}
              onChange={(e) => setFlowName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSaveWithName()}
              placeholder="e.g., Welcome Message Flow"
              className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all placeholder-slate-500 mb-6"
              autoFocus
            />

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowNameDialog(false);
                  setFlowName('');
                }}
                className="px-5 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/5 rounded-xl border border-white/10 hover:border-white/20 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveWithName}
                disabled={!flowName.trim() || isSaving}
                className="px-5 py-2.5 text-sm font-bold bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white rounded-xl shadow-lg shadow-indigo-500/20 transition-all active:scale-95 border border-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Saving...' : 'Save Flow'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Wrap with ReactFlowProvider for useReactFlow hook
const FlowBuilderWithProvider: React.FC<FlowBuilderProps> = (props) => {
  return (
    <ReactFlowProvider>
      <FlowBuilder {...props} />
    </ReactFlowProvider>
  );
};

export default FlowBuilderWithProvider;