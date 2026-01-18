import React, { useEffect, useState } from 'react';
import { Workspace, Flow, ConnectedPage } from '../types';
import { api } from '../services/api';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Search, MoreHorizontal, Play, Edit, Trash, Zap, Facebook, AlertTriangle, X, LayoutGrid, List, ChevronLeft, ChevronRight, GripVertical, ShoppingCart, FileText, Download, Upload, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import Orders from './Orders';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface FlowsProps {
  workspace: Workspace;
}

// Props interface for the sortable flow card
interface SortableFlowCardProps {
  flow: Flow;
  flowPage: ConnectedPage | null;
  onEdit: (flowId: string) => void;
  onDelete: (flowId: string, flowName: string) => void;
  isDragging?: boolean;
  isDark: boolean;
}

// Sortable Flow Card component for drag-and-drop
const SortableFlowCard: React.FC<SortableFlowCardProps> = ({ flow, flowPage, onEdit, onDelete, isDragging, isDark }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isBeingDragged,
  } = useSortable({ id: flow.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isBeingDragged ? 0.5 : 1,
    zIndex: isBeingDragged ? 50 : 'auto' as any,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative rounded-2xl border overflow-hidden group hover:shadow-[0_0_30px_rgba(99,102,241,0.2)] hover:scale-[1.03] transition-all duration-300 ease-out flex flex-col items-center p-6 text-center 
        ${isDark
          ? 'glass-panel border-white/10 hover:border-indigo-500/50 hover:bg-white/10'
          : 'bg-white border-gray-200 shadow-sm hover:border-indigo-400 hover:shadow-xl'
        }
        ${isBeingDragged ? 'shadow-2xl ring-2 ring-indigo-500/50' : ''}`}
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-3 left-3 p-1.5 text-slate-500 hover:text-indigo-400 hover:bg-white/10 rounded-lg cursor-grab active:cursor-grabbing transition-colors"
        title="Drag to reorder"
      >
        <GripVertical className="w-4 h-4" />
      </div>

      {/* Page Logo Section */}
      <div className="relative mb-4">
        {flowPage ? (
          <div className="relative z-20 transition-transform duration-300">
            <img
              src={flowPage.pageImageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(flowPage.name)}&background=1877F2&color=fff`}
              alt={flowPage.name}
              className={`w-20 h-20 rounded-full shadow-md object-cover ${isDark ? 'bg-slate-800' : 'bg-gray-100'}`}
            />
            <div className={`absolute bottom-0 right-0 rounded-full p-1 shadow-md z-30 ring-2 ${isDark ? 'bg-slate-900 ring-slate-900' : 'bg-white ring-white'}`}>
              <div className="bg-[#1877F2] text-white rounded-full p-1 flex items-center justify-center">
                <Facebook className="w-3 h-3 fill-current" />
              </div>
            </div>
          </div>
        ) : (
          <div className={`w-20 h-20 rounded-full shadow-md flex items-center justify-center ${isDark ? 'bg-slate-800 border-4 border-slate-900' : 'bg-gray-100 border-4 border-white'}`}>
            <Zap className="w-8 h-8 text-slate-500" />
          </div>
        )}
      </div>

      {/* Flow Details */}
      <h3 className={`text-lg font-bold mb-1 truncate w-full ${isDark ? 'text-white' : 'text-slate-900'}`}>{flow.name}</h3>
      <div className={`text-sm mb-4 h-5 ${isDark ? 'text-slate-400' : 'text-slate-500 font-medium'}`}>
        {flowPage ? (
          <span className="truncate max-w-[150px] block mx-auto">{flowPage.name}</span>
        ) : (
          <span>No page assigned</span>
        )}
      </div>

      {/* Status */}
      <div className="mb-6">
        <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${flow.status === 'ACTIVE'
          ? 'bg-green-500 text-white border border-green-600'
          : 'bg-transparent text-slate-500 border border-slate-300 dark:text-slate-400 dark:border-slate-500/30'
          }`}>
          {flow.status}
        </span>
      </div>

      {/* Actions */}
      <div className={`flex items-center gap-2 w-full mt-auto pt-4 justify-center border-t ${isDark ? 'border-white/5' : 'border-slate-100'}`}>
        <button
          onClick={() => onEdit(flow.id)}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors border border-transparent 
            ${isDark ? 'text-slate-300 hover:text-white hover:bg-white/10 hover:border-white/10' : 'text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border-slate-200 hover:border-indigo-100'}`}
        >
          <Edit className="w-3.5 h-3.5" />
          Edit
        </button>
        <button
          onClick={() => onDelete(flow.id, flow.name)}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors border border-transparent 
            ${isDark ? 'text-slate-300 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20' : 'text-slate-500 hover:text-red-600 hover:bg-red-50 border-slate-200 hover:border-red-100'}`}
        >
          <Trash className="w-3.5 h-3.5" />
          Delete
        </button>
      </div>
    </div>
  );
};

// Tab configuration
const TABS = [
  { id: 'flows', label: 'Flows', icon: Zap },
  { id: 'templates', label: 'Templates', icon: FileText },
  { id: 'orders', label: 'Orders', icon: ShoppingCart },
];

const Flows: React.FC<FlowsProps> = ({ workspace }) => {
  const { isDark } = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();

  // Get initial tab from URL or default to 'flows'
  const getInitialTab = (): 'flows' | 'templates' | 'orders' => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'templates' || tabParam === 'orders') return tabParam;
    return 'flows';
  };

  const [activeTab, setActiveTabState] = useState<'flows' | 'templates' | 'orders'>(getInitialTab);

  // Wrapper to update both state and URL
  const setActiveTab = (tab: 'flows' | 'templates' | 'orders') => {
    setActiveTabState(tab);
    if (tab === 'flows') {
      searchParams.delete('tab');
    } else {
      searchParams.set('tab', tab);
    }
    setSearchParams(searchParams, { replace: true });
  };

  const [flows, setFlows] = useState<Flow[]>([]);
  const [pages, setPages] = useState<ConnectedPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const [activeId, setActiveId] = useState<string | null>(null);
  const ITEMS_PER_PAGE = 12;
  const navigate = useNavigate();
  const toast = useToast();

  // Templates state
  const [templates, setTemplates] = useState<any[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(null);
  const [templateViewMode, setTemplateViewMode] = useState<'list' | 'grid'>('grid');

  // dnd-kit sensors setup
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement before starting drag
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Fetch flows and pages in parallel
        const [flowsData, pagesData] = await Promise.all([
          api.workspace.getFlows(workspace.id),
          api.workspace.getConnectedPages(workspace.id)
        ]);

        // Load saved order from localStorage and reorder flows
        const savedOrder = localStorage.getItem(`flows_order_${workspace.id}`);
        if (savedOrder) {
          try {
            const orderArray = JSON.parse(savedOrder) as string[];
            // Sort flows based on saved order
            const orderedFlows = [...flowsData].sort((a, b) => {
              const indexA = orderArray.indexOf(a.id);
              const indexB = orderArray.indexOf(b.id);
              // If not in saved order, put at the end
              if (indexA === -1 && indexB === -1) return 0;
              if (indexA === -1) return 1;
              if (indexB === -1) return -1;
              return indexA - indexB;
            });
            setFlows(orderedFlows);
          } catch (e) {
            console.error('Error parsing saved flow order:', e);
            setFlows(flowsData);
          }
        } else {
          setFlows(flowsData);
        }
        setPages(pagesData);
      } catch (error) {
        console.error('Error loading flows data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [workspace.id]);

  // Get page info from flow configuration (only from trigger/start nodes)
  const getFlowPage = (flow: Flow): ConnectedPage | null => {
    if (!flow.configurations || !flow.nodes) return null;

    // Only look at trigger or start nodes for the page
    for (const node of (flow.nodes as any[])) {
      const nodeType = node.type || node.data?.nodeType;
      const nodeLabel = node.data?.label?.toLowerCase() || '';

      // Only check trigger and start nodes
      if (nodeType === 'triggerNode' || nodeType === 'startNode' ||
        nodeLabel.includes('trigger') || nodeLabel.includes('start') ||
        nodeLabel.includes('new comment')) {
        const config = flow.configurations[node.id];
        if (config?.pageId) {
          return pages.find(p => p.id === config.pageId) || null;
        }
      }
    }
    return null;
  };

  // Delete confirmation modal state
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; flowId: string; flowName: string }>({
    isOpen: false,
    flowId: '',
    flowName: ''
  });
  const [deleting, setDeleting] = useState(false);

  const openDeleteModal = (flowId: string, flowName: string) => {
    setDeleteModal({ isOpen: true, flowId, flowName });
  };

  const closeDeleteModal = () => {
    setDeleteModal({ isOpen: false, flowId: '', flowName: '' });
  };

  const confirmDelete = async () => {
    if (!deleteModal.flowId) return;

    setDeleting(true);
    try {
      await api.workspace.deleteFlow(deleteModal.flowId);
      // Remove from state
      setFlows(flows.filter(f => f.id !== deleteModal.flowId));
      closeDeleteModal();
    } catch (error) {
      console.error('Error deleting flow:', error);
      alert('Failed to delete flow. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const handleCreate = () => {
    // In a real app, create a new flow in DB then redirect
    // For demo, just go to a new ID
    navigate(`/flows/new-${Date.now()}`);
  };

  // Fetch templates when tab becomes active
  useEffect(() => {
    if (activeTab === 'templates') {
      const fetchTemplates = async () => {
        setTemplatesLoading(true);
        try {
          const data = await api.templates.getTemplates(workspace.id);
          setTemplates(data);
        } catch (error) {
          console.error('Error fetching templates:', error);
        } finally {
          setTemplatesLoading(false);
        }
      };
      fetchTemplates();
    }
  }, [activeTab, workspace.id]);

  // Download template as JSON
  const handleDownloadTemplate = (template: any) => {
    // Sanitize data before export (remove private/runtime info)
    const sanitizedNodes = (template.nodes || []).map((node: any) => {
      // Destructure to remove specific fields
      const {
        analytics,
        executionStatus,
        pageId,
        pageName,
        pageImageUrl,
        flowProcessed,
        onDelete,
        onConfigure,
        onClone,
        ...restData
      } = node.data || {};

      return {
        ...node,
        data: restData
      };
    });

    const sanitizedConfigs = { ...template.configurations };
    // Remove page-specific info from configs
    Object.keys(sanitizedConfigs).forEach(key => {
      if (sanitizedConfigs[key]) {
        const { pageId, ...restConfig } = sanitizedConfigs[key];
        sanitizedConfigs[key] = restConfig;
      }
    });

    const dataStr = JSON.stringify({
      name: template.name,
      description: template.description,
      nodes: sanitizedNodes,
      edges: template.edges,
      configurations: sanitizedConfigs,
      exportedAt: new Date().toISOString()
    }, null, 2);

    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${template.name.replace(/[^a-z0-9]/gi, '_')}_template.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Template downloaded!');
  };

  // Delete template
  const handleDeleteTemplate = async (templateId: string) => {
    if (!window.confirm('Are you sure you want to delete this template?')) return;

    setDeletingTemplateId(templateId);
    try {
      await api.templates.deleteTemplate(templateId);
      setTemplates(prev => prev.filter(t => t.id !== templateId));
      toast.success('Template deleted!');
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Failed to delete template');
    } finally {
      setDeletingTemplateId(null);
    }
  };

  // Use template - create new flow from template
  const handleUseTemplate = (template: any) => {
    // Store template in localStorage for FlowBuilder to pick up
    localStorage.setItem('pendingTemplate', JSON.stringify({
      nodes: template.nodes,
      edges: template.edges,
      configurations: template.configurations
    }));
    navigate(`/flows/new-${Date.now()}?template=true`);
    toast.success(`Creating flow from "${template.name}" template`);
  };

  // Import template from JSON file
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleImportTemplate = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const template = JSON.parse(content);

        // Basic validation
        if (!template.nodes || !Array.isArray(template.nodes)) {
          toast.error('Invalid template file: missing nodes');
          return;
        }

        // Save to database
        try {
          const newTemplate = await api.templates.createTemplate(workspace.id, {
            name: template.name || file.name.replace('.json', ''),
            description: template.description || 'Imported via upload',
            nodes: template.nodes,
            edges: template.edges || [],
            configurations: template.configurations || {}
          });

          // Add to state if in templates view
          setTemplates(prev => [newTemplate, ...prev]);
          toast.success('Template imported successfully');
        } catch (apiError) {
          console.error('Error creating template:', apiError);
          toast.error('Failed to save imported template');
        }

        // Reset input
        if (fileInputRef.current) fileInputRef.current.value = '';

      } catch (error) {
        console.error('Error parsing template:', error);
        toast.error('Failed to parse template file');
      }
    };
    reader.readAsText(file);
  };

  // Drag event handlers
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      setFlows((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const newOrder = arrayMove(items, oldIndex, newIndex);

        // Save the new order to localStorage
        const orderArray = newOrder.map((flow) => flow.id);
        localStorage.setItem(`flows_order_${workspace.id}`, JSON.stringify(orderArray));

        return newOrder;
      });
    }
  };

  // Get flow by ID (for DragOverlay)
  const getFlowById = (id: string) => flows.find((flow) => flow.id === id);
  const activeFlow = activeId ? getFlowById(activeId) : null;
  const activeFlowPage = activeFlow ? getFlowPage(activeFlow) : null;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className={`text-3xl font-bold tracking-tight ${isDark ? 'text-white text-glow' : 'text-gray-900'
            }`}>Automations</h1>
          <p className={`mt-1 text-lg ${isDark ? 'text-slate-400' : 'text-gray-600'
            }`}>Build flows to automate conversations</p>
        </div>
        {activeTab === 'flows' && (
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
              onClick={handleCreate}
              className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-indigo-500/20 transition-all active:scale-95 border border-white/20"
            >
              <Plus className="w-5 h-5" />
              New Flow
            </button>
          </div>
        )}
        {activeTab === 'templates' && (
          <div className="flex items-center gap-3">
            <div className={`flex p-1 rounded-xl border ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200 shadow-sm'}`}>
              <button
                onClick={() => setTemplateViewMode('list')}
                className={`p-2 rounded-lg transition-all ${templateViewMode === 'list'
                  ? 'bg-indigo-500 text-white shadow-md'
                  : isDark ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50'
                  }`}
                title="List View"
              >
                <List className="w-5 h-5" />
              </button>
              <button
                onClick={() => setTemplateViewMode('grid')}
                className={`p-2 rounded-lg transition-all ${templateViewMode === 'grid'
                  ? 'bg-indigo-500 text-white shadow-md'
                  : isDark ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50'
                  }`}
                title="Grid View"
              >
                <LayoutGrid className="w-5 h-5" />
              </button>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".json"
              onChange={handleImportTemplate}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-indigo-500/20 transition-all active:scale-95 border border-white/20"
            >
              <Upload className="w-5 h-5" />
              Import Template
            </button>
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className={`flex gap-2 p-1.5 rounded-2xl w-fit ${isDark ? 'bg-white/5' : 'bg-slate-100'}`}>
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'flows' | 'templates' | 'orders')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${isActive
                ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg shadow-purple-500/25'
                : isDark
                  ? 'text-slate-400 hover:text-white hover:bg-white/5'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'flows' && (
        <>
          {viewMode === 'list' ? (
            <div className={`rounded-2xl overflow-hidden border ${isDark ? 'glass-panel border-white/10 text-slate-100' : 'bg-white border-gray-200 shadow-sm text-slate-900'}`}>
              <div className={`p-4 border-b flex flex-col md:flex-row gap-4 ${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50/50 border-slate-100'}`}>
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search flows..."
                    className={`w-full pl-10 pr-4 py-2.5 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent transition-all border ${isDark
                      ? 'bg-black/20 border-white/10 text-white placeholder-slate-500'
                      : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white'
                      }`}
                  />
                </div>
                <select className={`px-4 py-2.5 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all border ${isDark
                  ? 'bg-black/20 border-white/10 text-slate-300'
                  : 'bg-white border-slate-200 text-slate-700'
                  }`}>
                  <option>All Status</option>
                  <option>Active</option>
                  <option>Draft</option>
                </select>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className={`text-xs uppercase font-bold border-b ${isDark
                    ? 'bg-white/5 text-slate-400 border-white/10'
                    : 'bg-slate-50 text-slate-500 border-slate-200'
                    }`}>
                    <tr>
                      <th className="px-6 py-4">Name</th>
                      <th className="px-6 py-4">Page</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Last Updated</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDark ? 'divide-white/5' : 'divide-slate-100'}`}>
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                          <div className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-500"></div>
                          </div>
                        </td>
                      </tr>
                    ) : flows.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map(flow => {
                      const flowPage = getFlowPage(flow);
                      return (
                        <tr key={flow.id} className={`transition-colors group ${isDark ? 'hover:bg-white/5' : 'hover:bg-slate-50'}`}>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-4">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg border ${isDark
                                ? 'bg-indigo-500/20 text-indigo-400 shadow-indigo-500/10 border-indigo-500/20'
                                : 'bg-indigo-50 text-indigo-600 border-indigo-100'
                                }`}>
                                <Zap className="w-5 h-5" />
                              </div>
                              <span className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{flow.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {flowPage ? (
                              <div className="flex items-center gap-3">
                                <img
                                  src={flowPage.pageImageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(flowPage.name)}&background=1877F2&color=fff`}
                                  alt={flowPage.name}
                                  className={`w-8 h-8 rounded-full object-cover border-2 shadow-sm ${isDark ? 'border-blue-500/30' : 'border-white'}`}
                                />
                                <div className="flex flex-col">
                                  <span className={`text-sm font-medium truncate max-w-[150px] ${isDark ? 'text-white' : 'text-slate-900'}`}>{flowPage.name}</span>
                                  <span className="text-xs text-slate-500">Facebook Page</span>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 text-slate-500">
                                <Facebook className="w-4 h-4" />
                                <span className="text-sm">No page assigned</span>
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold ${flow.status === 'ACTIVE'
                              ? 'bg-green-500 text-white border border-green-600'
                              : 'bg-transparent text-slate-500 border border-slate-300 dark:text-slate-400 dark:border-slate-500/30'
                              }`}>
                              {flow.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-500">
                            {format(new Date(flow.updatedAt), 'MMM d, yyyy HH:mm')}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => navigate(`/flows/${flow.id}`)}
                                className={`p-2 rounded-lg transition-colors border ${isDark
                                  ? 'text-slate-400 hover:text-indigo-400 hover:bg-white/5 border-transparent hover:border-white/10'
                                  : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 border-transparent hover:border-indigo-100'
                                  }`}
                                title="Edit Flow"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => openDeleteModal(flow.id, flow.name)}
                                className={`p-2 rounded-lg transition-colors border ${isDark
                                  ? 'text-slate-400 hover:text-red-400 hover:bg-white/5 border-transparent hover:border-white/10'
                                  : 'text-slate-400 hover:text-red-600 hover:bg-red-50 border-transparent hover:border-red-100'
                                  }`}
                                title="Delete Flow"
                              >
                                <Trash className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {flows.length === 0 && !loading && (
                      <tr>
                        <td colSpan={5} className="px-6 py-20 text-center">
                          <div className="flex flex-col items-center justify-center">
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 border ${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-100 border-slate-200'}`}>
                              <Zap className="w-8 h-8 text-slate-500" />
                            </div>
                            <h3 className={`text-lg font-bold mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>No automations yet</h3>
                            <p className={`max-w-xs mx-auto mb-6 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Create your first flow to start automating conversations.</p>
                            <button
                              onClick={handleCreate}
                              className="text-indigo-500 font-bold hover:text-indigo-400 hover:underline"
                            >
                              Create New Flow
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <div className="space-y-6">
                <SortableContext
                  items={flows.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map(f => f.id)}
                  strategy={rectSortingStrategy}
                >
                  {loading ? (
                    <div className="flex items-center justify-center py-20">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                    </div>
                  ) : flows.length === 0 ? (
                    /* Empty State for Grid View */
                    <div className={`flex flex-col items-center justify-center py-20 rounded-2xl border ${isDark ? 'glass-panel border-white/10' : 'bg-white border-slate-200 shadow-sm'}`}>
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 border ${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-100 border-slate-200'}`}>
                        <Zap className="w-8 h-8 text-slate-500" />
                      </div>
                      <h3 className={`text-lg font-bold mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>No automations yet</h3>
                      <p className={`max-w-xs text-center mb-6 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Create your first flow to start automating conversations.</p>
                      <button
                        onClick={handleCreate}
                        className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-indigo-500/20 transition-all active:scale-95 border border-white/20"
                      >
                        <Plus className="w-5 h-5" />
                        Create New Flow
                      </button>
                    </div>
                  ) : (
                    <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                      {flows.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map(flow => {
                        const flowPage = getFlowPage(flow);
                        return (
                          <SortableFlowCard
                            key={flow.id}
                            flow={flow}
                            flowPage={flowPage}
                            onEdit={(flowId) => navigate(`/flows/${flowId}`)}
                            onDelete={openDeleteModal}
                            isDark={isDark}
                          />
                        );
                      })}
                    </div>
                  )}
                </SortableContext>

                {/* Drag Overlay - shows the dragged item */}
                <DragOverlay>
                  {activeFlow ? (
                    <div className={`relative rounded-2xl border-2 border-indigo-500/70 overflow-hidden flex flex-col items-center p-6 text-center shadow-2xl opacity-100 scale-105 
                  ${isDark ? 'glass-panel' : 'bg-white'}`}>
                      {/* Page Logo Section */}
                      <div className="relative mb-4">
                        {activeFlowPage ? (
                          <div className="relative z-20">
                            <img
                              src={activeFlowPage.pageImageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(activeFlowPage.name)}&background=1877F2&color=fff`}
                              alt={activeFlowPage.name}
                              className={`w-20 h-20 rounded-full shadow-md object-cover ${isDark ? 'bg-slate-800' : 'bg-gray-100'}`}
                            />
                            <div className={`absolute bottom-0 right-0 rounded-full p-1 shadow-md z-30 ring-2 ${isDark ? 'bg-slate-900 ring-slate-900' : 'bg-white ring-white'}`}>
                              <div className="bg-[#1877F2] text-white rounded-full p-1 flex items-center justify-center">
                                <Facebook className="w-3 h-3 fill-current" />
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className={`w-20 h-20 rounded-full shadow-md flex items-center justify-center ${isDark ? 'bg-slate-800 border-4 border-slate-900' : 'bg-gray-100 border-4 border-white'}`}>
                            <Zap className="w-8 h-8 text-slate-500" />
                          </div>
                        )}
                      </div>

                      {/* Flow Details */}
                      <h3 className={`text-lg font-bold mb-1 truncate w-full ${isDark ? 'text-white' : 'text-slate-900'}`}>{activeFlow.name}</h3>
                      <div className={`text-sm mb-4 h-5 ${isDark ? 'text-slate-400' : 'text-slate-500 font-medium'}`}>
                        {activeFlowPage ? (
                          <span className="truncate max-w-[150px] block mx-auto">{activeFlowPage.name}</span>
                        ) : (
                          <span>No page assigned</span>
                        )}
                      </div>

                      {/* Status */}
                      <div className="mb-6">
                        <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${activeFlow.status === 'ACTIVE'
                          ? 'bg-green-500 text-white border border-green-600'
                          : 'bg-transparent text-slate-500 border border-slate-300 dark:text-slate-400 dark:border-slate-500/30'
                          }`}>
                          {activeFlow.status}
                        </span>
                      </div>
                    </div>
                  ) : null}
                </DragOverlay>

                {/* Pagination Controls */}
                {Math.ceil(flows.length / ITEMS_PER_PAGE) > 1 && (
                  <div className="flex items-center justify-between border-t border-white/10 pt-4">
                    <p className="text-sm text-slate-400">
                      Showing <span className="font-medium text-white">{((currentPage - 1) * ITEMS_PER_PAGE) + 1}</span> to <span className="font-medium text-white">{Math.min(currentPage * ITEMS_PER_PAGE, flows.length)}</span> of <span className="font-medium text-white">{flows.length}</span> results
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setCurrentPage(p => Math.max(1, p - 1));
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        disabled={currentPage === 1}
                        className="p-2 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.ceil(flows.length / ITEMS_PER_PAGE) }, (_, i) => i + 1).map((page) => (
                          <button
                            key={page}
                            onClick={() => {
                              setCurrentPage(page);
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${currentPage === page
                              ? 'bg-indigo-500 text-white'
                              : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                              }`}
                          >
                            {page}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => {
                          setCurrentPage(p => Math.min(Math.ceil(flows.length / ITEMS_PER_PAGE), p + 1));
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        disabled={currentPage === Math.ceil(flows.length / ITEMS_PER_PAGE)}
                        className="p-2 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </DndContext>
          )}

          {/* Delete Confirmation Modal */}
          {deleteModal.isOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              {/* Backdrop */}
              <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={closeDeleteModal}
              />

              {/* Modal */}
              <div className={`relative rounded-2xl border shadow-2xl max-w-md w-full p-6 animate-fade-in ${isDark
                ? 'bg-slate-800 border-white/10'
                : 'bg-white border-gray-200'
                }`}>
                {/* Close button */}
                <button
                  onClick={closeDeleteModal}
                  className={`absolute top-4 right-4 p-1 transition-colors ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-400 hover:text-slate-600'
                    }`}
                >
                  <X className="w-5 h-5" />
                </button>

                {/* Icon */}
                <div className="flex items-center justify-center w-14 h-14 bg-red-500/20 rounded-full mx-auto mb-4">
                  <AlertTriangle className="w-7 h-7 text-red-500" />
                </div>

                {/* Content */}
                <h3 className={`text-xl font-bold text-center mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>Delete Flow</h3>
                <p className={`text-center mb-6 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Are you sure you want to delete <span className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>"{deleteModal.flowName}"</span>?
                  This action cannot be undone.
                </p>

                {/* Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={closeDeleteModal}
                    className={`flex-1 px-4 py-3 rounded-xl font-semibold transition-colors border ${isDark
                      ? 'bg-white/5 hover:bg-white/10 text-white border-white/10'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                      }`}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDelete}
                    disabled={deleting}
                    className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {deleting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      'Delete'
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <div>
          {templatesLoading ? (
            <div className={`rounded-2xl border p-12 text-center ${isDark ? 'glass-panel border-white/10' : 'bg-white border-slate-200 shadow-sm'}`}>
              <Loader2 className={`w-8 h-8 mx-auto mb-4 animate-spin ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
              <p className={isDark ? 'text-slate-400' : 'text-slate-500'}>Loading templates...</p>
            </div>
          ) : templates.length === 0 ? (
            <div className={`rounded-2xl border p-8 text-center ${isDark ? 'glass-panel border-white/10' : 'bg-white border-slate-200 shadow-sm'}`}>
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${isDark ? 'bg-white/5' : 'bg-slate-100'}`}>
                <FileText className={`w-8 h-8 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
              </div>
              <h3 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>No Templates Yet</h3>
              <p className={`mb-6 max-w-md mx-auto ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Save your automation flows as templates from the Flow Builder. Look for the "Save Template" button in the toolbar.
              </p>
            </div>
          ) : templateViewMode === 'list' ? (
            <div className={`rounded-2xl overflow-hidden border ${isDark ? 'glass-panel border-white/10 text-slate-100' : 'bg-white border-gray-200 shadow-sm text-slate-900'}`}>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className={`text-xs uppercase font-bold border-b ${isDark
                    ? 'bg-white/5 text-slate-400 border-white/10'
                    : 'bg-slate-50 text-slate-500 border-slate-200'
                    }`}>
                    <tr>
                      <th className="px-6 py-4">Name</th>
                      <th className="px-6 py-4">Description</th>
                      <th className="px-6 py-4">Nodes</th>
                      <th className="px-6 py-4">Created</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDark ? 'divide-white/5' : 'divide-slate-100'}`}>
                    {templates.map((template) => (
                      <tr key={template.id} className={`transition-colors group ${isDark ? 'hover:bg-white/5' : 'hover:bg-slate-50'}`}>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg border ${isDark
                              ? 'bg-indigo-500/20 text-indigo-400 shadow-indigo-500/10 border-indigo-500/20'
                              : 'bg-indigo-50 text-indigo-600 border-indigo-100'
                              }`}>
                              <FileText className="w-5 h-5" />
                            </div>
                            <span className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{template.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className={`text-sm truncate max-w-[200px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            {template.description || '-'}
                          </p>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500">
                          {template.nodes?.length || 0}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500">
                          {format(new Date(template.createdAt), 'MMM d, yyyy')}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleUseTemplate(template)}
                              className={`p-2 rounded-lg transition-colors border ${isDark
                                ? 'text-indigo-400 hover:text-white hover:bg-indigo-500/20 border-transparent hover:border-indigo-500/30'
                                : 'text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 border-transparent hover:border-indigo-100'
                                }`}
                              title="Use Template"
                            >
                              <Play className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDownloadTemplate(template)}
                              className={`p-2 rounded-lg transition-colors border ${isDark
                                ? 'text-slate-400 hover:text-white hover:bg-white/5 border-transparent hover:border-white/10'
                                : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50 border-transparent hover:border-slate-200'
                                }`}
                              title="Download JSON"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteTemplate(template.id)}
                              disabled={deletingTemplateId === template.id}
                              className={`p-2 rounded-lg transition-colors border disabled:opacity-50 ${isDark
                                ? 'text-slate-400 hover:text-red-400 hover:bg-white/5 border-transparent hover:border-white/10'
                                : 'text-slate-400 hover:text-red-600 hover:bg-red-50 border-transparent hover:border-red-100'
                                }`}
                              title="Delete Template"
                            >
                              {deletingTemplateId === template.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {templates.map((template) => (
                <div key={template.id} className={`rounded-2xl border p-5 transition-all hover:shadow-lg ${isDark
                  ? 'glass-panel border-white/10 hover:border-indigo-500/30'
                  : 'bg-white border-slate-200 shadow-sm hover:border-indigo-300'}`}>
                  {/* Template Icon */}
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${isDark ? 'bg-indigo-500/20' : 'bg-indigo-100'}`}>
                    <FileText className={`w-6 h-6 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
                  </div>

                  {/* Template Name */}
                  <h3 className={`font-bold mb-1 truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {template.name}
                  </h3>

                  {/* Template Info */}
                  <p className={`text-xs mb-3 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                    {template.nodes?.length || 0} nodes • Created {format(new Date(template.createdAt), 'MMM d, yyyy')}
                  </p>

                  {/* Description */}
                  {template.description && (
                    <p className={`text-sm mb-4 line-clamp-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      {template.description}
                    </p>
                  )}

                  {/* Actions */}
                  <div className={`flex items-center gap-2 pt-3 border-t ${isDark ? 'border-white/5' : 'border-slate-100'}`}>
                    <button
                      onClick={() => handleUseTemplate(template)}
                      className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${isDark
                        ? 'bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30'
                        : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`}
                    >
                      <Play className="w-3.5 h-3.5" />
                      Use
                    </button>
                    <button
                      onClick={() => handleDownloadTemplate(template)}
                      className={`flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${isDark
                        ? 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                        : 'bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-700'}`}
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteTemplate(template.id)}
                      disabled={deletingTemplateId === template.id}
                      className={`flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors disabled:opacity-50 ${isDark
                        ? 'bg-white/5 text-slate-400 hover:bg-red-500/20 hover:text-red-400'
                        : 'bg-slate-50 text-slate-500 hover:bg-red-50 hover:text-red-500'}`}
                    >
                      {deletingTemplateId === template.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      )
      }

      {/* Orders Tab */}
      {
        activeTab === 'orders' && (
          <Orders workspace={workspace} />
        )
      }
    </div >
  );
};

export default Flows;