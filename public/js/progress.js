/* ============================================
   LinguaQuest - Progress System
   Handles save/load and player progress
   Uses file-based storage in Electron (per OS user)
   Uses localStorage in browser
   ============================================ */

const Progress = {
    storageKey: 'linguaquest_save',
    data: null,
    isElectron: typeof window !== 'undefined' && window.electronAPI && window.electronAPI.isElectron,

    getDefault() {
        return {
            playerName: '',
            avatar: '🧑‍🎓',
            totalXP: 0,
            totalScore: 0,
            level: 1,
            dailyStreak: 0,
            lastPlayDate: null,
            quizzesCompleted: 0,
            totalQuestions: 0,
            correctAnswers: 0,
            bestStreak: 0,
            bestFastStreak: 0,
            perfectQuizzes: 0,
            coursesCompleted: 0,
            completedCourses: [],
            completedLevels: [],
            courseProgress: {},
            unlockedAchievements: [],
            isActivated: false,
            userRole: null, // 'teacher' or 'student'
            licenseKey: '',
            classCode: '',
            settings: { sound: true, animations: true, timer: true }
        };
    },

    async load() {
        try {
            if (this.isElectron) {
                // Electron: file-based storage per OS user account
                const result = await window.electronAPI.loadProgress();
                if (result.success && result.data) {
                    this.data = { ...this.getDefault(), ...result.data };
                } else {
                    this.data = this.getDefault();
                }
            } else {
                // Browser: localStorage
                const saved = localStorage.getItem(this.storageKey);
                if (saved) {
                    this.data = { ...this.getDefault(), ...JSON.parse(saved) };
                } else {
                    this.data = this.getDefault();
                }
            }
        } catch (e) {
            console.error('Error loading progress:', e);
            this.data = this.getDefault();
        }
        this.checkStreak();
        return this.data;
    },

    save() {
        if (!this.data) return;
        try {
            if (this.isElectron) {
                // Electron: save to user-specific file
                window.electronAPI.saveProgress(this.data);
            } else {
                // Browser: localStorage
                localStorage.setItem(this.storageKey, JSON.stringify(this.data));
            }
        } catch (e) {
            console.error('Error saving progress:', e);
        }
    },

    reset() {
        this.data = this.getDefault();
        if (this.isElectron) {
            window.electronAPI.deleteProgress();
        } else {
            localStorage.removeItem(this.storageKey);
        }
        this.save();
    },

    checkStreak() {
        if (!this.data || !this.data.lastPlayDate) return;
        const last = new Date(this.data.lastPlayDate);
        const now = new Date();
        const diffDays = Math.floor((now - last) / (1000 * 60 * 60 * 24));
        if (diffDays > 1) {
            this.data.dailyStreak = 0;
        }
    },

    updateStreak() {
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        if (this.data.lastPlayDate !== today) {
            const last = this.data.lastPlayDate ? new Date(this.data.lastPlayDate) : null;
            if (last) {
                const diff = Math.floor((now - last) / (1000 * 60 * 60 * 24));
                if (diff === 1) {
                    this.data.dailyStreak++;
                } else if (diff > 1) {
                    this.data.dailyStreak = 1;
                }
            } else {
                this.data.dailyStreak = 1;
            }
            this.data.lastPlayDate = today;
        }
    },


    completeCourse(courseId) {
        if (!this.data.completedCourses.includes(courseId)) {
            this.data.completedCourses.push(courseId);
            this.data.coursesCompleted = this.data.completedCourses.length;
        }
        this.save();
    },

    isCourseCompleted(courseId) {
        return this.data.completedCourses.includes(courseId);
    },

    getCourseProgress(courseId) {
        return this.data.courseProgress[courseId] || 0;
    },

    updateCourseProgress(courseId, percent) {
        this.data.courseProgress[courseId] = Math.max(
            this.data.courseProgress[courseId] || 0, percent
        );
        this.save();
    },

    completeLevel(levelId) {
        if (!this.data.completedLevels.includes(levelId)) {
            this.data.completedLevels.push(levelId);
        }
        this.save();
    },

    isLevelCompleted(levelId) {
        return this.data.completedLevels.includes(levelId);
    },

    getPlayerData() {
        return {
            quizzesCompleted: this.data.quizzesCompleted,
            totalQuestions: this.data.totalQuestions,
            totalXP: this.data.totalXP,
            dailyStreak: this.data.dailyStreak,
            bestStreak: this.data.bestStreak,
            bestFastStreak: this.data.bestFastStreak,
            perfectQuizzes: this.data.perfectQuizzes,
            coursesCompleted: this.data.coursesCompleted,
            completedLevels: this.data.completedLevels
        };
    }
};
