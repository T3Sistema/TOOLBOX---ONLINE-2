import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zdvxovzkgrnpgovulidi.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpkdnhvdnprZ3JucGdvdnVsaWRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0MjY0OTMsImV4cCI6MjA3NDAwMjQ5M30.6aVm20MX7ppMQfBZdEI8Q4qkhcN7fo7An9hlRqm8Yw4';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
