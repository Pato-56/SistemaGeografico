/* ============================================================
   censo-registro-hotel.js — Conectado a Supabase
   CORRECCIÓN: Eliminada redefinición local de cerrarSesion.
   sidebar.js ya la expone en window al importarse.
   ============================================================ */
import { supabase } from '../../services/supabase.js'
import { initSidebar } from '../../services/sidebar.js'

let mapaRegistro = null
let latActual    = null
let lngActual    = null
let perfilActual = null

const hoy     = new Date().toISOString().split('T')[0]
const fechaEl = document.getElementById('fechaLevantamiento')
if (fechaEl) { fechaEl.value = hoy; fechaEl.max = hoy }

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
    opt.value = z.id; opt.textContent = z.nombre
    sel.appendChild(opt)
  })
}

function initMapa() {
  const mapEl = document.getElementById('mapaUbicacion')
  if (!mapEl || mapaRegistro) return

  mapaRegistro = L.map('mapaUbicacion').setView([16.849, -99.899], 13)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors', maxZoom: 19,
  }).addTo(mapaRegistro)

  let marker = null
  mapaRegistro.on('click', (e) => {
    latActual = e.latlng.lat.toFixed(7)
    lngActual = e.latlng.lng.toFixed(7)
    const latEl = document.getElementById('latitud')
    const lngEl = document.getElementById('longitud')
    if (latEl) latEl.value = latActual
    if (lngEl) lngEl.value = lngActual
    if (marker) mapaRegistro.removeLayer(marker)
    marker = L.marker([latActual, lngActual]).addTo(mapaRegistro)
  })
}

function usarUbicacionActual() {
  if (!navigator.geolocation) { showToast('⚠️ Geolocalización no disponible', 'amarillo'); return }
  navigator.geolocation.getCurrentPosition((pos) => {
    latActual = pos.coords.latitude.toFixed(7)
    lngActual = pos.coords.longitude.toFixed(7)
    const latEl = document.getElementById('latitud')
    const lngEl = document.getElementById('longitud')
    if (latEl) latEl.value = latActual
    if (lngEl) lngEl.value = lngActual
    if (mapaRegistro) mapaRegistro.setView([latActual, lngActual], 16)
    showToast('✅ Ubicación capturada', 'verde')
  }, () => showToast('❌ No se pudo obtener la ubicación', 'rojo'))
}

async function guardarRegistro() {
  const nombre        = document.getElementById('nombreHotel')?.value.trim()
  const razon         = document.getElementById('razonSocial')?.value.trim()
  const zonaId        = document.getElementById('zonaSelect')?.value
  const habitaciones  = parseInt(document.getElementById('habitaciones')?.value) || null
  const pisos         = parseInt(document.getElementById('pisos')?.value) || null
  const telefono      = document.getElementById('telefonoHotel')?.value.trim()
  const encargado     = document.getElementById('encargado')?.value.trim()
  const direccion     = document.getElementById('direccion')?.value.trim()
  const estadoOp      = document.getElementById('estadoOperativo')?.value
  const observaciones = document.getElementById('observaciones')?.value.trim()
  const fecha         = document.getElementById('fechaLevantamiento')?.value

  if (!nombre || !zonaId || !estadoOp) {
    showToast('⚠️ Completa los campos obligatorios: Nombre, Zona y Estado', 'amarillo')
    return
  }

  const btnEl = document.getElementById('btnGuardar')
  if (btnEl) { btnEl.disabled = true; btnEl.textContent = 'Guardando…' }

  try {
    const { data: hotel, error: hotelError } = await supabase
      .from('hoteles')
      .insert({
        nombre, razon_social: razon, zona_id: zonaId,
        habitaciones, pisos, telefono, encargado, direccion,
        estado_operativo: estadoOp,
        latitud:  latActual ? parseFloat(latActual) : null,
        longitud: lngActual ? parseFloat(lngActual) : null,
      })
      .select().single()

    if (hotelError) throw hotelError

    const { error: levError } = await supabase
      .from('levantamientos')
      .insert({
        hotel_id:            hotel.id,
        censador_id:         perfilActual.id,
        fecha_levantamiento: fecha || hoy,
        observaciones,
        estado_validacion:   'pendiente',
      })

    if (levError) throw levError

    showToast('✅ Hotel registrado correctamente', 'verde')
    setTimeout(() => window.location.href = '/src/pages/censo/lista-mapa-hoteles.html', 1500)

  } catch (err) {
    showToast('❌ Error: ' + err.message, 'rojo')
    if (btnEl) { btnEl.disabled = false; btnEl.textContent = '✓ Guardar registro' }
  }
}

function showToast(msg, tipo = 'verde') {
  let t = document.getElementById('registroToast')
  if (!t) {
    t = document.createElement('div')
    t.id = 'registroToast'
    t.style.cssText = 'position:fixed;bottom:24px;right:24px;padding:14px 22px;border-radius:12px;font-size:13px;font-weight:600;color:white;z-index:9999;box-shadow:0 4px 20px rgba(0,0,0,0.2);'
    document.body.appendChild(t)
  }
  t.textContent = msg
  t.style.background = tipo === 'verde' ? '#27ae60' : tipo === 'rojo' ? '#c0392b' : '#f39c12'
  t.style.opacity = '1'
  setTimeout(() => { t.style.opacity = '0' }, 3000)
}

async function init() {
  const perfil = await initSidebar()
  if (!perfil) return
  perfilActual = perfil
  initMapa()
  cargarZonas()
}

// cerrarSesion y navegar los expone sidebar.js en window automáticamente
Object.assign(window, { usarUbicacionActual, guardarRegistro })

init()