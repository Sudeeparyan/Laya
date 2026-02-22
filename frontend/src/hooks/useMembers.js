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

  return {
    members,
    selectedMember,
    selectMember,
    loading: membersLoading || selectLoading,
    membersLoading,
    error,
    retryLoadMembers: loadMembers,
  };
}
