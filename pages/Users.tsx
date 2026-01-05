import React, { useEffect, useState } from 'react';
import { User, UserRole } from '../types';
import { api } from '../services/api';
import { Search, Shield, User as UserIcon, Trash2, Edit2, ShieldAlert, Plus, X, CheckSquare, Square, Lock } from 'lucide-react';

interface UsersPageProps {
  user: User;
}

// Mock feature list based on sidebar items
const AVAILABLE_FEATURES = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'connections', label: 'Connections' },
  { id: 'subscribers', label: 'Subscribers' },
  { id: 'inbox', label: 'Inbox' },
  { id: 'flows', label: 'Flows' },
  { id: 'scheduler', label: 'Scheduler' },
  { id: 'settings', label: 'Settings' },
  { id: 'affiliates', label: 'Affiliates' },
  { id: 'academy', label: 'Academy' },
  { id: 'forms', label: 'Forms' },
  { id: 'store', label: 'Store' },
  { id: 'support', label: 'Support' },
];

const UsersPage: React.FC<UsersPageProps> = ({ user }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New User Form State
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: UserRole.MEMBER, // Default
    features: [] as string[]
  });

  useEffect(() => {
    // Basic RBAC check
    if (user.role !== UserRole.ADMIN && user.role !== UserRole.OWNER) return;

    const loadUsers = async () => {
      setLoading(true);
      // In a real app, this would be a specific admin endpoint
      const data = await api.admin.getUsers();
      // Mocking added feature field if not present
      const usersWithFeatures = data.map((u: any) => ({
        ...u,
        features: u.features || AVAILABLE_FEATURES.map(f => f.id) // Default existing users to have all features
      }));
      setUsers(usersWithFeatures);
      setLoading(false);
    };
    loadUsers();
  }, [user]);

  // Handle Role Change to preset features
  const handleRoleChange = (role: UserRole) => {
    let features: string[] = [];
    if (role === UserRole.ADMIN || role === UserRole.OWNER) {
      features = AVAILABLE_FEATURES.map(f => f.id);
    } else if (role === UserRole.MEMBER) { // Member gets limited access
      features = ['dashboard', 'academy'];
    } else {
      // Editor default
      features = ['dashboard', 'connections', 'subscribers', 'inbox', 'flows', 'forms', 'store'];
    }
    setNewUser(prev => ({ ...prev, role, features }));
  };

  const toggleFeature = (featureId: string) => {
    setNewUser(prev => {
      const isSelected = prev.features.includes(featureId);
      if (isSelected) {
        return { ...prev, features: prev.features.filter(f => f !== featureId) };
      } else {
        return { ...prev, features: [...prev.features, featureId] };
      }
    });
  };

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    const id = (Math.random() * 10000).toString();
    const userToAdd: any = {
      id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      avatarUrl: '',
      features: newUser.features
    };

    setUsers([...users, userToAdd]);
    setIsAddModalOpen(false);
    // Reset form
    setNewUser({
      name: '',
      email: '',
      password: '',
      role: UserRole.MEMBER,
      features: []
    });
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
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors shadow-lg shadow-primary-500/25"
        >
          <Plus className="w-4 h-4" />
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
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Access Count</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500"></div>
                    </div>
                  </td>
                </tr>
              ) : users.map((u: any) => (
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
                    <span className="inline-flex px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-900/50">
                      Active
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                    {u.role === UserRole.ADMIN ? 'All Access' : `${u.features?.length || 0} Features`}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button className="p-2 text-slate-500 hover:text-primary-600 hover:bg-primary-50 dark:text-slate-400 dark:hover:text-primary-400 dark:hover:bg-primary-900/30 rounded-lg transition-colors" title="Edit User">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:text-slate-400 dark:hover:text-red-400 dark:hover:bg-red-900/30 rounded-lg transition-colors" title="Delete User">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
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
                Add New User
              </h2>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleAddUser} className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* User Details */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Account Details</h3>
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
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                      value={newUser.email}
                      onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="password"
                        required
                        className="w-full pl-9 pr-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                        value={newUser.password}
                        onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Role</label>
                    <select
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                      value={newUser.role}
                      onChange={e => handleRoleChange(e.target.value as any)}
                    >
                      <option value={UserRole.ADMIN}>Admin (Full Access)</option>
                      <option value={UserRole.MEMBER}>Member</option>
                      <option value="VIEWER">Viewer</option>
                      <option value="SUPPORT">Support</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Feature Permissions */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Feature Permissions</h3>
                  <button
                    type="button"
                    onClick={() => setNewUser(prev => ({ ...prev, features: AVAILABLE_FEATURES.map(f => f.id) }))}
                    className="text-xs text-primary-600 hover:text-primary-700 font-medium hover:underline"
                  >
                    Select All
                  </button>
                </div>
                <div className="bg-slate-50 dark:bg-slate-950/50 rounded-xl p-4 border border-slate-200 dark:border-slate-800">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {AVAILABLE_FEATURES.map(feature => {
                      const isSelected = newUser.features.includes(feature.id);
                      return (
                        <div
                          key={feature.id}
                          onClick={() => toggleFeature(feature.id)}
                          className={`
                                                flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all select-none
                                                ${isSelected
                              ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'}
                                            `}
                        >
                          <div className={`
                                                w-5 h-5 rounded flex items-center justify-center border transition-colors
                                                ${isSelected
                              ? 'bg-primary-600 border-primary-600 text-white'
                              : 'bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-600'}
                                            `}>
                            {isSelected && <CheckSquare className="w-3.5 h-3.5" />}
                          </div>
                          <span className={`text-sm font-medium ${isSelected ? 'text-primary-900 dark:text-primary-100' : 'text-slate-700 dark:text-slate-300'}`}>
                            {feature.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <p className="text-xs text-slate-500">
                  Adjusting roles will preset these permissions. You can customize them individually for granular control.
                </p>
              </div>

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
                onClick={handleAddUser}
                className="flex-1 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors font-medium shadow-lg shadow-primary-500/25"
              >
                Create User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersPage;