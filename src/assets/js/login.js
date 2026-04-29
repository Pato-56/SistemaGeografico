/* ============================================================
   login.js  —  Autenticación con Supabase
   CORRECCIÓN: Rutas de redirección unificadas con /src/pages/...
   para que sean consistentes con sidebar.js
   ============================================================ */
import { supabase } from '../../services/supabase.js'

async function handleLogin() {
  const correo   = document.getElementById('emailInput').value.trim()
  const password = document.getElementById('passInput').value
  const btnEl    = document.getElementById('btnLogin')
  const errEl    = document.getElementById('loginError')

  if (!correo || !password) {
    mostrarError('Por favor completa todos los campos.')
    return
  }

  btnEl.disabled    = true
  btnEl.textContent = 'Ingresando…'
  errEl.style.display = 'none'

  try {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email:    correo,
      password,
    })

    if (authError) throw authError

    const { data: perfil, error: perfilError } = await supabase
      .from('usuarios')
      .select('*')
      .eq('auth_user_id', authData.user.id)
      .single()

    if (perfilError) throw new Error('No se encontró el perfil del usuario.')

    if (perfil.estado !== 'activo') {
      await supabase.auth.signOut()
      throw new Error('Tu cuenta está pendiente de activación. Contacta al administrador.')
    }

    await supabase
      .from('usuarios')
      .update({ ultimo_acceso: new Date().toISOString() })
      .eq('id', perfil.id)

    // ── Rutas absolutas (igual que en sidebar.js) ─────────
    const rutas = {
      administrador: '/src/pages/dashboard/dashboard-administrador.html',
      investigador:  '/src/pages/dashboard/dashboard-investigador.html',
      estudiante:    '/src/pages/dashboard/dashboard-censador.html',
    }

    const destino = rutas[perfil.rol]
    if (!destino) throw new Error('Rol no reconocido: ' + perfil.rol)

    window.location.href = destino

  } catch (err) {
    const mensajes = {
      'Invalid login credentials': 'Correo o contraseña incorrectos.',
      'Email not confirmed':        'Confirma tu correo antes de iniciar sesión.',
      'Too many requests':          'Demasiados intentos. Espera unos minutos.',
    }
    const msg = mensajes[err.message] ?? err.message ?? 'Error al iniciar sesión.'
    mostrarError(msg)
    btnEl.disabled    = false
    btnEl.textContent = '✓ Iniciar sesión'
  }
}

function mostrarError(msg) {
  const errEl = document.getElementById('loginError')
  errEl.textContent   = '⚠ ' + msg
  errEl.style.display = 'block'
}

function togglePass() {
  const input = document.getElementById('passInput')
  if (!input) return
  input.type = input.type === 'password' ? 'text' : 'password'
}

document.addEventListener('DOMContentLoaded', () => {
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleLogin()
  })
})

window.handleLogin = handleLogin
window.togglePass  = togglePass