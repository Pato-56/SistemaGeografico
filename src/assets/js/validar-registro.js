/* ============================================================
   validar-registro.js — Conectado a Supabase
   CORRECCIÓN: Eliminada redefinición local de cerrarSesion.
   sidebar.js ya la expone en window al importarse.
   ============================================================ */
import { supabase } from '../../services/supabase.js'
import { initSidebar } from '../../services/sidebar.js'

let levantamientos = []
let filtroActivo   = 'todos'
let selectedId     = null
let detalleMap     = null
let perfilActual   = null

document.getElementById('fechaHoy').textContent =
  new Date().toLocaleDateString('es-MX', { weekday:'long', day:'numeric', month:'long', year:'numeric' })

async function cargarLevantamientos() {
  const { data, error } = await supabase
    .from('v_levantamientos_completo')
    .select('*')
    .order('fecha_levantamiento', { ascending: false })

  if (error) { console.error(error); return }
  levantamientos = data ?? []
  updateStats()
  renderLista()
  if (!selectedId && levantamientos.find(l => l.estado_validacion === 'pendiente')) {
    selectLev(levantamientos.find(l => l.estado_validacion === 'pendiente').id)
  }
}

function updateStats() {
  document.getElementById('wPendientes').textContent  = levantamientos.filter(l => l.estado_validacion === 'pendiente').length
  document.getElementById('wValidados').textContent   = levantamientos.filter(l => l.estado_validacion === 'validado').length
  document.getElementById('wRechazados').textContent  = levantamientos.filter(l => l.estado_validacion === 'rechazado').length
  document.getElementById('sidebarBadge').textContent = levantamientos.filter(l => l.estado_validacion === 'pendiente').length
}

function getFilteredList() {
  const q = (document.getElementById('listSearch')?.value ?? '').toLowerCase()
  return levantamientos.filter(l => {
    const mQ = l.hotel_nombre?.toLowerCase().includes(q) || l.censador_nombre?.toLowerCase().includes(q)
    const mF = filtroActivo === 'todos' || l.estado_validacion === filtroActivo
    return mQ && mF
  })
}

function setListFiltro(el) {
  document.querySelectorAll('.lf-chip').forEach(c => c.className = 'lf-chip')
  filtroActivo = el.dataset.f
  const cls = { todos:'a-todos', pendiente:'a-parcia', validado:'a-abiert', rechazado:'a-cerrad' }
  el.classList.add(cls[filtroActivo] || 'a-todos')
  renderLista()
}

const iconsOp  = { abierto:'🟢', parcial:'🟡', cerrado:'🔴' }
const iconsVal = { pendiente:'⏳', validado:'✅', rechazado:'❌' }

function renderLista() {
  const data = getFilteredList()
  document.getElementById('listCount').textContent = data.length
  document.getElementById('listItems').innerHTML = data.length
    ? data.map(l => `
        <div class="list-item ${l.id === selectedId ? 'selected' : ''}" onclick="selectLev('${l.id}')">
          <div class="li-estado-dot ${l.estado_operativo ?? 'abierto'}"></div>
          <div class="li-info">
            <div class="li-nombre">${l.hotel_nombre}</div>
            <div class="li-meta">
              <span class="li-zona">${l.zona}</span>
              <span>${iconsVal[l.estado_validacion]} ${l.estado_validacion.charAt(0).toUpperCase() + l.estado_validacion.slice(1)}</span>
              <span>🛏 ${l.habitaciones ?? '—'}</span>
            </div>
            <div class="li-fecha">Censador: ${l.censador_nombre ?? '—'} · ${l.fecha_levantamiento}</div>
          </div>
        </div>`)
      .join('')
    : '<div style="padding:40px;text-align:center;color:#9baabe;font-size:13px;">Sin resultados</div>'

  const idx = data.findIndex(l => l.id === selectedId)
  document.getElementById('npInfo').textContent = idx >= 0 ? `${idx + 1} de ${data.length}` : `${data.length} registros`
  document.getElementById('btnAnterior').disabled  = idx <= 0
  document.getElementById('btnSiguiente').disabled = idx < 0 || idx >= data.length - 1
}

function navAnterior()  { const d = getFilteredList(); const i = d.findIndex(l => l.id === selectedId); if (i > 0) selectLev(d[i - 1].id) }
function navSiguiente() { const d = getFilteredList(); const i = d.findIndex(l => l.id === selectedId); if (i >= 0 && i < d.length - 1) selectLev(d[i + 1].id) }
function selectLev(id) { selectedId = id; renderLista(); renderDetalle() }

