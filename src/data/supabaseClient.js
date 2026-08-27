import { createClient } from '@supabase/supabase-js'

/**
 * Session persistence is on by default (localStorage-backed), which is what
 * lets a signed-in user close the tab and come back still signed in.
 */
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
)
