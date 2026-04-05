// app.js — journal page logic

(function () {
  const state = getState();
  const editor = document.getElementById('editor');
  const notebookCard = document.getElementById('notebookCard');
  const sessionTimerEl = document.getElementById('sessionTimer');
  const promptCountEl = document.getElementById('promptCount');
  const restoredNote = document.getElementById('restoredNote');
  const sidebar = document.getElementById('sidebar');
  const hamburger = document.getElementById('hamburger');
  const soundToggle = document.getElementById('soundToggle');

  // ── Session state ──
  let sessionStart = Date.now();
  let lastKeystroke = Date.now();
  let totalChars = 0;
  let sessionWordCount = 0;
  let wordsPointsAwarded = 0;
  let sessionPromptsAccepted = 0;
  let sessionMinutesBonusGiven = false;
  let streakBonusGiven = false;
  let promptSide = 'right';
  let promptTimeout = null;
  let promptVisible = false;
  let usedPrompts = new Set();
  let audioCtx = null;
  let soundEnabled = state.soundEnabled || false;

  // ── Prompts ──
  const tier1 = [
    "What'd you eat today?",
    "Describe where you are right now.",
    "What's the last thing that made you laugh?",
    "What are you looking forward to?",
    "What's been on your mind lately?",
    "What did you notice today that you usually ignore?",
    "Who did you talk to today?"
  ];

  const tier2 = [
    "What are you pretending not to care about?",
    "Who annoyed you and why, really?",
    "What do you wish someone would ask you?",
    "What feeling are you avoiding naming?",
    "What would you say if no one could ever read this?",
    "What's something you haven't admitted to yourself yet?",
    "What do you actually want right now?"
  ];

  // ── Init ──
  applyColorway(state.activeColorway);
  applyFont(state.activeFont);
  applyTheme(state.activeNotebookTheme);
  updateSidebarStats();
  updateSoundToggle();

  // Streak
  const streak = updateStreak();
  if (streak > 1 && !streakBonusGiven) {
    streakBonusGiven = true;
    addPoints(5);
    showPointsAnim(5);
  }

  // Restore saved entry
  if (state.savedEntry) {
    editor.innerHTML = state.savedEntry;
    const dateStr = state.savedEntryDate || 'a previous session';
    restoredNote.textContent = 'restored from ' + dateStr;
    restoredNote.style.display = 'block';
    setTimeout(() => restoredNote.classList.add('fade-out'), 2000);
    setTimeout(() => restoredNote.style.display = 'none', 3200);
  }

  editor.focus();

  // ── Sidebar toggle ──
  hamburger.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    document.body.classList.toggle('sidebar-open');
  });

  // ── Font picker ──
  document.querySelectorAll('.font-option').forEach(btn => {
    if (btn.dataset.font === state.activeFont) btn.classList.add('active');
    btn.addEventListener('click', () => {
      document.querySelectorAll('.font-option').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      applyFont(btn.dataset.font);
      updateState({ activeFont: btn.dataset.font });
    });
  });

  // ── Colorway picker ──
  document.querySelectorAll('.colorway-swatch').forEach(swatch => {
    if (swatch.dataset.colorway === state.activeColorway) swatch.classList.add('active');
    swatch.addEventListener('click', () => {
      document.querySelectorAll('.colorway-swatch').forEach(s => s.classList.remove('active'));
      swatch.classList.add('active');
      applyColorway(swatch.dataset.colorway);
      updateState({ activeColorway: swatch.dataset.colorway });
    });
  });

  // ── Sound toggle ──
  soundToggle.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    updateState({ soundEnabled });
    updateSoundToggle();
  });

  function updateSoundToggle() {
    soundToggle.textContent = 'sound: ' + (soundEnabled ? 'on' : 'off');
    soundToggle.classList.toggle('active', soundEnabled);
  }

  // ── Helpers ──
  function applyColorway(name) {
    document.body.className = document.body.className
      .replace(/\b(dusk|midnight|fog|paper|forest)\b/g, '')
      .trim();
    document.body.classList.add(name);
  }

  function applyFont(name) {
    document.body.className = document.body.className
      .replace(/\bfont-[\w-]+\b/g, '')
      .trim();
    document.body.classList.add('font-' + name);
  }

  function applyTheme(id) {
    notebookCard.className = 'notebook-card theme-' + id;
    // Also apply theme class to body for sidebar theming
    document.body.className = document.body.className
      .replace(/\btheme-[\w-]+\b/g, '')
      .trim();
    document.body.classList.add('theme-' + id);
  }

  function updateSidebarStats() {
    const s = getState();
    document.getElementById('statStreak').textContent = s.currentStreak;
    document.getElementById('statPrompts').textContent = s.promptsAccepted;
    document.getElementById('statPoints').textContent = s.points;
  }

  function showPointsAnim(amount) {
    const el = document.createElement('div');
    el.className = 'points-float';
    el.textContent = '+' + amount + ' pts';
    notebookCard.appendChild(el);
    setTimeout(() => el.remove(), 1600);
    updateSidebarStats();
  }

  // ── Key sound ──
  function playKeySound() {
    if (!soundEnabled) return;
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 600 + Math.random() * 200;
    gain.gain.value = 0.015;
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.05);
  }

  // ── Editor input ──
  editor.addEventListener('input', () => {
    lastKeystroke = Date.now();
    playKeySound();

    const text = editor.innerText || '';
    const words = text.trim().split(/\s+/).filter(w => w.length > 0).length;
    sessionWordCount = words;

    // Points for words
    const wordsPoints = Math.floor(words / 50);
    if (wordsPoints > wordsPointsAwarded) {
      const diff = wordsPoints - wordsPointsAwarded;
      wordsPointsAwarded = wordsPoints;
      addPoints(diff);
      showPointsAnim(diff);
    }

    applyBlur();
  });

  editor.addEventListener('keydown', (e) => {
    // Prevent formatting shortcuts
    if (e.ctrlKey || e.metaKey) {
      if (['b', 'i', 'u'].includes(e.key.toLowerCase())) {
        e.preventDefault();
      }
    }
  });

  // ── Blur effect ──
  function applyBlur() {
    const container = document.getElementById('writingAreaInner');
    // Get all line-level elements inside editor
    const lines = getVisibleLines();
    if (lines.length === 0) return;

    const currentIdx = lines.length - 1;

    lines.forEach((line, i) => {
      line.classList.remove('line-blur-1', 'line-blur-2', 'line-blur-3');
      const dist = currentIdx - i;
      if (dist >= 5) line.classList.add('line-blur-3');
      else if (dist >= 3) line.classList.add('line-blur-2');
      else if (dist >= 1) line.classList.add('line-blur-1');
    });

    // Auto-scroll to bottom
    container.scrollTop = container.scrollHeight;
  }

  function getVisibleLines() {
    // contenteditable creates divs for each line
    const children = editor.querySelectorAll('div, p, br');
    if (children.length === 0) {
      // Single text node, no lines yet
      return [];
    }
    // Collect div/p children as lines
    const lines = [];
    for (const child of editor.childNodes) {
      if (child.nodeType === 1) { // Element node
        lines.push(child);
      }
    }
    return lines;
  }

  // ── Session timer ──
  setInterval(() => {
    const elapsed = Math.floor((Date.now() - sessionStart) / 1000);
    const mins = String(Math.floor(elapsed / 60)).padStart(2, '0');
    const secs = String(elapsed % 60).padStart(2, '0');
    sessionTimerEl.textContent = mins + ':' + secs;

    // 5-minute bonus
    if (elapsed >= 300 && !sessionMinutesBonusGiven) {
      sessionMinutesBonusGiven = true;
      addPoints(3);
      showPointsAnim(3);
    }
  }, 1000);

  // ── Auto-save ──
  setInterval(() => {
    const content = editor.innerHTML;
    if (content && content !== '<br>') {
      updateState({
        savedEntry: content,
        savedEntryDate: new Date().toLocaleDateString()
      });
    }
  }, 10000);

  window.addEventListener('blur', () => {
    const content = editor.innerHTML;
    if (content && content !== '<br>') {
      updateState({
        savedEntry: content,
        savedEntryDate: new Date().toLocaleDateString()
      });
    }
  });

  // ── Prompt system ──
  function getIdleTime() {
    return (Date.now() - lastKeystroke) / 1000;
  }

  function getSessionTime() {
    return (Date.now() - sessionStart) / 1000;
  }

  function pickPrompt() {
    const sessionTime = getSessionTime();
    let pool;

    if (sessionTime > 180) {
      // After 3 mins, mix in tier 2
      pool = [...tier1, ...tier2];
    } else {
      pool = [...tier1];
    }

    // Filter used prompts
    pool = pool.filter(p => !usedPrompts.has(p));
    if (pool.length === 0) return null;

    return pool[Math.floor(Math.random() * pool.length)];
  }

  function showPrompt(text) {
    if (promptVisible) return;
    promptVisible = true;

    const wrapper = document.querySelector('.journal-wrapper');
    const card = document.createElement('div');
    card.className = 'prompt-card side-' + promptSide;
    promptSide = promptSide === 'left' ? 'right' : 'left';

    // Random vertical offset
    const offset = -30 + Math.random() * 60;
    card.style.marginTop = offset + 'px';

    card.innerHTML = `
      <div class="prompt-text">${text}</div>
      <div class="prompt-actions">
        <button class="prompt-btn accept-btn" title="Accept">&#10003;</button>
        <button class="prompt-btn dismiss-btn" title="Dismiss">&#10005;</button>
      </div>
    `;

    wrapper.appendChild(card);

    // Accept
    card.querySelector('.accept-btn').addEventListener('click', () => {
      usedPrompts.add(text);
      card.classList.add('accept');

      // Inject prompt into editor
      const promptLine = document.createElement('div');
      promptLine.innerHTML = '<em style="opacity:0.5">\u2014 ' + text + '</em>';
      editor.appendChild(promptLine);
      const newLine = document.createElement('div');
      newLine.innerHTML = '<br>';
      editor.appendChild(newLine);

      // Focus and place cursor at end
      const range = document.createRange();
      const sel = window.getSelection();
      range.selectNodeContents(newLine);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
      editor.focus();

      sessionPromptsAccepted++;
      promptCountEl.textContent = sessionPromptsAccepted;
      const s = getState();
      updateState({ promptsAccepted: s.promptsAccepted + 1 });
      addPoints(2);
      showPointsAnim(2);

      setTimeout(() => {
        card.remove();
        promptVisible = false;
        scheduleNextPrompt(20000);
      }, 400);
    });

    // Dismiss
    card.querySelector('.dismiss-btn').addEventListener('click', () => {
      usedPrompts.add(text);
      card.classList.add('dismiss');
      setTimeout(() => {
        card.remove();
        promptVisible = false;
        scheduleNextPrompt(20000);
      }, 400);
    });
  }

  function scheduleNextPrompt(delay) {
    clearTimeout(promptTimeout);
    promptTimeout = setTimeout(checkAndShowPrompt, delay);
  }

  function checkAndShowPrompt() {
    if (promptVisible) {
      scheduleNextPrompt(5000);
      return;
    }

    const idle = getIdleTime();
    const sessionTime = getSessionTime();

    // Tier 2 after 30s idle or 3+ mins session
    let minIdle = 8;
    if (sessionTime > 180 || idle > 30) {
      minIdle = 8; // still need some idle time
    }

    if (idle >= minIdle) {
      const prompt = pickPrompt();
      if (prompt) {
        showPrompt(prompt);
        return;
      }
    }

    // Check again later
    scheduleNextPrompt(5000);
  }

  // Start prompt system after initial idle
  scheduleNextPrompt(10000);

  // ── Idle detection for prompts ──
  editor.addEventListener('input', () => {
    // Reset idle when typing — prompt timer restarts
  });
})();
