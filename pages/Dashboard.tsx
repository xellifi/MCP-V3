import React, { useEffect, useState } from 'react';
import { Workspace, User, UserRole } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { MessageCircle, Users, Activity, TrendingUp, Facebook, MoreHorizontal, ArrowRight, CalendarDays, Shield, Sparkles, CreditCard, Clock, ChevronDown, ChevronUp, Package } from 'lucide-react';
import { api } from '../services/api';
import { supabase } from '../lib/supabase';
import { format, subDays, startOfDay } from 'date-fns';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';

interface DashboardProps {
  workspace: Workspace;
  user: User;
}

interface AdminStats {
  totalUsers: number;
  newUsersToday: number;
  newUsersWeek: number;
  activeSubscriptions: number;
  pendingSubscriptions: number;
  usersByPlan: { name: string; count: number; color: string }[];
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

const Dashboard: React.FC<DashboardProps> = ({ workspace, user }) => {
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

  // Admin-only stats
  const isAdmin = user?.role === UserRole.ADMIN || user?.role === UserRole.OWNER;
  const [adminStats, setAdminStats] = useState<AdminStats>({
    totalUsers: 0,
    newUsersToday: 0,
    newUsersWeek: 0,
    activeSubscriptions: 0,
    pendingSubscriptions: 0,
    usersByPlan: []
  });
  const [adminStatsLoading, setAdminStatsLoading] = useState(true);
  const [showAdminPanel, setShowAdminPanel] = useState(true);

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
      // Fetch all data in parallel - optimized to reduce API calls
      const sevenDaysAgo = subDays(new Date(), 7).toISOString();

      const [pages, conversations, subscribers, flowCountResult, recentConversations, recentMessages, recentActivityData] = await Promise.all([
        api.workspace.getConnectedPages(workspace.id),
        api.workspace.getConversations(workspace.id),
        api.workspace.getSubscribers(workspace.id),
        supabase.from('flows').select('*', { count: 'exact', head: true }).eq('workspace_id', workspace.id),
        // Get all conversations from last 7 days in one query
        supabase.from('conversations')
          .select('created_at')
          .eq('workspace_id', workspace.id)
          .gte('created_at', sevenDaysAgo),
        // Get all messages from last 7 days in one query
        supabase.from('messages')
          .select('created_at, conversations!inner(workspace_id)')
          .eq('conversations.workspace_id', workspace.id)
          .gte('created_at', sevenDaysAgo),
        // Get recent messages for activity feed
        supabase.from('messages')
          .select('*, conversations!inner(*, subscribers!inner(*))')
          .eq('conversations.workspace_id', workspace.id)
          .eq('direction', 'INBOUND')
          .order('created_at', { ascending: false })
          .limit(5)
      ]);

      // Update stats
      setStats({
        connectedPages: pages.length,
        totalConversations: conversations.length,
        totalFlows: flowCountResult.count || 0,
        activeSubscribers: subscribers.filter(s => s.status === 'SUBSCRIBED').length
      });

      // Process chart data locally instead of 14 queries
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = subDays(new Date(), 6 - i);
        return {
          date: startOfDay(date),
          name: format(date, 'EEE'),
          conversations: 0,
          messages: 0
        };
      });

      // Count conversations per day
      (recentConversations.data || []).forEach((conv: any) => {
        const convDate = startOfDay(new Date(conv.created_at)).getTime();
        const dayIndex = last7Days.findIndex(d => d.date.getTime() === convDate);
        if (dayIndex >= 0) {
          last7Days[dayIndex].conversations++;
        }
      });

      // Count messages per day
      (recentMessages.data || []).forEach((msg: any) => {
        const msgDate = startOfDay(new Date(msg.created_at)).getTime();
        const dayIndex = last7Days.findIndex(d => d.date.getTime() === msgDate);
        if (dayIndex >= 0) {
          last7Days[dayIndex].messages++;
        }
      });

      setChartData(last7Days.map(d => ({ name: d.name, conversations: d.conversations, messages: d.messages })));
      setRecentActivity(recentActivityData.data || []);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load admin stats (only for admin users)
  const loadAdminStats = async () => {
    if (!isAdmin) return;

    setAdminStatsLoading(true);
    try {
      const today = startOfDay(new Date()).toISOString();
      const weekAgo = subDays(new Date(), 7).toISOString();

      // Fetch all admin data in parallel
      const [
        allUsersResult,
        newTodayResult,
        newWeekResult,
        activeSubsResult,
        pendingSubsResult,
        packagesResult,
        subsWithPackageResult
      ] = await Promise.all([
        // Total users
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        // New users today
        supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', today),
        // New users this week
        supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', weekAgo),
        // Active subscriptions
        supabase.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'ACTIVE'),
        // Pending subscriptions
        supabase.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'PENDING'),
        // All packages
        supabase.from('packages').select('id, name'),
        // Subscriptions grouped by package
        supabase.from('subscriptions').select('package_id').eq('status', 'ACTIVE')
      ]);

      // Calculate users by plan
      const packages = packagesResult.data || [];
      const subscriptions = subsWithPackageResult.data || [];

      const planColors = ['#818cf8', '#c084fc', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4'];
      const usersByPlan = packages.map((pkg: any, index: number) => ({
        name: pkg.name,
        count: subscriptions.filter((s: any) => s.package_id === pkg.id).length,
        color: planColors[index % planColors.length]
      })).filter((p: any) => p.count > 0);

      setAdminStats({
        totalUsers: allUsersResult.count || 0,
        newUsersToday: newTodayResult.count || 0,
        newUsersWeek: newWeekResult.count || 0,
        activeSubscriptions: activeSubsResult.count || 0,
        pendingSubscriptions: pendingSubsResult.count || 0,
        usersByPlan
      });
    } catch (error) {
      console.error('Error loading admin stats:', error);
    } finally {
      setAdminStatsLoading(false);
    }
  };

  // Load admin stats on mount if admin
  useEffect(() => {
    if (isAdmin) {
      loadAdminStats();
    }
  }, [isAdmin]);

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

      {/* Admin-Only: User Activity Monitor Panel */}
      {isAdmin && (
        <div className={`rounded-2xl border overflow-hidden transition-all ${isDark
          ? 'bg-gradient-to-r from-violet-900/30 via-purple-900/30 to-indigo-900/30 border-purple-500/20'
          : 'bg-gradient-to-r from-violet-50 via-purple-50 to-indigo-50 border-purple-200'
          }`}>
          {/* Header */}
          <button
            onClick={() => setShowAdminPanel(!showAdminPanel)}
            className={`w-full flex items-center justify-between p-4 md:p-5 transition-colors ${isDark
              ? 'hover:bg-white/5'
              : 'hover:bg-purple-100/50'
              }`}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${isDark
                ? 'bg-purple-500/20 border border-purple-500/30'
                : 'bg-purple-100 border border-purple-200'
                }`}>
                <Shield className={`w-5 h-5 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
              </div>
              <div className="text-left">
                <h3 className={`text-base font-bold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Admin: User Activity Monitor
                </h3>
                <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                  System-wide statistics (visible to admins only)
                </p>
              </div>
            </div>
            <div className={`p-1.5 rounded-lg transition-transform ${showAdminPanel ? 'rotate-180' : ''} ${isDark
              ? 'text-slate-400 hover:text-white'
              : 'text-gray-400 hover:text-gray-700'
              }`}>
              <ChevronDown className="w-5 h-5" />
            </div>
          </button>

          {/* Content */}
          {showAdminPanel && (
            <div className={`px-4 md:px-5 pb-5 border-t ${isDark ? 'border-purple-500/20' : 'border-purple-200'}`}>
              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mt-4">
                {/* Total Users */}
                <div className={`p-4 rounded-xl border ${isDark
                  ? 'bg-white/5 border-white/10'
                  : 'bg-white border-gray-200'
                  }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Users className={`w-4 h-4 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
                    <span className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Total Users</span>
                  </div>
                  {adminStatsLoading ? (
                    <div className={`h-7 w-16 animate-pulse rounded ${isDark ? 'bg-white/10' : 'bg-gray-200'}`} />
                  ) : (
                    <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {adminStats.totalUsers.toLocaleString()}
                    </p>
                  )}
                </div>

                {/* New Users Today */}
                <div className={`p-4 rounded-xl border ${isDark
                  ? 'bg-white/5 border-white/10'
                  : 'bg-white border-gray-200'
                  }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className={`w-4 h-4 ${isDark ? 'text-green-400' : 'text-green-600'}`} />
                    <span className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>New Today</span>
                  </div>
                  {adminStatsLoading ? (
                    <div className={`h-7 w-12 animate-pulse rounded ${isDark ? 'bg-white/10' : 'bg-gray-200'}`} />
                  ) : (
                    <p className={`text-2xl font-bold ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                      +{adminStats.newUsersToday}
                    </p>
                  )}
                </div>

                {/* Active Subscriptions */}
                <div className={`p-4 rounded-xl border ${isDark
                  ? 'bg-white/5 border-white/10'
                  : 'bg-white border-gray-200'
                  }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <CreditCard className={`w-4 h-4 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
                    <span className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Active Subs</span>
                  </div>
                  {adminStatsLoading ? (
                    <div className={`h-7 w-14 animate-pulse rounded ${isDark ? 'bg-white/10' : 'bg-gray-200'}`} />
                  ) : (
                    <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {adminStats.activeSubscriptions.toLocaleString()}
                    </p>
                  )}
                </div>

                {/* Pending Payments */}
                <div className={`p-4 rounded-xl border ${isDark
                  ? 'bg-white/5 border-white/10'
                  : 'bg-white border-gray-200'
                  }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className={`w-4 h-4 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
                    <span className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Pending</span>
                  </div>
                  {adminStatsLoading ? (
                    <div className={`h-7 w-10 animate-pulse rounded ${isDark ? 'bg-white/10' : 'bg-gray-200'}`} />
                  ) : (
                    <p className={`text-2xl font-bold ${adminStats.pendingSubscriptions > 0
                      ? (isDark ? 'text-amber-400' : 'text-amber-600')
                      : (isDark ? 'text-slate-500' : 'text-gray-400')
                      }`}>
                      {adminStats.pendingSubscriptions}
                    </p>
                  )}
                </div>
              </div>

              {/* Users by Plan */}
              {!adminStatsLoading && adminStats.usersByPlan.length > 0 && (
                <div className={`mt-4 p-4 rounded-xl border ${isDark
                  ? 'bg-white/5 border-white/10'
                  : 'bg-white border-gray-200'
                  }`}>
                  <div className="flex items-center gap-2 mb-3">
                    <Package className={`w-4 h-4 ${isDark ? 'text-slate-400' : 'text-gray-500'}`} />
                    <span className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                      Users by Plan
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${isDark
                      ? 'bg-purple-500/20 text-purple-400'
                      : 'bg-purple-100 text-purple-600'
                      }`}>
                      {adminStats.newUsersWeek} new this week
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {adminStats.usersByPlan.map((plan) => (
                      <div
                        key={plan.name}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
                        style={{ backgroundColor: `${plan.color}20` }}
                      >
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: plan.color }}
                        />
                        <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {plan.name}
                        </span>
                        <span
                          className="text-sm font-bold"
                          style={{ color: plan.color }}
                        >
                          {plan.count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

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