import { createClient } from '@supabase/supabase-js';

// Retrieve environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Ensure environment variables are loaded
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase credentials are missing. Please check your .env.local file.");
}

// Create a single supabase client for interacting with your database
// Provide fallback strings so the Vercel build doesn't crash during static generation
export const supabase = createClient(
  supabaseUrl || 'https://dummy.supabase.co', 
  supabaseAnonKey || 'dummy_key'
);
