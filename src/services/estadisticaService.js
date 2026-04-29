// ============================================================
//  estadisticaService.js  —  KPIs, gráficas y datos de dashboards
// ============================================================
import { supabase } from './supabase'

// ── KPIs GENERALES (dashboard administrador e investigador) ──

/**
 * Devuelve los contadores globales del sistema.
 * Retorna: { totalHoteles, validados, pendientes, rechazados,
 *            cerrados, totalHabitaciones, pctRecuperacion }
 */
export async function getKpisGenerales() {
  const { data, error } = await supabase
    .from('hoteles')
    .select('id, habitaciones, estado_operativo')

  if (error) throw error

  const total      = data.length
  const abiertos   = data.filter(h => h.estado_operativo === 'abierto').length
  const parciales  = data.filter(h => h.estado_operativo === 'parcial').length
  const cerrados   = data.filter(h => h.estado_operativo === 'cerrado').length
  const totalHab   = data.reduce((s, h) => s + (h.habitaciones ?? 0), 0)
  const pctRecuperacion = total > 0
    ? Math.round(((abiertos + parciales * 0.5) / total) * 100)
    : 0

  // Contadores de validación
  const { data: levs, error: levError } = await supabase
    .from('levantamientos')
    .select('id, estado_validacion')

  if (levError) throw levError

  const validados  = levs.filter(l => l.estado_validacion === 'validado').length
  const pendientes = levs.filter(l => l.estado_validacion === 'pendiente').length
  const rechazados = levs.filter(l => l.estado_validacion === 'rechazado').length

  return {
    totalHoteles: total,
    abiertos,
    parciales,
    cerrados,
    totalHabitaciones: totalHab,
    pctRecuperacion,
    validados,
    pendientes,
    rechazados,
  }
}

/**
 * Devuelve KPIs del sistema de usuarios.
 * Retorna: { totalUsuarios, activos, pendientes, censadoresActivos }
 */
export async function getKpisUsuarios() {
  const { data, error } = await supabase
    .from('usuarios')
    .select('id, rol, estado')

  if (error) throw error

  return {
    totalUsuarios:    data.length,
    activos:          data.filter(u => u.estado === 'activo').length,
    pendientes:       data.filter(u => u.estado === 'pendiente').length,
    censadoresActivos:data.filter(u => u.rol === 'estudiante' && u.estado === 'activo').length,
  }
}

// ── KPIs PERSONALES (dashboard censador) ─────────────────────

/**
 * Devuelve los KPIs de un censador específico.
 * @param {string} censadorId - UUID del censador
 */
export async function getKpisCensador(censadorId) {
  const { data, error } = await supabase
    .from('levantamientos')
    .select('id, estado_validacion, hoteles(habitaciones)')
    .eq('censador_id', censadorId)

  if (error) throw error

  return {
    total:     data.length,
    validados: data.filter(l => l.estado_validacion === 'validado').length,
    pendientes:data.filter(l => l.estado_validacion === 'pendiente').length,
    rechazados:data.filter(l => l.estado_validacion === 'rechazado').length,
  }
}

// ── DATOS PARA GRÁFICAS ──────────────────────────────────────

/**
 * Datos para la gráfica de barras apiladas por zona.
 * Retorna array: [{ zona, abierto, parcial, cerrado }]
 */
export async function getEstadoOperativoPorZona() {
  const { data, error } = await supabase
    .from('hoteles')
    .select(`
      estado_operativo,
      zonas_turisticas ( nombre, color_hex )
    `)

  if (error) throw error

  // Agrupar por zona
  const grupos = {}
  data.forEach(h => {
    const zona = h.zonas_turisticas?.nombre ?? 'Sin zona'
    if (!grupos[zona]) {
      grupos[zona] = {
        zona,
        color: h.zonas_turisticas?.color_hex ?? '#888',
        abierto: 0,
        parcial:  0,
        cerrado:  0,
      }
    }
    grupos[zona][h.estado_operativo]++
  })

  return Object.values(grupos).sort((a, b) => a.zona.localeCompare(b.zona))
}

/**
 * Datos para la gráfica de habitaciones por zona.
 * Retorna array: [{ zona, color, habitaciones }]
 */
export async function getHabitacionesPorZona() {
  const { data, error } = await supabase
    .from('hoteles')
    .select(`
      habitaciones,
      zonas_turisticas ( nombre, color_hex )
    `)

  if (error) throw error

  const grupos = {}
  data.forEach(h => {
    const zona = h.zonas_turisticas?.nombre ?? 'Sin zona'
    if (!grupos[zona]) {
      grupos[zona] = {
        zona,
        color: h.zonas_turisticas?.color_hex ?? '#888',
        habitaciones: 0,
      }
    }
    grupos[zona].habitaciones += h.habitaciones ?? 0
  })

  return Object.values(grupos).sort((a, b) => a.zona.localeCompare(b.zona))
}

/**
 * Datos para el pie chart de validación.
 * Retorna: { validados, pendientes, rechazados }
 */
export async function getDistribucionValidacion() {
  const { data, error } = await supabase
    .from('levantamientos')
    .select('estado_validacion')

  if (error) throw error

  return {
    validados:  data.filter(l => l.estado_validacion === 'validado').length,
    pendientes: data.filter(l => l.estado_validacion === 'pendiente').length,
    rechazados: data.filter(l => l.estado_validacion === 'rechazado').length,
  }
}

/**
 * Datos para la gráfica de barras de registros por censador.
 * Retorna array: [{ censador, validados, pendientes, rechazados }]
 */
export async function getRegistrosPorCensador() {
  const { data, error } = await supabase
    .from('v_rendimiento_censador')
    .select('censador, validados, pendientes, rechazados')
    .order('total_levantamientos', { ascending: false })

  if (error) throw error
  return data
}

/**
 * Datos para la gráfica de línea: registros por semana.
 * Retorna array: [{ semana: string, nuevos: number, validados: number }]
 */
export async function getRegistrosPorSemana() {
  const { data, error } = await supabase
    .from('levantamientos')
    .select('created_at, estado_validacion')
    .order('created_at')

  if (error) throw error

  // Agrupar por semana ISO
  const semanas = {}
  data.forEach(l => {
    const fecha = new Date(l.created_at)
    // Calcular inicio de semana (lunes)
    const dia   = fecha.getDay()
    const lunes = new Date(fecha)
    lunes.setDate(fecha.getDate() - (dia === 0 ? 6 : dia - 1))
    const clave = lunes.toISOString().split('T')[0]

    if (!semanas[clave]) semanas[clave] = { semana: clave, nuevos: 0, validados: 0 }
    semanas[clave].nuevos++
    if (l.estado_validacion === 'validado') semanas[clave].validados++
  })

  return Object.values(semanas).sort((a, b) => a.semana.localeCompare(b.semana))
}

// ── RESUMEN COMPLETO (para el separador de estadísticas) ─────

/**
 * Devuelve el resumen completo por zona usando la vista de BD.
 * Útil para el panel de zonas del dashboard investigador.
 */
export async function getResumenPorZona() {
  const { data, error } = await supabase
    .from('v_resumen_zona')
    .select('*')
    .order('zona')

  if (error) throw error
  return data
}

/**
 * Devuelve el rendimiento individual de cada censador.
 * Usa la vista v_rendimiento_censador de la BD.
 */
export async function getRendimientoCensadores() {
  const { data, error } = await supabase
    .from('v_rendimiento_censador')
    .select('*')
    .order('total_levantamientos', { ascending: false })

  if (error) throw error
  return data
}