// shop.js — shop page logic

(function () {
  const state = getState();
  const themeGrid = document.getElementById('themeGrid');
  const shopPointsEl = document.getElementById('shopPoints');
  const sidebar = document.getElementById('sidebar');
  const hamburger = document.getElementById('hamburger');

  const themes = [
    { id: 'default', name: 'Default', cost: 0, desc: 'Minimal card, ruled lines, light grey border' },
    { id: 'paper', name: 'Paper', cost: 5, desc: 'Warm cream, subtle texture, slightly rough border' },
    { id: 'typewriter', name: 'Typewriter', cost: 15, desc: 'Off-white card, DM Mono forced, aged look' },
    { id: 'glow', name: 'Neon Glow', cost: 20, desc: 'Dark card, neon cyan-green inner glow' },
    { id: 'linen', name: 'Linen', cost: 25, desc: 'Warm linen texture, soft taupe tones' },
    { id: 'void', name: 'The Void', cost: 30, desc: 'Pure black, white text, red cursor. Unsettling.' }
  ];

  // ── Init ──
  applyColorway(state.activeColorway);
  applyFont(state.activeFont);
  updatePointsDisplay();
  updateSidebarStats();
  renderThemes();

  // ── Sidebar toggle ──
  hamburger.addEventListener('click', () => {
    sidebar.classList.toggle('open');
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

  function updatePointsDisplay() {
    const s = getState();
    shopPointsEl.textContent = s.points + ' pts';
  }

  function updateSidebarStats() {
    const s = getState();
    document.getElementById('statStreak').textContent = s.currentStreak;
    document.getElementById('statPrompts').textContent = s.promptsAccepted;
    document.getElementById('statPoints').textContent = s.points;
  }

  // ── Render themes ──
  function renderThemes() {
    themeGrid.innerHTML = '';
    const current = getState();

    themes.forEach(theme => {
      const owned = current.purchasedThemes.includes(theme.id);
      const equipped = current.activeNotebookTheme === theme.id;
      const canAfford = current.points >= theme.cost;

      const card = document.createElement('div');
      card.className = 'theme-card';

      let btnText, btnClass, btnDisabled;
      if (equipped) {
        btnText = 'Equipped';
        btnClass = 'theme-btn equipped';
        btnDisabled = true;
      } else if (owned) {
        btnText = 'Equip';
        btnClass = 'theme-btn';
        btnDisabled = false;
      } else if (canAfford) {
        btnText = 'Buy';
        btnClass = 'theme-btn';
        btnDisabled = false;
      } else {
        const needed = theme.cost - current.points;
        btnText = 'Locked — need ' + needed + ' more pts';
        btnClass = 'theme-btn';
        btnDisabled = true;
      }

      const costLabel = theme.cost === 0 ? 'free' : theme.cost + ' pts';

      card.innerHTML = `
        <div class="theme-preview preview-${theme.id}">just thinking out loud...</div>
        <div class="theme-info">
          <span class="theme-name">${theme.name}</span>
          <span class="theme-cost">${costLabel}</span>
        </div>
        <button class="${btnClass}" ${btnDisabled ? 'disabled' : ''} data-theme-id="${theme.id}">${btnText}</button>
      `;

      const btn = card.querySelector('button');
      if (!btnDisabled) {
        btn.addEventListener('click', () => {
          if (equipped) return;
          if (owned) {
            equipTheme(theme.id);
          } else {
            buyTheme(theme);
          }
        });
      }

      themeGrid.appendChild(card);
    });
  }

  function buyTheme(theme) {
    const s = getState();
    if (s.points < theme.cost) return;

    const purchased = [...s.purchasedThemes, theme.id];
    updateState({
      points: s.points - theme.cost,
      purchasedThemes: purchased,
      activeNotebookTheme: theme.id
    });

    updatePointsDisplay();
    updateSidebarStats();
    renderThemes();
  }

  function equipTheme(id) {
    updateState({ activeNotebookTheme: id });
    renderThemes();
  }
})();
