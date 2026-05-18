/* ============================================================
   sidebar.js  —  Módulo compartido: sidebar dinámico por rol
   CAMBIOS:
   - El <aside> completo se genera e inyecta desde JS según el rol
   - Cada página solo necesita <aside id="sidebar" class="sidebar"></aside>
   - Los nav-item tienen onclick conectado a navegar()
   - La ruta activa se detecta automáticamente por URL
   - cerrarSesion y navegar se exponen en window
   ============================================================ */
import { supabase } from './supabase.js'

// ── Rutas centralizadas ───────────────────────────────────────
const RUTAS = {
  dashboard:    '/src/pages/dashboard/dashboard-administrador.html',
  investigador: '/src/pages/dashboard/dashboard-investigador.html',
  censador:     '/src/pages/dashboard/dashboard-censador.html',
  mapa:         '/src/pages/mapa/mapa-censo-hotelero.html',
  hoteles:      '/src/pages/censo/lista-mapa-hoteles.html',
  registro:     '/src/pages/censo/censo-registro-hotel.html',
  usuarios:     '/src/pages/admin/gestion-usuarios.html',
  validar:      '/src/pages/admin/validar-registros.html',
  reportes:     '/src/pages/reportes/reportes.html',
  perfil:       '/src/pages/auth/perfil.html',
  login:        '/src/pages/auth/login.html',
}

const ICONOS_ROL = {
  administrador: '⚙️ Administrador',
  investigador:  '🔬 Investigador',
  estudiante:    '📋 Censador',
}

// ── Menús por rol ─────────────────────────────────────────────
const MENU = {
  administrador: [
    { section: 'Principal' },
    { label: 'Dashboard',        icon: '🏠', destino: 'dashboard'    },
    { label: 'Mapa interactivo', icon: '🗺', destino: 'mapa'         },
    { section: 'Gestión' },
    { label: 'Usuarios',         icon: '👥', destino: 'usuarios'     },
    { label: 'Hoteles',          icon: '🏨', destino: 'hoteles'      },
    { label: 'Validar registros',icon: '✅', destino: 'validar'      },
    { label: 'Nuevo registro',   icon: '➕', destino: 'registro'     },
    { section: 'Análisis' },
    { label: 'Reportes',         icon: '📊', destino: 'reportes'     },
    { section: 'Cuenta' },
    { label: 'Mi perfil',        icon: '👤', destino: 'perfil'       },
  ],
  investigador: [
    { section: 'Principal' },
    { label: 'Dashboard',        icon: '🏠', destino: 'investigador' },
    { label: 'Mapa interactivo', icon: '🗺', destino: 'mapa'         },
    { section: 'Gestión' },
    { label: 'Validar registros',icon: '📋', destino: 'validar', badgeId: 'sidebarBadge' },
    { label: 'Lista de hoteles', icon: '🏨', destino: 'hoteles'      },
    { section: 'Análisis' },
    { label: 'Reportes',         icon: '📊', destino: 'reportes'     },
    { section: 'Cuenta' },
    { label: 'Mi perfil',        icon: '👤', destino: 'perfil'       },
  ],
  estudiante: [
    { section: 'Principal' },
    { label: 'Dashboard',       icon: '🏠', destino: 'censador'      },
    { label: 'Mapa de hoteles', icon: '🗺', destino: 'mapa'          },
    { section: 'Mis registros' },
    { label: 'Nuevo registro',  icon: '➕', destino: 'registro'      },
    { label: 'Mis registros',   icon: '📋', destino: 'hoteles', badgeId: 'sidebarBadge' },
    { section: 'Cuenta' },
    { label: 'Mi perfil',       icon: '👤', destino: 'perfil'        },
  ],
}

// ── Detectar ruta activa por nombre de archivo ────────────────
function esActivo(destino) {
  const rutaDestino = RUTAS[destino] ?? ''
  const archivoDestino = rutaDestino.split('/').pop()
  const archivoActual  = window.location.pathname.split('/').pop()
  return archivoDestino === archivoActual
}

// ── Generar HTML interno del <aside> ──────────────────────────
function generarSidebar(perfil) {
  const items   = MENU[perfil.rol] ?? MENU.estudiante
  const inicial = (perfil.nombre?.[0] ?? '') + (perfil.apellido?.[0] ?? '')

  let navHTML = ''
  for (const item of items) {
    if (item.section) {
      navHTML += `
        <div class="nav-section-label" style="margin-top:8px;">
          ${item.section}
        </div>`
      continue
    }
    const activo    = esActivo(item.destino) ? 'active' : ''
    const badgeHTML = item.badgeId
      ? `<span class="nav-item-badge" id="${item.badgeId}">0</span>`
      : ''
    navHTML += `
      <div class="nav-item ${activo}" onclick="navegar('${item.destino}')">
        <span class="nav-icon">${item.icon}</span>
        ${item.label}
        ${badgeHTML}
      </div>`
  }

  return `
    <div class="sidebar-logo">
      <div class="escudo escudo--sm">UAG</div>
      <div style="display:flex;flex-direction:column;">
        <span style="font-family:var(--font-serif);font-size:13px;font-weight:700;
                     color:white;line-height:1.3;">Censo Hotelero</span>
        <span style="font-size:10px;color:rgba(200,215,255,0.5);letter-spacing:1px;
                     text-transform:uppercase;margin-top:2px;">Acapulco · UAGro</span>
      </div>
    </div>

    <div class="sidebar-user" style="cursor:pointer;" onclick="navegar('perfil')"
         title="Ver mi perfil">
      <div class="user-avatar"
           style="background:var(--rojo);color:white;font-size:13px;font-weight:700;">
        ${inicial}
      </div>
      <div class="user-info">
        <div class="name" id="sidebarNombre">${perfil.nombre} ${perfil.apellido}</div>
        <div class="role" id="sidebarRol">${ICONOS_ROL[perfil.rol] ?? perfil.rol}</div>
      </div>
    </div>

    <nav class="sidebar-nav">
      ${navHTML}
    </nav>

    <div class="sidebar-bottom">
      <button class="btn-logout" onclick="cerrarSesion()">
        <span class="nav-icon">🚪</span> Cerrar sesión
      </button>
    </div>
  `
}

// ── initSidebar ───────────────────────────────────────────────
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

  if (perfil.estado !== 'activo') {
    await supabase.auth.signOut()
    window.location.href = RUTAS.login
    return null
  }

  // Inyectar sidebar generado en el <aside id="sidebar">
  const aside = document.getElementById('sidebar')
  if (aside) {
    aside.innerHTML = generarSidebar(perfil)
  }

  return perfil
}

// ── Sesión y navegación ───────────────────────────────────────
export async function cerrarSesion() {
  await supabase.auth.signOut()
  window.location.href = RUTAS.login
}

export function navegar(destino) {
  if (RUTAS[destino]) {
    window.location.href = RUTAS[destino]
  } else {
    console.warn(`[sidebar] Ruta desconocida: "${destino}"`)
  }
}

window.cerrarSesion = cerrarSesion
window.navegar      = navegar