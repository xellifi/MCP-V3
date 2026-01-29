import React, { useState, useCallback, useEffect, useRef, DragEvent } from 'react';
import ReactFlow, {
  addEdge,
  Background,
  BackgroundVariant,
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
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Workspace, ConnectedPage, User, UserRole } from '../types';
import { Save, ArrowLeft, PlayCircle, Menu, X, Grid3x3, MessageCircle, Play, Bot, Send, Clock, MousePointer2, SquareMousePointer, Sparkles, GitBranch, MessageSquare, RectangleEllipsis, Plus, Minus, Maximize, Maximize2, Minimize2, Wrench, RotateCcw, Image, Video, FileText, Table, RefreshCw, ShoppingBag, Tag, Receipt, Package, ShoppingCart, Table2, ClipboardList, ArrowUp, ArrowDown, Globe, MoreHorizontal, ChevronDown, FileDown, Loader2 } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import NodeConfigModal from '../components/NodeConfigModal';
import TriggerNodeForm from '../components/TriggerNodeForm';
import CommentReplyNodeForm from '../components/CommentReplyNodeForm';
import SendMessageNodeForm from '../components/SendMessageNodeForm';
import TextNodeForm from '../components/TextNodeForm';
import ImageNodeForm from '../components/ImageNodeForm';
import VideoNodeForm from '../components/VideoNodeForm';
import FormNodeForm from '../components/FormNodeForm';
import GoogleSheetNodeForm from '../components/GoogleSheetNodeForm';
import ButtonNodeForm from '../components/ButtonNodeForm';
import ButtonsOnlyNodeForm from '../components/ButtonsOnlyNodeForm';
import StartNodeForm from '../components/StartNodeForm';
import NewFlowNodeForm from '../components/NewFlowNodeForm';
import ConditionNodeForm from '../components/ConditionNodeForm';
import FollowupNodeForm from '../components/FollowupNodeForm';
import UpsellNodeForm from '../components/UpsellNodeForm';
import DownsellNodeForm from '../components/DownsellNodeForm';
import InvoiceNodeForm from '../components/InvoiceNodeForm';
import ProductNodeForm from '../components/ProductNodeForm';
import CheckoutNodeForm from '../components/CheckoutNodeForm';
import ProductWebviewNodeForm from '../components/ProductWebviewNodeForm';
import AINodeForm from '../components/AINodeForm';
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
import CustomFormNode from '../components/nodes/CustomFormNode';
import CustomGoogleSheetNode from '../components/nodes/CustomGoogleSheetNode';
import CustomFollowupNode from '../components/nodes/CustomFollowupNode';
import CustomUpsellNode from '../components/nodes/CustomUpsellNode';
import CustomDownsellNode from '../components/nodes/CustomDownsellNode';
import CustomInvoiceNode from '../components/nodes/CustomInvoiceNode';
import CustomProductNode from '../components/nodes/CustomProductNode';
import CustomCheckoutNode from '../components/nodes/CustomCheckoutNode';
import CustomProductWebviewNode from '../components/nodes/CustomProductWebviewNode';
import { api } from '../services/api';
import { supabase } from '../lib/supabase';
// Import node configuration registry
import '../src/config'; // This initializes all node configs
import { nodeConfigRegistry } from '../src/utils/nodeConfigRegistry';


interface FlowBuilderProps {
  workspace: Workspace;
  user?: User | null;
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
  formNode: CustomFormNode,
  sheetsNode: CustomGoogleSheetNode,
  followupNode: CustomFollowupNode,
  upsellNode: CustomUpsellNode,
  downsellNode: CustomDownsellNode,
  invoiceNode: CustomInvoiceNode,
  productNode: CustomProductNode,
  checkoutNode: CustomCheckoutNode,
  productWebviewNode: CustomProductWebviewNode,
};

// Define custom edge types
const edgeTypes = {
  custom: CustomEdge,
};

