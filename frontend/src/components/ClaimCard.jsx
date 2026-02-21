// ClaimCard — displays the claim decision result

import { motion } from 'framer-motion';
import { Euro, AlertTriangle, Info } from 'lucide-react';
import StatusBadge from './StatusBadge';
import AgentTrace from './AgentTrace';

export default function ClaimCard({ metadata }) {
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className={`mt-4 rounded-2xl border-2 ${borderColor} bg-gradient-to-b ${bgAccent} p-5 shadow-sm`}
    >
      {/* Decision header */}
      <div className="flex items-center justify-between mb-4">
        <StatusBadge decision={decision} />
        {payout_amount > 0 && (
          <div className="flex items-center gap-1.5">
            <Euro size={18} className="text-laya-teal" />
            <span className="text-2xl font-extrabold text-laya-teal tracking-tight">
              {payout_amount.toFixed(2)}
            </span>
          </div>
        )}
      </div>

      {/* Flags */}
      {flags && flags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {flags.map((flag, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 font-medium border border-amber-200/50"
            >
              <AlertTriangle size={11} />
              {flag}
            </span>
          ))}
        </div>
      )}

      {/* Missing info */}
      {needs_info && needs_info.length > 0 && (
        <div className="mb-3 text-sm text-orange-700 bg-orange-50 border border-orange-200/50 rounded-xl p-3 flex items-start gap-2">
          <Info size={15} className="shrink-0 mt-0.5 text-orange-500" />
          <div>
            <span className="font-semibold">Required:</span> {needs_info.join(', ')}
          </div>
        </div>
      )}

      {/* Agent trace */}
      <AgentTrace trace={agent_trace || []} />
    </motion.div>
  );
}
