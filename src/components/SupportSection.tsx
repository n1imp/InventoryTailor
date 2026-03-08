import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Mail, 
  HelpCircle, 
  MessageSquare, 
  Send, 
  CheckCircle2,
  ExternalLink,
  BookOpen
} from 'lucide-react';

export const SupportSection = ({ token }: { token: string }) => {
  const [feedback, setFeedback] = useState('');
  const [type, setType] = useState('feedback');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/support/feedback', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ message: feedback, type }),
      });
      if (res.ok) {
        setSuccess(true);
        setFeedback('');
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12">
      <div className="text-center mb-12">
        <h3 className="text-2xl font-serif italic font-bold mb-2">Help & Support</h3>
        <p className="text-sm opacity-60">We're here to help you master your inventory.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        {/* Help Documentation */}
        <div className="space-y-8">
          <div className="bg-white border border-[#141414] p-8 shadow-[8px_8px_0px_0px_rgba(20,20,20,1)]">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-[#141414]/5 rounded-lg">
                <BookOpen size={20} />
              </div>
              <h4 className="text-sm font-bold uppercase tracking-widest">Documentation</h4>
            </div>
            <ul className="space-y-4">
              {[
                'Getting Started Guide',
                'Managing Multi-Variant Products',
                'Understanding Audit Logs',
                'Setting Up Team Roles',
                'Exporting Inventory Data'
              ].map(item => (
                <li key={item}>
                  <a href="#" className="text-xs flex items-center justify-between group hover:text-[#141414] opacity-60 hover:opacity-100 transition-all">
                    {item} <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-[#141414] text-white p-8 shadow-[8px_8px_0px_0px_rgba(228,227,224,1)]">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-white/10 rounded-lg">
                <Mail size={20} />
              </div>
              <h4 className="text-sm font-bold uppercase tracking-widest">Direct Support</h4>
            </div>
            <p className="text-xs opacity-60 leading-relaxed mb-6">
              Need help with something specific? Our support team is available Monday through Friday, 9AM - 6PM EST.
            </p>
            <a 
              href="mailto:support@inventorytailor.com" 
              className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest border-b border-white/30 pb-1 hover:border-white transition-colors"
            >
              support@inventorytailor.com
            </a>
          </div>
        </div>

        {/* Feedback Form */}
        <div className="bg-white border border-[#141414] p-8 shadow-[8px_8px_0px_0px_rgba(20,20,20,1)]">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-[#141414]/5 rounded-lg">
              <MessageSquare size={20} />
            </div>
            <h4 className="text-sm font-bold uppercase tracking-widest">Send Feedback</h4>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest opacity-50 mb-2">Feedback Type</label>
              <div className="flex gap-4">
                {['feedback', 'bug', 'feature'].map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-widest border transition-all ${type === t ? 'bg-[#141414] text-white border-[#141414]' : 'bg-white border-[#141414]/10 hover:border-[#141414]'}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest opacity-50 mb-2">Your Message</label>
              <textarea 
                required
                rows={6}
                value={feedback}
                onChange={e => setFeedback(e.target.value)}
                placeholder="Tell us what's on your mind..."
                className="w-full border border-[#141414]/10 p-4 focus:outline-none focus:border-[#141414] font-mono text-xs mt-1"
              />
            </div>

            <button 
              type="submit"
              disabled={loading || !feedback}
              className="w-full bg-[#141414] text-white py-4 text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-[#141414]/90 transition-colors disabled:opacity-50"
            >
              {loading ? 'Sending...' : success ? <><CheckCircle2 size={16} /> Sent!</> : <><Send size={16} /> Submit Feedback</>}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
