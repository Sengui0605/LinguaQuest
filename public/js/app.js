/* ============================================
   LinguaQuest - Main App Controller
   Navigation, initialization, and UI management
   ============================================ */

const App = {
    coursesData: null,
    currentScreen: 'loading',

    async init() {
        const loadingBar = document.querySelector('.loading-bar');
        loadingBar.style.width = '20%';

        await Progress.load();
        loadingBar.style.width = '40%';

        await Achievements.load();
        Achievements.loadUnlocked(Progress.data.unlockedAchievements);
        loadingBar.style.width = '60%';

        try {
            const res = await fetch('data/courses.json');
            this.coursesData = await res.json();
        } catch (e) {
            console.error('Error loading courses:', e);
        }

        XPSystem.load(Progress.data.totalXP);
        loadingBar.style.width = '100%';

        setTimeout(() => {
            if (!Progress.data.isActivated) {
                this.navigate('role-selection');
            } else if (!Progress.data.playerName && Progress.data.userRole === 'student') {
                this.navigate('home');
                this.showNameModal();
            } else {
                this.navigate('home');
            }
        }, 800);
    },

    navigate(screenId) {
        SoundSystem.play('click');
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));

        const screen = document.getElementById(screenId + '-screen');
        if (screen) {
            screen.classList.add('active');
            this.currentScreen = screenId;
        }

        switch (screenId) {
            case 'home': this.updateHomeScreen(); break;
            case 'profile': this.updateProfileScreen(); break;
            case 'level-select': this.renderLevels(); break;
            case 'achievements': Achievements.render('achievements-list'); break;
            case 'achievements': Achievements.render('achievements-list'); break;
            case 'settings': this.loadSettings(); break;
        }
    },

    updateHomeScreen() {
        document.getElementById('home-xp').textContent = Progress.data.totalXP;
        document.getElementById('home-streak').textContent = Progress.data.dailyStreak;
        document.getElementById('home-level').textContent = XPSystem.getLevel();
        document.getElementById('player-name-display').textContent =
            Progress.data.playerName || 'Explorador';
    },

    updateProfileScreen() {
        const d = Progress.data;
        document.getElementById('profile-avatar-emoji').textContent = d.avatar;
        document.getElementById('profile-name').textContent = d.playerName || 'Explorador';
        document.getElementById('profile-title').textContent = XPSystem.getTitle();
        document.getElementById('profile-level').textContent = XPSystem.getLevel();
        document.getElementById('profile-current-level').textContent = XPSystem.getLevel();
        document.getElementById('profile-total-xp').textContent = d.totalXP.toLocaleString();
        document.getElementById('profile-streak').textContent = d.dailyStreak;
        document.getElementById('profile-courses-done').textContent = d.coursesCompleted;
        document.getElementById('profile-achievements-count').textContent =
            Achievements.getUnlockedCount();
        document.getElementById('profile-correct-answers').textContent = d.correctAnswers;
        document.getElementById('profile-total-score').textContent = d.totalScore.toLocaleString();

        const info = XPSystem.getLevelInfo();
        document.getElementById('profile-xp-text').textContent =
            `${d.totalXP} / ${info.xpForNext} XP`;
        document.getElementById('profile-xp-bar').style.width =
            `${XPSystem.getProgressPercent()}%`;

        Achievements.renderMini('mini-achievements', 3);
    },

    renderLevels() {
        const container = document.getElementById('levels-container');
        if (!container || !this.coursesData) return;
        container.innerHTML = '';

        const levelClasses = ['basic', 'intermediate', 'advanced'];

        this.coursesData.forEach((level, i) => {
            const isUnlocked = Progress.data.totalXP >= level.requiredXP;
            const completedCourses = level.courses.filter(c =>
                Progress.isCourseCompleted(c.id)
            ).length;
            const totalCourses = level.courses.length;
            const percent = totalCourses > 0 ? Math.round((completedCourses / totalCourses) * 100) : 0;

            const card = document.createElement('div');
            card.className = `level-card ${levelClasses[i]} ${!isUnlocked ? 'locked' : ''}`;
            card.innerHTML = `
                <div class="level-header">
                    <div class="level-icon">${level.icon}</div>
                    <div class="level-info">
                        <div class="level-name">${level.name}</div>
                        <div class="level-description">${level.description}</div>
                    </div>
                    ${!isUnlocked ? `<div class="level-lock">🔒</div>` : ''}
                </div>
                <div class="level-progress">
                    <div class="level-progress-bar">
                        <div class="level-progress-fill" style="width:${percent}%"></div>
                    </div>
                    <div class="level-progress-text">${completedCourses}/${totalCourses} cursos completados</div>
                </div>
                ${!isUnlocked ? `<div style="font-size:12px;color:var(--text-muted);margin-top:8px;">Necesitas ${level.requiredXP} XP para desbloquear</div>` : ''}
            `;

            if (isUnlocked) {
                card.onclick = () => this.showCourses(level);
            }
            container.appendChild(card);
        });
    },

    showCourses(level) {
        document.getElementById('course-select-title').textContent = level.name;
        this.navigate('course-select');

        const container = document.getElementById('courses-container');
        container.innerHTML = '';

        level.courses.forEach((course, i) => {
            const isCompleted = Progress.isCourseCompleted(course.id);
            const prevCompleted = i === 0 || Progress.isCourseCompleted(level.courses[i - 1].id);
            const isUnlocked = i === 0 || prevCompleted;
            const progress = Progress.getCourseProgress(course.id);

            const card = document.createElement('div');
            card.className = `course-card ${isCompleted ? 'completed' : ''} ${!isUnlocked ? 'locked' : ''}`;
            card.style.animationDelay = `${i * 0.05}s`;
            card.innerHTML = `
                <div class="course-icon">${course.icon}</div>
                <div class="course-info">
                    <div class="course-name">${course.name}</div>
                    <div class="course-desc">${course.description}</div>
                    <div class="course-meta">
                        <span>📝 ${course.questions} preguntas</span>
                        ${isCompleted ? '<span>✅ Completado</span>' : ''}
                    </div>
                    ${!isCompleted && progress > 0 ? `
                        <div class="course-progress-mini">
                            <div class="course-progress-mini-fill" style="width:${progress}%"></div>
                        </div>
                    ` : ''}
                </div>
                <div class="course-status">${isCompleted ? '⭐' : !isUnlocked ? '🔒' : '▶️'}</div>
            `;

            if (isUnlocked) {
                card.onclick = () => {
                    QuizEngine.start(level.id, course.id);
                };
            }
            container.appendChild(card);
        });
    },


    selectRole(role) {
        if (role === 'teacher') this.navigate('teacher-auth');
        else this.navigate('student-auth');
    },

    async verifyTeacherLicense() {
        const input = document.getElementById('teacher-key-input');
        const key = input.value.trim().toUpperCase();
        if (!key) return;

        try {
            const { db, doc, getDoc } = window.FirebaseDB;
            const docSnap = await getDoc(doc(db, "teacher_licenses", key));

            if (docSnap.exists() && docSnap.data().status === 'active') {
                Progress.data.isActivated = true;
                Progress.data.userRole = 'teacher';
                Progress.data.licenseKey = key;
                Progress.data.playerName = docSnap.data().teacher_name || 'Profesor';
                Progress.save();
                this.showToast('✅', 'Acceso Docente Activo');
                setTimeout(() => this.navigate('home'), 1000);
            } else {
                this.showToast('❌', 'Llave Inválida');
            }
        } catch (e) {
            this.showToast('📡', 'Error de conexión');
        }
    },

    async verifyStudentCode() {
        const input = document.getElementById('student-code-input');
        const code = input.value.trim().toUpperCase();
        if (!code) return;

        try {
            const { db, doc, getDoc, updateDoc, arrayUnion } = window.FirebaseDB;
            const docSnap = await getDoc(doc(db, "active_codes", code));

            if (docSnap.exists()) {
                const data = docSnap.data();
                // Verificar licencia del creador
                const licenseSnap = await getDoc(doc(db, "teacher_licenses", data.teacher_key));
                
                if (!licenseSnap.exists()) {
                    this.showToast('❌', 'Error: Licencia del docente no encontrada');
                    return;
                }

                const licenseData = licenseSnap.data();

                if (licenseData.active_devices && licenseData.active_devices.length >= licenseData.max_devices) {
                    this.showToast('🚫', 'Límite de la clase excedido');
                    return;
                }

                let deviceId = localStorage.getItem('lq_device_id');
                if (!deviceId) {
                    deviceId = 'DEV-' + Math.random().toString(36).substr(2, 9).toUpperCase();
                    localStorage.setItem('lq_device_id', deviceId);
                }

                await updateDoc(doc(db, "teacher_licenses", data.teacher_key), {
                    active_devices: arrayUnion(deviceId)
                });

                Progress.data.isActivated = true;
                Progress.data.userRole = 'student';
                Progress.data.classCode = code;
                Progress.save();
                this.showToast('✅', '¡Bienvenido a Clase!');
                setTimeout(() => this.navigate('home'), 1000);
            } else {
                this.showToast('❌', 'Código Inválido');
            }
        } catch (e) {
            this.showToast('📡', 'Error de conexión');
        }
    },

    async generateNewStudentCode() {
        const code = Math.random().toString(36).substr(2, 6).toUpperCase();
        try {
            const { db, doc, setDoc } = window.FirebaseDB;
            await setDoc(doc(db, "active_codes", code), {
                teacher_key: Progress.data.licenseKey,
                created_at: new Date()
            });
            document.getElementById('generated-code-display').textContent = code;
            this.showToast('✨', 'Nuevo código generado');
        } catch (e) {
            this.showToast('❌', 'Error al generar');
        }
    },

    showTeacherDashboard() {
        document.getElementById('teacher-modal').style.display = 'flex';
        this.updateTeacherStats();
    },

    async updateTeacherStats() {
        try {
            const { db, doc, getDoc } = window.FirebaseDB;
            const snap = await getDoc(doc(db, "teacher_licenses", Progress.data.licenseKey));
            if (snap.exists()) {
                const data = snap.data();
                const count = data.active_devices ? data.active_devices.length : 0;
                document.getElementById('teacher-devices-count').textContent = `${count}/${data.max_devices}`;
            }
        } catch (e) {}
    },

    closeTeacherDashboard() {
        document.getElementById('teacher-modal').style.display = 'none';
    },

    // ---- Settings ----
    loadSettings() {
        document.getElementById('setting-name').value = Progress.data.playerName || '';
        document.getElementById('setting-sound').checked = Progress.data.settings.sound;
        document.getElementById('setting-animations').checked = Progress.data.settings.animations;
        document.getElementById('setting-timer').checked = Progress.data.settings.timer;

        const statusEl = document.getElementById('setting-license-status');
        const keyEl = document.getElementById('setting-license-key');
        if (statusEl) statusEl.textContent = Progress.data.isActivated ? `Activado (${Progress.data.userRole})` : 'No activado ❌';
        if (keyEl) keyEl.textContent = Progress.data.userRole === 'teacher' ? Progress.data.licenseKey : Progress.data.classCode || 'N/A';

        const teacherLink = document.getElementById('teacher-panel-link');
        if (teacherLink) teacherLink.style.display = Progress.data.userRole === 'teacher' ? 'block' : 'none';

        document.querySelectorAll('.avatar-option').forEach(btn => {
            btn.classList.toggle('selected', btn.dataset.avatar === Progress.data.avatar);
            btn.onclick = () => {
                document.querySelectorAll('.avatar-option').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
            };
        });
    },

    saveSettings() {
        const name = document.getElementById('setting-name').value.trim();
        if (name) Progress.data.playerName = name;

        Progress.data.settings.sound = document.getElementById('setting-sound').checked;
        Progress.data.settings.animations = document.getElementById('setting-animations').checked;
        Progress.data.settings.timer = document.getElementById('setting-timer').checked;

        const selectedAvatar = document.querySelector('.avatar-option.selected');
        if (selectedAvatar) Progress.data.avatar = selectedAvatar.dataset.avatar;

        Progress.save();
        this.showToast('✅', 'Ajustes guardados');
    },

    resetProgress() {
        this.showModal(
            '¿Resetear progreso?',
            'Esto eliminará todo tu progreso, XP, logros y cursos completados. Esta acción no se puede deshacer.',
            () => {
                Progress.reset();
                XPSystem.load(0);
                Achievements.loadUnlocked([]);
                this.showToast('🗑️', 'Progreso reseteado');
                this.navigate('home');
            }
        );
    },

    // ---- Name Modal ----
    showNameModal() {
        const modal = document.getElementById('name-modal');
        modal.style.display = 'flex';
        document.getElementById('name-input').focus();
    },

    setPlayerName() {
        const name = document.getElementById('name-input').value.trim();
        if (!name) {
            this.showToast('⚠️', 'Escribe tu nombre');
            return;
        }
        Progress.data.playerName = name;
        Progress.save();
        document.getElementById('name-modal').style.display = 'none';
        this.updateHomeScreen();
        this.showToast('🎉', `¡Bienvenido, ${name}!`);
    },

    // ---- Modal ----
    showModal(title, text, onConfirm) {
        document.getElementById('modal-title').textContent = title;
        document.getElementById('modal-text').textContent = text;
        document.getElementById('modal-overlay').classList.add('show');
        document.getElementById('modal-confirm').onclick = () => {
            this.closeModal();
            if (onConfirm) onConfirm();
        };
    },

    closeModal() {
        document.getElementById('modal-overlay').classList.remove('show');
    },

    // ---- Toast ----
    showToast(icon, text) {
        const toast = document.getElementById('toast');
        document.getElementById('toast-icon').textContent = icon;
        document.getElementById('toast-text').textContent = text;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    },

    // ---- XP Popup ----
    showXPPopup(text) {
        const popup = document.getElementById('xp-popup');
        document.getElementById('xp-popup-text').textContent = text;
        popup.classList.remove('show');
        void popup.offsetWidth;
        popup.classList.add('show');
        setTimeout(() => popup.classList.remove('show'), 1500);
    },

    // ---- Level Up ----
    showLevelUp(level) {
        document.getElementById('levelup-level').textContent = `Nivel ${level}`;
        const titles = XPSystem.levels.find(l => l.level === level);
        document.getElementById('levelup-text').textContent =
            titles ? `¡Ahora eres ${titles.title}!` : '¡Sigue así!';
        document.getElementById('levelup-overlay').classList.add('show');
    },

    closeLevelUp() {
        document.getElementById('levelup-overlay').classList.remove('show');
    },

    showQuizResults(correct, total, accuracy) {
        const xpGained = XPSystem.sessionXP;
        const passed = accuracy >= 60;

        document.getElementById('results-score').textContent = ScoreSystem.currentScore;
        document.getElementById('results-accuracy').textContent = `${accuracy}%`;
        document.getElementById('results-xp').textContent = xpGained;

        const iconEl = document.getElementById('results-main-icon');
        const titleEl = document.getElementById('results-title');
        const subtitleEl = document.getElementById('results-subtitle');

        if (passed) {
            iconEl.textContent = '🏆';
            titleEl.textContent = '¡Quiz Completado!';
            subtitleEl.textContent = 'Has demostrado un gran dominio. ¡Sigue así!';
            
            // Only unlock next if passed
            Progress.completeCourse(QuizEngine.currentCourseId);
        } else {
            iconEl.textContent = '📚';
            titleEl.textContent = 'Sigue practicando';
            subtitleEl.textContent = 'Necesitas al menos 60% para desbloquear el siguiente nivel.';
        }

        this.navigate('results');
        
        // Save at the end of the quiz
        Progress.data.quizzesCompleted++;
        Progress.save();
    },

    rematchQuiz() {
        if (QuizEngine.currentCourseId && QuizEngine.currentLevelId) {
            QuizEngine.start(QuizEngine.currentLevelId, QuizEngine.currentCourseId);
        } else {
            this.navigate('level-select');
        }
    }
};

// ---- Initialize on DOM ready ----
document.addEventListener('DOMContentLoaded', () => App.init());
