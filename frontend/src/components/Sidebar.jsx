// Sidebar — member selector, branding, file upload

import { useState } from 'react';
import { Users, ChevronDown, Search, Shield, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import MemberInfo from './MemberInfo';
import FileUpload from './FileUpload';

function MemberAvatar({ name, size = 'sm' }) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2);
  const dim = size === 'sm' ? 'w-8 h-8 text-[11px]' : 'w-10 h-10 text-sm';
  return (
    <div className={`${dim} rounded-full gradient-teal flex items-center justify-center text-white font-semibold shrink-0 shadow-sm`}>
      {initials}
    </div>
  );
}

export default function Sidebar({
  members,
  selectedMember,
  onSelectMember,
  onDocumentReady,
  loading,
}) {
  const [search, setSearch] = useState('');
  const [showMembers, setShowMembers] = useState(true);

  const filtered = members.filter((m) => {
    const q = search.toLowerCase();
    return (
      m.first_name.toLowerCase().includes(q) ||
      m.last_name.toLowerCase().includes(q) ||
      m.member_id.toLowerCase().includes(q) ||
      (m.scenario_note || '').toLowerCase().includes(q)
    );
  });

  return (
    <aside className="w-[320px] h-full flex flex-col bg-white/90 backdrop-blur-xl border-r border-gray-200/60 shrink-0 shadow-[2px_0_24px_rgba(0,0,0,0.04)]">
      {/* Logo / Branding */}
      <div className="p-5 border-b border-gray-100/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-teal flex items-center justify-center shadow-lg shadow-laya-teal/20">
            <Shield size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-laya-navy leading-tight tracking-tight">
              laya healthcare
            </h1>
            <p className="text-[11px] text-gray-400 flex items-center gap-1">
              <Sparkles size={10} className="text-laya-teal" />
              AI Claims Assistant
            </p>
          </div>
        </div>
      </div>

      {/* Member Selector */}
      <div className="px-4 py-3 border-b border-gray-100/80">
        <button
          onClick={() => setShowMembers(!showMembers)}
          className="flex items-center justify-between w-full text-[11px] font-semibold text-laya-navy/70 uppercase tracking-wider hover:text-laya-navy transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <Users size={13} className="text-laya-teal" />
            Test Members ({members.length})
          </span>
          <ChevronDown
            size={13}
            className={`transition-transform duration-300 ${showMembers ? 'rotate-180' : ''}`}
          />
        </button>

        <AnimatePresence>
          {showMembers && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              {/* Search */}
              <div className="relative mt-3">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search members..."
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-gray-200 bg-gray-50/50
                    focus:outline-none focus:ring-2 focus:ring-laya-teal/20 focus:border-laya-teal/40
                    focus:bg-white transition-all placeholder:text-gray-400"
                />
              </div>

              {/* Member List */}
              <div className="mt-3 max-h-[260px] overflow-y-auto space-y-1 pr-1">
                {loading ? (
                  <div className="flex items-center justify-center py-6 gap-2">
                    <div className="typing-dot" />
                    <div className="typing-dot" />
                    <div className="typing-dot" />
                  </div>
                ) : (
                  filtered.map((m, index) => {
                    const isSelected = selectedMember?.member_id === m.member_id;
                    return (
                      <motion.button
                        key={m.member_id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.03 }}
                        onClick={() => onSelectMember(m.member_id)}
                        className={`
                          w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all duration-200 flex items-center gap-3
                          ${isSelected
                            ? 'bg-gradient-to-r from-laya-teal/10 to-laya-teal/5 border border-laya-teal/25 shadow-sm'
                            : 'hover:bg-gray-50 border border-transparent'
                          }
                        `}
                      >
                        <MemberAvatar name={`${m.first_name} ${m.last_name}`} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <span className={`font-semibold truncate ${isSelected ? 'text-laya-teal-dark' : 'text-laya-navy'}`}>
                              {m.first_name} {m.last_name}
                            </span>
                            <span className="font-mono text-[10px] text-gray-400 ml-2 shrink-0">{m.member_id}</span>
                          </div>
                          {m.scenario_note && (
                            <span className="text-[11px] text-gray-400 line-clamp-1 mt-0.5 block">
                              {m.scenario_note}
                            </span>
                          )}
                        </div>
                      </motion.button>
                    );
                  })
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Selected Member Info */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {selectedMember && <MemberInfo member={selectedMember} />}

        {/* File Upload */}
        {selectedMember && (
          <div>
            <h3 className="font-semibold text-laya-navy text-xs mb-2.5 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-laya-teal" />
              Document Upload
            </h3>
            <FileUpload onDocumentReady={onDocumentReady} />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-100/80">
        <div className="text-center py-1">
          <p className="text-[10px] text-gray-400 font-medium">
            Money Smart 20 Family Cash Plan
          </p>
          <p className="text-[9px] text-gray-300 mt-0.5">
            Powered by AI &bull; v1.0
          </p>
        </div>
      </div>
    </aside>
  );
}
