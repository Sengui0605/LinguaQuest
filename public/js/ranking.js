/* ============================================
   LinguaQuest - Real-time Ranking System (Firestore)
   ============================================ */

const Ranking = {
    leaderboard: [],
    currentTab: 'xp',

    async load() {
        try {
            if (!window.FirebaseDB) {
                console.warn("Firebase no está inicializado todavía. Usando ranking local temporal.");
                this.leaderboard = [];
                return;
            }
            
            const { db, collection, getDocs } = window.FirebaseDB;
            const usersRef = collection(db, "users");
            const querySnapshot = await getDocs(usersRef);
            
            const fetchedRanking = [];
            querySnapshot.forEach((doc) => {
                fetchedRanking.push(doc.data());
            });
            
            this.leaderboard = []; // Clear old data entirely
            if (fetchedRanking.length > 0) {
                this.leaderboard = fetchedRanking;
            } else {
                this.leaderboard = []; // No hay data aún en Firestore
            }
            
        } catch (e) {
            console.error('Error cargando ranking de Firebase:', e);
            if (this.leaderboard.length === 0) {
                this.leaderboard = []; // Fallback on error if empty
            }
        }
    },

    async savePlayerProgress(player) {
        // Enlazar al currentPlayer global
        let playerId = localStorage.getItem('linguaquest_player_id');
        if (!playerId) {
            playerId = 'user_' + Math.random().toString(36).substr(2, 9) + Date.now();
            localStorage.setItem('linguaquest_player_id', playerId);
        }
        
        try {
            if (window.FirebaseDB) {
                const { db, doc, setDoc } = window.FirebaseDB;
                await setDoc(doc(db, "users", playerId), {
                    id: playerId,
                    name: player.name || "Jugador",
                    avatar: player.avatar || "🧑‍🎓",
                    level: player.level || 1,
                    score: player.score || 0,
                    xp: player.xp || 0,
                    timestamp: Date.now()
                });
                
                // Actualizar info localmente en memoria
                this.addPlayer({ ...player, id: playerId });
            }
        } catch(e) {
            console.error("Error guardando progreso en Firestore:", e);
            this.addPlayer(player); // Guardar info localmente como fallback
        }
    },

    addPlayer(player) {
        // playerId matching
        let pId = player.id || localStorage.getItem('linguaquest_player_id');
        const existingIndex = this.leaderboard.findIndex(p => p.id === pId || (p.name === player.name && p.isPlayer));
        
        if (existingIndex !== -1) {
            this.leaderboard[existingIndex].level = player.level;
            this.leaderboard[existingIndex].xp = player.xp;
            this.leaderboard[existingIndex].score = player.score;
            this.leaderboard[existingIndex].avatar = player.avatar;
            this.leaderboard[existingIndex].isPlayer = true;
        } else {
            this.leaderboard.push({ ...player, id: pId, isPlayer: true });
        }
    },

    getSorted(key) {
        return [...this.leaderboard].sort((a, b) => b[key] - a[key]);
    },

    switchTab(tab, btn) {
        this.currentTab = tab;
        document.querySelectorAll('.ranking-tab').forEach(t => t.classList.remove('active'));
        if (btn) btn.classList.add('active');
        this.render('ranking-list');
    },

    async render(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        // Recargar de Firebase antes de mostrar para asegurar frescura de datos
        await this.load();
        
        const key = this.currentTab === 'level' ? 'level' : this.currentTab === 'score' ? 'score' : 'xp';
        const sorted = this.getSorted(key);
        container.innerHTML = '';
        
        if (sorted.length === 0) {
            container.innerHTML = '<div style="text-align:center; padding: 2rem; color: var(--text-secondary);">El ranking está vacío. ¡Haz tu primer quiz para aparecer!</div>';
            return;
        }

        const localPlayerId = localStorage.getItem('linguaquest_player_id');

        sorted.forEach((player, i) => {
            const item = document.createElement('div');
            const pos = i + 1;
            let posClass = '';
            if (pos === 1) posClass = 'gold';
            else if (pos === 2) posClass = 'silver';
            else if (pos === 3) posClass = 'bronze';

            const isCurrentPlayer = (player.id === localPlayerId) || player.isPlayer;

            item.className = `ranking-item ${isCurrentPlayer ? 'current-player' : ''}`;
            item.style.animationDelay = `${i * 0.05}s`;
            const medal = pos === 1 ? '🥇' : pos === 2 ? '🥈' : pos === 3 ? '🥉' : pos;
            item.innerHTML = `
                <div class="ranking-position ${posClass}">${medal}</div>
                <div class="ranking-avatar">${player.avatar || '🧑‍🎓'}</div>
                <div class="ranking-info">
                    <div class="ranking-name">${player.name}${isCurrentPlayer ? ' (Tú)' : ''}</div>
                    <div class="ranking-level">Nivel ${player.level}</div>
                </div>
                <div class="ranking-value">${player[key].toLocaleString()}</div>
            `;
            container.appendChild(item);
        });
    }
};
