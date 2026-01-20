import React, { useEffect, useState } from 'react';
import { Workspace } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { MessageCircle, Users, Activity, TrendingUp, Facebook, MoreHorizontal, ArrowRight, CalendarDays } from 'lucide-react';
import { api } from '../services/api';
import { supabase } from '../lib/supabase';
import { format, subDays, startOfDay } from 'date-fns';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';

interface DashboardProps {
  workspace: Workspace;
}

interface DashboardStats {
  connectedPages: number;
  totalConversations: number;
  totalFlows: number;
  activeSubscribers: number;
}

interface ChartData {
  name: string;
  conversations: number;
  messages: number;
}

const StatCard = ({ title, value, icon: Icon, gradient, loading }: any) => {
  const { isDark } = useTheme();
  return (
    <div className={`p-6 rounded-2xl border transition-all duration-300 hover:-translate-y-1 group relative overflow-hidden ${isDark
      ? 'glass-panel border-white/10 hover:border-indigo-500/30'
      : 'bg-white border-gray-300 hover:border-blue-400'
      }`}>
      <div className={`absolute -inset-1 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500 blur-xl`}></div>
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className={`p-3 rounded-xl bg-gradient-to-br ${gradient} text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
        <div>
          <p className="stat-label">{title}</p>
          {loading ? (
            <div className={`h-8 w-24 animate-pulse rounded mt-1 ${isDark ? 'bg-white/10' : 'bg-gray-200'
              }`}></div>
          ) : (
            <h3 className="stat-value mt-1">{value.toLocaleString()}</h3>
          )}
        </div>
      </div>
    </div>
  );
};

const Dashboard: React.FC<DashboardProps> = ({ workspace }) => {
  const { isDark } = useTheme();
  const toast = useToast();
  const [stats, setStats] = useState<DashboardStats>({
    connectedPages: 0,
    totalConversations: 0,
    totalFlows: 0,
    activeSubscribers: 0
  });
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Check if user just verified email and show success toast
  useEffect(() => {
    const emailJustVerified = sessionStorage.getItem('emailJustVerified');
    if (emailJustVerified === 'true') {
      // Clear the flag immediately to prevent showing again on refresh
      sessionStorage.removeItem('emailJustVerified');
      // Show success toast
      toast.success('🎉 Email verified successfully! Welcome to MyChat Pilot.');
    }
  }, []);

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

      // Get total flow count
      const { count: flowCount } = await supabase
        .from('flows')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', workspace.id);

      // Update stats
      setStats({
        connectedPages: pages.length,
        totalConversations: conversations.length,
        totalFlows: flowCount || 0,
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
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="page-header mb-2">Dashboard</h1>
          <p className="page-description">
            Overview for <span className={`font-semibold ${isDark ? 'text-indigo-400' : 'text-blue-600'
              }`}>{workspace.name}</span>
          </p>
        </div>
        <div className={`px-4 py-2 rounded-xl border flex items-center gap-3 text-sm font-medium ${isDark
          ? 'glass-panel border-white/10 text-slate-300'
          : 'bg-white border-gray-300 text-gray-700'
          }`}>
          <div className={`p-1.5 rounded-lg ${isDark ? 'bg-indigo-500/20' : 'bg-blue-50'
            }`}>
            <CalendarDays className={`w-4 h-4 ${isDark ? 'text-indigo-400' : 'text-blue-600'
              }`} />
          </div>
          Last 7 Days
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <StatCard
          title="Connected Pages"
          value={stats.connectedPages}
          icon={Facebook}
          gradient="from-blue-500 to-indigo-600"
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
          title="Total Flows"
          value={stats.totalFlows}
          icon={Activity}
          gradient="from-emerald-400 to-teal-500"
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

      {/* Charts & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-white/10">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-bold text-white">Engagement Overview</h3>
              <p className="text-slate-400 text-sm mt-1">Message and conversation volume</p>
            </div>
            <button className="p-2 hover:bg-white/5 rounded-lg transition-colors text-slate-400 hover:text-white">
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </div>

          {loading ? (
            <div className="h-[350px] flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
            </div>
          ) : (
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barGap={8}>
                  <defs>
                    <linearGradient id="colorConv" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#818cf8" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorMsg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#c084fc" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#c084fc" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#334155"
                    opacity={0.5}
                  />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                  />
                  <Tooltip
                    cursor={{ fill: '#1e293b', opacity: 0.4 }}
                    contentStyle={{
                      backgroundColor: '#1e1b4b',
                      borderRadius: '12px',
                      border: '1px solid #4338ca',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
                      color: '#f8fafc',
                      padding: '12px'
                    }}
                    itemStyle={{ color: '#f8fafc' }}
                  />
                  <Bar
                    dataKey="conversations"
                    name="New Conversations"
                    fill="#818cf8"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                  />
                  <Bar
                    dataKey="messages"
                    name="Messages"
                    fill="#c084fc"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="glass-panel p-6 rounded-2xl border border-white/10 flex flex-col h-full">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-white">Recent Messages</h3>
            <a href="/messages" className="text-sm font-medium text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors">
              View All <ArrowRight className="w-4 h-4" />
            </a>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-start space-x-3 pb-3">
                  <div className="w-10 h-10 rounded-full bg-white/10 animate-pulse"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-white/10 rounded animate-pulse w-3/4"></div>
                    <div className="h-3 bg-white/10 rounded animate-pulse w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : recentActivity.length > 0 ? (
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-2">
              {recentActivity.map((msg: any) => {
                const subscriber = msg.conversations?.subscribers;
                const timeAgo = msg.created_at ?
                  Math.floor((Date.now() - new Date(msg.created_at).getTime()) / 60000) : 0;

                return (
                  <div key={msg.id} className="p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all group cursor-default">
                    <div className="flex items-start space-x-3">
                      {subscriber?.avatar_url ? (
                        <img
                          src={subscriber.avatar_url}
                          alt={subscriber.name}
                          className="w-10 h-10 rounded-full flex-shrink-0 object-cover border border-white/10"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex-shrink-0 flex items-center justify-center text-sm font-bold text-indigo-400">
                          {subscriber?.name?.charAt(0) || 'U'}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between mb-0.5">
                          <p className="text-sm font-semibold text-white truncate group-hover:text-indigo-300 transition-colors">
                            {subscriber?.name || 'Unknown'}
                          </p>
                          <span className="text-[10px] uppercase font-medium tracking-wider text-slate-500">
                            {timeAgo < 1 ? 'Just now' : timeAgo < 60 ? `${timeAgo}m` : `${Math.floor(timeAgo / 60)}h`}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 truncate line-clamp-1">
                          {msg.content || 'Attachment'}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 py-8">
              <div className="p-4 rounded-full bg-white/5 mb-3">
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