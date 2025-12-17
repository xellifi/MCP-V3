import React from 'react';
import { Workspace } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { MessageCircle, Users, Activity, TrendingUp } from 'lucide-react';

interface DashboardProps {
  workspace: Workspace;
}

const data = [
  { name: 'Mon', comments: 400, dms: 240 },
  { name: 'Tue', comments: 300, dms: 139 },
  { name: 'Wed', comments: 200, dms: 980 },
  { name: 'Thu', comments: 278, dms: 390 },
  { name: 'Fri', comments: 189, dms: 480 },
  { name: 'Sat', comments: 239, dms: 380 },
  { name: 'Sun', comments: 349, dms: 430 },
];

const StatCard = ({ title, value, icon: Icon, color }: any) => (
  <div className="bg-slate-900 p-6 rounded-xl shadow-lg border border-slate-800 flex items-center space-x-4">
    <div className={`p-3 rounded-lg ${color} bg-opacity-20`}>
      <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
    </div>
    <div>
      <p className="text-sm font-medium text-slate-400">{title}</p>
      <h3 className="text-2xl font-bold text-slate-100">{value}</h3>
    </div>
  </div>
);

const Dashboard: React.FC<DashboardProps> = ({ workspace }) => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Dashboard</h1>
          <p className="text-slate-400 mt-1">Overview for {workspace.name}</p>
        </div>
        <div className="text-sm text-slate-400 bg-slate-900 px-3 py-1 rounded-md border border-slate-800 shadow-sm">
          Last 7 Days
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Comments" value="2,543" icon={MessageCircle} color="bg-blue-500" />
        <StatCard title="Direct Messages" value="1,290" icon={Activity} color="bg-indigo-500" />
        <StatCard title="Active Contacts" value="14,032" icon={Users} color="bg-emerald-500" />
        <StatCard title="Automation Runs" value="5,420" icon={TrendingUp} color="bg-orange-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-900 p-6 rounded-xl shadow-lg border border-slate-800">
          <h3 className="text-lg font-bold text-slate-100 mb-6">Engagement Overview</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} />
                <Tooltip 
                  cursor={{fill: '#1e293b'}}
                  contentStyle={{ 
                    backgroundColor: '#0f172a', 
                    borderRadius: '8px', 
                    border: '1px solid #334155', 
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.5)',
                    color: '#f8fafc'
                  }}
                  itemStyle={{ color: '#f8fafc' }}
                />
                <Bar dataKey="comments" name="Comments" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="dms" name="Direct Messages" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-slate-900 p-6 rounded-xl shadow-lg border border-slate-800">
          <h3 className="text-lg font-bold text-slate-100 mb-4">Recent Activity</h3>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-start space-x-3 pb-3 border-b border-slate-800 last:border-0 last:pb-0">
                <div className="w-8 h-8 rounded-full bg-slate-800 flex-shrink-0 flex items-center justify-center text-xs font-bold text-slate-400">
                  U{i}
                </div>
                <div>
                  <p className="text-sm text-slate-300">
                    <span className="font-semibold text-slate-100">User {i}</span> triggered <span className="text-blue-400">Welcome Flow</span>
                  </p>
                  <p className="text-xs text-slate-500">2 minutes ago</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;