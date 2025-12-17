import React, { useEffect, useState } from 'react';
import { Workspace, ScheduledPost } from '../types';
import { api } from '../services/api';
import { format } from 'date-fns';
import { Calendar, Image as ImageIcon, Facebook, Instagram, Clock, Check, AlertCircle } from 'lucide-react';
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
      case 'PUBLISHED': return <span className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-green-900/30 text-green-400 border border-green-800"><Check className="w-3 h-3" /> Published</span>;
      case 'PENDING': return <span className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-blue-900/30 text-blue-400 border border-blue-800"><Clock className="w-3 h-3" /> Scheduled</span>;
      case 'FAILED': return <span className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-red-900/30 text-red-400 border border-red-800"><AlertCircle className="w-3 h-3" /> Failed</span>;
      default: return null;
    }
  };

  const handleCreatePost = () => {
    setIsModalOpen(false);
    // Simulate creation
    toast.success('Post scheduled successfully!');
    loadPosts(); // Reload to simulate update
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Posts</h1>
          <p className="text-slate-400 mt-1">Plan and schedule content for Facebook and Instagram</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium shadow-lg shadow-blue-900/30 transition-colors flex items-center gap-2"
        >
          <Calendar className="w-4 h-4" />
          Create Post
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {posts.map(post => (
          <div key={post.id} className="bg-slate-800/50 rounded-xl shadow-lg border border-slate-700 overflow-hidden flex flex-col backdrop-blur-sm">
            <div className="h-48 bg-slate-700 relative overflow-hidden">
              {post.imageUrl ? (
                <img src={post.imageUrl} alt="Post preview" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-500">
                  <ImageIcon className="w-12 h-12" />
                </div>
              )}
              <div className="absolute top-3 right-3">
                {getStatusBadge(post.status)}
              </div>
              <div className={`absolute top-3 left-3 p-1.5 rounded-full text-white ${post.platform === 'FACEBOOK' ? 'bg-[#1877F2]' : 'bg-pink-600'}`}>
                {post.platform === 'FACEBOOK' ? <Facebook className="w-4 h-4" /> : <Instagram className="w-4 h-4" />}
              </div>
            </div>
            <div className="p-5 flex-1 flex flex-col">
              <p className="text-slate-300 text-sm line-clamp-3 mb-4 flex-1">{post.content}</p>

              <div className="pt-4 border-t border-slate-700 flex items-center text-xs text-slate-400 gap-2">
                <Calendar className="w-4 h-4" />
                <span>
                  {format(new Date(post.scheduledAt), 'MMMM d, yyyy @ h:mm a')}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Simplified Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-700">
            <div className="p-6 border-b border-slate-700">
              <h3 className="text-lg font-bold text-slate-100">Schedule New Post</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Content</label>
                <textarea className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none h-32 placeholder-slate-500" placeholder="Write your post..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Platform</label>
                  <select className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-slate-200">
                    <option>Facebook</option>
                    <option>Instagram</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Schedule Date</label>
                  <input type="datetime-local" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-slate-200" />
                </div>
              </div>
            </div>
            <div className="bg-slate-900/50 p-4 flex justify-end gap-3 border-t border-slate-700">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700 rounded-lg">Cancel</button>
              <button onClick={handleCreatePost} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg">Schedule</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScheduledPosts;