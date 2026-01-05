import React, { useState, useEffect } from 'react';
import { Clock, MessageSquare, Plus, X, Link, ChevronDown, Zap, PlusCircle, Tag } from 'lucide-react';
import { supabase } from '../lib/supabase';
import CollapsibleTips from './CollapsibleTips';

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
}

const TextNodeForm: React.FC<TextNodeFormProps> = ({
    workspaceId,
    pageId,
    initialConfig,
    onChange
}) => {
    const [textContent, setTextContent] = useState(initialConfig?.textContent || '');
    const [delaySeconds, setDelaySeconds] = useState(initialConfig?.delaySeconds || 0);
    const [buttons, setButtons] = useState<Button[]>(
        initialConfig?.buttons || []
    );
    const [startFlows, setStartFlows] = useState<any[]>([]);
    const [pages, setPages] = useState<any[]>([]);
    const [openFlowDropdown, setOpenFlowDropdown] = useState<number | null>(null);

    // Fetch flows on mount
    useEffect(() => {
        if (workspaceId) {
            fetchStartFlows();
        }
    }, [workspaceId, pageId]);

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

    return (
        <div className="space-y-6">
            {/* Text Content */}
            <div>
                <label className="block text-xs md:text-sm font-semibold text-slate-300 mb-2">
                    <MessageSquare className="w-4 h-4 inline mr-2" />
                    Message Text
                </label>
                <textarea
                    value={textContent}
                    onChange={(e) => handleTextChange(e.target.value)}
                    placeholder="Enter the message you want to send to users..."
                    rows={4}
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-amber-500/50 outline-none transition-all placeholder-slate-500 resize-y min-h-[100px]"
                />
                <p className="mt-2 text-xs text-green-400">
                    ✓ This text message will be sent to users when this node is executed.
                </p>
            </div>

            {/* Delay */}
            <div>
                <label className="block text-xs md:text-sm font-semibold text-slate-300 mb-2">
                    <Clock className="w-4 h-4 inline mr-2" />
                    Delay Before Sending (seconds)
                </label>
                <input
                    type="number"
                    min="0"
                    max="300"
                    value={delaySeconds}
                    onChange={(e) => handleDelayChange(parseInt(e.target.value) || 0)}
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-amber-500/50 outline-none transition-all"
                />
                <p className="mt-2 text-xs text-slate-400">
                    Wait this many seconds before sending the message (0-300 seconds).
                </p>
            </div>

            {/* Buttons */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <label className="text-xs md:text-sm font-semibold text-slate-300">
                        <MessageSquare className="w-4 h-4 inline mr-2" />
                        Quick Reply Buttons (optional, max 3)
                    </label>
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

                <div className="space-y-4">
                    {buttons.map((button, index) => (
                        <div key={index} className="p-4 bg-black/20 border border-white/10 rounded-xl space-y-3">
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
                                <label className="block text-xs text-slate-400 mb-1">Button Type</label>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => updateButton(index, { type: 'startFlow', flowId: '', url: undefined, webviewHeight: undefined })}
                                        className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${button.type === 'startFlow'
                                            ? 'bg-amber-500 text-white'
                                            : 'bg-white/5 text-slate-400 hover:bg-white/10'
                                            }`}
                                    >
                                        Flows
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => updateButton(index, { type: 'url', url: '', webviewHeight: 'full', flowId: undefined })}
                                        className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${button.type === 'url'
                                            ? 'bg-amber-500 text-white'
                                            : 'bg-white/5 text-slate-400 hover:bg-white/10'
                                            }`}
                                    >
                                        URL
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => updateButton(index, { type: 'newFlow', flowId: undefined, url: undefined, webviewHeight: undefined })}
                                        className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${button.type === 'newFlow'
                                            ? 'bg-amber-500 text-white'
                                            : 'bg-white/5 text-slate-400 hover:bg-white/10'
                                            }`}
                                    >
                                        New Flow
                                    </button>
                                </div>
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
                                            <span className="font-medium">New Flow Button</span>
                                        </div>
                                        <p className="text-xs text-green-300/70 mt-1">
                                            A "New Flow" node will be created. When you publish this flow, the sub-flow will be saved and available in the Flows dropdown.
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
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Remove Label</label>
                                        <input
                                            type="text"
                                            value={button.removeLabel || ''}
                                            onChange={(e) => updateButton(index, { removeLabel: e.target.value })}
                                            placeholder="e.g., 10% Interested"
                                            className="w-full bg-black/20 border border-white/10 rounded-lg px-2 py-1.5 text-white text-xs focus:ring-2 focus:ring-purple-500/50 outline-none"
                                        />
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
                    <p className="text-xs text-slate-500">
                        Optionally add buttons. Buttons can link to existing flows, URLs, or create new flows.
                    </p>
                )}
            </div>

            {/* Info */}
            <CollapsibleTips title="Tips & Info" color="amber">
                <p className="text-xs md:text-sm">
                    <strong>Button Types:</strong>
                </p>
                <ul className="mt-2 text-xs md:text-sm space-y-1 list-disc list-inside opacity-90">
                    <li><strong>Flows:</strong> Start an existing saved flow when clicked</li>
                    <li><strong>URL:</strong> Open a webpage in a webview when clicked</li>
                    <li><strong>New Flow:</strong> Create a new flow starting point when clicked</li>
                </ul>
            </CollapsibleTips>

            {/* Preview */}
            {textContent && (
                <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
                    <h4 className="text-sm font-semibold text-slate-300 mb-2">Message Preview</h4>
                    <div className="bg-indigo-500/20 border border-indigo-500/30 rounded-xl px-4 py-3">
                        <p className="text-sm text-white whitespace-pre-wrap">{textContent}</p>
                        {buttons.filter(b => b.title).length > 0 && (
                            <div className="mt-3 space-y-2">
                                {buttons.filter(b => b.title).map((btn, i) => (
                                    <div key={i} className="flex items-center gap-2 px-3 py-2 bg-blue-500/30 rounded-lg text-sm text-blue-200">
                                        {btn.type === 'url' && <Link className="w-3 h-3" />}
                                        {btn.type === 'startFlow' && <Zap className="w-3 h-3" />}
                                        {btn.type === 'newFlow' && <PlusCircle className="w-3 h-3" />}
                                        {btn.title}
                                        <span className="text-xs text-blue-300/60 ml-auto">
                                            {btn.type === 'url' && btn.webviewHeight && `(${btn.webviewHeight})`}
                                            {btn.type === 'startFlow' && '(flow)'}
                                            {btn.type === 'newFlow' && '(new flow)'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    {delaySeconds > 0 && (
                        <p className="text-xs text-slate-400 mt-2">
                            ⏱️ Will wait <strong>{delaySeconds} second{delaySeconds !== 1 ? 's' : ''}</strong> before sending
                        </p>
                    )}
                </div>
            )}
        </div>
    );
};

export default TextNodeForm;
