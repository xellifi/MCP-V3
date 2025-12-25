import { supabase } from '../lib/supabase';
import { MOCK_AUTH_DB, MOCK_WORKSPACES } from '../constants';
import { User, Workspace, MetaConnection, ConnectedPage, Flow, ScheduledPost, AdminSettings, Subscriber, Conversation, Message, UserRole, IntegrationSettings, Referral, AffiliateStats, PayoutSettings, WithdrawalRequest, SupportTicket, TicketMessage, Reaction, ReactionType } from '../types';

// Simulating async API calls (for fallback/demo)
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper to convert Supabase row to TypeScript types
const mapProfile = (row: any): User => ({
  id: row.id,
  email: row.email,
  name: row.name,
  role: (row.role?.toUpperCase() || 'MEMBER') as UserRole,  // Convert lowercase DB value to uppercase enum
  avatarUrl: row.avatar_url,
  affiliateCode: row.affiliate_code
});

const mapWorkspace = (row: any): Workspace => ({
  id: row.id,
  name: row.name,
  ownerId: row.owner_id
});

const mapConnection = (row: any): MetaConnection => ({
  id: row.id,
  workspaceId: row.workspace_id,
  platform: row.platform,
  name: row.name,
  externalId: row.external_id,
  status: row.status,
  imageUrl: row.image_url
});

const mapConnectedPage = (row: any): ConnectedPage => ({
  id: row.id,
  workspaceId: row.workspace_id,
  name: row.name,
  pageId: row.page_id,
  pageImageUrl: row.page_image_url,
  pageFollowers: row.page_followers || 0,
  instagram: row.instagram_id ? {
    id: row.instagram_id,
    username: row.instagram_username,
    imageUrl: row.instagram_image_url,
    followers: row.instagram_followers
  } : undefined,
  isAutomationEnabled: row.is_automation_enabled,
  status: row.status
});

const mapSubscriber = (row: any): Subscriber => ({
  id: row.id,
  workspaceId: row.workspace_id,
  name: row.name,
  platform: row.platform,
  externalId: row.external_id,
  avatarUrl: row.avatar_url,
  status: row.status,
  tags: row.tags || [],
  lastActiveAt: row.last_active_at
});

const mapConversation = (row: any): Conversation => ({
  id: row.id,
  workspaceId: row.workspace_id,
  subscriberId: row.subscriber_id,
  platform: row.platform,
  lastMessagePreview: row.last_message_preview,
  unreadCount: row.unread_count,
  updatedAt: row.updated_at,
  externalId: row.external_id,
  pageId: row.page_id
});

const mapMessage = (row: any): Message => ({
  id: row.id,
  conversationId: row.conversation_id,
  direction: row.direction,
  content: row.content,
  type: row.type,
  attachmentUrl: row.attachment_url,
  fileName: row.file_name,
  createdAt: row.created_at,
  status: row.status,
  externalId: row.external_id,
  senderId: row.sender_id
});

const mapFlow = (row: any): Flow => ({
  id: row.id,
  workspaceId: row.workspace_id,
  name: row.name,
  status: row.status,
  updatedAt: row.updated_at,
  nodes: row.nodes || [],
  edges: row.edges || [],
  configurations: row.configurations || {}
});

const mapScheduledPost = (row: any): ScheduledPost => ({
  id: row.id,
  workspaceId: row.workspace_id,
  content: row.content,
  platform: row.platform,
  scheduledAt: row.scheduled_at,
  status: row.status,
  imageUrl: row.image_url
});

// Mock DBs for features not yet migrated
const MOCK_INTEGRATIONS_DB: Record<string, IntegrationSettings> = {};
const MOCK_PAYOUTS_DB: Record<string, PayoutSettings> = {};
let MOCK_WITHDRAWALS_DB: WithdrawalRequest[] = [];
let MOCK_TICKETS_DB: SupportTicket[] = [];
let MOCK_REFERRALS_DB: Referral[] = [];

