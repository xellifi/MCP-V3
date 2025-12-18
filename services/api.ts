import { supabase } from '../lib/supabase';
import { MOCK_AUTH_DB, MOCK_WORKSPACES } from '../constants';
import { User, Workspace, MetaConnection, ConnectedPage, Flow, ScheduledPost, AdminSettings, Subscriber, Conversation, Message, UserRole, IntegrationSettings, Referral, AffiliateStats, PayoutSettings, WithdrawalRequest, SupportTicket, TicketMessage } from '../types';

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
  pageFollowers: row.page_followers,
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
  updatedAt: row.updated_at
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
  status: row.status
});

const mapFlow = (row: any): Flow => ({
  id: row.id,
  workspaceId: row.workspace_id,
  name: row.name,
  status: row.status,
  updatedAt: row.updated_at,
  nodes: row.nodes || [],
  edges: row.edges || []
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
      // First, check if a connection with this external_id already exists
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

    fetchPagesFromFacebook: async (workspaceId: string): Promise<ConnectedPage[]> => {
      console.log('Fetching pages from Facebook for workspace:', workspaceId);

      // Get all connections for this workspace
      const { data: connections, error: connectionsError } = await supabase
        .from('meta_connections')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('platform', 'FACEBOOK')
        .eq('status', 'ACTIVE');

      if (connectionsError || !connections || connections.length === 0) {
        console.log('No active Facebook connections found');
        return [];
      }

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

      return data?.map(mapConnectedPage) || [];
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

    getConversations: async (workspaceId: string): Promise<Conversation[]> => {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('updated_at', { ascending: false });

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
        return [];
      }

      return data?.map(mapMessage) || [];
    },

    sendMessage: async (conversationId: string, content: string, file?: File): Promise<Message> => {
      let attachmentUrl = undefined;
      let type: Message['type'] = 'TEXT';
      let fileName = undefined;

      if (file) {
        // Upload to Supabase Storage
        const uploadFileName = `${Date.now()}-${file.name.replace(/\s/g, '_')}`;
        const { data, error } = await supabase.storage
          .from('attachments')
          .upload(uploadFileName, file);

        if (!error && data) {
          const { data: publicUrlData } = supabase.storage
            .from('attachments')
            .getPublicUrl(uploadFileName);
          attachmentUrl = publicUrlData.publicUrl;
        }

        if (file.type.startsWith('image/')) type = 'IMAGE';
        else if (file.type.startsWith('video/')) type = 'VIDEO';
        else type = 'FILE';
        fileName = file.name;
      }

      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          direction: 'OUTBOUND',
          content,
          type,
          attachment_url: attachmentUrl,
          file_name: fileName,
          status: 'SENT'
        })
        .select()
        .single();

      if (error) {
        console.error('Error sending message:', error);
        throw new Error('Failed to send message');
      }

      // Update conversation's last message preview
      await supabase
        .from('conversations')
        .update({
          last_message_preview: content.substring(0, 100),
          updated_at: new Date().toISOString()
        })
        .eq('id', conversationId);

      return mapMessage(data);
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
          updated_at: new Date().toISOString()
        })
        .eq('id', flowId);

      if (error) {
        console.error('Error updating flow:', error);
        throw new Error('Failed to update flow');
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