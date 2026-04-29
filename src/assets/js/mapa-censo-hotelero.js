/* ============================================================
   mapa-censo-hotelero.js — Conectado a Supabase
   ============================================================ */
import { supabase } from '../../services/supabase.js'
import { initSidebar, cerrarSesion, navegar } from '../../services/sidebar.js'

// ── Estado ────────────────────────────────────────────────────
let map           = null
let markers       = []
let activeEstados = new Set(['abierto', 'parcial', 'cerrado'])
let activeZonas   = new Set()
let hotelData     = []

const colores = { abierto: '#27ae60', parcial: '#f39c12', cerrado: '#c0392b' }
const iconos  = { abierto: '🟢',     parcial: '🟡',      cerrado: '🔴'      }
const labels  = { abierto: 'En Operación', parcial: 'Operación Parcial', cerrado: 'Cerrado' }

// ── Inicializar mapa (llamado desde init()) ───────────────────
function initMap() {
  map = L.map('map', { zoomControl: false }).setView([16.84, -99.89], 13)

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19,
  }).addTo(map)

  L.control.zoom({ position: 'bottomright' }).addTo(map)
}

// ── Cargar hoteles desde Supabase ─────────────────────────────
async function cargarHoteles() {
  const { data, error } = await supabase
    .from('hoteles')
    .select(`
      id, nombre, habitaciones, pisos, direccion,
      estado_operativo, latitud, longitud, notas,
      zonas_turisticas ( nombre ),
      levantamientos (
        estado_validacion, fecha_levantamiento,
        usuarios!censador_id ( nombre, apellido )
      )
    `)
    .order('nombre')

  if (error) { console.error('Error cargando hoteles:', error.message); return }

  hotelData = (data ?? []).map(h => {
    const lev  = h.levantamientos?.slice(-1)[0]
    const zona = h.zonas_turisticas?.nombre ?? 'Sin zona'
    activeZonas.add(zona)
    return {
      id:           h.id,
      nombre:       h.nombre,
      estado:       h.estado_operativo,
      zona,
      habitaciones: h.habitaciones ?? 0,
      pisos:        h.pisos ?? 0,
      direccion:    h.direccion ?? '—',
      censador:     lev
        ? `${lev.usuarios?.nombre ?? ''} ${lev.usuarios?.apellido ?? ''}`.trim() || '—'
        : '—',
      fecha: lev?.fecha_levantamiento ?? '—',
      lat:   parseFloat(h.latitud)  || 16.849,
      lng:   parseFloat(h.longitud) || -99.899,
      notas: h.notas ?? '—',
    }
  })

  // Actualizar chips de zona dinámicamente
  actualizarChipsZona()
  renderMarkers()
}

// ── Chips de zona (dinámicos según zonas en BD) ───────────────
function actualizarChipsZona() {
  // Inicializar activeZonas desde los chips activos del HTML
  document.querySelectorAll('[data-zona]').forEach(chip => {
    if (chip.classList.contains('active-blue')) {
      activeZonas.add(chip.dataset.zona)
    }
  })
}

// ── Crear ícono del marcador ──────────────────────────────────
function crearIcono(estado) {
  const color = colores[estado] || '#777'
  return L.divIcon({
    className: '',
    html: `<div style="width:18px;height:18px;border-radius:50%;background:${color};border:2.5px solid white;box-shadow:0 3px 8px rgba(0,0,0,0.35);"></div>`,
    iconSize: [18, 18], iconAnchor: [9, 9], popupAnchor: [0, -12],
  })
}

// ── Renderizar marcadores ─────────────────────────────────────
function renderMarkers() {
  if (!map) return
  const search = (document.getElementById('searchInput')?.value ?? '').toLowerCase()

  markers.forEach(m => map.removeLayer(m.layer))
  markers = []

  const filtrados = hotelData.filter(h =>
    activeEstados.has(h.estado) &&
    activeZonas.has(h.zona) &&
    h.nombre.toLowerCase().includes(search)
  )

  filtrados.forEach(h => {
    const layer = L.marker([h.lat, h.lng], { icon: crearIcono(h.estado) })
      .addTo(map)
      .on('click', () => showDetail(h))
    markers.push({ id: h.id, layer })
  })

  const el = document.getElementById('hotelCount')
  if (el) el.textContent = filtrados.length
}

// ── Panel de detalle ──────────────────────────────────────────
function showDetail(h) {
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val }
  set('detailNombre',       h.nombre)
  set('detailHabitaciones', h.habitaciones)
  set('detailPisos',        h.pisos)
  set('detailDireccion',    h.direccion)
  set('detailCensador',     h.censador)
  set('detailFecha',        h.fecha)

  const estadoEl = document.getElementById('detailEstado')
  const zonaEl   = document.getElementById('detailZona')
  if (estadoEl) estadoEl.innerHTML = `<div class="estado-badge ${h.estado}">${iconos[h.estado]} ${labels[h.estado]}</div>`
  if (zonaEl)   zonaEl.innerHTML   = `<div class="zona-tag">🗺 ${h.zona}</div>`

  const panel = document.getElementById('detailPanel')
  if (panel) {
    panel.classList.remove('visible')
    void panel.offsetWidth
    panel.classList.add('visible')
  }

  map.panTo([h.lat, h.lng])
}

function closeDetail() {
  const panel = document.getElementById('detailPanel')
  if (panel) panel.classList.remove('visible')
}

// ── Filtros ───────────────────────────────────────────────────
function toggleChip(el, tipo) {
  const val = el.dataset[tipo]
  const cls = tipo === 'zona' ? 'active-blue' : 'active-red'

  if (el.classList.contains(cls)) {
    el.classList.remove(cls)
    if (tipo === 'estado') activeEstados.delete(val)
    else                   activeZonas.delete(val)
  } else {
    el.classList.add(cls)
    if (tipo === 'estado') activeEstados.add(val)
    else                   activeZonas.add(val)
  }
  renderMarkers()
}

function applyFilters() { renderMarkers() }

let filtersOpen = true
function toggleFilters() {
  filtersOpen = !filtersOpen
  const body = document.getElementById('filterBody')
  const btn  = document.querySelector('.filter-toggle')
  if (body) body.style.display  = filtersOpen ? 'flex' : 'none'
  if (btn)  btn.textContent     = filtersOpen ? '▲' : '▼'
}

// ── Inicializar ───────────────────────────────────────────────
async function init() {
  const perfil = await initSidebar()
  if (!perfil) return

  initMap()        // ← mapa se crea DESPUÉS de verificar sesión
  cargarHoteles()
}

Object.assign(window, {
  toggleChip, applyFilters, toggleFilters,
  closeDetail, cerrarSesion, navegar,
})

init()