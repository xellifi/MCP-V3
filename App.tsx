import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import { api } from './services/api';
import { User, Workspace } from './types';
import { MOCK_WORKSPACES } from './constants';
import { ThemeProvider } from './context/ThemeContext';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';

// App Pages
import Dashboard from './pages/Dashboard';
import Connections from './pages/Connections';
import ConnectedPages from './pages/ConnectedPages';
import Flows from './pages/Flows';
import FlowBuilder from './pages/FlowBuilder';
import ScheduledPosts from './pages/ScheduledPosts';
import Subscribers from './pages/Subscribers';
import Inbox from './pages/Inbox';
import Settings from './pages/Settings';
import Affiliates from './pages/Affiliates';
import Support from './pages/Support';

// Admin Pages
import SystemSettings from './pages/SystemSettings';
import UsersPage from './pages/Users';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);

  useEffect(() => {
    // Check for existing Supabase session on app load
    const checkSession = async () => {
      try {
        const existingUser = await api.auth.getSession();
        if (existingUser) {
          setUser(existingUser);
          // Fetch user's workspaces from database
          const userWorkspaces = await api.workspace.list();
          if (userWorkspaces.length > 0) {
            setWorkspaces(userWorkspaces);
            setCurrentWorkspace(userWorkspaces[0]);
          }
        }
      } catch (error) {
        console.error('Session check failed:', error);
      } finally {
        setLoading(false);
      }
    };
    checkSession();
  }, []);

  const handleLogin = async (u: User): Promise<void> => {
    setUser(u);
    // Fetch workspaces from database
    try {
      const userWorkspaces = await api.workspace.list();
      if (userWorkspaces.length > 0) {
        setWorkspaces(userWorkspaces);
        setCurrentWorkspace(userWorkspaces[0]);
      } else {
        // Create a default workspace if none exist
        const defaultWs = { id: 'default', name: 'My Workspace', ownerId: u.id };
        setWorkspaces([defaultWs]);
        setCurrentWorkspace(defaultWs);
      }
    } catch (error) {
      console.error('Failed to load workspaces:', error);
      // Fallback workspace
      const defaultWs = { id: 'default', name: 'My Workspace', ownerId: u.id };
      setWorkspaces([defaultWs]);
      setCurrentWorkspace(defaultWs);
    }
  };

  const handleLogout = async () => {
    await api.auth.logout();
    setUser(null);
    setWorkspaces([]);
    setCurrentWorkspace(null);
  };

  const handleWorkspaceChange = (id: string) => {
    const ws = workspaces.find(w => w.id === id);
    if (ws) setCurrentWorkspace(ws);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <ThemeProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={
            !user ? <Login onLogin={handleLogin} /> : <Navigate to="/dashboard" replace />
          } />
          <Route path="/register" element={
            !user ? <Register onLogin={handleLogin} /> : <Navigate to="/dashboard" replace />
          } />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* Protected Routes */}
          <Route path="*" element={
            user && currentWorkspace ? (
              <Layout
                user={user}
                workspaces={workspaces}
                currentWorkspace={currentWorkspace}
                onWorkspaceChange={handleWorkspaceChange}
                onLogout={handleLogout}
              >
                <Routes>
                  <Route path="/dashboard" element={<Dashboard workspace={currentWorkspace} />} />
                  <Route path="/connections" element={<Connections workspace={currentWorkspace} />} />
                  <Route path="/connected-pages" element={<ConnectedPages workspace={currentWorkspace} />} />
                  <Route path="/subscribers" element={<Subscribers workspace={currentWorkspace} />} />
                  <Route path="/messages" element={<Inbox workspace={currentWorkspace} />} />
                  <Route path="/flows" element={<Flows workspace={currentWorkspace} />} />
                  <Route path="/flows/:id" element={<FlowBuilder workspace={currentWorkspace} />} />
                  <Route path="/scheduled" element={<ScheduledPosts workspace={currentWorkspace} />} />
                  <Route path="/settings" element={<Settings user={user} workspace={currentWorkspace} />} />
                  <Route path="/affiliates" element={<Affiliates user={user} />} />
                  <Route path="/support" element={<Support user={user} workspace={currentWorkspace} />} />

                  {/* Admin Only Routes */}
                  <Route path="/users" element={<UsersPage user={user} />} />
                  <Route path="/system-settings" element={<SystemSettings user={user} />} />

                  {/* Redirect root in app context to dashboard */}
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  {/* Redirect legacy route */}
                  <Route path="/api-keys" element={<Navigate to="/settings" replace />} />
                </Routes>
              </Layout>
            ) : (
              <Navigate to="/login" replace />
            )
          } />
        </Routes>
      </Router>
    </ThemeProvider>
  );
};

export default App;