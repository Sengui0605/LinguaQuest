/* ============================================
   LinguaQuest - Main App Controller
   Navigation, initialization, and UI management
   ============================================ */

const App = {
  coursesData: null,
  currentScreen: "loading",

  async init() {
    const loadingBar = document.querySelector(".loading-bar");
    loadingBar.style.width = "20%";

    await Progress.load();
    loadingBar.style.width = "30%";

    await Achievements.load();
    Achievements.loadUnlocked(Progress.data.unlockedAchievements);

    try {
      const res = await fetch("data/courses.json");
      this.coursesData = await res.json();
    } catch (e) {
      console.error("Error loading courses:", e);
    }

    // Repair stats for legacy users (Now that achievements and courses are loaded)
    Progress.validateAndFixStats(this.coursesData);
    loadingBar.style.width = "60%";

    // Sync systems with recovered data
    XPSystem.load(Progress.data.totalXP);
    Theory.init();
    loadingBar.style.width = "100%";

    // Initialize dark mode
    this.initDarkMode();

    setTimeout(() => {
      if (!Progress.data.isActivated) {
        this.navigate("role-selection");
      } else if (Progress.data.userRole === "teacher") {
        this.navigate("home");
      } else if (Progress.data.userRole === "student") {
        this.validateStudentSession().then((isValid) => {
          if (isValid) {
            this.navigate("home");
            if (!Progress.data.playerName) this.showNameModal();
          } else {
            this.navigate("role-selection");
          }
        });
      }
    }, 800);
  },

  navigate(screenId) {
    SoundSystem.play("click");

    // Only validate session when accessing protected screens
    const protectedScreens = ["home","profile","level-select","course-select","quiz","results","achievements","settings","analytics","theory","teacher-dashboard","assignments"];
    if (protectedScreens.includes(screenId)) {
      this.validateStudentSession().then((isValid) => {
        if (!isValid && screenId !== "role-selection" && screenId !== "student-auth" && screenId !== "teacher-auth") {
          this.navigate("role-selection");
        }
      });
    }

    document
      .querySelectorAll(".screen")
      .forEach((s) => s.classList.remove("active"));

    const screen = document.getElementById(screenId + "-screen");
    if (screen) {
      screen.classList.add("active");
      this.currentScreen = screenId;
    }

    switch (screenId) {
      case "home":
        this.updateHomeScreen();
        break;
      case "profile":
        this.updateProfileScreen();
        break;
      case "level-select":
        this.renderLevels();
        break;
      case "achievements":
        Achievements.render("achievements-list");
        break;
      case "analytics":
        if (typeof Analytics !== "undefined")
          Analytics.render("analytics-content");
        break;
      case "assignments":
        this.loadStudentAssignments();
        break;
      case "teacher-dashboard":
        this.initTeacherDashboard();
        break;
      case "quiz-builder":
        QuizBuilder.init();
        break;
      case "student-quizzes":
        QuizBuilder.renderStudentQuizzes("student-quizzes-list");
        break;
      case "theory":
        Theory.init();
        break;
      case "settings":
        this.loadSettings();
        break;
    }
  },

  updateHomeScreen() {
    document.getElementById("home-xp").textContent =
      Progress.data.totalXP + " XP";
    document.getElementById("home-streak").textContent =
      Progress.data.dailyStreak;
    document.getElementById("home-level").textContent = XPSystem.getLevel();
    document.getElementById("player-name-display").textContent =
      Progress.data.playerName || "Explorador";
    const teacherBtn = document.getElementById("home-teacher-dashboard-btn");
    if (teacherBtn)
      teacherBtn.style.display =
        Progress.data.userRole === "teacher" ? "flex" : "none";

    const quizBuilderBtn = document.getElementById("home-quiz-builder-btn");
    if (quizBuilderBtn)
      quizBuilderBtn.style.display =
        Progress.data.userRole === "teacher" ? "flex" : "none";

    const studentQuizzesBtn = document.getElementById("home-student-quizzes-btn");
    if (studentQuizzesBtn)
      studentQuizzesBtn.style.display =
        Progress.data.userRole === "student" && Progress.data.teacherKey ? "flex" : "none";

    const assignmentsBtn = document.getElementById("home-assignments-btn");
    if (assignmentsBtn)
      assignmentsBtn.style.display =
        Progress.data.userRole === "student" && Progress.data.teacherKey
          ? "flex"
          : "none";
  },

  updateProfileScreen() {
    const d = Progress.data;
    document.getElementById("profile-avatar-emoji").textContent = d.avatar;
    document.getElementById("profile-name").textContent =
      d.playerName || "Explorador";
    document.getElementById("profile-title").textContent = XPSystem.getTitle();
    document.getElementById("profile-level").textContent = XPSystem.getLevel();
    document.getElementById("profile-current-level").textContent =
      XPSystem.getLevel();
    document.getElementById("profile-total-xp").textContent =
      d.totalXP.toLocaleString() + " XP";
    document.getElementById("profile-streak").textContent =
      d.dailyStreak + " días";
    document.getElementById("profile-courses-done").textContent =
      d.coursesCompleted;
    document.getElementById("profile-achievements-count").textContent =
      Achievements.getUnlockedCount();
    document.getElementById("profile-correct-answers").textContent =
      d.correctAnswers;
    document.getElementById("profile-total-score").textContent =
      d.totalScore.toLocaleString();

    const info = XPSystem.getLevelInfo();
    document.getElementById("profile-xp-text").textContent =
      `${d.totalXP} / ${info.xpForNext} XP`;
    document.getElementById("profile-xp-bar").style.width =
      `${XPSystem.getProgressPercent()}%`;

    Achievements.renderMini("mini-achievements", 3);
  },

  renderLevels() {
    const container = document.getElementById("levels-container");
    if (!container || !this.coursesData) return;
    container.innerHTML = "";

    const levelClasses = ["basic", "intermediate", "advanced"];

    this.coursesData.forEach((level, i) => {
      const isUnlocked = Progress.data.totalXP >= level.requiredXP;
      const completedCourses = level.courses.filter((c) =>
        Progress.isCourseCompleted(c.id),
      ).length;
      const totalCourses = level.courses.length;
      const percent =
        totalCourses > 0
          ? Math.round((completedCourses / totalCourses) * 100)
          : 0;

      const card = document.createElement("div");
      card.className = `level-card ${levelClasses[i]} ${!isUnlocked ? "locked" : ""}`;
      card.innerHTML = `
                <div class="level-header">
                    <div class="level-icon">${level.icon}</div>
                    <div class="level-info">
                        <div class="level-name">${level.name}</div>
                        <div class="level-description">${level.description}</div>
                    </div>
                    ${!isUnlocked ? `<div class="level-lock">🔒</div>` : ""}
                </div>
                <div class="level-progress">
                    <div class="level-progress-bar">
                        <div class="level-progress-fill" style="width:${percent}%"></div>
                    </div>
                    <div class="level-progress-text">${completedCourses}/${totalCourses} cursos completados</div>
                </div>
                ${!isUnlocked ? `<div style="font-size:12px;color:var(--text-muted);margin-top:8px;">Necesitas ${level.requiredXP} XP para desbloquear</div>` : ""}
            `;

      if (isUnlocked) {
        card.onclick = () => this.showCourses(level);
      }
      container.appendChild(card);
    });
  },

  showCourses(level) {
    document.getElementById("course-select-title").textContent = level.name;
    this.navigate("course-select");
    this._renderAdventureMap(level);
  },

  _renderAdventureMap(level) {
    const container = document.getElementById("courses-container");
    if (!container) return;
    container.innerHTML = "";

    // Fix 1: prevent the grid !important override at >=768px
    container.classList.add("has-adventure-map");

    const mapDiv = document.createElement("div");
    mapDiv.className = "adventure-map-container";

    const svgNS = "http://www.w3.org/2000/svg";
    const svgEl = document.createElementNS(svgNS, "svg");
    svgEl.setAttribute("class", "map-svg-paths");
    mapDiv.appendChild(svgEl);

    const nodesLayer = document.createElement("div");
    nodesLayer.className = "map-nodes-layer";
    mapDiv.appendChild(nodesLayer);

    const positions = ["left", "right"];
    const nodeEls = [];

    level.courses.forEach((course, i) => {
      const isCompleted = Progress.isCourseCompleted(course.id);
      const prevDone    = i === 0 || Progress.isCourseCompleted(level.courses[i - 1].id);
      const isAvailable = !isCompleted && (i === 0 || prevDone);
      const isLocked    = !isCompleted && !isAvailable;

      const row = document.createElement("div");
      row.className = `map-row ${positions[i % 2]}`;

      const node = document.createElement("div");
      const statusClass = isCompleted ? "completed" : isAvailable ? "available" : "locked";
      node.className = `map-node ${statusClass}`;
      node.dataset.index = i;

      const iconEl = document.createElement("div");
      iconEl.className = "map-node-icon";
      iconEl.textContent = isLocked ? "" : course.icon;
      node.appendChild(iconEl);

      const label = document.createElement("div");
      label.className = "map-node-label";
      label.textContent = course.name;
      node.appendChild(label);

      if (!isLocked) {
        node.onclick = () => QuizEngine.start(level.id, course.id);
      }

      row.appendChild(node);
      nodesLayer.appendChild(row);
      nodeEls.push({ el: node, row });
    });

    container.appendChild(mapDiv);

    // Fix 2: use double rAF so layout is fully computed before measuring
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this._drawMapPaths(svgEl, nodesLayer, nodeEls, level);
      });
    });
  },

  _drawMapPaths(svgEl, nodesLayer, nodeEls, level) {
    const mapDiv = svgEl.parentElement;
    const mapRect = mapDiv.getBoundingClientRect();

    // Clear any previous paths (prevents stale paths on re-render)
    svgEl.innerHTML = "";

    // Set SVG dimensions to match actual rendered content height
    const contentH = nodesLayer.offsetHeight + 40;
    svgEl.setAttribute("viewBox", `0 0 ${mapRect.width} ${contentH}`);
    svgEl.setAttribute("width",  mapRect.width);
    svgEl.setAttribute("height", contentH);
    svgEl.style.height = contentH + "px";

    const svgNS = "http://www.w3.org/2000/svg";

    for (let i = 0; i < nodeEls.length - 1; i++) {
      const a = nodeEls[i].el.getBoundingClientRect();
      const b = nodeEls[i + 1].el.getBoundingClientRect();

      // Coordinates relative to mapDiv (scroll-safe)
      const ax = a.left + a.width  / 2 - mapRect.left;
      const ay = a.top  + a.height / 2 - mapRect.top;
      const bx = b.left + b.width  / 2 - mapRect.left;
      const by = b.top  + b.height / 2 - mapRect.top;

      const isDone = Progress.isCourseCompleted(level.courses[i].id);

      // Gentle quadratic arc — control point at midpoint with small upward bow
      // This avoids the S-curve visual confusion from cubic bezier
      const midX = (ax + bx) / 2;
      const midY = (ay + by) / 2 - 12;

      const path = document.createElementNS(svgNS, "path");
      path.setAttribute("d", `M ${ax} ${ay} Q ${midX} ${midY} ${bx} ${by}`);
      path.setAttribute("class", `map-path-line${isDone ? " done" : ""}`);
      svgEl.appendChild(path);
    }
  },

  selectRole(role) {
    if (role === "teacher") this.navigate("teacher-auth");
    else this.navigate("student-auth");
  },

  async verifyTeacherLicense() {
    const input = document.getElementById("teacher-key-input");
    const key = input.value.trim().toUpperCase();
    if (!key) return;

    try {
      const { db, doc, getDoc } = window.FirebaseDB;
      const docSnap = await getDoc(doc(db, "teacher_licenses", key));

      if (docSnap.exists() && docSnap.data().status === "active") {
        Progress.data.isActivated = true;
        Progress.data.userRole = "teacher";
        Progress.data.licenseKey = key;
        Progress.data.playerName = docSnap.data().teacher_name || "Profesor";
        Progress.save();
        this.showToast("✅", "Acceso Docente Activo");
        setTimeout(() => this.navigate("home"), 1000);
      } else {
        this.showToast("❌", "Llave Inválida");
      }
    } catch (e) {
      this.showToast("📡", "Error de conexión");
    }
  },

  async verifyStudentCode() {
    const input = document.getElementById("student-code-input");
    const code = input.value.trim().toUpperCase();
    if (!code) return;

    try {
      const { db, doc, getDoc, updateDoc, arrayUnion } = window.FirebaseDB;
      const docSnap = await getDoc(doc(db, "active_codes", code));

      if (docSnap.exists()) {
        const data = docSnap.data();
        // Verificar licencia del creador
        const licenseSnap = await getDoc(
          doc(db, "teacher_licenses", data.teacher_key),
        );

        if (!licenseSnap.exists()) {
          this.showToast("❌", "Error: Licencia del docente no encontrada");
          return;
        }

        const licenseData = licenseSnap.data();

        if (
          licenseData.active_devices &&
          licenseData.active_devices.length >= licenseData.max_devices
        ) {
          this.showToast("🚫", "Límite de la clase excedido");
          return;
        }

        let deviceId = localStorage.getItem("lq_device_id");
        if (!deviceId) {
          deviceId =
            "DEV-" + Math.random().toString(36).substr(2, 9).toUpperCase();
          localStorage.setItem("lq_device_id", deviceId);
        }

        await updateDoc(doc(db, "teacher_licenses", data.teacher_key), {
          active_devices: arrayUnion(deviceId),
        });

        Progress.data.isActivated = true;
        Progress.data.userRole = "student";
        Progress.data.classCode = code;
        Progress.data.teacherKey = data.teacher_key;
        Progress.save();
        this.showToast("✅", "¡Bienvenido a Clase!");
        setTimeout(() => this.navigate("home"), 1000);
      } else {
        this.showToast("❌", "Código Inválido");
      }
    } catch (e) {
      this.showToast("📡", "Error de conexión");
    }
  },

  async validateStudentSession() {
    if (Progress.data.userRole !== "student" || !Progress.data.classCode)
      return true;
    try {
      const { db, doc, getDoc } = window.FirebaseDB;
      const docSnap = await getDoc(
        doc(db, "active_codes", Progress.data.classCode),
      );
      if (!docSnap.exists()) {
        // El código fue eliminado
        this.showToast("⚠️", "Sesión inválida");
        Progress.data.isActivated = false;
        Progress.data.userRole = null;
        Progress.data.classCode = null;
        Progress.data.teacherKey = null;
        Progress.save();
        setTimeout(() => {
          this.navigate("role-selection");
        }, 1500);
        return false;
      }
      return true;
    } catch (e) {
      console.warn("Network error validating session, assuming valid for now.");
      return true;
    }
  },

  async generateNewStudentCode() {
    const code = Math.random().toString(36).substr(2, 6).toUpperCase();
    try {
      const { db, collection, query, where, getDocs, doc, setDoc, deleteDoc } =
        window.FirebaseDB;
      const q = query(
        collection(db, "active_codes"),
        where("teacher_key", "==", Progress.data.licenseKey),
      );
      const oldCodesSnap = await getDocs(q);
      const deletePromises = [];
      oldCodesSnap.forEach((d) =>
        deletePromises.push(deleteDoc(doc(db, "active_codes", d.id))),
      );
      await Promise.all(deletePromises);

      await setDoc(doc(db, "active_codes", code), {
        teacher_key: Progress.data.licenseKey,
        created_at: new Date(),
      });
      const modalDisplay = document.getElementById("generated-code-display");
      if (modalDisplay) modalDisplay.textContent = code;
      const dashDisplay = document.getElementById("teacher-dashboard-code");
      if (dashDisplay) {
        dashDisplay.textContent = code;
        dashDisplay.classList.remove("is-placeholder");
      }
      this.showToast("✨", "Nuevo código generado");
    } catch (e) {
      this.showToast("❌", "Error al generar");
    }
  },

  initTeacherDashboard() {
    if (Progress.data.userRole !== "teacher") return;
    document.querySelectorAll(".teacher-tab").forEach((tab) => {
      tab.classList.toggle("active", tab.dataset.tab === "overview");
    });
    document.querySelectorAll(".teacher-tab-panel").forEach((panel) => {
      panel.classList.remove("active");
      if (panel.id === "teacher-tab-overview") panel.classList.add("active");
    });
    this.updateTeacherDashboardCodeDisplay();
    this.loadTeacherTab("overview");
    document.querySelectorAll(".teacher-tab").forEach((btn) => {
      btn.onclick = () => {
        const t = btn.dataset.tab;
        document
          .querySelectorAll(".teacher-tab")
          .forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        document
          .querySelectorAll(".teacher-tab-panel")
          .forEach((p) => p.classList.remove("active"));
        const panel = document.getElementById("teacher-tab-" + t);
        if (panel) panel.classList.add("active");
        this.loadTeacherTab(t);
      };
    });
  },

  updateTeacherDashboardCodeDisplay() {
    const el = document.getElementById("teacher-dashboard-code");
    if (!el) return;
    const code = el.textContent.trim();
    const isReal = code && code !== "Genera un código arriba" && code !== "---" && code.length <= 10;
    if (isReal) {
      el.classList.remove("is-placeholder");
    } else {
      el.textContent = "Sin código activo";
      el.classList.add("is-placeholder");
    }
  },

  async loadTeacherTab(tabId) {
    if (tabId === "overview") await this.loadTeacherOverview();
    else if (tabId === "students") await this.loadTeacherStudents();
    else if (tabId === "assignments") await this.loadTeacherAssignments();
    else if (tabId === "activity") this.loadTeacherActivity();
    else if (tabId === "reports") await this.loadTeacherReports();
    else if (tabId === "analytics") this.loadTeacherAnalytics();
  },

  async loadTeacherOverview() {
    const statsEl = document.getElementById("teacher-overview-stats");
    const alertsEl = document.getElementById("teacher-risk-alerts");
    if (!statsEl) return;
    try {
      const { db, collection, query, where, getDocs } = window.FirebaseDB;
      const q = query(
        collection(db, "students"),
        where("teacherKey", "==", Progress.data.licenseKey),
      );
      const snap = await getDocs(q);
      const students = [];
      snap.forEach((d) => {
        students.push({ id: d.id, ...d.data() });
      });
      const todayStr = new Date().toISOString().split("T")[0];
      const activeToday = students.filter(
        (s) => s.lastActive === todayStr,
      ).length;
      const totalQuizzes = students.reduce(
        (sum, s) => sum + (s.totalQuizzes || 0),
        0,
      );
      const avgAccuracy = students.length
        ? students.reduce((sum, s) => sum + (s.accuracy || 0), 0) /
          students.length
        : 0;
      const avgXP = students.length
        ? students.reduce((sum, s) => sum + (s.xp || 0), 0) / students.length
        : 0;
      statsEl.innerHTML = `
                <div class="teacher-stat-card"><span class="teacher-stat-value">${students.length}</span><span class="teacher-stat-label">Estudiantes vinculados</span></div>
                <div class="teacher-stat-card"><span class="teacher-stat-value">${activeToday}</span><span class="teacher-stat-label">Activos hoy</span></div>
                <div class="teacher-stat-card"><span class="teacher-stat-value">${totalQuizzes}</span><span class="teacher-stat-label">Quizzes hoy (total)</span></div>
                <div class="teacher-stat-card"><span class="teacher-stat-value">${Math.round(avgAccuracy * 100)}%</span><span class="teacher-stat-label">Precisión media</span></div>
                <div class="teacher-stat-card"><span class="teacher-stat-value">${Math.round(avgXP)}</span><span class="teacher-stat-label">XP media</span></div>
            `;
      const fiveDaysAgo = new Date();
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
      const fiveDaysStr = fiveDaysAgo.toISOString().split("T")[0];
      const atRisk = students.filter(
        (s) =>
          (s.accuracy !== undefined && s.accuracy < 0.5) ||
          (s.lastActive && s.lastActive < fiveDaysStr),
      );
      alertsEl.innerHTML = atRisk.length
        ? atRisk
            .map(
              (s) => `
                <div class="teacher-alert-card">
                    <strong>${s.name || s.studentId}</strong>
                    ${s.accuracy !== undefined && s.accuracy < 0.5 ? ` Precisión: ${Math.round((s.accuracy || 0) * 100)}%` : ""}
                    ${s.lastActive && s.lastActive < fiveDaysStr ? ` Última actividad: ${s.lastActive}` : ""}
                </div>
            `,
            )
            .join("")
        : '<p class="analytics-no-data">Sin alertas.</p>';

      // Fetch and set device counts from the license info
      try {
        const licenseDoc = await window.FirebaseDB.getDoc(
          window.FirebaseDB.doc(
            window.FirebaseDB.db,
            "teacher_licenses",
            Progress.data.licenseKey,
          ),
        );
        if (licenseDoc.exists()) {
          const limit = licenseDoc.data().max_devices || 0;
          const used = licenseDoc.data().active_devices
            ? licenseDoc.data().active_devices.length
            : 0;
          const devicesEl = document.getElementById("teacher-devices-count");
          if (devicesEl) devicesEl.textContent = `${used}/${limit}`;
        }
      } catch (e) {
        console.error("Error fetching teacher device limit:", e);
      }
    } catch (e) {
      statsEl.innerHTML =
        '<p class="analytics-no-data">Error al cargar. Comprueba la conexión.</p>';
      if (alertsEl) alertsEl.innerHTML = "";
    }
  },

  loadTeacherStudents() {
    const listEl = document.getElementById("teacher-students-list");
    if (!listEl) return;
    try {
      const { db, collection, query, where, onSnapshot } = window.FirebaseDB;
      const q = query(
        collection(db, "students"),
        where("teacherKey", "==", Progress.data.licenseKey),
      );
      if (this._studentsUnsubscribe) this._studentsUnsubscribe();
      this._studentsUnsubscribe = onSnapshot(
        q,
        (snap) => {
          const students = [];
          snap.forEach((d) => {
            students.push({ id: d.id, ...d.data() });
          });
          window._currentStudentsData = students; // For detail view access
          listEl.innerHTML = students.length
            ? students
                .map(
                  (s) => `
                    <div class="teacher-student-row" data-student-id="${s.id}">
                        <span class="teacher-student-name">${s.name || s.studentId}</span>
                        <span>XP: ${s.xp || 0}</span>
                        <span>Precisión: ${Math.round((s.accuracy || 0) * 100)}%</span>
                        <span>Última actividad: ${s.lastActive || "-"}</span>
                    </div>
                `,
                )
                .join("")
            : '<p class="analytics-no-data">No hay estudiantes vinculados.</p>';
          listEl.querySelectorAll(".teacher-student-row").forEach((row) => {
            row.onclick = () =>
              this.showTeacherStudentDetail(
                row.dataset.studentId,
                window._currentStudentsData.find(
                  (x) => x.id === row.dataset.studentId,
                ),
              );
          });

          // If a detail view is open, refresh its data too
          const detailEl = document.getElementById("teacher-student-detail");
          if (detailEl && detailEl.style.display === "block") {
            const openStudentId = detailEl.dataset.currentStudentId;
            if (openStudentId) {
              const updatedObj = students.find((x) => x.id === openStudentId);
              if (updatedObj)
                this.updateTeacherStudentDetailData(openStudentId, updatedObj);
            }
          }
        },
        (error) => {
          console.error("Estudiantes snapshot error:", error);
          listEl.innerHTML =
            '<p class="analytics-no-data">Error al cargar estudiantes.</p>';
        },
      );
    } catch (e) {
      listEl.innerHTML =
        '<p class="analytics-no-data">Error al inicializar estudiantes.</p>';
    }
  },

  showTeacherStudentDetail(studentId, student) {
    const detailEl = document.getElementById("teacher-student-detail");
    const listEl = document.getElementById("teacher-students-list");
    if (!detailEl) return;
    if (!student) {
      detailEl.style.display = "none";
      return;
    }
    listEl.style.display = "none";
    detailEl.style.display = "block";
    detailEl.dataset.currentStudentId = studentId;

    detailEl.innerHTML = `
            <button class="back-btn" onclick="document.getElementById('teacher-students-list').style.display=''; document.getElementById('teacher-student-detail').style.display='none'; document.getElementById('teacher-student-detail').dataset.currentStudentId='';">← Volver</button>
            <div id="student-detail-data"></div>
            <div class="teacher-comment-section">
                <label>Comentario del profesor:</label>
                <textarea id="teacher-comment-input" placeholder="Escribe un comentario...">${student.teacherComment || ""}</textarea>
                <button class="activation-btn" onclick="App.saveTeacherComment('${studentId}')">Guardar comentario</button>
            </div>
            <div class="analytics-section">
                <h3 class="analytics-section-title">Actividad Reciente</h3>
                <div id="teacher-student-chart" class="analytics-chart-container"></div>
            </div>
        `;
    this.updateTeacherStudentDetailData(studentId, student);
  },

  updateTeacherStudentDetailData(studentId, student) {
    const dataEl = document.getElementById("student-detail-data");
    if (dataEl) {
      dataEl.innerHTML = `
                <h3>${student.name || studentId}</h3>
                <p>XP: ${student.xp || 0} | Nivel: ${student.level || 1}</p>
                <p>Precisión: ${Math.round((student.accuracy || 0) * 100)}%</p>
                <p>Cursos completados: ${student.coursesCompleted || 0}</p>
                <p>Total quizzes: ${student.totalQuizzes || 0}</p>
                <p>Última actividad: ${student.lastActive || "-"}</p>
            `;
    }

    // Render chart
    if (typeof Analytics !== "undefined" && student.dailyActivity) {
      const chartData = Object.entries(student.dailyActivity)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-14);

      // Generate mock array for parameter passing directly
      const prevActivity = Progress.data.dailyActivity;
      Progress.data.dailyActivity = student.dailyActivity;
      Analytics.renderDailyActivityChart("teacher-student-chart", 14);
      Progress.data.dailyActivity = prevActivity; // Restore original
    } else {
      const chartEl = document.getElementById("teacher-student-chart");
      if (chartEl)
        chartEl.innerHTML = '<p class="analytics-no-data">Sin actividad.</p>';
    }
  },

  async saveTeacherComment(studentId) {
    const text = document.getElementById("teacher-comment-input")?.value || "";
    try {
      const { db, doc, updateDoc } = window.FirebaseDB;
      await updateDoc(doc(db, "students", studentId), {
        teacherComment: text,
        teacherCommentAt: new Date().toISOString(),
      });
      this.showToast("✅", "Comentario guardado");
    } catch (e) {
      this.showToast("❌", "Error al guardar");
    }
  },

  async loadTeacherAssignments() {
    const listEl = document.getElementById("teacher-assignments-list");
    if (!listEl) return;
    try {
      const { db, collection, query, where, getDocs } = window.FirebaseDB;
      const q = query(
        collection(db, "assignments"),
        where("teacherKey", "==", Progress.data.licenseKey),
      );
      const snap = await getDocs(q);
      const list = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
      listEl.innerHTML = list.length
        ? list
            .map(
              (a) => `
                <div class="teacher-assignment-row">
                    <span>Curso: ${a.course || a.courseId}</span>
                    <span>Preguntas: ${a.questions || 0}</span>
                    <span>Límite: ${a.deadline || "-"}</span>
                    <button class="modal-btn cancel" style="padding: 4px 10px; font-size: 12px; margin-left: auto;" onclick="App.deleteAssignment('${a.id}')">🗑️</button>
                </div>
            `,
            )
            .join("")
        : '<p class="analytics-no-data">No hay tareas creadas.</p>';

      // Llenar el select de cursos si está vacío
      const courseSelect = document.getElementById("teacher-assign-course");
      if (courseSelect && App.coursesData) {
        courseSelect.innerHTML = '<option value="">Selecciona un curso...</option>';
        App.coursesData.forEach((level) => {
          const optgroup = document.createElement("optgroup");
          optgroup.label = level.name || level.id;
          level.courses.forEach((c) => {
            const opt = document.createElement("option");
            opt.value = c.id;
            opt.textContent = c.title || c.id;
            opt.dataset.maxQuestions =
              window.QuestionsDB && window.QuestionsDB[c.id]
                ? window.QuestionsDB[c.id].length
                : 15;
            optgroup.appendChild(opt);
          });
          courseSelect.appendChild(optgroup);
        });
      }
    } catch (e) {
      listEl.innerHTML =
        '<p class="analytics-no-data">Error al cargar tareas.</p>';
    }
  },

  onAssignmentCourseChange() {
    const select = document.getElementById("teacher-assign-course");
    const input = document.getElementById("teacher-assign-questions");
    const info = document.getElementById("teacher-assign-max-info");
    if (!select || !input || !info) return;

    const selectedOpt = select.options[select.selectedIndex];
    if (!selectedOpt || !selectedOpt.value) {
      info.textContent = "Máx. preguntas: -";
      return;
    }

    const maxQ = parseInt(selectedOpt.dataset.maxQuestions) || 15;
    info.textContent = `Máx. preguntas: ${maxQ}`;
    input.max = maxQ;
    if (parseInt(input.value) > maxQ) {
      input.value = maxQ;
    }
  },

  async createAssignment() {
    const course = document
      .getElementById("teacher-assign-course")
      ?.value?.trim();
    const inputQ = document.getElementById("teacher-assign-questions");
    let questions = parseInt(inputQ?.value || 10, 10);
    const deadline = document
      .getElementById("teacher-assign-deadline")
      ?.value?.trim();

    if (!course) {
      this.showToast("⚠️", "Selecciona un curso");
      return;
    }

    const maxQ = parseInt(inputQ.max) || 15;
    if (questions > maxQ) questions = maxQ;

    try {
      const { db, collection, doc, setDoc } = window.FirebaseDB;
      const id = "asg_" + Date.now();
      await setDoc(doc(db, "assignments", id), {
        assignmentId: id,
        teacherKey: Progress.data.licenseKey,
        course,
        questions,
        deadline: deadline || null,
        createdAt: new Date().toISOString(),
      });
      this.showToast("✅", "Tarea creada");
      document.getElementById("teacher-assign-course").value = "";
      document.getElementById("teacher-assign-deadline").value = "";
      this.loadTeacherAssignments();
    } catch (e) {
      this.showToast("❌", "Error al crear");
    }
  },

  async deleteAssignment(assignmentId) {
    if (!confirm("¿Seguro que quieres borrar esta tarea?")) return;
    try {
      const { db, doc, deleteDoc } = window.FirebaseDB;
      await deleteDoc(doc(db, "assignments", assignmentId));
      this.showToast("✅", "Tarea eliminada");
      this.loadTeacherAssignments();
    } catch (e) {
      this.showToast("❌", "Error al eliminar");
      console.error(e);
    }
  },

  loadTeacherActivity() {
    const el = document.getElementById("teacher-activity-chart");
    if (!el || typeof Analytics === "undefined") return;
    el.innerHTML =
      '<p class="analytics-no-data">Gráfico de actividad por estudiante (usa la pestaña Estudiantes para ver detalle).</p>';
  },

  async loadTeacherReports() {
    const el = document.getElementById("teacher-reports-content");
    if (!el) return;
    try {
      const { db, collection, query, where, getDocs } = window.FirebaseDB;
      const q = query(
        collection(db, "students"),
        where("teacherKey", "==", Progress.data.licenseKey),
      );
      const snap = await getDocs(q);
      const students = [];
      snap.forEach((d) => students.push({ id: d.id, ...d.data() }));
      const avgAcc = students.length
        ? students.reduce((s, x) => s + (x.accuracy || 0), 0) / students.length
        : 0;
      const totalQ = students.reduce((s, x) => s + (x.totalQuizzes || 0), 0);
      el.innerHTML = `
                <div class="teacher-report-summary">
                    <p>Estudiantes activos: ${students.length}</p>
                    <p>Precisión media: ${Math.round(avgAcc * 100)}%</p>
                    <p>Total quizzes completados: ${totalQ}</p>
                </div>
            `;
    } catch (e) {
      el.innerHTML =
        '<p class="analytics-no-data">Error al cargar informes.</p>';
    }
  },

  loadTeacherAnalytics() {
    const el = document.getElementById("teacher-skill-analytics");
    if (el)
      el.innerHTML =
        '<p class="analytics-no-data">Analíticas por habilidad (datos desde estudiantes).</p>';
  },

  async loadStudentAssignments() {
    const listEl = document.getElementById("student-assignments-list");
    if (!listEl || !Progress.data.teacherKey) return;
    try {
      const { db, collection, query, where, getDocs } = window.FirebaseDB;
      const q = query(
        collection(db, "assignments"),
        where("teacherKey", "==", Progress.data.teacherKey),
      );
      const snap = await getDocs(q);
      const list = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
      const todayStr = new Date().toISOString().split("T")[0];
      listEl.innerHTML = list.length
        ? list
            .map((a) => {
              const overdue = a.deadline && a.deadline < todayStr;
              return `
                <div class="teacher-assignment-row student-assignment-row">
                    <span>Curso: ${a.course || a.courseId}</span>
                    <span>Preguntas: ${a.questions || 0}</span>
                    <span>Límite: ${a.deadline || "-"}</span>
                    ${overdue ? '<span class="assignment-overdue">Vencida</span>' : ""}
                    <button class="activation-btn small" onclick="App.startAssignment('${a.course || a.courseId}', ${a.questions || 10})">Jugar</button>
                </div>`;
            })
            .join("")
        : '<p class="analytics-no-data">No tienes tareas asignadas.</p>';
    } catch (e) {
      listEl.innerHTML =
        '<p class="analytics-no-data">Error al cargar tareas. Comprueba la conexión.</p>';
    }
  },

  startAssignment(courseId, numQuestions) {
    if (!this.coursesData) return;
    let levelId = "basic";
    for (const level of this.coursesData) {
      if (level.courses && level.courses.some((c) => c.id === courseId)) {
        levelId = level.id;
        break;
      }
    }
    QuizEngine.start(levelId, courseId, { total: numQuestions });
  },

  async exportClassCSV() {
    try {
      const { db, collection, query, where, getDocs } = window.FirebaseDB;
      const q = query(
        collection(db, "students"),
        where("teacherKey", "==", Progress.data.licenseKey),
      );
      const snap = await getDocs(q);
      const rows = [
        ["Estudiante", "XP", "Precisión", "Cursos", "Última actividad"],
      ];
      snap.forEach((d) => {
        const s = d.data();
        rows.push([
          s.name || d.id,
          s.xp || 0,
          s.accuracy != null ? Math.round(s.accuracy * 100) + "%" : "-",
          s.coursesCompleted || 0,
          s.lastActive || "-",
        ]);
      });
      const csv = rows
        .map((r) =>
          r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","),
        )
        .join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download =
        "linguaquest_class_" + new Date().toISOString().slice(0, 10) + ".csv";
      a.click();
      URL.revokeObjectURL(a.href);
      this.showToast("✅", "CSV descargado");
    } catch (e) {
      this.showToast("❌", "Error al exportar");
    }
  },

  // ---- Settings ----
  loadSettings() {
    document.getElementById("setting-name").value =
      Progress.data.playerName || "";
    document.getElementById("setting-sound").checked =
      Progress.data.settings.sound;
    document.getElementById("setting-animations").checked =
      Progress.data.settings.animations;
    document.getElementById("setting-timer").checked =
      Progress.data.settings.timer;

    const licenseDisplayEl = document.getElementById("setting-license-status");
    if (licenseDisplayEl)
      licenseDisplayEl.textContent = Progress.data.isActivated
        ? `Activado (${Progress.data.userRole})`
        : "No activado ❌";
    const keyDisplayEl = document.getElementById("setting-license-key");
    if (keyDisplayEl)
      keyDisplayEl.textContent =
        Progress.data.userRole === "teacher"
          ? Progress.data.licenseKey
          : Progress.data.classCode || "N/A";

    document.querySelectorAll(".avatar-option").forEach((btn) => {
      btn.classList.toggle(
        "selected",
        btn.dataset.avatar === Progress.data.avatar,
      );
      btn.onclick = () => {
        document
          .querySelectorAll(".avatar-option")
          .forEach((b) => b.classList.remove("selected"));
        btn.classList.add("selected");
      };
    });
  },

  saveSettings() {
    const name = document.getElementById("setting-name").value.trim();
    if (name) Progress.data.playerName = name;

    Progress.data.settings.sound =
      document.getElementById("setting-sound").checked;
    Progress.data.settings.animations =
      document.getElementById("setting-animations").checked;
    Progress.data.settings.timer =
      document.getElementById("setting-timer").checked;

    const selectedAvatar = document.querySelector(".avatar-option.selected");
    if (selectedAvatar) Progress.data.avatar = selectedAvatar.dataset.avatar;

    Progress.save();
    this.showToast("✅", "Ajustes guardados");
  },

  resetProgress() {
    this.showModal(
      "¿Resetear progreso?",
      "Esto eliminará todo tu progreso, XP, logros y cursos completados. Esta acción no se puede deshacer.",
      () => {
        Progress.reset();
        XPSystem.load(0);
        Achievements.loadUnlocked([]);
        this.showToast("🗑️", "Progreso reseteado");
        this.navigate("home");
      },
    );
  },

  // ---- Name Modal ----
  showNameModal() {
    const modal = document.getElementById("name-modal");
    modal.style.display = "flex";
    document.getElementById("name-input").focus();
  },

  setPlayerName() {
    const name = document.getElementById("name-input").value.trim();
    if (!name) {
      this.showToast("⚠️", "Escribe tu nombre");
      return;
    }
    Progress.data.playerName = name;
    Progress.save();
    document.getElementById("name-modal").style.display = "none";
    this.updateHomeScreen();
    this.showToast("🎉", `¡Bienvenido, ${name}!`);
  },

  // ---- Modal ----
  showModal(title, text, onConfirm) {
    document.getElementById("modal-title").textContent = title;
    document.getElementById("modal-text").textContent = text;
    document.getElementById("modal-overlay").classList.add("show");
    document.getElementById("modal-confirm").onclick = () => {
      this.closeModal();
      if (onConfirm) onConfirm();
    };
  },

  closeModal() {
    document.getElementById("modal-overlay").classList.remove("show");
  },

  // ---- Toast ----
  showToast(icon, text) {
    const toast = document.getElementById("toast");
    document.getElementById("toast-icon").textContent = icon;
    document.getElementById("toast-text").textContent = text;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 3000);
  },

  // ---- XP Popup ----
  showXPPopup(text) {
    const popup = document.getElementById("xp-popup");
    document.getElementById("xp-popup-text").textContent = text;
    popup.classList.remove("show");
    void popup.offsetWidth;
    popup.classList.add("show");
    setTimeout(() => popup.classList.remove("show"), 1500);
  },

  // ---- Level Up ----
  showLevelUp(level) {
    document.getElementById("levelup-level").textContent = `Nivel ${level}`;
    const titles = XPSystem.levels.find((l) => l.level === level);
    document.getElementById("levelup-text").textContent = titles
      ? `¡Ahora eres ${titles.title}!`
      : "¡Sigue así!";
    document.getElementById("levelup-overlay").classList.add("show");
  },

  closeLevelUp() {
    document.getElementById("levelup-overlay").classList.remove("show");
  },

  showQuizResults(correct, total, accuracy) {
    const xpGained = XPSystem.sessionXP;
    const validAccuracy = isNaN(accuracy)
      ? Math.round((correct / total) * 100)
      : accuracy;
    const passed = validAccuracy >= 60;

    document.getElementById("results-score").textContent =
      ScoreSystem.currentScore + " pts";
    document.getElementById("results-accuracy").textContent =
      `${validAccuracy}%`;
    document.getElementById("results-xp").textContent = xpGained + " XP";

    const iconEl = document.getElementById("results-main-icon");
    const titleEl = document.getElementById("results-title");
    const subtitleEl = document.getElementById("results-subtitle");

    if (passed) {
      iconEl.textContent = "🏆";
      titleEl.textContent = "¡Quiz Completado!";
      subtitleEl.textContent = "Has demostrado un gran dominio. ¡Sigue así!";
      if (QuizEngine.currentCourseId) {
        const wasCompleted = Progress.isCourseCompleted(QuizEngine.currentCourseId);
        Progress.completeCourse(QuizEngine.currentCourseId);
        if (!wasCompleted) this.showToast("🔓", "¡Próximo curso desbloqueado!");
      }
    } else {
      iconEl.textContent = "📚";
      titleEl.textContent = "Sigue practicando";
      subtitleEl.textContent = "Necesitas al menos 60% para desbloquear el siguiente nivel.";
    }

    // ── Detailed stats ──
    this._renderResultsChart(QuizEngine.questionResults);
    this._renderResultsFailed(QuizEngine.questionResults);
    this._renderResultsCompare(validAccuracy);

    if (Progress.data.userRole === "student" && Progress.data.classCode) {
      this.syncStudentToFirestore();
    }
    this.navigate("results");
  },

  _renderResultsChart(results) {
    const section = document.getElementById("results-chart-section");
    if (!section) return;
    section.innerHTML = "";

    const typeNames = {
      multiple_choice: "Opción múltiple",
      write: "Escritura",
      order: "Ordenar",
      matching: "Emparejar",
      reading: "Lectura",
      sentence_puzzle: "Puzzle"
    };

    const byType = {};
    results.forEach(r => {
      const t = r.type || "multiple_choice";
      if (!byType[t]) byType[t] = { correct: 0, total: 0 };
      byType[t].total++;
      if (r.correct) byType[t].correct++;
    });

    const entries = Object.entries(byType);
    if (!entries.length) return;

    const title = document.createElement("div");
    title.className = "results-chart-title";
    title.textContent = "Por tipo de pregunta";
    section.appendChild(title);

    entries.forEach(([type, stats]) => {
      const pct = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
      const colorClass = pct >= 70 ? "" : pct >= 40 ? "partial" : "empty";

      const row = document.createElement("div");
      row.className = "results-type-bar";
      row.innerHTML = `
        <div class="results-type-label">${typeNames[type] || type}</div>
        <div class="results-bar-track">
          <div class="results-bar-fill ${colorClass}" style="width:0%" data-pct="${pct}"></div>
        </div>
        <div class="results-bar-pct">${pct}%</div>
      `;
      section.appendChild(row);
    });

    // Animate bars after render
    setTimeout(() => {
      section.querySelectorAll(".results-bar-fill").forEach(bar => {
        bar.style.width = bar.dataset.pct + "%";
      });
    }, 100);
  },

  _renderResultsFailed(results) {
    const section = document.getElementById("results-failed-section");
    if (!section) return;
    section.innerHTML = "";

    const failed = results.filter(r => !r.correct && r.question);
    if (!failed.length) return;

    const toggle = document.createElement("button");
    toggle.className = "results-failed-toggle";
    toggle.innerHTML = `<span>❌ ${failed.length} pregunta${failed.length > 1 ? "s" : ""} incorrecta${failed.length > 1 ? "s" : ""} — Ver respuestas</span><span class="arrow">▼</span>`;
    section.appendChild(toggle);

    const list = document.createElement("div");
    list.className = "results-failed-list";

    failed.forEach(r => {
      const item = document.createElement("div");
      item.className = "results-failed-item";
      item.innerHTML = `
        <div class="results-failed-q">${r.question}</div>
        <div class="results-failed-answer">✅ ${r.correctAnswer || "—"}</div>
      `;
      list.appendChild(item);
    });
    section.appendChild(list);

    toggle.onclick = () => {
      toggle.classList.toggle("open");
      list.classList.toggle("visible");
    };
  },

  _renderResultsCompare(currentAccuracy) {
    const section = document.getElementById("results-compare-section");
    if (!section) return;
    section.innerHTML = "";

    const courseId = QuizEngine.currentCourseId;
    const prevKey = "lq_prev_" + courseId;
    const prev = parseFloat(localStorage.getItem(prevKey) || "0");
    localStorage.setItem(prevKey, currentAccuracy);

    if (!prev) return;

    const delta = currentAccuracy - prev;
    const deltaClass = delta > 0 ? "up" : delta < 0 ? "down" : "same";
    const deltaText = delta > 0 ? `+${delta}%` : delta < 0 ? `${delta}%` : "Igual";
    const deltaIcon = delta > 0 ? "📈" : delta < 0 ? "📉" : "➡️";

    section.innerHTML = `
      <div class="results-previous-compare">
        <span class="results-compare-icon">${deltaIcon}</span>
        <span class="results-compare-text">Vs. intento anterior (${prev}%)</span>
        <span class="results-compare-delta ${deltaClass}">${deltaText}</span>
      </div>
    `;
  },

  // ── XP Float ──
  showXPFloat(x, y, text) {
    const el = document.createElement("div");
    el.className = "xp-float";
    el.textContent = text;
    el.style.left = x + "px";
    el.style.top = y + "px";
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1200);
  },

  // ── Combo Banner ──
  showComboBanner(streak) {
    let banner = document.getElementById("combo-banner");
    if (!banner) {
      banner = document.createElement("div");
      banner.id = "combo-banner";
      banner.className = "combo-banner";
      document.body.appendChild(banner);
    }
    const msgs = { 3:"🔥 COMBO x3!", 6:"⚡ COMBO x6!", 9:"💥 COMBO x9!", 12:"🌟 IMPARABLE!" };
    banner.textContent = msgs[streak] || `🔥 COMBO x${streak}!`;
    banner.classList.remove("show");
    void banner.offsetWidth;
    banner.classList.add("show");
    setTimeout(() => banner.classList.remove("show"), 1400);
  },

  // ── Dark Mode ──
  initDarkMode() {
    const saved = localStorage.getItem("lq_theme") || "dark";
    document.documentElement.setAttribute("data-theme", saved);
    const btn = document.getElementById("theme-toggle-btn");
    if (btn) btn.textContent = saved === "dark" ? "☀️" : "🌙";
  },

  toggleDarkMode() {
    const current = document.documentElement.getAttribute("data-theme") || "dark";
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("lq_theme", next);
    const btn = document.getElementById("theme-toggle-btn");
    if (btn) btn.textContent = next === "dark" ? "☀️" : "🌙";
  },

  async syncStudentToFirestore() {
    try {
      const { db, doc, getDoc, setDoc } = window.FirebaseDB;
      if (!db || !Progress.data) return;
      let deviceId = localStorage.getItem("lq_device_id");
      if (!deviceId) return;
      let teacherKey = Progress.data.teacherKey;

      // Validar si el código sigue vivo
      if (Progress.data.classCode) {
        const codeSnap = await getDoc(
          doc(db, "active_codes", Progress.data.classCode.toUpperCase()),
        );
        if (!codeSnap.exists()) {
          // El profesor borró este código, desconectar estudiante urgentemente
          Progress.data.isActivated = false;
          Progress.data.userRole = null;
          Progress.data.classCode = null;
          Progress.data.teacherKey = null;
          Progress.save();
          this.showToast("⚠️", "Sesión desconectada de la clase");
          this.navigate("role-selection");
          return;
        } else {
          teacherKey = codeSnap.data().teacher_key;
          Progress.data.teacherKey = teacherKey;
        }
      }

      if (!teacherKey) return;
      const todayStr = new Date().toISOString().split("T")[0];
      const dailyActivity = Progress.data.dailyActivity || {};
      const last30 = {};
      const keys = Object.keys(dailyActivity).sort().slice(-30);
      keys.forEach((k) => {
        last30[k] = dailyActivity[k];
      });
      await setDoc(
        doc(db, "students", deviceId),
        {
          studentId: deviceId,
          name: Progress.data.playerName || "Estudiante",
          xp: Progress.data.totalXP || 0,
          level: typeof XPSystem !== "undefined" ? XPSystem.getLevel() : 1,
          accuracy: Progress.data.totalQuestions
            ? Math.round(
                (Progress.data.correctAnswers / Progress.data.totalQuestions) *
                  100,
              ) / 100
            : 0,
          coursesCompleted: Progress.data.coursesCompleted || 0,
          totalQuizzes: Progress.data.quizzesCompleted || 0,
          lastActive: todayStr,
          dailyActivity: last30,
          teacherKey,
        },
        { merge: true },
      );
    } catch (e) {
      console.warn("Student sync failed:", e);
    }
  },

  rematchQuiz() {
    if (QuizEngine.currentCourseId && QuizEngine.currentLevelId) {
      QuizEngine.start(QuizEngine.currentLevelId, QuizEngine.currentCourseId);
    } else {
      this.navigate("level-select");
    }
  },
};

// ---- Initialize on DOM ready ----
document.addEventListener("DOMContentLoaded", () => App.init());
