// StatusBadge — APPROVED / REJECTED / PENDING badge component

import { CheckCircle, XCircle, Clock, AlertCircle, HelpCircle } from 'lucide-react';
import { DECISION_STYLES } from '../utils/constants';

const ICONS = {
  APPROVED: CheckCircle,
  REJECTED: XCircle,
  'PARTIALLY APPROVED': AlertCircle,
  PENDING: Clock,
  'ACTION REQUIRED': HelpCircle,
};

export default function StatusBadge({ decision }) {
  const style = DECISION_STYLES[decision] || {
    bg: 'bg-gray-400',
    text: 'text-white',
    label: decision || 'UNKNOWN',
  };
  const Icon = ICONS[decision] || HelpCircle;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold tracking-wide shadow-sm ${style.bg} ${style.text}`}
    >
      <Icon size={14} />
      {style.label}
    </span>
  );
}
