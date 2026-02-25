// Lazy-loaded Supabase client for better initial page load performance
import type { SupabaseClient } from "@supabase/supabase-js";

let supabaseClient: SupabaseClient | null = null;
let initPromise: Promise<SupabaseClient> | null = null;

/**
 * Lazily initializes and returns the Supabase client.
 * The client is only created on first use, reducing initial bundle load.
 */
async function getSupabaseClient(): Promise<SupabaseClient> {
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
  rpc: async (fn: string, args?: Record<string, unknown>) => {
    const client = await getSupabaseClient();
    return client.rpc(fn, args);
  },

  from: async (table: string) => {
    const client = await getSupabaseClient();
    return client.from(table);
  },
};
