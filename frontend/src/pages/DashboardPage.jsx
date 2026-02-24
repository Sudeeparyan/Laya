// DashboardPage — Main app after login, wraps existing Layout with auth-aware behavior

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import Layout from '../components/Layout';
import LeftSidebar from '../components/LeftSidebar';
import ChatWindow from '../components/ChatWindow';
import AgentPanel from '../components/AgentPanel';
import ArchitectureView from '../components/ArchitectureView';
import { useMembers } from '../hooks/useMembers';
import { useChat } from '../hooks/useChat';
import { useAuth } from '../hooks/useAuth';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';

export default function DashboardPage() {
  const { user, isDeveloper, isCustomer, logout } = useAuth();
  const navigate = useNavigate();

  const {
    members,
    selectedMember,
    selectMember,
    refreshMember,
    loading: membersLoading,
    membersLoading: membersListLoading,
    error: membersError,
    retryLoadMembers,
  } = useMembers();

  const {
    chatSessions,
    activeChatId,
    newChat,
    selectChat,
    deleteChat,
    messages,
    isLoading,
    activeAgent,
    agentTrace,
    decision,
    payoutAmount,
    flags,
    lastResult,
    sendMessage,
    clearChat,
    connectClaimStatusWs,
    refreshClaimStatuses,
  } = useChat();

  const [isPanelVisible, setIsPanelVisible] = useState(true);
  const [showArchitecture, setShowArchitecture] = useState(false);
  const fileInputRef = useRef(null);

  // Filter members for customers — only show their linked member
  const visibleMembers = isCustomer && user?.member_id
    ? members.filter((m) => m.member_id === user.member_id)
    : members;

  // Auto-select linked member for customer users
  useEffect(() => {
    if (isCustomer && user?.member_id && !selectedMember && members.length > 0) {
      const linked = members.find((m) => m.member_id === user.member_id);
      if (linked) {
        selectMember(user.member_id);
      }
    }
  }, [isCustomer, user, selectedMember, members, selectMember]);

  // Connect claim status WebSocket for customer users
  useEffect(() => {
    if (isCustomer && selectedMember?.member_id && connectClaimStatusWs) {
      connectClaimStatusWs(selectedMember.member_id);
    }
  }, [isCustomer, selectedMember, connectClaimStatusWs]);

  // Refresh claim statuses on login (check if any pending claims were reviewed)
  // Also refresh member data to get updated usage counters
  const lastRefreshedMemberRef = useRef(null);
  useEffect(() => {
    if (isCustomer && selectedMember?.member_id && refreshClaimStatuses) {
      // Only run once per member selection (not on every re-render)
      if (lastRefreshedMemberRef.current === selectedMember.member_id) return;
      lastRefreshedMemberRef.current = selectedMember.member_id;

      refreshClaimStatuses(selectedMember.member_id).then(() => {
        // Re-fetch member data to pick up any usage changes from reviewed claims
        refreshMember();
      });
    }
  }, [isCustomer, selectedMember?.member_id, refreshClaimStatuses, refreshMember]);

  // Refresh member data when claim decision changes from PENDING → APPROVED/REJECTED
  // This updates the usage bars and member info in the right panel
  const prevDecisionRef = useRef(decision);
  useEffect(() => {
    const prev = prevDecisionRef.current;
    prevDecisionRef.current = decision;

    if (
      prev &&
      (prev === 'PENDING' || prev === 'PENDING_THRESHOLD') &&
      decision &&
      decision !== 'PENDING' &&
      decision !== 'PENDING_THRESHOLD' &&
      decision !== prev
    ) {
      // Decision just changed from PENDING to something else — refresh member data
      refreshMember();
    }
  }, [decision, refreshMember]);

  // Logout handler with navigation
  const handleLogout = useCallback(() => {
    logout();
    navigate('/login');
    toast.success('Signed out successfully');
  }, [logout, navigate]);

  // Auto-select member for customers
  const handleSelectMember = useCallback(
    async (memberId) => {
      // Customers can only see their own data
      if (isCustomer && user?.member_id && memberId !== user.member_id) return;
      await selectMember(memberId);
    },
    [selectMember, isCustomer, user]
  );

  const handleSendMessage = useCallback(
    (text, memberId, docData, fileInfo) => {
      sendMessage(text, memberId, docData, fileInfo);
    },
    [sendMessage]
  );

  const togglePanel = useCallback(() => {
    setIsPanelVisible((prev) => !prev);
  }, []);

  const toggleArchitecture = useCallback(() => {
    setShowArchitecture((prev) => !prev);
  }, []);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onNewChat: newChat,
    onTogglePanel: togglePanel,
    onUpload: () => fileInputRef.current?.click(),
    onEscape: () => {
      if (showArchitecture) setShowArchitecture(false);
    },
  });

  const enrichedSessions = chatSessions.map((s) => ({
    ...s,
    memberName: selectedMember
      ? `${selectedMember.first_name} ${selectedMember.last_name}`
      : s.memberName || '',
  }));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Layout
        left={
          <LeftSidebar
            members={visibleMembers}
            selectedMember={selectedMember}
            onSelectMember={handleSelectMember}
            chatSessions={enrichedSessions}
            activeChatId={activeChatId}
            onNewChat={newChat}
            onSelectChat={selectChat}
            onDeleteChat={(id) => {
              deleteChat(id);
              toast.info('Chat deleted');
            }}
            loading={membersLoading}
            membersListLoading={membersListLoading}
            membersError={membersError}
            onRetryLoadMembers={retryLoadMembers}
            user={user}
            onLogout={handleLogout}
            isDeveloper={isDeveloper}
          />
        }
        center={
          <ChatWindow
            messages={messages}
            isLoading={isLoading}
            activeAgent={activeAgent}
            selectedMember={selectedMember}
            onSendMessage={handleSendMessage}
            isPanelVisible={isPanelVisible}
            onTogglePanel={togglePanel}
            user={user}
            isDeveloper={isDeveloper}
            decision={decision}
            flags={flags}
            fileInputRef={fileInputRef}
            onToggleArchitecture={isDeveloper ? toggleArchitecture : undefined}
            showArchitecture={showArchitecture}
          />
        }
        right={
          showArchitecture && isDeveloper ? (
            <div className="panel-right">
              <ArchitectureView
                agentTrace={agentTrace}
                isProcessing={isLoading}
                decision={decision}
                onClose={() => setShowArchitecture(false)}
              />
            </div>
          ) : (
            <AgentPanel
              isVisible={isPanelVisible}
              onToggle={togglePanel}
              agentTrace={agentTrace}
              isProcessing={isLoading}
              decision={decision}
              payoutAmount={payoutAmount}
              flags={flags}
              selectedMember={selectedMember}
              lastResult={lastResult}
              customerMode={!isDeveloper}
              onShowArchitecture={isDeveloper ? toggleArchitecture : undefined}
            />
          )
        }
      />
    </motion.div>
  );
}
