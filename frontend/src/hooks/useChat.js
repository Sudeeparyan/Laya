import { useState, useCallback, useRef } from 'react';
import { sendChat } from '../services/api';
import { getStoredUser } from '../services/auth';
import { toast } from 'sonner';

/**
 * useChat — manages chat sessions, message state, API calls, and agent trace
 * Supports multiple chat sessions (like Claude's conversation history)
 * Multi-turn session_id support for conversation memory
 * WebSocket streaming for real-time agent trace updates
 */
export function useChat() {
  // All chat sessions: { id, title, messages, memberName, time, agentTrace, lastResult, sessionId }
  const [chatSessions, setChatSessions] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);

  // Current chat state
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeAgent, setActiveAgent] = useState(null);
  const [lastResult, setLastResult] = useState(null);
  const [error, setError] = useState(null);
  const [liveTrace, setLiveTrace] = useState([]);

  // Multi-turn session tracking (backend session_id for conversation memory)
  const sessionIdRef = useRef(null);

  // Derived agent trace from last result (prefer live trace during processing)
  const agentTrace = isLoading ? liveTrace : (lastResult?.agent_trace || []);
  const decision = lastResult?.decision || '';
  const payoutAmount = lastResult?.payout_amount || 0;
  const flags = lastResult?.flags || [];

  /**
   * Create a new chat session
   */
  const newChat = useCallback(() => {
    // Save current chat to sessions if it has messages
    if (activeChatId && messages.length > 0) {
      setChatSessions((prev) =>
        prev.map((s) =>
          s.id === activeChatId
            ? { ...s, messages: [...messages], agentTrace, lastResult, sessionId: sessionIdRef.current }
            : s
        )
      );
    }

    const newId = Date.now().toString();
    setActiveChatId(newId);
    setMessages([]);
    setLastResult(null);
    setError(null);
    setActiveAgent(null);
    setLiveTrace([]);
    sessionIdRef.current = null; // New chat gets a fresh session
  }, [activeChatId, messages, agentTrace, lastResult]);

  /**
   * Select an existing chat session
   */
  const selectChat = useCallback(
    (chatId) => {
      // Save current chat first
      if (activeChatId && messages.length > 0) {
        setChatSessions((prev) =>
          prev.map((s) =>
            s.id === activeChatId
              ? { ...s, messages: [...messages], agentTrace, lastResult }
              : s
          )
        );
      }

      const session = chatSessions.find((s) => s.id === chatId);
      if (session) {
        setActiveChatId(chatId);
        setMessages(session.messages || []);
        setLastResult(session.lastResult || null);
        setError(null);
        setActiveAgent(null);
        setLiveTrace([]);
        sessionIdRef.current = session.sessionId || null; // Restore session for multi-turn
      }
    },
    [activeChatId, messages, chatSessions, agentTrace, lastResult]
  );

  /**
   * Delete a chat session
   */
  const deleteChat = useCallback(
    (chatId) => {
      setChatSessions((prev) => prev.filter((s) => s.id !== chatId));
      if (activeChatId === chatId) {
        setActiveChatId(null);
        setMessages([]);
        setLastResult(null);
        setError(null);
        setActiveAgent(null);
      }
    },
    [activeChatId]
  );

  /**
   * Send a message to the AI claims pipeline
   */
  const sendMessage = useCallback(
    async (text, memberId, documentData = null) => {
      if (!text.trim() || !memberId) return;

      // Create a new session if none is active
      let currentChatId = activeChatId;
      if (!currentChatId) {
        currentChatId = Date.now().toString();
        setActiveChatId(currentChatId);
      }

      // Add user message
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
      setLastResult(null); // Reset so pipeline shows "processing"
      setLiveTrace([]); // Reset live trace

      try {
        // Include authenticated user context so the AI agents can personalize responses
        const storedUser = getStoredUser();
        const payload = {
          message: text,
          member_id: memberId,
        };
        if (storedUser) {
          payload.user_context = {
            user_id: storedUser.id,
            name: `${storedUser.first_name || ''} ${storedUser.last_name || ''}`.trim(),
            first_name: storedUser.first_name || '',
            last_name: storedUser.last_name || '',
            email: storedUser.email || '',
            role: storedUser.role || 'customer',
            member_id: storedUser.member_id || null,
          };
        }
        if (documentData) {
          payload.extracted_document_data = documentData;
        }
        // Include session_id for multi-turn conversation memory
        if (sessionIdRef.current) {
          payload.session_id = sessionIdRef.current;
        }

        let result;

        // Try WebSocket streaming for real-time trace updates
        const wsUrl = `ws://${window.location.hostname}:${window.location.port || '8000'}/api/ws/chat`;
        let useWs = true;

        try {
          result = await new Promise((resolve, reject) => {
            const ws = new WebSocket(wsUrl);
            let timeoutId;

            ws.onopen = () => {
              ws.send(JSON.stringify(payload));
              // 120s timeout
              timeoutId = setTimeout(() => {
                ws.close();
                reject(new Error('WebSocket timeout'));
              }, 120000);
            };

            ws.onmessage = (event) => {
              try {
                const msg = JSON.parse(event.data);

                if (msg.type === 'node_update') {
                  // Real-time trace update
                  setLiveTrace(prev => [...prev, msg.message]);
                  setActiveAgent(msg.current_agent || msg.agent || 'Processing...');
                } else if (msg.type === 'status') {
                  setActiveAgent(msg.message);
                } else if (msg.type === 'result') {
                  clearTimeout(timeoutId);
                  ws.close();
                  resolve(msg);
                } else if (msg.type === 'error') {
                  clearTimeout(timeoutId);
                  ws.close();
                  reject(new Error(msg.message));
                }
              } catch (parseErr) {
                // Non-JSON message, ignore
              }
            };

            ws.onerror = () => {
              clearTimeout(timeoutId);
              useWs = false;
              reject(new Error('WebSocket connection failed'));
            };

            ws.onclose = (event) => {
              clearTimeout(timeoutId);
              if (!event.wasClean && useWs) {
                reject(new Error('WebSocket closed unexpectedly'));
              }
            };
          });
        } catch (wsError) {
          // WebSocket failed — fallback to HTTP POST
          console.log('WebSocket unavailable, using HTTP fallback:', wsError.message);
          result = await sendChat(payload);
        }

        // Store session_id from backend for multi-turn continuity
        if (result.session_id) {
          sessionIdRef.current = result.session_id;
        }

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

        setMessages((prev) => {
          const updated = [...prev, aiMessage];

          // Create/update the session in chatSessions
          const title = text.length > 40 ? text.substring(0, 40) + '...' : text;
          const now = new Date();
          const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

          setChatSessions((sessions) => {
            const exists = sessions.find((s) => s.id === currentChatId);
            if (exists) {
              return sessions.map((s) =>
                s.id === currentChatId
                  ? { ...s, title, messages: updated, agentTrace: result.agent_trace, lastResult: result, time }
                  : s
              );
            }
            return [
              {
                id: currentChatId,
                title,
                messages: updated,
                memberName: '',
                time,
                agentTrace: result.agent_trace,
                lastResult: result,
              },
              ...sessions,
            ];
          });

          return updated;
        });

        setLastResult(result);
        setActiveAgent(null);
      } catch (err) {
        const errorMsg = err.response?.data?.detail || err.message;
        const errorMessage = {
          id: Date.now() + 1,
          role: 'assistant',
          content: `Error processing your claim: ${errorMsg}. Please try again.`,
          timestamp: new Date().toISOString(),
          metadata: { decision: 'ERROR' },
        };
        setMessages((prev) => [...prev, errorMessage]);
        setError(err.message);
        setActiveAgent(null);
        setLastResult(null);
        setLiveTrace([]);
        toast.error('Claim processing failed: ' + errorMsg);
      } finally {
        setIsLoading(false);
      }
    },
    [activeChatId]
  );

  /**
   * Clear current chat (start fresh)
   */
  const clearChat = useCallback(() => {
    setMessages([]);
    setLastResult(null);
    setError(null);
    setActiveAgent(null);
    setActiveChatId(null);
    setLiveTrace([]);
    sessionIdRef.current = null;
  }, []);

  return {
    // Chat session management
    chatSessions,
    activeChatId,
    newChat,
    selectChat,
    deleteChat,

    // Current chat state
    messages,
    isLoading,
    activeAgent,
    lastResult,
    error,

    // Agent state for panel
    agentTrace,
    decision,
    payoutAmount,
    flags,

    // Actions
    sendMessage,
    clearChat,
  };
}
