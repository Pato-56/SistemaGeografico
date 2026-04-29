// ============================================================
//  reporteService.js  —  Generación y descarga de reportes
//  Formatos soportados: CSV, JSON
//  Para Excel y PDF se usan librerías externas (ver comentarios)
// ============================================================
import { supabase } from './supabase'

// ── OBTENER DATOS FILTRADOS ───────────────────────────────────

/**
 * Obtiene los datos del reporte aplicando filtros.
 * @param {{
 *   tipo: 'general' | 'zonas' | 'censadores' | 'hoteles',
 *   zona?: string,
 *   estadoOperativo?: string,
 *   fechaDesde?: string,
 *   fechaHasta?: string,
 * }} opciones
 */
export async function getDatosReporte(opciones = {}) {
  const { tipo, zona, estadoOperativo, fechaDesde, fechaHasta } = opciones

  let query = supabase
    .from('v_levantamientos_completo')
    .select('*')
    .order('fecha_levantamiento', { ascending: false })

  // Filtro por zona
  if (zona && zona !== 'todas') {
    query = query.eq('zona', zona)
  }

  // Filtro por estado operativo del hotel
  if (estadoOperativo && estadoOperativo !== 'todos') {
    query = query.eq('estado_operativo', estadoOperativo)
  }

  // Filtro por rango de fechas
  if (fechaDesde) {
    query = query.gte('fecha_levantamiento', fechaDesde)
  }
  if (fechaHasta) {
    query = query.lte('fecha_levantamiento', fechaHasta)
  }

  // Filtro por tipo de reporte
  if (tipo === 'hoteles') {
    query = query.eq('estado_validacion', 'validado')
  }

  const { data, error } = await query
  if (error) throw error

  // Para reporte por censador: agrupar
  if (tipo === 'censadores') {
    return agruparPorCensador(data)
  }

  // Para reporte por zona: agrupar
  if (tipo === 'zonas') {
    return agruparPorZona(data)
  }

  return data
}

// ── AGRUPADORES INTERNOS ─────────────────────────────────────

function agruparPorCensador(datos) {
  const grupos = {}
  datos.forEach(d => {
    const clave = d.censador_id
    if (!grupos[clave]) {
      grupos[clave] = {
        censador:       d.censador_nombre,
        correo:         d.censador_correo,
        total:          0,
        validados:      0,
        pendientes:     0,
        rechazados:     0,
        habitaciones:   0,
      }
    }
    grupos[clave].total++
    grupos[clave][d.estado_validacion]++
    grupos[clave].habitaciones += d.habitaciones ?? 0
  })
  return Object.values(grupos)
}

function agruparPorZona(datos) {
  const grupos = {}
  datos.forEach(d => {
    const clave = d.zona
    if (!grupos[clave]) {
      grupos[clave] = {
        zona:           d.zona,
        total:          0,
        validados:      0,
        pendientes:     0,
        abiertos:       0,
        cerrados:       0,
        habitaciones:   0,
      }
    }
    grupos[clave].total++
    if (d.estado_validacion === 'validado') grupos[clave].validados++
    if (d.estado_validacion === 'pendiente') grupos[clave].pendientes++
    if (d.estado_operativo === 'abierto')  grupos[clave].abiertos++
    if (d.estado_operativo === 'cerrado')  grupos[clave].cerrados++
    grupos[clave].habitaciones += d.habitaciones ?? 0
  })
  return Object.values(grupos)
}

// ── EXPORTAR CSV ─────────────────────────────────────────────

/**
 * Convierte un array de objetos a CSV y dispara la descarga.
 * @param {object[]} datos       - Filas del reporte
 * @param {string[]} columnas    - Llaves a incluir (en orden)
 * @param {string}   nombreArchivo
 *
 * @example
 * const datos = await getDatosReporte({ tipo: 'general' })
 * exportarCSV(datos, ['hotel_nombre','zona','habitaciones','estado_validacion'], 'reporte_general')
 */
