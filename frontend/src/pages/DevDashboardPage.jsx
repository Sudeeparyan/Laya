/**
 * DevDashboardPage — Developer Claims Dashboard with tabbed navigation.
 * 
 * Tabs: Claims Queue | Members | Documents
 * - Claims: Queue with priority badges + AI review panel
 * - Members: Grid of all members with key metrics, clickable to profile
 * - Documents: Recent customer uploads visible to developer
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare, LogOut, Shield, Clock,
  RefreshCw, Users, FileText, Upload,
  Sparkles, ChevronRight,
  CheckCircle, XCircle,
  Calendar, MapPin, User, Building2,
  Activity, Eye, Send, ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../hooks/useAuth';
import AnalyticsCards from '../components/AnalyticsCards';
import ClaimsQueue from '../components/ClaimsQueue';
import ClaimReviewPanel from '../components/ClaimReviewPanel';
import PdfPreview from '../components/PdfPreview';
import {
  fetchClaimsQueue,
  fetchAnalytics,
  fetchMembersOverview,
  fetchAllDocuments,
  fetchActivities,
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
  const [allMembers, setAllMembers] = useState([]);
  const [allDocuments, setAllDocuments] = useState([]);
  const [activities, setActivities] = useState([]);
  const [previewDoc, setPreviewDoc] = useState(null);

  // UI state
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('claims');
  const [memberSearch, setMemberSearch] = useState('');

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

      const [claimsData, analyticsData, membersData] = await Promise.all([
        fetchClaimsQueue(),
        fetchAnalytics(),
        fetchMembersOverview(),
      ]);

      setClaims(claimsData.claims || []);
      setAnalytics(analyticsData);
      setAllMembers(membersData.members || []);

      // Load documents and activities (non-blocking)
      try {
        const docsData = await fetchAllDocuments();
        setAllDocuments(docsData.documents || []);
      } catch { /* documents endpoint may not have data yet */ }
      try {
        const actData = await fetchActivities();
        setActivities(actData.activities || []);
      } catch { /* activities endpoint may not have data yet */ }

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

  function handleSelectClaim(claim) {
    setSelectedClaim(claim);
    setAiResult(null);
  }

  function handleCloseClaim() {
    setSelectedClaim(null);
    setAiResult(null);
  }

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

  async function handleSubmitReview(reviewData) {
    try {
      const result = await submitClaimReview(reviewData);
      toast.success(result.message || 'Review submitted');
      setSelectedClaim(null);
      setAiResult(null);
      loadDashboard(true);
    } catch (err) {
      console.error('Review submit error:', err);
      toast.error('Failed to submit review');
    }
  }

  // Filter members by search
  const filteredMembers = allMembers.filter(m => {
    if (!memberSearch.trim()) return true;
    const q = memberSearch.toLowerCase();
    const name = `${m.first_name} ${m.last_name}`.toLowerCase();
    return name.includes(q) || m.member_id?.toLowerCase().includes(q) ||
           m.scheme_name?.toLowerCase().includes(q) || m.city?.toLowerCase().includes(q);
  });

  // Member stats helper
  function getMemberStats(member) {
    const cl = member.claims_history || [];
    const approved = cl.filter(c => c.status?.toLowerCase().includes('approved')).length;
    const rejected = cl.filter(c => c.status?.toLowerCase().includes('rejected')).length;
    const pending = cl.filter(c => c.status?.toLowerCase().includes('pending')).length;
    const total = cl.reduce((sum, c) => sum + (c.claimed_amount || 0), 0);
    return { total: cl.length, approved, rejected, pending, totalAmount: total };
  }

  const TABS = [
    { key: 'claims', label: 'Claims Queue', icon: FileText, count: claims.length },
    { key: 'members', label: 'Members', icon: Users, count: allMembers.length },
    { key: 'documents', label: 'Documents', icon: Upload, count: allDocuments.length },
    { key: 'activity', label: 'Activity Log', icon: Activity, count: activities.length },
  ];

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-white via-blue-50/50 to-pink-50/20 overflow-hidden">
      {/* ── Top Navigation Bar ─────────────────────────── */}
      <header className="h-14 shrink-0 bg-white/90 backdrop-blur-md border-b border-blue-100 flex items-center justify-between px-5 z-20 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-laya-blue to-laya-blue-mid flex items-center justify-center shadow-md shadow-blue-200">
            <Shield size={16} className="text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-laya-navy leading-none">Laya Healthcare</h1>
            <p className="text-[10px] text-gray-500 mt-0.5">Developer Claims Dashboard</p>
          </div>
          <span className="ml-3 text-[9px] font-bold px-2 py-0.5 rounded-full bg-pink-50 text-pink-600 border border-pink-200 uppercase tracking-wider">
            Developer
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadDashboard(true)}
            disabled={refreshing}
            className="p-2 rounded-lg text-gray-400 hover:text-laya-blue hover:bg-blue-50 transition-colors"
            title="Refresh dashboard"
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium text-gray-500 hover:text-laya-blue hover:bg-blue-50 transition-colors"
          >
            <MessageSquare size={13} />
            <span>Chat View</span>
          </button>
          <div className="flex items-center gap-2 pl-2 border-l border-gray-100 ml-1">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-laya-blue to-laya-blue-mid flex items-center justify-center shadow-sm">
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
              className="p-1.5 rounded-lg text-gray-400 hover:text-laya-coral hover:bg-red-50 transition-colors ml-1"
              title="Logout"
            >
              <LogOut size={13} />
            </button>
          </div>
        </div>
      </header>

      {/* ── Main Content ───────────────────────────────── */}
      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Analytics Cards */}
        <AnalyticsCards analytics={analytics} loading={loading} />

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 bg-white/90 backdrop-blur-md rounded-xl border border-blue-100 p-1 shadow-sm w-fit">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-laya-blue to-laya-blue-mid text-white shadow-md shadow-blue-200'
                    : 'text-gray-500 hover:text-laya-navy hover:bg-blue-50'
                }`}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-400'
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* ═══ TAB: Claims Queue ═══ */}
        {activeTab === 'claims' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className={`space-y-4 ${selectedClaim ? 'lg:col-span-7' : 'lg:col-span-12'}`}>
              <ClaimsQueue
                claims={claims}
                loading={loading}
                selectedClaimId={selectedClaim?.claim_id}
                onSelectClaim={handleSelectClaim}
                onRefresh={() => loadDashboard(true)}
              />
            </div>
            {selectedClaim && (
              <div className="lg:col-span-5">
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
            )}
          </div>
        )}

        {/* ═══ TAB: Members ═══ */}
        {activeTab === 'members' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Members search */}
            <div className="relative max-w-md">
              <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={memberSearch}
                onChange={e => setMemberSearch(e.target.value)}
                placeholder="Search members by name, ID, scheme, city..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-blue-100 text-sm bg-white focus:outline-none focus:border-laya-blue/40 focus:ring-2 focus:ring-laya-blue/10 transition-all placeholder:text-gray-400"
              />
            </div>

            {/* Members Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-xl border border-gray-100 p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="skeleton w-12 h-12 rounded-xl" />
                      <div className="flex-1">
                        <div className="skeleton w-24 h-4 rounded mb-1" />
                        <div className="skeleton w-16 h-3 rounded" />
                      </div>
                    </div>
                    <div className="skeleton w-full h-16 rounded-lg" />
                  </div>
                ))
              ) : filteredMembers.length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <Users size={40} className="mx-auto text-gray-200 mb-3" />
                  <p className="text-sm text-gray-400">No members found</p>
                </div>
              ) : (
                filteredMembers.map((member, i) => {
                  const stats = getMemberStats(member);
                  const initials = `${member.first_name?.[0] || ''}${member.last_name?.[0] || ''}`;
                  const isNewPolicy = (member.policy_start_date || '') >= '2026-01-01';

                  return (
                    <motion.div
                      key={member.member_id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.03, 0.3) }}
                      onClick={() => navigate(`/dev-dashboard/member/${member.member_id}`)}
                      className="bg-white rounded-xl border border-blue-100 hover:border-laya-blue/30 hover:shadow-lg hover:shadow-blue-100 transition-all cursor-pointer group overflow-hidden"
                    >
                      {/* Header */}
                      <div className="px-4 pt-4 pb-3">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-laya-blue to-laya-blue-mid flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-md shadow-blue-200">
                            {initials}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h3 className="text-sm font-bold text-laya-navy truncate group-hover:text-laya-blue transition-colors">
                                {member.first_name} {member.last_name}
                              </h3>
                              <ChevronRight size={14} className="text-gray-400 group-hover:text-laya-blue transition-colors shrink-0" />
                            </div>
                            <p className="text-[10px] text-gray-400 font-mono">{member.member_id}</p>
                          </div>
                        </div>

                        {/* Badges */}
                        <div className="flex items-center gap-1.5 flex-wrap mb-3">
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                            member.status === 'Active' ? 'bg-green-50 text-green-600 border border-green-200' : 'bg-red-50 text-red-500 border border-red-200'
                          }`}>
                            {member.status}
                          </span>
                          {isNewPolicy && (
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200">
                              New Policy
                            </span>
                          )}
                          {stats.pending > 0 && (
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-500 border border-blue-200">
                              {stats.pending} Pending
                            </span>
                          )}
                        </div>

                        {/* Details */}
                        <div className="space-y-1.5 text-[11px] text-gray-500">
                          <div className="flex items-center gap-2">
                            <Building2 size={11} className="text-gray-400 shrink-0" />
                            <span className="truncate">{member.scheme_name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar size={11} className="text-gray-400 shrink-0" />
                            <span>Policy: {member.policy_start_date}</span>
                          </div>
                          {member.city && (
                            <div className="flex items-center gap-2">
                              <MapPin size={11} className="text-gray-400 shrink-0" />
                              <span>{member.city}, {member.county}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Stats Footer */}
                      <div className="px-4 py-2.5 bg-gray-50/80 border-t border-gray-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="text-center">
                            <p className="text-xs font-bold text-laya-navy">{stats.total}</p>
                            <p className="text-[8px] text-gray-400">Claims</p>
                          </div>
                          <div className="w-px h-6 bg-gray-200" />
                          <div className="flex items-center gap-1.5">
                            <span className="flex items-center gap-0.5 text-[10px] font-semibold text-green-600">
                              <CheckCircle size={9} /> {stats.approved}
                            </span>
                            <span className="flex items-center gap-0.5 text-[10px] font-semibold text-red-500">
                              <XCircle size={9} /> {stats.rejected}
                            </span>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-laya-navy">
                          €{stats.totalAmount.toFixed(0)}
                        </span>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}

        {/* ═══ TAB: Documents ═══ */}
        {activeTab === 'documents' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className={`grid gap-4 ${previewDoc ? 'grid-cols-1 lg:grid-cols-12' : ''}`}>
              {/* Documents Table */}
              <div className={previewDoc ? 'lg:col-span-7' : ''}>
                {allDocuments.length === 0 ? (
                  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
                    <Upload size={40} className="mx-auto text-gray-200 mb-3" />
                    <p className="text-sm font-medium text-gray-400">No documents uploaded yet</p>
                    <p className="text-[11px] text-gray-400 mt-1">
                      Documents uploaded by customers will appear here for review
                    </p>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50">
                      <div className="flex items-center gap-2">
                        <Upload size={16} className="text-laya-blue-mid" />
                        <h3 className="text-sm font-bold text-laya-navy">Customer Uploads</h3>
                        <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">
                          {allDocuments.length} documents
                        </span>
                      </div>
                    </div>

                    {/* Table header */}
                    <div className="grid grid-cols-12 gap-2 px-5 py-2.5 bg-gray-50/50 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      <div className="col-span-2">Document</div>
                      <div className="col-span-2">Uploaded By</div>
                      <div className="col-span-2">Member</div>
                      <div className="col-span-2">Treatment</div>
                      <div className="col-span-1">Amount</div>
                      <div className="col-span-1">Method</div>
                      <div className="col-span-1">Preview</div>
                      <div className="col-span-1">Time</div>
                    </div>

                    <div className="divide-y divide-gray-50 max-h-[500px] overflow-y-auto">
                      {allDocuments.map((doc, i) => (
                        <motion.div
                          key={doc.doc_id || i}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: Math.min(i * 0.03, 0.3) }}
                          className={`grid grid-cols-12 gap-2 px-5 py-3 cursor-pointer hover:bg-blue-50/50 transition-colors ${
                            previewDoc?.doc_id === doc.doc_id ? 'bg-blue-50 border-l-2 border-laya-blue' : ''
                          }`}
                          onClick={() => setPreviewDoc(doc)}
                        >
                          <div className="col-span-2 flex items-center gap-2">
                            <FileText size={14} className="text-laya-blue-mid shrink-0" />
                            <span className="text-[11px] font-medium text-gray-700 truncate">{doc.filename}</span>
                          </div>
                          <div className="col-span-2 flex items-center">
                            <span className="text-[11px] text-gray-500">{doc.uploaded_by || 'Unknown'}</span>
                          </div>
                          <div className="col-span-2 flex items-center">
                            <button
                              onClick={e => { e.stopPropagation(); if (doc.member_id) navigate(`/dev-dashboard/member/${doc.member_id}`); }}
                              className="text-[11px] font-semibold text-laya-navy hover:text-laya-blue hover:underline"
                            >
                              {doc.member_id || '—'}
                            </button>
                          </div>
                          <div className="col-span-2 flex items-center">
                            <span className="text-[11px] text-gray-600">{doc.extracted_data?.treatment_type || '—'}</span>
                          </div>
                          <div className="col-span-1 flex items-center">
                            <span className="text-[11px] font-semibold text-laya-navy">
                              {doc.extracted_data?.total_cost ? `€${doc.extracted_data.total_cost.toFixed(2)}` : '—'}
                            </span>
                          </div>
                          <div className="col-span-1 flex items-center">
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
                              doc.extraction_method === 'pdf_text_extraction'
                                ? 'bg-green-50 text-green-600'
                                : 'bg-blue-50 text-blue-500'
                            }`}>
                              {doc.extraction_method === 'pdf_text_extraction' ? 'OCR' : 'Template'}
                            </span>
                          </div>
                          <div className="col-span-1 flex items-center">
                            {doc.file_url || doc.doc_id ? (
                              <button
                                onClick={(e) => { e.stopPropagation(); setPreviewDoc(doc); }}
                                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-laya-blue/5 hover:bg-laya-blue/15 text-laya-blue text-[10px] font-medium transition-colors"
                              >
                                <Eye size={11} />
                                View
                              </button>
                            ) : (
                              <span className="text-[10px] text-gray-400">—</span>
                            )}
                          </div>
                          <div className="col-span-1 flex items-center">
                            <span className="text-[10px] text-gray-400">
                              {doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleString('en-IE', {
                                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                              }) : '—'}
                            </span>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Document Preview Panel */}
              <AnimatePresence>
                {previewDoc && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="lg:col-span-5"
                  >
                    <div className="sticky top-4 space-y-4">
                      <PdfPreview
                        docId={previewDoc.doc_id}
                        fileUrl={previewDoc.file_url}
                        fileName={previewDoc.filename}
                        onClose={() => setPreviewDoc(null)}
                      />

                      {/* Extracted Data Card */}
                      {previewDoc.extracted_data && (
                        <div className="bg-white rounded-xl border border-blue-100 shadow-sm p-4">
                          <h4 className="text-xs font-bold text-laya-navy mb-3 flex items-center gap-2">
                            <FileText size={13} className="text-laya-blue-mid" />
                            Extracted Data
                          </h4>
                          <div className="space-y-2 text-[11px]">
                            {previewDoc.extracted_data.member_id && (
                              <div className="flex justify-between">
                                <span className="text-gray-400">Member ID</span>
                                <span className="font-semibold text-laya-navy">{previewDoc.extracted_data.member_id}</span>
                              </div>
                            )}
                            {previewDoc.extracted_data.patient_name && (
                              <div className="flex justify-between">
                                <span className="text-gray-400">Patient</span>
                                <span className="font-semibold text-laya-navy">{previewDoc.extracted_data.patient_name}</span>
                              </div>
                            )}
                            {previewDoc.extracted_data.treatment_type && (
                              <div className="flex justify-between">
                                <span className="text-gray-400">Treatment</span>
                                <span className="font-semibold text-laya-navy">{previewDoc.extracted_data.treatment_type}</span>
                              </div>
                            )}
                            {previewDoc.extracted_data.treatment_date && (
                              <div className="flex justify-between">
                                <span className="text-gray-400">Date</span>
                                <span className="font-semibold text-laya-navy">{previewDoc.extracted_data.treatment_date}</span>
                              </div>
                            )}
                            {previewDoc.extracted_data.practitioner_name && (
                              <div className="flex justify-between">
                                <span className="text-gray-400">Practitioner</span>
                                <span className="font-semibold text-laya-navy">{previewDoc.extracted_data.practitioner_name}</span>
                              </div>
                            )}
                            {previewDoc.extracted_data.total_cost != null && (
                              <div className="flex justify-between">
                                <span className="text-gray-400">Amount</span>
                                <span className="font-bold text-laya-navy">€{previewDoc.extracted_data.total_cost?.toFixed(2)}</span>
                              </div>
                            )}
                          </div>
                          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-[10px]">
                            <span className="text-gray-400">
                              Uploaded by {previewDoc.uploaded_by || 'Unknown'}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full font-medium ${
                              previewDoc.uploaded_by_role === 'customer'
                                ? 'bg-blue-50 text-blue-500'
                                : 'bg-pink-50 text-pink-500'
                            }`}>
                              {previewDoc.uploaded_by_role || 'customer'}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {/* ═══ TAB: Activity Log ═══ */}
        {activeTab === 'activity' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {activities.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
                <Activity size={40} className="mx-auto text-gray-200 mb-3" />
                <p className="text-sm font-medium text-gray-400">No activity recorded yet</p>
                <p className="text-[11px] text-gray-400 mt-1">
                  User activities (chat messages, file uploads) will appear here in real-time
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Activity size={16} className="text-laya-blue-mid" />
                      <h3 className="text-sm font-bold text-laya-navy">Live Activity Monitor</h3>
                      <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">
                        {activities.length} events
                      </span>
                    </div>
                    <button
                      onClick={async () => {
                        try {
                          const data = await fetchActivities();
                          setActivities(data.activities || []);
                          toast.success('Activity log refreshed');
                        } catch { toast.error('Failed to refresh'); }
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] text-gray-500 hover:text-laya-blue hover:bg-blue-50 transition-colors"
                    >
                      <RefreshCw size={12} />
                      Refresh
                    </button>
                  </div>
                </div>

                <div className="divide-y divide-gray-50 max-h-[600px] overflow-y-auto">
                  {activities.map((act, i) => {
                    const isChat = act.type === 'chat_message';
                    const isUpload = act.type === 'file_upload';
                    const Icon = isUpload ? Upload : isChat ? Send : ArrowRight;
                    const iconColor = isUpload ? 'text-green-500' : isChat ? 'text-laya-blue' : 'text-gray-400';
                    const bgColor = isUpload ? 'bg-green-50' : isChat ? 'bg-blue-50' : 'bg-gray-50';

                    return (
                      <motion.div
                        key={act.id || i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: Math.min(i * 0.02, 0.3) }}
                        className="px-5 py-3.5 hover:bg-gray-50/50 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-8 h-8 rounded-lg ${bgColor} flex items-center justify-center shrink-0 mt-0.5`}>
                            <Icon size={14} className={iconColor} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-[11px] font-semibold text-laya-navy">
                                {act.user_name || 'Unknown User'}
                              </span>
                              <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
                                act.user_role === 'customer' ? 'bg-blue-50 text-blue-500' : 'bg-pink-50 text-pink-500'
                              }`}>
                                {act.user_role || 'customer'}
                              </span>
                              {act.member_id && (
                                <button
                                  onClick={() => navigate(`/dev-dashboard/member/${act.member_id}`)}
                                  className="text-[10px] text-gray-400 hover:text-laya-blue font-mono transition-colors"
                                >
                                  {act.member_id}
                                </button>
                              )}
                            </div>
                            <p className="text-[11px] text-gray-600 truncate">{act.description}</p>
                            {isUpload && act.details?.file_url && (
                              <button
                                onClick={() => {
                                  setActiveTab('documents');
                                  const doc = allDocuments.find(d => d.doc_id === act.details.doc_id);
                                  if (doc) setPreviewDoc(doc);
                                }}
                                className="flex items-center gap-1 mt-1 text-[10px] text-laya-blue hover:underline"
                              >
                                <Eye size={10} />
                                View uploaded document
                              </button>
                            )}
                            {isChat && act.details?.decision && (
                              <div className="flex items-center gap-1.5 mt-1">
                                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                                  act.details.decision === 'APPROVED' ? 'bg-green-50 text-green-600' :
                                  act.details.decision === 'REJECTED' ? 'bg-red-50 text-red-500' :
                                  'bg-amber-50 text-amber-600'
                                }`}>
                                  {act.details.decision}
                                </span>
                              </div>
                            )}
                          </div>
                          <span className="text-[10px] text-gray-400 shrink-0 whitespace-nowrap">
                            {act.timestamp ? new Date(act.timestamp).toLocaleString('en-IE', {
                              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'
                            }) : '—'}
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </main>

      {/* ── Footer ─────────────────────────────────────── */}
      <footer className="h-8 shrink-0 bg-white border-t border-gray-100 flex items-center justify-between px-5 text-[9px] text-gray-400">
        <span>© 2026 Laya Healthcare — AI Claims Dashboard</span>
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
