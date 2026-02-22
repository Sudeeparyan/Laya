import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { User, ShieldCheck } from 'lucide-react';
import ClaimCard from './ClaimCard';

export default function MessageBubble({ message }) {
  const isUser = message.role === 'user';

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
          className="w-8 h-8 rounded-xl gradient-teal flex items-center justify-center shrink-0 shadow-md shadow-laya-teal/20 mt-1"
        >
          <ShieldCheck size={14} className="text-white" />
        </motion.div>
      )}

      <div
        className={`
          max-w-[85%] rounded-2xl px-4 py-3 relative
          ${isUser
            ? 'bg-gradient-to-br from-laya-navy to-laya-navy-light text-white rounded-br-md shadow-md shadow-laya-navy/20'
            : 'bg-white text-laya-navy border border-gray-100 rounded-bl-md shadow-sm'
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

        {/* Claim result card (AI messages only) */}
        {!isUser && message.metadata && message.metadata.decision && message.metadata.decision !== 'ERROR' && (
          <ClaimCard metadata={message.metadata} />
        )}

        {/* Timestamp */}
        <div
          className={`text-[10px] mt-1.5 flex items-center gap-1 ${
            isUser ? 'text-white/40 justify-end' : 'text-gray-300'
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
          className="w-8 h-8 rounded-xl bg-gradient-to-br from-laya-navy to-laya-navy-light flex items-center justify-center shrink-0 shadow-md shadow-laya-navy/20 mt-1"
        >
          <User size={14} className="text-white" />
        </motion.div>
      )}
    </motion.div>
  );
}
