import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabaseUrl = 'https://mffyoacmjsnvdolknemm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mZnlvYWNtanNudmRvbGtuZW1tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0OTg5MTYsImV4cCI6MjA4ODA3NDkxNn0.evcFtIFhDGku6zX5KQNnB852EOswUN6yNGwyCStIpuc';

export const supabase = createClient(supabaseUrl, supabaseKey);
