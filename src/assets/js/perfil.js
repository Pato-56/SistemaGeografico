/* ============================================================
   perfil.js — Conectado a Supabase
   CORRECCIÓN: Eliminada redefinición local de cerrarSesion.
   sidebar.js ya la expone en window al importarse.
   ============================================================ */
import { supabase } from '../../services/supabase.js'
import { initSidebar } from '../../services/sidebar.js'

async function cargarPerfil() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { data: perfil, error } = await supabase
    .from('usuarios')
    .select('*')
    .eq('auth_user_id', user.id)
    .single()

  if (error || !perfil) return

  const iconosRol = { administrador:'⚙️ Administrador', investigador:'🔬 Investigador', estudiante:'📋 Censador' }
  const inicial   = (perfil.nombre?.[0] ?? '') + (perfil.apellido?.[0] ?? '')

  document.getElementById('pNombre').value   = perfil.nombre   ?? ''
  document.getElementById('pApellido').value = perfil.apellido ?? ''
  document.getElementById('pCorreo').value   = perfil.correo   ?? ''
  document.getElementById('pTelefono').value = perfil.telefono ?? ''
  const rolEl = document.getElementById('pRol')
  if (rolEl) rolEl.value = iconosRol[perfil.rol] ?? perfil.rol

  const hInicial = document.getElementById('perfilInicial')
  const hNombre  = document.getElementById('perfilNombreHeader')
  const hRol     = document.getElementById('perfilRolHeader')
  const hCorreo  = document.getElementById('perfilCorreoHeader')
  if (hInicial) hInicial.textContent = inicial
  if (hNombre)  hNombre.textContent  = `${perfil.nombre} ${perfil.apellido}`
  if (hRol)     hRol.textContent     = iconosRol[perfil.rol] ?? perfil.rol
  if (hCorreo)  hCorreo.textContent  = perfil.correo
}

async function guardarPerfil() {
  const nombre   = document.getElementById('pNombre').value.trim()
  const apellido = document.getElementById('pApellido').value.trim()
  const telefono = document.getElementById('pTelefono').value.trim()
  const pass1    = document.getElementById('pPass1')?.value ?? ''
  const pass2    = document.getElementById('pPass2')?.value ?? ''

  if (!nombre) { showToast('⚠️ El nombre es obligatorio', 'amarillo'); return }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) { window.location.href = '/src/pages/auth/login.html'; return }

  const { error: perfilError } = await supabase
    .from('usuarios')
    .update({ nombre, apellido, telefono })
    .eq('auth_user_id', user.id)

  if (perfilError) { showToast('❌ Error: ' + perfilError.message, 'rojo'); return }

  if (pass1) {
    if (pass1 !== pass2) { showToast('⚠️ Las contraseñas no coinciden', 'amarillo'); return }
    if (pass1.length < 8) { showToast('⚠️ La contraseña debe tener mínimo 8 caracteres', 'amarillo'); return }
    const { error: passError } = await supabase.auth.updateUser({ password: pass1 })
    if (passError) { showToast('❌ Error al cambiar contraseña: ' + passError.message, 'rojo'); return }
  }

  showToast('✅ Perfil actualizado correctamente', 'verde')
}

function togglePass(id) {
  const input = document.getElementById(id)
  if (!input) return
  input.type = input.type === 'password' ? 'text' : 'password'
}

function showToast(msg, tipo = 'verde') {
  const t = document.getElementById('perfilMsg')
  if (!t) return
  t.textContent = msg
  t.style.display = 'block'
  t.style.background = tipo === 'verde' ? 'rgba(39,174,96,0.1)' : tipo === 'rojo' ? 'rgba(192,57,43,0.1)' : 'rgba(243,156,18,0.1)'
  t.style.color      = tipo === 'verde' ? 'var(--verde)' : tipo === 'rojo' ? 'var(--rojo)' : 'var(--amarillo)'
  t.style.border     = `1px solid ${tipo === 'verde' ? 'rgba(39,174,96,0.3)' : tipo === 'rojo' ? 'rgba(192,57,43,0.3)' : 'rgba(243,156,18,0.3)'}`
  setTimeout(() => { t.style.display = 'none' }, 3500)
}

async function init() {
  const perfil = await initSidebar()
  if (!perfil) return
  await cargarPerfil()
}

// cerrarSesion y navegar los expone sidebar.js en window automáticamente
Object.assign(window, { guardarPerfil, togglePass })

init()