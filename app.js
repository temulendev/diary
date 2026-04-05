// Journal app logic
window.App = {
  // Session state
  startTime: null,
  charCount: 0,
  wordCount: 0,
  lastKeystroke: 0,
  sessionPointsAwarded: [],

  // Prompt state
  usedPrompts: [],
  promptSide: 'left',
  lastPromptTime: 0,
  currentPromptCard: null,
  promptScheduled: false,

  // Audio context
  audioContext: null,
  soundEnabled: () => Data.getState('soundEnabled'),

  // Prompt tiers
  tier1Prompts: [
    "What'd you eat today?",
    "Describe where you are right now.",
    "What's the last thing that made you laugh?",
    "What are you looking forward to?",
    "What's been on your mind lately?",
    "What did you notice today that you usually ignore?",
    "Who did you talk to today?"
  ],

  tier2Prompts: [
    "What are you pretending not to care about?",
    "Who annoyed you and why, really?",
    "What do you wish someone would ask you?",
    "What feeling are you avoiding naming?",
    "What would you say if no one could ever read this?",
    "What's something you haven't admitted to yourself yet?",
    "What do you actually want right now?"
  ],

  // Initialize app
  init() {
    this.editor = document.querySelector('.editor');
    this.sessionTimer = document.querySelector('.session-timer');
    this.promptsTracker = document.querySelector('.prompts-tracker');
    this.startTime = Date.now();

    // Apply saved settings
    this.applySavedSettings();

    // Restore last entry
    this.restoreEntry();

    // Events
    this.editor.addEventListener('input', () => this.handleInput());
    this.editor.addEventListener('keydown', () => this.resetIdleTimer());
    this.editor.addEventListener('keyup', () => this.resetIdleTimer());
    window.addEventListener('blur', () => this.autoSave());
    window.addEventListener('beforeunload', () => this.autoSave());

    // Sidebar
    this.setupSidebar();

    // Session timer
    setInterval(() => this.updateSessionTimer(), 1000);

    // Auto-save every 10s
    setInterval(() => this.autoSave(), 10000);

    // Prompts
    this.scheduleNextPrompt();

    // Focus
    this.editor.focus();

    // Update tracker
    this.updatePromptsTracker();
  },

  applySavedSettings() {
    const colorway = Data.getState('activeColorway');
    const font = Data.getState('activeFont');
    const theme = Data.getState('activeNotebookTheme');

    document.body.className = `${colorway} font-${font}`;
    document.querySelector('.notebook-card').className = `notebook-card theme-${theme}`;
  },

  restoreEntry() {
    const stored = localStorage.getItem('vomit_entry_current');
    if (stored) {
      this.editor.innerHTML = stored;
      // Show faint restored message
      const restored = document.createElement('div');
      restored.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        font-size: 12px;
        opacity: 0.4;
        pointer-events: none;
        animation: fadeInOut 3s ease;
      `;
      restored.textContent = 'Entry restored';
      document.body.appendChild(restored);
      setTimeout(() => restored.remove(), 3000);
    }
  },

  handleInput() {
    this.updateBlur();
    this.updateWordCount();
    this.checkPointMilestones();
    this.resetIdleTimer();
  },

  updateBlur() {
    const text = this.editor.innerText;
    const lines = text.split('\n');

    // Clear all existing blur classes
    this.editor.querySelectorAll('*').forEach(el => {
      el.classList.remove('blur-1', 'blur-2', 'blur-3');
    });

    // Apply blur based on line count from bottom
    // Get child elements and apply blur if they represent older lines
    const children = Array.from(this.editor.childNodes).filter(
      n => n.nodeType === 1 || (n.nodeType === 3 && n.textContent.trim())
    );

    let visibleLineCount = 0;
    for (let i = 0; i < children.length; i++) {
      const node = children[i];
      if (node.textContent && node.textContent.trim()) {
        visibleLineCount++;
      }
    }

    // Apply blur classes based on distance from last line
    children.forEach((node, idx) => {
      if (node.nodeType === 1 && node.textContent.trim()) {
        const lineIdx = Array.from(children)
          .slice(0, idx + 1)
          .filter(n => n.nodeType === 1 && n.textContent.trim()).length;
        const linesFromBottom = visibleLineCount - lineIdx;

        if (linesFromBottom >= 2 && linesFromBottom <= 3) {
          node.classList.add('blur-1');
        } else if (linesFromBottom >= 4 && linesFromBottom <= 5) {
          node.classList.add('blur-2');
        } else if (linesFromBottom > 5) {
          node.classList.add('blur-3');
        }
      }
    });
  },

  updateWordCount() {
    const text = this.editor.innerText;
    this.charCount = text.length;
    this.wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  },

  checkPointMilestones() {
    // +1 per 50 words
    const milestoneFifty = Math.floor(this.wordCount / 50);
    if (milestoneFifty > this.sessionPointsAwarded.filter(p => p === 'words').length) {
      this.awardPoints(1, 'words');
    }
  },

  awardPoints(n, reason) {
    if (!this.sessionPointsAwarded.includes(reason)) {
      this.sessionPointsAwarded.push(reason);
      Data.addPoints(n);
      this.showPointsToast(n);
    }
  },

  showPointsToast(n) {
    const toast = document.createElement('div');
    toast.className = 'points-toast';
    toast.textContent = `+${n} pts`;
    const rect = document.querySelector('.notebook-card').getBoundingClientRect();
    toast.style.top = rect.top + 30 + 'px';
    toast.style.left = rect.right - 80 + 'px';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 1500);
  },

  resetIdleTimer() {
    this.lastKeystroke = Date.now();
    if (!this.promptScheduled) {
      this.scheduleNextPrompt();
    }
  },

  scheduleNextPrompt() {
    if (this.promptScheduled) return;

    // Idle timeout: 8-15s for Tier 1, 30s+ for Tier 2
    const waitTime = this.usedPrompts.length < 3
      ? 8000 + Math.random() * 7000  // 8-15s
      : 30000;

    this.promptScheduled = true;

    setTimeout(() => {
      const now = Date.now();
      const idleFor = now - this.lastKeystroke;

      if (idleFor >= waitTime * 0.8) {  // Account for timing variance
        const tier = this.usedPrompts.length >= 3 ? this.tier2Prompts : this.tier1Prompts;
        const availablePrompts = tier.filter(p => !this.usedPrompts.includes(p));

        if (availablePrompts.length > 0) {
          const prompt = availablePrompts[Math.floor(Math.random() * availablePrompts.length)];
          this.usedPrompts.push(prompt);
          this.showPrompt(prompt);
          this.lastPromptTime = now;
        }
      }

      this.promptScheduled = false;
    }, waitTime);
  },

  showPrompt(text) {
    // Remove existing prompt
    if (this.currentPromptCard) {
      this.currentPromptCard.remove();
    }

    const card = document.createElement('div');
    card.className = 'prompt-card';
    card.innerHTML = `
      <div class="prompt-text">${text}</div>
      <div class="prompt-buttons">
        <button class="prompt-btn prompt-accept">✓</button>
        <button class="prompt-btn prompt-dismiss">×</button>
      </div>
    `;

    // Position
    const side = this.promptSide === 'left' ? 'left' : 'right';
    this.promptSide = this.promptSide === 'left' ? 'right' : 'left';

    const notebookRect = document.querySelector('.notebook-card').getBoundingClientRect();
    const offset = 40 + Math.random() * 80;  // Random vertical offset

    if (side === 'left') {
      card.style.left = '30px';
    } else {
      card.style.right = '30px';
    }
    card.style.top = notebookRect.top + offset + 'px';

    // Events
    card.querySelector('.prompt-accept').addEventListener('click', () => {
      card.classList.add('accepting');
      setTimeout(() => {
        this.acceptPrompt(text);
        card.remove();
        this.currentPromptCard = null;
      }, 400);
    });

    card.querySelector('.prompt-dismiss').addEventListener('click', () => {
      card.style.animation = 'none';
      card.style.opacity = '0';
      card.style.transform = 'translateY(-20px)';
      setTimeout(() => {
        card.remove();
        this.currentPromptCard = null;
        this.scheduleNextPromptAfterDelay();
      }, 300);
    });

    document.body.appendChild(card);
    this.currentPromptCard = card;
  },

  acceptPrompt(text) {
    // Inject into editor
    const injection = `— ${text}\n`;
    const selection = window.getSelection();

    if (this.editor.innerText.trim()) {
      this.editor.innerHTML += `<div>${injection}</div>`;
    } else {
      this.editor.innerText = injection;
    }

    Data.recordPromptAccepted();
    this.awardPoints(2, `prompt-${text}`);
    this.updatePromptsTracker();

    this.scheduleNextPromptAfterDelay();
  },

  scheduleNextPromptAfterDelay() {
    this.promptScheduled = false;
    setTimeout(() => {
      this.resetIdleTimer();
    }, 20000);
  },

  updatePromptsTracker() {
    const count = Data.getState('promptsAccepted');
    if (this.promptsTracker) {
      this.promptsTracker.textContent = `prompts accepted: ${count}`;
    }
  },

  updateSessionTimer() {
    const elapsed = Date.now() - this.startTime;
    const mins = Math.floor(elapsed / 60000);
    const secs = Math.floor((elapsed % 60000) / 1000);
    const formatted = String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
    if (this.sessionTimer) {
      this.sessionTimer.textContent = formatted;
    }

    // Award points for 5+ min session (once)
    if (mins >= 5 && !this.sessionPointsAwarded.includes('session-5min')) {
      this.awardPoints(3, 'session-5min');
    }

    // Award points for streak (once per session)
    const streak = Data.getState('currentStreak');
    if (streak >= 1 && !this.sessionPointsAwarded.includes('streak')) {
      this.awardPoints(5, 'streak');
    }
  },

  autoSave() {
    const content = this.editor.innerHTML;
    localStorage.setItem('vomit_entry_current', content);
  },

  setupSidebar() {
    const toggleStrip = document.querySelector('.sidebar-toggle');
    const sidebar = document.querySelector('.sidebar');

    if (toggleStrip && sidebar) {
      toggleStrip.addEventListener('click', () => {
        sidebar.classList.toggle('active');
      });

      // Hide on click outside
      document.addEventListener('click', (e) => {
        if (!sidebar.contains(e.target) && !toggleStrip.contains(e.target)) {
          sidebar.classList.remove('active');
        }
      });

      // Font options
      document.querySelectorAll('.font-option').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          const fontId = btn.dataset.font;
          document.querySelectorAll('.font-option').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          Data.equipFont(fontId);
          const bodyClass = document.body.className;
          const newClass = bodyClass.replace(/font-[\w-]+/, `font-${fontId}`);
          document.body.className = newClass;
        });
      });

      // Colorway options
      document.querySelectorAll('.colorway-swatch').forEach(swatch => {
        swatch.addEventListener('click', () => {
          const colorway = swatch.dataset.colorway;
          document.querySelectorAll('.colorway-swatch').forEach(s => s.classList.remove('active'));
          swatch.classList.add('active');
          Data.equipColorway(colorway);
          const bodyClass = document.body.className;
          const newClass = bodyClass.replace(/\b(dusk|midnight|fog|paper|forest)\b/, colorway);
          document.body.className = newClass;
        });
      });

      // Sound toggle
      const soundToggle = document.querySelector('.sound-toggle');
      if (soundToggle) {
        soundToggle.addEventListener('click', () => {
          Data.toggleSound();
          soundToggle.textContent = Data.getState('soundEnabled') ? '♪' : '◯';
        });
      }

      // Highlight active options on load
      const activeFont = Data.getState('activeFont');
      const activeColorway = Data.getState('activeColorway');
      document.querySelector(`.font-option[data-font="${activeFont}"]`)?.classList.add('active');
      document.querySelector(`.colorway-swatch[data-colorway="${activeColorway}"]`)?.classList.add('active');
    }
  }
};

// Start on DOMContentLoaded
window.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    App.init();
  }, 100);
});
