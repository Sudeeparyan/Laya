/**
 * ClaimReviewPanel — AI-assisted claim review for developers
 * Shows claim details, triggers AI analysis, and lets the developer
 * make the final human decision (approve/reject/escalate).
 * 
 * This is the core of the "AI assists, human decides" workflow.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, CheckCircle, XCircle, AlertTriangle, Loader,
  User, Calendar, Euro, FileText, Stethoscope, Shield,
  ChevronRight, Send, Sparkles, Activity, Clock,
  ThumbsUp, ThumbsDown, ArrowUpRight, MessageSquare, X
} from 'lucide-react';

function DetailRow({ icon: Icon, label, value, color = 'text-gray-600' }) {
  return (
    <div className="flex items-center gap-2 py-1.5">
      <Icon size={12} className="text-gray-300 shrink-0" />
      <span className="text-[11px] text-gray-400 w-24 shrink-0">{label}</span>
      <span className={`text-[12px] font-medium ${color} truncate`}>{value}</span>
    </div>
  );
}

export default function ClaimReviewPanel({ claim, onClose, onRunAI, onSubmitReview, aiResult, aiLoading }) {
  const [reviewNotes, setReviewNotes] = useState('');
  const [selectedDecision, setSelectedDecision] = useState(null);
  const [payoutOverride, setPayoutOverride] = useState('');
  const [showTrace, setShowTrace] = useState(false);

  if (!claim) {
    return (
      <div className="h-full flex items-center justify-center bg-white rounded-xl border border-gray-100">
        <div className="text-center p-8">
          <Brain size={40} className="mx-auto text-gray-200 mb-3" />
          <p className="text-sm font-medium text-gray-400">Select a claim to review</p>
          <p className="text-[11px] text-gray-300 mt-1">Click any claim from the queue to start AI-assisted analysis</p>
        </div>
      </div>
    );
  }

  function handleSubmit() {
    if (!selectedDecision) return;
    onSubmitReview({
      claim_id: claim.claim_id,
      member_id: claim.member_id,
      decision: selectedDecision,
      reviewer_notes: reviewNotes,
      payout_amount: payoutOverride ? parseFloat(payoutOverride) : aiResult?.ai_payout_amount || 0,
    });
    setSelectedDecision(null);
    setReviewNotes('');
    setPayoutOverride('');
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="h-full flex flex-col bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gradient-to-r from-white to-gray-50/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg gradient-purple flex items-center justify-center">
            <Brain size={16} className="text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-laya-navy">AI Claim Review</h3>
            <p className="text-[10px] text-gray-400">
              {claim.claim_id} &bull; {claim.member_name}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Claim details card */}
        <div className="bg-gray-50/50 rounded-xl border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-3">
            <FileText size={14} className="text-laya-teal" />
            <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Claim Details</h4>
          </div>
          <div className="space-y-0.5">
            <DetailRow icon={User} label="Member" value={`${claim.member_name} (${claim.member_id})`} color="text-laya-navy" />
            <DetailRow icon={Stethoscope} label="Treatment" value={claim.treatment_type} color="text-laya-teal" />
            <DetailRow icon={Calendar} label="Date" value={claim.treatment_date} />
            <DetailRow icon={User} label="Practitioner" value={claim.practitioner_name} />
            <DetailRow icon={Euro} label="Amount" value={`€${claim.claimed_amount?.toFixed(2)}`} color="text-laya-navy" />
            <DetailRow icon={Shield} label="Scheme" value={claim.scheme_name} />
            <DetailRow icon={Activity} label="Current Status" value={claim.status} 
              color={claim.status?.toLowerCase().includes('approved') ? 'text-laya-green' : 
                     claim.status?.toLowerCase().includes('rejected') ? 'text-laya-coral' : 'text-laya-amber'} 
            />
          </div>
        </div>

        {/* AI Analysis button */}
        {!aiResult && !aiLoading && (
          <motion.button
            whileHover={{ scale: 1.01, y: -1 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => onRunAI(claim)}
            className="w-full flex items-center justify-center gap-3 px-5 py-4 rounded-xl
              bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-2 border-dashed border-purple-300/40
              text-purple-600 hover:border-purple-400 hover:from-purple-500/15 hover:to-blue-500/15
              transition-all group"
          >
            <Brain size={20} className="group-hover:scale-110 transition-transform" />
            <div className="text-left">
              <p className="text-sm font-bold">Run AI Analysis</p>
              <p className="text-[10px] opacity-70">AI pipeline will analyze this claim and provide a recommendation</p>
            </div>
            <ArrowUpRight size={16} className="opacity-50 group-hover:opacity-100 transition-opacity" />
          </motion.button>
        )}

        {/* AI Processing indicator */}
        <AnimatePresence>
          {aiLoading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-3 px-5 py-4 rounded-xl bg-purple-50 border border-purple-200/50"
            >
              <Loader size={20} className="text-purple-500 animate-spin" />
              <div>
                <p className="text-sm font-semibold text-purple-700">AI Pipeline Analyzing...</p>
                <p className="text-[10px] text-purple-500">Running through 6-agent pipeline for comprehensive review</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* AI Result */}
        <AnimatePresence>
          {aiResult && !aiLoading && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {/* AI Decision card */}
              <div className={`rounded-xl border-2 p-4 ${
                aiResult.ai_decision === 'APPROVED' ? 'border-laya-green/30 bg-green-50/50' :
                aiResult.ai_decision === 'REJECTED' ? 'border-laya-coral/30 bg-red-50/50' :
                'border-laya-amber/30 bg-amber-50/50'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles size={14} className="text-purple-500" />
                    <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">AI Recommendation</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {aiResult.confidence && (
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-600">
                        {(aiResult.confidence * 100).toFixed(0)}% confidence
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between mb-3">
                  <span className={`text-sm font-extrabold px-3 py-1.5 rounded-lg ${
                    aiResult.ai_decision === 'APPROVED' ? 'bg-laya-green text-white' :
                    aiResult.ai_decision === 'REJECTED' ? 'bg-laya-coral text-white' :
                    'bg-laya-amber text-white'
                  }`}>
                    {aiResult.ai_decision}
                  </span>
                  {aiResult.ai_payout_amount > 0 && (
                    <div className="flex items-center gap-1">
                      <Euro size={16} className="text-laya-teal" />
                      <span className="text-xl font-extrabold text-laya-teal">{aiResult.ai_payout_amount?.toFixed(2)}</span>
                    </div>
                  )}
                </div>

                {/* Reasoning */}
                <div className="bg-white/60 rounded-lg p-3 border border-gray-100">
                  <p className="text-[12px] text-gray-600 leading-relaxed">{aiResult.ai_reasoning}</p>
                </div>

                {/* Flags */}
                {aiResult.flags && aiResult.flags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {aiResult.flags.map((flag, i) => (
                      <span key={i} className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-lg bg-amber-100 text-amber-700 font-medium border border-amber-200/50">
                        <AlertTriangle size={9} />
                        {flag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Agent Trace toggle */}
              {aiResult.agent_trace && aiResult.agent_trace.length > 0 && (
                <div>
                  <button
                    onClick={() => setShowTrace(prev => !prev)}
                    className="flex items-center gap-2 text-xs font-semibold text-gray-400 hover:text-laya-teal transition-colors w-full"
                  >
                    <Activity size={12} className="text-laya-teal" />
                    <span>Agent Trace ({aiResult.agent_trace.length} steps)</span>
                    <ChevronRight size={12} className={`ml-auto transition-transform ${showTrace ? 'rotate-90' : ''}`} />
                  </button>
                  <AnimatePresence>
                    {showTrace && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden mt-2 ml-1 border-l-2 border-gray-100 pl-3 space-y-1 max-h-[200px] overflow-y-auto"
                      >
                        {aiResult.agent_trace.map((trace, i) => (
                          <div key={i} className="flex items-start gap-1.5 text-[10px]">
                            <ChevronRight size={8} className="text-laya-teal mt-0.5 shrink-0" />
                            <span className="text-gray-500">{trace}</span>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Human Decision Section */}
              <div className="border-t border-gray-100 pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <User size={14} className="text-laya-navy" />
                  <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Your Final Decision</h4>
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">Human Override</span>
                </div>

                {/* Decision buttons */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedDecision('APPROVED')}
                    className={`flex items-center justify-center gap-2 px-3 py-3 rounded-xl border-2 transition-all ${
                      selectedDecision === 'APPROVED'
                        ? 'border-laya-green bg-green-50 text-laya-green shadow-sm'
                        : 'border-gray-200 hover:border-laya-green/40 text-gray-400'
                    }`}
                  >
                    <ThumbsUp size={16} />
                    <span className="text-xs font-bold">Approve</span>
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedDecision('REJECTED')}
                    className={`flex items-center justify-center gap-2 px-3 py-3 rounded-xl border-2 transition-all ${
                      selectedDecision === 'REJECTED'
                        ? 'border-laya-coral bg-red-50 text-laya-coral shadow-sm'
                        : 'border-gray-200 hover:border-laya-coral/40 text-gray-400'
                    }`}
                  >
                    <ThumbsDown size={16} />
                    <span className="text-xs font-bold">Reject</span>
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedDecision('ESCALATED')}
                    className={`flex items-center justify-center gap-2 px-3 py-3 rounded-xl border-2 transition-all ${
                      selectedDecision === 'ESCALATED'
                        ? 'border-purple-500 bg-purple-50 text-purple-600 shadow-sm'
                        : 'border-gray-200 hover:border-purple-300 text-gray-400'
                    }`}
                  >
                    <AlertTriangle size={16} />
                    <span className="text-xs font-bold">Escalate</span>
                  </motion.button>
                </div>

                {/* Payout override */}
                {selectedDecision === 'APPROVED' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mb-3"
                  >
                    <label className="text-[10px] font-medium text-gray-400 block mb-1">Payout Amount (€)</label>
                    <div className="relative">
                      <Euro size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="number"
                        value={payoutOverride}
                        onChange={e => setPayoutOverride(e.target.value)}
                        placeholder={aiResult?.ai_payout_amount?.toFixed(2) || '0.00'}
                        className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:border-laya-teal/40 focus:ring-2 focus:ring-laya-teal/10 transition-all"
                      />
                    </div>
                  </motion.div>
                )}

                {/* Review notes */}
                <div className="mb-3">
                  <label className="text-[10px] font-medium text-gray-400 block mb-1">Review Notes (optional)</label>
                  <textarea
                    value={reviewNotes}
                    onChange={e => setReviewNotes(e.target.value)}
                    placeholder="Add notes about your decision..."
                    rows={2}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:border-laya-teal/40 focus:ring-2 focus:ring-laya-teal/10 transition-all resize-none placeholder:text-gray-300"
                  />
                </div>

                {/* Submit button */}
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSubmit}
                  disabled={!selectedDecision}
                  className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl gradient-teal text-white font-bold text-sm shadow-lg shadow-laya-teal/25 hover:shadow-xl hover:shadow-laya-teal/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
                >
                  <Send size={16} />
                  Submit Final Decision
                </motion.button>

                <p className="text-[9px] text-gray-400 text-center mt-2">
                  This is the final human decision and will override the AI recommendation
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
