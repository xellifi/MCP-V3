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
import { Save, ArrowLeft, PlayCircle, Menu, X, Grid3x3, MessageCircle, Play, Bot, Send, Clock, MousePointer2, SquareMousePointer, Sparkles, GitBranch, MessageSquare, RectangleEllipsis, Plus, Minus, Maximize, Wrench, RotateCcw, Image, Video } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import NodeConfigModal from '../components/NodeConfigModal';
import TriggerNodeForm from '../components/TriggerNodeForm';
import CommentReplyNodeForm from '../components/CommentReplyNodeForm';
import SendMessageNodeForm from '../components/SendMessageNodeForm';
import TextNodeForm from '../components/TextNodeForm';
import ImageNodeForm from '../components/ImageNodeForm';
import VideoNodeForm from '../components/VideoNodeForm';
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
import CustomImageNode from '../components/nodes/CustomImageNode';
import CustomVideoNode from '../components/nodes/CustomVideoNode';
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
  imageNode: CustomImageNode,
  videoNode: CustomVideoNode,
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
  const [pageSaved, setPageSaved] = useState(false);

  // Node configuration state
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [nodeConfigs, setNodeConfigs] = useState<NodeConfig>({});
  const [currentConfig, setCurrentConfig] = useState<any>({});
  const initialConfigRef = useRef<any>({});

  // Stable callback for form onChange to prevent re-render loops
  const handleConfigChange = useCallback((config: any) => {
    setCurrentConfig(config);
  }, []);

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
  const handlePageSelect = async (pageId: string) => {
    setFlowPageId(pageId);
    setPageDropdownOpen(false);
    setPageSaved(false);

    // Update all trigger and start node configs with this page
    const updatedConfigs = { ...nodeConfigs };
    nodes.forEach(node => {
      const nodeType = node.data?.nodeType || node.type;
      if (nodeType === 'triggerNode' || nodeType === 'startNode') {
        updatedConfigs[node.id] = {
          ...updatedConfigs[node.id],
          pageId: pageId
        };
      }
    });
    setNodeConfigs(updatedConfigs);
    console.log('[FlowBuilder] Page selected:', pageId, '- updated node configs');

    // Auto-save to database if flow already exists
    if (id && !id.startsWith('new')) {
      try {
        // Save flow with updated configurations
        await api.workspace.updateFlow(id, {
          configurations: updatedConfigs
        });
        setPageSaved(true);
        console.log('[FlowBuilder] ✓ Page saved to database');
        // Hide check after 3 seconds
        setTimeout(() => setPageSaved(false), 3000);
      } catch (error) {
        console.error('[FlowBuilder] ✗ Failed to save page:', error);
      }
    } else {
      // For new flows, just show the check (will be saved when flow is published)
      setPageSaved(true);
      setTimeout(() => setPageSaved(false), 3000);
    }
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

        // Auto-fit view on mobile after nodes load
        const isMobile = window.innerWidth < 768;
        if (isMobile && reactFlowInstance && flow.nodes && flow.nodes.length > 0) {
          setTimeout(() => {
            reactFlowInstance.fitView({
              padding: 0.3,
              duration: 300,
              maxZoom: 1
            });
            console.log('[FlowBuilder.loadFlowData] ✓ Auto-fitted view for mobile');
          }, 100);
        }
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

  // Double-click node configuration removed - use gear icon to configure nodes
  // const onNodeDoubleClick: NodeMouseHandler = useCallback((event, node) => {
  //   setSelectedNode(node);
  //   setCurrentConfig(nodeConfigs[node.id] || {});
  //   setShowConfigModal(true);
  // }, [nodeConfigs]);

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

    // For textNode, also extract config directly from node data
    let textNodeConfig = {};
    if (nodeType === 'textNode' || nodeLabel?.toLowerCase().includes('text')) {
      textNodeConfig = {
        textContent: nodeData.textContent || '',
        delaySeconds: nodeData.delaySeconds || 0,
        buttons: nodeData.buttons || []
      };
      console.log('[FlowBuilder.handleConfigureNode] TextNode config from data:', textNodeConfig);
    }

    // For startNode, extract keywords and matchType from node data
    let startNodeConfig = {};
    if (nodeType === 'startNode' || nodeLabel?.toLowerCase().includes('start')) {
      startNodeConfig = {
        keywords: nodeData.keywords || savedConfig.keywords || [],
        matchType: nodeData.matchType || savedConfig.matchType || 'exact',
        pageId: nodeData.pageId || savedConfig.pageId || flowPageId || ''
      };
      console.log('[FlowBuilder.handleConfigureNode] StartNode config from data:', startNodeConfig);
    }

    // Merge saved config with extracted config - saved config takes priority
    // For textNode, merge textNodeConfig as well
    // For startNode, merge startNodeConfig as well
    let mergedConfig = { ...extractedConfig, ...textNodeConfig, ...startNodeConfig, ...savedConfig };

    // For trigger and start nodes, ALWAYS use flowPageId from header as source of truth
    const needsPageSync = configType === 'triggerNode' || nodeType === 'startNode' || nodeLabel?.toLowerCase().includes('start');
    if (needsPageSync && flowPageId) {
      mergedConfig = { ...mergedConfig, pageId: flowPageId };
    }

    console.log('[FlowBuilder.handleConfigureNode] Config type:', configType);
    console.log('[FlowBuilder.handleConfigureNode] Extracted config:', extractedConfig);
    console.log('[FlowBuilder.handleConfigureNode] Saved config (nodeConfigs):', savedConfig);
    console.log('[FlowBuilder.handleConfigureNode] Merged config:', mergedConfig);
    console.log('[FlowBuilder.handleConfigureNode] flowPageId:', flowPageId);

    setSelectedNode(node);
    setCurrentConfig(mergedConfig);
    initialConfigRef.current = mergedConfig; // Capture initial config for modal
    setShowConfigModal(true);
  }, [nodeConfigs, flowPageId]);

  const handleSaveConfig = async () => {
    if (selectedNode) {
      // Check if this is a trigger or start node
      const isTriggerOrStartNode = selectedNode.type === 'triggerNode' ||
        selectedNode.type === 'startNode' ||
        selectedNode.data?.nodeType === 'triggerNode' ||
        selectedNode.data?.nodeType === 'startNode' ||
        selectedNode.data?.label?.includes('Comment') ||
        selectedNode.data?.label?.toLowerCase().includes('start');

      // For trigger/start nodes, use flowPageId from header
      const configToSave = isTriggerOrStartNode
        ? { ...currentConfig, pageId: flowPageId }
        : currentConfig;

      // If user changed page in node config, update header too (reverse sync)
      if (isTriggerOrStartNode && currentConfig.pageId && currentConfig.pageId !== flowPageId) {
        console.log('[FlowBuilder.handleSaveConfig] Updating header from node config:', currentConfig.pageId);
        setFlowPageId(currentConfig.pageId);
        configToSave.pageId = currentConfig.pageId;
      }

      console.log('[FlowBuilder.handleSaveConfig] Saving config for:', selectedNode.id);
      console.log('[FlowBuilder.handleSaveConfig] Is trigger/start node:', isTriggerOrStartNode);
      console.log('[FlowBuilder.handleSaveConfig] flowPageId:', flowPageId);
      console.log('[FlowBuilder.handleSaveConfig] Config to save:', configToSave);

      setNodeConfigs(prev => ({
        ...prev,
        [selectedNode.id]: configToSave
      }));

      // Update node data with config AND page info for visual display
      setNodes((nds) => nds.map((node) => {
        if (node.id === selectedNode.id) {
          // Get page info for visual display on the node
          const pageId = configToSave.pageId || currentConfig.pageId;
          const selectedPage = availablePages.find(p => p.id === pageId);

          return {
            ...node,
            data: {
              ...node.data,
              ...configToSave,
              aiProvider: currentConfig.useAI ? currentConfig.aiProvider : undefined,
              template: currentConfig.replyTemplate || currentConfig.messageTemplate,
              // Add page info for node visual
              pageImageUrl: selectedPage?.pageImageUrl,
              pageName: selectedPage?.name
            }
          };
        }
        return node;
      }));

      // Auto-save configurations to database so flows list shows correct page
      if (id && !id.startsWith('new')) {
        const updatedConfigs = {
          ...nodeConfigs,
          [selectedNode.id]: configToSave
        };
        try {
          await api.workspace.updateFlow(id, { configurations: updatedConfigs });
          console.log('[FlowBuilder.handleSaveConfig] ✓ Configurations auto-saved to database');
        } catch (error) {
          console.error('[FlowBuilder.handleSaveConfig] ✗ Failed to auto-save:', error);
        }
      }

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
    let nodePosition = position;

    // If no position provided, place in center of screen (for both mobile and desktop)
    if (!nodePosition && reactFlowInstance) {
      // Get the center of the flow viewport
      const flowBounds = reactFlowWrapper.current?.getBoundingClientRect();

      if (flowBounds) {
        // Calculate center based on the wrapper dimensions
        const center = reactFlowInstance.screenToFlowPosition({
          x: flowBounds.left + flowBounds.width / 2,
          y: flowBounds.top + flowBounds.height / 2
        });

        // Offset to center the node (approx width 200px / 2 = 100px)
        nodePosition = { x: center.x - 100, y: center.y - 50 };
      }
    }

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
      position: nodePosition || {
        x: 100 + nodes.length * 250,
        y: 200
      },
    };

    setNodes((nds) => nds.concat(newNode));
    toast.info(`Added ${label} - Click gear icon to configure`);
    setShowMobileNodeGrid(false);

    // Mobile adjustment: Zoom out slightly if added on mobile to show node better
    if (window.innerWidth < 768 && reactFlowInstance) {
      setTimeout(() => {
        const currentZoom = reactFlowInstance.getViewport().zoom;
        if (currentZoom > 0.75) {
          reactFlowInstance.zoomTo(0.75, { duration: 500 });
        }
      }, 100);
    }
  };

  // Add Comment Reply Template (3 pre-connected nodes)
  const addCommentReplyTemplate = (position?: { x: number; y: number }) => {
    let baseX = position?.x;
    let baseY = position?.y;

    // If no position provided, place in center of screen
    if (baseX === undefined && reactFlowInstance) {
      const flowBounds = reactFlowWrapper.current?.getBoundingClientRect();
      if (flowBounds) {
        const center = reactFlowInstance.screenToFlowPosition({
          x: flowBounds.left + flowBounds.width / 2,
          y: flowBounds.top + flowBounds.height / 2
        });
        // Offset for template group - better centering on PC
        // Template total width ~450px, so offset by ~200px to center
        baseX = center.x - 150;
        baseY = center.y - 80;
      }
    }

    // Default positions for PC - more centered in typical workspace
    baseX = baseX || 550;
    baseY = baseY || 200;

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

    toast.success('Comment Reply template added! Click gear icon on each node to configure.');
    setShowMobileNodeGrid(false);

    // Mobile adjustment: Zoom out slightly to show full template
    if (window.innerWidth < 768 && reactFlowInstance) {
      setTimeout(() => {
        const currentZoom = reactFlowInstance.getViewport().zoom;
        if (currentZoom > 0.65) {
          reactFlowInstance.zoomTo(0.65, { duration: 500 });
        }
      }, 100);
    }
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
    console.log('[FlowBuilder.renderConfigForm] workspace:', workspace);

    // Trigger Node
    if (nodeLabel.includes('Comment') && nodeType === 'triggerNode') {
      return (
        <TriggerNodeForm
          workspaceId={workspace?.id || ''}
          flowPageId={flowPageId}
          onPageChange={(pageId) => {
            setFlowPageId(pageId);
          }}
          initialConfig={initialConfigRef.current}
          onChange={handleConfigChange}
        />
      );
    }

    // Comment Reply Node
    if (actionType === 'reply' || nodeLabel.includes('Reply')) {
      return (
        <CommentReplyNodeForm
          userId={workspace?.ownerId || ''}
          initialConfig={initialConfigRef.current}
          onChange={handleConfigChange}
        />
      );
    }

    // Send Message Node
    if (actionType === 'message' || nodeLabel.includes('Message')) {
      return (
        <SendMessageNodeForm
          workspaceId={workspace?.id || ''}
          pageId={flowPageId}
          initialConfig={initialConfigRef.current}
          onChange={handleConfigChange}
        />
      );
    }

    // Text/Delay Node
    const label = selectedNode.data?.label || '';
    if (nodeType === 'textNode' || label.toLowerCase().includes('text') || label.toLowerCase().includes('delay')) {
      return (
        <TextNodeForm
          userId={workspace?.ownerId || ''}
          initialConfig={initialConfigRef.current}
          onChange={handleConfigChange}
        />
      );
    }

    // Button Node
    if (nodeType === 'buttonNode' || label.toLowerCase().includes('text with buttons')) {
      return (
        <ButtonNodeForm
          userId={workspace?.ownerId || ''}
          initialConfig={initialConfigRef.current}
          onChange={handleConfigChange}
        />
      );
    }

    // Buttons Only Node
    if (nodeType === 'buttonsOnlyNode' || (label.toLowerCase().includes('button') && !label.toLowerCase().includes('text'))) {
      return (
        <ButtonsOnlyNodeForm
          userId={workspace?.ownerId || ''}
          initialConfig={initialConfigRef.current}
          onChange={handleConfigChange}
        />
      );
    }

    // Image Node
    if (nodeType === 'imageNode' || label.toLowerCase().includes('image')) {
      return (
        <ImageNodeForm
          workspaceId={workspace?.id || ''}
          initialConfig={initialConfigRef.current}
          onChange={handleConfigChange}
        />
      );
    }

    // Video Node
    if (nodeType === 'videoNode' || label.toLowerCase().includes('video')) {
      return (
        <VideoNodeForm
          workspaceId={workspace?.id || ''}
          initialConfig={initialConfigRef.current}
          onChange={handleConfigChange}
        />
      );
    }

    // Start Node
    if (nodeType === 'startNode' || label.toLowerCase().includes('start')) {
      return (
        <StartNodeForm
          workspaceId={workspace?.id || ''}
          flowPageId={flowPageId}
          onPageChange={(pageId) => {
            setFlowPageId(pageId);
          }}
          initialConfig={initialConfigRef.current}
          onChange={handleConfigChange}
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

  // Mobile tools operations
  const [isToolsOpen, setIsToolsOpen] = useState(true);

  // Reset/Rearrange nodes function - arranges nodes following edge connections horizontally
  const handleResetLayout = useCallback(() => {
    if (nodes.length === 0) {
      toast.info('No nodes to rearrange');
      return;
    }

    // Get viewport center
    const flowBounds = reactFlowWrapper.current?.getBoundingClientRect();
    if (!flowBounds || !reactFlowInstance) return;

    const viewportCenter = reactFlowInstance.screenToFlowPosition({
      x: flowBounds.left + flowBounds.width / 2,
      y: flowBounds.top + flowBounds.height / 2
    });

    // Node spacing configuration
    const horizontalSpacing = 280;
    const verticalSpacing = 120;

    // Build adjacency map from edges (source -> targets)
    const adjacencyMap: Map<string, string[]> = new Map();
    const incomingCount: Map<string, number> = new Map();

    // Initialize all nodes
    nodes.forEach(node => {
      adjacencyMap.set(node.id, []);
      incomingCount.set(node.id, 0);
    });

    // Build graph from edges
    edges.forEach(edge => {
      const targets = adjacencyMap.get(edge.source) || [];
      targets.push(edge.target);
      adjacencyMap.set(edge.source, targets);
      incomingCount.set(edge.target, (incomingCount.get(edge.target) || 0) + 1);
    });

    // Find root nodes (nodes with no incoming edges - typically trigger/start nodes)
    const rootNodes = nodes.filter(node => (incomingCount.get(node.id) || 0) === 0);

    // If no clear roots, use trigger/start nodes as roots
    const effectiveRoots = rootNodes.length > 0 ? rootNodes : nodes.filter(node =>
      node.type === 'triggerNode' ||
      node.type === 'startNode' ||
      node.data?.nodeType === 'triggerNode' ||
      node.data?.nodeType === 'startNode'
    );

    // BFS to determine node levels (column positions)
    const nodeLevel: Map<string, number> = new Map();
    const nodesAtLevel: Map<number, string[]> = new Map();
    const visited = new Set<string>();
    const queue: { nodeId: string; level: number }[] = [];

    // Start BFS from root nodes
    effectiveRoots.forEach(node => {
      queue.push({ nodeId: node.id, level: 0 });
      visited.add(node.id);
    });

    while (queue.length > 0) {
      const { nodeId, level } = queue.shift()!;

      // Set level for this node
      nodeLevel.set(nodeId, level);

      // Add to nodesAtLevel
      if (!nodesAtLevel.has(level)) {
        nodesAtLevel.set(level, []);
      }
      nodesAtLevel.get(level)!.push(nodeId);

      // Process children
      const children = adjacencyMap.get(nodeId) || [];
      children.forEach(childId => {
        if (!visited.has(childId)) {
          visited.add(childId);
          queue.push({ nodeId: childId, level: level + 1 });
        }
      });
    }

    // Add any unvisited nodes (disconnected) to level 0
    nodes.forEach(node => {
      if (!visited.has(node.id)) {
        nodeLevel.set(node.id, 0);
        if (!nodesAtLevel.has(0)) nodesAtLevel.set(0, []);
        nodesAtLevel.get(0)!.push(node.id);
      }
    });

    // Calculate total width and height for centering
    const maxLevel = Math.max(...Array.from(nodeLevel.values()), 0);
    const maxNodesInColumn = Math.max(...Array.from(nodesAtLevel.values()).map(arr => arr.length), 1);

    const totalWidth = maxLevel * horizontalSpacing;
    const totalHeight = (maxNodesInColumn - 1) * verticalSpacing;

    const startX = viewportCenter.x - totalWidth / 2;
    const startY = viewportCenter.y - totalHeight / 2;

    // Position nodes based on their level (column) and index within level (row)
    const nodeIdToNode = new Map(nodes.map(n => [n.id, n]));
    const newNodes = nodes.map(node => {
      const level = nodeLevel.get(node.id) || 0;
      const nodesInThisLevel = nodesAtLevel.get(level) || [node.id];
      const indexInLevel = nodesInThisLevel.indexOf(node.id);
      const levelHeight = (nodesInThisLevel.length - 1) * verticalSpacing;
      const levelStartY = viewportCenter.y - levelHeight / 2;

      return {
        ...node,
        position: {
          x: startX + level * horizontalSpacing,
          y: levelStartY + indexInLevel * verticalSpacing
        }
      };
    });

    setNodes(newNodes);

    // Fit view to show all nodes
    setTimeout(() => {
      reactFlowInstance.fitView({
        padding: 0.3,
        duration: 500,
        maxZoom: 1
      });
    }, 50);

    toast.success('Nodes rearranged');
  }, [nodes, edges, setNodes, reactFlowInstance, toast]);

  return (
    <div className="h-[calc(100vh-60px)] w-full -m-6 relative bg-slate-950 overflow-hidden">

      {/* Header Overlay (Title & Back) - Hidden on Mobile to save space, or kept minimal */}
      <div className="absolute top-6 left-6 z-10 hidden md:block">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/flows')}
            className="p-2 bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/10 rounded-xl text-slate-400 hover:text-white transition-all shadow-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex flex-col">
            {isEditingName ? (
              <input
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                onBlur={handleNameSave}
                onKeyDown={handleNameKeyPress}
                className="font-bold text-white bg-white/10 border border-indigo-500/50 rounded-lg px-2 py-0.5 text-lg outline-none focus:ring-2 focus:ring-indigo-500/50 shadow-lg backdrop-blur-md"
                autoFocus
                style={{ minWidth: '200px' }}
              />
            ) : (
              <div className="flex items-center gap-3 group">
                <h1
                  className="text-2xl font-bold text-white tracking-tight drop-shadow-md cursor-pointer"
                  onDoubleClick={handleNameDoubleClick}
                  title="Double-click to edit"
                >
                  {currentFlowName}
                </h1>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider border backdrop-blur-md shadow-sm ${flowStatus === 'ACTIVE'
                  ? 'bg-green-500/20 text-green-300 border-green-500/30'
                  : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                  }`}>
                  {flowStatus === 'ACTIVE' ? 'ACTIVE' : 'DRAFT'}
                </span>
              </div>
            )}
            <p className="text-slate-400 text-sm drop-shadow-sm font-medium">Flow Automation Builder</p>
          </div>
        </div>
      </div>

      {/* Top Right Controls (Save / Publish) */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 md:translate-x-0 md:left-auto md:right-6 md:top-6 z-10 flex gap-2 md:gap-3 w-max items-center">
        {/* Mobile Tools Toggle */}
        <button
          onClick={() => setIsToolsOpen(!isToolsOpen)}
          className="md:hidden w-8 h-8 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-lg flex items-center justify-center text-white border border-white/10 shadow-lg active:scale-95 transition-all"
        >
          {isToolsOpen ? <X className="w-4 h-4" /> : <Wrench className="w-4 h-4" />}
        </button>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-1.5 md:gap-2 px-3 py-1.5 md:px-5 md:py-2.5 text-xs md:text-sm font-bold bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-lg md:rounded-xl text-white transition-all border border-white/10 shadow-lg disabled:opacity-50"
        >
          <Save className="w-3 h-3 md:w-4 md:h-4" />
          <span className="hidden md:inline">{isSaving ? 'Saving...' : 'Save Draft'}</span>
        </button>

        <button
          onClick={handleResetLayout}
          className="flex items-center gap-1.5 md:gap-2 px-3 py-1.5 md:px-5 md:py-2.5 text-xs md:text-sm font-bold bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-lg md:rounded-xl text-white transition-all border border-white/10 shadow-lg active:scale-95"
          title="Reset layout - Rearrange nodes"
        >
          <RotateCcw className="w-3 h-3 md:w-4 md:h-4" />
          <span className="hidden md:inline">Reset</span>
        </button>

        <button
          className="flex items-center gap-1.5 md:gap-2 px-3 py-1.5 md:px-5 md:py-2.5 text-xs md:text-sm font-bold bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white rounded-lg md:rounded-xl transition-all shadow-lg shadow-indigo-500/20 active:scale-95 border border-white/20"
        >
          <Play className="w-3 h-3 md:w-4 md:h-4 fill-current" />
          <span className="hidden md:inline">Run Test</span>
        </button>
      </div>

      {/* Floating Toolbar (Tools) - List Only */}
      <div className={`absolute left-6 top-20 md:top-28 z-10 flex flex-col gap-3 transition-opacity duration-300 ${!isToolsOpen ? 'opacity-0 pointer-events-none md:opacity-100 md:pointer-events-auto' : 'opacity-100'}`}>

        {/* Tools List */}
        <div className={`glass-panel p-3 rounded-2xl border border-white/10 shadow-2xl space-y-3 backdrop-blur-xl transition-all duration-300 origin-top-left ${isToolsOpen ? 'scale-100' : 'scale-95 pointer-events-none md:scale-100 md:pointer-events-auto'}`}>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider text-center mb-2">Build</p>

          <div
            draggable
            onDragStart={(e) => onDragStart(e, 'startNode', 'Start')}
            onClick={() => addNode('startNode', 'Start')}
            className="w-12 h-12 bg-emerald-500/20 hover:bg-emerald-500/40 border border-emerald-500/30 rounded-xl flex items-center justify-center text-emerald-400 shadow-lg hover:scale-110 transition-transform cursor-grab active:cursor-grabbing group relative"
            title="Start Node"
          >
            <Play className="w-6 h-6 fill-current" />
            <span className="absolute left-14 bg-black/80 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">Start</span>
          </div>

          <div
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData('application/reactflow-template', 'commentReply');
              e.dataTransfer.effectAllowed = 'move';
            }}
            onClick={() => addCommentReplyTemplate()}
            className="w-12 h-12 bg-blue-500/20 hover:bg-blue-500/40 border border-blue-500/30 rounded-xl flex items-center justify-center text-blue-400 shadow-lg hover:scale-110 transition-transform cursor-grab active:cursor-grabbing group relative"
            title="New Comment"
          >
            <MessageCircle className="w-6 h-6" />
            <span className="absolute left-14 bg-black/80 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">New Comment</span>
          </div>

          <div
            draggable
            onDragStart={(e) => onDragStart(e, 'textNode', 'Text')}
            onClick={() => addNode('textNode', 'Text')}
            className="w-12 h-12 bg-amber-500/20 hover:bg-amber-500/40 border border-amber-500/30 rounded-xl flex items-center justify-center text-amber-400 shadow-lg hover:scale-110 transition-transform cursor-grab active:cursor-grabbing group relative"
            title="Send Text"
          >
            <MessageSquare className="w-6 h-6" />
            <span className="absolute left-14 bg-black/80 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">Send Text</span>
          </div>

          <div
            draggable
            onDragStart={(e) => onDragStart(e, 'imageNode', 'Image')}
            onClick={() => addNode('imageNode', 'Image')}
            className="w-12 h-12 bg-rose-500/20 hover:bg-rose-500/40 border border-rose-500/30 rounded-xl flex items-center justify-center text-rose-400 shadow-lg hover:scale-110 transition-transform cursor-grab active:cursor-grabbing group relative"
            title="Send Image"
          >
            <Image className="w-6 h-6" />
            <span className="absolute left-14 bg-black/80 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">Send Image</span>
          </div>

          <div
            draggable
            onDragStart={(e) => onDragStart(e, 'videoNode', 'Video')}
            onClick={() => addNode('videoNode', 'Video')}
            className="w-12 h-12 bg-cyan-500/20 hover:bg-cyan-500/40 border border-cyan-500/30 rounded-xl flex items-center justify-center text-cyan-400 shadow-lg hover:scale-110 transition-transform cursor-grab active:cursor-grabbing group relative"
            title="Send Video"
          >
            <Video className="w-6 h-6" />
            <span className="absolute left-14 bg-black/80 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">Send Video</span>
          </div>

          <div
            draggable
            onDragStart={(e) => onDragStart(e, 'aiNode', 'AI Agent')}
            onClick={() => addNode('aiNode', 'AI Agent')}
            className="w-12 h-12 bg-indigo-500/20 hover:bg-indigo-500/40 border border-indigo-500/30 rounded-xl flex items-center justify-center text-indigo-400 shadow-lg hover:scale-110 transition-transform cursor-grab active:cursor-grabbing group relative"
            title="AI Agent"
          >
            <Sparkles className="w-6 h-6" />
            <span className="absolute left-14 bg-black/80 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">AI Agent</span>
          </div>

          <div
            draggable
            onDragStart={(e) => onDragStart(e, 'conditionNode', 'Condition')}
            onClick={() => addNode('conditionNode', 'Condition')}
            className="w-12 h-12 bg-orange-500/20 hover:bg-orange-500/40 border border-orange-500/30 rounded-xl flex items-center justify-center text-orange-400 shadow-lg hover:scale-110 transition-transform cursor-grab active:cursor-grabbing group relative"
            title="Condition"
          >
            <GitBranch className="w-6 h-6" />
            <span className="absolute left-14 bg-black/80 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">Condition</span>
          </div>
        </div>
      </div>

      <div className="flex-1 h-full bg-slate-950 relative">
        <div
          ref={reactFlowWrapper}
          className="w-full h-full"
          onDragOver={onDragOver}
          onDrop={onDrop}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            // onNodeDoubleClick removed - configure via gear icon
            onEdgeClick={onEdgeClick}
            onPaneClick={() => setIsToolsOpen(false)}
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
            fitViewOptions={{ padding: 0.35 }}
            zoomOnScroll={true}
            zoomOnPinch={true}
            panOnScroll={false}
            panOnDrag={true}
          >
            <Background color="#1e293b" gap={20} />
            <Controls className="hidden md:block !bg-slate-800 !border-white/10 !shadow-xl [&>button]:!fill-slate-400 [&>button:hover]:!fill-white" />
            <MiniMap
              className="hidden md:block !bg-slate-900/80 !backdrop-blur-sm !border-slate-700 !shadow-xl !rounded-lg overflow-hidden"
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
        </div>
      </div>

      {/* Configuration Modal */}
      {selectedNode && (
        <NodeConfigModal
          key={selectedNode.id}
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