/* ============================================================
   censo-registro-hotel.js — Conectado a Supabase
   CORRECCIONES:
   1. initMapa() usa id="mapaUbicacion" (coincide con el HTML corregido)
   2. guardarRegistro() usa los IDs correctos de todos los campos
   3. Agregada función selectEstado() que el HTML necesita
   4. Agregada función previewFoto() que el HTML necesita
   5. usarUbicacionActual() usa los IDs corregidos (latitud / longitud)
   ============================================================ */
import { supabase } from '../../services/supabase.js'
import { initSidebar } from '../../services/sidebar.js'

let mapaRegistro = null
let latActual    = null
let lngActual    = null
let perfilActual = null

// ── Fecha máxima = hoy ────────────────────────────────────────
const hoy     = new Date().toISOString().split('T')[0]
const fechaEl = document.getElementById('fechaLevantamiento')
if (fechaEl) { fechaEl.value = hoy; fechaEl.max = hoy }

// ── Cargar zonas desde Supabase ───────────────────────────────
async function cargarZonas() {
  const { data: zonas } = await supabase
    .from('zonas_turisticas')
    .select('id, nombre')
    .eq('activa', true)
    .order('nombre')

  const sel = document.getElementById('zonaSelect')
  if (!sel || !zonas) return

  zonas.forEach(z => {
    const opt = document.createElement('option')
    opt.value       = z.id
    opt.textContent = z.nombre
    sel.appendChild(opt)
  })
}

// ── Mapa Leaflet ───────────────────────────────────────────────
// CORRECCIÓN: el div en el HTML tiene id="mapaUbicacion"
function initMapa() {
  const mapEl = document.getElementById('mapaUbicacion')
  if (!mapEl || mapaRegistro) return

  mapaRegistro = L.map('mapaUbicacion').setView([16.849, -99.899], 13)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19,
  }).addTo(mapaRegistro)

  let marker = null
  mapaRegistro.on('click', (e) => {
    latActual = e.latlng.lat.toFixed(7)
    lngActual = e.latlng.lng.toFixed(7)

    // CORRECCIÓN: IDs corregidos (latitud / longitud)
    const latEl = document.getElementById('latitud')
    const lngEl = document.getElementById('longitud')
    if (latEl) latEl.value = latActual
    if (lngEl) lngEl.value = lngActual

    if (marker) mapaRegistro.removeLayer(marker)
    marker = L.marker([latActual, lngActual]).addTo(mapaRegistro)
  })
}

// ── Geolocalización ───────────────────────────────────────────
function usarUbicacionActual() {
  if (!navigator.geolocation) {
    showToast('⚠️ Geolocalización no disponible', 'amarillo')
    return
  }
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      latActual = pos.coords.latitude.toFixed(7)
      lngActual = pos.coords.longitude.toFixed(7)

      // CORRECCIÓN: IDs corregidos
      const latEl = document.getElementById('latitud')
      const lngEl = document.getElementById('longitud')
      if (latEl) latEl.value = latActual
      if (lngEl) lngEl.value = lngActual

      if (mapaRegistro) mapaRegistro.setView([latActual, lngActual], 16)
      showToast('✅ Ubicación capturada', 'verde')
    },
    () => showToast('❌ No se pudo obtener la ubicación', 'rojo')
  )
}

// ── Selección de estado operativo ─────────────────────────────
// CORRECCIÓN: función que el HTML llama con onclick="selectEstado(this,'abierto')"
function selectEstado(chip, valor) {
  // Quitar clases de todos los chips
  document.querySelectorAll('.estado-chip').forEach(c => {
    c.className = 'estado-chip'
  })
  // Marcar el chip seleccionado
  chip.classList.add(`selected-${valor}`)

  // Actualizar el input hidden que guardarRegistro() lee
  const estadoEl = document.getElementById('estadoOperativo')
  if (estadoEl) estadoEl.value = valor
}

