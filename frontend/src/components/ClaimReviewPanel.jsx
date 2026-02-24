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
  ThumbsUp, ThumbsDown, ArrowUpRight, MessageSquare, X,
  ExternalLink
} from 'lucide-react';

function DetailRow({ icon: Icon, label, value, color = 'text-gray-600' }) {
  return (
    <div className="flex items-center gap-2 py-1.5">
      <Icon size={12} className="text-gray-400 shrink-0" />
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
      <div className="h-full flex items-center justify-center bg-white rounded-xl border border-blue-100 shadow-sm">
        <div className="text-center p-8">
          <Brain size={40} className="mx-auto text-gray-400 mb-3" />
          <p className="text-sm font-medium text-gray-500">Select a claim to review</p>
          <p className="text-[11px] text-gray-400 mt-1">Click any claim from the queue to start AI-assisted analysis</p>
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
      className="h-full flex flex-col bg-white rounded-xl border border-blue-100 shadow-lg overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-blue-100 bg-gradient-to-r from-blue-50 to-pink-50/30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500 to-pink-600 flex items-center justify-center shadow-md shadow-pink-200">
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
          className="p-1.5 rounded-md hover:bg-blue-50 text-gray-400 hover:text-laya-navy transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Claim details card */}
        <div className="bg-blue-50/50 rounded-xl border border-blue-100 p-4">
          <div className="flex items-center gap-2 mb-3">
            <FileText size={14} className="text-laya-blue-mid" />
            <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Claim Details</h4>
          </div>
          <div className="space-y-0.5">
            <DetailRow icon={User} label="Member" value={`${claim.member_name} (${claim.member_id})`} color="text-laya-navy" />
            <DetailRow icon={Stethoscope} label="Treatment" value={claim.treatment_type} color="text-laya-blue-mid" />
            <DetailRow icon={Calendar} label="Date" value={claim.treatment_date} color="text-gray-600" />
            <DetailRow icon={User} label="Practitioner" value={claim.practitioner_name} color="text-gray-600" />
            <DetailRow icon={Euro} label="Amount" value={`€${claim.claimed_amount?.toFixed(2)}`} color="text-laya-navy" />
            <DetailRow icon={Shield} label="Scheme" value={claim.scheme_name} color="text-gray-600" />
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
              bg-gradient-to-r from-pink-50 to-blue-50 border-2 border-dashed border-pink-300
              text-pink-600 hover:border-pink-400 hover:from-pink-100/50 hover:to-blue-100/50
              transition-all group shadow-sm"
          >
            <Brain size={20} className="group-hover:scale-110 transition-transform" />
            <div className="text-left">
              <p className="text-sm font-bold">Run AI Analysis</p>
              <p className="text-[10px] opacity-70 text-gray-500">AI pipeline will analyze this claim and provide a recommendation</p>
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
              className="flex items-center gap-3 px-5 py-4 rounded-xl bg-pink-50 border border-pink-200 shadow-sm"
            >
              <Loader size={20} className="text-pink-500 animate-spin" />
              <div>
                <p className="text-sm font-semibold text-pink-600">AI Pipeline Analyzing...</p>
                <p className="text-[10px] text-pink-400">Running through 6-agent pipeline for comprehensive review</p>
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
              <div className={`rounded-xl border-2 p-4 shadow-sm ${
                aiResult.ai_decision === 'APPROVED' ? 'border-green-200 bg-green-50' :
                aiResult.ai_decision === 'REJECTED' ? 'border-red-200 bg-red-50' :
                'border-amber-200 bg-amber-50'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles size={14} className="text-pink-500" />
                    <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">AI Recommendation</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {aiResult.confidence && (
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-pink-50 text-pink-600 border border-pink-200">
                        {(aiResult.confidence * 100).toFixed(0)}% confidence
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between mb-3">
                  <span className={`text-sm font-extrabold px-3 py-1.5 rounded-lg ${
                    aiResult.ai_decision === 'APPROVED' ? 'bg-green-100 text-green-700 border border-green-300' :
                    aiResult.ai_decision === 'REJECTED' ? 'bg-red-100 text-red-600 border border-red-300' :
                    'bg-amber-100 text-amber-700 border border-amber-300'
                  }`}>
                    {aiResult.ai_decision}
                  </span>
                  {aiResult.ai_payout_amount > 0 && (
                    <div className="flex items-center gap-1">
                      <Euro size={16} className="text-laya-blue" />
                      <span className="text-xl font-extrabold text-laya-blue">{aiResult.ai_payout_amount?.toFixed(2)}</span>
                    </div>
                  )}
                </div>

                {/* Reasoning */}
                <div className="bg-blue-50/70 rounded-lg p-3 border border-blue-100">
                  <p className="text-[12px] text-gray-600 leading-relaxed">{aiResult.ai_reasoning}</p>
                </div>

                {/* Flags */}
                {aiResult.flags && aiResult.flags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {aiResult.flags.map((flag, i) => (
                      <span key={i} className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-lg bg-amber-50 text-amber-700 font-medium border border-amber-200">
                        <AlertTriangle size={9} />
                        {flag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Source Document Citations */}
              {aiResult.source_citations && aiResult.source_citations.length > 0 && (
                <div className="source-citations-panel">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="source-citations-header">
                      <span className="icon">📄</span>
                      Source Document References
                    </h4>
                    {(aiResult.source_url || aiResult.source_citations[0]?.source_url) && (
                      <a
                        href={aiResult.source_url || aiResult.source_citations[0].source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-600 hover:text-teal-700 bg-teal-50 hover:bg-teal-100 px-2.5 py-1 rounded-lg border border-teal-200 transition-all hover:shadow-sm"
                      >
                        <ExternalLink size={11} />
                        View Full IPID
                      </a>
                    )}
                  </div>
                  <p className="source-doc-name">
                    {aiResult.source_document || 'Money Smart 20 Family — IPID'}
                  </p>

                  {aiResult.source_citations.map((citation, i) => (
                    <div key={i} className="citation-card">
                      <div className="citation-header">
                        <span className="citation-section">{citation.section}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="citation-badge">IPID Rule</span>
                          {citation.source_url && (
                            <a
                              href={citation.source_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-teal-600 hover:text-teal-700 px-1.5 py-0.5 rounded bg-teal-50 hover:bg-teal-100 border border-teal-200 transition-colors"
                              title="View source document online"
                            >
                              <ExternalLink size={8} />
                              Source
                            </a>
                          )}
                        </div>
                      </div>
                      <blockquote className="citation-text">
                        "{citation.highlighted_text}"
                      </blockquote>
                      <p className="citation-relevance">
                        <strong>Why this applies:</strong> {citation.relevance}
                      </p>
                    </div>
                  ))}

                  <div className="citation-footer">
                    <span className="verified-badge">✓ AI cited {aiResult.source_citations.length} rule(s) from the official IPID</span>
                    {(aiResult.source_url || aiResult.source_citations[0]?.source_url) && (
                      <a
                        href={aiResult.source_url || aiResult.source_citations[0].source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[10px] text-teal-600 hover:text-teal-700 hover:underline mt-1"
                      >
                        <ExternalLink size={10} />
                        Verify on layahealthcare.ie
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Agent Trace toggle */}
              {aiResult.agent_trace && aiResult.agent_trace.length > 0 && (
                <div>
                  <button
                    onClick={() => setShowTrace(prev => !prev)}
                    className="flex items-center gap-2 text-xs font-semibold text-gray-400 hover:text-laya-blue-mid transition-colors w-full"
                  >
                    <Activity size={12} className="text-laya-blue-mid" />
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
                            <ChevronRight size={8} className="text-laya-blue-mid mt-0.5 shrink-0" />
                            <span className="text-gray-500">{trace}</span>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Human Decision Section */}
              <div className="border-t border-blue-100 pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <User size={14} className="text-laya-navy" />
                  <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Your Final Decision</h4>
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-blue-50 text-laya-blue font-medium border border-blue-200">Human Override</span>
                </div>

                {/* Decision buttons */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedDecision('APPROVED')}
                    className={`flex items-center justify-center gap-2 px-3 py-3 rounded-xl border-2 transition-all ${
                      selectedDecision === 'APPROVED'
                        ? 'border-green-400 bg-green-50 text-green-700 shadow-sm'
                        : 'border-gray-200 hover:border-green-300 text-gray-400 hover:bg-green-50/50'
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
                        ? 'border-red-400 bg-red-50 text-red-600 shadow-sm'
                        : 'border-gray-200 hover:border-red-300 text-gray-400 hover:bg-red-50/50'
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
                        ? 'border-pink-400 bg-pink-50 text-pink-600 shadow-sm'
                        : 'border-gray-200 hover:border-pink-300 text-gray-400 hover:bg-pink-50/50'
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
                        className="w-full pl-9 pr-4 py-2 rounded-xl border border-blue-100 text-sm bg-blue-50/50 text-laya-navy focus:outline-none focus:border-laya-blue/40 focus:ring-2 focus:ring-laya-blue/20 transition-all placeholder:text-gray-400"
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
                    className="w-full px-4 py-2 rounded-xl border border-blue-100 text-sm bg-blue-50/50 text-laya-navy focus:outline-none focus:border-laya-blue/40 focus:ring-2 focus:ring-laya-blue/20 transition-all resize-none placeholder:text-gray-400"
                  />
                </div>

                {/* Submit button */}
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSubmit}
                  disabled={!selectedDecision}
                  className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-laya-blue to-laya-blue-mid text-white font-bold text-sm shadow-lg shadow-blue-200 hover:shadow-xl hover:shadow-blue-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
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
