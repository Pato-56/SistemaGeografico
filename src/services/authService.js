// ============================================================
//  authService.js  —  Autenticación completa con Supabase Auth
// ============================================================
import { supabase } from './supabase'

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

  // Actualizar último acceso en nuestra tabla
  await supabase
    .from('usuarios')
    .update({ ultimo_acceso: new Date().toISOString() })
    .eq('auth_user_id', data.user.id)

  const perfil = await getPerfil(data.user.id)
  return perfil
}

// ── LOGOUT ────────────────────────────────────────────────────

/**
 * Cierra la sesión del usuario actual.
 */
export async function logout() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

// ── SESIÓN ACTIVA ─────────────────────────────────────────────

/**
 * Devuelve el perfil del usuario con sesión activa.
 * Retorna null si no hay sesión.
 */
export async function getUsuarioActual() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  return await getPerfil(user.id)
}

/**
 * Escucha cambios en la sesión (login, logout, token refresh).
 * Úsalo en tu AuthContext para mantener el estado global.
 * @param {(perfil: object|null) => void} callback
 */
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
  // Retorna la función para cancelar la suscripción
  return () => subscription.unsubscribe()
}

// ── REGISTRO ──────────────────────────────────────────────────

/**
 * Registra un nuevo usuario en Supabase Auth y en la tabla usuarios.
 * El administrador activa la cuenta después (estado = 'pendiente').
 * @param {{
 *   correo: string,
 *   password: string,
 *   nombre: string,
 *   apellido: string,
 *   telefono?: string,
 *   rol?: string,
 * }} datos
 */
export async function registrar(datos) {
  const { correo, password, nombre, apellido, telefono, rol = 'estudiante' } = datos

  // 1. Crear en Supabase Auth
  const { data, error } = await supabase.auth.signUp({
    email:    correo,
    password,
    options: {
      data: { nombre, apellido },        // metadata en auth.users
      emailRedirectTo: window.location.origin,
    },
  })

  if (error) throw error

  // 2. Crear en nuestra tabla usuarios
  const { error: perfilError } = await supabase
    .from('usuarios')
    .insert({
      auth_user_id: data.user.id,
      nombre,
      apellido,
      correo,
      telefono,
      rol,
      estado: 'pendiente',               // el admin activa la cuenta
    })

  if (perfilError) throw perfilError

  return data.user
}

// ── RECUPERAR CONTRASEÑA (paso 1: enviar correo) ───────────────

/**
 * Envía un correo con el enlace para restablecer la contraseña.
 * Conecta con la pantalla recuperar-contrasena.html (paso 1).
 * @param {string} correo
 */
export async function enviarCorreoRecuperacion(correo) {
  const { error } = await supabase.auth.resetPasswordForEmail(correo, {
    redirectTo: `${window.location.origin}/src/pages/auth/recuperar-contrasena.html`,
  })

  if (error) throw error
}

// ── RESTABLECER CONTRASEÑA (paso 3: nueva contraseña) ─────────

/**
 * Actualiza la contraseña del usuario después de verificar el token
 * del correo. Supabase maneja el token automáticamente al detectar
 * el hash en la URL (#access_token=...).
 *
 * Llama esta función en el paso 3 de recuperar-contrasena.html.
 * @param {string} nuevaPassword
 */
export async function restablecerPassword(nuevaPassword) {
  const { data, error } = await supabase.auth.updateUser({
    password: nuevaPassword,
  })

  if (error) throw error
  return data
}

// ── CAMBIAR CONTRASEÑA (usuario autenticado) ───────────────────

/**
 * Cambia la contraseña desde el perfil (usuario ya autenticado).
 * @param {string} nuevaPassword
 */
export async function cambiarPassword(nuevaPassword) {
  const { error } = await supabase.auth.updateUser({
    password: nuevaPassword,
  })

  if (error) throw error
}

// ── ACTUALIZAR PERFIL ─────────────────────────────────────────

/**
 * Actualiza los datos del perfil del usuario actual.
 * @param {{ nombre?: string, apellido?: string, telefono?: string }} cambios
 */
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

/**
 * Obtiene el perfil completo de la tabla usuarios por auth_user_id.
 * @param {string} authUserId - ID de Supabase Auth
 */
async function getPerfil(authUserId) {
  const { data, error } = await supabase
    .from('usuarios')
    .select('*')
    .eq('auth_user_id', authUserId)
    .single()

  if (error) throw error
  return data
}