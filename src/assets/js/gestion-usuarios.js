/* ============================================================
   gestion-usuarios.js — Conectado a Supabase
   CORRECCIÓN: guardarUsuario ahora usa supabase.auth.signUp()
   en lugar de auth.admin (que requiere Service Role Key).
   ============================================================ */
import { supabase } from '../../services/supabase.js'
import { initSidebar } from '../../services/sidebar.js'

let usuarios     = []
let filtroActivo = 'todos'
let paginaActual = 1
const porPagina  = 6
let editandoId   = null
let pendingAction= null

const coloresRol   = { administrador:'#7d3c98', investigador:'#2d5bbf', estudiante:'#27ae60' }
const iconosRol    = { administrador:'⚙️', investigador:'🔬', estudiante:'📋' }
const labelsRol    = { administrador:'Administrador', investigador:'Investigador', estudiante:'Censador' }
const labelsEstado = { activo:'Activo', inactivo:'Inactivo', pendiente:'Pendiente' }
const iconosEstado = { activo:'🟢', inactivo:'🔴', pendiente:'⏳' }

document.getElementById('fechaHoy').textContent =
  new Date().toLocaleDateString('es-MX', { weekday:'long', day:'numeric', month:'long', year:'numeric' })

// ── Cargar usuarios ───────────────────────────────────────────
async function cargarUsuarios() {
  const { data, error } = await supabase
    .from('usuarios')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) { console.error(error); return }
  usuarios = data
  updateKpis()
  renderTabla()
}

function updateKpis() {
  document.getElementById('kTotal').textContent      = usuarios.length
  document.getElementById('kActivos').textContent    = usuarios.filter(u => u.estado === 'activo').length
  document.getElementById('kPendientes').textContent = usuarios.filter(u => u.estado === 'pendiente').length
  document.getElementById('kCensadores').textContent = usuarios.filter(u => u.rol === 'estudiante' && u.estado === 'activo').length
}

function getFiltered() {
  const q = document.getElementById('searchInput').value.toLowerCase()
  return usuarios.filter(u => {
    const nombre = `${u.nombre} ${u.apellido}`.toLowerCase()
    const mQ = nombre.includes(q) || u.correo.toLowerCase().includes(q)
    const mF = filtroActivo === 'todos' || u.rol === filtroActivo ||
               (filtroActivo === 'inactivo' && u.estado === 'inactivo') ||
               (filtroActivo === 'pendiente' && u.estado === 'pendiente')
    return mQ && mF
  })
}

function getInitials(nombre, apellido) {
  return ((nombre?.[0] ?? '') + (apellido?.[0] ?? '')).toUpperCase()
}

function renderTabla() {
  const data  = getFiltered()
  const total = data.length
  const start = (paginaActual - 1) * porPagina
  const page  = data.slice(start, start + porPagina)

  document.getElementById('tableBody').innerHTML = page.map(u => `
    <tr>
      <td>
        <div class="user-cell">
          <div class="user-initials" style="background:${coloresRol[u.rol] ?? '#888'};">
            ${getInitials(u.nombre, u.apellido)}
          </div>
          <div class="user-cell-info">
            <div class="uname">${u.nombre} ${u.apellido}</div>
            <div class="uemail">${u.correo}</div>
          </div>
        </div>
      </td>
      <td><span class="badge-rol ${u.rol}">${iconosRol[u.rol] ?? '👤'} ${labelsRol[u.rol] ?? u.rol}</span></td>
      <td style="font-weight:600;text-align:center;">—</td>
      <td style="font-size:12px;color:#7a8aaa;">—</td>
      <td><span class="badge-estado ${u.estado}">${iconosEstado[u.estado]} ${labelsEstado[u.estado]}</span></td>
      <td>
        <div class="action-btns">
          <button class="btn-act editar"   onclick="editarUsuario('${u.id}')">✎ Editar</button>
          ${u.estado === 'activo'
            ? `<button class="btn-act desact"  onclick="confirmarAccion('desactivar','${u.id}')">✕ Desact.</button>`
            : `<button class="btn-act activar" onclick="confirmarAccion('activar','${u.id}')">✓ Activar</button>`}
          <button class="btn-act eliminar" onclick="confirmarAccion('eliminar','${u.id}')">🗑</button>
        </div>
      </td>
    </tr>
  `).join('')

  document.getElementById('footerInfo').textContent =
    `Mostrando ${total ? start + 1 : 0}–${Math.min(start + porPagina, total)} de ${total} usuarios`

  const totalPags = Math.ceil(total / porPagina)
  const pag = document.getElementById('paginacion')
  pag.innerHTML = ''
  for (let i = 1; i <= totalPags; i++) {
    const b = document.createElement('button')
    b.className = 'page-btn' + (i === paginaActual ? ' active' : '')
    b.textContent = i
    b.onclick = () => { paginaActual = i; renderTabla() }
    pag.appendChild(b)
  }
  updateKpis()
}

