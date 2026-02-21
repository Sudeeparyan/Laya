// useMembers hook — manages member data fetching and selection

import { useState, useEffect, useCallback } from 'react';
import { fetchMembers, fetchMember } from '../services/api';

export function useMembers() {
  const [members, setMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch all members on mount
  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await fetchMembers();
        setMembers(data);
      } catch (err) {
        setError(err.message);
        console.error('Failed to fetch members:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Select a member — loads full record
  const selectMember = useCallback(async (memberId) => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchMember(memberId);
      setSelectedMember(data);
    } catch (err) {
      setError(err.message);
      console.error('Failed to fetch member:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    members,
    selectedMember,
    selectMember,
    loading,
    error,
  };
}
