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

        await Ranking.load();
        loadingBar.style.width = '80%';

        try {
            const res = await fetch('data/courses.json');
            this.coursesData = await res.json();
        } catch (e) {
            console.error('Error loading courses:', e);
        }

        XPSystem.load(Progress.data.totalXP);
        loadingBar.style.width = '100%';

        setTimeout(() => {
            if (!Progress.data.playerName) {
                this.navigate('home');
                this.showNameModal();
            } else {
                this.navigate('home');
            }
        }, 800);
    },

    navigate(screenId) {
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
            case 'ranking': this.updateRanking(); Ranking.render('ranking-list'); break;
            case 'settings': this.loadSettings(); break;
        }
    },

    updateHomeScreen() {
        document.getElementById('home-xp').textContent = Progress.data.totalXP;
        document.getElementById('home-streak').textContent = Progress.data.dailyStreak;
        document.getElementById('home-level').textContent = XPSystem.getLevel();
        document.getElementById('home-lives').textContent = Progress.checkLives();
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
                    const lives = Progress.checkLives();
                    if (lives <= 0) {
                        this.showToast('💔', 'No tienes vidas. Espera 1 minuto.');
                        return;
                    }
                    QuizEngine.start(level.id, course.id);
                };
            }
            container.appendChild(card);
        });
    },

    updateRanking() {
        Ranking.savePlayerProgress({
            name: Progress.data.playerName || 'Tú',
            avatar: Progress.data.avatar,
            level: XPSystem.getLevel ? XPSystem.getLevel() : Progress.data.level,
            xp: Progress.data.totalXP,
            score: Progress.data.totalScore
        });
    },

    // ---- Settings ----
    loadSettings() {
        document.getElementById('setting-name').value = Progress.data.playerName || '';
        document.getElementById('setting-sound').checked = Progress.data.settings.sound;
        document.getElementById('setting-animations').checked = Progress.data.settings.animations;
        document.getElementById('setting-timer').checked = Progress.data.settings.timer;

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
    }
};

// ---- Initialize on DOM ready ----
document.addEventListener('DOMContentLoaded', () => App.init());