function setFiltro(el) {
  const coloresActivo = {
    todos:         { bg: 'var(--azul-oscuro)', border: 'var(--azul-oscuro)' },
    administrador: { bg: '#7d3c98',            border: '#7d3c98'            },
    investigador:  { bg: 'var(--azul-claro)',  border: 'var(--azul-claro)'  },
    estudiante:    { bg: 'var(--verde)',        border: 'var(--verde)'       },
    pendiente:     { bg: 'var(--amarillo)',     border: 'var(--amarillo)'    },
    inactivo:      { bg: '#7a8aaa',            border: '#7a8aaa'            },
  }

  document.querySelectorAll('[id^="chip-"]').forEach(b => {
    b.style.background  = 'white'
    b.style.borderColor = 'var(--gris-borde)'
    b.style.color       = '#7a8aaa'
  })

  const c = coloresActivo[el.dataset.f] ?? coloresActivo.todos
  el.style.background  = c.bg
  el.style.borderColor = c.border
  el.style.color       = 'white'

  filtroActivo = el.dataset.f
  paginaActual = 1
  renderTabla()
}

// ── Modal crear / editar ──────────────────────────────────────
function abrirModal(id = null) {
  editandoId = id
  document.getElementById('modalTitulo').textContent    = id ? 'Editar Usuario' : 'Nuevo Usuario'
  document.getElementById('modalSubtitulo').textContent = id ? 'Modifica los datos del usuario' : 'Completa los datos para registrar un nuevo acceso'
  if (id) {
    const u = usuarios.find(x => x.id === id)
    document.getElementById('mNombre').value   = u.nombre
    document.getElementById('mApellido').value = u.apellido
    document.getElementById('mCorreo').value   = u.correo
    document.getElementById('mRol').value      = u.rol
    document.getElementById('mTel').value      = u.telefono ?? ''
    document.getElementById('mEstado').value   = u.estado
    document.getElementById('mPass').value     = ''
  } else {
    ;['mNombre','mApellido','mCorreo','mTel','mPass'].forEach(i => document.getElementById(i).value = '')
    document.getElementById('mRol').value    = ''
    document.getElementById('mEstado').value = 'activo'
  }
  document.getElementById('modalOverlay').classList.add('open')
}

function editarUsuario(id) { abrirModal(id) }
function cerrarModal() { document.getElementById('modalOverlay').classList.remove('open') }
function cerrarModalOverlay(e) { if (e.target === document.getElementById('modalOverlay')) cerrarModal() }

// ── Guardar usuario ───────────────────────────────────────────
async function guardarUsuario() {
  const nombre   = document.getElementById('mNombre').value.trim()
  const apellido = document.getElementById('mApellido').value.trim()
  const correo   = document.getElementById('mCorreo').value.trim()
  const rol      = document.getElementById('mRol').value
  const tel      = document.getElementById('mTel').value.trim()
  const estado   = document.getElementById('mEstado').value
  const pass     = document.getElementById('mPass').value

  if (!nombre || !correo || !rol) {
    showToast('⚠️ Completa los campos obligatorios', 'amarillo')
    return
  }

  // ── EDITAR usuario existente ──────────────────────────────
  if (editandoId) {
    const { error } = await supabase
      .from('usuarios')
      .update({ nombre, apellido, correo, rol, telefono: tel, estado })
      .eq('id', editandoId)

    if (error) { showToast('❌ Error: ' + error.message, 'rojo'); return }
    showToast('✅ Usuario actualizado correctamente', 'verde')
    cerrarModal()
    await cargarUsuarios()
    return
  }

  // ── CREAR usuario nuevo con signUp ────────────────────────
  if (!pass || pass.length < 8) {
    showToast('⚠️ La contraseña debe tener al menos 8 caracteres', 'amarillo')
    return
  }

  // Validar formato de correo antes de cualquier llamada a Supabase
  const formatoEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!formatoEmail.test(correo)) {
    showToast('⚠️ El formato del correo no es válido', 'amarillo')
    return
  }

  // Verificar si el correo ya existe en la tabla usuarios
  const { data: existente } = await supabase
    .from('usuarios')
    .select('id')
    .eq('correo', correo)
    .maybeSingle()

  if (existente) {
    showToast('❌ Ya existe un usuario registrado con ese correo', 'rojo')
    return
  }

  const btnEl = document.getElementById('modalOverlay').querySelector('.btn-primary')
  if (btnEl) { btnEl.disabled = true; btnEl.textContent = 'Guardando…' }

  try {
    // 1. Crear en Supabase Auth con signUp
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email:    correo,
      password: pass,
      options: {
        data: { nombre, apellido },
        // emailRedirectTo evita que Supabase envíe email de confirmación
        // si tienes desactivado "Confirm email" en el dashboard de Supabase
      },
    })

    if (authError) throw authError
    if (!authData.user) throw new Error('No se pudo crear el usuario en Auth.')

    // 2. Insertar en la tabla usuarios con el auth_user_id
    const { error: perfilError } = await supabase
      .from('usuarios')
      .insert({
        auth_user_id: authData.user.id,
        nombre,
        apellido,
        correo,
        rol,
        telefono: tel || null,
        estado,
      })

    if (perfilError) throw perfilError

    showToast('✅ Usuario creado correctamente', 'verde')
    cerrarModal()
    await cargarUsuarios()

  } catch (err) {
    // Mensajes de error comunes de Supabase Auth traducidos
    const mensajes = {
      'User already registered':          'Ya existe un usuario con ese correo.',
      'Password should be at least 6':    'La contraseña debe tener al menos 6 caracteres.',
      'Unable to validate email address': 'El formato del correo no es válido.',
      'Email rate limit exceeded':        'Demasiados intentos. Espera unos minutos.',
    }
    const msg = mensajes[err.message] ?? err.message ?? 'Error al crear el usuario.'
    showToast('❌ ' + msg, 'rojo')
  } finally {
    if (btnEl) { btnEl.disabled = false; btnEl.textContent = '✓ Guardar usuario' }
  }
}

