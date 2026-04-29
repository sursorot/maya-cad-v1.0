/**
 * Supabase Client Configuration
 * 
 * Environment variables required:
 * - VITE_SUPABASE_URL: Your Supabase project URL
 * - VITE_SUPABASE_ANON_KEY: Your Supabase anonymous/public key
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const ANON_HEADER_KEY = 'x-maya-anon-session';
const ANON_STORAGE_KEY = 'maya_anonymous_session_id';

const generateAnonymousSessionId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `anon_${crypto.randomUUID().replace(/-/g, '')}`;
  }

  return `anon_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 15)}`;
};

/**
 * Get or create an anonymous session ID for users who aren't logged in.
 * This allows non-authenticated users to still save projects locally
 * and sync them later when they create an account.
 */
export const getAnonymousSessionId = (): string => {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return generateAnonymousSessionId();
  }

  let sessionId = localStorage.getItem(ANON_STORAGE_KEY);
  
  if (!sessionId) {
    sessionId = generateAnonymousSessionId();
    localStorage.setItem(ANON_STORAGE_KEY, sessionId);
  }
  
  return sessionId;
};

const buildAnonymousHeaders = (): Record<string, string> => {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return {};
  }

  const sessionId = getAnonymousSessionId();
  return sessionId ? { [ANON_HEADER_KEY]: sessionId } : {};
};

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase credentials not found. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.\n' +
    'Project persistence features will be disabled.'
  );
}

// Create a singleton Supabase client
export const supabase: SupabaseClient<Database> | null = 
  supabaseUrl && supabaseAnonKey
    ? createClient<Database>(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
        global: {
          headers: buildAnonymousHeaders(),
        },
      })
    : null;

/**
 * Check if Supabase is properly configured
 */
export const isSupabaseConfigured = (): boolean => {
  return supabase !== null;
};

/**
 * Get the current authenticated user
 */
export const getCurrentUser = async () => {
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

