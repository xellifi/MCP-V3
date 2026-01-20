import { supabase } from '../lib/supabase';
import { MOCK_AUTH_DB, MOCK_WORKSPACES } from '../constants';
import { User, Workspace, MetaConnection, ConnectedPage, Flow, ScheduledPost, AdminSettings, Subscriber, Conversation, Message, UserRole, IntegrationSettings, Referral, AffiliateStats, PayoutSettings, WithdrawalRequest, SupportTicket, TicketMessage, Reaction, ReactionType, Package, UserSubscription } from '../types';

// Simulating async API calls (for fallback/demo)
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper to convert Supabase row to TypeScript types
const mapProfile = (row: any): User => ({
  id: row.id,
  email: row.email,
  name: row.name,
  role: (row.role?.toUpperCase() || 'MEMBER') as UserRole,  // Convert lowercase DB value to uppercase enum
  avatarUrl: row.avatar_url,
  affiliateCode: row.affiliate_code,
  isEmailVerified: row.email_verified ?? false
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
  pageId: row.page_id,
  name: row.name,
  email: row.email,
  platform: row.platform,
  externalId: row.external_id,
  avatarUrl: row.avatar_url,
  status: row.status,
  tags: row.tags || [],
  labels: row.labels || [],
  lastActiveAt: row.last_active_at,
  source: row.source
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

const mapTicketMessage = (row: any): TicketMessage => ({
  id: row.id,
  ticketId: row.ticket_id,
  senderId: row.sender_id,
  senderName: row.sender_name,
  content: row.content,
  createdAt: row.created_at,
  isAdmin: row.is_admin
});

const mapSupportTicket = (row: any, messages: any[] = []): SupportTicket => ({
  id: row.id,
  workspaceId: row.workspace_id,
  userId: row.user_id,
  subject: row.subject,
  status: row.status,
  priority: row.priority,
  createdAt: row.created_at,
  lastUpdateAt: row.last_update_at,
  messages: messages.map(mapTicketMessage)
});

// Helper to safely convert is_visible to boolean (handles null, undefined, strings)
const parseIsVisible = (value: any): boolean => {
  if (value === false || value === 'false' || value === 0) return false;
  if (value === null || value === undefined) return true; // Default to visible
  return Boolean(value);
};

const mapPackage = (row: any): Package => ({
  id: row.id,
  name: row.name,
  priceMonthly: row.price_monthly,
  priceYearly: row.price_yearly,
  priceLifetime: row.price_lifetime,
  currency: row.currency,
  features: row.features || [],
  limits: row.limits || {},
  color: row.color,
  isActive: row.is_active,
  isVisible: parseIsVisible(row.is_visible),
  displayOrder: row.display_order ?? 99, // Default to 99 if not set
  allowedRoutes: row.allowed_routes || []
});

// Mock DBs for features not yet migrated
const MOCK_INTEGRATIONS_DB: Record<string, IntegrationSettings> = {};
const MOCK_PAYOUTS_DB: Record<string, PayoutSettings> = {};
let MOCK_WITHDRAWALS_DB: WithdrawalRequest[] = [];
let MOCK_TICKETS_DB: SupportTicket[] = [];
let MOCK_REFERRALS_DB: Referral[] = [];

// Disposable/temporary email domains to block
const DISPOSABLE_EMAIL_DOMAINS = [
  'tempmail.com', 'throwaway.email', '10minutemail.com', 'guerrillamail.com',
  'mailinator.com', 'yopmail.com', 'tempail.com', 'fakeinbox.com', 'getnada.com',
  'temp-mail.org', 'discard.email', 'mailnesia.com', 'trashmail.com', 'mohmal.com',
  'sharklasers.com', 'spam4.me', 'grr.la', 'guerrillamail.info', 'pokemail.net',
  'maildrop.cc', 'dispostable.com', 'mytemp.email', 'tempmailo.com', 'emailondeck.com',
  'mailsac.com', 'burnermail.io', 'tempmailaddress.com', 'dropmail.me', 'instantly.email',
  'mintemail.com', 'harakirimail.com', 'mailcatch.com', 'spamavert.com', 'tmpmail.org'
];

// Check if email is from a disposable domain
const isDisposableEmail = (email: string): boolean => {
  const domain = email.split('@')[1]?.toLowerCase();
  return DISPOSABLE_EMAIL_DOMAINS.includes(domain);
};

export const api = {
  auth: {
    login: async (email: string, password: string): Promise<User> => {
      // Production: Check Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) throw new Error(error.message);

      // Fetch profile
      if (data.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (profile) return mapProfile(profile);
      }

      throw new Error("User not found");
    },

    getCurrentUser: async (): Promise<User | null> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profile) return mapProfile(profile);
      return null;
    },

    register: async (name: string, email: string, password: string): Promise<User> => {
      // Block disposable/temporary emails
      if (isDisposableEmail(email)) {
        throw new Error('Temporary or disposable email addresses are not allowed. Please use a permanent email address.');
      }

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

        // Create a Free subscription for the new user using RPC (bypasses RLS)
        try {
          const { data: subResult, error: subError } = await supabase
            .rpc('ensure_user_free_subscription', {
              p_user_id: data.user.id
            });

          if (subError) {
            console.error('Failed to create subscription via RPC:', subError);
          } else if (subResult?.success) {
            console.log('Created Free subscription for user:', data.user.id, subResult.package_name);
          } else {
            console.error('Subscription creation failed:', subResult?.error);
          }
        } catch (subError) {
          console.error('Failed to create Free subscription:', subError);
          // Don't fail registration if subscription creation fails
        }

        // Create a default workspace for the new user using RPC (bypasses RLS)
        try {
          const { data: wsResult, error: wsError } = await supabase
            .rpc('ensure_user_workspace', {
              p_user_id: data.user.id,
              p_user_name: name
            });

          if (wsError) {
            console.error('Failed to create workspace via RPC:', wsError);
          } else if (wsResult?.success) {
            console.log('Created default workspace for user:', data.user.id, wsResult.workspace_id);
          } else {
            console.error('Workspace creation failed:', wsResult?.error);
          }
        } catch (wsError) {
          console.error('Failed to create workspace:', wsError);
          // Don't fail registration if workspace creation fails
        }
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
        // Check if email is confirmed in Supabase auth
        const isEmailConfirmed = !!session.user.email_confirmed_at;

        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profile) {
          // If auth says verified but profile doesn't, sync it
          if (isEmailConfirmed && !profile.email_verified) {
            await supabase
              .from('profiles')
              .update({ email_verified: true })
              .eq('id', session.user.id);
            profile.email_verified = true;
          }
          return mapProfile(profile);
        }
      }
      return null;
    },

    updateProfile: async (userId: string, updates: { name?: string; avatarUrl?: string; email?: string; password?: string; role?: string }): Promise<void> => {
      // 1. Update Auth (Email/Password) if provided
      if (updates.email || updates.password) {
        const { error } = await supabase.auth.updateUser({
          email: updates.email,
          password: updates.password
        });
        if (error) throw new Error(error.message);
      }

      // 2. Update Profile Data (Name, Avatar)
      // Check if we have profile specific updates or need to sync email
      const profileUpdates: any = {};

      if (updates.name !== undefined) profileUpdates.name = updates.name;
      if (updates.avatarUrl !== undefined) profileUpdates.avatar_url = updates.avatarUrl;
      if (updates.email !== undefined) profileUpdates.email = updates.email;
      if (updates.role !== undefined) profileUpdates.role = updates.role;

      if (Object.keys(profileUpdates).length > 0) {
        const { error } = await supabase
          .from('profiles')
          .update(profileUpdates)
          .eq('id', userId);

        if (error) throw new Error(error.message);
      }
    },

    uploadAvatar: async (userId: string, file: File): Promise<string> => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('profile-logo')
        .upload(fileName, file, { cacheControl: '3600', upsert: true });

      if (uploadError) throw new Error(uploadError.message);

      const { data } = supabase.storage
        .from('profile-logo')
        .getPublicUrl(fileName);

      return data.publicUrl;
    },

    // Resend verification email
    resendVerificationEmail: async (): Promise<void> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) throw new Error('No user logged in');

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email
      });

      if (error) throw new Error(error.message);
    },

    // Update email verified status (admin function)
    updateEmailVerified: async (userId: string, verified: boolean): Promise<void> => {
      const { error } = await supabase
        .from('profiles')
        .update({ email_verified: verified })
        .eq('id', userId);

      if (error) throw new Error(error.message);
    },

    // Facebook OAuth login
    loginWithFacebook: async (): Promise<void> => {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'facebook',
        options: {
          redirectTo: `${window.location.origin}/dashboard`
        }
      });

      if (error) throw new Error(error.message);
    },

    // Google OAuth login
    loginWithGoogle: async (): Promise<void> => {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`
        }
      });

      if (error) throw new Error(error.message);
    }
  },

  public: {
    getSystemTheme: async (): Promise<'dark' | 'light'> => {
      try {
        const { data } = await supabase
          .from('admin_settings')
          .select('default_theme')
          .single();
        return (data?.default_theme as 'dark' | 'light') || 'dark';
      } catch {
        return 'dark';
      }
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

    create: async (name: string, ownerId: string): Promise<Workspace> => {
      const { data, error } = await supabase
        .from('workspaces')
        .insert({ name, owner_id: ownerId })
        .select()
        .single();

      if (error) {
        console.error('Error creating workspace:', error);
        throw new Error(error.message);
      }

      return mapWorkspace(data);
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
      // Uses RPC function with SECURITY DEFINER to bypass RLS
      const { data: globalExisting, error: globalError } = await supabase
        .rpc('check_connection_duplicate', {
          check_external_id: connectionData.externalId,
          exclude_workspace_id: workspaceId
        });

      // Check if profile is already connected by another user
      if (!globalError && globalExisting && globalExisting.length > 0) {
        console.error('Profile already connected by another user:', globalExisting[0]);
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

      console.log('Starting comprehensive cascade delete for workspace:', workspaceId);

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
        } else {
          console.log('✓ Deleted messages for', conversationIds.length, 'conversations');
        }
      }

      // 2. Delete all conversations for this workspace
      const { error: conversationsError } = await supabase
        .from('conversations')
        .delete()
        .eq('workspace_id', workspaceId);

      if (conversationsError) {
        console.error('Error deleting conversations:', conversationsError);
      } else {
        console.log('✓ Deleted all conversations');
      }

      // 3. Delete all subscribers for this workspace
      const { error: subscribersError } = await supabase
        .from('subscribers')
        .delete()
        .eq('workspace_id', workspaceId);

      if (subscribersError) {
        console.error('Error deleting subscribers:', subscribersError);
      } else {
        console.log('✓ Deleted all subscribers');
      }

      // 4. Delete all flows for this workspace (automation flows, replies, etc.)
      const { error: flowsError } = await supabase
        .from('flows')
        .delete()
        .eq('workspace_id', workspaceId);

      if (flowsError) {
        console.error('Error deleting flows:', flowsError);
      } else {
        console.log('✓ Deleted all flows');
      }

      // 5. Delete all scheduled posts for this workspace
      const { error: postsError } = await supabase
        .from('scheduled_posts')
        .delete()
        .eq('workspace_id', workspaceId);

      if (postsError) {
        console.error('Error deleting scheduled posts:', postsError);
      } else {
        console.log('✓ Deleted all scheduled posts');
      }

      // 6. Delete all connected pages for this workspace
      const { error: pagesError } = await supabase
        .from('connected_pages')
        .delete()
        .eq('workspace_id', workspaceId);

      if (pagesError) {
        console.error('Error deleting connected pages:', pagesError);
        throw new Error(pagesError.message || 'Failed to delete connected pages');
      }

      console.log('✓ Deleted all connected pages');

      // 7. Delete the connection itself
      const { error } = await supabase
        .from('meta_connections')
        .delete()
        .eq('id', connectionId);

      if (error) {
        console.error('Error deleting connection:', error);
        throw new Error(error.message || 'Failed to delete connection');
      }

      console.log('✓ Successfully deleted connection and ALL associated data (messages, conversations, subscribers, flows, scheduled posts, pages)');
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
          page.pageImageUrl = `https://graph.facebook.com/${row.page_id}/picture?type=large`;
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

    getSubscribers: async (workspaceId: string, pageId?: string): Promise<Subscriber[]> => {
      let query = supabase
        .from('subscribers')
        .select('*')
        .eq('workspace_id', workspaceId);

      // Filter by specific page if provided
      if (pageId) {
        query = query.eq('page_id', pageId);
      }

      const { data, error } = await query.order('last_active_at', { ascending: false });

      if (error) {
        console.error('Error fetching subscribers:', error);
        return [];
      }

      return data?.map(mapSubscriber) || [];
    },

    updateSubscriberLabels: async (subscriberId: string, labels: string[]): Promise<void> => {
      const { error } = await supabase
        .from('subscribers')
        .update({ labels })
        .eq('id', subscriberId);

      if (error) {
        console.error('Error updating subscriber labels:', error);
        throw new Error('Failed to update labels');
      }
    },

    updateSubscriberTags: async (subscriberId: string, tags: string[]): Promise<void> => {
      const { error } = await supabase
        .from('subscribers')
        .update({ tags })
        .eq('id', subscriberId);

      if (error) {
        console.error('Error updating subscriber tags:', error);
        throw new Error('Failed to update tags');
      }
    },

    deleteSubscriber: async (subscriberId: string): Promise<void> => {
      const { error } = await supabase
        .from('subscribers')
        .delete()
        .eq('id', subscriberId);

      if (error) {
        console.error('Error deleting subscriber:', error);
        throw new Error('Failed to delete subscriber');
      }
    },

    // Get all unique labels from flow configurations in a workspace
    getWorkspaceLabels: async (workspaceId: string): Promise<string[]> => {
      const { data: flows, error } = await supabase
        .from('flows')
        .select('configurations')
        .eq('workspace_id', workspaceId);

      if (error) {
        console.error('Error fetching flows for labels:', error);
        return [];
      }

      // Extract unique labels from flow configurations
      const allLabels = new Set<string>();

      flows?.forEach((flow: any) => {
        const configurations = flow.configurations || {};

        Object.values(configurations).forEach((config: any) => {
          // Entry labels from Start Nodes
          if (config.entryLabel && config.entryLabel.trim()) {
            allLabels.add(config.entryLabel.trim());
          }

          // Add labels from Text Node buttons
          if (config.buttons && Array.isArray(config.buttons)) {
            config.buttons.forEach((btn: any) => {
              if (btn.addLabel && btn.addLabel.trim()) {
                allLabels.add(btn.addLabel.trim());
              }
            });
          }
        });
      });

      return Array.from(allLabels).sort();
    },

    // Form CRUD operations
    createForm: async (workspaceId: string, formData: any): Promise<any> => {
      const { data, error } = await supabase
        .from('forms')
        .insert({
          workspace_id: workspaceId,
          flow_id: formData.flowId || null,
          node_id: formData.nodeId || null,
          name: formData.formName || 'Order Form',
          header_image_url: formData.headerImageUrl || null,
          submit_button_text: formData.submitButtonText || 'Place Order',
          submit_button_color: formData.submitButtonColor || '#6366f1',
          border_radius: formData.borderRadius || 'round',
          success_message: formData.successMessage || 'Order placed successfully!',
          google_sheet_id: formData.googleSheetId || null,
          google_sheet_name: formData.googleSheetName || null,
          google_webhook_url: formData.googleWebhookUrl || null,
          fields: formData.fields || [],
          countdown_enabled: formData.countdownEnabled || false,
          countdown_minutes: formData.countdownMinutes || 10,
          countdown_blink: formData.countdownBlink ?? true,
          is_order_form: formData.isOrderForm ?? true,
          product_name: formData.productName || '',
          product_price: formData.productPrice || 0,
          currency: formData.currency || 'PHP',
          max_quantity: formData.maxQuantity || 10,
          coupon_enabled: formData.couponEnabled || false,
          coupon_code: formData.couponCode || '',
          coupon_discount: formData.couponDiscount || 0,
          cod_enabled: formData.codEnabled ?? true,
          ewallet_enabled: formData.ewalletEnabled ?? true,
          ewallet_options: formData.ewalletOptions || [],
          ewallet_numbers: formData.ewalletNumbers || {},
          require_proof_upload: formData.requireProofUpload ?? true,
          form_template: formData.formTemplate || 'modern',
          promo_text: formData.promoText !== undefined ? formData.promoText : 'Promo Only!',
          promo_icon: formData.promoIcon !== undefined ? formData.promoIcon : '🔥',
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating form:', error);
        throw new Error('Failed to create form');
      }
      return data;
    },

    updateForm: async (formId: string, formData: any): Promise<any> => {
      console.log('[updateForm] Saving promo fields:', {
        promoText: formData.promoText,
        promoIcon: formData.promoIcon,
        formName: formData.formName
      });

      const { data, error } = await supabase
        .from('forms')
        .update({
          name: formData.formName,
          header_image_url: formData.headerImageUrl,
          submit_button_text: formData.submitButtonText,
          submit_button_color: formData.submitButtonColor,
          border_radius: formData.borderRadius,
          success_message: formData.successMessage,
          google_sheet_id: formData.googleSheetId,
          google_sheet_name: formData.googleSheetName,
          fields: formData.fields,
          countdown_enabled: formData.countdownEnabled || false,
          countdown_minutes: formData.countdownMinutes || 10,
          countdown_blink: formData.countdownBlink ?? true,
          is_order_form: formData.isOrderForm ?? true,
          product_name: formData.productName || '',
          product_price: formData.productPrice || 0,
          currency: formData.currency || 'PHP',
          max_quantity: formData.maxQuantity || 10,
          coupon_enabled: formData.couponEnabled || false,
          coupon_code: formData.couponCode || '',
          coupon_discount: formData.couponDiscount || 0,
          cod_enabled: formData.codEnabled ?? true,
          ewallet_enabled: formData.ewalletEnabled ?? true,
          ewallet_options: formData.ewalletOptions || [],
          ewallet_numbers: formData.ewalletNumbers || {},
          require_proof_upload: formData.requireProofUpload ?? true,
          form_template: formData.formTemplate || 'modern',
          google_webhook_url: formData.googleWebhookUrl || null,
          promo_text: formData.promoText !== undefined ? formData.promoText : 'Promo Only!',
          promo_icon: formData.promoIcon !== undefined ? formData.promoIcon : '🔥',
          updated_at: new Date().toISOString(),
        })
        .eq('id', formId)
        .select()
        .single();

      if (error) {
        console.error('Error updating form:', error);
        throw new Error('Failed to update form');
      }
      return data;
    },

    getForm: async (formId: string): Promise<any> => {
      const { data, error } = await supabase
        .from('forms')
        .select('*')
        .eq('id', formId)
        .single();

      if (error) {
        console.error('Error fetching form:', error);
        throw new Error('Failed to fetch form');
      }
      return data;
    },

    getForms: async (workspaceId: string): Promise<any[]> => {
      // Get forms
      const { data: forms, error } = await supabase
        .from('forms')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching forms:', error);
        return [];
      }

      if (!forms || forms.length === 0) return [];

      // Get form IDs for submission count
      const formIds = forms.map(f => f.id);

      // Get submission counts per form (ONLY FOR TODAY)
      const now = new Date();
      now.setHours(0, 0, 0, 0); // Reset to midnight today
      const todayISO = now.toISOString();

      const { data: submissions } = await supabase
        .from('form_submissions')
        .select('form_id')
        .in('form_id', formIds)
        .gte('created_at', todayISO); // Only count submissions from today

      const submissionCounts: Record<string, number> = {};
      if (submissions) {
        submissions.forEach(s => {
          submissionCounts[s.form_id] = (submissionCounts[s.form_id] || 0) + 1;
        });
      }

      // Get unique page_ids from forms to fetch page logos and names
      const pageIds = [...new Set(forms.filter(f => f.page_id).map(f => f.page_id))];
      const pageLogos: Record<string, string> = {};
      const pageNames: Record<string, string> = {};

      if (pageIds.length > 0) {
        const { data: pages } = await supabase
          .from('connected_pages')
          .select('page_id, page_image_url, name')
          .in('page_id', pageIds);

        if (pages) {
          pages.forEach(p => {
            // Use Facebook Graph API for reliable, non-expiring URLs
            pageLogos[p.page_id] = `https://graph.facebook.com/${p.page_id}/picture?type=large`;
            pageNames[p.page_id] = p.name || '';
          });
        }
      }

      // Add submission_count, page_logo, and page_name to each form
      return forms.map(form => ({
        ...form,
        submission_count: submissionCounts[form.id] || 0,
        page_logo: form.page_id ? pageLogos[form.page_id] : null,
        page_name: form.page_id ? pageNames[form.page_id] : null
      }));
    },

    deleteForm: async (formId: string): Promise<void> => {
      // First delete all submissions for this form
      const { error: submissionsError } = await supabase
        .from('form_submissions')
        .delete()
        .eq('form_id', formId);

      if (submissionsError) {
        console.error('Error deleting form submissions:', submissionsError);
      }

      // Then delete the form itself
      const { error } = await supabase
        .from('forms')
        .delete()
        .eq('id', formId);

      if (error) {
        console.error('Error deleting form:', error);
        throw new Error('Failed to delete form');
      }
    },

    getFormSubmissions: async (formId: string): Promise<any[]> => {
      const { data, error } = await supabase
        .from('form_submissions')
        .select('*')
        .eq('form_id', formId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching submissions:', error);
        throw new Error('Failed to fetch submissions');
      }
      return data || [];
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
      // Only include fields that are explicitly provided (not undefined)
      const updatePayload: Record<string, any> = {
        updated_at: new Date().toISOString()
      };

      if (updates.name !== undefined) updatePayload.name = updates.name;
      if (updates.status !== undefined) updatePayload.status = updates.status;
      if (updates.nodes !== undefined) updatePayload.nodes = updates.nodes;
      if (updates.edges !== undefined) updatePayload.edges = updates.edges;
      if ((updates as any).configurations !== undefined) {
        updatePayload.configurations = (updates as any).configurations;
      }

      console.log('[api.updateFlow] Updating flow:', flowId, 'with:', Object.keys(updatePayload));

      const { error } = await supabase
        .from('flows')
        .update(updatePayload)
        .eq('id', flowId);

      if (error) {
        console.error('Error updating flow:', error);
        throw new Error('Failed to update flow');
      }

      console.log('[api.updateFlow] ✓ Flow updated successfully');
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
      // Fetch from workspace_settings table
      const { data: settings, error } = await supabase
        .from('workspace_settings')
        .select('*')
        .eq('workspace_id', workspaceId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching workspace settings:', error);
      }

      // Also get google webhook url from workspaces table
      const { data: workspace } = await supabase
        .from('workspaces')
        .select('google_webhook_url')
        .eq('id', workspaceId)
        .single();

      return {
        workspaceId,
        openaiApiKey: settings?.openai_api_key || '',
        geminiApiKey: settings?.gemini_api_key || '',
        smtpHost: settings?.smtp_host || '',
        smtpPort: settings?.smtp_port || '',
        smtpUser: settings?.smtp_user || '',
        smtpPassword: settings?.smtp_password || '',
        smtpFromEmail: settings?.smtp_from_email || '',
        googleWebhookUrl: workspace?.google_webhook_url || ''
      };
    },

    saveIntegrations: async (workspaceId: string, settings: IntegrationSettings): Promise<void> => {
      console.log('[saveIntegrations] Saving workspace settings for:', workspaceId);

      // Save API keys and SMTP settings to workspace_settings table
      const { error: settingsError } = await supabase
        .from('workspace_settings')
        .upsert({
          workspace_id: workspaceId,
          openai_api_key: settings.openaiApiKey || null,
          gemini_api_key: settings.geminiApiKey || null,
          smtp_host: settings.smtpHost || null,
          smtp_port: settings.smtpPort || null,
          smtp_user: settings.smtpUser || null,
          smtp_password: settings.smtpPassword || null,
          smtp_from_email: settings.smtpFromEmail || null
        }, {
          onConflict: 'workspace_id'
        });

      if (settingsError) {
        console.error('[saveIntegrations] Error saving workspace settings:', settingsError);
        throw new Error('Failed to save workspace settings: ' + settingsError.message);
      }

      console.log('[saveIntegrations] ✓ Workspace settings saved to database');

      // Save Google Sheets webhook URL to workspaces table (separate field)
      if (settings.googleWebhookUrl !== undefined) {
        const { error: webhookError } = await supabase
          .from('workspaces')
          .update({ google_webhook_url: settings.googleWebhookUrl })
          .eq('id', workspaceId);

        if (webhookError) {
          console.error('[saveIntegrations] Error saving googleWebhookUrl:', webhookError);
        }
      }
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

    createUser: async (userData: { email: string; password: string; name: string; packageId: string }): Promise<{ id: string; email: string; name: string }> => {
      // Call Vercel serverless function to create user with admin privileges
      const response = await fetch('/api/admin?action=create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create user');
      }

      const result = await response.json();
      return result.user;
    },

    updateUser: async (id: string, updates: Partial<User>): Promise<void> => {
      const dbUpdates: any = {};
      if (updates.name) dbUpdates.name = updates.name;
      if (updates.role) dbUpdates.role = updates.role;
      // Note: Email cannot be easily updated here as it is linked to Auth
      // Features are managed via Subscription Packages, not directly on profile in this schema

      const { error } = await supabase
        .from('profiles')
        .update(dbUpdates)
        .eq('id', id);

      if (error) throw new Error(error.message);
    },

    deleteUser: async (id: string): Promise<void> => {
      // Use admin API to delete from both auth.users and profiles
      const response = await fetch(`/api/admin?action=delete-user&userId=${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete user');
      }
    },

    impersonateUser: async (userId: string, adminId: string): Promise<{ actionLink: string; userName: string }> => {
      // Call the impersonate endpoint to get a magic link
      const response = await fetch('/api/admin?action=impersonate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, adminId })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to impersonate user');
      }

      const result = await response.json();

      // Store the admin's ID so they can return to their account
      localStorage.setItem('impersonating_admin_id', adminId);
      localStorage.setItem('impersonating_user_name', result.userName);

      return {
        actionLink: result.actionLink,
        userName: result.userName
      };
    },

    endImpersonation: async (): Promise<void> => {
      // Clear impersonation data and sign out
      localStorage.removeItem('impersonating_admin_id');
      localStorage.removeItem('impersonating_user_name');
      await supabase.auth.signOut();
    },

    isImpersonating: (): { isImpersonating: boolean; userName: string | null } => {
      const adminId = localStorage.getItem('impersonating_admin_id');
      const userName = localStorage.getItem('impersonating_user_name');
      return {
        isImpersonating: !!adminId,
        userName
      };
    },

    getSettings: async (): Promise<AdminSettings> => {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('*')
        .single();

      if (error) {
        console.warn('Error fetching admin settings:', error);
      }

      return {
        id: data?.id || 1,
        facebookAppId: data?.facebook_app_id || '',
        facebookAppSecret: data?.facebook_app_secret || '',
        facebookVerifyToken: data?.facebook_verify_token || '',
        openaiApiKey: data?.openai_api_key || '',
        geminiApiKey: data?.gemini_api_key || '',
        menuSequence: data?.menu_sequence || ['/', '/connections', '/connected-pages', '/subscribers', '/messages', '/flows', '/scheduled', '/settings', '/affiliates', '/support'],
        affiliateEnabled: data?.affiliate_enabled ?? true,
        affiliateCommission: data?.affiliate_commission ?? 15.00,
        affiliateCurrency: data?.affiliate_currency || 'USD',
        affiliateMinWithdrawal: data?.affiliate_min_withdrawal ?? 100,
        affiliateWithdrawalDays: data?.affiliate_withdrawal_days || [1],
        paymentConfig: data?.payment_config || {
          xendit: { enabled: false, publicKey: '', secretKey: '' },
          paypal: { enabled: false, clientId: '', clientSecret: '' },
          ewallet: { enabled: false, instructions: '' },
          bank: { enabled: false, instructions: '' }
        },
        defaultTheme: data?.default_theme || 'dark'
      };
    },

    updateSettings: async (settings: AdminSettings): Promise<void> => {
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
        affiliate_withdrawal_days: settings.affiliateWithdrawalDays,
        payment_config: settings.paymentConfig,
        default_theme: settings.defaultTheme
      };

      console.log('Attempting to save admin settings:', dbPayload);

      const { error } = await supabase
        .from('admin_settings')
        .upsert(dbPayload);

      if (error) {
        throw new Error(error.message);
      }
    },

    // Alias for backward compatibility
    saveSettings: async (settings: Partial<AdminSettings>): Promise<void> => {
      const fullSettings = await api.admin.getSettings();
      return api.admin.updateSettings({ ...fullSettings, ...settings });
    },

    testEmail: async (to: string): Promise<void> => {
      await delay(1500);
      if (!to.includes('@')) throw new Error("Invalid email address");
    },

    getPackages: async (): Promise<Package[]> => {
      const { data, error } = await supabase
        .from('packages')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) {
        console.error('Error fetching packages:', error);
        throw new Error('Failed to fetch packages');
      }

      return data?.map(mapPackage) || [];
    },

    updatePackage: async (data: Partial<Package> & { id: string }): Promise<void> => {
      const updateData: any = {
        name: data.name,
        price_monthly: data.priceMonthly,
        price_yearly: data.priceYearly,
        price_lifetime: data.priceLifetime,
        currency: data.currency,
        features: data.features,
        limits: data.limits,
        color: data.color,
        is_active: data.isActive,
        is_visible: data.isVisible,
        display_order: data.displayOrder,
        allowed_routes: data.allowedRoutes,
        updated_at: new Date().toISOString()
      };

      // Remove undefined keys
      Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

      const { error } = await supabase
        .from('packages')
        .update(updateData)
        .eq('id', data.id);

      if (error) {
        console.error('Error updating package:', error);
        throw new Error('Failed to update package');
      }
    },

    createPackage: async (data: Package): Promise<void> => {
      const insertData = {
        id: data.id,
        name: data.name,
        price_monthly: data.priceMonthly,
        price_yearly: data.priceYearly,
        price_lifetime: data.priceLifetime || null,
        currency: data.currency,
        features: data.features,
        limits: data.limits,
        color: data.color,
        is_active: data.isActive,
        is_visible: data.isVisible !== false, // Default to true
        display_order: data.displayOrder ?? 99, // Default to 99
        allowed_routes: data.allowedRoutes || []
      };

      const { error } = await supabase
        .from('packages')
        .insert(insertData);

      if (error) {
        console.error('Error creating package:', error);
        throw new Error('Failed to create package');
      }
    },

    deletePackage: async (id: string): Promise<void> => {
      console.log('API: Deleting package with ID:', id);
      const { data, error } = await supabase
        .from('packages')
        .delete()
        .eq('id', id)
        .select();

      if (error) {
        console.error('Error deleting package:', error);
        throw new Error('Failed to delete package: ' + error.message);
      }

      console.log('API: Deleted rows:', data);

      if (!data || data.length === 0) {
        throw new Error(`Package not found or could not be deleted. Access denied? ID: ${id}`);
      }
    }
  },

  subscriptions: {
    getAll: async (): Promise<UserSubscription[]> => {
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select(`
          *,
          profiles (name, email, avatar_url),
          packages (name, color)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching subscriptions:', error);
        throw new Error(error.message);
      }

      return data as UserSubscription[];
    },

    create: async (subscription: Partial<UserSubscription> & { email: string, proof_url?: string, payment_method?: string }): Promise<void> => {
      // 1. Find user by email
      const { data: users, error: userError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', subscription.email)
        .single();

      if (userError || !users) {
        console.error('User lookup failed:', userError);
        throw new Error(`User with email ${subscription.email} not found. They must sign up first.`);
      }

      const userId = users.id;

      // 2. Deactivate any existing Active subscriptions for this user
      const { error: deactivateError } = await supabase
        .from('user_subscriptions')
        .update({ status: 'Cancelled' })
        .eq('user_id', userId)
        .eq('status', 'Active');

      if (deactivateError) {
        console.error('Error deactivating old subscriptions:', deactivateError);
        // Continue anyway - we still want to create the new subscription
      }

      // 3. Create new subscription
      const { error } = await supabase
        .from('user_subscriptions')
        .insert({
          user_id: userId,
          package_id: subscription.package_id,
          status: subscription.status,
          billing_cycle: subscription.billing_cycle,
          amount: subscription.amount,
          next_billing_date: subscription.next_billing_date,
          payment_method: subscription.payment_method,
          proof_url: subscription.proof_url
        });

      if (error) {
        console.error('Error creating subscription:', error);
        throw new Error(error.message);
      }
    },

    uploadProof: async (file: File): Promise<string> => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('payment_proofs')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Error uploading proof:', uploadError);
        throw new Error('Failed to upload payment proof');
      }

      const { data } = supabase.storage
        .from('payment_proofs')
        .getPublicUrl(filePath);

      return data.publicUrl;
    },

    approve: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from('user_subscriptions')
        .update({ status: 'Active' })
        .eq('id', id);

      if (error) throw new Error(error.message);
    },

    reject: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from('user_subscriptions')
        .update({ status: 'Rejected' })
        .eq('id', id);

      if (error) throw new Error(error.message);
    },

    getCurrentSubscription: async (): Promise<UserSubscription | null> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // Fetch all subscriptions (Active and Pending) to find both current and previous
      const { data: allSubs, error } = await supabase
        .from('user_subscriptions')
        .select(`
          *,
          packages (name, color, allowed_routes)
        `)
        .eq('user_id', user.id)
        .in('status', ['Active', 'Pending'])
        .order('created_at', { ascending: false });

      if (error) {
        if (error.code !== 'PGRST116') {
          console.error('Error fetching current subscription:', error);
        }
        return null;
      }

      if (!allSubs || allSubs.length === 0) {
        return null;
      }

      // The most recent subscription (could be Pending or Active)
      const currentSub = allSubs[0];

      // If current is Pending, find the previous Active subscription for access control
      let accessSub = currentSub;
      if (currentSub.status === 'Pending') {
        const previousActive = allSubs.find(sub => sub.status === 'Active');
        if (previousActive) {
          accessSub = previousActive;
        }
      }

      // Attach the access subscription's routes to the current subscription
      // This way the UI shows the Pending info but uses the previous plan's routes
      const result = {
        ...currentSub,
        // Add a special field for access control routes
        access_packages: accessSub.packages,
        access_package_id: accessSub.package_id
      };

      console.log('[getCurrentSubscription] Fetched subscription:', {
        display_status: currentSub.status,
        display_package: currentSub.packages?.name,
        access_package: accessSub.packages?.name,
        access_routes: accessSub.packages?.allowed_routes
      });

      return result as UserSubscription;
    },

    update: async (id: string, updates: Partial<{
      package_id: string;
      status: string;
      billing_cycle: string;
      amount: number;
      next_billing_date: string;
    }>): Promise<void> => {
      const { error } = await supabase
        .from('user_subscriptions')
        .update(updates)
        .eq('id', id);

      if (error) {
        console.error('Error updating subscription:', error);
        throw new Error(error.message);
      }
    },

    delete: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from('user_subscriptions')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting subscription:', error);
        throw new Error(error.message);
      }
    },
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
      const { data: tickets, error } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('last_update_at', { ascending: false });

      if (error) {
        console.error('Error fetching tickets:', error);
        return [];
      }

      if (!tickets || tickets.length === 0) return [];

      // Fetch messages for all tickets
      const ticketIds = tickets.map(t => t.id);
      const { data: messages } = await supabase
        .from('ticket_messages')
        .select('*')
        .in('ticket_id', ticketIds)
        .order('created_at', { ascending: true });

      const messagesByTicket = (messages || []).reduce((acc: any, msg: any) => {
        if (!acc[msg.ticket_id]) acc[msg.ticket_id] = [];
        acc[msg.ticket_id].push(msg);
        return acc;
      }, {});

      return tickets.map(t => mapSupportTicket(t, messagesByTicket[t.id] || []));
    },

    getAllTickets: async (): Promise<SupportTicket[]> => {
      const { data: tickets, error } = await supabase
        .from('support_tickets')
        .select('*')
        .order('last_update_at', { ascending: false });

      if (error) {
        console.error('Error fetching all tickets:', error);
        return [];
      }

      if (!tickets || tickets.length === 0) return [];

      const ticketIds = tickets.map(t => t.id);
      const { data: messages } = await supabase
        .from('ticket_messages')
        .select('*')
        .in('ticket_id', ticketIds)
        .order('created_at', { ascending: true });

      const messagesByTicket = (messages || []).reduce((acc: any, msg: any) => {
        if (!acc[msg.ticket_id]) acc[msg.ticket_id] = [];
        acc[msg.ticket_id].push(msg);
        return acc;
      }, {});

      return tickets.map(t => mapSupportTicket(t, messagesByTicket[t.id] || []));
    },

    createTicket: async (workspaceId: string, userId: string, subject: string, message: string): Promise<void> => {
      // Get user profile for name
      const { data: profile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', userId)
        .single();

      const senderName = profile?.name || 'User';

      // 1. Create Ticket
      const { data: ticket, error: ticketError } = await supabase
        .from('support_tickets')
        .insert({
          workspace_id: workspaceId,
          user_id: userId,
          subject: subject,
          status: 'OPEN',
          priority: 'MEDIUM'
        })
        .select()
        .single();

      if (ticketError || !ticket) {
        console.error('Error creating ticket:', ticketError);
        throw new Error('Failed to create ticket');
      }

      // 2. Create Initial Message
      const { error: messageError } = await supabase
        .from('ticket_messages')
        .insert({
          ticket_id: ticket.id,
          sender_id: userId,
          sender_name: senderName,
          content: message,
          is_admin: false
        });

      if (messageError) {
        console.error('Error creating ticket message:', messageError);
      }
    },

    replyTicket: async (ticketId: string, senderId: string, content: string, isAdmin: boolean): Promise<void> => {
      let senderName = isAdmin ? 'Support Agent' : 'User';

      if (!isAdmin) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', senderId)
          .single();
        senderName = profile?.name || 'User';
      }

      const { error } = await supabase
        .from('ticket_messages')
        .insert({
          ticket_id: ticketId,
          sender_id: senderId,
          sender_name: senderName,
          content: content,
          is_admin: isAdmin
        });

      if (error) {
        console.error('Error replying to ticket:', error);
        throw new Error('Failed to reply to ticket');
      }

      // Update ticket status
      await supabase
        .from('support_tickets')
        .update({ status: isAdmin ? 'IN_PROGRESS' : 'OPEN', last_update_at: new Date().toISOString() })
        .eq('id', ticketId);
    }
  },

  // ============================================
  // SCHEDULER API
  // ============================================
  scheduler: {
    // Get all workflows for a workspace
    getWorkflows: async (workspaceId: string) => {
      const { data, error } = await supabase
        .from('scheduler_workflows')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error fetching scheduler workflows:', error);
        return [];
      }

      // Fetch latest execution for each workflow
      const workflowsWithExecution = await Promise.all(
        (data || []).map(async (row: any) => {
          // Get latest execution for this workflow
          const { data: executions } = await supabase
            .from('scheduler_executions')
            .select('*')
            .eq('workflow_id', row.id)
            .order('started_at', { ascending: false })
            .limit(1);

          const lastExecution = executions?.[0] ? {
            id: executions[0].id,
            status: executions[0].status,
            startedAt: executions[0].started_at,
            completedAt: executions[0].completed_at,
            error: executions[0].error,
            generatedTopic: executions[0].generated_topic,
            facebookPostId: executions[0].facebook_post_id
          } : null;

          return {
            id: row.id,
            workspaceId: row.workspace_id,
            name: row.name,
            description: row.description,
            status: row.status,
            nodes: row.nodes || [],
            edges: row.edges || [],
            configurations: row.configurations || {},
            scheduleType: row.schedule_type,
            scheduleTime: row.schedule_time,
            scheduleTimes: row.schedule_times || [row.schedule_time || '09:00'],
            scheduleDays: row.schedule_days || [],
            scheduleTimezone: row.schedule_timezone,
            cronExpression: row.cron_expression,
            nextRunAt: row.next_run_at,
            lastRunAt: row.last_run_at,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            lastExecution
          };
        })
      );

      return workflowsWithExecution;
    },

    // Get single workflow
    getWorkflow: async (id: string) => {
      const { data, error } = await supabase
        .from('scheduler_workflows')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching scheduler workflow:', error);
        throw new Error('Workflow not found');
      }

      return {
        id: data.id,
        workspaceId: data.workspace_id,
        name: data.name,
        description: data.description,
        status: data.status,
        nodes: data.nodes || [],
        edges: data.edges || [],
        configurations: data.configurations || {},
        scheduleType: data.schedule_type,
        scheduleTime: data.schedule_time,
        scheduleDays: data.schedule_days || [],
        scheduleTimezone: data.schedule_timezone,
        cronExpression: data.cron_expression,
        nextRunAt: data.next_run_at,
        lastRunAt: data.last_run_at,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
    },

    // Create workflow
    createWorkflow: async (workspaceId: string, workflowData: any) => {
      // Extract schedule times - ensure it's always an array
      const scheduleTimes = workflowData.scheduleTimes ||
        (workflowData.scheduleTime ? [workflowData.scheduleTime] : ['09:00']);

      const { data, error } = await supabase
        .from('scheduler_workflows')
        .insert({
          workspace_id: workspaceId,
          name: workflowData.name || 'Untitled Workflow',
          description: workflowData.description,
          status: workflowData.status || 'draft',
          nodes: workflowData.nodes || [],
          edges: workflowData.edges || [],
          configurations: workflowData.configurations || {},
          schedule_type: workflowData.scheduleType || 'daily',
          schedule_time: workflowData.scheduleTime || scheduleTimes[0] || '09:00',
          schedule_times: scheduleTimes,
          schedule_days: workflowData.scheduleDays || [],
          schedule_timezone: workflowData.scheduleTimezone || 'UTC',
          cron_expression: workflowData.cronExpression,
          next_run_at: workflowData.nextRunAt
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating scheduler workflow:', error);
        throw new Error('Failed to create workflow');
      }

      return data;
    },

    // Update workflow
    updateWorkflow: async (id: string, workflowData: any) => {
      const updateData: any = {};

      if (workflowData.name !== undefined) updateData.name = workflowData.name;
      if (workflowData.description !== undefined) updateData.description = workflowData.description;
      if (workflowData.status !== undefined) updateData.status = workflowData.status;
      if (workflowData.nodes !== undefined) updateData.nodes = workflowData.nodes;
      if (workflowData.edges !== undefined) updateData.edges = workflowData.edges;
      if (workflowData.configurations !== undefined) updateData.configurations = workflowData.configurations;
      if (workflowData.scheduleType !== undefined) updateData.schedule_type = workflowData.scheduleType;
      if (workflowData.scheduleTime !== undefined) updateData.schedule_time = workflowData.scheduleTime;
      if (workflowData.scheduleTimes !== undefined) updateData.schedule_times = workflowData.scheduleTimes;
      if (workflowData.scheduleDays !== undefined) updateData.schedule_days = workflowData.scheduleDays;
      if (workflowData.scheduleTimezone !== undefined) updateData.schedule_timezone = workflowData.scheduleTimezone;
      if (workflowData.cronExpression !== undefined) updateData.cron_expression = workflowData.cronExpression;

      const { data, error } = await supabase
        .from('scheduler_workflows')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating scheduler workflow:', error);
        throw new Error('Failed to update workflow');
      }

      return data;
    },

    // Delete workflow
    deleteWorkflow: async (id: string) => {
      const { error } = await supabase
        .from('scheduler_workflows')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting scheduler workflow:', error);
        throw new Error('Failed to delete workflow');
      }
    },

    // Get executions for a workflow
    getExecutions: async (workflowId: string, limit: number = 20) => {
      const { data, error } = await supabase
        .from('scheduler_executions')
        .select('*')
        .eq('workflow_id', workflowId)
        .order('started_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching executions:', error);
        return [];
      }

      return data?.map((row: any) => ({
        id: row.id,
        workflowId: row.workflow_id,
        status: row.status,
        startedAt: row.started_at,
        completedAt: row.completed_at,
        result: row.result,
        error: row.error,
        generatedTopic: row.generated_topic,
        generatedImageUrl: row.generated_image_url,
        generatedCaption: row.generated_caption,
        facebookPostId: row.facebook_post_id
      })) || [];
    },

    // Get topic history to avoid duplicates
    getTopicHistory: async (workflowId: string) => {
      const { data, error } = await supabase
        .from('scheduler_topic_history')
        .select('topic')
        .eq('workflow_id', workflowId)
        .order('generated_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Error fetching topic history:', error);
        return [];
      }

      return data?.map((row: any) => row.topic) || [];
    },

    // Add topic to history
    addTopicToHistory: async (workflowId: string, topic: string) => {
      const { error } = await supabase
        .from('scheduler_topic_history')
        .insert({
          workflow_id: workflowId,
          topic: topic
        });

      if (error) {
        console.error('Error adding topic to history:', error);
      }
    },

    // Create execution record
    createExecution: async (workflowId: string) => {
      const { data, error } = await supabase
        .from('scheduler_executions')
        .insert({
          workflow_id: workflowId,
          status: 'running'
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating execution:', error);
        throw new Error('Failed to start execution');
      }

      return data;
    },

    // Update execution
    updateExecution: async (executionId: string, updates: any) => {
      const updateData: any = {};

      if (updates.status) updateData.status = updates.status;
      if (updates.completedAt) updateData.completed_at = updates.completedAt;
      if (updates.result) updateData.result = updates.result;
      if (updates.error) updateData.error = updates.error;
      if (updates.generatedTopic) updateData.generated_topic = updates.generatedTopic;
      if (updates.generatedImageUrl) updateData.generated_image_url = updates.generatedImageUrl;
      if (updates.generatedCaption) updateData.generated_caption = updates.generatedCaption;
      if (updates.facebookPostId) updateData.facebook_post_id = updates.facebookPostId;

      const { error } = await supabase
        .from('scheduler_executions')
        .update(updateData)
        .eq('id', executionId);

      if (error) {
        console.error('Error updating execution:', error);
      }
    },

    // Run workflow immediately by setting next_run_at to now
    runNow: async (workflowId: string) => {
      // First, clean up any stuck "running" executions for this workflow
      await supabase
        .from('scheduler_executions')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          error: 'Cancelled - new run triggered'
        })
        .eq('workflow_id', workflowId)
        .eq('status', 'running');

      // Set next_run_at to now and ensure status is active
      const { error } = await supabase
        .from('scheduler_workflows')
        .update({
          next_run_at: new Date().toISOString(),
          status: 'active'
        })
        .eq('id', workflowId);

      if (error) {
        console.error('Error setting run now:', error);
        throw new Error('Failed to trigger workflow');
      }

      return { success: true, message: 'Workflow scheduled for immediate execution' };
    }
  },

  // ============================================
  // FLOW TEMPLATES API
  // ============================================
  templates: {
    // Get all templates for a workspace
    getTemplates: async (workspaceId: string) => {
      const { data, error } = await supabase
        .from('flow_templates')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching flow templates:', error);
        return [];
      }

      return (data || []).map((row: any) => ({
        id: row.id,
        workspaceId: row.workspace_id,
        name: row.name,
        description: row.description,
        nodes: row.nodes || [],
        edges: row.edges || [],
        configurations: row.configurations || {},
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));
    },

    // Get single template
    getTemplate: async (templateId: string) => {
      const { data, error } = await supabase
        .from('flow_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (error) {
        console.error('Error fetching template:', error);
        throw new Error('Template not found');
      }

      return {
        id: data.id,
        workspaceId: data.workspace_id,
        name: data.name,
        description: data.description,
        nodes: data.nodes || [],
        edges: data.edges || [],
        configurations: data.configurations || {},
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
    },

    // Create template
    createTemplate: async (workspaceId: string, templateData: {
      name: string;
      description?: string;
      nodes: any[];
      edges: any[];
      configurations?: Record<string, any>;
    }) => {
      const { data, error } = await supabase
        .from('flow_templates')
        .insert({
          workspace_id: workspaceId,
          name: templateData.name,
          description: templateData.description || '',
          nodes: templateData.nodes,
          edges: templateData.edges,
          configurations: templateData.configurations || {}
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating template:', error);
        throw new Error('Failed to create template');
      }

      return {
        id: data.id,
        workspaceId: data.workspace_id,
        name: data.name,
        description: data.description,
        nodes: data.nodes,
        edges: data.edges,
        configurations: data.configurations,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
    },

    // Delete template
    deleteTemplate: async (templateId: string) => {
      const { error } = await supabase
        .from('flow_templates')
        .delete()
        .eq('id', templateId);

      if (error) {
        console.error('Error deleting template:', error);
        throw new Error('Failed to delete template');
      }
    }
  },

};