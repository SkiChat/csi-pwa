import { createClient } from "@supabase/supabase-js";

export function getSupabaseClient(env?: any) {
    // Try to get from env (Cloudflare Workers) first, then process.env
    const supabaseUrl = env?.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
    const supabaseKey = env?.SUPABASE_SERVICE_ROLE_KEY || env?.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";

    if (!supabaseUrl || !supabaseKey) {
        throw new Error("Missing Supabase credentials. Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.");
    }

    return createClient(supabaseUrl, supabaseKey);
}
