// Add this code to Inbox.tsx message rendering section (around line 634-695)
// Replace the message map function with this enhanced version that includes reactions

{
    messages.map((msg, idx) => {
        const isOutbound = msg.direction === 'OUTBOUND';
        return (
            <div key={msg.id} className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}>
                <div
                    className={`max-w-[70%] ${isOutbound ? 'ml-auto' : 'mr-auto'} relative`}
                    onMouseEnter={() => setHoveredMessageId(msg.id)}
                    onMouseLeave={() => setHoveredMessageId(null)}
                >
                    <div className={`rounded-2xl px-4 py-2 ${isOutbound
                        ? 'bg-blue-600 text-white rounded-br-sm'
                        : 'bg-slate-800 text-slate-100 rounded-bl-sm'
                        }`}>
                        {/* Image/Video/File rendering stays the same */}
                        {msg.type === 'IMAGE' && msg.attachmentUrl && (
                            <img
                                src={msg.attachmentUrl}
                                alt="Attachment"
                                className="rounded-lg mb-2 max-w-full max-h-96 object-contain"
                                onError={(e) => {
                                    console.error('Image load error:', msg.attachmentUrl);
                                    e.currentTarget.style.display = 'none';
                                }}
                            />
                        )}
                        {msg.type === 'VIDEO' && msg.attachmentUrl && (
                            <video src={msg.attachmentUrl} controls className="rounded-lg mb-2 max-w-full max-h-96" />
                        )}
                        {msg.type === 'FILE' && msg.attachmentUrl && (
                            <a href={msg.attachmentUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 mb-2">
                                <FileText className="w-4 h-4" />
                                <span className="text-sm underline">{msg.fileName || 'Download File'}</span>
                            </a>
                        )}
                        {msg.content && <p className="whitespace-pre-wrap break-words">{msg.content}</p>}
                    </div>

                    {/* NEW: Reaction Picker - shows on hover */}
                    {hoveredMessageId === msg.id && (
                        <ReactionPicker
                            onReact={(reaction) => {
                                console.log('React with:', reaction, 'to message:', msg.id);
                                // TODO: Call API when integrated
                            }}
                            currentReaction={undefined} // TODO: Get from messageReactions
                            position="top"
                        />
                    )}

                    {/* NEW: Reaction Display - shows if message has reactions */}
                    {messageReactions[msg.id]?.length > 0 && (
                        <ReactionDisplay
                            reactions={messageReactions[msg.id]}
                            onReactionClick={(reaction) => {
                                console.log('Clicked reaction:', reaction);
                            }}
                        />
                    )}

                    {/* Message status (stays the same) */}
                    <div className={`flex items-center gap-2 mt-1 ${isOutbound ? 'justify-end' : 'justify-start'}`}>
                        {/* ... existing status code ... */}
                    </div>
                </div>
            </div>
        );
    })
}
