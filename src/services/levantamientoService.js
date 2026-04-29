// ============================================================
//  levantamientoService.js  —  Registros de campo y validación
// ============================================================
import { supabase } from './supabase'

// ── CONSULTAS ────────────────────────────────────────────────

/**
 * Obtiene todos los levantamientos con datos completos
 * usando la vista v_levantamientos_completo.
 * @param {{ zona?: string, estadoValidacion?: string, censadorId?: string }} filtros
 */
export async function getLevantamientos(filtros = {}) {
  let query = supabase
    .from('v_levantamientos_completo')
    .select('*')
    .order('created_at', { ascending: false })

  if (filtros.zona) {
    query = query.eq('zona', filtros.zona)
  }
  if (filtros.estadoValidacion) {
    query = query.eq('estado_validacion', filtros.estadoValidacion)
  }
  if (filtros.censadorId) {
    query = query.eq('censador_id', filtros.censadorId)
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

/**
 * Obtiene un levantamiento por su ID con todos los datos relacionados.
 * @param {string} id - UUID del levantamiento
 */
export async function getLevantamientoById(id) {
  const { data, error } = await supabase
    .from('levantamientos')
    .select(`
      *,
      hoteles (
        id, nombre, razon_social, habitaciones, pisos,
        latitud, longitud, estado_operativo, direccion,
        zonas_turisticas ( nombre, color_hex )
      ),
      usuarios!censador_id ( id, nombre, apellido, correo ),
      usuarios!validado_por ( id, nombre, apellido ),
      fotos_levantamiento ( id, url, descripcion, orden )
    `)
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

/**
 * Obtiene los levantamientos pendientes de validación.
 * Usada en el dashboard del investigador.
 */
export async function getLevantamientosPendientes() {
  const { data, error } = await supabase
    .from('v_levantamientos_completo')
    .select('*')
    .eq('estado_validacion', 'pendiente')
    .order('fecha_levantamiento', { ascending: true })

  if (error) throw error
  return data
}

/**
 * Obtiene los levantamientos de un censador específico.
 * @param {string} censadorId - UUID del censador
 */
export async function getMisLevantamientos(censadorId) {
  const { data, error } = await supabase
    .from('v_levantamientos_completo')
    .select('*')
    .eq('censador_id', censadorId)
    .order('fecha_levantamiento', { ascending: false })

  if (error) throw error
  return data
}

// ── CREACIÓN (censador) ──────────────────────────────────────

/**
 * Registra un nuevo levantamiento de campo.
 * @param {{
 *   hotel_id: string,
 *   fecha_levantamiento: string,
 *   observaciones?: string
 * }} levData
 */
export async function createLevantamiento(levData) {
  // Obtener el ID del usuario actual
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No hay sesión activa')

  const { data: perfil } = await supabase
    .from('usuarios')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  const { data, error } = await supabase
    .from('levantamientos')
    .insert({
      ...levData,
      censador_id: perfil.id,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

// ── EDICIÓN (censador — solo si está pendiente) ───────────────

/**
 * Actualiza las observaciones de un levantamiento pendiente.
 * @param {string} id       - UUID del levantamiento
 * @param {object} cambios  - { observaciones }
 */
export async function updateLevantamiento(id, cambios) {
  const { data, error } = await supabase
    .from('levantamientos')
    .update(cambios)
    .eq('id', id)
    .eq('estado_validacion', 'pendiente')  // solo si sigue pendiente
    .select()
    .single()

  if (error) throw error
  return data
}

// ── VALIDACIÓN (investigador / admin) ────────────────────────

/**
 * Valida un levantamiento (aprueba el registro del censador).
 * @param {string} id          - UUID del levantamiento
 * @param {string} validadorId - UUID del investigador/admin
 * @param {string} [comentario]
 */
export async function validarLevantamiento(id, validadorId, comentario = '') {
  const { data, error } = await supabase
    .from('levantamientos')
    .update({
      estado_validacion:    'validado',
      validado_por:         validadorId,
      fecha_validacion:     new Date().toISOString(),
      comentario_validacion: comentario,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Rechaza un levantamiento con un comentario obligatorio.
 * @param {string} id          - UUID del levantamiento
 * @param {string} validadorId - UUID del investigador/admin
 * @param {string} comentario  - Motivo del rechazo
 */
export async function rechazarLevantamiento(id, validadorId, comentario) {
  if (!comentario?.trim()) {
    throw new Error('El comentario es obligatorio al rechazar un levantamiento.')
  }

  const { data, error } = await supabase
    .from('levantamientos')
    .update({
      estado_validacion:     'rechazado',
      validado_por:          validadorId,
      fecha_validacion:      new Date().toISOString(),
      comentario_validacion: comentario,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

// ── FOTOS ────────────────────────────────────────────────────

/**
 * Sube una foto al Storage de Supabase y guarda la referencia en BD.
 * @param {string} levantamientoId - UUID del levantamiento
 * @param {File}   archivo         - Objeto File del input
 * @param {string} [descripcion]
 */
export async function subirFoto(levantamientoId, archivo, descripcion = '') {
  const extension = archivo.name.split('.').pop()
  const nombreArchivo = `${levantamientoId}/${Date.now()}.${extension}`

  // 1. Subir al bucket 'fotos-hoteles'
  const { error: uploadError } = await supabase.storage
    .from('fotos-hoteles')
    .upload(nombreArchivo, archivo, {
      cacheControl: '3600',
      upsert: false,
    })

  if (uploadError) throw uploadError

  // 2. Obtener la URL pública
  const { data: { publicUrl } } = supabase.storage
    .from('fotos-hoteles')
    .getPublicUrl(nombreArchivo)

  // 3. Guardar referencia en la tabla fotos_levantamiento
  const { data, error } = await supabase
    .from('fotos_levantamiento')
    .insert({
      levantamiento_id: levantamientoId,
      url:              publicUrl,
      descripcion,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Elimina una foto del Storage y de la BD.
 * @param {string} fotoId - UUID de la foto
 * @param {string} url    - URL pública de la foto
 */
export async function eliminarFoto(fotoId, url) {
  // Extraer la ruta del archivo de la URL pública
  const path = url.split('/fotos-hoteles/')[1]

  await supabase.storage.from('fotos-hoteles').remove([path])

  const { error } = await supabase
    .from('fotos_levantamiento')
    .delete()
    .eq('id', fotoId)

  if (error) throw error
}