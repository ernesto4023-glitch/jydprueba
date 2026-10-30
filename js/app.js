(() => {
  "use strict";

  const USERS_KEY = "jdgym_users_v1";
  const SESSION_KEY = "jdgym_session_v1";
  const ADMIN_EMAIL = "admin@jdgym.com";
  const ADMIN_PASSWORD = "Admin123*";
  const view = document.getElementById("appView");
  const toastEl = document.getElementById("toast");
  let currentStep = 1;

  const getUsers = () => {
    try { return JSON.parse(localStorage.getItem(USERS_KEY) || "[]"); }
    catch { return []; }
  };
  const saveUsers = users => localStorage.setItem(USERS_KEY, JSON.stringify(users));
  const getSession = () => {
    try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null"); }
    catch { return null; }
  };
  const setSession = userId => sessionStorage.setItem(SESSION_KEY, JSON.stringify({ userId }));
  const clearSession = () => sessionStorage.removeItem(SESSION_KEY);

  function toast(message) {
    toastEl.textContent = message;
    toastEl.classList.add("show");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => toastEl.classList.remove("show"), 2800);
  }

  function escapeHTML(value = "") {
    return String(value).replace(/[&<>"']/g, c => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    }[c]));
  }

  async function hashPassword(password) {
    if (!window.crypto?.subtle) {
      throw new Error("Abre el proyecto desde localhost para habilitar el cifrado de contraseñas.");
    }
    const data = new TextEncoder().encode(password);
    const digest = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("");
  }

  function calculateAge(dateString) {
    if (!dateString) return null;
    const birth = new Date(`${dateString}T00:00:00`);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const month = today.getMonth() - birth.getMonth();
    if (month < 0 || (month === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  }

  function getBMI(weight, heightCm) {
    const h = Number(heightCm) / 100;
    if (!Number(weight) || !h) return null;
    return Number(weight) / (h * h);
  }

  function bmiLabel(bmi, age) {
    if (age !== null && age < 18) return "Requiere valoración por edad";
    if (bmi < 18.5) return "Bajo peso";
    if (bmi < 25) return "Peso normal";
    if (bmi < 30) return "Sobrepeso";
    return "Obesidad";
  }

  function bmiMarker(bmi) {
    if (!bmi) return 50;
    return Math.max(2, Math.min(98, ((bmi - 15) / 25) * 100));
  }

  async function ensureAdmin() {
    const users = getUsers();
    if (users.some(u => u.email.toLowerCase() === ADMIN_EMAIL)) return;
    try {
      users.push({
        id: "admin-jdgym",
        role: "admin",
        name: "Administrador J&D GYM",
        email: ADMIN_EMAIL,
        passwordHash: await hashPassword(ADMIN_PASSWORD),
        createdAt: new Date().toISOString()
      });
      saveUsers(users);
    } catch (e) {
      console.warn("No fue posible crear el usuario demo de administración.", e);
    }
  }

  function renderLogin() {
    view.innerHTML = `
      <section class="auth-layout">
        <div class="auth-visual">
          <div class="logo-pill"><span>J&amp;D</span> GYM</div>
          <div class="visual-copy">
            <div class="visual-tag">FUERZA · DISCIPLINA · BIENESTAR</div>
            <h1>Tu progreso<br><strong>comienza aquí.</strong></h1>
            <p>Un espacio para gestionar tu inscripción, conocer tu estado físico y hacer seguimiento a tus objetivos.</p>
          </div>
          <div class="visual-tag">TOLIMA GRANDE</div>
        </div>
        <div class="auth-panel">
          <div class="eyebrow">Bienvenido de nuevo</div>
          <h2>Iniciar sesión</h2>
          <p class="subtext">Ingresa a tu cuenta para consultar tu información y seguimiento.</p>
          <form id="loginForm" class="form-stack">
            <div class="field">
              <label for="loginEmail">Correo electrónico</label>
              <div class="input-icon"><span>✉</span><input id="loginEmail" type="email" placeholder="nombre@correo.com" required autocomplete="username"></div>
            </div>
            <div class="field">
              <label for="loginPassword">Contraseña</label>
              <div class="input-icon"><span>▣</span><input id="loginPassword" type="password" placeholder="Tu contraseña" required autocomplete="current-password"></div>
            </div>
            <button class="btn btn-primary btn-block" type="submit">INGRESAR</button>
          </form>
          <div class="auth-links">¿Todavía no tienes cuenta? <button class="text-button" id="goRegister">Regístrate aquí</button></div>
          <div class="demo-note"><strong>Acceso administrador de prueba</strong><br>Correo: admin@jdgym.com<br>Contraseña: Admin123*</div>
        </div>
      </section>`;

    document.getElementById("goRegister").addEventListener("click", renderRegister);
    document.getElementById("loginForm").addEventListener("submit", login);
  }

  async function login(event) {
    event.preventDefault();
    const email = document.getElementById("loginEmail").value.trim().toLowerCase();
    const password = document.getElementById("loginPassword").value;
    try {
      const hash = await hashPassword(password);
      const user = getUsers().find(u => u.email.toLowerCase() === email && u.passwordHash === hash);
      if (!user) return toast("Correo o contraseña incorrectos.");
      setSession(user.id);
      user.role === "admin" ? renderAdmin() : renderDashboard(user);
    } catch (e) {
      toast(e.message || "No fue posible iniciar sesión.");
    }
  }

  function renderRegister() {
    currentStep = 1;
    view.innerHTML = `
      <section class="register-shell">
        <div class="register-head">
          <div>
            <div class="eyebrow">Nueva inscripción</div>
            <h1>Regístrate en J&amp;D GYM</h1>
            <p>Completa tus datos, revisa los consentimientos y registra tu información inicial de salud.</p>
          </div>
          <button class="btn btn-outline" id="backLogin">Volver al login</button>
        </div>

        <div class="stepper">
          <div class="step-item active" data-step-indicator="1"><span class="step-number">1</span><span class="step-label">Datos básicos</span></div>
          <div class="step-item" data-step-indicator="2"><span class="step-number">2</span><span class="step-label">Consentimientos</span></div>
          <div class="step-item" data-step-indicator="3"><span class="step-number">3</span><span class="step-label">Salud e IMC</span></div>
        </div>

        <form id="registerForm">
          <section class="form-section active" data-step="1">
            <h2 class="section-title">Información personal</h2>
            <div class="form-grid">
              <div class="field span-2"><label for="fullName">Nombres y apellidos *</label><input id="fullName" name="fullName" required maxlength="100" placeholder="Como aparece en tu documento"></div>
              <div class="field"><label for="docType">Tipo de documento *</label><select id="docType" required><option value="">Selecciona</option><option>Cédula de ciudadanía</option><option>Tarjeta de identidad</option><option>Cédula de extranjería</option><option>Pasaporte</option></select></div>
              <div class="field"><label for="docNumber">Número de documento *</label><input id="docNumber" required inputmode="numeric" maxlength="25" placeholder="Número de identificación"></div>
              <div class="field"><label for="birthDate">Fecha de nacimiento *</label><input id="birthDate" type="date" required></div>
              <div class="field"><label for="phone">Teléfono / WhatsApp *</label><input id="phone" type="tel" required maxlength="20" placeholder="300 000 0000"></div>
              <div class="field span-2"><label for="email">Correo electrónico *</label><input id="email" type="email" required placeholder="nombre@correo.com"></div>
              <div class="field"><label for="password">Crear contraseña *</label><input id="password" type="password" required minlength="6" placeholder="Mínimo 6 caracteres"></div>
              <div class="field"><label for="passwordConfirm">Confirmar contraseña *</label><input id="passwordConfirm" type="password" required minlength="6" placeholder="Repite tu contraseña"></div>
              <div class="field span-2"><label for="address">Dirección (opcional)</label><input id="address" maxlength="150" placeholder="Barrio, dirección o referencia"></div>
            </div>
          </section>

          <section class="form-section" data-step="2">
            <h2 class="section-title">Consentimientos y normas del gimnasio</h2>
            <div class="consent-card">
              <h3>1. Consentimiento informado y reconocimiento de riesgos</h3>
              <p>Declaro que conozco que el ejercicio físico y el uso de equipos pueden implicar riesgos, entre ellos fatiga, caídas y lesiones musculares, articulares o cardiorrespiratorias. Entiendo que debo respetar mis capacidades, seguir las instrucciones del personal y comunicar cualquier síntoma, lesión o condición que pueda afectar mi entrenamiento.</p>
              <label class="check-row"><input id="consentRisk" type="checkbox" required><span>He leído y comprendido la información sobre los riesgos de la actividad física. *</span></label>
            </div>
            <div class="consent-card">
              <h3>2. Declaración de salud y atención de emergencias</h3>
              <p>Me comprometo a suministrar información cierta y actualizada sobre mi estado de salud. Si se presenta una emergencia, autorizo al personal del gimnasio a activar los servicios de atención correspondientes y a contactar a la persona que indique.</p>
              <label class="check-row"><input id="consentEmergency" type="checkbox" required><span>Autorizo la activación de atención de emergencia y el contacto indicado. *</span></label>
            </div>
            <div class="consent-card">
              <h3>3. Normas de funcionamiento</h3>
              <p>Me comprometo a usar ropa y calzado deportivo cerrado, llevar toalla, utilizar los equipos de manera adecuada, dejarlos libres después de usarlos, no realizar ejercicios peligrosos sin supervisión y cuidar las instalaciones y los elementos del gimnasio.</p>
              <label class="check-row"><input id="consentRules" type="checkbox" required><span>He leído y acepto las normas de funcionamiento y utilización de las instalaciones. *</span></label>
            </div>
            <div class="consent-card">
              <h3>4. Tratamiento de datos personales</h3>
              <p>Autorizo a J&amp;D GYM a tratar mis datos para gestionar la inscripción, controlar el acceso, administrar el servicio, mantener contacto relacionado con mi plan y llevar el seguimiento de mi actividad. Puedo solicitar información sobre mis datos y ejercer los derechos que me reconoce la ley.</p>
              <label class="check-row"><input id="consentData" type="checkbox" required><span>Autorizo el tratamiento de mis datos personales para las finalidades informadas. *</span></label>
            </div>
            <div class="consent-card">
              <h3>5. Uso de fotografías y videos (opcional)</h3>
              <p>Esta autorización es independiente de la inscripción. Si la acepto, permito el uso de fotografías o videos en los que aparezca para publicaciones y material promocional del gimnasio.</p>
              <label class="check-row"><input id="consentImage" type="checkbox"><span>Autorizo voluntariamente el uso de mi imagen para fines promocionales.</span></label>
            </div>
            <div class="legal-note">La aceptación de estos documentos no elimina los derechos que la ley reconoce al usuario ni exonera al gimnasio de sus obligaciones legales. Los textos son una base de demostración y deben revisarse jurídicamente antes de poner la aplicación en producción.</div>
          </section>

          <section class="form-section" data-step="3">
            <h2 class="section-title">Información inicial de salud y objetivos</h2>
            <div class="form-grid">
              <div class="field"><label for="weight">Peso actual (kg) *</label><input id="weight" type="number" min="20" max="350" step="0.1" required placeholder="Ej. 76.5"></div>
              <div class="field"><label for="height">Estatura (cm) *</label><input id="height" type="number" min="100" max="230" step="0.1" required placeholder="Ej. 172"></div>
              <div class="field span-2"><label for="healthStatus">¿Tienes alguna condición médica, lesión o restricción para realizar ejercicio? *</label><select id="healthStatus" required><option value="">Selecciona una opción</option><option value="No">No</option><option value="Sí">Sí</option><option value="No estoy seguro">No estoy seguro</option></select></div>
              <div class="field span-2"><label for="healthNotes">Describe la condición, lesión, medicamento o recomendación médica (opcional)</label><textarea id="healthNotes" placeholder="Escribe aquí la información que consideres importante."></textarea><small>Esta información es sensible. Se solicita únicamente para orientar de forma segura el servicio.</small></div>
              <div class="field"><label for="emergencyName">Contacto de emergencia *</label><input id="emergencyName" required placeholder="Nombre y apellido"></div>
              <div class="field"><label for="emergencyPhone">Teléfono de emergencia *</label><input id="emergencyPhone" type="tel" required placeholder="Número de contacto"></div>
              <div class="field span-2">
                <label>¿Cuáles son tus objetivos en el gimnasio?</label>
                <div class="goal-grid">
                  <label class="goal-option"><input type="checkbox" name="goal" value="Pérdida de grasa"> Pérdida de grasa</label>
                  <label class="goal-option"><input type="checkbox" name="goal" value="Aumento de tono muscular"> Aumento de tono muscular</label>
                  <label class="goal-option"><input type="checkbox" name="goal" value="Ganar fuerza y masa muscular"> Ganar fuerza y masa muscular</label>
                  <label class="goal-option"><input type="checkbox" name="goal" value="Aumento de tamaño muscular"> Aumento de tamaño muscular</label>
                  <label class="goal-option"><input type="checkbox" name="goal" value="Rehabilitación física o respiratoria"> Rehabilitación física o respiratoria</label>
                  <label class="goal-option"><input type="checkbox" name="goal" value="Mejorar rendimiento"> Mejorar rendimiento</label>
                </div>
              </div>
              <div class="field span-2"><div class="legal-note">El IMC se calculará con tu peso y estatura. Es un indicador orientativo, no un diagnóstico médico. En menores de 18 años se requiere una interpretación específica según edad y sexo.</div></div>
            </div>
          </section>

          <div class="form-actions">
            <button class="btn btn-light hidden" type="button" id="prevStep">Anterior</button>
            <button class="btn btn-primary" type="button" id="nextStep">Continuar</button>
            <button class="btn btn-primary hidden" type="submit" id="finishRegister">Crear mi cuenta</button>
          </div>
        </form>
      </section>`;

    document.getElementById("backLogin").addEventListener("click", renderLogin);
    document.getElementById("nextStep").addEventListener("click", nextRegisterStep);
    document.getElementById("prevStep").addEventListener("click", prevRegisterStep);
    document.getElementById("registerForm").addEventListener("submit", register);
    updateStepper();
  }

  function validateStep(step) {
    const section = view.querySelector(`[data-step="${step}"]`);
    const fields = [...section.querySelectorAll("input[required], select[required], textarea[required]")];
    for (const field of fields) {
      if (field.type === "checkbox" && !field.checked) {
        field.focus();
        toast("Debes marcar las autorizaciones obligatorias para continuar.");
        return false;
      }
      if (field.type !== "checkbox" && !field.checkValidity()) {
        field.reportValidity();
        return false;
      }
    }
    if (step === 1) {
      const p1 = document.getElementById("password").value;
      const p2 = document.getElementById("passwordConfirm").value;
      if (p1 !== p2) {
        document.getElementById("passwordConfirm").focus();
        toast("Las contraseñas no coinciden.");
        return false;
      }
      const doc = document.getElementById("docNumber").value.trim();
      const email = document.getElementById("email").value.trim().toLowerCase();
      if (getUsers().some(u => u.email.toLowerCase() === email)) {
        toast("Ya existe una cuenta con ese correo.");
        return false;
      }
      if (getUsers().some(u => u.documentNumber === doc)) {
        toast("Ya existe un registro con ese documento.");
        return false;
      }
      const birth = document.getElementById("birthDate").value;
      if (birth && new Date(birth) > new Date()) {
        toast("La fecha de nacimiento no puede ser futura.");
        return false;
      }
    }
    return true;
  }

  function nextRegisterStep() {
    if (!validateStep(currentStep)) return;
    currentStep = Math.min(3, currentStep + 1);
    showStep();
  }
  function prevRegisterStep() {
    currentStep = Math.max(1, currentStep - 1);
    showStep();
  }
  function showStep() {
    view.querySelectorAll(".form-section").forEach(section => {
      section.classList.toggle("active", Number(section.dataset.step) === currentStep);
    });
    updateStepper();
    document.getElementById("prevStep").classList.toggle("hidden", currentStep === 1);
    document.getElementById("nextStep").classList.toggle("hidden", currentStep === 3);
    document.getElementById("finishRegister").classList.toggle("hidden", currentStep !== 3);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function updateStepper() {
    view.querySelectorAll("[data-step-indicator]").forEach(item => {
      const n = Number(item.dataset.stepIndicator);
      item.classList.toggle("active", n === currentStep);
      item.classList.toggle("done", n < currentStep);
      item.querySelector(".step-number").textContent = n < currentStep ? "✓" : n;
    });
  }

  async function register(event) {
    event.preventDefault();
    if (!validateStep(3)) return;
    const form = document.getElementById("registerForm");
    const weight = Number(document.getElementById("weight").value);
    const height = Number(document.getElementById("height").value);
    const age = calculateAge(document.getElementById("birthDate").value);
    const bmi = getBMI(weight, height);
    const email = document.getElementById("email").value.trim().toLowerCase();
    const password = document.getElementById("password").value;

    const user = {
      id: (window.crypto?.randomUUID ? crypto.randomUUID() : `u-${Date.now()}`),
      role: "user",
      name: document.getElementById("fullName").value.trim(),
      documentType: document.getElementById("docType").value,
      documentNumber: document.getElementById("docNumber").value.trim(),
      birthDate: document.getElementById("birthDate").value,
      phone: document.getElementById("phone").value.trim(),
      email,
      address: document.getElementById("address").value.trim(),
      passwordHash: await hashPassword(password),
      weight,
      height,
      bmi: Number(bmi.toFixed(1)),
      age,
      healthStatus: document.getElementById("healthStatus").value,
      healthNotes: document.getElementById("healthNotes").value.trim(),
      emergencyName: document.getElementById("emergencyName").value.trim(),
      emergencyPhone: document.getElementById("emergencyPhone").value.trim(),
      goals: [...form.querySelectorAll('input[name="goal"]:checked')].map(x => x.value),
      consents: {
        risk: document.getElementById("consentRisk").checked,
        emergency: document.getElementById("consentEmergency").checked,
        rules: document.getElementById("consentRules").checked,
        data: document.getElementById("consentData").checked,
        image: document.getElementById("consentImage").checked,
        acceptedAt: new Date().toISOString()
      },
      createdAt: new Date().toISOString()
    };

    const users = getUsers();
    if (users.some(u => u.email.toLowerCase() === email || u.documentNumber === user.documentNumber)) {
      toast("Ya existe un usuario con ese correo o documento.");
      return;
    }
    users.push(user);
    saveUsers(users);
    setSession(user.id);
    renderDashboard(user);
    toast("Registro completado correctamente.");
  }

  function renderDashboard(user) {
    const bmi = Number(user.bmi || getBMI(user.weight, user.height)).toFixed(1);
    const age = user.age ?? calculateAge(user.birthDate);
    const label = bmiLabel(Number(bmi), age);
    const firstName = (user.name || "Usuario").trim().split(/\s+/)[0];
    view.innerHTML = `
      <section class="dashboard-shell">
        <div class="dashboard-top">
          <div class="dashboard-nav">
            <a class="brand" href="#"><span class="brand-mark">J&amp;D</span><span class="brand-name">GYM</span></a>
            <div class="user-mini"><span>Mi cuenta</span><span class="avatar">${escapeHTML(firstName.charAt(0).toUpperCase())}</span></div>
          </div>
          <div class="dashboard-head">
            <div class="eyebrow">Tu espacio personal</div>
            <h1>¡Hola, ${escapeHTML(firstName)}!</h1>
            <p>Bienvenido a J&amp;D GYM. Este es tu punto de partida.</p>
          </div>
        </div>
        <div class="dashboard-content">
          <section class="metrics-card">
            <div class="metrics-title"><h2>Tu información actual</h2><span>Registro inicial</span></div>
            <div class="metrics-grid">
              <div class="metric"><span class="metric-label">Peso</span><div class="metric-value">${escapeHTML(user.weight)} <small>kg</small></div></div>
              <div class="metric"><span class="metric-label">Estatura</span><div class="metric-value">${escapeHTML(user.height)} <small>cm</small></div></div>
              <div class="metric"><span class="metric-label">IMC</span><div class="metric-value">${bmi}</div></div>
            </div>
            <div class="imc-status"><span>Tu IMC indica:</span><strong>${escapeHTML(label)}</strong></div>
            <div class="imc-track"><span class="imc-marker" style="left:${bmiMarker(Number(bmi))}%"></span></div>
            <p class="imc-disclaimer">Indicador orientativo para adultos. No reemplaza una valoración médica o nutricional. Para menores de 18 años se requiere una curva de IMC para la edad.</p>
          </section>

          <div class="quick-grid">
            <button class="quick-card" data-action="profile"><span class="quick-icon">♙</span><span>Mi perfil</span></button>
            <button class="quick-card" data-action="goals"><span class="quick-icon">✚</span><span>Mis objetivos</span></button>
            <button class="quick-card" data-action="consents"><span class="quick-icon">▤</span><span>Consentimientos</span></button>
            <button class="quick-card" data-action="update"><span class="quick-icon">↗</span><span>Actualizar medidas</span></button>
          </div>

          <div class="dashboard-bottom">
            <div><strong>Disciplina · Resultados · Bienestar</strong><span>Tu progreso se construye entrenamiento a entrenamiento.</span></div>
            <button class="btn btn-primary" id="logoutBtn">Cerrar sesión</button>
          </div>
        </div>
      </section>`;

    view.querySelectorAll("[data-action]").forEach(btn => btn.addEventListener("click", () => {
      const action = btn.dataset.action;
      if (action === "profile") showModal("Mi perfil", profileHTML(user));
      if (action === "goals") showModal("Mis objetivos", `<p>${user.goals?.length ? user.goals.map(g => `<span class="goal-option" style="display:inline-flex;margin:4px">${escapeHTML(g)}</span>`).join("") : "Aún no has seleccionado objetivos."}</p>`);
      if (action === "consents") showModal("Estado de consentimientos", consentsHTML(user));
      if (action === "update") showUpdateModal(user);
    }));
    document.getElementById("logoutBtn").addEventListener("click", logout);
  }

  function profileHTML(user) {
    return `<div class="form-stack">
      <p><strong>Nombre:</strong> ${escapeHTML(user.name)}</p>
      <p><strong>Documento:</strong> ${escapeHTML(user.documentType)} · ${escapeHTML(user.documentNumber)}</p>
      <p><strong>Correo:</strong> ${escapeHTML(user.email)}</p>
      <p><strong>Teléfono:</strong> ${escapeHTML(user.phone)}</p>
      <p><strong>Fecha de inscripción:</strong> ${new Date(user.createdAt).toLocaleDateString("es-CO")}</p>
    </div>`;
  }
  function consentsHTML(user) {
    const c = user.consents || {};
    const rows = [
      ["Reconocimiento de riesgos", c.risk],
      ["Atención de emergencias", c.emergency],
      ["Normas del gimnasio", c.rules],
      ["Tratamiento de datos", c.data],
      ["Uso de imagen (opcional)", c.image]
    ];
    return `<div class="form-stack">${rows.map(([label, ok]) => `<p>${ok ? "✓" : "—"} ${label}: <strong>${ok ? "Aceptado" : "No autorizado"}</strong></p>`).join("")}<small>Fecha: ${c.acceptedAt ? new Date(c.acceptedAt).toLocaleString("es-CO") : "No disponible"}</small></div>`;
  }

  function showUpdateModal(user) {
    showModal("Actualizar medidas", `
      <form id="updateMeasures" class="form-stack">
        <div class="field"><label for="newWeight">Peso actual (kg)</label><input id="newWeight" type="number" min="20" max="350" step="0.1" value="${escapeHTML(user.weight)}" required></div>
        <div class="field"><label for="newHeight">Estatura (cm)</label><input id="newHeight" type="number" min="100" max="230" step="0.1" value="${escapeHTML(user.height)}" required></div>
        <button class="btn btn-primary" type="submit">Guardar medidas</button>
      </form>`);
    document.getElementById("updateMeasures").addEventListener("submit", e => {
      e.preventDefault();
      const users = getUsers();
      const found = users.find(u => u.id === user.id);
      if (!found) return;
      found.weight = Number(document.getElementById("newWeight").value);
      found.height = Number(document.getElementById("newHeight").value);
      found.bmi = Number(getBMI(found.weight, found.height).toFixed(1));
      found.updatedAt = new Date().toISOString();
      saveUsers(users);
      closeModal();
      renderDashboard(found);
      toast("Medidas actualizadas.");
    });
  }

  function showModal(title, content) {
    closeModal();
    const wrapper = document.createElement("div");
    wrapper.className = "modal-backdrop";
    wrapper.id = "activeModal";
    wrapper.innerHTML = `<div class="modal" role="dialog" aria-modal="true"><div class="modal-head"><h2>${title}</h2><button class="close-modal" type="button" aria-label="Cerrar">×</button></div>${content}</div>`;
    document.body.appendChild(wrapper);
    wrapper.querySelector(".close-modal").addEventListener("click", closeModal);
    wrapper.addEventListener("click", e => { if (e.target === wrapper) closeModal(); });
  }
  function closeModal() { document.getElementById("activeModal")?.remove(); }

  function renderAdmin() {
    const users = getUsers().filter(u => u.role !== "admin");
    const avg = users.length ? (users.reduce((sum, u) => sum + Number(u.bmi || 0), 0) / users.length).toFixed(1) : "—";
    view.innerHTML = `
      <section class="admin-shell">
        <div class="admin-head">
          <div class="eyebrow">Panel administrativo</div>
          <h1>Registro de usuarios</h1>
          <p>Consulta las inscripciones realizadas en este dispositivo y exporta la base a Excel.</p>
        </div>
        <div class="admin-stats">
          <div class="stat-box"><span>Usuarios registrados</span><strong>${users.length}</strong></div>
          <div class="stat-box"><span>Registros de hoy</span><strong>${users.filter(u => new Date(u.createdAt).toDateString() === new Date().toDateString()).length}</strong></div>
          <div class="stat-box"><span>IMC promedio registrado</span><strong>${avg}</strong></div>
        </div>
        <div class="admin-toolbar">
          <input class="search-input" id="userSearch" style="max-width:340px" placeholder="Buscar por nombre, documento o correo...">
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button class="btn btn-primary" id="exportCsv">Exportar para Excel</button>
            <button class="btn btn-outline" id="adminLogout">Cerrar sesión</button>
          </div>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Nombre</th><th>Documento</th><th>Teléfono</th><th>Correo</th><th>Inscripción</th><th>IMC</th><th>Objetivos</th></tr></thead>
            <tbody id="usersTableBody"></tbody>
          </table>
          <div id="emptyState" class="empty-state hidden">Todavía no hay usuarios registrados.</div>
        </div>
        <div class="legal-note">Prototipo local: los registros se guardan en el navegador donde se usa la aplicación. No se sincronizan entre dispositivos. Para operación real se necesita una base de datos central, autenticación segura y permisos de acceso.</div>
      </section>`;
    renderUsersTable(users);
    document.getElementById("userSearch").addEventListener("input", e => {
      const q = e.target.value.toLowerCase();
      renderUsersTable(users.filter(u => [u.name, u.documentNumber, u.email].some(v => String(v || "").toLowerCase().includes(q))));
    });
    document.getElementById("exportCsv").addEventListener("click", exportCSV);
    document.getElementById("adminLogout").addEventListener("click", logout);
  }

  function renderUsersTable(users) {
    const body = document.getElementById("usersTableBody");
    const empty = document.getElementById("emptyState");
    if (!users.length) {
      body.innerHTML = "";
      empty.classList.remove("hidden");
      return;
    }
    empty.classList.add("hidden");
    body.innerHTML = users.map(u => `<tr>
      <td>${escapeHTML(u.name)}</td>
      <td>${escapeHTML(u.documentType)} ${escapeHTML(u.documentNumber)}</td>
      <td>${escapeHTML(u.phone)}</td>
      <td>${escapeHTML(u.email)}</td>
      <td>${new Date(u.createdAt).toLocaleDateString("es-CO")}</td>
      <td>${escapeHTML(u.bmi ?? "—")}</td>
      <td>${escapeHTML((u.goals || []).join(", ") || "—")}</td>
    </tr>`).join("");
  }

  function exportCSV() {
    const users = getUsers().filter(u => u.role !== "admin");
    if (!users.length) return toast("No hay registros para exportar.");
    const headers = [
      "Fecha de registro", "Nombres y apellidos", "Tipo de documento", "Número de documento",
      "Fecha de nacimiento", "Teléfono", "Correo", "Dirección", "Peso kg", "Estatura cm",
      "IMC", "Estado de salud declarado", "Contacto de emergencia", "Teléfono de emergencia",
      "Objetivos", "Aceptó riesgos", "Aceptó emergencias", "Aceptó normas",
      "Autorizó tratamiento de datos", "Autorizó uso de imagen"
    ];
    const rows = users.map(u => [
      new Date(u.createdAt).toLocaleString("es-CO"), u.name, u.documentType, u.documentNumber,
      u.birthDate, u.phone, u.email, u.address, u.weight, u.height, u.bmi, u.healthStatus,
      u.emergencyName, u.emergencyPhone, (u.goals || []).join(" | "),
      u.consents?.risk ? "Sí" : "No", u.consents?.emergency ? "Sí" : "No",
      u.consents?.rules ? "Sí" : "No", u.consents?.data ? "Sí" : "No",
      u.consents?.image ? "Sí" : "No"
    ]);
    const csvCell = value => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const csv = "\uFEFF" + [headers, ...rows].map(row => row.map(csvCell).join(";")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `registro_jd_gym_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast("Archivo compatible con Excel descargado.");
  }

  function logout() {
    clearSession();
    renderLogin();
  }

  document.getElementById("brandHome").addEventListener("click", e => {
    e.preventDefault();
    const session = getSession();
    if (!session) return renderLogin();
    const user = getUsers().find(u => u.id === session.userId);
    if (!user) return renderLogin();
    user.role === "admin" ? renderAdmin() : renderDashboard(user);
  });

  async function init() {
    await ensureAdmin();
    const session = getSession();
    if (session) {
      const user = getUsers().find(u => u.id === session.userId);
      if (user) return user.role === "admin" ? renderAdmin() : renderDashboard(user);
      clearSession();
    }
    renderLogin();
  }
  init();
})();
