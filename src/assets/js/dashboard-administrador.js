/* ============================================================
   dashboard-administrador.js
   Conectado a Supabase — datos reales + navegación funcional
   CORRECCIÓN: Eliminado objeto RUTAS local con rutas incorrectas
   (lista-hoteles.html, validar-registros.html) y funciones
   navegar/cerrarSesion duplicadas. Ahora se importan de
   sidebar.js que tiene las rutas centralizadas y correctas.
   ============================================================ */
import { supabase } from '../../services/supabase.js'
import { navegar, cerrarSesion } from '../../services/sidebar.js'

// ── Cargar perfil del usuario actual ─────────────────────────
async function cargarPerfil() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) { window.location.href = '/src/pages/auth/login.html'; return null }

  const { data: perfil } = await supabase
    .from('usuarios')
    .select('*')
    .eq('auth_user_id', user.id)
    .single()

  if (!perfil) { window.location.href = '/src/pages/auth/login.html'; return null }

  // Redirigir si el usuario no es administrador
  if (perfil.rol === 'investigador') {
    window.location.href = '/src/pages/dashboard/dashboard-investigador.html'
    return null
  }
  if (perfil.rol === 'estudiante') {
    window.location.href = '/src/pages/dashboard/dashboard-censador.html'
    return null
  }

  // Mostrar rol real, no hardcodeado
  const iconosRol = {
    administrador: '⚙️ Administrador',
    investigador:  '🔬 Investigador',
    estudiante:    '📋 Censador',
  }
  document.getElementById('sidebarNombre').textContent =
    perfil.nombre + ' ' + perfil.apellido
  document.getElementById('sidebarRol').textContent =
    iconosRol[perfil.rol] ?? perfil.rol

  document.getElementById('welcomeNombre').textContent =
    '¡Bienvenido, ' + perfil.nombre + '! 🛠️'

  return perfil
}

// ── Cargar KPIs desde Supabase ────────────────────────────────
async function cargarKpis() {
  const [
    { data: usuarios },
    { data: hoteles },
    { data: levantamientos },
  ] = await Promise.all([
    supabase.from('usuarios').select('id, estado, rol'),
    supabase.from('hoteles').select('id, habitaciones, estado_operativo'),
    supabase.from('levantamientos').select('id, estado_validacion'),
  ])

  const totalUsuarios  = usuarios?.length ?? 0
  const totalHoteles   = hoteles?.length ?? 0
  const validados      = levantamientos?.filter(l => l.estado_validacion === 'validado').length ?? 0
  const pendientes     = levantamientos?.filter(l => l.estado_validacion === 'pendiente').length ?? 0
  const rechazados     = levantamientos?.filter(l => l.estado_validacion === 'rechazado').length ?? 0
  const totalHab       = hoteles?.reduce((s, h) => s + (h.habitaciones ?? 0), 0) ?? 0
  const usuPendientes  = usuarios?.filter(u => u.estado === 'pendiente').length ?? 0
  const abiertos       = hoteles?.filter(h => h.estado_operativo === 'abierto').length ?? 0
  const parciales      = hoteles?.filter(h => h.estado_operativo === 'parcial').length ?? 0
  const cerrados       = hoteles?.filter(h => h.estado_operativo === 'cerrado').length ?? 0
  const pctRec         = totalHoteles > 0
    ? Math.round(((abiertos + parciales * 0.5) / totalHoteles) * 100) : 0
  const pctVal         = levantamientos?.length > 0
    ? Math.round(validados / levantamientos.length * 100) : 0

  document.getElementById('welcomeMsg').innerHTML =
    `Tienes <strong style="color:var(--rojo-suave);">${usuPendientes} usuarios pendientes</strong> de activación y el censo avanza al ${pctVal}%.`

  animateCount('kpiUsuarios', totalUsuarios)
  animateCount('kpiHoteles',  totalHoteles)
  animateCount('kpiValidados', validados)
  animateCount('kpiHab',      totalHab)

  setTimeout(() => {
    const usuActivos = usuarios?.filter(u => u.estado === 'activo').length ?? 0
    setBar('b1', totalUsuarios > 0 ? (usuActivos / totalUsuarios * 100) : 0)
    setBar('b2', 100)
    setBar('b3', levantamientos?.length > 0 ? (validados / levantamientos.length * 100) : 0)
    setBar('b4', 80)
  }, 300)

  return { totalUsuarios, totalHoteles, validados, pendientes, rechazados,
           totalHab, abiertos, parciales, cerrados, pctRec }
}

