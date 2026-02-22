/**
 * AnalyticsCards — Developer dashboard statistics cards
 * Shows key metrics: total claims, approval rate, AI accuracy, processing time
 */

import { motion } from 'framer-motion';
import {
  FileText, CheckCircle, XCircle, Clock, Users, Euro,
  Brain, Zap, TrendingUp, AlertTriangle, Activity
} from 'lucide-react';

function StatCard({ icon: Icon, label, value, sub, color, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="dev-stat-card group"
    >
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon size={20} className="text-white" />
        </div>
        {sub && (
          <span className="text-[10px] font-medium text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
            {sub}
          </span>
        )}
      </div>
      <div className="text-2xl font-extrabold text-laya-navy tracking-tight">{value}</div>
      <div className="text-[11px] text-gray-400 mt-0.5 font-medium">{label}</div>
    </motion.div>
  );
}

export default function AnalyticsCards({ analytics, loading }) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="dev-stat-card">
            <div className="skeleton w-10 h-10 rounded-xl mb-3" />
            <div className="skeleton w-16 h-7 rounded mb-1" />
            <div className="skeleton w-24 h-3 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (!analytics) return null;

  const approvalRate = analytics.total_claims > 0
    ? ((analytics.approved / analytics.total_claims) * 100).toFixed(1)
    : '0';

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      <StatCard
        icon={Users}
        label="Total Members"
        value={analytics.total_members}
        color="gradient-teal"
        delay={0}
      />
      <StatCard
        icon={FileText}
        label="Total Claims"
        value={analytics.total_claims}
        sub="All time"
        color="bg-laya-blue"
        delay={0.05}
      />
      <StatCard
        icon={CheckCircle}
        label="Approved"
        value={analytics.approved}
        sub={`${approvalRate}%`}
        color="bg-laya-green"
        delay={0.1}
      />
      <StatCard
        icon={XCircle}
        label="Rejected"
        value={analytics.rejected}
        color="bg-laya-coral"
        delay={0.15}
      />
      <StatCard
        icon={Brain}
        label="AI Accuracy"
        value={`${analytics.ai_accuracy}%`}
        color="gradient-purple"
        delay={0.2}
      />
      <StatCard
        icon={Zap}
        label="Avg. Processing"
        value={`${analytics.avg_processing_time}s`}
        sub="vs 22 days manual"
        color="bg-laya-amber"
        delay={0.25}
      />
    </div>
  );
}
