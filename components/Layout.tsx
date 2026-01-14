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
  UserX
} from 'lucide-react';
import { User, Workspace, UserRole } from '../types';
import { api } from '../services/api';
import { useTheme } from '../context/ThemeContext';
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
  const [currentSubscription, setCurrentSubscription] = useState<any>(null);

  // Impersonation state
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [impersonatedUserName, setImpersonatedUserName] = useState<string | null>(null);

  const handleProfileUpdate = () => {
    window.location.reload();
  };

  // Upgrade Modal State
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [restrictedFeature, setRestrictedFeature] = useState('');

  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme, isDark } = useTheme();

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

    // Fetch Subscription Status
    const loadSubscription = async () => {
      try {
        const sub = await api.subscriptions.getCurrentSubscription();
        setCurrentSubscription(sub);
      } catch (error) {
        console.error("Failed to load subscription", error);
      }
    };
    loadSubscription();

    // Check if currently impersonating
    const impersonationStatus = api.admin.isImpersonating();
    setIsImpersonating(impersonationStatus.isImpersonating);
    setImpersonatedUserName(impersonationStatus.userName);

  }, []);

  // ... (rest of code)

  // RENDER HELPERS
  const PlanBadge = () => {
    if (!currentSubscription) return <span className="px-2 py-0.5 rounded text-xs font-bold bg-slate-200 text-slate-600 border border-slate-300">Free</span>;

    const planName = currentSubscription.packages?.name || currentSubscription.package_id || 'Plan';
    const color = currentSubscription.packages?.color || 'slate';
    const status = currentSubscription.status;

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

  // Default allowed routes for Free plan (no subscription or Pending subscription)
  // This should match the routes configured in the Free package in admin settings
  const FREE_PLAN_ROUTES = ['/', '/dashboard', '/connected-pages', '/flows', '/settings', '/academy', '/orders', '/packages'];

  // Handle navigation click with permission check
  const handleNavClick = (e: React.MouseEvent, path: string, label: string) => {
    // Admins/Owners bypass all restrictions
    if (isAdminOrOwner) {
      setSidebarOpen(false);
      return;
    }

    // Determine which routes the user can access
    const hasActiveSubscription = currentSubscription?.status === 'Active';
    const allowedRoutes = hasActiveSubscription && currentSubscription?.packages?.allowed_routes?.length > 0
      ? currentSubscription.packages.allowed_routes
      : FREE_PLAN_ROUTES; // Fall back to Free plan routes for Pending/no subscription

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
    <div className={`h-screen flex flex-col w-full overflow-hidden bg-slate-50 dark:bg-slate-950 transition-colors duration-200 relative`}>
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
            <div className={`flex items-center ${isSidebarCollapsed ? 'lg:hidden' : 'flex'}`}>
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center text-white mr-3">
                <Bot className="w-5 h-5" />
              </div>
              <span className="text-xl font-bold text-slate-900 dark:text-white">
                Mychat Pilot
              </span>
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
              // If not admin/owner, check allowed routes based on subscription status
              // Pending/no subscription = Free plan routes only
              let isLocked = false;

              if (!isAdminOrOwner) {
                const hasActiveSubscription = currentSubscription?.status === 'Active';
                const allowedRoutes = hasActiveSubscription && currentSubscription?.packages?.allowed_routes?.length > 0
                  ? currentSubscription.packages.allowed_routes
                  : FREE_PLAN_ROUTES; // Free plan routes for Pending/no subscription

                // Check if path is allowed
                const pathIsAllowed = allowedRoutes.includes(path) || allowedRoutes.includes(renderPath);
                if (!pathIsAllowed) {
                  isLocked = true;
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
                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{user.name}</p>
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
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white transition-opacity duration-200 flex items-center gap-3">
                {getCurrentPageTitle()}
                <div className="hidden sm:block">
                  {(!currentSubscription) ? (
                    <span className="px-2 py-0.5 rounded text-xs font-bold bg-slate-200 text-slate-600 border border-slate-300">Free</span>
                  ) : (
                    currentSubscription.status === 'Pending' ? (
                      <span className="px-2 py-0.5 rounded text-xs font-bold bg-yellow-100 text-yellow-700 border border-yellow-200">Pending</span>
                    ) : (
                      <span className={`px-2 py-0.5 rounded text-xs font-bold border uppercase tracking-wider bg-${currentSubscription.packages?.color || 'primary'}-100 text-${currentSubscription.packages?.color || 'primary'}-700 border-${currentSubscription.packages?.color || 'primary'}-200 dark:bg-${currentSubscription.packages?.color || 'primary'}-900/30 dark:text-${currentSubscription.packages?.color || 'primary'}-400 dark:border-${currentSubscription.packages?.color || 'primary'}-800`}>
                        {currentSubscription.packages?.name || currentSubscription.package_id}
                      </span>
                    )
                  )}
                </div>
              </h1>
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
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
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-100 text-yellow-700 border border-yellow-200">Pending</span>
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
                        onClick={onLogout}
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

          {/* Content Viewport */}
          <div className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-950 p-4 sm:p-6 lg:p-8">
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
        />
      </div>
    </div>

  );
};

export default Layout;