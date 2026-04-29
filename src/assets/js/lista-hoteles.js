/* ============================================================
   lista-hoteles.js — Conectado a Supabase
   CORRECCIONES:
   - Eliminada redefinición local de cerrarSesion (la provee sidebar.js)
   - Corregido bug: variable 'u' no definida en accionValidar,
     validarDirecto y rechazarDirecto → ahora usa supabase.auth.getUser()
   - Object.assign no incluye cerrarSesion ni navegar (sidebar.js los expone)
   ============================================================ */
import { supabase } from '../../services/supabase.js'
import { initSidebar } from '../../services/sidebar.js'

let hoteles        = []
let filtroActivo   = 'todos'
let currentPage    = 1
let currentHotelId = null
const rowsPerPage  = 8

let modalMap    = null
let modalMarker = null

const labelsOp = { abierto: 'En Operación', parcial: 'Parcial',    cerrado: 'Cerrado'     }
const labelsVal = { validado: 'Validado',    pendiente: 'Pendiente', rechazado: 'Rechazado' }
const iconsOp   = { abierto: '🟢',          parcial: '🟡',          cerrado: '🔴'           }
const iconsVal  = { validado: '✅',          pendiente: '⏳',         rechazado: '❌'         }

// ── Cargar hoteles desde Supabase ─────────────────────────────
async function cargarHoteles() {
  const { data, error } = await supabase
    .from('hoteles')
    .select(`
      id, nombre, razon_social, habitaciones, pisos,
      telefono, encargado, direccion, latitud, longitud,
      estado_operativo, notas, created_at,
      zonas_turisticas ( nombre ),
      levantamientos (
        id, estado_validacion, fecha_levantamiento,
        usuarios!censador_id ( nombre, apellido )
      )
    `)
    .order('nombre')

  if (error) { console.error(error); return }

  hoteles = data.map(h => {
    const lev = h.levantamientos?.slice(-1)[0]
    return {
      id:        h.id,
      nombre:    h.nombre,
      razon:     h.razon_social ?? '—',
      zona:      h.zonas_turisticas?.nombre ?? 'Sin zona',
      hab:       h.habitaciones ?? 0,
      pisos:     h.pisos ?? 0,
      estadoOp:  h.estado_operativo,
      estadoVal: lev?.estado_validacion ?? 'pendiente',
      censador:  lev ? `${lev.usuarios?.nombre ?? ''} ${lev.usuarios?.apellido ?? ''}`.trim() : '—',
      fecha:     lev?.fecha_levantamiento ?? h.created_at?.split('T')[0] ?? '—',
      dir:       h.direccion ?? '—',
      telefono:  h.telefono ?? '—',
      encargado: h.encargado ?? '—',
      lat:       parseFloat(h.latitud)  || 16.849,
      lng:       parseFloat(h.longitud) || -99.899,
      notas:     h.notas ?? '—',
      levId:     lev?.id ?? null,
    }
  })

  renderTabla()
}

// ── Filtrar ───────────────────────────────────────────────────
function getFiltered() {
  const q = document.getElementById('searchInput').value.toLowerCase()
  return hoteles.filter(h => {
    const mS = h.nombre.toLowerCase().includes(q) || h.censador.toLowerCase().includes(q)
    const mF = filtroActivo === 'todos' || h.estadoVal === filtroActivo || h.estadoOp === filtroActivo
    return mS && mF
  })
}

