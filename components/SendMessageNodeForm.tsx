import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Bot, Sparkles, AlertCircle, ChevronDown, Zap } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useTheme } from '../context/ThemeContext';
import CollapsibleTips from './CollapsibleTips';
import ClickableVariables, { STANDARD_VARIABLES } from './ClickableVariables';

interface Button {
    title: string;
    type: 'startFlow' | 'url';
    flowId?: string;
    url?: string;
    webviewType?: 'full' | 'compact' | 'tall';
}

interface AIProvider {
    id: 'openai' | 'gemini';
    name: string;
    logo: string;
    available: boolean;
}

interface SendMessageNodeFormProps {
    workspaceId: string;
    pageId?: string; // Optional page ID to filter flows
    initialConfig?: {
        messageTemplate?: string;
        buttons?: Button[];
        useAiReply?: boolean;
        aiProvider?: 'openai' | 'gemini';
        aiPrompt?: string;
    };
    onChange: (config: any) => void;
}

const SendMessageNodeForm: React.FC<SendMessageNodeFormProps> = ({
    workspaceId,
    pageId,
    initialConfig,
    onChange
}) => {
    const { isDark } = useTheme();
    const [messageTemplate, setMessageTemplate] = useState(initialConfig?.messageTemplate || '');
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [buttons, setButtons] = useState<Button[]>(
        initialConfig?.buttons && initialConfig.buttons.length > 0
            ? initialConfig.buttons
            : []
    );
    const [startFlows, setStartFlows] = useState<any[]>([]);
    const [pages, setPages] = useState<any[]>([]);
    const [openFlowDropdown, setOpenFlowDropdown] = useState<number | null>(null);

    // AI Reply state
    const [useAiReply, setUseAiReply] = useState(initialConfig?.useAiReply || false);
    const [aiProvider, setAiProvider] = useState<'openai' | 'gemini'>(initialConfig?.aiProvider || 'openai');
    const [aiPrompt, setAiPrompt] = useState(initialConfig?.aiPrompt || '');
    const [availableProviders, setAvailableProviders] = useState<AIProvider[]>([]);
    const [loadingProviders, setLoadingProviders] = useState(true);

    // AI Provider configurations with logos
    const AI_PROVIDERS: AIProvider[] = [
        {
            id: 'openai',
            name: 'OpenAI GPT',
            logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/ChatGPT_logo.svg/512px-ChatGPT_logo.svg.png',
            available: false
        },
        {
            id: 'gemini',
            name: 'Google Gemini',
            logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Google_Gemini_logo.svg/512px-Google_Gemini_logo.svg.png',
            available: false
        }
    ];

    // Fetch flows and API keys on mount
    useEffect(() => {
        fetchStartFlows();
        fetchAvailableProviders();
    }, [workspaceId, pageId]);

    const fetchStartFlows = async () => {
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

                        // Check trigger and start nodes
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

            setStartFlows(enrichedFlows);
        } else if (error) {
            console.error('Error fetching flows:', error);
        }
    };

    const fetchAvailableProviders = async () => {
        setLoadingProviders(true);
        try {
            // First try to get workspace-level settings
            const { data: workspaceSettings } = await supabase
                .from('workspace_settings')
                .select('openai_api_key, gemini_api_key')
                .eq('workspace_id', workspaceId)
                .single();

            // Also get admin-level settings as fallback
            const { data: adminSettings } = await supabase
                .from('admin_settings')
                .select('openai_api_key, gemini_api_key')
                .eq('id', 1)
                .single();

            const providers = AI_PROVIDERS.map(provider => {
                let available = false;
                if (provider.id === 'openai') {
                    available = !!(workspaceSettings?.openai_api_key || adminSettings?.openai_api_key);
                } else if (provider.id === 'gemini') {
                    available = !!(workspaceSettings?.gemini_api_key || adminSettings?.gemini_api_key);
                }
                return { ...provider, available };
            });

            setAvailableProviders(providers);

            // If current provider is not available, switch to first available
            const currentProviderAvailable = providers.find(p => p.id === aiProvider)?.available;
            if (!currentProviderAvailable && useAiReply) {
                const firstAvailable = providers.find(p => p.available);
                if (firstAvailable) {
                    setAiProvider(firstAvailable.id);
                }
            }
        } catch (error) {
            console.error('Error fetching AI providers:', error);
            setAvailableProviders(AI_PROVIDERS);
        } finally {
            setLoadingProviders(false);
        }
    };

    const notifyChange = (
        newTemplate: string,
        newButtons: Button[],
        newUseAi?: boolean,
        newAiProvider?: 'openai' | 'gemini',
        newAiPrompt?: string
    ) => {
        const validButtons = newButtons.filter(b => {
            if (!b.title) return false;
            if (b.type === 'startFlow') return !!b.flowId;
            if (b.type === 'url') return !!b.url;
            return false;
        });

        onChange({
            messageTemplate: newTemplate,
            buttons: validButtons,
            useAiReply: newUseAi !== undefined ? newUseAi : useAiReply,
            aiProvider: newAiProvider !== undefined ? newAiProvider : aiProvider,
            aiPrompt: newAiPrompt !== undefined ? newAiPrompt : aiPrompt
        });
    };

    const handleTemplateChange = (value: string) => {
        setMessageTemplate(value);
        notifyChange(value, buttons);
    };

    const handleAiToggle = (enabled: boolean) => {
        setUseAiReply(enabled);
        notifyChange(messageTemplate, buttons, enabled, aiProvider, aiPrompt);
    };

    const handleAiProviderChange = (provider: 'openai' | 'gemini') => {
        setAiProvider(provider);
        notifyChange(messageTemplate, buttons, useAiReply, provider, aiPrompt);
    };

    const handleAiPromptChange = (prompt: string) => {
        setAiPrompt(prompt);
        notifyChange(messageTemplate, buttons, useAiReply, aiProvider, prompt);
    };

    const addButton = () => {
        if (buttons.length < 3) {
            const newButtons = [...buttons, { title: '', type: 'startFlow' as const }];
            setButtons(newButtons);
            notifyChange(messageTemplate, newButtons);
        }
    };

    const removeButton = (index: number) => {
        const newButtons = buttons.filter((_, i) => i !== index);
        setButtons(newButtons);
        notifyChange(messageTemplate, newButtons);
    };

    const updateButton = (index: number, updates: Partial<Button>) => {
        const newButtons = [...buttons];
        newButtons[index] = { ...newButtons[index], ...updates };
        setButtons(newButtons);
        notifyChange(messageTemplate, newButtons);
    };

    const insertVariable = (variable: string) => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newValue = messageTemplate.substring(0, start) + variable + messageTemplate.substring(end);

        setMessageTemplate(newValue);
        notifyChange(newValue, buttons);

        // Restore cursor position after the inserted variable
        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + variable.length, start + variable.length);
        }, 0);
    };

    const hasAvailableProviders = availableProviders.some(p => p.available);

    return (
        <div className="space-y-6">
            {/* AI Reply Toggle */}
            <div className={`p-4 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-xl`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg">
                            <Bot className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h3 className={`text-xs md:text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>AI-Powered Reply</h3>
                            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Let AI generate contextual responses</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => handleAiToggle(!useAiReply)}
                        className={`relative w-14 h-7 rounded-full transition-all duration-300 ${useAiReply
                            ? 'bg-gradient-to-r from-purple-500 to-blue-500'
                            : (isDark ? 'bg-slate-600' : 'bg-slate-300')
                            }`}
                    >
                        <div
                            className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-lg transition-all duration-300 ${useAiReply ? 'left-8' : 'left-1'
                                }`}
                        />
                        {useAiReply && (
                            <Sparkles className="absolute right-1.5 top-1.5 w-4 h-4 text-white" />
                        )}
                    </button>
                </div>
            </div>

            {/* AI Configuration Section */}
            {useAiReply && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                    {/* AI Provider Selection */}
                    <div>
                        <label className={`block text-xs md:text-sm font-semibold mb-3 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                            Select AI Provider
                        </label>

                        {loadingProviders ? (
                            <div className="flex items-center justify-center py-4">
                                <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                                <span className="ml-2 text-sm text-slate-400">Loading providers...</span>
                            </div>
                        ) : !hasAvailableProviders ? (
                            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm text-amber-300 font-medium">No AI Providers Configured</p>
                                    <p className="text-xs text-amber-400/70 mt-1">
                                        Please add your OpenAI or Gemini API keys in Settings to enable AI replies.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-3">
                                {availableProviders.map((provider) => (
                                    <button
                                        key={provider.id}
                                        type="button"
                                        onClick={() => provider.available && handleAiProviderChange(provider.id)}
                                        disabled={!provider.available}
                                        className={`relative p-4 rounded-xl border-2 transition-all duration-200 ${!provider.available
                                            ? `opacity-40 cursor-not-allowed ${isDark ? 'bg-black/10 border-white/5' : 'bg-slate-100 border-slate-200'}`
                                            : aiProvider === provider.id
                                                ? 'bg-gradient-to-br from-purple-500/20 to-blue-500/20 border-purple-500 ring-2 ring-purple-500/30'
                                                : (isDark ? 'bg-black/20 border-white/10 hover:border-white/30 hover:bg-white/5' : 'bg-white border-slate-200 hover:border-purple-300 hover:bg-purple-50')
                                            }`}
                                    >
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="w-10 h-10 rounded-lg overflow-hidden bg-white p-1.5 flex items-center justify-center">
                                                <img
                                                    src={provider.logo}
                                                    alt={provider.name}
                                                    className="w-full h-full object-contain"
                                                    onError={(e) => {
                                                        // Fallback to text if logo fails
                                                        (e.target as HTMLImageElement).style.display = 'none';
                                                    }}
                                                />
                                            </div>
                                            <span className={`text-xs md:text-sm font-medium ${aiProvider === provider.id && provider.available
                                                ? (isDark ? 'text-white' : 'text-purple-700')
                                                : (isDark ? 'text-slate-300' : 'text-slate-600')
                                                }`}>
                                                {provider.name}
                                            </span>
                                            {!provider.available && (
                                                <span className="text-xs text-slate-500">Not configured</span>
                                            )}
                                        </div>
                                        {aiProvider === provider.id && provider.available && (
                                            <div className="absolute top-2 right-2 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* AI Prompt Configuration */}
                    {hasAvailableProviders && (
                        <div>
                            <label className={`block text-xs md:text-sm font-semibold mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                AI Instructions
                            </label>
                            <textarea
                                value={aiPrompt}
                                onChange={(e) => handleAiPromptChange(e.target.value)}
                                placeholder="Tell the AI how to respond. Example: 'Be friendly and helpful. Thank the user for their comment and invite them to learn more about our products. Keep responses under 100 words.'"
                                rows={4}
                                className={`w-full rounded-xl px-4 py-3 focus:ring-2 focus:ring-purple-500/50 outline-none transition-all resize-none ${isDark
                                    ? 'bg-black/20 border border-white/10 text-white placeholder-slate-500'
                                    : 'bg-white border border-slate-200 text-slate-900 placeholder-slate-400'}`}
                            />
                            <div className="mt-2 space-y-1">
                                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                    The AI will automatically receive the commenter's name and comment text.
                                </p>
                                <p className={`text-xs ${isDark ? 'text-purple-300' : 'text-purple-600'}`}>
                                    Tip: Be specific about tone, length, and what information to include.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Manual Message Template - Only show when AI is OFF */}
            {!useAiReply && (
                <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                    <label className={`block text-xs md:text-sm font-semibold mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        Direct Message Template
                    </label>
                    <textarea
                        ref={textareaRef}
                        value={messageTemplate}
                        onChange={(e) => handleTemplateChange(e.target.value)}
                        placeholder="Hi! Thanks for commenting on our post. We'd love to hear more about your thoughts..."
                        rows={5}
                        className={`w-full rounded-xl px-4 py-3 focus:ring-2 focus:ring-purple-500/50 outline-none transition-all resize-none ${isDark
                            ? 'bg-black/20 border border-white/10 text-white placeholder-slate-500'
                            : 'bg-white border border-slate-200 text-slate-900 placeholder-slate-400'}`}
                    />
                    <ClickableVariables
                        variables={STANDARD_VARIABLES}
                        onVariableClick={insertVariable}
                        accentColor="purple"
                    />
                </div>
            )}

            {/* Preview - Only for manual template */}
            {!useAiReply && messageTemplate && (
                <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
                    <p className={`text-xs font-semibold mb-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Preview:</p>
                    <p className="text-sm text-white whitespace-pre-wrap">{messageTemplate}</p>
                </div>
            )}

            {/* Quick Reply Buttons - Available for both modes */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <label className="text-xs md:text-sm font-semibold text-slate-300">
                        <MessageSquare className="w-4 h-4 inline mr-2" />
                        Quick Reply Buttons (optional, max 3)
                    </label>
                    {buttons.length < 3 && (
                        <button
                            type="button"
                            onClick={addButton}
                            className="px-3 py-1 bg-purple-500 text-white text-xs rounded-lg hover:bg-purple-600"
                        >
                            + Add Button
                        </button>
                    )}
                </div>

                <div className="space-y-4">
                    {buttons.map((button, index) => (
                        <div key={index} className={`p-4 rounded-xl border space-y-3 ${isDark ? 'bg-black/20 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                            {/* Button Title */}
                            <div>
                                <label className={`block text-xs mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Button Text</label>
                                <input
                                    type="text"
                                    value={button.title}
                                    onChange={(e) => updateButton(index, { title: e.target.value })}
                                    placeholder="e.g., Get Pricing"
                                    className={`w-full rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500/50 outline-none ${isDark
                                        ? 'bg-black/20 border border-white/10 text-white'
                                        : 'bg-white border border-slate-200 text-slate-900'}`}
                                    maxLength={20}
                                />
                            </div>

                            {/* Button Type */}
                            <div>
                                <label className={`block text-xs mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Button Type</label>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => updateButton(index, { type: 'startFlow', flowId: '', url: undefined, webviewType: undefined })}
                                        className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${button.type === 'startFlow'
                                            ? 'bg-purple-500 text-white'
                                            : (isDark ? 'bg-white/5 text-slate-400 hover:bg-white/10' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50')
                                            }`}
                                    >
                                        Flows
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => updateButton(index, { type: 'url', url: '', webviewType: 'full', flowId: undefined })}
                                        className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${button.type === 'url'
                                            ? 'bg-purple-500 text-white'
                                            : (isDark ? 'bg-white/5 text-slate-400 hover:bg-white/10' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50')
                                            }`}
                                    >
                                        URL
                                    </button>
                                </div>
                            </div>

                            {/* Flow Selector - Custom Dropdown */}
                            {button.type === 'startFlow' && (
                                <div className="relative">
                                    <label className={`block text-xs mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Select Flow</label>

                                    {/* Custom Dropdown Trigger */}
                                    <button
                                        type="button"
                                        onClick={() => setOpenFlowDropdown(openFlowDropdown === index ? null : index)}
                                        className={`w-full rounded-lg px-3 py-2.5 text-left text-sm focus:ring-2 focus:ring-purple-500/50 outline-none flex items-center justify-between transition-colors ${isDark
                                            ? 'bg-black/20 border border-white/10 hover:bg-white/5'
                                            : 'bg-white border border-slate-200 hover:border-purple-500/30'}`}
                                    >
                                        {button.flowId ? (
                                            <div className="flex items-center gap-2">
                                                {(() => {
                                                    const selectedFlow = startFlows.find(f => f.id === button.flowId);
                                                    return selectedFlow ? (
                                                        <>
                                                            {selectedFlow.pageImageUrl && selectedFlow.pageImageUrl.startsWith('http') ? (
                                                                <img
                                                                    src={selectedFlow.pageImageUrl}
                                                                    alt={selectedFlow.pageName}
                                                                    className="w-6 h-6 rounded-full object-cover border border-white/20"
                                                                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                                                />
                                                            ) : (
                                                                <div className="w-6 h-6 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                                                                    <Zap className="w-3 h-3 text-purple-400" />
                                                                </div>
                                                            )}
                                                            <span className={`truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{selectedFlow.name}</span>
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
                                        <div className={`absolute z-50 w-full mt-1 rounded-lg shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 border ${isDark ? 'bg-slate-800 border-white/10' : 'bg-white border-slate-200'}`}>
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
                                                            className={`w-full px-3 py-2.5 flex items-center gap-3 transition-colors text-left ${button.flowId === flow.id
                                                                ? 'bg-purple-500/20'
                                                                : (isDark ? 'hover:bg-white/10' : 'hover:bg-slate-50')
                                                                }`}
                                                        >
                                                            {/* Image with fallback - always show fallback, image overlays if valid */}
                                                            <div className="relative w-8 h-8 flex-shrink-0">
                                                                {/* Fallback icon - always visible behind */}
                                                                <div className="absolute inset-0 rounded-full bg-purple-500/20 border-2 border-purple-500/30 flex items-center justify-center">
                                                                    <Zap className="w-4 h-4 text-purple-400" />
                                                                </div>
                                                                {/* Image overlays on top if valid URL */}
                                                                {flow.pageImageUrl && flow.pageImageUrl.startsWith('http') && (
                                                                    <img
                                                                        src={flow.pageImageUrl}
                                                                        alt={flow.pageName}
                                                                        className="absolute inset-0 w-8 h-8 rounded-full object-cover border-2 border-white/20 bg-slate-800"
                                                                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                                                    />
                                                                )}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className={`text-sm font-medium truncate ${button.flowId === flow.id ? 'text-purple-500' : (isDark ? 'text-white' : 'text-slate-900')}`}>
                                                                    {flow.name}
                                                                </p>
                                                                <p className="text-xs text-slate-500 truncate">{flow.pageName}</p>
                                                            </div>
                                                            {button.flowId === flow.id && (
                                                                <div className="w-2 h-2 rounded-full bg-purple-400 flex-shrink-0" />
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
                                        <label className={`block text-xs mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>URL</label>
                                        <input
                                            type="url"
                                            value={button.url || ''}
                                            onChange={(e) => updateButton(index, { url: e.target.value })}
                                            placeholder="https://example.com"
                                            className={`w-full rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500/50 outline-none ${isDark
                                                ? 'bg-black/20 border border-white/10 text-white'
                                                : 'bg-white border border-slate-200 text-slate-900'}`}
                                        />
                                    </div>

                                    {/* Webview Type */}
                                    <div>
                                        <label className={`block text-xs mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Webview Type</label>
                                        <div className="grid grid-cols-3 gap-2">
                                            <button
                                                type="button"
                                                onClick={() => updateButton(index, { webviewType: 'full' })}
                                                className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${button.webviewType === 'full'
                                                    ? 'bg-blue-500 text-white'
                                                    : (isDark ? 'bg-white/5 text-slate-400 hover:bg-white/10' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50')
                                                    }`}
                                            >
                                                FULL
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => updateButton(index, { webviewType: 'compact' })}
                                                className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${button.webviewType === 'compact'
                                                    ? 'bg-blue-500 text-white'
                                                    : (isDark ? 'bg-white/5 text-slate-400 hover:bg-white/10' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50')
                                                    }`}
                                            >
                                                COMPACT
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => updateButton(index, { webviewType: 'tall' })}
                                                className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${button.webviewType === 'tall'
                                                    ? 'bg-blue-500 text-white'
                                                    : (isDark ? 'bg-white/5 text-slate-400 hover:bg-white/10' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50')
                                                    }`}
                                            >
                                                TALL
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}

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
                    <p className="text-sm text-slate-500 text-center py-4">
                        No buttons added. Click "+ Add Button" to add quick reply buttons.
                    </p>
                )}
            </div>

            {/* Info */}
            <CollapsibleTips title="Tips & Info" color="purple">
                <p className="text-xs md:text-sm">
                    {useAiReply ? (
                        <>
                            <strong>AI Reply:</strong> The AI will generate a personalized response based on the commenter's message and your instructions.
                        </>
                    ) : (
                        <>
                            <strong>Quick Replies:</strong> Add buttons that users can click to trigger other flows. The keyword will be used to match and trigger flows.
                        </>
                    )}
                </p>
            </CollapsibleTips>
        </div>
    );
};

export default SendMessageNodeForm;
