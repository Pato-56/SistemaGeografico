/* ============================================================
   recuperar-contrasena.js  —  Flujo de recuperación de contraseña
   Conectado a Supabase Auth
   ============================================================ */

   // ✅ Ruta relativa desde assets/js/ hacia services/
import { enviarCorreoRecuperacion, restablecerPassword } 
  from '../../services/authService.js'
let currentStep = 1;
let resendInterval;

// Al cargar la página: si Supabase redirigió aquí con un token
// en el hash (#access_token=...), saltar directo al paso 3
window.addEventListener('load', () => {
  const hash = window.location.hash
  if (hash.includes('access_token') && hash.includes('type=recovery')) {
    goStep(3)
  }
})

// ── Paso 1: Validar email ──
function validateEmail() {
  const val   = document.getElementById('emailInput').value.trim();
  const valid = val.length > 0 && val.includes('@');
  document.getElementById('btnStep1').disabled = !valid;
  document.getElementById('emailError').style.display = 'none';
}

async function goStep2() {
  const email = document.getElementById('emailInput').value
  const btnEl = document.getElementById('btnStep1')
  const errEl = document.getElementById('emailError')
  if (!email) return

  btnEl.disabled = true
  btnEl.textContent = 'Enviando…'

  try {
    await enviarCorreoRecuperacion(email)
    document.getElementById('emailMostrado').textContent = email
    goStep(2) // Panel 2 ahora solo dice "revisa tu correo y haz clic en el enlace"
  } catch (err) {
    errEl.textContent   = '⚠ ' + (err.message ?? 'Error al enviar el correo.')
    errEl.style.display = 'block'
    btnEl.disabled      = false
    btnEl.textContent   = 'Enviar código de verificación →'
  }
}

// ── OTP ──
function otpNext(el, prevId, nextId) {
  el.classList.toggle('filled', el.value.length > 0);
  if (el.value.length === 1 && nextId) document.getElementById(nextId).focus();
  checkOTP();
}

function otpBack(e, el, prevId) {
  if (e.key === 'Backspace' && el.value === '' && prevId)
    document.getElementById(prevId).focus();
}

function checkOTP() {
  const code = ['otp1','otp2','otp3','otp4','otp5','otp6']
    .map(id => document.getElementById(id).value).join('');
  document.getElementById('btnStep2').disabled = code.length < 6;
}

function goStep3() {
  const code = ['otp1','otp2','otp3','otp4','otp5','otp6']
    .map(id => document.getElementById(id).value).join('');
  if (code.length < 6) return;
  goStep(3);
}

function startResendTimer() {
  let t = 60;
  document.getElementById('resendBtn').disabled = true;
  document.getElementById('resendTimer').style.display = 'block';
  clearInterval(resendInterval);
  resendInterval = setInterval(() => {
    t--;
    document.getElementById('timerCount').textContent = t;
    if (t <= 0) {
      clearInterval(resendInterval);
      document.getElementById('resendBtn').disabled = false;
      document.getElementById('resendTimer').style.display = 'none';
    }
  }, 1000);
}

function resendCode() {
  ['otp1','otp2','otp3','otp4','otp5','otp6'].forEach(id => {
    const el = document.getElementById(id);
    el.value = ''; el.classList.remove('filled');
  });
  document.getElementById('btnStep2').disabled = true;
  startResendTimer();
  document.getElementById('otp1').focus();
}

// ── Paso 3: Contraseña ──
function checkStrength() {
  const p = document.getElementById('pass1').value;
  const fill  = document.getElementById('strengthFill');
  const label = document.getElementById('strengthLabel');
  const reqs = [
    { id:'req1', test: p.length >= 8 },
    { id:'req2', test: /[A-Z]/.test(p) },
    { id:'req3', test: /[0-9]/.test(p) },
    { id:'req4', test: /[^a-zA-Z0-9]/.test(p) },
  ];
  reqs.forEach(r => {
    const el = document.getElementById(r.id);
    el.style.color = r.test ? '#27ae60' : '#9baabe';
    el.querySelector('span').textContent = r.test ? '✓' : '○';
  });
  const score = reqs.filter(r => r.test).length;
  const pcts   = ['0%','25%','50%','75%','100%'];
  const colors = ['#ccc','#e74c3c','#f39c12','#3498db','#27ae60'];
  const labels = ['','Débil','Moderada','Buena','Fuerte'];
  fill.style.width      = pcts[score];
  fill.style.background = colors[score];
  label.textContent     = score > 0 ? `Contraseña ${labels[score]}` : 'Ingresa una contraseña';
  label.style.color     = score > 0 ? colors[score] : '#9baabe';
  checkMatch();
}

