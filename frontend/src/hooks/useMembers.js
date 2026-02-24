// useMembers hook — manages member data fetching and selection

import { useState, useEffect, useCallback } from 'react';
import { fetchMembers, fetchMember } from '../services/api';

export function useMembers() {
  const [members, setMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [membersLoading, setMembersLoading] = useState(true);
  const [selectLoading, setSelectLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch all members
  const loadMembers = useCallback(async () => {
    try {
      setMembersLoading(true);
      setError(null);
      const data = await fetchMembers();
      setMembers(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
      console.error('Failed to fetch members:', err);
    } finally {
      setMembersLoading(false);
    }
  }, []);

  // Fetch all members on mount
  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  // Select a member — loads full record
  const selectMember = useCallback(async (memberId) => {
    // Guard: if memberId is empty, clear the selection
    if (!memberId) {
      setSelectedMember(null);
      return;
    }
    try {
      setSelectLoading(true);
      setError(null);
      const data = await fetchMember(memberId);
      setSelectedMember(data);
    } catch (err) {
      setError(err.message);
      setSelectedMember(null);
      console.error('Failed to fetch member:', err);
    } finally {
      setSelectLoading(false);
    }
  }, []);

  // Refresh the currently selected member (re-fetch from backend)
  // Call this after claim status updates, usage changes, etc.
  const refreshMember = useCallback(async () => {
    if (!selectedMember?.member_id) return;
    try {
      const data = await fetchMember(selectedMember.member_id);
      setSelectedMember(data);
    } catch (err) {
      console.error('Failed to refresh member:', err);
    }
  }, [selectedMember?.member_id]);

  return {
    members,
    selectedMember,
    selectMember,
    refreshMember,
    loading: membersLoading || selectLoading,
    membersLoading,
    error,
    retryLoadMembers: loadMembers,
  };
}
