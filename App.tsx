import React, { useEffect, useState, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import { api } from './services/api';
import { User, Workspace } from './types';
import { MOCK_WORKSPACES } from './constants';
import { ThemeProvider } from './context/ThemeContext';
import LoadingSpinner from './components/LoadingSpinner';
import ChunkErrorBoundary from './components/ChunkErrorBoundary';
import EmailVerificationModal from './components/EmailVerificationModal';

// Public Pages - Load immediately (small, needed for initial render)
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Features from './pages/Features';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import GdprPolicy from './pages/GdprPolicy';
import RefundPolicy from './pages/RefundPolicy';
import AffiliatePolicy from './pages/AffiliatePolicy';

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
const OrderTracking = lazy(() => import('./pages/OrderTracking'));
const Forms = lazy(() => import('./pages/Forms'));
const Store = lazy(() => import('./pages/Store'));
const StoreView = lazy(() => import('./pages/StoreView'));
const SubscriptionPlans = lazy(() => import('./pages/SubscriptionPlans'));
const Orders = lazy(() => import('./pages/Orders'));

// Admin Pages - Lazy load (rarely accessed)
const SystemSettings = lazy(() => import('./pages/SystemSettings'));
const UsersPage = lazy(() => import('./pages/Users'));
const AdminSubscriptions = lazy(() => import('./pages/AdminSubscriptions'));
const AdminPackageSettings = lazy(() => import('./pages/AdminPackageSettings'));

// Webview Pages - Lazy load (for Messenger webview)
const WebviewProduct = lazy(() => import('./pages/WebviewProduct'));
const WebviewUpsell = lazy(() => import('./pages/WebviewUpsell'));
const WebviewDownsell = lazy(() => import('./pages/WebviewDownsell'));
const WebviewCart = lazy(() => import('./pages/WebviewCart'));
const WebviewCheckout = lazy(() => import('./pages/WebviewCheckout'));
const WebviewForm = lazy(() => import('./pages/WebviewForm'));

// Preview Pages - For live configuration preview
const UpsellPreview = lazy(() => import('./pages/UpsellPreview'));
const DownsellPreview = lazy(() => import('./pages/DownsellPreview'));
const ProductPreview = lazy(() => import('./pages/ProductPreview'));
const ProductWebviewPreview = lazy(() => import('./pages/ProductWebviewPreview'));
const CheckoutPreview = lazy(() => import('./pages/CheckoutPreview'));


const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [showVerificationModal, setShowVerificationModal] = useState(false);

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
          } else {
            // Create a default workspace in the database if none exist
            try {
              const newWorkspace = await api.workspace.create(`${existingUser.name}'s Workspace`, existingUser.id);
              setWorkspaces([newWorkspace]);
              setCurrentWorkspace(newWorkspace);
            } catch (wsError) {
              console.error('Failed to create workspace:', wsError);
            }
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
        // Create a default workspace in the database if none exist
        try {
          const newWorkspace = await api.workspace.create(`${u.name}'s Workspace`, u.id);
          setWorkspaces([newWorkspace]);
          setCurrentWorkspace(newWorkspace);
        } catch (wsError) {
          console.error('Failed to create workspace:', wsError);
          // Last resort fallback (shouldn't normally reach here)
          const fallbackWs = { id: 'fallback-' + Date.now(), name: 'My Workspace', ownerId: u.id };
          setWorkspaces([fallbackWs]);
          setCurrentWorkspace(fallbackWs);
        }
      }
    } catch (error) {
      console.error('Failed to load workspaces:', error);
      // Try to create a workspace even if list fails
      try {
        const newWorkspace = await api.workspace.create(`${u.name}'s Workspace`, u.id);
        setWorkspaces([newWorkspace]);
        setCurrentWorkspace(newWorkspace);
      } catch (wsError) {
        console.error('Failed to create workspace:', wsError);
        const fallbackWs = { id: 'fallback-' + Date.now(), name: 'My Workspace', ownerId: u.id };
        setWorkspaces([fallbackWs]);
        setCurrentWorkspace(fallbackWs);
      }
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

  // Show verification modal when user is not verified
  useEffect(() => {
    if (user && !user.isEmailVerified) {
      setShowVerificationModal(true);
    } else {
      setShowVerificationModal(false);
    }
  }, [user]);

  // Refresh user data to check verification status
  const handleRefreshUser = async () => {
    try {
      const refreshedUser = await api.auth.getSession();
      if (refreshedUser) {
        setUser(refreshedUser);
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
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
          <Route path="/features" element={<Features />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms-of-service" element={<TermsOfService />} />
          <Route path="/gdpr-policy" element={<GdprPolicy />} />
          <Route path="/refund-policy" element={<RefundPolicy />} />
          <Route path="/affiliate-policy" element={<AffiliatePolicy />} />

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

          {/* Public Order Tracking - No login required */}
          <Route path="/track/:submissionId" element={
            <Suspense fallback={<LoadingSpinner />}>
              <OrderTracking />
            </Suspense>
          } />

          {/* Public Store View - No login required */}
          <Route path="/store/:slug" element={
            <Suspense fallback={<LoadingSpinner />}>
              <StoreView />
            </Suspense>
          } />

          {/* Webview Pages - For Messenger webview, no login required */}
          <Route path="/wv/product/:sessionId" element={
            <Suspense fallback={<LoadingSpinner />}>
              <WebviewProduct />
            </Suspense>
          } />
          <Route path="/wv/upsell/:sessionId" element={
            <Suspense fallback={<LoadingSpinner />}>
              <WebviewUpsell />
            </Suspense>
          } />
          <Route path="/wv/downsell/:sessionId" element={
            <Suspense fallback={<LoadingSpinner />}>
              <WebviewDownsell />
            </Suspense>
          } />
          <Route path="/wv/cart/:sessionId" element={
            <Suspense fallback={<LoadingSpinner />}>
              <WebviewCart />
            </Suspense>
          } />
          <Route path="/wv/form/:sessionId" element={
            <Suspense fallback={<LoadingSpinner />}>
              <WebviewForm />
            </Suspense>
          } />
          <Route path="/wv/checkout/:sessionId" element={
            <Suspense fallback={<LoadingSpinner />}>
              <WebviewCheckout />
            </Suspense>
          } />

          {/* Preview Pages - For live configuration preview */}
          <Route path="/upsell-preview" element={
            <Suspense fallback={<LoadingSpinner />}>
              <UpsellPreview />
            </Suspense>
          } />
          <Route path="/downsell-preview" element={
            <Suspense fallback={<LoadingSpinner />}>
              <DownsellPreview />
            </Suspense>
          } />
          <Route path="/product-preview" element={
            <Suspense fallback={<LoadingSpinner />}>
              <ProductPreview />
            </Suspense>
          } />
          <Route path="/product-webview-preview" element={
            <Suspense fallback={<LoadingSpinner />}>
              <ProductWebviewPreview />
            </Suspense>
          } />
          <Route path="/checkout/preview" element={
            <Suspense fallback={<LoadingSpinner />}>
              <CheckoutPreview />
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
                {/* Email Verification Modal - Shows when user is not verified */}
                <EmailVerificationModal
                  isOpen={showVerificationModal}
                  userEmail={user.email}
                  onClose={() => setShowVerificationModal(false)}
                  onRefresh={handleRefreshUser}
                />
                <ChunkErrorBoundary>
                  <Suspense fallback={<LoadingSpinner />}>
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
                      <Route path="/store" element={<Store workspace={currentWorkspace} />} />
                      <Route path="/orders" element={<Orders workspace={currentWorkspace} />} />
                      <Route path="/packages" element={<SubscriptionPlans />} />

                      {/* Admin Only Routes */}
                      <Route path="/users" element={<UsersPage user={user} />} />
                      <Route path="/system-settings" element={<SystemSettings user={user} />} />
                      <Route path="/admin/subscriptions" element={<AdminSubscriptions />} />
                      <Route path="/admin/packages" element={<AdminPackageSettings />} />

                      {/* Redirect root in app context to dashboard */}
                      <Route path="/" element={<Navigate to="/dashboard" replace />} />
                      {/* Redirect legacy route */}
                      <Route path="/api-keys" element={<Navigate to="/settings" replace />} />
                    </Routes>
                  </Suspense>
                </ChunkErrorBoundary>
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