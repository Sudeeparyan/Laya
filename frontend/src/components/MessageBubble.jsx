// MessageBubble — renders a single chat message (user or AI)

import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { User, ShieldCheck } from 'lucide-react';
import ClaimCard from './ClaimCard';

export default function MessageBubble({ message }) {
  const isUser = message.role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-5 gap-2.5`}
    >
      {/* AI avatar */}
      {!isUser && (
        <div className="w-8 h-8 rounded-full gradient-teal flex items-center justify-center shrink-0 shadow-sm mt-1">
          <ShieldCheck size={14} className="text-white" />
        </div>
      )}

      <div
        className={`
          max-w-[75%] rounded-2xl px-4 py-3 relative
          ${isUser
            ? 'gradient-teal text-white rounded-br-md shadow-md shadow-laya-teal/15'
            : 'bg-white text-laya-navy border border-gray-100/80 rounded-bl-md shadow-sm'
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
            isUser ? 'text-white/50 justify-end' : 'text-gray-300'
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
        <div className="w-8 h-8 rounded-full bg-laya-navy flex items-center justify-center shrink-0 shadow-sm mt-1">
          <User size={14} className="text-white" />
        </div>
      )}
    </motion.div>
  );
}
