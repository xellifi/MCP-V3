import React from 'react';
import { Reaction, ReactionType } from '../types';

interface ReactionDisplayProps {
    reactions: Reaction[];
    onReactionClick?: (reaction: ReactionType) => void;
}

const REACTION_EMOJIS: Record<ReactionType, string> = {
    LOVE: '❤️',
    HAHA: '😂',
    WOW: '😮',
    SAD: '😢',
    ANGRY: '😠',
    LIKE: '👍',
};

export const ReactionDisplay: React.FC<ReactionDisplayProps> = ({
    reactions,
    onReactionClick
}) => {
    // Group reactions by type and count
    const reactionCounts = reactions.reduce((acc, reaction) => {
        acc[reaction.reaction] = (acc[reaction.reaction] || 0) + 1;
        return acc;
    }, {} as Record<ReactionType, number>);

    const reactionEntries = Object.entries(reactionCounts) as [ReactionType, number][];

    if (reactionEntries.length === 0) return null;

    return (
        <div className="flex items-center gap-1 mt-1 flex-wrap animate-in slide-in-from-bottom-2 duration-200">
            {reactionEntries.map(([type, count]) => (
                <button
                    key={type}
                    onClick={() => onReactionClick?.(type)}
                    className="
            flex items-center gap-1 px-2 py-0.5 
            bg-slate-800 hover:bg-slate-700 
            border border-slate-700 hover:border-slate-600
            rounded-full text-xs 
            transition-all duration-150 hover:scale-105
          "
                    title={`${count} ${type.toLowerCase()} reaction${count > 1 ? 's' : ''}`}
                >
                    <span className="text-sm">{REACTION_EMOJIS[type]}</span>
                    {count > 1 && (
                        <span className="text-slate-400 font-medium">{count}</span>
                    )}
                </button>
            ))}
        </div>
    );
};
