import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

// Clés de requête pour une gestion cohérente du cache
export const locationKeys = {
  all: ['locations'],
  blocks: () => [...locationKeys.all, 'blocks'],
  lots: (blockNumber) => [...locationKeys.all, 'lots', blockNumber],
  location: (blockNumber, lotNumber) => [...locationKeys.all, 'location', blockNumber, lotNumber],
};

/**
 * Hook pour récupérer tous les numéros de blocs disponibles
 */
export const useAvailableBlocks = () => {
  return useQuery({
    queryKey: locationKeys.blocks(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('locations')
        .select('block')
        .is('deleted_at', null) // Exclure les locations supprimées
        .eq('is_locked', false) // Exclure les locations verrouillées
        .order('block');

      if (error) {
        throw new Error(`Error fetching blocks: ${error.message}`);
      }

      // Extraire les numéros de blocs uniques et les trier
      const uniqueBlocks = [...new Set(data.map(item => parseInt(item.block)))]
        .filter(block => !isNaN(block))
        .sort((a, b) => a - b);

      return uniqueBlocks;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - les blocs changent rarement
  });
};

/**
 * Hook pour récupérer les numéros de lots disponibles pour un bloc donné
 */
export const useAvailableLots = (blockNumber) => {
  return useQuery({
    queryKey: locationKeys.lots(blockNumber),
    queryFn: async () => {
      if (!blockNumber) return [];

      const { data, error } = await supabase
        .from('locations')
        .select('lot')
        .eq('block', blockNumber)
        .is('deleted_at', null) // Exclure les locations supprimées
        .eq('is_locked', false) // Exclure les locations verrouillées
        .order('lot');

      if (error) {
        throw new Error(`Error fetching lots for block ${blockNumber}: ${error.message}`);
      }

      // Extraire les numéros de lots uniques et les trier
      const uniqueLots = [...new Set(data.map(item => parseInt(item.lot)))]
        .filter(lot => !isNaN(lot))
        .sort((a, b) => a - b);

      return uniqueLots;
    },
    enabled: !!blockNumber, // Ne lance la requête que si blockNumber est défini
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Hook pour récupérer une location spécifique (bloc + lot)
 */
export const useLocation = (blockNumber, lotNumber) => {
  return useQuery({
    queryKey: locationKeys.location(blockNumber, lotNumber),
    queryFn: async () => {
      if (!blockNumber || !lotNumber) return null;

      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .eq('block', blockNumber)
        .eq('lot', lotNumber)
        .is('deleted_at', null)
        .eq('is_locked', false)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new Error(`No destination found for block ${blockNumber}, lot ${lotNumber}`);
        }
        throw new Error(`Error fetching location: ${error.message}`);
      }

      // Validation simplifiée des coordonnées
      if (!data.coordinates?.coordinates || data.coordinates.coordinates.length !== 2) {
        throw new Error('Invalid coordinates for this destination');
      }

      return {
        ...data,
        blockNumber: parseInt(blockNumber),
        lotNumber: parseInt(lotNumber),
        coordinates: data.coordinates.coordinates,
        address: data.address || `Block ${blockNumber}, Lot ${lotNumber}`,
      };
    },
    enabled: !!(blockNumber && lotNumber), // Ne lance la requête que si les deux sont définis
    staleTime: 2 * 60 * 1000, // 2 minutes - les locations spécifiques peuvent changer
  });
};


