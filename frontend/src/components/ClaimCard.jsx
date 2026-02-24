// ClaimCard — displays the claim decision result with animated payout

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Euro, AlertTriangle, Info, Copy, Check, ExternalLink } from 'lucide-react';
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

  const { decision, payout_amount, agent_trace, flags, needs_info, source_url } = metadata;

  // PENDING-specific "Under Review" card
  if (decision === 'PENDING') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="mt-4 claim-card pending-review bg-white/90 backdrop-blur-md border border-blue-100 shadow-md shadow-blue-100 p-4 rounded-2xl"
      >
        <div className="flex items-center gap-3 mb-3">
          <span className="text-2xl">⏳</span>
          <div>
            <h4 className="text-sm font-bold text-laya-amber">Claim Under Review</h4>
            <p className="text-[11px] text-gray-500">Our team is reviewing your claim. You'll be notified when a decision is made.</p>
          </div>
        </div>
        {flags && flags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {flags.map((flag, i) => (
              <span key={i} className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-lg bg-amber-50 text-amber-700 font-medium border border-amber-200">
                {flag}
              </span>
            ))}
          </div>
        )}
        <div className="pending-progress-bar" />
      </motion.div>
    );
  }

  const borderColor =
    decision === 'APPROVED'
      ? 'border-green-200 shadow-md shadow-green-100'
      : decision === 'REJECTED'
      ? 'border-red-200 shadow-md shadow-red-100'
      : 'border-amber-200 shadow-md shadow-amber-100';

  const bgAccent =
    decision === 'APPROVED'
      ? 'from-green-50 to-white'
      : decision === 'REJECTED'
      ? 'from-red-50 to-white'
      : 'from-amber-50 to-white';

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
      className={`mt-4 rounded-2xl border ${borderColor} bg-gradient-to-b ${bgAccent} p-5 backdrop-blur-md`}
    >
      {/* Decision header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <StatusBadge decision={decision} />
          <button
            onClick={handleCopyRef}
            className="p-1 rounded-md hover:bg-blue-50 text-gray-400 hover:text-laya-navy transition-colors"
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
            <Euro size={18} className="text-laya-blue-mid" />
            <span className="text-2xl font-extrabold text-laya-blue-mid tracking-tight">
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
              className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 font-medium border border-amber-200"
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
          className="mb-3 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2"
        >
          <Info size={15} className="shrink-0 mt-0.5 text-amber-600" />
          <div>
            <span className="font-semibold">Required:</span> {needs_info.join(', ')}
          </div>
        </motion.div>
      )}

      {/* Source Document Link */}
      {source_url && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mb-3 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-teal-50 border border-teal-200"
        >
          <span className="text-sm">📄</span>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-teal-600 font-medium">Decision based on official policy document</p>
            <a
              href={source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-700 hover:text-teal-800 hover:underline transition-colors"
            >
              <ExternalLink size={10} />
              View IPID Source Document
            </a>
          </div>
        </motion.div>
      )}

      {/* Agent trace */}
      <AgentTrace trace={agent_trace || []} />
    </motion.div>
  );
}
