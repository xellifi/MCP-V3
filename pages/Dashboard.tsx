import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Workspace, User, UserRole } from '../types';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import {
  TrendingUp, TrendingDown, ShoppingCart, Package, Users, RefreshCw,
  Wallet, CreditCard, Building2, ChevronRight, ChevronDown, ChevronLeft,
  Mail, MousePointer, UserPlus, AlertCircle, UserMinus, Check, User as UserIcon,
  Facebook, Instagram, Globe, ArrowUpRight, Home,
  Ticket, Tag, CheckCircle, UserCheck, DollarSign, BarChart3, Activity, Zap, EyeOff,
  ArrowLeft, ArrowRight, FileText, Monitor, Settings, Banknote, ShoppingBag, Filter, Clock, X,
  ThumbsUp, MessageSquare, Share2, Smile, Camera, Image, SmilePlus, Smartphone, MessageCircle, Workflow
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useCurrency } from '../context/CurrencyContext';
import { useSubscription } from '../context/SubscriptionContext';
import { useDashboardStats } from '../hooks/useDashboardStats';

interface DashboardProps {
  workspace: Workspace;
  user: User;
}

// Mock data matching WowDash design
const earningData = [
  { month: 'Jan', income: 20000, loss: 15000 },
  { month: 'Feb', income: 25000, loss: 12000 },
  { month: 'Mar', income: 30000, loss: 18000 },
  { month: 'Apr', income: 22000, loss: 14000 },
  { month: 'May', income: 28000, loss: 10000 },
  { month: 'Jun', income: 35000, loss: 16000 },
  { month: 'Jul', income: 40000, loss: 20000 },
  { month: 'Aug', income: 55000, loss: 22000 },
  { month: 'Sep', income: 45000, loss: 18000 },
  { month: 'Oct', income: 38000, loss: 15000 },
  { month: 'Nov', income: 42000, loss: 17000 },
  { month: 'Dec', income: 50000, loss: 19000 },
];

const supportTrackerData = [
  { name: 'New Tickets', value: 172, color: '#487fff' },
  { name: 'Open Tickets', value: 172, color: '#f59e0b' },
  { name: 'Response Time', value: 172, color: '#9b59b6' },
];

const dailySalesData = [
  { hour: '2hr', sales: 8000 },
  { hour: '4hr', sales: 12000 },
  { hour: '6hr', sales: 18000 },
  { hour: '8hr', sales: 22000 },
  { hour: '10hr', sales: 15000 },
  { hour: '12hr', sales: 25000 },
  { hour: '14hr', sales: 20000 },
];



const countriesData = [
  { country: 'USA', flag: 'https://flagcdn.com/w80/us.png', users: 1240, percentage: 80, color: '#487fff' },
  { country: 'Bangladesh', flag: 'https://flagcdn.com/w80/bd.png', users: 1240, percentage: 60, color: '#f97316' },
  { country: 'France', flag: 'https://flagcdn.com/w80/sa.png', users: 1240, percentage: 49, color: '#facc15' },
  { country: 'Germany', flag: 'https://flagcdn.com/w80/de.png', users: 1240, percentage: 100, color: '#22c55e' },
];


const sourceVisitors = [
  { name: 'TikTok', percentage: 50, color: '#000000', icon: '🎵' },
  { name: 'Instagram', percentage: 66, color: '#e1306c', icon: '📸' },
  { name: 'Facebook', percentage: 82, color: '#1877f2', icon: Facebook },
  { name: 'Website', percentage: 96, color: '#22c55e', icon: Globe },
];

const campaignData = [
  { name: 'Email', count: 6200, percentage: 0.3, color: '#487fff', icon: Mail },
  { name: 'Clicked', count: null, percentage: 1.3, color: '#f97316', icon: MousePointer },
  { name: 'Subscribe', count: 5175, percentage: 0.3, color: '#3b82f6', icon: UserPlus },
  { name: 'Complaints', count: 3780, percentage: 0.3, color: '#22c55e', icon: AlertCircle },
  { name: 'Unsubscribe', count: 4120, percentage: 0.3, color: '#ef4444', icon: UserMinus },
  { name: 'Subscribe', count: 5175, percentage: 0.3, color: '#487fff', icon: Check },
];




const newCampaignsData = [
  { name: 'Email', percentage: 80, icon: Mail, color: '#f97316' },
  { name: 'Website', percentage: 80, icon: Globe, color: '#22c55e' },
  { name: 'Facebook', percentage: 80, icon: Facebook, color: '#3b82f6' },
  { name: 'Offline', percentage: 80, icon: EyeOff, color: '#a855f7' },
];

const scheduledPostsData = [
  {
    id: 1,
    name: 'Paris',
    duration: '5 Days, 6 Nights',
    price: '$12,000',
    users: '(280)',
    image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 2,
    name: 'Maldives',
    duration: '4 Days, 5 Nights',
    price: '$8,500',
    users: '(150)',
    image: 'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 3,
    name: 'Bali',
    duration: '6 Days, 7 Nights',
    price: '$7,200',
    users: '(320)',
    image: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 4,
    name: 'New York',
    duration: '5 Days, 6 Nights',
    price: '$11,400',
    users: '(410)',
    image: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&w=400&q=80'
  },
];

const earningCategoriesData = [
  { name: 'Email', percentage: 0, amount: '0', total: '0', icon: Mail, color: '#3b82f6' },
  { name: 'SMS', percentage: 0, amount: '0', total: '0', icon: Smartphone, color: '#f97316' },
  { name: 'Messenger', percentage: 0, amount: '0', total: '0', icon: MessageCircle, color: '#22c55e' },
];





const recentPurchaseData = [
  {
    user: 'Tokyo Tower',
    amount: '$49.00',
    startDate: '10 min ago',
    endDate: 'Feb 15, 2025',
    duration: '2 Months',
    status: 'Completed',
    avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026704d'
  },
  {
    user: 'Santorini Resort',
    amount: '$65.00',
    startDate: '1 hour ago',
    endDate: 'Mar 10, 2025',
    duration: '3 Months',
    status: 'Pending',
    avatar: 'https://i.pravatar.cc/150?u=a042581f4e290267041'
  },
  {
    user: 'Bali Beach Villa',
    amount: '$99.00',
    startDate: '2 hours ago',
    endDate: 'Apr 1, 2025',
    duration: '6 Months',
    status: 'Completed',
    avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026704c'
  },
  {
    user: 'Swiss Alps Hotel',
    amount: '$120.00',
    startDate: '1 day ago',
    endDate: 'May 20, 2025',
    duration: '1 Year',
    status: 'Cancelled',
    avatar: 'https://i.pravatar.cc/150?u=a042581f4e290267032'
  },
  {
    user: 'Maldives Retreat',
    amount: '$89.00',
    startDate: '3 days ago',
    endDate: 'Jun 5, 2025',
    duration: '4 Months',
    status: 'In Progress',
    avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026704e'
  },
  {
    user: 'Bali Beach Villa',
    amount: '$99.00',
    startDate: '2 hours ago',
    endDate: 'Apr 1, 2025',
    duration: '6 Months',
    status: 'Completed',
    avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026704c'
  },
];

