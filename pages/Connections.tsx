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
                  // Use simple insert - let RLS handle permissions
                  const { supabase } = await import('../lib/supabase');
                  const { data, error: pageError } = await supabase
                    .from('connected_pages')
                    .insert(pagePayload)
                    .select()
                    .single();

                  if (pageError) {
                    // If it's a duplicate, try to update instead
                    if (pageError.code === '23505') {
                      const { error: updateError } = await supabase
                        .from('connected_pages')
                        .update(pagePayload)
                        .eq('page_id', fbPage.id)
                        .eq('workspace_id', workspace.id);

                      if (updateError) {
                        console.error(`Error updating page ${fbPage.name}:`, updateError);
                      } else {
                        console.log(`Updated page: ${fbPage.name}`);
                      }
                    } else {
                      console.error(`Error saving page ${fbPage.name}:`, pageError);
                    }
                  } else {
                    console.log(`Saved page: ${fbPage.name}`);
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

  if (loading) return <div className="p-8 text-center text-slate-500">Loading connections...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Connections</h1>
          <p className="text-slate-400 mt-1">Connect your personal social media profiles to manage pages.</p>
        </div>
        <button
          onClick={handleConnect}
          className="flex items-center gap-2 bg-[#1877F2] hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors shadow-lg shadow-blue-900/30"
        >
          <Plus className="w-5 h-5" />
          Add Account
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {connections.map(connection => (
          <div key={connection.id} className="bg-slate-800/50 rounded-xl shadow-lg border border-slate-700 overflow-hidden backdrop-blur-sm">
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="relative">
                  {connection.imageUrl ? (
                    <img src={connection.imageUrl} alt={connection.name} className="w-14 h-14 rounded-full border border-slate-600" />
                  ) : (
                    <div className="w-14 h-14 bg-slate-700 rounded-full flex items-center justify-center text-slate-400">
                      <UserCheck className="w-6 h-6" />
                    </div>
                  )}
                  <div className="absolute -bottom-1 -right-1 bg-slate-800 rounded-full p-0.5">
                    <div className="bg-[#1877F2] text-white rounded-full p-1">
                      <Facebook className="w-3 h-3" />
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="font-bold text-slate-100 line-clamp-1">{connection.name}</h3>
                  <p className="text-xs text-slate-500 font-mono">ID: {connection.externalId}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-6">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-900/30 text-green-400 border border-green-800">
                  <CheckCircle className="w-3 h-3" />
                  Connected
                </span>
                <span className="text-xs text-slate-500">
                  via Graph API
                </span>
              </div>

              <div className="flex gap-2">
                <button className="flex-1 py-2 px-3 text-sm font-medium text-slate-300 bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-colors flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </button>
                <button className="py-2 px-3 text-sm font-medium text-red-400 bg-red-900/30 hover:bg-red-900/50 rounded-lg transition-colors flex items-center justify-center">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {connections.length === 0 && (
          <div className="col-span-full py-16 text-center bg-slate-800/50 rounded-xl border-2 border-dashed border-slate-700">
            <div className="w-16 h-16 bg-blue-900/30 text-blue-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <Facebook className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-100">No accounts connected</h3>
            <p className="text-slate-400 max-w-sm mx-auto mt-2 mb-6">Connect your personal Facebook profile to start importing your business pages.</p>
            <button
              onClick={handleConnect}
              className="bg-[#1877F2] hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors shadow-lg shadow-blue-900/30"
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