/* ============================================
   LinguaQuest - Quiz Engine
   Core quiz logic and flow
   ============================================ */

const QuizEngine = {
    questions: [],
    currentIndex: 0,
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
        this.lives = 5; 
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

    confirmExit() {
        App.showModal(
            ' Abandonar aventura?',
            'Si sales ahora, perderás tu progreso en este quiz.',
            () => {
                Timer.stop();
                App.navigate('home');
            }
        );
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

        // Ensure options are visible
        document.getElementById('quiz-question-container-inner').style.display = 'block';
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

        // Hide content to make room for feedback
        setTimeout(() => {
            document.getElementById('quiz-question-container-inner').style.display = 'none';
        }, 150);

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

            SoundSystem.play('correct');
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
            SoundSystem.play('wrong');
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

    shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    },

    finish() {
        const accuracy = Math.round((this.correctCount / this.questions.length) * 100);
        App.showQuizResults(this.correctCount, this.questions.length, accuracy);
    }
};