const ticketStatusData = [
  { name: 'Pending', value: 32, color: '#facc15' },
  { name: 'Hold', value: 10, color: '#a855f7' },
  { name: 'Complete', value: 25, color: '#22c55e' },
  { name: 'Cancelled', value: 28, color: '#ef4444' },
];

const ticketComparisonData = [
  { month: 'Jan', pending: 48, solved: 12 },
  { month: 'Feb', pending: 42, solved: 18 },
  { month: 'Mar', pending: 55, solved: 25 },
  { month: 'Apr', pending: 38, solved: 20 },
  { month: 'May', pending: 45, solved: 22 },
  { month: 'Jun', pending: 32, solved: 45 },
  { month: 'Jul', pending: 58, solved: 40 },
  { month: 'Aug', pending: 35, solved: 60 },
  { month: 'Sep', pending: 52, solved: 45 },
  { month: 'Oct', pending: 40, solved: 48 },
  { month: 'Nov', pending: 55, solved: 30 },
  { month: 'Dec', pending: 42, solved: 25 },
];

const Dashboard: React.FC<DashboardProps> = ({ workspace, user }) => {
  const { isDark } = useTheme();
  const { selectedCurrency } = useCurrency();
  const navigate = useNavigate();
  const { currentSubscription } = useSubscription();
  const { totalSales, totalOrders, subscriberCount, connectedPagesCount, earningData: realEarningData, recentTransactions, recentOrders, topPages, topCustomers, scheduledPosts, loading: statsLoading, adminStats } = useDashboardStats(workspace);
  const [showOrdersDropdown, setShowOrdersDropdown] = useState(false);
  const [automationFilter, setAutomationFilter] = useState<'all' | 'enabled'>('enabled');
  const [pagesCurrentPage, setPagesCurrentPage] = useState(1);
  const [selectedScheduledPost, setSelectedScheduledPost] = useState<any>(null);
  const [showComingSoon, setShowComingSoon] = useState(false);
  const pagesPerPage = 5;

  const statsCards = [
    { name: 'All Users', value: adminStats?.allUsers.value || '0', trend: adminStats?.allUsers.trend || '+0', trendNegative: adminStats?.allUsers.trendNegative, icon: Users, color: '#487fff', chartData: adminStats?.allUsers.chartData || [0, 0, 0, 0, 0, 0, 0] },
    { name: 'Verified Users', value: adminStats?.verifiedUsers.value || '0', trend: adminStats?.verifiedUsers.trend || '+0', trendNegative: adminStats?.verifiedUsers.trendNegative, icon: UserCheck, color: '#22c55e', chartData: adminStats?.verifiedUsers.chartData || [0, 0, 0, 0, 0, 0, 0] },
    { name: 'Unverified Users', value: adminStats?.unverifiedUsers.value || '0', trend: adminStats?.unverifiedUsers.trend || '+0', trendNegative: adminStats?.unverifiedUsers.trendNegative, icon: UserMinus, color: '#ef4444', chartData: adminStats?.unverifiedUsers.chartData || [0, 0, 0, 0, 0, 0, 0] },
    { name: 'Total Pages', value: adminStats?.totalPages.value || '0', trend: adminStats?.totalPages.trend || '+0', trendNegative: adminStats?.totalPages.trendNegative, icon: Facebook, color: '#3b82f6', chartData: adminStats?.totalPages.chartData || [0, 0, 0, 0, 0, 0, 0] },
    { name: 'Total Flows', value: adminStats?.totalFlows.value || '0', trend: adminStats?.totalFlows.trend || '+0', trendNegative: adminStats?.totalFlows.trendNegative, icon: Workflow, color: '#ec4899', chartData: adminStats?.totalFlows.chartData || [0, 0, 0, 0, 0, 0, 0] },
    { name: 'Total Stores', value: adminStats?.totalStores.value || '0', trend: adminStats?.totalStores.trend || '+0', trendNegative: adminStats?.totalStores.trendNegative, icon: ShoppingBag, color: '#f59e0b', chartData: adminStats?.totalStores.chartData || [0, 0, 0, 0, 0, 0, 0] },
  ];

  // Calculate trial days if applicable
  const getTrialStatus = () => {
    if (!currentSubscription) return "Your free trial expired in 7 days";

    if (currentSubscription.status === 'Active') {
      return `Current Plan: ${currentSubscription.packages?.name || 'Pro'}`;
    }

    if (currentSubscription.status === 'Pending') {
      return "Upgrade Pending Review";
    }

    const createdAt = new Date(currentSubscription.created_at);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - createdAt.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const remainingDays = Math.max(0, 14 - diffDays);

    if (remainingDays === 0) return "Your free trial has expired";
    return `Your free trial expires in ${remainingDays} days`;
  };

  // Logic for Top Pages filtering and pagination
  const filteredPages = automationFilter === 'all'
    ? topPages
    : topPages.filter(p => p.isAutomationEnabled);

  const totalPagesCount = Math.ceil(filteredPages.length / pagesPerPage);
  const paginatedPages = filteredPages.slice((pagesCurrentPage - 1) * pagesPerPage, pagesCurrentPage * pagesPerPage);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPagesCount) {
      setPagesCurrentPage(newPage);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header Section from Reference Image */}
      <div className="mb-8">
        <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white mb-1">Dashboard</h1>
        <p className={`text-base font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          Overview for <span className="text-blue-500 dark:text-indigo-400 font-bold">{user.role}</span>
        </p>
      </div>

      {/* Top Section: Upgrade Card + Stats + Earning Chart - Hide from Admin/Owner */}
      {user.role !== UserRole.ADMIN && user.role !== UserRole.OWNER && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* Left Column: Upgrade + Stats in Container */}
          <div className={`lg:col-span-6 rounded-[15px] p-5 border ${isDark ? 'bg-[#1b253b]/60 border-[#2d3a56]' : 'bg-white border-slate-200 shadow-sm'}`}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 h-full min-h-[290px]">
              {/* Column 1: Upgrade Your Plan Card */}
              <div className="relative overflow-hidden rounded-[15px] text-white flex flex-col justify-between items-center text-center p-6 shadow-xl h-full"
                style={{
                  background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #ec4899 100%)'
                }}>
                {/* Background Wave Shapes */}
                <div className="absolute top-[-20%] right-[-10%] w-32 h-32 rounded-full bg-blue-400/20 blur-2xl animate-pulse"></div>
                <div className="absolute bottom-[-10%] left-[-20%] w-40 h-40 rounded-full bg-pink-400/20 blur-3xl"></div>
                <div className="absolute top-[20%] left-[10%] w-24 h-24 rounded-full bg-indigo-300/10 blur-xl"></div>

                <div className="relative z-10 w-full mt-4">
                  <h3 className="font-bold text-2xl leading-tight">Upgrade Your Plan</h3>
                </div>

                <div className="relative z-10 w-full flex flex-col items-center gap-6 mb-2">
                  <p className="text-white/80 text-sm max-w-[140px]">{getTrialStatus()}</p>
                  <button
                    onClick={() => navigate('/packages')}
                    className="w-full font-bold text-xs px-5 py-3.5 rounded-[12px] transition-all shadow-lg bg-[#ccffcc] hover:bg-[#b3ffb3] text-indigo-950 hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98]"
                  >
                    Upgrade Now
                  </button>
                </div>
              </div>

              {/* Column 2 Stats */}
              <div className="flex flex-col gap-5 h-full">
                {/* Total Sales */}
                <div className={`flex-1 rounded-[15px] p-4 flex flex-col items-center justify-start pt-5 text-center border transition-all ${isDark ? 'bg-[#25213b] border-purple-500/10' : 'bg-purple-50 border-purple-100'}`}>
                  <div className="w-12 h-12 rounded-[12px] flex items-center justify-center mb-3 bg-purple-500/20">
                    <ShoppingCart className="w-6 h-6 text-purple-500" />
                  </div>
                  <p className={`text-sm font-medium mb-1 ${isDark ? 'text-slate-400' : 'text-purple-600'}`}>Total Sales</p>
                  <p className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {selectedCurrency} {totalSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>

                {/* Subscribers */}
                <div className={`flex-1 rounded-[15px] p-4 flex flex-col items-center justify-start pt-5 text-center border transition-all ${isDark ? 'bg-[#1b2a32] border-cyan-500/10' : 'bg-cyan-50 border-cyan-100'}`}>
                  <div className="w-12 h-12 rounded-[12px] flex items-center justify-center mb-3 bg-cyan-500/20">
                    <Users className="w-6 h-6 text-cyan-500" />
                  </div>
                  <p className={`text-sm font-medium mb-1 ${isDark ? 'text-slate-400' : 'text-cyan-600'}`}>Subscribers</p>
                  <p className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{subscriberCount.toLocaleString()}</p>
                </div>
              </div>

              {/* Column 3 Stats */}
              <div className="flex flex-col gap-5 h-full">
                {/* Total Orders */}
                <div className={`flex-1 rounded-[15px] p-4 flex flex-col items-center justify-start pt-5 text-center border transition-all ${isDark ? 'bg-[#1c2b2a] border-emerald-500/10' : 'bg-emerald-50 border-emerald-100'}`}>
                  <div className="w-12 h-12 rounded-[12px] flex items-center justify-center mb-3 bg-emerald-500/20">
                    <Package className="w-6 h-6 text-emerald-500" />
                  </div>
                  <p className={`text-sm font-medium mb-1 ${isDark ? 'text-slate-400' : 'text-emerald-600'}`}>Total Orders</p>
                  <p className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{totalOrders.toLocaleString()}</p>
                </div>

                {/* Connected Pages */}
                <div className={`flex-1 rounded-[15px] p-4 flex flex-col items-center justify-start pt-5 text-center border transition-all ${isDark ? 'bg-[#1b253b] border-blue-500/10' : 'bg-blue-50 border-blue-100 shadow-sm'}`}>
                  <div className="w-12 h-12 rounded-[12px] flex items-center justify-center mb-3 bg-blue-500/20">
                    <Facebook className="w-6 h-6 text-blue-500" />
                  </div>
                  <p className={`text-sm font-medium mb-1 ${isDark ? 'text-slate-400' : 'text-blue-600'}`}>Connected Pages</p>
                  <p className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{connectedPagesCount.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Earning Statistic */}
          <div className={`lg:col-span-6 rounded-[15px] p-6 border flex flex-col h-full ${isDark ? 'bg-[#1b253b]/60 border-[#2d3a56]' : 'bg-white border-slate-100 shadow-sm'}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Earning Statistic</h3>
              <div className="relative">
                <button
                  onClick={() => setShowOrdersDropdown(!showOrdersDropdown)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-[12px] text-xs font-medium border transition-colors ${isDark ? 'bg-[#243049] text-slate-300 border-[#2d3a56] hover:bg-[#2d3a56]' : 'bg-white text-slate-600 border-slate-200 shadow-sm hover:bg-slate-50'}`}
                >
                  View Orders
                  <ChevronDown className={`w-3 h-3 transition-transform ${showOrdersDropdown ? 'rotate-180' : ''}`} />
                </button>

                {showOrdersDropdown && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowOrdersDropdown(false)}
                    ></div>
                    <div className={`absolute right-0 mt-2 w-48 rounded-[12px] shadow-xl z-50 py-2 border animate-in fade-in slide-in-from-top-2 duration-200 ${isDark ? 'bg-[#1b253b] border-[#2d3a56]' : 'bg-white border-slate-100'}`}>
                      <button
                        onClick={() => {
                          navigate('/orders');
                          setShowOrdersDropdown(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-xs font-medium transition-colors flex items-center gap-2 ${isDark ? 'text-slate-300 hover:bg-[#243049] hover:text-white' : 'text-slate-600 hover:bg-slate-50 hover:text-blue-600'}`}
                      >
                        <ShoppingCart className="w-4 h-4" />
                        Manage Checkout
                      </button>
                      <button
                        onClick={() => {
                          navigate('/forms-manager');
                          setShowOrdersDropdown(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-xs font-medium transition-colors flex items-center gap-2 ${isDark ? 'text-slate-300 hover:bg-[#243049] hover:text-white' : 'text-slate-600 hover:bg-slate-50 hover:text-purple-600'}`}
                      >
                        <FileText className="w-4 h-4" />
                        Manage Leads
                      </button>
                      <button
                        onClick={() => {
                          navigate('/store?tab=orders');
                          setShowOrdersDropdown(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-xs font-medium transition-colors flex items-center gap-2 ${isDark ? 'text-slate-300 hover:bg-[#243049] hover:text-white' : 'text-slate-600 hover:bg-slate-50 hover:text-emerald-600'}`}
                      >
                        <Package className="w-4 h-4" />
                        Manage Store
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-4 sm:gap-8 mb-6 mt-4">
              <div className="flex items-center gap-2 whitespace-nowrap">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.5)]"></span>
                <span className={`text-xs sm:text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Checkout</span>
                <span className={`text-lg sm:text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {selectedCurrency} {realEarningData.reduce((acc, curr) => acc + curr.checkout, 0).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center gap-2 whitespace-nowrap">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shadow-[0_0_6px_rgba(168,85,247,0.5)]"></span>
                <span className={`text-xs sm:text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Leads</span>
                <span className={`text-lg sm:text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {selectedCurrency} {realEarningData.reduce((acc, curr) => acc + curr.leads, 0).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center gap-2 whitespace-nowrap">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(34,197,94,0.5)]"></span>
                <span className={`text-xs sm:text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Store</span>
                <span className={`text-lg sm:text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {selectedCurrency} {realEarningData.reduce((acc, curr) => acc + curr.web, 0).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={realEarningData.length > 0 ? realEarningData : earningData}>
                  <defs>
                    <linearGradient id="checkoutGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="leadsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="webGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e5e7eb'} vertical={false} />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: isDark ? '#94a3b8' : '#6b7280', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: isDark ? '#94a3b8' : '#6b7280', fontSize: 12 }} tickFormatter={(v) => `$${v / 1000}k`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDark ? '#1e293b' : '#fff',
                      border: isDark ? '1px solid #334155' : '1px solid #e5e7eb',
                      borderRadius: '8px'
                    }}
                    formatter={(value: any) => [`$${value.toLocaleString()}`, '']}
                  />
                  <Area type="monotone" dataKey="checkout" stroke="#3b82f6" strokeWidth={3} fill="url(#checkoutGradient)" />
                  <Area type="monotone" dataKey="leads" stroke="#a855f7" strokeWidth={3} fill="url(#leadsGradient)" />
                  <Area type="monotone" dataKey="web" stroke="#22c55e" strokeWidth={3} fill="url(#webGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Stats Section: Sparkline Cards + Campaigns - Admin/Owner Only */}
      {(user.role === UserRole.ADMIN || user.role === UserRole.OWNER) && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Side: 3x2 Grid of Stat Cards */}
          <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {statsCards.map((stat, idx) => (
              <div key={idx} className={`rounded-[15px] p-5 border flex flex-col transition-all duration-300 hover:shadow-lg ${isDark ? 'bg-[#1b253b]/40 border-[#2d3a56]' : 'bg-white border-slate-100 shadow-sm'}`}
                style={{
                  background: !isDark ? `linear-gradient(135deg, white 0%, ${stat.color}08 100%)` : undefined,
                  borderLeft: `3px solid ${stat.color}`
                }}
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center p-2" style={{ backgroundColor: stat.color }}>
                    <stat.icon className="w-5 h-5 text-white" />
                  </div>
                  <h4 className={`text-[13px] font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{stat.name}</h4>
                </div>

                <div className="flex items-center justify-between mb-6">
                  <p className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{stat.value}</p>
                  <div className="h-12 w-24 opacity-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={stat.chartData.map((v) => ({ v }))}>
                        <defs>
                          <linearGradient id={`grad-${idx}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={stat.color} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={stat.color} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <Area type="monotone" dataKey="v" stroke={stat.color} strokeWidth={2.5} fill={`url(#grad-${idx})`} dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 mt-auto text-[11px] font-bold">
                  <span className={`${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Increase by</span>
                  <span className={`px-2 py-0.5 rounded-[4px] ${stat.trendNegative ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                    {stat.trend}
                  </span>
                  <span className={`${isDark ? 'text-slate-500' : 'text-slate-400'}`}>this week</span>
                </div>
              </div>
            ))}
          </div>

          {/* Right Side: Source Visitors Card */}
          <div className={`lg:col-span-4 rounded-[15px] p-6 border flex flex-col h-full ${isDark ? 'bg-[#1b253b]/60 border-[#2d3a56]' : 'bg-white border-slate-100 shadow-sm'}`}>
            <div className="flex items-center justify-between mb-6">
              <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Source Visitors</h3>
              <button className={`flex items-center gap-2 px-3 py-1.5 rounded-[12px] text-xs font-medium border transition-colors ${isDark ? 'bg-[#243049] text-slate-300 border-[#2d3a56] hover:bg-[#2d3a56]' : 'bg-white text-slate-600 border-slate-200 shadow-sm hover:bg-slate-50'}`}>
                Last Month
                <ChevronDown className="w-3 h-3" />
              </button>
            </div>

            <div className="mb-8">
              <p className={`text-4xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{subscriberCount.toLocaleString()}</p>
              <p className={`text-base ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Total Subscribers</p>
            </div>

            <div className="flex flex-col lg:flex-row lg:items-end gap-3 flex-1 lg:min-h-[200px] pb-2">
              {(adminStats?.sources || sourceVisitors || []).map((source, idx) => {
                const heights = ['lg:h-[50%]', 'lg:h-[66%]', 'lg:h-[82%]', 'lg:h-[96%]'];
                const bgColors = [
                  isDark ? 'bg-[#ffb300]/15' : 'bg-[#fffbeb]',
                  isDark ? 'bg-[#8a3bf6]/15' : 'bg-[#f5f3ff]',
                  isDark ? 'bg-[#1877f2]/15' : 'bg-[#eff6ff]',
                  isDark ? 'bg-[#00c853]/15' : 'bg-[#f0fdf4]'
                ];
                const iconBgs = ['bg-[#ffb300]', 'bg-[#8b5cf6]', 'bg-[#1877f2]', 'bg-[#00c853]'];

                const renderIcon = () => {
                  switch (source.name) {
                    case 'TikTok': return (
                      <svg className="w-6 h-6 fill-white" viewBox="0 0 24 24">
                        <path d="M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.06-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.9-.32-1.98-.23-2.81.23-.76.42-1.4 1.07-1.63 1.88-.3.97-.24 2.11.35 2.97.41.64 1.08 1.13 1.84 1.28.85.12 1.83-.07 2.47-.65.57-.54.81-1.32.81-2.1.02-5.93-.01-11.85.02-17.78z" />
                      </svg>
                    );
                    case 'Instagram': return <Instagram className="w-6 h-6 text-white" />;
                    case 'Facebook': return <Facebook className="w-6 h-6 text-white fill-white" />;
                    case 'Website': return <Globe className="w-6 h-6 text-white" />;
                    default: return <Globe className="w-6 h-6 text-white" />;
                  }
                };

                return (
                  <div
                    key={idx}
                    className={`flex-1 rounded-[15px] p-4 flex flex-col items-center justify-between transition-all duration-500 hover:translate-y-[-4px] hover:shadow-lg ${heights[idx]} ${bgColors[idx]}`}
                  >
                    <div className="flex-1 flex items-center justify-center w-full">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-md ${iconBgs[idx]}`}>
                        {renderIcon()}
                      </div>
                    </div>
                    <div className="text-center pb-1">
                      <p className={`text-[10px] font-bold mb-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{source.name}</p>
                      <p className={`text-sm font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{source.percentage}%</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Ticket Analytics Section - Admin Only */}
      {(user.role === UserRole.ADMIN || user.role === UserRole.OWNER) && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
          {/* Ticket Status Card */}
          <div className={`lg:col-span-4 rounded-[15px] p-6 border flex flex-col ${isDark ? 'bg-[#1b253b]/60 border-[#2d3a56]' : 'bg-white border-slate-100 shadow-sm'}`}>
            <div className="flex items-center justify-between mb-6">
              <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Ticket Status</h3>
              <div className="flex items-center gap-2">
                <button className={`flex items-center gap-2 px-3 py-1.5 rounded-[8px] text-xs font-medium border transition-colors ${isDark ? 'bg-[#243049] text-slate-300 border-[#2d3a56]' : 'bg-white text-slate-600 border-slate-200'}`}>
                  Yearly <ChevronDown className="w-3 h-3" />
                </button>
              </div>
            </div>

            <div className="h-[220px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={ticketStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {ticketStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-2 gap-y-4 mt-6 border-t pt-6 border-slate-100 dark:border-slate-700/50 text-center">
              {ticketStatusData.map((item, idx) => (
                <div key={idx} className="flex flex-col items-center">
                  <span className={`text-xs font-semibold ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{item.name}:</span>
                  <span className="text-lg font-black" style={{ color: item.color }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Pending Vs Solved Tickets Card */}
          <div className={`lg:col-span-8 rounded-[15px] p-6 border flex flex-col ${isDark ? 'bg-[#1b253b]/60 border-[#2d3a56]' : 'bg-white border-slate-100 shadow-sm'}`}>
            <div className="flex items-center justify-between mb-8">
              <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Pending Vs Solved Tickets</h3>
              <button className={`flex items-center gap-2 px-3 py-1.5 rounded-[8px] text-xs font-medium border transition-colors ${isDark ? 'bg-[#243049] text-slate-300 border-[#2d3a56]' : 'bg-white text-slate-600 border-slate-200'}`}>
                Yearly <ChevronDown className="w-3 h-3" />
              </button>
            </div>

            <div className="flex items-center justify-center gap-8 mb-6">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#facc15]"></span>
                <span className={`text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Pending <span className={`ml-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>205</span></span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#22c55e]"></span>
                <span className={`text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Solved <span className={`ml-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>700</span></span>
              </div>
            </div>

            <div className="flex-1 min-h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={ticketComparisonData}>
                  <defs>
                    <linearGradient id="pendingGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#facc15" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#facc15" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="solvedGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#2d3a56' : '#f1f5f9'} />
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: isDark ? '#64748b' : '#94a3b8', fontSize: 12 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: isDark ? '#64748b' : '#94a3b8', fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="pending"
                    stroke="#facc15"
                    strokeWidth={3}
                    fill="url(#pendingGrad)"
                  />
                  <Area
                    type="monotone"
                    dataKey="solved"
                    stroke="#22c55e"
                    strokeWidth={3}
                    fill="url(#solvedGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Exclusive Travel & Distribution Maps Section - Hide Scheduled Post from Admin */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Scheduled Post */}
        {user.role !== UserRole.ADMIN && user.role !== UserRole.OWNER && (
          <div className={`lg:col-span-8 rounded-[15px] p-6 border ${isDark ? 'bg-[#1b253b]/60 border-[#2d3a56]' : 'bg-white border-slate-100 shadow-sm'}`}>
            <div className="flex items-center justify-between mb-6">
              <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Scheduled Post</h2>
              <div className="flex items-center gap-3">
                <button className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all ${isDark ? 'bg-[#1b253b] border-slate-700 text-slate-400 hover:text-white hover:border-slate-500' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm'}`}>
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <button className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all ${isDark ? 'bg-[#1b253b] border-slate-700 text-slate-400 hover:text-white hover:border-slate-500' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm'}`}>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {scheduledPosts.length > 0 ? scheduledPosts.map((post) => (
                <div
                  key={post.id}
                  onClick={() => setSelectedScheduledPost(post)}
                  className={`rounded-[15px] p-3 flex flex-col transition-all duration-500 hover:translate-y-[-8px] hover:shadow-2xl cursor-pointer ${isDark ? 'bg-[#1b253b]/80 border border-slate-700/50' : 'bg-white border border-slate-100 shadow-xl'}`}
                >
                  <div className="relative h-40 w-full rounded-[20px] overflow-hidden mb-4">
                    <img src={post.image} alt={post.name} className="w-full h-full object-cover transition-transform duration-700 hover:scale-110" />
                    <div className="absolute top-3 left-3 flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-white shadow-lg bg-blue-600 flex-shrink-0">
                        {post.pageAvatar ? (
                          <img src={post.pageAvatar} alt={post.pageName} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white font-bold text-[10px]">
                            {post.pageName.charAt(0)}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="absolute top-3 right-3">
                      <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${post.status === 'active' ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/20' :
                        post.status === 'paused' ? 'bg-amber-500/20 text-amber-500 border border-amber-500/20' :
                          'bg-slate-500/20 text-slate-400 border border-slate-500/20'
                        } backdrop-blur-md`}>
                        {post.status}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-0.5 mb-4 px-1 text-center">
                    <h3 className={`text-base font-bold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{post.name}</h3>
                  </div>

                  <div className="mt-auto flex items-center justify-center py-3 border-t border-slate-50 dark:border-slate-700/50">
                    <div className="flex items-center gap-2 text-blue-500">
                      <Clock className="w-4 h-4" />
                      <span className="text-sm font-black whitespace-nowrap">
                        {post.scheduledAt ? new Date(post.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Not set'}
                      </span>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="col-span-full py-12 text-center">
                  <p className={`text-sm ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>No scheduled posts found</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Right Side: Earning Categories Card - Member Only */}
        {user.role === UserRole.MEMBER && (
          <div className="lg:col-span-4 self-end h-full">
            <div className={`rounded-[15px] p-6 border flex flex-col h-full ${isDark ? 'bg-[#1b253b]/60 border-[#2d3a56]' : 'bg-white border-slate-100 shadow-sm'}`}>
              <div className="flex items-center justify-between mb-8">
                <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Broadcasting</h3>
              </div>

              <div className="space-y-7">
                {earningCategoriesData.map((category, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center gap-4 cursor-pointer p-2 rounded-xl transition-all hover:translate-x-1 ${isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}`}
                    onClick={() => setShowComingSoon(true)}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 border ${isDark ? 'bg-[#1b253b] border-slate-700/50 shadow-inner' : 'bg-slate-50 border-slate-100 shadow-sm'}`} style={{ backgroundColor: `${category.color}15` }}>
                      <category.icon className="w-5 h-5" style={{ color: category.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-bold truncate ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{category.name}</p>
                      <p className={`text-[11px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{category.amount} / from {category.total}</p>
                    </div>
                    <div className="flex items-center gap-3 w-32 sm:w-36">
                      <div className={`h-2.5 flex-1 rounded-full overflow-hidden ${isDark ? 'bg-slate-700/30' : 'bg-slate-100'}`}>
                        <div
                          className="h-full rounded-full transition-all duration-1000"
                          style={{ width: `${category.percentage}%`, backgroundColor: category.color }}
                        />
                      </div>
                      <span className={`text-sm font-bold min-w-[32px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{category.percentage}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating Settings Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <button className="w-14 h-14 rounded-full bg-blue-600 shadow-lg shadow-blue-500/40 flex items-center justify-center text-white transition-transform hover:scale-110 active:scale-95">
          <Settings className="w-7 h-7 animate-spin-slow" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Top Pages */}
        <div className={`lg:col-span-8 rounded-[15px] border overflow-hidden ${isDark ? 'bg-[#1b253b]/60 border-[#2d3a56]' : 'bg-white border-slate-100 shadow-sm'}`}>
          <div className="p-6 flex items-center justify-between border-b border-slate-100 dark:border-slate-700/50">
            <div className="flex items-center gap-4">
              <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Top Pages</h2>
              <div className="relative">
                <select
                  value={automationFilter}
                  onChange={(e) => {
                    setAutomationFilter(e.target.value as 'all' | 'enabled');
                    setPagesCurrentPage(1);
                  }}
                  className={`pl-3 pr-8 py-1.5 rounded-lg text-xs font-bold appearance-none border transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20
                    ${isDark
                      ? 'bg-[#1b253b] border-slate-700 text-slate-300 hover:border-slate-600'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 shadow-sm'}`}
                >
                  <option value="all">All Pages</option>
                  <option value="enabled">Automation Enabled</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handlePageChange(pagesCurrentPage - 1)}
                  disabled={pagesCurrentPage === 1}
                  className={`p-1.5 rounded-lg border transition-all disabled:opacity-30 disabled:cursor-not-allowed
                    ${isDark ? 'border-slate-700 hover:bg-slate-800 text-slate-400' : 'border-slate-100 hover:bg-slate-50 text-slate-500'}`}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className={`text-xs font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {pagesCurrentPage} / {totalPagesCount || 1}
                </span>
                <button
                  onClick={() => handlePageChange(pagesCurrentPage + 1)}
                  disabled={pagesCurrentPage === totalPagesCount || totalPagesCount === 0}
                  className={`p-1.5 rounded-lg border transition-all disabled:opacity-30 disabled:cursor-not-allowed
                    ${isDark ? 'border-slate-700 hover:bg-slate-800 text-slate-400' : 'border-slate-100 hover:bg-slate-50 text-slate-500'}`}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className={`${isDark ? 'bg-slate-800/30' : 'bg-slate-50/80'} border-y ${isDark ? 'border-slate-700/50' : 'border-slate-100'}`}>
                  <th className={`px-6 py-4 text-sm font-semibold pl-8 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Facebook Page</th>
                  <th className={`px-6 py-4 text-sm font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Page ID</th>
                  <th className={`px-6 py-4 text-sm font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Followers</th>
                  <th className={`px-6 py-4 text-sm font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Total Orders</th>
                  <th className={`px-6 py-4 text-sm font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Automation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {paginatedPages.map((page, idx) => (
                  <tr key={idx} className={`transition-colors ${isDark ? 'hover:bg-slate-800/20' : 'hover:bg-slate-50/50'}`}>
                    <td className="px-6 py-4 pl-8">
                      <div className="flex items-center gap-3">
                        <img
                          src={page.pageImageUrl || `https://graph.facebook.com/${page.pageId}/picture?type=large`}
                          alt={page.name}
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            const fallbackUrl = `https://graph.facebook.com/${page.pageId}/picture?type=large`;
                            if (target.src !== fallbackUrl) {
                              target.src = fallbackUrl;
                            }
                          }}
                          className="w-10 h-10 rounded-[12px] object-cover border-2 border-slate-100 dark:border-slate-700"
                        />
                        <span className={`text-sm font-bold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{page.name}</span>
                      </div>
                    </td>
                    <td className={`px-6 py-4 text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{page.pageId}</td>
                    <td className={`px-6 py-4 text-sm font-bold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{page.pageFollowers.toLocaleString()}</td>
                    <td className={`px-6 py-4 text-sm font-black ${isDark ? 'text-blue-500' : 'text-indigo-600'}`}>{page.ordersCount}</td>
                    <td className="px-6 py-4">
                      <span className={`px-4 py-1.5 rounded-full text-xs font-bold inline-block
                        ${page.isAutomationEnabled ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-500' : 'bg-rose-100 text-rose-600 dark:bg-rose-500/10 dark:text-rose-500'}
                      `}>
                        {page.isAutomationEnabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </td>
                  </tr>
                ))}
                {paginatedPages.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                      No automated pages found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Transactions */}
        <div className={`lg:col-span-4 rounded-[15px] border p-6 ${isDark ? 'bg-[#1b253b]/60 border-[#2d3a56]' : 'bg-white border-slate-100 shadow-sm'}`}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Transactions</h3>
          </div>

          <div className="space-y-5">
            {recentTransactions.length > 0 ? recentTransactions.map((tx) => {
              const methodInfo = (() => {
                const m = (tx.payment_method || '').toLowerCase();
                const type = tx.type;

                let info = { icon: ShoppingCart, color: '#6366f1', displayName: type };

                if (m.includes('paypal')) {
                  info = {
                    icon: CreditCard,
                    color: '#3b82f6',
                    displayName: 'PayPal'
                  };
                } else if (m.includes('card')) {
                  info = { icon: CreditCard, color: '#f59e0b', displayName: 'Credit Card' };
                } else if (m.includes('bank')) {
                  info = { icon: Building2, color: '#8b5cf6', displayName: 'Bank Transfer' };
                } else if (m.includes('cod')) {
                  info = { icon: Banknote, color: '#10b981', displayName: 'Cash on Delivery' };
                } else if (m.includes('gcash') || m.includes('paymaya') || m.includes('wallet')) {
                  info = {
                    icon: Wallet,
                    color: '#22c55e',
                    displayName: m.includes('gcash') ? 'GCash' : m.includes('paymaya') ? 'PayMaya' : 'E-Wallet'
                  };
                } else if (type === 'Lead') {
                  info = { icon: Filter, color: '#6366f1', displayName: 'Form Lead' };
                } else if (type === 'Checkout') {
                  info = { icon: ShoppingBag, color: '#ec4899', displayName: 'Checkout' };
                }

                return info;
              })();

              const IconComponent = methodInfo.icon;

              return (
                <div key={tx.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-[12px] flex items-center justify-center`} style={{ backgroundColor: `${methodInfo.color}15` }}>
                      <IconComponent className="w-6 h-6" style={{ color: methodInfo.color }} />
                    </div>
                    <div>
                      <p className={`font-bold text-base truncate max-w-[150px] ${isDark ? 'text-white' : 'text-slate-900'}`}>{tx.name}</p>
                      <p className="text-sm text-gray-500 dark:text-slate-400">
                        {tx.type} • {methodInfo.displayName}
                      </p>
                    </div>
                  </div>
                  <p className={`font-bold text-lg ${tx.positive ? 'text-green-500' : 'text-rose-500'}`}>
                    {tx.positive ? '+' : '-'}{selectedCurrency}{tx.amount.toLocaleString()}
                  </p>
                </div>
              );
            }) : (
              <div className="py-8 text-center">
                <p className={`text-sm ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>No recent transactions</p>
              </div>
            )}
          </div>
        </div>
      </div>


      {/* Bottom Section: Recent Activity + Daily Sales */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-6">
        {/* Top Orders Table */}
        <div className={`lg:col-span-8 rounded-[15px] border overflow-hidden ${isDark ? 'bg-[#1b253b]/60 border-[#2d3a56]' : 'bg-white border-slate-100 shadow-sm'}`}>
          <div className="p-6 flex items-center justify-between">
            <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Top Orders</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className={`${isDark ? 'bg-slate-800/30' : 'bg-slate-50/80'} border-y ${isDark ? 'border-slate-700/50' : 'border-slate-100'}`}>
                  <th className={`px-6 py-4 text-sm font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Product Image</th>
                  <th className={`px-6 py-4 text-sm font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Invoice</th>
                  <th className={`px-6 py-4 text-sm font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Items</th>
                  <th className={`px-6 py-4 text-sm font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Qty</th>
                  <th className={`px-6 py-4 text-sm font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Amount</th>
                  <th className={`px-6 py-4 text-sm font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {recentOrders.map((order, idx) => (
                  <tr key={idx} className={`transition-colors ${isDark ? 'hover:bg-slate-800/20' : 'hover:bg-slate-50/50'}`}>
                    <td className="px-6 py-4">
                      <div className={`w-10 h-10 rounded-[12px] flex items-center justify-center overflow-hidden border-2 transition-all ${isDark ? 'border-slate-700 bg-slate-800/40' : 'border-slate-100 bg-slate-50'}`}>
                        <img
                          src={order.productImage}
                          alt={order.items}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as any).style.display = 'none';
                            (e.target as any).nextSibling.style.display = 'flex';
                          }}
                        />
                        <div style={{ display: 'none' }} className="w-full h-full items-center justify-center">
                          <Package className={`w-5 h-5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                        </div>
                      </div>
                    </td>
                    <td className={`px-6 py-4 text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>#{order.invoice}</td>
                    <td className={`px-6 py-4 text-sm font-medium truncate max-w-[150px] ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{order.items}</td>
                    <td className={`px-6 py-4 text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{order.qty}</td>
                    <td className={`px-6 py-4 text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                      {selectedCurrency} {order.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-4 py-1.5 rounded-full text-xs font-bold inline-block
                        ${(order.status?.toLowerCase() === 'paid' || order.status?.toLowerCase() === 'completed' || order.status?.toLowerCase() === 'delivered' || order.status?.toLowerCase() === 'approved') ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-500' :
                          (order.status?.toLowerCase() === 'pending' || order.status?.toLowerCase() === 'received' || order.status?.toLowerCase() === 'order placed') ? 'bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-500' :
                            (order.status?.toLowerCase() === 'shipped' || order.status?.toLowerCase() === 'processing' || order.status?.toLowerCase() === 'confirmed') ? 'bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-500' :
                              'bg-rose-100 text-rose-600 dark:bg-rose-500/10 dark:text-rose-500'}
                      `}>
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {recentOrders.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                      No orders found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Customers Card */}
        <div className={`lg:col-span-4 rounded-[15px] border p-6 flex flex-col ${isDark ? 'bg-[#1b253b]/60 border-[#2d3a56]' : 'bg-white border-slate-100 shadow-sm'}`}>
          <div className="flex items-center justify-between mb-8">
            <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Top Customers</h3>
          </div>

          <div className="space-y-6 flex-1 overflow-y-auto pr-1">
            {topCustomers.length > 0 ? topCustomers.map((customer, idx) => (
              <div key={idx} className="flex items-center justify-between group">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-[12px] overflow-hidden flex-shrink-0 border-2 transition-transform duration-300 group-hover:scale-105 flex items-center justify-center ${isDark ? 'border-slate-700 bg-slate-800' : 'border-slate-50 bg-slate-100'}`}>
                    {customer.avatar ? (
                      <img
                        src={customer.avatar}
                        alt={customer.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as any).style.display = 'none';
                          (e.target as any).nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div style={{ display: customer.avatar ? 'none' : 'flex' }} className="w-full h-full items-center justify-center">
                      <UserIcon className={`w-6 h-6 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <span className={`text-base font-bold truncate max-w-[120px] ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{customer.name}</span>
                    <span className={`text-xs font-medium ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{customer.phone}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Orders: </span>
                  <span className={`text-lg font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{customer.orders}</span>
                </div>
              </div>
            )) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Users className={`w-12 h-12 mb-4 ${isDark ? 'text-slate-700' : 'text-slate-200'}`} />
                <p className={`text-sm ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>No customers found</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Purchase Plan Section - Admin Only */}
      {(user.role === UserRole.ADMIN || user.role === UserRole.OWNER) && (
        <div className={`rounded-[15px] border overflow-hidden mt-6 ${isDark ? 'bg-[#1b253b]/60 border-[#2d3a56]' : 'bg-white border-slate-100 shadow-sm'}`}>
          <div className="p-6 flex items-center justify-between">
            <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Recent Purchase Plan</h2>
            <button className="text-blue-500 text-sm font-bold hover:underline">
              View All &gt;
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className={`${isDark ? 'bg-slate-800/30' : 'bg-slate-50/80'} border-y ${isDark ? 'border-slate-700/50' : 'border-slate-100'}`}>
                  <th className={`px-6 py-4 text-sm font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>User</th>
                  <th className={`px-6 py-4 text-sm font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Amount</th>
                  <th className={`px-6 py-4 text-sm font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Start Date</th>
                  <th className={`px-6 py-4 text-sm font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>End Date</th>
                  <th className={`px-6 py-4 text-sm font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Duration</th>
                  <th className={`px-6 py-4 text-sm font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {recentPurchaseData.map((purchase, idx) => (
                  <tr key={idx} className={`transition-colors ${isDark ? 'hover:bg-slate-800/20' : 'hover:bg-slate-50/50'}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img src={purchase.avatar} alt={purchase.user} className="w-10 h-10 rounded-full object-cover border-2 border-slate-100 dark:border-slate-700" />
                        <span className={`text-sm font-bold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{purchase.user}</span>
                      </div>
                    </td>
                    <td className={`px-6 py-4 text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{purchase.amount}</td>
                    <td className={`px-6 py-4 text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{purchase.startDate}</td>
                    <td className={`px-6 py-4 text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{purchase.endDate}</td>
                    <td className={`px-6 py-4 text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{purchase.duration}</td>
                    <td className="px-6 py-4">
                      <span className={`px-4 py-1.5 rounded-full text-xs font-bold inline-block
                        ${purchase.status === 'Completed' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-500' :
                          purchase.status === 'Pending' ? 'bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-500' :
                            purchase.status === 'Cancelled' ? 'bg-rose-100 text-rose-600 dark:bg-rose-500/10 dark:text-rose-500' :
                              'bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-500'}
                      `}>
                        {purchase.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {/* Scheduled Post Detail Modal */}
      {selectedScheduledPost && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className={`relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-[24px] border shadow-2xl animate-scale-in ${isDark ? 'bg-[#1b253b] border-[#2d3a56]' : 'bg-white border-slate-200'}`}>
            {/* Close Button */}
            <button
              onClick={() => setSelectedScheduledPost(null)}
              className={`absolute top-6 right-6 z-10 p-2 rounded-xl transition-all ${isDark ? 'bg-slate-800/50 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-500 hover:text-slate-700'}`}
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex flex-col lg:grid lg:grid-cols-2 h-full max-h-[90vh] overflow-hidden">
              {/* Left Column: Information */}
              <div className={`p-8 lg:p-10 overflow-y-auto ${isDark ? 'bg-slate-800/20' : 'bg-slate-50/30'}`}>
                <div className="mb-8">
                  <h2 className={`text-2xl font-black mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>{selectedScheduledPost.name}</h2>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${selectedScheduledPost.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' :
                    selectedScheduledPost.status === 'paused' ? 'bg-amber-500/10 text-amber-500' :
                      'bg-slate-500/10 text-slate-400'
                    }`}>
                    {selectedScheduledPost.status}
                  </span>
                </div>

                <div className="space-y-8">
                  <div>
                    <h4 className={`text-xs font-bold uppercase tracking-widest mb-3 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Description</h4>
                    <p className={`text-sm leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                      {selectedScheduledPost.description || 'No description provided for this workflow.'}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <h4 className={`text-xs font-bold uppercase tracking-widest mb-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Schedule</h4>
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-blue-500" />
                        <span className={`text-sm font-bold capitalize ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{selectedScheduledPost.scheduleType}</span>
                      </div>
                    </div>
                    <div>
                      <h4 className={`text-xs font-bold uppercase tracking-widest mb-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Next Run</h4>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-blue-500" />
                        <span className={`text-sm font-bold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                          {selectedScheduledPost.scheduledAt ? new Date(selectedScheduledPost.scheduledAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Not scheduled'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className={`p-4 rounded-[16px] border ${isDark ? 'bg-blue-500/5 border-blue-500/20' : 'bg-blue-50 border-blue-100'}`}>
                    <div className="flex gap-3">
                      <AlertCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                      <p className={`text-xs leading-relaxed ${isDark ? 'text-blue-200/70' : 'text-blue-700'}`}>
                        <span className="font-bold block mb-1 uppercase tracking-tighter">AI Generation Note</span>
                        The image shown in the preview is from the last successful post. Our AI will automatically generate a new, unique image and caption at the scheduled time of the next post.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Live Mockup Preview */}
              <div className="p-8 lg:p-10 flex flex-col items-center justify-start bg-slate-900 overflow-y-auto h-[500px] lg:h-full custom-scrollbar">
                <div className="w-full max-w-[450px] bg-white rounded-[8px] shadow-2xl overflow-hidden animate-slide-up border border-gray-200">
                  {/* Facebook Post Header */}
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative w-10 h-10 flex-shrink-0">
                        <div className="w-full h-full rounded-full overflow-hidden border border-gray-100">
                          {selectedScheduledPost.pageAvatar ? (
                            <img src={selectedScheduledPost.pageAvatar} alt={selectedScheduledPost.pageName} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
                              {selectedScheduledPost.pageName.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                      </div>
                      <div className="flex flex-col">
                        <p className="text-[14px] font-bold text-gray-900 leading-tight hover:underline cursor-pointer">{selectedScheduledPost.pageName}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <p className="text-[12px] text-gray-500 hover:underline cursor-pointer">2m</p>
                          <span className="text-[10px] text-gray-400">•</span>
                          <Globe className="w-3 h-3 text-gray-500" />
                        </div>
                      </div>
                    </div>
                    <button className="p-2 -mr-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors">
                      <div className="flex gap-1">
                        <div className="w-1 h-1 rounded-full bg-gray-600"></div>
                        <div className="w-1 h-1 rounded-full bg-gray-600"></div>
                        <div className="w-1 h-1 rounded-full bg-gray-600"></div>
                      </div>
                    </button>
                  </div>

                  {/* Facebook Post Text */}
                  <div className="px-4 pb-3 space-y-1">
                    <p className="text-[14px] text-gray-900 whitespace-pre-wrap leading-tight">
                      {selectedScheduledPost.caption}... <span className="font-bold cursor-pointer hover:underline text-gray-900">See more</span>
                    </p>
                  </div>

                  {/* Facebook Post Image */}
                  <div className="w-full bg-gray-100 border-y border-gray-100">
                    <img
                      src={selectedScheduledPost.image}
                      alt="Preview"
                      className="w-full h-auto max-h-[500px] object-contain mx-auto"
                    />
                  </div>

                  {/* Facebook Interaction Stats/Buttons */}
                  <div className="px-3 border-b border-gray-200">
                    <div className="grid grid-cols-3 py-1">
                      <button className="flex items-center justify-center gap-2 py-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 font-semibold text-[13px]">
                        <ThumbsUp className="w-5 h-5" />
                        <span>Like</span>
                      </button>
                      <button className="flex items-center justify-center gap-2 py-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 font-semibold text-[13px]">
                        <MessageSquare className="w-5 h-5" />
                        <span>Comment</span>
                      </button>
                      <button className="flex items-center justify-center gap-2 py-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 font-semibold text-[13px]">
                        <Share2 className="w-5 h-5" />
                        <span>Share</span>
                      </button>
                    </div>
                  </div>

                  {/* Comment Input Mockup */}
                  <div className="p-3 bg-white">
                    <div className="flex gap-2 items-center">
                      <div className="relative w-8 h-8 flex-shrink-0">
                        {user.avatarUrl ? (
                          <img src={user.avatarUrl} alt={user.name} className="w-full h-full rounded-full object-cover" />
                        ) : (
                          <div className="w-full h-full rounded-full bg-slate-200 flex items-center justify-center">
                            <UserIcon className="w-5 h-5 text-slate-400" />
                          </div>
                        )}
                        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-white rounded-full flex items-center justify-center shadow-sm">
                          <ChevronDown className="w-2 h-2 text-gray-600" />
                        </div>
                      </div>
                      <div className="flex-1 bg-gray-100 rounded-[20px] px-3 py-2 flex items-center justify-between border border-gray-200 hover:bg-gray-200 transition-colors cursor-text group">
                        <span className="text-gray-500 text-[13px]">Comment as {user.name}...</span>
                        <div className="flex gap-3 text-gray-500 group-hover:text-gray-600 transition-colors">
                          <SmilePlus className="w-4 h-4 cursor-pointer" />
                          <Smile className="w-4 h-4 cursor-pointer" />
                          <Camera className="w-4 h-4 cursor-pointer" />
                          <div className="text-[10px] font-black border border-current rounded-[3px] px-0.5 leading-none h-3.5 flex items-center cursor-pointer">GIF</div>
                          <Smile className="w-4 h-4 rotate-12 cursor-pointer" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <p className="mt-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Facebook Preview Mockup</p>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Coming Soon Modal */}
      {showComingSoon && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in text-center">
          <div className={`relative w-full max-w-sm p-8 rounded-[24px] border shadow-2xl animate-scale-in ${isDark ? 'bg-[#1b253b] border-[#2d3a56]' : 'bg-white border-slate-200'}`}>
            <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Zap className="w-8 h-8 text-blue-500 animate-pulse" />
            </div>
            <h2 className={`text-2xl font-black mb-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>Broadcasting</h2>
            <p className={`text-base font-bold mb-8 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Notifications, Coming SOON!
            </p>
            <button
              onClick={() => setShowComingSoon(false)}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black transition-all shadow-lg shadow-blue-500/30"
            >
              GOT IT!
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
