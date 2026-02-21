// MemberInfo — displays selected member's details with usage stats

import { motion } from 'framer-motion';
import { User, Calendar, CreditCard, Activity } from 'lucide-react';

function UsageBar({ label, current, max, unit = '' }) {
  const pct = max > 0 ? (current / max) * 100 : 0;
  const color =
    pct >= 100 ? 'bg-laya-coral' : pct >= 70 ? 'bg-laya-amber' : 'bg-laya-teal';
  const barBg =
    pct >= 100 ? 'bg-red-100' : 'bg-gray-100';

  return (
    <div className="mb-2.5">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-500 font-medium">{label}</span>
        <span className={`font-semibold ${pct >= 100 ? 'text-laya-coral' : pct >= 70 ? 'text-laya-amber' : 'text-gray-600'}`}>
          {current}/{max} {unit} {pct >= 100 ? '• MAXED' : ''}
        </span>
      </div>
      <div className={`h-2 ${barBg} rounded-full overflow-hidden`}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(pct, 100)}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className={`h-full rounded-full ${color}`}
        />
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, children }) {
  return (
    <div className="flex items-start gap-2.5 py-1.5">
      <Icon size={13} className="text-laya-teal shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <span className="text-[11px] text-gray-400 block leading-tight">{label}</span>
        <span className="text-xs text-laya-navy font-medium">{children}</span>
      </div>
    </div>
  );
}

export default function MemberInfo({ member }) {
  if (!member) return null;

  const usage = member.current_year_usage || {};
  const initials = `${member.first_name?.[0] || ''}${member.last_name?.[0] || ''}`;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35 }}
      className="bg-white rounded-2xl border border-gray-100 p-0 shadow-sm overflow-hidden"
    >
      {/* Header with avatar */}
      <div className="gradient-teal px-4 py-4 flex items-center gap-3">
        <div className="w-11 h-11 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white font-bold text-sm border-2 border-white/30">
          {initials}
        </div>
        <div className="text-white min-w-0">
          <h3 className="font-bold text-sm leading-tight truncate">
            {member.first_name} {member.last_name}
          </h3>
          <p className="text-[11px] text-white/70 font-mono">{member.member_id}</p>
        </div>
        <span
          className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full ${
            member.status === 'Active'
              ? 'bg-white/20 text-white'
              : 'bg-red-400/30 text-red-100'
          }`}
        >
          {member.status}
        </span>
      </div>

      <div className="p-4">
        {/* Personal info */}
        <div className="mb-4">
          <InfoRow icon={CreditCard} label="Scheme">
            {member.scheme_name}
          </InfoRow>
          <InfoRow icon={Calendar} label="Policy Start">
            {member.policy_start_date}
          </InfoRow>
        </div>

        {/* Usage stats */}
        <div className="mb-1">
          <h4 className="font-semibold text-laya-navy text-xs mb-3 flex items-center gap-1.5">
            <Activity size={12} className="text-laya-teal" />
            Usage ({usage.year || 2026} {usage.quarter || 'Q1'})
          </h4>

          <UsageBar label="GP Visits" current={usage.gp_visits_count || 0} max={10} />
          <UsageBar label="Consultant" current={usage.consultant_visits_count || 0} max={10} />
          <UsageBar label="Prescriptions" current={usage.prescription_count || 0} max={4} />
          <UsageBar label="Dental/Optical" current={usage.dental_optical_count || 0} max={10} />
          <UsageBar label="Scans" current={usage.scan_count || 0} max={10} />
          <UsageBar label="Hospital Days" current={usage.hospital_days_count || 0} max={40} />
        </div>

        <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
          <div className="flex justify-between">
            <span>Quarterly Receipts</span>
            <span>
              <strong className="text-laya-navy">€{(usage.q_accumulated_receipts || 0).toFixed(2)}</strong>
              <span className="text-gray-300 ml-1">/ €150</span>
            </span>
          </div>
        </div>

        {/* Claims History */}
        {member.claims_history && member.claims_history.length > 0 && (
          <div className="mt-4 pt-3 border-t border-gray-100">
            <h4 className="font-semibold text-laya-navy text-xs mb-2 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-laya-teal" />
              Recent Claims
            </h4>
            <div className="space-y-1.5 max-h-36 overflow-y-auto">
              {member.claims_history.map((claim, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="text-[11px] flex justify-between items-center text-gray-500 bg-gray-50/80 rounded-lg px-3 py-2 border border-gray-100/50"
                >
                  <span className="font-medium text-gray-600 truncate max-w-[90px]">{claim.treatment_type}</span>
                  <span className="font-mono font-semibold text-laya-navy">€{claim.claimed_amount}</span>
                  <span
                    className={`font-bold text-[10px] px-1.5 py-0.5 rounded ${
                      claim.status === 'Approved'
                        ? 'text-laya-green bg-green-50'
                        : claim.status === 'Rejected'
                        ? 'text-laya-coral bg-red-50'
                        : 'text-laya-amber bg-amber-50'
                    }`}
                  >
                    {claim.status}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
