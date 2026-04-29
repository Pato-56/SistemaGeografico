/* ============================================================
   dashboard-investigador.js
   CORRECCIÓN COMPLETA: Este JS era copia del censador y usaba
   IDs que no existen en el HTML del investigador. Reescrito
   para usar los IDs reales del HTML y renderizar el contenido
   propio del rol investigador.

   IDs disponibles en su HTML:
   - fechaHoy, welcomeNombre
   - k1, k2, k3, k4, b1, b2, b3, b4  (KPIs)
   - misRegistros                       (tabla pendientes)
   - pctRecup, totalHab                (stats de zona)
   - zonesList                          (avance por zona)
   - barChart                           (barras habitaciones)
   - miActividad                        (actividad reciente)
   - statsKpis                          (KPIs estadísticas)
   - stackedBar                         (barras apiladas)
   - pieVal, pieLeyenda                 (pie validación)
   - barHab                             (habitaciones por zona)
   - lineRegistros                      (registros por semana)
   - censadorTable                      (tabla censadores)
   ============================================================ */
import { initSidebar } from '../../services/sidebar.js'

async function init() {
  const perfil = await initSidebar()
  if (!perfil) return

  // Redirigir si el rol no corresponde a este dashboard
  if (perfil.rol === 'administrador') {
    window.location.href = '/src/pages/dashboard/dashboard-administrador.html'
    return
  }
  if (perfil.rol === 'estudiante') {
    window.location.href = '/src/pages/dashboard/dashboard-censador.html'
    return
  }

  const welcomeEl = document.getElementById('welcomeNombre')
  if (welcomeEl) welcomeEl.textContent = `Bienvenido, ${perfil.nombre} 🔬`

  cargarDashboard()
}

function cargarDashboard() {
  // ── Fecha ──────────────────────────────────────────────────
  const fechaEl = document.getElementById('fechaHoy')
  if (fechaEl) fechaEl.textContent =
    new Date().toLocaleDateString('es-MX', { weekday:'long', day:'numeric', month:'long', year:'numeric' })

  // ── Datos de ejemplo (reemplazar con Supabase cuando esté listo) ──
  const hoteles = [
    { nombre:'Hotel Emporio Acapulco', zona:'Dorada',      estadoOp:'abierto', estadoVal:'validado',  fecha:'2026-03-05', hab:424, censador:'Alexis Álvarez' },
    { nombre:'Grand Hotel Acapulco',   zona:'Dorada',      estadoOp:'abierto', estadoVal:'validado',  fecha:'2026-03-08', hab:310, censador:'Alexis Álvarez' },
    { nombre:'Hotel Malibu',           zona:'Dorada',      estadoOp:'parcial', estadoVal:'pendiente', fecha:'2026-03-09', hab:150, censador:'Alexis Álvarez' },
    { nombre:'Hotel Acapulco Tortuga', zona:'Dorada',      estadoOp:'parcial', estadoVal:'pendiente', fecha:'2026-03-11', hab:120, censador:'Sofía Ramírez'  },
    { nombre:'Playa Suites',           zona:'Dorada',      estadoOp:'abierto', estadoVal:'pendiente', fecha:'2026-03-13', hab:189, censador:'Sofía Ramírez'  },
    { nombre:'Hotel Las Hamacas',      zona:'Tradicional', estadoOp:'parcial', estadoVal:'rechazado', fecha:'2026-03-13', hab:110, censador:'Alexis Álvarez' },
    { nombre:'Copacabana Beach',       zona:'Dorada',      estadoOp:'abierto', estadoVal:'rechazado', fecha:'2026-03-14', hab:240, censador:'Sofía Ramírez'  },
    { nombre:'Hotel Boca Chica',       zona:'Tradicional', estadoOp:'cerrado', estadoVal:'validado',  fecha:'2026-03-06', hab:80,  censador:'Carlos Mendoza' },
    { nombre:'Hotel Caleta',           zona:'Tradicional', estadoOp:'cerrado', estadoVal:'validado',  fecha:'2026-03-07', hab:95,  censador:'Carlos Mendoza' },
    { nombre:'Dreams Acapulco',        zona:'Diamante',    estadoOp:'abierto', estadoVal:'validado',  fecha:'2026-03-04', hab:535, censador:'Sofía Ramírez'  },
    { nombre:'Fairmont Acapulco',      zona:'Diamante',    estadoOp:'abierto', estadoVal:'pendiente', fecha:'2026-03-12', hab:475, censador:'Carlos Mendoza' },
  ]

  const total     = hoteles.length
  const validados = hoteles.filter(h => h.estadoVal === 'validado').length
  const pendientes= hoteles.filter(h => h.estadoVal === 'pendiente').length
  const cerrados  = hoteles.filter(h => h.estadoOp  === 'cerrado').length
  const rechazados= hoteles.filter(h => h.estadoVal === 'rechazado').length
  const totalHab  = hoteles.reduce((s, h) => s + h.hab, 0)
  const pctRecup  = Math.round(hoteles.filter(h => h.estadoOp !== 'cerrado').length / total * 100)

  // ── KPIs principales ────────────────────────────────────────
  function animCount(id, target) {
    const el = document.getElementById(id)
    if (!el) return
    let v = 0; const step = target / 40
    const t = setInterval(() => {
      v += step
      if (v >= target) { el.textContent = target; clearInterval(t) }
      else el.textContent = Math.floor(v)
    }, 16)
  }

  setTimeout(() => {
    animCount('k1', total)
    animCount('k2', validados)
    animCount('k3', pendientes)
    animCount('k4', cerrados)
    setTimeout(() => {
      const b1 = document.getElementById('b1'); if(b1) b1.style.width = '100%'
      const b2 = document.getElementById('b2'); if(b2) b2.style.width = (validados/total*100)+'%'
      const b3 = document.getElementById('b3'); if(b3) b3.style.width = (pendientes/total*100)+'%'
      const b4 = document.getElementById('b4'); if(b4) b4.style.width = (cerrados/total*100)+'%'
    }, 200)
  }, 300)

  // ── Stats recuperación y habitaciones ───────────────────────
  const pctRecupEl = document.getElementById('pctRecup')
  const totalHabEl = document.getElementById('totalHab')
  if (pctRecupEl) pctRecupEl.textContent = pctRecup + '%'
  if (totalHabEl) totalHabEl.textContent = totalHab.toLocaleString()

  // ── Tabla registros pendientes ──────────────────────────────
  const iconsOp = { abierto:'🟢', parcial:'🟡', cerrado:'🔴' }
  const pendientesData = hoteles.filter(h => h.estadoVal === 'pendiente')
  const misRegistrosEl = document.getElementById('misRegistros')
  if (misRegistrosEl) {
    misRegistrosEl.innerHTML = pendientesData.map(h => `
      <tr>
        <td>
          <div style="font-weight:600;font-size:13px;">${h.nombre}</div>
          <div style="font-size:11px;color:#7a8aaa;">🛏 ${h.hab} hab.</div>
        </td>
        <td><span class="badge-op ${h.estadoOp}">${iconsOp[h.estadoOp]} ${h.estadoOp.charAt(0).toUpperCase()+h.estadoOp.slice(1)}</span></td>
        <td style="font-size:12px;">${h.censador}</td>
        <td style="font-size:12px;color:#7a8aaa;">${h.fecha}</td>
        <td>
          <div style="display:flex;gap:5px;">
            <button class="btn-act ver">✓ Validar</button>
            <button class="btn-act editar">✕ Rechazar</button>
          </div>
        </td>
      </tr>
    `).join('')
  }

  // ── Avance por zona ─────────────────────────────────────────
  const zonas = {}
  hoteles.forEach(h => {
    if (!zonas[h.zona]) zonas[h.zona] = { validados:0, pendientes:0, cerrados:0, total:0, hab:0 }
    zonas[h.zona].total++
    zonas[h.zona].hab += h.hab
    if (h.estadoVal === 'validado')  zonas[h.zona].validados++
    if (h.estadoVal === 'pendiente') zonas[h.zona].pendientes++
    if (h.estadoOp  === 'cerrado')  zonas[h.zona].cerrados++
  })

  const zonesListEl = document.getElementById('zonesList')
  if (zonesListEl) {
    zonesListEl.innerHTML = Object.entries(zonas).map(([nombre, z]) => {
      const pct = Math.round(z.validados / z.total * 100)
      return `
        <div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
            <span style="font-size:13px;font-weight:600;color:var(--azul-oscuro);">📍 ${nombre}</span>
            <span style="font-size:11px;font-weight:700;color:var(--azul-claro);">${pct}%</span>
          </div>
          <div style="height:6px;border-radius:3px;background:var(--gris-borde);overflow:hidden;">
            <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,var(--verde),var(--azul-claro));border-radius:3px;transition:width 0.8s ease;"></div>
          </div>
          <div style="display:flex;gap:10px;margin-top:5px;">
            <span style="font-size:10px;color:#27ae60;">✅ ${z.validados}</span>
            <span style="font-size:10px;color:#f39c12;">⏳ ${z.pendientes}</span>
            <span style="font-size:10px;color:#c0392b;">🔴 ${z.cerrados}</span>
          </div>
        </div>
      `
    }).join('')
  }

  // ── Actividad reciente ──────────────────────────────────────
  const actividad = [
    { tipo:'validado',  msg:'Validaste <strong>Dreams Acapulco</strong>',           time:'Hace 1 hora'  },
    { tipo:'rechazado', msg:'Rechazaste <strong>Hotel Las Hamacas</strong>',         time:'Hace 3 horas' },
    { tipo:'pendiente', msg:'<strong>Fairmont Acapulco</strong> listo para revisar', time:'Ayer, 17:40'  },
    { tipo:'validado',  msg:'Validaste <strong>Hotel Boca Chica</strong>',           time:'Ayer, 14:10'  },
    { tipo:'validado',  msg:'Validaste <strong>Hotel Caleta</strong>',               time:'Ayer, 11:30'  },
    { tipo:'pendiente', msg:'<strong>Playa Suites</strong> en espera de revisión',   time:'Hace 2 días'  },
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

  // ── KPIs estadísticas ───────────────────────────────────────
  const statsEl = document.getElementById('statsKpis')
  if (statsEl) {
    statsEl.innerHTML = [
      { icon:'🏨', val:total,                     lbl:'Total hoteles',  color:'k-blue'   },
      { icon:'🛏', val:totalHab.toLocaleString(), lbl:'Habitaciones',   color:'k-green'  },
      { icon:'📈', val:pctRecup+'%',              lbl:'Recuperación',   color:'k-yellow' },
      { icon:'❌', val:rechazados,                lbl:'Rechazados',     color:'k-red'    },
    ].map(k => `
      <div class="kpi-card ${k.color}">
        <div class="kpi-top"><div class="kpi-icon">${k.icon}</div></div>
        <div class="kpi-val">${k.val}</div>
        <div class="kpi-lbl">${k.lbl}</div>
      </div>
    `).join('')
  }

  // ── Gráficas ────────────────────────────────────────────────
  if (typeof Chart === 'undefined') return

  const zonasLabels = Object.keys(zonas)
  const zonasColors = ['#c0392b', '#f39c12', '#2d5bbf', '#27ae60']

  // Barras habitaciones top (barChart)
  const barChartEl = document.getElementById('barChart')
  if (barChartEl) {
    new Chart(barChartEl, {
      type: 'bar',
      data: {
        labels: zonasLabels,
        datasets: [{ label:'Habitaciones', data: zonasLabels.map(z => zonas[z].hab), backgroundColor: zonasColors, borderRadius: 6 }]
      },
      options: { responsive:true, maintainAspectRatio:false, plugins:{ legend:{ display:false } }, scales:{ y:{ beginAtZero:true, grid:{ color:'rgba(0,0,0,0.05)' } }, x:{ grid:{ display:false } } } }
    })
  }

  // Barras apiladas (stackedBar)
  const stackedBarEl = document.getElementById('stackedBar')
  if (stackedBarEl) {
    new Chart(stackedBarEl, {
      type: 'bar',
      data: {
        labels: zonasLabels,
        datasets: [
          { label:'Abierto', data: zonasLabels.map(z => hoteles.filter(h => h.zona===z && h.estadoOp==='abierto').length), backgroundColor:'#27ae60', borderRadius:4 },
          { label:'Parcial', data: zonasLabels.map(z => hoteles.filter(h => h.zona===z && h.estadoOp==='parcial').length), backgroundColor:'#f39c12' },
          { label:'Cerrado', data: zonasLabels.map(z => hoteles.filter(h => h.zona===z && h.estadoOp==='cerrado').length), backgroundColor:'#c0392b' },
        ]
      },
      options: { responsive:true, maintainAspectRatio:false, scales:{ x:{ stacked:true, grid:{ display:false } }, y:{ stacked:true, beginAtZero:true, grid:{ color:'rgba(0,0,0,0.05)' } } }, plugins:{ legend:{ position:'bottom', labels:{ boxWidth:10, font:{ size:11 } } } } }
    })
  }

  // Pie validación (pieVal + pieLeyenda)
  const pieValEl = document.getElementById('pieVal')
  if (pieValEl) {
    new Chart(pieValEl, {
      type: 'doughnut',
      data: { labels:['Validados','Pendientes','Rechazados'], datasets:[{ data:[validados,pendientes,rechazados], backgroundColor:['#27ae60','#f39c12','#c0392b'], borderWidth:0, hoverOffset:6 }] },
      options: { cutout:'62%', plugins:{ legend:{ display:false } }, animation:{ duration:900 } }
    })
  }
  const pieLeyendaEl = document.getElementById('pieLeyenda')
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

  // Barras habitaciones bottom (barHab)
  const barHabEl = document.getElementById('barHab')
  if (barHabEl) {
    new Chart(barHabEl, {
      type: 'bar',
      data: {
        labels: zonasLabels,
        datasets: [{ label:'Habitaciones', data: zonasLabels.map(z => zonas[z].hab), backgroundColor: zonasColors.map(c => c+'cc'), borderColor: zonasColors, borderWidth:2, borderRadius:6 }]
      },
      options: { responsive:true, maintainAspectRatio:false, plugins:{ legend:{ display:false } }, scales:{ y:{ beginAtZero:true, grid:{ color:'rgba(0,0,0,0.05)' } }, x:{ grid:{ display:false } } } }
    })
  }

  // Línea registros por semana (lineRegistros)
  const lineEl = document.getElementById('lineRegistros')
  if (lineEl) {
    new Chart(lineEl, {
      type: 'line',
      data: {
        labels: ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'],
        datasets: [
          { label:'Nuevos',    data:[3,4,2,2], borderColor:'#2d5bbf', backgroundColor:'rgba(45,91,191,0.08)', tension:0.4, fill:true, pointRadius:4 },
          { label:'Validados', data:[1,3,2,3], borderColor:'#27ae60', backgroundColor:'rgba(39,174,96,0.08)',  tension:0.4, fill:true, pointRadius:4 },
        ]
      },
      options: { responsive:true, maintainAspectRatio:false, plugins:{ legend:{ position:'bottom', labels:{ boxWidth:10, font:{ size:11 } } } }, scales:{ y:{ beginAtZero:true, grid:{ color:'rgba(0,0,0,0.05)' } }, x:{ grid:{ display:false } } } }
    })
  }

  // ── Tabla rendimiento por censador ──────────────────────────
  const censadores = {}
  hoteles.forEach(h => {
    if (!censadores[h.censador]) censadores[h.censador] = { total:0, validados:0, pendientes:0, rechazados:0, hab:0 }
    censadores[h.censador].total++
    censadores[h.censador].hab += h.hab
    if (h.estadoVal === 'validado')  censadores[h.censador].validados++
    if (h.estadoVal === 'pendiente') censadores[h.censador].pendientes++
    if (h.estadoVal === 'rechazado') censadores[h.censador].rechazados++
  })

  const censadorTableEl = document.getElementById('censadorTable')
  if (censadorTableEl) {
    censadorTableEl.innerHTML = Object.entries(censadores).map(([nombre, c]) => {
      const pct = Math.round(c.validados / c.total * 100)
      return `
        <tr>
          <td style="padding:12px 20px;font-weight:600;font-size:13px;">${nombre}</td>
          <td style="text-align:center;font-weight:700;">${c.total}</td>
          <td style="text-align:center;"><span style="color:#27ae60;font-weight:600;">✅ ${c.validados}</span></td>
          <td style="text-align:center;"><span style="color:#f39c12;font-weight:600;">⏳ ${c.pendientes}</span></td>
          <td style="text-align:center;font-weight:600;">${c.hab.toLocaleString()}</td>
          <td style="padding:12px 20px;">
            <div style="display:flex;align-items:center;gap:8px;">
              <div style="flex:1;height:6px;border-radius:3px;background:var(--gris-borde);overflow:hidden;">
                <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,var(--verde),var(--azul-claro));border-radius:3px;"></div>
              </div>
              <span style="font-size:11px;font-weight:700;color:var(--azul-claro);min-width:32px;">${pct}%</span>
            </div>
          </td>
        </tr>
      `
    }).join('')
  }
}

init()