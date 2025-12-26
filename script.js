let audioContext = new (window.AudioContext || window.webkitAudioContext)();
let accentedBuffer, unaccentedBuffer;
let scheduledSounds = [];

// Load the audio files
async function preloadSounds() {
    accentedBuffer = await loadAudioBuffer('sounds/accented_beep.mp3');
    unaccentedBuffer = await loadAudioBuffer('sounds/unaccented_beep.mp3');
}

async function loadAudioBuffer(url) {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    return audioContext.decodeAudioData(arrayBuffer);
}

function playSound(buffer, time) {
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);
    source.start(time);

    // Keep track of the scheduled source
    scheduledSounds.push({ source, time });
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

            beatElement.addEventListener('touchstart', (e) => {
                touchStarted = true;
                // Prevent text selection immediately
                e.preventDefault();
                longPressTimer = setTimeout(() => {
                    if (touchStarted) {
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
                touchStarted = false;
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
        const beatDuration = 60 / tempoSlider.value;

        while (time < audioContext.currentTime + 0.1) {
            playBeat(currentBeatIndex, time);
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
        scheduledSounds.forEach(({ source, time }) => {
            if (time > audioContext.currentTime) {
                source.stop();
            }
        });
        scheduledSounds = []; // Reset the scheduled sounds

        clearTimeout(beatTimeout);
        currentBeatIndex = 0;
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

            let buffer;

            switch (beat.type) {
                case 'accented':
                    buffer = accentedBuffer;
                    break;
                case 'normal':
                    buffer = unaccentedBuffer;
                    break;
                case 'soft':
                    buffer = unaccentedBuffer;
                    break;
                case 'muted':
                    // Muted beats don't play sound, but are still highlighted
                    return;
            }

            playSound(buffer, time);
        }
    }

    preloadSounds();
    loadSettings();
    renderBeats();
});
