// ClaimCard — displays the claim decision result with animated payout

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Euro, AlertTriangle, Info, Copy, Check } from 'lucide-react';
import StatusBadge from './StatusBadge';
import AgentTrace from './AgentTrace';

function AnimatedCounter({ value, duration = 1000 }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (value <= 0) return;
    const startTime = Date.now();
    const step = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(value * eased);
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [value, duration]);

  return <span>{display.toFixed(2)}</span>;
}

export default function ClaimCard({ metadata }) {
  const [copied, setCopied] = useState(false);

  if (!metadata || !metadata.decision) return null;

  const { decision, payout_amount, agent_trace, flags, needs_info } = metadata;

  const borderColor =
    decision === 'APPROVED'
      ? 'border-laya-green/30'
      : decision === 'REJECTED'
      ? 'border-laya-coral/30'
      : 'border-laya-amber/30';

  const bgAccent =
    decision === 'APPROVED'
      ? 'from-green-50/80 to-white'
      : decision === 'REJECTED'
      ? 'from-red-50/60 to-white'
      : 'from-amber-50/60 to-white';

  const handleCopyRef = () => {
    const ref = `Claim: ${decision} | Payout: EUR${payout_amount?.toFixed(2) || '0.00'} | ${agent_trace?.length || 0} steps`;
    navigator.clipboard.writeText(ref);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className={`mt-4 rounded-2xl border-2 ${borderColor} bg-gradient-to-b ${bgAccent} p-5 shadow-sm`}
    >
      {/* Decision header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <StatusBadge decision={decision} />
          <button
            onClick={handleCopyRef}
            className="p-1 rounded-md hover:bg-gray-100 text-gray-300 hover:text-gray-500 transition-colors"
            title="Copy claim reference"
          >
            {copied ? <Check size={12} className="text-laya-green" /> : <Copy size={12} />}
          </button>
        </div>
        {payout_amount > 0 && (
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
            className="flex items-center gap-1.5"
          >
            <Euro size={18} className="text-laya-teal" />
            <span className="text-2xl font-extrabold text-laya-teal tracking-tight">
              <AnimatedCounter value={payout_amount} />
            </span>
          </motion.div>
        )}
      </div>

      {/* Flags */}
      {flags && flags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {flags.map((flag, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 * i }}
              className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 font-medium border border-amber-200/50"
            >
              <AlertTriangle size={11} />
              {flag}
            </motion.span>
          ))}
        </div>
      )}

      {/* Missing info */}
      {needs_info && needs_info.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-3 text-sm text-orange-700 bg-orange-50 border border-orange-200/50 rounded-xl p-3 flex items-start gap-2"
        >
          <Info size={15} className="shrink-0 mt-0.5 text-orange-500" />
          <div>
            <span className="font-semibold">Required:</span> {needs_info.join(', ')}
          </div>
        </motion.div>
      )}

      {/* Agent trace */}
      <AgentTrace trace={agent_trace || []} />
    </motion.div>
  );
}
