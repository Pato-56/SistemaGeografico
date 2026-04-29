/* ============================================================
   reportes.js — Conectado a Supabase
   CORRECCIÓN: Eliminada redefinición local de cerrarSesion.
   sidebar.js ya la expone en window al importarse.
   ============================================================ */
import { supabase } from '../../services/supabase.js'
import { initSidebar } from '../../services/sidebar.js'

let datosReporte  = []
let reporteActivo = 'general'

document.getElementById('fechaHoy').textContent =
  new Date().toLocaleDateString('es-MX', { weekday:'long', day:'numeric', month:'long', year:'numeric' })
document.getElementById('previewDate').textContent =
  new Date().toLocaleDateString('es-MX', { day:'numeric', month:'long', year:'numeric' })

async function cargarDatos() {
  const zona   = document.getElementById('filtroZona').value
  const estado = document.getElementById('filtroEstado').value
  const desde  = document.getElementById('fechaDesde').value
  const hasta  = document.getElementById('fechaHasta').value

  let query = supabase.from('v_levantamientos_completo').select('*')
  if (zona   !== 'todas') query = query.eq('zona', zona)
  if (estado !== 'todos') query = query.eq('estado_operativo', estado)
  if (desde)  query = query.gte('fecha_levantamiento', desde)
  if (hasta)  query = query.lte('fecha_levantamiento', hasta)
  if (reporteActivo === 'hoteles') query = query.eq('estado_validacion', 'validado')

  const { data, error } = await query.order('fecha_levantamiento', { ascending: false })
  if (error) { console.error(error); return }
  datosReporte = data ?? []
  updatePreview()
}

function getCols() {
  const checks = document.querySelectorAll('.fields-grid input[type=checkbox]')
  const labels  = ['Nombre','Razón Social','Zona','Estado Operativo','Habitaciones','Coordenadas','Censador','Fecha','Validación','Comentario']
  const keys    = ['hotel_nombre','razon_social','zona','estado_operativo','habitaciones','coords','censador_nombre','fecha_levantamiento','estado_validacion','comentario_validacion']
  return Array.from(checks).map((c, i) => ({ active: c.checked, label: labels[i], key: keys[i] })).filter(c => c.active)
}

function updatePreview() {
  const cols   = getCols()
  const titles = { general:'Reporte General del Censo Hotelero', zonas:'Reporte por Zona Turística', censadores:'Reporte por Censador', hoteles:'Reporte de Hoteles Validados' }
  document.getElementById('previewTitle').textContent = titles[reporteActivo]
  document.getElementById('previewCount').textContent = datosReporte.length + ' registros'

  const abiertos  = datosReporte.filter(h => h.estado_operativo === 'abierto').length
  const totalHab  = datosReporte.reduce((s, h) => s + (h.habitaciones ?? 0), 0)
  const validados = datosReporte.filter(h => h.estado_validacion === 'validado').length

  document.getElementById('reportKpis').innerHTML = [
    { val: datosReporte.length, lbl: 'Total hoteles' },
    { val: abiertos,            lbl: 'En operación'  },
    { val: totalHab.toLocaleString(), lbl: 'Habitaciones' },
    { val: validados,           lbl: 'Validados'     },
  ].map(k => `<div class="report-kpi"><div class="rk-val">${k.val}</div><div class="rk-lbl">${k.lbl}</div></div>`).join('')

  const iconsOp  = { abierto:'🟢', parcial:'🟡', cerrado:'🔴' }
  const iconsVal = { validado:'✅', pendiente:'⏳', rechazado:'❌' }
  document.getElementById('tableHead').innerHTML = cols.map(c => `<th>${c.label}</th>`).join('')
  document.getElementById('tableBody').innerHTML = datosReporte.slice(0, 8).map(h => `
    <tr>${cols.map(c => {
      if (c.key === 'estado_operativo') return `<td><span class="badge-op ${h[c.key]}">${iconsOp[h[c.key]] ?? ''} ${h[c.key] ?? '—'}</span></td>`
      if (c.key === 'estado_validacion') return `<td><span class="badge-val ${h[c.key]}">${iconsVal[h[c.key]] ?? ''} ${h[c.key] ?? '—'}</span></td>`
      if (c.key === 'coords') return `<td style="font-size:11px;color:#7a8aaa;">${h.latitud ? parseFloat(h.latitud).toFixed(4) + ', ' + parseFloat(h.longitud).toFixed(4) : '—'}</td>`
      return `<td>${h[c.key] ?? '—'}</td>`
    }).join('')}</tr>`).join('')

  document.getElementById('previewFooter').textContent =
    `Vista previa — mostrando ${Math.min(8, datosReporte.length)} de ${datosReporte.length} registros`
}

