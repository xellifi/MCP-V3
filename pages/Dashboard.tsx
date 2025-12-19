import React, { useEffect, useState } from 'react';
import { Workspace } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { MessageCircle, Users, Activity, TrendingUp, Facebook, MoreHorizontal, ArrowRight, CalendarDays } from 'lucide-react';
import { api } from '../services/api';
import { supabase } from '../lib/supabase';
import { format, subDays, startOfDay } from 'date-fns';
import { useTheme } from '../context/ThemeContext';

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

const StatCard = ({ title, value, icon: Icon, gradient, loading }: any) => (
  <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border-2 border-slate-200 dark:border-slate-800 transition-all duration-200 hover:-translate-y-1 hover:border-primary-400 dark:hover:border-slate-700 group">
    <div className="flex items-center justify-between mb-4">
      <div className={`p-3 rounded-xl bg-gradient-to-br ${gradient} text-white group-hover:scale-110 transition-transform duration-200`}>
        <Icon className="w-6 h-6" />
      </div>
    </div>
    <div>
      <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">{title}</p>
      {loading ? (
        <div className="h-8 w-24 bg-slate-100 dark:bg-slate-800 animate-pulse rounded mt-1"></div>
      ) : (
        <h3 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{value.toLocaleString()}</h3>
      )}
    </div>
  </div>
);

const Dashboard: React.FC<DashboardProps> = ({ workspace }) => {
  const { isDark } = useTheme();
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

        // Count for simple demo purposes - in prod this should be a more optimized query
        const { count: convCount } = await supabase
          .from('conversations')
          .select('*', { count: 'exact', head: true })
          .eq('workspace_id', workspace.id)
          .gte('created_at', day.date.toISOString())
          .lt('created_at', nextDay.toISOString());

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
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Dashboard</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Overview for <span className="font-semibold text-primary-600 dark:text-primary-400">{workspace.name}</span>
          </p>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm text-sm font-medium text-slate-600 dark:text-slate-300">
          <CalendarDays className="w-4 h-4 text-slate-400" />
          Last 7 Days
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Connected Pages"
          value={stats.connectedPages}
          icon={Facebook}
          gradient="from-blue-500 to-blue-600"
          loading={loading}
        />
        <StatCard
          title="Conversations"
          value={stats.totalConversations}
          icon={MessageCircle}
          gradient="from-violet-500 to-purple-600"
          loading={loading}
        />
        <StatCard
          title="Total Messages"
          value={stats.totalMessages}
          icon={Activity}
          gradient="from-emerald-400 to-emerald-600"
          loading={loading}
        />
        <StatCard
          title="Active Subscribers"
          value={stats.activeSubscribers}
          icon={Users}
          gradient="from-orange-400 to-pink-500"
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-2xl border-2 border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Engagement Overview</h3>
            <button className="text-slate-400 hover:text-primary-600 dark:hover:text-primary-500 transition-colors">
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </div>

          {loading ? (
            <div className="h-72 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
            </div>
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barGap={8}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke={isDark ? '#334155' : '#e2e8f0'}
                  />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 12 }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 12 }}
                  />
                  <Tooltip
                    cursor={{ fill: isDark ? '#1e293b' : '#f1f5f9' }}
                    contentStyle={{
                      backgroundColor: isDark ? '#0f172a' : '#ffffff',
                      borderRadius: '12px',
                      border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                      color: isDark ? '#f8fafc' : '#0f172a',
                      padding: '12px'
                    }}
                    itemStyle={{ color: isDark ? '#f8fafc' : '#0f172a' }}
                  />
                  <Bar
                    dataKey="conversations"
                    name="New Conversations"
                    fill="#6366f1"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={50}
                  />
                  <Bar
                    dataKey="messages"
                    name="Messages"
                    fill="#a5b4fc"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={50}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border-2 border-slate-200 dark:border-slate-800 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Recent Messages</h3>
            <a href="/messages" className="text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-500 dark:hover:text-primary-600 flex items-center gap-1">
              View All <ArrowRight className="w-4 h-4" />
            </a>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-start space-x-3 pb-3">
                  <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 animate-pulse"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded animate-pulse w-3/4"></div>
                    <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded animate-pulse w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : recentActivity.length > 0 ? (
            <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-4">
              {recentActivity.map((msg: any) => {
                const subscriber = msg.conversations?.subscribers;
                const timeAgo = msg.created_at ?
                  Math.floor((Date.now() - new Date(msg.created_at).getTime()) / 60000) : 0;

                return (
                  <div key={msg.id} className="flex items-start space-x-3 group cursor-default">
                    {subscriber?.avatar_url ? (
                      <img
                        src={subscriber.avatar_url}
                        alt={subscriber.name}
                        className="w-10 h-10 rounded-full flex-shrink-0 object-cover border border-slate-100 dark:border-slate-700 shadow-sm"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex-shrink-0 flex items-center justify-center text-sm font-bold text-primary-600 dark:text-primary-400">
                        {subscriber?.name?.charAt(0) || 'U'}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                          {subscriber?.name || 'Unknown'}
                        </p>
                        <span className="text-xs text-slate-400 dark:text-slate-500">
                          {timeAgo < 1 ? 'Just now' : timeAgo < 60 ? `${timeAgo}m` : `${Math.floor(timeAgo / 60)}h`}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5 line-clamp-1">
                        {msg.content || 'Attachment'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 py-8">
              <div className="p-4 rounded-full bg-slate-50 dark:bg-slate-800/50 mb-3">
                <MessageCircle className="w-8 h-8 opacity-50" />
              </div>
              <p className="text-sm font-medium">No recent activity</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};



export default Dashboard;