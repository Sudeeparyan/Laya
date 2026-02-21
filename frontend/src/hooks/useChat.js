// useChat hook — manages chat state, API calls, and message history

import { useState, useCallback } from 'react';
import { sendChat } from '../services/api';

export function useChat() {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeAgent, setActiveAgent] = useState(null);
  const [lastResult, setLastResult] = useState(null);
  const [error, setError] = useState(null);

  /**
   * Send a message to the AI claims pipeline.
   */
  const sendMessage = useCallback(async (text, memberId, documentData = null) => {
    if (!text.trim() || !memberId) return;

    // Add user message to chat
    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setActiveAgent('Principal Agent');
    setError(null);

    try {
      const payload = {
        message: text,
        member_id: memberId,
      };
      if (documentData) {
        payload.extracted_document_data = documentData;
      }

      const result = await sendChat(payload);

      // Add AI response to chat
      const aiMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: result.reasoning,
        timestamp: new Date().toISOString(),
        metadata: {
          decision: result.decision,
          payout_amount: result.payout_amount,
          agent_trace: result.agent_trace,
          flags: result.flags,
          needs_info: result.needs_info,
        },
      };
      setMessages((prev) => [...prev, aiMessage]);
      setLastResult(result);
      setActiveAgent(null);
    } catch (err) {
      const errorMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: `Error processing your claim: ${err.response?.data?.detail || err.message}. Please try again.`,
        timestamp: new Date().toISOString(),
        metadata: { decision: 'ERROR' },
      };
      setMessages((prev) => [...prev, errorMessage]);
      setError(err.message);
      setActiveAgent(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Clear chat history.
   */
  const clearChat = useCallback(() => {
    setMessages([]);
    setLastResult(null);
    setError(null);
    setActiveAgent(null);
  }, []);

  return {
    messages,
    isLoading,
    activeAgent,
    lastResult,
    error,
    sendMessage,
    clearChat,
  };
}
