// Shared state layer — localStorage persistence
window.Data = {
  // Default state
  defaults: {
    points: 0,
    purchasedThemes: ['default'],
    activeNotebookTheme: 'default',
    activeColorway: 'dusk',
    activeFont: 'lora',
    promptsAccepted: 0,
    totalSessions: 0,
    currentStreak: 0,
    lastEntryDate: null,
    soundEnabled: true
  },

  // Internal state
  state: {},

  // Initialize from localStorage or defaults
  init() {
    const stored = localStorage.getItem('vomit_state');
    if (stored) {
      this.state = JSON.parse(stored);
    } else {
      this.state = { ...this.defaults };
    }

    // Update streak on load
    this.updateStreak();
    this.save();
  },

  // Persist state to localStorage
  save() {
    localStorage.setItem('vomit_state', JSON.stringify(this.state));
  },

  // Generic getter
  getState(key) {
    return this.state[key] !== undefined ? this.state[key] : this.defaults[key];
  },

  // Generic setter
  setState(key, val) {
    this.state[key] = val;
    this.save();
  },

  // Points
  addPoints(n) {
    const current = this.getState('points');
    this.setState('points', current + n);
  },

  getPoints() {
    return this.getState('points');
  },

  // Themes
  purchaseTheme(id) {
    const purchased = this.getState('purchasedThemes');
    if (!purchased.includes(id)) {
      purchased.push(id);
      this.setState('purchasedThemes', purchased);
    }
  },

  hasTheme(id) {
    return this.getState('purchasedThemes').includes(id);
  },

  equipTheme(id) {
    if (this.hasTheme(id)) {
      this.setState('activeNotebookTheme', id);
    }
  },

  equipColorway(id) {
    this.setState('activeColorway', id);
  },

  equipFont(id) {
    this.setState('activeFont', id);
  },

  // Prompts
  recordPromptAccepted() {
    const current = this.getState('promptsAccepted');
    this.setState('promptsAccepted', current + 1);
  },

  // Streak logic
  updateStreak() {
    const lastEntryDate = this.getState('lastEntryDate');
    const today = new Date().toISOString().split('T')[0];

    if (!lastEntryDate) {
      // First entry ever
      this.setState('currentStreak', 1);
    } else if (lastEntryDate === today) {
      // Same day, no change
    } else {
      const last = new Date(lastEntryDate);
      const now = new Date(today);
      const diffDays = Math.floor((now - last) / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        // Consecutive day, increment streak
        const current = this.getState('currentStreak');
        this.setState('currentStreak', current + 1);
      } else {
        // Gap, reset streak
        this.setState('currentStreak', 1);
      }
    }

    const today_str = new Date().toISOString().split('T')[0];
    this.setState('lastEntryDate', today_str);
  },

  // Sound toggle
  toggleSound() {
    const current = this.getState('soundEnabled');
    this.setState('soundEnabled', !current);
  }
};

// Initialize on load
window.addEventListener('DOMContentLoaded', () => {
  Data.init();
});
