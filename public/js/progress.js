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
            teacherKey: '', // set when student joins a class (for Firestore sync)
            settings: { sound: true, animations: true, timer: true },
            wordsLearned: 0,
            dailyActivity: {} // { "YYYY-MM-DD": number of questions answered that day }
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
                window.electronAPI.saveProgress(this.data);
            } else {
                localStorage.setItem(this.storageKey, JSON.stringify(this.data));
            }
            // Sync to Firestore if student
            if (this.data.userRole === 'student' && this.data.classCode && window.FirebaseDB) {
                this._firestoreSyncDebounced();
            }
        } catch (e) {
            console.error('Error saving progress:', e);
            if (typeof App !== 'undefined' && App.showToast) {
                App.showToast('⚠️', 'Error al guardar el progreso');
            }
        }
    },

    _firestoreSyncTimer: null,
    _firestoreSyncDebounced() {
        clearTimeout(this._firestoreSyncTimer);
        this._firestoreSyncTimer = setTimeout(() => {
            this._syncToFirestore().catch(e => console.warn('Firestore sync failed:', e));
        }, 3000); // debounce 3s to avoid hammering Firestore
    },

    async _syncToFirestore() {
        if (!window.FirebaseDB || !this.data) return;
        const { db, doc, setDoc } = window.FirebaseDB;
        if (!db) return;

        let deviceId = localStorage.getItem('lq_device_id');
        if (!deviceId) return;

        const todayStr = new Date().toISOString().split('T')[0];
        const dailyActivity = this.data.dailyActivity || {};
        const last30 = {};
        Object.keys(dailyActivity).sort().slice(-30).forEach(k => { last30[k] = dailyActivity[k]; });

        const teacherKey = this.data.teacherKey;
        if (!teacherKey) return;

        await setDoc(doc(db, 'students', deviceId), {
            studentId: deviceId,
            name: this.data.playerName || 'Estudiante',
            xp: this.data.totalXP || 0,
            level: typeof XPSystem !== 'undefined' ? XPSystem.getLevel() : 1,
            accuracy: this.data.totalQuestions
                ? Math.round((this.data.correctAnswers / this.data.totalQuestions) * 100) / 100
                : 0,
            coursesCompleted: this.data.coursesCompleted || 0,
            completedCourses: this.data.completedCourses || [],
            totalQuizzes: this.data.quizzesCompleted || 0,
            lastActive: todayStr,
            dailyActivity: last30,
            teacherKey,
        }, { merge: true });
    },

    validateAndFixStats(coursesData) {
        if (!this.data) return;
        
        console.log("🛠️ Validating progress data integrity...");
        let changed = false;
        
        // 0. Normalize lastPlayDate if it's in a weird format or missing but they played
        if (this.data.lastPlayDate) {
            try {
                const date = new Date(this.data.lastPlayDate);
                if (!isNaN(date.getTime())) {
                    const isoDate = date.toISOString().split('T')[0];
                    if (this.data.lastPlayDate !== isoDate) {
                        console.log(`📅 Normalizing date: ${this.data.lastPlayDate} -> ${isoDate}`);
                        this.data.lastPlayDate = isoDate;
                        changed = true;
                    }
                }
            } catch (e) {}
        }

        // 1. Recover XP, Score, Questions and Quizzes
        if (this.data.correctAnswers > 0) {
            if (!this.data.totalXP || this.data.totalXP === 0) {
                this.data.totalXP = this.data.correctAnswers * 10;
                changed = true;
            }
            if (!this.data.totalScore || this.data.totalScore === 0) {
                this.data.totalScore = this.data.correctAnswers * 10;
                changed = true;
            }
            if (!this.data.totalQuestions || this.data.totalQuestions === 0) {
                this.data.totalQuestions = this.data.correctAnswers;
                changed = true;
            }
            if (!this.data.quizzesCompleted || this.data.quizzesCompleted === 0) {
                this.data.quizzesCompleted = Math.max(1, Math.floor(this.data.correctAnswers / 10));
                changed = true;
            }
        }
        
        // 2. Sync courses and levels
        const actualCourses = (this.data.completedCourses || []).length;
        if (this.data.coursesCompleted !== actualCourses) {
            this.data.coursesCompleted = actualCourses;
            changed = true;
        }

        if (coursesData) {
            ['basic', 'intermediate', 'advanced'].forEach(lvlId => {
                if (this.checkLevelCompletion(lvlId, coursesData)) {
                    changed = true;
                }
            });
        }

        // 3. Ensure dailyStreak is a number
        if (typeof this.data.dailyStreak !== 'number') {
            this.data.dailyStreak = parseInt(this.data.dailyStreak) || 0;
            changed = true;
        }

        // 5. Ensure dailyActivity and wordsLearned exist (analytics)
        if (!this.data.dailyActivity || typeof this.data.dailyActivity !== 'object') {
            this.data.dailyActivity = {};
            changed = true;
        }
        if (typeof this.data.wordsLearned !== 'number') {
            this.data.wordsLearned = this.data.wordsLearned || 0;
            changed = true;
        }

        // 4. Check for achievements that might have been earned
        if (typeof Achievements !== 'undefined' && Achievements.check) {
            const newlyUnlocked = Achievements.check(this.data);
            if (newlyUnlocked.length > 0) {
                console.log(`🏆 Desbloqueados ${newlyUnlocked.length} logros retroactivos`);
                this.data.unlockedAchievements = Achievements.unlocked;
                changed = true;
            }
        }
        
        if (changed) {
            console.log("✅ Stats recovered and synchronized");
            this.save();
        }
    },

    checkLevelCompletion(levelId, coursesData) {
        if (!this.data || !coursesData) return false;
        const level = coursesData.find(l => l.id === levelId);
        if (!level) return false;
        
        const allCompleted = level.courses.every(c => this.data.completedCourses.includes(c.id));
        if (allCompleted && !this.data.completedLevels.includes(levelId)) {
            console.log(`🏅 Nivel Completado: ${levelId}`);
            this.data.completedLevels.push(levelId);
            return true;
        }
        return false;
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
        
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        // If last play was not today AND not yesterday, racha is lost
        if (this.data.lastPlayDate !== todayStr && this.data.lastPlayDate !== yesterdayStr) {
            console.log("🔥 Racha perdida (Last play was " + this.data.lastPlayDate + ")");
            this.data.dailyStreak = 0;
            // Note: we don't save here to avoid unnecessary writes, 
            // it will be saved next time they play.
        }
    },

    updateStreak() {
        if (!this.data) return;
        
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        
        // If already updated today, do nothing
        if (this.data.lastPlayDate === todayStr) return;

        const lastPlayDate = this.data.lastPlayDate;
        
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        if (!lastPlayDate) {
            // First time playing
            this.data.dailyStreak = 1;
        } else if (lastPlayDate === yesterdayStr) {
            // Played yesterday, increment streak
            this.data.dailyStreak++;
            console.log("🔥 Racha incrementada: " + this.data.dailyStreak);
        } else {
            // Played before yesterday, reset to 1
            this.data.dailyStreak = 1;
            console.log("🔥 Racha reiniciada a 1");
        }

        this.data.lastPlayDate = todayStr;
        this.save();
    },


    completeCourse(courseId) {
        if (!courseId) return;
        const id = courseId.trim();
        if (!Array.isArray(this.data.completedCourses)) {
            this.data.completedCourses = [];
        }
        if (!this.data.completedCourses.includes(id)) {
            this.data.completedCourses.push(id);
            this.data.coursesCompleted = this.data.completedCourses.length;
        }
        this.save();
    },

    isCourseCompleted(courseId) {
        if (!courseId || !this.data || !this.data.completedCourses) return false;
        return this.data.completedCourses.includes(courseId.trim());
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

    addXP(amount) {
        if (!this.data) return;
        this.data.totalXP += amount;
        this.save();
    },

    addScore(amount) {
        if (!this.data) return;
        this.data.totalScore += amount;
        this.save();
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
            completedLevels: this.data.completedLevels,
            wordsLearned: this.data.wordsLearned || 0,
            dailyActivity: this.data.dailyActivity || {}
        };
    },

    /** Increment today's question count for analytics (daily activity). */
    incrementDailyActivity() {
        if (!this.data) return;
        const todayStr = new Date().toISOString().split('T')[0];
        this.data.dailyActivity = this.data.dailyActivity || {};
        this.data.dailyActivity[todayStr] = (this.data.dailyActivity[todayStr] || 0) + 1;
    },

    /** Increment words learned (vocabulary questions answered correctly). */
    incrementWordsLearned() {
        if (!this.data) return;
        this.data.wordsLearned = (this.data.wordsLearned || 0) + 1;
    }
};
