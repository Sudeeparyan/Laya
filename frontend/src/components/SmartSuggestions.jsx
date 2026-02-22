/**
 * SmartSuggestions — Contextual follow-up suggestion chips
 * Appears below AI responses to guide the user's next action.
 * Suggestions are dynamic based on the last claim result and conversation context.
 */

import { motion } from 'framer-motion';
import {
  MessageSquare, HelpCircle, RefreshCw, FileText, Stethoscope,
  Shield, TrendingUp, ArrowRight, Sparkles
} from 'lucide-react';

/**
 * Generate smart suggestions based on claim result and context.
 */
function getSuggestions(decision, flags, selectedMember, hasMessages) {
  const suggestions = [];

  if (!hasMessages) return [];

  if (decision === 'APPROVED') {
    suggestions.push(
      { text: 'Submit another claim', icon: FileText, type: 'action' },
      { text: 'What is my remaining coverage?', icon: Shield, type: 'question' },
      { text: 'How long until I receive payment?', icon: HelpCircle, type: 'question' },
    );
  } else if (decision === 'REJECTED') {
    suggestions.push(
      { text: 'Why was my claim rejected?', icon: HelpCircle, type: 'question' },
      { text: 'Can I appeal this decision?', icon: RefreshCw, type: 'question' },
      { text: 'What documents do I need to resubmit?', icon: FileText, type: 'question' },
    );
  } else if (decision === 'PARTIALLY_APPROVED') {
    suggestions.push(
      { text: 'Why was it only partially approved?', icon: HelpCircle, type: 'question' },
      { text: 'How can I claim the remaining amount?', icon: TrendingUp, type: 'question' },
      { text: 'Submit another claim', icon: FileText, type: 'action' },
    );
  } else if (decision === 'PENDING' || decision === 'ACTION_REQUIRED') {
    suggestions.push(
      { text: 'What additional info is needed?', icon: HelpCircle, type: 'question' },
      { text: 'How long will review take?', icon: RefreshCw, type: 'question' },
    );
  }

  // Always offer general options after any interaction
  if (decision) {
    suggestions.push(
      { text: 'Check my usage summary', icon: TrendingUp, type: 'question' },
    );
  } else if (hasMessages) {
    // Follow-up for general conversation
    suggestions.push(
      { text: 'What claims can I submit?', icon: Stethoscope, type: 'question' },
      { text: 'Check my coverage details', icon: Shield, type: 'question' },
      { text: 'Show my claim history', icon: FileText, type: 'question' },
    );
  }

  // Add member-specific suggestions
  if (selectedMember) {
    const usage = selectedMember.current_year_usage || {};
    if ((usage.gp_visits_count || 0) >= 8) {
      suggestions.push({
        text: `I've used ${usage.gp_visits_count}/10 GP visits — what happens next?`,
        icon: Stethoscope,
        type: 'warning',
      });
    }
    if ((usage.hospital_days_count || 0) >= 35) {
      suggestions.push({
        text: 'Am I close to my hospital day limit?',
        icon: Shield,
        type: 'warning',
      });
    }
  }

  // Limit to 4 suggestions max
  return suggestions.slice(0, 4);
}

const typeColors = {
  action: 'bg-laya-teal/5 border-laya-teal/20 text-laya-teal hover:bg-laya-teal/10 hover:border-laya-teal/40',
  question: 'bg-blue-50 border-blue-200/50 text-blue-600 hover:bg-blue-100/60 hover:border-blue-300/50',
  warning: 'bg-amber-50 border-amber-200/50 text-amber-600 hover:bg-amber-100/60 hover:border-amber-300/50',
};

export default function SmartSuggestions({ decision, flags, selectedMember, hasMessages, onSelect, isLoading }) {
  const suggestions = getSuggestions(decision, flags, selectedMember, hasMessages);

  if (suggestions.length === 0 || isLoading) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.3 }}
      className="max-w-3xl mx-auto px-6 pb-3"
    >
      <div className="flex items-center gap-1.5 mb-2">
        <Sparkles size={10} className="text-gray-300" />
        <span className="text-[10px] font-medium text-gray-400">Suggested follow-ups</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((suggestion, i) => {
          const Icon = suggestion.icon;
          const colors = typeColors[suggestion.type] || typeColors.question;
          return (
            <motion.button
              key={suggestion.text}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6 + i * 0.08 }}
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelect(suggestion.text)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium transition-all duration-200 ${colors}`}
            >
              <Icon size={12} />
              <span>{suggestion.text}</span>
              <ArrowRight size={10} className="opacity-0 group-hover:opacity-100 transition-opacity -ml-0.5" />
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}
