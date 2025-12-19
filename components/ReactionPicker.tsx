import React from 'react';
import { ReactionType } from '../types';

interface ReactionPickerProps {
    onReact: (reaction: ReactionType) => void;
    currentReaction?: ReactionType;
    position?: 'top' | 'bottom';
}

const REACTIONS: { type: ReactionType; emoji: string }[] = [
    { type: 'LOVE', emoji: '❤️' },
    { type: 'HAHA', emoji: '😂' },
    { type: 'WOW', emoji: '😮' },
    { type: 'SAD', emoji: '😢' },
    { type: 'ANGRY', emoji: '😠' },
    { type: 'LIKE', emoji: '👍' },
];

export const ReactionPicker: React.FC<ReactionPickerProps> = ({
    onReact,
    currentReaction,
    position = 'top'
}) => {
    return (
        <div
            className={`absolute ${position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'} left-1/2 transform -translate-x-1/2 z-50`}
            onClick={(e) => e.stopPropagation()}
        >
            <div className="bg-slate-900 border border-slate-700 rounded-full px-3 py-2 flex items-center gap-1 shadow-xl animate-in fade-in zoom-in duration-200">
                {REACTIONS.map(({ type, emoji }) => (
                    <button
                        key={type}
                        onClick={() => onReact(type)}
                        className={`
              text-2xl p-2 rounded-full transition-all duration-150 hover:scale-125 hover:bg-slate-800
              ${currentReaction === type ? 'bg-blue-600 scale-110' : ''}
            `}
                        title={type}
                    >
                        {emoji}
                    </button>
                ))}
            </div>
            {/* Arrow pointing to message */}
            <div className={`absolute left-1/2 transform -translate-x-1/2 ${position === 'top' ? 'top-full' : 'bottom-full'}`}>
                <div className={`w-0 h-0 border-l-8 border-r-8 border-transparent ${position === 'top' ? 'border-t-8 border-t-slate-700' : 'border-b-8 border-b-slate-700'}`}></div>
            </div>
        </div>
    );
};
