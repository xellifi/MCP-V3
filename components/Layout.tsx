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
  ChevronDown
} from 'lucide-react';
import { User, Workspace, UserRole } from '../types';
import { api } from '../services/api';
import { useTheme } from '../context/ThemeContext';

interface LayoutProps {
  children: React.ReactNode;
  user: User;
  workspaces: Workspace[];
  currentWorkspace: Workspace;
  onWorkspaceChange: (id: string) => void;
  onLogout: () => void;
}

// Map of all available nav items
const ALL_NAV_ITEMS: Record<string, { icon: any, label: string }> = {
  '/': { icon: LayoutDashboard, label: 'Dashboard' },
  '/connections': { icon: LinkIcon, label: 'Connections' },
  '/connected-pages': { icon: Layers, label: 'Pages' },
  '/subscribers': { icon: Users, label: 'Subscribers' },
  '/messages': { icon: MessageSquare, label: 'Inbox' },
  '/flows': { icon: Workflow, label: 'Flows' },
  '/scheduled': { icon: CalendarDays, label: 'Posts' },
  '/settings': { icon: Sliders, label: 'Settings' },
  '/affiliates': { icon: Banknote, label: 'Affiliates' },
  '/support': { icon: LifeBuoy, label: 'Support' },
  // Backward compatibility maps
  '/api-keys': { icon: Sliders, label: 'Settings' }
};

const DEFAULT_ORDER = ['/', '/connections', '/connected-pages', '/subscribers', '/messages', '/flows', '/scheduled', '/settings', '/affiliates', '/support'];

