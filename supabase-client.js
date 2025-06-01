// supabase-client.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// → SUSTITUYE ESTAS DOS LÍNEAS con tus valores (tú ya los tienes)
const SUPA_URL = 'https://dvpsiinqznqkbrbjeezt.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2cHNpaW5xem5xa2JyYmplZXp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3NTYxOTEsImV4cCI6MjA2NDMzMjE5MX0.AQ1pdQziGUCXL265wvoUB13A86Mo1haFIOFZSXqoDoY';

export const supabase = createClient(SUPA_URL, SUPA_KEY, {
  auth: { persistSession: false }
});
