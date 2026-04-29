// ============================================================
//  supabase.js  —  Cliente único de Supabase
//  Importar desde cualquier service o JS del proyecto:
//  import { supabase } from '../../services/supabase.js'
//
//  CORRECCIÓN: En proyectos MPA con Vite (múltiples HTML),
//  cada página crea una instancia nueva del cliente. Se agrega
//  storageKey explícito para que todas las páginas lean el
//  token desde la misma clave en localStorage.
// ============================================================
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL      = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error(
    '❌ Faltan las variables de entorno de Supabase.\n' +
    'Crea el archivo .env en la raíz del proyecto con:\n' +
    'VITE_SUPABASE_URL=https://xxxx.supabase.co\n' +
    'VITE_SUPABASE_ANON_KEY=eyJ...'
  )
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession:     true,
    autoRefreshToken:   true,
    detectSessionInUrl: true,
    // CORRECCIÓN CLAVE: forzar que todas las páginas usen
    // exactamente el mismo storageKey que usó el login.
    // El formato que Supabase usa por defecto es sb-<ref>-auth-token
    // donde <ref> son los primeros caracteres de tu proyecto URL.
    storageKey: 'sb-' + SUPABASE_URL.split('//')[1].split('.')[0] + '-auth-token',
  },
})