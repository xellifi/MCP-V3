import React, { useEffect, useState, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import { api } from './services/api';
import { User, Workspace } from './types';
import { MOCK_WORKSPACES } from './constants';
import { ThemeProvider } from './context/ThemeContext';
import LoadingSpinner from './components/LoadingSpinner';

// Public Pages - Load immediately (small, needed for initial render)
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';

// App Pages - Lazy load (only load when route is accessed)
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Connections = lazy(() => import('./pages/Connections'));
const ConnectedPages = lazy(() => import('./pages/ConnectedPages'));
const Flows = lazy(() => import('./pages/Flows'));
const FlowBuilder = lazy(() => import('./pages/FlowBuilder'));
const ScheduledPosts = lazy(() => import('./pages/ScheduledPosts'));
const Subscribers = lazy(() => import('./pages/Subscribers'));
const Inbox = lazy(() => import('./pages/Inbox'));
const Settings = lazy(() => import('./pages/Settings'));
const Affiliates = lazy(() => import('./pages/Affiliates'));
const Support = lazy(() => import('./pages/Support'));
const Academy = lazy(() => import('./pages/Academy'));
const FormView = lazy(() => import('./pages/FormView'));
const InvoiceView = lazy(() => import('./pages/InvoiceView'));
const Forms = lazy(() => import('./pages/Forms'));

// Admin Pages - Lazy load (rarely accessed)
const SystemSettings = lazy(() => import('./pages/SystemSettings'));
const UsersPage = lazy(() => import('./pages/Users'));

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
    try {
      await api.auth.logout();
      setUser(null);
      setWorkspaces([]);
      setCurrentWorkspace(null);
      // Clear any cached data
      localStorage.clear();
      sessionStorage.clear();
      // Force full page reload to clear all state
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout failed:', error);
      // Force logout even if API call fails
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/login';
    }
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
          <Route path="/login" element={<Login onLogin={handleLogin} />} />
          <Route path="/register" element={<Register onLogin={handleLogin} />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* Public Form View - No login required */}
          <Route path="/forms/:formId" element={
            <Suspense fallback={<LoadingSpinner />}>
              <FormView />
            </Suspense>
          } />

          {/* Public Invoice View - No login required */}
          <Route path="/invoices/:submissionId" element={
            <Suspense fallback={<LoadingSpinner />}>
              <InvoiceView />
            </Suspense>
          } />

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
                  <Route path="/academy" element={<Academy user={user} />} />
                  <Route path="/forms-manager" element={<Forms workspace={currentWorkspace} />} />

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