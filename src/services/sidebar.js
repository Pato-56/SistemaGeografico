/* ============================================================
   sidebar.js  —  Módulo compartido para sidebar y navbar
   Importar en cualquier página que tenga sidebar o navbar

   CORRECCIONES:
   - Rutas unificadas como absolutas desde /src/ para consistencia
     con el servidor de desarrollo (Vite sirve desde la raíz)
   - cerrarSesion y navegar se exportan Y se exponen en window
     aquí mismo, para que los JS de página NO las redefinan
   ============================================================ */
import { supabase } from './supabase.js'

const iconosRol = {
  administrador: '⚙️ Administrador',
  investigador:  '🔬 Investigador',
  estudiante:    '📋 Censador',
}

// ── Rutas centralizadas ───────────────────────────────────────
// Mantener aquí para que un solo cambio afecte toda la navegación
const RUTAS = {
  dashboard:   '/src/pages/dashboard/dashboard-administrador.html',
  investigador:'/src/pages/dashboard/dashboard-investigador.html',
  censador:    '/src/pages/dashboard/dashboard-censador.html',
  mapa:        '/src/pages/mapa/mapa-censo-hotelero.html',
  hoteles:     '/src/pages/censo/lista-mapa-hoteles.html',
  registro:    '/src/pages/censo/censo-registro-hotel.html',
  usuarios:    '/src/pages/admin/gestion-usuarios.html',
  validar:     '/src/pages/admin/validar-registro.html',
  reportes:    '/src/pages/reportes/reportes.html',
  perfil:      '/src/pages/auth/perfil.html',
  login:       '/src/pages/auth/login.html',
}

/**
 * Carga el perfil del usuario con sesión activa y actualiza
 * el sidebar (sidebarNombre + sidebarRol) o la navbar (navUsuario).
 * Si no hay sesión, redirige al login.
 * @returns {object|null} perfil del usuario
 */
export async function initSidebar() {
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    window.location.href = RUTAS.login
    return null
  }

  const { data: perfil, error } = await supabase
    .from('usuarios')
    .select('*')
    .eq('auth_user_id', user.id)
    .single()

  if (error || !perfil) {
    window.location.href = RUTAS.login
    return null
  }

  // Verificar que la cuenta esté activa
  if (perfil.estado !== 'activo') {
    await supabase.auth.signOut()
    window.location.href = RUTAS.login
    return null
  }

  // ── Sidebar (páginas con <aside>) ────────────────────────
  const nombreEl = document.getElementById('sidebarNombre')
  const rolEl    = document.getElementById('sidebarRol')
  if (nombreEl) nombreEl.textContent = `${perfil.nombre} ${perfil.apellido}`
  if (rolEl)    rolEl.textContent    = iconosRol[perfil.rol] ?? perfil.rol

  // ── Navbar (páginas standalone: mapa, censo-registro) ───
  const navUsuarioEl = document.getElementById('navUsuario')
  const navRolEl     = document.getElementById('navRol')
  const navInicialEl = document.getElementById('navInicial')
  if (navUsuarioEl) navUsuarioEl.textContent = `${perfil.nombre} ${perfil.apellido}`
  if (navRolEl)     navRolEl.textContent     = iconosRol[perfil.rol] ?? perfil.rol
  if (navInicialEl) navInicialEl.textContent = (perfil.nombre?.[0] ?? '') + (perfil.apellido?.[0] ?? '')

  return perfil
}

/**
 * Cierra la sesión y redirige al login.
 */
export async function cerrarSesion() {
  await supabase.auth.signOut()
  window.location.href = RUTAS.login
}

/**
 * Navega a una ruta del sistema.
 * @param {string} destino - Clave del objeto RUTAS
 */
export function navegar(destino) {
  if (RUTAS[destino]) {
    window.location.href = RUTAS[destino]
  } else {
    console.warn(`[sidebar] Ruta desconocida: "${destino}"`)
  }
}

// ── Exponer en window para uso desde atributos HTML (onclick="...") ──
// Esto evita que cada JS de página tenga que redefinirlas
window.cerrarSesion = cerrarSesion
window.navegar      = navegar