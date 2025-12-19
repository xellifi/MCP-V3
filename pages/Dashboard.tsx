import React, { useEffect, useState } from 'react';
import { Workspace } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { MessageCircle, Users, Activity, TrendingUp, Facebook, Instagram } from 'lucide-react';
import { api } from '../services/api';
import { supabase } from '../lib/supabase';
import { format, subDays, startOfDay } from 'date-fns';

interface DashboardProps {
  workspace: Workspace;
}

interface DashboardStats {
  connectedPages: number;
  totalConversations: number;
  totalMessages: number;
  activeSubscribers: number;
}

interface ChartData {
  name: string;
  conversations: number;
  messages: number;
}

const StatCard = ({ title, value, icon: Icon, color, loading }: any) => (
  <div className="bg-slate-900 p-6 rounded-xl shadow-lg border border-slate-800 flex items-center space-x-4">
    <div className={`p-3 rounded-lg ${color} bg-opacity-20`}>
      <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
    </div>
    <div>
      <p className="text-sm font-medium text-slate-400">{title}</p>
      {loading ? (
        <div className="h-8 w-20 bg-slate-800 animate-pulse rounded mt-1"></div>
      ) : (
        <h3 className="text-2xl font-bold text-slate-100">{value.toLocaleString()}</h3>
      )}
    </div>
  </div>
);

const Dashboard: React.FC<DashboardProps> = ({ workspace }) => {
  const [stats, setStats] = useState<DashboardStats>({
    connectedPages: 0,
    totalConversations: 0,
    totalMessages: 0,
    activeSubscribers: 0
  });
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, [workspace.id]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch all data in parallel
      const [pages, conversations, subscribers] = await Promise.all([
        api.workspace.getConnectedPages(workspace.id),
        api.workspace.getConversations(workspace.id),
        api.workspace.getSubscribers(workspace.id)
      ]);

      // Get total message count
      const { count: messageCount } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .in('conversation_id', conversations.map(c => c.id));

      // Update stats
      setStats({
        connectedPages: pages.length,
        totalConversations: conversations.length,
        totalMessages: messageCount || 0,
        activeSubscribers: subscribers.filter(s => s.status === 'SUBSCRIBED').length
      });

      // Generate chart data for last 7 days
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = subDays(new Date(), 6 - i);
        return {
          date: startOfDay(date),
          name: format(date, 'EEE')
        };
      });

      // Get conversations and messages grouped by day
      const chartDataPromises = last7Days.map(async (day) => {
        const nextDay = new Date(day.date);
        nextDay.setDate(nextDay.getDate() + 1);

        // Count conversations created on this day
        const { count: convCount } = await supabase
          .from('conversations')
          .select('*', { count: 'exact', head: true })
          .eq('workspace_id', workspace.id)
          .gte('created_at', day.date.toISOString())
          .lt('created_at', nextDay.toISOString());

        // Count messages sent on this day
        const { count: msgCount } = await supabase
          .from('messages')
          .select('*, conversations!inner(workspace_id)', { count: 'exact', head: true })
          .eq('conversations.workspace_id', workspace.id)
          .gte('created_at', day.date.toISOString())
          .lt('created_at', nextDay.toISOString());

        return {
          name: day.name,
          conversations: convCount || 0,
          messages: msgCount || 0
        };
      });

      const chartResults = await Promise.all(chartDataPromises);
      setChartData(chartResults);

      // Get recent messages for activity feed
      const { data: recentMessages } = await supabase
        .from('messages')
        .select('*, conversations!inner(*, subscribers!inner(*))')
        .eq('conversations.workspace_id', workspace.id)
        .eq('direction', 'INBOUND')
        .order('created_at', { ascending: false })
        .limit(5);

      setRecentActivity(recentMessages || []);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Dashboard</h1>
          <p className="text-slate-400 mt-1">Overview for {workspace.name}</p>
        </div>
        <div className="text-sm text-slate-400 bg-slate-900 px-3 py-1 rounded-md border border-slate-800 shadow-sm">
          Last 7 Days
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Connected Pages"
          value={stats.connectedPages}
          icon={Facebook}
          color="bg-blue-500"
          loading={loading}
        />
        <StatCard
          title="Conversations"
          value={stats.totalConversations}
          icon={MessageCircle}
          color="bg-indigo-500"
          loading={loading}
        />
        <StatCard
          title="Total Messages"
          value={stats.totalMessages}
          icon={Activity}
          color="bg-emerald-500"
          loading={loading}
        />
        <StatCard
          title="Active Subscribers"
          value={stats.activeSubscribers}
          icon={Users}
          color="bg-orange-500"
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-900 p-6 rounded-xl shadow-lg border border-slate-800">
          <h3 className="text-lg font-bold text-slate-100 mb-6">Engagement Overview</h3>
          {loading ? (
            <div className="h-72 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} />
                  <Tooltip
                    cursor={{ fill: '#1e293b' }}
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderRadius: '8px',
                      border: '1px solid #334155',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.5)',
                      color: '#f8fafc'
                    }}
                    itemStyle={{ color: '#f8fafc' }}
                  />
                  <Bar dataKey="conversations" name="New Conversations" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="messages" name="Messages" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="bg-slate-900 p-6 rounded-xl shadow-lg border border-slate-800">
          <h3 className="text-lg font-bold text-slate-100 mb-4">Recent Messages</h3>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-start space-x-3 pb-3 border-b border-slate-800">
                  <div className="w-8 h-8 rounded-full bg-slate-800 animate-pulse"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-800 rounded animate-pulse w-3/4"></div>
                    <div className="h-3 bg-slate-800 rounded animate-pulse w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : recentActivity.length > 0 ? (
            <div className="space-y-4">
              {recentActivity.map((msg: any) => {
                const subscriber = msg.conversations?.subscribers;
                const timeAgo = msg.created_at ?
                  Math.floor((Date.now() - new Date(msg.created_at).getTime()) / 60000) : 0;

                return (
                  <div key={msg.id} className="flex items-start space-x-3 pb-3 border-b border-slate-800 last:border-0 last:pb-0">
                    {subscriber?.avatar_url ? (
                      <img
                        src={subscriber.avatar_url}
                        alt={subscriber.name}
                        className="w-8 h-8 rounded-full flex-shrink-0 object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-slate-800 flex-shrink-0 flex items-center justify-center text-xs font-bold text-slate-400">
                        {subscriber?.name?.charAt(0) || 'U'}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-300 truncate">
                        <span className="font-semibold text-slate-100">{subscriber?.name || 'Unknown'}</span>
                        {' '}sent a message
                      </p>
                      <p className="text-xs text-slate-500 truncate">{msg.content || 'Attachment'}</p>
                      <p className="text-xs text-slate-600 mt-1">
                        {timeAgo < 1 ? 'Just now' : timeAgo < 60 ? `${timeAgo}m ago` : `${Math.floor(timeAgo / 60)}h ago`}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-20" />
              <p className="text-sm">No recent messages</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;