function renderDetalle() {
  const l = levantamientos.find(x => x.id === selectedId)
  if (!l) return
  const panel = document.getElementById('detailPanel')
  const iconsOpLabel = { abierto:'🟢 En Operación', parcial:'🟡 Operación Parcial', cerrado:'🔴 Cerrado' }

  panel.innerHTML = `
    <div class="detail-card">
      <div class="detail-header">
        <div class="dh-inner">
          <div class="dh-info"><h3>${l.hotel_nombre}</h3><p>${l.razon_social ?? '—'}</p></div>
        </div>
        <div class="dh-badges">
          <div class="dh-badge ${l.estado_operativo ?? 'abierto'}">${iconsOpLabel[l.estado_operativo] ?? '—'}</div>
          <div class="dh-badge zona">📍 ${l.zona}</div>
        </div>
      </div>
      <div class="detail-stats">
        <div class="ds-item"><div class="ds-val">${l.habitaciones ?? '—'}</div><div class="ds-lbl">Habitaciones</div></div>
        <div class="ds-item"><div class="ds-val">${l.fecha_levantamiento}</div><div class="ds-lbl">Fecha</div></div>
        <div class="ds-item"><div class="ds-val">${l.estado_validacion.charAt(0).toUpperCase() + l.estado_validacion.slice(1)}</div><div class="ds-lbl">Estado</div></div>
      </div>
      <div class="detail-section">
        <div class="ds-title">Datos del Levantamiento</div>
        <div class="ds-grid">
          <div class="ds-field"><div class="ds-label">Censador</div><div class="ds-value">${l.censador_nombre ?? '—'}</div></div>
          <div class="ds-field"><div class="ds-label">Fecha</div><div class="ds-value">${l.fecha_levantamiento}</div></div>
          <div class="ds-field full"><div class="ds-label">Observaciones</div><div class="ds-value" style="font-size:13px;color:#5a6a8a;font-style:italic;">${l.observaciones ?? '—'}</div></div>
          ${l.latitud  ? `<div class="ds-field"><div class="ds-label">Latitud</div><div class="ds-value">${parseFloat(l.latitud).toFixed(6)}</div></div>` : ''}
          ${l.longitud ? `<div class="ds-field"><div class="ds-label">Longitud</div><div class="ds-value">${parseFloat(l.longitud).toFixed(6)}</div></div>` : ''}
        </div>
      </div>
    </div>
    <div class="validation-card">
      <div class="val-header"><div class="val-accent"></div><div class="val-title">Panel de Validación</div></div>
      <div class="val-body">
        <div>
          <div class="field-label" style="margin-bottom:10px;"><span class="dot"></span>Comentario para el censador</div>
          <textarea class="val-textarea" id="valComentario" placeholder="Escribe una observación o motivo de rechazo…">${l.comentario_validacion ?? ''}</textarea>
        </div>
        ${l.estado_validacion === 'pendiente' ? `
          <div class="val-actions">
            <button class="btn-danger"  onclick="accion('rechazado','${l.id}')">✕ Rechazar</button>
            <button class="btn-success" onclick="accion('validado','${l.id}')">✓ Validar</button>
          </div>` : `
          <div class="ya-procesado ${l.estado_validacion}">
            <div class="yp-icon">${l.estado_validacion === 'validado' ? '✅' : '❌'}</div>
            <div class="yp-msg">${l.estado_validacion === 'validado' ? 'Registro validado' : 'Registro rechazado'}</div>
            <div class="yp-fecha">Validado por ${l.validador_nombre ?? '—'}</div>
            ${l.comentario_validacion ? `<div style="font-size:12px;color:#7a8aaa;margin-top:4px;">"${l.comentario_validacion}"</div>` : ''}
          </div>`}
      </div>
    </div>`

  if (l.latitud && l.longitud) {
    setTimeout(() => {
      if (detalleMap) { detalleMap.remove(); detalleMap = null }
      const mapEl = document.getElementById('detalleMap')
      if (!mapEl) return
      detalleMap = L.map(mapEl, { zoomControl: false, dragging: false, scrollWheelZoom: false })
        .setView([l.latitud, l.longitud], 15)
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
        { attribution: '© OpenStreetMap © CARTO', maxZoom: 19 }).addTo(detalleMap)
      L.marker([l.latitud, l.longitud], {
        icon: L.divIcon({ className: '', html: `<div style="width:16px;height:16px;border-radius:50%;background:var(--rojo);border:2.5px solid white;box-shadow:0 3px 8px rgba(0,0,0,0.4);"></div>`, iconSize: [16, 16], iconAnchor: [8, 8] })
      }).addTo(detalleMap)
    }, 100)
  }
}

async function accion(decision, id) {
  const comentario = document.getElementById('valComentario')?.value.trim() ?? ''
  if (decision === 'rechazado' && !comentario) {
    showToast('⚠️ Escribe un comentario antes de rechazar', 'amarillo')
    return
  }
  const { error } = await supabase.from('levantamientos').update({
    estado_validacion:     decision,
    validado_por:          perfilActual?.id,
    fecha_validacion:      new Date().toISOString(),
    comentario_validacion: comentario,
  }).eq('id', id)

  if (error) { showToast('❌ Error: ' + error.message, 'rojo'); return }

  showToast(decision === 'validado' ? '✅ Levantamiento validado' : '❌ Levantamiento rechazado',
    decision === 'validado' ? 'verde' : 'rojo')
  await cargarLevantamientos()
}

function showToast(msg, tipo = 'verde') {
  const t = document.getElementById('toast')
  document.getElementById('toastMsg').textContent = msg
  t.className = `toast ${tipo} show`
  setTimeout(() => t.classList.remove('show'), 3200)
}

async function init() {
  const perfil = await initSidebar()
  if (!perfil) return
  perfilActual = perfil
  cargarLevantamientos()
}

// cerrarSesion y navegar los expone sidebar.js en window automáticamente
Object.assign(window, { setListFiltro, navAnterior, navSiguiente, selectLev, accion })

init()