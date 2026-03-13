/* ============================================
   LinguaQuest - XP System
   Handles experience points and leveling
   ============================================ */

const XPSystem = {
    currentXP: 0,
    sessionXP: 0,
    levels: [
        { level: 1, xp: 0, title: 'Principiante' },
        { level: 2, xp: 100, title: 'Novato' },
        { level: 3, xp: 250, title: 'Aprendiz' },
        { level: 4, xp: 500, title: 'Estudiante' },
        { level: 5, xp: 1000, title: 'Conocedor' },
        { level: 6, xp: 2000, title: 'Avanzado' },
        { level: 7, xp: 3500, title: 'Experto' },
        { level: 8, xp: 5000, title: 'Maestro' },
        { level: 9, xp: 7500, title: 'Gran Maestro' },
        { level: 10, xp: 10000, title: 'Leyenda' },
        { level: 11, xp: 15000, title: 'Mítico' },
        { level: 12, xp: 20000, title: 'Inmortal' }
    ],

    resetSession() {
        this.sessionXP = 0;
    },

    addXP(amount) {
        const oldLevel = this.getLevel();
        this.currentXP += amount;
        this.sessionXP += amount;
        const newLevel = this.getLevel();
        this.updateDisplay();
        if (newLevel > oldLevel) return newLevel;
        return null;
    },

    getLevel() {
        let level = 1;
        for (const l of this.levels) {
            if (this.currentXP >= l.xp) level = l.level;
            else break;
        }
        return level;
    },

    getTitle() {
        const level = this.getLevel();
        const l = this.levels.find(x => x.level === level);
        return l ? l.title : 'Principiante';
    },

    getLevelInfo() {
        const level = this.getLevel();
        const current = this.levels.find(x => x.level === level);
        const next = this.levels.find(x => x.level === level + 1);
        return {
            level,
            title: current ? current.title : 'Principiante',
            currentXP: this.currentXP,
            xpForCurrent: current ? current.xp : 0,
            xpForNext: next ? next.xp : current ? current.xp + 5000 : 5000,
        };
    },

    getProgressPercent() {
        const info = this.getLevelInfo();
        const range = info.xpForNext - info.xpForCurrent;
        const progress = this.currentXP - info.xpForCurrent;
        return Math.min(100, Math.round((progress / range) * 100));
    },

    updateDisplay() {
        const el = document.getElementById('quiz-xp');
        if (el) el.textContent = '⚡ ' + this.sessionXP + ' XP';
    },

    load(xp) {
        this.currentXP = xp || 0;
    }
};
