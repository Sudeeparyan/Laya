// AgentTrace — vertical timeline showing the agent routing path

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Loader, ChevronDown, GitBranch, Circle } from 'lucide-react';

export default function AgentTrace({ trace = [], isProcessing = false }) {
  const [expanded, setExpanded] = useState(false);

  if (!trace.length && !isProcessing) return null;

  return (
    <div className="mt-4 pt-3 border-t border-blue-100">
      <button
        className="flex items-center gap-2 text-xs font-semibold text-gray-500 hover:text-laya-navy transition-colors w-full"
        onClick={() => setExpanded((prev) => !prev)}
      >
        <GitBranch size={13} className="text-laya-blue-mid" />
        <span>Agent Trace ({trace.length} steps)</span>
        <ChevronDown
          size={13}
          className={`ml-auto transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="mt-3 ml-1.5 border-l-2 border-blue-100 pl-4 space-y-0">
              {trace.map((entry, i) => {
                const isLast = i === trace.length - 1;
                const isRejected = entry.toLowerCase().includes('rejected') || entry.toLowerCase().includes('failed');
                const isApproved = entry.toLowerCase().includes('approved') || entry.toLowerCase().includes('passed');

                const dotColor = isRejected
                  ? 'text-laya-coral'
                  : isApproved
                  ? 'text-laya-green'
                  : 'text-gray-400';

                const DotIcon = isRejected
                  ? XCircle
                  : isApproved
                  ? CheckCircle
                  : isLast && isProcessing
                  ? Loader
                  : Circle;

                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="relative flex items-start gap-2.5 py-1.5"
                  >
                    {/* Timeline dot */}
                    <div className={`-ml-[23px] mt-0.5 bg-white rounded-full ${dotColor}`}>
                      <DotIcon size={14} className={isLast && isProcessing ? 'animate-spin' : ''} />
                    </div>
                    {/* Step text */}
                    <span
                      className={`text-xs leading-snug ${
                        isRejected
                          ? 'text-laya-coral font-medium'
                          : isApproved
                          ? 'text-laya-green font-medium'
                          : 'text-gray-500'
                      } ${isLast && isProcessing ? 'agent-pulse' : ''}`}
                    >
                      {entry}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
