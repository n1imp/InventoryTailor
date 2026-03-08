import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  BarChart3, 
  Users, 
  Building2, 
  CreditCard, 
  Clock,
  TrendingUp,
  Package,
  Activity
} from 'lucide-react';

export const AdminInsights = ({ token }: { token: string }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInsights = async () => {
      try {
        const res = await fetch('/api/admin/insights', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) {
          if (res.status === 403) throw new Error('Platform Admin access required.');
          throw new Error('Failed to fetch insights.');
        }
        const json = await res.json();
        setData(json);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchInsights();
  }, [token]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-64 space-y-4">
      <div className="w-8 h-8 border-2 border-[#141414] border-t-transparent rounded-full animate-spin" />
      <p className="text-[10px] font-bold uppercase tracking-widest opacity-50">Loading Platform Insights...</p>
    </div>
  );

  if (error) return (
    <div className="bg-red-50 border border-red-200 p-12 text-center">
      <h3 className="text-lg font-bold text-red-700 uppercase tracking-tight mb-2">Access Denied</h3>
      <p className="text-sm text-red-600 opacity-80">{error}</p>
    </div>
  );

  const stats = [
    { label: 'Total Companies', value: data.stats.totalCompanies, icon: <Building2 size={18} /> },
    { label: 'Active Trials', value: data.stats.activeTrials, icon: <Clock size={18} /> },
    { label: 'Paid Subscriptions', value: data.stats.paidSubscriptions, icon: <CreditCard size={18} /> },
    { label: 'Total Users', value: data.stats.totalUsers, icon: <Users size={18} /> },
    { label: 'Total Products', value: data.stats.totalProducts, icon: <Package size={18} /> },
  ];

  return (
    <div className="space-y-12">
      <div className="flex justify-between items-end">
        <div>
          <h3 className="text-2xl font-serif italic font-bold mb-1">Platform Insights</h3>
          <p className="text-sm opacity-60">Internal metrics for InventoryTailor platform.</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold uppercase tracking-widest">
          <Activity size={12} /> System Live
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        {stats.map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white border border-[#141414] p-6 shadow-[4px_4px_0px_0px_rgba(20,20,20,1)]"
          >
            <div className="p-2 bg-[#141414]/5 rounded-lg w-fit mb-4">
              {stat.icon}
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-50">{stat.label}</p>
            <p className="text-2xl font-mono font-bold mt-1">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Companies */}
        <div className="lg:col-span-2 bg-white border border-[#141414] shadow-[8px_8px_0px_0px_rgba(20,20,20,1)]">
          <div className="p-4 border-b border-[#141414] bg-[#141414]/5 flex justify-between items-center">
            <h4 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
              <TrendingUp size={14} /> Recent Registrations
            </h4>
          </div>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#141414] bg-[#E4E3E0]/30">
                <th className="p-4 text-[10px] uppercase tracking-widest font-bold opacity-50">Company</th>
                <th className="p-4 text-[10px] uppercase tracking-widest font-bold opacity-50">Plan</th>
                <th className="p-4 text-[10px] uppercase tracking-widest font-bold opacity-50">Users</th>
                <th className="p-4 text-[10px] uppercase tracking-widest font-bold opacity-50">Products</th>
                <th className="p-4 text-[10px] uppercase tracking-widest font-bold opacity-50">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#141414]/10">
              {data.recentCompanies.map((c: any) => (
                <tr key={c.id} className="hover:bg-[#141414]/5 transition-colors">
                  <td className="p-4 text-xs font-bold">{c.name}</td>
                  <td className="p-4">
                    <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 border border-[#141414] ${c.plan === 'trial' ? 'bg-white' : 'bg-[#141414] text-white'}`}>
                      {c.plan}
                    </span>
                  </td>
                  <td className="p-4 text-xs font-mono">{c._count.users}</td>
                  <td className="p-4 text-xs font-mono">{c._count.products}</td>
                  <td className="p-4 text-xs opacity-60">{new Date(c.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Growth Chart Placeholder */}
        <div className="bg-[#141414] text-white p-8 shadow-[8px_8px_0px_0px_rgba(228,227,224,1)] flex flex-col justify-center items-center text-center">
          <BarChart3 size={48} className="mb-6 opacity-20" />
          <h4 className="text-lg font-bold uppercase tracking-tight mb-2">Growth Analytics</h4>
          <p className="text-xs opacity-60 leading-relaxed">
            Detailed growth charts and churn analysis will be available in the next release.
          </p>
          <div className="mt-8 w-full h-1 bg-white/10 overflow-hidden">
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: '100%' }}
              transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
              className="w-1/2 h-full bg-white/40"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
