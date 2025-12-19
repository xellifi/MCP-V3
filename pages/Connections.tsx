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
                  // Check if page already exists
                  const { supabase } = await import('../lib/supabase');
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
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Connections</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Connect your personal social media profiles to manage pages.</p>
        </div>
        <button
          onClick={handleConnect}
          className="flex items-center gap-2 bg-[#1877F2] hover:bg-blue-600 active:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40"
        >
          <Plus className="w-5 h-5" />
          Add Account
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {connections.map(connection => (
          <div key={connection.id} className="bg-white dark:bg-slate-900 rounded-2xl shadow-card dark:shadow-none border border-slate-200 dark:border-slate-800 overflow-hidden group hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
            <div className="p-6">
              <div className="flex items-center gap-4 mb-5">
                <div className="relative">
                  {connection.imageUrl ? (
                    <img src={connection.imageUrl} alt={connection.name} className="w-16 h-16 rounded-full border border-slate-200 dark:border-slate-700 object-cover" />
                  ) : (
                    <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400 dark:text-slate-500">
                      <UserCheck className="w-7 h-7" />
                    </div>
                  )}
                  <div className="absolute -bottom-1 -right-1 bg-white dark:bg-slate-900 rounded-full p-1 shadow-sm">
                    <div className="bg-[#1877F2] text-white rounded-full p-1.5 flex items-center justify-center">
                      <Facebook className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white line-clamp-1">{connection.name}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded inline-block">ID: {connection.externalId}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-6">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-900/50">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Connected
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 ml-auto">
                  via Graph API
                </span>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleRefresh}
                  className="flex-1 py-2.5 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </button>
                <button
                  onClick={() => handleDelete(connection.id, connection.name)}
                  className="py-2.5 px-4 text-sm font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-xl transition-colors flex items-center justify-center"
                  title="Remove Connection"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {connections.length === 0 && (
          <div className="col-span-full py-16 text-center bg-white dark:bg-slate-900 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800">
            <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 text-blue-500 dark:text-blue-400 rounded-full flex items-center justify-center mx-auto mb-6">
              <Facebook className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No accounts connected</h3>
            <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-8">Connect your personal Facebook profile to start importing your business pages and automations.</p>
            <button
              onClick={handleConnect}
              className="bg-[#1877F2] hover:bg-blue-600 text-white px-8 py-3 rounded-xl font-bold transition-transform active:scale-95 shadow-lg shadow-blue-500/20"
            >
              Connect Profile
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Connections;