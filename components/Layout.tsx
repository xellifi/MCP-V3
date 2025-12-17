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
  LifeBuoy
} from 'lucide-react';
import { User, Workspace, UserRole } from '../types';
import { api } from '../services/api';

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
  const navigate = useNavigate();
  const location = useLocation();

  const toggleSidebar = () => setSidebarOpen(!isSidebarOpen);
  const isAdminOrOwner = user.role === UserRole.ADMIN || user.role === UserRole.OWNER;

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
    <div className="h-screen bg-slate-950 flex overflow-hidden">
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

        <div className="p-4 border-t border-slate-800 bg-slate-900/50 flex-shrink-0">
          <div className="flex items-center gap-3 mb-3 px-2">
            <div className="relative">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name} className="w-9 h-9 rounded-full border border-slate-700" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-blue-500 border border-slate-700 shadow-sm">
                  <UserIcon className="w-5 h-5" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-200 truncate">{user.name}</p>
              <p className="text-xs text-slate-500 truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-950/30 px-3 py-2 rounded-lg transition-colors w-full"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 h-full bg-slate-950">
        {/* Mobile Header */}
        <header className="h-16 bg-slate-900 border-b border-slate-800 lg:hidden flex items-center px-4 justify-between flex-shrink-0 z-20 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={toggleSidebar}
              className="p-2 -ml-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>
            <span className="font-bold text-slate-200 truncate max-w-[200px]">{currentWorkspace.name}</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-blue-500 border border-slate-700">
            <UserIcon className="w-5 h-5" />
          </div>
        </header>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-auto p-4 md:p-8 bg-slate-950 relative">
          <div className="max-w-7xl mx-auto h-full flex flex-col">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Layout;