const FlowBuilder: React.FC<FlowBuilderProps> = ({ workspace, user }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const isAdmin = user?.role === UserRole.ADMIN || user?.role === UserRole.OWNER;

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isSaving, setIsSaving] = useState(false);

  // Sidebar state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showMobileNodeGrid, setShowMobileNodeGrid] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Save dialog state
  const [showNameDialog, setShowNameDialog] = useState(false);
  const [flowName, setFlowName] = useState('');

  // Inline name editing state
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [currentFlowName, setCurrentFlowName] = useState('Untitled Flow');
  const [flowStatus, setFlowStatus] = useState<'ACTIVE' | 'DRAFT'>('DRAFT');
  const [pageSaved, setPageSaved] = useState(false);

  // FB Connection required modal state
  const [showFbConnectionModal, setShowFbConnectionModal] = useState(false);

  // Template validation state - for orb animation during save
  const [isValidating, setIsValidating] = useState(false);
  const [validatingNodeIds, setValidatingNodeIds] = useState<Set<string>>(new Set());
  const [validatedNodeIds, setValidatedNodeIds] = useState<Set<string>>(new Set());
  const [validationErrorNodeId, setValidationErrorNodeId] = useState<string | null>(null);

  // Save as Template modal state
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [isGlobalTemplate, setIsGlobalTemplate] = useState(false);

  // Template editing mode state (when admin edits global template directly)
  const [isEditingTemplate, setIsEditingTemplate] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [editingTemplateName, setEditingTemplateName] = useState('');
  const [editingTemplateDescription, setEditingTemplateDescription] = useState('');
  const [editingTemplateIsGlobal, setEditingTemplateIsGlobal] = useState(false);

  // Node configuration state
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [nodeConfigs, setNodeConfigs] = useState<NodeConfig>({});
  const [currentConfig, setCurrentConfig] = useState<any>({});
  const initialConfigRef = useRef<any>({});
  const ecommerceToolsRef = useRef<HTMLDivElement>(null);

  // Ref to always have the latest nodeConfigs (avoids stale closure issues)
  const nodeConfigsRef = useRef<NodeConfig>({});
  // Keep ref in sync with state
  useEffect(() => {
    nodeConfigsRef.current = nodeConfigs;
  }, [nodeConfigs]);

  // Handle click outside for toolbar dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ecommerceToolsRef.current && !ecommerceToolsRef.current.contains(event.target as any)) {
        setShowEcommerceTools(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Stable callback for form onChange - auto-saves to nodeConfigs on every change
  // This ensures data is preserved even if modal is accidentally closed
  const handleConfigChange = useCallback((config: any) => {
    console.log('[FlowBuilder.handleConfigChange] Received config:', {
      headline: config.headline,
      productName: config.productName,
      useWebview: config.useWebview,
      hasImage: !!config.imageUrl
    });
    setCurrentConfig(config);
    // Auto-save to nodeConfigs so config is preserved if modal closes
    if (selectedNode) {
      setNodeConfigs(prev => ({
        ...prev,
        [selectedNode.id]: config
      }));

      // Also update the node's visual data immediately so it shows as configured
      // This is important for nodes like Product Webview that check for config in their display
      setNodes((nds) => nds.map((node) => {
        if (node.id === selectedNode.id) {
          return {
            ...node,
            data: {
              ...node.data,
              ...config,
              // Keep callbacks intact
              onDelete: node.data.onDelete,
              onConfigure: node.data.onConfigure,
              onClone: node.data.onClone
            }
          };
        }
        return node;
      }));
    }
  }, [selectedNode, setNodes]);

  // Selected edge for deletion
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);

  // User API keys
  const [userApiKeys, setUserApiKeys] = useState<any>({});

  // Node analytics data (from database)
  const [nodeAnalytics, setNodeAnalytics] = useState<Record<string, { sent: number; delivered: number; subscribers: number; errors: number }>>({})

  // Update nodes with analytics data when nodeAnalytics changes
  // This runs for both populated AND empty analytics (to clear cached values)
  const isAnalyticsLoaded = useRef(false);
  useEffect(() => {
    // Skip initial render - only run after analytics has been explicitly loaded
    if (!isAnalyticsLoaded.current && Object.keys(nodeAnalytics).length === 0) {
      return;
    }
    isAnalyticsLoaded.current = true;

    console.log('[FlowBuilder] Updating nodes with analytics data:', nodeAnalytics);
    setNodes((nds) => nds.map((node) => ({
      ...node,
      data: {
        ...node.data,
        analytics: nodeAnalytics[node.id] || { sent: 0, delivered: 0, subscribers: 0, errors: 0 }
      }
    })));
  }, [nodeAnalytics, setNodes]);


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
    // Parallelize API calls for faster loading
    const initializeData = async () => {
      const promises: Promise<void>[] = [
        loadUserApiKeys(),
        loadAvailablePages()
      ];

      // Only load flow data if editing existing flow
      if (id && !id.startsWith('new')) {
        promises.push(loadFlowData());
      } else if (id && id.startsWith('new')) {
        const searchParams = new URLSearchParams(location.search);
        if (searchParams.get('template') === 'true') {
          const pendingTemplate = localStorage.getItem('pendingTemplate');
          if (pendingTemplate) {
            try {
              const templateData = JSON.parse(pendingTemplate);
              console.log('[FlowBuilder] Loading template data:', templateData);

              // Check if we're editing an existing template (admin edit mode)
              const isEditMode = searchParams.get('edit') === 'true' && templateData.isEditingTemplate;
              if (isEditMode) {
                console.log('[FlowBuilder] Entering template EDIT mode for:', templateData.templateName);
                setIsEditingTemplate(true);
                setEditingTemplateId(templateData.templateId);
                setEditingTemplateName(templateData.templateName || 'Untitled Template');
                setEditingTemplateDescription(templateData.templateDescription || '');
                setEditingTemplateIsGlobal(templateData.isGlobal || false);
                setCurrentFlowName(templateData.templateName || 'Editing Template');
              }

              const savedConfigs = templateData.configurations || {};
              setNodeConfigs(savedConfigs);

              const restoredNodes = (templateData.nodes || []).map((node: any) => {
                const nodeConfig = savedConfigs[node.id] || {};
                return {
                  ...node,
                  data: {
                    ...node.data,
                    ...nodeConfig,
                    onDelete: () => handleDeleteNode(node.id),
                    onConfigure: () => handleConfigureNode(node),
                    onClone: () => handleCloneNode(node.id)
                  }
                };
              });
              setNodes(restoredNodes);
              setEdges(templateData.edges || []);

              // Clean up
              localStorage.removeItem('pendingTemplate');
              toast.success(isEditMode ? 'Template loaded for editing' : 'Template loaded successfully');
            } catch (e) {
              console.error('Error parsing template data:', e);
              toast.error('Failed to load template');
            }
          }
        }
      }

      // Run all API calls in parallel
      await Promise.all(promises);
    };

    initializeData();

    // Keep sidebar expanded to show node tools by default (even on mobile)
    // Users can manually collapse if needed
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

  // ESC key to exit fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

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
                // IMPORTANT: Clear any saved analytics - we'll load fresh from database
                analytics: { sent: 0, delivered: 0, subscribers: 0, errors: 0 },
                // Add callbacks for node buttons
                onDelete: () => handleDeleteNode(node.id),
                onConfigure: () => handleConfigureNode(node),
                onClone: () => handleCloneNode(node.id)
              }
            };

            console.log(`[FlowBuilder.loadFlowData] Merged node data:`, mergedNode.data);
            return mergedNode;
          });

          setNodes(restoredNodes);
          console.log('[FlowBuilder.loadFlowData] ✓ All nodes restored with configurations');
        }

        // Restore edges with all their properties (especially sourceHandle for condition nodes)
        if (flow.edges && Array.isArray(flow.edges)) {
          const restoredEdges = flow.edges.map((edge: any) => ({
            id: edge.id,
            source: edge.source,
            target: edge.target,
            sourceHandle: edge.sourceHandle || null,  // Preserve condition node handle (true/false)
            targetHandle: edge.targetHandle || null,
            type: edge.type || 'custom',
            animated: edge.animated !== false,
            style: edge.style || { stroke: '#64748b', strokeWidth: 2 }
          }));

          // Debug log for condition node edges
          const conditionEdges = restoredEdges.filter((e: any) => e.sourceHandle);
          if (conditionEdges.length > 0) {
            console.log('[FlowBuilder.loadFlowData] Condition node edges with sourceHandle:',
              conditionEdges.map((e: any) => ({ source: e.source, target: e.target, sourceHandle: e.sourceHandle })));
          }

          setEdges(restoredEdges);
          console.log('[FlowBuilder.loadFlowData] ✓ Restored', restoredEdges.length, 'edges');
        }

        console.log('[FlowBuilder.loadFlowData] ========== FLOW LOAD COMPLETE ==========');

        // Extract page info from trigger node config
        extractPageInfo(savedConfigs);

        // Load node analytics from database
        await loadNodeAnalytics(id);

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

  // Load node analytics for the current flow (directly from Supabase)
  const loadNodeAnalytics = async (flowId: string) => {
    try {
      console.log('[FlowBuilder] Loading node analytics for flow:', flowId);

      // Fetch directly from Supabase instead of API route (works in dev and prod)
      const { data, error } = await supabase
        .from('node_analytics')
        .select('node_id, sent_count, delivered_count, subscriber_count, error_count')
        .eq('flow_id', flowId);

      if (error) {
        // Table might not exist yet - this is okay
        console.warn('[FlowBuilder] ⚠️ Analytics table error (may need migration):', error.message);
        return {};
      }

      if (data && data.length > 0) {
        // Transform to nodeId -> analytics map
        const analyticsMap: Record<string, any> = {};
        data.forEach((item: any) => {
          analyticsMap[item.node_id] = {
            sent: item.sent_count || 0,
            delivered: item.delivered_count || 0,
            subscribers: item.subscriber_count || 0,
            errors: item.error_count || 0
          };
        });
        console.log('[FlowBuilder] ✓ Loaded analytics:', analyticsMap);
        setNodeAnalytics(analyticsMap);
        return analyticsMap;
      } else {
        console.log('[FlowBuilder] ℹ️ No analytics data yet for this flow - clearing any cached values');
        // IMPORTANT: Set empty analytics to clear any cached values
        setNodeAnalytics({});
      }
    } catch (error) {
      console.error('[FlowBuilder] ✗ Error loading analytics:', error);
      // Also clear on error to avoid showing stale data
      setNodeAnalytics({});
    }
    return {};
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

  const handleCloneNode = useCallback((nodeId: string) => {
    setNodes((currentNodes) => {
      const nodeToClone = currentNodes.find((n) => n.id === nodeId);
      if (!nodeToClone) return currentNodes;

      const newNodeId = `${Date.now()}`;

      // Clone the node config if exists
      if (nodeConfigs[nodeId]) {
        setNodeConfigs((prev) => ({
          ...prev,
          [newNodeId]: { ...nodeConfigs[nodeId] },
        }));
      }

      const newNode: Node = {
        ...nodeToClone,
        id: newNodeId,
        position: {
          x: nodeToClone.position.x + 250, // Place right beside the original node
          y: nodeToClone.position.y,
        },
        data: {
          ...nodeToClone.data,
        },
        selected: false,
      };

      toast.success('Node cloned');

      // Defer callback setup so handlers work on the cloned node
      setTimeout(() => {
        setNodes((nds) => nds.map((n) => {
          if (n.id === newNodeId) {
            return {
              ...n,
              data: {
                ...n.data,
                onConfigure: () => handleConfigureNode(n),
                onDelete: () => handleDeleteNode(newNodeId),
                onClone: () => handleCloneNode(newNodeId),
              }
            };
          }
          return n;
        }));
      }, 10);

      return [...currentNodes, newNode];
    });
  }, [nodeConfigs, setNodes, toast, handleDeleteNode]);

  const handleConfigureNode = useCallback((node: Node) => {
    // Get the FRESH node data from current nodes state (callback arg might be stale)
    const currentNodes = nodes;
    const freshNode = currentNodes.find(n => n.id === node.id) || node;

    console.log('[FlowBuilder.handleConfigureNode] Opening config modal for node:', freshNode.id);
    console.log('[FlowBuilder.handleConfigureNode] Node data:', freshNode.data);

    const nodeData = freshNode.data;
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

    // Get saved config from nodeConfigsRef (ref is always current, avoids stale closure)
    const savedConfig = nodeConfigsRef.current[freshNode.id] || {};

    // For textNode, also extract config directly from node data
    // IMPORTANT: savedConfig takes priority as it contains what the user actually saved
    let textNodeConfig = {};
    if (nodeType === 'textNode' || nodeLabel?.toLowerCase().includes('text')) {
      textNodeConfig = {
        textContent: savedConfig.textContent ?? nodeData.textContent ?? '',
        delaySeconds: savedConfig.delaySeconds ?? nodeData.delaySeconds ?? 0,
        buttons: savedConfig.buttons ?? nodeData.buttons ?? []
      };
      console.log('[FlowBuilder.handleConfigureNode] TextNode savedConfig:', savedConfig);
      console.log('[FlowBuilder.handleConfigureNode] TextNode merged config:', textNodeConfig);
    }

    // For startNode, extract keywords and matchType from node data
    // IMPORTANT: savedConfig takes priority as it contains what the user actually saved
    let startNodeConfig = {};
    if (nodeType === 'startNode' || nodeLabel?.toLowerCase().includes('start')) {
      startNodeConfig = {
        keywords: savedConfig.keywords ?? nodeData.keywords ?? [],
        matchType: savedConfig.matchType ?? nodeData.matchType ?? 'exact',
        pageId: savedConfig.pageId ?? nodeData.pageId ?? flowPageId ?? ''
      };
      console.log('[FlowBuilder.handleConfigureNode] StartNode savedConfig:', savedConfig);
      console.log('[FlowBuilder.handleConfigureNode] StartNode merged config:', startNodeConfig);
    }

    // For imageNode, extract config from node data
    // IMPORTANT: savedConfig takes priority as it contains what the user actually saved
    let imageNodeConfig = {};
    if (nodeType === 'imageNode' || nodeLabel?.toLowerCase().includes('image')) {
      imageNodeConfig = {
        imageUrl: savedConfig.imageUrl ?? nodeData.imageUrl ?? '',
        imageSource: savedConfig.imageSource ?? nodeData.imageSource ?? 'url',
        caption: savedConfig.caption ?? nodeData.caption ?? '',
        delaySeconds: savedConfig.delaySeconds ?? nodeData.delaySeconds ?? 0
      };
      console.log('[FlowBuilder.handleConfigureNode] ImageNode savedConfig:', savedConfig);
      console.log('[FlowBuilder.handleConfigureNode] ImageNode merged config:', imageNodeConfig);
    }

    // For videoNode, extract config from node data
    // IMPORTANT: savedConfig takes priority as it contains what the user actually saved
    let videoNodeConfig = {};
    if (nodeType === 'videoNode' || nodeLabel?.toLowerCase().includes('video')) {
      videoNodeConfig = {
        videoUrl: savedConfig.videoUrl ?? nodeData.videoUrl ?? '',
        caption: savedConfig.caption ?? nodeData.caption ?? '',
        delaySeconds: savedConfig.delaySeconds ?? nodeData.delaySeconds ?? 0
      };
      console.log('[FlowBuilder.handleConfigureNode] VideoNode savedConfig:', savedConfig);
      console.log('[FlowBuilder.handleConfigureNode] VideoNode merged config:', videoNodeConfig);
    }

    // Merge saved config with extracted config - saved config takes priority
    // For textNode, merge textNodeConfig as well
    // For startNode, merge startNodeConfig as well
    let mergedConfig = { ...extractedConfig, ...textNodeConfig, ...startNodeConfig, ...imageNodeConfig, ...videoNodeConfig, ...savedConfig };

    // For trigger and start nodes, ALWAYS use flowPageId from header as source of truth
    const needsPageSync = configType === 'triggerNode' || nodeType === 'startNode' || nodeLabel?.toLowerCase().includes('start');
    if (needsPageSync && flowPageId) {
      mergedConfig = { ...mergedConfig, pageId: flowPageId };
    }

    console.log('[FlowBuilder.handleConfigureNode] Config type:', configType);
    console.log('[FlowBuilder.handleConfigureNode] Extracted config:', extractedConfig);
    console.log('[FlowBuilder.handleConfigureNode] Saved config (nodeConfigs):', savedConfig);
    console.log('[FlowBuilder.handleConfigureNode] Saved config has formId?', savedConfig?.formId);
    console.log('[FlowBuilder.handleConfigureNode] Merged config:', mergedConfig);
    console.log('[FlowBuilder.handleConfigureNode] Merged config has formId?', mergedConfig?.formId);
    console.log('[FlowBuilder.handleConfigureNode] flowPageId:', flowPageId);

    setSelectedNode(freshNode);
    setCurrentConfig(mergedConfig);
    initialConfigRef.current = mergedConfig; // Capture initial config for modal
    setShowConfigModal(true);
  }, [nodeConfigs, flowPageId, nodes]);

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

      // Check if this is a Text Node with 'newFlow' buttons - create connected nodes
      const isTextNode = selectedNode.type === 'textNode' ||
        selectedNode.data?.nodeType === 'textNode' ||
        selectedNode.data?.label?.toLowerCase().includes('text');

      console.log('[FlowBuilder.handleSaveConfig] Is Text Node:', isTextNode);
      console.log('[FlowBuilder.handleSaveConfig] configToSave.buttons:', configToSave.buttons);

      if (isTextNode && configToSave.buttons && Array.isArray(configToSave.buttons)) {
        console.log('[FlowBuilder.handleSaveConfig] All buttons:', configToSave.buttons.map((b: any) => ({ type: b.type, title: b.title, flowName: b.flowName, processed: b.processed })));

        // Filter for unprocessed newFlow buttons only
        const newFlowButtons = configToSave.buttons.filter((btn: any) => btn.type === 'newFlow' && (btn.title || btn.flowName) && !btn.processed);
        console.log('[FlowBuilder.handleSaveConfig] newFlow buttons found:', newFlowButtons.length);

        if (newFlowButtons.length > 0) {
          console.log('[FlowBuilder.handleSaveConfig] Creating nodes for newFlow buttons:', newFlowButtons);

          // Get the current node position
          const currentNode = nodes.find(n => n.id === selectedNode.id);
          const baseX = currentNode?.position?.x || 300;
          const baseY = currentNode?.position?.y || 200;

          const newNodes: Node[] = [];
          const newEdges: Edge[] = [];

          newFlowButtons.forEach((btn: any, index: number) => {
            const timestamp = Date.now() + index;
            const startNodeId = `start-${timestamp}`;
            const textNodeId = `text-${timestamp + 1}`;

            // Calculate offset position (to the right of current node with proper distance gap)
            const offsetX = 250;  // Distance from original node to Start Node
            const offsetY = index * 200;

            // Use flowName if provided, otherwise fall back to title
            const flowLabel = btn.flowName || btn.title || 'New Flow';

            // Create Start Node for the new flow - marked as a sub-flow node
            const startNode: Node = {
              id: startNodeId,
              type: 'startNode',
              data: {
                label: `New Flow: ${flowLabel}`,
                nodeType: 'startNode',
                isNewFlowNode: true, // Mark this as a sub-flow starting point
                flowName: flowLabel, // Store the flow name for later saving
                parentTextNodeId: selectedNode.id, // Reference to parent
                onConfigure: () => handleConfigureNode({ id: startNodeId, data: { label: `New Flow: ${flowLabel}`, nodeType: 'startNode', isNewFlowNode: true, flowName: flowLabel } } as any),
                onDelete: () => handleDeleteNode(startNodeId),
                onClone: () => handleCloneNode(startNodeId)
              },
              position: { x: baseX + offsetX, y: baseY + offsetY }
            };

            // Create Text Node connected to the start node
            const textNode: Node = {
              id: textNodeId,
              type: 'textNode',
              data: {
                label: 'Text',
                nodeType: 'textNode',
                onConfigure: () => handleConfigureNode({ id: textNodeId, data: { label: 'Text', nodeType: 'textNode' } } as any),
                onDelete: () => handleDeleteNode(textNodeId),
                onClone: () => handleCloneNode(textNodeId)
              },
              position: { x: baseX + offsetX + 250, y: baseY + offsetY }  // 250px from Start Node
            };

            // Create edge from ORIGINAL node to the new Start Node
            const edgeFromOriginal: Edge = {
              id: `edge-${selectedNode.id}-${startNodeId}`,
              source: selectedNode.id,
              target: startNodeId,
              type: 'custom',
              animated: true,
              style: { stroke: '#64748b', strokeWidth: 2 }
            };

            // Create edge connecting new start node to new text node
            const edgeToText: Edge = {
              id: `edge-${startNodeId}-${textNodeId}`,
              source: startNodeId,
              target: textNodeId,
              type: 'custom',
              animated: true,
              style: { stroke: '#64748b', strokeWidth: 2 }
            };

            newNodes.push(startNode, textNode);
            newEdges.push(edgeFromOriginal, edgeToText);  // Add both edges for full chain connection
          });

          // Add the new nodes and edges
          if (newNodes.length > 0) {
            setNodes((nds) => nds.concat(newNodes));
            setEdges((eds) => eds.concat(newEdges));
            toast.success(`Created ${newFlowButtons.length} new flow(s) with connected nodes!`);

            // Mark that these newFlow buttons have been processed (don't create nodes again)
            const processedButtons = configToSave.buttons.map((btn: any) => {
              if (btn.type === 'newFlow') {
                return { ...btn, processed: true };
              }
              return btn;
            });
            configToSave.buttons = processedButtons;

            // Update the node's buttons to mark as processed
            setNodes((nds) => nds.map((node) => {
              if (node.id === selectedNode.id) {
                return {
                  ...node,
                  data: {
                    ...node.data,
                    buttons: processedButtons
                  }
                };
              }
              return node;
            }));
          }
        }
      }

      // Check if this is an Image Node with 'newFlow' button action - create connected nodes
      const isImageNode = selectedNode.type === 'imageNode' ||
        selectedNode.data?.nodeType === 'imageNode' ||
        selectedNode.data?.label?.toLowerCase().includes('image');

      console.log('[FlowBuilder.handleSaveConfig] Is Image Node:', isImageNode);
      console.log('[FlowBuilder.handleSaveConfig] configToSave.buttonAction:', configToSave.buttonAction);
      console.log('[FlowBuilder.handleSaveConfig] configToSave.flowName:', configToSave.flowName);

      if (isImageNode && configToSave.showButton && configToSave.buttonAction === 'newFlow' && configToSave.flowName && !configToSave.flowProcessed) {
        console.log('[FlowBuilder.handleSaveConfig] Creating nodes for Image Node newFlow button');

        // Get the current node position
        const currentNode = nodes.find(n => n.id === selectedNode.id);
        const baseX = currentNode?.position?.x || 300;
        const baseY = currentNode?.position?.y || 200;

        const timestamp = Date.now();
        const startNodeId = `start-${timestamp}`;
        const textNodeId = `text-${timestamp + 1}`;

        const flowLabel = configToSave.flowName || 'New Flow';

        // Create Start Node for the new flow - marked as a sub-flow node
        const startNode: Node = {
          id: startNodeId,
          type: 'startNode',
          data: {
            label: `New Flow: ${flowLabel}`,
            nodeType: 'startNode',
            isNewFlowNode: true,
            flowName: flowLabel,
            parentNodeId: selectedNode.id,
            onConfigure: () => handleConfigureNode({ id: startNodeId, data: { label: `New Flow: ${flowLabel}`, nodeType: 'startNode', isNewFlowNode: true, flowName: flowLabel } } as any),
            onDelete: () => handleDeleteNode(startNodeId),
            onClone: () => handleCloneNode(startNodeId)
          },
          position: { x: baseX + 250, y: baseY }  // 250px distance from Image Node
        };

        // Create Text Node connected to the start node
        const textNode: Node = {
          id: textNodeId,
          type: 'textNode',
          data: {
            label: 'Text',
            nodeType: 'textNode',
            onConfigure: () => handleConfigureNode({ id: textNodeId, data: { label: 'Text', nodeType: 'textNode' } } as any),
            onDelete: () => handleDeleteNode(textNodeId),
            onClone: () => handleCloneNode(textNodeId)
          },
          position: { x: baseX + 500, y: baseY }  // 250px from Start Node
        };

        // Create edge from ORIGINAL Image Node to the new Start Node
        const edgeFromOriginal: Edge = {
          id: `edge-${selectedNode.id}-${startNodeId}`,
          source: selectedNode.id,
          target: startNodeId,
          type: 'custom',
          animated: true,
          style: { stroke: '#64748b', strokeWidth: 2 }
        };

        // Create edge connecting new start node to new text node
        const edgeToText: Edge = {
          id: `edge-${startNodeId}-${textNodeId}`,
          source: startNodeId,
          target: textNodeId,
          type: 'custom',
          animated: true,
          style: { stroke: '#64748b', strokeWidth: 2 }
        };

        // Add the new nodes and edges, and mark the original node as processed
        setNodes((nds) => {
          // First add the new nodes
          const updatedNodes = nds.concat([startNode, textNode]);
          // Then mark the original node as processed
          return updatedNodes.map((node) => {
            if (node.id === selectedNode.id) {
              return {
                ...node,
                data: {
                  ...node.data,
                  flowProcessed: true
                }
              };
            }
            return node;
          });
        });
        setEdges((eds) => eds.concat([edgeFromOriginal, edgeToText]));  // Add both edges for full chain
        toast.success(`Created new flow "${flowLabel}" with connected nodes!`);

        // Mark that this newFlow has been processed (don't create nodes again)
        configToSave.flowProcessed = true;
      }

      // Auto-save configurations to database in background (non-blocking for instant UI response)
      if (id && !id.startsWith('new')) {
        const updatedConfigs = {
          ...nodeConfigs,
          [selectedNode.id]: configToSave
        };
        // Fire-and-forget - don't block UI while saving
        api.workspace.updateFlow(id, { configurations: updatedConfigs })
          .then(() => console.log('[FlowBuilder.handleSaveConfig] ✓ Configurations auto-saved to database'))
          .catch((error) => console.error('[FlowBuilder.handleSaveConfig] ✗ Failed to auto-save:', error));
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

    // Check if user has connected their FB profile (has available pages)
    if (availablePages.length === 0) {
      console.log('No FB pages connected, showing connection modal');
      setShowFbConnectionModal(true);
      return;
    }

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
          sourceHandle: edge.sourceHandle, // Preserve handle for condition nodes (true/false)
          targetHandle: edge.targetHandle,
          type: edge.type,
          animated: edge.animated
        })),
        configurations: nodeConfigs,
        status: 'ACTIVE' as const
      };

      console.log('Flow data prepared:', flowData);

      let savedFlowId = flowId;

      if (flowId.startsWith('new')) {
        // Create new flow
        console.log('Creating new flow...');
        const newFlow = await api.workspace.createFlow(workspace.id, flowData.name);
        console.log('New flow created:', newFlow);
        savedFlowId = newFlow.id;

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

      // Save sub-flows (nodes marked with isNewFlowNode)
      const newFlowNodes = nodes.filter(node => node.data?.isNewFlowNode && node.data?.flowName);

      if (newFlowNodes.length > 0) {
        console.log('[FlowBuilder.saveFlow] Found', newFlowNodes.length, 'sub-flows to save');

        for (const startNode of newFlowNodes) {
          const subFlowName = startNode.data.flowName;
          console.log('[FlowBuilder.saveFlow] Saving sub-flow:', subFlowName);

          // Find all nodes connected to this start node (DFS)
          const connectedNodeIds = new Set<string>();
          const queue = [startNode.id];

          while (queue.length > 0) {
            const currentId = queue.shift()!;
            if (connectedNodeIds.has(currentId)) continue;
            connectedNodeIds.add(currentId);

            // Find outgoing edges from this node
            const outgoingEdges = edges.filter(e => e.source === currentId);
            for (const edge of outgoingEdges) {
              // Don't follow edges that lead to other "New Flow" nodes
              const targetNode = nodes.find(n => n.id === edge.target);
              if (targetNode && !targetNode.data?.isNewFlowNode) {
                queue.push(edge.target);
              }
            }
          }

          // Get the sub-flow nodes
          const subFlowNodes = nodes
            .filter(n => connectedNodeIds.has(n.id))
            .map(node => ({
              id: node.id,
              type: node.id === startNode.id ? 'startNode' : node.type, // Convert the New Flow node to startNode
              position: node.position,
              data: {
                ...node.data,
                // KEEP the isNewFlowNode flag so the correct form is shown when reopening
                isNewFlowNode: node.id === startNode.id ? true : node.data?.isNewFlowNode,
                flowName: node.id === startNode.id ? subFlowName : node.data?.flowName,
                // Update the label to remove "New Flow:" prefix
                label: node.id === startNode.id ? subFlowName : node.data.label
              }
            }));

          // Get the sub-flow edges (only edges between sub-flow nodes)
          const subFlowEdges = edges
            .filter(e => connectedNodeIds.has(e.source) && connectedNodeIds.has(e.target))
            .map(edge => ({
              id: edge.id,
              source: edge.source,
              target: edge.target,
              sourceHandle: edge.sourceHandle,  // Preserve for condition nodes
              targetHandle: edge.targetHandle,
              type: edge.type,
              animated: edge.animated
            }));

          // Create sub-flow configurations (copy from parent)
          const subFlowConfigs: Record<string, any> = {};
          for (const nodeId of connectedNodeIds) {
            if (nodeConfigs[nodeId]) {
              subFlowConfigs[nodeId] = {
                ...nodeConfigs[nodeId],
                pageId: flowPageId // Use same page as parent
              };
            } else if (nodeId === startNode.id) {
              // Add page config for the start node
              subFlowConfigs[nodeId] = { pageId: flowPageId };
            }
          }

          // Create or update the sub-flow in database
          try {
            // First check if a flow with this name already exists in the workspace
            const { data: existingFlows } = await supabase
              .from('flows')
              .select('id, name')
              .eq('workspace_id', workspace.id)
              .eq('name', subFlowName)
              .limit(1);

            let flowId: string;

            if (existingFlows && existingFlows.length > 0) {
              // Update existing flow
              flowId = existingFlows[0].id;
              console.log('[FlowBuilder.saveFlow] Updating existing sub-flow:', subFlowName, 'ID:', flowId);
              await api.workspace.updateFlow(flowId, {
                name: subFlowName,
                nodes: subFlowNodes,
                edges: subFlowEdges,
                configurations: subFlowConfigs,
                status: 'ACTIVE' as const
              });
              console.log('[FlowBuilder.saveFlow] ✓ Sub-flow updated:', subFlowName);
            } else {
              // Create new flow
              const createdFlow = await api.workspace.createFlow(workspace.id, subFlowName);
              flowId = createdFlow.id;
              await api.workspace.updateFlow(flowId, {
                name: subFlowName,
                nodes: subFlowNodes,
                edges: subFlowEdges,
                configurations: subFlowConfigs,
                status: 'ACTIVE' as const
              });
              console.log('[FlowBuilder.saveFlow] ✓ Sub-flow created:', subFlowName, 'ID:', flowId);
            }

            // Update the parent flow's newFlow button with the flowId
            // This makes the button work like a startFlow button
            const updatedNodeConfigs = { ...nodeConfigs };
            for (const nodeId in updatedNodeConfigs) {
              const config = updatedNodeConfigs[nodeId];
              if (config.buttons && Array.isArray(config.buttons)) {
                config.buttons = config.buttons.map((btn: any) => {
                  if (btn.type === 'newFlow' && btn.flowName === subFlowName) {
                    return {
                      ...btn,
                      type: 'startFlow', // Convert to startFlow
                      flowId: flowId
                    };
                  }
                  return btn;
                });
              }
            }
            setNodeConfigs(updatedNodeConfigs);

          } catch (subFlowError) {
            console.error('[FlowBuilder.saveFlow] ✗ Error saving sub-flow:', subFlowName, subFlowError);
          }
        }

        toast.success(`${newFlowNodes.length} sub-flow(s) also saved!`);
      }

      // Save forms from formNode nodes (OPTIMIZED: parallel saves)
      const formNodes = nodes.filter(node => node.type === 'formNode');

      if (formNodes.length > 0) {
        console.log('[FlowBuilder.saveFlow] Found', formNodes.length, 'form node(s) to save');

        // Track updated configs
        const updatedConfigs = { ...nodeConfigs };
        let formsCreated = false;

        // Prepare form save operations for parallel execution
        const formSavePromises = formNodes.map(async (formNode) => {
          const formConfig = updatedConfigs[formNode.id];
          if (!formConfig) {
            console.log('[FlowBuilder.saveFlow] ⚠ No config for form node:', formNode.id);
            return null;
          }

          // Find connected Google Sheets node
          // Look for edges from this formNode to a sheetsNode
          const sheetsEdge = edges.find(e => e.source === formNode.id);

          let sheetsConfig = null;
          if (sheetsEdge) {
            const sheetsNode = nodes.find(n => n.id === sheetsEdge.target && n.type === 'sheetsNode');
            if (sheetsNode) {
              sheetsConfig = updatedConfigs[sheetsNode.id];
              console.log('[FlowBuilder.saveFlow] Found connected Sheets node:', sheetsNode.id, sheetsConfig);
            }
          }

          // Merge sheets config into form config
          const formConfigWithSheets = {
            ...formConfig,
            pageId: flowPageId,
            // Add sheets config if connected
            ...(sheetsConfig ? {
              googleSheetId: sheetsConfig.spreadsheetId,
              googleSheetName: sheetsConfig.sheetName,
              googleWebhookUrl: sheetsConfig.webhookUrl,
            } : {})
          };

          try {
            // Check if form already exists (has formId in config)
            if (formConfig.formId) {
              // Update existing form
              await api.workspace.updateForm(formConfig.formId, formConfigWithSheets);
              console.log('[FlowBuilder.saveFlow] ✓ Form updated:', formConfig.formName, 'ID:', formConfig.formId);
              if (sheetsConfig) {
                console.log('[FlowBuilder.saveFlow] ✓ Form includes connected Sheets config');
              }
              return { nodeId: formNode.id, formId: formConfig.formId, isNew: false };
            } else {
              // Create new form
              const newForm = await api.workspace.createForm(workspace.id, {
                ...formConfigWithSheets,
                flowId: savedFlowId,
                nodeId: formNode.id
              });

              console.log('[FlowBuilder.saveFlow] ✓ Form created:', formConfig.formName, 'ID:', newForm.id);
              if (sheetsConfig) {
                console.log('[FlowBuilder.saveFlow] ✓ New form includes connected Sheets config');
              }
              return { nodeId: formNode.id, formId: newForm.id, isNew: true, formConfig };
            }
          } catch (formError) {
            console.error('[FlowBuilder.saveFlow] ✗ Error saving form:', formError);
            return null;
          }
        });

        // Execute all form saves in parallel
        const results = await Promise.all(formSavePromises);

        // Process results and update configs with new form IDs
        for (const result of results) {
          if (result && result.isNew && result.formId) {
            updatedConfigs[result.nodeId] = {
              ...result.formConfig,
              formId: result.formId
            };
            formsCreated = true;
          }
        }

        // If new forms were created, update the flow with new formIds
        if (formsCreated) {
          console.log('[FlowBuilder.saveFlow] Updating flow with new form IDs...');
          setNodeConfigs(updatedConfigs);

          // Update flow in database with new configurations
          await api.workspace.updateFlow(savedFlowId, {
            configurations: updatedConfigs
          });
          console.log('[FlowBuilder.saveFlow] ✓ Flow updated with form IDs');
        }

        toast.success(`${formNodes.length} form(s) saved!`);
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

  // Update nodes with execution status for orb animation
  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => {
        let executionStatus: 'idle' | 'executing' | 'completed' | 'error' | undefined = undefined;

        if (validationErrorNodeId === node.id) {
          executionStatus = 'error';
        } else if (validatingNodeIds.has(node.id)) {
          executionStatus = 'executing';
        } else if (validatedNodeIds.has(node.id)) {
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
  }, [validatingNodeIds, validatedNodeIds, validationErrorNodeId, setNodes]);

  // Update edges with execution state for traveling orb
  useEffect(() => {
    setEdges((eds) =>
      eds.map((edge) => {
        const sourceCompleted = validatedNodeIds.has(edge.source);
        const targetExecuting = validatingNodeIds.has(edge.target);
        const targetCompleted = validatedNodeIds.has(edge.target);

        let executionState: 'idle' | 'executing' | 'completed' = 'idle';

        if (sourceCompleted && targetCompleted) {
          executionState = 'completed';
        } else if (sourceCompleted && targetExecuting) {
          executionState = 'executing';
        }

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
  }, [validatingNodeIds, validatedNodeIds, setEdges]);

  // Helper to check if a node is properly configured
  const isNodeConfigured = (node: Node, currentEdges: Edge[]) => {
    if (!node.data) return true; // Should have data, but if not, assume passed or handled elsewhere

    const type = node.type || '';
    const data = node.data;
    const label = (data.label || '').toLowerCase();

    // Trigger Node (New Comment)
    if (type === 'triggerNode') {
      // Specific check for "New Comment" or comment triggers
      if (label.includes('comment')) {
        // User Requirement: Auto reply must be enabled
        // In CustomTriggerNode, undefined defaults to enabled (true)
        if (data.enableCommentReply === false) return false;

        // Also ensure at least one keyword or generic reply is active? 
        // For now, focusing on the explicit "auto reply enabled" rule.
        return true;
      }
      // Other triggers (Start, etc)
      if (label.includes('start') || label.includes('trigger')) {
        return (data.keywords && data.keywords.length > 0) || true; // Allow manual start
      }
      return true;
    }

    // Action Node (Comment Reply / Send Message)
    if (type === 'actionNode') {
      const isAI = data.useAiReply === true;

      if (isAI) {
        // If AI turned on - ai instructions must have data
        return !!data.aiPrompt && data.aiPrompt.length > 0;
      } else {
        // If AI disabled - template must have data
        if (data.actionType === 'reply') {
          return !!data.replyTemplate && data.replyTemplate.length > 0;
        }
        if (data.actionType === 'message') {
          return !!data.messageTemplate && data.messageTemplate.length > 0;
        }
      }
      return true;
    }

    // Start Node (Basic check)
    if (type === 'startNode') {
      return true;
    }

    // Text Node
    if (type.includes('text')) {
      return !!data.textContent;
    }

    // Image Node
    if (type.includes('image')) {
      // User Requirement: image url must have data
      // (Upload/Gallery both result in imageUrl being set)
      return !!data.imageUrl && data.imageUrl.length > 0;
    }

    // Video Node
    if (type.includes('video')) {
      return !!data.videoUrl;
    }

    // AI Node
    if (type.includes('ai')) {
      return !!data.instructions;
    }

    // Condition Node
    if (type.includes('condition')) {
      // Must have a connected node on the true path
      return currentEdges.some(edge => edge.source === node.id && edge.sourceHandle === 'true');
    }

    // Checkout Node
    if (type.includes('checkout')) {
      // Must have fullname and phone enabled
      return !!(data.customerFields?.name?.enabled && data.customerFields?.phone?.enabled);
    }

    // Upsell Node
    if (type.includes('upsell')) {
      // Must have product name and price
      return !!(data.productName && (data.price || data.productPrice));
    }

    // Downsell Node
    if (type.includes('downsell')) {
      // Must have product name and price
      return !!(data.productName && (data.price || data.productPrice));
    }

    // Product Webview Node
    if (type.includes('productWebview')) {
      // Must have product name and price
      return !!(data.productName && (data.price || data.productPrice));
    }

    // Google Sheet Node
    if (type.includes('googleSheet')) {
      return !!data.webhookUrl;
    }

    // Invoice Node
    if (type.includes('invoice')) {
      return !!data.companyName;
    }

    // Follow-up Node
    if (type.includes('followup')) {
      return data.scheduledFollowups && data.scheduledFollowups.length > 0;
    }

    // Form Node
    if (type.includes('form')) {
      return !!data.productName;
    }

    // Product Node (excluding productWebview if loosely typed)
    if (type.includes('product') && !type.includes('productWebview')) {
      // Must have product name and price (covers both new creation and selected existing)
      return !!(data.productName && data.productPrice);
    }

    // Default to true for unknown nodes
    return true;
  };

  // Handle Publish Flow - validates nodes in parallel waves
  const handlePublishFlow = async () => {
    setIsValidating(true);
    setValidatedNodeIds(new Set());
    setValidationErrorNodeId(null);
    setValidatingNodeIds(new Set()); // Reset validating

    try {
      // Get start nodes
      const startNodes = nodes.filter(n =>
        n.type === 'triggerNode' || n.type === 'startNode' ||
        n.data?.label?.toLowerCase().includes('start') ||
        n.data?.label?.toLowerCase().includes('trigger')
      );

      if (startNodes.length === 0) {
        toast.error('No trigger or start node found. Please add one to begin your flow.');
        setIsValidating(false);
        return;
      }

      // BFS with parallel execution support
      let currentWave = [...startNodes];
      const visited = new Set<string>();

      // Add start nodes to visited immediately to avoid cycles re-queuing them
      // But we process them in the loop

      while (currentWave.length > 0) {
        // Filter out already visited nodes to prevent cycles/redundant checks
        const uniqueWave = currentWave.filter(n => !visited.has(n.id));
        if (uniqueWave.length === 0) break;

        uniqueWave.forEach(n => visited.add(n.id));
        const currentIds = uniqueWave.map(n => n.id);

        for (const node of uniqueWave) {
          if (!isNodeConfigured(node, edges)) {
            setValidationErrorNodeId(node.id);
            setValidatingNodeIds(new Set());
            toast.error(`Node "${node.data?.label || 'Unknown'}" is not configured properly.`);
            setIsValidating(false);
            return;
          }
        }

        // 2. Set Status to Executing (simultaneously)
        // This triggers the Orb animation on the nodes, and if there were previous nodes, 
        // it triggers the edge animation TO these nodes.
        setValidatingNodeIds(new Set(currentIds));

        // 3. Determine delay (max delay of the batch)
        // Trigger/Start nodes = 500ms, others = 2000ms
        const isStartWave = uniqueWave.some(n =>
          n.type === 'triggerNode' || n.type === 'startNode' ||
          (n.data?.label || '').toLowerCase().includes('start')
        );
        const delay = isStartWave ? 500 : 2000;

        await new Promise(resolve => setTimeout(resolve, delay));

        // 4. Mark as Completed
        setValidatedNodeIds(prev => {
          const next = new Set(prev);
          currentIds.forEach(id => next.add(id));
          return next;
        });

        // 5. Prepare Next Wave (Children of current wave)
        const nextWaveNodes: any[] = [];
        for (const node of uniqueWave) {
          const outgoingEdges = edges.filter(e => e.source === node.id);
          for (const edge of outgoingEdges) {
            const targetNode = nodes.find(n => n.id === edge.target);
            if (targetNode && !visited.has(targetNode.id)) {
              // Avoid duplicates in the next wave
              if (!nextWaveNodes.find(n => n.id === targetNode.id)) {
                nextWaveNodes.push(targetNode);
              }
            }
          }
        }

        currentWave = nextWaveNodes;
      }

      // Check for disconnected nodes (optional, but good practice)
      // Note: This BFS only validates reachable nodes. 

      // All nodes validated successfully!
      setValidatingNodeIds(new Set());
      toast.success('✅ All nodes validated successfully!');

      // Wait 3 seconds then show template save modal
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Reset validation visuals but keep the flow validated
      setValidatedNodeIds(new Set());

      // Show template save modal
      setShowTemplateModal(true);

    } catch (error: any) {
      console.error('Error during flow validation:', error);
      toast.error(error.message || 'Validation failed');
      setValidatingNodeIds(new Set());
      setValidationErrorNodeId(null);
    } finally {
      setIsValidating(false);
    }
  };

  // Handle save template after modal submission
  const handleSaveAsTemplate = async () => {
    if (!templateName.trim()) {
      toast.error('Please enter a template name');
      return;
    }

    console.log('[FlowBuilder] Saving template...', {
      isGlobalTemplate,
      isAdmin,
      userId: user?.id,
      workspaceId: workspace.id
    });

    setIsSavingTemplate(true);
    try {
      // Prepare template data (clean nodes - remove callbacks)
      const cleanNodes = nodes.map(n => ({
        id: n.id,
        type: n.type,
        position: n.position,
        data: {
          ...n.data,
          onConfigure: undefined,
          onDelete: undefined,
          onClone: undefined,
          executionStatus: undefined
        }
      }));

      const cleanEdges = edges.map(e => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle,
        targetHandle: e.targetHandle,
        type: e.type,
        animated: e.animated
      }));

      const templateData = {
        name: templateName.trim(),
        description: templateDescription.trim(),
        nodes: cleanNodes,
        edges: cleanEdges,
        configurations: nodeConfigs
      };

      // Save template to database - global or workspace-specific
      if (isGlobalTemplate && isAdmin && user?.id) {
        console.log('[FlowBuilder] Creating GLOBAL template...');
        await api.templates.createGlobalTemplate(workspace.id, user.id, templateData);
        toast.success(`Global template "${templateName}" saved! It's now available to all users.`);
      } else {
        console.log('[FlowBuilder] Creating workspace template...');
        await api.templates.createTemplate(workspace.id, user?.id || '', templateData);
        toast.success(`Template "${templateName}" saved successfully!`);
      }

      console.log('[FlowBuilder] Template saved successfully!');
      setShowTemplateModal(false);
      setTemplateName('');
      setIsGlobalTemplate(false);

    } catch (error: any) {
      console.error('[FlowBuilder] Error saving template:', error);
      toast.error(error.message || 'Failed to save template');
    } finally {
      setIsSavingTemplate(false);
    }
  };

  // Handle updating an existing template (when in edit template mode)
  const handleUpdateTemplate = async () => {
    if (!editingTemplateId) {
      toast.error('No template to update');
      return;
    }

    setIsSaving(true);
    try {
      console.log('[FlowBuilder] Updating template:', editingTemplateId);

      // Prepare template data (clean nodes - remove callbacks)
      const cleanNodes = nodes.map(n => ({
        id: n.id,
        type: n.type,
        position: n.position,
        data: {
          ...n.data,
          onConfigure: undefined,
          onDelete: undefined,
          onClone: undefined,
          executionStatus: undefined
        }
      }));

      const cleanEdges = edges.map(e => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle,
        targetHandle: e.targetHandle,
        type: e.type,
        animated: e.animated
      }));

      // Update template in database
      await api.templates.updateTemplate(editingTemplateId, {
        name: editingTemplateName,
        description: editingTemplateDescription,
        isGlobal: editingTemplateIsGlobal,
        nodes: cleanNodes,
        edges: cleanEdges,
        configurations: nodeConfigs
      });

      toast.success(`Template "${editingTemplateName}" updated successfully!`);

      // Navigate back to templates tab
      navigate('/flows?tab=templates');
    } catch (error: any) {
      console.error('[FlowBuilder] Error updating template:', error);
      toast.error(error.message || 'Failed to update template');
    } finally {
      setIsSaving(false);
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
        onDelete: () => handleDeleteNode(newNode.id),
        onClone: () => handleCloneNode(newNode.id)
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
    const imageId = `image-${Date.now() + 2}`;
    const messageId = `action-${Date.now() + 3}`;

    // Create the 4 nodes
    const triggerNode = {
      id: triggerId,
      type: 'triggerNode',
      data: {
        label: 'New Comment',
        nodeType: 'triggerNode',
        onConfigure: () => handleConfigureNode({ id: triggerId, data: { label: 'New Comment', nodeType: 'triggerNode' } } as any),
        onDelete: () => handleDeleteNode(triggerId),
        onClone: () => handleCloneNode(triggerId)
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
        onDelete: () => handleDeleteNode(replyId),
        onClone: () => handleCloneNode(replyId)
      },
      position: { x: baseX + 250, y: baseY - 80 },
    };

    const imageNode = {
      id: imageId,
      type: 'imageNode',
      data: {
        label: 'Image',
        nodeType: 'imageNode',
        onConfigure: () => handleConfigureNode({ id: imageId, data: { label: 'Image', nodeType: 'imageNode' } } as any),
        onDelete: () => handleDeleteNode(imageId),
        onClone: () => handleCloneNode(imageId)
      },
      position: { x: baseX + 250, y: baseY + 80 },
    };

    const messageNode = {
      id: messageId,
      type: 'actionNode',
      data: {
        label: 'Send Message',
        nodeType: 'actionNode',
        actionType: 'message',
        onConfigure: () => handleConfigureNode({ id: messageId, data: { label: 'Send Message', nodeType: 'actionNode', actionType: 'message' } } as any),
        onDelete: () => handleDeleteNode(messageId),
        onClone: () => handleCloneNode(messageId)
      },
      position: { x: baseX + 500, y: baseY + 80 },
    };

    // Create edges: Trigger → Comment Reply (top), Trigger → Image → Send Message (bottom)
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
        id: `edge-${triggerId}-${imageId}`,
        source: triggerId,
        target: imageId,
        type: 'custom',
        animated: true,
        style: { stroke: '#64748b', strokeWidth: 2 }
      },
      {
        id: `edge-${imageId}-${messageId}`,
        source: imageId,
        target: messageId,
        type: 'custom',
        animated: true,
        style: { stroke: '#64748b', strokeWidth: 2 }
      }
    ];

    // Add all nodes and edges
    setNodes((nds) => nds.concat([triggerNode, replyNode, imageNode, messageNode]));
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

    // NEW FLOW NODE - Check FIRST before any other node types
    // This catches "New Flow: xxx" nodes regardless of their type
    if (selectedNode.data?.isNewFlowNode || nodeLabel.toLowerCase().includes('new flow:')) {
      return (
        <NewFlowNodeForm
          workspaceId={workspace?.id || ''}
          pageId={flowPageId}
          initialConfig={{
            flowName: selectedNode?.data?.flowName || initialConfigRef.current?.flowName || nodeLabel.replace('New Flow:', '').trim() || ''
          }}
          onChange={handleConfigChange}
        />
      );
    }

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
          workspaceId={workspace?.id || ''}
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
          workspaceId={workspace?.id || ''}
          pageId={flowPageId}
          initialConfig={initialConfigRef.current}
          onChange={handleConfigChange}
          onSave={handleSaveConfig}
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
          onSave={handleSaveConfig}
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


    // Form Node
    if (nodeType === 'formNode' || label.toLowerCase().includes('form')) {
      return (
        <FormNodeForm
          workspaceId={workspace?.id || ''}
          initialConfig={initialConfigRef.current}
          onChange={handleConfigChange}
        />
      );
    }

    // Google Sheets Node
    if (nodeType === 'sheetsNode' || label.toLowerCase().includes('sheets') || label.toLowerCase().includes('google')) {
      return (
        <GoogleSheetNodeForm
          workspaceId={workspace?.id || ''}
          initialConfig={initialConfigRef.current}
          onChange={handleConfigChange}
        />
      );
    }

    // Condition Node
    if (nodeType === 'conditionNode' || label.toLowerCase().includes('condition')) {
      return (
        <ConditionNodeForm
          workspaceId={workspace?.id || ''}
          initialConfig={initialConfigRef.current}
          onChange={handleConfigChange}
        />
      );
    }

    // Follow-up Node (Abandoned Form Recovery)
    if (nodeType === 'followupNode' || label.toLowerCase().includes('follow')) {
      return (
        <FollowupNodeForm
          config={currentConfig}
          onChange={handleConfigChange}
        />
      );
    }

    // Product Webview Node (must check BEFORE upsell since it may include similar patterns)
    if (nodeType === 'productWebviewNode' || label.toLowerCase().includes('product webview')) {
      return (
        <ProductWebviewNodeForm
          workspaceId={workspace?.id || ''}
          initialConfig={initialConfigRef.current}
          onChange={handleConfigChange}
        />
      );
    }

    // Upsell Node
    if (nodeType === 'upsellNode' || label.toLowerCase().includes('upsell')) {
      return (
        <UpsellNodeForm
          workspaceId={workspace?.id || ''}
          initialConfig={initialConfigRef.current}
          onChange={handleConfigChange}
        />
      );
    }

    // Downsell Node
    if (nodeType === 'downsellNode' || label.toLowerCase().includes('downsell')) {
      return (
        <DownsellNodeForm
          workspaceId={workspace?.id || ''}
          initialConfig={initialConfigRef.current}
          onChange={handleConfigChange}
        />
      );
    }

    // Invoice Node
    if (nodeType === 'invoiceNode' || label.toLowerCase().includes('invoice')) {
      return (
        <InvoiceNodeForm
          workspaceId={workspace?.id || ''}
          initialConfig={initialConfigRef.current}
          onChange={handleConfigChange}
        />
      );
    }

    // Product Node
    if (nodeType === 'productNode' || label.toLowerCase().includes('product')) {
      return (
        <ProductNodeForm
          workspaceId={workspace?.id || ''}
          initialConfig={initialConfigRef.current}
          onChange={handleConfigChange}
        />
      );
    }


    // Checkout Node
    if (nodeType === 'checkoutNode' || label.toLowerCase().includes('checkout')) {
      return (
        <CheckoutNodeForm
          workspaceId={workspace?.id || ''}
          initialConfig={initialConfigRef.current}
          onChange={handleConfigChange}
        />
      );
    }

    // AI Node
    if (nodeType === 'aiNode' || label.toLowerCase().includes('ai agent')) {
      return (
        <AINodeForm
          workspaceId={workspace?.id || ''}
          initialConfig={initialConfigRef.current}
          onChange={handleConfigChange}
          onClose={handleCloseModal}
        />
      );
    }

    // Start Node
    if (nodeType === 'startNode' || label.toLowerCase().includes('start')) {
      // Check if this is a "New Flow" node (sub-flow start point)
      const isNewFlowNode = selectedNode?.data?.isNewFlowNode || label.toLowerCase().includes('new flow');

      if (isNewFlowNode) {
        return (
          <NewFlowNodeForm
            workspaceId={workspace?.id || ''}
            pageId={flowPageId}
            initialConfig={{
              flowName: selectedNode?.data?.flowName || initialConfigRef.current?.flowName || ''
            }}
            onChange={handleConfigChange}
          />
        );
      }

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

  // Mobile tools operations (shown by default)
  // Toolbar grouping state
  const [showEcommerceTools, setShowEcommerceTools] = useState(false);
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
    const horizontalSpacing = 300;
    const verticalSpacing = 250;

    // Helper to get node height
    const getNodeHeight = (id: string) => {
      const n = nodes.find(x => x.id === id);
      return (n as any)?.measured?.height || n?.height || 150;
    };

    // 1. Build Graph Info
    // adjacencyMap: source -> outgoing edges (for BFS)
    const adjacencyMap: Map<string, Array<{ target: string, handle: string | null }>> = new Map();
    // incomingMap: target -> sources (for Barycenter Y calc)
    const incomingMap: Map<string, string[]> = new Map();
    const incomingCount: Map<string, number> = new Map();

    nodes.forEach(node => {
      adjacencyMap.set(node.id, []);
      incomingMap.set(node.id, []);
      incomingCount.set(node.id, 0);
    });

    edges.forEach(edge => {
      // Outgoing
      const targets = adjacencyMap.get(edge.source) || [];
      targets.push({ target: edge.target, handle: edge.sourceHandle || null });
      adjacencyMap.set(edge.source, targets);

      // Incoming
      const sources = incomingMap.get(edge.target) || [];
      sources.push(edge.source);
      incomingMap.set(edge.target, sources);

      incomingCount.set(edge.target, (incomingCount.get(edge.target) || 0) + 1);
    });

    // 2. BFS for Spanning Tree / Levelling
    const rootNodes = nodes.filter(node => (incomingCount.get(node.id) || 0) === 0);
    const effectiveRoots = rootNodes.length > 0 ? rootNodes : nodes.filter(node =>
      node.type === 'triggerNode' || node.type === 'startNode' ||
      node.data?.nodeType === 'triggerNode' || node.data?.nodeType === 'startNode'
    );

    const nodeLevel: Map<string, number> = new Map();
    const nodesAtLevel: Map<number, string[]> = new Map();
    const visited = new Set<string>();
    const queue: { nodeId: string; level: number }[] = [];

    effectiveRoots.forEach(node => {
      queue.push({ nodeId: node.id, level: 0 });
      visited.add(node.id);
    });

    while (queue.length > 0) {
      const { nodeId, level } = queue.shift()!;

      nodeLevel.set(nodeId, level);
      if (!nodesAtLevel.has(level)) nodesAtLevel.set(level, []);
      nodesAtLevel.get(level)!.push(nodeId);

      // Sort children: True path (top) -> False path (bottom)
      const children = adjacencyMap.get(nodeId) || [];
      children.sort((a, b) => {
        if (a.handle === 'true' && b.handle !== 'true') return -1;
        if (a.handle !== 'true' && b.handle === 'true') return 1;
        if (a.handle === 'false' && b.handle !== 'false') return 1;
        if (a.handle !== 'false' && b.handle === 'false') return -1;
        return 0;
      });

      children.forEach(child => {
        if (!visited.has(child.target)) {
          visited.add(child.target);
          queue.push({ nodeId: child.target, level: level + 1 });
        }
      });
    }

    // Add unvisited (disconnected) to level 0
    nodes.forEach(node => {
      if (!visited.has(node.id)) {
        nodeLevel.set(node.id, 0);
        if (!nodesAtLevel.has(0)) nodesAtLevel.set(0, []);
        nodesAtLevel.get(0)!.push(node.id);
      }
    });

    // 3. Barycenter Layout (Phase 2) - Calculates CENTERS
    const nodeCenterY: Map<string, number> = new Map();
    const maxLevel = Math.max(...Array.from(nodesAtLevel.keys()));

    // Wrapper for block management
    interface Block {
      nodes: string[];
      sumIdeal: number;
      count: number;
    }
    const getBlockCenter = (b: Block) => b.sumIdeal / b.count;
    const getBlockHeight = (b: Block) => (b.count - 1) * verticalSpacing;
    const getBlockBottom = (b: Block) => getBlockCenter(b) + getBlockHeight(b) / 2;
    const getBlockTop = (b: Block) => getBlockCenter(b) - getBlockHeight(b) / 2;

    for (let level = 0; level <= maxLevel; level++) {
      const layerNodes = nodesAtLevel.get(level) || [];

      // Calculate Ideal Y (Center) for each node
      const nodeIdealY: Map<string, number> = new Map();
      layerNodes.forEach(nodeId => {
        const parents = incomingMap.get(nodeId) || [];
        if (parents.length > 0) {
          const validParents = parents.filter(p => nodeCenterY.has(p));
          if (validParents.length > 0) {
            const sum = validParents.reduce((s, p) => s + (nodeCenterY.get(p) || 0), 0);
            nodeIdealY.set(nodeId, sum / validParents.length);
          } else {
            nodeIdealY.set(nodeId, 0);
          }
        } else {
          nodeIdealY.set(nodeId, 0);
        }
      });

      // Sort by Ideal Y
      layerNodes.sort((a, b) => {
        const diff = (nodeIdealY.get(a) || 0) - (nodeIdealY.get(b) || 0);
        if (Math.abs(diff) > 1) return diff;
        return 0;
      });

      // Block Merge Algorithm
      const blocks: Block[] = [];
      layerNodes.forEach(nodeId => {
        const ideal = nodeIdealY.get(nodeId) || 0;
        let currentBlock: Block = { nodes: [nodeId], sumIdeal: ideal, count: 1 };

        while (blocks.length > 0) {
          const prevBlock = blocks[blocks.length - 1];
          const prevBottomCenter = getBlockBottom(prevBlock);
          const currTopCenter = getBlockTop(currentBlock);

          if (currTopCenter < prevBottomCenter + verticalSpacing) {
            prevBlock.nodes.push(...currentBlock.nodes);
            prevBlock.sumIdeal += currentBlock.sumIdeal;
            prevBlock.count += currentBlock.count;
            currentBlock = prevBlock;
            blocks.pop();
          } else {
            break;
          }
        }
        blocks.push(currentBlock);
      });

      // Assign Final Centers
      blocks.forEach(block => {
        const center = getBlockCenter(block);
        const startY = center - getBlockHeight(block) / 2;
        block.nodes.forEach((nId, idx) => {
          nodeCenterY.set(nId, startY + idx * verticalSpacing);
        });
      });
    }

    // 4. Position Nodes
    const maxNodesLevel = Math.max(...Array.from(nodesAtLevel.values()).map(arr => arr.length), 1);
    const totalWidth = maxLevel * horizontalSpacing;
    const startX = viewportCenter.x - totalWidth / 2;
    const startY = viewportCenter.y;

    const newNodes = nodes.map(node => {
      const level = nodeLevel.get(node.id) || 0;
      const calculatedCenterY = nodeCenterY.get(node.id) || 0;
      const height = getNodeHeight(node.id);

      return {
        ...node,
        position: {
          x: startX + level * horizontalSpacing,
          // Convert Center Y to Top Y
          y: (startY + calculatedCenterY) - (height / 2)
        }
      };
    });

    setNodes(newNodes);

    setTimeout(() => {
      reactFlowInstance.fitView({ padding: 0.3, duration: 500, maxZoom: 1 });
    }, 50);

    toast.success('Nodes rearranged');
  }, [nodes, edges, setNodes, reactFlowInstance, toast]);

  const { isDark } = useTheme();

  return (
    <div className={`${isFullscreen ? 'fixed inset-0 z-50' : 'h-[calc(100vh-60px)] w-full -m-6 relative'} ${isDark ? 'bg-slate-950' : 'bg-gray-50'
      } overflow-hidden`}>

      {/* Header Overlay (Title & Back) - Hidden on Mobile */}
      <div className="absolute top-6 left-6 z-10 hidden md:block">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/flows')}
            className={`p-2 backdrop-blur-md border rounded-xl transition-all shadow-lg ${isDark
              ? 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
              : 'bg-white border-gray-300 text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex flex-col">
            {isEditingName ? (
              <input
                type="text"
                value={isEditingTemplate ? editingTemplateName : editedName}
                onChange={(e) => isEditingTemplate ? setEditingTemplateName(e.target.value) : setEditedName(e.target.value)}
                onBlur={() => {
                  if (isEditingTemplate) {
                    setIsEditingName(false);
                  } else {
                    handleNameSave();
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (isEditingTemplate) {
                      setIsEditingName(false);
                    } else {
                      handleNameSave();
                    }
                  } else if (e.key === 'Escape') {
                    setIsEditingName(false);
                  }
                }}
                className={`font-bold bg-white/10 border border-indigo-500/50 rounded-lg px-2 py-0.5 text-lg outline-none focus:ring-2 focus:ring-indigo-500/50 shadow-lg backdrop-blur-md ${isDark ? 'text-white' : 'text-gray-900'
                  }`}
                autoFocus
                onFocus={(e) => e.target.select()}
              />
            ) : (
              <div className="flex items-center gap-2">
                <h1
                  onClick={() => setIsEditingName(true)}
                  className={`text-lg font-bold tracking-tight cursor-pointer hover:opacity-80 transition-opacity ${isDark ? 'text-white' : 'text-gray-900'
                    }`}
                >
                  {isEditingTemplate ? editingTemplateName : currentFlowName}
                </h1>
                {isEditingTemplate ? (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider border backdrop-blur-md shadow-sm ${editingTemplateIsGlobal
                    ? 'bg-green-500/20 text-green-400 border-green-500/30'
                    : 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30'
                    }`}>
                    {editingTemplateIsGlobal ? 'GLOBAL TEMPLATE' : 'TEMPLATE'}
                  </span>
                ) : (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider border backdrop-blur-md shadow-sm ${flowStatus === 'ACTIVE'
                    ? 'bg-green-500 text-white border-green-600'
                    : 'bg-transparent text-black dark:text-slate-300 border-slate-300 dark:border-white/20'
                    }`}>
                    {flowStatus === 'ACTIVE' ? 'ACTIVE' : 'DRAFT'}
                  </span>
                )}
              </div>
            )}
            <p className={`text-sm drop-shadow-sm font-medium ${isDark ? 'text-slate-400' : 'text-gray-600'
              }`}>{isEditingTemplate ? 'Template Editor' : 'Flow Automation Builder'}</p>
          </div>
        </div>
      </div>

      {/* Top Right Controls (Save / Publish) */}
      <div className="absolute top-4 left-auto right-6 md:top-6 z-10 flex gap-2 md:gap-3 w-max items-center">
        {/* Mobile Tools Toggle */}
        <button
          onClick={() => setShowMobileNodeGrid(true)}
          className={`md:hidden group relative w-10 h-10 flex items-center justify-center backdrop-blur-md rounded-xl transition-all border shadow-lg ${isDark
            ? 'bg-white/10 border-white/10 text-white hover:bg-white/20'
            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
        >
          <Grid3x3 className="w-5 h-5" />
        </button>

        {/* Fullscreen Toggle */}
        <button
          onClick={() => setIsFullscreen(!isFullscreen)}
          className={`group relative flex w-10 h-10 items-center justify-center backdrop-blur-md rounded-xl transition-all border shadow-lg active:scale-95 ${isDark
            ? 'bg-white/10 border-white/10 text-white hover:bg-white/20'
            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          title={isFullscreen ? 'Exit Fullscreen (ESC)' : 'Fullscreen'}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          <span className={`absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 ${isDark ? 'bg-slate-800 text-white' : 'bg-white border border-gray-300 text-slate-900 shadow-sm'} text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none`}>
            {isFullscreen ? 'Exit (ESC)' : 'Fullscreen'}
          </span>
        </button>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className={`group relative w-10 h-10 flex items-center justify-center backdrop-blur-md rounded-xl transition-all border shadow-lg disabled:opacity-50 ${isDark
            ? 'bg-white/10 border-white/10 text-white hover:bg-white/20'
            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
        >
          <Save className="w-4 h-4" />
          <span className={`absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 ${isDark ? 'bg-slate-800 text-white' : 'bg-white border border-gray-300 text-slate-900 shadow-sm'} text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none`}>
            {isSaving ? 'Saving...' : 'Save and Publish'}
          </span>
        </button>

        {/* Update Template button - visible only when editing a template */}
        {isEditingTemplate && (
          <button
            onClick={handleUpdateTemplate}
            disabled={isSaving}
            className={`group relative w-10 h-10 flex items-center justify-center backdrop-blur-md rounded-xl transition-all border shadow-lg disabled:opacity-50 ${isDark
              ? 'bg-green-500/20 border-green-500/30 text-green-400 hover:bg-green-500/30'
              : 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'
              }`}
            title="Update Template"
          >
            {isSaving ? (
              <span className="w-4 h-4 border-2 border-green-400/30 border-t-green-400 rounded-full animate-spin" />
            ) : (
              <ArrowUp className="w-4 h-4" />
            )}
            <span className={`absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 ${isDark ? 'bg-slate-800 text-white' : 'bg-white border border-gray-300 text-slate-900 shadow-sm'} text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none`}>
              {isSaving ? 'Updating...' : 'Update Template'}
            </span>
          </button>
        )}

        <button
          onClick={handleResetLayout}
          className={`group relative w-10 h-10 flex items-center justify-center backdrop-blur-md rounded-xl transition-all border shadow-lg ${isDark
            ? 'bg-white/10 border-white/10 text-white hover:bg-white/20'
            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
        >
          <RotateCcw className="w-4 h-4" />
          <span className={`absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 ${isDark ? 'bg-slate-800 text-white' : 'bg-white border border-gray-300 text-slate-900 shadow-sm'} text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none`}>
            Rearrange Nodes
          </span>
        </button>

        <button
          onClick={handlePublishFlow}
          disabled={isValidating || nodes.length === 0}
          className={`group relative w-10 h-10 flex items-center justify-center rounded-xl text-white transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${isValidating ? 'bg-blue-600 animate-pulse' : 'bg-indigo-600 hover:bg-indigo-700'}`}
          title="Validate & Publish Flow"
        >
          {isValidating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          <span className={`absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 ${isDark ? 'bg-slate-800 text-white' : 'bg-white border border-gray-300 text-slate-900 shadow-sm'} text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none`}>
            {isValidating ? 'Validating...' : 'Save as Template'}
          </span>
        </button>
      </div>

      {/* Floating Toolbar - HIDDEN ON MOBILE */}
      <div className={`hidden md:block absolute z-10 transition-all duration-300 ease-out
        opacity-100 pointer-events-auto
        left-1/2 -translate-x-1/2 top-6
      `}>
        <div className={`
          flex
          glass-panel px-3 py-2 rounded-2xl border border-white/10 shadow-2xl backdrop-blur-xl
          items-center gap-2
          transition-all duration-300 origin-top
          ${isToolsOpen ? 'scale-100' : 'scale-95'}
        `}>
          <div className="flex items-center gap-1.5">
            {/* Core Messages Group */}
            <div className="flex items-center gap-1.5 pr-2 border-r border-gray-300 dark:border-white/10">
              <div draggable onDragStart={(e) => onDragStart(e, 'startNode', 'Start')} onClick={() => addNode('startNode', 'Start')}
                className="group relative w-9 h-9 bg-emerald-500/20 hover:bg-emerald-500/40 border border-emerald-500/30 rounded-xl flex items-center justify-center text-emerald-400 shadow-lg hover:scale-110 transition-transform cursor-grab active:cursor-grabbing">
                <Play className="w-4.5 h-4.5 fill-current" />
                <span className={`absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 ${isDark ? 'bg-slate-800 text-white' : 'bg-white border border-gray-300 text-slate-900 shadow-sm'} text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-xl z-50`}>Start</span>
              </div>
              <div draggable onDragStart={(e) => { e.dataTransfer.setData('application/reactflow-template', 'commentReply'); e.dataTransfer.effectAllowed = 'move'; }} onClick={() => addCommentReplyTemplate()}
                className="group relative w-9 h-9 bg-blue-500/20 hover:bg-blue-500/40 border border-blue-500/30 rounded-xl flex items-center justify-center text-blue-400 shadow-lg hover:scale-110 transition-transform cursor-grab active:cursor-grabbing">
                <MessageCircle className="w-4.5 h-4.5" />
                <span className={`absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 ${isDark ? 'bg-slate-800 text-white' : 'bg-white border border-gray-300 text-slate-900 shadow-sm'} text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-xl z-50`}>Comment</span>
              </div>
              <div draggable onDragStart={(e) => onDragStart(e, 'textNode', 'Text')} onClick={() => addNode('textNode', 'Text')}
                className="group relative w-9 h-9 bg-amber-500/20 hover:bg-amber-500/40 border border-amber-500/30 rounded-xl flex items-center justify-center text-amber-400 shadow-lg hover:scale-110 transition-transform cursor-grab active:cursor-grabbing">
                <MessageSquare className="w-4.5 h-4.5" />
                <span className={`absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 ${isDark ? 'bg-slate-800 text-white' : 'bg-white border border-gray-300 text-slate-900 shadow-sm'} text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50`}>Text</span>
              </div>
              <div draggable onDragStart={(e) => onDragStart(e, 'imageNode', 'Image')} onClick={() => addNode('imageNode', 'Image')}
                className="group relative w-9 h-9 bg-rose-500/20 hover:bg-rose-500/40 border border-rose-500/30 rounded-xl flex items-center justify-center text-rose-400 shadow-lg hover:scale-110 transition-transform cursor-grab active:cursor-grabbing">
                <Image className="w-4.5 h-4.5" />
                <span className={`absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 ${isDark ? 'bg-slate-800 text-white' : 'bg-white border border-gray-300 text-slate-900 shadow-sm'} text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50`}>Image</span>
              </div>
              <div draggable onDragStart={(e) => onDragStart(e, 'videoNode', 'Video')} onClick={() => addNode('videoNode', 'Video')}
                className="group relative w-9 h-9 bg-cyan-500/20 hover:bg-cyan-500/40 border border-cyan-500/30 rounded-xl flex items-center justify-center text-cyan-400 shadow-lg hover:scale-110 transition-transform cursor-grab active:cursor-grabbing">
                <Video className="w-4.5 h-4.5" />
                <span className={`absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 ${isDark ? 'bg-slate-800 text-white' : 'bg-white border border-gray-300 text-slate-900 shadow-sm'} text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50`}>Video</span>
              </div>
            </div>

            {/* Automation Group */}
            <div className="flex items-center gap-1.5 pr-2 border-r border-gray-300 dark:border-white/10">
              <div draggable onDragStart={(e) => onDragStart(e, 'aiNode', 'AI Agent')} onClick={() => addNode('aiNode', 'AI Agent')}
                className="group relative w-9 h-9 bg-indigo-500/20 hover:bg-indigo-500/40 border border-indigo-500/30 rounded-xl flex items-center justify-center text-indigo-400 shadow-lg hover:scale-110 transition-transform cursor-grab active:cursor-grabbing">
                <Sparkles className="w-4.5 h-4.5" />
                <span className={`absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 ${isDark ? 'bg-slate-800 text-white' : 'bg-white border border-gray-300 text-slate-900 shadow-sm'} text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50`}>AI Agent</span>
              </div>
              <div draggable onDragStart={(e) => onDragStart(e, 'conditionNode', 'Condition')} onClick={() => addNode('conditionNode', 'Condition')}
                className="group relative w-9 h-9 bg-orange-500/20 hover:bg-orange-500/40 border border-orange-500/30 rounded-xl flex items-center justify-center text-orange-400 shadow-lg hover:scale-110 transition-transform cursor-grab active:cursor-grabbing">
                <GitBranch className="w-4.5 h-4.5" />
                <span className={`absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 ${isDark ? 'bg-slate-800 text-white' : 'bg-white border border-gray-300 text-slate-900 shadow-sm'} text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50`}>Condition</span>
              </div>
              <div draggable onDragStart={(e) => onDragStart(e, 'followupNode', 'Follow-up')} onClick={() => addNode('followupNode', 'Follow-up')}
                className="group relative w-9 h-9 bg-rose-500/20 hover:bg-rose-500/40 border border-rose-500/30 rounded-xl flex items-center justify-center text-rose-400 shadow-lg hover:scale-110 transition-transform cursor-grab active:cursor-grabbing">
                <RefreshCw className="w-4.5 h-4.5" />
                <span className={`absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 ${isDark ? 'bg-slate-800 text-white' : 'bg-white border border-gray-300 text-slate-900 shadow-sm'} text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50`}>Follow-up</span>
              </div>
            </div>

            {/* Shop & Data Dropdown */}
            <div className="relative" ref={ecommerceToolsRef}>
              <button
                onClick={() => setShowEcommerceTools(!showEcommerceTools)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-xl border transition-all ${showEcommerceTools
                  ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-400'
                  : `bg-white/5 border-gray-300 dark:border-white/10 ${isDark ? 'text-slate-400 hover:bg-white/10 hover:text-white' : 'text-slate-600 hover:bg-gray-100 hover:text-slate-900'}`
                  }`}
              >
                <ShoppingBag className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Store</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${showEcommerceTools ? 'rotate-180' : ''}`} />
              </button>

              {showEcommerceTools && (
                <div className="absolute top-12 left-0 glass-panel p-2 rounded-2xl border border-white/10 shadow-2xl backdrop-blur-2xl flex items-center gap-2 z-50 animate-in fade-in zoom-in duration-200">
                  <div draggable onDragStart={(e) => onDragStart(e, 'productWebviewNode', 'Product Webview')} onClick={() => { addNode('productWebviewNode', 'Product Webview'); setShowEcommerceTools(false); }}
                    className="group relative w-10 h-10 bg-indigo-500/20 hover:bg-indigo-500/40 border border-indigo-500/30 rounded-xl flex items-center justify-center text-indigo-400 shadow-lg hover:scale-110 transition-transform cursor-grab active:cursor-grabbing">
                    <ShoppingBag className="w-5 h-5" />
                    <Globe className="w-2.5 h-2.5 text-white absolute -bottom-0.5 -right-0.5 bg-indigo-600 rounded-full p-0.5" />
                    <span className={`absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 ${isDark ? 'bg-slate-800 text-white' : 'bg-white border border-gray-300 text-slate-900 shadow-sm'} text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none`}>Product Webview</span>
                  </div>
                  <div draggable onDragStart={(e) => onDragStart(e, 'upsellNode', 'Upsell')} onClick={() => { addNode('upsellNode', 'Upsell'); setShowEcommerceTools(false); }}
                    className="group relative w-10 h-10 bg-teal-500/20 hover:bg-teal-500/40 border border-teal-500/30 rounded-xl flex items-center justify-center text-teal-400 shadow-lg hover:scale-110 transition-transform cursor-grab active:cursor-grabbing">
                    <ShoppingCart className="w-5 h-5" />
                    <ArrowUp className="w-2.5 h-2.5 text-white absolute -bottom-0.5 -right-0.5 bg-teal-600 rounded-full p-0.5" />
                    <span className={`absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 ${isDark ? 'bg-slate-800 text-white' : 'bg-white border border-gray-300 text-slate-900 shadow-sm'} text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-xl z-50`}>Upsell</span>
                  </div>
                  <div draggable onDragStart={(e) => onDragStart(e, 'downsellNode', 'Downsell')} onClick={() => { addNode('downsellNode', 'Downsell'); setShowEcommerceTools(false); }}
                    className="group relative w-10 h-10 bg-orange-500/20 hover:bg-orange-500/40 border border-orange-500/30 rounded-xl flex items-center justify-center text-orange-400 shadow-lg hover:scale-110 transition-transform cursor-grab active:cursor-grabbing">
                    <ShoppingCart className="w-5 h-5" />
                    <ArrowDown className="w-2.5 h-2.5 text-white absolute -bottom-0.5 -right-0.5 bg-orange-600 rounded-full p-0.5" />
                    <span className={`absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 ${isDark ? 'bg-slate-800 text-white' : 'bg-white border border-gray-300 text-slate-900 shadow-sm'} text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none`}>Downsell</span>
                  </div>
                  <div draggable onDragStart={(e) => onDragStart(e, 'formNode', 'Form')} onClick={() => { addNode('formNode', 'Form'); setShowEcommerceTools(false); }}
                    className="group relative w-10 h-10 bg-purple-500/20 hover:bg-purple-500/40 border border-purple-500/30 rounded-xl flex items-center justify-center text-purple-400 shadow-lg hover:scale-110 transition-transform cursor-grab active:cursor-grabbing">
                    <FileText className="w-5 h-5" />
                    <span className={`absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 ${isDark ? 'bg-slate-800 text-white' : 'bg-white border border-gray-300 text-slate-900 shadow-sm'} text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-xl z-50`}>Form</span>
                  </div>
                  <div draggable onDragStart={(e) => onDragStart(e, 'sheetsNode', 'Google Sheets')} onClick={() => { addNode('sheetsNode', 'Google Sheets'); setShowEcommerceTools(false); }}
                    className="group relative w-10 h-10 bg-green-500/20 hover:bg-green-500/40 border border-green-500/30 rounded-xl flex items-center justify-center text-green-400 shadow-lg hover:scale-110 transition-transform cursor-grab active:cursor-grabbing">
                    <Table className="w-5 h-5" />
                    <span className={`absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 ${isDark ? 'bg-slate-800 text-white' : 'bg-white border border-gray-300 text-slate-900 shadow-sm'} text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none`}>Sheets</span>
                  </div>
                  <div draggable onDragStart={(e) => onDragStart(e, 'invoiceNode', 'Invoice')} onClick={() => { addNode('invoiceNode', 'Invoice'); setShowEcommerceTools(false); }}
                    className="group relative w-10 h-10 bg-violet-500/20 hover:bg-violet-500/40 border border-violet-500/30 rounded-xl flex items-center justify-center text-violet-400 shadow-lg hover:scale-110 transition-transform cursor-grab active:cursor-grabbing">
                    <Receipt className="w-5 h-5" />
                    <span className={`absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 ${isDark ? 'bg-slate-800 text-white' : 'bg-white border border-gray-300 text-slate-900 shadow-sm'} text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none`}>Invoice</span>
                  </div>
                  <div draggable onDragStart={(e) => onDragStart(e, 'productNode', 'Product')} onClick={() => { addNode('productNode', 'Product'); setShowEcommerceTools(false); }}
                    className="group relative w-10 h-10 bg-emerald-500/20 hover:bg-emerald-500/40 border border-emerald-500/30 rounded-xl flex items-center justify-center text-emerald-400 shadow-lg hover:scale-110 transition-transform cursor-grab active:cursor-grabbing">
                    <Package className="w-5 h-5" />
                    <span className={`absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 ${isDark ? 'bg-slate-800 text-white' : 'bg-white border border-gray-300 text-slate-900 shadow-sm'} text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none`}>Product</span>
                  </div>
                  <div draggable onDragStart={(e) => onDragStart(e, 'checkoutNode', 'Checkout')} onClick={() => { addNode('checkoutNode', 'Checkout'); setShowEcommerceTools(false); }}
                    className="group relative w-10 h-10 bg-emerald-500/20 hover:bg-emerald-500/40 border border-emerald-500/30 rounded-xl flex items-center justify-center text-emerald-400 shadow-lg hover:scale-110 transition-transform cursor-grab active:cursor-grabbing">
                    <ShoppingCart className="w-5 h-5" />
                    <span className={`absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 ${isDark ? 'bg-slate-800 text-white' : 'bg-white border border-gray-300 text-slate-900 shadow-sm'} text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none`}>Checkout</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile: Vertical toolbar on left - REMOVED */}
      </div>

      <div className={`flex-1 h-full relative ${isDark ? 'bg-slate-950' : 'bg-gray-50'
        }`}>
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
            className={isDark ? 'bg-slate-950' : 'bg-gray-50'}
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
            <Background
              variant={BackgroundVariant.Dots}
              color={isDark ? "#475569" : "#94a3b8"}
              gap={25}
              size={2}
            />
            <Controls className={`!shadow-xl border ${isDark
              ? '!bg-slate-800 !border-white/10 [&>button]:!fill-slate-400 [&>button:hover]:!fill-white'
              : '!bg-white !border-gray-300 [&>button]:!fill-gray-600 [&>button:hover]:!fill-gray-900'
              }`} />
            <MiniMap
              className={`!backdrop-blur-sm !shadow-xl !rounded-lg overflow-hidden border ${isDark ? '!bg-slate-900/80 !border-slate-700' : '!bg-white/80 !border-gray-300'
                }`}
              style={{ width: 120, height: 80 }}
              maskColor={isDark ? "rgba(15, 23, 42, 0.7)" : "rgba(248, 250, 252, 0.7)"}
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
          fullscreen={
            selectedNode.data.nodeType === 'upsellNode' ||
            selectedNode.data.nodeType === 'downsellNode' ||
            selectedNode.data.nodeType === 'productNode' ||
            selectedNode.data.nodeType === 'productWebviewNode' ||
            selectedNode.data.nodeType === 'checkoutNode' ||
            selectedNode.data.nodeType === 'imageNode' ||
            selectedNode.data.nodeType === 'textNode' ||
            selectedNode.data.nodeType === 'aiNode' ||
            (selectedNode.data.label as string || '').toLowerCase().includes('upsell') ||
            (selectedNode.data.label as string || '').toLowerCase().includes('downsell') ||
            (selectedNode.data.label as string || '').toLowerCase().includes('product webview') ||
            (selectedNode.data.label as string || '').toLowerCase().includes('product') ||
            (selectedNode.data.label as string || '').toLowerCase() === 'checkout' ||
            (selectedNode.data.label as string || '').toLowerCase() === 'image' ||
            (selectedNode.data.label as string || '').toLowerCase() === 'text'
          }
        >
          {renderConfigForm()}
        </NodeConfigModal>
      )}

      {/* Flow Name Dialog */}
      {showNameDialog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          {/* Dialog */}
          <div className={`relative border rounded-2xl w-full max-w-md p-6 shadow-2xl animate-fade-in ${isDark
            ? 'glass-panel border-white/10 bg-slate-900/90'
            : 'bg-white border-gray-200'
            }`}>
            <h2 className={`text-xl font-bold mb-2 ${isDark ? 'text-white text-glow' : 'text-slate-900'
              }`}>Save Flow</h2>
            <p className={`text-sm mb-6 ${isDark ? 'text-slate-400' : 'text-slate-500'
              }`}>Enter a name for your automation flow</p>

            <input
              type="text"
              value={flowName}
              onChange={(e) => setFlowName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSaveWithName()}
              placeholder="e.g., Welcome Message Flow"
              className={`w-full border rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all mb-6 ${isDark
                ? 'bg-black/20 border-white/10 text-white placeholder-slate-500'
                : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                }`}
              autoFocus
              disabled={isSaving}
            />

            {/* Saving Animation */}
            {isSaving && (
              <div className={`mb-6 p-4 border rounded-xl ${isDark ? 'bg-indigo-500/10 border-indigo-500/20' : 'bg-indigo-50 border-indigo-200'
                }`}>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                  <div className="flex-1">
                    <p className={`text-sm font-medium animate-pulse ${isDark ? 'text-indigo-300' : 'text-indigo-700'
                      }`}>
                      Saving your settings...
                    </p>
                    <p className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-slate-500'
                      }`}>Please wait while we configure your automation</p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowNameDialog(false);
                  setFlowName('');
                }}
                disabled={isSaving}
                className={`px-5 py-2.5 text-sm font-medium rounded-xl border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${isDark
                  ? 'text-slate-300 hover:bg-white/5 border-white/10 hover:border-white/20'
                  : 'text-slate-600 hover:bg-slate-50 border-gray-200 hover:border-gray-300'
                  }`}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveWithName}
                disabled={!flowName.trim() || isSaving}
                className="px-5 py-2.5 text-sm font-bold bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white rounded-xl shadow-lg shadow-indigo-500/20 transition-all active:scale-95 border border-white/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSaving && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>}
                {isSaving ? 'Saving...' : 'Save Flow'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FB Connection Required Modal */}
      {showFbConnectionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className={`w-full max-w-md mx-4 rounded-2xl shadow-2xl border ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
            <div className="p-6 text-center">
              {/* Icon */}
              <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${isDark ? 'bg-amber-500/20' : 'bg-amber-100'}`}>
                <Globe className={`w-8 h-8 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
              </div>

              {/* Title */}
              <h3 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Connect Your Facebook Profile
              </h3>

              {/* Description */}
              <p className={`text-sm mb-6 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                To save and publish a flow, you need to connect your Facebook profile and enable automation on at least one page.
              </p>

              {/* Buttons */}
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    setShowFbConnectionModal(false);
                    navigate('/connections');
                  }}
                  className="w-full py-3 px-4 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <Globe className="w-5 h-5" />
                  Go to Connections
                </button>
                <button
                  onClick={() => setShowFbConnectionModal(false)}
                  className={`w-full py-3 px-4 font-medium rounded-xl transition-colors ${isDark
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'}`}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Node Grid Overlay - Centered Popup */}
      {showMobileNodeGrid && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
          {/* Backdrop */}
          <div
            className={`absolute inset-0 backdrop-blur-sm transition-opacity ${isDark ? 'bg-slate-950/80' : 'bg-white/60'
              }`}
            onClick={() => setShowMobileNodeGrid(false)}
          />

          {/* Modal Container */}
          <div className={`relative w-full max-w-sm border rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-200 ${isDark
            ? 'bg-slate-900 border-white/10'
            : 'bg-white border-gray-200'
            }`}>
            <div className={`flex items-center justify-between p-4 border-b shrink-0 ${isDark
              ? 'border-white/10 bg-slate-900/50'
              : 'border-gray-100 bg-white/50'
              }`}>
              <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Add Node</h2>
              <button
                onClick={() => setShowMobileNodeGrid(false)}
                className={`p-2 rounded-full transition-colors ${isDark
                  ? 'bg-white/5 text-white hover:bg-white/10'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              <div className="grid grid-cols-4 gap-3 sm:gap-4">
                <div className={`col-span-4 text-xs font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-slate-500' : 'text-slate-400'
                  }`}>Core</div>

                <button onClick={() => { addNode('startNode', 'Start'); setShowMobileNodeGrid(false); }} className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform group">
                  <div className={`w-12 h-12 border rounded-2xl flex items-center justify-center shadow-lg transition-colors ${isDark
                    ? 'bg-emerald-500/10 border-emerald-500/20 group-hover:bg-emerald-500/20 group-hover:border-emerald-500/30 text-emerald-400'
                    : 'bg-emerald-50 border-emerald-200 group-hover:bg-emerald-100 group-hover:border-emerald-300 text-emerald-600'
                    }`}>
                    <Play className="w-5 h-5 fill-current" />
                  </div>
                  <span className={`text-[10px] font-medium text-center leading-tight ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Start</span>
                </button>

                <button onClick={() => { addCommentReplyTemplate(); setShowMobileNodeGrid(false); }} className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform group">
                  <div className={`w-12 h-12 border rounded-2xl flex items-center justify-center shadow-lg transition-colors ${isDark
                    ? 'bg-blue-500/10 border-blue-500/20 group-hover:bg-blue-500/20 group-hover:border-blue-500/30 text-blue-400'
                    : 'bg-blue-50 border-blue-200 group-hover:bg-blue-100 group-hover:border-blue-300 text-blue-600'
                    }`}>
                    <MessageCircle className="w-5 h-5" />
                  </div>
                  <span className={`text-[10px] font-medium text-center leading-tight ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Comment</span>
                </button>

                <button onClick={() => { addNode('textNode', 'Text'); setShowMobileNodeGrid(false); }} className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform group">
                  <div className={`w-12 h-12 border rounded-2xl flex items-center justify-center shadow-lg transition-colors ${isDark
                    ? 'bg-amber-500/10 border-amber-500/20 group-hover:bg-amber-500/20 group-hover:border-amber-500/30 text-amber-400'
                    : 'bg-amber-50 border-amber-200 group-hover:bg-amber-100 group-hover:border-amber-300 text-amber-600'
                    }`}>
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <span className={`text-[10px] font-medium text-center leading-tight ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Text</span>
                </button>

                <button onClick={() => { addNode('imageNode', 'Image'); setShowMobileNodeGrid(false); }} className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform group">
                  <div className={`w-12 h-12 border rounded-2xl flex items-center justify-center shadow-lg transition-colors ${isDark
                    ? 'bg-rose-500/10 border-rose-500/20 group-hover:bg-rose-500/20 group-hover:border-rose-500/30 text-rose-400'
                    : 'bg-rose-50 border-rose-200 group-hover:bg-rose-100 group-hover:border-rose-300 text-rose-600'
                    }`}>
                    <Image className="w-5 h-5" />
                  </div>
                  <span className={`text-[10px] font-medium text-center leading-tight ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Image</span>
                </button>

                <button onClick={() => { addNode('videoNode', 'Video'); setShowMobileNodeGrid(false); }} className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform group">
                  <div className={`w-12 h-12 border rounded-2xl flex items-center justify-center shadow-lg transition-colors ${isDark
                    ? 'bg-cyan-500/10 border-cyan-500/20 group-hover:bg-cyan-500/20 group-hover:border-cyan-500/30 text-cyan-400'
                    : 'bg-cyan-50 border-cyan-200 group-hover:bg-cyan-100 group-hover:border-cyan-300 text-cyan-600'
                    }`}>
                    <Video className="w-5 h-5" />
                  </div>
                  <span className={`text-[10px] font-medium text-center leading-tight ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Video</span>
                </button>

                <div className={`col-span-4 text-xs font-bold uppercase tracking-wider mb-1 mt-3 ${isDark ? 'text-slate-500' : 'text-slate-400'
                  }`}>Automation</div>

                <button onClick={() => { addNode('aiNode', 'AI Agent'); setShowMobileNodeGrid(false); }} className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform group">
                  <div className={`w-12 h-12 border rounded-2xl flex items-center justify-center shadow-lg transition-colors ${isDark
                    ? 'bg-indigo-500/10 border-indigo-500/20 group-hover:bg-indigo-500/20 group-hover:border-indigo-500/30 text-indigo-400'
                    : 'bg-indigo-50 border-indigo-200 group-hover:bg-indigo-100 group-hover:border-indigo-300 text-indigo-600'
                    }`}>
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <span className={`text-[10px] font-medium text-center leading-tight ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>AI Agent</span>
                </button>

                <button onClick={() => { addNode('conditionNode', 'Condition'); setShowMobileNodeGrid(false); }} className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform group">
                  <div className={`w-12 h-12 border rounded-2xl flex items-center justify-center shadow-lg transition-colors ${isDark
                    ? 'bg-orange-500/10 border-orange-500/20 group-hover:bg-orange-500/20 group-hover:border-orange-500/30 text-orange-400'
                    : 'bg-orange-50 border-orange-200 group-hover:bg-orange-100 group-hover:border-orange-300 text-orange-600'
                    }`}>
                    <GitBranch className="w-5 h-5" />
                  </div>
                  <span className={`text-[10px] font-medium text-center leading-tight ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Condition</span>
                </button>

                <button onClick={() => { addNode('followupNode', 'Follow-up'); setShowMobileNodeGrid(false); }} className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform group">
                  <div className={`w-12 h-12 border rounded-2xl flex items-center justify-center shadow-lg transition-colors ${isDark
                    ? 'bg-rose-500/10 border-rose-500/20 group-hover:bg-rose-500/20 group-hover:border-rose-500/30 text-rose-400'
                    : 'bg-rose-50 border-rose-200 group-hover:bg-rose-100 group-hover:border-rose-300 text-rose-600'
                    }`}>
                    <RefreshCw className="w-5 h-5" />
                  </div>
                  <span className={`text-[10px] font-medium text-center leading-tight ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Follow-up</span>
                </button>

                <div className={`col-span-4 text-xs font-bold uppercase tracking-wider mb-1 mt-3 ${isDark ? 'text-slate-500' : 'text-slate-400'
                  }`}>Store</div>

                <button onClick={() => { addNode('productWebviewNode', 'Product Webview'); setShowMobileNodeGrid(false); }} className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform group">
                  <div className={`w-12 h-12 border rounded-2xl flex items-center justify-center shadow-lg relative transition-colors ${isDark
                    ? 'bg-indigo-500/10 border-indigo-500/20 group-hover:bg-indigo-500/20 group-hover:border-indigo-500/30 text-indigo-400'
                    : 'bg-indigo-50 border-indigo-200 group-hover:bg-indigo-100 group-hover:border-indigo-300 text-indigo-600'
                    }`}>
                    <ShoppingBag className="w-5 h-5" />
                    <Globe className="w-2.5 h-2.5 text-white absolute bottom-1 right-1 bg-indigo-600 rounded-full p-0.5" />
                  </div>
                  <span className={`text-[10px] font-medium text-center leading-tight ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Webview</span>
                </button>

                <button onClick={() => { addNode('upsellNode', 'Upsell'); setShowMobileNodeGrid(false); }} className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform group">
                  <div className={`w-12 h-12 border rounded-2xl flex items-center justify-center shadow-lg relative transition-colors ${isDark
                    ? 'bg-teal-500/10 border-teal-500/20 group-hover:bg-teal-500/20 group-hover:border-teal-500/30 text-teal-400'
                    : 'bg-teal-50 border-teal-200 group-hover:bg-teal-100 group-hover:border-teal-300 text-teal-600'
                    }`}>
                    <ShoppingCart className="w-5 h-5" />
                    <ArrowUp className="w-2.5 h-2.5 text-white absolute bottom-1 right-1 bg-teal-600 rounded-full p-0.5" />
                  </div>
                  <span className={`text-[10px] font-medium text-center leading-tight ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Upsell</span>
                </button>

                <button onClick={() => { addNode('downsellNode', 'Downsell'); setShowMobileNodeGrid(false); }} className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform group">
                  <div className={`w-12 h-12 border rounded-2xl flex items-center justify-center shadow-lg relative transition-colors ${isDark
                    ? 'bg-orange-500/10 border-orange-500/20 group-hover:bg-orange-500/20 group-hover:border-orange-500/30 text-orange-400'
                    : 'bg-orange-50 border-orange-200 group-hover:bg-orange-100 group-hover:border-orange-300 text-orange-600'
                    }`}>
                    <ShoppingCart className="w-5 h-5" />
                    <ArrowDown className="w-2.5 h-2.5 text-white absolute bottom-1 right-1 bg-orange-600 rounded-full p-0.5" />
                  </div>
                  <span className={`text-[10px] font-medium text-center leading-tight ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Downsell</span>
                </button>

                <button onClick={() => { addNode('formNode', 'Form'); setShowMobileNodeGrid(false); }} className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform group">
                  <div className={`w-12 h-12 border rounded-2xl flex items-center justify-center shadow-lg transition-colors ${isDark
                    ? 'bg-purple-500/10 border-purple-500/20 group-hover:bg-purple-500/20 group-hover:border-purple-500/30 text-purple-400'
                    : 'bg-purple-50 border-purple-200 group-hover:bg-purple-100 group-hover:border-purple-300 text-purple-600'
                    }`}>
                    <FileText className="w-5 h-5" />
                  </div>
                  <span className={`text-[10px] font-medium text-center leading-tight ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Form</span>
                </button>

                <button onClick={() => { addNode('sheetsNode', 'Sheets'); setShowMobileNodeGrid(false); }} className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform group">
                  <div className={`w-12 h-12 border rounded-2xl flex items-center justify-center shadow-lg transition-colors ${isDark
                    ? 'bg-green-500/10 border-green-500/20 group-hover:bg-green-500/20 group-hover:border-green-500/30 text-green-400'
                    : 'bg-green-50 border-green-200 group-hover:bg-green-100 group-hover:border-green-300 text-green-600'
                    }`}>
                    <Table className="w-5 h-5" />
                  </div>
                  <span className={`text-[10px] font-medium text-center leading-tight ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Sheets</span>
                </button>

                <button onClick={() => { addNode('invoiceNode', 'Invoice'); setShowMobileNodeGrid(false); }} className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform group">
                  <div className={`w-12 h-12 border rounded-2xl flex items-center justify-center shadow-lg transition-colors ${isDark
                    ? 'bg-violet-500/10 border-violet-500/20 group-hover:bg-violet-500/20 group-hover:border-violet-500/30 text-violet-400'
                    : 'bg-violet-50 border-violet-200 group-hover:bg-violet-100 group-hover:border-violet-300 text-violet-600'
                    }`}>
                    <Receipt className="w-5 h-5" />
                  </div>
                  <span className={`text-[10px] font-medium text-center leading-tight ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Invoice</span>
                </button>

                <button onClick={() => { addNode('productNode', 'Product'); setShowMobileNodeGrid(false); }} className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform group">
                  <div className={`w-12 h-12 border rounded-2xl flex items-center justify-center shadow-lg transition-colors ${isDark
                    ? 'bg-emerald-500/10 border-emerald-500/20 group-hover:bg-emerald-500/20 group-hover:border-emerald-500/30 text-emerald-400'
                    : 'bg-emerald-50 border-emerald-200 group-hover:bg-emerald-100 group-hover:border-emerald-300 text-emerald-600'
                    }`}>
                    <Package className="w-5 h-5" />
                  </div>
                  <span className={`text-[10px] font-medium text-center leading-tight ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Product</span>
                </button>

                <button onClick={() => { addNode('checkoutNode', 'Checkout'); setShowMobileNodeGrid(false); }} className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform group">
                  <div className={`w-12 h-12 border rounded-2xl flex items-center justify-center shadow-lg transition-colors ${isDark
                    ? 'bg-emerald-500/10 border-emerald-500/20 group-hover:bg-emerald-500/20 group-hover:border-emerald-500/30 text-emerald-400'
                    : 'bg-emerald-50 border-emerald-200 group-hover:bg-emerald-100 group-hover:border-emerald-300 text-emerald-600'
                    }`}>
                    <ShoppingCart className="w-5 h-5" />
                  </div>
                  <span className={`text-[10px] font-medium text-center leading-tight ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Checkout</span>
                </button>
              </div>
            </div>

            <div className={`p-4 border-t ${isDark ? 'border-white/10 bg-slate-900/50' : 'border-gray-100 bg-white/50'}`}>
              <button onClick={() => setShowMobileNodeGrid(false)} className={`w-full py-2.5 border rounded-xl font-medium transition-colors text-sm ${isDark
                ? 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white'
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Template Save Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`w-full max-w-md rounded-2xl shadow-2xl ${isDark ? 'bg-slate-900 border border-white/10' : 'bg-white border border-gray-200'}`}>
            <div className={`p-6 border-b ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
              <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Save as Template</h3>
              <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Save your flow as a reusable template. Each node will be validated with an animation.
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Template Name *
                </label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="My Awesome Template"
                  disabled={isSavingTemplate}
                  className={`w-full px-4 py-2.5 rounded-xl border transition-colors ${isDark
                    ? 'bg-white/5 border-white/10 text-white placeholder-slate-500 focus:border-indigo-500/50'
                    : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-indigo-400'
                    } focus:outline-none focus:ring-2 focus:ring-indigo-500/20`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Description (optional)
                </label>
                <textarea
                  value={templateDescription}
                  onChange={(e) => setTemplateDescription(e.target.value)}
                  placeholder="Describe what this template does..."
                  rows={3}
                  disabled={isSavingTemplate}
                  className={`w-full px-4 py-2.5 rounded-xl border transition-colors resize-none ${isDark
                    ? 'bg-white/5 border-white/10 text-white placeholder-slate-500 focus:border-indigo-500/50'
                    : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-indigo-400'
                    } focus:outline-none focus:ring-2 focus:ring-indigo-500/20`}
                />
              </div>

              {/* Admin-only: Make Global Toggle */}
              {isAdmin && (
                <div className={`p-4 rounded-xl border ${isGlobalTemplate
                  ? (isDark ? 'bg-green-500/10 border-green-500/30' : 'bg-green-50 border-green-200')
                  : (isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200')
                  }`}>
                  <label className="flex items-center justify-between cursor-pointer">
                    <div className="flex items-center gap-3">
                      <Globe className={`w-5 h-5 ${isGlobalTemplate
                        ? (isDark ? 'text-green-400' : 'text-green-600')
                        : (isDark ? 'text-slate-400' : 'text-slate-500')
                        }`} />
                      <div>
                        <p className={`font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          Make Global Template
                        </p>
                        <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          Available to all users in the workspace
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsGlobalTemplate(!isGlobalTemplate)}
                      disabled={isSavingTemplate}
                      className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${isGlobalTemplate
                        ? 'bg-green-500'
                        : (isDark ? 'bg-slate-700' : 'bg-slate-300')
                        }`}
                    >
                      <span className={`absolute left-0.5 top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-200 ${isGlobalTemplate
                        ? 'translate-x-5'
                        : 'translate-x-0'
                        }`} />
                    </button>
                  </label>
                </div>
              )}

              {isValidating && (
                <div className={`p-4 rounded-xl ${isDark ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-blue-50 border border-blue-200'}`}>
                  <div className="flex items-center gap-3">
                    <Loader2 className={`w-5 h-5 animate-spin ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                    <span className={`text-sm font-medium ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
                      Validating nodes... Watch the canvas for the orb animation!
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className={`p-6 border-t flex gap-3 ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
              <button
                onClick={() => {
                  setShowTemplateModal(false);
                  setTemplateName('');
                  setTemplateDescription('');
                  setIsGlobalTemplate(false);
                }}
                disabled={isSavingTemplate}
                className={`flex-1 py-2.5 rounded-xl font-medium transition-colors ${isDark
                  ? 'bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10 hover:text-white'
                  : 'bg-slate-100 border border-slate-200 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                  } disabled:opacity-50`}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAsTemplate}
                disabled={isSavingTemplate || !templateName.trim()}
                className="flex-1 py-2.5 rounded-xl font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSavingTemplate ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Validating...
                  </>
                ) : (
                  <>
                    <FileDown className="w-4 h-4" />
                    Save Template
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

// Wrap with ReactFlowProvider for useReactFlow hook
const FlowBuilderWithProvider: React.FC<FlowBuilderProps> = (props) => {
  return (
    <ReactFlowProvider>
      <FlowBuilder {...props} />
    </ReactFlowProvider>
  );
};

export default FlowBuilderWithProvider;