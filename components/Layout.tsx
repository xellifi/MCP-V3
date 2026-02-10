import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Workflow,
  MessageSquare,
  CalendarDays,
  Settings,
  Link as LinkIcon,
  LogOut,
  Menu,
  X,
  User as UserIcon,
  Bot,
  Users,
  Shield,
  Layers,
  Banknote,
  Sliders,
  LifeBuoy,
  Sun,
  Moon,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  FileText,
  Store,
  Package,
  ShoppingBag,
  Lock as LockIcon,
  UserX,
  Coins
} from 'lucide-react';
import { User, Workspace, UserRole } from '../types';
import { api } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { useCurrency } from '../context/CurrencyContext';
import { useSubscription } from '../context/SubscriptionContext';
import UpgradeModal from './UpgradeModal';
import ProfileModal from './ProfileModal';

interface LayoutProps {
  children: React.ReactNode;
  user: User;
  workspaces: Workspace[];
  currentWorkspace: Workspace;
  onWorkspaceChange: (id: string) => void;
  onLogout: () => void;
}

import { ALL_NAV_ITEMS, DEFAULT_ORDER } from '../constants/navigation';


const Layout: React.FC<LayoutProps> = ({
  children,
  user,
  workspaces,
  currentWorkspace,
  onWorkspaceChange,
  onLogout
}) => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const stored = localStorage.getItem('sidebarCollapsed');
    return stored === 'true';
  });
  const [menuOrder, setMenuOrder] = useState<string[]>(DEFAULT_ORDER);
  const [affiliateEnabled, setAffiliateEnabled] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const { currentSubscription, refreshSubscription: refreshSubContext } = useSubscription();

  // Impersonation state
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [impersonatedUserName, setImpersonatedUserName] = useState<string | null>(null);

  const handleProfileUpdate = () => {
    window.location.reload();
  };

  // Upgrade Modal State
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [restrictedFeature, setRestrictedFeature] = useState('');
  const [requiredPlan, setRequiredPlan] = useState('Pro');
  const [allPackages, setAllPackages] = useState<any[]>([]);

  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme, isDark } = useTheme();
  const { selectedCurrency, setCurrency, availableCurrencies } = useCurrency();

  const toggleSidebar = () => setSidebarOpen(!isSidebarOpen);
  const toggleSidebarCollapse = () => {
    const newState = !isSidebarCollapsed;
    setSidebarCollapsed(newState);
    localStorage.setItem('sidebarCollapsed', String(newState));
  };
  const isAdminOrOwner = user.role === UserRole.ADMIN || user.role === UserRole.OWNER;

  // Get current page title
  const getCurrentPageTitle = () => {
    const path = location.pathname;
    if (path === '/dashboard' || path === '/') return 'Dashboard';
    const item = ALL_NAV_ITEMS[path];
    if (item) return item.label;
    if (path.startsWith('/flows')) return 'Flow Builder';
    if (path === '/users') return 'Users';
    if (path === '/system-settings') return 'System Settings';
    if (path.startsWith('/messages')) return 'Inbox';
    return 'Mychat Pilot';
  };

  useEffect(() => {
    // Fetch menu sequence settings
    const loadMenuSettings = async () => {
      try {
        const settings = await api.admin.getSettings();
        setAffiliateEnabled(!!settings.affiliateEnabled);

        if (settings.menuSequence && settings.menuSequence.length > 0) {
          const savedOrder = settings.menuSequence;
          const migratedOrder = savedOrder.map(item => item === '/api-keys' ? '/settings' : item);
          const missingItems = DEFAULT_ORDER.filter(item => !migratedOrder.includes(item));

          if (missingItems.length > 0) {
            setMenuOrder([...migratedOrder, ...missingItems]);
          } else {
            setMenuOrder(migratedOrder);
          }
        } else {
          setMenuOrder(DEFAULT_ORDER);
        }
      } catch (error) {
        console.error("Could not load menu settings, using default", error);
        setMenuOrder(DEFAULT_ORDER);
      }
    };
    loadMenuSettings();

    // Subscription is now managed by SubscriptionContext
    // Refresh on mount in case there are stale values
    refreshSubContext();

    // Fetch all packages to determine route requirements
    const loadPackages = async () => {
      try {
        const packages = await api.admin.getPackages();
        setAllPackages(packages);
      } catch (error) {
        console.error("Failed to load packages", error);
      }
    };
    loadPackages();

    // Check if currently impersonating
    const impersonationStatus = api.admin.isImpersonating();
    setIsImpersonating(impersonationStatus.isImpersonating);
    setImpersonatedUserName(impersonationStatus.userName);

  }, []);

  // Auto-redirect expired users to packages page
  useEffect(() => {
    const isExpired = (currentSubscription as any)?.isExpired === true;
    const isOnPackagesPage = location.pathname === '/packages';

    console.log('[Layout] Subscription check:', {
      hasSubscription: !!currentSubscription,
      isExpired,
      isOnPackagesPage,
      isAdminOrOwner,
      subscriptionStatus: currentSubscription?.status,
      subscriptionIsExpiredFlag: (currentSubscription as any)?.isExpired
    });

    // If expired and not admin/owner and not already on packages page, redirect
    if (isExpired && !isAdminOrOwner && !isOnPackagesPage) {
      console.log('[Layout] Subscription expired - redirecting to /packages');
      navigate('/packages');
    }
  }, [currentSubscription, location.pathname, isAdminOrOwner, navigate]);

  // ... (rest of code)

  // RENDER HELPERS
  const PlanBadge = () => {
    if (!currentSubscription) return <span className="px-2 py-0.5 rounded text-xs font-bold bg-slate-200 text-slate-600 border border-slate-300">Free</span>;

    const planName = currentSubscription.packages?.name || currentSubscription.package_id || 'Plan';
    const color = currentSubscription.packages?.color || 'slate';
    const status = currentSubscription.status;
    const isExpired = (currentSubscription as any)?.isExpired === true;

    // Show EXPIRED badge with red styling
    if (isExpired) {
      return <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800 uppercase tracking-wider">EXPIRED</span>;
    }

    let badgeColor = `bg-${color}-100 text-${color}-700 border-${color}-200 dark:bg-${color}-900/30 dark:text-${color}-400 dark:border-${color}-800`;

    if (status === 'Pending') {
      return <span className="px-2 py-0.5 rounded text-xs font-bold bg-yellow-100 text-yellow-700 border border-yellow-200">Pending Approval</span>;
    }

    return (
      <span className={`px-2 py-0.5 rounded text-xs font-bold border ${badgeColor} uppercase tracking-wider`}>
        {planName}
      </span>
    );
  };

  // ...

  // IN HEADER RENDER
  /*
  <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white transition-opacity duration-200 flex items-center gap-3">
    {getCurrentPageTitle()}
    <div className="hidden sm:block">
        <PlanBadge />
    </div>
  </h1>
  */

  // IN DROPDOWN RENDER
  /*
  <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
      <p className="text-sm font-bold text-slate-900 dark:text-white">{user.name}</p>
      <div className="flex items-center justify-between mt-1">
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[100px]">{user.email}</p>
          <PlanBadge />
      </div>
  </div>
  */

  // ...

  // ACTUAL REPLACEMENT LOGIC


  // Auto-collapse sidebar when in Flow Builder (PC view only)
  useEffect(() => {
    const isFlowBuilder = location.pathname.startsWith('/flows/');
    const isDesktop = window.innerWidth >= 1024; // lg breakpoint

    if (isFlowBuilder && isDesktop && !isSidebarCollapsed) {
      setSidebarCollapsed(true);
      // Don't save to localStorage - this is temporary for Flow Builder
    } else if (!isFlowBuilder && isDesktop) {
      // Restore from localStorage when leaving Flow Builder
      const stored = localStorage.getItem('sidebarCollapsed');
      if (stored !== null) {
        setSidebarCollapsed(stored === 'true');
      }
    }
  }, [location.pathname]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileDropdownOpen) {
        setProfileDropdownOpen(false);
      }
    };
    if (profileDropdownOpen) {
      document.addEventListener('click', handleClickOutside);
    }
    return () => document.removeEventListener('click', handleClickOutside);
  }, [profileDropdownOpen]);

  // Default allowed routes for Free plan (fallback if allowed_routes is empty in DB)
  const FREE_PLAN_ROUTES = ['/', '/dashboard', '/connected-pages', '/flows', '/settings', '/academy', '/orders', '/packages'];

  // Routes allowed for EXPIRED subscriptions - only packages page to renew
  const EXPIRED_PLAN_ROUTES = ['/packages'];

  // Handle navigation click with permission check
  const handleNavClick = (e: React.MouseEvent, path: string, label: string) => {
    // Admins/Owners bypass all restrictions
    if (isAdminOrOwner) {
      setSidebarOpen(false);
      return;
    }


    // Check if subscription is EXPIRED - only allow /packages
    const isExpired = (currentSubscription as any)?.isExpired === true;
    if (isExpired) {
      if (!EXPIRED_PLAN_ROUTES.includes(path)) {
        e.preventDefault();
        setRestrictedFeature('Your subscription has expired');
        setRequiredPlan('any active plan');
        setShowUpgradeModal(true);
        setSidebarOpen(false);
        return;
      }
      setSidebarOpen(false);
      return;
    }

    // Determine which routes the user can access
    // Use access_packages which contains previous Active subscription routes if current is Pending
    const accessPackages = (currentSubscription as any)?.access_packages || currentSubscription?.packages;
    const allowedRoutes = accessPackages?.allowed_routes?.length > 0
      ? accessPackages.allowed_routes
      : FREE_PLAN_ROUTES; // Fall back to Free plan routes if no access routes

    // Normalize dashboard paths
    let pathIsAllowed = allowedRoutes.includes(path);
    if (!pathIsAllowed) {
      if (path === '/dashboard') {
        pathIsAllowed = allowedRoutes.includes('/');
      } else if (path === '/') {
        pathIsAllowed = allowedRoutes.includes('/dashboard');
      }
    }

    if (!pathIsAllowed) {
      e.preventDefault();
      setRestrictedFeature(label);

      // Find the minimum required plan that has this route
      // Sort packages by price (lowest first) and find the first one that includes this route
      const sortedPackages = [...allPackages].sort((a, b) => (a.priceMonthly || 0) - (b.priceMonthly || 0));
      const requiredPackage = sortedPackages.find(pkg =>
        pkg.allowedRoutes?.includes(path) || pkg.allowedRoutes?.includes(path === '/dashboard' ? '/' : path)
      );
      setRequiredPlan(requiredPackage?.name || 'Pro');

      setShowUpgradeModal(true);
      setSidebarOpen(false);
      return;
    }
    setSidebarOpen(false);
  };

  const NavItem: React.FC<{ to: string, icon: any, label: string, locked?: boolean }> = ({ to, icon: Icon, label, locked }) => {
    const isActive = location.pathname === to || (to === '/dashboard' && location.pathname === '/');

    return (
      <NavLink
        to={to}
        onClick={(e) => handleNavClick(e, to, label)}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 mb-1 font-medium group relative ${isActive
          ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white'
          : 'hover:bg-slate-100 dark:hover:bg-slate-800'
          } ${locked ? 'opacity-70 dark:opacity-60 grayscale-[0.5]' : ''}`}
        style={{
          color: isActive ? '#ffffff' : (isDark ? '#d1d5db' : '#0f172a'),
          textDecoration: 'none'
        }}
        title={isSidebarCollapsed ? label : ''}
      >
        <div className="relative">
          <Icon className="w-5 h-5 flex-shrink-0" style={{ color: 'inherit' }} />
          {locked && isSidebarCollapsed && (
            <div className="absolute -top-1 -right-1 bg-slate-900 dark:bg-slate-950 rounded-full p-[1px] border border-slate-700">
              <LockIcon className="w-2 h-2 text-slate-400" />
            </div>
          )}
        </div>

        {/* Show text on mobile (always) or desktop (when not collapsed) */}
        <span className={`truncate ${isSidebarCollapsed ? 'hidden lg:hidden' : 'block'} flex-1`} style={{ color: 'inherit' }}>
          {label}
        </span>

        {/* Lock Icon for Expanded View */}
        {!isSidebarCollapsed && locked && (
          <LockIcon className="w-3 h-3 text-slate-400 opacity-70" />
        )}

        {/* Active Indicator Dot (Only show if allowed) */}
        {!locked && (
          <div className={`ml-auto w-1.5 h-1.5 rounded-full bg-white transition-opacity ${isActive ? 'opacity-100' : 'opacity-0'} ${isSidebarCollapsed ? 'hidden lg:hidden' : 'block'}`} />
        )}

        {/* Tooltip for collapsed state - desktop only */}
        {isSidebarCollapsed && (
          <div className="hidden lg:flex items-center gap-2 absolute left-full ml-2 px-3 py-1.5 bg-slate-900 dark:bg-slate-700 text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 shadow-lg">
            {label} {locked && <LockIcon className="w-3 h-3 text-slate-300" />}
            <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-900 dark:border-r-slate-700"></div>
          </div>
        )}
      </NavLink>
    );
  };

  // Handle ending impersonation session
  const handleEndImpersonation = async () => {
    try {
      await api.admin.endImpersonation();
      // Redirect to login page - admin will need to log in again
      window.location.href = '/login';
    } catch (error) {
      console.error('Failed to end impersonation:', error);
    }
  };

  const sidebarWidth = isSidebarCollapsed ? 'w-[280px] lg:w-20' : 'w-[280px]';

  return (
    <div className={`h-screen flex flex-col w-full overflow-hidden bg-[#f3f4f6] dark:bg-[#0b1120] transition-colors duration-200 relative`}>
      {/* Impersonation Banner */}
      {isImpersonating && (
        <div className="bg-amber-500 text-white px-4 py-2 flex items-center justify-between z-[100] flex-shrink-0">
          <div className="flex items-center gap-2">
            <UserX className="w-4 h-4" />
            <span className="text-sm font-medium">
              You are viewing as <strong>{impersonatedUserName || user.name}</strong>
            </span>
          </div>
          <button
            onClick={handleEndImpersonation}
            className="flex items-center gap-1.5 px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            End Session
          </button>
        </div>
      )}

      <div className="flex flex-1 min-h-0">
        {/* Cosmic Background for Dashboard (Subtle) */}
        <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none opacity-50 dark:opacity-100">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[120px]"></div>
        </div>

        {/* Mobile Sidebar Overlay */}
        <div
          className={`fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          onClick={() => setSidebarOpen(false)}
        />

        {/* Sidebar - Desktop & Mobile Drawer */}
        <aside
          className={`fixed lg:static inset-y-0 left-0 z-50 ${sidebarWidth} flex flex-col transition-all duration-300 ease-in-out lg:transform-none 
        bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-r border-slate-200 dark:border-slate-800 shadow-2xl lg:shadow-none ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
        >
          {/* Brand Header */}
          <div className="h-16 flex items-center px-6 border-b border-slate-200 dark:border-slate-800 flex-shrink-0 relative">
            {/* Full branding - show on mobile always, on desktop when not collapsed */}
            <div className={`flex items-center gap-3 ${isSidebarCollapsed ? 'lg:hidden' : 'flex'}`}>
              <div className="relative flex-shrink-0">
                {/*  Icon placeholder matching the style - using Bot for now but styled */}
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                  <Bot className="w-6 h-6" />
                </div>
              </div>

              <div className="flex flex-col -space-y-1">
                <div className="flex items-center text-xl sm:text-2xl font-black tracking-tight leading-none">
                  <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">MY</span>
                  <span className="text-indigo-600 dark:text-indigo-400">chat</span>
                  <span className="text-pink-500 dark:text-pink-400">Pilot</span>
                </div>
                <span className="text-[0.65rem] font-bold tracking-[0.2em] text-indigo-500 dark:text-indigo-400 uppercase w-full flex justify-between">
                  <span>A</span><span>U</span><span>T</span><span>O</span><span>M</span><span>A</span><span>T</span><span>I</span><span>O</span><span>N</span>
                  <span className="w-1"></span>
                  <span>T</span><span>O</span><span>O</span><span>L</span>
                </span>
              </div>
            </div>

            {/* Collapsed branding - only show on desktop when collapsed */}
            {isSidebarCollapsed && (
              <div className="hidden lg:flex w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-indigo-600 items-center justify-center text-white mx-auto">
                <Bot className="w-5 h-5" />
              </div>
            )}

            <button
              className="ml-auto lg:hidden text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              onClick={toggleSidebar}
            >
              <X className="w-5 h-5" />
            </button>

            {/* Desktop Collapse Toggle */}
            <button
              className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 rounded-full text-slate-600 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 hover:border-primary-500 transition-all"
              onClick={toggleSidebarCollapse}
              title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isSidebarCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
            </button>
          </div>

          {/* Workspace Selector */}
          <div className={`p-4 flex-shrink-0 ${isSidebarCollapsed ? 'lg:hidden' : 'block'}`}>
            <div className="relative">
              <select
                className="w-full appearance-none bg-slate-100 dark:bg-slate-950 border-2 border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-200 text-sm font-medium rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 block p-3 pr-10 transition-all cursor-pointer hover:border-primary-400 dark:hover:border-slate-700 outline-none"
                value={currentWorkspace.id}
                onChange={(e) => onWorkspaceChange(e.target.value)}
              >
                {workspaces.map(ws => (
                  <option key={ws.id} value={ws.id}>{ws.name}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Navigation List */}
          <nav className="flex-1 px-4 space-y-1 overflow-y-auto py-2 custom-scrollbar">
            <div className={`text-xs font-semibold text-slate-500 dark:text-slate-500 uppercase tracking-wider mb-2 px-3 mt-2 ${isSidebarCollapsed ? 'lg:hidden' : 'block'}`}>
              Menu
            </div>

            {menuOrder.map(path => {
              let renderPath = path;
              if (path === '/') renderPath = '/dashboard';

              // Filter logic
              if (path === '/settings' && isAdminOrOwner) return null;
              if (path === '/packages' && isAdminOrOwner) return null;

              // Package Route Restriction Logic
              // Use access_packages for access control (previous Active when current is Pending)
              let isLocked = false;

              if (!isAdminOrOwner) {
                // Check if subscription is expired - lock everything except /packages
                const isExpired = (currentSubscription as any)?.isExpired === true;
                if (isExpired) {
                  isLocked = !EXPIRED_PLAN_ROUTES.includes(path) && !EXPIRED_PLAN_ROUTES.includes(renderPath);
                } else {
                  const accessPackages = (currentSubscription as any)?.access_packages || currentSubscription?.packages;
                  const allowedRoutes = accessPackages?.allowed_routes?.length > 0
                    ? accessPackages.allowed_routes
                    : FREE_PLAN_ROUTES; // Free plan routes if no access routes

                  // DEBUG: Log route access info for first menu item
                  if (path === '/') {
                    console.log('[Layout Route Debug]', {
                      path,
                      hasSubscription: !!currentSubscription,
                      subscriptionStatus: currentSubscription?.status,
                      subscriptionPackages: currentSubscription?.packages,
                      accessPackages,
                      allowedRoutes_fromDB: accessPackages?.allowed_routes,
                      allowedRoutes_used: allowedRoutes,
                      usingFallback: !accessPackages?.allowed_routes?.length
                    });
                  }

                  // Check if path is allowed
                  const pathIsAllowed = allowedRoutes.includes(path) || allowedRoutes.includes(renderPath);
                  if (!pathIsAllowed) {
                    isLocked = true;
                  }
                }
              }

              const item = ALL_NAV_ITEMS[path] || ALL_NAV_ITEMS[renderPath];
              if (!item) return null;

              return <NavItem key={path} to={renderPath} icon={item.icon} label={item.label} locked={isLocked} />;
            })}

            {isAdminOrOwner && (
              <div className="mt-8">
                <div className={`text-xs font-semibold text-slate-500 dark:text-slate-500 uppercase tracking-wider mb-2 px-3 ${isSidebarCollapsed ? 'lg:hidden' : 'block'}`}>
                  Administration
                </div>
                <NavItem to="/users" icon={Users} label="Users" />
                <NavItem to="/admin/subscriptions" icon={Banknote} label="Subscriptions" />
                <NavItem to="/admin/packages" icon={Settings} label="Package Settings" />
                <NavItem to="/admin/support" icon={LifeBuoy} label="Support Tickets" />
                <NavItem to="/system-settings" icon={Shield} label="System Settings" />
              </div>
            )}
          </nav>

          {/* User Profile Mini - Sidebar Footer */}
          <div className={`p-4 border-t border-slate-200 dark:border-slate-800 ${isSidebarCollapsed ? 'lg:hidden' : 'block'}`}>
            <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name} className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-indigo-500 flex items-center justify-center text-white text-xs font-bold">
                  {user.name.charAt(0)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{user.name}</p>
                  {(!currentSubscription) ? (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-200 text-slate-600 border border-slate-300 uppercase">Free</span>
                  ) : (
                    currentSubscription.status === 'Pending' ? (
                      (currentSubscription.packages?.name?.toLowerCase() === 'free' || currentSubscription.package_id === 'free') ? (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-200 text-slate-600 border border-slate-300 uppercase">Free</span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-yellow-100 text-yellow-700 border border-yellow-200 uppercase">
                          {currentSubscription.packages?.name || currentSubscription.package_id} Pending
                        </span>
                      )
                    ) : (
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border uppercase bg-${currentSubscription.packages?.color || 'primary'}-100 text-${currentSubscription.packages?.color || 'primary'}-700 border-${currentSubscription.packages?.color || 'primary'}-200 dark:bg-${currentSubscription.packages?.color || 'primary'}-900/30 dark:text-${currentSubscription.packages?.color || 'primary'}-400 dark:border-${currentSubscription.packages?.color || 'primary'}-800`}>
                        {currentSubscription.packages?.name || currentSubscription.package_id}
                      </span>
                    )
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate capitalize">{user.role.toLowerCase()}</p>
              </div>
            </div>
          </div>

          {/* Collapsed User Avatar - Desktop only when collapsed */}
          {isSidebarCollapsed && (
            <div className="hidden lg:flex p-4 border-t border-slate-200 dark:border-slate-800 justify-center">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name} className="w-10 h-10 rounded-full object-cover border-2 border-slate-200 dark:border-slate-700" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-indigo-500 flex items-center justify-center text-white text-sm font-bold border-2 border-slate-200 dark:border-slate-700">
                  {user.name.charAt(0)}
                </div>
              )}
            </div>
          )}
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col min-w-0 h-full relative">
          {/* Sticky Header */}
          <header className="sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 h-16 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-b-2 border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-4">
              <button
                onClick={toggleSidebar}
                className="lg:hidden p-2 -ml-2 text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <Menu className="w-6 h-6" />
              </button>
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white transition-opacity duration-200 flex items-center gap-2 sm:gap-3">
                {getCurrentPageTitle()}
                {/* Package Badge - Always visible */}
                {(() => {
                  const isExpired = (currentSubscription as any)?.isExpired === true;

                  // Show EXPIRED badge if subscription is expired
                  if (isExpired) {
                    return <span className="px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-xs font-bold bg-red-100 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800 uppercase tracking-wider">EXPIRED</span>;
                  }

                  if (!currentSubscription) {
                    return <span className="px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-xs font-bold bg-slate-200 text-slate-600 border border-slate-300">Free</span>;
                  }

                  if (currentSubscription.status === 'Pending') {
                    if (currentSubscription.packages?.name?.toLowerCase() === 'free' || currentSubscription.package_id === 'free') {
                      return <span className="px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-xs font-bold bg-slate-200 text-slate-600 border border-slate-300">Free</span>;
                    }
                    return (
                      <span className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-xs font-bold bg-yellow-100 text-yellow-700 border border-yellow-200 uppercase whitespace-nowrap">
                        <span className="hidden sm:inline">{currentSubscription.packages?.name || currentSubscription.package_id}</span>
                        <span className="sm:hidden">⏳</span>
                        <span className="hidden sm:inline">Pending</span>
                        <span className="sm:hidden">{currentSubscription.packages?.name || currentSubscription.package_id}</span>
                      </span>
                    );
                  }

                  return (
                    <span className={`px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-xs font-bold border uppercase tracking-wider whitespace-nowrap bg-${currentSubscription.packages?.color || 'primary'}-100 text-${currentSubscription.packages?.color || 'primary'}-700 border-${currentSubscription.packages?.color || 'primary'}-200 dark:bg-${currentSubscription.packages?.color || 'primary'}-900/30 dark:text-${currentSubscription.packages?.color || 'primary'}-400 dark:border-${currentSubscription.packages?.color || 'primary'}-800`}>
                      {currentSubscription.packages?.name || currentSubscription.package_id}
                    </span>
                  );
                })()}
              </h1>
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
              {/* Currency Selector */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 transition-all">
                <Coins className="w-4 h-4 text-amber-500" />
                <select
                  value={selectedCurrency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="bg-transparent border-none text-xs font-bold text-slate-700 dark:text-slate-200 focus:ring-0 cursor-pointer outline-none"
                >
                  {availableCurrencies.map(code => (
                    <option key={code} value={code} className="bg-white dark:bg-slate-900">{code}</option>
                  ))}
                </select>
              </div>

              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 rounded-full transition-all duration-200 hover:scale-105"
                title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {isDark ? (
                  <Sun className="w-5 h-5 text-amber-400" />
                ) : (
                  <Moon className="w-5 h-5 text-indigo-600" />
                )}
              </button>

              {/* Desktop Profile Menu */}

              {/* Desktop Profile Menu */}
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setProfileDropdownOpen(!profileDropdownOpen);
                  }}
                  className="flex items-center gap-2 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="Account Menu"
                >
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.name} className="w-8 h-8 rounded-full border-2 border-slate-300 dark:border-slate-700 object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300">
                      <UserIcon className="w-4 h-4" />
                    </div>
                  )}
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${profileDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {profileDropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-64 rounded-2xl shadow-xl shadow-slate-300/50 dark:shadow-black/50 border-2 border-slate-200 dark:border-slate-800 overflow-hidden z-50 bg-white dark:bg-slate-900 animate-fade-in origin-top-right">
                    <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                      <p className="text-sm font-bold text-slate-900 dark:text-white">{user.name}</p>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[100px]">{user.email}</p>
                        {(!currentSubscription) ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-600 border border-slate-300">Free</span>
                        ) : (
                          currentSubscription.status === 'Pending' ? (
                            (currentSubscription.packages?.name?.toLowerCase() === 'free' || currentSubscription.package_id === 'free') ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-600 border border-slate-300">Free</span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-100 text-yellow-700 border border-yellow-200 uppercase">
                                {currentSubscription.packages?.name || currentSubscription.package_id} Pending
                              </span>
                            )
                          ) : (
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider bg-${currentSubscription.packages?.color || 'primary'}-100 text-${currentSubscription.packages?.color || 'primary'}-700 border-${currentSubscription.packages?.color || 'primary'}-200 dark:bg-${currentSubscription.packages?.color || 'primary'}-900/30 dark:text-${currentSubscription.packages?.color || 'primary'}-400 dark:border-${currentSubscription.packages?.color || 'primary'}-800`}>
                              {currentSubscription.packages?.name || currentSubscription.package_id}
                            </span>
                          )
                        )}
                      </div>
                    </div>
                    <div className="p-2 space-y-1">
                      {/* Profile Button */}
                      <button
                        onClick={() => {
                          setProfileDropdownOpen(false);
                          setShowProfileModal(true);
                        }}
                        className="flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium rounded-xl transition-colors text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        <UserIcon className="w-4 h-4 text-slate-400" />
                        Profile
                      </button>

                      {/* Settings Link */}
                      <button
                        onClick={() => {
                          setProfileDropdownOpen(false);
                          navigate('/settings');
                        }}
                        className="flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium rounded-xl transition-colors text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        <Settings className="w-4 h-4 text-slate-400" />
                        Settings
                      </button>

                      <div className="h-px bg-slate-200 dark:bg-slate-700 my-1 mx-2" />

                      {/* Sign Out */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setProfileDropdownOpen(false);
                          onLogout();
                        }}
                        className="flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium rounded-xl transition-colors text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Expired Subscription Banner */}
          {(currentSubscription as any)?.isExpired && !isAdminOrOwner && (
            <div className="bg-red-500 text-white px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <LockIcon className="w-5 h-5" />
                <span className="text-sm font-medium">
                  Your subscription has expired. Please renew to continue using the platform.
                </span>
              </div>
              <button
                onClick={() => navigate('/packages')}
                className="px-4 py-1.5 bg-white text-red-600 rounded-lg text-sm font-bold hover:bg-red-50 transition-colors"
              >
                Renew Now
              </button>
            </div>
          )}

          {/* Content Viewport */}
          <div className="flex-1 overflow-auto bg-[#f3f4f6] dark:bg-[#0b1120] p-4 sm:p-6 lg:p-8">
            <div className="max-w-[1600px] mx-auto animate-fade-in">
              {children}
            </div>
          </div>
        </main>

        {/* Profile Edit Modal */}
        <ProfileModal
          isOpen={showProfileModal}
          onClose={() => setShowProfileModal(false)}
          user={user}
          onUpdate={handleProfileUpdate}
        />

        {/* Upgrade Modal */}
        <UpgradeModal
          isOpen={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          featureName={restrictedFeature}
          requiredPlan={requiredPlan}
        />
      </div>
    </div>

  );
};

export default Layout;