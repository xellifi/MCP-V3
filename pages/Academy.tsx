import React, { useState } from 'react';
import {
    BookOpen,
    MessageSquare,
    Bot,
    PenTool,
    ChevronRight,
    Zap,
    LayoutDashboard,
    Check,
    MessageCircle,
    ArrowRight,
    Sparkles,
    BrainCircuit,
    Cpu,
    MousePointer2,
    Settings,
    Plus,
    Workflow
} from 'lucide-react';
import { User } from '../types';

interface AcademyProps {
    user: User;
}

const Academy: React.FC<AcademyProps> = ({ user }) => {
    const [activeTutorial, setActiveTutorial] = useState('comment-automation');

    return (
        <div className="min-h-screen bg-white dark:bg-slate-950 pb-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                {/* Minimalist Header */}
                <div className="mb-12 border-b border-slate-200 dark:border-slate-800 pb-6">
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                        Academy
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg">
                        Technical guides and documentation for your automation tools.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                    {/* Documentation Sidebar */}
                    <div className="lg:col-span-3">
                        <div className="lg:sticky lg:top-24 space-y-8">
                            <div>
                                <h3 className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider mb-4">
                                    Getting Started
                                </h3>
                                <nav className="space-y-1 border-l border-slate-200 dark:border-slate-800 ml-2">
                                    <button
                                        onClick={() => setActiveTutorial('comment-automation')}
                                        className={`group flex items-center justify-between w-full pl-4 py-2 text-sm transition-colors border-l -ml-px ${activeTutorial === 'comment-automation'
                                            ? 'border-indigo-600 text-indigo-600 font-medium'
                                            : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700'
                                            }`}
                                    >
                                        <span>Comment Automation</span>
                                        {activeTutorial === 'comment-automation' && (
                                            <ChevronRight className="w-3.5 h-3.5" />
                                        )}
                                    </button>

                                    <button
                                        onClick={() => setActiveTutorial('ai-chatbot')}
                                        className={`group flex items-center justify-between w-full pl-4 py-2 text-sm transition-colors border-l -ml-px ${activeTutorial === 'ai-chatbot'
                                            ? 'border-indigo-600 text-indigo-600 font-medium'
                                            : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700'
                                            }`}
                                    >
                                        <span>AI Messenger Chatbot</span>
                                        {activeTutorial === 'ai-chatbot' && (
                                            <ChevronRight className="w-3.5 h-3.5" />
                                        )}
                                    </button>
                                </nav>
                            </div>
                        </div>
                    </div>

                    {/* Main Content Area */}
                    <div className="lg:col-span-9">
                        {activeTutorial === 'comment-automation' && (
                            <div className="animate-fade-in">
                                {/* Title Section */}
                                <div className="mb-10">
                                    <div className="flex items-center gap-2 mb-4">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-100 dark:border-blue-500/30">
                                            Guide
                                        </span>
                                        <span className="text-sm text-slate-500 flex items-center">
                                            <Zap className="w-3.5 h-3.5 mr-1" />
                                            5 min read
                                        </span>
                                    </div>
                                    <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
                                        Setting Up Comment Automation
                                    </h2>
                                    <p className="text-xl text-slate-600 dark:text-slate-400 leading-relaxed font-light">
                                        Follow these exact steps to create a flow that automatically replies to comments and sends a private message.
                                    </p>
                                </div>

                                {/* Step-by-Step Guide */}
                                <div className="space-y-12">
                                    {/* Step 1 */}
                                    <div className="relative pl-10 border-l border-slate-200 dark:border-slate-800 pb-12 last:pb-0">
                                        <div className="absolute -left-3 top-0 w-6 h-6 rounded-full bg-white dark:bg-slate-950 border-2 border-slate-300 dark:border-slate-700 flex items-center justify-center text-xs font-semibold text-slate-600 dark:text-slate-400">
                                            1
                                        </div>

                                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
                                            Add the Comment Trigger
                                        </h3>

                                        <div className="mb-6 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 overflow-x-auto">
                                            <span className="font-semibold text-slate-900 dark:text-white flex-shrink-0">Go to:</span>
                                            <div className="flex items-center gap-1.5 px-2 py-1 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 whitespace-nowrap">
                                                <LayoutDashboard className="w-3.5 h-3.5" />
                                                <span>Sidebar</span>
                                            </div>
                                            <ChevronRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                                            <div className="flex items-center gap-1.5 px-2 py-1 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 whitespace-nowrap">
                                                <Workflow className="w-3.5 h-3.5" />
                                                <span>Flows</span>
                                            </div>
                                            <ChevronRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                                            <div className="flex items-center gap-1.5 px-2 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded border border-indigo-200 dark:border-indigo-500/30 whitespace-nowrap">
                                                <Plus className="w-3.5 h-3.5" />
                                                <span>New Flow</span>
                                            </div>
                                        </div>

                                        <ul className="space-y-4 text-slate-600 dark:text-slate-400 text-sm">
                                            <li className="flex items-start gap-3">
                                                <MousePointer2 className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5" />
                                                <span>
                                                    Click and Drag <strong>Comment Node</strong> on the node list of the Flow Builder.
                                                </span>
                                            </li>
                                            <li className="flex items-start gap-3">
                                                <div className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 mt-0.5">DRAG</div>
                                                <span>
                                                    Locate the <strong>Choose Comment</strong> node under "Triggers" and drag it onto the canvas.
                                                </span>
                                            </li>
                                            <li className="flex items-start gap-3">
                                                <Settings className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
                                                <span>
                                                    Click the <strong>Gear Icon</strong> on the node to open settings. Select "Specific Post" or "All Posts".
                                                </span>
                                            </li>
                                        </ul>
                                    </div>

                                    {/* Step 2 */}
                                    <div className="relative pl-10 border-l border-slate-200 dark:border-slate-800 pb-12 last:pb-0">
                                        <div className="absolute -left-3 top-0 w-6 h-6 rounded-full bg-white dark:bg-slate-950 border-2 border-slate-300 dark:border-slate-700 flex items-center justify-center text-xs font-semibold text-slate-600 dark:text-slate-400">
                                            2
                                        </div>

                                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
                                            Configure the Public Reply
                                        </h3>
                                        <ul className="space-y-4 text-slate-600 dark:text-slate-400 text-sm">
                                            <li className="flex items-start gap-3">
                                                <div className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 mt-0.5">DRAG</div>
                                                <span>
                                                    Drag a <strong>Comment Reply</strong> node onto the canvas.
                                                </span>
                                            </li>
                                            <li className="flex items-start gap-3">
                                                <ArrowRight className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
                                                <span>
                                                    Connect the <strong>output handle</strong> of the "Comment Trigger" to the <strong>input handle</strong> of "Comment Reply".
                                                </span>
                                            </li>
                                            <li className="flex items-start gap-3">
                                                <Settings className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
                                                <span>
                                                    Open settings. Toggle <strong>Use AI</strong> to ON for auto-generated replies, OR keep it OFF and type a manual message.
                                                </span>
                                            </li>
                                        </ul>
                                    </div>

                                    {/* Step 3 */}
                                    <div className="relative pl-10 border-l border-slate-200 dark:border-slate-800 pb-12 last:pb-0">
                                        <div className="absolute -left-3 top-0 w-6 h-6 rounded-full bg-white dark:bg-slate-950 border-2 border-slate-300 dark:border-slate-700 flex items-center justify-center text-xs font-semibold text-slate-600 dark:text-slate-400">
                                            3
                                        </div>

                                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
                                            Send the Private Message
                                        </h3>
                                        <ul className="space-y-4 text-slate-600 dark:text-slate-400 text-sm">
                                            <li className="flex items-start gap-3">
                                                <div className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 mt-0.5">DRAG</div>
                                                <span>
                                                    Drag a <strong>Send Message</strong> node onto the canvas.
                                                </span>
                                            </li>
                                            <li className="flex items-start gap-3">
                                                <ArrowRight className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
                                                <span>
                                                    Connect the <strong>output handle</strong> of the "Comment Reply" node to this "Send Message" node.
                                                </span>
                                            </li>
                                            <li className="flex items-start gap-3">
                                                <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                                                <span>
                                                    This ensures that <strong>after</strong> the public reply is posted, the user immediately receives your private DM.
                                                </span>
                                            </li>
                                        </ul>
                                    </div>

                                    {/* Step 4 */}
                                    <div className="relative pl-10 border-l border-slate-200 dark:border-slate-800">
                                        <div className="absolute -left-3 top-0 w-6 h-6 rounded-full bg-indigo-600 border-2 border-indigo-600 flex items-center justify-center text-xs font-semibold text-white">
                                            4
                                        </div>

                                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
                                            Save & Activate
                                        </h3>
                                        <p className="text-slate-600 dark:text-slate-400 mb-2">
                                            Click the <strong>Save</strong> button in the top right corner.
                                        </p>
                                        <p className="text-slate-600 dark:text-slate-400">
                                            Toggle the status switch from <span className="text-slate-500 font-mono text-xs border border-slate-300 px-1 rounded">Draft</span> to <span className="text-green-600 font-mono text-xs border border-green-300 bg-green-50 px-1 rounded">Active</span>.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTutorial === 'ai-chatbot' && (
                            <div className="animate-fade-in">
                                {/* Title Section */}
                                <div className="mb-10">
                                    <div className="flex items-center gap-2 mb-4">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border border-purple-100 dark:border-purple-500/30">
                                            Pro Feature
                                        </span>
                                        <span className="text-sm text-slate-500 flex items-center">
                                            <Zap className="w-3.5 h-3.5 mr-1" />
                                            3 min read
                                        </span>
                                    </div>
                                    <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
                                        Building a 24/7 AI Messenger Agent
                                    </h2>
                                    <p className="text-xl text-slate-600 dark:text-slate-400 leading-relaxed font-light">
                                        Follow these steps to create an AI agent that listens to all messages and replies intelligently around the clock.
                                    </p>
                                </div>

                                <div className="space-y-12">
                                    {/* Step 1 */}
                                    <div className="relative pl-10 border-l border-slate-200 dark:border-slate-800 pb-12 last:pb-0">
                                        <div className="absolute -left-3 top-0 w-6 h-6 rounded-full bg-white dark:bg-slate-950 border-2 border-slate-300 dark:border-slate-700 flex items-center justify-center text-xs font-semibold text-slate-600 dark:text-slate-400">
                                            1
                                        </div>

                                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
                                            Prepare the Flow
                                        </h3>

                                        <div className="mb-6 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 overflow-x-auto">
                                            <span className="font-semibold text-slate-900 dark:text-white flex-shrink-0">Go to:</span>
                                            <div className="flex items-center gap-1.5 px-2 py-1 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 whitespace-nowrap">
                                                <LayoutDashboard className="w-3.5 h-3.5" />
                                                <span>Sidebar</span>
                                            </div>
                                            <ChevronRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                                            <div className="flex items-center gap-1.5 px-2 py-1 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 whitespace-nowrap">
                                                <Workflow className="w-3.5 h-3.5" />
                                                <span>Flows</span>
                                            </div>
                                            <ChevronRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                                            <div className="flex items-center gap-1.5 px-2 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded border border-indigo-200 dark:border-indigo-500/30 whitespace-nowrap">
                                                <Plus className="w-3.5 h-3.5" />
                                                <span>New Flow</span>
                                            </div>
                                        </div>

                                        <ul className="space-y-4 text-slate-600 dark:text-slate-400 text-sm">
                                            <li className="flex items-start gap-3">
                                                <Plus className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5" />
                                                <span>
                                                    Click <strong>+ New Flow</strong> in the flows dashboard.
                                                </span>
                                            </li>
                                            <li className="flex items-start gap-3">
                                                <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                                                <span>
                                                    Ensure the <strong>Start Node</strong> is present on the canvas. This is your entry point.
                                                </span>
                                            </li>
                                        </ul>
                                    </div>

                                    {/* Step 2 */}
                                    <div className="relative pl-10 border-l border-slate-200 dark:border-slate-800 pb-12 last:pb-0">
                                        <div className="absolute -left-3 top-0 w-6 h-6 rounded-full bg-white dark:bg-slate-950 border-2 border-slate-300 dark:border-slate-700 flex items-center justify-center text-xs font-semibold text-slate-600 dark:text-slate-400">
                                            2
                                        </div>

                                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
                                            Connect the AI Node
                                        </h3>
                                        <ul className="space-y-4 text-slate-600 dark:text-slate-400 text-sm">
                                            <li className="flex items-start gap-3">
                                                <div className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 mt-0.5">DRAG</div>
                                                <span>
                                                    Find the <strong>AI Node</strong> in the sidebar and drag it onto the canvas.
                                                </span>
                                            </li>
                                            <li className="flex items-start gap-3">
                                                <ArrowRight className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
                                                <span>
                                                    Connect the <strong>Start Node</strong> directly to the <strong>AI Node</strong>.
                                                </span>
                                            </li>
                                        </ul>
                                    </div>

                                    {/* Step 3 */}
                                    <div className="relative pl-10 border-l border-slate-200 dark:border-slate-800 pb-12 last:pb-0">
                                        <div className="absolute -left-3 top-0 w-6 h-6 rounded-full bg-white dark:bg-slate-950 border-2 border-slate-300 dark:border-slate-700 flex items-center justify-center text-xs font-semibold text-slate-600 dark:text-slate-400">
                                            3
                                        </div>

                                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
                                            Train Your Agent
                                        </h3>
                                        <ul className="space-y-4 text-slate-600 dark:text-slate-400 text-sm">
                                            <li className="flex items-start gap-3">
                                                <Settings className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
                                                <span>
                                                    Click the <strong>AI Node</strong> to open the configuration panel.
                                                </span>
                                            </li>
                                            <li className="flex items-start gap-3">
                                                <BrainCircuit className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
                                                <span>
                                                    In the text area, describe your business, tone of voice, and key answers. This is your "System Prompt".
                                                </span>
                                            </li>
                                            <li className="flex items-start gap-3">
                                                <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                                                <span>
                                                    The AI will now use this context to answer <strong>any</strong> question it receives.
                                                </span>
                                            </li>
                                        </ul>
                                    </div>

                                    {/* Step 4 */}
                                    <div className="relative pl-10 border-l border-slate-200 dark:border-slate-800">
                                        <div className="absolute -left-3 top-0 w-6 h-6 rounded-full bg-indigo-600 border-2 border-indigo-600 flex items-center justify-center text-xs font-semibold text-white">
                                            4
                                        </div>

                                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
                                            Activate 24/7 Support
                                        </h3>
                                        <p className="text-slate-600 dark:text-slate-400 mb-4">
                                            Once you switch the flow to <strong>Active</strong>, the AI will intercept and reply to every message sent to your page that doesn't trigger another keyword.
                                        </p>
                                        <div className="bg-indigo-50 dark:bg-indigo-900/20 border-l-4 border-indigo-500 p-4 rounded-r-lg">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                                <span className="font-semibold text-indigo-900 dark:text-indigo-200 text-sm">Pro Tip</span>
                                            </div>
                                            <p className="text-sm text-indigo-900 dark:text-indigo-200">
                                                The AI remembers conversation history! If a user asks a follow-up question, the AI knows what was said previously.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Academy;