// ── Confirmación acciones ─────────────────────────────────────
function confirmarAccion(accion, id) {
  const u = usuarios.find(x => x.id === id)
  const configs = {
    activar:    { icon:'✅', titulo:'¿Activar usuario?',    texto:`Se habilitará el acceso de <strong>${u.nombre}</strong>.`,    ok:'Sí, activar',    color:'var(--verde)' },
    desactivar: { icon:'🔴', titulo:'¿Desactivar usuario?', texto:`Se bloqueará el acceso de <strong>${u.nombre}</strong>.`,      ok:'Sí, desactivar', color:'var(--rojo)'  },
    eliminar:   { icon:'🗑',  titulo:'¿Eliminar usuario?',  texto:`Se eliminará permanentemente a <strong>${u.nombre}</strong>.`, ok:'Sí, eliminar',   color:'var(--rojo)'  },
  }
  const c = configs[accion]
  document.getElementById('confirmIcon').textContent   = c.icon
  document.getElementById('confirmTitulo').textContent = c.titulo
  document.getElementById('confirmTexto').innerHTML    = c.texto
  document.getElementById('confirmOkBtn').textContent  = c.ok
  document.getElementById('confirmOkBtn').style.background = c.color
  pendingAction = { accion, id }
  document.getElementById('confirmOverlay').classList.add('open')
}

document.getElementById('confirmOkBtn').onclick = async () => {
  if (!pendingAction) return
  const { accion, id } = pendingAction
  let error = null

  if (accion === 'activar') {
    ;({ error } = await supabase.from('usuarios').update({ estado: 'activo' }).eq('id', id))
    if (!error) showToast('✅ Usuario activado', 'verde')
  } else if (accion === 'desactivar') {
    ;({ error } = await supabase.from('usuarios').update({ estado: 'inactivo' }).eq('id', id))
    if (!error) showToast('🔴 Usuario desactivado', 'rojo')
  } else if (accion === 'eliminar') {
    ;({ error } = await supabase.from('usuarios').delete().eq('id', id))
    if (!error) showToast('🗑 Usuario eliminado', 'rojo')
  }

  if (error) showToast('❌ Error: ' + error.message, 'rojo')
  cerrarConfirm()
  await cargarUsuarios()
}

function cerrarConfirm() {
  document.getElementById('confirmOverlay').classList.remove('open')
  pendingAction = null
}
function cerrarConfirmOverlay(e) {
  if (e.target === document.getElementById('confirmOverlay')) cerrarConfirm()
}

function showToast(msg, tipo = 'verde') {
  const t = document.getElementById('toast')
  document.getElementById('toastMsg').textContent = msg
  t.className = `toast ${tipo} show`
  setTimeout(() => t.classList.remove('show'), 3200)
}

// ── Inicializar ───────────────────────────────────────────────
async function init() {
  const perfil = await initSidebar()
  if (!perfil) return
  cargarUsuarios()
}

// cerrarSesion y navegar los expone sidebar.js en window automáticamente
Object.assign(window, {
  setFiltro, abrirModal, editarUsuario, cerrarModal, cerrarModalOverlay,
  guardarUsuario, confirmarAccion, cerrarConfirm, cerrarConfirmOverlay, showToast,
})

init()