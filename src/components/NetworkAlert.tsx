import React from 'react';
import { motion } from 'motion/react';
import { WifiOff, ShieldAlert, Cpu, RefreshCw } from 'lucide-react';

interface NetworkAlertProps {
  message: string;
}

export const NetworkAlert: React.FC<NetworkAlertProps> = ({ message }) => {
  const isNetworkFailure = message.includes('NETWORK ERROR') || message.includes('OFFLINE');

  if (!isNetworkFailure) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-xs text-center font-bold tracking-wide italic"
      >
        {message}
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 bg-cyan-50 border border-cyan-100 rounded-3xl space-y-4 shadow-sm"
    >
      <div className="flex items-center gap-3 text-cyan-600">
        <WifiOff size={18} className="animate-pulse" />
        <span className="text-[10px] font-black uppercase tracking-[0.2em] italic">Transmission Failure</span>
      </div>
      
      <p className="text-slate-600 text-xs leading-relaxed font-semibold italic">
        {message}
      </p>

      <div className="pt-4 border-t border-slate-100 space-y-3">
        <div className="flex items-center gap-3 text-[9px] text-slate-400 font-bold uppercase tracking-widest italic">
          <ShieldAlert size={12} />
          Troubleshooting Protocol:
        </div>
        <ul className="space-y-2">
          {[
            'Disable active VPN or Tunneling software',
            'Check Firewall/Antivirus (block Google Identity)',
            'Disable browser extensions (Ad-blockers)',
            'Switch to a different network (Mobile Hotspot)'
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-2 text-[10px] text-slate-500 italic font-medium">
              <span className="text-cyan-600/40">[{i + 1}]</span>
              {step}
            </li>
          ))}
        </ul>
      </div>

      <button 
        onClick={() => window.location.reload()}
        className="w-full flex items-center justify-center gap-2 py-3 bg-white hover:bg-slate-50 rounded-xl text-[10px] font-black uppercase tracking-widest text-cyan-600 transition-all border border-cyan-100 shadow-sm italic"
      >
        <RefreshCw size={12} />
        Retry Neural Handshake
      </button>
    </motion.div>
  );
};
