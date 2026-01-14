import React, { useEffect, useState, useRef } from 'react';
import { User, UserRole, Package } from '../types';
import { api } from '../services/api';
import { Search, Shield, User as UserIcon, Trash2, Edit2, ShieldAlert, Plus, X, Lock, UserPlus, MoreHorizontal, Eye, Calendar, CreditCard, Layers, Clock, LogIn } from 'lucide-react';
import { useToast } from '../context/ToastContext';

interface UsersPageProps {
  user: User;
}


const UsersPage: React.FC<UsersPageProps> = ({ user }) => {
  const toast = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Actions dropdown state
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // View profile modal state
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingUser, setViewingUser] = useState<any>(null);
  const [viewingUserData, setViewingUserData] = useState<{
    subscription: any;
    flowsCount: number;
    scheduledCount: number;
  } | null>(null);
  const [loadingUserData, setLoadingUserData] = useState(false);

  // New User Form State
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    packageId: '' // Selected package ID
  });

  // Impersonation state
  const [impersonatingId, setImpersonatingId] = useState<string | null>(null);

  useEffect(() => {
    // Basic RBAC check
    if (user.role !== UserRole.ADMIN && user.role !== UserRole.OWNER) return;

    const loadData = async () => {
      setLoading(true);
      try {
        // Load users, packages, and subscriptions in parallel
        const [usersData, packagesData, subscriptionsData] = await Promise.all([
          api.admin.getUsers(),
          api.admin.getPackages(),
          api.subscriptions.getAll()
        ]);
        setUsers(usersData);
        setPackages(packagesData);
        setSubscriptions(subscriptionsData);
      } catch (error) {
        console.error('Failed to load data:', error);
        toast.error('Failed to load users and packages');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [user]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdownId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle view profile click
  const handleViewClick = async (userToView: User) => {
    setViewingUser(userToView);
    setIsViewModalOpen(true);
    setOpenDropdownId(null);
    setLoadingUserData(true);

    try {
      // Get user's subscription
      const subscriptions = await api.subscriptions.getAll();
      const userSubscription = subscriptions.find(sub => sub.user_id === userToView.id && sub.status === 'Active');

      // Get flows count (we need to find the user's workspace first)
      // For now, we'll show 0 as we don't have direct workspace access per user
      // In a real implementation, you'd query flows by user's workspace
      let flowsCount = 0;
      let scheduledCount = 0;

      // Try to get workspace and counts if available
      try {
        const workspaces = await api.workspace.list();
        const userWorkspace = workspaces.find(w => w.name.toLowerCase().includes(userToView.email.split('@')[0].toLowerCase()));
        if (userWorkspace) {
          const flows = await api.workspace.getFlows(userWorkspace.id);
          flowsCount = flows.length;
          const scheduled = await api.workspace.getScheduledPosts(userWorkspace.id);
          scheduledCount = scheduled.length;
        }
      } catch (e) {
        // Workspace access might be limited, that's okay
        console.log('Could not fetch workspace data for user');
      }

      setViewingUserData({
        subscription: userSubscription || null,
        flowsCount,
        scheduledCount
      });
    } catch (error) {
      console.error('Failed to load user data:', error);
      setViewingUserData(null);
    } finally {
      setLoadingUserData(false);
    }
  };

  const [editingId, setEditingId] = useState<string | null>(null);

  const handleEditClick = async (userToEdit: User) => {
    // Get user's current subscription to find their package
    try {
      const subscriptions = await api.subscriptions.getAll();
      const userSubscription = subscriptions.find(sub => sub.user_id === userToEdit.id);

      setNewUser({
        name: userToEdit.name,
        email: userToEdit.email,
        password: '',
        packageId: userSubscription?.package_id || ''
      });
      setEditingId(userToEdit.id);
      setIsAddModalOpen(true);
    } catch (error) {
      console.error('Failed to load user subscription:', error);
      toast.error('Failed to load user details');
    }
  };

  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);

  const handleDeleteClick = (id: string, name: string) => {
    setDeleteConfirm({ id, name });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;

    try {
      await api.admin.deleteUser(deleteConfirm.id);
      setUsers(users.filter(u => u.id !== deleteConfirm.id));
      toast.success("User deleted successfully");
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to delete user: " + err.message);
    } finally {
      setDeleteConfirm(null);
    }
  };

  // Handle impersonate click
  const handleImpersonate = async (targetUser: User) => {
    if (impersonatingId) return; // Already in progress

    try {
      setImpersonatingId(targetUser.id);
      toast.info(`Generating login link for ${targetUser.name}...`);

      const result = await api.admin.impersonateUser(targetUser.id, user.id);

      if (result.actionLink) {
        // Open the magic link in a new tab
        window.open(result.actionLink, '_blank');
        toast.success(`Opened ${result.userName}'s account in a new tab`);
      } else {
        throw new Error('No action link returned');
      }
    } catch (error: any) {
      console.error('Impersonation error:', error);
      toast.error(error.message || 'Failed to impersonate user');
    } finally {
      setImpersonatingId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newUser.packageId) {
      toast.error("Please select a package");
      return;
    }

    try {
      if (editingId) {
        // UPDATE USER - Update their subscription package
        const subscriptions = await api.subscriptions.getAll();
        const userSubscription = subscriptions.find(sub => sub.user_id === editingId);

        // Update user name
        await api.admin.updateUser(editingId, {
          name: newUser.name
        });

        // Update or create subscription
        if (userSubscription) {
          // For now, we'll create a new subscription (in a real app, you'd update the existing one)
          // This is a limitation of the current API structure
          toast.info("User updated. Note: Subscription updates require manual intervention.");
        }

        // Update local state
        setUsers(users.map(u => u.id === editingId ? { ...u, name: newUser.name } : u));
        toast.success("User updated successfully");
      } else {
        // CREATE USER - Use server-side API to create auth user and subscription
        if (!newUser.password) {
          toast.error("Password is required for new users");
          return;
        }

        const selectedPackage = packages.find(p => p.id === newUser.packageId);
        if (!selectedPackage) {
          toast.error("Selected package not found");
          return;
        }

        // Call server-side endpoint to create user with auth and subscription
        await api.admin.createUser({
          email: newUser.email,
          password: newUser.password,
          name: newUser.name,
          packageId: newUser.packageId
        });

        toast.success(`User created successfully with ${selectedPackage.name} package`);

        // Reload users and subscriptions to show the new user with their plan
        const [updatedUsers, updatedSubs] = await Promise.all([
          api.admin.getUsers(),
          api.subscriptions.getAll()
        ]);
        setUsers(updatedUsers);
        setSubscriptions(updatedSubs);
      }

      setIsAddModalOpen(false);
      setEditingId(null);
      // Reset form
      setNewUser({
        name: '',
        email: '',
        password: '',
        packageId: ''
      });

    } catch (error: any) {
      console.error('Operation failed:', error);
      toast.error("Operation failed: " + error.message);
    }
  };

  if (user.role !== UserRole.ADMIN && user.role !== UserRole.OWNER) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-slate-500">
        <ShieldAlert className="w-12 h-12 mb-4 text-red-500" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Access Denied</h2>
        <p>You do not have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in text-gray-800 dark:text-gray-200">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">User Management</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg">Manage system users and their roles.</p>
        </div>
        <button
          onClick={() => {
            setIsAddModalOpen(true);
            setEditingId(null);
            setNewUser({ name: '', email: '', password: '', packageId: '' });
          }}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors shadow-sm"
        >
          <UserPlus className="w-4 h-4" />
          Add User
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-card dark:shadow-none border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex gap-4 bg-slate-50/50 dark:bg-slate-950/50">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search users..."
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 placeholder-slate-400 dark:placeholder-slate-500 transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-xs uppercase font-bold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Plan</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Access Count</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500"></div>
                    </div>
                  </td>
                </tr>
              ) : users.map((u: any) => {
                // Find user's active subscription
                const userSub = subscriptions.find(sub => sub.user_id === u.id && sub.status === 'Active');
                const planName = userSub?.packages?.name || 'No Plan';
                const planColor = userSub?.packages?.color || 'slate';

                return (
                  <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {u.avatarUrl ? (
                          <img src={u.avatarUrl} alt={u.name} className="w-10 h-10 rounded-full object-cover ring-2 ring-white dark:ring-slate-800" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                            <UserIcon className="w-5 h-5" />
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white">{u.name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${u.role === UserRole.ADMIN
                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border border-purple-200 dark:border-purple-900/50'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                        }`}>
                        {u.role === UserRole.ADMIN && <Shield className="w-3 h-3" />}
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold
                      ${planColor === 'blue' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50' :
                          planColor === 'purple' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border border-purple-200 dark:border-purple-900/50' :
                            planColor === 'amber' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50' :
                              planColor === 'green' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-900/50' :
                                planColor === 'red' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-900/50' :
                                  'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700'}`}>
                        {planName}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-900/50">
                        Active
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                      {u.role === UserRole.ADMIN || u.role === UserRole.OWNER ? 'All Access' : 'Package-based'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        {/* View - Amber/Orange */}
                        <button
                          onClick={() => handleViewClick(u)}
                          className="p-2 text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:text-amber-300 dark:hover:bg-amber-900/20 rounded-lg transition-colors"
                          title="View Profile"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {/* Edit - Green/Success */}
                        <button
                          onClick={() => handleEditClick(u)}
                          className="p-2 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:text-emerald-300 dark:hover:bg-emerald-900/20 rounded-lg transition-colors"
                          title="Edit User"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {/* Impersonate - Blue/Primary (hidden for self) */}
                        {u.id !== user.id && (
                          <button
                            onClick={() => handleImpersonate(u)}
                            disabled={impersonatingId === u.id}
                            className={`p-2 text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-900/20 rounded-lg transition-colors ${impersonatingId === u.id ? 'opacity-50 cursor-wait' : ''}`}
                            title="Login as this user"
                          >
                            <LogIn className="w-4 h-4" />
                          </button>
                        )}
                        {/* Delete - Red/Danger (hidden for protected roles) */}
                        {u.role !== UserRole.OWNER && u.role !== UserRole.ADMIN && u.id !== user.id && (
                          <button
                            onClick={() => handleDeleteClick(u.id, u.name)}
                            className="p-2 text-red-500 hover:text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Delete User"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <UserIcon className="w-6 h-6 text-primary-600" />
                {editingId ? 'Edit User' : 'Add New User'}
              </h2>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* User Details */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Account Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Full Name</label>
                    <input
                      type="text"
                      required
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                      value={newUser.name}
                      onChange={e => setNewUser({ ...newUser, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Email Address</label>
                    <input
                      type="email"
                      required
                      disabled={!!editingId}
                      className={`w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none ${editingId ? 'opacity-50 cursor-not-allowed' : ''}`}
                      value={newUser.email}
                      onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      {editingId ? 'New Password (Optional)' : 'Password'}
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="password"
                        required={!editingId}
                        className="w-full pl-9 pr-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                        value={newUser.password}
                        onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                        placeholder={editingId ? "Leave blank to keep current" : ""}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Subscription Package</label>
                    <select
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                      value={newUser.packageId}
                      onChange={e => setNewUser({ ...newUser, packageId: e.target.value })}
                      required
                    >
                      <option value="">Select a package...</option>
                      {packages.map(pkg => (
                        <option key={pkg.id} value={pkg.id}>
                          {pkg.name} - ${pkg.priceMonthly}/{pkg.currency} monthly
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Package Details */}
              {newUser.packageId && (() => {
                const selectedPackage = packages.find(p => p.id === newUser.packageId);
                if (!selectedPackage) return null;

                return (
                  <div className="space-y-2">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Package Details</h3>
                    <div className="bg-slate-50 dark:bg-slate-950/50 rounded-xl p-4 border border-slate-200 dark:border-slate-800">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Package:</span>
                          <span className={`px-3 py-1 rounded-full text-xs font-bold bg-${selectedPackage.color}-100 text-${selectedPackage.color}-700 dark:bg-${selectedPackage.color}-900/30 dark:text-${selectedPackage.color}-400`}>
                            {selectedPackage.name}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Price:</span>
                          <span className="text-sm text-slate-900 dark:text-white font-semibold">
                            ${selectedPackage.priceMonthly}/{selectedPackage.currency} monthly
                          </span>
                        </div>
                        {selectedPackage.features && selectedPackage.features.length > 0 && (
                          <div>
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-2">Features:</span>
                            <ul className="space-y-1">
                              {selectedPackage.features.map((feature, idx) => (
                                <li key={idx} className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2">
                                  <span className="w-1.5 h-1.5 rounded-full bg-primary-500"></span>
                                  {feature}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {selectedPackage.allowedRoutes && selectedPackage.allowedRoutes.length > 0 && (
                          <div>
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-2">Allowed Pages:</span>
                            <div className="flex flex-wrap gap-1">
                              {selectedPackage.allowedRoutes.map((route, idx) => (
                                <span key={idx} className="px-2 py-1 bg-slate-200 dark:bg-slate-800 rounded text-xs text-slate-700 dark:text-slate-300">
                                  {route}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}

            </form>

            <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 flex gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="flex-1 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors font-medium shadow-lg shadow-primary-500/25"
              >
                {editingId ? 'Update User' : 'Create User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Delete User</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">This action cannot be undone</p>
                </div>
              </div>

              <p className="text-slate-700 dark:text-slate-300">
                Are you sure you want to delete user <span className="font-semibold text-slate-900 dark:text-white">"{deleteConfirm.name}"</span>? All their data will be permanently removed.
              </p>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-medium shadow-lg shadow-red-500/25"
                >
                  Delete User
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Profile Modal */}
      {isViewModalOpen && viewingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Eye className="w-6 h-6 text-primary-600" />
                User Profile
              </h2>
              <button
                onClick={() => { setIsViewModalOpen(false); setViewingUser(null); setViewingUserData(null); }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* User Info */}
              <div className="flex items-center gap-4">
                {viewingUser.avatarUrl ? (
                  <img src={viewingUser.avatarUrl} alt={viewingUser.name} className="w-16 h-16 rounded-full object-cover ring-4 ring-white dark:ring-slate-800 shadow-lg" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center text-white text-xl font-bold shadow-lg">
                    {viewingUser.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">{viewingUser.name}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{viewingUser.email}</p>
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold mt-1 ${viewingUser.role === UserRole.ADMIN
                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                    : viewingUser.role === UserRole.OWNER
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    }`}>
                    {viewingUser.role === UserRole.ADMIN && <Shield className="w-3 h-3" />}
                    {viewingUser.role}
                  </span>
                </div>
              </div>

              {/* Details Grid */}
              {loadingUserData ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {/* Created At */}
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1">
                      <Calendar className="w-4 h-4" />
                      <span className="text-xs font-medium uppercase">Created At</span>
                    </div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      {viewingUser.createdAt ? new Date(viewingUser.createdAt).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>

                  {/* Expires At */}
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1">
                      <Clock className="w-4 h-4" />
                      <span className="text-xs font-medium uppercase">Expires At</span>
                    </div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      {viewingUserData?.subscription?.next_billing_date
                        ? new Date(viewingUserData.subscription.next_billing_date).toLocaleDateString()
                        : 'N/A'}
                    </p>
                  </div>

                  {/* Mode of Payment */}
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1">
                      <CreditCard className="w-4 h-4" />
                      <span className="text-xs font-medium uppercase">Payment Method</span>
                    </div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      {viewingUserData?.subscription?.payment_method || viewingUserData?.subscription?.billing_cycle || 'N/A'}
                    </p>
                  </div>

                  {/* Plan */}
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1">
                      <Layers className="w-4 h-4" />
                      <span className="text-xs font-medium uppercase">Plan</span>
                    </div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      {viewingUserData?.subscription?.packages?.name || 'No Active Plan'}
                    </p>
                  </div>

                  {/* Flows Created */}
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1">
                      <Layers className="w-4 h-4" />
                      <span className="text-xs font-medium uppercase">Flows Created</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">
                      {viewingUserData?.flowsCount || 0}
                    </p>
                  </div>

                  {/* Scheduled Posts */}
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1">
                      <Calendar className="w-4 h-4" />
                      <span className="text-xs font-medium uppercase">Scheduled Posts</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">
                      {viewingUserData?.scheduledCount || 0}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 flex gap-3">
              <button
                onClick={() => { setIsViewModalOpen(false); handleEditClick(viewingUser); }}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors font-medium shadow-lg shadow-primary-500/25"
              >
                <Edit2 className="w-4 h-4" />
                Edit User
              </button>
              {viewingUser.role !== UserRole.OWNER && viewingUser.role !== UserRole.ADMIN && viewingUser.id !== user.id && (
                <button
                  onClick={() => { setIsViewModalOpen(false); handleDeleteClick(viewingUser.id, viewingUser.name); }}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-medium shadow-lg shadow-red-500/25"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete User
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersPage;