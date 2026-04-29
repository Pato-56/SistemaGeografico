/* ============================================================
   dashboard-censador.js
   CORRECCIÓN: Se agrega initSidebar() para verificar sesión
   y cargar el nombre del usuario en el sidebar.
   ============================================================ */
import { initSidebar } from '../../services/sidebar.js'

// ── Inicializar sidebar y verificar sesión ────────────────────
async function init() {
  const perfil = await initSidebar()
  if (!perfil) return   // initSidebar ya redirige al login si no hay sesión

  // Redirigir si el rol no corresponde a este dashboard
  if (perfil.rol === 'administrador') {
    window.location.href = '/src/pages/dashboard/dashboard-administrador.html'
    return
  }
  if (perfil.rol === 'investigador') {
    window.location.href = '/src/pages/dashboard/dashboard-investigador.html'
    return
  }

  // Personalizar bienvenida con el nombre real del usuario
  const welcomeEl = document.getElementById('welcomeNombre')
  if (welcomeEl) welcomeEl.textContent = `Bienvenido, ${perfil.nombre} 📋`

  // Cargar el resto de la página con los datos hardcodeados (o Supabase en el futuro)
  cargarDashboard()
}

function cargarDashboard() {
  const fechaEl = document.getElementById('fechaHoy')
  if (fechaEl) fechaEl.textContent =
    new Date().toLocaleDateString('es-MX', { weekday:'long', day:'numeric', month:'long', year:'numeric' })

  const misHoteles = [
    { nombre:'Hotel Emporio Acapulco', zona:'Dorada',     estadoOp:'abierto', estadoVal:'validado',  fecha:'2026-03-05', hab:424 },
    { nombre:'Grand Hotel Acapulco',   zona:'Dorada',     estadoOp:'abierto', estadoVal:'validado',  fecha:'2026-03-08', hab:310 },
    { nombre:'Hotel Malibu',           zona:'Dorada',     estadoOp:'parcial', estadoVal:'pendiente', fecha:'2026-03-09', hab:150 },
    { nombre:'Hotel Acapulco Tortuga', zona:'Dorada',     estadoOp:'parcial', estadoVal:'pendiente', fecha:'2026-03-11', hab:120 },
    { nombre:'Playa Suites',           zona:'Dorada',     estadoOp:'abierto', estadoVal:'pendiente', fecha:'2026-03-13', hab:189 },
    { nombre:'Hotel Las Hamacas',      zona:'Tradicional',estadoOp:'parcial', estadoVal:'rechazado', fecha:'2026-03-13', hab:110 },
    { nombre:'Copacabana Beach',       zona:'Dorada',     estadoOp:'abierto', estadoVal:'rechazado', fecha:'2026-03-14', hab:240 },
  ]

  const total     = misHoteles.length
  const validados = misHoteles.filter(h => h.estadoVal==='validado').length
  const pendientes= misHoteles.filter(h => h.estadoVal==='pendiente').length
  const rechazados= misHoteles.filter(h => h.estadoVal==='rechazado').length

  // ── KPIs ──
  function animCount(id, target) {
    const el = document.getElementById(id)
    if (!el) return
    let v = 0; const step = target / 40
    const t = setInterval(() => { v += step; if(v >= target){el.textContent=target;clearInterval(t);}else el.textContent=Math.floor(v) }, 16)
  }

  setTimeout(() => {
    animCount('k1', total); animCount('k2', validados)
    animCount('k3', pendientes); animCount('k4', rechazados)
    setTimeout(() => {
      const b1 = document.getElementById('b1'); if(b1) b1.style.width = '100%'
      const b2 = document.getElementById('b2'); if(b2) b2.style.width = (validados/total*100)+'%'
      const b3 = document.getElementById('b3'); if(b3) b3.style.width = (pendientes/total*100)+'%'
      const b4 = document.getElementById('b4'); if(b4) b4.style.width = (rechazados/total*100)+'%'
    }, 200)
  }, 300)

  // ── Misión ──
  const pct = Math.round(5/8*100)
  const pctEl = document.getElementById('pctMision'); if(pctEl) pctEl.textContent = pct+'%'
  setTimeout(() => { const mf = document.getElementById('misionFill'); if(mf) mf.style.width = pct+'%' }, 400)

  // ── Tabla registros ──
  const iconsOp  = { abierto:'🟢', parcial:'🟡', cerrado:'🔴' }
  const iconsVal = { validado:'✅', pendiente:'⏳', rechazado:'❌' }
  const misRegistrosEl = document.getElementById('misRegistros')
  if (misRegistrosEl) {
    misRegistrosEl.innerHTML = misHoteles.map(h => `
      <tr>
        <td>
          <div style="font-weight:600;font-size:13px;">${h.nombre}</div>
          <div style="font-size:11px;color:#7a8aaa;">🛏 ${h.hab} hab.</div>
        </td>
        <td><span class="zona-tag">${h.zona}</span></td>
        <td><span class="badge-op ${h.estadoOp}">${iconsOp[h.estadoOp]} ${h.estadoOp.charAt(0).toUpperCase()+h.estadoOp.slice(1)}</span></td>
        <td><span class="badge-val ${h.estadoVal}">${iconsVal[h.estadoVal]} ${h.estadoVal.charAt(0).toUpperCase()+h.estadoVal.slice(1)}</span></td>
        <td style="font-size:12px;color:#7a8aaa;">${h.fecha}</td>
        <td>
          <div style="display:flex;gap:5px;">
            <button class="btn-act ver">👁 Ver</button>
            ${h.estadoVal !== 'validado' ? `<button class="btn-act editar">✎ Editar</button>` : ''}
          </div>
        </td>
      </tr>
    `).join('')
  }

  // ── Rechazados ──
  const rechazadosData = [
    { nombre:'Hotel Las Hamacas',  motivo:'Fotografía borrosa, coordenadas incorrectas', fecha:'2026-03-13', investigador:'Dr. Manuel Dávila' },
    { nombre:'Copacabana Beach',   motivo:'Falta número de habitaciones y encargado',     fecha:'2026-03-14', investigador:'Dr. Manuel Dávila' },
  ]
  const rechazadosEl = document.getElementById('rechazadosList')
  if (rechazadosEl) {
    rechazadosEl.innerHTML = rechazadosData.map(r => `
      <div class="alerta-item">
        <div class="alerta-dot">❌</div>
        <div class="alerta-text" style="flex:1;">
          <div class="alerta-nombre">${r.nombre}</div>
          <div class="alerta-motivo">⚠ ${r.motivo}</div>
          <div class="alerta-fecha">Rechazado por ${r.investigador} · ${r.fecha}</div>
        </div>
        <button class="btn-corregir">✎ Corregir</button>
      </div>
    `).join('')
  }

  // ── Pie chart personal ──
  const pieEl = document.getElementById('piePersonal')
  if (pieEl && typeof Chart !== 'undefined') {
    new Chart(pieEl, {
      type:'doughnut',
      data:{ labels:['Validados','Pendientes','Rechazados'],
        datasets:[{ data:[validados,pendientes,rechazados], backgroundColor:['#27ae60','#f39c12','#c0392b'], borderWidth:0, hoverOffset:6 }] },
      options:{ cutout:'62%', plugins:{legend:{display:false}}, animation:{duration:900} }
    })
  }

  const pieLeyendaEl = document.getElementById('pieLeyendaP')
  if (pieLeyendaEl) {
    pieLeyendaEl.innerHTML = [
      { color:'#27ae60', label:'Validados',  val:validados  },
      { color:'#f39c12', label:'Pendientes', val:pendientes },
      { color:'#c0392b', label:'Rechazados', val:rechazados },
    ].map(l => `
      <div style="display:flex;align-items:center;gap:9px;">
        <div style="width:10px;height:10px;border-radius:2px;background:${l.color};flex-shrink:0;"></div>
        <div>
          <div style="font-size:13px;font-weight:600;color:var(--texto-oscuro);">${l.val}</div>
          <div style="font-size:11px;color:#7a8aaa;">${l.label}</div>
        </div>
      </div>
    `).join('')
  }

  // ── Actividad ──
  const actividad = [
    { tipo:'pendiente', msg:'Registraste <strong>Copacabana Beach</strong>',       time:'Hace 2 horas' },
    { tipo:'rechazado', msg:'<strong>Hotel Las Hamacas</strong> fue rechazado',     time:'Hace 3 horas' },
    { tipo:'pendiente', msg:'Registraste <strong>Hotel Las Hamacas</strong>',       time:'Ayer, 15:20' },
    { tipo:'validado',  msg:'<strong>Grand Hotel Acapulco</strong> fue validado ✓', time:'Ayer, 11:05' },
    { tipo:'pendiente', msg:'Registraste <strong>Hotel Acapulco Tortuga</strong>',  time:'Ayer, 10:30' },
    { tipo:'validado',  msg:'<strong>Hotel Emporio</strong> fue validado ✓',        time:'Hace 2 días' },
  ]
  const actividadEl = document.getElementById('miActividad')
  if (actividadEl) {
    actividadEl.innerHTML = actividad.map(a => `
      <div class="activity-item">
        <div class="act-dot ${a.tipo}"></div>
        <div><div class="act-msg">${a.msg}</div><div class="act-time">${a.time}</div></div>
      </div>
    `).join('')
  }
}

init()