import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { User, ShieldCheck, CheckCircle2, XCircle, Clock, FileText, Eye } from 'lucide-react';
import ClaimCard from './ClaimCard';
import PdfPreview, { PdfPreviewModal } from './PdfPreview';
import { getFilePreviewUrl } from '../services/api';

export default function MessageBubble({ message }) {
  const isUser = message.role === 'user';
  const [showPreview, setShowPreview] = useState(false);

  // Check if this message has an attached document
  const hasDocument = message.metadata?.docId || message.metadata?.fileUrl;
  const docId = message.metadata?.docId;
  const fileName = message.metadata?.fileName;
  const previewUrl = docId ? getFilePreviewUrl(docId) : message.metadata?.fileUrl;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-5 gap-2.5`}
    >
      {/* AI avatar */}
      {!isUser && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300 }}
          className="w-8 h-8 rounded-xl bg-gradient-to-br from-laya-blue to-laya-blue-mid flex items-center justify-center shrink-0 shadow-md shadow-blue-200 mt-1"
        >
          <ShieldCheck size={14} className="text-white" />
        </motion.div>
      )}

      <div
        className={`
          max-w-[85%] rounded-2xl px-4 py-3 relative
          ${isUser
            ? 'bg-gradient-to-r from-laya-blue to-laya-blue-mid text-white rounded-br-md shadow-lg shadow-blue-200'
            : 'bg-white/90 backdrop-blur-md text-laya-navy border border-blue-100 rounded-bl-md shadow-md shadow-blue-50'
          }
        `}
      >
        {/* Message content */}
        <div className={`text-sm leading-relaxed ${isUser ? '' : 'prose-chat'}`}>
          {isUser ? (
            <p>{message.content}</p>
          ) : (
            <ReactMarkdown>{message.content}</ReactMarkdown>
          )}
        </div>

        {/* Document attachment indicator (user messages with uploaded files) */}
        {isUser && hasDocument && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-2 pt-2 border-t border-white/20"
          >
            <button
              onClick={() => setShowPreview(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 
                transition-colors text-white/90 hover:text-white w-full text-left group"
            >
              <FileText size={14} className="shrink-0" />
              <span className="text-[11px] font-medium truncate flex-1">{fileName || 'Attached Document'}</span>
              <Eye size={12} className="shrink-0 opacity-60 group-hover:opacity-100 transition-opacity" />
            </button>
          </motion.div>
        )}

        {/* Claim result card (AI messages only) */}
        {!isUser && message.metadata && message.metadata.decision && message.metadata.decision !== 'ERROR' && (
          <ClaimCard metadata={message.metadata} />
        )}

        {/* Real-time status update banner (WebSocket push) */}
        <AnimatePresence>
          {!isUser && message.metadata?.statusUpdated && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="status-update-banner"
            >
              <div className="flex items-center gap-2 mb-1">
                {message.metadata.decision === 'APPROVED' ? (
                  <CheckCircle2 size={16} className="text-emerald-600" />
                ) : message.metadata.decision === 'REJECTED' ? (
                  <XCircle size={16} className="text-red-500" />
                ) : (
                  <Clock size={16} className="text-amber-500" />
                )}
                <span className={`text-xs font-bold uppercase tracking-wide ${
                  message.metadata.decision === 'APPROVED' ? 'text-emerald-700' :
                  message.metadata.decision === 'REJECTED' ? 'text-red-600' : 'text-amber-600'
                }`}>
                  Claim {message.metadata.decision}
                </span>
              </div>
              {message.metadata.reviewDetails && (
                <div className="text-[11px] text-gray-600 space-y-0.5">
                  {message.metadata.reviewDetails.reviewer_notes && (
                    <p>📝 {message.metadata.reviewDetails.reviewer_notes}</p>
                  )}
                  {message.metadata.reviewDetails.payout_amount != null && message.metadata.decision === 'APPROVED' && (
                    <p>💰 Approved payout: <strong>€{message.metadata.reviewDetails.payout_amount}</strong></p>
                  )}
                  <p className="text-gray-500 mt-1">Reviewed by a Laya Healthcare specialist</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Timestamp */}
        <div
          className={`text-[10px] mt-1.5 flex items-center gap-1 ${
            isUser ? 'text-white/60 justify-end' : 'text-gray-400'
          }`}
        >
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      </div>

      {/* User avatar */}
      {isUser && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300 }}
          className="w-8 h-8 rounded-xl bg-gradient-to-br from-pink-500 to-pink-600 flex items-center justify-center shrink-0 shadow-md shadow-pink-200 mt-1"
        >
          <User size={14} className="text-white" />
        </motion.div>
      )}

      {/* PDF Preview Modal */}
      <AnimatePresence>
        {showPreview && previewUrl && (
          <PdfPreviewModal
            previewUrl={previewUrl}
            fileName={fileName}
            isPdf={(fileName || '').toLowerCase().endsWith('.pdf')}
            isImage={/\.(png|jpg|jpeg|gif|webp)$/i.test(fileName || '')}
            onClose={() => setShowPreview(false)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
