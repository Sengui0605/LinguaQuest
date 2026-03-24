/* ============================================
   LinguaQuest — Quiz Builder
   Create, edit, save and play custom quizzes
   ============================================ */

const QuizBuilder = {

  // ── State ──
  currentQuiz: null,      // quiz being edited
  myQuizzes: [],          // loaded from Firestore
  editingQIndex: -1,      // which question is open in the editor (-1 = none)
  view: 'list',           // 'list' | 'editor'

  LEVELS: [
    { id: 'basic',        name: 'Básico' },
    { id: 'intermediate', name: 'Intermedio' },
    { id: 'advanced',     name: 'Avanzado' },
  ],

  TOPICS: [
    'Gramática', 'Vocabulario', 'Pronunciación',
    'Comprensión lectora', 'Verbos', 'Tiempos verbales',
    'Preposiciones', 'Artículos', 'Conectores', 'Otro',
  ],

  Q_TYPES: [
    { id: 'multiple_choice', label: 'Opción múltiple',    icon: '🔘' },
    { id: 'write',           label: 'Escritura libre',    icon: '✍️' },
    { id: 'order',           label: 'Ordenar palabras',   icon: '🔀' },
    { id: 'matching',        label: 'Emparejar',          icon: '🔗' },
    { id: 'sentence_puzzle', label: 'Puzzle de oración',  icon: '🧩' },
    { id: 'reading',         label: 'Comprensión',        icon: '📖' },
  ],

  // ── Init ──
  async init() {
    await this.loadMyQuizzes();
    this.showView('list');
  },

  // ── Firestore ──
  async loadMyQuizzes() {
    if (!window.FirebaseDB || !Progress.data.licenseKey) return;
    const { db, collection, query, where, getDocs } = window.FirebaseDB;
    try {
      const q = query(
        collection(db, 'custom_quizzes'),
        where('teacherKey', '==', Progress.data.licenseKey)
      );
      const snap = await getDocs(q);
      this.myQuizzes = [];
      snap.forEach(d => this.myQuizzes.push({ id: d.id, ...d.data() }));
      this.myQuizzes.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    } catch (e) {
      console.warn('QuizBuilder: load error', e);
    }
  },

  async saveToFirestore() {
    if (!window.FirebaseDB || !this.currentQuiz) return false;
    const { db, doc, setDoc } = window.FirebaseDB;
    try {
      this.currentQuiz.teacherKey     = Progress.data.licenseKey;
      this.currentQuiz.updatedAt      = new Date().toISOString().split('T')[0];
      this.currentQuiz.questionCount  = this.currentQuiz.questions.length;
      if (!this.currentQuiz.createdAt) {
        this.currentQuiz.createdAt = this.currentQuiz.updatedAt;
      }
      await setDoc(doc(db, 'custom_quizzes', this.currentQuiz.id), this.currentQuiz);
      return true;
    } catch (e) {
      console.error('QuizBuilder: save error', e);
      return false;
    }
  },

  async deleteFromFirestore(quizId) {
    if (!window.FirebaseDB) return;
    const { db, doc, deleteDoc } = window.FirebaseDB;
    await deleteDoc(doc(db, 'custom_quizzes', quizId));
  },

  // Load quizzes for a student (by their teacher's key)
  async loadStudentQuizzes() {
    if (!window.FirebaseDB || !Progress.data.teacherKey) return [];
    const { db, collection, query, where, getDocs } = window.FirebaseDB;
    try {
      const q = query(
        collection(db, 'custom_quizzes'),
        where('teacherKey', '==', Progress.data.teacherKey),
        where('isPublished', '==', true)
      );
      const snap = await getDocs(q);
      const quizzes = [];
      snap.forEach(d => quizzes.push({ id: d.id, ...d.data() }));
      return quizzes;
    } catch (e) { return []; }
  },

  // ── View switching ──
  showView(view) {
    this.view = view;
    const listEl   = document.getElementById('qb-list-view');
    const editorEl = document.getElementById('qb-editor-view');
    if (!listEl || !editorEl) return;
    listEl.style.display   = view === 'list'   ? 'block' : 'none';
    editorEl.style.display = view === 'editor' ? 'block' : 'none';

    if (view === 'list')   this.renderList();
    if (view === 'editor') this.renderEditor();
  },

  // ── Quiz list ──
  renderList() {
    const container = document.getElementById('qb-quizzes-list');
    if (!container) return;

    if (!this.myQuizzes.length) {
      container.innerHTML = `
        <div class="qb-empty">
          <div class="qb-empty-icon">📝</div>
          <p>Aún no tienes quizzes personalizados.</p>
          <p>¡Crea tu primer quiz de inglés!</p>
        </div>`;
      return;
    }

    container.innerHTML = this.myQuizzes.map(quiz => `
      <div class="qb-quiz-card" data-id="${quiz.id}">
        <div class="qb-quiz-card-body">
          <div class="qb-quiz-title">${this._esc(quiz.title || 'Sin título')}</div>
          <div class="qb-quiz-meta">
            <span class="qb-badge">${this._levelName(quiz.level)}</span>
            <span class="qb-badge qb-badge-blue">${this._esc(quiz.topic || 'General')}</span>
            <span>${quiz.questionCount || 0} preguntas</span>
            ${quiz.isPublished ? '<span class="qb-badge qb-badge-green">Publicado</span>' : '<span class="qb-badge qb-badge-gray">Borrador</span>'}
          </div>
        </div>
        <div class="qb-quiz-card-actions">
          <button class="qb-btn qb-btn-sm" onclick="QuizBuilder.playQuiz('${quiz.id}')">▶ Jugar</button>
          <button class="qb-btn qb-btn-sm qb-btn-secondary" onclick="QuizBuilder.editQuiz('${quiz.id}')">✏️ Editar</button>
          <button class="qb-btn qb-btn-sm qb-btn-danger" onclick="QuizBuilder.confirmDelete('${quiz.id}')">🗑️</button>
        </div>
      </div>
    `).join('');
  },

  // ── Quiz CRUD ──
  newQuiz() {
    this.currentQuiz = {
      id:          'quiz_' + Date.now(),
      title:       '',
      description: '',
      level:       'basic',
      topic:       'Gramática',
      isPublished: false,
      questions:   [],
      teacherKey:  Progress.data.licenseKey || '',
      createdAt:   null,
    };
    this.editingQIndex = -1;
    this.showView('editor');
  },

  editQuiz(quizId) {
    const quiz = this.myQuizzes.find(q => q.id === quizId);
    if (!quiz) return;
    this.currentQuiz = JSON.parse(JSON.stringify(quiz)); // deep clone
    this.editingQIndex = -1;
    this.showView('editor');
  },

  async confirmDelete(quizId) {
    const quiz = this.myQuizzes.find(q => q.id === quizId);
    const title = quiz ? quiz.title : quizId;
    App.showModal('¿Eliminar quiz?', `Se eliminará "${title}" permanentemente.`, async () => {
      try {
        await this.deleteFromFirestore(quizId);
        this.myQuizzes = this.myQuizzes.filter(q => q.id !== quizId);
        this.renderList();
        App.showToast('🗑️', 'Quiz eliminado');
      } catch (e) {
        App.showToast('❌', 'Error al eliminar');
      }
    });
  },

  // ── Quiz editor ──
  renderEditor() {
    if (!this.currentQuiz) return;
    const q = this.currentQuiz;

    // Fill metadata fields
    const tf = id => document.getElementById(id);
    if (tf('qb-title'))    tf('qb-title').value    = q.title       || '';
    if (tf('qb-desc'))     tf('qb-desc').value     = q.description || '';
    if (tf('qb-level'))    tf('qb-level').value    = q.level       || 'basic';
    if (tf('qb-topic'))    tf('qb-topic').value    = q.topic       || 'Gramática';
    if (tf('qb-publish'))  tf('qb-publish').checked = !!q.isPublished;

    this.renderQuestionsList();
    this.closeQuestionEditor();
  },

  renderQuestionsList() {
    const container = document.getElementById('qb-questions-list');
    if (!container || !this.currentQuiz) return;

    if (!this.currentQuiz.questions.length) {
      container.innerHTML = `<div class="qb-no-questions">Aún no hay preguntas. ¡Añade la primera!</div>`;
      return;
    }

    container.innerHTML = this.currentQuiz.questions.map((q, i) => `
      <div class="qb-question-row ${this.editingQIndex === i ? 'active' : ''}" data-index="${i}">
        <div class="qb-question-row-left">
          <span class="qb-q-num">${i + 1}</span>
          <span class="qb-q-type-badge">${this._typeIcon(q.type)}</span>
          <span class="qb-q-preview">${this._esc(this._qPreview(q))}</span>
        </div>
        <div class="qb-question-row-actions">
          ${i > 0 ? `<button class="qb-icon-btn" onclick="QuizBuilder.moveQuestion(${i},-1)" title="Subir">↑</button>` : ''}
          ${i < this.currentQuiz.questions.length-1 ? `<button class="qb-icon-btn" onclick="QuizBuilder.moveQuestion(${i},1)" title="Bajar">↓</button>` : ''}
          <button class="qb-icon-btn" onclick="QuizBuilder.openQuestionEditor(${i})" title="Editar">✏️</button>
          <button class="qb-icon-btn qb-icon-danger" onclick="QuizBuilder.deleteQuestion(${i})" title="Eliminar">✕</button>
        </div>
      </div>
    `).join('');
  },

  // ── Question editor ──
  openQuestionEditor(index) {
    this.editingQIndex = index;
    const q = index === -1
      ? { type: 'multiple_choice' }
      : JSON.parse(JSON.stringify(this.currentQuiz.questions[index]));

    const panel = document.getElementById('qb-question-editor');
    if (!panel) return;
    panel.style.display = 'block';

    // Title
    const titleEl = document.getElementById('qb-editor-title');
    if (titleEl) titleEl.textContent = index === -1 ? 'Nueva Pregunta' : `Pregunta ${index + 1}`;

    // Type selector
    const typeEl = document.getElementById('qb-q-type');
    if (typeEl) {
      typeEl.value = q.type || 'multiple_choice';
      typeEl.onchange = () => this._renderQuestionForm(typeEl.value, q);
    }

    this._renderQuestionForm(q.type || 'multiple_choice', q);
    this.renderQuestionsList();

    // Scroll to editor
    panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  },

  openNewQuestion() {
    this.openQuestionEditor(-1);
  },

  closeQuestionEditor() {
    const panel = document.getElementById('qb-question-editor');
    if (panel) panel.style.display = 'none';
    this.editingQIndex = -1;
    this.renderQuestionsList();
  },

  _renderQuestionForm(type, existingQ = {}) {
    const body = document.getElementById('qb-form-body');
    if (!body) return;

    const q = { type, ...existingQ };
    let html = '';

    switch (type) {
      case 'multiple_choice':
        html = this._formMC(q); break;
      case 'write':
        html = this._formWrite(q); break;
      case 'order':
        html = this._formOrder(q); break;
      case 'matching':
        html = this._formMatching(q); break;
      case 'sentence_puzzle':
        html = this._formPuzzle(q); break;
      case 'reading':
        html = this._formReading(q); break;
    }

    body.innerHTML = html;
    this._attachFormListeners(type);
  },

  // ── Form renderers ──
  _formMC(q) {
    const opts = q.o || q.options || ['', '', '', ''];
    const correct = q.a !== undefined ? q.a : 0;
    return `
      <div class="qb-field">
        <label class="qb-label">Pregunta</label>
        <input id="qf-question" class="qb-input" placeholder="Ej: She ___ happy." value="${this._esc(q.q || q.question || '')}"/>
      </div>
      <div class="qb-field">
        <label class="qb-label">Opciones (marca la correcta)</label>
        ${['A','B','C','D'].map((letter, i) => `
          <div class="qb-option-row">
            <input type="radio" name="qf-correct" value="${i}" ${correct === i ? 'checked' : ''} id="qf-r${i}"/>
            <label for="qf-r${i}" class="qb-option-letter">${letter}</label>
            <input class="qb-input qf-opt" placeholder="Opción ${letter}" value="${this._esc(opts[i] || '')}"/>
          </div>
        `).join('')}
      </div>
      <div class="qb-field">
        <label class="qb-label">Pista (opcional)</label>
        <input id="qf-hint" class="qb-input" placeholder="Ej: Use 'is' with she/he/it" value="${this._esc(q.hint || '')}"/>
      </div>`;
  },

  _formWrite(q) {
    const answers = q.answers || [''];
    return `
      <div class="qb-field">
        <label class="qb-label">Pregunta</label>
        <input id="qf-question" class="qb-input" placeholder="Ej: Translate 'perro' to English" value="${this._esc(q.question || q.q || '')}"/>
      </div>
      <div class="qb-field">
        <label class="qb-label">Respuestas aceptadas <span class="qb-hint-text">(añade variantes correctas)</span></label>
        <div id="qf-answers-list">
          ${answers.map((a, i) => `
            <div class="qb-answer-row" data-ai="${i}">
              <input class="qb-input qf-answer" placeholder="Respuesta ${i+1}" value="${this._esc(a)}"/>
              ${i > 0 ? `<button class="qb-icon-btn qb-icon-danger" onclick="QuizBuilder._removeAnswerRow(${i})">✕</button>` : ''}
            </div>`).join('')}
        </div>
        <button class="qb-btn qb-btn-sm qb-btn-ghost" onclick="QuizBuilder._addAnswerRow()">+ Añadir variante</button>
      </div>
      <div class="qb-field">
        <label class="qb-label">Pista (opcional)</label>
        <input id="qf-hint" class="qb-input" value="${this._esc(q.hint || '')}"/>
      </div>`;
  },

  _formOrder(q) {
    const words = (q.words || []).join(', ');
    const correct = (q.correct || []).join(', ');
    return `
      <div class="qb-field">
        <label class="qb-label">Instrucción</label>
        <input id="qf-question" class="qb-input" placeholder="Ej: Ordena la oración:" value="${this._esc(q.question || q.q || 'Ordena la oración:')}"/>
      </div>
      <div class="qb-field">
        <label class="qb-label">Palabras (separadas por coma)</label>
        <input id="qf-words" class="qb-input" placeholder="Ej: am, student, I, a" value="${this._esc(words)}"/>
      </div>
      <div class="qb-field">
        <label class="qb-label">Orden correcto (separado por coma)</label>
        <input id="qf-correct" class="qb-input" placeholder="Ej: I, am, a, student" value="${this._esc(correct)}"/>
      </div>
      <div class="qb-field">
        <label class="qb-label">Pista (opcional)</label>
        <input id="qf-hint" class="qb-input" value="${this._esc(q.hint || '')}"/>
      </div>`;
  },

  _formMatching(q) {
    const pairs = q.pairs || [['', ''], ['', ''], ['', '']];
    return `
      <div class="qb-field">
        <label class="qb-label">Instrucción</label>
        <input id="qf-question" class="qb-input" placeholder="Ej: Empareja las palabras con su traducción" value="${this._esc(q.question || q.q || 'Empareja los pares:')}"/>
      </div>
      <div class="qb-field">
        <label class="qb-label">Pares (izquierda → derecha)</label>
        <div id="qf-pairs-list">
          ${pairs.map((pair, i) => `
            <div class="qb-pair-row" data-pi="${i}">
              <input class="qb-input qf-pair-left" placeholder="Izquierda" value="${this._esc(pair[0] || '')}"/>
              <span class="qb-arrow">→</span>
              <input class="qb-input qf-pair-right" placeholder="Derecha" value="${this._esc(pair[1] || '')}"/>
              ${i >= 2 ? `<button class="qb-icon-btn qb-icon-danger" onclick="QuizBuilder._removePairRow(${i})">✕</button>` : ''}
            </div>`).join('')}
        </div>
        <button class="qb-btn qb-btn-sm qb-btn-ghost" onclick="QuizBuilder._addPairRow()">+ Añadir par</button>
      </div>`;
  },

  _formPuzzle(q) {
    const tokens = (q.tokens || []).join(', ');
    const correct = (q.correct || []).join(', ');
    return `
      <div class="qb-field">
        <label class="qb-label">Instrucción</label>
        <input id="qf-question" class="qb-input" placeholder="Ej: Build the correct sentence" value="${this._esc(q.instruction || q.q || 'Build the correct sentence')}"/>
      </div>
      <div class="qb-field">
        <label class="qb-label">Fichas disponibles (separadas por coma)</label>
        <input id="qf-tokens" class="qb-input" placeholder="Ej: She, is, happy, sad, not" value="${this._esc(tokens)}"/>
        <div class="qb-hint-text">Incluye algunas palabras incorrectas como distractores.</div>
      </div>
      <div class="qb-field">
        <label class="qb-label">Orden correcto (separado por coma)</label>
        <input id="qf-correct" class="qb-input" placeholder="Ej: She, is, happy" value="${this._esc(correct)}"/>
      </div>
      <div class="qb-field">
        <label class="qb-label">Pista (opcional)</label>
        <input id="qf-hint" class="qb-input" value="${this._esc(q.hint || '')}"/>
      </div>`;
  },

  _formReading(q) {
    const subQs = q.questions || [{ question: '', options: ['','','',''], a: 0 }];
    return `
      <div class="qb-field">
        <label class="qb-label">Título del texto</label>
        <input id="qf-title" class="qb-input" placeholder="Ej: A Day in London" value="${this._esc(q.title || '')}"/>
      </div>
      <div class="qb-field">
        <label class="qb-label">Pasaje de lectura</label>
        <textarea id="qf-passage" class="qb-textarea" rows="5" placeholder="Escribe el texto en inglés aquí...">${this._esc(q.passage || '')}</textarea>
      </div>
      <div class="qb-field">
        <label class="qb-label">Preguntas de comprensión</label>
        <div id="qf-subqs-list">
          ${subQs.map((sq, si) => this._subQForm(sq, si)).join('')}
        </div>
        <button class="qb-btn qb-btn-sm qb-btn-ghost" onclick="QuizBuilder._addSubQ()">+ Añadir pregunta</button>
      </div>`;
  },

  _subQForm(sq, si) {
    const opts = sq.options || sq.o || ['','','',''];
    const correct = sq.a !== undefined ? sq.a : 0;
    return `
      <div class="qb-subq-block" data-si="${si}">
        <div class="qb-subq-header">
          <span>Pregunta ${si+1}</span>
          ${si > 0 ? `<button class="qb-icon-btn qb-icon-danger" onclick="QuizBuilder._removeSubQ(${si})">✕</button>` : ''}
        </div>
        <input class="qb-input qf-subq-q" placeholder="¿Dónde está Tom?" value="${this._esc(sq.question || sq.q || '')}"/>
        ${['A','B','C','D'].map((letter, oi) => `
          <div class="qb-option-row">
            <input type="radio" name="sqcorrect_${si}" value="${oi}" ${correct===oi?'checked':''} id="sqr_${si}_${oi}"/>
            <label for="sqr_${si}_${oi}" class="qb-option-letter">${letter}</label>
            <input class="qb-input qf-subq-opt" data-si="${si}" placeholder="Opción ${letter}" value="${this._esc(opts[oi]||'')}"/>
          </div>`).join('')}
      </div>`;
  },

  // ── Dynamic form helpers ──
  _addAnswerRow() {
    const list = document.getElementById('qf-answers-list');
    if (!list) return;
    const i = list.children.length;
    const row = document.createElement('div');
    row.className = 'qb-answer-row'; row.dataset.ai = i;
    row.innerHTML = `<input class="qb-input qf-answer" placeholder="Respuesta ${i+1}"/><button class="qb-icon-btn qb-icon-danger" onclick="QuizBuilder._removeAnswerRow(${i})">✕</button>`;
    list.appendChild(row);
  },
  _removeAnswerRow(i) {
    const row = document.querySelector(`[data-ai="${i}"]`);
    if (row) row.remove();
  },

  _addPairRow() {
    const list = document.getElementById('qf-pairs-list');
    if (!list) return;
    const i = list.children.length;
    const row = document.createElement('div');
    row.className = 'qb-pair-row'; row.dataset.pi = i;
    row.innerHTML = `<input class="qb-input qf-pair-left" placeholder="Izquierda"/><span class="qb-arrow">→</span><input class="qb-input qf-pair-right" placeholder="Derecha"/><button class="qb-icon-btn qb-icon-danger" onclick="QuizBuilder._removePairRow(${i})">✕</button>`;
    list.appendChild(row);
  },
  _removePairRow(i) {
    const row = document.querySelector(`[data-pi="${i}"]`);
    if (row) row.remove();
  },

  _addSubQ() {
    const list = document.getElementById('qf-subqs-list');
    if (!list) return;
    const si = list.children.length;
    const el = document.createElement('div');
    el.innerHTML = this._subQForm({ question:'', options:['','','',''], a:0 }, si);
    list.appendChild(el.firstElementChild);
  },
  _removeSubQ(si) {
    const el = document.querySelector(`[data-si="${si}"]`);
    if (el) el.remove();
  },

  _attachFormListeners(type) {
    // Live preview on inputs — nothing special needed, saveQuestion reads DOM directly
  },

  // ── Save question from form ──
  saveQuestion() {
    const type = document.getElementById('qb-q-type')?.value || 'multiple_choice';
    let q = { type };

    try {
      switch (type) {
        case 'multiple_choice': {
          const opts = [...document.querySelectorAll('.qf-opt')].map(i => i.value.trim());
          const correct = parseInt(document.querySelector('input[name="qf-correct"]:checked')?.value ?? '0');
          q = { type, q: document.getElementById('qf-question')?.value.trim() || '', o: opts, a: correct, hint: document.getElementById('qf-hint')?.value.trim() || '' };
          if (!q.q) { App.showToast('⚠️','Escribe la pregunta'); return; }
          if (opts.some(o => !o)) { App.showToast('⚠️','Completa todas las opciones'); return; }
          break;
        }
        case 'write': {
          const answers = [...document.querySelectorAll('.qf-answer')].map(i=>i.value.trim()).filter(Boolean);
          q = { type, question: document.getElementById('qf-question')?.value.trim()||'', answers, hint: document.getElementById('qf-hint')?.value.trim()||'' };
          if (!q.question || !answers.length) { App.showToast('⚠️','Completa la pregunta y al menos una respuesta'); return; }
          break;
        }
        case 'order': {
          const words   = (document.getElementById('qf-words')?.value||'').split(',').map(w=>w.trim()).filter(Boolean);
          const correct = (document.getElementById('qf-correct')?.value||'').split(',').map(w=>w.trim()).filter(Boolean);
          q = { type, question: document.getElementById('qf-question')?.value.trim()||'', words, correct, hint: document.getElementById('qf-hint')?.value.trim()||'' };
          if (!words.length || !correct.length) { App.showToast('⚠️','Añade las palabras y el orden correcto'); return; }
          break;
        }
        case 'matching': {
          const lefts  = [...document.querySelectorAll('.qf-pair-left')].map(i=>i.value.trim());
          const rights = [...document.querySelectorAll('.qf-pair-right')].map(i=>i.value.trim());
          const pairs  = lefts.map((l,i)=>[l, rights[i]]).filter(p=>p[0]&&p[1]);
          q = { type, question: document.getElementById('qf-question')?.value.trim()||'', pairs };
          if (pairs.length < 2) { App.showToast('⚠️','Añade al menos 2 pares'); return; }
          break;
        }
        case 'sentence_puzzle': {
          const tokens  = (document.getElementById('qf-tokens')?.value||'').split(',').map(t=>t.trim()).filter(Boolean);
          const correct = (document.getElementById('qf-correct')?.value||'').split(',').map(t=>t.trim()).filter(Boolean);
          q = { type, instruction: document.getElementById('qf-question')?.value.trim()||'', tokens, correct, hint: document.getElementById('qf-hint')?.value.trim()||'' };
          if (!tokens.length || !correct.length) { App.showToast('⚠️','Añade las fichas y el orden correcto'); return; }
          break;
        }
        case 'reading': {
          const passage = document.getElementById('qf-passage')?.value.trim()||'';
          const title   = document.getElementById('qf-title')?.value.trim()||'Reading';
          const subQsBlocks = document.querySelectorAll('.qb-subq-block');
          const questions = [...subQsBlocks].map((block, si) => {
            const qText = block.querySelector('.qf-subq-q')?.value.trim()||'';
            const opts  = [...block.querySelectorAll('.qf-subq-opt')].map(i=>i.value.trim());
            const correct = parseInt(block.querySelector(`input[name="sqcorrect_${si}"]:checked`)?.value??'0');
            return { question: qText, options: opts, a: correct };
          });
          q = { type, title, passage, questions };
          if (!passage || !questions.length) { App.showToast('⚠️','Añade el texto y las preguntas'); return; }
          break;
        }
      }
    } catch (e) {
      App.showToast('❌', 'Error al guardar pregunta');
      return;
    }

    if (this.editingQIndex === -1) {
      this.currentQuiz.questions.push(q);
    } else {
      this.currentQuiz.questions[this.editingQIndex] = q;
    }

    this.closeQuestionEditor();
    App.showToast('✅', this.editingQIndex === -1 ? 'Pregunta añadida' : 'Pregunta actualizada');
  },

  deleteQuestion(index) {
    this.currentQuiz.questions.splice(index, 1);
    if (this.editingQIndex === index) this.closeQuestionEditor();
    else this.renderQuestionsList();
  },

  moveQuestion(index, dir) {
    const qs = this.currentQuiz.questions;
    const newIndex = index + dir;
    if (newIndex < 0 || newIndex >= qs.length) return;
    [qs[index], qs[newIndex]] = [qs[newIndex], qs[index]];
    if (this.editingQIndex === index) this.editingQIndex = newIndex;
    this.renderQuestionsList();
  },

  // ── Save quiz ──
  async saveQuiz() {
    if (!this.currentQuiz) return;

    // Read metadata from form
    this.currentQuiz.title       = document.getElementById('qb-title')?.value.trim()  || 'Sin título';
    this.currentQuiz.description = document.getElementById('qb-desc')?.value.trim()   || '';
    this.currentQuiz.level       = document.getElementById('qb-level')?.value         || 'basic';
    this.currentQuiz.topic       = document.getElementById('qb-topic')?.value         || 'Gramática';
    this.currentQuiz.isPublished = document.getElementById('qb-publish')?.checked     ?? false;

    if (!this.currentQuiz.questions.length) {
      App.showToast('⚠️', 'Añade al menos una pregunta');
      return;
    }

    const btn = document.getElementById('qb-save-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Guardando…'; }

    const ok = await this.saveToFirestore();

    if (btn) { btn.disabled = false; btn.textContent = '💾 Guardar'; }

    if (ok) {
      // Update local list
      const existing = this.myQuizzes.findIndex(q => q.id === this.currentQuiz.id);
      if (existing >= 0) this.myQuizzes[existing] = { ...this.currentQuiz };
      else this.myQuizzes.unshift({ ...this.currentQuiz });

      App.showToast('✅', 'Quiz guardado' + (this.currentQuiz.isPublished ? ' y publicado' : ''));
    } else {
      App.showToast('❌', 'Error al guardar. Revisa tu conexión.');
    }
  },

  backToList() {
    this.currentQuiz = null;
    this.editingQIndex = -1;
    this.showView('list');
  },

  // ── Play quiz ──
  playQuiz(quizId) {
    const quiz = this.myQuizzes.find(q => q.id === quizId);
    if (!quiz || !quiz.questions || !quiz.questions.length) {
      App.showToast('⚠️', 'Este quiz no tiene preguntas');
      return;
    }
    QuizEngine.startCustom(quiz.questions, quiz.title || 'Quiz Personalizado');
  },

  // ── Student quiz list ──
  async renderStudentQuizzes(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '<p class="analytics-no-data">Cargando quizzes...</p>';

    const quizzes = await this.loadStudentQuizzes();
    if (!quizzes.length) {
      container.innerHTML = '<p class="analytics-no-data">Tu profesor aún no ha publicado quizzes.</p>';
      return;
    }

    container.innerHTML = quizzes.map(quiz => `
      <div class="qb-quiz-card">
        <div class="qb-quiz-card-body">
          <div class="qb-quiz-title">${this._esc(quiz.title||'Quiz')}</div>
          <div class="qb-quiz-meta">
            <span class="qb-badge">${this._levelName(quiz.level)}</span>
            <span>${quiz.questionCount||0} preguntas</span>
          </div>
        </div>
        <div class="qb-quiz-card-actions">
          <button class="qb-btn" onclick="QuizBuilder._playStudentQuiz(${JSON.stringify(quiz).replace(/"/g,'&quot;')})">▶ Jugar</button>
        </div>
      </div>
    `).join('');
  },

  _playStudentQuiz(quiz) {
    if (!quiz.questions || !quiz.questions.length) {
      App.showToast('⚠️', 'Quiz sin preguntas');
      return;
    }
    QuizEngine.startCustom(quiz.questions, quiz.title || 'Quiz');
  },

  // ── Helpers ──
  _esc(str) {
    if (!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  },

  _levelName(id) {
    const l = this.LEVELS.find(l => l.id === id);
    return l ? l.name : id || 'Básico';
  },

  _typeIcon(type) {
    const t = this.Q_TYPES.find(t => t.id === type);
    return t ? t.icon : '❓';
  },

  _qPreview(q) {
    const text = q.q || q.question || q.title || q.instruction || 'Sin texto';
    return text.length > 55 ? text.slice(0, 55) + '…' : text;
  },

  // ── Type button selector ──
  _selectType(type, btn) {
    document.querySelectorAll('.qb-type-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    const sel = document.getElementById('qb-q-type');
    if (sel) sel.value = type;
    this._renderQuestionForm(type, { type });
  },
};
