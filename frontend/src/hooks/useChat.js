import { useState, useCallback, useRef, useEffect } from 'react';
import { sendChat, fetchChatHistory, fetchClaims } from '../services/api';
import { getStoredUser } from '../services/auth';
import { toast } from 'sonner';

const CHAT_STORAGE_KEY = 'laya_chat_sessions';
const ACTIVE_CHAT_KEY = 'laya_active_chat';

/**
 * Helper: get a localStorage key scoped to the current user
 */
function getUserStorageKey(suffix) {
  const user = getStoredUser();
  const userId = user?.id || user?.email || 'anonymous';
  return `${suffix}_${userId}`;
}

/**
 * Helper: save chat sessions to localStorage for the current user
 */
function saveChatSessionsToStorage(sessions) {
  try {
    const key = getUserStorageKey(CHAT_STORAGE_KEY);
    localStorage.setItem(key, JSON.stringify(sessions));
  } catch (e) {
    console.warn('Failed to save chat sessions to localStorage:', e);
  }
}

/**
 * Helper: load chat sessions from localStorage for the current user
 */
function loadChatSessionsFromStorage() {
  try {
    const key = getUserStorageKey(CHAT_STORAGE_KEY);
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.warn('Failed to load chat sessions from localStorage:', e);
    return [];
  }
}

/**
 * Helper: save the active chat ID to localStorage
 */
function saveActiveChatToStorage(chatId) {
  try {
    const key = getUserStorageKey(ACTIVE_CHAT_KEY);
    if (chatId) {
      localStorage.setItem(key, chatId);
    } else {
      localStorage.removeItem(key);
    }
  } catch (e) { /* ignore */ }
}

/**
 * Helper: load the active chat ID from localStorage
 */
function loadActiveChatFromStorage() {
  try {
    const key = getUserStorageKey(ACTIVE_CHAT_KEY);
    return localStorage.getItem(key) || null;
  } catch (e) {
    return null;
  }
}

