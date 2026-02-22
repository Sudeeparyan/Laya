import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus, MessageSquare, Shield, Sparkles, Trash2, Users, RefreshCw, AlertCircle, LogOut, Code2, Stethoscope, LayoutDashboard } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function LeftSidebar({
  members,
  selectedMember,
  onSelectMember,
  chatSessions,
  activeChatId,
  onNewChat,
  onSelectChat,
  onDeleteChat,
  loading,
  membersListLoading,
  membersError,
  onRetryLoadMembers,
  user,
  onLogout,
  isDeveloper,
}) {
  const [hoveredChat, setHoveredChat] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="panel-left">
      {/* Logo / Brand */}
      <div className="p-4 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg gradient-teal flex items-center justify-center shadow-lg shadow-laya-teal/20">
            <Shield size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white leading-tight tracking-tight">
              laya healthcare
            </h1>
            <p className="text-[10px] text-gray-500 flex items-center gap-1">
              <Sparkles size={8} className="text-laya-teal" />
              AI Claims Assistant
            </p>
          </div>
        </div>
      </div>

      {/* New Chat Button */}
      <div className="px-3 pb-3">
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          onClick={onNewChat}
          className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg
            border border-white/10 hover:border-white/20 hover:bg-sidebar-hover
            text-sidebar-text-light text-sm font-medium transition-all duration-200"
        >
          <Plus size={16} className="text-laya-teal" />
          <span>New Chat</span>
          <kbd className="ml-auto text-[9px] text-gray-500 bg-white/5 border border-white/10 px-1.5 py-0.5 rounded font-mono">Ctrl+K</kbd>
        </motion.button>
      </div>

      {/* Chat Sessions List */}
      <div className="flex-1 overflow-y-auto dark-scroll px-3 space-y-0.5">
        {chatSessions.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare size={24} className="mx-auto text-gray-600 mb-2 opacity-50" />
            <p className="text-xs text-gray-600">No conversations yet</p>
            <p className="text-[10px] text-gray-700 mt-1">Start a new chat to begin</p>
          </div>
        ) : (
          <AnimatePresence>
            {chatSessions.map((session) => (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                onMouseEnter={() => setHoveredChat(session.id)}
                onMouseLeave={() => setHoveredChat(null)}
                onClick={() => onSelectChat(session.id)}
                className={`chat-session-item flex items-center gap-2.5 group relative ${
                  activeChatId === session.id ? 'active' : ''
                }`}
              >
                <MessageSquare size={14} className="shrink-0 opacity-50" />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] truncate font-medium">
                    {session.title || 'New conversation'}
                  </p>
                  <p className="text-[10px] opacity-50 mt-0.5">
                    {session.memberName || 'No member'} &bull; {session.time}
                  </p>
                </div>
                {hoveredChat === session.id && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteChat(session.id);
                    }}
                    className="shrink-0 p-1 rounded hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={12} />
                  </motion.button>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Member Selector at Bottom */}
      <div className="p-3 border-t border-white/5">
        <div className="mb-2">
          <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5 mb-1.5 px-1">
            <Users size={10} className="text-laya-teal" />
            {isDeveloper ? 'All Members' : 'My Account'}
          </label>

          {/* Error state */}
          {membersError && members.length === 0 && (
            <div className="mb-2 flex items-center gap-2 px-2 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20">
              <AlertCircle size={12} className="text-red-400 shrink-0" />
              <span className="text-[11px] text-red-300 flex-1">Failed to load members</span>
              <button
                onClick={onRetryLoadMembers}
                className="p-1 rounded hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors"
                title="Retry"
              >
                <RefreshCw size={12} />
              </button>
            </div>
          )}

          {/* Loading state */}
          {membersListLoading && members.length === 0 ? (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-sidebar-hover text-gray-400 text-sm">
              <RefreshCw size={14} className="animate-spin text-laya-teal" />
              <span>Loading members...</span>
            </div>
          ) : (
            <select
              value={selectedMember?.member_id || ''}
              onChange={(e) => onSelectMember(e.target.value)}
              className="member-select-dark"
              disabled={loading}
            >
              <option value="">Select a member...</option>
              {members.map((m) => (
                <option key={m.member_id} value={m.member_id}>
                  {m.first_name} {m.last_name} — {m.member_id}
                </option>
              ))}
            </select>
          )}
        </div>
        {selectedMember && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg bg-sidebar-hover/60"
          >
            <div className="w-8 h-8 rounded-full gradient-teal flex items-center justify-center text-white text-[11px] font-bold shrink-0">
              {selectedMember.first_name?.[0]}{selectedMember.last_name?.[0]}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-white font-medium truncate">
                {selectedMember.first_name} {selectedMember.last_name}
              </p>
              <p className="text-[10px] text-gray-500 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-laya-green inline-block" />
                {selectedMember.status} &bull; {selectedMember.scheme_name}
              </p>
            </div>
          </motion.div>
        )}

        {/* User profile & logout */}
        {user && (
          <div className="mt-3 pt-3 border-t border-white/5">
            <div className="flex items-center gap-2.5 px-2 py-1.5">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0"
                style={{ background: user.avatar_color || '#00A99D' }}
              >
                {user.first_name?.[0]}{user.last_name?.[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-white font-medium truncate">
                  {user.first_name} {user.last_name}
                </p>
                <div className="flex items-center gap-1.5">
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                    user.role === 'developer' ? 'badge-developer' : 'badge-customer'
                  }`}>
                    {user.role === 'developer' ? (
                      <span className="flex items-center gap-0.5"><Code2 size={8} /> DEV</span>
                    ) : (
                      <span className="flex items-center gap-0.5"><Stethoscope size={8} /> USER</span>
                    )}
                  </span>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onLogout}
                className="p-1.5 rounded-lg hover:bg-red-500/15 text-gray-500 hover:text-red-400 transition-all"
                title="Sign out"
              >
                <LogOut size={14} />
              </motion.button>
            </div>

            {/* Developer Dashboard Link */}
            {isDeveloper && (
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/dev-dashboard')}
                className="w-full mt-2 flex items-center gap-2 px-3 py-2 rounded-lg
                  bg-gradient-to-r from-purple-500/10 to-purple-400/5 border border-purple-500/20
                  text-purple-300 hover:text-purple-200 hover:border-purple-500/30 transition-all text-[11px] font-medium"
              >
                <LayoutDashboard size={13} />
                <span>Claims Dashboard</span>
                <Sparkles size={9} className="ml-auto text-purple-400" />
              </motion.button>
            )}
          </div>
        )}

        <div className="mt-2 text-center">
          <p className="text-[9px] text-gray-600">
            Powered by AI &bull; v2.0
          </p>
        </div>
      </div>
    </div>
  );
}