// ── Renderizar tabla ──────────────────────────────────────────
function renderTabla() {
  const filtered = getFiltered()
  const total    = filtered.length
  const start    = (currentPage - 1) * rowsPerPage
  const page     = filtered.slice(start, start + rowsPerPage)

  document.getElementById('tableBody').innerHTML = page.length
    ? page.map((h, i) => `
        <tr onclick="openModal('${h.id}')">
          <td style="color:#9baabe;font-size:12px;">${start + i + 1}</td>
          <td>
            <div style="font-weight:600;font-size:14px;">${h.nombre}</div>
            <div style="font-size:12px;color:#7a8aaa;">${h.razon}</div>
          </td>
          <td><span class="zona-tag">${h.zona}</span></td>
          <td style="font-weight:600;">${h.hab}</td>
          <td><span class="badge-op ${h.estadoOp}">${iconsOp[h.estadoOp]} ${labelsOp[h.estadoOp]}</span></td>
          <td><span class="badge-val ${h.estadoVal}">${iconsVal[h.estadoVal]} ${labelsVal[h.estadoVal]}</span></td>
          <td style="font-size:12px;">${h.censador}</td>
          <td style="font-size:12px;color:#7a8aaa;">${h.fecha}</td>
          <td>
            <div style="display:flex;gap:6px;justify-content:center;" onclick="event.stopPropagation()">
              <button style="width:32px;height:32px;border-radius:8px;background:rgba(45,91,191,0.12);border:none;cursor:pointer;font-size:14px;" title="Ver"     onclick="openModal('${h.id}')">👁</button>
              <button style="width:32px;height:32px;border-radius:8px;background:rgba(39,174,96,0.12);border:none;cursor:pointer;font-size:14px;" title="Validar"  onclick="validarDirecto('${h.id}')">✓</button>
              <button style="width:32px;height:32px;border-radius:8px;background:rgba(192,57,43,0.1);border:none;cursor:pointer;font-size:14px;"  title="Rechazar" onclick="rechazarDirecto('${h.id}')">✕</button>
            </div>
          </td>
        </tr>`)
      .join('')
    : `<tr><td colspan="9" style="text-align:center;padding:30px;color:#9baabe;">Sin resultados</td></tr>`

  document.getElementById('paginationInfo').textContent =
    `Mostrando ${total ? start + 1 : 0}–${Math.min(start + rowsPerPage, total)} de ${total} registros`

  const totalPages = Math.ceil(total / rowsPerPage)
  const btns = document.getElementById('paginationBtns')
  btns.innerHTML = ''
  for (let p = 1; p <= totalPages; p++) {
    const b = document.createElement('button')
    b.className = 'page-btn' + (p === currentPage ? ' active' : '')
    b.textContent = p
    b.onclick = () => { currentPage = p; renderTabla() }
    btns.appendChild(b)
  }

  document.getElementById('countTotal').textContent     = hoteles.length
  document.getElementById('countValidado').textContent  = hoteles.filter(h => h.estadoVal === 'validado').length
  document.getElementById('countPendiente').textContent = hoteles.filter(h => h.estadoVal === 'pendiente').length
  document.getElementById('countRechazado').textContent = hoteles.filter(h => h.estadoVal === 'rechazado').length
}

function setFilter(el) {
  document.querySelectorAll('.filter-chip').forEach(c => c.className = 'filter-chip')
  filtroActivo = el.dataset.filter
  const cls = {
    todos: 'active', validado: 'active-green', pendiente: 'active-yellow',
    rechazado: 'active-red', abierto: 'active-green', parcial: 'active-yellow', cerrado: 'active-red',
  }
  el.classList.add(cls[filtroActivo] || 'active')
  currentPage = 1
  renderTabla()
}

// ── Modal detalle ─────────────────────────────────────────────
function initModalMap(lat, lng) {
  if (!modalMap) {
    modalMap = L.map('modalMinimap', { zoomControl: false, dragging: false, scrollWheelZoom: false })
      .setView([lat, lng], 15)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
      { attribution: '© OpenStreetMap © CARTO', maxZoom: 19 }).addTo(modalMap)
  } else {
    modalMap.setView([lat, lng], 15)
  }
  if (modalMarker) modalMap.removeLayer(modalMarker)
  modalMarker = L.marker([lat, lng], {
    icon: L.divIcon({
      className: '',
      html: `<div style="width:16px;height:16px;border-radius:50%;background:#c0392b;border:2.5px solid white;box-shadow:0 3px 8px rgba(0,0,0,0.4);"></div>`,
      iconSize: [16, 16], iconAnchor: [8, 8],
    })
  }).addTo(modalMap)
  setTimeout(() => modalMap.invalidateSize(), 100)
}

