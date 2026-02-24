/**
 * CallbackRequestModal — Request a human callback from Laya Customer Care.
 * Lets customers describe their issue, choose urgency and preferred contact method,
 * and submit a callback request when the AI can't resolve their problem.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  X, Phone, Mail, MessageSquare, AlertTriangle,
  Clock, CheckCircle2, Headphones, Send, Loader
} from 'lucide-react';
import { submitCallbackRequest } from '../services/api';

const URGENCY_OPTIONS = [
  { value: 'low', label: 'Low', desc: 'General enquiry — no rush', icon: Clock, color: 'text-laya-teal border-teal-200 bg-teal-50 hover:bg-teal-100' },
  { value: 'medium', label: 'Medium', desc: 'Need help within 24 hours', icon: MessageSquare, color: 'text-laya-amber border-amber-200 bg-amber-50 hover:bg-amber-100' },
  { value: 'high', label: 'High', desc: 'Urgent — claim issue', icon: AlertTriangle, color: 'text-laya-coral border-red-200 bg-red-50 hover:bg-red-100' },
];

const CONTACT_OPTIONS = [
  { value: 'phone', label: 'Phone Call', icon: Phone },
  { value: 'email', label: 'Email', icon: Mail },
];

const ISSUE_CATEGORIES = [
  'Claim was incorrectly rejected',
  'Need help understanding my coverage',
  'Issue with document upload',
  'Waiting period question',
  'Benefit limit concern',
  'General complaint',
  'Other',
];

export default function CallbackRequestModal({ isOpen, onClose, selectedMember, user }) {
  const [issueCategory, setIssueCategory] = useState('');
  const [description, setDescription] = useState('');
  const [urgency, setUrgency] = useState('medium');
  const [contactMethod, setContactMethod] = useState('phone');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [ticketId, setTicketId] = useState(null);

  function resetForm() {
    setIssueCategory('');
    setDescription('');
    setUrgency('medium');
    setContactMethod('phone');
    setSubmitting(false);
    setSubmitted(false);
    setTicketId(null);
  }

  function handleClose() {
    onClose();
    // Reset after the close animation
    setTimeout(resetForm, 300);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!issueCategory) {
      toast.error('Please select an issue category');
      return;
    }
    if (!description.trim()) {
      toast.error('Please describe your issue');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        member_id: selectedMember?.member_id || null,
        member_name: selectedMember
          ? `${selectedMember.first_name} ${selectedMember.last_name}`
          : user?.name || 'Unknown',
        issue_category: issueCategory,
        description: description.trim(),
        urgency,
        preferred_contact: contactMethod,
        contact_info: contactMethod === 'phone'
          ? (selectedMember?.phone || user?.email || '')
          : (selectedMember?.email || user?.email || ''),
      };

      const result = await submitCallbackRequest(payload);
      setTicketId(result.ticket_id);
      setSubmitted(true);
      toast.success('Callback request submitted successfully!');
    } catch (err) {
      console.error('Callback request failed:', err);
      toast.error('Failed to submit request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white rounded-2xl shadow-2xl shadow-blue-200/50 border border-blue-100 w-full max-w-lg max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-blue-100 bg-gradient-to-r from-laya-blue to-laya-blue-mid rounded-t-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                    <Headphones size={20} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Contact Customer Care</h2>
                    <p className="text-xs text-blue-100">Request a callback from our team</p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className="p-1.5 rounded-lg hover:bg-white/20 text-white/80 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {submitted ? (
                /* Success State */
                <div className="px-6 py-10 text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', delay: 0.1 }}
                  >
                    <div className="w-16 h-16 mx-auto rounded-full bg-green-50 border-2 border-green-200 flex items-center justify-center mb-4">
                      <CheckCircle2 size={32} className="text-laya-green" />
                    </div>
                  </motion.div>
                  <h3 className="text-lg font-bold text-laya-navy mb-2">Request Submitted!</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Your callback request has been received. A Laya Healthcare specialist will reach out to you
                    {urgency === 'high' ? ' within 2 hours' : urgency === 'medium' ? ' within 24 hours' : ' within 2-3 business days'}.
                  </p>
                  {ticketId && (
                    <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 px-4 py-2 rounded-xl mb-6">
                      <span className="text-xs text-gray-400">Ticket ID:</span>
                      <span className="text-sm font-mono font-bold text-laya-blue">{ticketId}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-center gap-2 text-xs text-gray-400 mt-2 mb-4">
                    <Phone size={12} />
                    <span>You can also call us at <strong className="text-laya-navy">1890 700 890</strong></span>
                  </div>
                  <button
                    onClick={handleClose}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-laya-blue to-laya-blue-mid text-white text-sm font-medium shadow-md shadow-blue-200 hover:shadow-lg transition-all"
                  >
                    Done
                  </button>
                </div>
              ) : (
                /* Form */
                <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
                  {/* Issue Category */}
                  <div>
                    <label className="text-xs font-semibold text-laya-navy mb-2 block">
                      What do you need help with?
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {ISSUE_CATEGORIES.map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setIssueCategory(cat)}
                          className={`text-left px-3 py-2 rounded-xl border text-xs font-medium transition-all duration-200 ${
                            issueCategory === cat
                              ? 'bg-laya-blue text-white border-laya-blue shadow-md shadow-blue-200'
                              : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-blue-50 hover:border-blue-200 hover:text-laya-blue'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="text-xs font-semibold text-laya-navy mb-2 block">
                      Describe your issue
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Please describe what happened and what you need help with..."
                      rows={3}
                      maxLength={1000}
                      className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm bg-gray-50 text-laya-navy focus:outline-none focus:ring-2 focus:ring-laya-blue/20 focus:border-laya-blue/40 placeholder:text-gray-400 transition-all"
                    />
                    <div className="text-right text-[10px] text-gray-400 mt-1">
                      {description.length}/1000
                    </div>
                  </div>

                  {/* Urgency */}
                  <div>
                    <label className="text-xs font-semibold text-laya-navy mb-2 block">
                      How urgent is this?
                    </label>
                    <div className="flex gap-2">
                      {URGENCY_OPTIONS.map((opt) => {
                        const Icon = opt.icon;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setUrgency(opt.value)}
                            className={`flex-1 flex flex-col items-center gap-1 px-3 py-3 rounded-xl border text-xs font-medium transition-all duration-200 ${
                              urgency === opt.value
                                ? `${opt.color} ring-2 ring-current/20 shadow-sm`
                                : 'bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100'
                            }`}
                          >
                            <Icon size={16} />
                            <span className="font-semibold">{opt.label}</span>
                            <span className="text-[10px] opacity-70">{opt.desc}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Preferred Contact Method */}
                  <div>
                    <label className="text-xs font-semibold text-laya-navy mb-2 block">
                      Preferred contact method
                    </label>
                    <div className="flex gap-2">
                      {CONTACT_OPTIONS.map((opt) => {
                        const Icon = opt.icon;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setContactMethod(opt.value)}
                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-medium transition-all duration-200 ${
                              contactMethod === opt.value
                                ? 'bg-laya-blue text-white border-laya-blue shadow-md shadow-blue-200'
                                : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-blue-50 hover:border-blue-200 hover:text-laya-blue'
                            }`}
                          >
                            <Icon size={14} />
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Member Information (read-only info) */}
                  {selectedMember && (
                    <div className="bg-blue-50/50 border border-blue-100 rounded-xl px-4 py-3">
                      <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Your Details</div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-gray-400">Name: </span>
                          <span className="text-laya-navy font-medium">{selectedMember.first_name} {selectedMember.last_name}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Member ID: </span>
                          <span className="text-laya-navy font-mono font-medium">{selectedMember.member_id}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Scheme: </span>
                          <span className="text-laya-navy font-medium">{selectedMember.scheme_name}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Status: </span>
                          <span className="text-laya-green font-medium">{selectedMember.status}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Submit / Cancel */}
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                      <Phone size={10} />
                      <span>Or call <strong>1890 700 890</strong></span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleClose}
                        className="px-4 py-2 rounded-xl border border-gray-200 text-gray-500 text-xs font-medium hover:bg-gray-50 transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={submitting || !issueCategory || !description.trim()}
                        className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-laya-blue to-laya-blue-mid text-white text-xs font-semibold shadow-md shadow-blue-200 hover:shadow-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {submitting ? (
                          <>
                            <Loader size={14} className="animate-spin" />
                            Submitting...
                          </>
                        ) : (
                          <>
                            <Send size={14} />
                            Submit Request
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
