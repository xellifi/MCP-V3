import React, { useEffect, useState } from 'react';
import { Workspace, ScheduledPost } from '../types';
import { api } from '../services/api';
import { format } from 'date-fns';
import { Calendar, Image as ImageIcon, Facebook, Instagram, Clock, Check, AlertCircle, Plus } from 'lucide-react';
import { useToast } from '../context/ToastContext';

interface ScheduledPostsProps {
  workspace: Workspace;
}

const ScheduledPosts: React.FC<ScheduledPostsProps> = ({ workspace }) => {
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const toast = useToast();

  useEffect(() => {
    loadPosts();
  }, [workspace.id]);

  const loadPosts = async () => {
    setLoading(true);
    const data = await api.workspace.getScheduledPosts(workspace.id);
    setPosts(data);
    setLoading(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PUBLISHED': return <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-900/50 backdrop-blur-md shadow-sm"><Check className="w-3 h-3" /> Published</span>;
      case 'PENDING': return <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50 backdrop-blur-md shadow-sm"><Clock className="w-3 h-3" /> Scheduled</span>;
      case 'FAILED': return <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-900/50 backdrop-blur-md shadow-sm"><AlertCircle className="w-3 h-3" /> Failed</span>;
      default: return null;
    }
  };

  const handleCreatePost = () => {
    setIsModalOpen(false);
    // Simulate creation
    toast.success('Post scheduled successfully!');
    loadPosts(); // Reload to simulate update
  };

  if (loading) return (
    <div className="flex items-center justify-center p-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Posts</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Plan and schedule content for Facebook and Instagram</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-primary-500/20 transition-all active:scale-95 flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Create Post
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {posts.map(post => (
          <div key={post.id} className="bg-white dark:bg-slate-900 rounded-2xl shadow-card dark:shadow-none border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col group hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
            <div className="h-48 bg-slate-100 dark:bg-slate-800 relative overflow-hidden">
              {post.imageUrl ? (
                <img src={post.imageUrl} alt="Post preview" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400 dark:text-slate-600">
                  <ImageIcon className="w-12 h-12 opacity-50" />
                </div>
              )}
              <div className="absolute top-3 right-3">
                {getStatusBadge(post.status)}
              </div>
              <div className={`absolute top-3 left-3 p-1.5 rounded-full text-white shadow-md ${post.platform === 'FACEBOOK' ? 'bg-[#1877F2]' : 'bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500'}`}>
                {post.platform === 'FACEBOOK' ? <Facebook className="w-4 h-4" /> : <Instagram className="w-4 h-4" />}
              </div>
            </div>
            <div className="p-5 flex-1 flex flex-col">
              <p className="text-slate-700 dark:text-slate-300 text-sm line-clamp-3 mb-4 flex-1 leading-relaxed">{post.content}</p>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center text-xs font-medium text-slate-500 dark:text-slate-400 gap-2">
                <Calendar className="w-4 h-4" />
                <span>
                  {format(new Date(post.scheduledAt), 'MMMM d, yyyy @ h:mm a')}
                </span>
              </div>
            </div>
          </div>
        ))}

        {posts.length === 0 && (
          <div className="col-span-full py-20 text-center bg-white dark:bg-slate-900 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800">
            <div className="w-20 h-20 bg-primary-50 dark:bg-primary-900/20 text-primary-500 dark:text-primary-400 rounded-full flex items-center justify-center mx-auto mb-6">
              <Calendar className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No posts scheduled</h3>
            <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-8">Start planning your content by scheduling your first post.</p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-white dark:bg-slate-800 text-slate-700 dark:text-white border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 px-6 py-2.5 rounded-xl font-bold transition-all shadow-sm"
            >
              Schedule Post
            </button>
          </div>
        )}
      </div>

      {/* Simplified Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-800 transform scale-100 transition-all">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Schedule New Post</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-500 dark:hover:text-slate-300">
                <span className="sr-only">Close</span>
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Content</label>
                <textarea
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary-500 outline-none h-32 placeholder-slate-400 dark:placeholder-slate-500 transition-all resize-none"
                  placeholder="What's on your mind?"
                />
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Platform</label>
                  <div className="relative">
                    <select className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm text-slate-900 dark:text-slate-100 appearance-none focus:ring-2 focus:ring-primary-500 outline-none transition-all">
                      <option>Facebook</option>
                      <option>Instagram</option>
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Schedule Date</label>
                  <input type="datetime-local" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary-500 outline-none transition-all" />
                </div>
              </div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/50 p-6 flex justify-end gap-3 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePost}
                className="px-5 py-2.5 text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 active:bg-primary-800 rounded-xl shadow-lg shadow-primary-500/20 transition-all active:scale-95"
              >
                Schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScheduledPosts;