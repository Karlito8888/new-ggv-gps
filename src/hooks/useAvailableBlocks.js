// Custom hook for managing available blocks data
// Provides available block numbers for the WelcomeModal

import { useState, useEffect } from 'react';

/**
 * Custom hook for available blocks management
 * @returns {Object} Available blocks data and status
 */
export function useAvailableBlocks() {
  const [availableBlocks, setAvailableBlocks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Simulate loading available blocks
    // In a real app, this would fetch from Supabase or another API
    const loadAvailableBlocks = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // For now, return hardcoded block numbers
        // TODO: Replace with actual Supabase query
        const blocks = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
        
        setAvailableBlocks(blocks);
        console.log('✅ Available blocks loaded:', blocks);
      } catch (err) {
        console.error('❌ Error loading available blocks:', err);
        setError(err.message);
        // Fallback to basic block numbers
        setAvailableBlocks([1, 2, 3, 4, 5]);
      } finally {
        setIsLoading(false);
      }
    };

    loadAvailableBlocks();
  }, []);

  return {
    availableBlocks,
    isLoading,
    error,
    setError,
  };
}

export default useAvailableBlocks;
