/**
 * useKeyboardShortcuts — Power-user keyboard shortcuts
 * Ctrl+K: New chat
 * Ctrl+/: Toggle agent panel
 * Ctrl+U: Upload file
 * Escape: Close panels/modals
 */

import { useEffect, useCallback } from 'react';

export function useKeyboardShortcuts({ onNewChat, onTogglePanel, onUpload, onEscape }) {
  const handleKeyDown = useCallback((e) => {
    // Ctrl+K or Cmd+K — New chat
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      onNewChat?.();
    }

    // Ctrl+/ or Cmd+/ — Toggle panel
    if ((e.ctrlKey || e.metaKey) && e.key === '/') {
      e.preventDefault();
      onTogglePanel?.();
    }

    // Ctrl+U or Cmd+U — Upload
    if ((e.ctrlKey || e.metaKey) && e.key === 'u') {
      e.preventDefault();
      onUpload?.();
    }

    // Escape — Close
    if (e.key === 'Escape') {
      onEscape?.();
    }
  }, [onNewChat, onTogglePanel, onUpload, onEscape]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
