// src/lib/supabase.js
// Lazy-loaded Supabase client for better initial page load performance

let supabaseClient = null;
let initPromise = null;

/**
 * Lazily initializes and returns the Supabase client.
 * The client is only created on first use, reducing initial bundle load.
 *
 * @returns {Promise<import('@supabase/supabase-js').SupabaseClient>}
 */
async function getSupabaseClient() {
  if (supabaseClient) return supabaseClient;

  if (!initPromise) {
    initPromise = (async () => {
      const { createClient } = await import("@supabase/supabase-js");

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

      if (!supabaseUrl || !supabaseKey) {
        throw new Error("Missing Supabase URL or Anon Key");
      }

      supabaseClient = createClient(supabaseUrl, supabaseKey);
      return supabaseClient;
    })();
  }

  return initPromise;
}

/**
 * Proxy object that lazily loads Supabase on first method call.
 * Maintains the same API as the original synchronous export.
 */
export const supabase = {
  /**
   * Call a Supabase RPC function
   * @param {string} fn - Function name
   * @param {object} args - Function arguments
   */
  rpc: async (fn, args) => {
    const client = await getSupabaseClient();
    return client.rpc(fn, args);
  },

  /**
   * Access a Supabase table
   * @param {string} table - Table name
   */
  from: async (table) => {
    const client = await getSupabaseClient();
    return client.from(table);
  },
};