// ── Cargar tabla de usuarios ──────────────────────────────────
async function cargarTablaUsuarios() {
  const { data: usuarios, error } = await supabase
    .from('usuarios')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(7)

  if (error || !usuarios) return

  const iconRol  = { administrador: '⚙️', investigador: '🔬', estudiante: '📋' }
  const labelRol = { administrador: 'Admin', investigador: 'Investigador', estudiante: 'Censador' }

  document.getElementById('usuariosBody').innerHTML = usuarios.map(u => `
    <tr>
      <td>
        <div style="font-weight:600;font-size:13px;">${u.nombre} ${u.apellido}</div>
        <div style="font-size:11px;color:#7a8aaa;">${u.correo}</div>
      </td>
      <td><span class="badge-rol ${u.rol}">${iconRol[u.rol] ?? '👤'} ${labelRol[u.rol] ?? u.rol}</span></td>
      <td style="text-align:center;font-weight:600;">—</td>
      <td><span class="badge-estado ${u.estado}">${u.estado === 'activo' ? '🟢' : u.estado === 'pendiente' ? '⏳' : '🔴'} ${u.estado.charAt(0).toUpperCase() + u.estado.slice(1)}</span></td>
      <td>
        <div style="display:flex;gap:5px;">
          <button class="btn-act editar" onclick="navegar('usuarios')">✎ Editar</button>
          <button class="btn-act ${u.estado === 'activo' ? 'desact' : 'activar'}"
            onclick="toggleEstadoUsuario('${u.id}', '${u.estado}', this)">
            ${u.estado === 'activo' ? '✕ Desact.' : '✓ Activar'}
          </button>
        </div>
      </td>
    </tr>
  `).join('')
}

// ── Toggle estado usuario desde el dashboard ──────────────────
async function toggleEstadoUsuario(id, estadoActual, btn) {
  const nuevoEstado = estadoActual === 'activo' ? 'inactivo' : 'activo'
  const { error } = await supabase
    .from('usuarios')
    .update({ estado: nuevoEstado })
    .eq('id', id)

  if (!error) await cargarTablaUsuarios()
}
window.toggleEstadoUsuario = toggleEstadoUsuario

// ── Cargar actividad del sistema ──────────────────────────────
async function cargarActividad() {
  const { data: actividad } = await supabase
    .from('actividad_sistema')
    .select(`
      accion,
      descripcion,
      created_at,
      usuarios ( nombre, apellido )
    `)
    .order('created_at', { ascending: false })
    .limit(6)

  const tipos = {
    'INSERT': 'ok',
    'UPDATE': 'sistema',
    'DELETE': 'alerta',
    'EXPORT': 'admin',
    'LOGIN':  'ok',
  }

  const formatTime = (iso) => {
    const diff = Date.now() - new Date(iso).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `Hace ${mins} min`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `Hace ${hrs} hora${hrs > 1 ? 's' : ''}`
    return `Hace ${Math.floor(hrs / 24)} día${Math.floor(hrs / 24) > 1 ? 's' : ''}`
  }

  if (!actividad?.length) {
    document.getElementById('actividadSistema').innerHTML =
      '<div style="padding:20px;text-align:center;color:#9baabe;font-size:13px;">Sin actividad reciente</div>'
    return
  }

  document.getElementById('actividadSistema').innerHTML = actividad.map(a => `
    <div class="activity-item">
      <div class="act-dot ${tipos[a.accion] ?? 'sistema'}"></div>
      <div>
        <div class="act-msg">${a.descripcion ?? a.accion}</div>
        <div class="act-time">${formatTime(a.created_at)}</div>
      </div>
    </div>
  `).join('')
}

