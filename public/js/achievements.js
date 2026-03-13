/* ============================================
   LinguaQuest - Achievements System
   ============================================ */

const Achievements = {
    definitions: [],
    unlocked: [],

    async load() {
        try {
            const res = await fetch('data/achievements.json');
            this.definitions = await res.json();
        } catch (e) {
            console.error('Error loading achievements:', e);
        }
    },

    loadUnlocked(ids) {
        this.unlocked = ids || [];
    },

    check(playerData) {
        const newlyUnlocked = [];
        for (const ach of this.definitions) {
            if (this.unlocked.includes(ach.id)) continue;
            let met = false;
            switch (ach.condition) {
                case 'quizCompleted': met = playerData.quizzesCompleted >= ach.value; break;
                case 'streak': met = playerData.bestStreak >= ach.value; break;
                case 'totalQuestions': met = playerData.totalQuestions >= ach.value; break;
                case 'levelComplete': met = playerData.completedLevels && playerData.completedLevels.includes(ach.value); break;
                case 'totalXP': met = playerData.totalXP >= ach.value; break;
                case 'dailyStreak': met = playerData.dailyStreak >= ach.value; break;
                case 'perfectQuiz': met = playerData.perfectQuizzes >= ach.value; break;
                case 'fastAnswers': met = playerData.bestFastStreak >= ach.value; break;
                case 'coursesCompleted': met = playerData.coursesCompleted >= ach.value; break;
            }
            if (met) {
                this.unlocked.push(ach.id);
                newlyUnlocked.push(ach);
            }
        }
        return newlyUnlocked;
    },

    getAll() {
        return this.definitions.map(ach => ({
            ...ach,
            unlocked: this.unlocked.includes(ach.id)
        }));
    },

    getUnlockedCount() {
        return this.unlocked.length;
    },

    getTotalCount() {
        return this.definitions.length;
    },

    render(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        const all = this.getAll();
        container.innerHTML = '';
        document.getElementById('achievements-unlocked').textContent = this.getUnlockedCount();
        document.getElementById('achievements-total').textContent = this.getTotalCount();

        all.forEach((ach, i) => {
            const card = document.createElement('div');
            card.className = `achievement-card ${ach.unlocked ? 'unlocked' : 'locked'}`;
            card.style.animationDelay = `${i * 0.05}s`;
            card.innerHTML = `
                <div class="achievement-icon-large">${ach.icon}</div>
                <div class="achievement-info">
                    <div class="achievement-name">${ach.name}</div>
                    <div class="achievement-desc">${ach.description}</div>
                </div>
                <div class="achievement-status">${ach.unlocked ? '✅' : '🔒'}</div>
            `;
            container.appendChild(card);
        });
    },

    renderMini(containerId, limit) {
        const container = document.getElementById(containerId);
        if (!container) return;
        const all = this.getAll();
        const show = all.filter(a => a.unlocked).slice(0, limit || 5);
        container.innerHTML = '';
        if (show.length === 0) {
            container.innerHTML = '<p style="color:var(--text-muted);font-size:13px;">Aún no tienes logros. ¡Sigue jugando!</p>';
            return;
        }
        show.forEach(ach => {
            const el = document.createElement('div');
            el.className = 'mini-achievement';
            el.innerHTML = `
                <div class="mini-achievement-icon">${ach.icon}</div>
                <div class="mini-achievement-info">
                    <div class="mini-achievement-name">${ach.name}</div>
                    <div class="mini-achievement-desc">${ach.description}</div>
                </div>
            `;
            container.appendChild(el);
        });
    }
};
