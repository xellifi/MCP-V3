import React, { useState, useEffect } from 'react';
import { ConnectedPage } from '../types';
import { api } from '../services/api';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

interface TriggerNodeFormProps {
    workspaceId: string;
    initialConfig?: {
        pageId?: string;
        enableCommentReply?: boolean;
        enableSendMessage?: boolean;
    };
    onChange: (config: any) => void;
}

const TriggerNodeForm: React.FC<TriggerNodeFormProps> = ({
    workspaceId,
    initialConfig,
    onChange
}) => {
    const [pages, setPages] = useState<ConnectedPage[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPageId, setSelectedPageId] = useState(initialConfig?.pageId || '');
    const [enableCommentReply, setEnableCommentReply] = useState(initialConfig?.enableCommentReply ?? true);
    const [enableSendMessage, setEnableSendMessage] = useState(initialConfig?.enableSendMessage ?? false);

    useEffect(() => {
        loadPages();
    }, [workspaceId]);

    useEffect(() => {
        onChange({
            pageId: selectedPageId,
            enableCommentReply,
            enableSendMessage
        });
    }, [selectedPageId, enableCommentReply, enableSendMessage]);

    const loadPages = async () => {
        try {
            setLoading(true);
            const allPages = await api.workspace.getConnectedPages(workspaceId);
            // Filter to only show pages with automation enabled
            const automationPages = allPages.filter(p => p.isAutomationEnabled);
            setPages(automationPages);

            // Auto-select first page if none selected
            if (!selectedPageId && automationPages.length > 0) {
                setSelectedPageId(automationPages[0].id);
            }
        } catch (error) {
            console.error('Error loading pages:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (pages.length === 0) {
        return (
            <div className="text-center py-12">
                <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-white mb-2">No Pages with Automation</h3>
                <p className="text-slate-400 mb-4">
                    You need to enable automation on at least one Facebook page.
                </p>
                <a
                    href="/connected-pages"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-colors text-sm font-medium"
                >
                    Go to Pages
                </a>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Page Selection */}
            <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                    Select Facebook Page
                </label>
                <select
                    value={selectedPageId}
                    onChange={(e) => setSelectedPageId(e.target.value)}
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all appearance-none bg-slate-900"
                >
                    {pages.map((page) => (
                        <option key={page.id} value={page.id}>
                            {page.name} ({page.pageFollowers?.toLocaleString() || 0} followers)
                        </option>
                    ))}
                </select>
                <p className="mt-2 text-xs text-slate-400">
                    Only pages with automation enabled are shown
                </p>
            </div>

            {/* Comment Reply Toggle */}
            <div className="flex items-start gap-4 p-4 bg-white/5 rounded-xl border border-white/10">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                        <h4 className="font-bold text-white">Auto-Reply to Comments</h4>
                    </div>
                    <p className="text-sm text-slate-400">
                        Automatically reply to new comments on this page's posts
                    </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                    <input
                        type="checkbox"
                        checked={enableCommentReply}
                        onChange={(e) => setEnableCommentReply(e.target.checked)}
                        className="sr-only peer"
                    />
                    <div className="w-14 h-7 bg-white/10 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
            </div>

            {/* Send Message Toggle */}
            <div className="flex items-start gap-4 p-4 bg-white/5 rounded-xl border border-white/10">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <CheckCircle2 className="w-4 h-4 text-purple-400" />
                        <h4 className="font-bold text-white">Send Direct Message</h4>
                    </div>
                    <p className="text-sm text-slate-400">
                        Send a private message to users who comment
                    </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                    <input
                        type="checkbox"
                        checked={enableSendMessage}
                        onChange={(e) => setEnableSendMessage(e.target.checked)}
                        className="sr-only peer"
                    />
                    <div className="w-14 h-7 bg-white/10 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
            </div>

            {/* Info Box */}
            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                <p className="text-sm text-blue-300">
                    <strong>Note:</strong> This trigger will activate when someone comments on any post from the selected page.
                    Connect action nodes below to define what happens next.
                </p>
            </div>
        </div>
    );
};

export default TriggerNodeForm;
