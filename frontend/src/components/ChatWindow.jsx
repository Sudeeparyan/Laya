// ChatWindow — message list + input area

import { useState, useRef, useEffect } from 'react';
import { Send, Loader, Trash2, Paperclip, MessageCircle, ShieldCheck, ArrowDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import MessageBubble from './MessageBubble';

export default function ChatWindow({
  messages,
  isLoading,
  activeAgent,
  selectedMember,
  documentData,
  onSendMessage,
  onClearChat,
}) {
  const [input, setInput] = useState('');
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const scrollRef = useRef(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // Show "scroll to bottom" button
  function handleScroll() {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    setShowScrollBtn(scrollHeight - scrollTop - clientHeight > 120);
  }

  function scrollToBottom() {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }

  function handleSend() {
    if (!input.trim()) return;
    if (!selectedMember) return;
    onSendMessage(input, selectedMember.member_id, documentData);
    setInput('');
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="flex items-center justify-between px-6 py-3.5 border-b border-gray-100/80 glass z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl gradient-teal flex items-center justify-center shadow-sm">
            <MessageCircle size={18} className="text-white" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-laya-navy tracking-tight">Claims Chat</h2>
            {selectedMember ? (
              <p className="text-xs text-gray-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-laya-green inline-block" />
                {selectedMember.first_name} {selectedMember.last_name}
                <span className="text-gray-300 mx-0.5">&bull;</span>
                <span className="font-mono">{selectedMember.member_id}</span>
              </p>
            ) : (
              <p className="text-xs text-gray-400">No member selected</p>
            )}
          </div>
        </div>
        {messages.length > 0 && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onClearChat}
            className="text-gray-400 hover:text-laya-coral transition-colors p-2 rounded-lg hover:bg-red-50"
            title="Clear chat"
          >
            <Trash2 size={16} />
          </motion.button>
        )}
      </div>

      {/* Messages Area */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto chat-scroll px-6 py-5 relative"
      >
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center max-w-sm"
            >
              <div className="w-20 h-20 rounded-2xl gradient-teal flex items-center justify-center mx-auto mb-5 shadow-lg shadow-laya-teal/20 float">
                <ShieldCheck size={36} className="text-white" />
              </div>
              <h3 className="font-bold text-laya-navy text-xl mb-2 tracking-tight">
                Laya AI Claims Assistant
              </h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                {selectedMember
                  ? 'Upload a claim document or type your claim request below to get started.'
                  : 'Select a member from the sidebar to begin processing claims.'}
              </p>
              {selectedMember && (
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  {['Submit a GP claim', 'Check my benefits', 'Upload a receipt'].map((hint) => (
                    <button
                      key={hint}
                      onClick={() => setInput(hint)}
                      className="text-xs px-3.5 py-2 rounded-full border border-laya-teal/20 text-laya-teal
                        hover:bg-laya-teal/5 hover:border-laya-teal/40 transition-all"
                    >
                      {hint}
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        ) : (
          <div className="space-y-1">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
          </div>
        )}

        {/* Typing indicator */}
        <AnimatePresence>
          {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-start gap-3 ml-1 mt-4"
            >
              <div className="w-8 h-8 rounded-full gradient-teal flex items-center justify-center shrink-0 shadow-sm">
                <ShieldCheck size={14} className="text-white" />
              </div>
              <div className="bg-white rounded-2xl rounded-bl-md px-4 py-3 shadow-sm border border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                  </div>
                  <span className="text-xs text-gray-400 ml-1 agent-pulse">
                    {activeAgent || 'Processing claim'}
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Scroll to bottom button */}
        <AnimatePresence>
          {showScrollBtn && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={scrollToBottom}
              className="sticky bottom-2 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white shadow-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors z-20"
            >
              <ArrowDown size={14} className="text-gray-500" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-100/80 glass px-6 py-4">
        {!selectedMember ? (
          <div className="flex items-center justify-center gap-2 py-2 text-sm text-gray-400">
            <span className="w-2 h-2 rounded-full bg-gray-300 animate-pulse" />
            Select a member from the sidebar to start chatting
          </div>
        ) : (
          <div className="space-y-2.5">
            <AnimatePresence>
              {documentData && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-2 text-xs text-laya-teal bg-laya-teal/5 border border-laya-teal/15 px-3 py-2 rounded-xl w-fit"
                >
                  <Paperclip size={13} />
                  <span className="font-medium">Document attached</span>
                </motion.div>
              )}
            </AnimatePresence>
            <div className="flex items-end gap-3">
              <div className="flex-1 relative">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Describe your claim or ask a question..."
                  rows={1}
                  className="w-full resize-none rounded-2xl border border-gray-200 px-5 py-3 text-sm
                    bg-white/80
                    focus:outline-none focus:ring-2 focus:ring-laya-teal/20 focus:border-laya-teal/40
                    placeholder:text-gray-400 transition-all shadow-sm"
                  disabled={isLoading}
                />
              </div>
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                className="shrink-0 p-3 rounded-2xl gradient-teal text-white shadow-md shadow-laya-teal/20
                  hover:shadow-lg hover:shadow-laya-teal/30 transition-all
                  disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
              >
                {isLoading ? (
                  <Loader size={20} className="animate-spin" />
                ) : (
                  <Send size={20} />
                )}
              </motion.button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