export const api = {
  auth: {
    login: async (email: string, password: string): Promise<User> => {
      // Production: Check Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (!error && data.user) {
        // Fetch profile from Supabase
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (profile) {
          return mapProfile(profile);
        }
      }

      // Fallback to Mock for demo if Supabase fails
      await delay(800);
      const user = MOCK_AUTH_DB.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);

      if (!user) {
        throw new Error('Invalid credentials');
      }
      const { password: _, ...userWithoutPassword } = user;
      return userWithoutPassword;
    },

    register: async (name: string, email: string, password: string): Promise<User> => {
      // Production: Register with Supabase
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.user) {
        // Profile is created via Trigger in DB
        // Wait a moment for trigger to complete
        await delay(500);

        // Fetch the created profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (profile) {
          return mapProfile(profile);
        }

        // Return optimistic user if profile fetch fails
        return {
          id: data.user.id,
          email: email,
          name: name,
          role: UserRole.MEMBER,
          avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`
        };
      }

      throw new Error('Registration failed');
    },

    logout: async () => {
      await supabase.auth.signOut();
    },

    getSession: async (): Promise<User | null> => {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profile) {
          return mapProfile(profile);
        }
      }
      return null;
    }
  },

  user: {
    getPayoutSettings: async (userId: string): Promise<PayoutSettings> => {
      await delay(300);
      return MOCK_PAYOUTS_DB[userId] || {
        userId,
        method: 'PAYPAL',
        paypalEmail: '',
        bankName: '',
        accountNumber: '',
        routingNumber: '',
        accountName: ''
      };
    },
    savePayoutSettings: async (settings: PayoutSettings): Promise<void> => {
      await delay(500);
      MOCK_PAYOUTS_DB[settings.userId] = settings;
    }
  },

  workspace: {
    list: async (): Promise<Workspace[]> => {
      const { data, error } = await supabase
        .from('workspaces')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching workspaces:', error);
        return MOCK_WORKSPACES; // Fallback
      }

      return data?.map(mapWorkspace) || [];
    },

    getConnections: async (workspaceId: string): Promise<MetaConnection[]> => {
      const { data, error } = await supabase
        .from('meta_connections')
        .select('*')
        .eq('workspace_id', workspaceId);

      if (error) {
        console.error('Error fetching connections:', error);
        return [];
      }

      return data?.map(mapConnection) || [];
    },

    createConnection: async (workspaceId: string, connectionData: {
      platform: string;
      name: string;
      externalId: string;
      imageUrl?: string;
      accessToken: string;
    }): Promise<MetaConnection> => {
      // GLOBAL CHECK: Check if this Facebook profile is already connected by ANY user
      const { data: globalExisting } = await supabase
        .from('meta_connections')
        .select('id, workspace_id, name')
        .eq('external_id', connectionData.externalId)
        .neq('workspace_id', workspaceId)  // Exclude current workspace
        .single();

      if (globalExisting) {
        console.error('Profile already connected by another user:', globalExisting);
        throw new Error(`This Facebook profile "${connectionData.name}" is already connected by another user. Each profile can only be connected to one account.`);
      }

      // Check if a connection with this external_id already exists in THIS workspace
      const { data: existingConnection } = await supabase
        .from('meta_connections')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('external_id', connectionData.externalId)
        .single();

      if (existingConnection) {
        // Update existing connection
        const { data, error } = await supabase
          .from('meta_connections')
          .update({
            name: connectionData.name,
            image_url: connectionData.imageUrl,
            status: 'ACTIVE',
            access_token: connectionData.accessToken
          })
          .eq('id', existingConnection.id)
          .select()
          .single();

        if (error) {
          console.error('Error updating connection:', error);
          console.error('Error details:', JSON.stringify(error, null, 2));
          throw new Error(error.message || 'Failed to update connection');
        }

        return mapConnection(data);
      }

      // Create new connection
      const { data, error } = await supabase
        .from('meta_connections')
        .insert({
          workspace_id: workspaceId,
          platform: connectionData.platform,
          name: connectionData.name,
          external_id: connectionData.externalId,
          image_url: connectionData.imageUrl,
          status: 'ACTIVE',
          access_token: connectionData.accessToken
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating connection:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        throw new Error(error.message || 'Failed to create connection');
      }

      return mapConnection(data);
    },

    deleteConnection: async (connectionId: string): Promise<void> => {
      // First get the workspace_id for this connection
      const { data: connectionData } = await supabase
        .from('meta_connections')
        .select('workspace_id')
        .eq('id', connectionId)
        .single();

      const workspaceId = connectionData?.workspace_id;

      if (!workspaceId) {
        throw new Error('Connection not found');
      }

      // Check if any pages have automation enabled
      const { data: pages } = await supabase
        .from('connected_pages')
        .select('id, name, is_automation_enabled')
        .eq('workspace_id', workspaceId);

      const pagesWithAutomation = pages?.filter(p => p.is_automation_enabled) || [];

      if (pagesWithAutomation.length > 0) {
        const pageNames = pagesWithAutomation.map(p => p.name).join(', ');
        throw new Error(`Cannot delete connection. Please disable automation for these pages first: ${pageNames}`);
      }

      console.log('Starting cascade delete for workspace:', workspaceId);

      // Get all conversation IDs for this workspace to delete messages first
      const { data: conversations } = await supabase
        .from('conversations')
        .select('id')
        .eq('workspace_id', workspaceId);

      const conversationIds = conversations?.map(c => c.id) || [];

      // 1. Delete all messages for these conversations
      if (conversationIds.length > 0) {
        const { error: messagesError } = await supabase
          .from('messages')
          .delete()
          .in('conversation_id', conversationIds);

        if (messagesError) {
          console.error('Error deleting messages:', messagesError);
          // Continue anyway - messages might have cascade delete
        } else {
          console.log('Deleted messages for', conversationIds.length, 'conversations');
        }
      }

      // 2. Delete all conversations for this workspace
      const { error: conversationsError } = await supabase
        .from('conversations')
        .delete()
        .eq('workspace_id', workspaceId);

      if (conversationsError) {
        console.error('Error deleting conversations:', conversationsError);
        // Continue anyway
      } else {
        console.log('Deleted all conversations for workspace:', workspaceId);
      }

      // 3. Delete all subscribers for this workspace
      const { error: subscribersError } = await supabase
        .from('subscribers')
        .delete()
        .eq('workspace_id', workspaceId);

      if (subscribersError) {
        console.error('Error deleting subscribers:', subscribersError);
        // Continue anyway
      } else {
        console.log('Deleted all subscribers for workspace:', workspaceId);
      }

      // 4. Delete all connected pages for this workspace
      const { error: pagesError } = await supabase
        .from('connected_pages')
        .delete()
        .eq('workspace_id', workspaceId);

      if (pagesError) {
        console.error('Error deleting connected pages:', pagesError);
        throw new Error(pagesError.message || 'Failed to delete connected pages');
      }

      console.log('Deleted all connected pages for workspace:', workspaceId);

      // 5. Delete the connection itself
      const { error } = await supabase
        .from('meta_connections')
        .delete()
        .eq('id', connectionId);

      if (error) {
        console.error('Error deleting connection:', error);
        throw new Error(error.message || 'Failed to delete connection');
      }

      console.log('Successfully deleted connection and ALL associated data (messages, conversations, subscribers, pages)');
    },

    fetchPagesFromFacebook: async (workspaceId: string): Promise<ConnectedPage[]> => {
      console.log('Fetching pages from Facebook for workspace:', workspaceId);

      // Get all connections for this workspace
      const { data: connections, error: connectionsError } = await supabase
        .from('meta_connections')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('platform', 'FACEBOOK')
        .eq('status', 'ACTIVE');

      console.log('Connections query result:', { connections, connectionsError });
      console.log('Number of connections found:', connections?.length || 0);

      if (connectionsError) {
        console.error('Error fetching connections:', connectionsError);
        throw new Error(`Failed to fetch connections: ${connectionsError.message}`);
      }

      if (!connections || connections.length === 0) {
        console.log('No active Facebook connections found');
        throw new Error('No Facebook connections found. Please connect your Facebook profile first.');
      }

      console.log('Found connections:', connections.map(c => ({ id: c.id, name: c.name, hasToken: !!c.access_token })));

      const allPages: ConnectedPage[] = [];

      // For each connection, fetch their pages
      for (const connection of connections) {
        if (!connection.access_token) {
          console.warn(`Connection ${connection.id} has no access token`);
          continue;
        }

        try {
          console.log(`Fetching pages for connection: ${connection.name}`);
          console.log(`Using access token: ${connection.access_token.substring(0, 20)}...`);

          // Fetch pages from Facebook Graph API
          const pagesResponse = await fetch(
            `https://graph.facebook.com/v18.0/me/accounts?fields=id,name,access_token,picture,fan_count,instagram_business_account{id,username,profile_picture_url,followers_count}&access_token=${connection.access_token}`
          );
          const pagesData = await pagesResponse.json();

          console.log('Facebook API Response:', pagesData);

          if (pagesData.error) {
            console.error('Facebook API error:', pagesData.error);
            console.error('Error message:', pagesData.error.message);
            console.error('Error type:', pagesData.error.type);
            console.error('Error code:', pagesData.error.code);
            continue;
          }

          if (!pagesData.data || pagesData.data.length === 0) {
            console.log(`No pages found for connection: ${connection.name}`);
            console.log('Response data:', pagesData);
            continue;
          }

          console.log(`Found ${pagesData.data.length} pages for ${connection.name}`);

          // Save each page to database
          for (const fbPage of pagesData.data) {
            const pageData = {
              workspace_id: workspaceId,
              name: fbPage.name,
              page_id: fbPage.id,
              page_image_url: fbPage.picture?.data?.url || `https://ui-avatars.com/api/?name=${encodeURIComponent(fbPage.name)}&background=1877F2&color=fff`,
              page_followers: fbPage.fan_count || 0,
              page_access_token: fbPage.access_token,
              instagram_id: fbPage.instagram_business_account?.id || null,
              instagram_username: fbPage.instagram_business_account?.username || null,
              instagram_image_url: fbPage.instagram_business_account?.profile_picture_url || null,
              instagram_followers: fbPage.instagram_business_account?.followers_count || null,
              status: 'CONNECTED'
            };

            // Check if page already exists
            const { data: existingPage } = await supabase
              .from('connected_pages')
              .select('id')
              .eq('workspace_id', workspaceId)
              .eq('page_id', fbPage.id)
              .single();

            if (existingPage) {
              // Update existing page
              const { data: updatedPage, error: updateError } = await supabase
                .from('connected_pages')
                .update(pageData)
                .eq('id', existingPage.id)
                .select()
                .single();

              if (!updateError && updatedPage) {
                allPages.push(mapConnectedPage(updatedPage));
                console.log(`Updated page: ${fbPage.name}`);
              }
            } else {
              // Insert new page
              const { data: newPage, error: insertError } = await supabase
                .from('connected_pages')
                .insert(pageData)
                .select()
                .single();

              if (!insertError && newPage) {
                allPages.push(mapConnectedPage(newPage));
                console.log(`Added new page: ${fbPage.name}`);
              }
            }
          }
        } catch (error) {
          console.error(`Error fetching pages for connection ${connection.name}:`, error);
        }
      }

      console.log(`Total pages fetched and saved: ${allPages.length}`);
      return allPages;
    },

    getConnectedPages: async (workspaceId: string): Promise<ConnectedPage[]> => {
      const { data, error } = await supabase
        .from('connected_pages')
        .select('*')
        .eq('workspace_id', workspaceId);

      if (error) {
        console.error('Error fetching pages:', error);
        return [];
      }

      // Map pages and use Facebook Graph API for fresh picture URLs
      return data?.map(row => {
        const page = mapConnectedPage(row);
        // Use Facebook Graph API picture endpoint for fresh, non-expiring URLs
        // This returns a redirect to the current profile picture
        if (row.page_id) {
          page.pageImageUrl = `https://graph.facebook.com/${row.page_id}/picture?type=small`;
        }
        return page;
      }) || [];
    },

    togglePageAutomation: async (pageId: string, enabled: boolean): Promise<void> => {
      const { error } = await supabase
        .from('connected_pages')
        .update({ is_automation_enabled: enabled })
        .eq('id', pageId);

      if (error) {
        console.error('Error toggling automation:', error);
        throw new Error('Failed to update automation status');
      }
    },

    getSubscribers: async (workspaceId: string): Promise<Subscriber[]> => {
      const { data, error } = await supabase
        .from('subscribers')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('last_active_at', { ascending: false });

      if (error) {
        console.error('Error fetching subscribers:', error);
        return [];
      }

      return data?.map(mapSubscriber) || [];
    },

    getConversations: async (workspaceId: string, pageId?: string): Promise<Conversation[]> => {
      let query = supabase
        .from('conversations')
        .select('*')
        .eq('workspace_id', workspaceId);

      // Filter by specific page if provided
      if (pageId) {
        query = query.eq('page_id', pageId);
      }

      const { data, error } = await query.order('updated_at', { ascending: false });

      if (error) {
        console.error('Error fetching conversations:', error);
        return [];
      }

      return data?.map(mapConversation) || [];
    },

    getMessages: async (conversationId: string): Promise<Message[]> => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
        throw new Error(error.message);
      }

      return (data || []).map(mapMessage);
    },

    deleteConversation: async (conversationId: string): Promise<void> => {
      // Delete messages first (due to foreign key constraint)
      const { error: messagesError } = await supabase
        .from('messages')
        .delete()
        .eq('conversation_id', conversationId);

      if (messagesError) {
        console.error('Error deleting messages:', messagesError);
        throw new Error(messagesError.message || 'Failed to delete messages');
      }

      // Then delete the conversation
      const { error: conversationError } = await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationId);

      if (conversationError) {
        console.error('Error deleting conversation:', conversationError);
        throw new Error(conversationError.message || 'Failed to delete conversation');
      }
    },

    // Fetch conversations from Facebook Messenger and sync to database
    fetchMessengerConversations: async (workspaceId: string, pageId?: string): Promise<Conversation[]> => {
      console.log('Fetching Messenger conversations for workspace:', workspaceId, pageId ? `page: ${pageId}` : 'all pages');

      // Get all connected pages with access tokens
      let query = supabase
        .from('connected_pages')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('status', 'CONNECTED');

      // Filter by specific page if provided
      if (pageId) {
        query = query.eq('page_id', pageId);
      }

      const { data: pages, error: pagesError } = await query;

      if (pagesError || !pages || pages.length === 0) {
        console.error('No connected pages found:', pagesError);
        throw new Error('No connected pages found. Please connect a Facebook page first.');
      }

      const allConversations: Conversation[] = [];

      // Fetch conversations for each page
      for (const page of pages) {
        if (!page.page_access_token) {
          console.warn(`Page ${page.name} has no access token`);
          continue;
        }

        try {
          console.log(`Fetching conversations for page: ${page.name}`);

          // Fetch conversations from Facebook Graph API
          const conversationsResponse = await fetch(
            `https://graph.facebook.com/v18.0/${page.page_id}/conversations?fields=id,participants,updated_time,messages.limit(1){message,from,created_time}&platform=messenger&access_token=${page.page_access_token}`
          );
          const conversationsData = await conversationsResponse.json();

          if (conversationsData.error) {
            console.error('Facebook API error:', conversationsData.error);
            continue;
          }

          if (!conversationsData.data || conversationsData.data.length === 0) {
            console.log(`No conversations found for page: ${page.name}`);
            continue;
          }

          console.log(`Found ${conversationsData.data.length} conversations for ${page.name}`);

          // Process each conversation
          for (const fbConv of conversationsData.data) {
            try {
              // Get the participant (exclude the page itself)
              const participant = fbConv.participants?.data?.find((p: any) => p.id !== page.page_id);
              if (!participant) continue;

              const psid = participant.id;
              const lastMessage = fbConv.messages?.data?.[0];

              // Create or update subscriber
              let subscriber;
              const { data: existingSubscriber } = await supabase
                .from('subscribers')
                .select('*')
                .eq('workspace_id', workspaceId)
                .eq('external_id', psid)
                .single();

              if (existingSubscriber) {
                subscriber = existingSubscriber;
              } else {
                // Fetch user info from Facebook
                const userInfoResponse = await fetch(
                  `https://graph.facebook.com/v18.0/${psid}?fields=name,profile_pic&access_token=${page.page_access_token}`
                );
                const userInfo = await userInfoResponse.json();

                const { data: newSubscriber } = await supabase
                  .from('subscribers')
                  .insert({
                    workspace_id: workspaceId,
                    name: userInfo.name || 'Unknown User',
                    platform: 'FACEBOOK',
                    external_id: psid,
                    avatar_url: userInfo.profile_pic,
                    status: 'SUBSCRIBED',
                    last_active_at: fbConv.updated_time || new Date().toISOString()
                  })
                  .select()
                  .single();

                subscriber = newSubscriber;
              }

              if (!subscriber) continue;

              // Create or update conversation
              const conversationData = {
                workspace_id: workspaceId,
                subscriber_id: subscriber.id,
                platform: 'FACEBOOK' as const,
                external_id: fbConv.id,
                page_id: page.page_id,
                last_message_preview: lastMessage?.message?.substring(0, 100) || '',
                unread_count: 0,
                updated_at: fbConv.updated_time || new Date().toISOString()
              };

              const { data: existingConv } = await supabase
                .from('conversations')
                .select('*')
                .eq('workspace_id', workspaceId)
                .eq('external_id', fbConv.id)
                .single();

              let conversation;
              if (existingConv) {
                const { data: updatedConv } = await supabase
                  .from('conversations')
                  .update(conversationData)
                  .eq('id', existingConv.id)
                  .select()
                  .single();
                conversation = updatedConv;
              } else {
                const { data: newConv } = await supabase
                  .from('conversations')
                  .insert(conversationData)
                  .select()
                  .single();
                conversation = newConv;
              }

              if (conversation) {
                allConversations.push(mapConversation(conversation));
              }
            } catch (convError) {
              console.error('Error processing conversation:', convError);
            }
          }
        } catch (error) {
          console.error(`Error fetching conversations for page ${page.name}:`, error);
        }
      }

      console.log(`Total conversations synced: ${allConversations.length}`);
      return allConversations;
    },

    // Fetch message history for a specific conversation from Facebook
    fetchConversationMessages: async (conversationId: string): Promise<Message[]> => {
      console.log('Fetching messages for conversation:', conversationId);

      // Get conversation details
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .single();

      if (convError || !conversation || !conversation.external_id) {
        console.error('Conversation not found or missing external_id:', convError);
        return [];
      }

      // Get page access token from connected_pages
      const { data: page, error: pageError } = await supabase
        .from('connected_pages')
        .select('page_access_token')
        .eq('page_id', conversation.page_id)
        .single();

      if (pageError || !page?.page_access_token) {
        console.error('No page access token found:', pageError);
        return [];
      }

      const pageAccessToken = page.page_access_token;

      try {
        // Fetch messages from Facebook Graph API
        const messagesResponse = await fetch(
          `https://graph.facebook.com/v18.0/${conversation.external_id}?fields=messages.limit(50){id,message,from,created_time,attachments}&access_token=${pageAccessToken}`
        );
        const messagesData = await messagesResponse.json();

        if (messagesData.error) {
          console.error('Facebook API error:', messagesData.error);
          return [];
        }

        const fbMessages = messagesData.messages?.data || [];
        console.log(`Found ${fbMessages.length} messages`);

        // Save messages to database
        for (const fbMsg of fbMessages.reverse()) {
          const isFromPage = fbMsg.from?.id === conversation.page_id;

          const messageData = {
            conversation_id: conversationId,
            external_id: fbMsg.id,
            direction: isFromPage ? 'OUTBOUND' : 'INBOUND',
            content: fbMsg.message || '',
            type: fbMsg.attachments?.data?.[0]?.image_data ? 'IMAGE' : 'TEXT',
            attachment_url: fbMsg.attachments?.data?.[0]?.image_data?.url,
            sender_id: fbMsg.from?.id,
            created_at: fbMsg.created_time,
            status: 'DELIVERED'
          };

          // Check if message already exists
          const { data: existingMsg } = await supabase
            .from('messages')
            .select('id')
            .eq('external_id', fbMsg.id)
            .single();

          if (!existingMsg) {
            await supabase
              .from('messages')
              .insert(messageData);
          }
        }

        // Fetch all messages from database
        return api.workspace.getMessages(conversationId);
      } catch (error) {
        console.error('Error fetching conversation messages:', error);
        return [];
      }
    },

    sendMessage: async (conversationId: string, content: string, file?: File): Promise<Message> => {
      // Get conversation details
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .single();

      if (convError || !conversation) {
        console.error('Conversation not found:', convError);
        throw new Error('Conversation not found');
      }

      // Get page access token if it's a Facebook conversation
      let pageAccessToken = null;
      if (conversation.platform === 'FACEBOOK' && conversation.page_id) {
        const { data: page } = await supabase
          .from('connected_pages')
          .select('page_access_token')
          .eq('page_id', conversation.page_id)
          .single();

        pageAccessToken = page?.page_access_token;
      }

      let attachmentUrl = undefined;
      let type: Message['type'] = 'TEXT';
      let fileName = undefined;

      if (file) {
        // Upload to Supabase Storage
        const uploadFileName = `${Date.now()}-${file.name.replace(/\s/g, '_')}`;
        console.log('Uploading file to Supabase:', uploadFileName, 'Size:', file.size, 'Type:', file.type);

        const { data, error } = await supabase.storage
          .from('attachments')
          .upload(uploadFileName, file);

        if (error) {
          console.error('Supabase storage upload error:', error);
          throw new Error(`Failed to upload attachment: ${error.message}`);
        }

        if (data) {
          const { data: publicUrlData } = supabase.storage
            .from('attachments')
            .getPublicUrl(uploadFileName);
          attachmentUrl = publicUrlData.publicUrl;
          console.log('File uploaded successfully, public URL:', attachmentUrl);
        }

        if (file.type.startsWith('image/')) type = 'IMAGE';
        else if (file.type.startsWith('video/')) type = 'VIDEO';
        else type = 'FILE';
        fileName = file.name;
      }

      // Save message to database first
      const { data: savedMessage, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          direction: 'OUTBOUND',
          content,
          type,
          attachment_url: attachmentUrl,
          file_name: fileName,
          status: 'SENT',
          platform: conversation.platform
        })
        .select()
        .single();

      if (error) {
        console.error('Error sending message:', error);
        throw new Error('Failed to send message');
      }

      // If it's a Facebook conversation, send via Facebook Send API
      if (conversation?.external_id && conversation.platform === 'FACEBOOK' && pageAccessToken) {
        // Get the subscriber's external_id (Facebook PSID) from subscribers table
        const { data: subscriber } = await supabase
          .from('subscribers')
          .select('external_id')
          .eq('id', conversation.subscriber_id)
          .single();

        if (!subscriber?.external_id) {
          console.error('No subscriber external_id found for conversation');
          return mapMessage(savedMessage);
        }

        const recipientId = subscriber.external_id;

        try {
          const messagePayload: any = {
            recipient: { id: recipientId },
            message: {}
          };

          if (attachmentUrl && type === 'IMAGE') {
            messagePayload.message.attachment = {
              type: 'image',
              payload: { url: attachmentUrl, is_reusable: true }
            };
          } else if (content) {
            messagePayload.message.text = content;
          }

          const sendResponse = await fetch(
            `https://graph.facebook.com/v18.0/me/messages?access_token=${pageAccessToken}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(messagePayload)
            }
          );

          const sendResult = await sendResponse.json();

          if (sendResult.error) {
            console.error('Facebook Send API error:', sendResult.error);
            // Update message status to failed
            await supabase
              .from('messages')
              .update({ status: 'FAILED' })
              .eq('id', savedMessage.id);
          } else {
            // Update message with Facebook message ID
            await supabase
              .from('messages')
              .update({
                external_id: sendResult.message_id,
                status: 'DELIVERED'
              })
              .eq('id', savedMessage.id);
          }
        } catch (fbError) {
          console.error('Error sending via Facebook:', fbError);
        }
      }

      // Update conversation's last message preview
      await supabase
        .from('conversations')
        .update({
          last_message_preview: content.substring(0, 100),
          updated_at: new Date().toISOString()
        })
        .eq('id', conversationId);

      // Fetch the updated message to get the latest status and attachment_url
      const { data: updatedMessage } = await supabase
        .from('messages')
        .select('*')
        .eq('id', savedMessage.id)
        .single();

      return mapMessage(updatedMessage || savedMessage);
    },


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

    getFlows: async (workspaceId: string): Promise<Flow[]> => {
      const { data, error } = await supabase
        .from('flows')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error fetching flows:', error);
        return [];
      }

      return data?.map(mapFlow) || [];
    },

    getFlow: async (flowId: string): Promise<Flow | null> => {
      const { data, error } = await supabase
        .from('flows')
        .select('*')
        .eq('id', flowId)
        .single();

      if (error) {
        console.error('Error fetching flow:', error);
        return null;
      }

      return data ? mapFlow(data) : null;
    },

    createFlow: async (workspaceId: string, name: string): Promise<Flow> => {
      const { data, error } = await supabase
        .from('flows')
        .insert({
          workspace_id: workspaceId,
          name,
          status: 'DRAFT',
          nodes: [],
          edges: []
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating flow:', error);
        throw new Error('Failed to create flow');
      }

      return mapFlow(data);
    },

    updateFlow: async (flowId: string, updates: Partial<Flow>): Promise<void> => {
      const { error } = await supabase
        .from('flows')
        .update({
          name: updates.name,
          status: updates.status,
          nodes: updates.nodes,
          edges: updates.edges,
          configurations: (updates as any).configurations, // Node configurations
          updated_at: new Date().toISOString()
        })
        .eq('id', flowId);

      if (error) {
        console.error('Error updating flow:', error);
        throw new Error('Failed to update flow');
      }
    },

    deleteFlow: async (flowId: string): Promise<void> => {
      const { error } = await supabase
        .from('flows')
        .delete()
        .eq('id', flowId);

      if (error) {
        console.error('Error deleting flow:', error);
        throw new Error('Failed to delete flow');
      }
    },

    getScheduledPosts: async (workspaceId: string): Promise<ScheduledPost[]> => {
      const { data, error } = await supabase
        .from('scheduled_posts')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('scheduled_at', { ascending: true });

      if (error) {
        console.error('Error fetching posts:', error);
        return [];
      }

      return data?.map(mapScheduledPost) || [];
    },

    createScheduledPost: async (workspaceId: string, post: Omit<ScheduledPost, 'id' | 'workspaceId'>): Promise<ScheduledPost> => {
      const { data, error } = await supabase
        .from('scheduled_posts')
        .insert({
          workspace_id: workspaceId,
          content: post.content,
          platform: post.platform,
          scheduled_at: post.scheduledAt,
          status: post.status || 'PENDING',
          image_url: post.imageUrl
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating post:', error);
        throw new Error('Failed to create post');
      }

      return mapScheduledPost(data);
    },

    getIntegrations: async (workspaceId: string): Promise<IntegrationSettings> => {
      await delay(300);
      return MOCK_INTEGRATIONS_DB[workspaceId] || {
        workspaceId,
        openaiApiKey: '',
        geminiApiKey: '',
        smtpHost: '',
        smtpPort: '',
        smtpUser: '',
        smtpPassword: '',
        smtpFromEmail: ''
      };
    },

    saveIntegrations: async (workspaceId: string, settings: IntegrationSettings): Promise<void> => {
      await delay(500);
      MOCK_INTEGRATIONS_DB[workspaceId] = settings;
    },

    testSmtp: async (settings: Partial<IntegrationSettings>, toEmail: string): Promise<void> => {
      await delay(2000);
      if (!settings.smtpHost || !settings.smtpUser) {
        throw new Error("Missing SMTP credentials");
      }
      if (!toEmail.includes('@')) {
        throw new Error("Invalid email address");
      }
    }
  },

  admin: {
    getUsers: async (): Promise<User[]> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching users:', error);
        return MOCK_AUTH_DB.map(({ password, ...user }) => user);
      }

      return data?.map(mapProfile) || [];
    },

    getSettings: async (): Promise<AdminSettings> => {
      try {
        const { data, error } = await supabase
          .from('admin_settings')
          .select('*')
          .single();

        if (data) {
          return {
            facebookAppId: data.facebook_app_id || '',
            facebookAppSecret: data.facebook_app_secret || '',
            facebookVerifyToken: data.facebook_verify_token || '',
            openaiApiKey: data.openai_api_key || '',
            geminiApiKey: data.gemini_api_key || '',
            menuSequence: data.menu_sequence || [],
            affiliateEnabled: data.affiliate_enabled,
            affiliateCommission: data.affiliate_commission,
            affiliateCurrency: data.affiliate_currency,
            affiliateMinWithdrawal: data.affiliate_min_withdrawal,
            affiliateWithdrawalDays: data.affiliate_withdrawal_days
          };
        }
      } catch (e) {
        console.error('Error fetching admin settings:', e);
      }

      // Default fallback
      return {
        facebookAppId: '',
        facebookAppSecret: '',
        facebookVerifyToken: '',
        menuSequence: ['/', '/connections', '/connected-pages', '/subscribers', '/messages', '/flows', '/scheduled', '/settings', '/affiliates', '/support'],
        affiliateEnabled: true,
        affiliateCommission: 15.00,
        affiliateCurrency: 'USD',
        affiliateMinWithdrawal: 100,
        affiliateWithdrawalDays: [1]
      };
    },

    saveSettings: async (settings: AdminSettings): Promise<void> => {
      const dbPayload = {
        id: 1,
        facebook_app_id: settings.facebookAppId,
        facebook_app_secret: settings.facebookAppSecret,
        facebook_verify_token: settings.facebookVerifyToken,
        openai_api_key: settings.openaiApiKey,
        gemini_api_key: settings.geminiApiKey,
        menu_sequence: settings.menuSequence,
        affiliate_enabled: settings.affiliateEnabled,
        affiliate_commission: settings.affiliateCommission,
        affiliate_currency: settings.affiliateCurrency,
        affiliate_min_withdrawal: settings.affiliateMinWithdrawal,
        affiliate_withdrawal_days: settings.affiliateWithdrawalDays
      };

      console.log('Attempting to save admin settings:', dbPayload);

      const { error } = await supabase
        .from('admin_settings')
        .upsert(dbPayload);

      if (error) {
        console.error("Supabase Save Error:", error);
        console.error("Error details:", JSON.stringify(error, null, 2));
        console.error("Error code:", error.code);
        console.error("Error message:", error.message);
        console.error("Error hint:", error.hint);
        throw new Error(error.message);
      }

      console.log('Admin settings saved successfully!');
    },

    testEmail: async (to: string): Promise<void> => {
      await delay(1500);
      if (!to.includes('@')) throw new Error("Invalid email address");
    }
  },

  affiliate: {
    getStats: async (userId: string): Promise<AffiliateStats> => {
      await delay(400);
      const userReferrals = MOCK_REFERRALS_DB.filter(r => r.referrerId === userId);

      const approved = userReferrals.filter(r => r.status === 'APPROVED' || r.status === 'PAID').reduce((sum, r) => sum + r.commission, 0);
      const pending = userReferrals.filter(r => r.status === 'PENDING').reduce((sum, r) => sum + r.commission, 0);

      const allWithdrawals = MOCK_WITHDRAWALS_DB.filter(w => w.userId === userId && w.status !== 'REJECTED');
      const totalRequested = allWithdrawals.reduce((sum, w) => sum + w.amount, 0);

      const available = Math.max(0, approved - totalRequested);

      return {
        clicks: Math.floor(Math.random() * 500) + 50,
        referrals: userReferrals.length,
        totalEarnings: approved,
        unpaidEarnings: available,
        pendingEarnings: pending
      };
    },
    getMyReferrals: async (userId: string): Promise<Referral[]> => {
      await delay(400);
      return MOCK_REFERRALS_DB.filter(r => r.referrerId === userId);
    },
    getAllReferrals: async (): Promise<Referral[]> => {
      await delay(500);
      return MOCK_REFERRALS_DB;
    },
    deleteReferral: async (referralId: string): Promise<void> => {
      await delay(300);
      MOCK_REFERRALS_DB = MOCK_REFERRALS_DB.filter(r => r.id !== referralId);
    },
    requestWithdrawal: async (userId: string, amount: number): Promise<void> => {
      await delay(1000);
      const settings = MOCK_PAYOUTS_DB[userId];

      let methodStr = 'Unknown';
      if (settings) {
        methodStr = settings.method === 'PAYPAL'
          ? `PAYPAL - ${settings.paypalEmail}`
          : `BANK - ${settings.bankName} (${settings.accountNumber})`;
      }

      const request: WithdrawalRequest = {
        id: `wr-${Date.now()}`,
        userId,
        userName: 'User',
        amount,
        status: 'PENDING',
        requestedAt: new Date().toISOString(),
        method: methodStr,
        invoiceUrl: `inv-${Date.now()}`
      };
      MOCK_WITHDRAWALS_DB.unshift(request);
    },
    getWithdrawals: async (userId?: string): Promise<WithdrawalRequest[]> => {
      await delay(400);
      if (userId) {
        return MOCK_WITHDRAWALS_DB.filter(w => w.userId === userId);
      }
      return MOCK_WITHDRAWALS_DB;
    },
    updateWithdrawalStatus: async (requestId: string, status: 'PAID' | 'REJECTED'): Promise<void> => {
      await delay(500);
      const req = MOCK_WITHDRAWALS_DB.find(w => w.id === requestId);
      if (req) {
        req.status = status;
        if (status === 'PAID') {
          req.processedAt = new Date().toISOString();
        }
      }
    }
  },

  support: {
    getTickets: async (workspaceId: string): Promise<SupportTicket[]> => {
      await delay(400);
      return MOCK_TICKETS_DB.filter(t => t.workspaceId === workspaceId);
    },
    getAllTickets: async (): Promise<SupportTicket[]> => {
      await delay(500);
      return MOCK_TICKETS_DB;
    },
    createTicket: async (workspaceId: string, userId: string, subject: string, message: string): Promise<void> => {
      await delay(500);
      const newTicket: SupportTicket = {
        id: `t-${Date.now()}`,
        workspaceId,
        userId,
        subject,
        status: 'OPEN',
        priority: 'MEDIUM',
        createdAt: new Date().toISOString(),
        lastUpdateAt: new Date().toISOString(),
        messages: [
          {
            id: `tm-${Date.now()}`,
            ticketId: `t-${Date.now()}`,
            senderId: userId,
            senderName: 'User',
            content: message,
            createdAt: new Date().toISOString(),
            isAdmin: false
          }
        ]
      };
      MOCK_TICKETS_DB.unshift(newTicket);
    },
    replyTicket: async (ticketId: string, senderId: string, content: string, isAdmin: boolean): Promise<void> => {
      await delay(400);
      const ticket = MOCK_TICKETS_DB.find(t => t.id === ticketId);
      if (ticket) {
        ticket.messages.push({
          id: `tm-${Date.now()}`,
          ticketId,
          senderId,
          senderName: isAdmin ? 'Support Agent' : 'User',
          content,
          createdAt: new Date().toISOString(),
          isAdmin
        });
        ticket.lastUpdateAt = new Date().toISOString();
        if (isAdmin) ticket.status = 'IN_PROGRESS';
        else ticket.status = 'OPEN';
      }
    }
  }
};