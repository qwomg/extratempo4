# CLAUDE.md - AI Assistant Guide for Extratempo4

## Project Overview

**Extratempo4** is a web-based metronome application with advanced beat pattern customization. The app allows users to create custom rhythmic patterns with different beat types (normal, accented, soft, muted), visual line breaks, and tempo control ranging from 20-600 BPM.

**Technology Stack:**
- Vanilla JavaScript (ES6+)
- HTML5
- Bootstrap 4.3.1 (primary styling framework)
- Web Audio API (audio playback)
- LocalStorage API (state persistence)
- Tailwind CSS (configured but not actively used)

**Project Type:** Single-page application (SPA) with no build process or bundler.

---

## File Structure

```
extratempo4/
├── index.html              # Main HTML file with UI structure and inline styles
├── script.js               # All application logic and event handlers
├── sounds/
│   ├── accented_beep.mp3   # Audio file for accented beats
│   └── unaccented_beep.mp3 # Audio file for normal/soft beats
├── package.json            # Minimal package file (only tailwindcss dev dependency)
├── tailwind.config.js      # Tailwind configuration (not actively used)
├── .gitignore              # Standard Node.js gitignore
└── README.md               # Project description
```

### Key Files

**index.html (101 lines)**
- Contains complete UI structure using Bootstrap components
- Inline CSS styles for beat states and animations
- Beat container (`#beats-container`) uses flexbox layout
- Tempo controls: slider (`#tempo-slider`) and number input (`#tempo-input`)
- Control buttons: Start/Stop (`#start-stop-btn`) and Reset (`#reset-btn`)
- Footer credits by Lior Elgali

**script.js (378 lines)**
- Core metronome logic with Web Audio API
- Beat scheduling system with look-ahead scheduling
- Event handlers for UI interactions (click, touch, long-press)
- LocalStorage integration for settings persistence
- Mobile-specific touch event handling

---

## Core Concepts & Architecture

### 1. Beat System

Each beat is an object with three properties:
```javascript
{
  type: 'normal' | 'accented' | 'soft' | 'muted',
  sound: 'default',  // Currently unused, reserved for future features
  lineBreak: boolean // Visual line break after this beat
}
```

**Beat Types:**
- **Normal** (green, `#28a745`): Standard metronome click using unaccented beep
- **Accented** (red, `#dc3545`): Emphasized beat using accented beep at full volume
- **Soft** (purple, `#9b59b6`): Quieter beat using unaccented beep at 0.3 volume
- **Muted** (gray, `#6c757d`): Silent beat - highlighted visually but no sound

**Beat Interaction:**
- **Left click / Tap**: Cycle through beat types (normal → accented → soft → muted)
- **Right click / Long press (500ms)**: Toggle line break after beat
- Visual indicator (`⏎`) appears when line break is enabled

### 2. Audio System

**Web Audio API Implementation:**
- `AudioContext` manages all audio operations
- Audio buffers preloaded on page load via `preloadSounds()`
- `playSound(buffer, time, volume)` schedules audio with precise timing
- Gain nodes control volume per beat (soft beats use 0.3 gain)

**Scheduling Strategy:**
- Look-ahead scheduling: schedules beats 100ms in advance
- `scheduleBeats()` runs recursively via `setTimeout` at half beat duration
- Prevents audio drift and ensures precise timing
- `scheduledSounds` array tracks scheduled sources for cleanup on stop

**Tempo Changes:**
- Tempo can change mid-playback
- Script recalculates next beat time to maintain rhythm continuity
- `lastScheduledTime` and `lastTempo` track tempo transitions

### 3. State Management

**LocalStorage Persistence:**
```javascript
localStorage.setItem('beats', JSON.stringify(beats))
localStorage.setItem('tempo', tempoSlider.value)
```

**State Variables:**
- `beats` array: Complete beat pattern configuration
- `currentBeatIndex`: Tracks playback position (0 to beats.length-1)
- `isPlaying`: Boolean for metronome state
- `beatTimeout`: Reference to scheduling timeout for cleanup

**Settings Load Order:**
1. Load from localStorage on `DOMContentLoaded`
2. Fall back to defaults (4 normal beats at 120 BPM)
3. Render UI from loaded state
4. Save settings (ensures consistency)

### 4. Mobile Support

