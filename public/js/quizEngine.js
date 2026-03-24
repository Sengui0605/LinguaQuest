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
    readingSubIndex: 0,
    readingAnswers: [],
    questionResults: [], // { type, correct, question, correctAnswer }

    // Start a custom quiz (from QuizBuilder)
    startCustom(questions, quizTitle) {
        if (!questions || !questions.length) {
            App.showToast('❌', 'El quiz no tiene preguntas');
            return;
        }
        this.customMode       = true;
        this.customQuizTitle  = quizTitle || 'Quiz Personalizado';
        this.currentLevelId   = 'custom';
        this.currentCourseId  = '_custom_';
        this.assignmentTotal  = null;
        this.questions        = this.shuffle([...questions]).slice(0, Math.min(questions.length, 25));
        this.currentIndex     = 0;
        this.lives            = 5;
        this.correctCount     = 0;
        this.incorrectCount   = 0;
        this.currentStreak    = 0;
        this.fastStreak       = 0;
        this.isAnswered       = false;
        this.newAchievements  = [];
        this.questionResults  = [];

        ScoreSystem.reset();
        XPSystem.resetSession();
        this.updateStreakDisplay();

        App.navigate('quiz');
        this.renderQuestion();
    },

    start(levelId, courseId, options) {
        this.customMode      = false;
        this.customQuizTitle = '';
        this.currentLevelId = levelId;
        this.currentCourseId = courseId;
        this.assignmentTotal = (options && options.total) || null;
        const allQuestions = QuestionsDB[courseId];
        if (!allQuestions || allQuestions.length === 0) {
            App.showToast('❌', 'No hay preguntas para este curso');
            return;
        }

        this.questions = this.pickQuestionsByType(allQuestions, levelId);
        this.currentIndex = 0;
        this.lives = 5; 
        this.correctCount = 0;
        this.incorrectCount = 0;
        this.currentStreak = 0;
        this.fastStreak = 0;
        this.isAnswered = false;
        this.newAchievements = [];
        this.questionResults = [];

        ScoreSystem.reset();
        XPSystem.resetSession();
        this.updateStreakDisplay();

        App.navigate('quiz');
        this.renderQuestion();
    },

    pickQuestionsByType(allQuestions, levelId) {
        const total = this.assignmentTotal || 20;
        let dist = { mc: 12, write: 4, order: 2, matching: 2, reading: 0, sentence_puzzle: 0 };

        if (levelId === 'intermediate') {
            dist = { mc: 7, write: 5, order: 3, matching: 2, reading: 2, sentence_puzzle: 1 };
        } else if (levelId === 'advanced') {
            dist = { mc: 4, write: 6, order: 4, matching: 2, reading: 2, sentence_puzzle: 2 };
        }

        const questionsByType = {
            multiple_choice: allQuestions.filter(q => !q.type || q.type === 'multiple_choice'),
            write: allQuestions.filter(q => q.type === 'write'),
            order: allQuestions.filter(q => q.type === 'order'),
            matching: allQuestions.filter(q => q.type === 'matching'),
            reading: allQuestions.filter(q => q.type === 'reading'),
            sentence_puzzle: allQuestions.filter(q => q.type === 'sentence_puzzle')
        };

        let selected = [];
        selected = selected.concat(this.shuffle([...questionsByType.multiple_choice]).slice(0, dist.mc));
        selected = selected.concat(this.shuffle([...questionsByType.write]).slice(0, dist.write));
        selected = selected.concat(this.shuffle([...questionsByType.order]).slice(0, dist.order));
        selected = selected.concat(this.shuffle([...questionsByType.matching]).slice(0, dist.matching));
        selected = selected.concat(this.shuffle([...questionsByType.reading]).slice(0, dist.reading));
        selected = selected.concat(this.shuffle([...questionsByType.sentence_puzzle]).slice(0, dist.sentence_puzzle));

        // Fill if not enough of a specific type
        if (selected.length < total) {
            const remaining = allQuestions.filter(q => !selected.includes(q));
            selected = selected.concat(this.shuffle([...remaining]).slice(0, total - selected.length));
        }

        return this.shuffle(selected);
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

        // Ensure default type
        if (!q.type) q.type = 'multiple_choice';

        document.getElementById('quiz-progress-bar').style.width =
            `${(this.currentIndex / total) * 100}%`;
        document.getElementById('quiz-question-number').textContent =
            `${this.currentIndex + 1} / ${total}`;

        // Reset containers
        const containers = ['quiz-options', 'quiz-write-container', 'quiz-order-container', 'quiz-matching-container', 'quiz-reading-container', 'quiz-sentence-puzzle-container'];
        containers.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.style.display = 'none';
                el.style.setProperty('display', 'none', 'important');
            }
        });

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
            categoryMap[this.currentCourseId] || q.category || 'Gramática';
        const questionTitle = q.type === 'reading' ? (q.title || 'Lectura') : (q.q || q.question);
        document.getElementById('question-text').textContent = questionTitle;

        // Render by type
        switch (q.type) {
            case 'multiple_choice':
                this.renderMultipleChoice(q);
                break;
            case 'write':
                this.renderWrite(q);
                break;
            case 'order':
                this.renderOrder(q);
                break;
            case 'matching':
                this.renderMatching(q);
                break;
            case 'reading':
                this.renderReadingPassage(q);
                break;
            case 'sentence_puzzle':
                this.renderSentencePuzzle(q);
                break;
            default:
                this.renderMultipleChoice(q);
        }

        const feedback = document.getElementById('quiz-feedback');
        feedback.className = 'quiz-feedback';
        feedback.classList.remove('show');

        if (Progress.data.settings.timer) {
            Timer.start(15,
                (remaining) => {},
                () => {
                    if (q.type === 'multiple_choice') this.answer(-1);
                    else if (q.type === 'reading') {
                        const sub = this.questions[this.currentIndex].questions || [];
                        while (this.readingAnswers.length < sub.length) this.readingAnswers.push(-1);
                        this.answer({ type: 'reading', subAnswers: this.readingAnswers });
                        this.readingSubIndex = 0;
                        this.readingAnswers = [];
                    } else if (q.type === 'sentence_puzzle') this.answer([]);
                    else this.answer('');
                }
            );
        }

        document.getElementById('quiz-question-container-inner').style.display = 'block';
    },

    renderMultipleChoice(q) {
        const optionsContainer = document.getElementById('quiz-options');
        optionsContainer.style.display = 'grid';
        optionsContainer.innerHTML = '';
        const letters = ['A', 'B', 'C', 'D'];
        const opts = q.o || q.options || [];

        opts.forEach((opt, i) => {
            const btn = document.createElement('button');
            btn.className = 'option-btn';
            btn.innerHTML = `
                <span class="option-letter">${letters[i]}</span>
                <span class="option-text">${opt}</span>
            `;
            btn.onclick = (e) => this.answer(i, e);
            optionsContainer.appendChild(btn);
        });
    },

    renderWrite(q) {
        const container = document.getElementById('quiz-write-container');
        container.style.display = 'flex';
        const input = document.getElementById('quiz-write-input');
        input.value = '';
        setTimeout(() => input.focus(), 50);

        const submitBtn = document.getElementById('quiz-write-submit');
        submitBtn.onclick = () => {
            const val = input.value.trim();
            if (val) this.answer(val);
        };

        input.onkeyup = (e) => {
            if (e.key === 'Enter') submitBtn.click();
        };
    },

    renderOrder(q) {
        const container = document.getElementById('quiz-order-container');
        container.style.display = 'flex';
        const slots = document.getElementById('quiz-order-slots');
        const tokens = document.getElementById('quiz-order-tokens');
        slots.innerHTML = '';
        tokens.innerHTML = '';

        let currentOrder = [];
        const words = this.shuffle([...q.words]);

        words.forEach(word => {
            const token = document.createElement('div');
            token.className = 'order-token';
            token.textContent = word;
            token.onclick = () => {
                if (!token.classList.contains('used')) {
                    token.classList.add('used');
                    token.style.opacity = '0.3';
                    token.style.pointerEvents = 'none';
                    
                    const slot = document.createElement('div');
                    slot.className = 'order-token';
                    slot.textContent = word;
                    slot.onclick = () => {
                        slots.removeChild(slot);
                        token.classList.remove('used');
                        token.style.opacity = '1';
                        token.style.pointerEvents = 'auto';
                        const idx = currentOrder.indexOf(word);
                        if (idx !== -1) currentOrder.splice(idx, 1);
                    };
                    slots.appendChild(slot);
                    currentOrder.push(word);
                }
            };
            tokens.appendChild(token);
        });

        document.getElementById('quiz-order-submit').onclick = () => {
            if (currentOrder.length > 0) this.answer(currentOrder);
        };
    },

    renderMatching(q) {
        const container = document.getElementById('quiz-matching-container');
        container.style.display = 'grid';
        const leftCol = document.getElementById('quiz-matching-left');
        const rightCol = document.getElementById('quiz-matching-right');
        leftCol.innerHTML = '';
        rightCol.innerHTML = '';

        let selectedLeftEl  = null;   // DOM element refs, not text
        let selectedRightEl = null;
        let matches = 0;
        const totalPairs = q.pairs.length;

        // Build maps: element → pair index so duplicates don't collide
        const leftElToPairIdx  = new Map();
        const rightElToPairIdx = new Map();

        // Shuffle right side keeping original pair indices for lookup
        const rightOrder = q.pairs.map((p, i) => ({ text: p[1], pairIdx: i }));
        this.shuffle(rightOrder);

        q.pairs.forEach((pair, pairIdx) => {
            const item = document.createElement('div');
            item.className = 'matching-item';
            item.textContent = pair[0];
            leftElToPairIdx.set(item, pairIdx);
            item.onclick = () => {
                if (item.classList.contains('matched')) return;
                // Deselect previous
                if (selectedLeftEl) selectedLeftEl.classList.remove('selected');
                item.classList.add('selected');
                selectedLeftEl = item;
                checkMatch();
            };
            leftCol.appendChild(item);
        });

        rightOrder.forEach(({ text, pairIdx }) => {
            const item = document.createElement('div');
            item.className = 'matching-item';
            item.textContent = text;
            rightElToPairIdx.set(item, pairIdx);
            item.onclick = () => {
                if (item.classList.contains('matched')) return;
                // Deselect previous
                if (selectedRightEl) selectedRightEl.classList.remove('selected');
                item.classList.add('selected');
                selectedRightEl = item;
                checkMatch();
            };
            rightCol.appendChild(item);
        });

        const checkMatch = () => {
            if (!selectedLeftEl || !selectedRightEl) return;
            const lIdx = leftElToPairIdx.get(selectedLeftEl);
            const rIdx = rightElToPairIdx.get(selectedRightEl);
            const isCorrect = lIdx === rIdx;
            if (isCorrect) {
                selectedLeftEl.classList.add('matched');
                selectedLeftEl.classList.remove('selected');
                selectedRightEl.classList.add('matched');
                selectedRightEl.classList.remove('selected');
                matches++;
                selectedLeftEl  = null;
                selectedRightEl = null;
                SoundSystem.play('correct');
                if (matches === totalPairs) {
                    setTimeout(() => this.answer(true), 500);
                }
            } else {
                SoundSystem.play('wrong');
                selectedLeftEl.classList.remove('selected');
                selectedRightEl.classList.remove('selected');
                selectedLeftEl  = null;
                selectedRightEl = null;
            }
        };
    },


    renderReadingPassage(q) {
        const container = document.getElementById('quiz-reading-container');
        container.style.display = 'block';
        const passageEl = document.getElementById('quiz-reading-passage');
        const subTitleEl = document.getElementById('quiz-reading-subtitle');
        const optionsEl = document.getElementById('quiz-reading-options');
        const subQuestions = q.questions || [];
        const subIndex = this.readingSubIndex;
        const totalSub = subQuestions.length;

        if (!passageEl) return;
        passageEl.textContent = q.passage || '';
        subTitleEl.textContent = totalSub ? `Pregunta ${subIndex + 1} de ${totalSub}` : '';
        optionsEl.innerHTML = '';

        if (subIndex >= totalSub) return;
        const sub = subQuestions[subIndex];
        const opts = sub.options || sub.o || [];
        const letters = ['A', 'B', 'C', 'D'];
        opts.forEach((opt, i) => {
            const btn = document.createElement('button');
            btn.className = 'option-btn';
            btn.innerHTML = `<span class="option-letter">${letters[i]}</span><span class="option-text">${opt}</span>`;
            btn.onclick = () => {
                this.readingAnswers[this.readingSubIndex] = i;
                this.readingSubIndex++;
                if (this.readingSubIndex >= totalSub) {
                    this.answer({ type: 'reading', subAnswers: [...this.readingAnswers] });
                    this.readingSubIndex = 0;
                    this.readingAnswers = [];
                } else {
                    this.renderQuestion();
                }
            };
            optionsEl.appendChild(btn);
        });
        const subQuestionText = document.getElementById('quiz-reading-question-text');
        if (subQuestionText) subQuestionText.textContent = sub.question || sub.q || '';
    },

    renderSentencePuzzle(q) {
        const container = document.getElementById('quiz-sentence-puzzle-container');
        container.style.display = 'flex';
        const tokensPool = document.getElementById('quiz-puzzle-tokens');
        const answerSlots = document.getElementById('quiz-puzzle-answer');
        const instructionEl = document.getElementById('quiz-puzzle-instruction');
        if (instructionEl) instructionEl.textContent = q.instruction || 'Build the correct sentence';
        tokensPool.innerHTML = '';
        answerSlots.innerHTML = '';

        let userOrder = [];
        const tokens = this.shuffle([...(q.tokens || [])]);
        tokens.forEach(word => {
            const token = document.createElement('div');
            token.className = 'order-token puzzle-token';
            token.textContent = word;
            token.onclick = () => {
                if (!token.classList.contains('used')) {
                    token.classList.add('used');
                    token.style.opacity = '0.3';
                    token.style.pointerEvents = 'none';
                    const slot = document.createElement('div');
                    slot.className = 'order-token puzzle-token';
                    slot.textContent = word;
                    slot.onclick = () => {
                        answerSlots.removeChild(slot);
                        token.classList.remove('used');
                        token.style.opacity = '1';
                        token.style.pointerEvents = 'auto';
                        const idx = userOrder.indexOf(word);
                        if (idx !== -1) userOrder.splice(idx, 1);
                    };
                    answerSlots.appendChild(slot);
                    userOrder.push(word);
                }
            };
            tokensPool.appendChild(token);
        });
        document.getElementById('quiz-puzzle-submit').onclick = () => this.answer(userOrder);
    },

    answer(userInput, clickEvent) {
        if (this.isAnswered) return;
        
        const q = this.questions[this.currentIndex];
        let correct = false;
        let correctAnswerText = '';

        // Handle validation based on type
        switch (q.type) {
            case 'multiple_choice':
                correct = userInput === (q.a !== undefined ? q.a : q.correct);
                const opts = q.o || q.options || [];
                correctAnswerText = opts[q.a !== undefined ? q.a : q.correct];
                break;
            case 'write':
                const normalized = (userInput || '').toString().toLowerCase().trim();
                const answers = q.answers || [];
                correct = answers.some(a => a.toLowerCase().trim() === normalized);
                correctAnswerText = answers[0];
                break;
            case 'order':
                correct = JSON.stringify(userInput) === JSON.stringify(q.correct);
                correctAnswerText = q.correct.join(' ');
                break;
            case 'matching':
                correct = userInput === true;
                correctAnswerText = '¡Todos emparejados!';
                break;
            case 'reading': {
                const subAnswers = (userInput && userInput.subAnswers) ? userInput.subAnswers : [];
                const subs = q.questions || [];
                let correctSubs = 0;
                subs.forEach((sub, i) => {
                    const right = sub.a !== undefined ? sub.a : sub.correct;
                    if (subAnswers[i] === right) correctSubs++;
                });
                correct = correctSubs === subs.length;
                correctAnswerText = correct ? '¡Todas correctas!' : `${correctSubs}/${subs.length} correctas`;
                // Store for XP: correctSubs and total subs
                q._readingCorrect = correctSubs;
                q._readingTotal = subs.length;
                break;
            }
            case 'sentence_puzzle': {
                const correctSeq = (q.correct || []).join(' ').trim();
                const userSeq = (Array.isArray(userInput) ? userInput : []).join(' ').trim();
                correct = userSeq === correctSeq;
                correctAnswerText = q.correct ? q.correct.join(' ') : '';
                break;
            }
        }

        this.isAnswered = true;
        Timer.stop();

        const isQuick = Timer.isQuick();

        // Track result for results screen
        this.questionResults.push({
            type: q.type || 'multiple_choice',
            correct,
            question: (q.q || q.question || q.title || '').slice(0, 60),
            correctAnswer: correctAnswerText
        });
        
        // Visual feedback for MC
        if (q.type === 'multiple_choice') {
            const buttons = document.querySelectorAll('.option-btn');
            buttons.forEach((btn, i) => {
                btn.disabled = true;
                if (i === (q.a !== undefined ? q.a : q.correct)) btn.classList.add('correct');
                if (i === userInput && !correct) btn.classList.add('incorrect');
            });
        }

        // Screen flash feedback
        const screen = document.getElementById('quiz-screen');
        if (screen) {
            screen.classList.remove('correct-flash', 'wrong-flash');
            void screen.offsetWidth;
            screen.classList.add(correct ? 'correct-flash' : 'wrong-flash');
        }

        // Shake the options container on wrong
        if (!correct) {
            const container = document.getElementById('quiz-question-container-inner');
            if (container) {
                container.classList.remove('shake');
                void container.offsetWidth;
                container.classList.add('shake');
                setTimeout(() => container.classList.remove('shake'), 500);
            }
        }

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
            
            let xpGained;
            if (q.type === 'reading' && q._readingTotal) {
                const correctSubs = q._readingCorrect || 0;
                xpGained = 15 * correctSubs + (correctSubs === q._readingTotal ? 10 : 0);
            } else if (q.type === 'sentence_puzzle') {
                xpGained = isQuick ? 20 + 10 : 20;
            } else {
                const xpByTypes = {
                    'multiple_choice': 10,
                    'write': 15,
                    'order': 20,
                    'matching': 20
                };
                const baseXP = xpByTypes[q.type] || 10;
                xpGained = isQuick ? baseXP + 5 : baseXP;
            }
            
            feedbackExpl.textContent = q.hint ? `💡 ${q.hint}` : '¡Sigue así!';

            ScoreSystem.addCorrect(isQuick);
            const newLevel = XPSystem.addXP(xpGained);
            this.correctCount++;
            this.currentStreak++;
            if (isQuick) this.fastStreak++;
            else this.fastStreak = 0;

            SoundSystem.play('correct');

            // XP float from click position
            if (clickEvent && clickEvent.clientX) {
                App.showXPFloat(clickEvent.clientX, clickEvent.clientY, `+${xpGained} XP`);
            } else {
                App.showXPPopup(`+${xpGained} XP`);
            }

            // Confetti on correct
            if (typeof launchConfetti === 'function') launchConfetti();

            // Combo banner
            if (this.currentStreak >= 3 && this.currentStreak % 3 === 0) {
                App.showComboBanner(this.currentStreak);
            }

            // Streak fire effect
            const streakEl = document.getElementById('quiz-streak');
            if (streakEl) {
                streakEl.classList.toggle('on-fire', this.currentStreak >= 5);
            }

            if (newLevel) setTimeout(() => App.showLevelUp(newLevel), 800);
        } else {
            feedback.className = 'quiz-feedback show incorrect';
            feedbackIcon.textContent = '❌';
            feedbackText.textContent = (userInput === -1 || userInput === '') ? '⏰ ¡Se acabó el tiempo!' : '¡Incorrecto!';
            feedbackExpl.textContent = `La respuesta correcta era: ${correctAnswerText}`;
            if (q.hint) feedbackExpl.textContent += `\n💡 ${q.hint}`;

            this.incorrectCount++;
            this.currentStreak = 0;
            this.fastStreak = 0;
            SoundSystem.play('wrong');
            // Partial XP for reading (15 per correct sub-question)
            if (q.type === 'reading' && q._readingCorrect > 0) {
                const partialXP = 15 * q._readingCorrect;
                XPSystem.addXP(partialXP);
                App.showXPPopup(`+${partialXP} XP`);
            }
        }

        Progress.data.totalQuestions++;
        if (correct) {
            Progress.data.correctAnswers++;
            Progress.updateStreak();
            if (q.type === 'multiple_choice' || q.type === 'write') {
                Progress.incrementWordsLearned();
            }
        }
        Progress.incrementDailyActivity();

        if (this.currentStreak > Progress.data.bestStreak)
            Progress.data.bestStreak = this.currentStreak;
        if (this.fastStreak > Progress.data.bestFastStreak)
            Progress.data.bestFastStreak = this.fastStreak;
            
        this.updateStreakDisplay();
        Progress.save();
    },

    updateStreakDisplay() {
        const el = document.getElementById('quiz-streak');
        if (el) el.textContent = '🔥 ' + this.currentStreak;
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
        
        // Save overall progress data before calculating results
        Progress.data.quizzesCompleted++;
        if (accuracy === 100) Progress.data.perfectQuizzes++;
        
        // Mark course as completed if passed (60%)
        if (accuracy >= 60) {
            if (!Progress.data.completedCourses.includes(this.currentCourseId)) {
                Progress.data.completedCourses.push(this.currentCourseId);
                Progress.data.coursesCompleted++;
                
                // NEW: Check if this completes the level
                if (typeof App !== 'undefined' && App.coursesData) {
                    Progress.checkLevelCompletion(this.currentLevelId, App.coursesData);
                }
            }
        }

        // Check for achievements
        const newlyUnlocked = Achievements.check(Progress.data);
        if (newlyUnlocked.length > 0) {
            Progress.data.unlockedAchievements = Achievements.unlocked;
            newlyUnlocked.forEach(ach => {
                App.showToast('🏆 Logro!', ach.name);
            });
        }
        
        Progress.save();
        
        App.showQuizResults(this.correctCount, this.questions.length, accuracy);
    }
};

