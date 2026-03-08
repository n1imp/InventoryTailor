import React from 'react';
import { motion } from 'motion/react';
import { 
  Package, 
  ShieldCheck, 
  TrendingUp, 
  Users, 
  ArrowRight, 
  CheckCircle2,
  Box,
  Zap,
  BarChart3
} from 'lucide-react';

export const LandingPage = ({ onGetStarted, onLogin }: { onGetStarted: () => void, onLogin: () => void }) => {
  return (
    <div className="min-h-screen bg-[#E4E3E0] font-sans text-[#141414] overflow-x-hidden">
      {/* Navigation */}
      <nav className="h-20 border-b border-[#141414] bg-white/80 backdrop-blur-md sticky top-0 z-50 px-8 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-serif italic font-bold">InventoryTailor</h1>
        </div>
        <div className="flex items-center gap-6">
          <button onClick={onLogin} className="text-sm font-bold uppercase tracking-widest hover:opacity-60 transition-opacity">Login</button>
          <button 
            onClick={onGetStarted}
            className="bg-[#141414] text-white px-6 py-2.5 text-xs font-bold uppercase tracking-widest hover:bg-[#141414]/90 transition-colors"
          >
            Start Free Trial
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-24 px-8 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-block px-3 py-1 bg-[#141414] text-white text-[10px] font-bold uppercase tracking-[0.2em] mb-6">
            Surgical Precision for Modern Brands
          </div>
          <h2 className="text-6xl md:text-7xl font-serif italic font-bold leading-[0.9] mb-8">
            Inventory management, <br />
            <span className="not-italic font-sans tracking-tighter">tailored to you.</span>
          </h2>
          <p className="text-lg opacity-70 mb-10 max-w-lg">
            Stop fighting spreadsheets. InventoryTailor provides the surgical control you need to scale your brand with confidence. Real-time tracking, advanced analytics, and team collaboration.
          </p>
          <div className="flex flex-wrap gap-4">
            <button 
              onClick={onGetStarted}
              className="bg-[#141414] text-white px-8 py-4 text-sm font-bold uppercase tracking-widest flex items-center gap-2 hover:gap-4 transition-all"
            >
              Get Started for Free <ArrowRight size={18} />
            </button>
            <div className="flex items-center gap-2 px-6 py-4 border border-[#141414] text-xs font-bold uppercase tracking-widest">
              14-Day Free Trial • No Credit Card
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative"
        >
          <div className="bg-white border-2 border-[#141414] shadow-[24px_24px_0px_0px_rgba(20,20,20,1)] p-4 aspect-square flex items-center justify-center overflow-hidden">
             <img 
               src="https://picsum.photos/seed/inventory/800/800" 
               alt="Dashboard Preview" 
               className="w-full h-full object-cover grayscale contrast-125"
               referrerPolicy="no-referrer"
             />
          </div>
          <div className="absolute -bottom-8 -left-8 bg-[#141414] text-white p-6 shadow-[12px_12px_0px_0px_rgba(228,227,224,1)]">
            <p className="text-4xl font-mono font-bold">99.9%</p>
            <p className="text-[10px] uppercase tracking-widest opacity-60">Inventory Accuracy</p>
          </div>
        </motion.div>
      </section>

      {/* Features Grid */}
      <section className="py-24 bg-white border-y border-[#141414]">
        <div className="max-w-7xl mx-auto px-8">
          <div className="text-center mb-20">
            <h3 className="text-xs font-bold uppercase tracking-[0.3em] opacity-40 mb-4">Core Capabilities</h3>
            <h2 className="text-4xl font-serif italic font-bold">Everything you need to scale.</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              {
                icon: <Package size={32} />,
                title: "Multi-Variant Control",
                desc: "Manage thousands of SKUs across sizes, colors, and categories with surgical precision."
              },
              {
                icon: <Zap size={32} />,
                title: "Real-Time Sync",
                desc: "Every stock movement is tracked instantly. Never oversell or run out of stock again."
              },
              {
                icon: <BarChart3 size={32} />,
                title: "Advanced Analytics",
                desc: "Deep insights into turnover, top-moving items, and stock value distribution."
              },
              {
                icon: <Users size={32} />,
                title: "Team Collaboration",
                desc: "Invite your team with granular roles. Audit logs track every single action taken."
              },
              {
                icon: <ShieldCheck size={32} />,
                title: "Enterprise Security",
                desc: "Bank-grade encryption, rate limiting, and secure authentication for your data."
              },
              {
                icon: <Box size={32} />,
                title: "Automated Alerts",
                desc: "Get notified before stock runs low. Customizable thresholds for every variant."
              }
            ].map((f, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="p-8 border border-[#141414]/10 hover:border-[#141414] transition-colors group"
              >
                <div className="mb-6 group-hover:scale-110 transition-transform inline-block">
                  {f.icon}
                </div>
                <h4 className="text-lg font-bold mb-3 uppercase tracking-tight">{f.title}</h4>
                <p className="text-sm opacity-60 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-24 px-8 max-w-7xl mx-auto">
        <div className="text-center mb-20">
          <h3 className="text-xs font-bold uppercase tracking-[0.3em] opacity-40 mb-4">Pricing Plans</h3>
          <h2 className="text-4xl font-serif italic font-bold">Scales with your business.</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              name: "Starter",
              price: "29",
              desc: "Perfect for emerging brands.",
              features: ["Up to 5 Users", "50 Products", "Basic Analytics", "Email Support"],
              cta: "Start Free Trial"
            },
            {
              name: "Pro",
              price: "79",
              desc: "For growing businesses.",
              features: ["Up to 20 Users", "500 Products", "Advanced Analytics", "Priority Support", "Audit Logs"],
              cta: "Start Free Trial",
              popular: true
            },
            {
              name: "Business",
              price: "199",
              desc: "For large scale operations.",
              features: ["Unlimited Users", "Unlimited Products", "Custom Reports", "API Access", "Dedicated Manager"],
              cta: "Contact Sales"
            }
          ].map((p, i) => (
            <div 
              key={i}
              className={`relative bg-white border-2 border-[#141414] p-10 flex flex-col ${p.popular ? 'shadow-[16px_16px_0px_0px_rgba(20,20,20,1)] -translate-y-4' : 'shadow-[8px_8px_0px_0px_rgba(20,20,20,1)]'}`}
            >
              {p.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#141414] text-white px-4 py-1 text-[10px] font-bold uppercase tracking-widest">
                  Most Popular
                </div>
              )}
              <h4 className="text-xl font-bold mb-2">{p.name}</h4>
              <p className="text-xs opacity-50 mb-6">{p.desc}</p>
              <div className="flex items-baseline gap-1 mb-8">
                <span className="text-4xl font-mono font-bold">${p.price}</span>
                <span className="text-xs opacity-40">/ month</span>
              </div>
              <ul className="space-y-4 mb-10 flex-1">
                {p.features.map((f, j) => (
                  <li key={j} className="text-xs flex items-center gap-3">
                    <CheckCircle2 size={16} className="text-emerald-600" /> {f}
                  </li>
                ))}
              </ul>
              <button 
                onClick={onGetStarted}
                className={`w-full py-4 text-xs font-bold uppercase tracking-widest transition-all ${p.popular ? 'bg-[#141414] text-white hover:bg-[#141414]/90' : 'border border-[#141414] hover:bg-[#141414]/5'}`}
              >
                {p.cta}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Footer */}
      <section className="py-24 bg-[#141414] text-white text-center px-8">
        <h2 className="text-5xl font-serif italic font-bold mb-8">Ready to take control?</h2>
        <p className="text-lg opacity-60 mb-12 max-w-xl mx-auto">
          Join hundreds of brands using InventoryTailor to manage their surgical inventory with precision.
        </p>
        <button 
          onClick={onGetStarted}
          className="bg-white text-[#141414] px-12 py-5 text-sm font-bold uppercase tracking-widest hover:scale-105 transition-transform"
        >
          Start Your 14-Day Free Trial
        </button>
      </section>

      <footer className="py-12 px-8 border-t border-[#141414] bg-white text-center">
        <p className="text-[10px] uppercase tracking-widest opacity-40">
          © 2026 InventoryTailor Inc. All rights reserved.
        </p>
      </footer>
    </div>
  );
};