**Touch Event Handling:**
- `touchstart`: Begins long-press timer, prevents text selection
- `touchend`: Triggers tap action if long-press didn't fire
- `touchmove`: Cancels long-press (user is scrolling)
- Haptic feedback via `navigator.vibrate(50)` on long-press

**Critical Implementation Details:**
- `e.preventDefault()` on touchstart prevents text selection issues
- Separate flags: `touchStarted`, `longPressTriggered` prevent duplicate actions
- 500ms threshold distinguishes tap from long-press

---

## Development Workflows

### Git Branch Strategy

**Branch Naming Convention:**
```
claude/<feature-description>-<session-id>
```

Examples from history:
- `claude/fix-metronome-timing-tADOO`
- `claude/fix-break-line-bug-lXtpU`
- `claude/mobile-manual-break-DMiKC`

**Workflow:**
1. Create feature branch from main
2. Develop and test changes
3. Commit with descriptive messages
4. Push to origin with `-u` flag: `git push -u origin <branch-name>`
5. Create pull request via `gh pr create`
6. Merge to main after review

**Commit Message Style:**
- Imperative mood: "Fix metronome timing bug" not "Fixed bug"
- Descriptive and concise
- Reference specific features/bugs
- Example: "Make soft beats quieter and change color to purple"

### Testing Checklist

When making changes, verify:
1. **Desktop browsers**: Chrome, Firefox, Safari
2. **Mobile devices**: iOS Safari, Android Chrome
3. **Tempo changes**: Test during playback (20 BPM, 120 BPM, 600 BPM)
4. **Beat types**: All four types play correctly
5. **Line breaks**: Visual layout and playback continuity
6. **LocalStorage**: Settings persist across page reloads
7. **Touch interactions**: Tap vs long-press work correctly
8. **Audio timing**: No drift over extended playback (2+ minutes)

---

## Common Tasks & Code Patterns

### Adding a New Beat Type

1. **Define color in index.html styles:**
```css
.beat-newtype {
    background-color: #hexcode;
}
```

2. **Add to type cycle in script.js:**
```javascript
const types = ['normal', 'accented', 'soft', 'muted', 'newtype'];
```

3. **Implement audio behavior in playBeat():**
```javascript
case 'newtype':
    buffer = unaccentedBuffer; // or accentedBuffer
    volume = 0.5; // adjust as needed
    break;
```

### Modifying Tempo Range

Update in `index.html` at lines 83-84:
```html
<input type="range" id="tempo-slider" min="20" max="600" value="120">
<input type="number" id="tempo-input" min="20" max="600" value="120">
```

### Changing Default Settings

Modify `loadSettings()` fallback (script.js:60):
```javascript
beats = new Array(8).fill(null).map(() => ({
    type: 'accented',
    sound: 'default',
    lineBreak: false
}));
```

### Adding New UI Controls

1. Add HTML element in `index.html` (follow Bootstrap conventions)
2. Get element reference in `DOMContentLoaded` listener
3. Add event listener (consider both mouse and touch events for mobile)
4. Update `saveSettings()` and `loadSettings()` if persisting state

---

## Important Conventions & Gotchas

### DO's ✓

- **Always prevent text selection** on touch elements with `e.preventDefault()`
- **Use `data-beat-index` attributes** for DOM-to-state mapping (see line 102)
- **Schedule audio relative to `audioContext.currentTime`** never `Date.now()`
- **Clear timeouts and audio sources** when stopping metronome
- **Suspend AudioContext** when not playing to save resources (line 290)
- **Validate input ranges** - beats: 1-300, tempo: 20-600
- **Test mobile touch interactions** separately from desktop clicks
- **Preserve beat data** when changing number of beats (see `adjustBeatsArray()`)

### DON'Ts ✗

- **Don't use `setInterval` for metronome timing** - causes drift, use recursive setTimeout with look-ahead scheduling
- **Don't modify `beats` array length directly** - use `adjustBeatsArray()` to preserve existing beats
- **Don't skip `saveSettings()` calls** - leads to state desync with localStorage
- **Don't assume touch events work like mouse events** - implement separately
- **Don't add animations that might block the main thread** - keep UI responsive
- **Don't use `innerHTML` carelessly** - current code correctly uses `textContent` and `classList`
- **Don't hardcode array indices** - use `data-beat-index` for robust DOM queries

### Known Issues & Quirks

