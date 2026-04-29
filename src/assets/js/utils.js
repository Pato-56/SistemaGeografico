/* ============================================================
   utils.js  —  Utilidades compartidas
   ============================================================ */

/**
 * Muestra la fecha actual formateada en un elemento por ID
 * @param {string} elementId
 */
export function mostrarFechaHoy(elementId) {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.textContent = new Date().toLocaleDateString('es-MX', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });
}

/**
 * Anima un contador numérico desde 0 hasta target
 * @param {string} elementId
 * @param {number} target
 * @param {string} [prefix='']
 * @param {number} [duration=900]
 */
export function animateCount(elementId, target, prefix = '', duration = 900) {
  const el = document.getElementById(elementId);
  if (!el) return;
  let start = 0;
  const step = target / (duration / 16);
  const timer = setInterval(() => {
    start += step;
    if (start >= target) {
      el.textContent = prefix + target.toLocaleString();
      clearInterval(timer);
    } else {
      el.textContent = prefix + Math.floor(start).toLocaleString();
    }
  }, 16);
}

/**
 * Toggle visibilidad de input password
 * @param {string} inputId
 */
export function togglePasswordVisibility(inputId) {
  const input = document.getElementById(inputId);
  if (!input) return;
  input.type = input.type === 'password' ? 'text' : 'password';
}

/**
 * Muestra un toast de notificación
 * @param {string} msg
 * @param {'verde'|'rojo'|'amarillo'} tipo
 * @param {number} [duracion=3200]
 */
export function showToast(msg, tipo = 'verde', duracion = 3200) {
  const toast = document.getElementById('toast');
  const msgEl = document.getElementById('toastMsg');
  if (!toast || !msgEl) return;
  msgEl.textContent = msg;
  toast.className = `toast ${tipo} show`;
  setTimeout(() => toast.classList.remove('show'), duracion);
}

/**
 * Crea un marcador circular personalizado para Leaflet
 * @param {string} color  - Color hex o CSS
 * @returns {L.DivIcon}
 */
export function crearIconoMapa(color = '#c0392b') {
  return L.divIcon({
    className: '',
    html: `<div style="width:16px;height:16px;border-radius:50%;background:${color};border:2.5px solid white;box-shadow:0 3px 8px rgba(0,0,0,0.4);"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -12]
  });
}

/** Colores por estado operativo */
export const COLORES_ESTADO = {
  abierto: '#27ae60',
  parcial:  '#f39c12',
  cerrado:  '#c0392b'
};

/** Íconos emoji por estado operativo */
export const ICONOS_ESTADO_OP = {
  abierto: '🟢',
  parcial:  '🟡',
  cerrado:  '🔴'
};

/** Etiquetas por estado operativo */
export const LABELS_ESTADO_OP = {
  abierto: 'En Operación',
  parcial:  'Operación Parcial',
  cerrado:  'Cerrado'
};

/** Íconos emoji por estado de validación */
export const ICONOS_ESTADO_VAL = {
  validado:  '✅',
  pendiente: '⏳',
  rechazado: '❌'
};

/** Etiquetas por estado de validación */
export const LABELS_ESTADO_VAL = {
  validado:  'Validado',
  pendiente: 'Pendiente',
  rechazado: 'Rechazado'
};