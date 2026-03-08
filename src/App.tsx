import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Package, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Plus, 
  Search, 
  LogOut,
  AlertTriangle,
  DollarSign,
  Box,
  X,
  ChevronRight,
  TrendingUp,
  History,
  Users,
  ShieldCheck,
  Mail,
  Filter,
  ChevronLeft,
  Image as ImageIcon,
  CreditCard,
  Download,
  Check,
  Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import * as Sentry from "@sentry/react";

// Initialize Sentry Frontend
if ((import.meta as any).env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: (import.meta as any).env.VITE_SENTRY_DSN,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],
    tracesSampleRate: 1.0,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  });
}

// --- Types ---
interface User {
  id: number;
  email: string;
  companyId: number;
  role: string;
}

interface ProductImage {
  id: number;
  url: string;
  isMain: boolean;
}

interface Product {
  id: number;
  name: string;
  description: string;
  brand: string;
  category: string;
  images?: ProductImage[];
}

interface AuditLog {
  id: number;
  action: string;
  entityType: string;
  entityId: number;
  details: string;
  createdAt: string;
  user: { email: string };
}

interface Invitation {
  id: number;
  email: string;
  role: string;
  token: string;
  acceptedAt: string | null;
  expiresAt: string;
}

interface DashboardAnalytics {
  topMoving: { sku: string, quantity: number }[];
  stockBySize: { size: string, count: number }[];
  turnover: number;
}

interface Variation {
  id: number;
  product_id: number;
  sku: string;
  size: string;
  color: string;
  price: number;
  cost: number;
  stock_current: number;
  stock_min: number;
  product_name?: string;
}

interface DashboardSummary {
  totalSkus: number;
  stockValue: number;
  lowStockCount: number;
}

interface MovementData {
  date: string;
  incoming: number;
  outgoing: number;
}

// --- Components ---

const Modal = ({ isOpen, onClose, title, children }: { isOpen: boolean, onClose: () => void, title: string, children: React.ReactNode }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#141414]/40 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white border border-[#141414] shadow-[12px_12px_0px_0px_rgba(20,20,20,1)] w-full max-w-lg overflow-hidden"
      >
        <div className="p-6 border-b border-[#141414] flex justify-between items-center bg-[#141414]/5">
          <h3 className="text-sm font-bold uppercase tracking-widest">{title}</h3>
          <button onClick={onClose} className="hover:rotate-90 transition-transform">
            <X size={20} />
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </motion.div>
    </div>
  );
};

