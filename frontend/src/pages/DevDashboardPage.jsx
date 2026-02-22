/**
 * DevDashboardPage — The "AI assists, human decides" developer experience.
 * 
 * Layout: Full-width dashboard with analytics cards up top,
 * claims queue on the left, and AI review panel on the right.
 * 
 * Pitch: "Claims take 22 days manually → our AI pipeline pre-analyzes
 * each claim → developer confirms in seconds → human always decides."
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, MessageSquare, LogOut, Shield, Clock,
  RefreshCw, User, Bell, Search, ChevronDown, Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../hooks/useAuth';
import AnalyticsCards from '../components/AnalyticsCards';
import ClaimsQueue from '../components/ClaimsQueue';
import ClaimReviewPanel from '../components/ClaimReviewPanel';
import MembersOverview from '../components/MembersOverview';
import {
  fetchClaimsQueue,
  fetchAnalytics,
  runAIAnalysis,
  submitClaimReview,
} from '../services/api';

export default function DevDashboardPage() {
  const { user, logout, isDeveloper } = useAuth();
  const navigate = useNavigate();

  // Data state
  const [claims, setClaims] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  // UI state
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Redirect non-developers
  useEffect(() => {
    if (!isDeveloper) {
      navigate('/dashboard', { replace: true });
    }
  }, [isDeveloper, navigate]);

  // Fetch dashboard data
  const loadDashboard = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true);
      else setLoading(true);

      const [claimsData, analyticsData] = await Promise.all([
        fetchClaimsQueue(),
        fetchAnalytics(),
      ]);

      setClaims(claimsData.claims || []);
      setAnalytics(analyticsData);
    } catch (err) {
      console.error('Dashboard load error:', err);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // Select a claim for review
  function handleSelectClaim(claim) {
    setSelectedClaim(claim);
    setAiResult(null);
  }

  function handleCloseClaim() {
    setSelectedClaim(null);
    setAiResult(null);
  }

  // Run AI analysis on the selected claim
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
      console.error('AI analysis error:', err);
      toast.error('AI analysis failed — try again');
    } finally {
      setAiLoading(false);
    }
  }

  // Submit the final human decision
  async function handleSubmitReview(reviewData) {
    try {
      const result = await submitClaimReview(reviewData);
      toast.success(result.message || 'Review submitted');

      // Refresh the queue
      setSelectedClaim(null);
      setAiResult(null);
      loadDashboard(true);
    } catch (err) {
      console.error('Review submit error:', err);
      toast.error('Failed to submit review');
    }
  }

  // Navigate member from risk monitor into the claim queue
  function handleSelectMemberFromRisk(memberId) {
    // Scroll to claims queue and filter (use ref in future)
    toast.info(`Filtering claims for ${memberId}`);
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50/80 overflow-hidden">
      {/* ── Top Navigation Bar ─────────────────────────── */}
      <header className="h-14 shrink-0 bg-white border-b border-gray-100 flex items-center justify-between px-5 z-20 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg gradient-teal flex items-center justify-center shadow-md shadow-laya-teal/20">
            <Shield size={16} className="text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-laya-navy leading-none">Laya Healthcare</h1>
            <p className="text-[10px] text-gray-400 mt-0.5">Developer Claims Dashboard</p>
          </div>
          <span className="ml-3 text-[9px] font-bold px-2 py-0.5 rounded-full badge-developer uppercase tracking-wider">
            Developer
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Refresh */}
          <button
            onClick={() => loadDashboard(true)}
            disabled={refreshing}
            className="p-2 rounded-lg text-gray-400 hover:text-laya-teal hover:bg-laya-light transition-colors"
            title="Refresh dashboard"
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
          </button>

          {/* Switch to Chat */}
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium text-gray-500 hover:text-laya-teal hover:bg-laya-light transition-colors"
          >
            <MessageSquare size={13} />
            <span>Chat View</span>
          </button>

          {/* User */}
          <div className="flex items-center gap-2 pl-2 border-l border-gray-100 ml-1">
            <div className="w-7 h-7 rounded-full gradient-navy flex items-center justify-center">
              <span className="text-[10px] font-bold text-white">
                {user?.first_name?.[0]}{user?.last_name?.[0]}
              </span>
            </div>
            <div className="hidden sm:block">
              <p className="text-[11px] font-medium text-laya-navy leading-none">
                {user?.first_name} {user?.last_name}
              </p>
              <p className="text-[9px] text-gray-400">{user?.email}</p>
            </div>
            <button
              onClick={logout}
              className="p-1.5 rounded-lg text-gray-300 hover:text-laya-coral hover:bg-red-50 transition-colors ml-1"
              title="Logout"
            >
              <LogOut size={13} />
            </button>
          </div>
        </div>
      </header>

      {/* ── Main Content ───────────────────────────────── */}
      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Hero Banner */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-xl bg-gradient-to-r from-laya-navy to-laya-navy-light px-6 py-4"
        >
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles size={14} className="text-laya-teal" />
              <span className="text-[10px] font-bold text-laya-teal uppercase tracking-wider">AI-Powered Claims Processing</span>
            </div>
            <h2 className="text-lg font-bold text-white">
              22 days → seconds
            </h2>
            <p className="text-xs text-gray-400 mt-0.5 max-w-xl">
              AI pre-analyzes every claim through our 6-agent pipeline. You review the recommendation and make the final call. Faster processing, higher accuracy, human oversight.
            </p>
          </div>
          {/* Decorative mesh */}
          <div className="absolute inset-0 opacity-10 gradient-mesh" />
          <div className="absolute -right-16 -top-16 w-48 h-48 rounded-full bg-laya-teal/10 blur-3xl" />
        </motion.div>

        {/* Analytics Cards */}
        <AnalyticsCards analytics={analytics} loading={loading} />

        {/* Claims Queue + Review Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left: Claims Queue + Risk Monitor */}
          <div className={`space-y-4 ${selectedClaim ? 'lg:col-span-7' : 'lg:col-span-8'}`}>
            <ClaimsQueue
              claims={claims}
              loading={loading}
              selectedClaimId={selectedClaim?.claim_id}
              onSelectClaim={handleSelectClaim}
            />

            {/* Risk Monitor */}
            {analytics?.member_risk_scores?.length > 0 && (
              <MembersOverview
                riskScores={analytics.member_risk_scores}
                onSelectMember={handleSelectMemberFromRisk}
              />
            )}
          </div>

          {/* Right: AI Review Panel */}
          <div className={`${selectedClaim ? 'lg:col-span-5' : 'lg:col-span-4'}`}>
            <div className="sticky top-4">
              <ClaimReviewPanel
                claim={selectedClaim}
                onClose={handleCloseClaim}
                onRunAI={handleRunAI}
                onSubmitReview={handleSubmitReview}
                aiResult={aiResult}
                aiLoading={aiLoading}
              />
            </div>
          </div>
        </div>
      </main>

      {/* ── Footer ─────────────────────────────────────── */}
      <footer className="h-8 shrink-0 bg-white border-t border-gray-100 flex items-center justify-between px-5 text-[9px] text-gray-400">
        <span>© 2025 Laya Healthcare — AI Claims Dashboard</span>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <Clock size={9} />
            Avg AI Processing: {analytics?.avg_processing_time || '—'}s
          </span>
          <span className="flex items-center gap-1">
            <Sparkles size={9} />
            AI Accuracy: {analytics?.ai_accuracy || '—'}%
          </span>
        </div>
      </footer>
    </div>
  );
}
