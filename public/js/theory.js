/**
 * Theory Module - Handles the comprehensive theory menu
 */
const Theory = {
    data: [],
    filteredData: [],
    currentCategory: 'all',
    searchQuery: '',

    init() {
        console.log("💡 Theory Module Initialized");
        this.loadData();
    },

    async loadData() {
        try {
            const response = await fetch('data/theory.json');
            this.data = await response.json();
            this.filteredData = [...this.data];
            this.renderList();
        } catch (error) {
            console.error("Error loading theory data:", error);
        }
    },

    renderList() {
        const listContainer = document.getElementById('theory-list');
        if (!listContainer) return;

        listContainer.innerHTML = '';

        // Render all topics (no filtering needed as requested)
        this.data.forEach(topic => {
            const card = document.createElement('div');
            card.className = 'theory-card';

            const icon = this.getTopicIcon(topic.id);

            card.innerHTML = `
                <div class="theory-card-icon">${icon}</div>
                <div class="theory-card-title">${topic.title}</div>
                <div class="theory-card-tag tag-${topic.level}">${topic.level.toUpperCase()}</div>
            `;

            card.onclick = () => this.showTopic(topic.id);
            listContainer.appendChild(card);
        });
    },

    getTopicIcon(id) {
        const icons = {
            'to-be': '📝',
            'pronouns': '👥',
            'present-simple': '⏰',
            'articles': '📰',
            'prepositions': '📍',
            'greetings': '👋',
            'numbers-days': '🔢',
            'wh-questions': '❓',
            'adjectives-basic': '🎨',
            'demonstratives': '👆',
            'present-continuous': '🔄',
            'past-simple': '⏪',
            'comparatives': '⚖️',
            'superlatives': '🏆',
            'modals': '🔑',
            'phrasal-verbs': '🧩',
            'future-will': '🔮',
            'present-perfect': '✨',
            'conditionals': '🔮',
            'passive-voice': '🔄',
            'reported-speech': '💬',
            'idioms': '🗣️'
        };
        return icons[id] || '📖';
    },

    showTopic(id) {
        const topic = this.data.find(t => t.id === id);
        if (!topic) return;

        const articleContainer = document.getElementById('theory-article');
        const listView = document.getElementById('theory-list-container');
        const contentView = document.getElementById('theory-content-view');

        // Parse main content
        let htmlContent = this.parseMarkdown(topic.content);

        // Handle specialized sections from content
        // Wrap 📖 Lectura de ejemplo sections
        htmlContent = htmlContent.replace(/<h3>📖 (.*?)<\/h3>([\s\S]*?)(?=<h3>|$)/g, (match, title, content) => {
            return `<div class="reading-box">${content}</div>`;
        });

        // Wrap 💡 Consejos sections
        htmlContent = htmlContent.replace(/<h3>💡 (.*?)<\/h3>([\s\S]*?)(?=<h3>|$)/g, (match, title, content) => {
            return `
                <div class="tip-box-premium">
                    <div class="tip-icon">💡</div>
                    <div class="tip-text"><strong>${title}:</strong>${content}</div>
                </div>`;
        });

        let examplesHtml = '';
        if (topic.examples && topic.examples.length > 0) {
            examplesHtml = '<h3>Ejemplos:</h3><div class="example-box">';
            topic.examples.forEach(ex => {
                const parts = ex.split(' (');
                const main = parts[0];
                const trans = parts[1] ? parts[1].replace(')', '') : '';

                // Parse markdown in examples too (like **bold**)
                const parsedMain = this.parseMarkdown(main);

                examplesHtml += `
                    <div class="example-item">
                        <div class="example-text">${parsedMain}</div>
                        <div class="example-translation">${trans}</div>
                    </div>
                `;
            });
            examplesHtml += '</div>';
        }

        let tipsHtml = '';
        if (topic.tips) {
            tipsHtml = `
                <div class="tip-box-premium">
                    <div class="tip-icon">🌟</div>
                    <div class="tip-text">${topic.tips}</div>
                </div>
            `;
        }

        articleContainer.innerHTML = `
            <h2>${topic.title}</h2>
            <div class="article-body">
                ${htmlContent}
                ${examplesHtml}
                ${tipsHtml}
            </div>
        `;

        listView.style.display = 'none';
        contentView.style.display = 'block';

        document.querySelector('#theory-screen .screen-content').scrollTop = 0;
    },

    parseMarkdown(text) {
        if (!text) return '';

        return text
            // Headers
            .replace(/### (.*)/g, '<h3>$1</h3>')
            // Bold
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            // Italics
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            // Lists (simple)
            .replace(/^- (.*)/gm, '<li>$1</li>')
            .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
            // Cleanup double ULs
            .replace(/<\/ul>\n<ul>/g, '')
            // Newlines to BR (but not inside UL)
            .split('\n').map(line => {
                if (line.includes('<li>') || line.includes('<ul>') || line.includes('</ul>') || line.includes('<h3>')) {
                    return line;
                }
                return line + '<br>';
            }).join('');
    },

    backToList() {
        document.getElementById('theory-list-container').style.display = 'block';
        document.getElementById('theory-content-view').style.display = 'none';
    }
};
