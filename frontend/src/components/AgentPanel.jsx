import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle, XCircle, Loader, Circle, ChevronRight,
  User, Calendar, CreditCard, Activity, Euro, AlertTriangle, Info,
  PanelRightClose, Shield, Network
} from 'lucide-react';

// Pipeline stage definitions matching the backend graph flow
// Updated: Intake + Eligibility now run in parallel as "Parallel Validation"
const PIPELINE_STAGES = [
  { key: 'Setup', label: 'Setup', desc: 'Loading member data' },
  { key: 'Validation', label: 'Parallel Validation', desc: 'Intake + Eligibility (concurrent)' },
  { key: 'Principal', label: 'Principal Agent', desc: 'Routing to specialist' },
  { key: 'Treatment', label: 'Treatment Review', desc: 'Processing claim details' },
  { key: 'Decision', label: 'Final Decision', desc: 'Aggregating results' },
];

function getStageStatus(stageKey, agentTrace, isProcessing, decision) {
  if (!agentTrace || agentTrace.length === 0) {
    return isProcessing && stageKey === 'Setup' ? 'active' : 'pending';
  }

  const traceText = agentTrace.join(' ').toLowerCase();

  const stageMap = {
    Setup: ['setup'],
    Validation: ['parallel validator', 'intake', 'eligibility', 'form classifier', 'compliance', 'waiting period', 'threshold', 'duplicate'],
    Principal: ['principal'],
    Treatment: ['outpatient', 'hospital', 'exceptions', 'gp', 'consultant', 'pharmacy', 'therapy', 'dental', 'optical', 'scan', 'inpatient', 'maternity'],
    Decision: ['decision agent'],
  };

  const keywords = stageMap[stageKey] || [];
  const found = keywords.some((kw) => traceText.includes(kw));

  if (!found) {
    // Check if any later stage has been reached
    const stageOrder = PIPELINE_STAGES.map((s) => s.key);
    const currentIndex = stageOrder.indexOf(stageKey);
    const laterStages = stageOrder.slice(currentIndex + 1);
    const laterFound = laterStages.some((laterKey) => {
      const laterKeywords = stageMap[laterKey] || [];
      return laterKeywords.some((kw) => traceText.includes(kw));
    });
    if (laterFound) return 'skipped';
    if (isProcessing) {
      // Find the last completed stage
      const completedStages = stageOrder.filter((sk) => {
        const kws = stageMap[sk] || [];
        return kws.some((kw) => traceText.includes(kw));
      });
      const lastCompleted = completedStages[completedStages.length - 1];
      const lastCompletedIdx = stageOrder.indexOf(lastCompleted);
      if (currentIndex === lastCompletedIdx + 1) return 'active';
    }
    return 'pending';
  }

  // Check if this stage has a failure/rejection
  const stageTraces = agentTrace.filter((t) =>
    keywords.some((kw) => t.toLowerCase().includes(kw))
  );
  const hasFail = stageTraces.some(
    (t) => t.toLowerCase().includes('rejected') || t.toLowerCase().includes('error')
  );

  if (hasFail && decision === 'REJECTED') return 'failed';

  // If processing is still happening and this is the last found stage, mark active
  if (isProcessing) {
    const stageOrder = PIPELINE_STAGES.map((s) => s.key);
    const currentIndex = stageOrder.indexOf(stageKey);
    const laterStages = stageOrder.slice(currentIndex + 1);
    const laterFound = laterStages.some((laterKey) => {
      const laterKeywords = stageMap[laterKey] || [];
      return laterKeywords.some((kw) => traceText.includes(kw));
    });
    if (!laterFound) return 'active';
  }

  return 'completed';
}