1. **Footer message**: "p.s. if it stops working refresh it" - indicates potential audio context issues in some browsers
2. **Tailwind not used**: Configured but Bootstrap is the active framework
3. **Sound property unused**: Each beat has a `sound` property but only 'default' is implemented
4. **No undo/redo**: Users must use Reset button to start over
5. **No pattern presets**: Could be added using localStorage with multiple slots

---

## Code Quality Guidelines

### Naming Conventions
- **Functions**: camelCase, descriptive verbs (`toggleBeatType`, `playSound`)
- **Variables**: camelCase, descriptive nouns (`currentBeatIndex`, `beatTimeout`)
- **Constants**: Could use UPPER_CASE for magic numbers (currently inline)
- **DOM elements**: Suffix with descriptive type (`tempoSlider`, `startStopBtn`)

### Code Organization
- Group related functions together (audio functions at top, UI functions in middle)
- Keep event listeners in `DOMContentLoaded` block
- Use helper functions to avoid repetition (`applyBeatStylesForElement`)

### Comments
- Add comments for complex logic (see lines 246-260 for tempo change handling)
- Explain "why" not "what" when code is unclear
- Document edge cases and browser quirks

---

## Debugging Tips

### Audio Issues
- Check `audioContext.state` - should be "running" when playing
- Verify buffers loaded: `console.log(accentedBuffer, unaccentedBuffer)`
- Monitor scheduled sounds: `console.log(scheduledSounds.length)`
- Test in incognito mode (localStorage issues)

### Timing Drift
- Log actual vs expected beat times: `console.log(audioContext.currentTime - expectedTime)`
- Verify `beatDuration` calculation matches tempo
- Check for main thread blocking (heavy DOM updates)

### Touch/Click Issues
- Add `console.log` to touchstart/touchend to verify event firing
- Check `touchStarted` and `longPressTriggered` flag states
- Test with Chrome DevTools device emulation
- Verify `e.preventDefault()` is called appropriately

### State Persistence
- Open DevTools → Application → Local Storage
- Verify 'beats' and 'tempo' keys exist
- Check JSON format is valid
- Try `localStorage.clear()` and reload to test defaults

---

## Future Enhancement Ideas

Based on code structure and commit history:

1. **Pattern Presets**: Save/load multiple beat patterns
2. **Custom Sounds**: Allow users to upload their own audio files (leverage existing `sound` property)
3. **Visual Metronome**: Add animated conductor or pendulum visualization
4. **Time Signature Presets**: Quick buttons for 3/4, 4/4, 5/4, 7/8, etc.
5. **Subdivision Support**: Add 8th notes, triplets, etc.
6. **Export/Import**: Share patterns as JSON or URL parameters
7. **Keyboard Shortcuts**: Space for start/stop, arrow keys for tempo
8. **Practice Mode**: Count-in, auto-stop after N measures
9. **Accent Patterns**: Right-hand automation for common patterns (e.g., every 4th beat)
10. **Dark Mode**: Following modern web app conventions

---

## Contact & Credits

**Original Author**: Lior Elgali
**Status**: Buggy alpha version (as noted in footer)
**License**: See LICENSE file in repository

---

## Quick Reference

### File to Edit for:
- **UI Structure**: `index.html`
- **Styling**: `index.html` (inline styles) or add Bootstrap classes
- **Logic/Behavior**: `script.js`
- **Audio Files**: `sounds/` directory (MP3 format)

### Key Functions in script.js:
- `loadSettings()` - Initialize from localStorage
- `renderBeats()` - Generate beat elements in DOM
- `toggleBeatType(index)` - Cycle through beat types
- `toggleLineBreak(index)` - Add visual break
- `startMetronome()` / `stopMetronome()` - Playback control
- `scheduleBeats(time)` - Look-ahead audio scheduling
- `playBeat(index, time)` - Play single beat with appropriate sound
- `playSound(buffer, time, volume)` - Web Audio API wrapper

### Important DOM IDs:
- `#beats-container` - Flexbox container for beat blocks
- `#num-beats` - Number input for beat count
- `#tempo-slider` - Range input for tempo
- `#tempo-input` - Number input for tempo (synced with slider)
- `#start-stop-btn` - Toggle metronome playback
- `#reset-btn` - Reset to defaults (with confirmation)

---

**Last Updated**: 2025-12-27
**Repository**: extratempo4
**Branch**: claude/add-claude-documentation-MLG2h
