/* ============================================
   LinguaQuest - Analytics Module
   Reads Progress.data, computes stats, renders dashboard
   ============================================ */

const Analytics = {
  getAccuracy() {
    if (typeof Progress === "undefined" || !Progress.data) return 0;
    const total = Progress.data.totalQuestions || 0;
    const correct = Progress.data.correctAnswers || 0;
    if (total === 0) return 0;
    return Math.round((correct / total) * 100);
  },

  getWordsLearned() {
    if (typeof Progress === "undefined" || !Progress.data) return 0;
    return Progress.data.wordsLearned || 0;
  },

  getCoursesCompleted() {
    if (typeof Progress === "undefined" || !Progress.data) return 0;
    return Progress.data.coursesCompleted || 0;
  },

  getTotalCourses(coursesData) {
    if (!coursesData || !Array.isArray(coursesData)) return 0;
    return coursesData.reduce(
      (sum, level) => sum + (level.courses ? level.courses.length : 0),
      0,
    );
  },

  getDailyActivity(maxDays = 14) {
    if (
      typeof Progress === "undefined" ||
      !Progress.data ||
      !Progress.data.dailyActivity
    )
      return [];
    const activity = Progress.data.dailyActivity;
    const entries = Object.entries(activity).map(([date, count]) => ({
      date,
      count,
    }));
    entries.sort((a, b) => a.date.localeCompare(b.date));
    return entries.slice(-maxDays);
  },

  renderDailyActivityChart(containerIdOrElement, maxDays = 14) {
    const el =
      typeof containerIdOrElement === "string"
        ? document.getElementById(containerIdOrElement)
        : containerIdOrElement;
    if (!el) return;
    const data = this.getDailyActivity(maxDays);
    if (data.length === 0) {
      el.innerHTML =
        '<p class="analytics-no-data">No hay actividad registrada aún.</p>';
      return;
    }
    const maxCount = Math.max(1, ...data.map((d) => d.count));
    const dayLabels = data.map((d) => {
      const date = new Date(d.date + "T12:00:00");
      const days = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
      return days[date.getDay()] + " " + d.date.slice(5);
    });
    const canvas = document.createElement("canvas");
    canvas.width = Math.min(600, el.clientWidth || 400);
    canvas.height = 200;
    canvas.style.maxWidth = "100%";
    canvas.style.height = "auto";
    el.innerHTML = "";
    el.appendChild(canvas);
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.width;
    const h = canvas.height;
    const padding = { top: 20, right: 20, bottom: 40, left: 40 };
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;
    const barCount = data.length;
    const barGap = 4;
    const calcBarWidth = (chartW - barGap * (barCount - 1)) / barCount;
    const barWidth = Math.min(40, Math.max(8, calcBarWidth));
    const totalBarsWidth = barCount * barWidth + (barCount - 1) * barGap;
    const startX = padding.left + (chartW - totalBarsWidth) / 2;
    const getColor = () => {
      const style = getComputedStyle(document.documentElement);
      return style.getPropertyValue("--primary") || "#58CC02";
    };
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = getColor();
    data.forEach((d, i) => {
      const x = startX + i * (barWidth + barGap);
      const barHeight = maxCount > 0 ? (d.count / maxCount) * chartH : 0;
      const y = padding.top + chartH - barHeight;
      ctx.fillRect(x, y, barWidth, barHeight);
    });
    ctx.fillStyle = "rgba(139, 148, 158, 0.9)";
    ctx.font = "11px Inter, sans-serif";
    ctx.textAlign = "center";
    data.forEach((d, i) => {
      const x = startX + i * (barWidth + barGap) + barWidth / 2;
      ctx.fillText(dayLabels[i], x, h - 8);
      ctx.fillText(String(d.count), x, padding.top + chartH - 4);
    });
  },

  render(containerId) {
    if (typeof Progress === "undefined") return;
    const container = document.getElementById(
      containerId || "analytics-content",
    );
    if (!container) return;
    const accuracy = this.getAccuracy();
    const wordsLearned = this.getWordsLearned();
    const coursesCompleted = this.getCoursesCompleted();
    const coursesData = typeof App !== "undefined" ? App.coursesData : null;
    const totalCourses = this.getTotalCourses(coursesData);
    container.innerHTML = `
            <div class="analytics-cards">
                <div class="analytics-card">
                    <div class="analytics-card-value" id="analytics-accuracy">${accuracy}%</div>
                    <div class="analytics-card-label">Precisión</div>
                </div>
                <div class="analytics-card">
                    <div class="analytics-card-value" id="analytics-words">${wordsLearned}</div>
                    <div class="analytics-card-label">Palabras aprendidas</div>
                </div>
                <div class="analytics-card">
                    <div class="analytics-card-value" id="analytics-courses">${coursesCompleted} / ${totalCourses}</div>
                    <div class="analytics-card-label">Cursos completados</div>
                </div>
            </div>
            <div class="analytics-section">
                <h3 class="analytics-section-title">Actividad diaria (preguntas respondidas)</h3>
                <div id="analytics-chart-container" class="analytics-chart-container"></div>
            </div>
        `;
    this.renderDailyActivityChart("analytics-chart-container", 14);
  },
};
