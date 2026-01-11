import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase credentials missing. Please check your .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Global types for Supabase entities
export type Tables<T extends keyof any> = any; // Placeholder for generated types
