
import { createClient } from '@supabase/supabase-js';

// Valores fornecidos pelo usuário
const DEFAULT_URL = 'https://zvfdptwkmrkwuktgdpch.supabase.co';
const DEFAULT_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2ZmRwdHdrbXJrd3VrdGdkcGNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzOTcyNjYsImV4cCI6MjA4Mzk3MzI2Nn0.PCO25PlUu-c0MeU0xo8XHjaSATq-ZwbGL2MfddnL3rY';

const getEnv = (key: string): string => {
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key] as string;
  }
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
    // @ts-ignore
    return import.meta.env[key];
  }
  return '';
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL') || DEFAULT_URL;
const supabaseKey = getEnv('VITE_SUPABASE_KEY') || DEFAULT_KEY;

// Inicializa o cliente com os valores reais
export const supabase = createClient(supabaseUrl, supabaseKey);