export function exportarCSV(datos, columnas, nombreArchivo = 'reporte') {
  if (!datos.length) throw new Error('No hay datos para exportar.')

  const encabezado = columnas.join(',')
  const filas = datos.map(fila =>
    columnas
      .map(col => {
        const valor = fila[col] ?? ''
        // Escapar comillas y comas
        const str   = String(valor).replace(/"/g, '""')
        return str.includes(',') || str.includes('"') || str.includes('\n')
          ? `"${str}"`
          : str
      })
      .join(',')
  )

  const contenido = [encabezado, ...filas].join('\n')
  const blob      = new Blob(['\uFEFF' + contenido], { type: 'text/csv;charset=utf-8;' })
  descargarBlob(blob, `${nombreArchivo}_${fechaHoy()}.csv`)
}

// ── EXPORTAR JSON ─────────────────────────────────────────────

/**
 * Descarga los datos como JSON (útil para debug o integración externa).
 * @param {object[]} datos
 * @param {string}   nombreArchivo
 */
export function exportarJSON(datos, nombreArchivo = 'reporte') {
  const contenido = JSON.stringify(datos, null, 2)
  const blob      = new Blob([contenido], { type: 'application/json' })
  descargarBlob(blob, `${nombreArchivo}_${fechaHoy()}.json`)
}

// ── EXPORTAR EXCEL (requiere SheetJS) ────────────────────────
//
//  Instala la dependencia:
//    npm install xlsx
//
//  Luego descomenta y usa:
//
// import * as XLSX from 'xlsx'
//
// export function exportarExcel(datos, columnas, nombreArchivo = 'reporte') {
//   const filas = datos.map(fila =>
//     Object.fromEntries(columnas.map(col => [col, fila[col] ?? '']))
//   )
//   const hoja = XLSX.utils.json_to_sheet(filas)
//   const libro = XLSX.utils.book_new()
//   XLSX.utils.book_append_sheet(libro, hoja, 'Reporte')
//   XLSX.writeFile(libro, `${nombreArchivo}_${fechaHoy()}.xlsx`)
// }

// ── EXPORTAR PDF (requiere jsPDF + jspdf-autotable) ──────────
//
//  Instala las dependencias:
//    npm install jspdf jspdf-autotable
//
//  Luego descomenta y usa:
//
// import jsPDF from 'jspdf'
// import autoTable from 'jspdf-autotable'
//
// export function exportarPDF(datos, columnas, etiquetas, nombreArchivo = 'reporte') {
//   const doc = new jsPDF({ orientation: 'landscape' })
//
//   doc.setFontSize(14)
//   doc.text('Censo Hotelero Acapulco 2026 — UAGro', 14, 16)
//   doc.setFontSize(10)
//   doc.text(`Generado el ${new Date().toLocaleDateString('es-MX')}`, 14, 23)
//
//   autoTable(doc, {
//     startY: 28,
//     head: [etiquetas],
//     body: datos.map(fila => columnas.map(col => fila[col] ?? '—')),
//     styles:     { font: 'helvetica', fontSize: 9 },
//     headStyles: { fillColor: [13, 31, 78] },
//   })
//
//   doc.save(`${nombreArchivo}_${fechaHoy()}.pdf`)
// }

// ── HISTORIAL DE EXPORTACIONES ───────────────────────────────

/**
 * Guarda un registro de exportación en la tabla actividad_sistema.
 * @param {string} tipo        - 'csv' | 'excel' | 'pdf'
 * @param {string} descripcion - Descripción del reporte generado
 * @param {number} totalFilas
 */
export async function registrarExportacion(tipo, descripcion, totalFilas) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { data: perfil } = await supabase
    .from('usuarios')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  await supabase.from('actividad_sistema').insert({
    usuario_id:     perfil?.id,
    accion:         'EXPORT',
    descripcion:    `Reporte ${tipo.toUpperCase()} generado: ${descripcion}`,
    tabla_afectada: 'levantamientos',
    metadata: {
      formato:     tipo,
      total_filas: totalFilas,
      fecha:       new Date().toISOString(),
    },
  })
}

// ── HELPERS INTERNOS ─────────────────────────────────────────

function descargarBlob(blob, nombreArchivo) {
  const url  = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href  = url
  link.setAttribute('download', nombreArchivo)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function fechaHoy() {
  return new Date().toISOString().split('T')[0]
}

// ── COLUMNAS PREDEFINIDAS POR TIPO ───────────────────────────
//  Úsalas en exportarCSV para no tener que escribirlas cada vez.

export const COLUMNAS_REPORTE = {
  general: [
    'hotel_nombre', 'razon_social', 'zona', 'estado_operativo',
    'habitaciones', 'pisos', 'censador_nombre', 'fecha_levantamiento',
    'estado_validacion', 'validador_nombre',
  ],
  conCoordenadas: [
    'hotel_nombre', 'zona', 'habitaciones', 'estado_operativo',
    'latitud', 'longitud', 'censador_nombre', 'fecha_levantamiento',
  ],
  censadores: [
    'censador', 'correo', 'total', 'validados', 'pendientes', 'rechazados', 'habitaciones',
  ],
  zonas: [
    'zona', 'total', 'validados', 'pendientes', 'abiertos', 'cerrados', 'habitaciones',
  ],
}