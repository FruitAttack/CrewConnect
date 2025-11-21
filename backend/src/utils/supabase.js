import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validate environment variables
if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error(
    'Missing required environment variables: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env file'
  );
}

// Create Supabase client with service role key (bypasses RLS)
// This is for server-side use only - NEVER expose this to frontend
export const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false
  },
  db: {
    schema: 'app' // Set default schema to 'app'
  }
});

// Helper function to create a client with user context for RLS
// Use this when you want RLS policies to apply based on a specific user
export const createUserClient = (userId) => {
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    },
    db: {
      schema: 'app'
    },
    global: {
      headers: {
        // Set the user context for RLS policies
        'x-supabase-user-id': userId
      }
    }
  });
};

// Optional: Create a separate client for RLS-enabled operations
// Use this if you want to test RLS policies from the backend
export const supabaseWithRLS = createClient(
  supabaseUrl, 
  process.env.SUPABASE_ANON_KEY || supabaseServiceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    db: {
      schema: 'app'
    }
  }
);