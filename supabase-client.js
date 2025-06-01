// supabase-client.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// ————————————————————————————————————————————————————————————————————————
// Pegaste tu Supabase URL y tu Anon Public Key aquí:
const SUPA_URL = 'https://dvpsiinqznqkbrbjeezt.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2cHNpaW5xem5xa2JyYmplZXp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3NTYxOTEsImV4cCI6MjA2NDMzMjE5MX0.AQ1pdQziGUCXL265wvoUB13A86Mo1haFIOFZSXqoDoY';
// ————————————————————————————————————————————————————————————————————————

/**
 * Creamos un cliente de Supabase que solo usaremos para Storage.
 * No vamos a tocar Supabase Auth, porque seguimos usando Firebase Auth.
 */
export const supabase = createClient(SUPA_URL, SUPA_KEY, {
  auth: { persistSession: false }
});