// ── Preview de fotografía ─────────────────────────────────────
// CORRECCIÓN: función que el HTML llama con onchange="previewFoto(event)"
function previewFoto(event) {
  const file = event.target.files[0]
  if (!file) return

  const img         = document.getElementById('previewImg')
  const placeholder = document.getElementById('uploadPlaceholder')
  if (!img) return

  const reader = new FileReader()
  reader.onload = (e) => {
    img.src          = e.target.result
    img.style.display = 'block'
    if (placeholder) placeholder.style.display = 'none'
  }
  reader.readAsDataURL(file)
}

// ── Guardar registro ──────────────────────────────────────────
async function guardarRegistro() {
  // CORRECCIÓN: IDs corregidos en todos los campos
  const nombre        = document.getElementById('nombreHotel')?.value.trim()
  const razon         = document.getElementById('razonSocial')?.value.trim()
  const zonaId        = document.getElementById('zonaSelect')?.value
  const habitaciones  = parseInt(document.getElementById('habitaciones')?.value) || null
  const pisos         = parseInt(document.getElementById('pisos')?.value) || null
  const telefono      = document.getElementById('telefonoHotel')?.value.trim()
  const encargado     = document.getElementById('encargado')?.value.trim()
  const direccion     = document.getElementById('direccion')?.value.trim()
  const estadoOp      = document.getElementById('estadoOperativo')?.value || 'abierto'
  const observaciones = document.getElementById('observaciones')?.value.trim()
  const fecha         = document.getElementById('fechaLevantamiento')?.value

  // Validación mínima
  if (!nombre || !zonaId || !estadoOp) {
    showToast('⚠️ Completa los campos obligatorios: Nombre, Zona y Estado', 'amarillo')
    return
  }

  const btnEl = document.getElementById('btnGuardar')
  if (btnEl) { btnEl.disabled = true; btnEl.textContent = 'Guardando…' }

  try {
    // 1. Insertar hotel
    const { data: hotel, error: hotelError } = await supabase
      .from('hoteles')
      .insert({
        nombre,
        razon_social:     razon || null,
        zona_id:          zonaId,
        habitaciones,
        pisos,
        telefono:         telefono || null,
        encargado:        encargado || null,
        direccion:        direccion || null,
        estado_operativo: estadoOp,
        latitud:          latActual ? parseFloat(latActual) : null,
        longitud:         lngActual ? parseFloat(lngActual) : null,
      })
      .select()
      .single()

    if (hotelError) throw hotelError

    // 2. Insertar levantamiento
    const { error: levError } = await supabase
      .from('levantamientos')
      .insert({
        hotel_id:            hotel.id,
        censador_id:         perfilActual.id,
        fecha_levantamiento: fecha || hoy,
        observaciones:       observaciones || null,
        estado_validacion:   'pendiente',
      })

    if (levError) throw levError

    showToast('✅ Hotel registrado correctamente', 'verde')
    setTimeout(() => navegar('hoteles'), 1500)

  } catch (err) {
    showToast('❌ Error: ' + err.message, 'rojo')
    if (btnEl) { btnEl.disabled = false; btnEl.textContent = '✓ Guardar Registro' }
  }
}

// ── Toast ─────────────────────────────────────────────────────
function showToast(msg, tipo = 'verde') {
  const t = document.getElementById('registroToast')
  if (!t) return
  t.textContent = msg
  t.style.background =
    tipo === 'verde'   ? '#27ae60' :
    tipo === 'rojo'    ? '#c0392b' : '#f39c12'
  t.style.opacity = '1'
  setTimeout(() => { t.style.opacity = '0' }, 3000)
}

// ── Inicializar ───────────────────────────────────────────────
async function init() {
  const perfil = await initSidebar()
  if (!perfil) return
  perfilActual = perfil
  initMapa()
  cargarZonas()
}

// Exponer en window las funciones llamadas desde el HTML
Object.assign(window, {
  usarUbicacionActual,
  guardarRegistro,
  selectEstado,
  previewFoto,
})

init()