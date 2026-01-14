
import { createClient } from '@supabase/supabase-js';

// Valores padrão de produção
const DEFAULT_URL = 'https://zvfdptwkmrkwuktgdpch.supabase.co';
const DEFAULT_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2ZmRwdHdrbXJrd3VrdGdkcGNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzOTcyNjYsImV4cCI6MjA4Mzk3MzI2Nn0.PCO25PlUu-c0MeU0xo8XHjaSATq-ZwbGL2MfddnL3rY';

// O ambiente de execução alvo injeta as variáveis no objeto process.env.
// Verificamos a existência do objeto antes do acesso para evitar crashes.
const supabaseUrl = (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_URL) || DEFAULT_URL;
const supabaseKey = (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_KEY) || DEFAULT_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);