const Layout: React.FC<LayoutProps> = ({
  children,
  user,
  workspaces,
  currentWorkspace,
  onWorkspaceChange,
  onLogout
}) => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [menuOrder, setMenuOrder] = useState<string[]>(DEFAULT_ORDER);
  const [affiliateEnabled, setAffiliateEnabled] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme, isDark } = useTheme();

  const toggleSidebar = () => setSidebarOpen(!isSidebarOpen);
  const isAdminOrOwner = user.role === UserRole.ADMIN || user.role === UserRole.OWNER;

  // Get current page title
  const getCurrentPageTitle = () => {
    const path = location.pathname;
    if (path === '/dashboard' || path === '/') return 'Dashboard';
    const item = ALL_NAV_ITEMS[path];
    if (item) return item.label;
    if (path.startsWith('/flows/')) return 'Flow Builder';
    if (path === '/users') return 'Users';
    if (path === '/system-settings') return 'System Settings';
    return 'Mychat Pilot';
  };

  useEffect(() => {
    // Fetch menu sequence settings
    const loadMenuSettings = async () => {
      try {
        const settings = await api.admin.getSettings();
        setAffiliateEnabled(!!settings.affiliateEnabled);

        if (settings.menuSequence && settings.menuSequence.length > 0) {
          // Robustness: If the saved settings are old and missing new items (like connected-pages or affiliates), append them
          const savedOrder = settings.menuSequence;

          // Remap old 'api-keys' to 'settings' if it exists
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
  }, []);

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

  const NavItem: React.FC<{ to: string, icon: any, label: string }> = ({ to, icon: Icon, label }) => (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors mb-1 ${isActive
          ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20'
          : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
        }`
      }
      onClick={() => setSidebarOpen(false)}
    >
      <Icon className="w-5 h-5" />
      <span className="font-medium">{label}</span>
    </NavLink>
  );

  return (
    <div className={`h-screen flex overflow-hidden ${isDark ? 'bg-slate-950' : 'bg-slate-100'}`}>
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-72 bg-slate-900 border-r border-slate-800 transform transition-transform duration-300 ease-in-out lg:transform-none flex flex-col shadow-2xl lg:shadow-none ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
        <div className="h-16 flex items-center px-6 border-b border-slate-800 flex-shrink-0">
          <Bot className="w-8 h-8 text-blue-500 mr-3" />
          <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 text-transparent bg-clip-text">
            Mychat Pilot
          </span>
          <button
            className="ml-auto lg:hidden text-slate-400 hover:text-slate-200"
            onClick={toggleSidebar}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Workspace Selector */}
        <div className="p-4 flex-shrink-0">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block px-1">
            Workspace
          </label>
          <div className="relative">
            <select
              className="w-full appearance-none bg-slate-950 border border-slate-800 text-slate-200 text-sm font-medium rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 block p-3 pr-8 transition-shadow cursor-pointer hover:border-slate-700"
              value={currentWorkspace.id}
              onChange={(e) => onWorkspaceChange(e.target.value)}
            >
              {workspaces.map(ws => (
                <option key={ws.id} value={ws.id}>{ws.name}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
              </svg>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto py-2">
          {/* Dynamic Menu Items */}
          {menuOrder.map(path => {
            // Handle the dashboard path specifically if needed, but here maps directly
            let renderPath = path;
            if (path === '/') renderPath = '/dashboard';

            // Hide affiliate menu if not enabled and user is not admin
            if (path === '/affiliates' && !affiliateEnabled && !isAdminOrOwner) {
              return null;
            }

            // Hide User Settings page for Admins/Owners as requested
            if (path === '/settings' && isAdminOrOwner) {
              return null;
            }

            const item = ALL_NAV_ITEMS[path] || ALL_NAV_ITEMS[renderPath];
            if (!item) return null;

            return <NavItem key={path} to={renderPath} icon={item.icon} label={item.label} />;
          })}

          {/* Admin / Owner Section */}
          {isAdminOrOwner && (
            <div className="pt-6">
              <div className="h-px bg-slate-800 mb-6 mx-2"></div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 block px-3">
                System (Admin)
              </label>
              <NavItem to="/users" icon={Users} label="Users" />
              <NavItem to="/system-settings" icon={Shield} label="System Settings" />
            </div>
          )}
        </nav>
      </aside>

      {/* Main Content */}
      <main className={`flex-1 flex flex-col min-w-0 h-full ${isDark ? 'bg-slate-950' : 'bg-slate-100'}`}>
        {/* Desktop Header */}
        <header className={`h-16 border-b flex items-center px-6 justify-between flex-shrink-0 z-20 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
          {/* Left side - Mobile menu + Page title */}
          <div className="flex items-center gap-4">
            <button
              onClick={toggleSidebar}
              className={`p-2 -ml-2 lg:hidden rounded-lg transition-colors ${isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className={`text-xl font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
              {getCurrentPageTitle()}
            </h1>
          </div>

          {/* Right side - Theme toggle + Profile */}
          <div className="flex items-center gap-3">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-lg transition-colors ${isDark
                  ? 'text-slate-400 hover:text-yellow-400 hover:bg-slate-800'
                  : 'text-slate-600 hover:text-amber-500 hover:bg-slate-100'
                }`}
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setProfileDropdownOpen(!profileDropdownOpen);
                }}
                className={`flex items-center gap-2 p-1.5 pr-3 rounded-lg transition-colors ${isDark
                    ? 'hover:bg-slate-800 text-slate-200'
                    : 'hover:bg-slate-100 text-slate-700'
                  }`}
              >
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.name} className="w-8 h-8 rounded-full border border-slate-700" />
                ) : (
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-blue-500 ${isDark ? 'bg-slate-800 border border-slate-700' : 'bg-slate-200 border border-slate-300'
                    }`}>
                    <UserIcon className="w-4 h-4" />
                  </div>
                )}
                <span className="hidden sm:block text-sm font-medium truncate max-w-[120px]">{user.name}</span>
                <ChevronDown className="w-4 h-4 opacity-50" />
              </button>

              {/* Dropdown Menu */}
              {profileDropdownOpen && (
                <div className={`absolute right-0 top-full mt-2 w-64 rounded-xl shadow-xl border overflow-hidden z-50 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                  }`}>
                  <div className={`p-4 border-b ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
                    <p className={`font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{user.name}</p>
                    <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{user.email}</p>
                    <span className={`inline-block mt-2 text-xs font-medium px-2 py-0.5 rounded ${user.role === UserRole.ADMIN || user.role === UserRole.OWNER
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-blue-100 text-blue-700'
                      }`}>
                      {user.role}
                    </span>
                  </div>
                  <div className="p-2">
                    <button
                      onClick={onLogout}
                      className={`flex items-center gap-2 w-full px-3 py-2 text-sm font-medium rounded-lg transition-colors ${isDark
                          ? 'text-red-400 hover:bg-red-950/30'
                          : 'text-red-600 hover:bg-red-50'
                        }`}
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

        {/* Scrollable Content Area */}
        <div className={`flex-1 overflow-auto p-4 md:p-8 relative ${isDark ? 'bg-slate-950' : 'bg-slate-100'}`}>
          <div className="max-w-7xl mx-auto h-full flex flex-col">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Layout;