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
        
        const sound = this.sounds[soundName];
        if (sound) {
            sound.currentTime = 0;
            sound.play().catch(e => console.log('Audio play blocked or file missing:', soundName));
        }
    }
};
