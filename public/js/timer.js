/* ============================================
   LinguaQuest - Timer Module
   Handles countdown timer for each question
   ============================================ */

const Timer = {
    duration: 15,
    remaining: 15,
    interval: null,
    onTick: null,
    onExpire: null,

    start(duration, onTick, onExpire) {
        this.stop();
        this.duration = duration || 15;
        this.remaining = this.duration;
        this.onTick = onTick;
        this.onExpire = onExpire;
        this.updateDisplay();

        this.interval = setInterval(() => {
            this.remaining--;
            this.updateDisplay();
            if (this.onTick) this.onTick(this.remaining);

            if (this.remaining <= 0) {
                this.stop();
                if (this.onExpire) this.onExpire();
            }
        }, 1000);
    },

    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    },

    updateDisplay() {
        const timerText = document.getElementById('timer-text');
        const timerProgress = document.getElementById('timer-progress');
        if (!timerText || !timerProgress) return;

        timerText.textContent = this.remaining;
        const circumference = 2 * Math.PI * 45;
        const offset = circumference * (1 - this.remaining / this.duration);
        timerProgress.style.strokeDasharray = circumference;
        timerProgress.style.strokeDashoffset = offset;

        timerProgress.classList.remove('warning', 'danger');
        if (this.remaining <= 5) {
            timerProgress.classList.add('danger');
        } else if (this.remaining <= 8) {
            timerProgress.classList.add('warning');
        }
    },

    getElapsed() {
        return this.duration - this.remaining;
    },

    isQuick() {
        return this.getElapsed() <= 5;
    }
};
