
import { createClient } from '@supabase/supabase-js';

// Tenta obter variáveis de múltiplas fontes comuns em ambientes Vite/Node
const getEnv = (key: string): string => {
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key] as string;
  }
  // @ts-ignore - Suporte para import.meta.env se disponível
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
    // @ts-ignore
    return import.meta.env[key];
  }
  return '';
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL');
const supabaseKey = getEnv('VITE_SUPABASE_KEY');

// Log de aviso apenas se as chaves estiverem vazias para ajudar o desenvolvedor
if (!supabaseUrl || !supabaseKey) {
  console.warn("SimuladoAI: VITE_SUPABASE_URL ou VITE_SUPABASE_KEY não foram encontradas nas variáveis de ambiente.");
}

// Fallback para evitar erro de crash imediato, permitindo que o app renderize e mostre o erro na ação
const finalUrl = supabaseUrl || 'https://placeholder.supabase.co';
const finalKey = supabaseKey || 'placeholder';

export const supabase = createClient(finalUrl, finalKey);
