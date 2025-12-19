// Add these methods to api.ts workspace object, after sendMessage and before getFlows:

// Reaction methods
addReaction: async (messageId: string, reaction: ReactionType): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
        .from('reactions')
        .upsert({
            message_id: messageId,
            user_id: user.id,
            reaction: reaction
        }, {
            onConflict: 'message_id,user_id'
        });

    if (error) {
        console.error('Error adding reaction:', error);
        throw new Error(error.message);
    }
},

    removeReaction: async (messageId: string): Promise<void> => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { error } = await supabase
            .from('reactions')
            .delete()
            .eq('message_id', messageId)
            .eq('user_id', user.id);

        if (error) {
            console.error('Error removing reaction:', error);
            throw new Error(error.message);
        }
    },

        getReactions: async (messageId: string): Promise<Reaction[]> => {
            const { data, error } = await supabase
                .from('reactions')
                .select('*')
                .eq('message_id', messageId);

            if (error) {
                console.error('Error fetching reactions:', error);
                return [];
            }

            return (data || []).map(row => ({
                id: row.id,
                messageId: row.message_id,
                userId: row.user_id,
                reaction: row.reaction as ReactionType,
                createdAt: row.created_at
            }));
        },
