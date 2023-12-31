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
            beats = JSON.parse(storedBeats).map(beat => ({ ...beat })); // Create a new object for each beat
        } else {
            beats = new Array(4).fill(null).map(() => ({ type: 'normal', sound: 'default' }));
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
            beats[i] = { type: 'normal', sound: 'default' };
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

            // Apply the existing style for each beat
            applyBeatStylesForElement(beat, beatElement);

            beatElement.addEventListener('click', () => {
                toggleBeatType(index);
            });

            beatsContainer.appendChild(beatElement);
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
        const types = ['normal', 'accented', 'muted'];
        let currentTypeIndex = types.indexOf(beats[index].type);
        beats[index].type = types[(currentTypeIndex + 1) % types.length];

        // Re-apply styles to just the toggled beat
        const beatEl = beatsContainer.children[index];
        applyBeatStylesForElement(beats[index], beatEl);

        // Save updated beats
        saveSettings();
    }

    function highlightCurrentBeat(index) {
        clearBeatHighlighting();
        beatsContainer.children[index].classList.add('beat-playing');
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
            let buffer;

            switch (beat.type) {
                case 'accented':
                    buffer = accentedBuffer;
                    break;
                case 'normal':
                    buffer = unaccentedBuffer;
                    break;
                case 'muted':
                    // Muted beats don't play sound
                    return;
            }

            playSound(buffer, time);
            highlightCurrentBeat(index);
        }
    }

    preloadSounds();
    loadSettings();
    renderBeats();
});
