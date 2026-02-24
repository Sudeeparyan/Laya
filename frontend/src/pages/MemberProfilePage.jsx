/**
 * MemberProfilePage — AI-First Claims Intelligence Dashboard
 * Route: /dev-dashboard/member/:memberId
 * 
 * Redesigned with AI as the USP:
 * - Compact member hero with key info
 * - Always-visible AI Review Panel alongside claims
 * - Tabbed analytics to reduce scrolling
 * - Prominent AI branding throughout
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Shield, User, Calendar, MapPin, Mail, Phone, Euro,
  FileText, CheckCircle, XCircle, Clock, AlertTriangle, Activity,
  TrendingUp, Heart, BarChart3, PieChart as PieChartIcon,
  Sparkles, ChevronDown, ChevronUp, RefreshCw, ExternalLink,
  CreditCard, Building2, Stethoscope, ShieldAlert, Timer,
  Upload, Brain, Zap, ChevronRight, Eye
} from 'lucide-react';
import { toast } from 'sonner';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  AreaChart, Area,
  RadialBarChart, RadialBar,
} from 'recharts';
import { useAuth } from '../hooks/useAuth';
import { fetchMemberProfile, runAIAnalysis, submitClaimReview } from '../services/api';
import ClaimReviewPanel from '../components/ClaimReviewPanel';

// ── Color constants ──
const COLORS = {
  teal: '#0072CE',
  tealLight: '#3498DB',
  navy: '#1B3A6B',
  coral: '#E85D4A',
  amber: '#F5A623',
  green: '#27AE60',
  blue: '#003DA5',
  purple: '#E6007E',
  pink: '#E6007E',
};

const PIE_COLORS = ['#27AE60', '#E85D4A', '#003DA5', '#F5A623', '#E6007E'];
const BAR_COLORS = ['#003DA5', '#0072CE', '#E6007E', '#F5A623', '#EC4899', '#E85D4A', '#27AE60'];

const STATUS_STYLES = {
  approved: { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200', icon: CheckCircle },
  rejected: { bg: 'bg-red-50', text: 'text-red-500', border: 'border-red-200', icon: XCircle },
  pending: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200', icon: Clock },
};

function getStatusStyle(status) {
  const key = status?.toLowerCase() || 'pending';
  for (const [k, v] of Object.entries(STATUS_STYLES)) {
    if (key.includes(k)) return v;
  }
  return STATUS_STYLES.pending;
}

// ── Custom Tooltip ──
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="profile-chart-tooltip">
      <p className="font-semibold text-xs text-gray-700 mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-[11px]" style={{ color: entry.color }}>
          {entry.name}: {typeof entry.value === 'number' && entry.name?.includes('€') ? `€${entry.value.toFixed(2)}` : entry.value}
        </p>
      ))}
    </div>
  );
}

// ── Compact Metric Card ──
function MetricCard({ icon: Icon, label, value, sub, color, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35 }}
      className="profile-stat-card group"
    >
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color} shadow-sm`}>
          <Icon size={18} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xl font-extrabold text-laya-navy tracking-tight leading-none">{value}</div>
          <div className="text-[10px] text-gray-400 mt-0.5 font-medium">{label}</div>
        </div>
        {sub && (
          <span className="text-[9px] font-semibold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full whitespace-nowrap">{sub}</span>
        )}
      </div>
    </motion.div>
  );
}

// ── Usage Limit Bar ──
function UsageLimitBar({ label, used, max, delay = 0 }) {
  const pct = max > 0 ? Math.min((used / max) * 100, 100) : 0;
  const isHigh = pct >= 80;
  const isMed = pct >= 50;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
      className="mb-3"
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] font-medium text-gray-600">{label}</span>
        <span className={`text-[11px] font-bold ${isHigh ? 'text-red-500' : isMed ? 'text-amber-500' : 'text-green-500'}`}>
          {used}/{max}
        </span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ delay: delay + 0.2, duration: 0.8, ease: 'easeOut' }}
          className={`h-full rounded-full ${isHigh ? 'bg-gradient-to-r from-red-400 to-red-500' : isMed ? 'bg-gradient-to-r from-amber-400 to-amber-500' : 'bg-gradient-to-r from-blue-400 to-laya-blue-mid'}`}
        />
      </div>
    </motion.div>
  );
}

// ── Analytics Tab Button ──
function TabButton({ active, icon: Icon, label, onClick, count }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
        active
          ? 'bg-white text-laya-navy shadow-sm border border-blue-100'
          : 'text-gray-400 hover:text-gray-600 hover:bg-white/50'
      }`}
    >
      <Icon size={14} className={active ? 'text-laya-blue-mid' : ''} />
      {label}
      {count != null && (
        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${active ? 'bg-blue-50 text-laya-blue' : 'bg-gray-100 text-gray-400'}`}>
          {count}
        </span>
      )}
    </button>
  );
}

// ── Main Component ──
export default function MemberProfilePage() {
  const { memberId } = useParams();
  const navigate = useNavigate();
  const { user, isDeveloper } = useAuth();

  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [analyticsTab, setAnalyticsTab] = useState('overview');

  // Redirect non-developers
  useEffect(() => {
    if (!isDeveloper) {
      navigate('/dashboard', { replace: true });
    }
  }, [isDeveloper, navigate]);

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchMemberProfile(memberId);
      setProfileData(data);
    } catch (err) {
      console.error('Profile load error:', err);
      toast.error('Failed to load member profile');
      navigate('/dev-dashboard');
    } finally {
      setLoading(false);
    }
  }, [memberId, navigate]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // AI Analysis handler
  async function handleRunAI() {
    if (!selectedClaim) return;
    setAiLoading(true);
    try {
      const result = await runAIAnalysis({
        member_id: selectedClaim.member_id,
        message: `Analyze claim ${selectedClaim.claim_id}: ${selectedClaim.treatment_type || 'General'} treatment, cost €${selectedClaim.claimed_amount || 0}`,
        treatment_type: selectedClaim.treatment_type,
        treatment_date: selectedClaim.treatment_date,
        practitioner_name: selectedClaim.practitioner_name,
        total_cost: selectedClaim.claimed_amount,
      });
      setAiResult(result);
      toast.success('AI analysis complete');
    } catch (err) {
      toast.error('AI analysis failed');
    } finally {
      setAiLoading(false);
    }
  }

  async function handleSubmitReview(reviewData) {
    try {
      const result = await submitClaimReview(reviewData);
      toast.success(result.message || 'Review submitted');
      setSelectedClaim(null);
      setAiResult(null);
      loadProfile();
    } catch (err) {
      toast.error('Failed to submit review');
    }
  }

  const member = profileData?.member;
  const analytics = profileData?.analytics;
  const claims = profileData?.claims || [];
  const uploadedDocs = profileData?.uploaded_documents || [];

  // Prepare chart data
  const statusPieData = useMemo(() => {
    if (!analytics?.status_distribution) return [];
    return Object.entries(analytics.status_distribution).map(([name, value]) => ({ name, value }));
  }, [analytics]);

  const typeBarData = useMemo(() => analytics?.claims_by_type || [], [analytics]);
  const timelineData = useMemo(() => analytics?.claims_timeline || [], [analytics]);
  const spendingData = useMemo(() => analytics?.spending_breakdown || [], [analytics]);

  const riskRadialData = useMemo(() => {
    if (!analytics) return [];
    return [{ name: 'Risk', value: analytics.risk_score, fill: analytics.risk_score >= 60 ? COLORS.coral : analytics.risk_score >= 30 ? COLORS.amber : COLORS.green }];
  }, [analytics]);

  // Loading state
  if (loading) {
    return (
      <div className="h-screen flex flex-col bg-gradient-to-br from-slate-50 via-blue-50/30 to-white">
        <header className="h-14 shrink-0 bg-white/90 backdrop-blur-md border-b border-blue-100 flex items-center px-6 shadow-sm">
          <div className="skeleton w-32 h-5 rounded" />
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-[1440px] mx-auto space-y-4">
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-8 skeleton h-32 rounded-2xl" />
              <div className="col-span-4 skeleton h-32 rounded-2xl" />
            </div>
            <div className="grid grid-cols-5 gap-3">
              {Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-20 rounded-xl" />)}
            </div>
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-7 skeleton h-96 rounded-2xl" />
              <div className="col-span-5 skeleton h-96 rounded-2xl" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!member || !analytics) return null;

  const initials = `${member.first_name?.[0] || ''}${member.last_name?.[0] || ''}`;
  const fullName = `${member.first_name} ${member.last_name}`;
  const pendingClaims = claims.filter(c => c.status?.toLowerCase().includes('pending'));

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-50 via-blue-50/30 to-white overflow-hidden">
      {/* ── Top Navigation ── */}
      <header className="h-14 shrink-0 bg-white/90 backdrop-blur-md border-b border-blue-100/60 flex items-center justify-between px-6 z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dev-dashboard')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-500 hover:text-laya-blue hover:bg-blue-50 transition-colors"
          >
            <ArrowLeft size={16} />
            <span>Back to Dashboard</span>
          </button>
          <div className="w-px h-6 bg-blue-100" />
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-laya-blue to-laya-blue-mid flex items-center justify-center shadow-md shadow-blue-200">
              <User size={14} className="text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-laya-navy leading-none">{fullName}</h1>
              <p className="text-[10px] text-gray-400 font-mono">{memberId}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* AI Badge in header */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-violet-50 to-pink-50 border border-violet-200/60">
            <div className="w-2 h-2 rounded-full bg-gradient-to-r from-violet-500 to-pink-500 animate-pulse" />
            <span className="text-[10px] font-bold text-violet-700">AI Engine Active</span>
          </div>
          <button
            onClick={loadProfile}
            className="p-2 rounded-lg text-gray-400 hover:text-laya-blue hover:bg-blue-50 transition-colors"
            title="Refresh profile"
          >
            <RefreshCw size={15} />
          </button>
          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-pink-50 text-pink-600 border border-pink-200 uppercase tracking-wider">
            Developer
          </span>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-[1440px] mx-auto p-5 space-y-4">

          {/* ═══════ ROW 1: COMPACT HERO + AI QUICK STATS ═══════ */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Hero Card */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="lg:col-span-8 profile-hero-card relative"
              style={{ padding: '20px 24px' }}
            >
              <div className="absolute inset-0 opacity-10 gradient-mesh rounded-xl" />
              <div className="absolute -right-20 -top-20 w-40 h-40 rounded-full bg-blue-400/10 blur-3xl" />

              <div className="relative z-10 flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white text-lg font-bold shadow-lg border-2 border-white/20 shrink-0">
                  {initials}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <h2 className="text-lg font-bold text-white leading-none">{fullName}</h2>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${member.status === 'Active' ? 'bg-green-500/20 text-green-300 border border-green-400/30' : 'bg-red-500/20 text-red-300'}`}>
                      {member.status}
                    </span>
                    {analytics.waiting_period_remaining > 0 && (
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30 flex items-center gap-1">
                        <Timer size={9} /> Waiting: {analytics.waiting_period_remaining} days left
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-x-5 gap-y-1">
                    {[
                      { icon: Building2, label: 'Scheme', value: member.scheme_name },
                      { icon: Calendar, label: 'Policy Start', value: member.policy_start_date },
                      { icon: Mail, label: 'Email', value: member.email },
                      { icon: MapPin, label: 'Location', value: `${member.city}, ${member.county}` },
                      { icon: Phone, label: 'Phone', value: member.phone },
                      { icon: CreditCard, label: 'IBAN', value: `**** ${member.iban_last4}` },
                      { icon: Heart, label: 'DOB', value: member.date_of_birth },
                      { icon: Activity, label: 'Days on Policy', value: `${analytics.days_on_policy} days` },
                    ].map(({ icon: ItemIcon, label, value: val }) => (
                      <div key={label} className="flex items-center gap-1.5">
                        <ItemIcon size={11} className="text-blue-200/60 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-[8px] text-blue-200/50 uppercase tracking-wider leading-none">{label}</p>
                          <p className="text-[10px] text-white font-medium truncate leading-tight">{val}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* AI Quick Stats Card */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="lg:col-span-4 ai-highlight-card rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden"
            >
              <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/5 blur-2xl" />
              <div className="absolute -left-4 -bottom-4 w-24 h-24 rounded-full bg-white/5 blur-xl" />
              
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center">
                    <Brain size={16} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white leading-none">AI Claims Intelligence</h3>
                    <p className="text-[9px] text-white/50 mt-0.5">6-Agent Pipeline</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl px-3 py-2 border border-white/10">
                    <p className="text-lg font-extrabold text-white leading-none">{analytics.total_claims}</p>
                    <p className="text-[8px] text-white/50 mt-0.5">Total Claims</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl px-3 py-2 border border-white/10">
                    <p className="text-lg font-extrabold text-white leading-none">{pendingClaims.length}</p>
                    <p className="text-[8px] text-amber-300/80 mt-0.5">Needs Review</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl px-3 py-2 border border-white/10">
                    <p className="text-lg font-extrabold text-white leading-none">{analytics.approval_rate}%</p>
                    <p className="text-[8px] text-green-300/80 mt-0.5">Approval Rate</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl px-3 py-2 border border-white/10">
                    <p className={`text-lg font-extrabold leading-none ${analytics.risk_score >= 60 ? 'text-red-300' : analytics.risk_score >= 30 ? 'text-amber-300' : 'text-green-300'}`}>
                      {analytics.risk_score}
                    </p>
                    <p className="text-[8px] text-white/50 mt-0.5">Risk Score</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* ═══════ KEY METRICS ROW ═══════ */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <MetricCard
              icon={FileText}
              label="Total Claims"
              value={analytics.total_claims}
              sub={`${analytics.pending} pending`}
              color="bg-laya-blue"
              delay={0}
            />
            <MetricCard
              icon={CheckCircle}
              label="Approved"
              value={analytics.approved}
              sub={`${analytics.approval_rate}%`}
              color="bg-laya-green"
              delay={0.05}
            />
            <MetricCard
              icon={Euro}
              label="Total Claimed"
              value={`€${analytics.total_claimed.toFixed(0)}`}
              color="bg-gradient-to-br from-laya-blue to-laya-blue-mid"
              delay={0.1}
            />
            <MetricCard
              icon={Euro}
              label="Quarterly Receipts"
              value={`€${analytics.q_accumulated_receipts.toFixed(0)}`}
              sub="of €150 threshold"
              color="bg-laya-amber"
              delay={0.15}
            />
            <MetricCard
              icon={ShieldAlert}
              label="Risk Score"
              value={analytics.risk_score}
              sub={analytics.risk_score >= 60 ? 'High' : analytics.risk_score >= 30 ? 'Medium' : 'Low'}
              color={analytics.risk_score >= 60 ? 'bg-laya-coral' : analytics.risk_score >= 30 ? 'bg-laya-amber' : 'bg-laya-green'}
              delay={0.2}
            />
          </div>

          {/* ═══════ RISK FACTORS ═══════ */}
          {analytics.risk_factors.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 rounded-xl px-4 py-2.5"
            >
              <div className="flex items-center gap-2">
                <AlertTriangle size={14} className="text-amber-500 shrink-0" />
                <span className="text-xs font-bold text-amber-700 shrink-0">Risk Factors</span>
                <div className="flex flex-wrap gap-1.5 ml-2">
                  {analytics.risk_factors.map((f, i) => (
                    <span key={i} className="text-[10px] bg-white/70 text-amber-800 px-2 py-0.5 rounded-lg border border-amber-200 font-medium">
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* ═══════ AI-POWERED CLAIMS REVIEW (HERO SECTION) ═══════ */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            {/* Section Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-violet-500/10 to-pink-500/10 border border-violet-200/50">
                  <Sparkles size={14} className="text-violet-500" />
                  <span className="text-xs font-bold text-violet-700">AI-Powered Claims Review</span>
                </div>
                <span className="text-[10px] text-gray-400 hidden sm:inline">
                  Select a claim to analyze with the AI pipeline
                </span>
              </div>
              {pendingClaims.length > 0 && (
                <span className="flex items-center gap-1.5 text-[10px] font-semibold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  {pendingClaims.length} claim{pendingClaims.length > 1 ? 's' : ''} pending review
                </span>
              )}
            </div>

            {/* Two-column: Claims + Always-visible AI Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Claims Table */}
              <div className="lg:col-span-7">
                <div className="profile-chart-card h-full">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <FileText size={15} className="text-laya-blue-mid" />
                      <h3 className="text-sm font-bold text-laya-navy">Claims History</h3>
                      <span className="text-[10px] bg-blue-50 text-laya-blue px-2 py-0.5 rounded-full font-semibold">
                        {claims.length} records
                      </span>
                    </div>
                  </div>

                  {claims.length === 0 ? (
                    <div className="text-center py-12">
                      <FileText size={36} className="mx-auto text-gray-200 mb-3" />
                      <p className="text-sm text-gray-500 font-medium">No claims on record</p>
                      <p className="text-[11px] text-gray-400 mt-1">Claims will appear here after submission</p>
                    </div>
                  ) : (
                    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                      {/* Table header */}
                      <div className="grid grid-cols-12 gap-1 px-3 py-2.5 bg-gray-50/80 border-b border-gray-100 text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                        <div className="col-span-3">Claim ID</div>
                        <div className="col-span-2">Treatment</div>
                        <div className="col-span-2">Date</div>
                        <div className="col-span-1">Amount</div>
                        <div className="col-span-2">Status</div>
                        <div className="col-span-2 text-right">AI Action</div>
                      </div>

                      {/* Rows */}
                      <div className="divide-y divide-gray-50 max-h-[400px] overflow-y-auto">
                        {claims.map((claim, i) => {
                          const style = getStatusStyle(claim.status);
                          const StatusIcon = style.icon;
                          const isSelected = selectedClaim?.claim_id === claim.claim_id;
                          const isPending = claim.status?.toLowerCase().includes('pending');

                          return (
                            <motion.div
                              key={claim.claim_id}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: Math.min(i * 0.03, 0.3) }}
                              onClick={() => {
                                setSelectedClaim(claim);
                                setAiResult(null);
                              }}
                              className={`grid grid-cols-12 gap-1 px-3 py-3 cursor-pointer transition-all group ${
                                isSelected
                                  ? 'bg-gradient-to-r from-violet-50/50 to-pink-50/30 border-l-[3px] border-l-violet-500'
                                  : 'hover:bg-blue-50/30'
                              }`}
                            >
                              <div className="col-span-3 flex items-center">
                                <span className="text-[10px] font-mono text-gray-500 truncate">{claim.claim_id}</span>
                              </div>
                              <div className="col-span-2 flex items-center">
                                <span className="text-[11px] text-gray-600 font-medium">{claim.treatment_type}</span>
                              </div>
                              <div className="col-span-2 flex items-center">
                                <span className="text-[10px] text-gray-400">{claim.treatment_date}</span>
                              </div>
                              <div className="col-span-1 flex items-center">
                                <span className="text-[11px] font-bold text-laya-navy">€{claim.claimed_amount?.toFixed(0)}</span>
                              </div>
                              <div className="col-span-2 flex items-center">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-bold border ${style.bg} ${style.text} ${style.border}`}>
                                  <StatusIcon size={8} />
                                  {claim.status}
                                </span>
                              </div>
                              <div className="col-span-2 flex items-center justify-end">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedClaim(claim);
                                    setAiResult(null);
                                  }}
                                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[9px] font-bold transition-all ${
                                    isPending
                                      ? 'bg-gradient-to-r from-violet-500 to-pink-500 text-white shadow-sm shadow-violet-200 hover:shadow-md hover:shadow-violet-300'
                                      : 'bg-gray-50 text-gray-400 hover:bg-violet-50 hover:text-violet-500 border border-gray-200 hover:border-violet-200'
                                  }`}
                                  title="Analyze with AI"
                                >
                                  <Sparkles size={10} />
                                  {isPending ? 'Analyze' : 'Review'}
                                </button>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* AI Review Panel - ALWAYS VISIBLE */}
              <div className="lg:col-span-5">
                <div className="sticky top-4">
                  {selectedClaim ? (
                    <ClaimReviewPanel
                      claim={selectedClaim}
                      onClose={() => {
                        setSelectedClaim(null);
                        setAiResult(null);
                      }}
                      onRunAI={handleRunAI}
                      onSubmitReview={handleSubmitReview}
                      aiResult={aiResult}
                      aiLoading={aiLoading}
                    />
                  ) : (
                    /* AI Empty State — Showcases the USP */
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="rounded-2xl border-2 border-dashed border-violet-200/60 p-8 text-center relative overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-violet-50/80 via-pink-50/40 to-blue-50/60" />
                      <div className="absolute -right-12 -top-12 w-32 h-32 rounded-full bg-violet-200/20 blur-2xl" />
                      <div className="absolute -left-8 -bottom-8 w-24 h-24 rounded-full bg-pink-200/20 blur-xl" />
                      
                      <div className="relative z-10">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-violet-200">
                          <Brain size={28} className="text-white" />
                        </div>
                        <h3 className="text-base font-bold text-laya-navy mb-1.5">AI Claims Intelligence</h3>
                        <p className="text-[12px] text-gray-500 mb-5 max-w-xs mx-auto leading-relaxed">
                          Select a claim from the table to run our <strong>6-agent AI pipeline</strong> for instant analysis, policy verification, and smart recommendations.
                        </p>
                        
                        <div className="space-y-2.5 max-w-[260px] mx-auto text-left">
                          {[
                            { icon: Eye, text: 'OCR document extraction', color: 'text-blue-500 bg-blue-50' },
                            { icon: Shield, text: 'Policy eligibility check', color: 'text-green-500 bg-green-50' },
                            { icon: Zap, text: 'Fraud & risk detection', color: 'text-amber-500 bg-amber-50' },
                            { icon: Brain, text: 'AI-powered recommendation', color: 'text-violet-500 bg-violet-50' },
                          ].map((feature, i) => (
                            <motion.div
                              key={i}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.2 + i * 0.08 }}
                              className="flex items-center gap-2.5 py-1"
                            >
                              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${feature.color}`}>
                                <feature.icon size={13} />
                              </div>
                              <span className="text-[11px] font-medium text-gray-600">{feature.text}</span>
                            </motion.div>
                          ))}
                        </div>

                        {pendingClaims.length > 0 && (
                          <motion.button
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                            onClick={() => {
                              setSelectedClaim(pendingClaims[0]);
                              setAiResult(null);
                            }}
                            className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-pink-500 text-white text-xs font-bold shadow-lg shadow-violet-200 hover:shadow-xl hover:shadow-violet-300 transition-all hover:scale-[1.02]"
                          >
                            <Sparkles size={14} />
                            Analyze First Pending Claim
                            <ChevronRight size={14} />
                          </motion.button>
                        )}
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>

          {/* ═══════ UPLOADED DOCUMENTS ═══════ */}
          {uploadedDocs.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="profile-chart-card"
            >
              <div className="flex items-center gap-2 mb-3">
                <Upload size={15} className="text-laya-blue-mid" />
                <h3 className="text-sm font-bold text-laya-navy">Uploaded Documents</h3>
                <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">
                  {uploadedDocs.length} files
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {uploadedDocs.map((doc, i) => (
                  <motion.div
                    key={doc.doc_id || i}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 + i * 0.05 }}
                    className="bg-gray-50/80 rounded-xl border border-gray-100 p-3 hover:border-laya-blue/30 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-start gap-2.5 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-laya-blue/10 flex items-center justify-center shrink-0">
                        <FileText size={14} className="text-laya-blue-mid" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-semibold text-laya-navy truncate">{doc.filename}</p>
                        <p className="text-[9px] text-gray-400">
                          {doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleString('en-IE', {
                            month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
                          }) : '—'}
                        </p>
                      </div>
                    </div>
                    {doc.extracted_data && (
                      <div className="bg-white rounded-lg border border-gray-100 p-2 space-y-1 mb-2">
                        {doc.extracted_data.treatment_type && (
                          <div className="flex justify-between text-[10px]">
                            <span className="text-gray-400">Treatment</span>
                            <span className="font-medium text-gray-600">{doc.extracted_data.treatment_type}</span>
                          </div>
                        )}
                        {doc.extracted_data.total_cost != null && (
                          <div className="flex justify-between text-[10px]">
                            <span className="text-gray-400">Amount</span>
                            <span className="font-semibold text-laya-navy">€{doc.extracted_data.total_cost.toFixed(2)}</span>
                          </div>
                        )}
                        {doc.extracted_data.practitioner_name && (
                          <div className="flex justify-between text-[10px]">
                            <span className="text-gray-400">Practitioner</span>
                            <span className="font-medium text-gray-600">{doc.extracted_data.practitioner_name}</span>
                          </div>
                        )}
                      </div>
                    )}
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
                      doc.extraction_method === 'pdf_text_extraction'
                        ? 'bg-green-50 text-green-600 border border-green-200'
                        : 'bg-blue-50 text-blue-500 border border-blue-200'
                    }`}>
                      {doc.extraction_method === 'pdf_text_extraction' ? 'OCR Extracted' : 'Template Matched'}
                    </span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ═══════ ANALYTICS (TABBED) ═══════ */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            {/* Tab Bar */}
            <div className="flex items-center gap-1 mb-4 bg-gray-50/80 rounded-xl p-1 border border-gray-100 w-fit">
              <TabButton
                active={analyticsTab === 'overview'}
                icon={BarChart3}
                label="Overview"
                onClick={() => setAnalyticsTab('overview')}
              />
              <TabButton
                active={analyticsTab === 'claims'}
                icon={PieChartIcon}
                label="Claims Analysis"
                onClick={() => setAnalyticsTab('claims')}
                count={claims.length}
              />
              <TabButton
                active={analyticsTab === 'spending'}
                icon={Euro}
                label="Spending"
                onClick={() => setAnalyticsTab('spending')}
              />
            </div>

            {/* Tab Content */}
            <AnimatePresence mode="wait">
              {analyticsTab === 'overview' && (
                <motion.div
                  key="overview"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="grid grid-cols-1 lg:grid-cols-3 gap-4"
                >
                  {/* Usage Limits */}
                  <div className="profile-chart-card">
                    <div className="flex items-center gap-2 mb-4">
                      <Activity size={15} className="text-laya-blue-mid" />
                      <h3 className="text-sm font-bold text-laya-navy">Annual Usage Limits</h3>
                    </div>
                    <div className="space-y-1">
                      {Object.entries(analytics.limits).map(([key, l], i) => (
                        <UsageLimitBar key={key} label={l.label} used={l.used} max={l.max} delay={i * 0.05} />
                      ))}
                    </div>
                  </div>

                  {/* Status Pie */}
                  <div className="profile-chart-card">
                    <div className="flex items-center gap-2 mb-4">
                      <PieChartIcon size={15} className="text-laya-blue-mid" />
                      <h3 className="text-sm font-bold text-laya-navy">Claims Status</h3>
                    </div>
                    {statusPieData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={210}>
                        <PieChart>
                          <Pie
                            data={statusPieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={80}
                            paddingAngle={4}
                            dataKey="value"
                            stroke="none"
                          >
                            {statusPieData.map((entry, index) => (
                              <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip content={<CustomTooltip />} />
                          <Legend
                            verticalAlign="bottom"
                            height={36}
                            iconSize={8}
                            formatter={(value) => <span className="text-[11px] text-gray-600">{value}</span>}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[210px] flex items-center justify-center text-gray-400 text-sm">No claims yet</div>
                    )}
                  </div>

                  {/* Risk Gauge */}
                  <div className="profile-chart-card">
                    <div className="flex items-center gap-2 mb-4">
                      <ShieldAlert size={15} className="text-laya-blue-mid" />
                      <h3 className="text-sm font-bold text-laya-navy">Risk Assessment</h3>
                    </div>
                    <ResponsiveContainer width="100%" height={180}>
                      <RadialBarChart
                        innerRadius="60%"
                        outerRadius="90%"
                        data={riskRadialData}
                        startAngle={180}
                        endAngle={0}
                        cx="50%"
                        cy="70%"
                      >
                        <RadialBar
                          dataKey="value"
                          cornerRadius={10}
                          background={{ fill: '#f3f4f6' }}
                        />
                      </RadialBarChart>
                    </ResponsiveContainer>
                    <div className="text-center -mt-6">
                      <p className={`text-3xl font-extrabold ${analytics.risk_score >= 60 ? 'text-red-500' : analytics.risk_score >= 30 ? 'text-amber-500' : 'text-green-500'}`}>
                        {analytics.risk_score}
                      </p>
                      <p className="text-[10px] text-gray-400 font-medium">out of 100</p>
                    </div>
                  </div>
                </motion.div>
              )}

              {analyticsTab === 'claims' && (
                <motion.div
                  key="claims"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="grid grid-cols-1 lg:grid-cols-2 gap-4"
                >
                  {/* Claims by Type */}
                  <div className="profile-chart-card">
                    <div className="flex items-center gap-2 mb-4">
                      <BarChart3 size={15} className="text-laya-blue-mid" />
                      <h3 className="text-sm font-bold text-laya-navy">Claims by Treatment Type</h3>
                    </div>
                    {typeBarData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={240}>
                        <BarChart data={typeBarData} barSize={32}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis dataKey="type" tick={{ fontSize: 10, fill: '#94a3b8' }} angle={-20} textAnchor="end" height={50} />
                          <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} allowDecimals={false} />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar dataKey="count" name="Claims" radius={[6, 6, 0, 0]}>
                            {typeBarData.map((entry, index) => (
                              <Cell key={entry.type} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[240px] flex items-center justify-center text-gray-400 text-sm">No claims data</div>
                    )}
                  </div>

                  {/* Monthly Trend */}
                  <div className="profile-chart-card">
                    <div className="flex items-center gap-2 mb-4">
                      <TrendingUp size={15} className="text-laya-blue-mid" />
                      <h3 className="text-sm font-bold text-laya-navy">Claims Over Time</h3>
                    </div>
                    {timelineData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={240}>
                        <AreaChart data={timelineData}>
                          <defs>
                            <linearGradient id="colorClaims" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={COLORS.teal} stopOpacity={0.3} />
                              <stop offset="95%" stopColor={COLORS.teal} stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                          <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} allowDecimals={false} />
                          <Tooltip content={<CustomTooltip />} />
                          <Area type="monotone" dataKey="count" name="Claims" stroke={COLORS.teal} fill="url(#colorClaims)" strokeWidth={2} />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[240px] flex items-center justify-center text-gray-400 text-sm">No timeline data yet</div>
                    )}
                  </div>
                </motion.div>
              )}

              {analyticsTab === 'spending' && (
                <motion.div
                  key="spending"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="profile-chart-card">
                    <div className="flex items-center gap-2 mb-4">
                      <Euro size={15} className="text-laya-blue-mid" />
                      <h3 className="text-sm font-bold text-laya-navy">Spending by Treatment Type</h3>
                    </div>
                    {spendingData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={spendingData} barSize={32} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                          <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(v) => `€${v}`} />
                          <YAxis dataKey="type" type="category" tick={{ fontSize: 10, fill: '#94a3b8' }} width={100} />
                          <Tooltip content={<CustomTooltip />} formatter={(v) => `€${v.toFixed(2)}`} />
                          <Bar dataKey="amount" name="€ Amount" radius={[0, 6, 6, 0]}>
                            {spendingData.map((entry, index) => (
                              <Cell key={entry.type} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[280px] flex items-center justify-center text-gray-400 text-sm">No spending data</div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

        </div>
      </main>
    </div>
  );
}
