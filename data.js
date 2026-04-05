// data.js — shared state via localStorage

const DATA_KEY = 'vomit_state';

const defaults = {
  points: 0,
  purchasedThemes: ['default'],
  activeNotebookTheme: 'default',
  activeColorway: 'midnight',
  activeFont: 'lora',
  promptsAccepted: 0,
  totalSessions: 0,
  currentStreak: 0,
  lastEntryDate: null,
  savedEntry: null,
  savedEntryDate: null,
  soundEnabled: false
};

function loadState() {
  try {
    const raw = localStorage.getItem(DATA_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...defaults, ...parsed };
    }
  } catch (e) {
    // corrupted data, reset
  }
  return { ...defaults };
}

function saveState(state) {
  localStorage.setItem(DATA_KEY, JSON.stringify(state));
}

function getState() {
  return loadState();
}

function updateState(partial) {
  const state = loadState();
  Object.assign(state, partial);
  saveState(state);
  return state;
}

function addPoints(amount) {
  const state = loadState();
  state.points += amount;
  saveState(state);
  return state.points;
}

function updateStreak() {
  const state = loadState();
  const today = new Date().toDateString();
  const last = state.lastEntryDate;

  if (last === today) {
    // already counted today
    return state.currentStreak;
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  if (last === yesterday.toDateString()) {
    state.currentStreak += 1;
  } else {
    state.currentStreak = 1;
  }

  state.lastEntryDate = today;
  state.totalSessions += 1;
  saveState(state);
  return state.currentStreak;
}