function openModal(id) {
  const h = hoteles.find(x => x.id === id)
  if (!h) return
  currentHotelId = id

  document.getElementById('mNombre').textContent   = h.nombre
  document.getElementById('mRazon').textContent    = h.razon
  document.getElementById('mBadgeOp').innerHTML    = `<span class="badge-op ${h.estadoOp}">${iconsOp[h.estadoOp]} ${labelsOp[h.estadoOp]}</span>`
  document.getElementById('mBadgeVal').innerHTML   = `<span class="badge-val ${h.estadoVal}">${iconsVal[h.estadoVal]} ${labelsVal[h.estadoVal]}</span>`
  document.getElementById('mNombreD').textContent  = h.nombre
  document.getElementById('mRazonD').textContent   = h.razon
  document.getElementById('mTelefono').textContent = h.telefono
  document.getElementById('mEncargado').textContent = h.encargado
  document.getElementById('mHab').textContent       = h.hab
  document.getElementById('mPisos').textContent     = h.pisos
  document.getElementById('mZonaStat').textContent  = h.zona
  document.getElementById('mEstadoOpDetalle').innerHTML =
    `<span class="badge-op ${h.estadoOp}" style="font-size:13px;padding:7px 16px;">${iconsOp[h.estadoOp]} ${labelsOp[h.estadoOp]}</span>`
  document.getElementById('mCensador').textContent  = h.censador
  document.getElementById('mFecha').textContent     = h.fecha
  document.getElementById('mDir').textContent       = h.dir
  document.getElementById('mNotas').textContent     = h.notas
  document.getElementById('mLat').textContent       = h.lat.toFixed(6)
  document.getElementById('mLng').textContent       = h.lng.toFixed(6)
  document.getElementById('mEstadoValDetalle').innerHTML =
    `<span class="badge-val ${h.estadoVal}" style="font-size:13px;padding:7px 16px;">${iconsVal[h.estadoVal]} ${labelsVal[h.estadoVal]}</span>`

  document.getElementById('modalOverlay').classList.add('open')
  setTimeout(() => initModalMap(h.lat, h.lng), 150)
}

function closeModal(e) {
  if (e.target === document.getElementById('modalOverlay'))
    document.getElementById('modalOverlay').classList.remove('open')
}
function closeModalBtn() {
  document.getElementById('modalOverlay').classList.remove('open')
}

// ── Validar / Rechazar desde modal ────────────────────────────
// CORRECCIÓN: 'u' no estaba definida, ahora se obtiene el usuario activo
async function accionValidar(decision) {
  const h = hoteles.find(x => x.id === currentHotelId)
  if (!h?.levId) return

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const { data: perfil } = await supabase.from('usuarios').select('id').eq('auth_user_id', user.id).single()

  await supabase.from('levantamientos').update({
    estado_validacion:     decision,
    validado_por:          perfil.id,
    fecha_validacion:      new Date().toISOString(),
    comentario_validacion: decision === 'rechazado' ? 'Revisado desde lista de hoteles.' : 'Validado.',
  }).eq('id', h.levId)

  closeModalBtn()
  await cargarHoteles()
}

// CORRECCIÓN: mismo fix de variable 'u' no definida
async function validarDirecto(id) {
  const h = hoteles.find(x => x.id === id)
  if (!h?.levId) return
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const { data: perfil } = await supabase.from('usuarios').select('id').eq('auth_user_id', user.id).single()
  await supabase.from('levantamientos').update({
    estado_validacion: 'validado',
    validado_por:      perfil.id,
    fecha_validacion:  new Date().toISOString(),
  }).eq('id', h.levId)
  await cargarHoteles()
}

async function rechazarDirecto(id) {
  const h = hoteles.find(x => x.id === id)
  if (!h?.levId) return
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const { data: perfil } = await supabase.from('usuarios').select('id').eq('auth_user_id', user.id).single()
  await supabase.from('levantamientos').update({
    estado_validacion:     'rechazado',
    validado_por:          perfil.id,
    fecha_validacion:      new Date().toISOString(),
    comentario_validacion: 'Rechazado desde lista de hoteles.',
  }).eq('id', h.levId)
  await cargarHoteles()
}

function exportExcel() { alert('📊 Usa la pantalla de Reportes para exportar a Excel.') }
function exportPDF()   { alert('📄 Usa la pantalla de Reportes para exportar a PDF.') }

// ── Inicializar ───────────────────────────────────────────────
async function init() {
  const perfil = await initSidebar()
  if (!perfil) return
  cargarHoteles()
}

// cerrarSesion y navegar los expone sidebar.js en window automáticamente
Object.assign(window, { setFilter, openModal, closeModal, closeModalBtn, accionValidar, validarDirecto, rechazarDirecto, exportExcel, exportPDF })

init()