/**
 * useChat — manages chat sessions, message state, API calls, and agent trace
 * Supports multiple chat sessions (like Claude's conversation history)
 * Multi-turn session_id support for conversation memory
 * WebSocket streaming for real-time agent trace updates
 * Persists chat history to localStorage and backend for cross-session continuity
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
  const [historyLoaded, setHistoryLoaded] = useState(false);

  // Multi-turn session tracking (backend session_id for conversation memory)
  const sessionIdRef = useRef(null);

  // Derived agent trace from last result (prefer live trace during processing)
  const agentTrace = isLoading ? liveTrace : (lastResult?.agent_trace || []);
  const decision = lastResult?.decision || '';
  const payoutAmount = lastResult?.payout_amount || 0;
  const flags = lastResult?.flags || [];

  // ── Persist chat sessions whenever they change ──
  useEffect(() => {
    if (historyLoaded && chatSessions.length > 0) {
      saveChatSessionsToStorage(chatSessions);
    }
  }, [chatSessions, historyLoaded]);

  // ── Load chat history on mount (from localStorage + backend) ──
  useEffect(() => {
    let cancelled = false;

    async function loadHistory() {
      const user = getStoredUser();
      if (!user) {
        setHistoryLoaded(true);
        return;
      }

      // 1. Load from localStorage first (instant)
      const localSessions = loadChatSessionsFromStorage();
      if (localSessions.length > 0 && !cancelled) {
        setChatSessions(localSessions);
        // Restore the last active chat
        const lastActiveId = loadActiveChatFromStorage();
        if (lastActiveId) {
          const activeSession = localSessions.find((s) => s.id === lastActiveId);
          if (activeSession) {
            setActiveChatId(lastActiveId);
            setMessages(activeSession.messages || []);
            setLastResult(activeSession.lastResult || null);
            sessionIdRef.current = activeSession.sessionId || null;
          }
        }
      }

      // 2. Then try loading from backend (handles server-side sessions)
      try {
        const data = await fetchChatHistory();
        if (!cancelled && data?.sessions?.length > 0) {
          // Merge backend sessions with local sessions (avoid duplicates)
          setChatSessions((prev) => {
            const existingSessionIds = new Set(prev.map((s) => s.sessionId).filter(Boolean));
            const existingChatIds = new Set(prev.map((s) => s.id));
            const newSessions = [];

            for (const backendSession of data.sessions) {
              // Skip if we already have this session
              if (existingSessionIds.has(backendSession.session_id)) continue;

              // Convert backend format to frontend format
              const chatId = backendSession.session_id || Date.now().toString();
              if (existingChatIds.has(chatId)) continue;

              const backendMessages = (backendSession.messages || []).map((m, idx) => ({
                id: Date.now() + idx,
                role: m.role,
                content: m.content,
                timestamp: m.timestamp,
                metadata: m.role === 'assistant' ? {
                  decision: m.decision || backendSession.decision || '',
                  payout_amount: m.payout_amount || 0,
                } : undefined,
              }));

              if (backendMessages.length === 0) continue;

              const lastCtx = backendSession.last_claim_context || {};
              newSessions.push({
                id: chatId,
                title: backendSession.title || 'Restored conversation',
                messages: backendMessages,
                memberName: '',
                time: new Date(backendSession.updated_at || backendSession.created_at || Date.now())
                  .toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                agentTrace: lastCtx.agent_trace || [],
                lastResult: lastCtx.decision ? {
                  decision: lastCtx.decision,
                  reasoning: lastCtx.reasoning || '',
                  payout_amount: lastCtx.payout_amount || 0,
                  agent_trace: lastCtx.agent_trace || [],
                  flags: lastCtx.flags || [],
                } : null,
                sessionId: backendSession.session_id,
              });
            }

            if (newSessions.length > 0) {
              return [...prev, ...newSessions];
            }
            return prev;
          });
        }
      } catch (err) {
        // Backend history load is best-effort
        console.log('Could not load chat history from backend:', err.message);
      }

      if (!cancelled) {
        setHistoryLoaded(true);
      }
    }

    loadHistory();
    return () => { cancelled = true; };
  }, []);

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
    saveActiveChatToStorage(newId);
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
        saveActiveChatToStorage(chatId);
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
      setChatSessions((prev) => {
        const updated = prev.filter((s) => s.id !== chatId);
        saveChatSessionsToStorage(updated);
        return updated;
      });
      if (activeChatId === chatId) {
        setActiveChatId(null);
        saveActiveChatToStorage(null);
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
    async (text, memberId, documentData = null, fileInfo = null) => {
      if (!text.trim() || !memberId) return;

      // Create a new session if none is active
      let currentChatId = activeChatId;
      if (!currentChatId) {
        currentChatId = Date.now().toString();
        setActiveChatId(currentChatId);
      }

      // Add user message (include file info for preview in MessageBubble)
      const userMessage = {
        id: Date.now(),
        role: 'user',
        content: text,
        timestamp: new Date().toISOString(),
        metadata: fileInfo ? {
          docId: fileInfo.docId,
          fileName: fileInfo.fileName,
          fileUrl: fileInfo.fileUrl,
        } : undefined,
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
            source_url: result.source_url,
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
                  ? { ...s, title, messages: updated, agentTrace: result.agent_trace, lastResult: result, time, sessionId: sessionIdRef.current }
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
                sessionId: sessionIdRef.current,
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
    saveActiveChatToStorage(null);
    setLiveTrace([]);
    sessionIdRef.current = null;
  }, []);

  // ── Claim Status WebSocket (real-time updates from developer decisions) ──
  const statusWsRef = useRef(null);
  const [connectedMemberId, setConnectedMemberId] = useState(null);

  /**
   * Connect to the claim status WebSocket for a specific member.
   * Call this when a member is selected in the customer portal.
   */
  const connectClaimStatusWs = useCallback((memberId) => {
    // Disconnect existing connection
    if (statusWsRef.current) {
      statusWsRef.current.close();
      statusWsRef.current = null;
    }
    if (!memberId) {
      setConnectedMemberId(null);
      return;
    }

    const wsUrl = `ws://${window.location.hostname}:8000/ws/claim-status/${memberId}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setConnectedMemberId(memberId);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'claim_status_update') {
          // Update messages that reference this claim to show new status
          setMessages((prev) => {
            const updated = prev.map((msg) => {
              if (msg.metadata && (msg.metadata.decision === 'PENDING' || msg.metadata.decision === 'PENDING_THRESHOLD')) {
                return {
                  ...msg,
                  content: msg.content.replace(
                    /under review|pending/gi,
                    data.new_status === 'APPROVED' ? '**APPROVED** ✅' : data.new_status === 'REJECTED' ? '**REJECTED** ❌' : data.new_status
                  ),
                  metadata: {
                    ...msg.metadata,
                    decision: data.new_status,
                    statusUpdated: true,
                    reviewDetails: data.details,
                    payout_amount: data.details?.payout_amount || msg.metadata.payout_amount,
                  },
                };
              }
              return msg;
            });
            return updated;
          });

          // Also update the chat session in the sessions list
          setChatSessions((prev) => {
            const updated = prev.map((session) => {
              const hasUpdatedMsgs = session.messages?.some(
                (msg) => msg.metadata && (msg.metadata.decision === 'PENDING' || msg.metadata.decision === 'PENDING_THRESHOLD')
              );
              if (!hasUpdatedMsgs) return session;

              const updatedMsgs = session.messages.map((msg) => {
                if (msg.metadata && (msg.metadata.decision === 'PENDING' || msg.metadata.decision === 'PENDING_THRESHOLD')) {
                  return {
                    ...msg,
                    content: msg.content.replace(
                      /under review|pending/gi,
                      data.new_status === 'APPROVED' ? '**APPROVED** ✅' : data.new_status === 'REJECTED' ? '**REJECTED** ❌' : data.new_status
                    ),
                    metadata: {
                      ...msg.metadata,
                      decision: data.new_status,
                      statusUpdated: true,
                      reviewDetails: data.details,
                      payout_amount: data.details?.payout_amount || msg.metadata.payout_amount,
                    },
                  };
                }
                return msg;
              });

              const updatedLastResult = session.lastResult ? {
                ...session.lastResult,
                decision: data.new_status,
                payout_amount: data.details?.payout_amount || session.lastResult.payout_amount,
              } : session.lastResult;

              return { ...session, messages: updatedMsgs, lastResult: updatedLastResult };
            });
            saveChatSessionsToStorage(updated);
            return updated;
          });

          // Update lastResult if current chat was affected
          setLastResult((prev) => {
            if (prev && (prev.decision === 'PENDING' || prev.decision === 'PENDING_THRESHOLD')) {
              return {
                ...prev,
                decision: data.new_status,
                payout_amount: data.details?.payout_amount || prev.payout_amount,
              };
            }
            return prev;
          });

          // Show toast notification
          const statusLabel = data.new_status?.toLowerCase() || 'updated';
          toast.success(`Your claim has been ${statusLabel}!`, {
            description: data.details?.reviewed_by
              ? `Reviewed by ${data.details.reviewed_by}`
              : undefined,
            duration: 8000,
          });
        }
      } catch {
        // Non-JSON message, ignore
      }
    };

    ws.onerror = () => {
      // Silent fail — status WebSocket is optional
    };

    ws.onclose = () => {
      statusWsRef.current = null;
    };

    statusWsRef.current = ws;
  }, []);

  /**
   * Check backend for updated claim statuses and sync with cached chat sessions.
   * Called on login when the customer has pending claims in their chat history.
   */
  const refreshClaimStatuses = useCallback(async (memberId) => {
    if (!memberId) return;
    try {
      const claims = await fetchClaims(memberId);
      if (!claims || claims.length === 0) return;

      // Build a lookup of claim statuses from the backend
      const claimStatusMap = {};
      for (const claim of claims) {
        if (claim.claim_id) {
          claimStatusMap[claim.claim_id] = claim;
        }
      }

      // Check if any messages in our sessions had PENDING decisions that are now resolved
      let anyUpdated = false;

      setMessages((prev) => {
        const updated = prev.map((msg) => {
          if (msg.metadata && (msg.metadata.decision === 'PENDING' || msg.metadata.decision === 'PENDING_THRESHOLD')) {
            // Look for a matching approved/rejected claim in backend
            const matchingClaim = claims.find(
              (c) => c.status && c.status !== 'Pending' && c.status !== 'Pending Threshold'
                && c.status.toUpperCase() !== 'PENDING'
            );
            if (matchingClaim && (matchingClaim.status.toUpperCase() === 'APPROVED' || matchingClaim.status.toUpperCase() === 'REJECTED')) {
              anyUpdated = true;
              return {
                ...msg,
                metadata: {
                  ...msg.metadata,
                  decision: matchingClaim.status.toUpperCase(),
                  statusUpdated: true,
                  payout_amount: matchingClaim.payout_amount || msg.metadata.payout_amount,
                  reviewDetails: {
                    reviewed_by: matchingClaim.reviewed_by || '',
                    reviewer_notes: matchingClaim.reviewer_notes || '',
                  },
                },
              };
            }
          }
          return msg;
        });
        return updated;
      });

      // Also update sessions
      setChatSessions((prev) => {
        const updated = prev.map((session) => {
          const hasUpdatedMsgs = session.messages?.some(
            (msg) => msg.metadata && (msg.metadata.decision === 'PENDING' || msg.metadata.decision === 'PENDING_THRESHOLD')
          );
          if (!hasUpdatedMsgs) return session;

          const updatedMsgs = session.messages.map((msg) => {
            if (msg.metadata && (msg.metadata.decision === 'PENDING' || msg.metadata.decision === 'PENDING_THRESHOLD')) {
              const matchingClaim = claims.find(
                (c) => c.status && c.status.toUpperCase() !== 'PENDING'
              );
              if (matchingClaim && (matchingClaim.status.toUpperCase() === 'APPROVED' || matchingClaim.status.toUpperCase() === 'REJECTED')) {
                return {
                  ...msg,
                  metadata: {
                    ...msg.metadata,
                    decision: matchingClaim.status.toUpperCase(),
                    statusUpdated: true,
                    payout_amount: matchingClaim.payout_amount || msg.metadata.payout_amount,
                    reviewDetails: {
                      reviewed_by: matchingClaim.reviewed_by || '',
                      reviewer_notes: matchingClaim.reviewer_notes || '',
                    },
                  },
                };
              }
            }
            return msg;
          });

          // Update the session's lastResult too so AgentPanel reflects the change
          let updatedLastResult = session.lastResult;
          if (updatedLastResult && (updatedLastResult.decision === 'PENDING' || updatedLastResult.decision === 'PENDING_THRESHOLD')) {
            const resolvedClaim = claims.find(
              (c) => c.status && c.status.toUpperCase() !== 'PENDING'
                && (c.status.toUpperCase() === 'APPROVED' || c.status.toUpperCase() === 'REJECTED' || c.status.toUpperCase() === 'PARTIALLY APPROVED')
            );
            if (resolvedClaim) {
              updatedLastResult = {
                ...updatedLastResult,
                decision: resolvedClaim.status.toUpperCase(),
                payout_amount: resolvedClaim.payout_amount || updatedLastResult.payout_amount,
              };
            }
          }

          return { ...session, messages: updatedMsgs, lastResult: updatedLastResult };
        });
        saveChatSessionsToStorage(updated);
        return updated;
      });

      // Update the active lastResult so the AgentPanel decision badge updates
      setLastResult((prev) => {
        if (prev && (prev.decision === 'PENDING' || prev.decision === 'PENDING_THRESHOLD')) {
          const resolvedClaim = claims.find(
            (c) => c.status && c.status.toUpperCase() !== 'PENDING'
              && (c.status.toUpperCase() === 'APPROVED' || c.status.toUpperCase() === 'REJECTED' || c.status.toUpperCase() === 'PARTIALLY APPROVED')
          );
          if (resolvedClaim) {
            return {
              ...prev,
              decision: resolvedClaim.status.toUpperCase(),
              payout_amount: resolvedClaim.payout_amount || prev.payout_amount,
            };
          }
        }
        return prev;
      });

      if (anyUpdated) {
        toast.info('Claim status updated since your last visit');
      }
    } catch (err) {
      console.log('Could not refresh claim statuses:', err.message);
    }
  }, []);

  // Cleanup status WebSocket on unmount
  useEffect(() => {
    return () => {
      if (statusWsRef.current) {
        statusWsRef.current.close();
      }
    };
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
    connectClaimStatusWs,
    refreshClaimStatuses,
  };
}