const ResetPassword = ({ onBack }: { onBack: () => void }) => {
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const t = urlParams.get('token');
    if (t) setToken(t);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: 'Password reset successfully. You can now login.' });
        setTimeout(() => onBack(), 2000);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to reset password' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'An error occurred' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#E4E3E0] flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white border border-[#141414] shadow-[12px_12px_0px_0px_rgba(20,20,20,1)] p-8"
      >
        <div className="mb-8">
          <h2 className="text-2xl font-bold uppercase tracking-tighter mb-2">Reset Password</h2>
          <p className="text-sm opacity-60">Enter your new password below.</p>
        </div>

        {message && (
          <div className={`mb-6 p-4 text-xs font-bold uppercase tracking-wider ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest opacity-50 mb-2">New Password</label>
            <input 
              type="password"
              required
              minLength={6}
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full border-b-2 border-[#141414] py-2 focus:outline-none font-mono text-lg"
              placeholder="••••••••"
            />
          </div>
          <button 
            type="submit"
            disabled={loading || !token}
            className="w-full bg-[#141414] text-white py-4 text-xs font-bold uppercase tracking-widest hover:bg-[#141414]/90 transition-colors disabled:opacity-50"
          >
            {loading ? 'Resetting...' : 'Update Password'}
          </button>
          <button 
            type="button"
            onClick={onBack}
            className="w-full text-[10px] font-bold uppercase tracking-widest opacity-50 hover:opacity-100 transition-opacity"
          >
            Back to Login
          </button>
        </form>
      </motion.div>
    </div>
  );
};

const ForgotPassword = ({ onBack }: { onBack: () => void }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: data.message });
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to send reset link' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'An error occurred' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#E4E3E0] flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white border border-[#141414] shadow-[12px_12px_0px_0px_rgba(20,20,20,1)] p-8"
      >
        <div className="mb-8">
          <h2 className="text-2xl font-bold uppercase tracking-tighter mb-2">Forgot Password</h2>
          <p className="text-sm opacity-60">Enter your email to receive a reset link.</p>
        </div>

        {message && (
          <div className={`mb-6 p-4 text-xs font-bold uppercase tracking-wider ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest opacity-50 mb-2">Email Address</label>
            <input 
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full border-b-2 border-[#141414] py-2 focus:outline-none font-mono text-lg"
              placeholder="admin@company.com"
            />
          </div>
          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-[#141414] text-white py-4 text-xs font-bold uppercase tracking-widest hover:bg-[#141414]/90 transition-colors disabled:opacity-50"
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
          <button 
            type="button"
            onClick={onBack}
            className="w-full text-[10px] font-bold uppercase tracking-widest opacity-50 hover:opacity-100 transition-opacity"
          >
            Back to Login
          </button>
        </form>
      </motion.div>
    </div>
  );
};

const VerifyEmail = ({ onComplete }: { onComplete: () => void }) => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    const verify = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token');
      if (!token) {
        setStatus('error');
        setError('Missing verification token');
        return;
      }

      try {
        const res = await fetch('/api/auth/verify-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        if (res.ok) {
          setStatus('success');
          setTimeout(() => onComplete(), 3000);
        } else {
          const data = await res.json();
          setStatus('error');
          setError(data.error || 'Verification failed');
        }
      } catch (err) {
        setStatus('error');
        setError('An error occurred');
      }
    };
    verify();
  }, [onComplete]);

  return (
    <div className="min-h-screen bg-[#E4E3E0] flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white border border-[#141414] shadow-[12px_12px_0px_0px_rgba(20,20,20,1)] p-12 text-center"
      >
        {status === 'loading' && (
          <div className="space-y-4">
            <div className="w-12 h-12 border-4 border-[#141414] border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-xs font-bold uppercase tracking-widest">Verifying your email...</p>
          </div>
        )}
        {status === 'success' && (
          <div className="space-y-4">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check size={32} />
            </div>
            <h2 className="text-2xl font-bold uppercase tracking-tighter">Email Verified!</h2>
            <p className="text-sm opacity-60">Your account is now active. Redirecting to login...</p>
          </div>
        )}
        {status === 'error' && (
          <div className="space-y-4">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle size={32} />
            </div>
            <h2 className="text-2xl font-bold uppercase tracking-tighter">Verification Failed</h2>
            <p className="text-sm opacity-60">{error}</p>
            <button 
              onClick={onComplete}
              className="mt-6 w-full bg-[#141414] text-white py-3 text-xs font-bold uppercase tracking-widest"
            >
              Back to Login
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};

const ProductForm = ({ token, onSuccess, onCancel }: { token: string, onSuccess: () => void, onCancel: () => void }) => {
  const [formData, setFormData] = useState({ name: '', category: '', brand: '', description: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        onSuccess();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to create product');
      }
    } catch (err) {
      alert('Error creating product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider opacity-50 mb-1">Product Name *</label>
          <input 
            required
            value={formData.name}
            onChange={e => setFormData({...formData, name: e.target.value})}
            className="w-full border-b border-[#141414] py-1.5 focus:outline-none font-mono text-sm"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider opacity-50 mb-1">Category *</label>
          <input 
            required
            value={formData.category}
            onChange={e => setFormData({...formData, category: e.target.value})}
            className="w-full border-b border-[#141414] py-1.5 focus:outline-none font-mono text-sm"
          />
        </div>
      </div>
      <div>
        <label className="block text-[10px] font-bold uppercase tracking-wider opacity-50 mb-1">Brand</label>
        <input 
          value={formData.brand}
          onChange={e => setFormData({...formData, brand: e.target.value})}
          className="w-full border-b border-[#141414] py-1.5 focus:outline-none font-mono text-sm"
        />
      </div>
      <div>
        <label className="block text-[10px] font-bold uppercase tracking-wider opacity-50 mb-1">Description</label>
        <textarea 
          rows={3}
          value={formData.description}
          onChange={e => setFormData({...formData, description: e.target.value})}
          className="w-full border border-[#141414]/20 p-2 focus:outline-none focus:border-[#141414] font-mono text-sm mt-1"
        />
      </div>
      <div className="flex gap-3 pt-4">
        <button 
          type="button" 
          onClick={onCancel}
          className="flex-1 border border-[#141414] py-2.5 text-xs font-bold uppercase tracking-widest hover:bg-[#141414]/5"
        >
          Cancel
        </button>
        <button 
          type="submit" 
          disabled={loading}
          className="flex-1 bg-[#141414] text-white py-2.5 text-xs font-bold uppercase tracking-widest hover:bg-[#141414]/90 disabled:opacity-50"
        >
          {loading ? 'Creating...' : 'Create Product'}
        </button>
      </div>
    </form>
  );
};

const VariationForm = ({ token, productId, onSuccess, onCancel }: { token: string, productId: number, onSuccess: () => void, onCancel: () => void }) => {
  const [formData, setFormData] = useState({ 
    sku: '', size: '', color: '', price: '', cost: '', stockMin: '0', initialStock: '0' 
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/variations', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          productId,
          price: parseFloat(formData.price),
          cost: parseFloat(formData.cost),
          stockMin: parseInt(formData.stockMin),
          initialStock: parseInt(formData.initialStock)
        }),
      });
      if (res.ok) {
        onSuccess();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to create variation');
      }
    } catch (err) {
      alert('Error creating variation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider opacity-50 mb-1">SKU *</label>
          <input 
            required
            value={formData.sku}
            onChange={e => setFormData({...formData, sku: e.target.value})}
            className="w-full border-b border-[#141414] py-1.5 focus:outline-none font-mono text-sm"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider opacity-50 mb-1">Size</label>
            <input 
              value={formData.size}
              onChange={e => setFormData({...formData, size: e.target.value})}
              className="w-full border-b border-[#141414] py-1.5 focus:outline-none font-mono text-sm"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider opacity-50 mb-1">Color</label>
            <input 
              value={formData.color}
              onChange={e => setFormData({...formData, color: e.target.value})}
              className="w-full border-b border-[#141414] py-1.5 focus:outline-none font-mono text-sm"
            />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider opacity-50 mb-1">Price ($) *</label>
          <input 
            type="number" step="0.01" required
            value={formData.price}
            onChange={e => setFormData({...formData, price: e.target.value})}
            className="w-full border-b border-[#141414] py-1.5 focus:outline-none font-mono text-sm"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider opacity-50 mb-1">Cost ($) *</label>
          <input 
            type="number" step="0.01" required
            value={formData.cost}
            onChange={e => setFormData({...formData, cost: e.target.value})}
            className="w-full border-b border-[#141414] py-1.5 focus:outline-none font-mono text-sm"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider opacity-50 mb-1">Initial Stock</label>
          <input 
            type="number"
            value={formData.initialStock}
            onChange={e => setFormData({...formData, initialStock: e.target.value})}
            className="w-full border-b border-[#141414] py-1.5 focus:outline-none font-mono text-sm"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider opacity-50 mb-1">Min. Stock Alert</label>
          <input 
            type="number"
            value={formData.stockMin}
            onChange={e => setFormData({...formData, stockMin: e.target.value})}
            className="w-full border-b border-[#141414] py-1.5 focus:outline-none font-mono text-sm"
          />
        </div>
      </div>
      <div className="flex gap-3 pt-4">
        <button 
          type="button" 
          onClick={onCancel}
          className="flex-1 border border-[#141414] py-2.5 text-xs font-bold uppercase tracking-widest hover:bg-[#141414]/5"
        >
          Cancel
        </button>
        <button 
          type="submit" 
          disabled={loading}
          className="flex-1 bg-[#141414] text-white py-2.5 text-xs font-bold uppercase tracking-widest hover:bg-[#141414]/90 disabled:opacity-50"
        >
          {loading ? 'Creating...' : 'Create Variation'}
        </button>
      </div>
    </form>
  );
};

const InvitationForm = ({ token, onSuccess, onCancel }: { token: string, onSuccess: () => void, onCancel: () => void }) => {
  const [formData, setFormData] = useState({ email: '', role: 'staff' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/company/invitations', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        const data = await res.json();
        alert(`Invitation created! Token (for demo): ${data.token}`);
        onSuccess();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to send invitation');
      }
    } catch (err) {
      alert('Error sending invitation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-[10px] font-bold uppercase tracking-wider opacity-50 mb-1">Email Address *</label>
        <input 
          required
          type="email"
          value={formData.email}
          onChange={e => setFormData({...formData, email: e.target.value})}
          className="w-full border-b border-[#141414] py-1.5 focus:outline-none font-mono text-sm"
        />
      </div>
      <div>
        <label className="block text-[10px] font-bold uppercase tracking-wider opacity-50 mb-1">Role</label>
        <select 
          value={formData.role}
          onChange={e => setFormData({...formData, role: e.target.value})}
          className="w-full border-b border-[#141414] py-1.5 focus:outline-none font-mono text-sm bg-transparent"
        >
          <option value="staff">Staff</option>
          <option value="manager">Manager</option>
          <option value="admin">Admin</option>
        </select>
      </div>
      <div className="flex gap-3 pt-4">
        <button 
          type="button" 
          onClick={onCancel}
          className="flex-1 border border-[#141414] py-2.5 text-xs font-bold uppercase tracking-widest hover:bg-[#141414]/5"
        >
          Cancel
        </button>
        <button 
          type="submit" 
          disabled={loading}
          className="flex-1 bg-[#141414] text-white py-2.5 text-xs font-bold uppercase tracking-widest hover:bg-[#141414]/90 disabled:opacity-50"
        >
          {loading ? 'Sending...' : 'Send Invitation'}
        </button>
      </div>
    </form>
  );
};

const LoginPage = ({ onLogin, onForgotPassword, onResetPassword }: { onLogin: (token: string, user: User) => void, onForgotPassword: () => void, onResetPassword: () => void }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
    const body = isRegister ? { email, password, companyName } : { email, password };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      
      if (isRegister) {
        setIsRegister(false);
        alert('Registered successfully! Please check your email to verify your account before logging in.');
      } else {
        onLogin(data.token, data.user);
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#E4E3E0] flex items-center justify-center p-4 font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white border border-[#141414] shadow-[8px_8px_0px_0px_rgba(20,20,20,1)] p-8"
      >
        <div className="mb-8">
          <h1 className="text-3xl font-serif italic font-bold text-[#141414]">InventoryTailor</h1>
          <p className="text-sm text-[#141414]/60 uppercase tracking-widest mt-2">
            {isRegister ? 'Create your workspace' : 'Access your dashboard'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {isRegister && (
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#141414]/50 mb-1">Company Name</label>
              <input 
                type="text" 
                required 
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full border-b border-[#141414] py-2 focus:outline-none focus:border-b-2 font-mono text-sm"
              />
            </div>
          )}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#141414]/50 mb-1">Email Address</label>
            <input 
              type="email" 
              required 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border-b border-[#141414] py-2 focus:outline-none focus:border-b-2 font-mono text-sm"
            />
          </div>
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#141414]/50">Password</label>
              {!isRegister && (
                <button 
                  type="button"
                  onClick={onForgotPassword}
                  className="text-[10px] font-bold uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity"
                >
                  Forgot?
                </button>
              )}
            </div>
            <input 
              type="password" 
              required 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border-b border-[#141414] py-2 focus:outline-none focus:border-b-2 font-mono text-sm"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-[#141414] text-[#E4E3E0] py-3 font-bold uppercase tracking-widest hover:bg-[#141414]/90 transition-colors disabled:opacity-50"
          >
            {loading ? 'Processing...' : isRegister ? 'Register' : 'Login'}
          </button>
        </form>

        <button 
          onClick={() => setIsRegister(!isRegister)}
          className="w-full mt-4 text-xs text-[#141414]/60 hover:text-[#141414] underline underline-offset-4"
        >
          {isRegister ? 'Already have an account? Login' : 'Need an account? Register your company'}
        </button>
      </motion.div>
    </div>
  );
};

const Dashboard = ({ token, user, onLogout }: { token: string, user: User, onLogout: () => void }) => {
  const [view, setView] = useState<'overview' | 'inventory' | 'users' | 'audit-logs' | 'billing'>('overview');
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [variations, setVariations] = useState<Variation[]>([]);
  const [movementData, setMovementData] = useState<MovementData[]>([]);
  const [lowStockItems, setLowStockItems] = useState<Variation[]>([]);
  
  const [companyUsers, setCompanyUsers] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [activity, setActivity] = useState<AuditLog[]>([]);
  const [company, setCompany] = useState<any>(null);
  
  const [loading, setLoading] = useState(true);
  const [subscriptionError, setSubscriptionError] = useState<any>(null);
  
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isVariationModalOpen, setIsVariationModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  useEffect(() => {
    fetchSummary();
    fetchProducts();
    fetchMovements();
    fetchLowStock();
    fetchAnalytics();
    fetchActivity();
  }, []);

  useEffect(() => {
    if (view === 'inventory') fetchProducts();
    if (view === 'users') fetchCompanyUsers();
    if (view === 'audit-logs') fetchAuditLogs();
  }, [view, pagination.page, search, categoryFilter]);

  const fetchActivity = async () => {
    try {
      const res = await fetch('/api/dashboard/activity', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) return;
      const data = await res.json();
      setActivity(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const res = await fetch('/api/dashboard/analytics', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.status === 403) {
        const data = await res.json();
        if (data.code === 'SUBSCRIPTION_REQUIRED') {
          setSubscriptionError(data);
        }
        return;
      }
      if (!res.ok) return;
      const data = await res.json();
      setAnalytics(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCompanyUsers = async () => {
    if (user.role !== 'admin') return;
    try {
      const res = await fetch('/api/company/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) return;
      const data = await res.json();
      setCompanyUsers(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await fetch('/api/audit-logs', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) return;
      const data = await res.json();
      setAuditLogs(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSummary = async () => {
    try {
      const res = await fetch('/api/dashboard/summary', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) return;
      const data = await res.json();
      setSummary(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMovements = async () => {
    try {
      const res = await fetch('/api/dashboard/movements', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) return;
      const data = await res.json();
      setMovementData(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchLowStock = async () => {
    try {
      const res = await fetch('/api/dashboard/low-stock', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) return;
      const data = await res.json();
      setLowStockItems(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchProducts = async () => {
    try {
      const query = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        search,
        category: categoryFilter,
      });
      const res = await fetch(`/api/products?${query}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) return;
      const data = await res.json();
      setProducts(data.data);
      setPagination(data.pagination);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchVariations = async (productId: number) => {
    try {
      const res = await fetch(`/api/products/${productId}/variations`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setVariations(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddMovement = async (variationId: number, type: string, quantity: number) => {
    try {
      const res = await fetch('/api/movements', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ variationId, type, quantity }),
      });
      if (res.ok) {
        fetchSummary();
        fetchMovements();
        fetchLowStock();
        if (selectedProduct) fetchVariations(selectedProduct.id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-[#E4E3E0] flex font-sans text-[#141414]">
      {/* Sidebar */}
      <aside className="w-64 border-r border-[#141414] flex flex-col bg-white">
        <div className="p-6 border-b border-[#141414]">
          <h1 className="text-xl font-serif italic font-bold">InventoryTailor</h1>
          <p className="text-[10px] uppercase tracking-widest opacity-50 mt-1">Surgical Control</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <button 
            onClick={() => setView('overview')}
            className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${view === 'overview' ? 'bg-[#141414] text-white' : 'hover:bg-[#141414]/5'}`}
          >
            <LayoutDashboard size={18} />
            Overview
          </button>
          <button 
            onClick={() => setView('inventory')}
            className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${view === 'inventory' ? 'bg-[#141414] text-white' : 'hover:bg-[#141414]/5'}`}
          >
            <Package size={18} />
            Inventory
          </button>
          {user.role === 'admin' && (
            <button 
              onClick={() => setView('users')}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${view === 'users' ? 'bg-[#141414] text-white' : 'hover:bg-[#141414]/5'}`}
            >
              <Users size={18} />
              Team
            </button>
          )}
          {user.role === 'admin' && (
            <button 
              onClick={() => setView('billing')}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${view === 'billing' ? 'bg-[#141414] text-white' : 'hover:bg-[#141414]/5'}`}
            >
              <CreditCard size={18} />
              Billing
            </button>
          )}
        </nav>

        <div className="p-4 border-t border-[#141414]">
          <div className="px-4 py-3 mb-4">
            <p className="text-[10px] uppercase tracking-widest opacity-50">User</p>
            <p className="text-xs font-mono truncate">{user.email}</p>
          </div>
          <button 
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <header className="h-16 border-b border-[#141414] bg-white flex items-center justify-between px-8 sticky top-0 z-10">
          <h2 className="text-sm font-bold uppercase tracking-widest">
            {view === 'overview' ? 'Dashboard Summary' : 'Product Catalog'}
          </h2>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => window.open('/api/exports/inventory', '_blank')}
              className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest border border-[#141414] px-3 py-1.5 hover:bg-[#141414]/5"
            >
              <Download size={12} /> Export CSV
            </button>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 opacity-30" size={14} />
              <input 
                type="text" 
                placeholder="Search SKU or Product..."
                className="bg-[#E4E3E0]/50 border border-[#141414]/10 rounded-full py-1.5 pl-9 pr-4 text-xs focus:outline-none focus:border-[#141414]/30 w-64"
              />
            </div>
          </div>
        </header>

        <div className="p-8">
          <AnimatePresence mode="wait">
            {view === 'overview' && (
              <motion.div 
                key="overview"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white border border-[#141414] p-6 shadow-[4px_4px_0px_0px_rgba(20,20,20,1)]">
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-2 bg-[#141414]/5 rounded-lg">
                        <Box size={20} />
                      </div>
                    </div>
                    <p className="text-[10px] uppercase tracking-widest opacity-50 font-bold">Total SKUs</p>
                    <p className="text-3xl font-mono font-bold mt-1">{summary?.totalSkus || 0}</p>
                  </div>
                  
                  <div className="bg-white border border-[#141414] p-6 shadow-[4px_4px_0px_0px_rgba(20,20,20,1)]">
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-2 bg-[#141414]/5 rounded-lg">
                        <DollarSign size={20} />
                      </div>
                    </div>
                    <p className="text-[10px] uppercase tracking-widest opacity-50 font-bold">Stock Value</p>
                    <p className="text-3xl font-mono font-bold mt-1">
                      ${(summary?.stockValue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>

                  <div className="bg-white border border-[#141414] p-6 shadow-[4px_4px_0px_0px_rgba(20,20,20,1)]">
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-2 bg-red-50 text-red-600 rounded-lg">
                        <AlertTriangle size={20} />
                      </div>
                    </div>
                    <p className="text-[10px] uppercase tracking-widest opacity-50 font-bold">Low Stock Alerts</p>
                    <p className="text-3xl font-mono font-bold mt-1 text-red-600">{summary?.lowStockCount || 0}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Movement Chart */}
                  <div className="bg-white border border-[#141414] p-6 shadow-[4px_4px_0px_0px_rgba(20,20,20,1)]">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                        <TrendingUp size={14} /> Stock Movements (30d)
                      </h3>
                    </div>
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={movementData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#14141410" />
                          <XAxis 
                            dataKey="date" 
                            fontSize={10} 
                            tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                            stroke="#14141450"
                          />
                          <YAxis fontSize={10} stroke="#14141450" />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#fff', border: '1px solid #141414', borderRadius: '0', fontSize: '10px' }}
                            cursor={{ fill: '#14141405' }}
                          />
                          <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                          <Bar dataKey="incoming" name="Incoming" fill="#141414" />
                          <Bar dataKey="outgoing" name="Outgoing" fill="#14141440" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Top Moving SKUs */}
                  <div className="bg-white border border-[#141414] p-6 shadow-[4px_4px_0px_0px_rgba(20,20,20,1)]">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                        <TrendingUp size={14} /> Top Moving SKUs
                      </h3>
                    </div>
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart layout="vertical" data={analytics?.topMoving || []}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#14141410" />
                          <XAxis type="number" fontSize={10} stroke="#14141450" />
                          <YAxis dataKey="sku" type="category" fontSize={10} stroke="#14141450" width={80} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#fff', border: '1px solid #141414', borderRadius: '0', fontSize: '10px' }}
                          />
                          <Bar dataKey="quantity" name="Total Out" fill="#141414" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Stock Distribution by Size */}
                  <div className="bg-white border border-[#141414] p-6 shadow-[4px_4px_0px_0px_rgba(20,20,20,1)]">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                        <Box size={14} /> Stock by Size
                      </h3>
                    </div>
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={analytics?.stockBySize || []}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="count"
                            nameKey="size"
                          >
                            {(analytics?.stockBySize || []).map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#141414' : '#14141440'} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#fff', border: '1px solid #141414', borderRadius: '0', fontSize: '10px' }}
                          />
                          <Legend wrapperStyle={{ fontSize: '10px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Low Stock List */}
                  <div className="bg-white border border-[#141414] shadow-[4px_4px_0px_0px_rgba(20,20,20,1)] flex flex-col">
                    <div className="p-4 border-b border-[#141414] flex justify-between items-center bg-[#141414]/5">
                      <h3 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                        <AlertTriangle size={14} className="text-red-600" /> Critical Low Stock
                      </h3>
                    </div>
                    <div className="flex-1 overflow-auto max-h-64">
                      {lowStockItems.length > 0 ? (
                        <table className="w-full text-left border-collapse">
                          <tbody className="divide-y divide-[#141414]/10">
                            {lowStockItems.map(item => (
                              <tr key={item.id} className="hover:bg-red-50/30 transition-colors">
                                <td className="p-3">
                                  <p className="text-xs font-bold">{item.product_name}</p>
                                  <p className="text-[10px] font-mono opacity-50">{item.sku}</p>
                                </td>
                                <td className="p-3 text-[10px] font-mono">
                                  {item.size} / {item.color}
                                </td>
                                <td className="p-3 text-right">
                                  <span className="text-xs font-mono font-bold text-red-600">{item.stock_current}</span>
                                  <span className="text-[10px] opacity-40 ml-1">/ {item.stock_min}</span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <div className="p-12 text-center opacity-40 italic text-sm">No critical alerts found.</div>
                      )}
                    </div>
                  </div>

                  {/* Recent Activity Feed */}
                  <div className="bg-white border border-[#141414] shadow-[4px_4px_0px_0px_rgba(20,20,20,1)] flex flex-col">
                    <div className="p-4 border-b border-[#141414] flex justify-between items-center bg-[#141414]/5">
                      <h3 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                        <History size={14} /> Recent Activity
                      </h3>
                    </div>
                    <div className="flex-1 overflow-auto max-h-64">
                      {activity.length > 0 ? (
                        <div className="divide-y divide-[#141414]/10">
                          {activity.map(log => (
                            <div key={log.id} className="p-4 hover:bg-[#141414]/5 transition-colors">
                              <div className="flex justify-between items-start mb-1">
                                <span className="text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 bg-[#141414]/5">
                                  {log.action.replace('_', ' ')}
                                </span>
                                <span className="text-[9px] font-mono opacity-40">{new Date(log.createdAt).toLocaleTimeString()}</span>
                              </div>
                              <p className="text-xs">
                                <span className="font-bold">{log.user.email}</span> performed action on {log.entityType}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-12 text-center opacity-40 italic text-sm">No recent activity.</div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {view === 'inventory' && (
              <motion.div 
                key="inventory"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-6"
              >
                {/* Search & Filters */}
                <div className="flex flex-wrap gap-4 items-center bg-white border border-[#141414] p-4 shadow-[4px_4px_0px_0px_rgba(20,20,20,1)]">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 opacity-30" size={14} />
                    <input 
                      type="text" 
                      placeholder="Search products or SKUs..."
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      className="w-full bg-[#E4E3E0]/30 border-b border-[#141414]/10 py-2 pl-9 pr-4 text-xs focus:outline-none focus:border-[#141414]"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Filter size={14} className="opacity-50" />
                    <select 
                      value={categoryFilter}
                      onChange={e => setCategoryFilter(e.target.value)}
                      className="bg-transparent border-b border-[#141414]/10 py-2 text-xs focus:outline-none focus:border-[#141414] font-bold uppercase tracking-widest"
                    >
                      <option value="">All Categories</option>
                      <option value="Instruments">Instruments</option>
                      <option value="Implants">Implants</option>
                      <option value="Disposables">Disposables</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Product List */}
                  <div className="lg:col-span-1 space-y-4">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-xs font-bold uppercase tracking-widest">Products</h3>
                      <button 
                        onClick={() => setIsProductModalOpen(true)}
                        className="p-1.5 bg-[#141414] text-white rounded-md hover:scale-105 transition-transform"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    <div className="space-y-2">
                      {products.map(product => (
                        <button 
                          key={product.id}
                          onClick={() => {
                            setSelectedProduct(product);
                            fetchVariations(product.id);
                          }}
                          className={`w-full text-left p-4 border transition-all ${selectedProduct?.id === product.id ? 'border-[#141414] bg-white shadow-[4px_4px_0px_0px_rgba(20,20,20,1)]' : 'border-transparent bg-white/50 hover:bg-white'}`}
                        >
                          <div className="flex gap-3">
                            {product.images?.[0] ? (
                              <img src={product.images[0].url} className="w-10 h-10 object-cover border border-[#141414]/10" />
                            ) : (
                              <div className="w-10 h-10 bg-[#141414]/5 flex items-center justify-center border border-[#141414]/10">
                                <ImageIcon size={14} className="opacity-20" />
                              </div>
                            )}
                            <div>
                              <p className="text-[10px] uppercase tracking-widest opacity-50 font-bold">{product.category}</p>
                              <p className="font-bold text-sm">{product.name}</p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>

                    {/* Pagination */}
                    {pagination.totalPages > 1 && (
                      <div className="flex justify-center items-center gap-4 pt-4">
                        <button 
                          disabled={pagination.page === 1}
                          onClick={() => setPagination({...pagination, page: pagination.page - 1})}
                          className="p-2 border border-[#141414] disabled:opacity-20"
                        >
                          <ChevronLeft size={16} />
                        </button>
                        <span className="text-xs font-mono">{pagination.page} / {pagination.totalPages}</span>
                        <button 
                          disabled={pagination.page === pagination.totalPages}
                          onClick={() => setPagination({...pagination, page: pagination.page + 1})}
                          className="p-2 border border-[#141414] disabled:opacity-20"
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    )}
                  </div>

                {/* Variations Detail */}
                <div className="lg:col-span-2">
                  {selectedProduct ? (
                    <div className="bg-white border border-[#141414] min-h-[500px] flex flex-col">
                      <div className="p-6 border-b border-[#141414] bg-[#141414]/5 flex justify-between items-center">
                        <div>
                          <h3 className="text-xl font-serif italic font-bold">{selectedProduct.name}</h3>
                          <p className="text-xs opacity-60">{selectedProduct.brand} • {selectedProduct.category}</p>
                        </div>
                        <button 
                          onClick={() => setIsVariationModalOpen(true)}
                          className="flex items-center gap-2 bg-[#141414] text-white px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-[#141414]/90"
                        >
                          <Plus size={14} /> Add Variation
                        </button>
                      </div>

                      <div className="flex-1 overflow-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-[#141414] bg-[#E4E3E0]/30">
                              <th className="p-4 text-[10px] uppercase tracking-widest font-bold opacity-50">SKU</th>
                              <th className="p-4 text-[10px] uppercase tracking-widest font-bold opacity-50">Variant</th>
                              <th className="p-4 text-[10px] uppercase tracking-widest font-bold opacity-50 text-right">Price</th>
                              <th className="p-4 text-[10px] uppercase tracking-widest font-bold opacity-50 text-center">Stock</th>
                              <th className="p-4 text-[10px] uppercase tracking-widest font-bold opacity-50 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#141414]/10">
                            {variations.map(variant => (
                              <tr key={variant.id} className="hover:bg-[#141414]/5 transition-colors group">
                                <td className="p-4 font-mono text-xs">{variant.sku}</td>
                                <td className="p-4 text-xs">
                                  <span className="font-bold">{variant.size}</span> / {variant.color}
                                </td>
                                <td className="p-4 text-xs font-mono text-right">${variant.price.toFixed(2)}</td>
                                <td className="p-4 text-center">
                                  <div className={`inline-flex items-center gap-2 px-2 py-1 rounded-md font-mono text-xs ${variant.stock_current <= variant.stock_min ? 'bg-red-50 text-red-600 font-bold' : 'bg-green-50 text-green-600'}`}>
                                    {variant.stock_current}
                                    {variant.stock_current <= variant.stock_min && <AlertTriangle size={10} />}
                                  </div>
                                </td>
                                <td className="p-4 text-right">
                                  <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                      onClick={() => handleAddMovement(variant.id, 'in', 1)}
                                      className="p-1 hover:bg-green-100 text-green-600 rounded" title="Add Stock"
                                    >
                                      <ArrowUpRight size={16} />
                                    </button>
                                    <button 
                                      onClick={() => handleAddMovement(variant.id, 'out', 1)}
                                      className="p-1 hover:bg-red-100 text-red-600 rounded" title="Remove Stock"
                                    >
                                      <ArrowDownLeft size={16} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {variations.length === 0 && (
                          <div className="p-12 text-center opacity-40 italic text-sm">No variations defined.</div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="h-full border-2 border-dashed border-[#141414]/20 flex flex-col items-center justify-center text-[#141414]/40 p-12 text-center">
                      <Package size={48} className="mb-4 opacity-20" />
                      <p className="text-sm font-serif italic">Select a product to view surgical inventory details</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
            )}
            {view === 'users' && (
              <motion.div 
                key="users"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-bold uppercase tracking-widest">Team Management</h3>
                  <button 
                    onClick={() => setIsInviteModalOpen(true)}
                    className="flex items-center gap-2 bg-[#141414] text-white px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-[#141414]/90"
                  >
                    <Mail size={14} /> Invite Member
                  </button>
                </div>

                <div className="bg-white border border-[#141414] shadow-[4px_4px_0px_0px_rgba(20,20,20,1)]">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[#141414] bg-[#E4E3E0]/30">
                        <th className="p-4 text-[10px] uppercase tracking-widest font-bold opacity-50">User</th>
                        <th className="p-4 text-[10px] uppercase tracking-widest font-bold opacity-50">Role</th>
                        <th className="p-4 text-[10px] uppercase tracking-widest font-bold opacity-50">Joined</th>
                        <th className="p-4 text-[10px] uppercase tracking-widest font-bold opacity-50 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#141414]/10">
                      {companyUsers.map(u => (
                        <tr key={u.id} className="hover:bg-[#141414]/5 transition-colors">
                          <td className="p-4 text-xs font-mono">{u.email}</td>
                          <td className="p-4">
                            <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 border border-[#141414] ${u.role === 'admin' ? 'bg-[#141414] text-white' : 'bg-white text-[#141414]'}`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="p-4 text-xs opacity-60">{new Date(u.createdAt).toLocaleDateString()}</td>
                          <td className="p-4 text-right">
                            {u.id !== user.id && (
                              <button className="text-xs font-bold uppercase tracking-widest text-red-600 hover:underline">Remove</button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {view === 'audit-logs' && (
              <motion.div 
                key="audit-logs"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <h3 className="text-xs font-bold uppercase tracking-widest">System Audit Logs</h3>
                <div className="bg-white border border-[#141414] shadow-[4px_4px_0px_0px_rgba(20,20,20,1)]">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[#141414] bg-[#E4E3E0]/30">
                        <th className="p-4 text-[10px] uppercase tracking-widest font-bold opacity-50">Timestamp</th>
                        <th className="p-4 text-[10px] uppercase tracking-widest font-bold opacity-50">User</th>
                        <th className="p-4 text-[10px] uppercase tracking-widest font-bold opacity-50">Action</th>
                        <th className="p-4 text-[10px] uppercase tracking-widest font-bold opacity-50">Entity</th>
                        <th className="p-4 text-[10px] uppercase tracking-widest font-bold opacity-50">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#141414]/10">
                      {auditLogs.map(log => (
                        <tr key={log.id} className="hover:bg-[#141414]/5 transition-colors">
                          <td className="p-4 text-[10px] font-mono opacity-60">{new Date(log.createdAt).toLocaleString()}</td>
                          <td className="p-4 text-xs font-mono">{log.user.email}</td>
                          <td className="p-4">
                            <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 bg-[#141414]/5">
                              {log.action.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="p-4 text-xs opacity-60">{log.entityType} #{log.entityId}</td>
                          <td className="p-4 text-[10px] font-mono opacity-60 truncate max-w-xs">{log.details}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
            {view === 'billing' && (
              <motion.div 
                key="billing"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8"
              >
                <div className="max-w-4xl mx-auto">
                  <h3 className="text-xl font-serif italic font-bold mb-2">Subscription & Billing</h3>
                  <p className="text-sm opacity-60 mb-8">Manage your company's plan and billing details.</p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {[
                      { name: 'Starter', price: '$29', features: ['Up to 5 Users', '1,000 Products', 'Basic Analytics'], id: 'starter' },
                      { name: 'Pro', price: '$79', features: ['Up to 20 Users', '10,000 Products', 'Advanced Analytics', 'Priority Support'], id: 'pro' },
                      { name: 'Business', price: '$199', features: ['Unlimited Users', 'Unlimited Products', 'Custom Reports', 'API Access'], id: 'business' },
                    ].map(plan => (
                      <div key={plan.id} className="bg-white border border-[#141414] p-8 shadow-[8px_8px_0px_0px_rgba(20,20,20,1)] flex flex-col">
                        <h4 className="text-lg font-bold mb-1">{plan.name}</h4>
                        <div className="flex items-baseline gap-1 mb-6">
                          <span className="text-3xl font-mono font-bold">{plan.price}</span>
                          <span className="text-xs opacity-50">/ month</span>
                        </div>
                        <ul className="space-y-3 mb-8 flex-1">
                          {plan.features.map(f => (
                            <li key={f} className="text-xs flex items-center gap-2">
                              <Check size={14} className="text-green-600" /> {f}
                            </li>
                          ))}
                        </ul>
                        <button 
                          onClick={async () => {
                            const res = await fetch('/api/billing/checkout', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                              body: JSON.stringify({ plan: plan.id })
                            });
                            const data = await res.json();
                            if (data.url) window.location.href = data.url;
                          }}
                          className="w-full bg-[#141414] text-white py-3 text-xs font-bold uppercase tracking-widest hover:bg-[#141414]/90"
                        >
                          Upgrade to {plan.name}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {subscriptionError && (
              <div className="fixed inset-0 bg-[#E4E3E0]/90 backdrop-blur-sm z-[100] flex items-center justify-center p-8">
                <div className="bg-white border border-[#141414] p-12 shadow-[12px_12px_0px_0px_rgba(20,20,20,1)] max-w-md text-center">
                  <Lock size={48} className="mx-auto mb-6 opacity-20" />
                  <h3 className="text-2xl font-serif italic font-bold mb-4">Subscription Required</h3>
                  <p className="text-sm opacity-60 mb-8">
                    {subscriptionError.trialExpired 
                      ? "Your 14-day free trial has expired. Please choose a plan to continue managing your surgical inventory."
                      : "An active subscription is required to access this feature."}
                  </p>
                  <button 
                    onClick={() => {
                      setSubscriptionError(null);
                      setView('billing');
                    }}
                    className="w-full bg-[#141414] text-white py-4 text-xs font-bold uppercase tracking-widest hover:bg-[#141414]/90"
                  >
                    View Pricing Plans
                  </button>
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Modals */}
      <Modal 
        isOpen={isProductModalOpen} 
        onClose={() => setIsProductModalOpen(false)} 
        title="Create New Product"
      >
        <ProductForm 
          token={token} 
          onSuccess={() => {
            setIsProductModalOpen(false);
            fetchProducts();
          }}
          onCancel={() => setIsProductModalOpen(false)}
        />
      </Modal>

      <Modal 
        isOpen={isVariationModalOpen} 
        onClose={() => setIsVariationModalOpen(false)} 
        title={`Add Variation to ${selectedProduct?.name}`}
      >
        {selectedProduct && (
          <VariationForm 
            token={token}
            productId={selectedProduct.id}
            onSuccess={() => {
              setIsVariationModalOpen(false);
              fetchVariations(selectedProduct.id);
              fetchSummary();
              fetchLowStock();
            }}
            onCancel={() => setIsVariationModalOpen(false)}
          />
        )}
      </Modal>

      <Modal 
        isOpen={isInviteModalOpen} 
        onClose={() => setIsInviteModalOpen(false)} 
        title="Invite Team Member"
      >
        <InvitationForm 
          token={token}
          onSuccess={() => {
            setIsInviteModalOpen(false);
            fetchCompanyUsers();
          }}
          onCancel={() => setIsInviteModalOpen(false)}
        />
      </Modal>
    </div>
  );
};

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('it_token'));
  const [user, setUser] = useState<User | null>(JSON.parse(localStorage.getItem('it_user') || 'null'));
  const [route, setRoute] = useState<string>(window.location.pathname);

  useEffect(() => {
    const handlePopState = () => setRoute(window.location.pathname);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (path: string) => {
    window.history.pushState({}, '', path);
    setRoute(path);
  };

  const handleLogin = (token: string, user: User) => {
    setToken(token);
    setUser(user);
    localStorage.setItem('it_token', token);
    localStorage.setItem('it_user', JSON.stringify(user));
    navigate('/');
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('it_token');
    localStorage.removeItem('it_user');
    navigate('/');
  };

  // Routing
  if (route === '/verify-email') {
    return <VerifyEmail onComplete={() => navigate('/')} />;
  }

  if (route === '/reset-password') {
    return <ResetPassword onBack={() => navigate('/')} />;
  }

  if (route === '/forgot-password') {
    return <ForgotPassword onBack={() => navigate('/')} />;
  }

  if (!token || !user) {
    return (
      <LoginPage 
        onLogin={handleLogin} 
        onForgotPassword={() => navigate('/forgot-password')}
        onResetPassword={() => navigate('/reset-password')}
      />
    );
  }

  return <Dashboard token={token} user={user} onLogout={handleLogout} />;
}