function UsageBar({ label, current, max }) {
  const pct = max > 0 ? (current / max) * 100 : 0;
  const color = pct >= 100 ? 'bg-laya-coral' : pct >= 70 ? 'bg-laya-amber' : 'bg-laya-blue-mid';
  const barBg = pct >= 100 ? 'bg-red-100' : 'bg-blue-50';

  return (
    <div className="mb-2">
      <div className="flex justify-between text-[11px] mb-0.5">
        <span className="text-gray-500">{label}</span>
        <span className={`font-semibold ${pct >= 100 ? 'text-laya-coral' : 'text-gray-600'}`}>
          {current}/{max}
        </span>
      </div>
      <div className={`h-1.5 ${barBg} rounded-full overflow-hidden border border-blue-100`}>
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

export default function AgentPanel({
  isVisible,
  onToggle,
  agentTrace,
  isProcessing,
  decision,
  payoutAmount,
  flags,
  selectedMember,
  lastResult,
  customerMode = false,
  onShowArchitecture,
}) {
  const usage = selectedMember?.current_year_usage || {};

  return (
    <div className={`panel-right ${isVisible ? '' : 'collapsed'}`}>
      {/* Panel Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-blue-100 bg-white/80 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-laya-blue to-laya-blue-mid flex items-center justify-center shadow-md shadow-blue-200">
            <Shield size={14} className="text-white" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-laya-navy">{customerMode ? 'Claim Status' : 'Agent Pipeline'}</h3>
            <p className="text-[10px] text-gray-400">
              {isProcessing ? 'Processing...' : agentTrace.length > 0 ? 'Completed' : 'Waiting for input'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {!customerMode && onShowArchitecture && (
            <button
              onClick={onShowArchitecture}
              className="p-1.5 rounded-md hover:bg-blue-50 text-gray-400 hover:text-pink-500 transition-colors"
              title="Architecture View"
            >
              <Network size={16} />
            </button>
          )}
          <button
            onClick={onToggle}
            className="p-1.5 rounded-md hover:bg-blue-50 text-gray-400 hover:text-laya-navy transition-colors"
          >
            <PanelRightClose size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Agent Pipeline Visualization */}
        {!customerMode && (
        <div>
          <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">
            Processing Pipeline
          </h4>
          <div className="space-y-0">
            {PIPELINE_STAGES.map((stage, i) => {
              const status = getStageStatus(stage.key, agentTrace, isProcessing, decision);

              // Get trace entries for this stage
              const stageMap = {
                Setup: ['setup'],
                Validation: ['parallel validator', 'intake', 'eligibility', 'form classifier', 'compliance', 'waiting period', 'threshold', 'duplicate'],
                Principal: ['principal'],
                Treatment: ['outpatient', 'hospital', 'exceptions', 'gp', 'consultant', 'pharmacy', 'therapy', 'dental', 'optical', 'scan', 'inpatient', 'maternity'],
                Decision: ['decision agent'],
              };
              const keywords = stageMap[stage.key] || [];
              const stageTraces = agentTrace.filter((t) =>
                keywords.some((kw) => t.toLowerCase().includes(kw))
              );

              return (
                <div key={stage.key} className={`pipeline-step ${status}`}>
                  <div className={`step-dot ${status}`}>
                    {status === 'completed' && <CheckCircle size={10} className="text-white" />}
                    {status === 'active' && <Loader size={10} className="text-white animate-spin" />}
                    {status === 'failed' && <XCircle size={10} className="text-white" />}
                    {(status === 'pending' || status === 'skipped') && <Circle size={8} className="text-gray-500" />}
                  </div>
                  <div className="pb-4">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-xs font-semibold ${
                        status === 'completed' ? 'text-laya-green' :
                        status === 'active' ? 'text-laya-blue-mid' :
                        status === 'failed' ? 'text-laya-coral' :
                        'text-gray-500'
                      }`}>
                        {stage.label}
                      </span>
                      {status === 'active' && (
                        <span className="text-[9px] text-laya-blue-mid agent-pulse font-medium">working...</span>
                      )}
                    </div>
                    <p className="text-[10px] text-gray-400 mt-0.5">{stage.desc}</p>

                    {/* Show trace entries for this stage */}
                    <AnimatePresence>
                      {stageTraces.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="mt-1.5 space-y-1"
                        >
                          {stageTraces.map((trace, j) => (
                            <motion.div
                              key={j}
                              initial={{ opacity: 0, x: -5 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: j * 0.05 }}
                              className="flex items-start gap-1.5"
                            >
                              <ChevronRight size={8} className="text-gray-500 mt-0.5 shrink-0" />
                              <span className="text-[10px] text-gray-400 leading-snug">{trace}</span>
                            </motion.div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        )}

        {/* Decision Result Card */}
        <AnimatePresence>
          {decision && decision !== 'ERROR' && !isProcessing && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-xl border p-4 ${
                decision === 'APPROVED' ? 'border-green-200 bg-green-50' :
                decision === 'REJECTED' ? 'border-red-200 bg-red-50' :
                'border-amber-200 bg-amber-50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                  decision === 'APPROVED' ? 'bg-green-100 text-green-700 border-green-300' :
                  decision === 'REJECTED' ? 'bg-red-100 text-red-600 border-red-300' :
                  'bg-amber-100 text-amber-700 border-amber-300'
                }`}>
                  {decision}
                </span>
                {payoutAmount > 0 && (
                  <div className="flex items-center gap-1">
                    <Euro size={14} className="text-laya-blue" />
                    <span className="text-lg font-extrabold text-laya-blue">
                      {payoutAmount.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
              {flags && flags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {flags.map((flag, i) => (
                    <span key={i} className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 font-medium">
                      <AlertTriangle size={9} />
                      {flag}
                    </span>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Member Info Card */}
        {selectedMember && (
          <div>
            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">
              Member Details
            </h4>
            <div className="bg-white rounded-xl border border-blue-100 p-3.5 space-y-2.5 shadow-sm">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-laya-blue to-laya-blue-mid flex items-center justify-center text-white text-xs font-bold shadow-md shadow-blue-200">
                  {selectedMember.first_name?.[0]}{selectedMember.last_name?.[0]}
                </div>
                <div>
                  <p className="text-xs font-semibold text-laya-navy">
                    {selectedMember.first_name} {selectedMember.last_name}
                  </p>
                  <p className="text-[10px] text-gray-400 font-mono">{selectedMember.member_id}</p>
                </div>
                <span className={`ml-auto text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                  selectedMember.status === 'Active' ? 'bg-green-50 text-green-600 border-green-200' : 'bg-red-50 text-red-500 border-red-200'
                }`}>
                  {selectedMember.status}
                </span>
              </div>

              <div className="space-y-1 pt-1 border-t border-blue-100">
                <div className="flex items-center gap-2 text-[11px]">
                  <CreditCard size={11} className="text-laya-blue-mid" />
                  <span className="text-gray-500">Scheme</span>
                  <span className="ml-auto text-laya-navy font-medium text-[10px]">{selectedMember.scheme_name}</span>
                </div>
                <div className="flex items-center gap-2 text-[11px]">
                  <Calendar size={11} className="text-laya-blue-mid" />
                  <span className="text-gray-500">Policy Start</span>
                  <span className="ml-auto text-laya-navy font-medium text-[10px]">{selectedMember.policy_start_date}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-blue-100">
                <p className="text-[10px] font-semibold text-gray-500 mb-2 flex items-center gap-1">
                  <Activity size={10} className="text-laya-blue-mid" />
                  Usage ({usage.year || 2026} {usage.quarter || 'Q1'})
                </p>
                <UsageBar label="GP Visits" current={usage.gp_visits_count || 0} max={10} />
                <UsageBar label="Consultant" current={usage.consultant_visits_count || 0} max={10} />
                <UsageBar label="Prescriptions" current={usage.prescription_count || 0} max={4} />
                <UsageBar label="Dental/Optical" current={usage.dental_optical_count || 0} max={10} />
                <UsageBar label="Therapy" current={usage.therapy_count || 0} max={10} />
                <UsageBar label="Scans" current={usage.scan_count || 0} max={10} />
                <UsageBar label="Hospital Days" current={usage.hospital_days_count || 0} max={40} />

                <div className="mt-2 pt-2 border-t border-blue-100 flex justify-between text-[11px]">
                  <span className="text-gray-500">Quarterly Receipts</span>
                  <span>
                    <strong className="text-laya-navy">€{(usage.q_accumulated_receipts || 0).toFixed(2)}</strong>
                    <span className="text-gray-500 ml-1">/ €150</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