function checkMatch() {
  const p1  = document.getElementById('pass1').value;
  const p2  = document.getElementById('pass2').value;
  const msg = document.getElementById('matchMsg');
  const btn = document.getElementById('btnStep3');
  const score = ['req1','req2','req3','req4'].filter(id =>
    document.getElementById(id).style.color === 'rgb(39, 174, 96)').length;

  if (p2.length > 0) {
    msg.style.display = 'block';
    if (p1 === p2 && score >= 2) {
      msg.textContent  = '✓ Las contraseñas coinciden';
      msg.style.color  = '#27ae60';
      btn.disabled     = false;
    } else if (p1 !== p2) {
      msg.textContent  = '⚠ Las contraseñas no coinciden';
      msg.style.color  = 'var(--rojo)';
      btn.disabled     = true;
    }
  } else {
    msg.style.display = 'none';
    btn.disabled = true;
  }
}

async function goStep4() {
  const pass   = document.getElementById('pass1').value;
  const btnEl  = document.getElementById('btnStep3');

  btnEl.disabled    = true;
  btnEl.textContent = 'Guardando…';

  try {
    await restablecerPassword(pass);
    goStep(4);
    document.getElementById('lockIcon').textContent = '🔓';
    let c = 5;
    const interval = setInterval(() => {
      c--;
      document.getElementById('countdownNum').textContent = c;
      if (c <= 0) {
        clearInterval(interval);
        goLogin();
      }
    }, 1000);
  } catch (err) {
    btnEl.disabled    = false;
    btnEl.textContent = '✓ Establecer nueva contraseña';
    const msg = document.getElementById('matchMsg');
    msg.textContent  = '⚠ ' + (err.message ?? 'Error al guardar. Intenta de nuevo.');
    msg.style.color  = 'var(--rojo)';
    msg.style.display = 'block';
  }
}

// ── Navegación general ──
function goStep(n) {
  document.getElementById(`panel${currentStep}`).classList.remove('active');
  currentStep = n;
  document.getElementById(`panel${n}`).classList.add('active');
  updateSteps(n);
  updateHeader(n);
}

function updateSteps(n) {
  for (let i = 1; i <= 4; i++) {
    const dot = document.getElementById(`dot${i}`);
    const lbl = document.getElementById(`lbl${i}`);
    if (i < n) {
      dot.className = 'step-dot done';
      dot.textContent = '✓';
      lbl.className = 'step-label';
    } else if (i === n) {
      dot.className = 'step-dot active';
      dot.textContent = i === 4 ? '✓' : i;
      lbl.className = 'step-label active-label';
    } else {
      dot.className = 'step-dot inactive';
      dot.textContent = i === 4 ? '✓' : i;
      lbl.className = 'step-label';
    }
  }
  for (let i = 1; i <= 3; i++) {
    document.getElementById(`line${i}`).className = 'step-line' + (i < n ? ' done' : '');
  }
}

const HEADERS = {
  1: { title: 'Recuperar contraseña',   desc: 'Ingresa tu correo institucional para recibir las instrucciones.' },
  2: { title: 'Verifica tu identidad',  desc: 'Ingresa el código de 6 dígitos que enviamos a tu correo.' },
  3: { title: 'Nueva contraseña',       desc: 'Elige una contraseña segura para proteger tu cuenta.' },
  4: { title: '¡Todo listo!',           desc: 'Tu cuenta ha sido recuperada exitosamente.' },
};

function updateHeader(n) {
  document.getElementById('headerTitle').textContent = HEADERS[n].title;
  document.getElementById('headerDesc').textContent  = HEADERS[n].desc;
}

function togglePass(id) {
  const input = document.getElementById(id);
  if (input) input.type = input.type === 'password' ? 'text' : 'password';
}

function goLogin() {
  window.location.href='login.html';
}

// Exponer globalmente
// Exponer funciones al scope global (requerido con type="module")
Object.assign(window, {
  validateEmail,
  goStep2,
  goStep3,
  goStep4,
  goStep,
  otpNext,
  otpBack,
  checkOTP,
  resendCode,
  checkStrength,
  checkMatch,
  togglePass,
  goLogin,
});