// ── Cargar zonas ──────────────────────────────────────────────
async function cargarZonas() {
  const { data: zonas } = await supabase
    .from('v_resumen_zona')
    .select('*')
    .order('zona')

  if (!zonas?.length) return

  const colores = {
    'Zona Dorada':      '#2d5bbf',
    'Zona Diamante':    '#c0392b',
    'Zona Tradicional': '#f39c12',
    'Otra':             '#27ae60',
  }
  const clases = {
    'Zona Dorada':      'dorada',
    'Zona Diamante':    'diamante',
    'Zona Tradicional': 'tradicional',
    'Otra':             'otra',
  }

  document.getElementById('zonasGrid').innerHTML = zonas.map(z => {
    const total = z.total_hoteles ?? 0
    const op    = (z.hoteles_abiertos ?? 0) + (z.hoteles_parciales ?? 0)
    const pct   = total > 0 ? Math.round(op / total * 100) : 0
    const color = z.color_hex ?? colores[z.zona] ?? '#888'
    const clase = clases[z.zona] ?? 'otra'
    return `
      <div class="zona-card ${clase}">
        <div class="zona-card-top">
          <div>
            <div class="zona-name">${z.zona}</div>
            <div class="zona-count">${total} hoteles registrados</div>
          </div>
          <button class="zona-edit" onclick="navegar('usuarios')">✎ Editar</button>
        </div>
        <div class="zona-bar" style="margin-bottom:6px;">
          <div class="zona-fill" style="width:${pct}%;background:${color};"></div>
        </div>
        <div style="font-size:11px;color:#7a8aaa;">${pct}% en operación · 🛏 ${(z.total_habitaciones ?? 0).toLocaleString()} hab.</div>
      </div>
    `
  }).join('')
}

// ── Cargar KPIs de estadísticas ───────────────────────────────
async function cargarStatsKpis(kpis) {
  const { totalHoteles, abiertos, totalHab, pctRec, cerrados } = kpis

  document.getElementById('statsKpis2').innerHTML = [
    { icon:'🏚', val: cerrados,                  lbl:'Hoteles cerrados',        color:'var(--rojo)',        pct: totalHoteles > 0 ? Math.round(cerrados/totalHoteles*100) : 0,  cls:'k-red'    },
    { icon:'🟢', val: abiertos,                  lbl:'En operación total',      color:'var(--verde)',       pct: totalHoteles > 0 ? Math.round(abiertos/totalHoteles*100) : 0, cls:'k-green'  },
    { icon:'📈', val: pctRec + '%',              lbl:'% recuperación hotelera', color:'var(--azul-claro)',  pct: pctRec,                                                        cls:'k-blue'   },
    { icon:'🛏', val: totalHab.toLocaleString(), lbl:'Habitaciones totales',    color:'var(--amarillo)',    pct: 80,                                                            cls:'k-yellow' },
  ].map(k => `
    <div class="kpi-card ${k.cls}" style="animation:none;">
      <div class="kpi-top"><div class="kpi-icon">${k.icon}</div></div>
      <div class="kpi-val" style="font-size:26px;">${k.val}</div>
      <div class="kpi-lbl">${k.lbl}</div>
      <div class="kpi-bar"><div class="kpi-bar-fill" style="width:${k.pct}%;background:${k.color};"></div></div>
    </div>
  `).join('')
}

