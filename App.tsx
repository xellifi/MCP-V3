import React, { useEffect, useState, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import { api } from './services/api';
import { supabase } from './lib/supabase';
import { User, Workspace, UserRole } from './types';
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
  // Check if we're in the middle of a verification redirect
  const isVerificationRedirect = sessionStorage.getItem('verificationRedirect') === 'true';
  const [loading, setLoading] = useState(true);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [showVerificationModal, setShowVerificationModal] = useState(false);

  useEffect(() => {
    let isInitialLoad = true;

    // Check if this is an email verification callback (URL contains tokens)
    const isEmailVerificationCallback = () => {
      const hash = window.location.hash;
      const search = window.location.search;
      // Supabase confirmation URLs contain access_token in the hash or query params
      // Check for type=signup (email verification) or type=recovery (password reset)
      const hasHashToken = hash.includes('access_token') && (hash.includes('type=signup') || hash.includes('type=email'));
      const hasQueryToken = search.includes('token') || search.includes('type=signup') || search.includes('type=email');
      return hasHashToken || hasQueryToken;
    };

    // Check for existing Supabase session on app load
    const checkSession = async () => {
      try {
        // Check if this is an email verification callback
        const isVerificationCallback = isEmailVerificationCallback();

        // If this is a verification callback, keep loading state to prevent flash
        // Don't set loading to false until we redirect
        if (isVerificationCallback) {
          console.log('Email verification callback detected, syncing status...');
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user?.email_confirmed_at) {
            // Update the profiles table with verified status
            await supabase
              .from('profiles')
              .update({ email_verified: true })
              .eq('id', session.user.id);
            console.log('Email verification synced to profiles table');
          }

          // Store flags for redirect
          sessionStorage.setItem('emailJustVerified', 'true');
          sessionStorage.setItem('verificationRedirect', 'true');
          // Replace URL and redirect
          window.history.replaceState(null, '', '/dashboard');
          window.location.replace('/dashboard');
          return; // Stop further processing
        }

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
        // Clear verification redirect flag once session is established
        sessionStorage.removeItem('verificationRedirect');
      } catch (error) {
        console.error('Session check failed:', error);
        sessionStorage.removeItem('verificationRedirect');
      } finally {
        setLoading(false);
        isInitialLoad = false;
      }
    };
    checkSession();

    // Listen for auth state changes (for session refresh, NOT for initial verification)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email_confirmed_at);

        // Skip during initial load - checkSession handles that
        if (isInitialLoad) {
          console.log('Skipping auth state change during initial load');
          return;
        }

        // Handle user sign-in events AFTER initial load (e.g., login from another tab)
        if (event === 'SIGNED_IN' && session?.user) {
          // Sync email verification status if confirmed (in case it was verified elsewhere)
          if (session.user.email_confirmed_at) {
            try {
              await supabase
                .from('profiles')
                .update({ email_verified: true })
                .eq('id', session.user.id);
            } catch (err) {
              console.error('Failed to sync email verification:', err);
            }
          }

          // Re-initialize the full session (user + workspaces)
          try {
            const refreshedUser = await api.auth.getSession();
            if (refreshedUser) {
              setUser(refreshedUser);

              // Also load workspaces
              const userWorkspaces = await api.workspace.list();
              if (userWorkspaces.length > 0) {
                setWorkspaces(userWorkspaces);
                setCurrentWorkspace(userWorkspaces[0]);
              } else {
                // Create a default workspace if none exist
                try {
                  const newWorkspace = await api.workspace.create(`${refreshedUser.name}'s Workspace`, refreshedUser.id);
                  setWorkspaces([newWorkspace]);
                  setCurrentWorkspace(newWorkspace);
                } catch (wsError) {
                  console.error('Failed to create workspace:', wsError);
                }
              }
              // NOTE: Verification redirect is handled by checkSession via URL hash detection
              // Do NOT redirect here - it would cause infinite loops for already-verified users
            }
          } catch (err) {
            console.error('Failed to refresh session after auth state change:', err);
          }
        }
      }
    );

    return () => subscription.unsubscribe();
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

  // Show verification modal when user is not verified (exclude ADMIN and OWNER)
  useEffect(() => {
    const isAdmin = user?.role === UserRole.ADMIN || user?.role === UserRole.OWNER;
    if (user && !user.isEmailVerified && !isAdmin) {
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

  // Show loading during initial load OR during verification redirect
  if (loading || isVerificationRedirect) {
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