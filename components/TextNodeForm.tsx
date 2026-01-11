import React, { useState, useEffect } from 'react';
import { Clock, MessageSquare, Plus, X, Link, ChevronDown, Zap, PlusCircle, Tag, TrendingUp, TrendingDown, ArrowRight, ShoppingBag, Smartphone, Tablet, Monitor, Save, Check, Eye, ChevronLeft, ChevronRight, ChevronUp } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { api } from '../services/api';

interface Button {
    title: string;
    type: 'startFlow' | 'url' | 'newFlow';
    flowId?: string;
    url?: string;
    webviewHeight?: 'compact' | 'tall' | 'full';
    flowName?: string; // For newFlow type - name of the flow to create
    addLabel?: string; // Label to add when button clicked
    removeLabel?: string; // Label to remove when button clicked
}

interface TextNodeFormProps {
    workspaceId: string;
    pageId?: string;
    initialConfig?: {
        textContent?: string;
        delaySeconds?: number;
        buttons?: Button[];
    };
    onChange: (config: any) => void;
    onSave?: () => void; // Callback to trigger FlowBuilder's handleSaveConfig
    onClose?: () => void;
}

// Collapsible Section Component
const CollapsibleSection = ({
    title,
    icon: Icon,
    children,
    defaultOpen = true
}: {
    title: string;
    icon?: React.ElementType;
    children: React.ReactNode;
    defaultOpen?: boolean;
}) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="bg-black/20 rounded-xl overflow-hidden border border-white/5">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
            >
                <div className="flex items-center gap-2">
                    {Icon && <Icon className="w-4 h-4 text-amber-400" />}
                    <span className="text-sm font-semibold text-white">{title}</span>
                </div>
                {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
            </button>
            {isOpen && (
                <div className="px-4 pb-4 space-y-4 border-t border-white/5">
                    {children}
                </div>
            )}
        </div>
    );
};

