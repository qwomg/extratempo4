let audioContext = new (window.AudioContext || window.webkitAudioContext)();
let accentedBuffer, unaccentedBuffer;

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
let scheduledSounds = [];
function playSound(buffer, time) {
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);
    source.start(time);

    // Keep track of the scheduled source
    scheduledSounds.push({ source, time });
}

document.addEventListener("DOMContentLoaded", function() {

    const beatsContainer = document.getElementById('beats-container');
    const tempoSlider = document.getElementById('tempo-slider');
    const tempoValueDisplay = document.getElementById('tempo-value');
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
        beats = storedBeats ? JSON.parse(storedBeats) : new Array(4).fill({ type: 'normal', sound: 'default' });
        tempoSlider.value = storedTempo || 120;
        tempoValueDisplay.textContent = tempoSlider.value; // Display the tempo
        numBeatsInput.value = beats.length; // Set the number of beats
        renderBeats();
        saveSettings();
    }

    function loadBeats() {
        const storedBeats = localStorage.getItem('beats');
        beats = storedBeats ? JSON.parse(storedBeats) : new Array(parseInt(numBeatsInput.value)).fill({ type: 'normal', sound: 'unaccented' });
        renderBeats();
    }
    function updateNumBeatsInput() {
        const numBeatsInput = document.getElementById('num-beats');
        numBeatsInput.value = beats.length;
    }

    document.getElementById('num-beats').addEventListener('change', (event) => {
        const newNumBeats = parseInt(event.target.value);
        adjustBeatsArray(newNumBeats);
        renderBeats();
        saveSettings();
    });
        // Adjust the beats array when the number of beats is changed
        function adjustBeatsArray(newNumBeats) {
            if (newNumBeats > beats.length) {
                // Add new beats with default settings
                for (let i = beats.length; i < newNumBeats; i++) {
                    beats.push({ type: 'normal', sound: 'unaccented' });
                }
            } else {
                // Remove beats if necessary
                beats.length = newNumBeats;
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
            beatElement.classList.add('beat', 'p-2', 'rounded', 'text-white', 'text-center', 'm-1', 'cursor-pointer', 'beat-normal');
            beatElement.textContent = index + 1;
            beatElement.style.width = '40px'; // Fixed width for beat blocks
            beatElement.style.height = '40px'; // Fixed height for beat blocks
            beatElement.dataset.index = index;
            beatElement.dataset.type = beat.type;
            beatsContainer.appendChild(beatElement);

            beatElement.addEventListener('click', () => {
                toggleBeatType(beat, beatElement);
            });
            applyBeatStylesForElement(beat, beatElement);
        });
        applyBeatStyles();
    }
    function applyBeatStylesForElement(beat, beatElement) {
        // Clear all classes
        beatElement.className = ''; 
        beatElement.classList.add('beat', 'p-2', 'rounded', 'text-white', 'text-center', 'm-1', 'cursor-pointer');
        // Add type specific classes
        beatElement.classList.add(`beat-${beat.type}`);
    }
    tempoSlider.addEventListener('input', function() {
        tempoValueDisplay.textContent = tempoSlider.value; // Update the display as the slider moves
        saveSettings();
    });
    function toggleBeatType(beat, beatElement) {
        const types = ['normal', 'accented', 'muted'];
        let nextTypeIndex = (types.indexOf(beat.type) + 1) % types.length;
        beat.type = types[nextTypeIndex];
        applyBeatStylesForElement(beat, beatElement);
        saveSettings();
    }
    function applyBeatStyles() {
        beats.forEach((beat, index) => {
            const beatElement = beatsContainer.children[index];
            beatElement.className = ''; // Clear all classes
            beatElement.classList.add('beat', 'p-2', 'rounded', 'text-white', 'text-center', 'm-1', 'cursor-pointer');

            if (beat.type === 'accented') {
                beatElement.classList.add('beat-accented');
            } else if (beat.type === 'muted') {
                beatElement.classList.add('beat-muted');
            } else {
                beatElement.classList.add('beat-normal');
            }
            beatElement.classList.add(`beat-${beat.type}`);
        });
    }
    function highlightCurrentBeat(index) {
        clearBeatHighlighting();
        beatsContainer.children[index].classList.add('beat-playing');
    }
    numBeatsInput.addEventListener('change', (event) => {
        const newNumBeats = parseInt(event.target.value);
        beats = new Array(newNumBeats).fill({ type: 'normal', sound: 'unaccented' });
        saveSettings();
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
        const beat = beats[index];
        if (beat.type === 'accented') {
            playSound(accentedBuffer, time);
        } else if (beat.type === 'normal') {
            playSound(unaccentedBuffer, time);
        }
        // Muted beats don't play sound
        highlightCurrentBeat(index);
    }
    
    preloadSounds();
    loadSettings();
    renderBeats();
});