function selectReport(el, tipo) {
  document.querySelectorAll('.report-type-btn').forEach(b => { b.classList.remove('selected'); b.querySelector('.rt-check').textContent = '' })
  el.classList.add('selected'); el.querySelector('.rt-check').textContent = '✓'
  reporteActivo = tipo
  cargarDatos()
}

function exportar(tipo) {
  if (!datosReporte.length) { showToast('⚠️ No hay datos para exportar', 'amarillo'); return }

  const prog  = document.getElementById('exportProgress')
  const fill  = document.getElementById('progressFill')
  const label = document.getElementById('progressLabel')
  const pct   = document.getElementById('progressPct')
  const colors = { excel: 'var(--verde)', pdf: 'var(--rojo)', csv: 'var(--amarillo)' }

  prog.classList.add('visible')
  fill.style.background = colors[tipo]
  label.textContent = `Generando ${tipo.toUpperCase()}…`
  fill.style.width  = '0%'
  pct.textContent   = '0%'

  let v = 0
  const t = setInterval(() => {
    v += Math.random() * 20 + 8
    if (v >= 100) {
      v = 100; clearInterval(t)
      fill.style.width = '100%'; pct.textContent = '100%'
      setTimeout(() => {
        prog.classList.remove('visible')
        if (tipo === 'csv') descargarCSV()
        else showToast(`✅ Para ${tipo.toUpperCase()} instala la librería correspondiente`, 'amarillo')
        addHistory(tipo)
      }, 400)
    }
    fill.style.width = v + '%'; pct.textContent = Math.floor(v) + '%'
  }, 100)
}

function descargarCSV() {
  const cols   = getCols()
  const header = cols.map(c => c.label).join(',')
  const rows   = datosReporte.map(h =>
    cols.map(c => {
      const val = c.key === 'coords'
        ? (h.latitud ? `${h.latitud}, ${h.longitud}` : '—')
        : (h[c.key] ?? '—')
      const str = String(val).replace(/"/g, '""')
      return str.includes(',') ? `"${str}"` : str
    }).join(',')
  )
  const blob = new Blob(['\uFEFF' + [header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = `reporte_${new Date().toISOString().split('T')[0]}.csv`
  a.click(); URL.revokeObjectURL(url)
  showToast('✅ CSV descargado correctamente', 'verde')
}

function showToast(msg, tipo = 'verde') {
  const t = document.getElementById('toast')
  document.getElementById('toastMsg').textContent = msg
  t.className = `toast ${tipo} show`
  setTimeout(() => t.classList.remove('show'), 3500)
}

const historialData = []
function addHistory(tipo) {
  const exts = { excel: 'xlsx', pdf: 'pdf', csv: 'csv' }
  historialData.unshift({
    tipo, nombre: `Reporte_${new Date().toISOString().split('T')[0]}.${exts[tipo]}`,
    meta: `${document.getElementById('previewTitle').textContent} · ${datosReporte.length} registros`,
    size: tipo === 'pdf' ? '1.1 MB' : tipo === 'excel' ? '40 KB' : '16 KB', tiempo: 'Ahora mismo',
  })
  renderHistorial()
}

function renderHistorial() {
  document.getElementById('historial').innerHTML = historialData.length
    ? historialData.map(h => `
        <div class="history-item">
          <div class="hist-icon ${h.tipo}">${h.tipo === 'excel' ? '📊' : h.tipo === 'pdf' ? '📄' : '📋'}</div>
          <div class="hist-info"><div class="hist-name">${h.nombre}</div><div class="hist-meta">${h.meta} · ${h.tiempo}</div></div>
          <div class="hist-size">${h.size}</div>
        </div>`).join('')
    : '<div style="padding:20px;text-align:center;color:#9baabe;font-size:13px;">Sin exportaciones recientes</div>'
}

renderHistorial()

async function init() {
  const perfil = await initSidebar()
  if (!perfil) return
  cargarDatos()
}

// cerrarSesion y navegar los expone sidebar.js en window automáticamente
Object.assign(window, { selectReport, updatePreview, exportar })

init()