const TextNodeForm: React.FC<TextNodeFormProps> = ({
    workspaceId,
    pageId,
    initialConfig,
    onChange,
    onSave,
    onClose
}) => {
    const [textContent, setTextContent] = useState(initialConfig?.textContent || '');
    const [delaySeconds, setDelaySeconds] = useState(initialConfig?.delaySeconds || 0);
    const [buttons, setButtons] = useState<Button[]>(
        initialConfig?.buttons || []
    );
    const [startFlows, setStartFlows] = useState<any[]>([]);
    const [pages, setPages] = useState<any[]>([]);
    const [openFlowDropdown, setOpenFlowDropdown] = useState<number | null>(null);
    const [openLabelDropdown, setOpenLabelDropdown] = useState<number | null>(null);
    const [workspaceLabels, setWorkspaceLabels] = useState<string[]>([]);

    // UI State
    const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
    const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('mobile');
    const [saveNotification, setSaveNotification] = useState(false);
    const [mobileStep, setMobileStep] = useState(0);
    const [showMobilePreview, setShowMobilePreview] = useState(false);

    // Handle window resize
    useEffect(() => {
        const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Modal widths based on preview device - use full width
    const modalWidths: Record<string, string> = {
        mobile: 'w-full',
        tablet: 'w-full',
        desktop: 'w-full'
    };

    // Fetch flows and labels on mount
    useEffect(() => {
        if (workspaceId) {
            fetchStartFlows();
            fetchWorkspaceLabels();
        }
    }, [workspaceId, pageId]);

    const fetchWorkspaceLabels = async () => {
        try {
            const labels = await api.workspace.getWorkspaceLabels(workspaceId);
            setWorkspaceLabels(labels);
        } catch (error) {
            console.error('Error fetching workspace labels:', error);
        }
    };

    const fetchStartFlows = async () => {
        console.log('TextNodeForm: Fetching flows for workspace:', workspaceId, 'pageId:', pageId);

        // Fetch flows and pages in parallel
        const [flowsResult, pagesResult] = await Promise.all([
            supabase
                .from('flows')
                .select('id, name, nodes, configurations')
                .eq('workspace_id', workspaceId)
                .eq('status', 'ACTIVE'),
            supabase
                .from('connected_pages')
                .select('id, name, page_image_url')
                .eq('workspace_id', workspaceId)
        ]);

        const { data: flows, error } = flowsResult;
        const { data: pagesData } = pagesResult;

        if (pagesData) {
            setPages(pagesData);
        }

        console.log('TextNodeForm: Flows query result:', { flows, error });

        if (!error && flows) {
            // Filter flows that have Start nodes
            let filteredFlows = flows.filter(flow => {
                const nodes = flow.nodes || [];
                const hasStartNode = nodes.some((n: any) => n.type === 'startNode');
                return hasStartNode;
            });

            // If pageId is provided, further filter by flows that belong to this page
            if (pageId) {
                filteredFlows = filteredFlows.filter(flow => {
                    const nodes = flow.nodes || [];
                    const configurations = flow.configurations || {};

                    // Check if any trigger or start node is configured for this page
                    for (const node of nodes) {
                        const nodeType = node.type || node.data?.nodeType;
                        const nodeLabel = node.data?.label?.toLowerCase() || '';

                        if (nodeType === 'triggerNode' || nodeType === 'startNode' ||
                            nodeLabel.includes('trigger') || nodeLabel.includes('start') ||
                            nodeLabel.includes('new comment')) {
                            const config = configurations[node.id];
                            if (config?.pageId === pageId) {
                                return true;
                            }
                        }
                    }
                    return false;
                });
            }

            // Enrich flows with page info
            const enrichedFlows = filteredFlows.map(flow => {
                const nodes = flow.nodes || [];
                const configurations = flow.configurations || {};
                let flowPageId = null;

                // Find the page associated with this flow
                for (const node of nodes) {
                    const nodeType = node.type || node.data?.nodeType;
                    const nodeLabel = node.data?.label?.toLowerCase() || '';

                    if (nodeType === 'triggerNode' || nodeType === 'startNode' ||
                        nodeLabel.includes('trigger') || nodeLabel.includes('start') ||
                        nodeLabel.includes('new comment')) {
                        const config = configurations[node.id];
                        if (config?.pageId) {
                            flowPageId = config.pageId;
                            break;
                        }
                    }
                }

                const page = pagesData?.find((p: any) => p.id === flowPageId);
                return {
                    ...flow,
                    pageName: page?.name || 'No page',
                    pageImageUrl: page?.page_image_url || null
                };
            });

            console.log('TextNodeForm: Enriched flows:', enrichedFlows);
            setStartFlows(enrichedFlows);
        } else if (error) {
            console.error('TextNodeForm: Error fetching flows:', error);
        }
    };

    const notifyChange = (
        newTextContent: string,
        newDelaySeconds: number,
        newButtons: Button[]
    ) => {
        const validButtons = newButtons.filter(b => {
            if (!b.title.trim()) return false;
            if (b.type === 'startFlow') return !!b.flowId;
            if (b.type === 'url') return !!b.url?.trim();
            if (b.type === 'newFlow') return true; // New Flow just needs a title
            return false;
        });
        onChange({ textContent: newTextContent, delaySeconds: newDelaySeconds, buttons: validButtons });
    };

    const handleTextChange = (value: string) => {
        setTextContent(value);
        notifyChange(value, delaySeconds, buttons);
    };

    const handleDelayChange = (value: number) => {
        setDelaySeconds(value);
        notifyChange(textContent, value, buttons);
    };

    const addButton = () => {
        if (buttons.length < 3) {
            const newButtons = [...buttons, { title: '', type: 'url' as const, webviewHeight: 'full' as const }];
            setButtons(newButtons);
            notifyChange(textContent, delaySeconds, newButtons);
        }
    };

    const removeButton = (index: number) => {
        const newButtons = buttons.filter((_, i) => i !== index);
        setButtons(newButtons);
        notifyChange(textContent, delaySeconds, newButtons);
    };

    const updateButton = (index: number, updates: Partial<Button>) => {
        const newButtons = [...buttons];
        newButtons[index] = { ...newButtons[index], ...updates };
        setButtons(newButtons);
        notifyChange(textContent, delaySeconds, newButtons);
    };

    // ================== PREVIEW (DEVICE MOCKUP) ==================
    const deviceSizes = {
        mobile: { width: 320, height: 580, radius: 40, notch: true },
        tablet: { width: 420, height: 560, radius: 24, notch: false },
        desktop: { width: 600, height: 400, radius: 12, notch: false }
    };

    const DevicePreview = () => {
        const size = deviceSizes[previewDevice];
        const getFontSize = () => {
            return previewDevice === 'desktop' ? 'text-[10px]' : previewDevice === 'tablet' ? 'text-sm' : 'text-sm';
        };
        const getButtonFontSize = () => {
            return previewDevice === 'desktop' ? 'text-[8px]' : 'text-xs';
        };
        const getScreenBg = () => {
            return previewDevice === 'desktop' ? 'bg-white' : 'bg-gradient-to-b from-slate-100 to-slate-200';
        };
        const getStatusBarStyle = () => {
            return previewDevice === 'desktop'
                ? 'text-slate-500 bg-slate-100 border-b border-slate-200'
                : 'text-slate-600';
        };

        return (
            <div className="flex flex-col items-center">
                <div className="relative" style={{ width: size.width, height: size.height }}>
                    {/* Device Frame */}
                    <div
                        className={`w-full h-full shadow-2xl border-4 flex flex-col ${previewDevice === 'desktop' ? 'bg-slate-200 border-slate-400' : 'bg-slate-900 border-slate-700'}`}
                        style={{ borderRadius: size.radius }}
                    >
                        {/* Notch (mobile only) */}
                        {size.notch && (
                            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-20 h-5 bg-black rounded-full z-10" />
                        )}
                        {/* Screen */}
                        <div
                            className={`w-full h-full overflow-hidden flex flex-col ${getScreenBg()}`}
                            style={{ borderRadius: Math.max(size.radius - 6, 4) }}
                        >
                            {/* Status bar / Browser bar */}
                            <div className={`h-5 flex-shrink-0 flex items-center justify-between px-3 text-[9px] ${getStatusBarStyle()}`}>
                                {previewDevice === 'desktop' ? (
                                    <>
                                        <div className="flex items-center gap-1">
                                            <div className="w-2 h-2 rounded-full bg-red-400"></div>
                                            <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
                                            <div className="w-2 h-2 rounded-full bg-green-400"></div>
                                        </div>
                                        <span className="text-[8px] text-slate-400">Messenger</span>
                                        <div></div>
                                    </>
                                ) : (
                                    <>
                                        <span>9:41</span>
                                        <span>⚡ 100%</span>
                                    </>
                                )}
                            </div>
                            {/* Chat Header */}
                            <div className={`flex items-center gap-2 px-3 ${previewDevice === 'desktop' ? 'py-1' : 'py-2'} bg-gradient-to-r from-blue-500 to-blue-600 text-white`}>
                                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                                    <MessageSquare className="w-3 h-3" />
                                </div>
                                <span className={`font-semibold ${previewDevice === 'desktop' ? 'text-[10px]' : 'text-xs'}`}>Page Name</span>
                            </div>
                            {/* Chat Content */}
                            <div className="flex-1 p-3 overflow-y-auto">
                                {/* Message Bubble */}
                                {textContent && (
                                    <div className="mb-2">
                                        <div className={`bg-slate-200 rounded-2xl rounded-tl-sm px-3 py-2 ${getFontSize()} text-slate-800 max-w-[90%] whitespace-pre-wrap`}>
                                            {textContent}
                                        </div>
                                    </div>
                                )}
                                {/* Quick Reply Buttons */}
                                {buttons.filter(b => b.title).length > 0 && (
                                    <div className={`flex flex-wrap gap-1.5 ${previewDevice === 'desktop' ? 'mt-1' : 'mt-2'}`}>
                                        {buttons.filter(b => b.title).map((btn, i) => (
                                            <button
                                                key={i}
                                                className={`inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-blue-500 rounded-full ${getButtonFontSize()} text-blue-500 font-medium shadow-sm`}
                                            >
                                                {btn.type === 'url' && <Link className="w-3 h-3" />}
                                                {btn.type === 'startFlow' && <Zap className="w-3 h-3" />}
                                                {btn.type === 'newFlow' && <PlusCircle className="w-3 h-3 text-green-500" />}
                                                {btn.title}
                                            </button>
                                        ))}
                                    </div>
                                )}
                                {/* Delay indicator */}
                                {delaySeconds > 0 && (
                                    <div className={`mt-2 flex items-center gap-1 text-slate-400 ${previewDevice === 'desktop' ? 'text-[8px]' : 'text-[10px]'}`}>
                                        <Clock className="w-3 h-3" />
                                        <span>Sent after {delaySeconds}s delay</span>
                                    </div>
                                )}
                            </div>
                            {/* Home indicator (mobile only) */}
                            {size.notch && (
                                <div className="h-4 flex-shrink-0 flex items-center justify-center">
                                    <div className="w-20 h-1 bg-slate-400/50 rounded-full" />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // ================== FORM SECTIONS ==================
    const messageSection = (
        <CollapsibleSection title="Message Content" icon={MessageSquare} defaultOpen={true}>
            <div className="pt-4">
                <label className="block text-xs font-medium text-slate-400 mb-2">
                    Message Text
                </label>
                <textarea
                    value={textContent}
                    onChange={(e) => handleTextChange(e.target.value)}
                    placeholder="Enter the message you want to send to users..."
                    rows={4}
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-amber-500/50 outline-none transition-all placeholder-slate-500 resize-y min-h-[100px] text-sm"
                />
                <p className="mt-2 text-xs text-green-400">
                    ✓ This text message will be sent to users when this node is executed.
                </p>
            </div>
            <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">
                    <Clock className="w-3 h-3 inline mr-1" />
                    Delay Before Sending (seconds)
                </label>
                <input
                    type="number"
                    min="0"
                    max="300"
                    value={delaySeconds}
                    onChange={(e) => handleDelayChange(parseInt(e.target.value) || 0)}
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:ring-2 focus:ring-amber-500/50 outline-none transition-all text-sm"
                />
                <p className="mt-1.5 text-xs text-slate-500">
                    Wait this many seconds before sending the message (0-300 seconds).
                </p>
            </div>
        </CollapsibleSection>
    );

    const buttonsSection = (
        <CollapsibleSection title="Quick Reply Buttons" icon={MessageSquare} defaultOpen={true}>
            <div className="pt-4">
                <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-slate-400">Optional, max 3 buttons</span>
                    <button
                        type="button"
                        onClick={addButton}
                        disabled={buttons.length >= 3}
                        className="px-3 py-1 bg-amber-500 text-white text-xs rounded-lg hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                    >
                        <Plus className="w-3 h-3" />
                        Add Button
                    </button>
                </div>

                <div className="space-y-3">
                    {buttons.map((button, index) => (
                        <div key={index} className="p-3 bg-black/20 border border-white/10 rounded-xl space-y-3">
                            {/* Button Title */}
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Button Text</label>
                                <input
                                    type="text"
                                    value={button.title}
                                    onChange={(e) => updateButton(index, { title: e.target.value })}
                                    placeholder="e.g., Learn More"
                                    className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-amber-500/50 outline-none"
                                    maxLength={20}
                                />
                            </div>

                            {/* Button Type */}
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Button Action</label>
                                <select
                                    value={button.type}
                                    onChange={(e) => {
                                        const newType = e.target.value as Button['type'];
                                        updateButton(index, {
                                            type: newType,
                                            flowId: newType === 'startFlow' ? '' : undefined,
                                            url: newType === 'url' ? '' : undefined,
                                            webviewHeight: newType === 'url' ? 'full' : undefined,
                                            flowName: newType === 'newFlow' ? '' : undefined
                                        });
                                    }}
                                    className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-amber-500/50 outline-none"
                                >
                                    <option value="startFlow">⚡ Trigger Saved Flow</option>
                                    <option value="url">🔗 Open URL (Webview)</option>
                                    <option value="newFlow">➕ Start New Flow</option>
                                </select>
                                <p className="text-xs text-slate-500 mt-1">
                                    {button.type === 'startFlow' && '⚡ Triggers an existing saved flow from this page'}
                                    {button.type === 'url' && '🔗 Opens a URL in a webview'}
                                    {button.type === 'newFlow' && '➕ Creates a new flow with Start Node and Text Node'}
                                </p>
                            </div>

                            {/* Flow Selector - Custom Dropdown */}
                            {button.type === 'startFlow' && (
                                <div className="relative">
                                    <label className="block text-xs text-slate-400 mb-1">Select Flow</label>

                                    {/* Custom Dropdown Trigger */}
                                    <button
                                        type="button"
                                        onClick={() => setOpenFlowDropdown(openFlowDropdown === index ? null : index)}
                                        className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2.5 text-left text-sm focus:ring-2 focus:ring-amber-500/50 outline-none flex items-center justify-between hover:bg-white/5 transition-colors"
                                    >
                                        {button.flowId ? (
                                            <div className="flex items-center gap-2">
                                                {(() => {
                                                    const selectedFlow = startFlows.find(f => f.id === button.flowId);
                                                    return selectedFlow ? (
                                                        <>
                                                            {selectedFlow.pageImageUrl ? (
                                                                <img
                                                                    src={selectedFlow.pageImageUrl}
                                                                    alt={selectedFlow.pageName}
                                                                    className="w-6 h-6 rounded-full object-cover border border-white/20"
                                                                />
                                                            ) : (
                                                                <div className="w-6 h-6 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                                                                    <Zap className="w-3 h-3 text-amber-400" />
                                                                </div>
                                                            )}
                                                            <span className="text-white truncate">{selectedFlow.name}</span>
                                                        </>
                                                    ) : (
                                                        <span className="text-slate-400">Select a flow...</span>
                                                    );
                                                })()}
                                            </div>
                                        ) : (
                                            <span className="text-slate-400">Select a flow...</span>
                                        )}
                                        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${openFlowDropdown === index ? 'rotate-180' : ''}`} />
                                    </button>

                                    {/* Custom Dropdown Options */}
                                    {openFlowDropdown === index && (
                                        <div className="absolute z-50 w-full mt-1 bg-slate-800 border border-white/10 rounded-lg shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                            <div className="max-h-48 overflow-y-auto">
                                                {startFlows.length === 0 ? (
                                                    <div className="px-3 py-4 text-center">
                                                        <Zap className="w-6 h-6 text-slate-500 mx-auto mb-2" />
                                                        <p className="text-xs text-amber-400">No flows with Start nodes found</p>
                                                    </div>
                                                ) : (
                                                    startFlows.map(flow => (
                                                        <button
                                                            key={flow.id}
                                                            type="button"
                                                            onClick={() => {
                                                                updateButton(index, { flowId: flow.id });
                                                                setOpenFlowDropdown(null);
                                                            }}
                                                            className={`w-full px-3 py-2.5 flex items-center gap-3 hover:bg-white/10 transition-colors text-left ${button.flowId === flow.id ? 'bg-amber-500/20' : ''
                                                                }`}
                                                        >
                                                            {flow.pageImageUrl ? (
                                                                <img
                                                                    src={flow.pageImageUrl}
                                                                    alt={flow.pageName}
                                                                    className="w-8 h-8 rounded-full object-cover border-2 border-white/20 flex-shrink-0"
                                                                />
                                                            ) : (
                                                                <div className="w-8 h-8 rounded-full bg-amber-500/20 border-2 border-amber-500/30 flex items-center justify-center flex-shrink-0">
                                                                    <Zap className="w-4 h-4 text-amber-400" />
                                                                </div>
                                                            )}
                                                            <div className="flex-1 min-w-0">
                                                                <p className={`text-sm font-medium truncate ${button.flowId === flow.id ? 'text-amber-300' : 'text-white'}`}>
                                                                    {flow.name}
                                                                </p>
                                                                <p className="text-xs text-slate-500 truncate">{flow.pageName}</p>
                                                            </div>
                                                            {button.flowId === flow.id && (
                                                                <div className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
                                                            )}
                                                        </button>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* URL Input */}
                            {button.type === 'url' && (
                                <>
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">URL</label>
                                        <input
                                            type="url"
                                            value={button.url || ''}
                                            onChange={(e) => updateButton(index, { url: e.target.value })}
                                            placeholder="https://example.com"
                                            className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-amber-500/50 outline-none"
                                        />
                                    </div>

                                    {/* Webview Type */}
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Webview Size</label>
                                        <div className="flex gap-2">
                                            {(['compact', 'tall', 'full'] as const).map((size) => (
                                                <button
                                                    key={size}
                                                    type="button"
                                                    onClick={() => updateButton(index, { webviewHeight: size })}
                                                    className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${button.webviewHeight === size
                                                        ? 'bg-amber-500 text-white'
                                                        : 'bg-white/5 text-slate-400 hover:bg-white/10'
                                                        }`}
                                                >
                                                    {size.charAt(0).toUpperCase() + size.slice(1)}
                                                </button>
                                            ))}
                                        </div>
                                        <p className="text-xs text-slate-500 mt-1">
                                            {button.webviewHeight === 'compact' && 'Opens a small webview (50% screen height)'}
                                            {button.webviewHeight === 'tall' && 'Opens a tall webview (75% screen height)'}
                                            {button.webviewHeight === 'full' && 'Opens a full-screen webview'}
                                        </p>
                                    </div>
                                </>
                            )}

                            {/* New Flow Configuration */}
                            {button.type === 'newFlow' && (
                                <>
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Flow Name</label>
                                        <input
                                            type="text"
                                            value={button.flowName || ''}
                                            onChange={(e) => updateButton(index, { flowName: e.target.value })}
                                            placeholder="e.g., Pricing Flow, FAQ Response"
                                            className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-green-500/50 outline-none"
                                        />
                                    </div>
                                    <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                                        <div className="flex items-center gap-2 text-green-400 text-xs">
                                            <PlusCircle className="w-4 h-4" />
                                            <span className="font-medium">Start New Flow</span>
                                        </div>
                                        <p className="text-xs text-green-300/70 mt-1">
                                            Creates a new flow with Start Node and Text Node connected. The flow will be saved and available in Flows list.
                                        </p>
                                    </div>
                                </>
                            )}

                            {/* Label Management */}

                            <div className="border-t border-white/10 pt-3">
                                <div className="flex items-center gap-2 mb-2">
                                    <Tag className="w-3 h-3 text-purple-400" />
                                    <span className="text-xs font-medium text-purple-300">Label Management (optional)</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Add Label</label>
                                        <input
                                            type="text"
                                            value={button.addLabel || ''}
                                            onChange={(e) => updateButton(index, { addLabel: e.target.value })}
                                            placeholder="e.g., 50% Interested"
                                            className="w-full bg-black/20 border border-white/10 rounded-lg px-2 py-1.5 text-white text-xs focus:ring-2 focus:ring-purple-500/50 outline-none"
                                        />
                                    </div>
                                    <div className="relative">
                                        <label className="block text-xs text-slate-400 mb-1">Remove Label</label>
                                        {/* Custom Dropdown Trigger */}
                                        <button
                                            type="button"
                                            onClick={() => setOpenLabelDropdown(openLabelDropdown === index ? null : index)}
                                            className="w-full bg-black/20 border border-white/10 rounded-lg px-2 py-1.5 text-left text-xs focus:ring-2 focus:ring-purple-500/50 outline-none flex items-center justify-between hover:bg-white/5 transition-colors"
                                        >
                                            <span className={button.removeLabel ? 'text-white' : 'text-slate-400'}>
                                                {button.removeLabel || 'None'}
                                            </span>
                                            <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${openLabelDropdown === index ? 'rotate-180' : ''}`} />
                                        </button>

                                        {/* Custom Dropdown Options */}
                                        {openLabelDropdown === index && (
                                            <div className="absolute z-50 w-full mt-1 bg-slate-800 border border-white/10 rounded-lg shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                                <div className="max-h-32 overflow-y-auto">
                                                    {/* None option */}
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            updateButton(index, { removeLabel: '' });
                                                            setOpenLabelDropdown(null);
                                                        }}
                                                        className={`w-full px-2 py-1.5 text-left text-xs hover:bg-white/10 transition-colors flex items-center gap-2 ${!button.removeLabel ? 'bg-purple-500/20 text-purple-300' : 'text-slate-300'}`}
                                                    >
                                                        <X className="w-3 h-3" />
                                                        <span>None</span>
                                                    </button>
                                                    {/* Label options */}
                                                    {workspaceLabels.map(label => (
                                                        <button
                                                            key={label}
                                                            type="button"
                                                            onClick={() => {
                                                                updateButton(index, { removeLabel: label });
                                                                setOpenLabelDropdown(null);
                                                            }}
                                                            className={`w-full px-2 py-1.5 text-left text-xs hover:bg-white/10 transition-colors flex items-center gap-2 ${button.removeLabel === label ? 'bg-purple-500/20 text-purple-300' : 'text-slate-300'}`}
                                                        >
                                                            <Tag className="w-3 h-3 text-purple-400" />
                                                            <span>{label}</span>
                                                        </button>
                                                    ))}
                                                    {workspaceLabels.length === 0 && (
                                                        <div className="px-2 py-2 text-xs text-slate-500 text-center">
                                                            No labels configured in flows yet
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <p className="text-xs text-slate-500 mt-1">
                                    Labels update when user clicks this button
                                </p>
                            </div>

                            {/* Remove Button */}
                            <button
                                type="button"
                                onClick={() => removeButton(index)}
                                className="w-full px-3 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 text-xs font-medium"
                            >
                                Remove Button
                            </button>
                        </div>
                    ))}
                </div>

                {buttons.length === 0 && (
                    <p className="text-xs text-slate-500 mt-2">
                        Optionally add buttons. Buttons can link to existing flows, URLs, or create new flows.
                    </p>
                )}
            </div>
        </CollapsibleSection>
    );

    // WIZARD STEPS for mobile
    const WIZARD_STEPS = [
        { id: 'message', title: 'Message', icon: MessageSquare },
        { id: 'buttons', title: 'Buttons', icon: Plus }
    ];

    // ================== DESKTOP: 3-Column Layout ==================
    if (isDesktop) {
        return (
            <div className="w-full h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-[15px] flex items-center justify-center">
                <div className="w-full max-w-7xl h-full max-h-full flex flex-col bg-slate-800/50 rounded-2xl border border-white/10 overflow-hidden transition-all duration-300">
                    {/* Header with Device Switcher */}
                    <div className="flex-shrink-0 h-14 border-b border-white/10 flex items-center px-4 gap-4">
                        {/* Left: Title */}
                        <div className="flex items-center gap-3 min-w-0 flex-shrink-0">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                                <MessageSquare className="w-4 h-4 text-white" />
                            </div>
                            <span className="text-base font-bold text-white whitespace-nowrap">Text Message</span>
                        </div>

                        {/* Center: Device Switcher */}
                        <div className="flex-1 flex justify-center">
                            <div className="flex items-center gap-1 bg-slate-700/50 rounded-lg p-1 border border-white/10">
                                <button
                                    type="button"
                                    onClick={() => setPreviewDevice('mobile')}
                                    className={`p-2 rounded-md transition-all ${previewDevice === 'mobile' ? 'bg-amber-500 text-white' : 'text-slate-400 hover:text-white hover:bg-white/10'}`}
                                    title="Mobile"
                                >
                                    <Smartphone className="w-4 h-4" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPreviewDevice('tablet')}
                                    className={`p-2 rounded-md transition-all ${previewDevice === 'tablet' ? 'bg-amber-500 text-white' : 'text-slate-400 hover:text-white hover:bg-white/10'}`}
                                    title="Tablet"
                                >
                                    <Tablet className="w-4 h-4" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPreviewDevice('desktop')}
                                    className={`p-2 rounded-md transition-all ${previewDevice === 'desktop' ? 'bg-amber-500 text-white' : 'text-slate-400 hover:text-white hover:bg-white/10'}`}
                                    title="Desktop"
                                >
                                    <Monitor className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Right: Save + Close */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                                type="button"
                                onClick={() => {
                                    // Call the FlowBuilder's save handler
                                    if (onSave) {
                                        onSave();
                                    }
                                    // Show success notification
                                    setSaveNotification(true);
                                    setTimeout(() => setSaveNotification(false), 3000);
                                }}
                                className="flex items-center gap-1.5 px-4 py-1.5 bg-amber-500 hover:bg-amber-600 rounded-lg text-white text-xs font-medium transition-colors"
                                title="Save Configuration"
                            >
                                <Save className="w-3.5 h-3.5" />
                                <span>Save</span>
                            </button>
                            {onClose && (
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
                                    title="Close"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>

                        {/* Save Notification Toast */}
                        {saveNotification && (
                            <div className="absolute top-16 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-fade-in z-50">
                                <Check className="w-4 h-4" />
                                <span className="text-sm font-medium">Settings saved successfully!</span>
                            </div>
                        )}
                    </div>

                    {/* Content - 3-Column Layout */}
                    {previewDevice === 'desktop' ? (
                        // Desktop: 3-Column Layout
                        <div className="flex-1 grid grid-cols-12 gap-0 overflow-hidden">
                            <div className="col-span-4 border-r border-white/10 p-6 overflow-y-auto custom-scrollbar">
                                {messageSection}
                            </div>
                            <div className="col-span-4 border-r border-white/10 p-6 overflow-y-auto custom-scrollbar">
                                {buttonsSection}
                            </div>
                            <div className="col-span-4 p-6 flex items-center justify-center bg-slate-950/50 overflow-auto">
                                <DevicePreview />
                            </div>
                        </div>
                    ) : previewDevice === 'tablet' ? (
                        // Tablet: 2-Column Layout
                        <div className="flex-1 grid grid-cols-2 gap-0 overflow-hidden">
                            <div className="border-r border-white/10 p-4 overflow-y-auto custom-scrollbar space-y-4">
                                {messageSection}
                                <div className="pt-4 border-t border-white/10">{buttonsSection}</div>
                            </div>
                            <div className="p-4 flex items-center justify-center bg-slate-950/50 overflow-auto">
                                <DevicePreview />
                            </div>
                        </div>
                    ) : (
                        // Mobile: 2-Column Layout (same as tablet - side by side)
                        <div className="flex-1 grid grid-cols-2 gap-0 overflow-hidden">
                            <div className="border-r border-white/10 p-4 overflow-y-auto custom-scrollbar space-y-4">
                                {messageSection}
                                <div className="pt-4 border-t border-white/10">{buttonsSection}</div>
                            </div>
                            <div className="p-4 flex items-center justify-center bg-slate-950/50 overflow-auto">
                                <DevicePreview />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // ================== MOBILE: Step-by-Step Wizard ==================
    const currentStepContent = () => {
        switch (mobileStep) {
            case 0: return messageSection;
            case 1: return buttonsSection;
            default: return null;
        }
    };

    if (showMobilePreview) {
        return (
            <div className="min-h-screen bg-slate-900 p-4">
                <div className="flex items-center justify-between mb-4">
                    <button onClick={() => setShowMobilePreview(false)}
                        className="flex items-center gap-2 text-slate-400 text-sm">
                        <ChevronLeft className="w-4 h-4" /> Back to Editor
                    </button>
                </div>
                <div className="flex justify-center">
                    <DevicePreview />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900 flex flex-col">
            {/* Progress Bar */}
            <div className="p-4 border-b border-white/10">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-white font-medium">Step {mobileStep + 1} of {WIZARD_STEPS.length}</span>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setShowMobilePreview(true)}
                            className="flex items-center gap-1 text-xs text-amber-400 bg-amber-500/20 px-2 py-1 rounded-lg">
                            <Eye className="w-3 h-3" /> Preview
                        </button>
                    </div>
                </div>
                <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 transition-all" style={{ width: `${((mobileStep + 1) / WIZARD_STEPS.length) * 100}%` }} />
                </div>
                <div className="flex mt-2">
                    {WIZARD_STEPS.map((step, i) => (
                        <div key={step.id} className={`flex-1 text-center text-[10px] ${i <= mobileStep ? 'text-amber-400' : 'text-slate-500'}`}>
                            {step.title}
                        </div>
                    ))}
                </div>
            </div>

            {/* Step Content */}
            <div className="flex-1 p-4 overflow-y-auto">
                {currentStepContent()}
            </div>

            {/* Navigation */}
            <div className="flex-shrink-0 p-4 border-t border-white/10 flex gap-3">
                <button onClick={() => setMobileStep(Math.max(0, mobileStep - 1))} disabled={mobileStep === 0}
                    className={`flex-1 py-3 rounded-lg flex items-center justify-center gap-2 ${mobileStep === 0 ? 'bg-slate-700 text-slate-500' : 'bg-slate-700 text-white'}`}>
                    <ChevronLeft className="w-4 h-4" /> Back
                </button>
                {mobileStep < WIZARD_STEPS.length - 1 ? (
                    <button onClick={() => setMobileStep(mobileStep + 1)}
                        className="flex-1 py-3 rounded-lg bg-amber-500 text-white flex items-center justify-center gap-2">
                        Next <ChevronRight className="w-4 h-4" />
                    </button>
                ) : (
                    <button onClick={() => setShowMobilePreview(true)}
                        className="flex-1 py-3 rounded-lg bg-green-500 text-white flex items-center justify-center gap-2">
                        <Check className="w-4 h-4" /> Done
                    </button>
                )}
            </div>
        </div>
    );
};

export default TextNodeForm;
