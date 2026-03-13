/* ============================================
   LinguaQuest - Sound System
   Manages game audio effects
   ============================================ */

const SoundSystem = {
    sounds: {
        correct: new Audio('assets/sounds/correct.mp3'),
        wrong: new Audio('assets/sounds/wrong.mp3'),
        click: new Audio('assets/sounds/click.mp3'),
        levelUp: new Audio('assets/sounds/levelup.mp3'),
        perfect: new Audio('assets/sounds/perfect.mp3')
    },

    play(soundName) {
        if (!Progress.data.settings.sound) return;
        
        const original = this.sounds[soundName];
        if (original) {
            // Clone the audio node so sounds can overlap (important for rapid clicks)
            const soundClone = original.cloneNode();
            soundClone.play().catch(e => {
                // Ignore errors if file is missing or play is blocked
            });
        }
    }
};
