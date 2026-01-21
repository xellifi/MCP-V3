import React, { useState, useEffect, useRef } from 'react';
import { X, User, Mail, Lock, Camera, Loader2, Upload } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { api } from '../services/api';
import { User as UserType } from '../types';

interface ProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: UserType;
    onUpdate: () => void; // Trigger a refresh of user data
}

const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, user, onUpdate }) => {
    const { isDark } = useTheme();
    const toast = useToast();
    const [loading, setLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        avatarUrl: '',
        password: '',
        confirmPassword: ''
    });

    const [uploading, setUploading] = useState(false);
    const [avatarMethod, setAvatarMethod] = useState<'upload' | 'url'>('upload');

    useEffect(() => {
        if (isOpen && user) {
            setFormData({
                name: user.name || '',
                email: user.email || '',
                avatarUrl: user.avatarUrl || '',
                password: '',
                confirmPassword: ''
            });
        }
    }, [isOpen, user]);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type and size
        const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            toast.error('Invalid file type. Please upload PNG, JPEG, GIF, or WebP.');
            return;
        }

        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            toast.error('File too large. Maximum size is 5MB.');
            return;
        }

        setUploading(true);
        try {
            const publicUrl = await api.auth.uploadAvatar(user.id, file);
            setFormData(prev => ({ ...prev, avatarUrl: publicUrl }));
            toast.success('Avatar uploaded successfully');
        } catch (error: any) {
            console.error('Upload avatar error:', error);
            toast.error(error.message || 'Failed to upload avatar');
        } finally {
            setUploading(false);
            // Reset input so same file can be selected again if needed
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (formData.password && formData.password !== formData.confirmPassword) {
            toast.error("Passwords don't match");
            return;
        }

        setLoading(true);
        try {
            // Only send email if it was actually changed
            const emailChanged = formData.email !== user.email;

            await api.auth.updateProfile(user.id, {
                name: formData.name,
                email: emailChanged ? formData.email : undefined,
                avatarUrl: formData.avatarUrl,
                password: formData.password || undefined
            });

            toast.success('Profile updated successfully');

            // Wait 2 seconds before closing to let user see the toast
            setTimeout(() => {
                onUpdate(); // Refresh parent state
                onClose();
                setLoading(false); // Only stop loading after the action is complete
            }, 2000);
        } catch (error: any) {
            console.error('Update profile error:', error);
            toast.error(error.message || 'Failed to update profile');
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div
                className={`w-full max-w-md rounded-2xl shadow-2xl transform transition-all scale-100 ${isDark ? 'bg-slate-900 border border-slate-800' : 'bg-white'
                    }`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
                    <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        Edit Profile
                    </h2>
                    <button
                        onClick={onClose}
                        className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'
                            }`}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Avatar Section */}
                    <div className="flex flex-col items-center mb-6">
                        <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1 mb-4">
                            <button
                                type="button"
                                onClick={() => setAvatarMethod('upload')}
                                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${avatarMethod === 'upload'
                                    ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400'
                                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                                    }`}
                            >
                                Upload Image
                            </button>
                            <button
                                type="button"
                                onClick={() => setAvatarMethod('url')}
                                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${avatarMethod === 'url'
                                    ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400'
                                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                                    }`}
                            >
                                Image URL
                            </button>
                        </div>

                        {avatarMethod === 'upload' ? (
                            <>
                                <div
                                    className="relative group cursor-pointer"
                                    onClick={() => !uploading && fileInputRef.current?.click()}
                                >
                                    {formData.avatarUrl ? (
                                        <img
                                            src={formData.avatarUrl}
                                            alt="Profile"
                                            className={`w-24 h-24 rounded-full object-cover border-4 transition-opacity ${isDark ? 'border-slate-700' : 'border-slate-200'
                                                } ${uploading ? 'opacity-50' : 'opacity-100'}`}
                                        />
                                    ) : (
                                        <div className={`w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-3xl font-bold border-4 ${isDark ? 'border-slate-700' : 'border-slate-200'
                                            } ${uploading ? 'opacity-50' : 'opacity-100'}`}>
                                            {formData.name.charAt(0)}
                                        </div>
                                    )}

                                    {/* Overlay for "upload" hint */}
                                    <div className={`absolute inset-0 bg-black/40 rounded-full flex items-center justify-center transition-opacity ${uploading ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                                        }`}>
                                        {uploading ? (
                                            <Loader2 className="w-8 h-8 text-white animate-spin" />
                                        ) : (
                                            <Camera className="w-8 h-8 text-white" />
                                        )}
                                    </div>

                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleFileSelect}
                                        disabled={uploading}
                                    />
                                </div>
                                <p className={`text-xs mt-2 font-medium cursor-pointer hover:underline ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}
                                    onClick={() => !uploading && fileInputRef.current?.click()}
                                >
                                    {uploading ? 'Uploading...' : 'Click to upload new logo'}
                                </p>
                            </>
                        ) : (
                            <div className="w-full">
                                <div className="flex justify-center mb-4">
                                    {formData.avatarUrl ? (
                                        <img
                                            src={formData.avatarUrl}
                                            alt="Profile"
                                            className={`w-24 h-24 rounded-full object-cover border-4 ${isDark ? 'border-slate-700' : 'border-slate-200'}`}
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.name)}&background=6366f1&color=fff`;
                                            }}
                                        />
                                    ) : (
                                        <div className={`w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-3xl font-bold border-4 ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                                            {formData.name.charAt(0)}
                                        </div>
                                    )}
                                </div>

                                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                    Avatar URL
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Camera className="w-5 h-5 text-slate-400" />
                                    </div>
                                    <input
                                        type="url"
                                        value={formData.avatarUrl}
                                        onChange={(e) => setFormData({ ...formData, avatarUrl: e.target.value })}
                                        className={`block w-full pl-10 pr-3 py-2.5 rounded-xl border-2 transition-colors focus:ring-0 ${isDark
                                            ? 'bg-slate-950 border-slate-800 text-white focus:border-indigo-500'
                                            : 'bg-white border-slate-200 text-slate-900 focus:border-indigo-500'
                                            }`}
                                        placeholder="https://example.com/avatar.jpg"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="space-y-4">
                        {/* Name */}
                        <div>
                            <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                Full Name
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <User className="w-5 h-5 text-slate-400" />
                                </div>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className={`block w-full pl-10 pr-3 py-2.5 rounded-xl border-2 transition-colors focus:ring-0 ${isDark
                                        ? 'bg-slate-950 border-slate-800 text-white focus:border-indigo-500'
                                        : 'bg-white border-slate-200 text-slate-900 focus:border-indigo-500'
                                        }`}
                                    placeholder="John Doe"
                                />
                            </div>
                        </div>

                        {/* Email */}
                        <div>
                            <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                Email Address
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Mail className="w-5 h-5 text-slate-400" />
                                </div>
                                <input
                                    type="email"
                                    required
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className={`block w-full pl-10 pr-3 py-2.5 rounded-xl border-2 transition-colors focus:ring-0 ${isDark
                                        ? 'bg-slate-950 border-slate-800 text-white focus:border-indigo-500'
                                        : 'bg-white border-slate-200 text-slate-900 focus:border-indigo-500'
                                        }`}
                                    placeholder="john@example.com"
                                />
                            </div>
                        </div>

                        {/* Avatar URL (Horizontal/Fallback) */}
                        <div className="hidden"> {/* Hidden because we prefer direct upload now, but keeping in state just in case */}
                            <input
                                type="url"
                                value={formData.avatarUrl}
                                onChange={(e) => setFormData({ ...formData, avatarUrl: e.target.value })}
                            />
                        </div>

                        {/* Password */}
                        <div>
                            <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                New Password <span className="text-xs font-normal text-slate-400">(Leave blank to keep current)</span>
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="w-5 h-5 text-slate-400" />
                                </div>
                                <input
                                    type="password"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    className={`block w-full pl-10 pr-3 py-2.5 rounded-xl border-2 transition-colors focus:ring-0 ${isDark
                                        ? 'bg-slate-950 border-slate-800 text-white focus:border-indigo-500'
                                        : 'bg-white border-slate-200 text-slate-900 focus:border-indigo-500'
                                        }`}
                                    placeholder="••••••••"
                                    minLength={6}
                                />
                            </div>
                        </div>

                        {/* Confirm Password */}
                        {formData.password && (
                            <div className="animate-fade-in-up">
                                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                    Confirm Password
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Lock className="w-5 h-5 text-slate-400" />
                                    </div>
                                    <input
                                        type="password"
                                        value={formData.confirmPassword}
                                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                        className={`block w-full pl-10 pr-3 py-2.5 rounded-xl border-2 transition-colors focus:ring-0 ${isDark
                                            ? 'bg-slate-950 border-slate-800 text-white focus:border-indigo-500'
                                            : 'bg-white border-slate-200 text-slate-900 focus:border-indigo-500'
                                            }`}
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-200 dark:border-slate-800">
                        <button
                            type="button"
                            onClick={onClose}
                            className={`px-4 py-2 rounded-xl font-medium transition-colors ${isDark
                                ? 'text-slate-300 hover:bg-slate-800'
                                : 'text-slate-600 hover:bg-slate-100'
                                }`}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || uploading}
                            className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white rounded-xl font-medium shadow-lg shadow-indigo-500/25 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                'Save Changes'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ProfileModal;
