import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export const useAvailableBlocks = () => {
  const [availableBlocks, setAvailableBlocks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchAvailableBlocks = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("locations")
        .select("block")
        .order("block");

      if (error) throw error;

      const uniqueBlocks = [...new Set(data.map((item) => item.block))];
      setAvailableBlocks(uniqueBlocks.sort((a, b) => a - b));
    } catch (error) {
      console.error("Error while loading blocks:", error);
      setError(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAvailableBlocks();
  }, []);

  return { availableBlocks, isLoading, error, refetch: fetchAvailableBlocks };
};
