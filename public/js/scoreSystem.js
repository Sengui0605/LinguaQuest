/* ============================================
   LinguaQuest - Score System
   Handles points calculation
   ============================================ */

const ScoreSystem = {
    currentScore: 0,
    correctPoints: 10,
    speedBonus: 5,
    completionBonus: 50,

    reset() {
        this.currentScore = 0;
    },

    addCorrect(isQuick) {
        let points = this.correctPoints;
        if (isQuick) points += this.speedBonus;
        this.currentScore += points;
        this.updateDisplay();
        return points;
    },

    addCompletion() {
        this.currentScore += this.completionBonus;
        this.updateDisplay();
        return this.completionBonus;
    },

    getScore() {
        return this.currentScore;
    },

    updateDisplay() {
        const el = document.getElementById('quiz-score');
        if (el) el.textContent = '⭐ ' + this.currentScore;
    }
};
