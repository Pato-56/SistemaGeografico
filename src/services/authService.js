// ============================================================
//  authService.js  —  Autenticación completa con Supabase Auth
//  CORRECCIÓN: import con extensión .js explícita (requerido en ESM)
// ============================================================
import { supabase } from './supabase.js'   // ← .js agregado

// ── LOGIN ─────────────────────────────────────────────────────

/**
 * Inicia sesión con correo y contraseña.
 * Retorna el perfil completo de la tabla usuarios.
 * @param {string} correo
 * @param {string} password
 */
export async function login(correo, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email:    correo,
    password,
  })

  if (error) throw error

  await supabase
    .from('usuarios')
    .update({ ultimo_acceso: new Date().toISOString() })
    .eq('auth_user_id', data.user.id)

  const perfil = await getPerfil(data.user.id)
  return perfil
}

// ── LOGOUT ────────────────────────────────────────────────────

export async function logout() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

// ── SESIÓN ACTIVA ─────────────────────────────────────────────

export async function getUsuarioActual() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  return await getPerfil(user.id)
}

export function onAuthChange(callback) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    async (event, session) => {
      if (session?.user) {
        const perfil = await getPerfil(session.user.id)
        callback(perfil)
      } else {
        callback(null)
      }
    }
  )
  return () => subscription.unsubscribe()
}

// ── REGISTRO ──────────────────────────────────────────────────

export async function registrar(datos) {
  const { correo, password, nombre, apellido, telefono, rol = 'estudiante' } = datos

  const { data, error } = await supabase.auth.signUp({
    email:    correo,
    password,
    options: {
      data: { nombre, apellido },
      emailRedirectTo: window.location.origin,
    },
  })

  if (error) throw error

  const { error: perfilError } = await supabase
    .from('usuarios')
    .insert({
      auth_user_id: data.user.id,
      nombre,
      apellido,
      correo,
      telefono,
      rol,
      estado: 'pendiente',
    })

  if (perfilError) throw perfilError
  return data.user
}

// ── RECUPERAR CONTRASEÑA ───────────────────────────────────────

export async function enviarCorreoRecuperacion(correo) {
  const { error } = await supabase.auth.resetPasswordForEmail(correo, {
    redirectTo: `${window.location.origin}/src/pages/auth/recuperar-contrasena.html`,
  })
  if (error) throw error
}

export async function restablecerPassword(nuevaPassword) {
  const { data, error } = await supabase.auth.updateUser({
    password: nuevaPassword,
  })
  if (error) throw error
  return data
}

// ── CAMBIAR CONTRASEÑA (usuario autenticado) ───────────────────

export async function cambiarPassword(nuevaPassword) {
  const { error } = await supabase.auth.updateUser({
    password: nuevaPassword,
  })
  if (error) throw error
}

// ── ACTUALIZAR PERFIL ─────────────────────────────────────────

export async function actualizarPerfil(cambios) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No hay sesión activa.')

  const { data, error } = await supabase
    .from('usuarios')
    .update(cambios)
    .eq('auth_user_id', user.id)
    .select()
    .single()

  if (error) throw error
  return data
}

// ── HELPER INTERNO ────────────────────────────────────────────

async function getPerfil(authUserId) {
  const { data, error } = await supabase
    .from('usuarios')
    .select('*')
    .eq('auth_user_id', authUserId)
    .single()

  if (error) throw error
  return data
}