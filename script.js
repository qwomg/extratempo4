let audioContext = new (window.AudioContext || window.webkitAudioContext)();
let scheduledSounds = [];

// Generate beep sounds programmatically using Web Audio API
function playBeep(type, time) {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    // Configure sound based on type
    switch(type) {
        case 'accented':
            oscillator.frequency.value = 1200; // Higher pitch for accent
            gainNode.gain.value = 0.3;
            break;
        case 'normal':
            oscillator.frequency.value = 800;  // Standard pitch
            gainNode.gain.value = 0.2;
            break;
        case 'soft':
            oscillator.frequency.value = 600;  // Lower pitch for soft
            gainNode.gain.value = 0.15;
            break;
    }

    // Shape the sound envelope (attack-decay)
    const now = time || audioContext.currentTime;
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(gainNode.gain.value, now + 0.01); // Attack
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1); // Decay

    // Connect nodes
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Play the sound
    oscillator.start(now);
    oscillator.stop(now + 0.1);

    // Keep track of scheduled sounds
    scheduledSounds.push({ oscillator, time: now });
}

document.addEventListener("DOMContentLoaded", function () {

    const beatsContainer = document.getElementById('beats-container');
    const tempoSlider = document.getElementById('tempo-slider');
    const tempoInput = document.getElementById('tempo-input');
    const numBeatsInput = document.getElementById('num-beats');
    const startStopBtn = document.getElementById('start-stop-btn');
    let isPlaying = false;
    let currentBeatIndex = 0;
    let beats = [];
    let beatInterval;


    let beatTimeout;
    let lastScheduledTime = 0;
    let lastTempo = null;

    function loadSettings() {
        const storedBeats = localStorage.getItem('beats');
        const storedTempo = localStorage.getItem('tempo');
        if (storedBeats) {
            beats = JSON.parse(storedBeats).map(beat => ({
                type: beat.type || 'normal',
                sound: beat.sound || 'default',
                lineBreak: beat.lineBreak || false
            }));
        } else {
            beats = new Array(4).fill(null).map(() => ({ type: 'normal', sound: 'default', lineBreak: false }));
        }
        tempoSlider.value = storedTempo || 120;
        tempoInput.value = tempoSlider.value;
        numBeatsInput.value = beats.length;
        renderBeats();
        saveSettings();
    }
    function adjustBeatsArray(newNumBeats) {
        // Create a copy of current beats
        const existingBeats = [...beats];

        // Adjust length 
        beats.length = newNumBeats;

        // Copy over existing beats
        existingBeats.forEach((beat, index) => {
            if (index < newNumBeats) {
                beats[index] = beat;
            }
        });

        // Fill remaining with defaults
        for (let i = existingBeats.length; i < newNumBeats; i++) {
            beats[i] = { type: 'normal', sound: 'default', lineBreak: false };
        }
    }

    function saveSettings() {
        localStorage.setItem('beats', JSON.stringify(beats));
        localStorage.setItem('tempo', tempoSlider.value);
    }

    function renderBeats() {
        beatsContainer.innerHTML = '';

        beats.forEach((beat, index) => {
            const beatElement = document.createElement('div');
            beatElement.classList.add('beat', 'p-2', 'rounded', 'text-white', 'text-center', 'm-1', 'cursor-pointer');
            beatElement.textContent = index + 1;
            beatElement.style.width = '40px';
            beatElement.style.height = '40px';
            beatElement.dataset.beatIndex = index;

            // Apply the existing style for each beat
            applyBeatStylesForElement(beat, beatElement);

            // Add line break indicator if this beat has a line break
            if (beat.lineBreak) {
                beatElement.classList.add('beat-has-break');
            }

            // Left click to toggle beat type
            beatElement.addEventListener('click', () => {
                toggleBeatType(index);
            });

            // Right click to toggle line break (desktop)
            beatElement.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                toggleLineBreak(index);
            });

            // Long press to toggle line break (mobile)
            let longPressTimer;
            let touchStarted = false;
            let longPressTriggered = false;

            beatElement.addEventListener('touchstart', (e) => {
                touchStarted = true;
                longPressTriggered = false;
                // Prevent text selection immediately
                e.preventDefault();
                longPressTimer = setTimeout(() => {
                    if (touchStarted) {
                        longPressTriggered = true;
                        toggleLineBreak(index);
                        // Vibrate if available to give feedback
                        if (navigator.vibrate) {
                            navigator.vibrate(50);
                        }
                    }
                }, 500); // 500ms long press duration
            });

            beatElement.addEventListener('touchend', () => {
                clearTimeout(longPressTimer);
                // If it was a short tap (not a long press), toggle beat type
                if (touchStarted && !longPressTriggered) {
                    toggleBeatType(index);
                }
                touchStarted = false;
                longPressTriggered = false;
            });

            beatElement.addEventListener('touchmove', () => {
                clearTimeout(longPressTimer);
                touchStarted = false;
            });

            beatsContainer.appendChild(beatElement);

            // Insert line break element if needed
            if (beat.lineBreak) {
                const lineBreakElement = document.createElement('div');
                lineBreakElement.classList.add('line-break');
                beatsContainer.appendChild(lineBreakElement);
            }
        });
    }

    function applyBeatStylesForElement(beat, beatElement) {
        beatElement.className = 'beat p-2 rounded text-white text-center m-1 cursor-pointer';
        beatElement.classList.add(`beat-${beat.type}`);
    }
    tempoSlider.addEventListener('input', function () {
        tempoInput.value = tempoSlider.value;
        saveSettings();
    });
    tempoInput.addEventListener('input', function () {
        tempoSlider.value = tempoInput.value;
        // Update the metronome tempo here if it's running
    });
    function toggleBeatType(index) {

        // Toggle beat type
        const types = ['normal', 'accented', 'soft', 'muted'];
        let currentTypeIndex = types.indexOf(beats[index].type);
        beats[index].type = types[(currentTypeIndex + 1) % types.length];

        // Re-apply styles to just the toggled beat
        const beatEl = beatsContainer.querySelector(`[data-beat-index="${index}"]`);
        if (beatEl) {
            applyBeatStylesForElement(beats[index], beatEl);
        }

        // Save updated beats
        saveSettings();
    }

    function toggleLineBreak(index) {
        beats[index].lineBreak = !beats[index].lineBreak;
        renderBeats();
        saveSettings();
    }

    function highlightCurrentBeat(index) {
        clearBeatHighlighting();
        const beatElement = beatsContainer.querySelector(`[data-beat-index="${index}"]`);
        if (beatElement) {
            beatElement.classList.add('beat-playing');
        }
    }

    document.getElementById('num-beats').addEventListener('change', (event) => {
        const newNumBeats = parseInt(event.target.value);
        adjustBeatsArray(newNumBeats);
        renderBeats();
        saveSettings();
    });

    startStopBtn.addEventListener('click', () => {
        // Check if AudioContext is in a suspended state
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }

        if (isPlaying) {
            stopMetronome();
        } else {
            startMetronome();
        }
    });
    function startMetronome() {
        if (isPlaying) return;
        isPlaying = true;
        startStopBtn.textContent = 'Stop';

        let nextBeatTime = audioContext.currentTime;
        scheduleBeats(nextBeatTime);
    }

    function scheduleBeats(time) {
        const currentTempo = parseFloat(tempoSlider.value);
        const beatDuration = 60 / currentTempo;

        // If tempo changed mid-playback, recalculate next beat time
        // to maintain proper spacing from the last scheduled beat
        if (lastTempo !== null && lastTempo !== currentTempo && lastScheduledTime > 0) {
            const newBeatDuration = beatDuration;
            // Next beat should be at lastScheduledTime + newBeatDuration
            const nextBeatTime = lastScheduledTime + newBeatDuration;
            // If that time is in the past, find the next valid beat time
            if (nextBeatTime < audioContext.currentTime) {
                const elapsed = audioContext.currentTime - lastScheduledTime;
                const beatsPassed = Math.ceil(elapsed / newBeatDuration);
                time = lastScheduledTime + (beatsPassed * newBeatDuration);
            } else {
                time = nextBeatTime;
            }
        }
        lastTempo = currentTempo;

        while (time < audioContext.currentTime + 0.1) {
            playBeat(currentBeatIndex, time);
            lastScheduledTime = time;
            currentBeatIndex = (currentBeatIndex + 1) % beats.length;
            time += beatDuration;
        }

        beatTimeout = setTimeout(() => scheduleBeats(time), beatDuration / 2 * 1000);
    }

    function stopMetronome() {
        if (!isPlaying) return;
        isPlaying = false;
        startStopBtn.textContent = 'Start';

        // Stop and clear all scheduled sounds
        scheduledSounds.forEach(({ oscillator, time }) => {
            try {
                if (time > audioContext.currentTime) {
                    oscillator.stop();
                }
            } catch (e) {
                // Oscillator may have already stopped
            }
        });
        scheduledSounds = []; // Reset the scheduled sounds

        clearTimeout(beatTimeout);
        currentBeatIndex = 0;
        lastScheduledTime = 0;
        lastTempo = null;
        audioContext.suspend();
    }
    function clearBeatHighlighting() {
        for (let child of beatsContainer.children) {
            child.classList.remove('beat-playing');
        }
    }
    function playBeat(index, time) {
        if (index >= 0 && index < beats.length) {
            const beat = beats[index];

            // Always highlight the current beat, even if muted
            highlightCurrentBeat(index);

            // Play sound for non-muted beats
            if (beat.type !== 'muted') {
                playBeep(beat.type, time);
            }
        }
    }

    // Reset button with confirmation
    const resetBtn = document.getElementById('reset-btn');
    let resetConfirmPending = false;
    let resetConfirmTimeout;

    resetBtn.addEventListener('click', () => {
        if (resetConfirmPending) {
            // User confirmed - do the reset
            clearTimeout(resetConfirmTimeout);
            resetConfirmPending = false;
            resetBtn.textContent = 'Reset';
            resetBtn.classList.remove('btn-danger');
            resetBtn.classList.add('btn-outline-danger');

            // Stop metronome if playing
            if (isPlaying) {
                stopMetronome();
            }

            // Reset to defaults
            beats = new Array(4).fill(null).map(() => ({ type: 'normal', sound: 'default', lineBreak: false }));
            tempoSlider.value = 120;
            tempoInput.value = 120;
            numBeatsInput.value = 4;

            // Clear localStorage and re-render
            localStorage.removeItem('beats');
            localStorage.removeItem('tempo');
            renderBeats();
            clearBeatHighlighting();
        } else {
            // First click - ask for confirmation
            resetConfirmPending = true;
            resetBtn.textContent = 'Are you sure?';
            resetBtn.classList.remove('btn-outline-danger');
            resetBtn.classList.add('btn-danger');

            // Revert after 3 seconds if not confirmed
            resetConfirmTimeout = setTimeout(() => {
                resetConfirmPending = false;
                resetBtn.textContent = 'Reset';
                resetBtn.classList.remove('btn-danger');
                resetBtn.classList.add('btn-outline-danger');
            }, 3000);
        }
    });

    loadSettings();
    renderBeats();
});
