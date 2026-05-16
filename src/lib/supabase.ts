import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

if (!supabaseKey) {
  console.warn('Supabase key is missing. Make sure you have added VITE_SUPABASE_KEY to your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);
