import { createClient } from '@supabase/supabase-js';

export default {
    async scheduled(event: any, env: any, ctx: any) {
        console.log("Fetching market prices...");
        // Logic to be implemented
    },
    async fetch(request: Request, env: any, ctx: any) {
        return new Response("Market Prices Worker is running.");
    }
};
