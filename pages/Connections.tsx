import React, { useEffect, useState } from 'react';
import { Workspace, MetaConnection } from '../types';
import { api } from '../services/api';
import { Facebook, CheckCircle, Trash2, Plus, RefreshCw, UserCheck } from 'lucide-react';
import { useToast } from '../context/ToastContext';

interface ConnectionsProps {
  workspace: Workspace;
}

const Connections: React.FC<ConnectionsProps> = ({ workspace }) => {
  const [connections, setConnections] = useState<MetaConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    loadConnections();
    handleOAuthCallback();
  }, [workspace.id]);

  const handleOAuthCallback = async () => {
    // Check if we have an OAuth code in the URL
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');

    if (code) {
      setLoading(true);
      try {
        // CRITICAL: Ensure we have a valid Supabase session first
        const { supabase } = await import('../lib/supabase');
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        console.log('Checking Supabase session...', {
          hasSession: !!session,
          userId: session?.user?.id,
          sessionError
        });

        if (!session) {
          console.error('No active Supabase session found!');
          toast.error('Please log in first before connecting Facebook.');
          window.history.replaceState({}, document.title, '/connections');
          setLoading(false);
          return;
        }

        console.log('Session verified, user ID:', session.user.id);

        // Exchange code for access token
        const settings = await api.admin.getSettings();
        const redirectUri = `${window.location.origin}/connections`;

        console.log('Exchanging code for access token...');
        // Call Facebook Graph API to exchange code for access token
        const tokenResponse = await fetch(`https://graph.facebook.com/v18.0/oauth/access_token?client_id=${settings.facebookAppId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${settings.facebookAppSecret}&code=${code}`);
        const tokenData = await tokenResponse.json();
        console.log('Token response:', tokenData);

        if (tokenData.access_token) {
          // Get user info from Facebook
          console.log('Fetching user info from Facebook...');
          const userResponse = await fetch(`https://graph.facebook.com/v18.0/me?fields=id,name,picture&access_token=${tokenData.access_token}`);
          const userData = await userResponse.json();
          console.log('User data:', userData);

          // Check authentication status before saving
          const { data: { session } } = await (await import('../lib/supabase')).supabase.auth.getSession();
          console.log('Current auth session:', session ? 'Authenticated' : 'Not authenticated');
          console.log('User ID:', session?.user?.id);

          // Save connection to database
          console.log('Saving connection to database...', {
            workspaceId: workspace.id,
            platform: 'FACEBOOK',
            name: userData.name,
            externalId: userData.id
          });

          await api.workspace.createConnection(workspace.id, {
            platform: 'FACEBOOK',
            name: userData.name,
            externalId: userData.id,
            imageUrl: userData.picture?.data?.url,
            accessToken: tokenData.access_token
          });

          console.log('Connection saved successfully!');

          // Auto-fetch pages immediately after connection
          console.log('Auto-fetching Facebook pages...');
          try {
            const pagesResponse = await fetch(
              `https://graph.facebook.com/v18.0/me/accounts?fields=id,name,access_token,picture,fan_count,instagram_business_account{id,username,profile_picture_url,followers_count}&access_token=${tokenData.access_token}`
            );
            const pagesData = await pagesResponse.json();

            console.log('Pages API Response:', pagesData);

            if (pagesData.data && pagesData.data.length > 0) {
              console.log(`Found ${pagesData.data.length} pages, saving to database...`);

              // Save each page directly using the access token we already have
              for (const fbPage of pagesData.data) {
                const pagePayload = {
                  workspace_id: workspace.id,
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

                try {
                  // GLOBAL CHECK: Check if page is already connected by ANOTHER user
                  const { supabase } = await import('../lib/supabase');
                  const { data: globalExistingPage } = await supabase
                    .from('connected_pages')
                    .select('id, workspace_id, name')
                    .eq('page_id', fbPage.id)
                    .neq('workspace_id', workspace.id)  // Exclude current workspace
                    .single();

                  if (globalExistingPage) {
                    console.log(`Page "${fbPage.name}" is already connected by another user, skipping...`);
                    toast.warning(`Page "${fbPage.name}" is already connected by another user. Skipped.`);
                    continue; // Skip this page
                  }

                  // Check if page already exists in THIS workspace
                  const { data: existingPage } = await supabase
                    .from('connected_pages')
                    .select('id')
                    .eq('workspace_id', workspace.id)
                    .eq('page_id', fbPage.id)
                    .single();

                  if (existingPage) {
                    // Update existing page
                    const { error: updateError } = await supabase
                      .from('connected_pages')
                      .update(pagePayload)
                      .eq('id', existingPage.id);

                    if (updateError) {
                      console.error(`Error updating page ${fbPage.name}:`, updateError);
                    } else {
                      console.log(`Updated page: ${fbPage.name}`);
                    }
                  } else {
                    // Insert new page
                    const { data, error: pageError } = await supabase
                      .from('connected_pages')
                      .insert(pagePayload)
                      .select()
                      .single();

                    if (pageError) {
                      console.error(`Error saving page ${fbPage.name}:`, pageError);
                    } else {
                      console.log(`Saved page: ${fbPage.name}`);
                    }
                  }

                  // CRITICAL: Subscribe the page to receive webhooks from this app
                  // Without this, the page won't receive comment/message webhooks
                  console.log(`Subscribing page ${fbPage.name} to webhooks...`);
                  const subscribeResponse = await fetch(
                    `https://graph.facebook.com/v18.0/${fbPage.id}/subscribed_apps`,
                    {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        subscribed_fields: ['feed', 'messages', 'messaging_postbacks', 'message_deliveries', 'message_reads'],
                        access_token: fbPage.access_token
                      })
                    }
                  );
                  const subscribeResult = await subscribeResponse.json();

                  if (subscribeResult.success) {
                    console.log(`✓ Page ${fbPage.name} subscribed to webhooks successfully!`);
                  } else {
                    console.error(`✗ Failed to subscribe page ${fbPage.name} to webhooks:`, subscribeResult);
                  }
                } catch (err) {
                  console.error(`Exception saving page ${fbPage.name}:`, err);
                }
              }

              toast.success(`Successfully connected ${userData.name} and imported ${pagesData.data.length} page(s)! Go to Pages tab to view them.`);
            } else {
              toast.success(`Successfully connected ${userData.name}!`);
            }
          } catch (pageError) {
            console.error('Error auto-fetching pages:', pageError);
            toast.success(`Successfully connected ${userData.name}! (Pages will be synced later)`);
          }

          // Clean up URL and reload connections
          window.history.replaceState({}, document.title, '/connections');
          await loadConnections();
        } else {
          console.error('No access token in response:', tokenData);
          throw new Error(tokenData.error?.message || 'Failed to get access token');
        }
      } catch (error: any) {
        console.error('OAuth callback error:', error);
        console.error('Error stack:', error.stack);
        toast.error(`Failed to complete connection: ${error.message || 'Please try again.'}`);
        setLoading(false);
        window.history.replaceState({}, document.title, '/connections');
      } finally {
        setLoading(false);
      }
    }
  };

  const loadConnections = async () => {
    setLoading(true);
    const data = await api.workspace.getConnections(workspace.id);
    setConnections(data);
    setLoading(false);
  };

  const handleDelete = async (connectionId: string, connectionName: string) => {
    if (!confirm(`Are you sure you want to delete the connection for ${connectionName}?`)) {
      return;
    }

    try {
      await api.workspace.deleteConnection(connectionId);
      toast.success(`Successfully deleted connection for ${connectionName}`);
      await loadConnections();
    } catch (error: any) {
      console.error('Error deleting connection:', error);
      toast.error(error.message || 'Failed to delete connection');
    }
  };

  const handleRefresh = async () => {
    toast.info('Refreshing connections...');
    await loadConnections();
    toast.success('Connections refreshed');
  };

  const handleConnect = async () => {
    try {
      // Fetch Facebook App ID from admin settings
      const settings = await api.admin.getSettings();

      if (!settings.facebookAppId) {
        toast.error('Facebook App ID is not configured. Please contact your administrator.');
        return;
      }

      // Construct Facebook OAuth URL
      const redirectUri = encodeURIComponent(`${window.location.origin}/connections`);
      const scope = encodeURIComponent('pages_show_list,pages_read_engagement,pages_manage_metadata,pages_manage_posts,instagram_basic,instagram_manage_comments');
      const facebookOAuthUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${settings.facebookAppId}&redirect_uri=${redirectUri}&scope=${scope}&response_type=code`;

      // Redirect to Facebook OAuth
      window.location.href = facebookOAuthUrl;
    } catch (error) {
      console.error('Error initiating Facebook OAuth:', error);
      toast.error('Failed to connect. Please try again.');
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center p-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
    </div>
  );

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold text-white tracking-tight mb-2">Connections</h1>
          <p className="text-slate-400 text-lg">Connect your personal social media profiles to manage pages.</p>
        </div>
        <button
          onClick={handleConnect}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 active:scale-95 group"
        >
          <div className="p-1 bg-white/20 rounded-lg group-hover:scale-110 transition-transform">
            <Plus className="w-4 h-4" />
          </div>
          Add Account
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {connections.map(connection => (
          <div key={connection.id} className="glass-panel p-6 rounded-2xl border border-white/10 group hover:border-blue-500/30 transition-all duration-300 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-16 -mt-16 transition-opacity group-hover:opacity-75"></div>

            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-6">
                <div className="relative">
                  {connection.imageUrl ? (
                    <img src={connection.imageUrl} alt={connection.name} className="w-16 h-16 rounded-2xl border-2 border-white/10 shadow-lg object-cover" />
                  ) : (
                    <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center text-slate-400 border border-white/10">
                      <UserCheck className="w-7 h-7" />
                    </div>
                  )}
                  <div className="absolute -bottom-2 -right-2 bg-slate-900 rounded-xl p-1 shadow-lg border border-white/10">
                    <div className="bg-[#1877F2] text-white rounded-lg p-1.5 flex items-center justify-center shadow-inner">
                      <Facebook className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
                <div className="min-w-0">
                  <h3 className="text-xl font-bold text-white line-clamp-1 group-hover:text-blue-400 transition-colors">{connection.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-mono text-slate-500 bg-white/5 px-2 py-0.5 rounded border border-white/5">ID: {connection.externalId}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-6">
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm shadow-emerald-500/5">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Connected
                </div>
                <span className="text-xs text-slate-500 ml-auto flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>
                  Graph API Active
                </span>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleRefresh}
                  className="flex-1 py-3 px-4 text-sm font-bold text-slate-300 bg-white/5 hover:bg-white/10 hover:text-white rounded-xl transition-all border border-white/5 flex items-center justify-center gap-2 group/btn"
                >
                  <RefreshCw className="w-4 h-4 group-hover/btn:rotate-180 transition-transform duration-500" />
                  Refresh
                </button>
                <button
                  onClick={() => handleDelete(connection.id, connection.name)}
                  className="py-3 px-4 text-sm font-bold text-red-400 bg-red-500/10 hover:bg-red-500/20 hover:text-red-300 rounded-xl transition-colors flex items-center justify-center border border-red-500/10"
                  title="Remove Connection"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {connections.length === 0 && (
          <div className="col-span-full py-20 text-center glass-panel rounded-3xl border border-dashed border-white/10 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative z-10 p-6">
              <div className="w-24 h-24 bg-gradient-to-tr from-blue-600 to-blue-400 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-blue-500/20 group-hover:scale-110 transition-transform duration-300 rotate-3 group-hover:rotate-6">
                <Facebook className="w-12 h-12 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">No accounts connected</h3>
              <p className="text-slate-400 max-w-md mx-auto mb-10 text-lg leading-relaxed">
                Connect your personal Facebook profile to start importing your business pages and automating your conversations.
              </p>
              <button
                onClick={handleConnect}
                className="bg-white text-blue-600 px-8 py-4 rounded-full font-bold text-lg hover:bg-blue-50 transition-all shadow-xl shadow-blue-900/20 hover:shadow-blue-900/30 hover:-translate-y-1 active:scale-95"
              >
                Connect Profile Now
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Connections;