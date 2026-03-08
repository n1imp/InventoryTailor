import React from 'react';
import { motion } from 'motion/react';
import { 
  CheckCircle2, 
  Circle, 
  Package, 
  ArrowUpRight, 
  Users,
  ChevronRight
} from 'lucide-react';

interface OnboardingStatus {
  onboardingCompleted: boolean;
  hasCreatedProduct: boolean;
  hasAddedStock: boolean;
  hasInvitedMember: boolean;
}

export const OnboardingChecklist = ({ 
  status, 
  onAction 
}: { 
  status: OnboardingStatus, 
  onAction: (view: any) => void 
}) => {
  if (status.onboardingCompleted) return null;

  const steps = [
    {
      id: 'product',
      title: 'Create your first product',
      desc: 'Add a product to your catalog to start tracking.',
      completed: status.hasCreatedProduct,
      icon: <Package size={16} />,
      view: 'inventory'
    },
    {
      id: 'stock',
      title: 'Add initial stock',
      desc: 'Record your first stock movement to update inventory.',
      completed: status.hasAddedStock,
      icon: <ArrowUpRight size={16} />,
      view: 'inventory'
    },
    {
      id: 'team',
      title: 'Invite a team member',
      desc: 'Collaborate with your team by sending an invite.',
      completed: status.hasInvitedMember,
      icon: <Users size={16} />,
      view: 'users'
    }
  ];

  const completedCount = steps.filter(s => s.completed).length;
  const progress = (completedCount / steps.length) * 100;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-[#141414] p-6 shadow-[8px_8px_0px_0px_rgba(20,20,20,1)] mb-8"
    >
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-widest">Getting Started</h3>
          <p className="text-xs opacity-50 mt-1">Complete these steps to set up your workspace.</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-mono font-bold">{completedCount}/{steps.length}</p>
          <div className="w-32 h-1.5 bg-[#141414]/5 mt-1 border border-[#141414]/10">
            <div 
              className="h-full bg-[#141414] transition-all duration-500" 
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {steps.map((step, i) => (
          <button
            key={step.id}
            onClick={() => onAction(step.view)}
            className={`flex flex-col p-4 border text-left transition-all ${step.completed ? 'bg-emerald-50/50 border-emerald-200' : 'bg-white border-[#141414]/10 hover:border-[#141414]'}`}
          >
            <div className="flex justify-between items-start mb-3">
              <div className={`p-2 rounded-lg ${step.completed ? 'bg-emerald-100 text-emerald-600' : 'bg-[#141414]/5'}`}>
                {step.icon}
              </div>
              {step.completed ? (
                <CheckCircle2 size={18} className="text-emerald-600" />
              ) : (
                <Circle size={18} className="opacity-20" />
              )}
            </div>
            <h4 className={`text-xs font-bold uppercase tracking-tight mb-1 ${step.completed ? 'text-emerald-700' : ''}`}>
              {step.title}
            </h4>
            <p className="text-[10px] opacity-50 leading-relaxed mb-4">{step.desc}</p>
            {!step.completed && (
              <div className="mt-auto flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest">
                Go to {step.view} <ChevronRight size={12} />
              </div>
            )}
          </button>
        ))}
      </div>

      {completedCount === steps.length && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-6 p-4 bg-[#141414] text-white flex justify-between items-center"
        >
          <p className="text-xs font-bold uppercase tracking-widest">Workspace ready! You're all set.</p>
          <button 
            onClick={async () => {
              await fetch('/api/company/onboarding/complete', {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
              });
              window.location.reload();
            }}
            className="text-[10px] font-bold uppercase tracking-widest border border-white/30 px-3 py-1.5 hover:bg-white hover:text-[#141414] transition-colors"
          >
            Dismiss Checklist
          </button>
        </motion.div>
      )}
    </motion.div>
  );
};
