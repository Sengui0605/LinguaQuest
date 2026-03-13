/* ============================================
   LinguaQuest - Quiz Engine
   Core quiz logic and flow
   ============================================ */

const QuizEngine = {
    questions: [],
    currentIndex: 0,
    lives: 3,
    correctCount: 0,
    incorrectCount: 0,
    currentStreak: 0,
    fastStreak: 0,
    currentCourseId: '',
    currentLevelId: '',
    isAnswered: false,
    newAchievements: [],

    start(levelId, courseId) {
        this.currentLevelId = levelId;
        this.currentCourseId = courseId;
        const allQuestions = QuestionsDB[courseId];
        if (!allQuestions || allQuestions.length === 0) {
            App.showToast('❌', 'No hay preguntas para este curso');
            return;
        }

        this.questions = this.shuffle([...allQuestions]).slice(0, 15);
        this.currentIndex = 0;
        this.lives = Progress.checkLives();
        this.correctCount = 0;
        this.incorrectCount = 0;
        this.currentStreak = 0;
        this.fastStreak = 0;
        this.isAnswered = false;
        this.newAchievements = [];

        ScoreSystem.reset();
        XPSystem.resetSession();

        App.navigate('quiz');
        this.renderQuestion();
    },

    renderQuestion() {
        if (this.currentIndex >= this.questions.length || this.lives <= 0) {
            this.finish();
            return;
        }

        this.isAnswered = false;
        const q = this.questions[this.currentIndex];
        const total = this.questions.length;

        document.getElementById('quiz-progress-bar').style.width =
            `${(this.currentIndex / total) * 100}%`;
        document.getElementById('quiz-question-number').textContent =
            `${this.currentIndex + 1} / ${total}`;

        this.renderLives();

        const categoryMap = {
            'to-be': 'Verbo To Be', 'pronouns': 'Pronombres', 'present-simple': 'Presente Simple',
            'articles': 'Artículos', 'prepositions': 'Preposiciones', 'greetings': 'Vocabulario',
            'numbers-days': 'Números y Días', 'wh-questions': 'Wh Questions',
            'adjectives-basic': 'Adjetivos', 'demonstratives': 'Demostrativos',
            'present-continuous': 'Present Continuous', 'past-simple': 'Past Simple',
            'comparatives': 'Comparativos', 'superlatives': 'Superlativos',
            'modals': 'Modal Verbs', 'phrasal-verbs': 'Phrasal Verbs',
            'connectors': 'Conectores', 'question-forms': 'Question Forms',
            'present-perfect': 'Present Perfect', 'past-perfect': 'Past Perfect',
            'conditionals': 'Conditionals', 'passive-voice': 'Passive Voice',
            'reported-speech': 'Reported Speech', 'idioms': 'Idioms'
        };

        document.getElementById('question-category').textContent =
            categoryMap[this.currentCourseId] || 'Gramática';
        document.getElementById('question-text').textContent = q.q;
        document.getElementById('question-hint').textContent = q.hint || '';

        const optionsContainer = document.getElementById('quiz-options');
        optionsContainer.innerHTML = '';
        const letters = ['A', 'B', 'C', 'D'];

        q.o.forEach((opt, i) => {
            const btn = document.createElement('button');
            btn.className = 'option-btn';
            btn.innerHTML = `
                <span class="option-letter">${letters[i]}</span>
                <span class="option-text">${opt}</span>
            `;
            btn.onclick = () => this.answer(i);
            optionsContainer.appendChild(btn);
        });

        const feedback = document.getElementById('quiz-feedback');
        feedback.className = 'quiz-feedback';
        feedback.classList.remove('show');

        if (Progress.data.settings.timer) {
            Timer.start(15,
                (remaining) => {},
                () => this.answer(-1)
            );
        }
    },

    answer(index) {
        if (this.isAnswered) return;
        this.isAnswered = true;
        Timer.stop();

        const q = this.questions[this.currentIndex];
        const correct = index === q.a;
        const isQuick = Timer.isQuick();
        const buttons = document.querySelectorAll('.option-btn');

        buttons.forEach((btn, i) => {
            btn.disabled = true;
            if (i === q.a) btn.classList.add('correct');
            if (i === index && !correct) btn.classList.add('incorrect');
        });

        const feedback = document.getElementById('quiz-feedback');
        const feedbackIcon = document.getElementById('feedback-icon');
        const feedbackText = document.getElementById('feedback-text');
        const feedbackExpl = document.getElementById('feedback-explanation');

        if (correct) {
            feedback.className = 'quiz-feedback show correct';
            feedbackIcon.textContent = '✅';
            feedbackText.textContent = isQuick ? '¡Velocidad increíble!' : '¡Correcto!';
            feedbackExpl.textContent = q.hint ? `💡 ${q.hint}` : '¡Sigue así!';

            const points = ScoreSystem.addCorrect(isQuick);
            const xpGained = isQuick ? 15 : 10;
            const newLevel = XPSystem.addXP(xpGained);
            this.correctCount++;
            this.currentStreak++;
            if (isQuick) this.fastStreak++;
            else this.fastStreak = 0;

            App.showXPPopup(`+${xpGained} XP`);
            if (newLevel) setTimeout(() => App.showLevelUp(newLevel), 800);
        } else {
            feedback.className = 'quiz-feedback show incorrect';
            feedbackIcon.textContent = '❌';
            feedbackText.textContent = index === -1 ? '⏰ ¡Se acabó el tiempo!' : '¡Incorrecto!';
            feedbackExpl.textContent = `La respuesta correcta es: ${q.o[q.a]}`;
            if (q.hint) feedbackExpl.textContent += `\n💡 ${q.hint}`;

            this.incorrectCount++;
            this.currentStreak = 0;
            this.fastStreak = 0;
            this.lives = Progress.loseLife();
            this.renderLives();
        }

        Progress.data.totalQuestions++;
        if (correct) Progress.data.correctAnswers++;
        if (this.currentStreak > Progress.data.bestStreak)
            Progress.data.bestStreak = this.currentStreak;
        if (this.fastStreak > Progress.data.bestFastStreak)
            Progress.data.bestFastStreak = this.fastStreak;
        Progress.save();
    },

    nextQuestion() {
        this.currentIndex++;
        this.renderQuestion();
    },

    renderLives() {
        const container = document.getElementById('quiz-lives');
        if (!container) return;
        let html = '';
        for (let i = 0; i < 3; i++) {
            html += i < this.lives
                ? '<span>❤️</span>'
                : '<span class="life-lost">🖤</span>';
        }
        container.innerHTML = html;
    },

    finish() {
        const total = this.questions.length;
        const percent = total > 0 ? Math.round((this.correctCount / total) * 100) : 0;
        const isPerfect = this.incorrectCount === 0 && this.correctCount > 0;
        const completionXP = 100;

        if (percent >= 70) {
            ScoreSystem.addCompletion();
            XPSystem.addXP(completionXP);
            Progress.data.totalXP = XPSystem.currentXP;
            Progress.data.totalScore += ScoreSystem.getScore();
            Progress.data.level = XPSystem.getLevel();
            Progress.data.quizzesCompleted++;

            if (percent >= 80) {
                Progress.completeCourse(this.currentCourseId);
                this.checkLevelCompletion();
            }

            if (isPerfect) Progress.data.perfectQuizzes++;
            Progress.updateStreak();
            Progress.resetLives();
        } else {
            Progress.data.totalXP = XPSystem.currentXP;
            Progress.data.totalScore += ScoreSystem.getScore();
            Progress.data.level = XPSystem.getLevel();
        }

        Progress.save();

        const playerData = Progress.getPlayerData();
        this.newAchievements = Achievements.check(playerData);
        Progress.data.unlockedAchievements = Achievements.unlocked;
        Progress.save();

        this.showResults(percent, isPerfect);
    },

    checkLevelCompletion() {
        const coursesData = App.coursesData;
        if (!coursesData) return;
        for (const level of coursesData) {
            const allDone = level.courses.every(c =>
                Progress.isCourseCompleted(c.id)
            );
            if (allDone) Progress.completeLevel(level.id);
        }
    },

    showResults(percent, isPerfect) {
        App.navigate('results');

        let emoji, title, subtitle;
        if (percent >= 90) { emoji = '🏆'; title = '¡Increíble!'; subtitle = '¡Eres un genio del inglés!'; }
        else if (percent >= 70) { emoji = '🎉'; title = '¡Excelente!'; subtitle = '¡Gran trabajo!'; }
        else if (percent >= 50) { emoji = '👍'; title = '¡Bien hecho!'; subtitle = 'Sigue practicando'; }
        else { emoji = '💪'; title = '¡No te rindas!'; subtitle = 'La práctica hace al maestro'; }
        if (isPerfect) { emoji = '💯'; title = '¡PERFECTO!'; subtitle = '¡Sin errores!'; }

        document.getElementById('results-emoji').textContent = emoji;
        document.getElementById('results-title').textContent = title;
        document.getElementById('results-subtitle').textContent = subtitle;
        document.getElementById('results-correct').textContent = this.correctCount;
        document.getElementById('results-incorrect').textContent = this.incorrectCount;
        document.getElementById('results-score').textContent = ScoreSystem.getScore();
        document.getElementById('results-xp').textContent = XPSystem.sessionXP;
        document.getElementById('results-percent').textContent = percent + '%';

        const circumference = 2 * Math.PI * 54;
        const scoreCircle = document.getElementById('results-score-circle');
        scoreCircle.style.strokeDasharray = circumference;
        scoreCircle.style.strokeDashoffset = circumference;
        setTimeout(() => {
            scoreCircle.style.strokeDashoffset = circumference * (1 - percent / 100);
        }, 300);

        const achContainer = document.getElementById('results-achievements');
        achContainer.innerHTML = '';
        this.newAchievements.forEach(ach => {
            const el = document.createElement('div');
            el.className = 'results-achievement-item';
            el.innerHTML = `
                <div class="results-achievement-icon">${ach.icon}</div>
                <div class="results-achievement-info">
                    <h4>🔓 ${ach.name}</h4>
                    <p>${ach.description}</p>
                </div>
            `;
            achContainer.appendChild(el);
        });

        const unlockEl = document.getElementById('results-unlock');
        if (percent >= 80) {
            unlockEl.style.display = 'block';
            document.getElementById('results-unlock-text').textContent = '¡Próximo curso desbloqueado!';
        } else {
            unlockEl.style.display = 'none';
        }
    },

    confirmExit() {
        App.showModal(
            '¿Salir del quiz?',
            'Perderás el progreso de este quiz.',
            () => { Timer.stop(); App.navigate('home'); }
        );
    },

    shuffle(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }
};