// ── Gráficas ──────────────────────────────────────────────────
async function cargarGraficas() {
  const [
    { data: hoteles },
    { data: levantamientos },
    { data: rendimiento },
  ] = await Promise.all([
    supabase.from('hoteles').select('estado_operativo, habitaciones, zona_id, zonas_turisticas(nombre)'),
    supabase.from('levantamientos').select('estado_validacion, created_at'),
    supabase.from('v_rendimiento_censador').select('censador, validados, pendientes, rechazados'),
  ])

  const FONT = { family: 'Outfit', size: 11 }
  const zonas = ['Zona Dorada', 'Zona Diamante', 'Zona Tradicional']
  const getNombreZona = (h) => h.zonas_turisticas?.nombre ?? 'Sin zona'

  new Chart(document.getElementById('stackedBar'), {
    type: 'bar',
    data: {
      labels: zonas,
      datasets: [
        { label:'Abierto', stack:'s', backgroundColor:'rgba(39,174,96,0.85)',
          data: zonas.map(z => hoteles?.filter(h => getNombreZona(h)===z && h.estado_operativo==='abierto').length ?? 0) },
        { label:'Parcial',  stack:'s', backgroundColor:'rgba(243,156,18,0.85)',
          data: zonas.map(z => hoteles?.filter(h => getNombreZona(h)===z && h.estado_operativo==='parcial').length ?? 0) },
        { label:'Cerrado', stack:'s', backgroundColor:'rgba(192,57,43,0.85)',
          data: zonas.map(z => hoteles?.filter(h => getNombreZona(h)===z && h.estado_operativo==='cerrado').length ?? 0) },
      ]
    },
    options: { responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{ position:'top', labels:{font:FONT, boxWidth:10, padding:14} } },
      scales:{ x:{stacked:true,grid:{display:false},ticks:{font:FONT,color:'#7a8aaa'}},
               y:{stacked:true,grid:{color:'#f0f0f0'},ticks:{font:FONT,color:'#9baabe'}} } }
  })

  new Chart(document.getElementById('barHab'), {
    type: 'bar',
    data: {
      labels: zonas,
      datasets: [{ label:'Habitaciones',
        backgroundColor: ['rgba(45,91,191,0.8)','rgba(192,57,43,0.8)','rgba(243,156,18,0.8)'],
        borderRadius: 8, borderSkipped: false,
        data: zonas.map(z => hoteles?.filter(h => getNombreZona(h)===z).reduce((s,h) => s+(h.habitaciones??0), 0) ?? 0)
      }]
    },
    options: { responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}},
      scales:{ x:{grid:{display:false},ticks:{font:FONT,color:'#7a8aaa'}},
               y:{grid:{color:'#f0f0f0'},ticks:{font:FONT,color:'#9baabe'}} } }
  })

  const val  = levantamientos?.filter(l => l.estado_validacion==='validado').length  ?? 0
  const pend = levantamientos?.filter(l => l.estado_validacion==='pendiente').length ?? 0
  const rech = levantamientos?.filter(l => l.estado_validacion==='rechazado').length ?? 0

  new Chart(document.getElementById('pieVal'), {
    type: 'doughnut',
    data: { labels:['Validados','Pendientes','Rechazados'],
      datasets:[{ data:[val,pend,rech], backgroundColor:['#27ae60','#f39c12','#c0392b'], borderWidth:0, hoverOffset:6 }] },
    options: { cutout:'60%', plugins:{legend:{display:false}}, animation:{duration:900} }
  })

  document.getElementById('pieLeyenda').innerHTML = [
    { color:'#27ae60', label:'Validados',  val },
    { color:'#f39c12', label:'Pendientes', val: pend },
    { color:'#c0392b', label:'Rechazados', val: rech },
  ].map(l => `
    <div style="display:flex;align-items:center;gap:10px;">
      <div style="width:12px;height:12px;border-radius:3px;background:${l.color};flex-shrink:0;"></div>
      <div>
        <div style="font-size:13px;font-weight:600;color:var(--texto-oscuro);">${l.val} registros</div>
        <div style="font-size:11px;color:#7a8aaa;">${l.label}</div>
      </div>
    </div>
  `).join('')

  if (rendimiento?.length) {
    new Chart(document.getElementById('barCensadores'), {
      type: 'bar',
      data: {
        labels: rendimiento.map(r => r.censador.split(' ')[0]),
        datasets: [
          { label:'Validados',  stack:'s', backgroundColor:'rgba(39,174,96,0.8)',  borderRadius:6,
            data: rendimiento.map(r => r.validados)  },
          { label:'Pendientes', stack:'s', backgroundColor:'rgba(243,156,18,0.8)', borderRadius:0,
            data: rendimiento.map(r => r.pendientes) },
          { label:'Rechazados', stack:'s', backgroundColor:'rgba(192,57,43,0.8)',  borderRadius:0,
            data: rendimiento.map(r => r.rechazados) },
        ]
      },
      options: { responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{ position:'top', labels:{font:FONT, boxWidth:10, padding:14} } },
        scales:{ x:{stacked:true,grid:{display:false},ticks:{font:FONT,color:'#7a8aaa'}},
                 y:{stacked:true,grid:{color:'#f0f0f0'},ticks:{font:FONT,color:'#9baabe'}} },
        animation:{duration:900} }
    })
  }

  const semanas = agruparPorSemana(levantamientos ?? [])
  new Chart(document.getElementById('lineRegistros'), {
    type: 'line',
    data: {
      labels: semanas.map(s => s.label),
      datasets: [
        { label:'Registros nuevos', data: semanas.map(s => s.nuevos),
          borderColor:'#2d5bbf', backgroundColor:'rgba(45,91,191,0.08)',
          tension:0.4, fill:true, pointBackgroundColor:'#2d5bbf', pointRadius:5 },
        { label:'Validados', data: semanas.map(s => s.validados),
          borderColor:'#27ae60', backgroundColor:'rgba(39,174,96,0.08)',
          tension:0.4, fill:true, pointBackgroundColor:'#27ae60', pointRadius:5 },
      ]
    },
    options: { responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{ position:'top', labels:{font:FONT, boxWidth:10, padding:14} } },
      scales:{ x:{grid:{display:false},ticks:{font:FONT,color:'#7a8aaa'}},
               y:{grid:{color:'#f0f0f0'},ticks:{font:FONT,color:'#9baabe'},beginAtZero:true} },
      animation:{duration:900} }
  })
}

