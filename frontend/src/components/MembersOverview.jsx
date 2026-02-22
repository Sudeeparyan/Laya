/**
 * MembersOverview — Developer dashboard member risk overview
 * Shows top members by risk score with usage indicators.
 */

import { motion } from 'framer-motion';
import { Users, AlertTriangle, Shield, Activity, ChevronRight } from 'lucide-react';

function RiskBadge({ score }) {
  const color = score >= 60 ? 'bg-laya-coral text-white' :
                score >= 30 ? 'bg-laya-amber text-white' :
                'bg-laya-green text-white';
  const label = score >= 60 ? 'High' : score >= 30 ? 'Medium' : 'Low';

  return (
    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${color}`}>
      {label} ({score})
    </span>
  );
}

export default function MembersOverview({ riskScores, onSelectMember }) {
  if (!riskScores || riskScores.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/50">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-laya-amber flex items-center justify-center">
            <AlertTriangle size={14} className="text-white" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-laya-navy">Risk Monitor</h3>
            <p className="text-[9px] text-gray-400">Members approaching limits</p>
          </div>
        </div>
      </div>

      <div className="divide-y divide-gray-50 max-h-[280px] overflow-y-auto">
        {riskScores.map((member, i) => (
          <motion.div
            key={member.member_id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => onSelectMember?.(member.member_id)}
            className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50/80 cursor-pointer transition-colors group"
          >
            <div className="w-8 h-8 rounded-full gradient-teal flex items-center justify-center text-white text-[10px] font-bold shrink-0">
              {member.member_name?.split(' ').map(n => n[0]).join('') || '??'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold text-laya-navy truncate">{member.member_name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[9px] text-gray-400 font-mono">{member.member_id}</span>
                <span className="text-[9px] text-gray-300">&bull;</span>
                <span className="text-[9px] text-gray-400">{member.total_claims} claims</span>
              </div>
            </div>
            <RiskBadge score={member.risk_score} />
            <ChevronRight size={12} className="text-gray-300 group-hover:text-laya-teal transition-colors" />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
