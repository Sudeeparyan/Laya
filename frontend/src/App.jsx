// App.jsx — Root application component

import { useState, useCallback } from 'react';
import Layout from './components/Layout';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';
import { useMembers } from './hooks/useMembers';
import { useChat } from './hooks/useChat';

export default function App() {
  const { members, selectedMember, selectMember, loading: membersLoading } = useMembers();
  const { messages, isLoading, activeAgent, sendMessage, clearChat } = useChat();
  const [documentData, setDocumentData] = useState(null);
  const [pendingScenario, setPendingScenario] = useState(null);

  // Handle document ready from FileUpload or demo scenario
  const handleDocumentReady = useCallback(
    (docData, scenario = null) => {
      setDocumentData(docData);
      if (scenario) {
        setPendingScenario(scenario);
        // Auto-select the member for this scenario
        selectMember(scenario.memberId);
      }
    },
    [selectMember]
  );

  // Handle sending a message
  const handleSendMessage = useCallback(
    (text, memberId, docData) => {
      sendMessage(text, memberId, docData);
      // Clear document data after sending
      setDocumentData(null);
      setPendingScenario(null);
    },
    [sendMessage]
  );

  // Auto-send demo scenario message when member is loaded
  const handleSelectMember = useCallback(
    async (memberId) => {
      await selectMember(memberId);
      if (pendingScenario && pendingScenario.memberId === memberId) {
        // Auto-send the demo message after a short delay
        setTimeout(() => {
          sendMessage(
            pendingScenario.message,
            memberId,
            pendingScenario.document
          );
          setDocumentData(null);
          setPendingScenario(null);
        }, 500);
      }
    },
    [selectMember, pendingScenario, sendMessage]
  );

  return (
    <Layout
      sidebar={
        <Sidebar
          members={members}
          selectedMember={selectedMember}
          onSelectMember={handleSelectMember}
          onDocumentReady={handleDocumentReady}
          loading={membersLoading}
        />
      }
    >
      <ChatWindow
        messages={messages}
        isLoading={isLoading}
        activeAgent={activeAgent}
        selectedMember={selectedMember}
        documentData={documentData}
        onSendMessage={handleSendMessage}
        onClearChat={clearChat}
      />
    </Layout>
  );
}