function agruparPorSemana(levs) {
  const map = {}
  levs.forEach(l => {
    const d   = new Date(l.created_at)
    const dia = d.getDay()
    const lun = new Date(d)
    lun.setDate(d.getDate() - (dia === 0 ? 6 : dia - 1))
    const key = lun.toISOString().split('T')[0]
    if (!map[key]) map[key] = { label: 'S ' + key.slice(5,10), nuevos: 0, validados: 0 }
    map[key].nuevos++
    if (l.estado_validacion === 'validado') map[key].validados++
  })
  return Object.values(map).slice(-6)
}

// ── Helpers ───────────────────────────────────────────────────
function animateCount(id, target) {
  const el = document.getElementById(id)
  if (!el) return
  let v = 0; const step = target / 50
  const t = setInterval(() => {
    v += step
    if (v >= target) { el.textContent = target.toLocaleString(); clearInterval(t) }
    else el.textContent = Math.floor(v).toLocaleString()
  }, 16)
}

function setBar(id, pct) {
  const el = document.getElementById(id)
  if (el) el.style.width = Math.min(pct, 100) + '%'
}

// ── Fecha ─────────────────────────────────────────────────────
document.getElementById('fechaHoy').textContent =
  new Date().toLocaleDateString('es-MX', { weekday:'long', day:'numeric', month:'long', year:'numeric' })

// ── Inicialización ────────────────────────────────────────────
async function init() {
  const perfil = await cargarPerfil()
  if (!perfil) return

  const [kpis] = await Promise.all([
    cargarKpis(),
    cargarTablaUsuarios(),
    cargarActividad(),
    cargarZonas(),
    cargarGraficas(),
  ])

  await cargarStatsKpis(kpis)
}

init()