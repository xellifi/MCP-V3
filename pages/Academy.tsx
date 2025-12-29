import React, { useState } from 'react';
import {
    BookOpen,
    MessageSquare,
    Bot,
    PenTool,
    ChevronRight,
    CheckCircle2,
    Zap,
    LayoutDashboard,
    MousePointer2
} from 'lucide-react';
import { User } from '../types';

interface AcademyProps {
    user: User;
}

const Academy: React.FC<AcademyProps> = ({ user }) => {
    const [activeTutorial, setActiveTutorial] = useState('facebook-replies');

    return (
        <div className="space-y-8 pb-10">
            {/* Header */}
            <div>
                <h1 className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-purple-600 dark:from-indigo-400 dark:to-purple-400">
                    Academy
                </h1>
                <p className="text-slate-600 dark:text-slate-400 mt-2">
                    Master your automation tools with our step-by-step guides.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Sidebar Navigation (Desktop: Left Col, Mobile: Top) */}
                <div className="lg:col-span-3 lg:sticky lg:top-8 h-fit space-y-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
                        <h3 className="font-semibold text-slate-900 dark:text-white mb-4 px-2">
                            Tutorials
                        </h3>
                        <nav className="space-y-1">
                            <button
                                onClick={() => setActiveTutorial('facebook-replies')}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all font-medium text-sm text-left
                                ${activeTutorial === 'facebook-replies'
                                        ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                                    }`}
                            >
                                <MessageSquare className="w-4 h-4" />
                                Facebook Replies
                            </button>
                            {/* Placeholder for future tutorials */}
                            <button
                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all font-medium text-sm text-left text-slate-400 dark:text-slate-600 cursor-not-allowed opacity-70"
                                disabled
                            >
                                <Zap className="w-4 h-4" />
                                SCheduled Poster Ai (Soon)
                            </button>
                        </nav>
                    </div>
                </div>

                {/* Content Area */}
                <div className="lg:col-span-9 space-y-8">
                    {/* Facebook Replies Tutorial */}
                    {activeTutorial === 'facebook-replies' && (
                        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                            {/* Tutorial Header */}
                            <div className="relative p-6 md:p-10 bg-gradient-to-br from-indigo-600 to-purple-700 overflow-hidden">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
                                <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/10 rounded-full blur-2xl -ml-20 -mb-20"></div>

                                <div className="relative z-10 flex items-start justify-between gap-4">
                                    <div>
                                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-semibold backdrop-blur-md mb-4 border border-white/20">
                                            <BookOpen className="w-3.5 h-3.5" />
                                            Beginner's Guide
                                        </div>
                                        <h2 className="text-2xl md:text-4xl font-bold text-white mb-3">
                                            Facebook Comment Replies
                                        </h2>
                                        <p className="text-white/80 md:text-lg max-w-2xl leading-relaxed">
                                            Learn how to automatically reply to comments on your Facebook posts.
                                            Choose between AI-powered smart responses or custom manual templates.
                                        </p>
                                    </div>
                                    <div className="hidden md:flex bg-white/10 p-4 rounded-2xl backdrop-blur-sm border border-white/20">
                                        <MessageSquare className="w-12 h-12 text-white" />
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 md:p-10 space-y-12">
                                {/* Intro Section */}
                                <div className="prose dark:prose-invert max-w-none">
                                    <h3 className="flex items-center gap-2 text-xl font-bold text-slate-900 dark:text-white">
                                        <Bot className="w-6 h-6 text-indigo-500" />
                                        Two Ways to Automate
                                    </h3>
                                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                                        Our platform offers two powerful methods for handling Facebook comments.
                                        You can either let Artificial Intelligence handle the conversation naturally,
                                        or set up specific, predictable manual responses.
                                    </p>

                                    <div className="grid md:grid-cols-2 gap-6 mt-6">
                                        <div className="p-6 rounded-2xl bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-500/20">
                                            <h4 className="font-semibold text-indigo-700 dark:text-indigo-400 mb-2 flex items-center gap-2">
                                                <Zap className="w-4 h-4" />
                                                AI Smart Reply
                                            </h4>
                                            <p className="text-sm text-slate-600 dark:text-slate-400">
                                                Uses advanced AI (like ChatGPT) to read the user's comment and generate a relevant,
                                                context-aware response. Best for engagement and general questions.
                                            </p>
                                        </div>
                                        <div className="p-6 rounded-2xl bg-purple-50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-500/20">
                                            <h4 className="font-semibold text-purple-700 dark:text-purple-400 mb-2 flex items-center gap-2">
                                                <PenTool className="w-4 h-4" />
                                                Manual Template
                                            </h4>
                                            <p className="text-sm text-slate-600 dark:text-slate-400">
                                                Uses a pre-written message template. Great for delivering specific links,
                                                coupon codes, or standard support answers.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Step 1 */}
                                <div className="relative pl-8 md:pl-12 border-l-2 border-slate-200 dark:border-slate-800 pb-12 last:pb-0">
                                    <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-indigo-500 ring-4 ring-white dark:ring-slate-900"></div>

                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3">
                                            <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm">
                                                1
                                            </span>
                                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                                                Create a New Flow
                                            </h3>
                                        </div>

                                        <p className="text-slate-600 dark:text-slate-400">
                                            Navigate to the <strong>Flows</strong> section in the sidebar and click on "Create New Flow". This is where you'll design your automation.
                                        </p>

                                        <div className="bg-slate-100 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                                            <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
                                                <LayoutDashboard className="w-4 h-4" />
                                                <span>Navigation Path:</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-white">
                                                Sidebar <ChevronRight className="w-4 h-4 text-slate-400" /> Flows <ChevronRight className="w-4 h-4 text-slate-400" /> + New Flow
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Step 2 */}
                                <div className="relative pl-8 md:pl-12 border-l-2 border-slate-200 dark:border-slate-800 pb-12 last:pb-0">
                                    <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-indigo-500 ring-4 ring-white dark:ring-slate-900"></div>

                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3">
                                            <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm">
                                                2
                                            </span>
                                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                                                Configure the Trigger (Start Node)
                                            </h3>
                                        </div>

                                        <p className="text-slate-600 dark:text-slate-400">
                                            The flow starts with a Trigger Node (Start Node). click the gear icon on the start node to configure it.
                                        </p>

                                        <ul className="space-y-2 text-slate-600 dark:text-slate-400 list-none">
                                            <li className="flex items-start gap-2">
                                                <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                                                <span>Select your Facebook Page from the dropdown.</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                                                <span>Ensure <strong>"Auto-Reply to Comments"</strong> is toggled ON.</span>
                                            </li>
                                        </ul>
                                    </div>
                                </div>

                                {/* Step 3 */}
                                <div className="relative pl-8 md:pl-12 border-l-2 border-slate-200 dark:border-slate-800 pb-12 last:pb-0">
                                    <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-indigo-500 ring-4 ring-white dark:ring-slate-900"></div>

                                    <div className="space-y-6">
                                        <div className="flex items-center gap-3">
                                            <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm">
                                                3
                                            </span>
                                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                                                Comment Reply Node
                                            </h3>
                                        </div>

                                        <p className="text-slate-600 dark:text-slate-400">
                                            This is the node responsible for all <strong>"Comments Reply"</strong> from the page.
                                        </p>

                                        {/* AI vs Manual Tabs/Grid */}
                                        <div className="grid md:grid-cols-2 gap-6">
                                            {/* Option A: AI */}
                                            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
                                                <h4 className="font-bold text-lg mb-4 text-indigo-600 dark:text-indigo-400">Option A: Using AI Reply</h4>
                                                <ol className="space-y-3 text-sm text-slate-600 dark:text-slate-400 list-decimal pl-4">
                                                    <li>Open the Comment Reply node configuration.</li>
                                                    <li>Toggle <strong>"Use AI to Generated Reply"</strong> to ON.</li>
                                                    <li>Select your AI Model (e.g., GPT-4o, Claude).</li>
                                                    <li>Enter a <strong>Prompt</strong>. Tell the AI how to behave.
                                                        <div className="mt-2 p-2 bg-white dark:bg-slate-900 rounded text-xs italic border border-slate-200 dark:border-slate-700">
                                                            "You are a helpful assistant for [Brand Name]. Answer questions politely and briefly."
                                                        </div>
                                                    </li>
                                                </ol>
                                            </div>

                                            {/* Option B: Manual */}
                                            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
                                                <h4 className="font-bold text-lg mb-4 text-purple-600 dark:text-purple-400">Option B: Manual Reply</h4>
                                                <ol className="space-y-3 text-sm text-slate-600 dark:text-slate-400 list-decimal pl-4">
                                                    <li>Open the Comment Reply node configuration.</li>
                                                    <li>Ensure "Use AI" is OFF.</li>
                                                    <li>Type your message in the text box.</li>
                                                    <li>Use <strong>Dynamic Variables</strong> to personalize:
                                                        <div className="mt-2 flex flex-wrap gap-2">
                                                            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs font-mono">{'{first_name}'}</span>
                                                            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs font-mono">{'{comment_text}'}</span>
                                                        </div>
                                                    </li>
                                                </ol>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Step 4 */}
                                <div className="relative pl-8 md:pl-12 border-l-2 border-slate-200 dark:border-slate-800 pb-2">
                                    <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-green-500 ring-4 ring-white dark:ring-slate-900"></div>

                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3">
                                            <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 flex items-center justify-center font-bold text-sm">
                                                4
                                            </span>
                                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                                                Save and Activate
                                            </h3>
                                        </div>

                                        <p className="text-slate-600 dark:text-slate-400">
                                            Once you're happy with your setup:
                                        </p>

                                        <div className="flex flex-col sm:flex-row gap-4">
                                            <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/30 rounded-xl flex-1">
                                                <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-xs">A</div>
                                                <div className="text-sm">
                                                    <span className="font-bold text-slate-900 dark:text-white block">Click "Save Draft"</span>
                                                    <span className="text-slate-500">To save your work</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 p-4 bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/30 rounded-xl flex-1">
                                                <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold text-xs">B</div>
                                                <div className="text-sm">
                                                    <span className="font-bold text-slate-900 dark:text-white block">Toggle "Active"</span>
                                                    <span className="text-slate-500">To create the automation live</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-8 p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20 rounded-xl">
                                            <p className="text-sm text-amber-800 dark:text-amber-200 flex gap-2">
                                                <span className="text-xl">🎉</span>
                                                <span>
                                                    <strong>That's it!</strong> Your automation is now running. Any new comment on your selected Facebook Page will trigger this flow and send your configured reply.
                                                </span>
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Academy;
