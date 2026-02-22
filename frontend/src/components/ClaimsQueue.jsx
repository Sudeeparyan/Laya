/**
 * ClaimsQueue — Developer claims queue table
 * Shows all claims across all members with filtering and sorting.
 * Click a claim to open AI-assisted review panel.
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Filter, ChevronDown, ChevronUp, ArrowUpDown,
  Clock, CheckCircle, XCircle, AlertTriangle, FileText,
  User, Calendar, Euro, RefreshCw, BarChart3
} from 'lucide-react';

const STATUS_STYLES = {
  approved: { bg: 'bg-green-50', text: 'text-laya-green', border: 'border-green-200', icon: CheckCircle },
  rejected: { bg: 'bg-red-50', text: 'text-laya-coral', border: 'border-red-200', icon: XCircle },
  'pending threshold': { bg: 'bg-amber-50', text: 'text-laya-amber', border: 'border-amber-200', icon: Clock },
  pending: { bg: 'bg-blue-50', text: 'text-laya-blue', border: 'border-blue-200', icon: Clock },
  escalated: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200', icon: AlertTriangle },
};

function getStatusStyle(status) {
  const key = status?.toLowerCase() || 'pending';
  for (const [k, v] of Object.entries(STATUS_STYLES)) {
    if (key.includes(k)) return v;
  }
  return STATUS_STYLES.pending;
}

export default function ClaimsQueue({ claims, loading, onSelectClaim, selectedClaimId, onRefresh }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [sortDir, setSortDir] = useState('desc');

  const filteredClaims = useMemo(() => {
    let filtered = [...(claims || [])];

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(c =>
        c.member_name?.toLowerCase().includes(q) ||
        c.claim_id?.toLowerCase().includes(q) ||
        c.treatment_type?.toLowerCase().includes(q) ||
        c.member_id?.toLowerCase().includes(q) ||
        c.practitioner_name?.toLowerCase().includes(q)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(c =>
        c.status?.toLowerCase().includes(statusFilter)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'date') {
        cmp = (a.treatment_date || '').localeCompare(b.treatment_date || '');
      } else if (sortBy === 'amount') {
        cmp = (a.claimed_amount || 0) - (b.claimed_amount || 0);
      } else if (sortBy === 'member') {
        cmp = (a.member_name || '').localeCompare(b.member_name || '');
      } else if (sortBy === 'status') {
        cmp = (a.status || '').localeCompare(b.status || '');
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });

    return filtered;
  }, [claims, searchQuery, statusFilter, sortBy, sortDir]);

  function toggleSort(field) {
    if (sortBy === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDir('desc');
    }
  }

  const statusCounts = useMemo(() => {
    const counts = { all: claims?.length || 0, approved: 0, rejected: 0, pending: 0 };
    (claims || []).forEach(c => {
      const s = c.status?.toLowerCase() || '';
      if (s.includes('approved')) counts.approved++;
      else if (s.includes('rejected')) counts.rejected++;
      else counts.pending++;
    });
    return counts;
  }, [claims]);

  return (
    <div className="dev-claims-queue">
      {/* Header bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg gradient-teal flex items-center justify-center">
            <FileText size={16} className="text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-laya-navy">Claims Queue</h3>
            <p className="text-[10px] text-gray-400">{filteredClaims.length} claims found</p>
          </div>
        </div>
        <button
          onClick={onRefresh}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-laya-teal transition-colors"
          title="Refresh claims"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Filters row */}
      <div className="flex items-center gap-3 mb-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search claims, members, practitioners..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:border-laya-teal/40 focus:ring-2 focus:ring-laya-teal/10 transition-all placeholder:text-gray-300"
          />
        </div>

        {/* Status filter pills */}
        <div className="flex items-center gap-1">
          {[
            { key: 'all', label: 'All', count: statusCounts.all },
            { key: 'approved', label: 'Approved', count: statusCounts.approved },
            { key: 'rejected', label: 'Rejected', count: statusCounts.rejected },
            { key: 'pending', label: 'Pending', count: statusCounts.pending },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                statusFilter === f.key
                  ? 'bg-laya-teal text-white shadow-sm'
                  : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
              }`}
            >
              {f.label} ({f.count})
            </button>
          ))}
        </div>
      </div>

      {/* Claims table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
        {/* Table header */}
        <div className="grid grid-cols-12 gap-2 px-4 py-2.5 bg-gray-50/80 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
          <button
            className="col-span-2 flex items-center gap-1 hover:text-laya-teal transition-colors text-left"
            onClick={() => toggleSort('member')}
          >
            Member {sortBy === 'member' && (sortDir === 'asc' ? <ChevronUp size={10} /> : <ChevronDown size={10} />)}
          </button>
          <div className="col-span-2">Treatment</div>
          <button
            className="col-span-2 flex items-center gap-1 hover:text-laya-teal transition-colors text-left"
            onClick={() => toggleSort('date')}
          >
            Date {sortBy === 'date' && (sortDir === 'asc' ? <ChevronUp size={10} /> : <ChevronDown size={10} />)}
          </button>
          <div className="col-span-2">Practitioner</div>
          <button
            className="col-span-1 flex items-center gap-1 hover:text-laya-teal transition-colors text-left"
            onClick={() => toggleSort('amount')}
          >
            Amount {sortBy === 'amount' && (sortDir === 'asc' ? <ChevronUp size={10} /> : <ChevronDown size={10} />)}
          </button>
          <button
            className="col-span-2 flex items-center gap-1 hover:text-laya-teal transition-colors text-left"
            onClick={() => toggleSort('status')}
          >
            Status {sortBy === 'status' && (sortDir === 'asc' ? <ChevronUp size={10} /> : <ChevronDown size={10} />)}
          </button>
          <div className="col-span-1 text-right">Action</div>
        </div>

        {/* Loading skeleton */}
        {loading && claims.length === 0 && (
          <div className="divide-y divide-gray-50">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 px-4 py-3">
                <div className="col-span-2"><div className="skeleton w-24 h-4 rounded" /></div>
                <div className="col-span-2"><div className="skeleton w-20 h-4 rounded" /></div>
                <div className="col-span-2"><div className="skeleton w-16 h-4 rounded" /></div>
                <div className="col-span-2"><div className="skeleton w-20 h-4 rounded" /></div>
                <div className="col-span-1"><div className="skeleton w-12 h-4 rounded" /></div>
                <div className="col-span-2"><div className="skeleton w-16 h-4 rounded" /></div>
                <div className="col-span-1"><div className="skeleton w-12 h-4 rounded" /></div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && filteredClaims.length === 0 && (
          <div className="text-center py-12">
            <FileText size={32} className="mx-auto text-gray-300 mb-3" />
            <p className="text-sm text-gray-400 font-medium">No claims found</p>
            <p className="text-[11px] text-gray-300 mt-1">Try adjusting your search or filters</p>
          </div>
        )}

        {/* Claim rows */}
        <div className="divide-y divide-gray-50 max-h-[400px] overflow-y-auto">
          <AnimatePresence>
            {filteredClaims.map((claim, i) => {
              const style = getStatusStyle(claim.status);
              const StatusIcon = style.icon;
              const isSelected = selectedClaimId === claim.claim_id;

              return (
                <motion.div
                  key={claim.claim_id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: Math.min(i * 0.02, 0.3) }}
                  onClick={() => onSelectClaim(claim)}
                  className={`grid grid-cols-12 gap-2 px-4 py-3 cursor-pointer transition-all hover:bg-laya-teal/3 ${
                    isSelected ? 'bg-laya-teal/5 border-l-2 border-l-laya-teal' : ''
                  }`}
                >
                  {/* Member */}
                  <div className="col-span-2 flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full gradient-teal flex items-center justify-center text-white text-[9px] font-bold shrink-0">
                      {claim.member_name?.split(' ').map(n => n[0]).join('') || '??'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[12px] font-semibold text-laya-navy truncate">{claim.member_name}</p>
                      <p className="text-[9px] text-gray-400 font-mono">{claim.member_id}</p>
                    </div>
                  </div>

                  {/* Treatment */}
                  <div className="col-span-2 flex items-center">
                    <span className="text-[12px] text-gray-600 truncate">{claim.treatment_type}</span>
                  </div>

                  {/* Date */}
                  <div className="col-span-2 flex items-center gap-1.5">
                    <Calendar size={11} className="text-gray-300 shrink-0" />
                    <span className="text-[12px] text-gray-500">{claim.treatment_date}</span>
                  </div>

                  {/* Practitioner */}
                  <div className="col-span-2 flex items-center">
                    <span className="text-[12px] text-gray-500 truncate">{claim.practitioner_name}</span>
                  </div>

                  {/* Amount */}
                  <div className="col-span-1 flex items-center gap-1">
                    <Euro size={11} className="text-gray-300" />
                    <span className="text-[12px] font-semibold text-laya-navy">
                      {claim.claimed_amount?.toFixed(2)}
                    </span>
                  </div>

                  {/* Status */}
                  <div className="col-span-2 flex items-center">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border ${style.bg} ${style.text} ${style.border}`}>
                      <StatusIcon size={10} />
                      {claim.status}
                    </span>
                  </div>

                  {/* Action */}
                  <div className="col-span-1 flex items-center justify-end">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectClaim(claim);
                      }}
                      className="p-1.5 rounded-lg hover:bg-laya-teal/10 text-gray-400 hover:text-laya-teal transition-colors"
                      title="Review with AI"
                    >
                      <BarChart3 size={14} />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
