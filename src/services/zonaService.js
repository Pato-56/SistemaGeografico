// ============================================================
//  zonaService.js  —  Gestión de zonas turísticas
// ============================================================
import { supabase } from './supabase'

// ── CONSULTAS ────────────────────────────────────────────────

/**
 * Obtiene todas las zonas activas ordenadas por nombre.
 */
export async function getZonas() {
  const { data, error } = await supabase
    .from('zonas_turisticas')
    .select('*')
    .eq('activa', true)
    .order('nombre')

  if (error) throw error
  return data
}

/**
 * Obtiene una zona por su ID.
 * @param {string} id - UUID de la zona
 */
export async function getZonaById(id) {
  const { data, error } = await supabase
    .from('zonas_turisticas')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

/**
 * Obtiene el resumen de KPIs por zona usando la vista de la BD.
 * Incluye: total_hoteles, hoteles_abiertos, hoteles_cerrados,
 *          total_habitaciones, levantamientos_validados, etc.
 */
export async function getResumenZonas() {
  const { data, error } = await supabase
    .from('v_resumen_zona')
    .select('*')
    .order('zona')

  if (error) throw error
  return data
}

/**
 * Obtiene los hoteles que pertenecen a una zona específica.
 * @param {string} zonaId - UUID de la zona
 */
export async function getHotelesByZona(zonaId) {
  const { data, error } = await supabase
    .from('hoteles')
    .select('*')
    .eq('zona_id', zonaId)
    .order('nombre')

  if (error) throw error
  return data
}

// ── MUTACIONES (solo admin) ──────────────────────────────────

/**
 * Crea una nueva zona turística.
 * @param {{ nombre: string, descripcion?: string, color_hex?: string }} zonaData
 */
export async function createZona(zonaData) {
  const { data, error } = await supabase
    .from('zonas_turisticas')
    .insert(zonaData)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Actualiza los datos de una zona.
 * @param {string} id - UUID de la zona
 * @param {object} cambios - Campos a actualizar
 */
export async function updateZona(id, cambios) {
  const { data, error } = await supabase
    .from('zonas_turisticas')
    .update(cambios)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Desactiva una zona (soft delete: activa = false).
 * @param {string} id - UUID de la zona
 */
export async function desactivarZona(id) {
  const { data, error } = await supabase
    .from('zonas_turisticas')
    .update({ activa: false })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

// ── ASIGNACIONES DE CENSADORES ───────────────────────────────

/**
 * Asigna un censador a una zona.
 * @param {string} censadorId - UUID del censador
 * @param {string} zonaId     - UUID de la zona
 */
export async function asignarCensador(censadorId, zonaId) {
  // Primero desactiva cualquier asignación activa previa del censador
  await supabase
    .from('asignaciones_zona')
    .update({ activa: false })
    .eq('censador_id', censadorId)
    .eq('activa', true)

  const { data, error } = await supabase
    .from('asignaciones_zona')
    .insert({
      censador_id:  censadorId,
      zona_id:      zonaId,
      fecha_inicio: new Date().toISOString().split('T')[0],
      activa:       true,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Obtiene la zona actualmente asignada a un censador.
 * @param {string} censadorId - UUID del censador
 */
export async function getZonaAsignadaCensador(censadorId) {
  const { data, error } = await supabase
    .from('asignaciones_zona')
    .select(`
      *,
      zonas_turisticas ( id, nombre, color_hex )
    `)
    .eq('censador_id', censadorId)
    .eq('activa', true)
    .maybeSingle()

  if (error) throw error
  return data
}